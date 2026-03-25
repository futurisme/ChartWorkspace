# Route Module Map

Dokumen ini memperjelas batas logika + aset per halaman agar struktur repo lebih modular dan mudah dipelihara.

## Route utama

- `/workspace`
  - Entry/launcher untuk membuat map baru + resume map terakhir.
  - UI route: `src/app/workspace/page.tsx`
  - Logika search modular: `src/features/workspace-home/use-workspace-search.ts`
  - Konstanta search: `src/features/workspace-home/constants.ts`
  - Tipe data search: `src/features/workspace-home/types.ts`

- `/game`
  - Simulator CPU foundry.
  - Route shell: `src/app/game/page.tsx`
  - Layout route: `src/app/game/layout.tsx`
  - Feature logic: `src/features/cpu-foundry/`

- `/game-ideas`
  - Workspace ide/game design.
  - UI route: `src/app/game-ideas/page.tsx`
  - Schema + sanitization: `src/features/game-ideas/shared/schema.ts`

- `/editor/[mapId]` dan `/view/[mapId]`
  - Editor/viewer utama map kolaboratif.
  - Logic flow modular: `src/features/flow/`
  - Realtime/provider: `src/components/RealtimeProvider.tsx`

## API route terkait

- Maps: `src/app/api/maps/**`
- Game ideas: `src/app/api/game-ideas/route.ts`
- Botmaker: `src/app/api/botmaker/**`
- Performance ingest/dashboard: `src/app/api/perf/**`

## Catatan struktur

- Semua logika reusable baru untuk `/workspace` dipindah ke `src/features/workspace-home/`.
- Tujuannya: route file tetap fokus pada presentasi/komposisi, sementara logic/network state dipisahkan.
