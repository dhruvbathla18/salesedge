import { DataTypes } from 'sequelize';

import { redactSensitiveValues } from '../utils/redaction.js';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from './constants.js';

const SNAPSHOT_ATTRIBUTES = Object.freeze(['old_values', 'new_values']);
const SECRET_ENVIRONMENT_KEYS = Object.freeze([
  'DB_PASSWORD',
  'JWT_SECRET',
  'AUTH_USER_PASSWORD_HASH',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
]);

const configuredSecrets = () => SECRET_ENVIRONMENT_KEYS
  .map((key) => process.env[key])
  .filter(Boolean);

const redactSnapshots = (auditLog) => {
  const secrets = configuredSecrets();

  for (const attribute of SNAPSHOT_ATTRIBUTES) {
    const snapshot = auditLog.getDataValue(attribute);
    if (snapshot !== null && snapshot !== undefined) {
      auditLog.setDataValue(
        attribute,
        redactSensitiveValues(snapshot, { secrets }),
      );
    }
  }
};

const redactBulkSnapshots = (auditLogs) => {
  for (const auditLog of auditLogs) redactSnapshots(auditLog);
};

export class AuditLogImmutableError extends Error {
  constructor(operation) {
    super(`Audit logs are append-only and cannot be ${operation}`);
    this.name = 'AuditLogImmutableError';
    this.code = 'AUDIT_LOG_IMMUTABLE';
  }
}

const rejectMutation = (operation) => {
  throw new AuditLogImmutableError(operation);
};

/**
 * Define the append-only audit_logs Sequelize model.
 *
 * Database-level mutation guards are installed separately by the schema guard
 * task; these hooks prevent mutation through Sequelize instance and bulk APIs.
 */
export const defineAuditLog = (sequelize) => sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    field: 'id',
  },
  admin_user: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'admin_user',
  },
  action: {
    type: DataTypes.ENUM(...AUDIT_ACTIONS),
    allowNull: false,
    field: 'action',
    validate: {
      isIn: [AUDIT_ACTIONS],
    },
  },
  entity_type: {
    type: DataTypes.ENUM(...AUDIT_ENTITY_TYPES),
    allowNull: false,
    field: 'entity_type',
    validate: {
      isIn: [AUDIT_ENTITY_TYPES],
    },
  },
  entity_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'entity_id',
  },
  old_values: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'old_values',
  },
  new_values: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'new_values',
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'success',
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: false,
    field: 'ip_address',
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'user_agent',
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  tableName: 'audit_logs',
  timestamps: false,
  indexes: [
    { name: 'audit_logs_admin_user_idx', fields: ['admin_user'] },
    { name: 'audit_logs_action_idx', fields: ['action'] },
    { name: 'audit_logs_entity_type_idx', fields: ['entity_type'] },
    { name: 'audit_logs_entity_id_idx', fields: ['entity_id'] },
    { name: 'audit_logs_success_idx', fields: ['success'] },
    {
      name: 'audit_logs_created_at_desc_idx',
      fields: [{ name: 'created_at', order: 'DESC' }],
    },
    {
      name: 'audit_logs_entity_history_idx',
      fields: [
        'entity_type',
        'entity_id',
        { name: 'created_at', order: 'DESC' },
      ],
    },
  ],
  hooks: {
    beforeValidate: redactSnapshots,
    beforeCreate: redactSnapshots,
    beforeBulkCreate: redactBulkSnapshots,
    beforeUpdate: () => rejectMutation('updated'),
    beforeDestroy: () => rejectMutation('destroyed'),
    beforeBulkUpdate: () => rejectMutation('updated'),
    beforeBulkDestroy: () => rejectMutation('destroyed'),
  },
});

export default defineAuditLog;
