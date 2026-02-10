# PostgreSQL Setup - Panduan Lengkap

## 🎯 Tujuan

Database PostgreSQL menyimpan semua concept map, snapshots, dan versions untuk persistent storage.

---

## Option 1: PostgreSQL Local (Windows)

### Step 1.1: Download PostgreSQL

1. Buka https://www.postgresql.org/download/windows/
2. Klik **"Download the installer"** → ambil versi terbaru (15 atau 16)
3. Save file installer

### Step 1.2: Install PostgreSQL

1. Double-click installer
2. **Setup Wizard akan muncul**

**Pilihan penting:**

| Screen | Value |
|--------|-------|
| Installation Directory | Default `C:\Program Files\PostgreSQL\16` |
| Components | ✅ PostgreSQL Server ✅ pgAdmin 4 |
| Data Directory | Default |
| Port | **5432** (standard) |
| Superuser Password | **SET A STRONG PASSWORD!** (ingat password ini!) |
| Service Name | postgres |
| Start Service | ✅ Yes |

3. Click "Next" → "Install" → Tunggu selesai
4. Uncheck "Stack Builder" → "Finish"

### Step 1.3: Verify PostgreSQL Running

**PowerShell:**
```bash
psql --version
```

Expected output:
```
psql (PostgreSQL) 16.1
```

---

### Step 1.4: Create Database

**Open PostgreSQL Command Line:**

**Option A: Dari Windows Search**
1. Tekan `Win + S`
2. Type: `SQL Shell (psql)`
3. Press Enter

**Option B: Dari PowerShell**
```bash
psql -U postgres
```

**Di dalam psql prompt, input:**
```sql
CREATE DATABASE chartmaker;
```

Expected output:
```
CREATE DATABASE
```

**Verify:**
```sql
\l
```

Akan melihat list database termasuk "chartmaker"

**Exit:**
```sql
\q
```

### Step 1.5: Update `.env.local`

**Buka file:** `c:\Users\fadhi\ChartMaker\.env.local`

**Update baris DATABASE_URL:**
```env
DATABASE_URL="postgresql://postgres:PASSWORD_ANDA@localhost:5432/chartmaker"
```

**Contoh:**
```env
DATABASE_URL="postgresql://postgres:MySecurePass123@localhost:5432/chartmaker"
```

### Step 1.6: Test Connection

**PowerShell:**
```bash
psql -U postgres -h localhost -d chartmaker
```

Jika connect berhasil, akan masuk ke prompt `chartmaker=#`

**Exit:**
```sql
\q
```

---

### Step 1.7: Setup Prisma

```bash
cd c:\Users\fadhi\ChartMaker

# Generate Prisma Client
npx prisma generate

# Push schema ke database
npx prisma db push
```

Expected output:
```
✔ Your database is now in sync with your Prisma schema. Rewound 1 migration, 
applied 1 migration.

✔ Generated Prisma Client (v5.x.0) in XXms
```

### Step 1.8: Verify Database Tables

```bash
# Open Prisma Studio (GUI)
npx prisma studio
```

Browser akan buka pada `http://localhost:5555`

Di sini Anda bisa:
- Lihat table `Map`
- Create/read/update/delete records
- View schema

---

## Option 2: Railway Cloud Database (Recommended)

### Step 2.1: Create Railway Account

1. Buka https://railway.app
2. Click "Start Building for Free"
3. Sign up dengan GitHub / Google

### Step 2.2: Create PostgreSQL

1. Click "Create New Project"
2. Click "Provision PostgreSQL"
3. Wait ~1-2 menit untuk deployed

### Step 2.3: Get Connection String

1. Click pada PostgreSQL plugin
2. Tab "Connect"
3. Lihat **connection string** dengan format:
   ```
   postgresql://postgres:PASSWORD@host:PORT/railway
   ```

4. **Copy full URL**

### Step 2.4: Update `.env.local`

**Buka:** `c:\Users\fadhi\ChartMaker\.env.local`

