# Phase 100: Query-Layer Automation - Research

**Researched:** 2026-05-28
**Domain:** SQLite query layer, TypeScript const arrays, React Query cache invalidation
**Confidence:** HIGH

## Summary

Phase 100 is a pure query-layer and schema change. There is no new UI, no new routes, and no external packages. Every change targets three files: the migration folder (one new .sql file), `src/db/queries/recipeAssignments.ts` (the primary logic file), `src/types/recipeSection.ts` (const array extension), and `src/types/unit.ts` + `src/features/units/StatusPopover.tsx` for override-flag wiring.

The existing `syncDerivedStatuses()` function at line 211 of `recipeAssignments.ts` already handles basing and varnish via name-LIKE patterns. This phase extends it with: (1) an assembly derivation path, (2) a migration to `section_type`-first matching with name-LIKE fallback, (3) three override guard columns added via a new migration, and (4) `is_active_project` lifecycle writes in `createAssignment()` and `bulkCreateAssignments()`. The derivation call chain (`upsertStepProgress` → `syncPaintingPercentageFromAssignment` → `syncPaintingPercentageByUnitId` → `syncDerivedStatuses`) is already wired — no new wiring is needed.

The test suite pattern is well-established: vi.mock("@/db/client") with `executeMock` / `selectMock`, then assert on SQL strings and parameter arrays. Existing tests in `tests/painting/recipeAssignments.test.ts` provide the exact template. The `StatusPopover.test.ts` file exists but has only skipped tests — it should remain as-is since StatusPopover changes are minimal (override flag write only).

**Primary recommendation:** Extend `syncDerivedStatuses()` in-place. Add one migration for override columns. Wire `is_active_project` in `createAssignment`/`bulkCreateAssignments`. Update `SECTION_TYPES` and `Unit` type. Write targeted unit tests for the three new derivation paths and the override guards.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Manual-Override Guard (SAD-04)**
- D-01: Add 3 boolean override columns to the units table via new migration: `status_assembly_override INTEGER DEFAULT 0`, `status_basing_override INTEGER DEFAULT 0`, `status_varnished_override INTEGER DEFAULT 0`. When `syncDerivedStatuses()` runs, it checks each override flag before writing the corresponding status. If override = 1, the auto-derived value is skipped for that status.
- D-02: StatusPopover (and any UI surface that lets the user manually set `status_assembly`, `status_basing`, or `status_varnished`) must set the corresponding `_override` column to 1 at the same time. This marks the status as user-controlled.
- D-03: Override flags are NOT auto-cleared. Once the user manually sets a status, auto-derivation is permanently disabled for that field on that unit unless the user explicitly resets it.

**SECTION_TYPES Vocabulary (SAD-03)**
- D-04: Extend the `SECTION_TYPES` const array in `src/types/recipeSection.ts` with `'assembly'`, `'basing'`, and `'varnish'` — 10 total values.
- D-05: The existing `'finishing'` type remains as-is (not repurposed as varnish). `'varnish'` is the explicit trigger for `status_varnished` derivation.

**Assembly Auto-Derivation (SAD-01)**
- D-06: `syncDerivedStatuses()` gains an assembly check mirroring existing basing/varnish pattern: query sections with `section_type = 'assembly'` (or name-LIKE fallback for NULL section_type), check all steps complete, set `status_assembly = 1`.

**Basing/Varnish Migration to section_type (SAD-02)**
- D-07: Switch from `LOWER(sec.name) LIKE '%basing%'` to `sec.section_type = 'basing' OR (sec.section_type IS NULL AND LOWER(sec.name) LIKE '%basing%')`. Same dual-path for varnish. Preserves backward compatibility.

**Active Project Lifecycle (APL-01, APL-02, APL-03)**
- D-08: `createAssignment()` and `bulkCreateAssignments()` set `is_active_project = 1` on the target unit immediately after INSERT.
- D-09: Auto-clear: when `syncDerivedStatuses()` detects `painting_percentage = 100`, it sets `is_active_project = 0`.
- D-10: Manual toggle wins within same session. Auto-set on recipe assign (always), auto-clear at 100% (always); between those events, user's manual toggle stands.

