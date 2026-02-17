# Architecture Reorganization Plan (Applied)

## Goals
- Decouple business logic from framework-specific handlers.
- Improve feature/domain discoverability.
- Standardize naming for consistency.

## Before (high-level)
```text
src/
  app/
    api/
      maps/
        route.ts
        [id]/route.ts
        save/route.ts
      perf/
        route.ts
        dashboard/route.ts
  components/
    RealtimeProvider.tsx
    PresenceBar.tsx
  features/
    flow/
      flow-flow.integration.test.ts
      ...
  lib/
    mapId.ts
    snapshot.ts
    presence.ts
    prisma.ts
```

## After (high-level)
```text
src/
  app/
    api/
      maps/
        route.ts
        [id]/route.ts
        save/route.ts
      perf/
        route.ts
        dashboard/route.ts
  features/
    maps/
      shared/
        map-id.ts
        map-snapshot.ts
      server/
        maps-service.ts
    perf/
      server/
        perf-ingest-service.ts
        perf-dashboard-service.ts
    collaboration/
      shared/
        presence.ts
    flow/
      flow.integration.test.ts
      ...
  lib/
    prisma.ts
```

## Major changes and justification
1. **Moved map identity/snapshot logic from `lib/` into `features/maps/shared/`**  
   Keeps map-specific domain utilities with the map feature, reducing cross-project hunting and clarifying ownership.

2. **Introduced `features/maps/server/maps-service.ts` and slimmed API routes**  
   Routes now focus on HTTP concerns (request/response headers/status), while map business logic lives in a reusable service layer.

3. **Introduced `features/perf/server/*` services**  
   Perf ingestion and dashboard aggregation are now domain services, enabling reuse in future jobs/cron/tasks without coupling to Next route handlers.

4. **Moved presence utilities to `features/collaboration/shared/presence.ts`**  
   Presence logic is collaboration-domain behavior, not generic infrastructure.

5. **Standardized inconsistent file naming in flow tests**  
   Renamed `flow-flow.integration.test.ts` to `flow.integration.test.ts` to align with concise kebab-case naming.

## Naming conventions applied
- **Feature folders**: kebab-case (`maps`, `collaboration`, `flow`).
- **Utility/service files**: kebab-case (`map-id.ts`, `maps-service.ts`).
- **React components**: PascalCase (unchanged existing pattern).
- **Route handlers**: framework-required `route.ts` naming retained.
