# Phase 71: Stable Session Section FK - Research

**Researched:** 2026-05-13
**Domain:** SQLite schema migration, TypeScript type updates, React Hook Form wiring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Migration adds `recipe_section_id INTEGER REFERENCES recipe_sections(id) ON DELETE SET NULL` to `painting_sessions`. Pattern matches existing `recipe_id` / `recipe_step_id` from migration 014.
- **D-02:** No backfill of existing rows. New column starts NULL. Denormalized `section_name` is retained for historical display.
- **D-03:** Dual-write on session log: store BOTH `recipe_section_id` (FK) and `section_name` (denormalized text).
- **D-04:** `LogSessionSheet.tsx` already holds `watchedSectionId` state; the fix is to pass it through as `recipe_section_id` in `createSession`.
- **D-05:** Add `recipe_section_id: number | null` to `PaintingSession` interface and `recipe_section_id?: number | null` to `CreateSessionInput`.
- **D-06:** Update `createSession` INSERT to include the new column. SELECT queries use `SELECT *` so read path needs no changes.
- **D-07:** Analytics queries must use `COALESCE(rs.name, ps.section_name)` — JOIN on `recipe_section_id` for live name, fall back to denormalized `section_name` when section deleted.
- **D-08:** Section renames update the `recipe_sections.name` row; existing session FKs still point to the same row, so analytics sees the new name; `section_name` preserves the original name at log time.

### Claude's Discretion

- Whether `useWorkflowPositions.ts` needs updating in this phase or can wait.
- Registration of the new migration in `lib.rs`.
- Whether to add `getSessionsBySection(sectionId)` query function or defer to a future analytics phase.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REC-04 | Painting sessions store a stable `recipe_section_id` FK alongside denormalized `section_name`; renaming a section does not break session analytics | Migration 023, dual-write in `createSession`, type additions to `PaintingSession` / `CreateSessionInput` / `logSessionSchema`, `onSubmit` wiring in `LogSessionSheet.tsx` |
</phase_requirements>

---

## Summary

Phase 71 is a focused plumbing phase. The section's DB ID (`watchedSectionId`) is already captured in `LogSessionSheet.tsx` state but is currently discarded — only the section's text name reaches the database. The fix threads `watchedSectionId` through to the INSERT via three layers: a new migration that adds the column, type additions on the TypeScript boundary, schema additions on the Zod form boundary, and `onSubmit` wiring to include it in the `createSession` call.

**Critical finding: migration number conflict.** The CONTEXT.md references "migration 022" for this phase, but `022_paintless_steps.sql` was already shipped in Phase 69. The correct migration file name is `023_session_section_fk.sql` (version 23 in lib.rs). [VERIFIED: codebase — Glob of migrations dir shows 022 is taken]

`computeWorkflowPosition` currently falls back to `section_name` string matching when no step ID is available. After this phase, sessions will also carry `recipe_section_id`, but `computeWorkflowPosition` takes `lastSessionSectionName` (text), not an ID, so no change to that function's signature is required. `useWorkflowPositions` passes `s.section_name` directly — that path continues to work unchanged. The FK provides a new, superior join path for future analytics queries but doesn't replace the existing logic in this phase.

