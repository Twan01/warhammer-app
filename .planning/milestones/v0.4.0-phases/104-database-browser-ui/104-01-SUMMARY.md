---
phase: 104-database-browser-ui
plan: 01
status: complete
started: 2026-05-30T10:00:00Z
completed: 2026-05-30T10:30:00Z
commits:
  - 2ae1a7e
  - 9fc5c89
  - ae7f8fc
---

## Summary

Built the data layer, test stubs, and route wiring for the Unit Database browser feature.

### Task 1: Wave 0 Test Stubs (7 files)
Created 7 test stub files under `tests/unit-database/` with 42 `it.todo()` entries covering filters, alignment map, queries, FactionPicker, UdbUnitRow, UdbDatasheetSheet, and UdbUnitList.

### Task 2: Data Layer (5 files)
- `src/db/queries/unitDatabase.ts` — 4 query functions (getUdbFactions, getUdbUnitsByFaction, getUdbUnitDetail, searchUdbUnits) with 10 exported interfaces
- `src/hooks/useUnitDatabase.ts` — 4 React Query hooks with staleTime: Infinity
- `src/features/unit-database/databaseBrowserFilters.ts` — Zustand filter store
- `src/features/unit-database/applyUdbFilters.ts` — Pure AND-logic filter function
- `src/features/unit-database/factionAlignmentMap.ts` — 25 faction IDs mapped to 4 alignment groups

### Task 3: Route Wiring + Page Shell
- `src/app/unit-database/page.tsx` — Page shell component
- `src/features/unit-database/DatabaseBrowserPage.tsx` — Placeholder page
- Modified `src/app/router.tsx` — Added lazy import + route at /unit-database
- Modified `src/components/common/AppSidebar.tsx` — Added BookMarked icon + sidebar entry in PLAY_NAV
- Installed `@tanstack/react-virtual` dependency

### Verification
- `pnpm build` passes cleanly (tsc + vite build)
- `pnpm test` recognizes all 42 todo stubs (no failures from new code)
