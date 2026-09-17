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
  // Maps to the partner schema column serial_number.
  device_serial: {
    type: DataTypes.STRING(50),
    field: 'serial_number',
    allowNull: true,
  },
  // Maps to the partner schema column emp_id.
  employee_id: {
    type: DataTypes.STRING(50),
    field: 'emp_id',
    allowNull: false,
  },
  // Partner schema uses call_type (VARCHAR, values INCOMING/OUTGOING/MISSED).
  call_direction: {
    type: DataTypes.STRING(20),
    field: 'call_type',
    allowNull: false,
  },
  caller_number: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  // Partner schema uses receiver_number.
  callee_number: {
    type: DataTypes.STRING(30),
    field: 'receiver_number',
    allowNull: true,
  },
  duration_seconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  call_category: {
    type: DataTypes.STRING(20),
    defaultValue: 'PENDING',
  },
  // These columns do not exist in the partner schema; expose them as VIRTUAL
  // so existing controllers/UI keep working. Recording presence is derived
  // from the associated recording when loaded.
  is_form_required: {
    type: DataTypes.VIRTUAL,
    get() { return false; },
  },
  is_form_submitted: {
    type: DataTypes.VIRTUAL,
    get() {
      const form = this.get('callForm');
      return !!form;
    },
  },
  has_recording: {
    type: DataTypes.VIRTUAL,
    get() {
      const rec = this.get('recording');
      return !!rec;
    },
  },
}, {
  tableName: 'call_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['emp_id'] },
    { fields: ['serial_number'] },
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
  // Partner schema uses call_id.
  call_log_id: {
    type: DataTypes.UUID,
    field: 'call_id',
    allowNull: false,
    unique: true,
  },
  company_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  customer_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  reason_for_call: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'call_form_data',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['call_id'] },
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
  // Partner schema uses call_id.
  call_log_id: {
    type: DataTypes.UUID,
    field: 'call_id',
    allowNull: false,
    unique: true,
  },
  // device_serial is not in the partner recordings table; VIRTUAL for compatibility.
  device_serial: {
    type: DataTypes.VIRTUAL,
    get() { return this.get('callLog')?.device_serial || null; },
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  content_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  file_size_bytes: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  s3_bucket: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  s3_key: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  // Partner schema stores this as a plain VARCHAR (e.g. 'UPLOADED'),
  // not the portal's ENUM.
  upload_status: {
    type: DataTypes.STRING(20),
    defaultValue: 'PENDING',
  },
  uploaded_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'call_recordings',
  // Partner recordings table has created_at but no updated_at.
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['call_id'] },
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

// NOTE: the partner call_recordings table has no device_serial column, so there
// is no direct Device<->CallRecording association. The device for a recording is
// reached via its callLog (CallRecording -> callLog -> device).

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
