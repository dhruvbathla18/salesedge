# MongoDB to PostgreSQL Schema Migration Mapping

## Overview
Migration from MongoDB (13 tables) to PostgreSQL (7 tables) for React Admin Dashboard.

---

## 1. Table Migration Matrix

### MongoDB → PostgreSQL

| MongoDB Table | PostgreSQL Table | Status | Notes |
|---|---|---|---|
| `users` | `employees` | ✅ Merged | PK changed: `phone_no` → `emp_id` |
| `devices` | `devices` | ✅ Enhanced | PK changed: possibly ObjectId → `serial_number`; added link tracking |
| `calls` | `call_logs` | ✅ Merged | Merged with classifications & statuses |
| `call_classifications` | `call_logs.call_category` | ✅ Merged | Flattened as enum column |
| `call_statuses` | `call_logs.is_form_submitted, has_recording` | ✅ Merged | Status split into two boolean flags |
| `companies` | `call_form_data` | ✅ Merged | Merged with contacts; now 1:1 with CLIENT calls only |
| `contacts` | `call_form_data` | ✅ Merged | Merged with companies |
| `recordings` | `call_recordings` | ✅ Renamed | Same functionality, enhanced with upload tracking |
| `audit_logs` | `audit_logs` | ✅ Maintained | Now immutable; added admin_user from JWT |
| `user_sessions` | ❌ REMOVED | - | Now using JWT (httpOnly refresh cookies) |
| `manager_assignments` | ❌ REMOVED | - | Embedded in JWT `role` claim |
| `employee_activity` | ❌ REMOVED | - | Tracked via audit_logs instead |
| `user_roles` | ❌ REMOVED | - | Now using JWT `role` claim (SUPER_ADMIN, ADMIN, MANAGER) |

---

## 2. Field Mapping by Table

### 2.1 EMPLOYEES (from users)

| MongoDB Field | PostgreSQL Field | Type | Changes |
|---|---|---|---|
| `phone_no` | `emp_id` | VARCHAR(50) | **PK** - Format: EMP-XXXX |
| `name` | `full_name` | VARCHAR | Renamed |
| `email` | `email` | VARCHAR | Now UNIQUE |
| `phone` | `phone_number` | VARCHAR | **E.164 format** (+91XXXXXXXXXX) |
| `department` | `designation` | VARCHAR | Renamed |
| `is_active` | `is_active` | BOOLEAN | Same |
| `created_at` | `created_at` | TIMESTAMP | Same (ISO 8601) |
| `updated_at` | `updated_at` | TIMESTAMP | Same |
| *(removed)* | — | — | `user_sessions`, `manager_assignments`, `user_roles` removed |

### 2.2 DEVICES (unchanged structure, enhanced)

| MongoDB Field | PostgreSQL Field | Type | Changes |
|---|---|---|---|
| `_id` | `serial_number` | VARCHAR(50) | **PK** - Changed from ObjectId |
| `user_id` | `employee_id` | VARCHAR(50) FK | Now **NULLABLE** (unlinked devices) |
| `imei1` | `imei_1` | VARCHAR | Renamed (underscore) |
| `imei2` | `imei_2` | VARCHAR | Renamed (underscore) |
| `phone1` | `phone_number_1` | VARCHAR | Renamed; **E.164 format** |
| `phone2` | `phone_number_2` | VARCHAR | Renamed (underscore) |
| — | `link_status` | ENUM | **NEW** - UNLINKED, AUTO_LINKED, MANUAL_LINKED, DEACTIVATED |
| — | `linked_at` | TIMESTAMP | **NEW** - When link status changed |
| — | `linked_by` | VARCHAR | **NEW** - Admin who manually linked; null if AUTO_LINKED |
| `active` | `is_active` | BOOLEAN | Renamed (is_) |
| `registered` | `registered_at` | TIMESTAMP | Renamed |
| `last_seen` | `last_seen_at` | TIMESTAMP | Renamed (underscores) |
| `last_sync` | `last_sync_at` | TIMESTAMP | Renamed (underscores) |
| `created_at` | `created_at` | TIMESTAMP | Same |
| `updated_at` | `updated_at` | TIMESTAMP | Same |

### 2.3 CALL_LOGS (merged from calls + call_classifications + call_statuses)