### Claude's Discretion
- Query consolidation: whether to combine the assembly/basing/varnish checks into a single SQL query or keep them as separate queries in `syncDerivedStatuses()` — optimize for clarity first, performance if needed
- Error handling: whether derivation failures should silently log or surface a toast — recommended: silent log since this is background automation
- Test strategy: unit tests for `syncDerivedStatuses()` covering each derivation path and override guard

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAD-01 | Assembly status auto-derives from recipe section completion — when all steps in sections with `section_type = 'assembly'` are complete, `status_assembly` is set to 1 | `syncDerivedStatuses()` already has the structural pattern for basing/varnish; assembly follows the same two-query approach (count sections, count incomplete steps) |
| SAD-02 | Basing and varnish auto-derivation uses `section_type` field instead of fragile section name LIKE matching | Existing queries at lines 229–266 use LIKE patterns; the dual-path `section_type = 'X' OR (section_type IS NULL AND LIKE)` is a drop-in replacement |
| SAD-03 | `SECTION_TYPES` vocabulary extended with 'assembly', 'basing', 'varnish' values | `SECTION_TYPES` in `recipeSection.ts` line 5 is a 7-element const array; add 3 values per D-04 |
| SAD-04 | Manual-override guard — auto-derivation does not overwrite statuses that were explicitly set by the user | New migration adds 3 override columns; `syncDerivedStatuses()` reads them before each write; StatusPopover sets override=1 on manual change |
| APL-01 | `is_active_project` auto-set to 1 when a recipe is first assigned to a unit | `createAssignment()` line 98 and `bulkCreateAssignments()` line 174 need one UPDATE statement after INSERT |
| APL-02 | `is_active_project` auto-cleared to 0 when all applied recipe steps reach 100% completion | `syncDerivedStatuses()` already reads `painting_percentage`; add auto-clear when pct === 100 |
| APL-03 | Manual `is_active_project` toggle continues to work and is not overridden within same session | Auto-set only on discrete events (recipe assign); auto-clear only at 100%; manual toggle between those events persists |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Status auto-derivation logic | Database / Query Layer | — | Pure SQLite read + write in `syncDerivedStatuses()`; no UI involvement |
| Override flag storage | Database / Storage | — | Three new INTEGER columns in units table via migration |
| Override flag write on manual set | UI component (StatusPopover) | Query Layer (updateUnit) | StatusPopover fires updateUnit mutation which must include override flag |
| SECTION_TYPES vocabulary | Types / Constants | — | `src/types/recipeSection.ts` const array; consumed by UI dropdowns and query logic |
| is_active_project lifecycle | Database / Query Layer | — | Discrete events: INSERT → set 1, 100% completion → set 0 |
| React Query cache refresh | Frontend (hooks) | — | `UNITS_KEY` invalidation already present in all assignment mutation hooks |

## Standard Stack

No external packages are added in this phase. The implementation uses only already-installed project dependencies.

### Core (already installed)
| Library | Version | Purpose | Role in Phase |
|---------|---------|---------|---------------|
| tauri-plugin-sql | per project | SQLite parameterized queries via `$1, $2` syntax | Migration execution + all query writes |
| TypeScript | 5.x | Strict types | Unit type extension, SECTION_TYPES const update |
| Vitest 4 + RTL 16 | per project | Unit tests | New test file for `syncDerivedStatuses()` |

### No New Packages
This phase installs zero npm packages. The Package Legitimacy Audit section is omitted.

## Architecture Patterns

### System Architecture Diagram

```
recipe step toggle (UI)
        |
        v
upsertStepProgress()
        |
        v
syncPaintingPercentageFromAssignment()
        |
        v
syncPaintingPercentageByUnitId()     <── also called by createAssignment, bulkCreateAssignments
        |
        v
syncDerivedStatuses()
   |         |         |         |
   v         v         v         v
assembly   basing   varnish   is_active_project
 check      check    check    auto-clear at 100%
   |         |         |
   v         v         v
check        check    check
override     override override
flag         flag     flag
   |         |         |
   v         v         v
UPDATE units SET status_assembly/basing/varnished
        |
        v
UNITS_KEY invalidated by hook (already wired)
        |
        v
React Query refetch → UI reflects new statuses
```

