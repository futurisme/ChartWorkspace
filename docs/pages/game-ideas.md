# Page Guide: `/game-ideas`

## Tujuan
Halaman manajemen database ide game (kategori, folder, item) dengan persist lokal + sinkron backend.

## Struktur
- Route UI + interaksi kompleks: `src/app/game-ideas/page.tsx`
- Schema dan validasi data: `src/features/game-ideas/shared/schema.ts`
- Kompresi/enkripsi arsip: `src/features/maps/shared/fadhil-archive.ts`

## Catatan
Karena route ini besar, rekomendasi lanjutan adalah ekstraksi panel/popup ke komponen terpisah bertahap agar maintainability meningkat tanpa mengubah perilaku runtime.
