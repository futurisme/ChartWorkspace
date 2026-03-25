# Page Guide: `/workspace`

## Tujuan
Halaman launch control untuk create map, resume map terakhir, dan search map.

## Struktur modular
- Route UI shell: `src/app/workspace/page.tsx`
- Logic pencarian map: `src/features/workspace-home/use-workspace-search.ts`
- Konstanta pencarian: `src/features/workspace-home/constants.ts`
- Tipe data: `src/features/workspace-home/types.ts`

## Alur data ringkas
1. User mengetik query.
2. Hook `useWorkspaceSearch` menjalankan debounce + fetch ke `/api/maps`.
3. Hasil ditampilkan sebagai list map yang bisa dibuka ke `/editor/[id]`.
