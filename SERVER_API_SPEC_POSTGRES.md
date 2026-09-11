# PostgreSQL API Design for This Admin Website

## 1. Overview
This website is an internal admin dashboard for a call-center / sales operations team. The backend must support:
- Authentication and JWT sessions
- Role-based authorization
- Employee management
- Company and contact management
- Call history with filters and search
- Recording metadata and secure playback links
- Dashboard metrics
- Audit logging and device/session tracking

Because the database is PostgreSQL, the server design should use relational tables instead of MongoDB document collections.

---

## 2. Recommended Stack
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM (recommended) or Sequelize
- JWT
- bcrypt
- Helmet, CORS, express-rate-limit
- AWS S3 for audio storage (optional local dev storage)

---

## 3. Roles
```text
SUPER_ADMIN
ADMIN
MANAGER
```

### Role permissions
- SUPER_ADMIN: full access to all data and admin functions
- ADMIN: access dashboard, employees, companies, calls, recordings, audit logs, devices, employee activity
- MANAGER: limited to business data and recordings for assigned/authorized employees only

---

## 4. Core Database Design (PostgreSQL)

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'MANAGER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### employees
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### companies
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  industry VARCHAR(255),
  location VARCHAR(255),
  assigned_salesperson_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### contacts
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### calls
```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_code VARCHAR(100) NOT NULL UNIQUE,
  employee_id UUID REFERENCES employees(id),
  company_id UUID REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  phone_number VARCHAR(50),
  direction VARCHAR(20) CHECK (direction IN ('INCOMING', 'OUTGOING')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  classification VARCHAR(20) CHECK (classification IN ('BUSINESS', 'PERSONAL')),
  recording_id UUID REFERENCES recordings(id),
  status VARCHAR(50) DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### recordings
```sql
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_code VARCHAR(100) NOT NULL UNIQUE,
  call_id UUID REFERENCES calls(id),
  employee_id UUID REFERENCES employees(id),
  storage_provider VARCHAR(20) DEFAULT 'S3' CHECK (storage_provider IN ('LOCAL', 'S3')),
  local_path TEXT,
  s3_bucket TEXT,
  s3_object_key TEXT,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size BIGINT,
  upload_status VARCHAR(20) DEFAULT 'PENDING' CHECK (upload_status IN ('PENDING', 'UPLOADED', 'FAILED')),
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255),
  resource_id VARCHAR(255),
  success BOOLEAN,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### devices
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  imei VARCHAR(255) UNIQUE,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### employee_activity
```sql
CREATE TABLE employee_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  activity_type VARCHAR(255),
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### user_sessions
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### manager_authorizations (optional but useful)
```sql
CREATE TABLE manager_employee_authorizations (
  manager_id UUID REFERENCES users(id),
  employee_id UUID REFERENCES employees(id),
  PRIMARY KEY (manager_id, employee_id)
);
```

---

## 5. Auth API Design

### 5.1 Login
POST /api/auth/login

Request:
```json
{
  "email": "admin@mistavinya.local",
  "password": "Admin@12345"
}
```

Success response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "3f2c1d20-...",
    "name": "Admin User",
    "email": "admin@mistavinya.local",
    "role": "SUPER_ADMIN"
  }
}
```

Error response:
```json
{
  "message": "Invalid email or password"
}
```

Status:
- 200 OK on success
- 401 Unauthorized on bad credentials

---

### 5.2 Current user
GET /api/auth/me

Headers:
```http
Authorization: Bearer <token>
```

Response:
```json
{
  "user": {
    "id": "3f2c1d20-...",
    "name": "Admin User",
    "email": "admin@mistavinya.local",
    "role": "SUPER_ADMIN"
  }
}
```

---

### 5.3 Logout
POST /api/auth/logout

Headers:
```http
Authorization: Bearer <token>
```

Response:
- 204 No Content

---

## 6. Protected Dashboard API

### GET /api/dashboard

Response:
```json
{
  "employees": 120,
  "calls": 845,
  "business": 530,
  "recordings": 214
}
```

Status:
- 200 OK

