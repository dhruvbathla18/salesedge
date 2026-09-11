/**
 * PostgreSQL Schema - React TypeScript Interfaces
 * Migrated from MongoDB 13-table schema to PostgreSQL 7-table schema
 */

// ============================================================================
// ENUMS (also defined in src/constants/enums.ts)
// ============================================================================

export enum LinkStatus {
  UNLINKED = 'UNLINKED',
  AUTO_LINKED = 'AUTO_LINKED',
  MANUAL_LINKED = 'MANUAL_LINKED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum CallDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  MISSED = 'MISSED',
}

export enum CallCategory {
  CLIENT = 'CLIENT',
  TEAM_MEMBER = 'TEAM_MEMBER',
  PERSONAL = 'PERSONAL',
  MISSED = 'MISSED',
  PENDING = 'PENDING',
}

export enum UploadStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRY_SCHEDULED = 'RETRY_SCHEDULED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
}

export enum EntityType {
  EMPLOYEE = 'EMPLOYEE',
  DEVICE = 'DEVICE',
}

// ============================================================================
// 1. EMPLOYEES TABLE
// ============================================================================

export interface Employee {
  emp_id: string; // VARCHAR(50) - PK
  full_name: string;
  email: string; // UNIQUE
  phone_number: string; // UNIQUE, E.164 format (+91XXXXXXXXXX)
  designation: string;
  is_active: boolean;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}

export interface CreateEmployeeRequest {
  emp_id?: string; // Optional - may be auto-generated
  full_name: string;
  email: string;
  phone_number: string;
  designation: string;
  is_active?: boolean; // Default: true
}

export interface UpdateEmployeeRequest {
  full_name?: string;
  email?: string;
  phone_number?: string;
  designation?: string;
  is_active?: boolean;
}

// ============================================================================
// 2. DEVICES TABLE
// ============================================================================

export interface Device {
  serial_number: string; // VARCHAR(50) - PK
  employee_id: string | null; // FK → employees.emp_id, NULLABLE (unlinked device)
  imei_1: string;
  imei_2: string | null;
  phone_number_1: string; // E.164 format
  phone_number_2: string | null;
  link_status: LinkStatus; // ENUM: UNLINKED | AUTO_LINKED | MANUAL_LINKED | DEACTIVATED
  linked_at: string | null; // ISO 8601 datetime
  linked_by: string | null; // Admin user who manually linked, null if AUTO_LINKED
  is_active: boolean;
  registered_at: string; // ISO 8601 datetime
  last_seen_at: string | null; // ISO 8601 datetime
  last_sync_at: string | null; // ISO 8601 datetime
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}

export interface CreateDeviceRequest {
  serial_number: string;
  imei_1: string;
  imei_2?: string;
  phone_number_1: string;
  phone_number_2?: string;
  employee_id?: string | null; // Optional - defaults to null (unlinked)
}

export interface UpdateDeviceRequest {
  employee_id?: string | null;
  link_status?: LinkStatus;
  linked_by?: string;
  is_active?: boolean;
}

export interface LinkDeviceRequest {
  serial_number: string;
  employee_id: string;
  link_status?: LinkStatus; // MANUAL_LINKED or AUTO_LINKED
}

export interface UnlinkDeviceRequest {
  serial_number: string;
}

// Device with employee info populated (denormalized for UI)
export interface DeviceWithEmployee extends Device {
  employee?: Employee;
}

// ============================================================================
// 3. CALL_LOGS TABLE
// ============================================================================

export interface CallLog {
  id: string; // UUID - PK
  device_serial: string; // FK → devices.serial_number
  employee_id: string; // FK → employees.emp_id
  call_direction: CallDirection; // INCOMING | OUTGOING | MISSED
  caller_number: string; // E.164 format
  callee_number: string; // E.164 format
  duration_seconds: number;
  call_category: CallCategory; // CLIENT | TEAM_MEMBER | PERSONAL | MISSED | PENDING
  is_form_required: boolean; // Derived from call_category
  is_form_submitted: boolean;
  has_recording: boolean; // CLIENT and TEAM_MEMBER only
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}

export interface CreateCallLogRequest {
  device_serial: string;
  employee_id: string;
  call_direction: CallDirection;
  caller_number: string;
  callee_number: string;
  duration_seconds: number;
  call_category: CallCategory;
  is_form_submitted?: boolean;
  has_recording?: boolean;
}

export interface UpdateCallLogRequest {
  call_category?: CallCategory;
  is_form_submitted?: boolean;
  has_recording?: boolean;
}

// Filter options for fetching call logs
export interface CallLogFilters {
  employee_id?: string;
  start_date?: string; // ISO 8601 datetime
  end_date?: string; // ISO 8601 datetime
  call_category?: CallCategory;
  call_direction?: CallDirection;
  limit?: number;
  offset?: number;
}

// Call log with related data for UI display
export interface CallLogWithDetails extends CallLog {
  employee?: Employee;
  device?: Device;
  call_form?: CallFormData;
  recording?: CallRecording;
}

// ============================================================================
// 4. CALL_FORM_DATA TABLE - CLIENT CALLS ONLY
// ============================================================================

