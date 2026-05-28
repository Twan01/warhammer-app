---
phase: 100-query-layer-automation
plan: "02"
subsystem: query-layer, painting-automation
tags: [tdd, assembly-derivation, override-guards, is_active_project, section_type, sync]
dependency_graph:
  requires: [override-columns-schema, section-types-extended, unit-override-types]
  provides: [syncDerivedStatuses-automation, is_active_project-lifecycle, assembly-derivation]
  affects: [src/db/queries/recipeAssignments.ts, tests/painting/syncDerivedStatuses.test.ts, tests/painting/recipeAssignments.test.ts]
tech_stack:
  added: []
  patterns: [case-when-override-guard, dual-path-section-type, tdd-red-green, silent-background-error]
key_files:
  created:
    - tests/painting/syncDerivedStatuses.test.ts
  modified:
    - src/db/queries/recipeAssignments.ts
    - tests/painting/recipeAssignments.test.ts
decisions:
  - Override guard uses null params + CASE WHEN $N IS NOT NULL pattern — null bypasses write, preserving current DB value
  - Assembly/basing/varnish kept as separate query pairs (clarity over consolidation per plan discretion note)
  - Derivation failures are caught and console.error only — no toast for background automation
  - is_active_project auto-SET only in createAssignment/bulkCreateAssignments; auto-CLEAR only in syncDerivedStatuses at pct=100
metrics:
  duration: "~30 minutes"
  completed: "2026-05-28"
  tasks: 2
  files_created: 1
  files_modified: 2
---

# Phase 100 Plan 02: Core Automation Summary

syncDerivedStatuses fully rewritten with assembly auto-derivation, section_type-first matching with name-LIKE backward-compat fallback, CASE WHEN override guards for all three status fields, is_active_project lifecycle (auto-set on recipe assign, auto-clear at 100%), and 50 test cases covering every derivation path.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Create syncDerivedStatuses Test File | b2f4466 | tests/painting/syncDerivedStatuses.test.ts, export in recipeAssignments.ts |
| 2 (GREEN) | Implement syncDerivedStatuses Automation + is_active_project Lifecycle | e89f1c0 | recipeAssignments.ts, recipeAssignments.test.ts (APL-01 tests added) |

## TDD Gate Compliance

RED commit: `b2f4466` — `test(100-02)` — 20 failing tests covering all derivation paths
GREEN commit: `e89f1c0` — `feat(100-02)` — implementation makes all 50 tests pass

## What Was Built

### syncDerivedStatuses() — full rewrite

**Before:** 2 SELECTs + 1 UPDATE, basing/varnish name-LIKE only, no assembly, no override guards

**After:** 8 SELECTs + 1 UPDATE with:
1. Initial SELECT reads `painting_percentage, status_assembly_override, status_basing_override, status_varnished_override` in one round-trip (D-01)
2. Assembly derivation block: `section_type = 'assembly' OR (section_type IS NULL AND LOWER(sec.name) LIKE '%assembly%')` (SAD-01, D-06)
3. Basing dual-path: `section_type = 'basing' OR (section_type IS NULL AND LOWER(sec.name) LIKE '%basing%')` (SAD-02, D-07)
4. Varnish dual-path: same pattern with `'varnish'` (SAD-02, D-07)
5. Override guards: `const assembly = !override ? derived : null` — null = CASE WHEN preserves DB value (SAD-04, D-01/D-03)
6. Final UPDATE: `CASE WHEN $3 IS NOT NULL THEN $3 ELSE status_assembly END` for each status field
7. is_active_project auto-clear: `CASE WHEN $6 = 1 THEN 0 ELSE is_active_project END` — fires only at pct=100 (APL-02, D-09)
8. Silent failure: entire body wrapped in try/catch, errors go to console.error

### createAssignment() — extended

Added `UPDATE units SET is_active_project = 1` after INSERT, before syncPaintingPercentageByUnitId (APL-01, D-08)

### bulkCreateAssignments() — extended

Same UPDATE per unitId in loop body — changes execute call count from 2→3 per unit (APL-01, D-08)

## Test Coverage

`tests/painting/syncDerivedStatuses.test.ts` (20 tests):
- SAD-01: assembly complete (1) / incomplete (0) / no sections (0)
- SAD-01: section_type='assembly' dual-path clause verified in SELECT SQL
- SAD-02: basing section_type dual-path + section_type IS NULL fallback
- SAD-02: varnish section_type dual-path + section_type IS NULL fallback
- SAD-04: assembly override=1 → param is null; basing override=1 → param is null; varnished override=1 → param is null; all=0 → all non-null
- APL-02: pct=100 → $6=1 (clear trigger); pct=75 → $6=0; pct=0 → $6=0
- APL-03: no UPDATE SQL contains 'is_active_project = 1'; CASE WHEN pattern verified
- Early exits: no unit row, no assignments

`tests/painting/recipeAssignments.test.ts` additions (3 tests, 50 total):
- APL-01: createAssignment executes SQL with 'is_active_project = 1'
- APL-01: bulkCreateAssignments executes is_active_project = 1 for each unitId
- Fixed: toHaveBeenCalledTimes 6→9 for 3 unitIds (3 INSERTs + 3 APL-01 UPDATEs + 3 syncs)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict-mode rejected destructure pattern in test map callbacks**
- **Found during:** Task 2 — first `pnpm build` after creating test file
- **Issue:** `mock.calls.map(([sql]: [string]) => sql)` fails strict TypeScript because `mock.calls` is `any[][]` and `[string]` is a tuple type with exactly 1 element. TypeScript reports "Target requires 1 element(s) but source may have fewer."
- **Fix:** Replaced all occurrences with `mock.calls.map((call) => call[0] as string)`. Also fixed `mockDb` cast from `as Parameters<...>[0]` to `as unknown as Parameters<...>[0]` to satisfy `Database` type overlap check.
- **Files modified:** `tests/painting/syncDerivedStatuses.test.ts`, `tests/painting/recipeAssignments.test.ts`
- **Commit:** e89f1c0 (included in Task 2)

## Known Stubs

None — no placeholder data or hardcoded stubs introduced.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns. All SQL uses positional $N params. Override flags are read from DB (not user input) before being evaluated. Threat T-100-03 mitigated: all queries use positional $N params; no string interpolation. T-100-04 accepted: is_active_project auto-set is unconditional on assign. T-100-05 accepted: 8 SELECTs + 1 UPDATE per sync is acceptable for single-unit desktop context.

## Self-Check: PASSED

- `tests/painting/syncDerivedStatuses.test.ts` — EXISTS, 20 test cases, 167 lines
- `src/db/queries/recipeAssignments.ts` — syncDerivedStatuses SELECT includes override flags; assembly/basing/varnish dual-path WHERE clauses present; CASE WHEN $3/$4/$5 IS NOT NULL pattern in UPDATE; is_active_project CASE WHEN $6 = 1 THEN 0 in UPDATE; createAssignment has is_active_project = 1 UPDATE; bulkCreateAssignments has is_active_project = 1 UPDATE per unitId
- Commits b2f4466 and e89f1c0 — EXIST in git log
- `pnpm test -- tests/painting/syncDerivedStatuses.test.ts tests/painting/recipeAssignments.test.ts` — 50/50 PASS
- `pnpm build` — PASSES (no TypeScript errors)
