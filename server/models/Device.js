import { DataTypes } from 'sequelize';

import { DEVICE_LINK_STATUSES } from './constants.js';

const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

const isNullish = (value) => value === null || value === undefined;

/**
 * Defines the PostgreSQL-backed device model.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
export function defineDevice(sequelize) {
  return sequelize.define('Device', {
    serial_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true,
      field: 'serial_number',
    },
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'employee_id',
      references: {
        model: 'employees',
        key: 'emp_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    imei_1: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: 'devices_imei_1_unique',
      field: 'imei_1',
    },
    imei_2: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: 'devices_imei_2_unique',
      field: 'imei_2',
    },
    phone_number_1: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: 'devices_phone_number_1_unique',
      field: 'phone_number_1',
      validate: {
        isE164(value) {
          if (typeof value !== 'string' || !E164_PATTERN.test(value)) {
            throw new Error('Primary device phone number must use E.164 format');
          }
        },
      },
    },
    phone_number_2: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'phone_number_2',
      validate: {
        isE164OrNull(value) {
          if (!isNullish(value) && (typeof value !== 'string' || !E164_PATTERN.test(value))) {
            throw new Error('Secondary device phone number must use E.164 format');
          }
        },
      },
    },
    link_status: {
      type: DataTypes.ENUM(...DEVICE_LINK_STATUSES),
      allowNull: false,
      defaultValue: 'UNLINKED',
      field: 'link_status',
    },
    linked_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'linked_at',
    },
    linked_by: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'linked_by',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    registered_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'registered_at',
    },
    last_seen_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_seen_at',
    },
    last_sync_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_sync_at',
    },
  }, {
    tableName: 'devices',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    validate: {
      linkStateIsConsistent() {
        const employeeId = this.getDataValue('employee_id');
        const linkedAt = this.getDataValue('linked_at');
        const linkedBy = this.getDataValue('linked_by');
        const linkStatus = this.getDataValue('link_status');
        const isActive = this.getDataValue('is_active');

        if (
          linkStatus === 'UNLINKED'
          && (!isNullish(employeeId) || !isNullish(linkedAt) || !isNullish(linkedBy))
        ) {
          throw new Error('UNLINKED devices cannot retain employee or link metadata');
        }

        if (linkStatus === 'AUTO_LINKED') {
          if (isNullish(employeeId) || isNullish(linkedAt)) {
            throw new Error('AUTO_LINKED devices require an employee and link timestamp');
          }
          if (!isNullish(linkedBy) && linkedBy !== 'SYSTEM') {
            throw new Error('AUTO_LINKED devices may only be linked by SYSTEM');
          }
        }

        if (
          linkStatus === 'MANUAL_LINKED'
          && (isNullish(employeeId) || isNullish(linkedAt) || isNullish(linkedBy))
        ) {
          throw new Error('MANUAL_LINKED devices require complete link metadata');
        }

        if (linkStatus === 'DEACTIVATED' && isActive !== false) {
          throw new Error('DEACTIVATED devices must be inactive');
        }
      },
    },
    indexes: [
      {
        name: 'devices_employee_id_idx',
        fields: ['employee_id'],
      },
      {
        name: 'devices_link_status_idx',
        fields: ['link_status'],
      },
      {
        name: 'devices_is_active_idx',
        fields: ['is_active'],
      },
      {
        name: 'devices_last_seen_at_idx',
        fields: ['last_seen_at'],
      },
      {
        name: 'devices_employee_id_is_active_idx',
        fields: ['employee_id', 'is_active'],
      },
    ],
  });
}

export default defineDevice;