---

## 7. Employee API

### GET /api/employees?page=1&limit=20&q=sales

Response:
```json
{
  "data": [
    {
      "id": "b7e19e2b-1111-4ee8-b8d1-8a9097f6f6cf",
      "employee_code": "EMP-001",
      "name": "Asha Verma",
      "department": "Sales",
      "status": "ACTIVE",
      "phone": "+91 98765 43210",
      "email": "asha@example.com",
      "created_at": "2026-09-01T10:00:00.000Z"
    }
  ],
  "total": 48,
  "page": 1,
  "pages": 3
}
```

---

## 8. Company API

### GET /api/companies?page=1&limit=20&q=tech

Response:
```json
{
  "data": [
    {
      "id": "f3d8df52-...",
      "name": "Nexa Systems",
      "contact_person": "Rohit Sharma",
      "phone": "+91 98123 45678",
      "email": "contact@nexasystems.com",
      "industry": "IT",
      "location": "Bengaluru",
      "assigned_salesperson": {
        "id": "b7e19e2b-...",
        "name": "Asha Verma"
      }
    }
  ],
  "total": 15,
  "page": 1,
  "pages": 1
}
```

---

## 9. Call API

### GET /api/calls?employee_id=...&company_id=...&direction=OUTGOING&classification=BUSINESS&recording_status=UPLOADED&from=2026-01-01&to=2026-09-01&page=1&limit=20

Response:
```json
{
  "data": [
    {
      "id": "5e3f1f94-...",
      "call_code": "CALL-1042",
      "employee": {
        "id": "b7e19e2b-...",
        "name": "Asha Verma"
      },
      "company": {
        "id": "f3d8df52-...",
        "name": "Nexa Systems"
      },
      "contact": {
        "id": "9f8f4c3d-...",
        "name": "Rohit Sharma"
      },
      "phone_number": "+91 99999 99999",
      "direction": "OUTGOING",
      "start_time": "2026-09-01T10:42:00.000Z",
      "end_time": "2026-09-01T10:44:00.000Z",
      "duration_seconds": 120,
      "classification": "BUSINESS",
      "recording": {
        "id": "7a2d7b18-...",
        "upload_status": "UPLOADED"
      }
    }
  ],
  "total": 220,
  "page": 1,
  "pages": 11
}
```

### GET /api/calls/:id

Response:
```json
{
  "id": "5e3f1f94-...",
  "call_code": "CALL-1042",
  "employee_id": "b7e19e2b-...",
  "company_id": "f3d8df52-...",
  "contact_id": "9f8f4c3d-...",
  "phone_number": "+91 99999 99999",
  "direction": "OUTGOING",
  "start_time": "2026-09-01T10:42:00.000Z",
  "end_time": "2026-09-01T10:44:00.000Z",
  "duration_seconds": 120,
  "classification": "BUSINESS",
  "recording_id": "7a2d7b18-...",
  "status": "COMPLETED",
  "employee": {
    "id": "b7e19e2b-...",
    "name": "Asha Verma"
  },
  "company": {
    "id": "f3d8df52-...",
    "name": "Nexa Systems"
  }
}
```

---

## 10. Recording API

### GET /api/recordings?page=1&limit=20

Response:
```json
{
  "data": [
    {
      "id": "7a2d7b18-...",
      "recording_code": "REC-1001",
      "call_id": "5e3f1f94-...",
      "employee": {
        "id": "b7e19e2b-...",
        "name": "Asha Verma"
      },
      "storage_provider": "S3",
      "file_name": "call-1001.wav",
      "mime_type": "audio/wav",
      "file_size": 1843200,
      "upload_status": "UPLOADED",
      "uploaded_at": "2026-09-01T10:45:00.000Z"
    }
  ],
  "total": 70,
  "page": 1,
  "pages": 4
}
```

### GET /api/recordings/:id/play

Authorized response:
```json
{
  "url": "https://s3.amazonaws.com/bucket/path/audio.wav?X-Amz-Signature=...",
  "expiresIn": 300
}
```

