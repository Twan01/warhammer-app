# Phase 71: Stable Session Section FK - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds a `recipe_section_id` FK column to the `painting_sessions` table (migration 022) so that session analytics survive section renames. The existing denormalized `section_name` column is retained for display and historical context. Both fields are written on every new session log. No backfill of existing rows.

</domain>

<decisions>
## Implementation Decisions

### Migration (022)
- **D-01:** Migration 022 adds `recipe_section_id INTEGER REFERENCES recipe_sections(id) ON DELETE SET NULL` to the `painting_sessions` table. ON DELETE SET NULL matches the existing pattern used by `recipe_id` and `recipe_step_id` (migration 014).
- **D-02:** No backfill of existing rows — the new column starts NULL for all existing sessions. Section names may have been renamed already, making name-matching unreliable. The denormalized `section_name` remains for historical display.

### Dual-Write (Session Logging)
- **D-03:** When logging a session, store BOTH `recipe_section_id` (the FK) and `section_name` (denormalized text) simultaneously. The FK provides stable analytics joins; the name provides instant display without a JOIN and preserves "what was the section called when this session was logged."
- **D-04:** The `LogSessionSheet.tsx` already tracks `watchedSectionId` internally (the section's DB ID) but currently discards it — only `section_name` reaches the DB. The fix is to pass `watchedSectionId` through as `recipe_section_id` alongside the existing `section_name` in the `createSession` call.

### Type & Query Updates
- **D-05:** Add `recipe_section_id: number | null` to the `PaintingSession` interface and `recipe_section_id?: number | null` to `CreateSessionInput` in `src/types/paintingSession.ts`.
- **D-06:** Update the `createSession` INSERT in `src/db/queries/paintingSessions.ts` to include the new column. The SELECT queries already use `SELECT *` so they pick up the new column automatically.

### Analytics Query Pattern
- **D-07:** Any query that groups or labels sessions by section should use `COALESCE(rs.name, ps.section_name)` — join on `recipe_section_id` to get the live section name, fall back to denormalized `section_name` when the section has been deleted (FK set to NULL). This pattern applies to `useWorkflowPositions` and any future analytics.
- **D-08:** Renaming a section updates the `recipe_sections` row's `name` field. Existing sessions' `recipe_section_id` FK still points to the same row, so analytics queries automatically see the new name via the JOIN. The denormalized `section_name` retains the original name at logging time.

### Claude's Discretion
- Whether `useWorkflowPositions.ts` needs updating in this phase or can wait — depends on whether it currently does section-level grouping that would benefit from the FK
- Registration of migration 022 in `lib.rs` (straightforward — follows existing pattern)
- Whether to add a `getSessionsBySection(sectionId)` query function or leave that for a future analytics phase

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Session Schema & Queries
- `src-tauri/migrations/020_workflow_metadata.sql` — Added `section_name` column to painting_sessions (current state to extend)
- `src-tauri/migrations/014_session_recipe_link.sql` — Added `recipe_id` and `recipe_step_id` FKs with ON DELETE SET NULL (pattern to follow)
- `src/db/queries/paintingSessions.ts` — `createSession` INSERT (must add recipe_section_id column)
- `src/types/paintingSession.ts` — `PaintingSession` and `CreateSessionInput` interfaces (must add recipe_section_id)

### Session Logging UI
- `src/features/dashboard/LogSessionSheet.tsx` lines 144, 380-389 — `watchedSectionId` state + section Select onChange (already has the section DB ID — needs to pass it through)
- `src/features/dashboard/logSessionSchema.ts` — Zod schema for session form (must add recipe_section_id field)

### Analytics Consumers
- `src/hooks/useWorkflowPositions.ts` lines 50, 56 — Uses `section_name` from sessions for workflow position detection

### Phase 70 Context (Prerequisite)
- `.planning/phases/70-non-destructive-recipe-save/70-CONTEXT.md` — Non-destructive save preserves section IDs, making the FK in this phase meaningful

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LogSessionSheet.tsx` `watchedSectionId` state: Already tracks the section's DB ID for step filtering — just needs to be included in the form submission payload
- Migration 014 pattern: `ALTER TABLE painting_sessions ADD COLUMN ... REFERENCES ... ON DELETE SET NULL` — exact pattern to replicate

### Established Patterns
- FK columns use ON DELETE SET NULL for painting_sessions (recipe_id, recipe_step_id both follow this)
- Denormalized + FK dual-column is a new pattern for this table, but the rationale is clear: FK for joins, text for historical display
- `SELECT *` in session queries means no query changes needed for reads — new column is automatically included

### Integration Points
- `createSession()` in `paintingSessions.ts` — INSERT must include the new column
- `LogSessionSheet.tsx` `onSubmit` — Must pass `recipe_section_id` from `watchedSectionId`
- `useWorkflowPositions.ts` — May benefit from using FK join instead of `section_name` string match
- `lib.rs` migration registration — Must include migration 022

</code_context>

<specifics>
## Specific Ideas

No specific requirements — the phase is tightly scoped by REC-04. The key insight is that `LogSessionSheet.tsx` already has the section ID available in `watchedSectionId` — this is primarily a plumbing exercise to persist it.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 71-Stable Session Section FK*
*Context gathered: 2026-05-13*