Recipe assign event:
```
createAssignment() / bulkCreateAssignments()
        |
        v
INSERT INTO unit_recipe_assignments
        |
        v
UPDATE units SET is_active_project = 1      <── NEW
        |
        v
syncPaintingPercentageByUnitId()
        |
        v
syncDerivedStatuses()
```

### Recommended Project Structure
No new directories. All changes are in-place edits to existing files plus one new migration.

```
src-tauri/migrations/
  037_override_flags.sql        # NEW — 3 override columns on units

src/types/
  recipeSection.ts              # SECTION_TYPES: add 'assembly', 'basing', 'varnish'
  unit.ts                       # Unit interface: add 3 override boolean fields

src/db/queries/
  recipeAssignments.ts          # syncDerivedStatuses(), createAssignment(), bulkCreateAssignments()

src/features/units/
  StatusPopover.tsx             # set override flag on manual status change

tests/painting/
  syncDerivedStatuses.test.ts   # NEW — all derivation paths + override guards
```

### Pattern 1: Override-Guarded Status Write in syncDerivedStatuses()
**What:** Before writing each derived status, check the corresponding override column. If override = 1, skip the write for that field.
**When to use:** Every call to `syncDerivedStatuses()`.

```typescript
// Source: recipeAssignments.ts — adapted from existing basing/varnish pattern

// Read override flags alongside existing percentage read
const unitRows = await db.select<{
  painting_percentage: number;
  status_assembly_override: number;
  status_basing_override: number;
  status_varnished_override: number;
}[]>(
  "SELECT painting_percentage, status_assembly_override, status_basing_override, status_varnished_override FROM units WHERE id = $1",
  [unitId],
);

// Example guard:
if (!unitRows[0].status_assembly_override) {
  // compute assemblyValue, then include in UPDATE
}
```

### Pattern 2: Dual-Path section_type Matching (SAD-02)
**What:** Match on `section_type` first; fall back to name-LIKE for NULL section_type (backward compat for pre-v0.2.9 recipes).
**When to use:** All three derivation checks (assembly, basing, varnish).

```sql
-- Source: CONTEXT.md D-07 — basing example
WHERE (sec.section_type = 'basing'
   OR (sec.section_type IS NULL AND LOWER(sec.name) LIKE '%basing%'))
```

### Pattern 3: is_active_project Auto-Set on Recipe Assign (APL-01)
**What:** After INSERT into unit_recipe_assignments, run a single UPDATE to set `is_active_project = 1`.
**When to use:** In both `createAssignment()` and `bulkCreateAssignments()`.

```typescript
// Source: CONTEXT.md D-08
await db.execute(
  "UPDATE units SET is_active_project = 1, updated_at = datetime('now') WHERE id = $1",
  [input.unit_id],
);
```

### Pattern 4: Override Flag Write in StatusPopover
**What:** When user selects a new painting status, the updateUnit call must also pass the corresponding override flag as 1.
**Current state:** StatusPopover only updates `status_painting` — does not touch assembly/basing/varnished.
**What changes:** StatusPopover will need to handle these three boolean statuses OR a separate toggle component exists. Per CONTEXT.md, this is about wiring override flags when the user manually sets these fields.

Existing `updateUnit()` in `units.ts` already supports partial updates via COALESCE — override columns just need to be added as new `$N` params to the UPDATE query.

### Anti-Patterns to Avoid
- **Unconditional status overwrite:** Writing derived status without checking override flag first — this is Pitfall 1 from research. The guard must execute before every write.
- **Auto-clearing override flags during sync:** Override flags must never be reset by `syncDerivedStatuses()`. They are only set by user action.
- **Using section name-LIKE without section_type fallback:** Dropping name-LIKE entirely would break all pre-v0.2.9 recipes that have NULL section_type. The dual-path is required.
- **Placing auto-clear of is_active_project in hook, not query:** The auto-clear at 100% lives in `syncDerivedStatuses()`, not in a React Query hook. The query layer is the single source of truth.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| SQLite boolean columns | Custom serialization layer | `? 1 : 0` ternary on write, read as `0 \| 1` per established project pattern |
| Migration ordering | Manual filename tracking | Tauri plugin-sql auto-runs migrations in filename order — next filename is `037_override_flags.sql` |
| Partial UPDATE with nulls | Build dynamic SQL | Existing `updateUnit()` uses COALESCE — add new params to the same statement |

