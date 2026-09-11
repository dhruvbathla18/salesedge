import { DataTypes } from 'sequelize';

import { CALL_CATEGORIES, CALL_DIRECTIONS } from './constants.js';

const E164_PATTERN = /^\+[1-9]\d{1,14}$/;
const RECORDING_ELIGIBLE_CATEGORIES = new Set(['CLIENT', 'TEAM_MEMBER']);

/**
 * Defines the PostgreSQL-backed call log model.
 *
 * Cross-row form and recording existence invariants are enforced by domain
 * services; this model validates only invariants contained in a call row.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
export function defineCallLog(sequelize) {
  return sequelize.define('CallLog', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      field: 'id',
    },
    device_serial: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'device_serial',
    },
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'employee_id',
    },
    call_direction: {
      type: DataTypes.ENUM(...CALL_DIRECTIONS),
      allowNull: false,
      field: 'call_direction',
      validate: {
        isIn: [CALL_DIRECTIONS],
      },
    },
    caller_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'caller_number',
      validate: {
        isE164(value) {
          if (typeof value !== 'string' || !E164_PATTERN.test(value)) {
            throw new Error('Caller phone number must use E.164 format');
          }
        },
      },
    },
    callee_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'callee_number',
      validate: {
        isE164(value) {
          if (typeof value !== 'string' || !E164_PATTERN.test(value)) {
            throw new Error('Callee phone number must use E.164 format');
          }
        },
      },
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'duration_seconds',
      validate: {
        min: 0,
      },
    },
    call_category: {
      type: DataTypes.ENUM(...CALL_CATEGORIES),
      allowNull: false,
      defaultValue: 'PENDING',
      field: 'call_category',
      validate: {
        isIn: [CALL_CATEGORIES],
      },
    },
    is_form_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_form_required',
    },
    is_form_submitted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_form_submitted',
    },
    has_recording: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'has_recording',
    },
  }, {
    tableName: 'call_logs',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    validate: {
      behaviorFlagsAreConsistent() {
        const category = this.getDataValue('call_category');
        const durationSeconds = this.getDataValue('duration_seconds');
        const isFormRequired = this.getDataValue('is_form_required');
        const isFormSubmitted = this.getDataValue('is_form_submitted');
        const hasRecording = this.getDataValue('has_recording');

        if (isFormSubmitted === true && isFormRequired !== true) {
          throw new Error('Submitted call forms must also be required');
        }

        if (category === 'MISSED' && durationSeconds !== 0) {
          throw new Error('MISSED calls must have zero duration');
        }

        if (hasRecording === true && !RECORDING_ELIGIBLE_CATEGORIES.has(category)) {
          throw new Error('Only CLIENT or TEAM_MEMBER calls may have recordings');
        }
      },
    },
    indexes: [
      {
        name: 'call_logs_employee_id_idx',
        fields: ['employee_id'],
      },
      {
        name: 'call_logs_device_serial_idx',
        fields: ['device_serial'],
      },
      {
        name: 'call_logs_call_direction_idx',
        fields: ['call_direction'],
      },
      {
        name: 'call_logs_call_category_idx',
        fields: ['call_category'],
      },
      {
        name: 'call_logs_created_at_idx',
        fields: ['created_at'],
      },
      {
        name: 'call_logs_employee_id_created_at_idx',
        fields: [
          'employee_id',
          { name: 'created_at', order: 'DESC' },
        ],
      },
      {
        name: 'call_logs_call_category_created_at_idx',
        fields: [
          'call_category',
          { name: 'created_at', order: 'DESC' },
        ],
      },
      {
        name: 'call_logs_pending_forms_idx',
        fields: [{ name: 'created_at', order: 'DESC' }],
        where: {
          call_category: 'CLIENT',
          is_form_required: true,
          is_form_submitted: false,
        },
      },
      {
        name: 'call_logs_has_recording_idx',
        fields: [{ name: 'created_at', order: 'DESC' }],
        where: {
          has_recording: true,
        },
      },
    ],
  });
}

export default defineCallLog;
