import { DataTypes } from 'sequelize';

import { toBigIntJsonValue } from '../utils/bigint.js';
import { RECORDING_UPLOAD_STATUSES } from './constants.js';

const validateNonNegativeBigInt = (value) => {
  let integer;

  try {
    integer = BigInt(toBigIntJsonValue(value));
  } catch {
    throw new Error('Recording file size must be a non-negative integer');
  }

  if (integer < 0n) {
    throw new Error('Recording file size must be a non-negative integer');
  }
};

/**
 * Defines metadata for a private S3 call recording.
 *
 * Signed playback URLs are generated on demand and are never persisted.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
export function defineCallRecording(sequelize) {
  return sequelize.define('CallRecording', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id',
    },
    call_log_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: 'call_recordings_call_log_id_unique',
      field: 'call_log_id',
    },
    device_serial: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'device_serial',
    },
    local_file_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'local_file_path',
    },
    file_size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'file_size_bytes',
      get() {
        const value = this.getDataValue('file_size_bytes');
        return value == null ? value : toBigIntJsonValue(value);
      },
      validate: {
        isNonNegativeBigInt: validateNonNegativeBigInt,
      },
    },
    s3_bucket: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 's3_bucket',
    },
    s3_key: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: 'call_recordings_s3_key_unique',
      field: 's3_key',
    },
    upload_status: {
      type: DataTypes.ENUM(...RECORDING_UPLOAD_STATUSES),
      allowNull: false,
      defaultValue: 'PENDING',
      field: 'upload_status',
    },
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'retry_count',
      validate: {
        isInt: {
          msg: 'Recording retry count must be an integer',
        },
        min: {
          args: [0],
          msg: 'Recording retry count cannot be negative',
        },
      },
    },
    max_retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      field: 'max_retries',
      validate: {
        isInt: {
          msg: 'Recording maximum retries must be an integer',
        },
        min: {
          args: [0],
          msg: 'Recording maximum retries cannot be negative',
        },
      },
    },
    next_retry_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'next_retry_at',
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
  }, {
    tableName: 'call_recordings',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        name: 'call_recordings_device_serial_idx',
        fields: ['device_serial'],
      },
      {
        name: 'call_recordings_upload_status_idx',
        fields: ['upload_status'],
      },
      {
        name: 'call_recordings_next_retry_at_idx',
        fields: ['next_retry_at'],
      },
      {
        name: 'call_recordings_upload_status_updated_at_idx',
        fields: ['upload_status', { name: 'updated_at', order: 'DESC' }],
      },
    ],
  });
}

export default defineCallRecording;