## Common Pitfalls

### Pitfall 1: Unconditional Overwrite (Locked Decision D-01)
**What goes wrong:** `syncDerivedStatuses()` writes derived value without checking override flag — user's manual status choice is silently overwritten next time a recipe step is toggled.
**Why it happens:** The auto-derive runs on every step toggle via the existing call chain.
**How to avoid:** Read all three override flags in the same SELECT as `painting_percentage`. Guard each status write with `if (!overrideFlag)`.
**Warning signs:** Unit's manually-set status_assembly reverts to 0 after toggling a recipe step.

### Pitfall 2: Migration Breaks updateUnit() Query
**What goes wrong:** Adding new columns to units table causes `SELECT *` queries or INSERT queries that reference positional params to fail or return wrong data.
**Why it happens:** `getUnits()` uses `SELECT *` — new columns appear automatically. `createUnit()` and `updateUnit()` use explicit column lists and positional params — they need updating.
**How to avoid:** After adding `037_override_flags.sql`, update `createUnit()` to include override columns in INSERT (with DEFAULT 0 values), and add override params to `updateUnit()`. Also add override fields to the `Unit` TypeScript interface and `CreateUnitInput`/`UpdateUnitInput` types.
**Warning signs:** TypeScript compile error (`Property 'status_assembly_override' does not exist on type Unit`).

### Pitfall 3: bulkCreateAssignments is_active_project Test Failure
**What goes wrong:** Existing test at line 217 asserts `executeMock` called exactly 6 times for 3 unitIds (3 INSERTs + 3 syncs). Adding the `UPDATE units SET is_active_project = 1` call changes this to 9 calls.
**Why it happens:** The test hardcodes `toHaveBeenCalledTimes(6)`.
**How to avoid:** Update the test to expect the new call count, and assert the new UPDATE SQL appears once per unitId.
**Warning signs:** `Expected 6, received 9` in the existing test.

