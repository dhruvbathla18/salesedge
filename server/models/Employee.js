import { DataTypes } from 'sequelize';

const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

/**
 * Defines the PostgreSQL-backed employee model.
 *
 * The factory keeps model initialization in the model registry, where the
 * shared Sequelize instance and associations are assembled.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
export function defineEmployee(sequelize) {
  return sequelize.define('Employee', {
    emp_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true,
      field: 'emp_id',
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'full_name',
      set(value) {
        this.setDataValue(
          'full_name',
          typeof value === 'string' ? value.trim() : value,
        );
      },
      validate: {
        notEmpty: {
          msg: 'Employee full name is required',
        },
        isTrimmed(value) {
          if (typeof value !== 'string' || value !== value.trim()) {
            throw new Error('Employee full name must be trimmed');
          }
        },
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: 'employees_email_unique',
      field: 'email',
      set(value) {
        this.setDataValue(
          'email',
          typeof value === 'string' ? value.trim().toLowerCase() : value,
        );
      },
      validate: {
        isEmail: {
          msg: 'Employee email must be valid',
        },
        isNormalized(value) {
          if (
            typeof value !== 'string'
            || value !== value.trim()
            || value !== value.toLowerCase()
          ) {
            throw new Error('Employee email must be normalized to lowercase');
          }
        },
      },
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: 'employees_phone_number_unique',
      field: 'phone_number',
      validate: {
        isE164(value) {
          if (typeof value !== 'string' || !E164_PATTERN.test(value)) {
            throw new Error('Employee phone number must use E.164 format');
          }
        },
      },
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'designation',
      validate: {
        notEmpty: {
          msg: 'Employee designation is required',
        },
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  }, {
    tableName: 'employees',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    underscored: true,
    indexes: [
      {
        name: 'employees_is_active_idx',
        fields: ['is_active'],
      },
      {
        name: 'employees_designation_idx',
        fields: ['designation'],
      },
      {
        name: 'employees_deleted_at_idx',
        fields: ['deleted_at'],
      },
      {
        name: 'employees_is_active_deleted_at_idx',
        fields: ['is_active', 'deleted_at'],
      },
    ],
  });
}

export default defineEmployee;
