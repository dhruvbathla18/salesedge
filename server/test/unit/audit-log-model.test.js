import assert from 'node:assert/strict';
import test from 'node:test';

import { Sequelize } from 'sequelize';

import {
  AuditLogImmutableError,
  defineAuditLog,
} from '../../models/AuditLog.js';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from '../../models/constants.js';
import { REDACTED } from '../../utils/redaction.js';

const sequelize = new Sequelize('postgres://postgres:1234@localhost:5432/mist_avinya_db', {
  logging: false,
});
const AuditLog = defineAuditLog(sequelize);

const validAudit = (overrides = {}) => ({
  admin_user: 'admin@mistavinya.local',
  action: 'CREATE',
  entity_type: 'EMPLOYEE',
  entity_id: 'EMP-001',
  success: true,
  ip_address: '127.0.0.1',
  user_agent: 'audit-model-unit-test',
  ...overrides,
});

const typeKey = (attribute) => attribute.type.key;

const normalizedIndexFields = (index) => index.fields.map((field) => (
  typeof field === 'string'
    ? { name: field }
    : { name: field.name ?? field.attribute, order: field.order }
));

test('AuditLog declares the exact append-only columns and enum domains', () => {
  assert.equal(AuditLog.getTableName(), 'audit_logs');
  assert.equal(AuditLog.options.timestamps, false);
  assert.deepEqual(Object.keys(AuditLog.rawAttributes), [
    'id',
    'admin_user',
    'action',
    'entity_type',
    'entity_id',
    'old_values',
    'new_values',
    'success',
    'ip_address',
    'user_agent',
    'created_at',
  ]);
  assert.equal(AuditLog.rawAttributes.updated_at, undefined);

  assert.equal(typeKey(AuditLog.rawAttributes.id), 'UUID');
  assert.equal(AuditLog.rawAttributes.id.primaryKey, true);
  assert.equal(typeKey(AuditLog.rawAttributes.action), 'ENUM');
  assert.deepEqual(AuditLog.rawAttributes.action.values, [...AUDIT_ACTIONS]);
  assert.equal(typeKey(AuditLog.rawAttributes.entity_type), 'ENUM');
  assert.deepEqual(AuditLog.rawAttributes.entity_type.values, [...AUDIT_ENTITY_TYPES]);
  assert.equal(typeKey(AuditLog.rawAttributes.old_values), 'JSONB');
  assert.equal(typeKey(AuditLog.rawAttributes.new_values), 'JSONB');
  assert.equal(typeKey(AuditLog.rawAttributes.success), 'BOOLEAN');
  assert.equal(AuditLog.rawAttributes.success.defaultValue, true);
  assert.equal(typeKey(AuditLog.rawAttributes.ip_address), 'INET');
  assert.equal(typeKey(AuditLog.rawAttributes.user_agent), 'TEXT');
  assert.equal(typeKey(AuditLog.rawAttributes.created_at), 'DATE');

  for (const [attributeName, attribute] of Object.entries(AuditLog.rawAttributes)) {
    assert.equal(attribute.field, attributeName);
  }
});

test('AuditLog declares every required single-column and descending history index', () => {
  const indexes = new Map(AuditLog.options.indexes.map((index) => [index.name, index]));

  for (const field of ['admin_user', 'action', 'entity_type', 'entity_id', 'success']) {
    assert.deepEqual(
      normalizedIndexFields(indexes.get(`audit_logs_${field}_idx`)),
      [{ name: field }],
    );
  }

  assert.deepEqual(
    normalizedIndexFields(indexes.get('audit_logs_created_at_desc_idx')),
    [{ name: 'created_at', order: 'DESC' }],
  );
  assert.deepEqual(
    normalizedIndexFields(indexes.get('audit_logs_entity_history_idx')),
    [
      { name: 'entity_type' },
      { name: 'entity_id' },
      { name: 'created_at', order: 'DESC' },
    ],
  );
});

test('AuditLog validates action and entity type against shared constants', async () => {
  await assert.doesNotReject(AuditLog.build(validAudit()).validate());
  await assert.rejects(
    AuditLog.build(validAudit({ action: 'READ' })).validate(),
    /Validation isIn on action failed/,
  );
  await assert.rejects(
    AuditLog.build(validAudit({ entity_type: 'USER' })).validate(),
    /Validation isIn on entity_type failed/,
  );
});

test('AuditLog redacts credentials, signed URLs, and configured secrets before persistence', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'unit-test-configured-secret';

  try {
    const audit = AuditLog.build(validAudit({
      old_values: {
        passwordHash: '$2b$12$abcdefghijklmnopqrstuvwxyz012345678901234567890123456789',
        safe: 'before',
      },
      new_values: {
        authorization: 'Bearer header.payload.signature',
        playback: 'https://bucket.invalid/key?X-Amz-Signature=signed-value',
        note: 'contains unit-test-configured-secret here',
        safe: 'after',
      },
    }));

    await audit.validate();

    assert.equal(audit.old_values.passwordHash, REDACTED);
    assert.equal(audit.old_values.safe, 'before');
    assert.equal(audit.new_values.authorization, REDACTED);
    assert.equal(audit.new_values.playback, REDACTED);
    assert.equal(audit.new_values.note, `contains ${REDACTED} here`);
    assert.equal(audit.new_values.safe, 'after');
  } finally {
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('AuditLog rejects instance and bulk update/destroy hooks before database access', async () => {
  const audit = AuditLog.build(validAudit());

  for (const [hook, args] of [
    ['beforeUpdate', [audit, {}]],
    ['beforeDestroy', [audit, {}]],
    ['beforeBulkUpdate', [{}]],
    ['beforeBulkDestroy', [{}]],
  ]) {
    await assert.rejects(
      AuditLog.runHooks(hook, ...args),
      (error) => error instanceof AuditLogImmutableError
        && error.code === 'AUDIT_LOG_IMMUTABLE',
    );
  }
});

test.after(async () => {
  await sequelize.close();
});
