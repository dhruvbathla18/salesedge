# Server API Design for This Admin Website

## 1. Purpose
This project is an internal admin dashboard for a sales/call-center operation. The backend must support:
- User login and session validation
- Role-based access control
- Employee and company management
- Call history and filtering
- Recording metadata and playback access
- Security auditing and activity tracking
- Dashboard summary metrics

This design is based on the existing website structure and the current backend implementation in this repository.

---

## 2. Main Use Cases
1. Admin logs in with email and password.
2. System validates JWT token for every request.
3. User sees dashboard totals like employees, calls, business calls, uploaded recordings.
4. Admin/manager searches and filters employees, companies, and calls.
5. Manager can view recordings only for authorized employees.
6. Protected audit log and session views are available to higher roles.

---

## 3. Technology Stack Recommendation
Use:
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT for auth
- Helmet, CORS, rate limiting
- S3 for audio storage (optional/local fixtures for development)

Recommended server folder structure:

```
server/
  src.js
  config/
    db.js
  controllers/
    auth.js
    resources.js
  middleware/
    auth.js
    audit.js
  models/
    index.js
  routes/
    index.js
  services/
    s3.js
  utils/
    seed.js
```

---

## 4. Core Roles

### SUPER_ADMIN
- Full access to all data
- Can view employees, companies, calls, recordings, audit logs, devices, sessions

### ADMIN
- Can view dashboard and operational records
- Can access device/activity/audit data

### MANAGER
- Can view calls and recording metadata
- Can play recordings only for authorized employees
- Restricted from sensitive admin views

---

## 5. Authentication Design

### Login
POST /api/auth/login

Request body:
```json
{
  "email": "admin@mistavinya.local",
  "password": "Admin@12345"
}
```