**Primary recommendation:** Add migration 023, extend types and schema with `recipe_section_id`, update `createSession` INSERT to 8 parameters, wire `watchedSectionId` into `onSubmit`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persistent FK column | Database / Storage | — | Schema change via migration; SQLite enforces FK on INSERT/DELETE |
| Type contract | API / Backend (TS types) | — | `PaintingSession` and `CreateSessionInput` define the data contract |
| Form schema | Frontend (Zod) | — | `logSessionSchema` validates form values before submission |
| Dual-write wiring | Frontend (React component) | — | `LogSessionSheet.onSubmit` assembles the payload from form + local state |
| Analytics join | API / Backend (query layer) | — | `COALESCE(rs.name, ps.section_name)` logic belongs in SQL queries |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | (project's current) | Migration runner; executes `ALTER TABLE` on startup | Project's established DB migration mechanism |
| Zod | (project's current) | Form schema validation | Project standard for all form schemas |
| React Hook Form | (project's current) | Form state management | Project standard; `zodResolver` integration |

No new libraries are required for this phase. [VERIFIED: codebase]

---

## Architecture Patterns

### System Architecture Diagram

```
LogSessionSheet (UI)
  watchedSectionId (local state) ────────────────────────────────┐
  form.section_name (RHF field)  ────────────────────────────────┤
                                                                   ▼
                                                        onSubmit assembles payload
                                                           { recipe_section_id, section_name, ... }
                                                                   │
                                                                   ▼
                                                        createSession (query layer)
                                                           INSERT ...($1..$8)
                                                                   │
                                                                   ▼
                                                        painting_sessions table
                                                           recipe_section_id  ──FK──▶  recipe_sections.id
                                                           section_name       (denormalized text, frozen at log time)
```

### Recommended Project Structure

No new directories. Changes are confined to:
```
src-tauri/migrations/       023_session_section_fk.sql   (new)
src-tauri/src/lib.rs        add version 23 migration entry
src/types/paintingSession.ts
src/db/queries/paintingSessions.ts
src/features/dashboard/logSessionSchema.ts
src/features/dashboard/LogSessionSheet.tsx
tests/hobby-journal/paintingSessionQueries.test.ts   (update)
tests/dashboard/logSessionSchema.test.ts             (update)
```

### Pattern 1: ALTER TABLE with ON DELETE SET NULL FK (migration)

**What:** Add a nullable FK column to an existing table using `ALTER TABLE`.
**When to use:** Adding a new FK column without backfilling existing rows.

```sql
-- Source: src-tauri/migrations/014_session_recipe_link.sql [VERIFIED: codebase]
ALTER TABLE painting_sessions
  ADD COLUMN recipe_section_id INTEGER
  REFERENCES recipe_sections(id) ON DELETE SET NULL;
```

Note: SQLite supports referential actions (`ON DELETE SET NULL`) in `ALTER TABLE ... ADD COLUMN` FK constraints since SQLite 3.26.0, and tauri-plugin-sql uses a modern SQLite version. [ASSUMED — not verified against SQLite version shipped with Tauri 2; the existing migration 014 uses this identical pattern and works, which is strong functional evidence]

### Pattern 2: Migration registration in lib.rs

**What:** Add a new `Migration` struct entry to `get_migrations()`.
**When to use:** Every new hobbyforge.db migration file.

```rust
// Source: src-tauri/src/lib.rs lines 127-138 [VERIFIED: codebase]
Migration {
    version: 23,
    description: "session_section_fk",
    sql: include_str!("../migrations/023_session_section_fk.sql"),
    kind: MigrationKind::Up,
},
```

### Pattern 3: Dual-write in createSession INSERT

**What:** Pass both `recipe_section_id` (FK integer) and `section_name` (text) as separate columns.
**When to use:** Any time a session is created against a recipe section.

```typescript
// Source: src/db/queries/paintingSessions.ts lines 22-33 [VERIFIED: codebase]
// Current (7 columns / 7 params):
"INSERT INTO painting_sessions (unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id, section_name) VALUES ($1, $2, $3, $4, $5, $6, $7)"

// After this phase (8 columns / 8 params):
"INSERT INTO painting_sessions (unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id, section_name, recipe_section_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
```

Parameter order: add `recipe_section_id` as $8. [ASSUMED — column ordering is a planning decision; appending is the safest approach]

### Pattern 4: Wiring watchedSectionId into onSubmit

**What:** The `LogSessionSheet.onSubmit` currently passes `section_name: values.section_name ?? null` but omits `recipe_section_id`. The fix adds one property to the `createSession.mutateAsync` call.

```typescript
// Source: src/features/dashboard/LogSessionSheet.tsx lines 172-182 [VERIFIED: codebase]
// Add to the existing createSession.mutateAsync call:
recipe_section_id: watchedSectionId ?? null,
```

`watchedSectionId` is already in scope at the `onSubmit` closure — it's a `useState` in the same component. No additional data fetching required.

### Anti-Patterns to Avoid

- **Don't rename the column differently from CONTEXT.md:** The column must be `recipe_section_id` to match the FK on `recipe_sections(id)` and the interface property names.
- **Don't add the new Zod field with `.positive()`:** The field is nullable/optional (same convention as `recipe_step_id` in the schema). Use `z.number().int().positive().nullable().optional()`.
- **Don't backfill existing rows:** D-02 is explicit — backfill is unreliable because section names may have been renamed already.
- **Don't change SELECT queries:** `SELECT *` automatically includes new columns; rewriting queries to list columns would be regressions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FK enforcement on session-section link | Custom application-level orphan check | `REFERENCES recipe_sections(id) ON DELETE SET NULL` | SQLite enforces FK constraint; `client.ts` already runs `PRAGMA foreign_keys = ON` on every connection |
| Form value extraction for section ID | Re-query sections table in onSubmit | `watchedSectionId` local state (already present) | The ID is already available in component state; re-querying would add latency and complexity |
| Live section name in analytics | Store only section_name; do text join | `COALESCE(rs.name, ps.section_name)` SQL join | FK join returns renamed names automatically; denormalized column covers the deleted-section case |

---

## Common Pitfalls

### Pitfall 1: Migration Number Collision
**What goes wrong:** Planner uses `022` as the migration file/version number, colliding with the already-shipped `022_paintless_steps.sql`.
**Why it happens:** CONTEXT.md was written before Phase 69 (paintless steps) shipped and incremented to 022.
**How to avoid:** Use `023_session_section_fk.sql` as the filename and `version: 23` in lib.rs.
**Warning signs:** `lib.rs` already has `version: 22` registered for `paintless_steps`.

### Pitfall 2: Parameter Count Mismatch in Tests
**What goes wrong:** Existing test `JOUR-01` in `paintingSessionQueries.test.ts` asserts exactly 7 parameters and the INSERT signature with 7 columns. After the update to 8 columns, the test must be updated.
**Why it happens:** The test hard-codes the column list and parameter count.
**How to avoid:** Update the test to match the new 8-column INSERT and verify the 8th parameter is `recipe_section_id`.

### Pitfall 3: Zod Schema and Type Out of Sync
**What goes wrong:** Adding `recipe_section_id` to the type but not the Zod schema (or vice versa) causes TypeScript to pass but runtime validation to strip the value before it reaches `onSubmit`.
**Why it happens:** `LogSessionFormValues` is inferred from `logSessionSchema`; if the field is absent from the schema, zodResolver strips it.
**How to avoid:** Add `recipe_section_id` to `logSessionSchema` first, then types will follow from `z.infer`.

### Pitfall 4: watchedSectionId not reset on recipe change
**What goes wrong:** If section changes trigger `watchedSectionId` reset but don't also set `recipe_section_id` in form state (and vice versa), the submitted payload carries a stale ID.
**Why it happens:** `watchedSectionId` is separate from the `section_name` form field; both need resetting when recipe changes.
**How to avoid:** The existing `useEffect` at line 157-160 already clears `section_name` and calls `setWatchedSectionId(null)`. After this phase, `recipe_section_id` doesn't need to be in form state at all — it's read from `watchedSectionId` directly in `onSubmit`. No additional reset logic is required.

### Pitfall 5: useWorkflowPositions section matching after this phase
**What goes wrong:** Developer adds `recipe_section_id` to `computeWorkflowPosition`'s signature thinking it replaces `section_name` matching, breaking the graceful degradation chain.
**Why it happens:** The new FK seems like a better lookup key than string matching.
**How to avoid:** Leave `computeWorkflowPosition` and `useWorkflowPositions` unchanged in this phase. The FK join is for analytics queries only (D-07). The workflow position function's section_name fallback path (line 116-137 of `computeWorkflowPosition.ts`) still works correctly for sessions that have no step ID but have a section name.

---

## Code Examples

### Migration 023 SQL
```sql
-- Source: pattern from src-tauri/migrations/014_session_recipe_link.sql [VERIFIED: codebase]
-- 023_session_section_fk.sql — Phase 71: Stable section FK on painting_sessions
-- Additive only — one nullable FK column via ALTER TABLE.
-- ON DELETE SET NULL: session survives deletion of section; FK is cleared.
ALTER TABLE painting_sessions
  ADD COLUMN recipe_section_id INTEGER
  REFERENCES recipe_sections(id) ON DELETE SET NULL;
```

### Type additions (paintingSession.ts)
```typescript
// Add to PaintingSession interface:
recipe_section_id: number | null;   // Phase 71 — stable section FK (REC-04)

// Add to CreateSessionInput interface:
recipe_section_id?: number | null;  // Phase 71 — stable section FK (REC-04)
```

### Zod schema addition (logSessionSchema.ts)
```typescript
// Add after existing section_name field:
recipe_section_id: z.number().int().positive().nullable().optional(),
```

### createSession INSERT (paintingSessions.ts)
```typescript
// 8-column version:
await db.execute(
  "INSERT INTO painting_sessions (unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id, section_name, recipe_section_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
  [
    input.unit_id,
    input.session_date,
    input.duration_minutes,
    input.notes ?? null,
    input.recipe_id ?? null,
    input.recipe_step_id ?? null,
    input.section_name ?? null,
    input.recipe_section_id ?? null,
  ]
);
```

### onSubmit wiring in LogSessionSheet.tsx
```typescript
// Extend the existing createSession.mutateAsync call payload:
await createSession.mutateAsync({
  unit_id: values.unit_id,
  session_date: values.session_date,
  duration_minutes: values.duration_minutes,
  notes: values.notes && values.notes.trim() !== "" ? values.notes.trim() : null,
  recipe_id: values.recipe_id ?? null,
  recipe_step_id: values.recipe_step_id ?? null,
  section_name: values.section_name ?? null,
  recipe_section_id: watchedSectionId ?? null,   // ← new: thread watchedSectionId through
});
```

---

## Runtime State Inventory

Not applicable — this is a greenfield additive column, not a rename or migration of existing data.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Section name only for analytics | Dual-column (FK + denormalized name) | Phase 71 | Analytics joins survive renames; historical display retains original name |
| String-match section in computeWorkflowPosition | FK join for analytics, string match as fallback | Phase 71 | No impact on existing workflow position logic |

**Deprecated/outdated:**
- "Migration 022 for session_section_fk": CONTEXT.md used this number but 022 is already taken by `paintless_steps`. Use 023.

---

## Open Questions

1. **Does useWorkflowPositions need updating in this phase?**
   - What we know: It currently uses `s.section_name` for section matching (line 50). The new `recipe_section_id` FK could provide a more reliable lookup, but `computeWorkflowPosition` takes a section name string, not an ID.
   - What's unclear: Whether the section_name string-match in computeWorkflowPosition causes any real-world failures after Phase 70 (non-destructive save ensures section IDs are stable, so section names won't be orphaned by edits).
   - Recommendation: Leave `useWorkflowPositions` unchanged in Phase 71. The FK is for analytics. Add a note to the plan that this is a discretionary Claude decision — no changes needed now.

2. **Should getSessionsBySection be added?**
   - What we know: No current consumer queries sessions by section ID.
   - Recommendation: Defer to a future analytics phase. Adding unused query functions adds maintenance surface without benefit.

---

## Environment Availability

Step 2.6: SKIPPED — this phase makes code and SQL changes only; no external dependencies beyond the project's existing build tools.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts tests/dashboard/logSessionSchema.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REC-04 | `createSession` INSERT includes `recipe_section_id` as 8th column/parameter | unit | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts` | ✅ (needs update) |
| REC-04 | `logSessionSchema` accepts `recipe_section_id` as nullable optional integer | unit | `pnpm test -- tests/dashboard/logSessionSchema.test.ts` | ✅ (needs update) |
| REC-04 | `PaintingSession` interface has `recipe_section_id: number \| null` | type | TypeScript compile (`pnpm build`) | ✅ (needs update) |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts tests/dashboard/logSessionSchema.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

None — existing test files cover both affected modules. Tests need updating (not creation) to assert the 8-column INSERT signature and the new Zod field.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Zod schema validates `recipe_section_id` as `number().int().positive().nullable().optional()` |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Integer overflow / type confusion for `recipe_section_id` | Tampering | Zod `.int().positive()` rejects non-integers and negatives; parameterized query `$8` prevents injection |
| FK constraint bypass | Tampering | `client.ts` enforces `PRAGMA foreign_keys = ON` on every connection [VERIFIED: codebase] |

---

## Project Constraints (from CLAUDE.md)

- Parameterized queries use `$1, $2` positional syntax (Tauri plugin-sql requirement) — the 8th parameter must be `$8`.
- Booleans stored as `0|1`; this column is INTEGER nullable, not boolean — no casting needed.
- Never edit existing migration files — create a new `023_session_section_fk.sql`.
- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`) — the new `recipe_section_id` field on `CreateSessionInput` must be used in `createSession` or the build fails.
- `SELECT *` in session queries means read queries pick up the new column automatically — no SELECT query changes needed.
- No ESLint/Prettier — TypeScript strict mode is the quality gate.
- shadcn/ui, Lucide React, React Hook Form, Zod — all existing; no new UI libraries.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SQLite (Tauri 2 bundled version) supports `ON DELETE SET NULL` in `ALTER TABLE ... ADD COLUMN` FK constraints | Migration 023 SQL, Common Pitfalls | If unsupported, the migration would need a table-rebuild approach (like migration 022 for paintless_steps). The identical pattern in migration 014 works in production, making this LOW risk. |
| A2 | Appending `recipe_section_id` as `$8` (last parameter) in the INSERT is the right column order | Code Examples | Column ordering is a planning detail, not a correctness issue for SQLite — any consistent order works as long as SQL and params array match |

---

## Sources

### Primary (HIGH confidence)
- `src-tauri/migrations/014_session_recipe_link.sql` — FK pattern with ON DELETE SET NULL [VERIFIED: codebase]
- `src-tauri/migrations/022_paintless_steps.sql` — confirms 022 is taken; next is 023 [VERIFIED: codebase]
- `src-tauri/src/lib.rs` lines 1-140 — migration registration pattern and current last version (22) [VERIFIED: codebase]
- `src/types/paintingSession.ts` — current interface shape [VERIFIED: codebase]
- `src/db/queries/paintingSessions.ts` — current INSERT signature (7 columns) [VERIFIED: codebase]
- `src/features/dashboard/logSessionSchema.ts` — current Zod schema [VERIFIED: codebase]
- `src/features/dashboard/LogSessionSheet.tsx` lines 130-220 — `watchedSectionId` state and `onSubmit` [VERIFIED: codebase]
- `src/hooks/useWorkflowPositions.ts` — uses `s.section_name` for session lookup [VERIFIED: codebase]
- `src/lib/computeWorkflowPosition.ts` — section_name fallback path [VERIFIED: codebase]
- `tests/hobby-journal/paintingSessionQueries.test.ts` — existing 7-column test (needs update) [VERIFIED: codebase]
- `tests/dashboard/logSessionSchema.test.ts` — existing schema tests (needs update) [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- None required — all findings verified directly from codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; pattern verified from existing migrations
- Architecture: HIGH — all integration points verified in codebase
- Pitfalls: HIGH — migration number conflict verified directly; parameter count mismatch confirmed from test file

**Research date:** 2026-05-13
**Valid until:** Stable — this is a bounded schema change with no external dependencies
