/**
 * Import the HR "Sales Team Master Directory" (CSV) into the portal.
 *
 * Updates employee profile fields (name, email, designation, phone) matched by
 * emp_id, and upserts one device per employee using Option B:
 *   device serial_number = DEV-<empId>   (model name is NOT used as a key)
 * IMEI(s) and the mobile number are stored as attributes on that device.
 *
 * The CSV is expected at ~/directory.csv on the host, mounted/copied into the
 * container working dir. Layout: 2 banner rows, then a header row, then data.
 * Header columns (row 3):
 *   S.No, Employee ID, First Name, Last Name, Email, Department,
 *   Mobile Number, Serial / Model, IMEI No., Phone Assigned Date, Phone Issued
 *
 * Idempotent: matches by emp_id / serial, safe to re-run. Rows with missing
 * phone/IMEI get a unique placeholder and are reported so they can be fixed
 * later without blocking the import.
 *
 * Usage (path to the CSV inside the container):
 *   node scripts/import-directory.js /data/directory.csv
 */

import fs from 'node:fs';
import { sequelize } from '../config/db.js';

const csvPath = process.argv[2] || '/data/directory.csv';

const PLACEHOLDER_PREFIX = '+9198';
let phoneSeq = 0;
const uniquePlaceholderPhone = () => {
  phoneSeq += 1;
  return `${PLACEHOLDER_PREFIX}${String(phoneSeq).padStart(7, '0')}`;
};
let imeiSeq = 0;
const placeholderImei = (empId) => {
  imeiSeq += 1;
  return `NOIMEI-${empId}-${imeiSeq}`;
};

