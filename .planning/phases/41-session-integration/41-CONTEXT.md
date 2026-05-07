# Phase 41: Session Integration - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Painting sessions can be linked to a specific recipe and step at log time, and a recipe's detail view shows all sessions that referenced it — closing the loop between planning (recipes) and execution (sessions). No new entities; extends existing painting_sessions table and existing UI surfaces (LogSessionSheet, RecipeDetailSheet).

</domain>

<decisions>
## Implementation Decisions

### Recipe/Step Selector UX
- Radix Select dropdown for recipe picker in LogSessionSheet — matches existing unit and status selectors
- Step selection is optional when a recipe is selected — user can link to recipe without picking a specific step
- Recipes sorted by faction then alphabetically within faction — groups by context
- Step dropdown disabled/hidden until a recipe is chosen — prevents impossible state
- Both recipe and step selectors use `__none__` sentinel for "no selection" (established pattern)

### Session History Display
- New "Sessions" section in RecipeDetailSheet below the step timeline (above footer actions)
- Each session row shows: date, unit name, duration, notes snippet
- Empty state: inline muted text "No sessions logged for this recipe yet" — no icon-pill needed for inline section
- Sessions sorted newest first — matches existing getSessionsByUnit ordering

### Data Layer
- Two new nullable INTEGER columns on painting_sessions: `recipe_id` and `recipe_step_id` with FK constraints
- ON DELETE SET NULL for both FKs — session survives if recipe or step is deleted, link is cleared
- New migration file (014) — append-only, ALTER TABLE ADD COLUMN pattern
- CreateSessionInput extended with optional recipe_id and recipe_step_id
- New query: getSessionsByRecipe(recipeId) for the recipe detail history section

### Edge Cases
- If a recipe's steps change after sessions are linked, session keeps the step_id FK; ON DELETE SET NULL clears if step is deleted
- Existing LogSessionSheet flows completely untouched — recipe/step fields are purely additive
- LogSessionSheet form resets recipe and step to null on each open (existing reset pattern)
- Step dropdown clears when recipe selection changes (prevents stale step reference)

### Claude's Discretion
- Exact placement of recipe/step selectors in LogSessionSheet form field order
- Whether to show recipe name inline in JournalTab session list (nice-to-have, not required by INTEG-01/02)
- Loading states for recipe/step dropdowns
- Cache invalidation key additions for session-recipe queries

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — INTEG-01 (recipe+step selector in LogSessionSheet), INTEG-02 (session history in recipe detail)

### Existing implementation (modify)
- `src/features/dashboard/LogSessionSheet.tsx` — Form to extend with recipe/step selectors
- `src/features/dashboard/logSessionSchema.ts` — Zod schema to extend with recipe_id/recipe_step_id
- `src/features/recipes/RecipeDetailSheet.tsx` — Detail view to add sessions section
- `src/db/queries/paintingSessions.ts` — Query module to extend (createSession INSERT, new getSessionsByRecipe)
- `src/types/paintingSession.ts` — PaintingSession and CreateSessionInput interfaces to extend
- `src/hooks/useJournalSessions.ts` — Hook module to extend with useSessionsByRecipe

### Existing patterns (reference)
- `src-tauri/migrations/005_hobby_journal.sql` — Current painting_sessions table definition
- `src/types/recipePaint.ts` — RecipeStep interface (step_id FK target)
- `src/hooks/useRecipePaints.ts` — Pattern for recipe-scoped query hooks
- `src/hooks/useRecipes.ts` — Recipe list hook (for recipe picker data)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LogSessionSheet` — fully built form with unit picker, status update, date/duration/notes; extends naturally with two more optional Select fields
- `RecipeDetailSheet` — has Field helper component, Separator, step timeline; sessions section slots in below timeline
- `useRecipes` hook — provides recipe list for the picker dropdown
- `useRecipePaints(recipeId)` — provides steps for a specific recipe (step picker data source)
- `__none__` sentinel pattern — established for Radix Select nullable fields
- `sortUnitsForPicker()` — model for sorting recipes in picker

### Established Patterns
- Zod schema + buildDefaultValues pattern (no .default() — documented pitfall)
- Controller wrapper for Radix Select inside FormField
- Sequential mutateAsync for multi-step saves
- `PAINTING_SESSIONS_KEY(unitId)` per-unit cache key factory
- ON DELETE CASCADE/SET NULL FK strategy in migrations

### Integration Points
- `painting_sessions` table gets two new columns via migration 014
- `createSession()` INSERT statement expands from 4 to 6 columns
- `useCreatePaintingSession` cache invalidation needs new recipe-session key
- RecipeDetailSheet needs a new hook call (useSessionsByRecipe)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The feature is well-defined by INTEG-01 and INTEG-02. Follow existing LogSessionSheet and RecipeDetailSheet patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 41-session-integration*
*Context gathered: 2026-05-07*
