---
phase: 14-spending-tracker
plan: 01
subsystem: database
tags: [sqlite, migration, typescript, intl, currency, vitest]

# Dependency graph
requires:
  - phase: 14-00
    provides: Wave 0 stub files (7 test stubs, 32 it.skip placeholders) under tests/spending/
provides:
  - "Migration 006 spend_pence SQL (ALTER TABLE units/paints ADD COLUMN purchase_price_pence INTEGER + UPDATE migration)"
  - "Migration registered as version 6 in lib.rs get_migrations()"
  - "formatCurrency utility (single division-by-100 site in codebase)"
  - "Unit type: purchase_price (REAL) renamed to purchase_price_pence (INTEGER)"
  - "Paint type: purchase_price_pence: number | null added (additive)"
  - "units.ts and paints.ts INSERT/UPDATE wired to purchase_price_pence with Pitfall 1 unconditional assignment"
  - "9 Wave-0 test stubs flipped from it.skip to passing assertions (5 migration + 4 formatCurrency)"
  - "Dashboard u() builder fixtures renamed (purchase_price → purchase_price_pence) keeping existing dashboard suite green"
affects: [14-02, 14-03, spending-tracker, unit-form, paint-form]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Integer pence storage — all purchase prices stored as INTEGER pence in SQLite; no REAL/float money"
    - "Pitfall 1 unconditional assignment — updateUnit/updatePaint use purchase_price_pence = $N (not COALESCE) so user can explicitly clear the price field to NULL"
    - "Single division-by-100 site — formatCurrency is the only place / 100 is allowed in the entire codebase"
    - "Content-shape migration tests — readFileSync assertions verify SQL file shape and lib.rs registration without running SQLite in jsdom"

key-files:
  created:
    - src-tauri/migrations/006_spend_pence.sql
    - src/lib/formatCurrency.ts
  modified:
    - src-tauri/src/lib.rs
    - src/types/unit.ts
    - src/types/paint.ts
    - src/db/queries/units.ts
    - src/db/queries/paints.ts
    - tests/spending/migration005.test.ts
    - tests/spending/formatCurrency.test.ts
    - tests/dashboard/computeStats.test.ts
    - tests/dashboard/DashboardPage.test.tsx

key-decisions:
  - "Migration is version 6 (not 5) — Phase 13 inserted hobby_journal as version 5 after this plan was written; spend_pence becomes version 6 (006_spend_pence.sql)"
  - "Migration file named 006_spend_pence.sql; test file remains migration005.test.ts (Wave 0 stub name preserved) with a comment explaining the numbering"
  - "Pitfall 1 applied to both updateUnit and updatePaint — purchase_price_pence uses unconditional = $N assignment (never COALESCE) so explicit NULL clears work correctly"
  - "Other test fixtures referencing purchase_price (UnitDeleteDialog, StatusPopover, unitFilters, UnitGallery, UnitTable, KanbanBoard, KanbanCard, kanbanUtils, usePaints, useUnits, PaintCombobox, recipeSteps, applyPaintFilters) are flagged for Plan 14-02 — not fixed in this plan as they are production call site changes"

patterns-established:
  - "formatCurrency(pence, locale='en-GB', currency='GBP'): string — the only div/100 in codebase"
  - "Unconditional assignment for price fields in UPDATE: purchase_price_pence = $N (no COALESCE)"

requirements-completed: [SPEND-05]

# Metrics
duration: 9min
completed: 2026-05-04
---

# Phase 14 Plan 01: Data Foundation Summary

**SQLite integer-pence storage contract established via migration 006, formatCurrency as the single div-by-100 utility, Unit/Paint TypeScript types updated, and DB query modules wired — unblocking Plans 14-02 (forms) and 14-03 (SpendingPage) in parallel**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-04T07:01:44Z
- **Completed:** 2026-05-04T07:10:51Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Created 006_spend_pence.sql adding purchase_price_pence INTEGER to units and paints tables, with ROUND*100 UPDATE for existing REAL values, registered as version 6 in lib.rs
- Created src/lib/formatCurrency.ts (the single division-by-100 site): null/undefined → "—", integer pence → en-GB/GBP string, custom locale/currency supported
- Renamed Unit.purchase_price → Unit.purchase_price_pence; added Paint.purchase_price_pence; wired both createUnit/updateUnit and createPaint/updatePaint to the new column with Pitfall 1 unconditional assignment in UPDATE
- Flipped 9 Wave-0 test stubs from it.skip to real passing assertions (5 migration content-shape + 4 formatCurrency) and renamed dashboard u() builder fixtures to match the new Unit type

## Task Commits

