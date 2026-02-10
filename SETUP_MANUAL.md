# ChartMaker — Panduan Deploy Produksi Global (Tanpa Instruksi Lokal)

Panduan ini ditujukan agar siapa saja di dunia dapat memulai ChartMaker secara mandiri dan publik (production-ready) tanpa perlu akses lokal dari Anda. Fokus: layanan terkelola (GitHub, Railway, Vercel) sehingga pengguna/kontributor bisa memulai sendiri.

Ringkasan singkat:
- Frontend & API: `Vercel` (hosting Next.js App Router)
- Database: `Railway` (PostgreSQL managed, free tier tersedia + IPv4)
- Signaling WebRTC: default `wss://signaling.yjs.dev` (public). Opsional: self-hosted signaling untuk privasi.
- CI: `GitHub Actions` untuk menjalankan migrasi Prisma otomatis di production.

Prasyarat akun (gratis/terkelola): GitHub, Vercel, Railway.

----

1) Buat repository GitHub dan push kode

- Buat repo baru di GitHub (nama bebas).
- Push kode project ke branch `main`:

```bash
git remote add origin https://github.com/<YOUR_USER_OR_ORG>/<REPO>.git
git branch -M main
git push -u origin main
```

2) Buat project Railway (PostgreSQL managed) — Panduan Terperinci

**A. Login & Buat Project**

1. Buka https://railway.app (atau https://app.railway.app jika belum punya akun).
2. Sign up (gratis).
3. Setelah login, klik **"New Project"** → pilih **"Database"** → pilih **"PostgreSQL"**.
4. Tunggu deployment selesai (1-2 menit). Status akan berubah menjadi "Running".

**B. Ambil Connection String**

1. Di Dashboard Railway, klik plugin **"PostgreSQL"** yang baru dibuat.
2. Pilih tab **"Connect"**.
3. Pilih connection method **"$PRIVATE_URL"** (untuk Railway internal/Vercel) atau **"$DATABASE_PUBLIC_URL"** (untuk local testing).
4. Copy connection string yang terlihat seperti:
   ```
   postgresql://postgres:PASSWORD@shortline.proxy.rlwy.net:PORT/railway
   ```
   Contoh:
   ```
   postgresql://postgres:OIdAwuJcuHLoEEzNdtvhIkoohxHgqbsg@shortline.proxy.rlwy.net:25145/railway
   ```

**C. Verifikasi Connection String**

Connection string akan terlihat seperti:
```
postgresql://postgres:PASSWORD@shortline.proxy.rlwy.net:PORT/railway
```

Contoh real:
```
postgresql://postgres:OIdAwuJcuHLoEEzNdtvhIkoohxHgqbsg@shortline.proxy.rlwy.net:25145/railway
```

Bagian penting:
- `postgres` = username default
- `PASSWORD` = password Anda (disalin dari Railway)
- `shortline.proxy.rlwy.net` = host Railway public proxy
- `PORT` = port yang diberikan Railway (contoh: 25145)
- `railway` = database name

**D. Simpan untuk langkah berikutnya**

Simpan string ini di tempat aman (notepad temporary). Ini akan digunakan sebagai `DATABASE_URL` di:
- GitHub Secrets (langkah 3)
- Vercel Environment Variables (langkah 4)

Contoh checklist langkah 2:
- [ ] Login ke https://railway.app
- [ ] Buat project baru → pilih PostgreSQL
- [ ] Tunggu status "Running"
- [ ] Buka Plugin PostgreSQL → Connect tab
- [ ] Copy connection string (private URL untuk Vercel)
- [ ] Simpan connection string ke notepad

3) Tambahkan secret di GitHub (untuk CI migrasi) — Panduan Terperinci

**A. Akses GitHub Secrets**

1. Buka repo GitHub Anda: https://github.com/<YOUR_USER>/<YOUR_REPO>
2. Klik **Settings** (di atas, sebelah kanan).
3. Di menu sisi kiri, scroll ke bawah dan klik **"Secrets and variables"** → **"Actions"**.

**B. Tambah Secret DATABASE_URL**

1. Klik tombol **"New repository secret"** (warna hijau).
2. Isi form:
   - **Name**: `DATABASE_URL` (exact, case-sensitive)
   - **Secret**: (paste connection string dari Railway step 2 sebelumnya — gunakan PRIVATE URL)
3. Klik **"Add secret"**.

