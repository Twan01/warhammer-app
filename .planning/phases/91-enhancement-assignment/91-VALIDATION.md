---
phase: 91
slug: enhancement-assignment
date: 2026-05-21
---

# Phase 91: Enhancement Assignment - Validation Strategy

## Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| ENH-01 | EnhancementPickerSheet renders list of detachment enhancements | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | tests/army-list/enhancementPickerSheet.test.tsx |
| ENH-01 | Assign button calls useAddEnhancement with correct params | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | tests/army-list/enhancementPickerSheet.test.tsx |
| ENH-01 | Enhancement points appear in list total immediately after assign | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | tests/army-list/enhancementPickerSheet.test.tsx |
| ENH-02 | Assign button disabled when list already has 3 enhancements | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | tests/army-list/enhancementPickerSheet.test.tsx |
| ENH-02 | Assign button disabled for duplicate enhancement name | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | tests/army-list/enhancementPickerSheet.test.tsx |
| ENH-02 | Assign button disabled for Epic Hero (isEpicHero = true) | unit | `pnpm test -- tests/army-list/enhancementPickerSheet.test.tsx` | tests/army-list/enhancementPickerSheet.test.tsx |
| ENH-03 | computeListHealthStats includes enhancementTotal in totalPoints | unit | `pnpm test -- tests/army-list/computeListHealthStats.test.ts` | tests/army-list/computeListHealthStats.test.ts |
| ENH-03 | ArmyListSummaryBar shows enhancement breakdown stat line | unit | `pnpm test -- tests/army-list/enhancementSummaryBar.test.tsx` | tests/army-list/enhancementSummaryBar.test.tsx |
| ENH-03 | pointsExceeded reflects combined unit + enhancement points | unit | `pnpm test -- tests/army-list/computeListHealthStats.test.ts` | tests/army-list/computeListHealthStats.test.ts |

## Sampling Rate

- **Per task commit:** `pnpm test -- tests/army-list/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

## Wave 0 Gaps (to be created during execution)

- [ ] `tests/army-list/enhancementPickerSheet.test.tsx` — covers ENH-01, ENH-02
- [ ] `tests/army-list/computeListHealthStats.test.ts` — covers ENH-03 points math
- [ ] `tests/army-list/enhancementSummaryBar.test.tsx` — covers ENH-03 display

## Existing Coverage (Phase 89)

- `tests/army-list/armyListEnhancements.test.ts` — CRUD query tests (addEnhancement, removeEnhancement, getEnhancementsByList)
- `tests/army-list/armyListHookInvalidations.test.ts` — Hook invalidation tests include enhancement mocks