1. **Task 1: Migration 006 SQL + lib.rs registration + migration005 test stubs** - `645f721` (feat)
2. **Task 2: formatCurrency utility + formatCurrency test stubs** - `c52d831` (feat)
3. **Task 3: Unit/Paint types, DB queries, dashboard fixtures** - `9f0e016` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src-tauri/migrations/006_spend_pence.sql` - Migration adding purchase_price_pence INTEGER to units and paints with REAL→pence UPDATE
- `src-tauri/src/lib.rs` - Version 6 spend_pence entry added to get_migrations()
- `src/lib/formatCurrency.ts` - Integer-pence to formatted currency string (single div-by-100 site)
- `src/types/unit.ts` - purchase_price (REAL) renamed to purchase_price_pence (INTEGER)
- `src/types/paint.ts` - purchase_price_pence: number | null added (additive, before created_at)
- `src/db/queries/units.ts` - createUnit INSERT + updateUnit SET wired to purchase_price_pence; unconditional $18 in SET (Pitfall 1)
- `src/db/queries/paints.ts` - createPaint INSERT gains $11 purchase_price_pence; updatePaint gains unconditional $12 (Pitfall 1)
- `tests/spending/migration005.test.ts` - 5 it.skip stubs flipped to readFileSync content-shape assertions (tests 006_spend_pence.sql + version 6)
- `tests/spending/formatCurrency.test.ts` - 4 it.skip stubs flipped to real formatCurrency assertions
- `tests/dashboard/computeStats.test.ts` - u() builder fixture: purchase_price → purchase_price_pence
- `tests/dashboard/DashboardPage.test.tsx` - u() builder fixture: purchase_price → purchase_price_pence

## Decisions Made
- Migration version 6 (not 5): Phase 13 hobby_journal migration was inserted as version 5 after this plan was written. The spend_pence migration is version 6 registered as 006_spend_pence.sql. Test file name (migration005.test.ts) preserved from Wave 0 stub with an explanatory comment.
- Pitfall 1 applied in both updateUnit and updatePaint: purchase_price_pence uses unconditional `= $N` (not COALESCE) so setting price to null explicitly works correctly.
- formatCurrency defaults en-GB/GBP; accepts locale/currency args for future settings page compatibility (open-closed principle).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration version number adjusted from 5 to 6**
- **Found during:** Task 1 (reading lib.rs)
- **Issue:** The plan assumed version 4 was the last migration in lib.rs. However Phase 13 (hobby_journal) was already registered as version 5 with 005_hobby_journal.sql. Creating a second version 5 would cause a migration conflict in tauri-plugin-sql.
- **Fix:** Created 006_spend_pence.sql (not 005), registered as version 6 in lib.rs. Updated the test file to reference 006_spend_pence.sql and assert `version: 6`. Describe block names preserved verbatim from Wave 0 stubs. Comment added explaining the naming.
- **Files modified:** src-tauri/migrations/006_spend_pence.sql, src-tauri/src/lib.rs, tests/spending/migration005.test.ts
- **Verification:** All 5 migration005 tests pass; hobby_journal migration005 tests still pass (version 5 check still correct)
- **Committed in:** 645f721 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — version number collision with Phase 13 hobby_journal)
**Impact on plan:** Necessary correctness fix. SQL migration constraint violation would have broken the Tauri app startup. No scope creep.

## Issues Encountered
- Additional test fixtures referencing the old `purchase_price` field were found beyond the two dashboard fixtures planned (Step 3.6): `tests/army-list/UnitDeleteDialog.test.tsx`, `tests/collection/StatusPopover.test.tsx`, `tests/collection/unitFilters.test.ts`, `tests/collection/UnitGallery.test.tsx`, `tests/collection/UnitTable.test.tsx`, `tests/foundation/usePaints.test.ts`, `tests/foundation/useUnits.test.ts`, `tests/painting/KanbanBoard.test.tsx`, `tests/painting/KanbanCard.test.tsx`, `tests/painting/kanbanUtils.test.ts`, `tests/painting/PaintCombobox.test.tsx`, `tests/painting/recipeSteps.test.ts`, `tests/paint-inventory/applyPaintFilters.test.ts`. These are production call-site fixtures handled by Plan 14-02. Per the plan spec, these are flagged but NOT fixed here. All 254 vitest tests still pass (vitest doesn't run tsc).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 14-02 (unit/paint form integration) and Plan 14-03 (SpendingPage) are now unblocked and can run in parallel
- Plan 14-02 must fix the production call sites in UnitSheet.tsx, UnitDetailSheet.tsx, PaintSheet.tsx, unitSchema.ts, and all test fixtures listed above
- pnpm test exits 0 (254 passed, 23 skipped); pnpm tsc --noEmit has expected type errors at production call sites that Plan 14-02 resolves

---
*Phase: 14-spending-tracker*
*Completed: 2026-05-04*