If using local fixtures:
```json
{
  "url": "http://localhost:5000/recordings/sample.wav",
  "expiresIn": null
}
```

If not authorized:
```json
{
  "message": "Not authorized for this recording"
}
```

Status:
- 200 OK on available recording
- 403 Forbidden when not allowed
- 404 Not Found when recording missing or not uploaded

---

## 11. Audit and Admin APIs

### GET /api/audit-logs?page=1&limit=20

Response:
```json
{
  "data": [
    {
      "id": "d3f1cb87-...",
      "user": {
        "id": "3f2c1d20-...",
        "name": "Admin User"
      },
      "action": "VIEW_RECORDING",
      "resource_id": "7a2d7b18-...",
      "success": true,
      "meta": {
        "ip": "127.0.0.1"
      },
      "created_at": "2026-09-01T11:12:00.000Z"
    }
  ],
  "total": 120,
  "page": 1,
  "pages": 6
}
```

### GET /api/devices
### GET /api/employee-activity
### GET /api/user-sessions

These should follow the same paginated response format:
```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pages": 1
}
```

---

## 12. Server Architecture Pattern

### Folder structure
```text
server/
  src.js
  app.js
  config/
    db.js
  controllers/
    authController.js
    dashboardController.js
    employeeController.js
    companyController.js
    callController.js
    recordingController.js
    adminController.js
  middleware/
    authMiddleware.js
    roleMiddleware.js
    auditMiddleware.js
    errorMiddleware.js
  routes/
    authRoutes.js
    dashboardRoutes.js
    employeeRoutes.js
    companyRoutes.js
    callRoutes.js
    recordingRoutes.js
    adminRoutes.js
  services/
    s3Service.js
    authService.js
  prisma/
    schema.prisma
  utils/
    seed.js
```

### Middleware flow
1. Express app starts
2. Load env variables
3. Connect to PostgreSQL
4. Add security middleware
5. Parse JSON body
6. Verify JWT on protected routes
7. Check user role on protected endpoints
8. Query database with pagination/filter logic
9. Return JSON response
10. Log audit event

---

## 13. Security Rules
- Use JWT in Authorization header
- Validate role for each route
- Never allow plain password storage
- Use bcrypt password hashing
- Use Helmet and rate limiting
- Use CORS allowlist for frontend domain
- For recordings, return signed S3 URL or local file URL only after authorization
- Do not store raw audio in PostgreSQL; store metadata and file key only

---

## 14. Response Format Standard

### Success response list
```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pages": 1
}
```

### Success single object
```json
{
  "id": "...",
  "name": "..."
}
```

### Error response
```json
{
  "message": "Forbidden"
}
```

---

## 15. Example Implementation Logic

### Route protection
```js
app.use('/api', authenticateToken);
```

### Role guard
```js
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}
```

### Data response pattern
```js
const [rows, total] = await Promise.all([
  prisma.calls.findMany({
    skip: (page - 1) * limit,
    take: limit,
    include: {
      employee: true,
      company: true,
      contact: true,
      recording: true,
    }
  }),
  prisma.calls.count()
]);

res.json({ data: rows, total, page, pages: Math.ceil(total / limit) });
```

---

## 16. Final Design Recommendation
For PostgreSQL, the best-fitting architecture is:
- Express + PostgreSQL + Prisma
- JWT authentication
- Role-based access middleware
- Relational tables with foreign keys
- Pagination + filtering responses
- S3 presigned URLs for recording playback

This design matches the behavior of your website and gives clean API responses the frontend expects.

---

## 17. Summary of Response After API Hit
When frontend hits an API endpoint, it should receive a JSON response like one of these:

### Dashboard example
```json
{
  "employees": 120,
  "calls": 845,
  "business": 530,
  "recordings": 214
}
```

### List example
```json
{
  "data": [
    { "id": "...", "name": "Asha Verma" }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

### Playback example
```json
{
  "url": "https://s3....",
  "expiresIn": 300
}
```

### Error example
```json
{
  "message": "Authentication required"
}
```

This is the standard response pattern your app should follow.
