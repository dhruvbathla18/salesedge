/**
 * One-time importer: load partner (uploader) call data into the portal schema.
 *
 * The partner's backend uses a different schema than this admin portal. This
 * script reads the partner's tables from a STAGING schema (loaded from their
 * pg_dump) and transforms them into the portal's tables:
 *   employees, devices, call_logs, call_recordings, call_form_data
 *
 * It is idempotent: rows are upserted by primary key, so re-running is safe.
 * It uses raw SQL inserts to bypass app-level model validators (the partner's
 * real data does not satisfy every behavioral invariant), while DB-level
 * constraints (enums, NOT NULL, FKs, uniqueness) still guarantee integrity.
 *
 * Prerequisite: the partner dump must be restored into a schema named
 * "staging" on the SAME database, e.g.:
 *   psql "<conn>" -c "CREATE SCHEMA IF NOT EXISTS staging;"
 *   pg_restore --no-owner --schema=public -n public \
 *     --dbname="<conn>" ... (see IMPORT instructions)
 * Simplest path is the plain .sql: load it into staging by rewriting
 * "public." -> "staging." (the runner command does this for you).
 *
 * Usage:
 *   node scripts/import-partner-data.js            # import
 *   node scripts/import-partner-data.js --wipe     # clear portal call data first
 */

import { sequelize } from '../config/db.js';
import { QueryTypes } from 'sequelize';

const WIPE = process.argv.includes('--wipe');
const STAGING = 'staging';

const PLACEHOLDER_PHONE = '+910000000000';

/** Normalize a partner phone value into E.164 or a safe placeholder. */
const toE164 = (raw) => {
  if (raw == null) return PLACEHOLDER_PHONE;
  const value = String(raw).trim();
  if (value === '' || value === '\\N') return PLACEHOLDER_PHONE;
  // Reject template junk like %phonenumber% / %imei2%
  if (value.includes('%')) return PLACEHOLDER_PHONE;
  if (/^\+[1-9]\d{1,14}$/.test(value)) return value; // already E.164
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return PLACEHOLDER_PHONE;
};

const clean = (raw) => {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (value === '' || value === '\\N' || value.includes('%')) return null;
  return value;
};

const CALL_DIRECTIONS = new Set(['INCOMING', 'OUTGOING', 'MISSED']);
const CALL_CATEGORIES = new Set(['CLIENT', 'TEAM_MEMBER', 'PERSONAL', 'MISSED', 'PENDING']);