Contoh: jika connection string Railway Anda adalah:
```
postgresql://postgres:OIdAwuJcuHLoEEzNdtvhIkoohxHgqbsg@shortline.proxy.rlwy.net:25145/railway
```
Maka Anda paste tepat string itu ke field "Secret".

**C. Verifikasi**

Setelah ditambahkan, secret `DATABASE_URL` akan muncul di daftar dengan status **"Last updated X minutes ago"**. Secret disembunyikan untuk keamanan (Anda tidak bisa lihat value-nya lagi; hanya bisa edit/delete).

**D. Checklist Step 3**

- [ ] Buka repo GitHub
- [ ] Masuk Settings → Secrets and variables → Actions
- [ ] Klik "New repository secret"
- [ ] Nama: `DATABASE_URL`
- [ ] Value: copy-paste connection string Railway (PRIVATE URL)
- [ ] Verifikasi secret muncul di daftar

4) Setup Vercel (deploy production)

1. Login ke https://vercel.com → Import Project → pilih repo GitHub Anda.
2. Di setup environment, tambahkan Environment Variables (Production):
   - `DATABASE_URL` = (paste connection string Railway — gunakan URL publik proxy: `shortline.proxy.rlwy.net`)
   - `NEXT_PUBLIC_WEBRTC_URL` = `wss://signaling.yjs.dev` (atau URL signaling Anda jika self-hosted)
   - `NEXT_PUBLIC_API_URL` = `https://<YOUR_VERCEL_PROJECT_DOMAIN>` (opsional)
3. Deploy project. Vercel akan menjalankan `npm install`, `prisma generate`, dan `npm run build`.

5) Jalankan migrasi Prisma di production (rekomendasi: GitHub Actions)

Tambahkan workflow CI agar migrasi database otomatis setiap push ke `main`.

Contoh file workflow: `.github/workflows/prisma-migrate.yml`

```yaml
name: Prisma Migrate (production)

on:
  push:
    branches: [ main ]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install
        run: npm ci
      - name: Prisma Migrate Deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          npx prisma migrate deploy
          npx prisma generate
```

Langkah: commit & push file workflow ini. Pastikan secret `DATABASE_URL` sudah di-set di GitHub.

6) Signaling WebRTC — opsi production

- Default (cepat & tanpa setup): `NEXT_PUBLIC_WEBRTC_URL=wss://signaling.yjs.dev`.
- Opsional (lebih privat & berkontrol): deploy `y-websocket` atau signaling server lain ke provider (Render, Fly, Railway, dsb.) dan ganti `NEXT_PUBLIC_WEBRTC_URL` ke URL baru.

7) Validasi deployment & domain publik

1. Setelah Vercel deploy selesai, buka `https://<project>.vercel.app`.
2. Buat peta baru (Create Map) di UI, lalu buka URL editor di device lain. Verifikasi realtime sync dan presence.
3. Untuk custom domain: Vercel → Domains → Add domain → ikuti instruksi DNS.

8) Security & Reliability (produksi)

- Simpan `DATABASE_URL` hanya di Vercel env vars & GitHub Secrets.
- Gunakan HTTPS/WSS (Vercel & Supabase menyediakan TLS).
- Aktifkan backups & monitoring di Supabase.
- Pertimbangkan autentikasi (NextAuth/Clerk) untuk hak akses editor.

9) Quick checklist untuk pengguna baru (agar bisa start sendiri)

- [ ] Buat akun GitHub, Railway, Vercel
- [ ] Push kode ke GitHub repo
- [ ] Buat Railway PostgreSQL project dan copy `DATABASE_URL`
- [ ] Tambahkan `DATABASE_URL` ke GitHub Secrets
- [ ] Import repo ke Vercel, set env vars (`DATABASE_URL`, `NEXT_PUBLIC_WEBRTC_URL`)
- [ ] (Optional) GitHub Actions workflow sudah di-setup untuk migrasi otomatis
- [ ] Akses URL Vercel dan verifikasi

----

Perlu bantuan tambahan yang membuat ini "one-click" untuk orang awam?
Saya bisa:
- Tambahkan file `.github/workflows/prisma-migrate.yml` langsung ke repo (otomatis migrasi),
- Tambahkan dokumentasi singkat untuk deploy `y-websocket` ke layanan tertentu, atau
- Tambahkan instruksi integrasi `NextAuth` supaya hanya user terdaftar bisa edit.

Pilih salah satu: `add-workflow`, `deploy-signaling`, `add-auth`, atau `none`.

-- Selesai.