### Pitfall 4: is_active_project Auto-Clear Race with Manual Toggle (APL-03)
**What goes wrong:** User manually sets `is_active_project = 0` (doesn't want to track), but the next step toggle fires `syncDerivedStatuses()` which doesn't yet know about the manual override and auto-sets it back.
**Why it happens:** `syncDerivedStatuses()` auto-clears only at 100% (D-09) — auto-set only happens at discrete assign events (D-08). Between those two events, the sync function should NOT touch `is_active_project` at all.
**How to avoid:** `syncDerivedStatuses()` only touches `is_active_project` when `painting_percentage === 100`. It never auto-sets it to 1 inside sync — that's the job of `createAssignment`. Per D-10, the manual toggle stands between assign and 100% completion.
**Warning signs:** Unit's is_active_project = 0 (manually cleared) reverts to 1 on next step toggle.

### Pitfall 5: SECTION_TYPES Type Extension Breaks Existing Dropdowns
**What goes wrong:** Adding new values to `SECTION_TYPES` causes a TypeScript error if any existing code uses the type with exhaustive switch/case.
**Why it happens:** `SectionType` is a union derived from the const array — adding values widens the union.
**How to avoid:** Search for switch statements on `SectionType` before adding values. In this codebase, SECTION_TYPES is used in form dropdowns and SQL matching — no exhaustive switches expected, but verify.
**Warning signs:** `Type '"assembly" | "basing" | "varnish"' is not assignable to type SectionType`.

### Pitfall 6: updateUnit() Does Not Accept Override Columns
**What goes wrong:** StatusPopover tries to pass `status_assembly_override: 1` to `updateUnit()` but the function's SQL doesn't include that column — the value is silently ignored.
**Why it happens:** `updateUnit()` has explicit `$1..$23` positional params — a new field requires adding `$24`, `$25`, `$26` to both the SQL and the params array.
**How to avoid:** Extend `updateUnit()` and `UpdateUnitInput` type simultaneously. TypeScript strict mode (`noUnusedParameters`) will catch mismatches.

## Code Examples

### Existing syncDerivedStatuses() basing/varnish pattern to extend
```typescript
// Source: src/db/queries/recipeAssignments.ts lines 229-266
// The assembly check will mirror this exact shape:

const basingRows = await db.select<{ incomplete: number }[]>(
  `SELECT COUNT(*) AS incomplete
   FROM recipe_steps rs
   JOIN recipe_sections sec ON sec.id = rs.section_id
   JOIN unit_recipe_assignments a ON a.recipe_id = rs.recipe_id AND a.unit_id = $1
   LEFT JOIN unit_recipe_step_progress sp ON sp.assignment_id = a.id AND sp.recipe_step_id = rs.id
   WHERE LOWER(sec.name) LIKE '%basing%'   -- <-- REPLACE with dual-path
     AND (sp.completed IS NULL OR sp.completed = 0)`,
  [unitId],
);
```

The updated dual-path WHERE clause:
```sql
WHERE (sec.section_type = 'basing'
   OR (sec.section_type IS NULL AND LOWER(sec.name) LIKE '%basing%'))
  AND (sp.completed IS NULL OR sp.completed = 0)
```

### Migration pattern (from existing migrations)
```sql
-- 037_override_flags.sql
-- Adds manual-override guard columns for assembly/basing/varnished auto-derivation (SAD-04).
-- DEFAULT 0 means all existing units start with auto-derivation enabled.

ALTER TABLE units ADD COLUMN status_assembly_override  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE units ADD COLUMN status_basing_override    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE units ADD COLUMN status_varnished_override INTEGER NOT NULL DEFAULT 0;
```

### SECTION_TYPES extension
```typescript
// Source: src/types/recipeSection.ts line 5-7
// Current (7 values):
export const SECTION_TYPES = [
  "prep", "basecoat", "shade", "layer", "detail", "effect", "finishing",
] as const;

// After (10 values — D-04):
export const SECTION_TYPES = [
  "prep", "basecoat", "shade", "layer", "detail", "effect", "finishing",
  "assembly", "basing", "varnish",
] as const;
```

### Unit interface extension
```typescript
// Source: src/types/unit.ts — add after status_varnished
status_assembly_override: 0 | 1;
status_basing_override: 0 | 1;
status_varnished_override: 0 | 1;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Name-LIKE matching for section type | `section_type` column with name-LIKE fallback | This phase (SAD-02) | More reliable matching for new recipes; backward-compatible for pre-v0.2.9 |
| No assembly derivation | Assembly status auto-derived from `section_type = 'assembly'` | This phase (SAD-01) | Completes the status derivation trio |
| Manual is_active_project toggle only | Auto-set on recipe assign, auto-clear at 100% | This phase (APL-01, APL-02) | Active project tracking requires zero user maintenance |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `037_` is the correct next migration filename | Architecture Patterns — migration | Migration runs out of order if another migration was added since research; verify actual last file before writing | 
| A2 | `updateUnit()` SQL currently ends at `$23` (lore_notes, undercoat) | Pitfall 2 / Code Examples | Override params need to be `$24, $25, $26` — check actual param count in units.ts before coding |

## Open Questions

1. **Where do assembly/basing/varnished manual overrides get set from the UI?**
   - What we know: StatusPopover currently only handles `status_painting` (line 29). Override flags must be set on manual changes.
   - What's unclear: Is there a separate UI toggle for `status_assembly`, `status_basing`, `status_varnished`? These are boolean checkboxes in UnitSheet or elsewhere, not the StatusPopover dropdown.
   - Recommendation: Locate the component(s) that write `status_assembly`, `status_basing`, `status_varnished` manually — likely UnitSheet or a dedicated boolean toggle row. The CONTEXT.md mentions "StatusPopover (and any UI surface)" — the planner should identify all write surfaces.

2. **Should override flags appear in createUnit() defaults?**
   - What we know: ALTER TABLE with DEFAULT 0 handles existing rows. New units created via `createUnit()` will get DEFAULT 0 from the schema.
   - What's unclear: Whether `createUnit()` needs explicit `0` values in the INSERT or if SQLite DEFAULT handles it.
   - Recommendation: SQLite DEFAULT 0 handles it — no change to `createUnit()` INSERT needed unless TypeScript `CreateUnitInput` requires the fields to be non-optional.

## Environment Availability

Step 2.6: SKIPPED — this phase has no external dependencies. All changes are code/schema edits within the existing project stack.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `pnpm test -- tests/painting/syncDerivedStatuses.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAD-01 | assembly sections fully complete → status_assembly set to 1 | unit | `pnpm test -- tests/painting/syncDerivedStatuses.test.ts` | No — Wave 0 |
| SAD-01 | assembly sections not complete → status_assembly stays 0 | unit | same | No — Wave 0 |
| SAD-01 | no assembly sections → status_assembly stays 0 | unit | same | No — Wave 0 |
| SAD-02 | section_type='basing' triggers basing derivation | unit | same | No — Wave 0 |
| SAD-02 | section_type=NULL + name LIKE '%basing%' still triggers (backward compat) | unit | same | No — Wave 0 |
| SAD-02 | section_type='varnish' triggers varnish derivation | unit | same | No — Wave 0 |
| SAD-03 | SECTION_TYPES contains 'assembly', 'basing', 'varnish' | unit | `pnpm test -- tests/painting/sectionTypes.test.ts` | No — Wave 0 |
| SAD-04 | override=1 prevents assembly write | unit | `pnpm test -- tests/painting/syncDerivedStatuses.test.ts` | No — Wave 0 |
| SAD-04 | override=1 prevents basing write | unit | same | No — Wave 0 |
| SAD-04 | override=0 allows derived write | unit | same | No — Wave 0 |
| APL-01 | createAssignment sets is_active_project=1 | unit | `pnpm test -- tests/painting/recipeAssignments.test.ts` | Exists — extend |
| APL-01 | bulkCreateAssignments sets is_active_project=1 per unit | unit | same | Exists — extend |
| APL-02 | syncDerivedStatuses auto-clears is_active_project at 100% | unit | `pnpm test -- tests/painting/syncDerivedStatuses.test.ts` | No — Wave 0 |
| APL-03 | syncDerivedStatuses does NOT set is_active_project=1 during sync (only at discrete assign) | unit | same | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/syncDerivedStatuses.test.ts tests/painting/recipeAssignments.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/painting/syncDerivedStatuses.test.ts` — covers SAD-01, SAD-02, SAD-04, APL-02, APL-03
- [ ] `tests/painting/sectionTypes.test.ts` — covers SAD-03 (trivially: assert SECTION_TYPES includes the three new values)

*(Existing `tests/painting/recipeAssignments.test.ts` covers APL-01 via extended createAssignment/bulkCreateAssignments tests — extend existing file, don't create new.)*

## Security Domain

This phase has no authentication, session management, cryptography, or external input vectors. The only input is unit IDs passed through the existing parameterized query path — already covered by Tauri plugin-sql binding (no SQL injection risk). ASVS categories V2/V3/V4/V6 do not apply. V5 (input validation) is satisfied by existing parameterized query enforcement.

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `src/db/queries/recipeAssignments.ts` — full function implementations verified
- Direct codebase read: `src/types/recipeSection.ts` — SECTION_TYPES current values confirmed
- Direct codebase read: `src/types/unit.ts` — Unit interface fields confirmed
- Direct codebase read: `src/features/units/StatusPopover.tsx` — current mutation payload confirmed
- Direct codebase read: `src/hooks/useRecipeAssignments.ts` — cache invalidation keys confirmed
- Direct codebase read: `src-tauri/migrations/*.sql` — last migration is 036, next is 037
- Direct codebase read: `tests/painting/recipeAssignments.test.ts` — test patterns confirmed
- Direct codebase read: `100-CONTEXT.md` — all locked decisions D-01 through D-10 confirmed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, codebase fully read
- Architecture: HIGH — call chain verified by reading actual source, not assumed
- Pitfalls: HIGH — derived from exact code being modified (line numbers verified)
- Test patterns: HIGH — existing test file provides exact template

**Research date:** 2026-05-28
**Valid until:** Until any of the 4 source files are modified outside this phase (stable)
