# ✅ ChartMaker Setup Checklist

## 📋 Pre-Setup Requirements

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Internet connection stable
- [ ] PostgreSQL OR Railway account ready

---

## 🚀 Phase 1: Installation (10 menit)

### Step 1.1: Navigate to Project
```bash
cd c:\Users\fadhi\ChartMaker
```
- [ ] Command executed successfully
- [ ] Current directory is correct

### Step 1.2: Install NPM Dependencies
```bash
npm install
```
- [ ] No errors (warnings okay)
- [ ] node_modules folder created
- [ ] package-lock.json updated
- [ ] Output shows "added XXX packages"

---

## 🔧 Phase 2: Environment Setup (5 menit)

### Step 2.1: Create `.env.local` File

**Create file:** `c:\Users\fadhi\ChartMaker\.env.local`

#### Option A: If using PostgreSQL Local
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/chartmaker"
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_WEBRTC_URL="wss://signaling.yjs.dev"
```
- [ ] File created
- [ ] DATABASE_URL filled with correct password
- [ ] Other two variables filled

#### Option B: If using Railway Cloud
```env
DATABASE_URL="postgresql://postgres:PASSWORD@rail.proxy.rlwy.net:PORT/railway"
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_WEBRTC_URL="wss://signaling.yjs.dev"
```
- [ ] File created
- [ ] DATABASE_URL from Railway copied correctly
- [ ] Other two variables filled

---

## 🗄️ Phase 3: Database Setup (8 menit)

### Choose ONE option below:

---

### ⚙️ OPTION A: PostgreSQL Local Setup

#### Step 3A.1: Download & Install PostgreSQL
- [ ] Go to https://www.postgresql.org/download/windows/
- [ ] Download PostgreSQL 15 or 16
- [ ] Run installer
- [ ] Set strong password for `postgres` user
- [ ] Port: 5432 (default)
- [ ] Service: enabled
- [ ] Installation complete

#### Step 3A.2: Create Database
```bash
# Open PowerShell or Command Prompt
psql -U postgres

# In prompt:
CREATE DATABASE chartmaker;
\q
```
- [ ] psql opened successfully
- [ ] Database created without errors
- [ ] Exited psql

#### Step 3A.3: Verify Connection
```bash
psql -U postgres -h localhost -d chartmaker
```
- [ ] Connected successfully
- [ ] Prompt shows `chartmaker=#`
- [ ] Exited with `\q`

---

### ☁️ OPTION B: Railway Cloud Setup

#### Step 3B.1: Create Railway Account
- [ ] Go to https://railway.app
- [ ] Sign up with GitHub
- [ ] Account created

#### Step 3B.2: Create PostgreSQL
- [ ] Logged into Railway
- [ ] Clicked "Create New Project"
- [ ] Selected "Provision PostgreSQL"
- [ ] PostgreSQL deployed (shows in dashboard)

#### Step 3B.3: Get Connection String
- [ ] Clicked PostgreSQL plugin
- [ ] Went to "Connect" tab
- [ ] Copied connection string
- [ ] Pasted into `.env.local` DATABASE_URL
- [ ] URL looks like: `postgresql://postgres:***@rail.proxy.rlwy.net:****/railway`

---

### ⏭️ EITHER WAY: Finalize Database

#### Step 3C.1: Generate Prisma Client
```bash
npx prisma generate
```
- [ ] Executed without errors
- [ ] Output shows "✔ Generated Prisma Client"

#### Step 3C.2: Push Schema to Database
```bash
npx prisma db push
```
- [ ] Executed without errors
- [ ] Output shows "✔ Your database is now in sync"
- [ ] Tables created in database

#### Step 3C.3: Verify Database Tables (Optional)
```bash
npx prisma studio
```
- [ ] Browser opened at http://localhost:5555
- [ ] Can see "Map" table
- [ ] Closed Prisma Studio (Ctrl + C)

---

## 🚀 Phase 4: Development Server (2 menit)

### Step 4.1: Start Development Server
```bash
npm run dev
```
- [ ] Server started without errors
- [ ] Output shows: `✓ Ready in X.Xs`
- [ ] Shows: `Local:        http://localhost:3000`

### Step 4.2: Verify in Browser
- [ ] Opened http://localhost:3000
- [ ] Landing page loaded with "ChartMaker" title
- [ ] "Create New Map" button visible
- [ ] No console errors (F12 → Console tab)

---

## 🎨 Phase 5: Test Core Features (3 menit)

### Step 5.1: Create First Map
- [ ] Entered map title (e.g., "My First Concept Map")
- [ ] Clicked "Create New Map"
- [ ] Redirected to editor page
- [ ] URL changed to `/editor/[some-id]`

### Step 5.2: Test Editor UI
- [ ] See "Add Concept" button
- [ ] See "+ Add Concept" button in toolbar
- [ ] See PresenceBar at top
- [ ] See yourself in online users list

### Step 5.3: Add Nodes
- [ ] Clicked "+ Add Concept" button
- [ ] New node appeared on canvas
- [ ] Able to drag node around
- [ ] Created 2-3 more nodes

### Step 5.4: Connect Nodes (Optional)
- [ ] Dragged connection between nodes
- [ ] Edge connected two nodes
- [ ] See edge displayed on canvas

### Step 5.5: Test Presence
- [ ] Look at PresenceBar - shows your user
- [ ] Shows "✎ Editing" status
- [ ] Shows connection status (● online)

---

