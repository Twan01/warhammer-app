---
phase: 136-code-honesty-decomposition
plan: "01"
subsystem: units / rules-hub / unit-database
tags: [refactor, dedup, weapon-table, hon-08, regression-test]
dependency_graph:
  requires: []
  provides: [shared-weapon-table-HON-08]
  affects: [src/features/units/WeaponTable.tsx, src/features/rules-hub/DatasheetPointsTab.tsx, src/features/unit-database/UdbDatasheetSheet.tsx]
tech_stack:
  added: []
  patterns: [single-canonical-component, behavior-preserving-dedup]
key_files:
  created: []
  modified:
    - src/features/units/WeaponTable.tsx
    - src/features/rules-hub/DatasheetPointsTab.tsx
    - src/features/unit-database/UdbDatasheetSheet.tsx
    - tests/units/WeaponTable.test.tsx
  deleted:
    - src/features/unit-database/UdbWeaponsTable.tsx
decisions:
  - "D-01: canonical = units/WeaponTable.tsx; UdbWeaponsTable deleted; DatasheetPointsTab shadow deleted"
  - "D-02: consumers migrated one at a time; EN/FR parity maintained via query-layer COALESCE"
  - "D-03: div-grid preserved; semantic table a11y (IN-010) deferred"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-17"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 4
  files_deleted: 1
---

# Phase 136 Plan 01: HON-08 Shared WeaponTable Summary

**One-liner:** Single canonical `WeaponTable` (Rng label, range `"` suffix, skill `+` guard, composite key, non-italic keywords, no header bg) with `UdbWeaponsTable` deleted and shadow copy in `DatasheetPointsTab` removed, regression-locked by 19 tests.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Lock WeaponTable render contract with regression test | `72a11533` | `tests/units/WeaponTable.test.tsx` |
| 2 | Replace shadow WeaponTable in DatasheetPointsTab with canonical import | `0f2fd1ea` | `src/features/rules-hub/DatasheetPointsTab.tsx` |
| 3 | Re-point UdbDatasheetSheet to canonical WeaponTable, delete UdbWeaponsTable | `c0f72b5e` | `src/features/unit-database/UdbDatasheetSheet.tsx`, `src/features/unit-database/UdbWeaponsTable.tsx` (deleted) |

---

## Verification Results

- `grep -rn "function WeaponTable" src/` → 1 result (canonical file only)
- `grep -rn "UdbWeaponsTable" src/` → 0 results
- `pnpm test -- tests/units/WeaponTable.test.tsx` → 19/19 tests pass (8 original Phase 110 + 11 new HON-08 lock)
- `pnpm build` → green (strict TypeScript confirms no dangling references)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `UdbWeapon` type import in DatasheetPointsTab**
- **Found during:** Task 2
- **Issue:** After deleting the local `function WeaponTable` that referenced `UdbWeapon`, strict TypeScript flagged `'UdbWeapon' is declared but never used` (TS6196).
- **Fix:** Removed `UdbWeapon` from the `import type { UdbUnitDetail, UdbWeapon }` statement; kept `UdbUnitDetail` which is still used.
- **Files modified:** `src/features/rules-hub/DatasheetPointsTab.tsx`
- **Commit:** `0f2fd1ea` (included in same task commit)

---

## HON-08 Normalization Applied

The following divergences were normalized to the canonical contract (per UI-SPEC):

| Surface | Divergence eliminated |
|---------|----------------------|
| `DatasheetPointsTab.tsx` local shadow | `bg-muted/50` header background removed; skill `+` guard now uses `endsWith("+")` (canonical) not `${w.skill}+` direct |
| `UdbWeaponsTable.tsx` (deleted) | `"Range"` header label, raw `w.range` (no `"` suffix), raw `w.skill` (no `+` guard), scalar `w.id` row key, `italic` keywords |

---

## Known Stubs

None. All weapon data flows from pre-resolved query props; no hardcoded placeholders introduced.

---

## Threat Flags

None. Pure presentational component dedup; no new network endpoints, auth paths, file access patterns, or schema changes.

---

## Self-Check: PASSED

- `src/features/units/WeaponTable.tsx` exists: FOUND
- `tests/units/WeaponTable.test.tsx` exists: FOUND
- `src/features/unit-database/UdbWeaponsTable.tsx` deleted: CONFIRMED (exit code 0 on `test ! -f`)
- Commits exist: `72a11533`, `0f2fd1ea`, `c0f72b5e` all confirmed in git log
