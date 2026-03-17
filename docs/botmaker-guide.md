# Panduan BotMaker (Login, Simpan Token, Hybrid Code)

## 1) Login / Registrasi
- Buka `/BotMaker`.
- Isi **username** dan **password**.
- Klik **Login / Register**.
- Session login tidak akan loop lagi karena cookie auth sekarang berlaku untuk route UI + API BotMaker.

## 2) Menyimpan token bot dengan benar
1. Isi field **Discord bot token**.
2. Isi minimal **Nama bot** dan **Channel ID**.
3. Klik **Save semua konfigurasi** atau langsung **Save + Deploy + Start**.
4. Token yang sudah tersimpan akan tetap tampil di field token dan status `YA`.

> Penting: Tombol deploy sekarang otomatis melakukan simpan dahulu agar token terbaru tidak hilang.

## 3) Delete konfigurasi bot saat ini
- Gunakan tombol **Delete konfigurasi bot ini**.
- Sistem meminta konfirmasi, lalu menghapus dan langsung menyimpan perubahan.

## 4) Hybrid code (Bahasa Indonesia)
BotMaker mendukung mode hybrid saat drag-drop tidak cukup.

### Sintaks inti
- `TEKS: ...`
- `EMOJI: ...`
- `TAG_SEMUA`
- `BARIS_BARU`
- `WAKTU_RELATIF`

### Alur kerja
1. Klik **Generate sintaks** untuk membuat template syntax dari workflow saat ini.
2. Edit syntax di **Hybrid Code Editor (Indonesia)**.
3. Klik **Terapkan sintaks ke workflow** untuk mengubah syntax menjadi block drag-drop.

## 5) Optimasi performa dan keamanan
- Kompresi state bersifat adaptif (plain / brotli / deflate) agar ringan di CPU.
- Validasi Discord ditingkatkan:
  - format token,
  - validasi snowflake ID (application/guild/channel),
  - validasi ketat pada deploy/send.
- Runtime anti-rate-limit tetap aktif dengan backoff, interval aman, dan pencegahan job paralel.

## 6) Tips UI Mobile
- Halaman bisa di-scroll sampai bawah.
- Tombol save utama dibuat sticky di bagian bawah agar mudah diakses di HP.


## 7) Fallback token environment (anti gagal simpan DB)
- Fallback utama runtime adalah token yang Anda isi di field **Discord bot token** saat menekan deploy/send. Jika simpan database gagal, runtime tetap memakai token input tersebut.
- Jika field token kosong, urutan env fallback tetap tersedia: `BOTMAKER_FALLBACK_TOKEN` → `DISCORD_BOT_TOKEN` → `TOKEN`.
- Status fallback tampil di panel diagnostik BotMaker.

## 8) Diagnostik database
- Panel diagnostik menampilkan `DB Host` aktif dan status fallback token env.
- Jika DB bermasalah, detail error backend akan ditampilkan lebih lengkap di area error merah agar akar masalah cepat diketahui.


## 9) Analisa akar masalah Command sync failed (404)
- Error 404 pada command sync Discord umumnya berasal dari **Application ID / Guild ID tidak cocok**, bot belum join ke guild target, atau endpoint command guild tidak menemukan resource target.
- Pada perbaikan ini, deploy tetap lanjut (tidak hard-fail) dan status warning ditampilkan agar bot tetap bisa host/send pesan sambil memperbaiki ID.

## 10) Live Logs 24H
- BotMaker menyediakan panel **CLI Terminal Build Logs + Activity Logs (Live 24H)**.
- Log mencakup proses deploy start, sinkron token runtime->DB, command sync, deploy success, send success, dan runtime error.
- Retensi log dijaga 24 jam dengan pruning agar tetap ringan.


## 11) Enkripsi token AES + .fAdHiL
- Token sekarang disimpan dengan AES-256-GCM lalu dipacking `deflate` + framing `.fAdHiL` sebelum masuk DB.
- Tujuan: payload aman, kecil, dan tetap kompatibel dengan data lama (base64 lama masih bisa dibaca).

## 12) Mengapa bot dulu hanya jalan sekali?
- Penyebab umum: scheduler tidak aktif ulang setelah restart runtime, token tidak sinkron saat deploy, atau command sync hard-fail.
- Perbaikan final: deploy mengaktifkan scheduler, runtime direkonsiliasi saat load, command sync warning tidak mematikan deploy, dan ada tombol **Stop manual** untuk menghentikan host secara sadar.


## 13) Custom syntax respon kata channel
- Tambahkan baris syntax di Hybrid Code:
  - `RESPON_KATA: halo => Halo juga 👋`
  - `ON_KATA: bantu => Perintah bantuan aktif.`
- Runtime akan memantau pesan terbaru channel, lalu membalas saat kata kunci cocok.

## 14) Sentralisasi warning/error ke CLI Logs
- Warning dan error dipusatkan ke panel **CLI Terminal Build Logs + Activity Logs** agar terstruktur.
- Log client/server/internal/external masuk ke alur yang sama melalui endpoint `/api/botmaker/logs`.

## 15) Startup bot lebih cepat
- Scheduler startup dipercepat (boot delay kecil) lalu tetap memakai interval aman untuk menjaga performa dan rate limit.

## 16) Analisa akar masalah token "selalu tidak tersimpan"
Akar masalah utama ada pada alur sanitasi state sebelum data disimpan ulang:
- Snapshot state dari DB dibaca lalu disanitasi menjadi `BotMakerState`.
- Sanitizer sebelumnya **membuang field internal** `tokenCipher` dan `tokenIv`.
- Saat user menekan save tanpa isi token baru (field token kosong karena mode aman), sistem menganggap token lama tidak ada, lalu menyimpan state baru tanpa cipher.
- Efek akhirnya terlihat seperti: "token selalu hilang / tidak terdeteksi tersimpan".

Perbaikan yang diterapkan:
- Sanitizer kini mempertahankan field internal `tokenCipher` + `tokenIv` agar token terenkripsi tidak ikut terhapus pada save berikutnya.
- Runtime menambahkan log `token:metadata-missing` jika status `hasToken` ada tapi metadata cipher hilang.

## 17) Analisa akar Railway/secret key mismatch
Masalah lain yang sering mirip gejalanya adalah key enkripsi berubah antar deploy:
- Enkripsi token memakai key turunan secret.
- Jika secret berubah, token lama tetap ada di DB tapi **gagal didekripsi**, sehingga runtime bisa membaca seolah token kosong.

Perbaikan yang diterapkan:
- Decrypt sekarang mencoba beberapa kandidat key (utama + legacy) agar data lama tetap bisa dibaca.
- Diagnostik sekarang menampilkan `tokenSecretSource` supaya cepat tahu aplikasi sedang memakai secret dari mana.

Rekomendasi Railway/Vercel:
1. Set **BOTMAKER_TOKEN_SECRET** yang stabil (jangan bergantung `DATABASE_URL`).
2. Jika pernah ganti secret, isi **BOTMAKER_TOKEN_SECRET_PREVIOUS** dengan secret lama (boleh lebih dari satu, pisahkan koma) untuk migrasi aman.
3. Pastikan DB URL public dipakai di runtime Vercel (hindari host `*.railway.internal` untuk akses dari luar Railway private network).