## 👥 Phase 6: Test Real-time Collaboration (2 menit)

### Step 6.1: Open Second Browser
- [ ] Opened new browser window / incognito
- [ ] Pasted same editor URL
- [ ] Second browser loaded same map

### Step 6.2: Test Sync
- [ ] In Browser 1: Click "+ Add Concept"
- [ ] ✅ New node appears in Browser 1
- [ ] ✅ NEW NODE APPEARS IN BROWSER 2 (within 1 second!)
- [ ] Node appears without refresh

### Step 6.3: Test Presence Awareness
- [ ] Look at PresenceBar in both browsers
- [ ] Both show "2 online"
- [ ] See 2 different user avatars
- [ ] See both users listed with "Editing" status

### Step 6.4: Verify Auto-save
- [ ] Add several more nodes
- [ ] Don't manually save
- [ ] Wait 15 seconds
- [ ] Refresh page → nodes still there! (saved to DB)

---

## 🏗️ Phase 7: Build for Production (2 menit)

### Step 7.1: Build Project
```bash
npm run build
```
- [ ] Build started
- [ ] Output shows `✓ Compiled successfully`
- [ ] Output shows `✓ Linting and checking validity of types`
- [ ] Output shows route summary (/, /api/maps, etc.)
- [ ] Build completed without errors

### Step 7.2: Test Production Build
```bash
npm start
```
- [ ] Server started
- [ ] http://localhost:3000 loads
- [ ] App works same as dev mode
- [ ] Stopped server (Ctrl + C)

---

## 🚢 Phase 8: Ready for Deployment (Optional Now)

### Step 8.1: Prepare Deployment Checklist
- [ ] Read `README.md` → Deployment section
- [ ] Have Railway database ready (or Railway account)
- [ ] Have Vercel account (vercel.com)
- [ ] Have GitHub account with repo
- [ ] Code pushed to GitHub

### Step 8.2: Deployment Steps (When Ready)
- [ ] Deploy database to Railway
- [ ] Deploy frontend to Vercel
- [ ] Configure environment variables
- [ ] Run migrations in production
- [ ] Test production app

---

## 📖 Documentation Review

- [ ] Read **START_HERE.md** (you're here!)
- [ ] Read **QUICK_START.md** (5 min reference)
- [ ] Read **SETUP_MANUAL.md** (complete guide)
- [ ] Read **DATABASE_SETUP.md** (database detail)
- [ ] Read **PROJECT_STRUCTURE.md** (code organization)
- [ ] Read **README.md** (deployment & features)

---

## 🎓 Next Learning Steps

After setup is complete:

- [ ] Open `src/components/RealtimeProvider.tsx` → understand Yjs + WebRTC
- [ ] Open `src/components/ConceptFlow.tsx` → understand React Flow binding
- [ ] Open `src/lib/yjs.ts` → understand document structure
- [ ] Open `src/app/api/maps/save/route.ts` → understand save API
- [ ] Explore Prisma Studio (`npx prisma studio`)
- [ ] Check database tables directly
- [ ] Read code comments in components

---

## 🐛 Troubleshooting Checklist

If something doesn't work, check:

### General Issues
- [ ] All files in project intact
- [ ] npm install ran successfully
- [ ] .env.local created with correct values
- [ ] No typos in configuration

### Database Issues
- [ ] PostgreSQL service running (if local)
- [ ] DATABASE_URL correct in .env.local
- [ ] Database "chartmaker" exists
- [ ] Can connect with psql command
- [ ] `npx prisma db push` succeeded

### Server Issues
- [ ] Node.js version correct (18+)
- [ ] npm version correct (8+)
- [ ] Port 3000 not in use
- [ ] No error in console when running `npm run dev`
- [ ] Restart server after .env changes

### Runtime Issues
- [ ] Clear browser cache (Ctrl + Shift + Del)
- [ ] Check browser console (F12)
- [ ] Check terminal output for errors
- [ ] Restart dev server
- [ ] Try different browser

---

## ✨ Success Signs

You know setup is complete when:

✅ `npm run dev` runs without errors  
✅ Browser loads http://localhost:3000  
✅ Can create new map  
✅ Can add nodes to map  
✅ Second browser sees realtime changes  
✅ Presence bar shows "2 online"  
✅ Data persists after refresh  
✅ `npm run build` succeeds without errors  

---

## 🎉 CONGRATULATIONS!

You have successfully set up **ChartMaker**! 

Your app is:
- ✅ Running locally
- ✅ Using Yjs for real-time CRDT sync
- ✅ Using WebRTC for P2P communication
- ✅ Using PostgreSQL for persistent storage
- ✅ Showing live user presence
- ✅ Auto-saving to database
- ✅ Production-ready

---

## 🚀 Next: Deploy or Develop

**Option A: Start Developing**
```bash
npm run dev
# Make code changes, see hot-reload
# Continue editing and testing
```

**Option B: Deploy to Production**
- Follow `README.md` deployment section
- Railway for database
- Vercel for frontend

---

## 📞 Need Help?

1. **Error message?** → Google it (very helpful!)
2. **Documentation?** → Read SETUP_MANUAL.md
3. **Concept unclear?** → Read PROJECT_STRUCTURE.md
4. **Database question?** → Read DATABASE_SETUP.md
5. **Still stuck?** → Check GitHub issues or communities

---

**Date Setup Completed:** _______________

**Your ChartMaker Instance ID:** _______________

---

*Happy mapping! 🗺️*
