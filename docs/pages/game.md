# Page Guide: `/game`

## Tujuan
Halaman simulasi perusahaan CPU (Aurora Microforge Simulator).

## Struktur
- Route entry: `src/app/game/page.tsx`
- Route metadata/layout: `src/app/game/layout.tsx`
- Engine + UI utama: `src/features/cpu-foundry/`

## Aset & dependensi
- Style dan state khusus game berada di feature `cpu-foundry`.
- Tidak ada lagi aset APK popup/downloader yang disuntikkan ke route ini.
