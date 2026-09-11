/**
 * Seed Script - Comprehensive Sample Data for PostgreSQL
 * Populates PostgreSQL database with realistic sample data matching the design schema
 * 
 * Usage: npm run seed (or node scripts/seed.js)
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import sequelize, { connectDB, syncDB } from '../config/db.js';
import {
  User,
  Employee,
  Device,
  CallLog,
  CallFormData,
  CallRecording,
  AuditLog,
} from '../models/index.js';

// ============================================================================
// SAMPLE DATA DEFINITIONS
// ============================================================================

const sampleEmployees = [
  {
    emp_id: 'EMP-0001',
    full_name: 'Priya Sharma',
    email: 'priya.sharma@mistavinya.com',
    phone_number: '+919876543210',
    designation: 'Senior Sales Executive',
    is_active: true,
  },
  {
    emp_id: 'EMP-0002',
    full_name: 'Arjun Mehta',
    email: 'arjun.mehta@mistavinya.com',
    phone_number: '+919876543211',
    designation: 'Enterprise Account Manager',
    is_active: true,
  },
  {
    emp_id: 'EMP-0003',
    full_name: 'Kavya Nair',
    email: 'kavya.nair@mistavinya.com',
    phone_number: '+919876543212',
    designation: 'Business Development Manager',
    is_active: true,
  },
  {
    emp_id: 'EMP-0004',
    full_name: 'Rohan Kapoor',
    email: 'rohan.kapoor@mistavinya.com',
    phone_number: '+919876543213',
    designation: 'Inside Sales Representative',
    is_active: true,
  },
  {
    emp_id: 'EMP-0005',
    full_name: 'Sneha Patel',
    email: 'sneha.patel@mistavinya.com',
    phone_number: '+919876543214',
    designation: 'Field Sales Lead',
    is_active: true,
  },
  {
    emp_id: 'EMP-0006',
    full_name: 'Vikram Singh',
    email: 'vikram.singh@mistavinya.com',
    phone_number: '+919876543215',
    designation: 'Client Success Specialist',
    is_active: false,
  },
  // --- SOLUTIONS & CUSTOMER SUCCESS TEAM ---
  {
    emp_id: 'EMP-0007',
    full_name: 'Ananya Deshmukh',
    email: 'ananya.deshmukh@mistavinya.com',
    phone_number: '+919876543220',
    designation: 'Customer Success Lead',
    is_active: true,
  },
  {
    emp_id: 'EMP-0008',
    full_name: 'Aditya Verma',
    email: 'aditya.verma@mistavinya.com',
    phone_number: '+919876543221',
    designation: 'Solutions Architect',
    is_active: true,
  },
  {
    emp_id: 'EMP-0009',
    full_name: 'Pooja Hegde',
    email: 'pooja.hegde@mistavinya.com',
    phone_number: '+919876543222',
    designation: 'Outbound Growth Specialist',
    is_active: true,
  },
  {
    emp_id: 'EMP-0010',
    full_name: 'Rahul Joshi',
    email: 'rahul.joshi@mistavinya.com',
    phone_number: '+919876543223',
    designation: 'Technical Support Engineer',
    is_active: true,
  },
  {
    emp_id: 'EMP-0011',
    full_name: 'Tanvi Saxena',
    email: 'tanvi.saxena@mistavinya.com',
    phone_number: '+919876543224',
    designation: 'Strategic Account Executive',
    is_active: true,
  },
  {
    emp_id: 'EMP-0012',
    full_name: 'Karan Malhotra',
    email: 'karan.malhotra@mistavinya.com',
    phone_number: '+919876543225',
    designation: 'Client Retention Specialist',
    is_active: true,
  },
];

const sampleDevices = [
  {
    serial_number: 'DEVICE-001',
    employee_id: 'EMP-0001',
    imei_1: '356938035643809',
    imei_2: null,
    phone_number_1: '+919876543210',
    phone_number_2: null,
    link_status: 'MANUAL_LINKED',
    linked_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    linked_by: 'admin@mistavinya.local',
    is_active: true,
    registered_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(),
    last_sync_at: new Date(),
  },
  {
    serial_number: 'DEVICE-002',
    employee_id: 'EMP-0002',
    imei_1: '867965033458901',
    imei_2: null,
    phone_number_1: '+919876543211',
    phone_number_2: null,
    link_status: 'AUTO_LINKED',
    linked_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    linked_by: null,
    is_active: true,
    registered_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(),
    last_sync_at: new Date(),
  },
  {
    serial_number: 'DEVICE-003',
    employee_id: 'EMP-0003',
    imei_1: '901245036854901',
    imei_2: null,
    phone_number_1: '+919876543212',
    phone_number_2: null,
    link_status: 'AUTO_LINKED',
    linked_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    linked_by: null,
    is_active: true,
    registered_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(),
    last_sync_at: new Date(),
  },
  {
    serial_number: 'DEVICE-004',
    employee_id: 'EMP-0004',
    imei_1: '449210037162940',
    imei_2: null,
    phone_number_1: '+919876543213',
    phone_number_2: null,
    link_status: 'MANUAL_LINKED',
    linked_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    linked_by: 'admin@mistavinya.local',
    is_active: true,
    registered_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(),
    last_sync_at: new Date(),
  },
  {
    serial_number: 'DEVICE-005',
    employee_id: 'EMP-0005',
    imei_1: '772091038291047',
    imei_2: null,
    phone_number_1: '+919876543214',
    phone_number_2: null,
    link_status: 'AUTO_LINKED',
    linked_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    linked_by: null,
    is_active: true,
    registered_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(),
    last_sync_at: new Date(),
  },
  {
    serial_number: 'DEVICE-006',
    employee_id: 'EMP-0006',
    imei_1: '198302049281720',
    imei_2: null,
    phone_number_1: '+919876543215',
    phone_number_2: null,
    link_status: 'DEACTIVATED',
    linked_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    linked_by: 'admin@mistavinya.local',
    is_active: false,
    registered_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    last_sync_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    serial_number: 'DEVICE-007',
    employee_id: null,
    imei_1: '663920194827104',
    imei_2: null,
    phone_number_1: '+919876543216',
    phone_number_2: null,
    link_status: 'UNLINKED',
    linked_at: null,
    linked_by: null,
    is_active: true,
    registered_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    last_seen_at: null,
    last_sync_at: null,
  },
  {
    serial_number: 'DEVICE-008',
    employee_id: null,
    imei_1: '554920183746291',
    imei_2: null,
    phone_number_1: '+919876543217',
    phone_number_2: null,
    link_status: 'UNLINKED',
    linked_at: null,
    linked_by: null,
    is_active: true,
    registered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    last_seen_at: null,
    last_sync_at: null,
  },
  {
    serial_number: 'DEVICE-009',
    employee_id: 'EMP-0007',
    imei_1: '359812048592014',
    imei_2: null,
    phone_number_1: '+919876543220',
    phone_number_2: null,
    link_status: 'AUTO_LINKED',
    linked_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    linked_by: null,
    is_active: true,
    registered_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(),
    last_sync_at: new Date(),
  },
  {
    serial_number: 'DEVICE-010',
    employee_id: 'EMP-0008',
    imei_1: '861294039182740',
    imei_2: null,
    phone_number_1: '+919876543221',
    phone_number_2: null,
    link_status: 'MANUAL_LINKED',
    linked_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    linked_by: 'admin@mistavinya.local',
    is_active: true,
    registered_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(),
    last_sync_at: new Date(),
  },
  {
    serial_number: 'DEVICE-011',
    employee_id: 'EMP-0009',
    imei_1: '448192038475819',
    imei_2: null,
    phone_number_1: '+919876543222',
    phone_number_2: null,
    link_status: 'AUTO_LINKED',
    linked_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    linked_by: null,
    is_active: true,
    registered_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(),
    last_sync_at: new Date(),
  },
  {
    serial_number: 'DEVICE-012',
    employee_id: 'EMP-0010',
    imei_1: '771920384756192',
    imei_2: null,
    phone_number_1: '+919876543223',
    phone_number_2: null,
    link_status: 'AUTO_LINKED',
    linked_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    linked_by: null,
    is_active: true,
    registered_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(),
    last_sync_at: new Date(),
  },
  {
    serial_number: 'DEVICE-013',
    employee_id: 'EMP-0011',
    imei_1: '908129485710293',
    imei_2: null,
    phone_number_1: '+919876543224',
    phone_number_2: null,
    link_status: 'AUTO_LINKED',
    linked_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    linked_by: null,
    is_active: true,
    registered_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(),
    last_sync_at: new Date(),
  },
  {
    serial_number: 'DEVICE-014',
    employee_id: 'EMP-0012',
    imei_1: '198273645019283',
    imei_2: null,
    phone_number_1: '+919876543225',
    phone_number_2: null,
    link_status: 'MANUAL_LINKED',
    linked_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    linked_by: 'admin@mistavinya.local',
    is_active: true,
    registered_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    last_seen_at: new Date(),
    last_sync_at: new Date(),
  },
];

// Helper to generate past dates
const pastDate = (hoursAgo = 0) => new Date(Date.now() - hoursAgo * 3600 * 1000);

const callTemplates = [
  // PRIYA SHARMA (EMP-0001) - 10 calls
  {
    device_serial: 'DEVICE-001',
    employee_id: 'EMP-0001',
    call_direction: 'OUTGOING',
    caller_number: '+919876543210',
    callee_number: '+919811223344',
    duration_seconds: 522, // 8:42
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(2),
    company: 'Nexus Systems',
    customer: 'Sanjay Iyer',
    reason: 'Quarterly review & enterprise license expansion discussion',
    notes: 'Client confirmed renewal with 20 additional seats. Agreed to follow-up on pricing addendum.',
  },
  {
    device_serial: 'DEVICE-001',
    employee_id: 'EMP-0001',
    call_direction: 'INCOMING',
    caller_number: '+919822334455',
    callee_number: '+919876543210',
    duration_seconds: 375, // 6:15
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(5),
    company: 'Atlas Infotech',
    customer: 'Meera Rao',
    reason: 'Product onboarding inquiry and SLA clarification',
    notes: 'Walked customer through API dashboard integration. Everything resolved.',
  },
  {
    device_serial: 'DEVICE-001',
    employee_id: 'EMP-0001',
    call_direction: 'OUTGOING',
    caller_number: '+919876543210',
    callee_number: '+919876543211',
    duration_seconds: 180, // 3:00
    call_category: 'TEAM_MEMBER',
    is_form_required: false,
    is_form_submitted: false,
    has_recording: true,
    createdAt: pastDate(8),
  },
  {
    device_serial: 'DEVICE-001',
    employee_id: 'EMP-0001',
    call_direction: 'OUTGOING',
    caller_number: '+919876543210',
    callee_number: '+919833445566',
    duration_seconds: 642, // 10:42
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(24),
    company: 'Brightline Media',
    customer: 'Aditi Bose',
    reason: 'Annual contract negotiation and discount structure',
    notes: 'Sent formal quotation with 10% volume tier discount.',
  },
  {
    device_serial: 'DEVICE-001',
    employee_id: 'EMP-0001',
    call_direction: 'INCOMING',
    caller_number: '+919844556677',
    callee_number: '+919876543210',
    duration_seconds: 0,
    call_category: 'MISSED',
    is_form_required: false,
    is_form_submitted: false,
    has_recording: false,
    createdAt: pastDate(28),
  },
  {
    device_serial: 'DEVICE-001',
    employee_id: 'EMP-0001',
    call_direction: 'OUTGOING',
    caller_number: '+919876543210',
    callee_number: '+919999888877',
    duration_seconds: 90,
    call_category: 'PERSONAL',
    is_form_required: false,
    is_form_submitted: false,
    has_recording: false,
    createdAt: pastDate(32),
  },
  {
    device_serial: 'DEVICE-001',
    employee_id: 'EMP-0001',
    call_direction: 'OUTGOING',
    caller_number: '+919876543210',
    callee_number: '+919855667788',
    duration_seconds: 480, // 8:00
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(48),
    company: 'Zenith Global',
    customer: 'Rahul Verma',
    reason: 'Feature demonstration and pilot program kickoff',
    notes: 'Pilot initiated for 14-day trial period. Check-in scheduled for Friday.',
  },
  {
    device_serial: 'DEVICE-001',
    employee_id: 'EMP-0001',
    call_direction: 'INCOMING',
    caller_number: '+919866778899',
    callee_number: '+919876543210',
    duration_seconds: 410,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(72),
    company: 'Vertex Labs',
    customer: 'Deepak Shah',
    reason: 'Security compliance review and DPA sign-off',
    notes: 'Provided SOC2 Type II report and ISO certificates.',
  },

  // ARJUN MEHTA (EMP-0002) - 8 calls
  {
    device_serial: 'DEVICE-002',
    employee_id: 'EMP-0002',
    call_direction: 'INCOMING',
    caller_number: '+919877889900',
    callee_number: '+919876543211',
    duration_seconds: 196, // 3:16
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(3),
    company: 'Acuity Partners',
    customer: 'Ananya Deshmukh',
    reason: 'Executive consultation on data migration pipeline',
    notes: 'Migration timeline confirmed for weekend deployment.',
  },
  {
    device_serial: 'DEVICE-002',
    employee_id: 'EMP-0002',
    call_direction: 'OUTGOING',
    caller_number: '+919876543211',
    callee_number: '+919888990011',
    duration_seconds: 560, // 9:20
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(7),
    company: 'CloudScale Technologies',
    customer: 'Sameer Kulkarni',
    reason: 'Multi-region enterprise architecture discussion',
    notes: 'Drafted architecture diagram with failover redundancy requirements.',
  },
  {
    device_serial: 'DEVICE-002',
    employee_id: 'EMP-0002',
    call_direction: 'INCOMING',
    caller_number: '+919876543212',
    callee_number: '+919876543211',
    duration_seconds: 240,
    call_category: 'TEAM_MEMBER',
    is_form_required: false,
    is_form_submitted: false,
    has_recording: true,
    createdAt: pastDate(12),
  },
  {
    device_serial: 'DEVICE-002',
    employee_id: 'EMP-0002',
    call_direction: 'OUTGOING',
    caller_number: '+919876543211',
    callee_number: '+919899001122',
    duration_seconds: 710, // 11:50
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(26),
    company: 'Horizon Retail',
    customer: 'Pooja Hegde',
    reason: 'POS integration timeline review',
    notes: 'Agreed on webhook payload specs and test endpoints.',
  },
  {
    device_serial: 'DEVICE-002',
    employee_id: 'EMP-0002',
    call_direction: 'OUTGOING',
    caller_number: '+919876543211',
    callee_number: '+919900112233',
    duration_seconds: 320,
    call_category: 'PERSONAL',
    is_form_required: false,
    is_form_submitted: false,
    has_recording: false,
    createdAt: pastDate(40),
  },
  {
    device_serial: 'DEVICE-002',
    employee_id: 'EMP-0002',
    call_direction: 'INCOMING',
    caller_number: '+919911223344',
    callee_number: '+919876543211',
    duration_seconds: 0,
    call_category: 'MISSED',
    is_form_required: false,
    is_form_submitted: false,
    has_recording: false,
    createdAt: pastDate(50),
  },
  {
    device_serial: 'DEVICE-002',
    employee_id: 'EMP-0002',
    call_direction: 'OUTGOING',
    caller_number: '+919876543211',
    callee_number: '+919922334455',
    duration_seconds: 450,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(68),
    company: 'Quantum Logistics',
    customer: 'Rajesh Gupta',
    reason: 'Fleet tracking API usage review',
    notes: 'Provided custom rate limit increase for peak holiday dispatch.',
  },

  // KAVYA NAIR (EMP-0003) - 8 calls
  {
    device_serial: 'DEVICE-003',
    employee_id: 'EMP-0003',
    call_direction: 'OUTGOING',
    caller_number: '+919876543212',
    callee_number: '+919933445566',
    duration_seconds: 663, // 11:03
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(4),
    company: 'FinPulse Capital',
    customer: 'Sunita Menon',
    reason: 'Fintech compliance and real-time recording audit',
    notes: 'Reviewed encrypted storage compliance. Prospect requested formal Master Services Agreement.',
  },
  {
    device_serial: 'DEVICE-003',
    employee_id: 'EMP-0003',
    call_direction: 'INCOMING',
    caller_number: '+919944556677',
    callee_number: '+919876543212',
    duration_seconds: 280,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(9),
    company: 'Nexus Systems',
    customer: 'Sanjay Iyer',
    reason: 'Follow-up regarding custom webhook delivery',
    notes: 'Assigned engineering ticket for webhook signature verification.',
  },
  {
    device_serial: 'DEVICE-003',
    employee_id: 'EMP-0003',
    call_direction: 'OUTGOING',
    caller_number: '+919876543212',
    callee_number: '+919876543213',
    duration_seconds: 145,
    call_category: 'TEAM_MEMBER',
    is_form_required: false,
    is_form_submitted: false,
    has_recording: true,
    createdAt: pastDate(18),
  },
  {
    device_serial: 'DEVICE-003',
    employee_id: 'EMP-0003',
    call_direction: 'OUTGOING',
    caller_number: '+919876543212',
    callee_number: '+919955667788',
    duration_seconds: 530,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(30),
    company: 'Atlas Infotech',
    customer: 'Meera Rao',
    reason: 'Integration test validation session',
    notes: 'Completed end-to-end webhook validation successfully.',
  },
  {
    device_serial: 'DEVICE-003',
    employee_id: 'EMP-0003',
    call_direction: 'INCOMING',
    caller_number: '+919966778899',
    callee_number: '+919876543212',
    duration_seconds: 0,
    call_category: 'MISSED',
    is_form_required: false,
    is_form_submitted: false,
    has_recording: false,
    createdAt: pastDate(42),
  },
  {
    device_serial: 'DEVICE-003',
    employee_id: 'EMP-0003',
    call_direction: 'OUTGOING',
    caller_number: '+919876543212',
    callee_number: '+919977889900',
    duration_seconds: 390,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(54),
    company: 'Brightline Media',
    customer: 'Aditi Bose',
    reason: 'Campaign launch tracking and call metrics review',
    notes: 'Client expressed high satisfaction with reporting response times.',
  },

  // ROHAN KAPOOR (EMP-0004) - 6 calls
  {
    device_serial: 'DEVICE-004',
    employee_id: 'EMP-0004',
    call_direction: 'INCOMING',
    caller_number: '+919988990011',
    callee_number: '+919876543213',
    duration_seconds: 72,
    call_category: 'PERSONAL',
    is_form_required: false,
    is_form_submitted: false,
    has_recording: false,
    createdAt: pastDate(6),
  },
  {
    device_serial: 'DEVICE-004',
    employee_id: 'EMP-0004',
    call_direction: 'OUTGOING',
    caller_number: '+919876543213',
    callee_number: '+919855667788',
    duration_seconds: 490,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(14),
    company: 'Zenith Global',
    customer: 'Rahul Verma',
    reason: 'Sales pitch for secondary division rollout',
    notes: 'Demo booked for executive board next Tuesday.',
  },
  {
    device_serial: 'DEVICE-004',
    employee_id: 'EMP-0004',
    call_direction: 'INCOMING',
    caller_number: '+919866778899',
    callee_number: '+919876543213',
    duration_seconds: 310,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(22),
    company: 'Vertex Labs',
    customer: 'Deepak Shah',
    reason: 'Billing cycle inquiry and invoice confirmation',
    notes: 'Shared updated billing portal access details.',
  },
  {
    device_serial: 'DEVICE-004',
    employee_id: 'EMP-0004',
    call_direction: 'OUTGOING',
    caller_number: '+919876543213',
    callee_number: '+919876543210',
    duration_seconds: 210,
    call_category: 'TEAM_MEMBER',
    is_form_required: false,
    is_form_submitted: false,
    has_recording: true,
    createdAt: pastDate(36),
  },

  // SNEHA PATEL (EMP-0005) - 6 calls
  {
    device_serial: 'DEVICE-005',
    employee_id: 'EMP-0005',
    call_direction: 'OUTGOING',
    caller_number: '+919876543214',
    callee_number: '+919877889900',
    duration_seconds: 615,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(1),
    company: 'Acuity Partners',
    customer: 'Ananya Deshmukh',
    reason: 'Field site demo and hardware audit checklist',
    notes: 'All 8 field site locations configured with SIM provisioning.',
  },
  {
    device_serial: 'DEVICE-005',
    employee_id: 'EMP-0005',
    call_direction: 'INCOMING',
    caller_number: '+919888990011',
    callee_number: '+919876543214',
    duration_seconds: 440,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(11),
    company: 'CloudScale Technologies',
    customer: 'Sameer Kulkarni',
    reason: 'Technical query on auto-linking logic',
    notes: 'Explained auto-linking mechanism using SIM matching.',
  },
  {
    device_serial: 'DEVICE-005',
    employee_id: 'EMP-0005',
    call_direction: 'OUTGOING',
    caller_number: '+919876543214',
    callee_number: '+919922334455',
    duration_seconds: 510,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(20),
    company: 'Quantum Logistics',
    customer: 'Rajesh Gupta',
    reason: 'Driver mobile app sync status check',
    notes: 'Confirmed 99.8% recording sync rate across mobile endpoints.',
  },

  // ANANYA DESHMUKH (EMP-0007) - Customer Success Lead (4 calls)
  {
    device_serial: 'DEVICE-009',
    employee_id: 'EMP-0007',
    call_direction: 'INCOMING',
    caller_number: '+919811002233',
    callee_number: '+919876543220',
    duration_seconds: 480, // 8:00
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(3),
    company: 'CyberShield Infosec',
    customer: 'Vikrant Roy',
    reason: 'Quarterly customer health check & license tier expansion',
    notes: 'Customer very happy with recording compliance. Upsold 15 additional team seats.',
  },
  {
    device_serial: 'DEVICE-009',
    employee_id: 'EMP-0007',
    call_direction: 'OUTGOING',
    caller_number: '+919876543220',
    callee_number: '+919822113344',
    duration_seconds: 360, // 6:00
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(14),
    company: 'OmniHealth Systems',
    customer: 'Dr. Shalini Sen',
    reason: 'Support ticket resolution review & workflow training',
    notes: 'Walked medical staff through automated call categorization tags.',
  },
  {
    device_serial: 'DEVICE-009',
    employee_id: 'EMP-0007',
    call_direction: 'OUTGOING',
    caller_number: '+919876543220',
    callee_number: '+919876543221',
    duration_seconds: 180,
    call_category: 'TEAM_MEMBER',
    is_form_required: false,
    is_form_submitted: false,
    has_recording: true,
    createdAt: pastDate(25),
  },

  // ADITYA VERMA (EMP-0008) - Solutions Architect (3 calls)
  {
    device_serial: 'DEVICE-010',
    employee_id: 'EMP-0008',
    call_direction: 'OUTGOING',
    caller_number: '+919876543221',
    callee_number: '+919833224455',
    duration_seconds: 720, // 12:00
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(5),
    company: 'Apex Logistics',
    customer: 'Harsh Vardhan',
    reason: 'Pre-sales technical architecture review and S3 webhook topology',
    notes: 'Architected private VPC endpoint integration for call audio streaming.',
  },
  {
    device_serial: 'DEVICE-010',
    employee_id: 'EMP-0008',
    call_direction: 'INCOMING',
    caller_number: '+919844335566',
    callee_number: '+919876543221',
    duration_seconds: 410,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(16),
    company: 'Starlight Media',
    customer: 'Karan Mehra',
    reason: 'SSO and OAuth2 security integration consultation',
    notes: 'Configured Okta SAML 2.0 endpoint parameters with security admin.',
  },

  // POOJA HEGDE (EMP-0009) - Outbound Growth Specialist (4 calls)
  {
    device_serial: 'DEVICE-011',
    employee_id: 'EMP-0009',
    call_direction: 'OUTGOING',
    caller_number: '+919876543222',
    callee_number: '+919855446677',
    duration_seconds: 540, // 9:00
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(4),
    company: 'InfraCore Cloud',
    customer: 'Ritu Ganguly',
    reason: 'Cold outreach follow-up and enterprise sales platform demo',
    notes: 'Scheduled 30-minute product demonstration for tech leadership on Monday.',
  },
  {
    device_serial: 'DEVICE-011',
    employee_id: 'EMP-0009',
    call_direction: 'OUTGOING',
    caller_number: '+919876543222',
    callee_number: '+919855667788',
    duration_seconds: 320,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(19),
    company: 'Zenith Global',
    customer: 'Rahul Verma',
    reason: 'Outbound sales alignment meeting for EMEA region',
    notes: 'Shared case study on 40% reduction in customer response latency.',
  },

  // RAHUL JOSHI (EMP-0010) - Technical Support Engineer (3 calls)
  {
    device_serial: 'DEVICE-012',
    employee_id: 'EMP-0010',
    call_direction: 'INCOMING',
    caller_number: '+919866557788',
    callee_number: '+919876543223',
    duration_seconds: 390,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(7),
    company: 'FinPulse Capital',
    customer: 'Sunita Menon',
    reason: 'Assisted with device linking and audio recording permissions',
    notes: 'Reset device pairing token and confirmed test recording sync successfully.',
  },
  {
    device_serial: 'DEVICE-012',
    employee_id: 'EMP-0010',
    call_direction: 'OUTGOING',
    caller_number: '+919876543223',
    callee_number: '+919833445566',
    duration_seconds: 240,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(22),
    company: 'Brightline Media',
    customer: 'Aditi Bose',
    reason: 'Follow-up regarding scheduled daily analytics export',
    notes: 'Verified automated S3 CSV dump configured properly for analytics team.',
  },

  // TANVI SAXENA (EMP-0011) - Strategic Account Executive (3 calls)
  {
    device_serial: 'DEVICE-013',
    employee_id: 'EMP-0011',
    call_direction: 'OUTGOING',
    caller_number: '+919876543224',
    callee_number: '+919811223344',
    duration_seconds: 680, // 11:20
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(6),
    company: 'Nexus Systems',
    customer: 'Sanjay Iyer',
    reason: 'Annual Enterprise Agreement negotiation and SLA sign-off',
    notes: 'Client agreed to 3-year term. Sent Docusign link for executive approval.',
  },
  {
    device_serial: 'DEVICE-013',
    employee_id: 'EMP-0011',
    call_direction: 'INCOMING',
    caller_number: '+919822334455',
    callee_number: '+919876543224',
    duration_seconds: 310,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(18),
    company: 'Atlas Infotech',
    customer: 'Meera Rao',
    reason: 'Expansion inquiry for offshore team accounts',
    notes: 'Prepared customized quote for 50 additional global licenses.',
  },

  // KARAN MALHOTRA (EMP-0012) - Client Retention Specialist (3 calls)
  {
    device_serial: 'DEVICE-014',
    employee_id: 'EMP-0012',
    call_direction: 'OUTGOING',
    caller_number: '+919876543225',
    callee_number: '+919866778899',
    duration_seconds: 490,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(8),
    company: 'Vertex Labs',
    customer: 'Deepak Shah',
    reason: 'Annual contract renewal discussion and feature roadmap preview',
    notes: 'Client renewed contract for 12 months. Requested beta access to upcoming AI analytics.',
  },
  {
    device_serial: 'DEVICE-014',
    employee_id: 'EMP-0012',
    call_direction: 'INCOMING',
    caller_number: '+919888990011',
    callee_number: '+919876543225',
    duration_seconds: 280,
    call_category: 'CLIENT',
    is_form_required: true,
    is_form_submitted: true,
    has_recording: true,
    createdAt: pastDate(26),
    company: 'CloudScale Technologies',
    customer: 'Sameer Kulkarni',
    reason: 'Customer satisfaction survey and feature feedback',
    notes: 'High satisfaction rating (10/10). Client commended prompt technical support.',
  },
];

// ============================================================================
// SEEDING LOGIC
// ============================================================================

const seedDatabase = async () => {
  try {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   🌱 MIST Avinya - PostgreSQL Database Seed    ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    // 1. Connect
    console.log('🔌 Connecting to PostgreSQL...');
    await connectDB();

    // 2. Sync schema tables
    console.log('📋 Synchronizing schema tables and relations...');
    await syncDB({ alter: true });

    // 3. Clear existing data safely using cascading truncate
    console.log('🗑️  Clearing existing data across all tables...');
    await sequelize.query(
      'TRUNCATE "audit_logs", "call_recordings", "call_form_data", "call_logs", "devices", "employees", "users" CASCADE;'
    );

    // 4. Seed Single Admin User
    console.log('👤 Seeding Admin User...');
    const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);

    const users = await User.bulkCreate([
      {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'MIST Avinya Admin',
        email: 'admin@mistavinya.local',
        password: adminPasswordHash,
        role: 'ADMIN',
        is_active: true,
      },
    ]);
    console.log(`   ✅ Created ${users.length} authenticated admin user`);

    // 5. Seed Employees
    console.log('👥 Seeding Employees...');
    const employees = await Employee.bulkCreate(sampleEmployees);
    console.log(`   ✅ Created ${employees.length} employee records`);

    // 6. Seed Devices
    console.log('📱 Seeding Devices...');
    const devices = await Device.bulkCreate(sampleDevices);
    console.log(`   ✅ Created ${devices.length} registered devices`);

    // 7. Seed Call Logs, Forms & Recordings
    console.log('📞 Seeding Call Logs, Form Data & Recordings...');
    const callLogsToCreate = callTemplates.map((t) => ({
      device_serial: t.device_serial,
      employee_id: t.employee_id,
      call_direction: t.call_direction,
      caller_number: t.caller_number,
      callee_number: t.callee_number,
      duration_seconds: t.duration_seconds,
      call_category: t.call_category,
      is_form_required: t.is_form_required,
      is_form_submitted: t.is_form_submitted,
      has_recording: t.has_recording,
      createdAt: t.createdAt,
      updatedAt: t.createdAt,
    }));

    const callLogs = await CallLog.bulkCreate(callLogsToCreate);
    console.log(`   ✅ Created ${callLogs.length} call log entries`);

    // Form Data
    const formsToCreate = [];
    const recordingsToCreate = [];

    callTemplates.forEach((t, index) => {
      const createdCall = callLogs[index];

      // If it's a CLIENT call, create CallFormData
      if (t.call_category === 'CLIENT' && t.company) {
        formsToCreate.push({
          call_log_id: createdCall.id,
          company_name: t.company,
          customer_name: t.customer,
          reason_for_call: t.reason,
          notes: t.notes,
          createdAt: t.createdAt,
          updatedAt: t.createdAt,
        });
      }

      // If call has a recording
      if (t.has_recording) {
        const audioFiles = [
          'call-1001-priya-nexus.wav',
          'call-1002-priya-atlas.wav',
          'call-1003-priya-team.wav',
          'call-1004-priya-brightline.wav',
          'call-1005-priya-zenith.wav',
          'call-1006-priya-vertex.wav',
          'call-1007-arjun-acuity.wav',
          'call-1008-arjun-cloudscale.wav',
          'call-1009-arjun-team.wav',
          'call-1010-arjun-horizon.wav',
          'call-1011-arjun-quantum.wav',
          'call-1012-kavya-finpulse.wav',
          'call-1013-kavya-nexus.wav',
          'call-1014-kavya-team.wav',
          'call-1015-kavya-atlas.wav',
          'call-1016-kavya-brightline.wav',
          'call-1017-rohan-zenith.wav',
          'call-1018-rohan-vertex.wav',
          'call-1019-sneha-acuity.wav',
          'call-1020-sneha-cloudscale.wav',
          'call-1021-sneha-quantum.wav',
        ];
        const audioFileName = audioFiles[recordingsToCreate.length % audioFiles.length];
        const fileSize = Math.floor(180 * 1024 + Math.random() * 120 * 1024);

        const callDate = new Date(t.createdAt);
        const yyyy = callDate.getFullYear();
        const mm = String(callDate.getMonth() + 1).padStart(2, '0');
        const dd = String(callDate.getDate()).padStart(2, '0');

        recordingsToCreate.push({
          call_log_id: createdCall.id,
          device_serial: t.device_serial,
          local_file_path: `/public/recordings/${audioFileName}`,
          file_size_bytes: fileSize,
          s3_bucket: 'mist-avinya-recordings',
          s3_key: `recordings/${t.employee_id}/${yyyy}/${mm}/${dd}/${createdCall.id}/${audioFileName}`,
          upload_status: 'COMPLETED',
          retry_count: 0,
          max_retries: 3,
          createdAt: t.createdAt,
          updatedAt: t.createdAt,
        });
      }
    });

    const forms = await CallFormData.bulkCreate(formsToCreate);
    console.log(`   ✅ Created ${forms.length} client call form records`);

    const recordings = await CallRecording.bulkCreate(recordingsToCreate);
    console.log(`   ✅ Created ${recordings.length} call recording metadata records`);

    // 8. Seed Audit Logs
    console.log('📋 Seeding Audit Logs...');
    const sampleAuditLogs = [
      {
        admin_user: 'admin@mistavinya.local',
        action: 'LOGIN',
        entity_type: 'SYSTEM',
        entity_id: 'AUTH',
        old_values: null,
        new_values: { message: 'Successful admin login from portal UI' },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        created_at: pastDate(2),
      },
      {
        admin_user: 'admin@mistavinya.local',
        action: 'CREATE',
        entity_type: 'EMPLOYEE',
        entity_id: 'EMP-0001',
        old_values: null,
        new_values: sampleEmployees[0],
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        created_at: pastDate(30 * 24),
      },
      {
        admin_user: 'admin@mistavinya.local',
        action: 'UPDATE',
        entity_type: 'DEVICE',
        entity_id: 'DEVICE-001',
        old_values: { link_status: 'UNLINKED' },
        new_values: { link_status: 'MANUAL_LINKED', employee_id: 'EMP-0001' },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        created_at: pastDate(25 * 24),
      },
      {
        admin_user: 'admin@mistavinya.local',
        action: 'VIEW',
        entity_type: 'CALL',
        entity_id: callLogs[0].id,
        old_values: null,
        new_values: { duration: callLogs[0].duration_seconds },
        ip_address: '192.168.1.105',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        created_at: pastDate(1),
      },
      {
        admin_user: 'admin@mistavinya.local',
        action: 'PLAY',
        entity_type: 'RECORDING',
        entity_id: recordings[0].id,
        old_values: null,
        new_values: { s3_key: recordings[0].s3_key },
        ip_address: '192.168.1.105',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        created_at: pastDate(1),
      },
      {
        admin_user: 'admin@mistavinya.local',
        action: 'EXPORT',
        entity_type: 'CALL',
        entity_id: 'REPORT-DAILY-0902',
        old_values: null,
        new_values: { count: callLogs.length, format: 'CSV' },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        created_at: pastDate(4),
      },
    ];

    const auditLogs = await AuditLog.bulkCreate(sampleAuditLogs);
    console.log(`   ✅ Created ${auditLogs.length} audit trail records`);

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║       🎉 PostgreSQL Seeding Completed!         ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    console.log('Summary of Seeded Data:');
    console.log(`  🔑 Users:         ${users.length} (admin@mistavinya.local / Admin@12345)`);
    console.log(`  👥 Employees:     ${employees.length}`);
    console.log(`  📱 Devices:       ${devices.length} (${devices.filter((d) => d.employee_id).length} linked, ${devices.filter((d) => !d.employee_id).length} unlinked)`);
    console.log(`  📞 Call Logs:     ${callLogs.length}`);
    console.log(`  📝 Call Forms:    ${forms.length}`);
    console.log(`  🎙️  Recordings:    ${recordings.length}`);
    console.log(`  📋 Audit Logs:    ${auditLogs.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database seeding:', error.message);
    console.error(error);
    process.exit(1);
  }
};

seedDatabase();
