# ChartMaker - Quick Setup (Langkah Cepat)

## ⚡ Untuk Memulai Cepat (5 menit)

### 1. Install Dependencies
```bash
cd c:\Users\fadhi\ChartMaker
npm install
```

### 2. Setup Database

**Pilih salah satu:**

**Option A: PostgreSQL Local**
```bash
# 1. Download & install: https://www.postgresql.org/download/windows/
# 2. Buat database bernama 'chartmaker'
# 3. Update .env.local:
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/chartmaker"
```

**Option B: Railway (Recommended)**
```bash
# 1. Buka https://railway.app
# 2. Sign up & create PostgreSQL
# 3. Copy connection string ke .env.local
DATABASE_URL="postgresql://user:password@rail.proxy.rlwy.net:PORT/railway"
```

### 3. Setup Prisma
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Locally
```bash
npm run dev
```
**Buka: http://localhost:3000**

---

## 🚀 Deploy (Production)

### Database: Railway
1. https://railway.app → Create Project → PostgreSQL
2. Copy DATABASE_URL

### Frontend: Vercel
1. https://vercel.com → Import GitHub repo
2. Add environment variables (DATABASE_URL, dll)
3. Deploy

---

## 📝 File Config Penting

### `.env.local` (CREATE THIS FILE)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/chartmaker"
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_WEBRTC_URL="wss://signaling.yjs.dev"
```

### `prisma/schema.prisma` ✅ (SUDAH ADA)
Defines Map table dengan snapshot, version untuk auto-save

### `src/components/RealtimeProvider.tsx` ✅ (SUDAH ADA)
Yjs + WebRTC setup untuk real-time sync

### `src/app/api/maps/route.ts` ✅ (SUDAH ADA)
POST /api/maps → create map
GET /api/maps/[id] → fetch snapshot
POST /api/maps/save → save snapshot

---

## ⚠️ Common Issues

| Error | Solusi |
|-------|--------|
| `DATABASE_URL not set` | Buat `.env.local` dengan DATABASE_URL |
| `Can't connect to PostgreSQL` | Pastikan PostgreSQL running, password benar |
| `Port 3000 already in use` | `npx kill-port 3000` atau gunakan port lain |
| `WebRTC not connecting` | Check `.env` NEXT_PUBLIC_WEBRTC_URL accessible |
| `Prisma migration failed` | `npx prisma db push --skip-generate` |

---

## 📚 Full Guide

Lihat file: **`SETUP_MANUAL.md`** untuk panduan lengkap dengan screenshots dan penjelasan detail.

---

## ✅ Verifikasi Instalasi

```bash
# Test 1: Node.js
node --version
# Expected: v18+

# Test 2: npm
npm --version
# Expected: v8+

# Test 3: Build
npm run build
# Expected: ✓ Compiled successfully

# Test 4: Dev Server
npm run dev
# Expected: ✓ Ready in X.Xs
```

---

**Start building! 🎉**
