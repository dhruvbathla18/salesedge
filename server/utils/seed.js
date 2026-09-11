/**
 * Database Seeding Script - Sequelize/PostgreSQL
 * Seeds sample data for Call Tracking App
 * 
 * Usage: npm run seed
 * 
 * Order: employees → devices → call_logs → call_form_data → call_recordings → audit_logs
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/db.js';
import {
  Employee,
  Device,
  CallLog,
  CallFormData,
  CallRecording,
  AuditLog,
} from '../models/index.js';

const seedData = async () => {
  let transaction;
  try {
    // Establish connection
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    // Start transaction
    transaction = await sequelize.transaction();
    console.log('📋 Starting seed transaction...\n');

    // =====================================================================
    // CLEAR EXISTING SEED DATA (to allow re-seeding)
    // =====================================================================
    console.log('🗑️  Clearing existing seed data...');
    // Delete in reverse order of foreign key dependencies
    await AuditLog.destroy({ where: {}, transaction, force: true });
    await CallRecording.destroy({ where: {}, transaction, force: true });
    await CallFormData.destroy({ where: {}, transaction, force: true });
    await CallLog.destroy({ where: {}, transaction, force: true });
    await Device.destroy({ where: {}, transaction, force: true });
    await Employee.destroy({ where: {}, transaction, force: true });
    console.log('   ✓ Tables cleared\n');

    // =====================================================================
    // 1. SEED EMPLOYEES (4 records)
    // =====================================================================
    console.log('👥 Seeding employees...');
    const employeesData = [
      {
        emp_id: 'EMP-001',
        full_name: 'Priya Sharma',
        email: 'priya@mistavinya.com',
        phone_number: '+919876543210',
        designation: 'Sales Manager',
        is_active: true,
      },
      {
        emp_id: 'EMP-002',
        full_name: 'Arjun Patel',
        email: 'arjun@mistavinya.com',
        phone_number: '+919876543211',
        designation: 'Sales Executive',
        is_active: true,
      },
      {
        emp_id: 'EMP-003',
        full_name: 'Kavya Reddy',
        email: 'kavya@mistavinya.com',
        phone_number: '+919876543212',
        designation: 'Sales Executive',
        is_active: true,
      },
      {
        emp_id: 'EMP-004',
        full_name: 'Rohan Singh',
        email: 'rohan@mistavinya.com',
        phone_number: '+919876543213',
        designation: 'Sales Rep',
        is_active: true,
      },
    ];

    const employees = await Employee.bulkCreate(employeesData, { transaction });
    console.log(`   ✓ Created ${employees.length} employees\n`);

    // =====================================================================
    // 2. SEED DEVICES (3 records)
    // =====================================================================
    console.log('📱 Seeding devices...');
    const devicesData = [
      {
        serial_number: 'SN-SAM-001',
        employee_id: 'EMP-001',
        imei_1: '351234567890001',
        imei_2: '351234567890002',
        phone_number_1: '+919876543210',
        phone_number_2: '+919876543220',
        link_status: 'AUTO_LINKED',
        linked_at: new Date('2026-09-02T10:00:00Z'),
        linked_by: 'SYSTEM',
        is_active: true,
      },
      {
        serial_number: 'SN-SAM-002',
        employee_id: 'EMP-002',
        imei_1: '351234567890003',
        imei_2: '351234567890004',
        phone_number_1: '+919876543211',
        phone_number_2: '+919876543221',
        link_status: 'MANUAL_LINKED',
        linked_at: new Date('2026-09-01T15:30:00Z'),
        linked_by: 'admin',
        is_active: true,
      },
      {
        serial_number: 'SN-SAM-003',
        employee_id: null, // Unlinked
        imei_1: '351234567890005',
        imei_2: null,
        phone_number_1: '+919876543214',
        phone_number_2: null,
        link_status: 'UNLINKED',
        linked_at: null,
        linked_by: null,
        is_active: true,
      },
    ];

    const devices = await Device.bulkCreate(devicesData, { transaction });
    console.log(`   ✓ Created ${devices.length} devices\n`);

    // =====================================================================
    // 3. SEED CALL LOGS (5 records)
    // =====================================================================
    console.log('📞 Seeding call logs...');
    const callLogsData = [
      {
        id: uuidv4(),
        device_serial: 'SN-SAM-001',
        employee_id: 'EMP-001',
        call_direction: 'OUTGOING',
        caller_number: '+919876543210',
        callee_number: '+919800011122',
        duration_seconds: 180,
        call_category: 'CLIENT',
        is_form_required: true,
        is_form_submitted: true,
        has_recording: true,
      },
      {
        id: uuidv4(),
        device_serial: 'SN-SAM-001',
        employee_id: 'EMP-001',
        call_direction: 'INCOMING',
        caller_number: '+919876543211',
        callee_number: '+919876543210',
        duration_seconds: 120,
        call_category: 'TEAM_MEMBER',
        is_form_required: false,
        is_form_submitted: false,
        has_recording: true,
      },
      {
        id: uuidv4(),
        device_serial: 'SN-SAM-002',
        employee_id: 'EMP-002',
        call_direction: 'OUTGOING',
        caller_number: '+919876543211',
        callee_number: '+919800033344',
        duration_seconds: 90,
        call_category: 'CLIENT',
        is_form_required: true,
        is_form_submitted: false,
        has_recording: true,
      },
      {
        id: uuidv4(),
        device_serial: 'SN-SAM-002',
        employee_id: 'EMP-002',
        call_direction: 'OUTGOING',
        caller_number: '+919876543211',
        callee_number: '+919999988877',
        duration_seconds: 45,
        call_category: 'PERSONAL',
        is_form_required: false,
        is_form_submitted: false,
        has_recording: false,
      },
      {
        id: uuidv4(),
        device_serial: 'SN-SAM-001',
        employee_id: 'EMP-001',
        call_direction: 'MISSED',
        caller_number: '+919800055566',
        callee_number: '+919876543210',
        duration_seconds: 0,
        call_category: 'MISSED',
        is_form_required: false,
        is_form_submitted: false,
        has_recording: false,
      },
    ];

    const callLogs = await CallLog.bulkCreate(callLogsData, { transaction });
    console.log(`   ✓ Created ${callLogs.length} call logs\n`);

    // =====================================================================
    // 4. SEED CALL FORM DATA (2 records - CLIENT calls only)
    // =====================================================================
    console.log('📝 Seeding call form data...');
    const formData = [
      {
        id: uuidv4(),
        call_log_id: callLogs[0].id, // First CLIENT call
        company_name: 'TechCorp India',
        customer_name: 'Amit Kumar',
        reason_for_call: 'Product demo follow-up',
        notes: 'Interested in enterprise plan',
      },
      {
        id: uuidv4(),
        call_log_id: callLogs[2].id, // Third CLIENT call
        company_name: 'GlobalSoft Pvt Ltd',
        customer_name: 'Sneha Verma',
        reason_for_call: 'New client onboarding',
        notes: 'Needs pricing details',
      },
    ];

    const callForms = await CallFormData.bulkCreate(formData, { transaction });
    console.log(`   ✓ Created ${callForms.length} call forms\n`);

    // =====================================================================
    // 5. SEED CALL RECORDINGS (3 records - CLIENT + TEAM_MEMBER)
    // =====================================================================
    console.log('🎙️ Seeding call recordings...');
    const recordingsData = [
      {
        id: uuidv4(),
        call_log_id: callLogs[0].id, // First CLIENT call
        device_serial: 'SN-SAM-001',
        file_size_bytes: 2048000,
        s3_bucket: 'mist-avinya-recordings',
        s3_key: `recordings/EMP-001/2026/09/02/${callLogs[0].id}/recording.mp3`,
        upload_status: 'COMPLETED',
        retry_count: 0,
      },
      {
        id: uuidv4(),
        call_log_id: callLogs[1].id, // Second TEAM_MEMBER call
        device_serial: 'SN-SAM-001',
        file_size_bytes: 1536000,
        s3_bucket: 'mist-avinya-recordings',
        s3_key: `recordings/EMP-001/2026/09/02/${callLogs[1].id}/recording.mp3`,
        upload_status: 'COMPLETED',
        retry_count: 0,
      },
      {
        id: uuidv4(),
        call_log_id: callLogs[2].id, // Third CLIENT call
        device_serial: 'SN-SAM-002',
        file_size_bytes: 1024000,
        s3_bucket: 'mist-avinya-recordings',
        s3_key: `recordings/EMP-002/2026/09/02/${callLogs[2].id}/recording.mp3`,
        upload_status: 'PENDING',
        retry_count: 0,
      },
    ];

    const recordings = await CallRecording.bulkCreate(recordingsData, { transaction });
    console.log(`   ✓ Created ${recordings.length} call recordings\n`);

    // =====================================================================
    // 6. SEED AUDIT LOGS (2 records - IMMUTABLE)
    // =====================================================================
    console.log('📋 Seeding audit logs...');
    const auditLogsData = [
      {
        id: uuidv4(),
        admin_user: 'admin',
        action: 'CREATE',
        entity_type: 'EMPLOYEE',
        entity_id: 'EMP-001',
        old_values: null,
        new_values: { name: 'Priya Sharma', email: 'priya@mistavinya.com' },
        ip_address: '192.168.1.1',
        user_agent: 'Seed Script/1.0',
      },
      {
        id: uuidv4(),
        admin_user: 'admin',
        action: 'CREATE',
        entity_type: 'DEVICE',
        entity_id: 'SN-SAM-002',
        old_values: null,
        new_values: { serial_number: 'SN-SAM-002', employee_id: 'EMP-002' },
        ip_address: '192.168.1.1',
        user_agent: 'Seed Script/1.0',
      },
    ];

    const auditLogs = await AuditLog.bulkCreate(auditLogsData, { transaction });
    console.log(`   ✓ Created ${auditLogs.length} audit logs\n`);

    // =====================================================================
    // COMMIT TRANSACTION
    // =====================================================================
    await transaction.commit();
    console.log('✅ Seeding complete\n');
    console.log('📊 Summary:');
    console.log(`   Employees:         ${employees.length}`);
    console.log(`   Devices:           ${devices.length}`);
    console.log(`   Call Logs:         ${callLogs.length}`);
    console.log(`   Call Forms:        ${callForms.length}`);
    console.log(`   Call Recordings:   ${recordings.length}`);
    console.log(`   Audit Logs:        ${auditLogs.length}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    // Rollback transaction on error
    if (transaction) {
      await transaction.rollback();
    }

    console.error('❌ Seeding failed:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors.map(e => ({ path: e.path, message: e.message })));
    }
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
  }
};

// Run the seed
seedData();
