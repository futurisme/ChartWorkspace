# ▶️ START HERE - ChartMaker Setup 

**Durasi: ~15 menit untuk setup lokal**

---

## 📖 Dokumentasi Ada Dimana?

| Durasi | File | Isi |
|--------|------|------|
| 5 min | **QUICK_START.md** | ⚡ Super cepat (buat dulu) |
| 15 min | **SETUP_MANUAL.md** | 📋 Panduan lengkap detail |
| 20 min | **DATABASE_SETUP.md** | 🗄️ PostgreSQL setup guide |
| 5 min | **PROJECT_STRUCTURE.md** | 📂 File & folder explanation |
| Ref | **README.md** | 📚 Dokumentasi + deployment |

---

## 🚀 FASTEST WAY TO START (15 menit)

### 1️⃣ Install Dependencies (2 menit)
```bash
cd c:\Users\fadhi\ChartMaker
npm install
```

### 2️⃣ Create `.env.local` (1 menit)

**Buat file baru di folder root bernama `.env.local`**

Copy paste ini:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/chartmaker"
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_WEBRTC_URL="wss://signaling.yjs.dev"
```

### 3️⃣ Setup Database (8 menit)

#### **Option A: PostgreSQL Local** (Recommended untuk development)

**Windows - Install PostgreSQL:**
1. Download: https://www.postgresql.org/download/windows/
2. Install dengan password (ingat password!)
3. Port default: 5432

**Create Database:**
```bash
# Open PowerShell, type:
psql -U postgres

# Dalam prompt, type:
CREATE DATABASE chartmaker;
\q
```

**Update `.env.local`:**
```env
DATABASE_URL="postgresql://postgres:PASSWORD_ANDA@localhost:5432/chartmaker"
```

#### **Option B: Railway Cloud** (Recommended untuk production)
1. https://railway.app → Sign up
2. Create Project → PostgreSQL
3. Copy connection string ke `.env.local`

### 4️⃣ Setup Prisma (2 menit)
```bash
npx prisma generate
npx prisma db push
```

### 5️⃣ Run Development Server (2 menit)
```bash
npm run dev
```

**Open:** http://localhost:3000

**Create a map** dan test!

---

## ✅ Verification

```bash
# Test 1: Can connect?
npm run dev
# Expected: ✓ Ready in X.Xs

# Test 2: Page loads?
# Open http://localhost:3000
# Click "Create New Map"

# Test 3: Real-time works?
# Open URL in 2 different browsers
# Edit in one, see changes in other
```

---

## 🆘 Troubleshooting Quick Fixes

| Error | Quick Fix |
|-------|-----------|
| `Cannot find module 'next'` | `npm install` |
| `DATABASE_URL not set` | Create `.env.local` dengan DATABASE_URL |
| `psql command not found` | Install PostgreSQL dari postgresql.org |
| `Port 3000 in use` | `npx kill-port 3000` atau gunakan port lain |
| `Can't connect to database` | Check password di `.env.local` |

---

## 📚 Read Next

1. **QUICK_START.md** - Command cheat sheet
2. **SETUP_MANUAL.md** - Full setup guide dengan detail
3. **PROJECT_STRUCTURE.md** - Mengerti file structure
4. **DATABASE_SETUP.md** - Deep dive PostgreSQL

---

## 🎯 Common Tasks

### Create a new map
```
1. npm run dev
2. http://localhost:3000
3. Enter map title → Click "Create New Map"
4. Try adding nodes, connecting edges
```

### Test real-time collaboration
```
1. Browser 1: Create map
2. Browser 2: Open same URL in incognito
3. Edit in Browser 1 → See changes instantly in Browser 2
```

### Deploy to production
```
1. Database: Railway (postgresql)
2. Frontend: Vercel (Next.js)
3. Follow: README.md "Deployment" section
```

### Make code changes
```
1. Edit file (src/components/*.tsx)
2. Save → Auto hot-reload
3. No need to restart server
```

---

## 🔑 Key Files Overview

```
src/app/
├── page.tsx ..................... Landing page
├── editor/[mapId]/page.tsx ..... Editor (MAIN PAGE)
└── view/[mapId]/page.tsx ....... Viewer (read-only)

src/components/
├── RealtimeProvider.tsx ........ Yjs + WebRTC (CORE)
├── ConceptFlow.tsx ............. React Flow editor
└── PresenceBar.tsx ............ Live users

src/lib/
├── prisma.ts ................... Database client
├── yjs.ts ..................... Yjs operations
├── snapshot.ts ................ Encode/decode
└── presence.ts ................ User presence

prisma/
└── schema.prisma ............... Database definition

Configuration:
├── .env.local .................. Credentials (CREATE THIS!)
├── next.config.js .............. Next.js config
├── tailwind.config.ts .......... CSS config
└── tsconfig.json ............... TypeScript config
```

---

## 💡 Pro Tips

✅ **DO:**
- Keep `.env.local` private (don't share)
- Use Railway/Supabase for production database
- Test with 2+ browsers before deploying
- Read error messages carefully (very helpful)
- Check browser Console for errors (F12)

❌ **DON'T:**
- Commit `.env.local` to Git (it's in .gitignore)
- Use local PostgreSQL for production
- Edit database directly (use Prisma)
- Ignore TypeScript errors
- Deploy without testing first

---

## 📞 Need Help?

1. **Read SETUP_MANUAL.md** first
2. Check error message carefully
3. Google error message
4. Check GitHub issues
5. Ask in Discord/communities

---

## 🎉 You're Ready!

Next step: **`npm run dev`** 

Kemudian: **http://localhost:3000**

Selamat! 🚀
