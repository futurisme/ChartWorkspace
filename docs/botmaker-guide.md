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


## 7) Mode token ketat (tanpa fallback runtime)
- Deploy/send sekarang **wajib** memakai token yang sudah tersimpan di database.
- Jika save database gagal, aksi deploy/send tidak dijalankan.
- Ini memastikan runtime tidak memakai token sementara dari request, sehingga status token konsisten.

## 8) Diagnostik database
- Panel diagnostik menampilkan `DB Host` aktif.
- Jika DB bermasalah, detail error backend akan ditampilkan lebih lengkap di area error merah agar akar masalah cepat diketahui.


## 9) Analisa akar masalah Command sync failed (404/401)
- Error 404 pada command sync Discord umumnya berasal dari **Application ID / Guild ID tidak cocok**, bot belum join ke guild target, atau endpoint command guild tidak menemukan resource target.
- Error 401 umumnya berarti token tidak valid/berubah.
- Pada perbaikan ini, command sync diperlakukan sebagai warning non-fatal agar scheduler kirim pesan utama tidak ikut mati; warning tetap dicatat di activity log untuk tindakan lanjut.

## 10) Live Logs 24H
- BotMaker menyediakan panel **CLI Terminal Build Logs + Activity Logs (Live 24H)**.
- Log mencakup proses deploy start, command sync, deploy success, send success, dan runtime error.
- Retensi log dijaga 24 jam dengan pruning agar tetap ringan.


## 11) Encoding token `.fAdHiL`
- Token disimpan dalam format `.fAdHiL` (deflate + framed encoding) sebelum masuk DB.
- Payload tetap ringkas dan kompatibel pembacaan data lama base64url.

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

## 17) Mode encoding token `.fAdHiL` tanpa enkripsi tambahan
Sesuai requirement final:
- Token disimpan sebagai payload `.fAdHiL` (deflate + framed encoding), **tanpa AES/secret key tambahan**.
- Saat dibaca dari database, payload `.fAdHiL` didecode kembali menjadi token asli di runtime aplikasi.

Konsekuensi teknis:
1. Tidak ada lagi mismatch key antar deploy untuk proses decode token.
2. Integritas alur bergantung pada konsistensi payload `.fAdHiL` di database.
3. Pastikan akses database tetap aman (private network/credential ketat), karena ini encoding reversible, bukan enkripsi kriptografis.
