---
phase: 14-spending-tracker
plan: "04"
subsystem: testing
tags: [tauri, sqlite, spending, smoke-test, manual-qa, ipc]

# Dependency graph
requires:
  - phase: 14-spending-tracker
    provides: "Plans 14-00 through 14-03 — all feature code: migration 006, formatCurrency, purchase_price_pence on units + paints, SpendingPage, sidebar nav, cache invalidation"
provides:
  - "End-to-end manual sign-off: SPEND-01 through SPEND-05 all verified in live Tauri + SQLite app"
  - "Pitfall 1 (unconditional UPDATE / clear-to-NULL) verified end-to-end"
  - "Pitfall 2 (cross-page cache invalidation without restart) verified end-to-end"
  - "Phase 14 closed — spending tracker feature ship-gated and approved"
affects:
  - 15-warhammer-40k-datasheet
  - 16-design-overhaul

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Manual Nyquist checkpoint pattern: pure verification plan with no file modifications (mirrors 11-03, 18-03)"
    - "Seven-step smoke-test table covering DB schema, round-trip pence storage, NULL clearing, cache invalidation, and skeleton loading"

key-files:
  created: []
  modified: []

key-decisions:
  - "No code changes in this plan — pure verification checkpoint; all feature code shipped in 14-01 through 14-03"
  - "User confirmed Pitfall 1 (unconditional UPDATE) via live clear-and-save: price resets to — not retained via COALESCE"
  - "User confirmed Pitfall 2 (cache invalidation) via live edit-and-revisit: Spending page updates without app restart"

patterns-established:
  - "Pure manual smoke-test plan: files_modified: [], single checkpoint:human-verify task, 7-step verification table"

requirements-completed:
  - SPEND-01
  - SPEND-02
  - SPEND-03
  - SPEND-04
  - SPEND-05

# Metrics
duration: checkpoint (async — user ran live Tauri app)
completed: "2026-05-04"
---

# Phase 14 Plan 04: Spending Tracker Manual Smoke-Test Summary

**All 7 smoke-test steps PASS in live Tauri + SQLite app — SPEND-01..05 closed end-to-end; Pitfall 1 (unconditional NULL clear) and Pitfall 2 (cross-page cache invalidation) both verified**

## Performance

- **Duration:** Async user-driven checkpoint
- **Started:** 2026-05-04 (checkpoint issued after 14-03 commit)
- **Completed:** 2026-05-04
- **Tasks:** 1 (checkpoint:human-verify)
- **Files modified:** 0

## Accomplishments

- All 7 manual smoke-test steps verified PASS in the live Tauri desktop app
- SPEND-01 through SPEND-05 requirements confirmed end-to-end (real SQLite IPC, real DB round-trips, real page navigation)
- Pitfall 1 (clear price → NULL, not COALESCE-retained) verified by clearing the field and confirming "—" display
- Pitfall 2 (cache invalidation fires on /spending revisit without restart) verified by editing a unit price and returning to /spending
- Phase 14 complete — spending tracker feature ship-gated with user sign-off

## Smoke-Test Results

| Step | Req | Result | Notes |
|------|-----|--------|-------|
| 1 | SPEND-05 | PASS | No migration errors; `purchase_price_pence INTEGER` column present on both `units` and `paints` tables |
| 2 | SPEND-01 | PASS | Unit price 1250 saves and reloads as £12.50 in UnitDetailSheet Details tab |
| 3 | SPEND-01 + Pitfall 1 | PASS | Clearing price field saves as NULL, displays "—" — unconditional UPDATE confirmed (no COALESCE retention) |
| 4 | SPEND-02 | PASS | Paint price 450 saves and persists in PaintSheet after reopen |
| 5 | SPEND-03 + SPEND-04 + Pitfall 2 | PASS | Spending nav visible (Wallet icon between Paints and Army Lists); hero card + faction breakdown + Paints row; cache invalidation works on revisit without restart |
| 6 | SPEND-04 owned filter | PASS | Paints row excludes owned=0 paints; includes owned=1 paints — `WHERE owned = 1` SQL filter verified end-to-end |
| 7 | SPEND-05 visual | PASS | Skeleton loading state renders; smooth transition to populated state; no crashes, no console errors |

## Task Commits

This plan modifies no source files — it is a pure verification checkpoint.

