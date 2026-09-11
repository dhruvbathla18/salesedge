# PostgreSQL Setup Guide

## Installation & Configuration

### 1. Install PostgreSQL Dependencies

Add to your `server/package.json`:

```bash
npm install pg sequelize dotenv bcryptjs jsonwebtoken cors helmet express-rate-limit morgan
```

Or run:

```bash
npm install pg sequelize
```

**What these packages do:**
- **pg** - PostgreSQL client for Node.js
- **sequelize** - ORM for PostgreSQL (handles schema, queries, migrations)

### 2. Environment Variables

Create `.env` file in your server root:

```env
# PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mist_avinya_db
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_DIALECT=postgres

# Optional: Use connection string instead
DATABASE_URL=postgresql://postgres:your_secure_password@localhost:5432/mist_avinya_db

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AWS S3 (for recordings)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=mist-avinya-recordings

# Client
CLIENT_URL=http://localhost:5173
```

### 3. Database Setup (Local PostgreSQL)

**On Windows (PostgreSQL installer):**
```bash
# Start PostgreSQL service
net start PostgreSQL-x64-16

# Connect to PostgreSQL
psql -U postgres
```

**In PostgreSQL terminal:**
```sql
-- Create database
CREATE DATABASE mist_avinya_db;

-- Create user (if not existing)
CREATE USER mist_admin WITH PASSWORD 'secure_password_123';

-- Grant privileges
ALTER ROLE mist_admin WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE mist_avinya_db TO mist_admin;
ALTER DATABASE mist_avinya_db OWNER TO mist_admin;

-- Connect to database
\c mist_avinya_db

-- Verify connection
\dt
```

**Using Docker (Recommended for development):**
```bash
# docker-compose.yml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_password_123
      POSTGRES_DB: mist_avinya_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Start with: `docker-compose up -d`

### 4. Sample Connection Details

**Local Development:**
```
Host: localhost
Port: 5432
Database: mist_avinya_db
Username: postgres  (or mist_admin)
Password: postgres_password_123
```

**Production (AWS RDS example):**
```
Host: mist-avinya-db.abc123.ap-south-1.rds.amazonaws.com
Port: 5432
Database: mist_avinya_db
Username: mist_admin
Password: (from AWS Secrets Manager)
SSL: true
```

---

## Files to Create/Update

1. ✅ `server/config/db.js` - PostgreSQL connection
2. ✅ `server/models/index.js` - Sequelize models for all 7 tables
3. ✅ `server/.env.example` - Environment template
4. ✅ `server/.env` - Actual environment (git-ignored)

See next files for implementation.
