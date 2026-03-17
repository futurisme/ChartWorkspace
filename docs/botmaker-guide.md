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
