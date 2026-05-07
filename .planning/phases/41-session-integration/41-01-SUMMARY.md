---
phase: 41-session-integration
plan: 01
subsystem: database
tags: [sqlite, react-query, zod, tauri, migration, typescript]

# Dependency graph
requires:
  - phase: 40-recipe-actions-step-photos
    provides: recipe_steps table with step_photo_path and alt_paint_id columns (migration 013)
  - phase: 38-recipe-step-management
    provides: painting_recipes and recipe_steps tables
  - phase: 37-recipe-foundation
    provides: painting_sessions table (migration 005), createSession query, useCreatePaintingSession hook
provides:
  - Migration 014 adding recipe_id and recipe_step_id nullable FK columns to painting_sessions
  - lib.rs registration of migrations 013 (previously missing) and 014
  - Extended PaintingSession and CreateSessionInput types with recipe fields
  - 6-param createSession INSERT query
  - getSessionsByRecipe query filtering sessions by recipe_id
  - RECIPE_SESSIONS_KEY constant and useSessionsByRecipe hook
  - useCreatePaintingSession cache invalidation of RECIPE_SESSIONS_KEY when recipe_id present
  - logSessionSchema extended with nullable optional recipe_id and recipe_step_id fields
affects: [41-02-PLAN.md, LogSessionSheet, RecipeDetailSheet]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ALTER TABLE ADD COLUMN for nullable FK extension in new migration file (append-only migration discipline)"
    - "RECIPE_SESSIONS_KEY factory pattern mirrors PAINTING_SESSIONS_KEY per-ID cache key"
    - "Conditional cache invalidation: only invalidate recipe-sessions if variables.recipe_id != null"

key-files:
  created:
    - src-tauri/migrations/014_session_recipe_link.sql
  modified:
    - src-tauri/src/lib.rs
    - src/types/paintingSession.ts
    - src/db/queries/paintingSessions.ts
    - src/hooks/useJournalSessions.ts
    - src/features/dashboard/logSessionSchema.ts
    - tests/hobby-journal/paintingSessionQueries.test.ts
    - tests/dashboard/logSessionSchema.test.ts

key-decisions:
  - "Migration 013 was not registered in lib.rs — fix applied alongside 014 registration (deviation Rule 1)"
  - "ON DELETE SET NULL for recipe_id/recipe_step_id FKs — session survives recipe or step deletion, link is cleared"
  - "staleTime: Infinity for useSessionsByRecipe — sessions only change via mutations in this file"
  - "Conditional invalidation of RECIPE_SESSIONS_KEY — only when recipe_id is set, avoids unnecessary cache busts"

patterns-established:
  - "RECIPE_SESSIONS_KEY = (recipeId: number) => ['recipe-sessions', recipeId] as const — per-recipe cache key factory"
  - "useSessionsByRecipe mirrors useJournalSessions — same enabled/staleTime/Promise.resolve([]) guard pattern"

requirements-completed: [INTEG-01, INTEG-02]

# Metrics
duration: 20min
completed: 2026-05-07
---

# Phase 41 Plan 01: Session-Recipe Data Layer Summary

**Migration 014 + 6-param createSession + getSessionsByRecipe + RECIPE_SESSIONS_KEY hook + extended logSessionSchema providing the full data foundation for session-recipe linking (INTEG-01/02)**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-05-07T13:45:00Z
- **Completed:** 2026-05-07T14:05:00Z
- **Tasks:** 2
- **Files modified:** 8 (2 test files, 5 source files, 1 new migration)

## Accomplishments

- Created migration 014 with two ALTER TABLE statements adding recipe_id and recipe_step_id FK columns (ON DELETE SET NULL) to painting_sessions
- Extended all layers of the data stack: types, queries, hooks, and Zod schema with recipe/step linking fields
- Added RECIPE_SESSIONS_KEY + useSessionsByRecipe hook and conditional cache invalidation in useCreatePaintingSession
- Updated and extended test suite: 13 new/updated tests covering 6-param INSERT, getSessionsByRecipe query, and logSessionSchema recipe field validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 014 + lib.rs fix + types + queries + hooks + schema** - `63b16a5` (feat)
2. **Task 2: Update existing tests + add new query/schema tests** - `1ebb2da` (test)

## Files Created/Modified

- `src-tauri/migrations/014_session_recipe_link.sql` - Two ALTER TABLE ADD COLUMN statements with ON DELETE SET NULL FK references
- `src-tauri/src/lib.rs` - Registered migrations 13 and 14 in get_migrations()
- `src/types/paintingSession.ts` - Added recipe_id and recipe_step_id to PaintingSession and CreateSessionInput
- `src/db/queries/paintingSessions.ts` - Updated createSession to 6-param INSERT; added getSessionsByRecipe
- `src/hooks/useJournalSessions.ts` - Added RECIPE_SESSIONS_KEY, useSessionsByRecipe, conditional RECIPE_SESSIONS_KEY invalidation
- `src/features/dashboard/logSessionSchema.ts` - Added recipe_id and recipe_step_id as nullable optional positive integers
- `tests/hobby-journal/paintingSessionQueries.test.ts` - Updated JOUR-01 tests + added INTEG-01/INTEG-02 tests
- `tests/dashboard/logSessionSchema.test.ts` - Added INTEG-01 describe block with 9 recipe field tests

## Decisions Made

- ON DELETE SET NULL chosen for both FKs — sessions are historical records and should survive recipe/step deletion; the link is simply cleared rather than cascading
- Migration 013 was previously unregistered in lib.rs; registered alongside 014 (Rule 1 auto-fix — blocking correctness)
- staleTime: Infinity for useSessionsByRecipe mirrors the existing useJournalSessions pattern — session data is mutation-gated
- Conditional cache invalidation: only invalidate RECIPE_SESSIONS_KEY when variables.recipe_id != null to avoid unnecessary cache busts for unlinked sessions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration 013 was unregistered in lib.rs**
- **Found during:** Task 1 (lib.rs edit)
- **Issue:** The plan's context explicitly noted "Migration 013 (013_step_photos_alt_paint.sql) exists on disk but is NOT registered." lib.rs only went up to version 12, meaning the Phase 40 step photo columns were never applied in production.
- **Fix:** Added Migration version 13 entry alongside the new version 14 entry in get_migrations()
- **Files modified:** src-tauri/src/lib.rs
- **Verification:** pnpm build exits 0
- **Committed in:** 63b16a5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix was pre-flagged in the plan context and required for correctness. No scope creep.

## Issues Encountered

None — all tasks executed as planned.

## Next Phase Readiness

- All data layer contracts for Phase 41 Plan 02 are in place: types, queries, hooks, and schema
- Plan 02 can import `useSessionsByRecipe`, `RECIPE_SESSIONS_KEY`, `getSessionsByRecipe`, and the extended `logSessionSchema` without any additional data work
- LogSessionSheet can be extended with recipe/step selectors (INTEG-01)
- RecipeDetailSheet can render session history panel (INTEG-02)

---
*Phase: 41-session-integration*
*Completed: 2026-05-07*