export interface CallFormData {
  id: string; // UUID - PK
  call_log_id: string; // FK → call_logs.id, UNIQUE
  company_name: string;
  customer_name: string;
  reason_for_call: string;
  notes: string | null;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}

export interface CreateCallFormRequest {
  call_log_id: string;
  company_name: string;
  customer_name: string;
  reason_for_call: string;
  notes?: string;
}

export interface UpdateCallFormRequest {
  company_name?: string;
  customer_name?: string;
  reason_for_call?: string;
  notes?: string;
}

// ============================================================================
// 5. CALL_RECORDINGS TABLE - CLIENT & TEAM_MEMBER ONLY
// ============================================================================

export interface CallRecording {
  id: string; // UUID - PK
  call_log_id: string; // FK → call_logs.id, UNIQUE
  device_serial: string; // FK → devices.serial_number
  local_file_path: string | null; // Android local path, null if uploaded
  file_size_bytes: number;
  s3_bucket: string;
  s3_key: string;
  upload_status: UploadStatus; // PENDING | UPLOADING | COMPLETED | FAILED | RETRY_SCHEDULED
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null; // ISO 8601 datetime
  error_message: string | null;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}

export interface CreateRecordingRequest {
  call_log_id: string;
  device_serial: string;
  local_file_path: string;
  file_size_bytes: number;
  s3_bucket: string;
  s3_key: string;
  max_retries?: number; // Default: 3
}

export interface UpdateRecordingStatusRequest {
  upload_status: UploadStatus;
  error_message?: string | null;
  retry_count?: number;
}

// Recording metadata for playback UI
export interface RecordingMetadata {
  id: string;
  call_log_id: string;
  file_size_bytes: number;
  s3_bucket: string;
  s3_key: string;
  upload_status: UploadStatus;
  created_at: string;
}

// S3 pre-signed URL (generated on-demand, never cached)
export interface RecordingPlaybackUrl {
  s3_url: string; // Pre-signed URL
  expires_at: string; // ISO 8601 datetime
}

// ============================================================================
// 6. AUDIT_LOGS TABLE - IMMUTABLE, READ-ONLY
// ============================================================================

export interface AuditLog {
  id: string; // UUID - PK
  admin_user: string; // From JWT claims
  action: AuditAction; // CREATE | UPDATE | DELETE | LOGIN | LOGOUT | EXPORT
  entity_type: EntityType; // EMPLOYEE | DEVICE
  entity_id: string;
  old_values: Record<string, any> | null; // JSON - null for CREATE
  new_values: Record<string, any> | null; // JSON - null for DELETE
  ip_address: string;
  user_agent: string;
  created_at: string; // ISO 8601 datetime (NO updated_at)
}

// Filter options for audit logs
export interface AuditLogFilters {
  admin_user?: string;
  action?: AuditAction;
  entity_type?: EntityType;
  entity_id?: string;
  start_date?: string; // ISO 8601 datetime
  end_date?: string; // ISO 8601 datetime
  limit?: number;
  offset?: number;
}

// ============================================================================
// API RESPONSE WRAPPERS
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  timestamp: string; // ISO 8601 datetime
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  limit: number;
  offset: number;
  timestamp: string;
}

// ============================================================================
// AUTH & JWT
// ============================================================================

export interface JwtPayload {
  admin_user: string;
  emp_id: string;
  role: 'ADMIN';
  iat: number;
  exp: number;
}

export interface AuthTokens {
  access_token: string; // 15 min expiry
  refresh_token?: string; // 7 days (httpOnly cookie)
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    emp_id: string;
    full_name: string;
    email: string;
    role: 'ADMIN';
  };
}

// ============================================================================
// CALL BEHAVIOR MATRIX HELPER
// ============================================================================

/**
 * Helper interface for call behavior based on category
 * Defines form, recording, and notification behavior
 */
export interface CallBehaviorConfig {
  category: CallCategory;
  popup_shown: boolean;
  form_required: boolean;
  recording_uploaded: boolean;
  call_form_data_row: boolean;
  call_recordings_row: boolean;
}

export const CALL_BEHAVIOR_MATRIX: Record<CallCategory, CallBehaviorConfig> = {
  [CallCategory.CLIENT]: {
    category: CallCategory.CLIENT,
    popup_shown: true,
    form_required: true,
    recording_uploaded: true,
    call_form_data_row: true,
    call_recordings_row: true,
  },
  [CallCategory.TEAM_MEMBER]: {
    category: CallCategory.TEAM_MEMBER,
    popup_shown: true,
    form_required: false,
    recording_uploaded: true,
    call_form_data_row: false,
    call_recordings_row: true,
  },
  [CallCategory.PERSONAL]: {
    category: CallCategory.PERSONAL,
    popup_shown: true,
    form_required: false,
    recording_uploaded: false,
    call_form_data_row: false,
    call_recordings_row: false,
  },
  [CallCategory.MISSED]: {
    category: CallCategory.MISSED,
    popup_shown: false,
    form_required: false,
    recording_uploaded: false,
    call_form_data_row: false,
    call_recordings_row: false,
  },
  [CallCategory.PENDING]: {
    category: CallCategory.PENDING,
    popup_shown: false,
    form_required: false,
    recording_uploaded: false,
    call_form_data_row: false,
    call_recordings_row: false,
  },
};
