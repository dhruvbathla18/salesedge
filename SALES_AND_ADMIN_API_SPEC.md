# Unified Backend API Specification & Developer Guide
**For: Sales Mobile Application & Admin Web Portal**  
**Target Backend Stack: Java (Spring Boot 3.x), PostgreSQL, AWS S3**  
**Version:** 1.0.0  
**Date:** September 2026  

---

## Table of Contents
1. [Architecture & System Overview](#1-architecture--system-overview)
2. [Database Schema (PostgreSQL)](#2-database-schema-postgresql)
3. [Authentication & Role-Based Access Control](#3-authentication--role-based-access-control)
4. [Sales Team Application APIs (`/api/v1/sales`)](#4-sales-team-application-apis-apiv1sales)
   - [4.1 Sales Rep Login & Device Binding](#41-sales-rep-login--device-binding)
   - [4.2 Get Assigned Contacts & Companies](#42-get-assigned-contacts--companies)
   - [4.3 Create Call Log](#43-create-call-log)
   - [4.4 S3 Audio Upload - Step 1: Request Presigned URL](#44-s3-audio-upload---step-1-request-presigned-url)
   - [4.5 S3 Audio Upload - Step 2: Confirm Upload](#45-s3-audio-upload---step-2-confirm-upload)
   - [4.6 Sync Offline Calls (Batch)](#46-sync-offline-calls-batch)
   - [4.7 Daily Summary & Calling Stats](#47-daily-summary--calling-stats)
5. [Admin Web Portal APIs (`/api/v1/admin`)](#5-admin-web-portal-apis-apiv1admin)
   - [5.1 Admin / Manager Login](#51-admin--manager-login)
   - [5.2 Get Current Authenticated User](#52-get-current-authenticated-user)
   - [5.3 Logout](#53-logout)
   - [5.4 Dashboard Analytics](#54-dashboard-analytics)
   - [5.5 List & Filter Calls](#55-list--filter-calls)
   - [5.6 Get Call Details](#56-get-call-details)
   - [5.7 Get Recording Playback URL](#57-get-recording-playback-url)
   - [5.8 List Employees](#58-list-employees)
   - [5.9 List Companies & Contacts](#59-list-companies--contacts)
   - [5.10 List Registered Devices](#510-list-registered-devices)
   - [5.11 Audit Logs](#511-audit-logs)
6. [Standard Response & Error Formats](#6-standard-response--error-formats)
7. [Java Spring Boot Starter & Architecture Guide](#7-java-spring-boot-starter--architecture-guide)

---

## 1. Architecture & System Overview

A single Java (Spring Boot) backend serves both client applications through a unified PostgreSQL database and an AWS S3 bucket for audio storage.

```
       📱 Sales Mobile App                      💻 Admin Web Dashboard
      (Android / iOS Calling App)                (React Admin Portal)
                 │                                        │
                 ▼                                        ▼
    /api/v1/sales/*                          /api/v1/admin/*
    (Call logs, Device binding,              (Team analytics, Call filters,
     Audio uploads, Lead data)                Employee & Device management)
                 │                                        │
                 └──────────────────┬─────────────────────┘
                                    │
                        ┌───────────▼───────────┐
                        │   Spring Boot 3.x     │
                        │   Java Backend API    │
                        └─────┬───────────┬─────┘
                              │           │
                     ┌────────▼──────┐  ┌─▼────────────────┐
                     │  PostgreSQL   │  │    AWS S3        │
                     │  Relational   │  │ (Encrypted Audio │
                     │   Database    │  │   Recordings)    │
                     └───────────────┘  └──────────────────┘
```

---

## 2. Database Schema (PostgreSQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users (Admin, Manager, Super Admin)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'MANAGER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Employees (Sales Representatives)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) DEFAULT 'Sales',
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Devices (Sales Team Mobile Devices)
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    imei VARCHAR(255) UNIQUE,
    model VARCHAR(255),
    app_version VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Companies (Client Organizations)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    industry VARCHAR(255),
    location VARCHAR(255),
    assigned_salesperson_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Contacts (Leads / Persons associated with companies)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    designation VARCHAR(100),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Calls (Call Logs from Mobile / System)
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_code VARCHAR(100) NOT NULL UNIQUE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    phone_number VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('INCOMING', 'OUTGOING', 'MISSED')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    classification VARCHAR(20) DEFAULT 'BUSINESS' CHECK (classification IN ('BUSINESS', 'PERSONAL')),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Recordings (Audio Files metadata stored in AWS S3)
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_code VARCHAR(100) NOT NULL UNIQUE,
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    storage_provider VARCHAR(20) DEFAULT 'S3' CHECK (storage_provider IN ('LOCAL', 'S3')),
    s3_bucket VARCHAR(255),
    s3_object_key TEXT,
    local_path TEXT,
    file_name VARCHAR(255),
    mime_type VARCHAR(100) DEFAULT 'audio/wav',
    file_size BIGINT,
    upload_status VARCHAR(20) DEFAULT 'PENDING' CHECK (upload_status IN ('PENDING', 'UPLOADED', 'FAILED')),
    uploaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Audit Logs (Compliance & security access logs)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    success BOOLEAN DEFAULT TRUE,
    ip_address VARCHAR(50),
    user_agent TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Manager Assigned Employees (Optional for scoped visibility)
CREATE TABLE manager_employee_authorizations (
    manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    PRIMARY KEY (manager_id, employee_id)
);
```

---

## 3. Authentication & Role-Based Access Control

All protected endpoints require a JWT token passed in the Authorization header:
```http
Authorization: Bearer <JWT_TOKEN>
```

### Roles
- `SUPER_ADMIN`: Full access to all data, settings, devices, audit logs, and user management.
- `ADMIN`: Access to dashboard analytics, all calls, recordings, company data, and employee activity.
- `MANAGER`: Scoped access to assigned employees and their calls/recordings.
- `SALES_REP`: Access restricted to `/api/v1/sales/*` endpoints (assigned leads, call upload).

---

## 4. Sales Team Application APIs (`/api/v1/sales`)

### 4.1 Sales Rep Login & Device Binding
**Endpoint:** `POST /api/v1/sales/auth/login`  
**Access:** Public  

**Request Body:**
```json
{
  "email": "asha@example.com",
  "password": "Password@123",
  "deviceId": "DEV-AND-9912",
  "imei": "864209040123456",
  "model": "Samsung Galaxy A54",
  "appVersion": "1.4.0"
}
```

**Response (`200 OK`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "employee": {
    "id": "b7e19e2b-1111-4ee8-b8d1-8a9097f6f6cf",
    "employeeCode": "EMP-001",
    "name": "Asha Verma",
    "email": "asha@example.com",
    "phone": "+91 98765 43210",
    "department": "Sales"
  }
}
```

---

### 4.2 Get Assigned Contacts & Companies
**Endpoint:** `GET /api/v1/sales/contacts?q=tech&page=1&limit=50`  
**Access:** Authenticated Sales Rep  

**Response (`200 OK`):**
```json
{
  "data": [
    {
      "contactId": "9f8f4c3d-2222-4ee8-b8d1-8a9097f6f6cf",
      "name": "Rohit Sharma",
      "phone": "+91 98123 45678",
      "email": "rohit@nexasystems.com",
      "designation": "Procurement Head",
      "company": {
        "id": "f3d8df52-3333-4ee8-b8d1-8a9097f6f6cf",
        "name": "Nexa Systems",
        "industry": "Information Technology",
        "location": "Bengaluru"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

---

### 4.3 Create Call Log
Triggered immediately when a call completes on the sales rep's phone.

**Endpoint:** `POST /api/v1/sales/calls`  
**Access:** Authenticated Sales Rep  

**Request Body:**
```json
{
  "callCode": "CALL-2026-9812",
  "phoneNumber": "+91 98123 45678",
  "direction": "OUTGOING",
  "startTime": "2026-09-03T10:30:00.000Z",
  "endTime": "2026-09-03T10:33:15.000Z",
  "durationSeconds": 195,
  "classification": "BUSINESS",
  "notes": "Discussed quotation and demo date.",
  "companyId": "f3d8df52-3333-4ee8-b8d1-8a9097f6f6cf",
  "contactId": "9f8f4c3d-2222-4ee8-b8d1-8a9097f6f6cf"
}
```

**Response (`201 Created`):**
```json
{
  "callId": "5e3f1f94-4444-4ee8-b8d1-8a9097f6f6cf",
  "callCode": "CALL-2026-9812",
  "status": "RECORDING_PENDING",
  "message": "Call log registered successfully"
}
```

---

### 4.4 S3 Audio Upload - Step 1: Request Presigned URL
The mobile app calls this endpoint to get a secure direct upload link to S3 (avoids server memory overload).

**Endpoint:** `POST /api/v1/sales/calls/{callId}/recording/presigned-url`  
**Access:** Authenticated Sales Rep  

**Request Body:**
```json
{
  "fileName": "rec_CALL_2026_9812.m4a",
  "mimeType": "audio/mp4",
  "fileSizeBytes": 2457600
}
```

**Response (`200 OK`):**
```json
{
  "recordingId": "7a2d7b18-5555-4ee8-b8d1-8a9097f6f6cf",
  "uploadUrl": "https://company-recordings.s3.ap-south-1.amazonaws.com/recordings/2026/09/rec_CALL_2026_9812.m4a?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "s3ObjectKey": "recordings/2026/09/rec_CALL_2026_9812.m4a",
  "expiresIn": 600
}
```

---

### 4.5 S3 Audio Upload - Step 2: Confirm Upload
Called by mobile app after binary PUT to the S3 Presigned URL completes successfully.

**Endpoint:** `POST /api/v1/sales/calls/{callId}/recording/confirm`  
**Access:** Authenticated Sales Rep  

**Request Body:**
```json
{
  "recordingId": "7a2d7b18-5555-4ee8-b8d1-8a9097f6f6cf",
  "uploadStatus": "UPLOADED"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Recording attached and marked active"
}
```

---

### 4.6 Sync Offline Calls (Batch)
For syncing multiple call logs generated while the sales rep was offline.

**Endpoint:** `POST /api/v1/sales/calls/batch-sync`  
**Access:** Authenticated Sales Rep  

**Request Body:**
```json
{
  "calls": [
    {
      "callCode": "CALL-OFFLINE-01",
      "phoneNumber": "+91 99887 76655",
      "direction": "INCOMING",
      "startTime": "2026-09-03T09:15:00.000Z",
      "endTime": "2026-09-03T09:18:00.000Z",
      "durationSeconds": 180,
      "classification": "BUSINESS",
      "notes": "Introductory call"
    }
  ]
}
```

**Response (`200 OK`):**
```json
{
  "syncedCount": 1,
  "syncedIds": ["5e3f1f94-4444-4ee8-b8d1-8a9097f6f6cf"]
}
```

---

### 4.7 Daily Summary & Calling Stats
**Endpoint:** `GET /api/v1/sales/summary/today`  
**Access:** Authenticated Sales Rep  

**Response (`200 OK`):**
```json
{
  "totalCallsToday": 28,
  "totalDurationSeconds": 4120,
  "businessCalls": 24,
  "personalCalls": 4,
  "recordingsUploaded": 24
}
```

---

## 5. Admin Web Portal APIs (`/api/v1/admin`)

These endpoints power the React Admin Portal (`admin-2`).

### 5.1 Admin / Manager Login
**Endpoint:** `POST /api/v1/admin/auth/login`  
**Access:** Public  

**Request Body:**
```json
{
  "email": "admin@mistavinya.local",
  "password": "AdminPassword@123"
}
```

**Response (`200 OK`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "3f2c1d20-0000-4ee8-b8d1-8a9097f6f6cf",
    "name": "Admin User",
    "email": "admin@mistavinya.local",
    "role": "SUPER_ADMIN"
  }
}
```

---

### 5.2 Get Current Authenticated User
**Endpoint:** `GET /api/v1/admin/auth/me`  
**Access:** `SUPER_ADMIN`, `ADMIN`, `MANAGER`  

**Response (`200 OK`):**
```json
{
  "user": {
    "id": "3f2c1d20-0000-4ee8-b8d1-8a9097f6f6cf",
    "name": "Admin User",
    "email": "admin@mistavinya.local",
    "role": "SUPER_ADMIN"
  }
}
```

---

### 5.3 Logout
**Endpoint:** `POST /api/v1/admin/auth/logout`  
**Response (`204 No Content`)**

---

### 5.4 Dashboard Analytics
**Endpoint:** `GET /api/v1/admin/dashboard`  
**Access:** `SUPER_ADMIN`, `ADMIN`, `MANAGER`  

**Response (`200 OK`):**
```json
{
  "employees": 48,
  "calls": 1240,
  "business": 980,
  "recordings": 820
}
```

---

### 5.5 List & Filter Calls
**Endpoint:** `GET /api/v1/admin/calls`  
**Query Parameters:**
- `employeeId` (UUID) - filter by sales rep
- `companyId` (UUID) - filter by company
- `direction` (`INCOMING` | `OUTGOING` | `MISSED`)
- `classification` (`BUSINESS` | `PERSONAL`)
- `from` (`YYYY-MM-DD`)
- `to` (`YYYY-MM-DD`)
- `page` (default `1`)
- `limit` (default `20`)

**Response (`200 OK`):**
```json
{
  "data": [
    {
      "id": "5e3f1f94-4444-4ee8-b8d1-8a9097f6f6cf",
      "callCode": "CALL-2026-9812",
      "phoneNumber": "+91 98123 45678",
      "direction": "OUTGOING",
      "startTime": "2026-09-03T10:30:00.000Z",
      "endTime": "2026-09-03T10:33:15.000Z",
      "durationSeconds": 195,
      "classification": "BUSINESS",
      "status": "COMPLETED",
      "employee": {
        "id": "b7e19e2b-1111-4ee8-b8d1-8a9097f6f6cf",
        "name": "Asha Verma"
      },
      "company": {
        "id": "f3d8df52-3333-4ee8-b8d1-8a9097f6f6cf",
        "name": "Nexa Systems"
      },
      "contact": {
        "id": "9f8f4c3d-2222-4ee8-b8d1-8a9097f6f6cf",
        "name": "Rohit Sharma"
      },
      "recording": {
        "id": "7a2d7b18-5555-4ee8-b8d1-8a9097f6f6cf",
        "uploadStatus": "UPLOADED"
      }
    }
  ],
  "total": 1240,
  "page": 1,
  "pages": 62
}
```

---

### 5.6 Get Call Details
**Endpoint:** `GET /api/v1/admin/calls/{id}`  

**Response (`200 OK`):**
```json
{
  "id": "5e3f1f94-4444-4ee8-b8d1-8a9097f6f6cf",
  "callCode": "CALL-2026-9812",
  "phoneNumber": "+91 98123 45678",
  "direction": "OUTGOING",
  "startTime": "2026-09-03T10:30:00.000Z",
  "endTime": "2026-09-03T10:33:15.000Z",
  "durationSeconds": 195,
  "classification": "BUSINESS",
  "notes": "Discussed quotation and demo date.",
  "status": "COMPLETED",
  "employee": {
    "id": "b7e19e2b-1111-4ee8-b8d1-8a9097f6f6cf",
    "name": "Asha Verma",
    "email": "asha@example.com"
  },
  "company": {
    "id": "f3d8df52-3333-4ee8-b8d1-8a9097f6f6cf",
    "name": "Nexa Systems"
  },
  "recording": {
    "id": "7a2d7b18-5555-4ee8-b8d1-8a9097f6f6cf",
    "uploadStatus": "UPLOADED",
    "fileName": "rec_CALL_2026_9812.m4a",
    "fileSize": 2457600
  }
}
```

---

### 5.7 Get Recording Playback URL
Generates a short-lived (5 min) secure playback URL for the Admin browser audio player.

**Endpoint:** `GET /api/v1/admin/recordings/{recordingId}/play`  
**Access:** `SUPER_ADMIN`, `ADMIN`, `MANAGER`  

**Response (`200 OK`):**
```json
{
  "url": "https://company-recordings.s3.ap-south-1.amazonaws.com/recordings/2026/09/rec_CALL_2026_9812.m4a?X-Amz-Signature=...",
  "expiresIn": 300
}
```

---

### 5.8 List Employees
**Endpoint:** `GET /api/v1/admin/employees?page=1&limit=20&q=asha`  

**Response (`200 OK`):**
```json
{
  "data": [
    {
      "id": "b7e19e2b-1111-4ee8-b8d1-8a9097f6f6cf",
      "employeeCode": "EMP-001",
      "name": "Asha Verma",
      "department": "Sales",
      "status": "ACTIVE",
      "phone": "+91 98765 43210",
      "email": "asha@example.com",
      "createdAt": "2026-09-01T10:00:00.000Z"
    }
  ],
  "total": 48,
  "page": 1,
  "pages": 3
}
```

---

### 5.9 List Companies & Contacts
**Endpoint:** `GET /api/v1/admin/companies?page=1&limit=20`  

**Response (`200 OK`):**
```json
{
  "data": [
    {
      "id": "f3d8df52-3333-4ee8-b8d1-8a9097f6f6cf",
      "name": "Nexa Systems",
      "contactPerson": "Rohit Sharma",
      "phone": "+91 98123 45678",
      "email": "contact@nexasystems.com",
      "industry": "IT",
      "location": "Bengaluru",
      "assignedSalesperson": {
        "id": "b7e19e2b-1111-4ee8-b8d1-8a9097f6f6cf",
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

### 5.10 List Registered Devices
**Endpoint:** `GET /api/v1/admin/devices?page=1&limit=20`  
**Access:** `SUPER_ADMIN`, `ADMIN`  

**Response (`200 OK`):**
```json
{
  "data": [
    {
      "id": "d1a2b3c4-1111-4ee8-b8d1-8a9097f6f6cf",
      "deviceId": "DEV-AND-9912",
      "imei": "864209040123456",
      "phoneNumber": "+91 98765 43210",
      "model": "Samsung Galaxy A54",
      "status": "ACTIVE",
      "appVersion": "1.4.0",
      "employee": {
        "id": "b7e19e2b-1111-4ee8-b8d1-8a9097f6f6cf",
        "name": "Asha Verma"
      },
      "lastSyncedAt": "2026-09-03T10:33:20.000Z"
    }
  ],
  "total": 48,
  "page": 1,
  "pages": 3
}
```

---

### 5.11 Audit Logs
**Endpoint:** `GET /api/v1/admin/audit-logs?page=1&limit=20`  
**Access:** `SUPER_ADMIN`, `ADMIN`  

**Response (`200 OK`):**
```json
{
  "data": [
    {
      "id": "a9b8c7d6-0000-4ee8-b8d1-8a9097f6f6cf",
      "user": {
        "id": "3f2c1d20-0000-4ee8-b8d1-8a9097f6f6cf",
        "name": "Admin User"
      },
      "action": "PLAY_RECORDING",
      "resourceType": "RECORDING",
      "resourceId": "7a2d7b18-5555-4ee8-b8d1-8a9097f6f6cf",
      "success": true,
      "ipAddress": "192.168.1.45",
      "createdAt": "2026-09-03T11:00:00.000Z"
    }
  ],
  "total": 312,
  "page": 1,
  "pages": 16
}
```

---

## 6. Standard Response & Error Formats

### 6.1 Standard Paginated List
```json
{
  "data": [ ... ],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

### 6.2 Standard Error Response
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid credentials or expired token",
  "timestamp": "2026-09-03T12:00:00.000Z",
  "status": 401
}
```

### 6.3 HTTP Status Codes
| Code | Meaning | Usage |
| :--- | :--- | :--- |
| `200 OK` | Success | Standard successful GET or PUT |
| `201 Created` | Resource Created | Successful POST (call log, upload request) |
| `204 No Content` | Success (No Body) | Successful Logout or Delete |
| `400 Bad Request` | Validation Error | Missing fields, bad formatting |
| `401 Unauthorized` | Auth Required | Missing or expired JWT token |
| `403 Forbidden` | Permission Denied | Manager trying to access unauthorized data |
| `404 Not Found` | Resource Missing | Call ID or Recording ID not found |
| `500 Server Error` | Backend Failure | Uncaught exception / DB failure |

---

## 7. Java Spring Boot Starter & Architecture Guide

### 7.1 Recommended Maven / Gradle Dependencies (`pom.xml`)
```xml
<dependencies>
    <!-- Spring Boot Starter Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring Boot Security + JWT -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>

    <!-- Spring Data JPA & PostgreSQL Driver -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- AWS SDK v2 for S3 Presigned URLs -->
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>s3</artifactId>
        <version>2.25.10</version>
    </dependency>

    <!-- Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

### 7.2 S3 Presigned URL Java Service Snippet
```java
package com.mistavinya.api.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;

@Service
public class S3StorageService {

    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public S3StorageService(S3Presigner s3Presigner) {
        this.s3Presigner = s3Presigner;
    }

    // Generate Presigned Upload URL for Mobile App
    public String generateUploadPresignedUrl(String objectKey, String contentType, Duration duration) {
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(duration)
                .putObjectRequest(objectRequest)
                .build();

        return s3Presigner.presignPutObject(presignRequest).url().toString();
    }

    // Generate Presigned Playback URL for Admin Dashboard
    public String generatePlaybackPresignedUrl(String objectKey, Duration duration) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(duration)
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }
}
```

### 7.3 Suggested Package Structure
```text
src/main/java/com/mistavinya/api/
├── config/
│   ├── SecurityConfig.java
│   └── S3Config.java
├── controllers/
│   ├── sales/
│   │   ├── SalesAuthController.java
│   │   ├── SalesCallController.java
│   │   └── SalesContactController.java
│   └── admin/
│       ├── AdminAuthController.java
│       ├── AdminDashboardController.java
│       ├── AdminCallController.java
│       ├── AdminEmployeeController.java
│       └── AdminDeviceController.java
├── dto/
│   ├── request/
│   │   ├── CallLogRequest.java
│   │   └── LoginRequest.java
│   └── response/
│       ├── PaginatedResponse.java
│       └── CallDetailsResponse.java
├── entities/
│   ├── User.java
│   ├── Employee.java
│   ├── Device.java
│   ├── Company.java
│   ├── Contact.java
│   ├── Call.java
│   ├── Recording.java
│   └── AuditLog.java
├── repositories/
│   ├── CallRepository.java
│   ├── RecordingRepository.java
│   └── EmployeeRepository.java
└── services/
    ├── S3StorageService.java
    ├── CallService.java
    └── AuthService.java
```