/** Minimal CSV line parser handling quoted fields. */
const parseLine = (line) => {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') { inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

const clean = (v) => {
  if (v == null) return '';
  const s = String(v).trim();
  if (s === '' || s === '-' || s.toUpperCase() === 'N/A' || s.toUpperCase() === 'NA') return '';
  return s;
};

const toE164 = (raw) => {
  const v = clean(raw);
  if (!v) return null;
  if (/^\+[1-9]\d{7,14}$/.test(v)) return v;
  const digits = v.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
};

/** Extract up to two IMEIs from a messy value like "354191/70/33/4  354360/64/8". */
const parseImeis = (raw) => {
  const v = clean(raw);
  if (!v) return [null, null];
  // Split on whitespace to separate the two IMEIs, then strip non-digits.
  const parts = v.split(/\s+/).map((p) => p.replace(/\D/g, '')).filter((p) => p.length >= 10);
  return [parts[0] || null, parts[1] || null];
};

async function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at ${csvPath}`);
  }
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/\r/g, '');
  const lines = raw.split('\n').filter((l) => l.length > 0);

  // Find the header row (the one containing "Employee ID").
  const headerIdx = lines.findIndex((l) => l.includes('Employee ID'));
  if (headerIdx === -1) throw new Error('Header row with "Employee ID" not found');
  const headers = parseLine(lines[headerIdx]).map((h) => h.toLowerCase());

  const col = (name) => headers.findIndex((h) => h.includes(name));
  const idx = {
    empId: col('employee id'),
    first: col('first name'),
    last: col('last name'),
    email: col('email'),
    dept: col('department'),
    mobile: col('mobile'),
    imei: col('imei'),
    issued: col('phone issued'),
  };

  const dataLines = lines.slice(headerIdx + 1);
  const report = {
    updatedEmployees: 0, updatedDevices: 0,
    missingPhone: [], missingImei: [],
    dupPhone: [], dupEmail: [], dupImei: [], skipped: [],
  };

  // Track values already used in this run so within-file duplicates get a
  // unique placeholder instead of violating the DB's unique constraints.
  const seenPhones = new Set();
  const seenEmails = new Set();
  const seenImeis = new Set();

  await sequelize.transaction(async (tx) => {
    for (const line of dataLines) {
      const cells = parseLine(line);
      const empId = clean(cells[idx.empId]);
      if (!empId) { continue; }

      const fullName = [clean(cells[idx.first]), clean(cells[idx.last])].filter(Boolean).join(' ') || empId;

      let email = (clean(cells[idx.email]) || `${empId.toLowerCase()}@imported.local`).toLowerCase();
      if (seenEmails.has(email)) { report.dupEmail.push(empId); email = `${empId.toLowerCase()}.${report.dupEmail.length}@imported.local`; }
      seenEmails.add(email);

      const designation = clean(cells[idx.dept]) || 'Sales';

      let phone = toE164(cells[idx.mobile]);
      if (!phone) { phone = uniquePlaceholderPhone(); report.missingPhone.push(empId); }
      else if (seenPhones.has(phone)) { report.dupPhone.push(empId); phone = uniquePlaceholderPhone(); }
      seenPhones.add(phone);

      const [imei1raw, imei2raw] = parseImeis(cells[idx.imei]);
      let imei1 = imei1raw || placeholderImei(empId);
      if (!imei1raw) report.missingImei.push(empId);
      else if (seenImeis.has(imei1)) { report.dupImei.push(empId); imei1 = placeholderImei(empId); }
      seenImeis.add(imei1);
      // Keep imei_2 only if present and not colliding; otherwise drop it.
      let imei2 = imei2raw && !seenImeis.has(imei2raw) ? imei2raw : null;
      if (imei2) seenImeis.add(imei2);

      const issued = clean(cells[idx.issued]).toLowerCase();
      const isActive = issued === '' ? true : issued === 'yes' || issued === 'y' || issued === 'true';

      // Upsert the employee (create if the directory has someone not in call data).
      const [empRows] = await sequelize.query(
        `INSERT INTO public.employees
           (emp_id, full_name, email, phone_number, designation, is_active, created_at, updated_at)
         VALUES (:emp_id, :full_name, :email, :phone, :designation, :active, now(), now())
         ON CONFLICT (emp_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           phone_number = EXCLUDED.phone_number,
           designation = EXCLUDED.designation,
           is_active = EXCLUDED.is_active,
           updated_at = now()`,
        {
          replacements: { emp_id: empId, full_name: fullName, email, phone, designation, active: isActive },
          transaction: tx,
        },
      );
      report.updatedEmployees += 1;

      // Option B: device serial = DEV-<empId>. Store IMEI(s) + mobile as attributes.
      const serial = `DEV-${empId}`;
      await sequelize.query(
        `INSERT INTO public.devices
           (serial_number, employee_id, imei_1, imei_2, phone_number_1, link_status, linked_at,
            is_active, registered_at, created_at, updated_at)
         VALUES (:serial, :emp_id, :imei1, :imei2, :phone, 'AUTO_LINKED', now(), :active, now(), now(), now())
         ON CONFLICT (serial_number) DO UPDATE SET
           employee_id = EXCLUDED.employee_id,
           imei_1 = EXCLUDED.imei_1,
           imei_2 = EXCLUDED.imei_2,
           phone_number_1 = EXCLUDED.phone_number_1,
           is_active = EXCLUDED.is_active,
           updated_at = now()`,
        {
          replacements: { serial, emp_id: empId, imei1, imei2: imei2 || null, phone, active: isActive },
          transaction: tx,
        },
      );
      report.updatedDevices += 1;
    }
  });

  console.log(`✅ Employees updated/created: ${report.updatedEmployees}`);
  console.log(`✅ Devices updated/created:  ${report.updatedDevices}`);
  if (report.missingPhone.length) {
    console.log(`⚠️  Missing phone (placeholder used) for: ${report.missingPhone.join(', ')}`);
  }
  if (report.missingImei.length) {
    console.log(`⚠️  Missing IMEI (placeholder used) for: ${report.missingImei.join(', ')}`);
  }
  if (report.dupPhone.length) {
    console.log(`⚠️  Duplicate phone in file (placeholder used) for: ${report.dupPhone.join(', ')}`);
  }
  if (report.dupEmail.length) {
    console.log(`⚠️  Duplicate email in file (placeholder used) for: ${report.dupEmail.join(', ')}`);
  }
  if (report.dupImei.length) {
    console.log(`⚠️  Duplicate IMEI in file (placeholder used) for: ${report.dupImei.join(', ')}`);
  }
  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Directory import failed:', err.message);
  if (err?.original) {
    console.error('   pg:', err.original.message, '| detail:', err.original.detail, '| constraint:', err.original.constraint);
  }
  console.error(err?.stack);
  process.exit(1);
});
