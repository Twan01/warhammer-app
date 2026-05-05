---
phase: 35-v2.2-gap-closure
verified: 2026-05-05T21:45:00Z
status: passed
score: 4/4 must-haves verified
---

# Phase 35: v2.2 Gap Closure Verification Report

**Phase Goal:** Close 4 low-severity tech debt items from the v2.2 milestone audit -- timezone safety, form field wiring, and cache invalidation completeness
**Verified:** 2026-05-05T21:45:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | BattleLogSheet defaults today's date using local timezone (not UTC) | VERIFIED | Line 40 imports `todayISO` from `@/lib/dates`; lines 49 and 84 call it; local `todayIso()` function deleted (grep confirms 0 matches); `dates.ts` uses `getFullYear/getMonth/getDate` (local timezone) |
| 2 | Deleting a painting session invalidates goal-progress cache | VERIFIED | `useJournalSessions.ts` line 79: `qc.invalidateQueries({ queryKey: ["goal-progress"] })` in `onSettled` of `useDeletePaintingSession`; symmetric with `useCreatePaintingSession` line 43 |
| 3 | Updating a unit invalidates army-lists cache | VERIFIED | `useUnits.ts` line 56: `qc.invalidateQueries({ queryKey: ["army-lists"] })` in `onSuccess` of `useUpdateUnit` |
| 4 | PaintSheet purchase_date form field saves user-entered dates to the database | VERIFIED | Zod schema has `purchase_date` field (paintSchema.ts:30); DEFAULT_VALUES includes it (PaintSheet.tsx:53); buildDefaultValues populates from existing paint (line 71); payload uses `values.purchase_date || null` (line 107); JSX date input field rendered (lines 370-387); old hardcoded null removed |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/battle-log/BattleLogSheet.tsx` | todayISO import from @/lib/dates replacing local UTC helper | VERIFIED | Import on line 40; local function deleted; two call sites on lines 49, 84 |
| `src/hooks/useJournalSessions.ts` | goal-progress cache invalidation on delete | VERIFIED | Line 79 in onSettled callback |
| `src/hooks/useUnits.ts` | army-lists cache invalidation on unit update | VERIFIED | Line 56 in onSuccess callback |
| `src/features/paints/PaintSheet.tsx` | purchase_date wired from form to mutation payload | VERIFIED | DEFAULT_VALUES (line 53), buildDefaultValues (line 71), payload (line 107), JSX FormField (lines 370-387) |
| `src/features/paints/paintSchema.ts` | purchase_date field in Zod schema | VERIFIED | Line 30: YYYY-MM-DD regex, optional, nullable |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BattleLogSheet.tsx` | `src/lib/dates.ts` | `import { todayISO }` | WIRED | Line 40: `import { todayISO } from "@/lib/dates"` |
| `useJournalSessions.ts` | goal-progress query | `queryKey: ["goal-progress"]` invalidation | WIRED | Line 79 in onSettled; matches useCreatePaintingSession pattern on line 43 |
| `useUnits.ts` | army-lists query | `queryKey: ["army-lists"]` invalidation | WIRED | Line 56 in onSuccess; comment explains army list COALESCE chain dependency |
| `PaintSheet.tsx` | `paintSchema.ts` | purchase_date field in schema and form | WIRED | Schema declares field (line 30); form reads via zodResolver; payload writes `values.purchase_date` (line 107) |

### Requirements Coverage

No formal requirements for this phase -- it addresses tech debt only. All v2.2 requirements were already satisfied prior to this phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected in any of the 5 modified files |

All "placeholder" grep hits are legitimate HTML `placeholder` attributes on form inputs, not stub indicators.

### Human Verification Required

None required. All 4 fixes are verifiable via code inspection:
- Timezone fix: import source and function signature confirm local-timezone arithmetic
- Cache invalidations: query key strings are exact matches to existing patterns
- Form field wiring: complete data flow from Zod schema through form state to mutation payload is traceable in code

### Gaps Summary

No gaps found. All 4 tech debt items are closed:
1. BattleLogSheet timezone safety -- local UTC helper replaced with shared `todayISO()` from `@/lib/dates`
2. Cache invalidation symmetry -- `useDeletePaintingSession` now invalidates `goal-progress` (matching `useCreatePaintingSession`)
3. Cache invalidation completeness -- `useUpdateUnit` now invalidates `army-lists`
4. PaintSheet purchase_date -- form field added with Zod validation, wired through to mutation payload

Commits verified: `24bf73f` (3 files, 6 insertions, 6 deletions) and `d1c2550` (2 files, 23 insertions, 1 deletion).

---

_Verified: 2026-05-05T21:45:00Z_
_Verifier: Claude (gsd-verifier)_