async function main() {
  // Confirm the staging schema holds each partner table. Use a COUNT probe so
  // detection does not depend on how the driver names the returned column.
  const stagingHas = async (table) => {
    const rows = await sequelize.query(
      `SELECT count(*)::int AS n FROM information_schema.tables
        WHERE table_schema = :s AND table_name = :t`,
      { replacements: { s: STAGING, t: table }, type: QueryTypes.SELECT },
    );
    return Number(rows?.[0]?.n) > 0;
  };

  for (const t of ['call_logs', 'call_recordings']) {
    if (!(await stagingHas(t))) {
      throw new Error(
        `Staging table "${STAGING}.${t}" not found. Load the partner dump into the "${STAGING}" schema first.`,
      );
    }
  }

  const hasForm = await stagingHas('call_form_data');

  await sequelize.transaction(async (tx) => {
    const opts = { transaction: tx };

    if (WIPE) {
      // Order respects FKs (recordings/forms reference logs).
      await sequelize.query('DELETE FROM public.call_recordings', opts);
      await sequelize.query('DELETE FROM public.call_form_data', opts);
      await sequelize.query('DELETE FROM public.call_logs', opts);
      console.log('🧹 Cleared existing portal call data.');
    }

    // 1. Read partner call_logs.
    const logs = await sequelize.query(
      `SELECT id, emp_id, serial_number, call_type, call_category,
              caller_number, receiver_number, duration_seconds, created_at, updated_at
         FROM ${STAGING}.call_logs`,
      { type: QueryTypes.SELECT, transaction: tx },
    );

    // 2. Synthesize employees + devices from distinct emp_ids / serials.
    const employees = new Map(); // emp_id -> device_serial
    for (const l of logs) {
      const empId = clean(l.emp_id) || 'UNKNOWN';
      const serial = clean(l.serial_number) || `DEV-${empId}`;
      if (!employees.has(empId)) employees.set(empId, serial);
    }

    // Unique placeholder generators. phone_number, imei_1 and phone_number_1
    // are UNIQUE columns, so every synthesized row needs a distinct value.
    let seq = 0;
    const uniquePhone = () => {
      seq += 1;
      // +9199 followed by a zero-padded counter keeps it valid E.164 (<=15 digits).
      return `+9199${String(seq).padStart(8, '0')}`;
    };

    for (const [empId, serial] of employees) {
      const emailSafe = `${empId.toLowerCase().replace(/[^a-z0-9]/g, '')}@imported.local`;
      await sequelize.query(
        `INSERT INTO public.employees
           (emp_id, full_name, email, phone_number, designation, is_active, created_at, updated_at)
         VALUES (:emp_id, :full_name, :email, :phone, :designation, true, now(), now())
         ON CONFLICT (emp_id) DO NOTHING`,
        {
          replacements: {
            emp_id: empId,
            full_name: empId,
            email: emailSafe,
            phone: uniquePhone(),
            designation: 'Imported',
          },
          transaction: tx,
        },
      );

      await sequelize.query(
        `INSERT INTO public.devices
           (serial_number, employee_id, imei_1, phone_number_1, link_status, linked_at,
            is_active, registered_at, created_at, updated_at)
         VALUES (:serial, :emp_id, :imei, :phone, 'AUTO_LINKED', now(), true, now(), now(), now())
         ON CONFLICT (serial_number) DO NOTHING`,
        {
          replacements: {
            serial,
            emp_id: empId,
            imei: `IMEI-${serial}`,
            phone: uniquePhone(),
          },
          transaction: tx,
        },
      );
    }

    // 3. Insert call_logs (mapped).
    let logCount = 0;
    for (const l of logs) {
      const empId = clean(l.emp_id) || 'UNKNOWN';
      const serial = clean(l.serial_number) || employees.get(empId) || `DEV-${empId}`;
      const direction = CALL_DIRECTIONS.has(l.call_type) ? l.call_type : 'OUTGOING';
      const category = CALL_CATEGORIES.has(l.call_category) ? l.call_category : 'PENDING';

      await sequelize.query(
        `INSERT INTO public.call_logs
           (id, device_serial, employee_id, call_direction, caller_number, callee_number,
            duration_seconds, call_category, is_form_required, is_form_submitted, has_recording,
            created_at, updated_at)
         VALUES (:id, :serial, :emp_id, :direction, :caller, :callee,
                 :duration, :category, false, false, false, :created, :updated)
         ON CONFLICT (id) DO NOTHING`,
        {
          replacements: {
            id: l.id,
            serial,
            emp_id: empId,
            direction,
            caller: toE164(l.caller_number),
            callee: toE164(l.receiver_number),
            duration: Number(l.duration_seconds) || 0,
            category,
            created: l.created_at,
            updated: l.updated_at,
          },
          transaction: tx,
        },
      );
      logCount += 1;
    }
    console.log(`📞 call_logs imported: ${logCount}`);

    // 4. Insert call_recordings (mapped), and flag their call_logs.
    const recs = await sequelize.query(
      `SELECT id, call_id, file_size_bytes, s3_bucket, s3_key, upload_status,
              file_name, created_at, updated_at
         FROM ${STAGING}.call_recordings`,
      { type: QueryTypes.SELECT, transaction: tx },
    );

    let recCount = 0;
    for (const r of recs) {
      // Find the owning log to copy its device_serial.
      const [log] = await sequelize.query(
        `SELECT device_serial FROM public.call_logs WHERE id = :id`,
        { replacements: { id: r.call_id }, type: QueryTypes.SELECT, transaction: tx },
      );
      if (!log) continue; // recording without a matching log; skip

      await sequelize.query(
        `INSERT INTO public.call_recordings
           (id, call_log_id, device_serial, local_file_path, file_size_bytes, s3_bucket, s3_key,
            upload_status, retry_count, max_retries, created_at, updated_at)
         VALUES (:id, :call_log_id, :serial, NULL, :size, :bucket, :key,
                 'COMPLETED', 0, 3, :created, :updated)
         ON CONFLICT (id) DO NOTHING`,
        {
          replacements: {
            id: r.id,
            call_log_id: r.call_id,
            serial: log.device_serial,
            size: Number(r.file_size_bytes) || 0,
            bucket: r.s3_bucket,
            key: r.s3_key,
            created: r.created_at,
            updated: r.updated_at,
          },
          transaction: tx,
        },
      );

      await sequelize.query(
        `UPDATE public.call_logs SET has_recording = true WHERE id = :id`,
        { replacements: { id: r.call_id }, transaction: tx },
      );
      recCount += 1;
    }
    console.log(`🎙️  call_recordings imported: ${recCount}`);

    // 5. Insert call_form_data (optional).
    if (hasForm) {
      const forms = await sequelize.query(
        `SELECT id, call_id, company_name, customer_name, reason_for_call, notes, created_at, updated_at
           FROM ${STAGING}.call_form_data`,
        { type: QueryTypes.SELECT, transaction: tx },
      );
      let formCount = 0;
      for (const f of forms) {
        const [log] = await sequelize.query(
          `SELECT id FROM public.call_logs WHERE id = :id`,
          { replacements: { id: f.call_id }, type: QueryTypes.SELECT, transaction: tx },
        );
        if (!log) continue;
        await sequelize.query(
          `INSERT INTO public.call_form_data
             (id, call_log_id, company_name, customer_name, reason_for_call, notes, created_at, updated_at)
           VALUES (:id, :call_log_id, :company, :customer, :reason, :notes, :created, :updated)
           ON CONFLICT (id) DO NOTHING`,
          {
            replacements: {
              id: f.id,
              call_log_id: f.call_id,
              company: clean(f.company_name) || 'NA',
              customer: clean(f.customer_name) || 'NA',
              reason: clean(f.reason_for_call) || 'NA',
              notes: clean(f.notes),
              created: f.created_at,
              updated: f.updated_at,
            },
            transaction: tx,
          },
        );
        await sequelize.query(
          `UPDATE public.call_logs SET is_form_required = true, is_form_submitted = true WHERE id = :id`,
          { replacements: { id: f.call_id }, transaction: tx },
        );
        formCount += 1;
      }
      console.log(`📝 call_form_data imported: ${formCount}`);
    }
  });

  console.log('✅ Import complete.');
  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Import failed:', err.message);
  if (err?.original) {
    console.error('   pg message:', err.original.message);
    console.error('   detail    :', err.original.detail);
    console.error('   column    :', err.original.column);
    console.error('   constraint:', err.original.constraint);
    console.error('   table     :', err.original.table);
  }
  if (Array.isArray(err?.errors)) {
    for (const e of err.errors) {
      console.error('   validation:', e.path, '-', e.message, '(value:', e.value, ')');
    }
  }
  console.error(err?.stack);
  process.exit(1);
});
