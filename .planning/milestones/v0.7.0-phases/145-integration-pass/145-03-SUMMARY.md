---
phase: 145-integration-pass
plan: "03"
subsystem: recipes/techniques
tags: [intg-03, intg-04, assignment-checklist, slot-resolution, technique-badge]
dependency_graph:
  requires: [145-01]
  provides: [INTG-03, INTG-04]
  affects: [AssignmentChecklist, ChecklistStepRow, SectionedTimeline]
tech_stack:
  added: []
  patterns:
    - effectivePaintId(step, slotMap) as single resolution spine in AssignmentChecklist
    - useSlotResolutionMap called once at component level (never per-row)
    - resolvedPaint(step) closure from slotMap + paintsById
key_files:
  created:
    - tests/techniques/AssignmentChecklist.test.tsx
  modified:
    - src/features/recipes/AssignmentChecklist.tsx
    - src/features/recipes/ChecklistStepRow.tsx
    - tests/painting/sectionedTimeline.test.tsx
    - tests/applied-recipes/assignmentChecklist.test.tsx
decisions:
  - useSlotResolutionMap called once at AssignmentChecklist component level — avoids N+1 hook pattern
  - ChecklistStepRow guards simplified to !!paint — parent provides already-resolved paint
  - INTG-04 Log Session: no code change — technique sections are real recipe_sections in DB
metrics:
  duration_minutes: 45
  completed_date: "2026-06-22"
  tasks_completed: 3
  files_changed: 5
---

# Phase 145 Plan 03: Integration Pass — Checklist Resolution + INTG-04 Coverage Summary

Wire effectivePaintId into AssignmentChecklist so technique-owned steps resolve their paint correctly via slotMap (per-unit checklist no longer empty for technique steps), guard ChecklistStepRow on resolved paint not step.paint_id, and prove INTG-04: TechniqueSectionBadge already wired in SectionedTimeline + Log Session needs no code change.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | AssignmentChecklist + ChecklistStepRow — resolve via effectivePaintId | 85a52656 |
| 2 | INTG-03 AssignmentChecklist component test | b3d62bb8 |
| 3 | INTG-04 coverage — SectionedTimeline badge test + Log Session assertion | 5251cbc1 |

## What Was Built

### Task 1: AssignmentChecklist + ChecklistStepRow

`AssignmentChecklist.tsx` now imports `useSlotResolutionMap` and `effectivePaintId`. A single `const { data: slotMap = new Map() } = useSlotResolutionMap(recipeId)` call at component level feeds a `resolvedPaint(step)` closure that routes technique steps through the slotMap and plain steps through `step.paint_id` (FND-04 fallback). All three render sites (orphan steps, sectioned accordion, flat list) use `paint={resolvedPaint(step)}`.

`ChecklistStepRow.tsx`: two guards changed — `hasDetail` drops `step.paint_id !== null &&` (was `(step.paint_id !== null && !!paint) ||`, now `!!paint ||`), and the swatch block drops `step.paint_id !== null &&` (was `{step.paint_id !== null && paint && (`, now `{paint && (`). The parent provides already-resolved paint; the row has no knowledge of where it came from.

### Task 2: INTG-03 test

New `tests/techniques/AssignmentChecklist.test.tsx` with 4 RTL tests:
- Technique step row appears (list not empty)
- Slot-resolved paint name shows when slot is filled (user must expand collapsible)
- Technique step with unfilled slot still renders (no swatch)
- Plain step's paint still shows (FND-04 fallback)

Also fixed `tests/applied-recipes/assignmentChecklist.test.tsx` to mock `useSlotResolutionMap` (Rule 1 — component now calls the hook so existing test broke without QueryClient).

### Task 3: INTG-04 SectionedTimeline badge coverage

Added 3-case INTG-04 describe block to `tests/painting/sectionedTimeline.test.tsx`:
- Badge "from NMM Gold" renders when `techniqueSectionInfoMap` entry exists
- No badge on plain-recipe path (map absent)
- No badge for section not in map

Log Session: documented as no-code-needed — technique sections are real `recipe_sections` rows in the DB surfaced by `useRecipeSections`. PaintingSessionSheet's scalar `sectionName` prop path is covered by existing `logSessionSheet.test.tsx` coverage (RESEARCH A1 verified).

## Verification

- `npx tsc --noEmit` — clean
- `pnpm test` — 3051 passing (baseline 3044 + 7 new: 4 INTG-03 + 3 INTG-04)
- No `step.paint_id` reads remain in AssignmentChecklist (0 matches)
- No `step.paint_id` guards in ChecklistStepRow (0 matches)
- `useSlotResolutionMap(recipeId)` count: 1 in AssignmentChecklist
- `paint={resolvedPaint(step)}` count: 3 in AssignmentChecklist (all three sites)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing assignmentChecklist test broken by new useSlotResolutionMap hook call**
- **Found during:** Task 2 (first test run)
- **Issue:** AssignmentChecklist now calls useSlotResolutionMap which calls useQuery. The existing test at `tests/applied-recipes/assignmentChecklist.test.tsx` mocked all other hooks but not useSlotResolutionMap, causing "No QueryClient set" error
- **Fix:** Added `vi.mock("@/hooks/useSlotResolutionMap", ...)` returning empty Map to the existing test
- **Files modified:** tests/applied-recipes/assignmentChecklist.test.tsx
- **Commit:** b3d62bb8

**2. [Rule 1 - Bug] Wrong Unit type shape in new INTG-03 test**
- **Found during:** Task 3 (TypeScript check)
- **Issue:** mockUnit used wrong field names (subfaction_id, status_paint, recipe_id, points_cost, unit_datasheet_id) — Unit interface has different schema
- **Fix:** Rebuilt mockUnit with correct fields from src/types/unit.ts
- **Files modified:** tests/techniques/AssignmentChecklist.test.tsx
- **Commit:** 5251cbc1

**3. [Rule 1 - Bug] import statement inside describe block (parse error)**
- **Found during:** Task 3 (first sectionedTimeline test run)
- **Issue:** `import type { TechniqueSectionInfo }` was placed inside the file body after describe blocks via Edit tool, but esbuild requires import declarations at module level
- **Fix:** Added the import to the top-level imports block and removed the inline duplicate; used Bash append to avoid em-dash encoding corruption from Edit tool
- **Files modified:** tests/painting/sectionedTimeline.test.tsx

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Changes are UI component and test layer only.

## Self-Check

### Created files exist:
- [x] tests/techniques/AssignmentChecklist.test.tsx — FOUND
- [x] tests/painting/sectionedTimeline.test.tsx (modified) — FOUND

### Commits exist:
- [x] 85a52656 — feat(145-03): resolve technique steps via effectivePaintId
- [x] b3d62bb8 — test(145-03): INTG-03 AssignmentChecklist — technique step list not empty
- [x] 5251cbc1 — test(145-03): INTG-04 SectionedTimeline badge coverage

### INTG-03 must-haves:
- [x] useSlotResolutionMap called once at component level
- [x] All 3 render sites use resolvedPaint(step)
- [x] No step.paint_id reads in AssignmentChecklist
- [x] ChecklistStepRow gates on !!paint not step.paint_id
- [x] Technique step list not empty — proven by test

### INTG-04 must-haves:
- [x] SectionedTimeline badge renders for technique sections — proven by test
- [x] Log Session: no code change — documented

## Self-Check: PASSED