Response:
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "64f...",
    "name": "Admin User",
    "email": "admin@mistavinya.local",
    "role": "SUPER_ADMIN"
  }
}
```

### Get current user
GET /api/auth/me

Headers:
```http
Authorization: Bearer <token>
```

### Logout
POST /api/auth/logout

---

## 6. Protected API Routes
All routes after auth middleware require a valid JWT token.

### Dashboard summary
GET /api/dashboard

Response:
```json
{
  "employees": 120,
  "calls": 840,
  "business": 540,
  "recordings": 238
}
```

---

### Employees
GET /api/employees?page=1&limit=20&q=smith

Response:
```json
{
  "data": [
    {
      "_id": "...",
      "employeeId": "EMP-001",
      "name": "Asha Verma",
      "department": "Sales",
      "status": "ACTIVE",
      "phone": "+91...",
      "email": "asha@example.com"
    }
  ],
  "total": 45,
  "page": 1,
  "pages": 3
}
```

---

### Companies
GET /api/companies?page=1&limit=20&q=tech

Response:
```json
{
  "data": [
    {
      "_id": "...",
      "name": "Nexa Systems",
      "contactPerson": "Rohit",
      "phone": "+91...",
      "email": "contact@nexa.com",
      "industry": "IT",
      "location": "Bengaluru",
      "assignedSalesperson": {
        "_id": "...",
        "name": "Asha Verma"
      }
    }
  ],
  "total": 18,
  "page": 1,
  "pages": 1
}
```

---

### Calls
GET /api/calls?employee=...&company=...&direction=INCOMING&classification=BUSINESS&recordingStatus=UPLOADED&from=2025-01-01&to=2025-12-31&page=1&limit=20

Response:
```json
{
  "data": [
    {
      "_id": "...",
      "callId": "CALL-1042",
      "employeeId": {
        "_id": "...",
        "name": "Asha Verma"
      },
      "companyId": {
        "_id": "...",
        "name": "Nexa Systems"
      },
      "contactId": {
        "_id": "...",
        "name": "Rohit"
      },
      "phoneNumber": "+919999999999",
      "direction": "OUTGOING",
      "startTime": "2025-09-01T10:42:00.000Z",
      "duration": 420,
      "classification": "BUSINESS",
      "recordingId": {
        "_id": "...",
        "uploadStatus": "UPLOADED"
      }
    }
  ],
  "total": 200,
  "page": 1,
  "pages": 10
}
```

### Get single call
GET /api/calls/:id

---

### Recordings
GET /api/recordings?page=1&limit=20

Response:
```json
{
  "data": [
    {
      "_id": "...",
      "recordingId": "REC-1001",
      "callId": { "_id": "..." },
      "employeeId": { "_id": "...", "name": "Asha" },
      "storageProvider": "S3",
      "fileName": "call-1001.wav",
      "mimeType": "audio/wav",
      "uploadStatus": "UPLOADED",
      "uploadedAt": "2025-09-01T10:45:00.000Z"
    }
  ],
  "total": 70,
  "page": 1,
  "pages": 4
}
```

### Play recording
GET /api/recordings/:id/play

Response:
```json
{
  "url": "https://s3.presigned.url/...",
  "expiresIn": 300
}
```

For local fixtures, response may be:
```json
{
  "url": "http://localhost:5000/recordings/sample.wav",
  "expiresIn": null
}
```

---

### Audit logs
GET /api/audit-logs?page=1&limit=20

### Devices
GET /api/devices?page=1&limit=20

### Employee activity
GET /api/employee-activity?page=1&limit=20

### User sessions
GET /api/user-sessions?page=1&limit=20

---

## 7. Data Model Design

### User
```js
{
  name: String,
  email: String,
  phone: String,
  password: String,
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER',
  authorizedEmployees: [ObjectId],
  authorizedCompanies: [ObjectId],
  createdAt,
  updatedAt
}
```

### Employee
```js
{
  employeeId: String,
  name: String,
  department: String,
  status: String,
  phone: String,
  email: String,
  createdAt,
  updatedAt
}
```

### Company
```js
{
  name: String,
  contactPerson: String,
  phone: String,
  email: String,
  industry: String,
  location: String,
  assignedSalesperson: ObjectId,
  createdAt,
  updatedAt
}
```

### Contact
```js
{
  name: String,
  phone: String,
  email: String,
  companyId: ObjectId
}
```

### Call
```js
{
  callId: String,
  employeeId: ObjectId,
  companyId: ObjectId,
  contactId: ObjectId,
  phoneNumber: String,
  direction: 'INCOMING' | 'OUTGOING',
  startTime: Date,
  endTime: Date,
  duration: Number,
  classification: 'BUSINESS' | 'PERSONAL',
  recordingId: ObjectId,
  status: String,
  createdAt,
  updatedAt
}
```

### Recording
```js
{
  recordingId: String,
  callId: ObjectId,
  employeeId: ObjectId,
  storageProvider: 'LOCAL' | 'S3',
  localPath: String,
  s3Bucket: String,
  s3ObjectKey: String,
  fileName: String,
  mimeType: String,
  fileSize: Number,
  uploadStatus: 'PENDING' | 'UPLOADED' | 'FAILED',
  uploadedAt: Date,
  createdAt,
  updatedAt
}
```

### AuditLog
```js
{
  userId: ObjectId,
  action: String,
  resourceId: String,
  success: Boolean,
  meta: Object,
  timestamp: Date
}
```

### Device
```js
{
  deviceId: String,
  phone: String,
  imei: String,
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED',
  userId: ObjectId,
  createdAt,
  updatedAt
}
```

### EmployeeActivity
```js
{
  employeeId: ObjectId,
  activityType: String,
  metadata: Object,
  timestamp: Date
}
```

### UserSession
```js
{
  userId: ObjectId,
  token: String,
  expiresAt: Date,
  createdAt,
  updatedAt
}
```

---

## 8. Server Behavior Requirements

### Security
- Use JWT for authentication
- Require Authorization header for protected routes
- Use role checks with middleware
- Restrict playback by employee authorization for MANAGER users
- Use Helmet, CORS, express rate limiting, and Mongo sanitization
- Never expose audio binary in MongoDB; keep only metadata and object key

### Validation
Use Zod validation for login and payloads.

### Pagination
Apply standard query params:
- page
- limit
- q

### Search
Search by name, phone, company, employee, or relevant indexed fields.

---

## 9. Response Format
Use consistent JSON responses.

### Success list response
```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pages": 1
}
```

### Success single item response
```json
{
  "_id": "...",
  "name": "..."
}
```

### Error response
```json
{
  "message": "Invalid email or password"
}
```

---

## 10. Recommended Server Flow
1. Express app starts
2. Load environment variables
3. Connect to MongoDB
4. Add security middleware
5. Mount auth routes and protected API routes
6. Validate JWT on each protected request
7. Serve recording files from local public folder or signed S3 URLs
8. Return paginated JSON payloads

---

## 11. Suggested Endpoints Summary
| Route | Method | Access |
|---|---|---|
| /api/auth/login | POST | Public |
| /api/auth/me | GET | Authenticated |
| /api/auth/logout | POST | Authenticated |
| /api/dashboard | GET | Authenticated |
| /api/employees | GET | Authenticated |
| /api/companies | GET | Authenticated |
| /api/calls | GET | Authenticated |
| /api/calls/:id | GET | Authenticated |
| /api/recordings | GET | Authenticated |
| /api/recordings/:id/play | GET | Authenticated, role-based |
| /api/audit-logs | GET | ADMIN/SUPER_ADMIN |
| /api/devices | GET | ADMIN/SUPER_ADMIN |
| /api/employee-activity | GET | ADMIN/SUPER_ADMIN |
| /api/user-sessions | GET | SUPER_ADMIN |

---

## 12. Notes for Friend Generating the Server
The generated server should match the website’s real behavior:
- This is not a generic e-commerce app
- It is a CRM/admin portal with call auditing and recording access
- The frontend expects clean REST responses and pagination metadata
- Playback is protected and role-controlled
- Data is relationally connected through Mongo ObjectIds

If you hand this to a backend developer, they should implement the server exactly around this contract.

---

## 13. Final Recommendation
The best architecture is:
- Express API with JWT
- MongoDB + Mongoose models
- Role-based access middleware
- Recording access via presigned URLs
- Standard paginated responses
- Audit-friendly service design

This matches the behavior and UI requirements of the website.
