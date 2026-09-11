/**
 * Shared domain enum values.
 *
 * These constants are intentionally independent of Sequelize models so they
 * can be reused by validation, services, seed fixtures, and tests without
 * introducing a persisted identity model.
 */

export const USER_ROLES = Object.freeze([
  'ADMIN',
]);

export const DEVICE_LINK_STATUSES = Object.freeze([
  'UNLINKED',
  'AUTO_LINKED',
  'MANUAL_LINKED',
  'DEACTIVATED',
]);

export const CALL_DIRECTIONS = Object.freeze([
  'INCOMING',
  'OUTGOING',
  'MISSED',
]);

export const CALL_CATEGORIES = Object.freeze([
  'CLIENT',
  'TEAM_MEMBER',
  'PERSONAL',
  'MISSED',
  'PENDING',
]);

export const RECORDING_UPLOAD_STATUSES = Object.freeze([
  'PENDING',
  'UPLOADING',
  'COMPLETED',
  'FAILED',
  'RETRY_SCHEDULED',
]);

export const AUDIT_ACTIONS = Object.freeze([
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'VIEW_EMPLOYEE',
  'VIEW_COMPANY',
  'VIEW_CALL',
  'PLAY_RECORDING',
  'LINK_DEVICE',
  'UNLINK_DEVICE',
]);

export const AUDIT_ENTITY_TYPES = Object.freeze([
  'AUTH',
  'EMPLOYEE',
  'DEVICE',
  'CALL_LOG',
  'CALL_FORM',
  'CALL_RECORDING',
  'DASHBOARD',
  'SYSTEM',
]);
