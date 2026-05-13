---
phase: 71
type: code-review
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src-tauri/migrations/023_session_section_fk.sql
  - src-tauri/src/lib.rs
  - src/types/paintingSession.ts
  - src/db/queries/paintingSessions.ts
  - src/features/dashboard/logSessionSchema.ts
  - src/features/dashboard/LogSessionSheet.tsx
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 71: Code Review Report

**Reviewed:** 2025-05-13T20:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 71 adds a `recipe_section_id` FK column to `painting_sessions` via migration 023, threads the new field through the TypeScript type layer, query module, Zod schema, and UI form. The migration and Rust registration are correct. The dual-write pattern (FK + denormalized `section_name`) is sound. Two warnings found: the new field bypasses Zod validation at submit time, and `buildDefaultValues` omits the new field creating an inconsistency.

## Warnings

### WR-01: recipe_section_id bypasses Zod validation in onSubmit

**File:** `src/features/dashboard/LogSessionSheet.tsx:182`
**Issue:** The Zod schema defines `recipe_section_id: z.number().int().positive().nullable().optional()`, but the `onSubmit` handler builds the `createSession` payload using `watchedSectionId ?? null` (React state) rather than `values.recipe_section_id` (Zod-validated form values). This means the `.positive()` constraint is never enforced on the value actually sent to the database. If `watchedSectionId` were ever set to `0` or a negative number (e.g., due to a bug in the Select `onValueChange` handler parsing), the invalid value would reach the DB uncaught.

Every other field in the payload correctly uses `values.fieldName` from Zod-validated output. This field is the sole exception.

**Fix:** Either read from validated form values (preferred) or remove the field from the Zod schema since it is not form-controlled. The cleanest approach is to set `recipe_section_id` in the form via `setValue` when the section changes, then read it from `values` in `onSubmit`:

```tsx
// In the section onValueChange handler (line 382-389):
onValueChange={(v) => {
  const numId = v === "__none__" ? null : Number(v);
  setWatchedSectionId(numId);
  ctrl.onChange(/* section_name */);
  form.setValue("recipe_section_id", numId);  // <-- add this
}}

// In onSubmit (line 182):
recipe_section_id: values.recipe_section_id ?? null,  // <-- use validated value
```

### WR-02: buildDefaultValues omits recipe_section_id

**File:** `src/features/dashboard/LogSessionSheet.tsx:72-83`
**Issue:** `buildDefaultValues` explicitly initializes every schema field except `recipe_section_id`. While `recipe_section_id` is `.optional()` in the Zod schema so this does not cause a runtime error, it breaks the established pattern where every form field has an explicit default. If WR-01 is fixed (form tracks `recipe_section_id`), then this omission would mean the field retains stale values across sheet open/close cycles since `form.reset()` on line 123 only resets fields present in the defaults object.

**Fix:**
```tsx
function buildDefaultValues(defaultUnitId?: number): LogSessionFormValues {
  return {
    unit_id: defaultUnitId ?? 0,
    session_date: todayISO(),
    duration_minutes: 30,
    notes: null,
    new_status: null,
    recipe_id: null,
    recipe_step_id: null,
    section_name: null,
    recipe_section_id: null,  // <-- add this
  };
}
```

## Info

### IN-01: No backfill of recipe_section_id for existing sessions

**File:** `src-tauri/migrations/023_session_section_fk.sql:4`
**Issue:** The migration adds the column as nullable but does not backfill existing rows that already have a `section_name` value. Those historical sessions will have `recipe_section_id = NULL` even though a matching `recipe_sections` row may exist. Any analytics query that joins on `recipe_section_id` will exclude these older sessions, which undermines the stated Phase 71 goal of making analytics survive section renames. This is a data completeness gap rather than a correctness bug -- the column is nullable so nothing breaks, but the FK benefit is only realized for sessions logged after this migration.

**Fix:** Consider a one-time backfill in the migration or a separate migration:
```sql
UPDATE painting_sessions
SET recipe_section_id = (
  SELECT rs.id FROM recipe_sections rs
  WHERE rs.recipe_id = painting_sessions.recipe_id
    AND rs.name = painting_sessions.section_name
)
WHERE section_name IS NOT NULL AND recipe_section_id IS NULL;
```

---

_Reviewed: 2025-05-13T20:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
