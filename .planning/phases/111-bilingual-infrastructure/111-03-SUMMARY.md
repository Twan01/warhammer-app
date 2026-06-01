---
phase: 111-bilingual-infrastructure
plan: "03"
subsystem: locale-ui
tags: [locale, sidebar, fts5, bilingual, fr-04, fr-05]
dependency_graph:
  requires: ["111-02"]
  provides: ["LocaleToggle component", "bilingual FTS5 search index"]
  affects: ["src/components/common/AppSidebar.tsx", "src-tauri/src/lib.rs"]
tech_stack:
  added: []
  patterns: ["Zustand locale store consumption", "React Query cache invalidation on locale switch", "FTS5 keywords bag-of-words extension"]
key_files:
  created:
    - src/components/common/LocaleToggle.tsx
    - tests/unit-database/locale-toggle.test.ts
  modified:
    - src/components/common/AppSidebar.tsx
    - src-tauri/src/lib.rs
decisions:
  - "French names appended to FTS5 keywords column (not name column) to keep result display clean — English names remain in name/faction_name for rendering"
  - "handleLocaleSwitch invalidates udb-factions, udb-units, udb-unit-detail by prefix key (no locale suffix) to clear all locale variants at once"
  - "Collapsed sidebar shows active locale code as ghost icon button with tooltip matching existing collapse button sizing"
metrics:
  duration: "15m"
  completed: "2026-06-01"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
---

# Phase 111 Plan 03: Locale Toggle UI + FTS5 Bilingual Search Summary

EN/FR pill toggle in sidebar footer with query cache invalidation on locale switch, and FTS5 keyword index extended with French unit and faction names for bilingual search.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | LocaleToggle component + AppSidebar integration | f0c31cb | LocaleToggle.tsx, locale-toggle.test.ts, AppSidebar.tsx |
| 2 | Extend FTS5 rebuild with French names | 9dfa0a3 | src-tauri/src/lib.rs |

## What Was Built

**LocaleToggle component** (`src/components/common/LocaleToggle.tsx`):
- Expanded sidebar: pill toggle with EN and FR Button segments side-by-side; active segment uses `variant="secondary"`, inactive uses `variant="ghost"`
- Collapsed sidebar: single ghost icon-sized Button showing current locale code (EN/FR) with Tooltip "Switch to French" / "Switch to English"
- `handleLocaleSwitch(next: Locale)` calls `setLocale(next)` then `invalidateQueries` for `["udb-factions"]`, `["udb-units"]`, `["udb-unit-detail"]` prefix keys
- Wrapped in `div className="px-2 pb-1"` matching sidebar spacing conventions

**AppSidebar integration**: `LocaleToggle` imported and rendered above the collapse toggle div, passing `collapsed` state as prop.

**FTS5 keywords extension** (`src-tauri/src/lib.rs`): FTS5 `INSERT INTO udb_search` now prepends `COALESCE(u.name_fr || ' ', '')` and `COALESCE(f.name_fr || ' ', '')` to the keywords column before sub_faction and keyword tags. French names searchable; English names unchanged in `name`/`faction_name` columns.

**Tests** (`tests/unit-database/locale-toggle.test.ts`): 6 passing tests covering expanded mode rendering, active locale highlight, click-to-switch behavior, no-op on active locale click, collapsed mode tooltip, and collapsed toggle behavior.

## Verification Results

- `pnpm vitest run tests/unit-database/locale-toggle.test.ts`: 6/6 passed
- `pnpm build`: TypeScript check + Vite build passed with zero errors
- `cargo check --manifest-path src-tauri/Cargo.toml`: Finished with no errors
- `grep name_fr src-tauri/src/lib.rs`: 9 occurrences confirmed (FTS5 INSERT + serde bindings from Phase 108)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. LocaleToggle reads from live `useLocaleStore` and calls `useQueryClient`; no hardcoded or placeholder data.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- src/components/common/LocaleToggle.tsx: FOUND
- tests/unit-database/locale-toggle.test.ts: FOUND
- src/components/common/AppSidebar.tsx contains LocaleToggle: FOUND
- src-tauri/src/lib.rs contains name_fr in FTS5 INSERT: FOUND (9 occurrences)
- Commit f0c31cb: FOUND
- Commit 9dfa0a3: FOUND
