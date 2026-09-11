/**
 * Enum Constants
 * All enums for the PostgreSQL schema
 */

export const LINK_STATUS = {
  UNLINKED: 'UNLINKED',
  AUTO_LINKED: 'AUTO_LINKED',
  MANUAL_LINKED: 'MANUAL_LINKED',
  DEACTIVATED: 'DEACTIVATED',
} as const;

export const CALL_DIRECTION = {
  INCOMING: 'INCOMING',
  OUTGOING: 'OUTGOING',
  MISSED: 'MISSED',
} as const;

export const CALL_CATEGORY = {
  CLIENT: 'CLIENT',
  TEAM_MEMBER: 'TEAM_MEMBER',
  PERSONAL: 'PERSONAL',
  MISSED: 'MISSED',
  PENDING: 'PENDING',
} as const;

export const UPLOAD_STATUS = {
  PENDING: 'PENDING',
  UPLOADING: 'UPLOADING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRY_SCHEDULED: 'RETRY_SCHEDULED',
} as const;

export const AUDIT_ACTION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT: 'EXPORT',
} as const;

export const ENTITY_TYPE = {
  EMPLOYEE: 'EMPLOYEE',
  DEVICE: 'DEVICE',
} as const;

// ============================================================================
// DISPLAY LABELS (for UI rendering)
// ============================================================================

export const LINK_STATUS_LABELS: Record<string, string> = {
  UNLINKED: 'Not Linked',
  AUTO_LINKED: 'Auto Linked',
  MANUAL_LINKED: 'Manually Linked',
  DEACTIVATED: 'Deactivated',
};

export const CALL_DIRECTION_LABELS: Record<string, string> = {
  INCOMING: 'Incoming',
  OUTGOING: 'Outgoing',
  MISSED: 'Missed',
};

export const CALL_CATEGORY_LABELS: Record<string, string> = {
  CLIENT: 'Client',
  TEAM_MEMBER: 'Team Member',
  PERSONAL: 'Personal',
  MISSED: 'Missed',
  PENDING: 'Pending',
};

export const UPLOAD_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  UPLOADING: 'Uploading',
  COMPLETED: 'Uploaded',
  FAILED: 'Failed',
  RETRY_SCHEDULED: 'Retry Scheduled',
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  LOGIN: 'Logged In',
  LOGOUT: 'Logged Out',
  EXPORT: 'Exported',
};

// ============================================================================
// BADGE COLORS/STYLES (for UI rendering)
// ============================================================================

export const LINK_STATUS_COLORS: Record<string, string> = {
  UNLINKED: 'neutral',
  AUTO_LINKED: 'success',
  MANUAL_LINKED: 'info',
  DEACTIVATED: 'danger',
};

export const CALL_DIRECTION_COLORS: Record<string, string> = {
  INCOMING: 'info',
  OUTGOING: 'success',
  MISSED: 'warning',
};

export const CALL_CATEGORY_COLORS: Record<string, string> = {
  CLIENT: 'danger',
  TEAM_MEMBER: 'warning',
  PERSONAL: 'info',
  MISSED: 'neutral',
  PENDING: 'secondary',
};

export const UPLOAD_STATUS_COLORS: Record<string, string> = {
  PENDING: 'secondary',
  UPLOADING: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
  RETRY_SCHEDULED: 'warning',
};

export const AUDIT_ACTION_COLORS: Record<string, string> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'secondary',
  LOGOUT: 'secondary',
  EXPORT: 'warning',
};

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

// E.164 format: +[1-9]{1,3}[0-9]{1,14}
export const E164_PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;

// Employee ID pattern: EMP-[0-9]{3,4}
export const EMPLOYEE_ID_PATTERN = /^EMP-\d{3,4}$/;

// Email pattern
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// API CONFIGURATION
// ============================================================================

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',

  // Employees
  EMPLOYEES: '/employees',
  EMPLOYEE: (id: string) => `/employees/${id}`,
  EMPLOYEE_CALLS: (id: string) => `/employees/${id}/calls`,

  // Devices
  DEVICES: '/devices',
  DEVICE: (serial: string) => `/devices/${serial}`,
  DEVICE_LINK: (serial: string) => `/devices/${serial}/link`,
  DEVICE_UNLINK: (serial: string) => `/devices/${serial}/unlink`,
  DEVICE_CALLS: (serial: string) => `/devices/${serial}/calls`,

  // Call Logs
  CALL_LOGS: '/call-logs',
  CALL_LOG: (id: string) => `/call-logs/${id}`,

  // Call Forms
  CALL_FORMS: '/call-forms',
  CALL_FORM: (id: string) => `/call-forms/${id}`,
  CALL_FORM_BY_LOG: (callLogId: string) => `/call-logs/${callLogId}/form`,

  // Recordings
  RECORDINGS: '/recordings',
  RECORDING: (id: string) => `/recordings/${id}`,
  RECORDING_PLAYBACK_URL: (id: string) => `/recordings/${id}/playback-url`,
  RECORDING_BY_CALL: (callLogId: string) => `/call-logs/${callLogId}/recording`,

  // Audit Logs
  AUDIT_LOGS: '/audit-logs',
};

// ============================================================================
// TOKEN & STORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  LAST_AUTH_TIME: 'last_auth_time',
};

// JWT
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY_MINUTES: 15,
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  REFRESH_THRESHOLD_MINUTES: 2, // Refresh if < 2 min remaining
};