**Prior feature commits (Plans 14-00 through 14-03):**
- `e5abb9c` – `test(14-00)`: Wave 0 stub for formatCurrency
- `f5681de` – `test(14-00)`: Wave 0 stub for computeSpendingStats
- `0a63dbb` – `test(14-00)`: Wave 0 stub for migration005 content tests
- `3b1f107` – `test(14-00)`: Wave 0 stub for SPENDING_STATS_KEY contract
- `18bc9ec` – `test(14-00)`: Wave 0 stub for SpendingPage component
- `a152d22` – `test(14-00)`: Wave 0 stub for unitSchema pence field
- `9cbcca5` – `test(14-00)`: Wave 0 stub for paintSchema pence field
- `50bdfc8` – `docs(14-00)`: complete Wave 0 stubs plan
- `645f721` – `feat(14-01)`: migration 006 spend_pence + register version 6
- `c52d831` – `feat(14-01)`: formatCurrency utility
- `9f0e016` – `feat(14-01)`: purchase_price_pence types + DB queries + fixtures
- `28474b6` – `docs(14-01)`: complete data-foundation plan
- `7b69473` – `feat(14-02)`: UnitSheet purchase_price_pence form field
- `190ad95` – `feat(14-02)`: PaintSheet purchase_price_pence + UnitDetailSheet fix
- `7437641` – `feat(14-02)`: spending-stats cache invalidation on all 6 mutation hooks
- `d90a361` – `docs(14-02)`: complete form layer integration plan
- `8340467` – `feat(14-03)`: spending query + computeSpendingStats + useSpendingStats
- `e135951` – `feat(14-03)`: SpendingPage component + route wrapper
- `c2513f9` – `feat(14-03)`: register /spending route + sidebar nav entry
- `6a70ba5` – `docs(14-03)`: complete SpendingPage plan

## Files Created/Modified

No files modified in this plan. All feature files shipped in Plans 14-01 through 14-03:

- `src-tauri/migrations/006_spend_pence.sql` — purchase_price_pence column on units + paints tables
- `src/lib/formatCurrency.ts` — Intl.NumberFormat pence-to-£ formatter (single division-by-100 site)
- `src/types/unit.ts` — purchase_price_pence field
- `src/types/paint.ts` — purchase_price_pence field
- `src/db/queries/units.ts` + `paints.ts` — unconditional UPDATE assignment (Pitfall 1 fix)
- `src/features/units/UnitSheet.tsx` — Purchase Price field with correct label/placeholder/helper
- `src/features/units/UnitDetailSheet.tsx` — formatCurrency display in Details tab
- `src/features/paints/PaintSheet.tsx` — Purchase Price field before SheetFooter
- `src/hooks/useUnits.ts` + `usePaints.ts` — invalidate ["spending-stats"] on all mutations (Pitfall 2)
- `src/db/queries/spending.ts` — getSpendingStats() parallel SELECT
- `src/features/spending/computeSpendingStats.ts` — pure aggregation function
- `src/hooks/useSpendingStats.ts` — TanStack Query hook with SPENDING_STATS_KEY
- `src/features/spending/SpendingPage.tsx` — hero card + breakdown table + skeleton loading
- `src/app/spending/page.tsx` — thin route wrapper
- `src/app/router.tsx` — /spending route registered
- `src/components/common/AppSidebar.tsx` — Spending nav entry with Wallet icon

## Decisions Made

- No code changes required during this plan — all 7 steps passed first attempt with no deviations
- Pitfall 1 and Pitfall 2 architectural decisions (established in Plan 14-01/14-02) validated by live testing

## Deviations from Plan

None — plan executed exactly as written. All 7 smoke-test steps passed without requiring any code changes.

## Issues Encountered

None — no console errors, no migration errors, no IPC failures, no cache invalidation misses observed during smoke test.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 14 is complete. The spending tracker feature is fully shipped and verified end-to-end:
- SPEND-01 through SPEND-05 all closed
- Pitfall 1 (unconditional NULL clear) and Pitfall 2 (cross-page cache invalidation) both verified
- No regressions — all ~32 automated Phase 14 tests pass alongside earlier suite

**Recommended next steps (in priority order):**
1. Phase 15 — Warhammer 40K Datasheet Integration (data enrichment from Wahapedia)
2. Phase 16 — Design Overhaul (visual polish and typography)
3. Run `/gsd:verify-work` before advancing to next phase

---
*Phase: 14-spending-tracker*
*Completed: 2026-05-04*