| MongoDB Field | PostgreSQL Field | Type | Changes |
|---|---|---|---|
| `_id` | `id` | UUID | **PK** - Changed to UUID |
| `device_id` | `device_serial` | VARCHAR(50) FK | Renamed; FK to devices.serial_number |
| `user_id` | `employee_id` | VARCHAR(50) FK | Renamed; FK to employees.emp_id |
| `direction` | `call_direction` | ENUM | Now ENUM: INCOMING, OUTGOING, MISSED |
| `caller` | `caller_number` | VARCHAR | **E.164 format** |
| `callee` | `callee_number` | VARCHAR | **E.164 format** |
| `duration` | `duration_seconds` | INT | Renamed |
| *(from call_classifications)* | `call_category` | ENUM | **NEW** - CLIENT, TEAM_MEMBER, PERSONAL, MISSED, PENDING |
| — | `is_form_required` | BOOLEAN | **NEW** - Derived from call_category |
| *(from call_statuses)* | `is_form_submitted` | BOOLEAN | **NEW** - Form completion flag |
| *(from call_statuses)* | `has_recording` | BOOLEAN | **NEW** - Recording flag |
| `created_at` | `created_at` | TIMESTAMP | Same |
| `updated_at` | `updated_at` | TIMESTAMP | Same |

### 2.4 CALL_FORM_DATA (merged from companies + contacts, CLIENT only)

| MongoDB Field | PostgreSQL Field | Type | Changes |
|---|---|---|---|
| `_id` | `id` | UUID | **PK** - Changed to UUID |
| `call_id` | `call_log_id` | UUID FK | **NEW** - 1:1 with call_logs (UNIQUE) |
| `company` | `company_name` | VARCHAR | Renamed |
| `contact_name` | `customer_name` | VARCHAR | Renamed |
| `reason` | `reason_for_call` | VARCHAR | Renamed |
| `notes` | `notes` | TEXT | Same |
| — | `created_at` | TIMESTAMP | **NEW** |
| — | `updated_at` | TIMESTAMP | **NEW** |
| *(removed)* | — | — | Only for CLIENT calls; doesn't exist for TEAM_MEMBER/PERSONAL |

### 2.5 CALL_RECORDINGS (from recordings, CLIENT + TEAM_MEMBER only)

| MongoDB Field | PostgreSQL Field | Type | Changes |
|---|---|---|---|
| `_id` | `id` | UUID | **PK** - Changed to UUID |
| `call_id` | `call_log_id` | UUID FK | **NEW** - 1:1 with call_logs (UNIQUE) |
| `device_id` | `device_serial` | VARCHAR(50) FK | Renamed; FK to devices.serial_number |
| `local_path` | `local_file_path` | VARCHAR | Renamed; nullable after S3 upload |
| `file_size` | `file_size_bytes` | INT | Renamed |
| `s3_bucket` | `s3_bucket` | VARCHAR | Same |
| `s3_key` | `s3_key` | VARCHAR | Same |
| — | `upload_status` | ENUM | **NEW** - PENDING, UPLOADING, COMPLETED, FAILED, RETRY_SCHEDULED |
| — | `retry_count` | INT | **NEW** - Retry tracking |
| — | `max_retries` | INT | **NEW** - Default 3 |
| — | `next_retry_at` | TIMESTAMP | **NEW** - Scheduled retry time |
| — | `error_message` | TEXT | **NEW** - Error details if FAILED |
| `created_at` | `created_at` | TIMESTAMP | Same |
| `updated_at` | `updated_at` | TIMESTAMP | Same |

### 2.6 AUDIT_LOGS (enhanced, now immutable)

| MongoDB Field | PostgreSQL Field | Type | Changes |
|---|---|---|---|
| `_id` | `id` | UUID | **PK** - Changed to UUID |
| `user` | `admin_user` | VARCHAR | Now from JWT claims; immutable |
| `action` | `action` | ENUM | Same: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT |
| `entity_type` | `entity_type` | ENUM | Same: EMPLOYEE, DEVICE |
| `entity_id` | `entity_id` | VARCHAR | Same |
| `old_values` | `old_values` | JSONB | Now JSON type |
| `new_values` | `new_values` | JSONB | Now JSON type |
| `ip_address` | `ip_address` | VARCHAR | Same |
| `user_agent` | `user_agent` | VARCHAR | Same |
| `created_at` | `created_at` | TIMESTAMP | Same; **NO updated_at** (immutable) |
| *(removed)* | — | — | No UPDATE or DELETE operations on audit logs |

### 2.7 Removed Tables

**These MongoDB tables are NO LONGER needed:**

1. **`user_sessions`** - Replaced by JWT auth with refresh tokens
2. **`manager_assignments`** - Handled by JWT `role` claim
3. **`employee_activity`** - Tracked via `audit_logs` instead
4. **`user_roles`** - Now JWT `role` claim (SUPER_ADMIN, ADMIN, MANAGER)

---

## 3. Key Breaking Changes for React Components

### 3.1 Field Name Changes

Update all references in components:

```javascript
// OLD → NEW
phone_no → emp_id
name → full_name
department → designation
device_id → device_serial
user_id → employee_id
caller → caller_number
callee → callee_number
duration → duration_seconds
company → company_name
contact_name → customer_name
reason → reason_for_call
file_size → file_size_bytes
local_path → local_file_path
is_active (device) → is_active
registered → registered_at
last_seen → last_seen_at
last_sync → last_sync_at
phone1 → phone_number_1
phone2 → phone_number_2
imei1 → imei_1
imei2 → imei_2
call_id → call_log_id
user → admin_user
```

