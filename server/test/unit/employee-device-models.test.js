import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Sequelize } from 'sequelize';

import { DEVICE_LINK_STATUSES } from '../../models/constants.js';
import { defineDevice } from '../../models/Device.js';
import { defineEmployee } from '../../models/Employee.js';

let sequelize;
let Employee;
let Device;

const validDevice = (overrides = {}) => ({
  serial_number: 'SERIAL-001',
  employee_id: null,
  imei_1: '356789012345678',
  imei_2: null,
  phone_number_1: '+919876543210',
  phone_number_2: null,
  link_status: 'UNLINKED',
  linked_at: null,
  linked_by: null,
  is_active: true,
  ...overrides,
});

before(() => {
  sequelize = new Sequelize('postgres://postgres:password@localhost:5432/model_metadata', {
    dialect: 'postgres',
    logging: false,
  });
  Employee = defineEmployee(sequelize);
  Device = defineDevice(sequelize);
});

after(async () => {
  await sequelize.close();
});

describe('Employee model', () => {
  it('defines the approved columns, timestamp mapping, soft deletion, and indexes', () => {
    assert.equal(Employee.getTableName(), 'employees');
    assert.deepEqual(
      Object.keys(Employee.getAttributes()),
      [
        'emp_id',
        'full_name',
        'email',
        'phone_number',
        'designation',
        'is_active',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
    );

    const attributes = Employee.getAttributes();
    for (const [name, attribute] of Object.entries(attributes)) {
      assert.equal(attribute.field, name);
    }

    assert.equal(attributes.emp_id.primaryKey, true);
    assert.equal(attributes.email.unique, 'employees_email_unique');
    assert.equal(attributes.phone_number.unique, 'employees_phone_number_unique');
    assert.equal(attributes.is_active.defaultValue, true);
    assert.equal(Employee.options.paranoid, true);
    assert.equal(Employee.options.createdAt, 'created_at');
    assert.equal(Employee.options.updatedAt, 'updated_at');
    assert.equal(Employee.options.deletedAt, 'deleted_at');

    const indexes = Employee.options.indexes.map((index) => index.fields);
    assert.deepEqual(indexes, [
      ['is_active'],
      ['designation'],
      ['deleted_at'],
      ['is_active', 'deleted_at'],
    ]);
  });

  it('normalizes employee names and emails and validates E.164 phone numbers', async () => {
    const employee = Employee.build({
      emp_id: 'EMP-001',
      full_name: '  Priya Sharma  ',
      email: '  PRIYA.SHARMA@EXAMPLE.COM  ',
      phone_number: '+919876543210',
      designation: 'Sales Manager',
    });

    assert.equal(employee.full_name, 'Priya Sharma');
    assert.equal(employee.email, 'priya.sharma@example.com');
    await employee.validate();

    employee.phone_number = '9876543210';
    await assert.rejects(
      employee.validate(),
      /Employee phone number must use E\.164 format/,
    );
  });
});

describe('Device model', () => {
  it('defines exact columns, uniqueness, indexes, enum values, and FK actions', () => {
    assert.equal(Device.getTableName(), 'devices');
    assert.deepEqual(
      Object.keys(Device.getAttributes()),
      [
        'serial_number',
        'employee_id',
        'imei_1',
        'imei_2',
        'phone_number_1',
        'phone_number_2',
        'link_status',
        'linked_at',
        'linked_by',
        'is_active',
        'registered_at',
        'last_seen_at',
        'last_sync_at',
        'created_at',
        'updated_at',
      ],
    );

    const attributes = Device.getAttributes();
    for (const [name, attribute] of Object.entries(attributes)) {
      assert.equal(attribute.field, name);
    }

    assert.equal(attributes.serial_number.primaryKey, true);
    assert.equal(attributes.employee_id.unique, undefined);
    assert.equal(attributes.employee_id.references.model, 'employees');
    assert.equal(attributes.employee_id.references.key, 'emp_id');
    assert.equal(attributes.employee_id.onUpdate, 'CASCADE');
    assert.equal(attributes.employee_id.onDelete, 'SET NULL');
    assert.equal(attributes.imei_1.unique, 'devices_imei_1_unique');
    assert.equal(attributes.imei_2.unique, 'devices_imei_2_unique');
    assert.equal(attributes.phone_number_1.unique, 'devices_phone_number_1_unique');
    assert.deepEqual(attributes.link_status.values, DEVICE_LINK_STATUSES);
    assert.equal(attributes.link_status.defaultValue, 'UNLINKED');
    assert.equal(attributes.is_active.defaultValue, true);

    const indexes = Device.options.indexes.map((index) => index.fields);
    assert.deepEqual(indexes, [
      ['employee_id'],
      ['link_status'],
      ['is_active'],
      ['last_seen_at'],
      ['employee_id', 'is_active'],
    ]);
  });

  it('accepts every valid device link state', async () => {
    const timestamp = new Date('2025-01-01T00:00:00.000Z');
    const states = [
      validDevice(),
      validDevice({
        link_status: 'AUTO_LINKED',
        employee_id: 'EMP-001',
        linked_at: timestamp,
      }),
      validDevice({
        link_status: 'AUTO_LINKED',
        employee_id: 'EMP-001',
        linked_at: timestamp,
        linked_by: 'SYSTEM',
      }),
      validDevice({
        link_status: 'MANUAL_LINKED',
        employee_id: 'EMP-001',
        linked_at: timestamp,
        linked_by: 'admin@example.com',
      }),
      validDevice({
        link_status: 'DEACTIVATED',
        is_active: false,
        employee_id: 'EMP-001',
        linked_at: timestamp,
        linked_by: 'admin@example.com',
      }),
    ];

    for (const state of states) {
      await Device.build(state).validate();
    }
  });

  it('rejects invalid E.164 numbers and inconsistent device link states', async () => {
    await assert.rejects(
      Device.build(validDevice({ phone_number_1: '9876543210' })).validate(),
      /Primary device phone number must use E\.164 format/,
    );
    await assert.rejects(
      Device.build(validDevice({ phone_number_2: '+0123' })).validate(),
      /Secondary device phone number must use E\.164 format/,
    );
    await assert.rejects(
      Device.build(validDevice({ employee_id: 'EMP-001' })).validate(),
      /UNLINKED devices cannot retain employee or link metadata/,
    );
    await assert.rejects(
      Device.build(validDevice({ link_status: 'AUTO_LINKED' })).validate(),
      /AUTO_LINKED devices require an employee and link timestamp/,
    );
    await assert.rejects(
      Device.build(validDevice({
        link_status: 'AUTO_LINKED',
        employee_id: 'EMP-001',
        linked_at: new Date(),
        linked_by: 'admin@example.com',
      })).validate(),
      /AUTO_LINKED devices may only be linked by SYSTEM/,
    );
    await assert.rejects(
      Device.build(validDevice({ link_status: 'MANUAL_LINKED' })).validate(),
      /MANUAL_LINKED devices require complete link metadata/,
    );
    await assert.rejects(
      Device.build(validDevice({ link_status: 'DEACTIVATED' })).validate(),
      /DEACTIVATED devices must be inactive/,
    );
  });
});