**Paste DATABASE_URL:**
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@rail.proxy.rlwy.net:5432/railway"
```

### Step 2.5: Setup Prisma

```bash
npx prisma generate
npx prisma db push
```

### Step 2.6: Verify in Railway Dashboard

1. Back to Railway dashboard
2. Click PostgreSQL
3. Tab "Data"
4. Lihat table "Map" sudah ter-create

---

## Option 3: Supabase (Alternative Cloud Database)

### Step 3.1: Create Supabase Account

1. Buka https://supabase.com
2. Click "Start Your Project"
3. Sign up dengan GitHub

### Step 3.2: Create Project

1. Click "New Project"
2. Set project name: `chartmaker`
3. Region: closest to you
4. Set password
5. Click "Create new project"

### Step 3.3: Get Connection String

1. Tab "Database" (left sidebar)
2. Click "Connection pooling"
3. Copy "Connection string" (Prisma format)

### Step 3.4: Update `.env.local`

```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.supabase.co:5432/postgres?schema=public"
```

### Step 3.5: Setup Prisma

```bash
npx prisma generate
npx prisma db push
```

---

## 🔍 Troubleshooting

### Error: "could not connect to server"

**Cause:** PostgreSQL service not running

**Solution:**
```bash
# Windows Task Manager
# 1. Press Ctrl + Shift + Esc
# 2. Tab "Services"
# 3. Find "postgresql-x64-XX"
# 4. Right-click → "Start"
```

Or:

```bash
# PowerShell (as Administrator)
net start postgresql-x64-16
```

### Error: "password authentication failed"

**Cause:** Password wrong

**Solution:**
```bash
# Reset password (PostgreSQL local)
psql -U postgres

# Di dalam psql:
ALTER USER postgres WITH PASSWORD 'new_password';

# Update .env.local dengan password baru
```

### Error: "database does not exist"

**Cause:** Database belum di-create

**Solution:**
```bash
psql -U postgres

# Create database
CREATE DATABASE chartmaker;

\q
```

### Error: "role postgres does not exist"

**Cause:** PostgreSQL installation issue

**Solution:**
- Reinstall PostgreSQL
- Atau gunakan Railway/Supabase (cloud database)

---

## 📊 Database Management Tools

### 1. pgAdmin (GUI - Local Database)

Automatically installed dengan PostgreSQL:

1. Search: "pgAdmin 4"
2. Open browser akan auto-open
3. Login dengan PostgreSQL password
4. Expand tree → Databases → chartmaker
5. Bisa create/edit/delete tables dan data

### 2. Prisma Studio (GUI - Any Database)

```bash
npx prisma studio
```

Browser buka `http://localhost:5555`

Benefits:
- View all tables
- Create/edit/delete records
- Easy to use
- Works dengan any database

### 3. psql (CLI)

```bash
# Connect
psql -U postgres -d chartmaker

# View tables
\dt

# View schema
\d "Map"

# SQL query
SELECT * FROM "Map";

# Exit
\q
```

---

## 🔐 Security Best Practices

### 1. Strong Password
```
✅ Good:  MySecurePass2024#$
❌ Bad:   password123
```

### 2. Environment Variables
- ✅ Store DATABASE_URL di .env.local
- ❌ DON'T commit .env.local ke Git
- ✅ Already in .gitignore

### 3. Production Database
- ✅ Use Railway / Supabase / AWS RDS
- ❌ DON'T use local development database
- ✅ Enable automated backups

### 4. Connection Limits
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// For serverless functions, use connection pooling:
// Add ?schema=public to DATABASE_URL
```

---

## 📈 Monitoring & Maintenance

### Check Database Size

```bash
# psql
psql -U postgres -d chartmaker -c "SELECT pg_size_pretty(pg_database_size('chartmaker'));"
```

### Backup Database (Local)

```bash
# PowerShell
pg_dump -U postgres chartmaker > backup_chartmaker.sql
```

### Restore Database

```bash
psql -U postgres chartmaker < backup_chartmaker.sql
```

### Monitor Connections

```bash
# psql
SELECT * FROM pg_stat_activity;
```

---

## ✅ Verification Checklist

- [ ] PostgreSQL installed dan running
- [ ] Database "chartmaker" created
- [ ] Connection string correct di `.env.local`
- [ ] `npm run dev` starts successfully
- [ ] Can access http://localhost:3000
- [ ] Can create new map
- [ ] Can view maps in database

---

## 🎓 Database Schema

```sql
CREATE TABLE "Map" (
  id        TEXT PRIMARY KEY DEFAULT uuid(),
  title     TEXT NOT NULL,
  snapshot  JSONB NOT NULL,  -- base64 encoded Yjs update
  version   INTEGER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_map_updated ON "Map"(updatedAt);
```

**Penjelasan:**
- `id` - Unique identifier untuk setiap map
- `title` - Nama concept map
- `snapshot` - Yjs document state (encoded as base64)
- `version` - counter untuk optimistic locking (conflict prevention)
- `createdAt` - Timestamp creation
- `updatedAt` - Timestamp last modified

---

**Database Setup Complete! ✅**

Sekarang lanjut ke: `npm run dev` untuk mulai development!
