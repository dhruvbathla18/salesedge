/**
 * Sequelize Models - PostgreSQL Schema
 * All 7 tables with relationships and validations
 */

import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// ============================================================================
// 0. USERS TABLE (for authentication)
// ============================================================================

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    select: false, // Exclude by default
  },
  role: {
    type: DataTypes.ENUM('ADMIN'),
    defaultValue: 'ADMIN',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['is_active'] },
  ],
});

// ============================================================================
// 1. EMPLOYEES TABLE
// ============================================================================

export const Employee = sequelize.define('Employee', {
  emp_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  phone_number: {
    type: DataTypes.STRING(20), // E.164 format
    allowNull: false,
    unique: true,
  },
  designation: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'employees',
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['phone_number'] },
    { fields: ['is_active'] },
  ],
});

// ============================================================================
// 2. DEVICES TABLE
// ============================================================================

export const Device = sequelize.define('Device', {
  serial_number: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
  },
  employee_id: {
    type: DataTypes.STRING(50),
    allowNull: true, // Device can be unlinked
  },
  imei_1: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  imei_2: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  phone_number_1: {
    type: DataTypes.STRING(20), // E.164 format
    allowNull: false,
  },
  phone_number_2: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  link_status: {
    type: DataTypes.ENUM('UNLINKED', 'AUTO_LINKED', 'MANUAL_LINKED', 'DEACTIVATED'),
    defaultValue: 'UNLINKED',
  },
  linked_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  linked_by: {
    type: DataTypes.STRING(255),
    allowNull: true, // Null if AUTO_LINKED
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  registered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  last_seen_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_sync_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'devices',
  timestamps: true,
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['link_status'] },
    { fields: ['is_active'] },
  ],
});

// ============================================================================
// 3. CALL_LOGS TABLE
// ============================================================================

export const CallLog = sequelize.define('CallLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  device_serial: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  employee_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  call_direction: {
    type: DataTypes.ENUM('INCOMING', 'OUTGOING', 'MISSED'),
    allowNull: false,
  },
  caller_number: {
    type: DataTypes.STRING(20), // E.164 format
    allowNull: false,
  },
  callee_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  duration_seconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  call_category: {
    type: DataTypes.ENUM('CLIENT', 'TEAM_MEMBER', 'PERSONAL', 'MISSED', 'PENDING'),
    defaultValue: 'PENDING',
  },
  is_form_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_form_submitted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  has_recording: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'call_logs',
  timestamps: true,
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['device_serial'] },
    { fields: ['call_category'] },
    { fields: ['created_at'] },
  ],
});

// ============================================================================
// 4. CALL_FORM_DATA TABLE (CLIENT calls only)
// ============================================================================

export const CallFormData = sequelize.define('CallFormData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  call_log_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  customer_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  reason_for_call: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'call_form_data',
  timestamps: true,
  indexes: [
    { fields: ['call_log_id'] },
    { fields: ['company_name'] },
  ],
});

// ============================================================================
// 5. CALL_RECORDINGS TABLE (CLIENT + TEAM_MEMBER only)
// ============================================================================

export const CallRecording = sequelize.define('CallRecording', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  call_log_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  device_serial: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  local_file_path: {
    type: DataTypes.STRING(500),
    allowNull: true, // Null after S3 upload
  },
  file_size_bytes: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  s3_bucket: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  s3_key: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  upload_status: {
    type: DataTypes.ENUM('PENDING', 'UPLOADING', 'COMPLETED', 'FAILED', 'RETRY_SCHEDULED'),
    defaultValue: 'PENDING',
  },
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  max_retries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
  },
  next_retry_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'call_recordings',
  timestamps: true,
  indexes: [
    { fields: ['call_log_id'] },
    { fields: ['upload_status'] },
  ],
});

// ============================================================================
// 6. AUDIT_LOGS TABLE (IMMUTABLE)
// ============================================================================

export const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  admin_user: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  action: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'VIEW', 'PLAY'),
    allowNull: false,
  },
  entity_type: {
    type: DataTypes.ENUM('EMPLOYEE', 'DEVICE', 'CALL', 'RECORDING', 'SYSTEM'),
    allowNull: false,
  },
  entity_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  old_values: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  new_values: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(45), // IPv6 support
    allowNull: false,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
}, {
  tableName: 'audit_logs',
  timestamps: false, // Immutable - no updatedAt
  createdAt: false, // Disable Sequelize's automatic createdAt
  updatedAt: false, // Disable updatedAt
  indexes: [
    { fields: ['admin_user'] },
    { fields: ['action'] },
    { fields: ['entity_type'] },
    { fields: ['created_at'] },
  ],
});

// ============================================================================
// RELATIONSHIPS (Application-Level Associations with No DB-Level FK Constraints)
// ============================================================================

// Employee 1:N Devices
Employee.hasMany(Device, { foreignKey: 'employee_id', as: 'devices', constraints: false });
Device.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee', constraints: false });

// Employee 1:N CallLogs
Employee.hasMany(CallLog, { foreignKey: 'employee_id', as: 'callLogs', constraints: false });
CallLog.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee', constraints: false });

// Device 1:N CallLogs
Device.hasMany(CallLog, { foreignKey: 'device_serial', as: 'callLogs', constraints: false });
CallLog.belongsTo(Device, { foreignKey: 'device_serial', as: 'device', constraints: false });

// CallLog 1:1 CallFormData (CLIENT only)
CallLog.hasOne(CallFormData, { foreignKey: 'call_log_id', as: 'callForm', constraints: false });
CallFormData.belongsTo(CallLog, { foreignKey: 'call_log_id', as: 'callLog', constraints: false });

// CallLog 1:1 CallRecording (CLIENT + TEAM_MEMBER only)
CallLog.hasOne(CallRecording, { foreignKey: 'call_log_id', as: 'recording', constraints: false });
CallRecording.belongsTo(CallLog, { foreignKey: 'call_log_id', as: 'callLog', constraints: false });

// Device 1:N Recordings
Device.hasMany(CallRecording, { foreignKey: 'device_serial', as: 'recordings', constraints: false });
CallRecording.belongsTo(Device, { foreignKey: 'device_serial', as: 'device', constraints: false });

// ============================================================================
// EXPORT ALL MODELS
// ============================================================================

export const models = {
  User,
  Employee,
  Device,
  CallLog,
  CallFormData,
  CallRecording,
  AuditLog,
};

export default models;
