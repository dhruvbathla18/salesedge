# Mist Avinya Admin Portal – Schema Architecture Mapping

## Overview
This document maps the intended database schema (from the architecture diagram) to the current implementation and identifies gaps.

---

## Entity-by-Entity Comparison

### 1. **Users Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Primary Key | `phone_no` (VARCHAR) | `_id` (ObjectId) | Phone is secondary | Add `phone` field, keep `_id` as primary |
| Auth Fields | `password` | `password` (select: false) | ✅ Match | No change |
| Access Control | `role` (enum) | `role` (enum: SUPER_ADMIN, ADMIN, MANAGER) | ✅ Match | No change |
| Sessions | `user_sessions` (separate table) | Stored in localStorage | ❌ Not in DB | Add UserSession model |
| Assigned Scope | `authorizedEmployees`, `authorizedCompanies` | Present in User schema | ✅ Match | No change |

**Current Model:**
```javascript
const user = new Schema({
  name: {type: String, required: true},
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true, select: false},
  role: {type: String, enum: ['SUPER_ADMIN','ADMIN','MANAGER'], default: 'MANAGER'},
  authorizedEmployees: [{type: Schema.Types.ObjectId, ref: 'Employee'}],
  authorizedCompanies: [{type: Schema.Types.ObjectId, ref: 'Company'}]
}, {timestamps: true});
```

**Action:** Add `phone` field to User schema.

---

### 2. **Devices Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Exists | Yes (device_id, phone_no, IMEI, status) | ❌ Not implemented | Missing entire table | Create Device model |
| Purpose | Track call-recording devices | N/A | Not modeled | Add Device schema |

**Action:** Create Device model with `deviceId`, `phoneNumber`, `imei`, `status`, `userId` ref.

---

### 3. **Employees Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Primary Key | `employee_id` (VARCHAR) | `employeeId` (String, unique) | ✅ Match | No change |
| Fields | name, department, status | ✅ All present | ✅ Match | No change |
| Contact | phone, email | ✅ Present | ✅ Match | No change |

**Current Model:**
```javascript
const employee = new Schema({
  employeeId: {type: String, unique: true, index: true},
  name: String,
  department: String,
  status: {type: String, default: 'ACTIVE'},
  phone: String,
  email: String
}, {timestamps: true});
```

**Action:** No change needed. ✅

---

### 4. **Companies Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Primary Key | `company_id` | `_id` (ObjectId) | Implicit | ✅ Match |
| Fields | name, contactPerson, phone, email, industry, location | ✅ All present | ✅ Match | No change |
| Assigned Salesperson | Present | ✅ Present as `assignedSalesperson` ref | ✅ Match | No change |

**Action:** No change needed. ✅

---

### 5. **Contacts Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Primary Key | `contact_id` | `_id` (ObjectId) | Implicit | ✅ Match |
| Fields | name, phone, email, company_id ref | ✅ All present | ✅ Match | No change |

**Action:** No change needed. ✅

---

### 6. **Calls Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Primary Key | `call_id` | `callId` (String, unique) | ✅ Match | No change |
| Employee Ref | ✅ | ✅ `employeeId` | ✅ Match | No change |
| Company Ref | ✅ | ✅ `companyId` | ✅ Match | No change |
| Contact Ref | ✅ | ✅ `contactId` | ✅ Match | No change |
| Phone Number | ✅ | ✅ `phoneNumber` | ✅ Match | No change |
| Direction | INCOMING / OUTGOING | ✅ Enum | ✅ Match | No change |
| Start/End Time | ✅ | ✅ `startTime`, `endTime` | ✅ Match | No change |
| Duration | ✅ | ✅ `duration` | ✅ Match | No change |
| Classification | ✅ (ref to call_classifications) | ❌ Enum on Call | Mismatch | Keep enum (simpler, no ref needed) |
| Recording Ref | ✅ | ✅ `recordingId` | ✅ Match | No change |
| Status | ✅ | ✅ | ✅ Match | No change |

**Action:** No change needed. Current enum approach is valid.

