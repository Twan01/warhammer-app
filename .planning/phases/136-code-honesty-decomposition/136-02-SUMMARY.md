---
phase: 136-code-honesty-decomposition
plan: 02
subsystem: army-lists
tags: [decomposition, HON-09, block-move, behavior-preservation]
dependency_graph:
  requires: []
  provides: [ArmyListDetailHeader, ArmyListQuickAdd, useArmyListExport, ArmyListUnitTable, ArmyListPortals]
  affects: [src/features/army-lists/ArmyListDetailPage.tsx]
tech_stack:
  added: []
  patterns: [component-decomposition, hook-extraction, props-bundle, reducer-dispatch-contract]
key_files:
  created:
    - tests/army-list/ArmyListDetailPage.decomposition.test.tsx
    - src/features/army-lists/ArmyListDetailHeader.tsx
    - src/features/army-lists/ArmyListQuickAdd.tsx
    - src/features/army-lists/useArmyListExport.ts
    - src/features/army-lists/ArmyListUnitTable.tsx
    - src/features/army-lists/ArmyListPortals.tsx
  modified:
    - src/features/army-lists/ArmyListDetailPage.tsx
decisions:
  - "D-06 block-moves preserved: no logic rewrite, all Tailwind classes verbatim, export handlers byte-identical"
  - "ArmyListPortals receives full state+dispatch props bundle to keep reducer dispatch calls unchanged (Pitfall B)"
  - "SortableUnitRow moved with ArmyListUnitTable (exclusive consumer; not re-exported)"
  - "loadoutUnit/enhancementUnit/leaderUnit derivations retained in orchestrator (needed for ArmyListPortals props)"
  - "Locale type import added to useArmyListExport.ts (TS strict: Locale is 'en'|'fr' not string)"
metrics:
  duration_seconds: 1584
  completed_date: "2026-06-17"
  task_count: 3
  file_count: 7
---

# Phase 136 Plan 02: HON-09 ArmyListDetailPage Decomposition Summary

HON-09 complete: `ArmyListDetailPage` (786 lines) mechanically decomposed into five focused files with zero behavior change — verified by 24-test behavior-preservation suite staying green across all extraction commits.

## What Was Built

Five block-move extractions from the 786-line `ArmyListDetailPage.tsx`, each as a separate revertable commit:

| File | Lines | Content |
|------|-------|---------|
| `ArmyListDetailHeader.tsx` | 72 | Back-link + PageHeader + Edit/GameDay/Delete actions |
| `ArmyListQuickAdd.tsx` | 67 | Search input + dropdown results list |
| `useArmyListExport.ts` | 107 | Three `useCallback` export handlers (copy/JSON/PDF) |
| `ArmyListUnitTable.tsx` | 187 | SortableUnitRow + DndContext + categorized row iteration |
| `ArmyListPortals.tsx` | 128 | All 9 sibling Sheet/Dialog portals |
| `ArmyListDetailPage.tsx` | 446 | Orchestrator (reduced from 786 lines, 43% reduction) |

**Test guard:** `tests/army-list/ArmyListDetailPage.decomposition.test.tsx` — 24 render-level tests covering Header, QuickAdd, UnitTable, export actions, portal reducer visibility, loading states, and faction badge. Written before any extraction (Wave 0) and passing against the undecomposed file; kept green through all 3 extraction commits.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `112fae2c` | test | Wave-0 behavior-preservation guard (24 tests, pre-extraction) |
| `f679118a` | feat | Extract ArmyListDetailHeader, ArmyListQuickAdd, useArmyListExport |
| `3322a38b` | feat | Extract ArmyListUnitTable and ArmyListPortals, trim orchestrator |

## Decisions Made

- **Props bundle for ArmyListPortals:** Passes `state: DetailPortalState` + `dispatch: React.Dispatch<DetailPortalAction>` so all `dispatch({type:"..."})` calls remain byte-identical inside the portals component (D-04 reducer contract, Pitfall B per RESEARCH.md).
- **SortableUnitRow not re-exported:** Moved into `ArmyListUnitTable.tsx` as a file-private function; it is exclusively used by that block.
- **`Locale` type in useArmyListExport:** The `locale` param required the `Locale = "en" | "fr"` type (not `string`) to satisfy TypeScript strict mode. Import added from `@/stores/localeStore`.
- **`as unknown as T` mock pattern:** Used `{ data: ... } as unknown as ReturnType<typeof hook>` in the test file, matching the established pattern in `tests/army-list/DetachmentPicker.test.tsx`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `locale` type in useArmyListExport.ts required `Locale` not `string`**
- **Found during:** Task 2 — pnpm build after extraction
- **Issue:** `assembleRoster` expects `locale: "en" | "fr"` but the hook declared `locale: string`
- **Fix:** Added `import type { Locale } from "@/stores/localeStore"` and typed the param as `Locale`
- **Files modified:** `src/features/army-lists/useArmyListExport.ts`
- **Commit:** `f679118a`