### 3.2 New Enum Fields

These fields didn't exist in MongoDB:

- **`call_logs.link_status`** → Must check before rendering link status UI
- **`call_logs.call_category`** → Replaces call_classifications table queries
- **`call_logs.is_form_required`** → Derived from call_category
- **`call_logs.is_form_submitted`** → Replaces call_statuses queries
- **`call_logs.has_recording`** → Replaces recording existence checks
- **`call_recordings.upload_status`** → Track S3 upload progress

### 3.3 Conditional Rendering Rules

**Call Form Data**
- Only exists for `call_category = 'CLIENT'`
- Components must check this before rendering form section
- Use `callFormService.hasCallFormData(call_log_id)` to check

**Call Recordings**
- Only exists for `call_category = 'CLIENT'` or `call_category = 'TEAM_MEMBER'`
- Components must check this before showing play button
- Use `recordingService.hasRecording(call_log_id)` to check
- NEVER cache pre-signed S3 URLs; generate on-demand

**Device Unlinked State**
- `employee_id` can be NULL (unlinked device)
- Components must handle nullable employee_id gracefully
- Display "Unlinked" or similar UI state

### 3.4 Validation Changes

**Phone Numbers**
- Must validate E.164 format: `+[1-9]{1,3}[0-9]{1,14}`
- Examples: `+919876543210`, `+14155552671`
- No longer accept arbitrary formats

**Employee ID**
- Format: `EMP-XXXX` (e.g., `EMP-0042`)
- Validate with regex: `/^EMP-\d{3,4}$/`

---

## 4. Components Needing Updates

### 4.1 High Priority (Core Functionality)

| Component | Current Field | New Field | Action |
|---|---|---|---|
| EmployeeList | `phone_no`, `name` | `emp_id`, `full_name` | Update field mappings |
| DeviceList | `_id`, `user_id`, `phone1` | `serial_number`, `employee_id`, `phone_number_1` | Update field mappings + handle NULL employee_id |
| CallLogTable | `direction`, `duration`, classification | `call_direction`, `duration_seconds`, `call_category` | Update field mappings + enum badges |
| CallFormModal | Check `company` → Check `call_form_data` exists | Conditional render on `call_category='CLIENT'` | Add hasCallFormData check |
| RecordingPlayer | Check for recording → Check `call_recordings` exists | Conditional render on `call_category IN (CLIENT, TEAM_MEMBER)` | Add hasRecording check |
| Dashboard | `phone_no`, `direction` | `emp_id`, `call_direction` | Update field mappings |

### 4.2 Medium Priority (Secondary Views)

| Component | Current Field | New Field | Action |
|---|---|---|---|
| EmployeeProfile | `phone_no`, `name`, `department` | `emp_id`, `full_name`, `designation` | Update field mappings |
| DeviceProfile | `_id`, `phone1`, `phone2` | `serial_number`, `phone_number_1`, `phone_number_2` | Update + show link_status |
| AuditLogList | `user`, `old_values`, `new_values` | `admin_user`, old_values JSON, new_values JSON | Add getChangeDescription helper |
| ReportView | Aggregate by `phone_no` | Aggregate by `emp_id` | Update group-by fields |
| ExportCSV | Use old field names | Use new field names | Update export templates |

### 4.3 Low Priority (UI/UX)

| Component | Current | New | Action |
|---|---|---|---|
| StatusBadges | Classification labels | Call category enum + labels | Use CALL_CATEGORY_LABELS |
| DirectionBadges | Direction text | Call direction enum + labels | Use CALL_DIRECTION_LABELS |
| UploadStatus | Simple uploaded/pending | Upload status enum (5 states) | Use UPLOAD_STATUS_LABELS + colors |
| LinkStatus | Simple yes/no | 4-state enum (UNLINKED, AUTO_LINKED, MANUAL_LINKED, DEACTIVATED) | Use LINK_STATUS_LABELS + colors |

---

## 5. Authentication Changes

### Old System (MongoDB)
- Session-based auth
- `user_sessions` table tracked active sessions
- Role stored in `user_roles` table
- Manager assignments in separate table

### New System (PostgreSQL)
- **JWT access tokens** (15 min expiry)
- **httpOnly refresh tokens** (7 days) - sent as cookies
- **Role in JWT claim** - SUPER_ADMIN, ADMIN, MANAGER
- **No manager tracking** - use role hierarchy instead

### Implementation in React

**Store access token:**
```javascript
localStorage.setItem('access_token', token);
```

**Refresh token handling:**
- Stored as httpOnly cookie (backend)
- Sent automatically with `withCredentials: true` in axios