---

### 7. **Call Classifications Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Exists | Yes (classification_id, name) | ❌ Not as separate table | Missing | Keep enum (pragmatic, no ref needed) |
| Values | BUSINESS, PERSONAL | ✅ In Call enum | ✅ Functional match | No change |

**Action:** No change (enum is simpler). ✅

---

### 8. **Recordings Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Primary Key | `recording_id` | `recordingId` (String, unique) | ✅ Match | No change |
| Call Ref | ✅ | ✅ `callId` | ✅ Match | No change |
| Employee Ref | ✅ | ✅ `employeeId` | ✅ Match | No change |
| Storage Provider | S3, LOCAL | ✅ Enum | ✅ Match | No change |
| Local Path | ✅ | ✅ `localPath` | ✅ Match | No change |
| S3 Bucket/Key | ✅ | ✅ Present | ✅ Match | No change |
| File Metadata | fileName, mimeType, fileSize | ✅ Present | ✅ Match | No change |
| Upload Status | PENDING, UPLOADED, FAILED | ✅ Enum | ✅ Match | No change |

**Action:** No change needed. ✅

---

### 9. **Employee Activity Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Exists | Yes (activity_id, employee_id, activity_type, timestamp) | ❌ Not implemented | Missing | Create EmployeeActivity model |

**Action:** Create EmployeeActivity model with `employeeId` ref, `activityType`, `timestamp`.

---

### 10. **Manager Assignments Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Exists | Yes (manager_id, employee_id) | ❌ Not as separate table | Implicit in User.authorizedEmployees | Functionally present but not modeled |

**Action:** Optional—current `User.authorizedEmployees` is sufficient.

---

### 11. **User Roles Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Exists | Yes (separate table) | ❌ Enum on User | Missing explicit model | Keep enum (simpler) |
| Values | SUPER_ADMIN, ADMIN, MANAGER | ✅ In User enum | ✅ Functional match | No change |

**Action:** No change (enum is pragmatic). ✅

---

### 12. **User Sessions Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Exists | Yes (session_id, user_id, token, expiresAt) | ❌ Stored in localStorage | Missing from DB | Add UserSession model |
| Purpose | Track active login sessions | Implicit in JWT | Functional but not persisted | Create UserSession model |

**Action:** Create UserSession model with `userId` ref, `token`, `expiresAt`, `createdAt`.

---

### 13. **Audit Logs Table**
| Aspect | Diagram | Current | Gap | Action |
|--------|---------|---------|-----|--------|
| Primary Key | `log_id` | `_id` (ObjectId) | Implicit | ✅ Match |
| User Ref | ✅ | ✅ `userId` | ✅ Match | No change |
| Action | ✅ Indexed | ✅ Indexed | ✅ Match | No change |
| Resource ID | ✅ | ✅ | ✅ Match | No change |
| Success Status | ✅ | ✅ | ✅ Match | No change |
| Metadata | ✅ | ✅ `meta` (Mixed) | ✅ Match | No change |
| Timestamp | ✅ Indexed | ✅ Indexed | ✅ Match | No change |

**Action:** No change needed. ✅

---

## Summary of Changes Required

### **Must-Have** (for 100% schema alignment)
1. ✅ User: Add `phone` field
2. ❌ Device: Create new model
3. ❌ EmployeeActivity: Create new model
4. ❌ UserSession: Create new model

### **Nice-to-Have** (for full operational support)
- Manager Assignments: Keep implicit in `User.authorizedEmployees`
- Call Classifications: Keep as enum (no separate table needed)
- User Roles: Keep as enum (no separate table needed)

### **No Changes Needed**
- Employee, Company, Contact, Call, Recording, AuditLog (already aligned)

---

## Implementation Priority

| Priority | Entity | Reason |
|----------|--------|--------|
| 1 | User Phone Field | Critical for device tracking |
| 2 | Device Model | Diagrams shows device → phone link |
| 3 | UserSession Model | For session persistence and audit trail |
| 4 | EmployeeActivity Model | For activity tracking and analytics |

