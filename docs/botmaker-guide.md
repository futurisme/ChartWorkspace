# Panduan BotMaker (Login, Editor, dan Optimasi)

## 1) Login / Registrasi
- Buka `/BotMaker`.
- Isi **username** dan **password**.
- Tombol **Login / Register** akan:
  - membuat akun baru saat username belum ada,
  - login bila username sudah ada dan password cocok.
- Session disimpan via cookie dan sekarang berlaku untuk route BotMaker + API (`/api/botmaker`) agar tidak loop login.

## 2) Workflow Drag & Drop + Custom
- Gunakan **Block Palette** untuk menambahkan block.
- Atur urutan dengan drag & drop atau tombol `↑` `↓`.
- Gunakan **Code Editor (Custom)** untuk logic lanjutan yang tidak bisa ditangani drag & drop.
- Gunakan **Code Explorer** untuk melihat preview file virtual custom syntax `custom-botmaker-v1`.

## 3) Optimasi performa storage/compression
- Penyimpanan state kini memakai strategi adaptif:
  - payload kecil: plain base64 (tanpa beban kompresi),
  - payload menengah/besar: brotli cepat,
  - fallback deflate ringan jika rasio brotli buruk.
- Tujuan: latency lebih rendah dan beban CPU lebih ringan.

## 4) Optimasi Discord API & anti-rate-limit
- Deploy mengecek token ke `/users/@me` (API v10) lalu sync command.
- Sync command guild dibatasi periodik saat runtime untuk menghindari request berulang berlebihan.
- Scheduler runtime memakai:
  - interval aman minimum,
  - pembacaan header rate limit,
  - exponential backoff saat error/429,
  - proteksi agar job yang sama tidak berjalan paralel.

## 5) Checklist validasi cepat
1. Login username baru (harus auto register).
2. Refresh halaman (harus tetap login).
3. Edit bot + Save all + Reload.
4. Isi `customCode`, cek tampil di Explorer.
5. Deploy bot, lalu cek status deploy.