**Auto-refresh logic in `api.ts`:**
- 401 response → call `/auth/refresh` endpoint
- Backend returns new access_token
- Failed refresh → clear auth & redirect to login

---

## 6. Service Layer Migration

### Old Services (if any)
```javascript
userService.getUserById(phone_no)
deviceService.getDevice(objectId)
callService.getCall(objectId)
```

### New Services

```typescript
// Use these new files:
import employeeService from './services/employeeService';
import deviceService from './services/deviceService';
import callLogService from './services/callLogService';
import callFormService from './services/callFormService';
import recordingService from './services/recordingService';
import auditLogService from './services/auditLogService';

// Example usage:
const employees = await employeeService.getEmployees();
const device = await deviceService.getDevice('SERIAL-123');
const calls = await callLogService.getCallLogs({ employee_id: 'EMP-0042' });
const form = await callFormService.getCallFormByCallLogId(callLogId);
const recording = await recordingService.getRecordingByCallLogId(callLogId);
const url = await recordingService.getRecordingPlaybackUrl(recordingId); // On-demand!
```

---

## 7. Data Validation Rules

### Phones (E.164)
```regex
^\+[1-9]\d{1,14}$
```
- Required for employees and devices
- Examples: +919876543210, +14155552671

### Employee ID
```regex
^EMP-\d{3,4}$
```
- Format: EMP-0001 to EMP-9999
- Auto-generated or manually set

### Email
```regex
^[^\s@]+@[^\s@]+\.[^\s@]+$
```
- Unique in employees table

---

## 8. Conditional Rendering Matrix

### When to Show Form Section (CLIENT calls only)

```javascript
if (callLog.call_category === 'CLIENT') {
  // Show form section
  if (callLog.is_form_required && !callLog.is_form_submitted) {
    // Show form popup/modal
  } else if (callLog.is_form_submitted) {
    // Show form data (read-only or editable)
  }
}
```

### When to Show Recording Player (CLIENT + TEAM_MEMBER only)

```javascript
if (['CLIENT', 'TEAM_MEMBER'].includes(callLog.call_category)) {
  if (callLog.has_recording) {
    // Show play button
    // On click: getRecordingPlaybackUrl(recordingId)  // NEW every time!
  }
}
```

### When to Show Device Link Status

```javascript
if (device.employee_id === null) {
  // Show "Unlinked" badge
  // Show "Link Device" button
} else if (device.link_status === 'MANUAL_LINKED') {
  // Show "Manually Linked" badge with admin name
} else if (device.link_status === 'AUTO_LINKED') {
  // Show "Auto Linked" badge
} else if (device.link_status === 'DEACTIVATED') {
  // Show "Deactivated" badge (grayed out)
}
```

---

## 9. Migration Checklist

- [ ] Create TypeScript interfaces (`src/types/interfaces.ts`)
- [ ] Create enum constants (`src/constants/enums.ts`)
- [ ] Create axios API instance with JWT interceptor (`src/services/api.ts`)
- [ ] Create service files:
  - [ ] `employeeService.ts`
  - [ ] `deviceService.ts`
  - [ ] `callLogService.ts`
  - [ ] `callFormService.ts`
  - [ ] `recordingService.ts`
  - [ ] `auditLogService.ts`
- [ ] Update Employee component: field mappings
- [ ] Update Device component: field mappings + null check
- [ ] Update Call Log component: enum badges + field mappings
- [ ] Update Form modal: conditional render on category
- [ ] Update Recording player: conditional render + on-demand URL
- [ ] Update Auth context: JWT token management
- [ ] Update Dashboard: field mappings
- [ ] Test with new backend APIs
- [ ] Verify E.164 phone validation
- [ ] Test device link/unlink flow
- [ ] Test JWT refresh on 401

---

## 10. Files Created

```
src/
├── types/
│   └── interfaces.ts          ← All 6 table interfaces + enums + helpers
├── constants/
│   └── enums.ts               ← Enum constants + labels + colors
└── services/
    ├── api.ts                 ← Axios instance with JWT interceptor
    ├── employeeService.ts     ← CRUD for employees
    ├── deviceService.ts       ← CRUD + link/unlink for devices
    ├── callLogService.ts      ← Query/filter for call_logs
    ├── callFormService.ts     ← Query for call_form_data (CLIENT only)
    ├── recordingService.ts    ← Query + playback URL for recordings
    └── auditLogService.ts     ← Read-only audit logs
```

---

## Summary

✅ 13 MongoDB tables → 7 PostgreSQL tables
✅ Field naming normalized (snake_case)
✅ Enums introduced for better type safety
✅ JWT auth replaces session-based
✅ Immutable audit logging
✅ Conditional data model (forms/recordings by category)
✅ On-demand S3 URL generation (never cached)

**Next Step:** Update React components to use the new service layer and field names.
