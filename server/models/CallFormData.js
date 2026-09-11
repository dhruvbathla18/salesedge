import { DataTypes } from 'sequelize';

/**
 * Defines the PostgreSQL-backed call form data model.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
export function defineCallFormData(sequelize) {
  return sequelize.define('CallFormData', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      field: 'id',
    },
    call_log_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: 'call_form_data_call_log_id_unique',
      field: 'call_log_id',
    },
    company_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'company_name',
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'customer_name',
    },
    reason_for_call: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'reason_for_call',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'notes',
    },
  }, {
    tableName: 'call_form_data',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        name: 'call_form_data_company_name_lower_idx',
        fields: [sequelize.fn('lower', sequelize.col('company_name'))],
      },
      {
        name: 'call_form_data_created_at_idx',
        fields: ['created_at'],
      },
    ],
  });
}

export default defineCallFormData;
