/**
 * CLI Data Viewer Script
 * Displays all PostgreSQL tables and sample data directly in the terminal
 * 
 * Usage: node scripts/view-data.js (or npm run db:view)
 */

import 'dotenv/config';
import { connectDB } from '../config/db.js';
import {
  User,
  Employee,
  Device,
  CallLog,
  CallFormData,
  CallRecording,
  AuditLog,
} from '../models/index.js';

async function displayData() {
  await connectDB();

  console.log('\n===============================================================');
  console.log('               📊 POSTGRESQL DATABASE VIEWER                  ');
  console.log('===============================================================\n');

  // 1. Users
  const users = await User.findAll({ attributes: ['id', 'name', 'email', 'role', 'is_active'] });
  console.log('👤 USERS TABLE:');
  console.table(users.map((u) => u.toJSON()));

  // 2. Employees
  const employees = await Employee.findAll();
  console.log('\n👥 EMPLOYEES TABLE:');
  console.table(employees.map((e) => e.toJSON()));

  // 3. Devices
  const devices = await Device.findAll();
  console.log('\n📱 DEVICES TABLE:');
  console.table(devices.map((d) => ({
    serial_number: d.serial_number,
    employee_id: d.employee_id || '— (Unlinked)',
    imei_1: d.imei_1,
    phone_number_1: d.phone_number_1,
    link_status: d.link_status,
    is_active: d.is_active,
  })));

  // 4. Call Form Data (Companies & Contacts)
  const forms = await CallFormData.findAll();
  console.log('\n🏢 CALL FORM DATA (Companies & Contacts):');
  console.table(forms.map((f) => ({
    company_name: f.company_name,
    customer_name: f.customer_name,
    reason_for_call: f.reason_for_call,
    notes: f.notes ? f.notes.slice(0, 45) + '...' : '—',
  })));

  // 5. Call Logs (Sample top 10)
  const calls = await CallLog.findAll({
    limit: 10,
    order: [['createdAt', 'DESC']],
    include: [
      { association: 'employee', attributes: ['full_name'] },
      { association: 'callForm', attributes: ['company_name'] },
    ],
  });
  console.log('\n📞 CALL LOGS (Top 10 Recent):');
  console.table(calls.map((c) => ({
    id: c.id.slice(0, 8) + '...',
    employee: c.employee?.full_name || c.employee_id,
    company: c.callForm?.company_name || '—',
    direction: c.call_direction,
    category: c.call_category,
    duration: `${Math.floor(c.duration_seconds / 60)}m ${c.duration_seconds % 60}s`,
    has_recording: c.has_recording ? 'YES' : 'NO',
  })));

  // 6. Call Recordings (Sample top 5)
  const recordings = await CallRecording.findAll({ limit: 5 });
  console.log('\n🎙️ CALL RECORDINGS (Top 5):');
  console.table(recordings.map((r) => ({
    device_serial: r.device_serial,
    file_size_mb: (r.file_size_bytes / (1024 * 1024)).toFixed(2) + ' MB',
    s3_key: r.s3_key,
    upload_status: r.upload_status,
  })));

  // 7. Audit Logs
  const auditLogs = await AuditLog.findAll({ limit: 5 });
  console.log('\n📋 AUDIT LOGS (Top 5):');
  console.table(auditLogs.map((a) => ({
    admin_user: a.admin_user,
    action: a.action,
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    ip_address: a.ip_address,
  })));

  console.log('\n✅ Data check completed successfully!\n');
  process.exit(0);
}

displayData().catch((err) => {
  console.error('❌ Error viewing data:', err);
  process.exit(1);
});