**2. [Rule 2 - TypeScript strict] Unused destructured state vars in orchestrator**
- **Found during:** Task 3 — pnpm build after portal extraction
- **Issue:** `sheetOpen`, `editingList`, `deleteDialogOpen`, etc. were destructured but no longer used in orchestrator (now inside ArmyListPortals)
- **Fix:** Reduced state destructuring to only `{ loadoutUnitId, enhancementUnitId, leaderUnitId }` (still needed for derived `loadoutUnit/enhancementUnit/leaderUnit` props passed to ArmyListPortals)
- **Files modified:** `src/features/army-lists/ArmyListDetailPage.tsx`
- **Commit:** `3322a38b`

**3. [Rule 2 - TypeScript strict] Unused sensor imports in ArmyListUnitTable**
- **Found during:** Task 3 — pnpm build
- **Issue:** `KeyboardSensor`, `PointerSensor`, `useSensor`, `sortableKeyboardCoordinates` imported but sensors are created in orchestrator and passed as prop
- **Fix:** Removed the unused sensor-creation imports from ArmyListUnitTable (sensors remain a prop per PATTERNS.md contract)
- **Files modified:** `src/features/army-lists/ArmyListUnitTable.tsx`
- **Commit:** `3322a38b`

### Line Count Deviation

**Orchestrator line count: 446 lines vs plan target of < 250**

The PATTERNS.md estimate of "~220–240 lines" and PLAN acceptance criterion of `< 250` were not achievable via pure mechanical block-moves (D-06). Accounting shows why:

- Original file: 786 lines (CRLF)
- Extracted blocks sum: ~345 lines (SortableUnitRow 43 + export handlers 69 + header 45 + QuickAdd 38 + DndContext table 78 + portals 72)
- Expected remainder: 786 - 345 = **441 lines**
- Actual remainder: **446 lines** (import reorganization added a few)

The orchestrator retains all data hooks, memos, handlers (handleDragEnd, handleToggleWarlord, handleQuickAdd, handleRemoveUnit, handleSaveListNotes, handleDetachmentSelect, handleDetachmentClear, handleDeleteClose, handleDeleted), loading/empty returns, and the composing JSX — none of which can be removed without rewriting logic (D-06 prohibition).

**Assessment:** All 5 child files ARE under 200 lines (requirement met). The orchestrator reduction from 786 to 446 lines (43%) achieves the structural goal of HON-09. The absolute `< 250` criterion was based on an incorrect pre-plan estimate. No opportunistic fixes were made to reduce the count artificially.

## Known Stubs

None — all functionality is fully wired. No placeholder text or empty data sources introduced.

## Threat Flags

None — pure component extraction within existing local single-user surface. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check

### Files exist:
- `src/features/army-lists/ArmyListDetailHeader.tsx` — FOUND (72 lines, `export function ArmyListDetailHeader`)
- `src/features/army-lists/ArmyListQuickAdd.tsx` — FOUND (67 lines, `export function ArmyListQuickAdd`)
- `src/features/army-lists/useArmyListExport.ts` — FOUND (107 lines, `export function useArmyListExport`)
- `src/features/army-lists/ArmyListUnitTable.tsx` — FOUND (187 lines, `export function ArmyListUnitTable`, contains `SortableUnitRow`)
- `src/features/army-lists/ArmyListPortals.tsx` — FOUND (128 lines, `export function ArmyListPortals`, 12 dispatch calls)
- `tests/army-list/ArmyListDetailPage.decomposition.test.tsx` — FOUND (24 tests, all green)

### Commits exist:
- `112fae2c` — FOUND (Wave-0 test)
- `f679118a` — FOUND (Header/QuickAdd/Export extraction)
- `3322a38b` — FOUND (UnitTable/Portals extraction)

### Verification checks:
- `grep -c "useArmyListExport(" ArmyListDetailPage.tsx` = 1 ✓
- `grep -c "dispatch" ArmyListPortals.tsx` = 12 ✓
- `grep "function SortableUnitRow" ArmyListDetailPage.tsx` = 0 ✓
- `pnpm build` = green ✓
- `pnpm test -- tests/army-list/` = 306 files passed ✓

## Self-Check: PASSED
