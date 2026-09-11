# PostgreSQL Complete Setup & Connection Guide

## Quick Start (5 Minutes)

### 1. Create `.env` file in server folder

```env
# PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mist_avinya_db
DB_USER=postgres
DB_PASSWORD=postgres_password_123
DB_DIALECT=postgres

# Server
PORT=5000
NODE_ENV=development

# JWT Secrets
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
```

### 2. Install PostgreSQL

**Windows:**
```bash
# Download from: https://www.postgresql.org/download/windows/
# Run installer and note the password you set for 'postgres' user
```

**Mac (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Docker (Recommended):**
```bash
docker-compose up -d  # See docker-compose.yml below
```

### 3. Create Database and User

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql terminal:
CREATE DATABASE mist_avinya_db;
CREATE USER mist_admin WITH PASSWORD 'secure_password_123';
ALTER ROLE mist_admin WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE mist_avinya_db TO mist_admin;
ALTER DATABASE mist_avinya_db OWNER TO mist_admin;
\c mist_avinya_db
\q
```

### 4. Install Dependencies

```bash
cd server
npm install
```

### 5. Sync Database Schema

```bash
npm run db:sync
```

### 6. Seed Sample Data

```bash
npm run seed
```

### 7. Start Server

```bash
npm run dev
```

Expected output:
```
╔════════════════════════════════════════╗
║   🚀 MIST Avinya API Server Started   ║
║   📍 Port: 5000                        ║
║   🌍 URL: http://localhost:5000        ║
║   📊 Environment: development          ║
╚════════════════════════════════════════╝
```

---

## Database Setup Methods

### Method 1: PostgreSQL Installed Locally

**Windows CMD:**
```cmd
# Start PostgreSQL service
net start PostgreSQL-x64-16

# Connect
psql -U postgres -h localhost
```

**Windows PowerShell:**
```powershell
# Start service
Start-Service postgresql-x64-16

# Connect
psql -U postgres -h localhost
```

**Linux/Mac:**
```bash
# Start service
sudo systemctl start postgresql

# Connect
psql -U postgres
```

**SQL Commands:**
```sql
-- Create database
CREATE DATABASE mist_avinya_db;

-- Create user with password
CREATE USER mist_admin WITH ENCRYPTED PASSWORD 'secure_password_123';

-- Grant create database privilege
ALTER ROLE mist_admin WITH CREATEDB;

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE mist_avinya_db TO mist_admin;

-- Set owner
ALTER DATABASE mist_avinya_db OWNER TO mist_admin;

-- Connect to database
\c mist_avinya_db

-- Verify tables (after sync)
\dt

-- Exit
\q
```

### Method 2: Docker (Recommended for Development)

**Create `docker-compose.yml` in project root:**

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    container_name: mist_avinya_postgres
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
    networks:
      - mist_network

  adminer:  # Optional: Web UI for database management
    image: adminer
    container_name: mist_avinya_adminer
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    networks:
      - mist_network

volumes:
  postgres_data:

networks:
  mist_network:
```

**Commands:**
```bash
# Start containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres

# Stop containers
docker-compose down

# Connect to database
docker exec -it mist_avinya_postgres psql -U postgres -d mist_avinya_db
```

**Access Web UI:**
- Adminer: http://localhost:8080
- Server: postgres
- Username: postgres
- Password: postgres_password_123

### Method 3: Cloud PostgreSQL (AWS RDS)

**Create RDS Instance:**
1. Go to AWS Console → RDS → Create Database
2. Select PostgreSQL engine
3. Configure:
   - DB instance identifier: `mist-avinya-db`
   - Master username: `mist_admin`
   - Password: (generate secure password)
   - Instance class: `db.t3.micro` (free tier)
   - Storage: `20 GB`
   - Public accessibility: `Yes` (for development)
4. Create database

**Update `.env`:**
```env
DB_HOST=mist-avinya-db.xxxxx.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=mist_avinya_db
DB_USER=mist_admin
DB_PASSWORD=your_secure_password
DB_DIALECT=postgres
NODE_ENV=production
```

**Connect:**
```bash
psql -h mist-avinya-db.xxxxx.ap-south-1.rds.amazonaws.com -U mist_admin -d mist_avinya_db
```

---

## Sample Connection Details

### Local Development
```
Host:     localhost
Port:     5432
Database: mist_avinya_db
User:     postgres (or mist_admin)
Password: postgres_password_123
URL:      postgresql://postgres:postgres_password_123@localhost:5432/mist_avinya_db
```

### Docker
```
Host:     postgres (use container name)
Port:     5432
Database: mist_avinya_db
User:     postgres
Password: postgres_password_123
URL:      postgresql://postgres:postgres_password_123@postgres:5432/mist_avinya_db
```

### AWS RDS (Example)
```
Host:     mist-avinya-db.xxxxx.ap-south-1.rds.amazonaws.com
Port:     5432
Database: mist_avinya_db
User:     mist_admin
Password: (from Secrets Manager)
URL:      postgresql://mist_admin:password@mist-avinya-db.xxxxx.ap-south-1.rds.amazonaws.com:5432/mist_avinya_db
```

---

## Database Schema Verification

### Check Connection
```bash
# Test connection
npm run db:sync

# You should see:
# ✅ PostgreSQL connected successfully
# 📋 Database synchronized
```

### Verify Tables
```bash
# Connect to database
psql -U postgres -d mist_avinya_db

# List all tables
\dt

# Expected output:
# Schema |       Name        | Type  | Owner
# --------|-------------------|-------|--------
#  public | AuditLogs         | table | postgres
#  public | CallFormDatas     | table | postgres
#  public | CallLogs          | table | postgres
#  public | CallRecordings    | table | postgres
#  public | Devices           | table | postgres
#  public | Employees         | table | postgres
# (6 rows)

# Describe a table
\d employees

# Exit
\q
```

### Verify with Python
```python
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    database="mist_avinya_db",
    user="postgres",
    password="postgres_password_123",
    port="5432"
)

cursor = conn.cursor()
cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
tables = cursor.fetchall()
print("Tables:", [t[0] for t in tables])
cursor.close()
conn.close()
```

---

## Backup & Restore

### Backup Database
```bash
# Backup to SQL file
pg_dump -U postgres -d mist_avinya_db > backup.sql

# Backup to custom format (compressed)
pg_dump -U postgres -d mist_avinya_db -F c -f backup.dump
```

### Restore Database
```bash
# From SQL file
psql -U postgres -d mist_avinya_db < backup.sql

# From custom format
pg_restore -U postgres -d mist_avinya_db backup.dump
```

### Docker Backup/Restore
```bash
# Backup from container
docker exec mist_avinya_postgres pg_dump -U postgres mist_avinya_db > backup.sql

# Restore to container
docker exec -i mist_avinya_postgres psql -U postgres mist_avinya_db < backup.sql
```

---

## Troubleshooting

### Error: "connect ECONNREFUSED 127.0.0.1:5432"
**Solution:** PostgreSQL service is not running
```bash
# Start service
sudo systemctl start postgresql  # Linux
net start PostgreSQL-x64-16      # Windows
brew services start postgresql   # Mac
docker-compose up -d            # Docker
```

### Error: "FATAL: role 'postgres' does not exist"
**Solution:** Use correct credentials or create the role
```sql
CREATE ROLE postgres WITH LOGIN PASSWORD 'postgres_password_123';
ALTER ROLE postgres WITH CREATEDB;
```

### Error: "database 'mist_avinya_db' does not exist"
**Solution:** Create the database
```sql
CREATE DATABASE mist_avinya_db;
GRANT ALL PRIVILEGES ON DATABASE mist_avinya_db TO mist_admin;
```

### Error: "permission denied for schema public"
**Solution:** Grant schema privileges
```sql
GRANT USAGE ON SCHEMA public TO mist_admin;
GRANT CREATE ON SCHEMA public TO mist_admin;
```

### Slow Queries
**Solution:** Add indexes (already in schema) and check:
```bash
# Check active connections
psql -U postgres -d mist_avinya_db -c "SELECT * FROM pg_stat_activity;"

# Kill long-running query
psql -U postgres -d mist_avinya_db -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '10 minutes';"
```

---

## Environment Variables

### Required
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mist_avinya_db
DB_USER=postgres
DB_PASSWORD=postgres_password_123
```

### Optional
```env
# Use connection string instead
DATABASE_URL=postgresql://postgres:postgres_password_123@localhost:5432/mist_avinya_db

# Logging
DB_LOGGING=true
LOG_LEVEL=debug

# Connection pooling
DB_POOL_MIN=2
DB_POOL_MAX=10
```

---

## Files Updated

✅ `server/config/db.js` — PostgreSQL connection with Sequelize
✅ `server/models/index.js` — All 7 table schemas
✅ `server/src.js` — Updated to use PostgreSQL
✅ `server/package.json` — Replaced MongoDB with PostgreSQL dependencies
✅ `server/.env.example` — Environment configuration template
✅ `server/scripts/sync-db.js` — Database schema sync script
✅ `server/scripts/seed.js` — Sample data seeding script

---

## Next Steps

1. ✅ Copy `.env.example` to `.env` and update values
2. ✅ Start PostgreSQL service
3. ✅ Run `npm install`
4. ✅ Run `npm run db:sync` to create tables
5. ✅ Run `npm run seed` to populate sample data
6. ✅ Run `npm run dev` to start server
7. ✅ Test with client at `http://localhost:5173`

---

## Support

For issues or questions:
- Check PostgreSQL logs: `/var/log/postgresql/` (Linux)
- Use Adminer web UI: http://localhost:8080 (Docker)
- Check server logs: `npm run dev` output
- Verify connection: `psql -U postgres -h localhost`
