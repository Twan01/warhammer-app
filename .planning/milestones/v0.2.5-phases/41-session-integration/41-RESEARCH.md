# Phase 41: Session Integration - Research

**Researched:** 2026-05-07
**Domain:** SQLite schema extension + React Hook Form + React Query (session-recipe linking)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Radix Select dropdown for recipe picker in LogSessionSheet — matches existing unit and status selectors
- Step selection is optional when a recipe is selected — user can link to recipe without picking a specific step
- Recipes sorted by faction then alphabetically within faction — groups by context
- Step dropdown disabled/hidden until a recipe is chosen — prevents impossible state
- Both recipe and step selectors use `__none__` sentinel for "no selection" (established pattern)
- New "Sessions" section in RecipeDetailSheet below the step timeline (above footer actions)
- Each session row shows: date, unit name, duration, notes snippet
- Empty state: inline muted text "No sessions logged for this recipe yet" — no icon-pill needed for inline section
- Sessions sorted newest first — matches existing getSessionsByUnit ordering
- Two new nullable INTEGER columns on painting_sessions: `recipe_id` and `recipe_step_id` with FK constraints
- ON DELETE SET NULL for both FKs — session survives if recipe or step is deleted, link is cleared
- New migration file (014) — append-only, ALTER TABLE ADD COLUMN pattern
- CreateSessionInput extended with optional recipe_id and recipe_step_id
- New query: getSessionsByRecipe(recipeId) for the recipe detail history section

### Claude's Discretion
- Exact placement of recipe/step selectors in LogSessionSheet form field order
- Whether to show recipe name inline in JournalTab session list (nice-to-have, not required by INTEG-01/02)
- Loading states for recipe/step dropdowns
- Cache invalidation key additions for session-recipe queries

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTEG-01 | User can select a recipe and step when logging a painting session via LogSessionSheet | logSessionSchema extension pattern (matches DATA-01 new_status field approach); Controller/Select pattern already proven for nullable optional fields; `__none__` sentinel established |
| INTEG-02 | User can see which sessions were linked to a recipe from the recipe detail view | RecipeDetailSheet Field helper component ready for new section; getSessionsByRecipe query follows getSessionsByUnit pattern exactly; useRecipePaints(recipeId) pattern for recipe-scoped hook |
</phase_requirements>

---

## Summary

Phase 41 is a pure extension phase — no new entities, no new pages. It wires the existing `painting_sessions` table to the existing `painting_recipes` / `recipe_steps` tables via two nullable FK columns, then surfaces that link in two places: at log time (LogSessionSheet) and at review time (RecipeDetailSheet).

The codebase already has every pattern this phase needs. The `new_status` field added in DATA-01 is the exact template for adding nullable optional Select fields to `logSessionSchema`. The `useRecipePaints(recipeId)` hook is the exact template for a new `useSessionsByRecipe(recipeId)` hook. The `Field` helper component in RecipeDetailSheet slots in the new sessions section with zero new primitives.

One discovered risk: migration 013 (`013_step_photos_alt_paint.sql`) exists on disk but is NOT registered in `src-tauri/src/lib.rs`. The last registered migration is version 12. This means either migration 013 is already handled out-of-band or it was missed. The new migration for phase 41 must be registered as version 14 (or 13 if 013 was truly never run). This needs to be resolved as part of Wave 0.

**Primary recommendation:** Write migration 014 adding two ALTER TABLE columns with ON DELETE SET NULL FKs, extend `logSessionSchema` + `CreateSessionInput` + `createSession()` following the DATA-01 pattern, add `getSessionsByRecipe()` + `useSessionsByRecipe()` following the `getSessionsByUnit` / `useJournalSessions` pattern, and add two Select fields to LogSessionSheet with step-clear-on-recipe-change logic. In RecipeDetailSheet, add a Sessions Field section below the step timeline.

---

## Standard Stack

### Core (all already installed — no new dependencies)
| Library | Version | Purpose | Why Used |
|---------|---------|---------|----------|
| tauri-plugin-sql | existing | SQLite via IPC, `$1` positional params | Project requirement |
| @tanstack/react-query | existing | Server state, cache invalidation | Project standard |
| react-hook-form | existing | Form state management | Project standard |
| zod | existing | Schema validation + type inference | Project standard |
| @radix-ui/react-select (via shadcn) | existing | Controlled Select with sentinel pattern | Project standard |

**No new packages required for this phase.**

---

## Architecture Patterns

### Recommended Project Structure
No new directories. All changes are extensions of existing files:
```
src-tauri/migrations/
  014_session_recipe_link.sql    # NEW — two ALTER TABLE ADD COLUMN statements

src/types/
  paintingSession.ts             # EXTEND — add recipe_id?, recipe_step_id? to both interfaces

src/db/queries/
  paintingSessions.ts            # EXTEND — update createSession INSERT, add getSessionsByRecipe

src/hooks/
  useJournalSessions.ts          # EXTEND — update useCreatePaintingSession invalidation, add useSessionsByRecipe

src/features/dashboard/
  logSessionSchema.ts            # EXTEND — add recipe_id, recipe_step_id nullable fields
  LogSessionSheet.tsx            # EXTEND — add recipe Select + step Select with conditional logic

src/features/recipes/
  RecipeDetailSheet.tsx          # EXTEND — add Sessions section below step timeline
```

### Pattern 1: Nullable Optional Zod Field (DATA-01 template)
**What:** Add nullable/optional fields to an existing Zod schema without using `.default()`.
**When to use:** Any new optional form field that can be null/undefined.
**Example (from logSessionSchema.ts):**
```typescript
// Existing pattern — DATA-01
new_status: z.enum(PAINTING_STATUS_ORDER).nullable().optional(),

// Phase 41 pattern — same shape
recipe_id: z.number().int().positive().nullable().optional(),
recipe_step_id: z.number().int().positive().nullable().optional(),
```
Nulls are supplied via `buildDefaultValues()`, never via `.default()`.

### Pattern 2: Controller-wrapped Radix Select for nullable field
**What:** The `__none__` sentinel handles Radix's prohibition on empty string values.
**When to use:** Any Select whose value can be null/unset.
**Example (from LogSessionSheet.tsx, new_status field):**
```typescript
<Controller
  name="new_status"
  control={form.control}
  render={({ field: ctrl }) => (
    <Select
      value={ctrl.value ?? "__none__"}
      onValueChange={(v) => ctrl.onChange(v === "__none__" ? null : v)}
    >
      ...
      <SelectItem value="__none__">No recipe</SelectItem>
      {recipes.map((r) => (
        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
      ))}
    </Select>
  )}
/>
```
For recipe_id the value is a number, so parse: `ctrl.onChange(v === "__none__" ? null : Number(v))`.

### Pattern 3: Step dropdown clears on recipe change
**What:** When recipe_id changes, recipe_step_id must be cleared to prevent a stale FK reference.
**When to use:** Any cascading Select where the child list depends on the parent selection.
**Implementation:** Watch recipe_id with `form.watch("recipe_id")` in a `useEffect`, call `form.setValue("recipe_step_id", null)` on change.
```typescript
const watchedRecipeId = form.watch("recipe_id");
useEffect(() => {
  form.setValue("recipe_step_id", null);
}, [watchedRecipeId, form]);
```
This must run on every recipe change, including the initial open (reset handles open; this handles in-form changes).

### Pattern 4: Recipe-scoped query hook (useRecipePaints template)
**What:** A React Query hook enabled only when a recipeId is defined, scoped to that recipe.
**When to use:** Any data that's per-recipe and conditionally needed.
**Example (from useRecipePaints.ts):**
```typescript
export const RECIPE_SESSIONS_KEY = (recipeId: number) =>
  ["recipe-sessions", recipeId] as const;

export function useSessionsByRecipe(recipeId: number | undefined) {
  return useQuery({
    queryKey: recipeId !== undefined
      ? RECIPE_SESSIONS_KEY(recipeId)
      : (["recipe-sessions"] as const),
    queryFn: () =>
      recipeId !== undefined
        ? getSessionsByRecipe(recipeId)
        : Promise.resolve([] as PaintingSession[]),
    enabled: recipeId !== undefined,
    staleTime: Infinity,
  });
}
```

### Pattern 5: getSessionsByUnit template for getSessionsByRecipe
**What:** A query using SELECT with JOIN to get sessions plus unit name in one round-trip.
**When to use:** The session row in RecipeDetailSheet needs the unit name for display. Joining avoids a second query.
**Example:**
```typescript
export async function getSessionsByRecipe(recipeId: number): Promise<SessionWithUnit[]> {
  const db = await getDb();
  return db.select<SessionWithUnit[]>(
    `SELECT ps.*, u.name AS unit_name
     FROM painting_sessions ps
     LEFT JOIN units u ON u.id = ps.unit_id
     WHERE ps.recipe_id = $1
     ORDER BY ps.session_date DESC, ps.id DESC`,
    [recipeId]
  );
}
```
Alternatively return `PaintingSession[]` and resolve unit names via the existing `useUnits()` already loaded in RecipeDetailSheet — simpler, no new type needed.

### Pattern 6: RecipeDetailSheet Field section
**What:** Use the existing `Field` helper component for the Sessions section heading.
**When to use:** Any new labeled section in RecipeDetailSheet.
**Example:**
```typescript
<Separator />
<Field label="Sessions">
  {sessions.length === 0 ? (
    <p className="text-sm text-muted-foreground">No sessions logged for this recipe yet</p>
  ) : (
    <div className="flex flex-col gap-2">
      {sessions.map((s) => (
        <div key={s.id} className="text-sm">
          <span className="font-medium">{s.session_date}</span>
          {" · "}{s.unit_name ?? "Unknown unit"}
          {" · "}{s.duration_minutes} min
          {s.notes && <p className="text-muted-foreground text-xs truncate">{s.notes}</p>}
        </div>
      ))}
    </div>
  )}
</Field>
```

### Pattern 7: Migration ALTER TABLE ADD COLUMN with ON DELETE SET NULL
**What:** SQLite does not support ADD COLUMN with FK constraint syntax in ALTER TABLE. FKs in ALTER TABLE ADD COLUMN are silently accepted syntactically but you must test behavior. The ON DELETE action is part of the column definition.
**Critical:** SQLite ALTER TABLE ADD COLUMN supports REFERENCES with ON DELETE — the FK is enforced at runtime since `PRAGMA foreign_keys = ON` is set by client.ts.
**Migration 014 shape:**
```sql
-- 014_session_recipe_link.sql — Phase 41: Link painting sessions to recipes
ALTER TABLE painting_sessions ADD COLUMN recipe_id INTEGER REFERENCES painting_recipes(id) ON DELETE SET NULL;
ALTER TABLE painting_sessions ADD COLUMN recipe_step_id INTEGER REFERENCES recipe_steps(id) ON DELETE SET NULL;
```

### Anti-Patterns to Avoid
- **Using `.default()` in Zod schemas:** Breaks react-hook-form zodResolver type inference. Documented pitfall across the whole codebase. Always use `buildDefaultValues()`.
- **Nesting Radix Portals:** RecipeDetailSheet is already a Sheet — don't open another Sheet/Dialog inside it without the sibling pattern. The sessions section is purely display, so no portal risk here.
- **Using `Promise.all` for sequential mutations:** The codebase uses sequential `mutateAsync` for error isolation (Phase 40 decision). The session submit path already does this for createSession then updateUnit.
- **Hardcoding the step SELECT as always visible:** The step dropdown must be hidden/disabled when no recipe is selected — prevents user confusion and impossible FK state.
- **Forgetting cache invalidation for recipe-sessions:** When `useCreatePaintingSession` creates a session with a recipe_id, it must invalidate `RECIPE_SESSIONS_KEY(recipe_id)` so the RecipeDetailSheet sessions section updates immediately.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Nullable Select | Custom null-handling component | `__none__` sentinel + existing Controller/Select pattern | Already established; consistent across all nullable selects in the app |
| Recipe list for picker | New query or fetch | `useRecipes()` already provides the full list | Hook already in scope in RecipeDetailSheet; same import in LogSessionSheet |
| Step list for step picker | Separate fetch | `useRecipePaints(watchedRecipeId)` — enabled only when recipe selected | Already used in RecipeDetailSheet; re-use the same hook |
| Unit name lookup in session rows | Join query or N+1 | `useUnits()` already loaded in RecipeDetailSheet | Map by id; zero extra queries |

---

## Common Pitfalls

### Pitfall 1: Migration 013 Not Registered in lib.rs
**What goes wrong:** `013_step_photos_alt_paint.sql` exists on disk but version 13 is absent from `src-tauri/src/lib.rs`. The file only registers up to version 12. If 013 was never run in production, the new phase 41 migration should be version 13. If 013 was run manually or out-of-band, it should be 14.
**Why it happens:** Likely an oversight during Phase 40 delivery — the migration file was created but not wired into lib.rs.
**How to avoid:** Wave 0 of Phase 41 must add the missing migration 013 registration to lib.rs AND add migration 014 for the session-recipe link columns. Confirm with `git log` on lib.rs to understand history.
**Warning signs:** App crashes on startup with "migration version mismatch" if the versions are wrong.

### Pitfall 2: Step Dropdown Stale Reference
**What goes wrong:** User selects Recipe A, selects Step 3, then changes to Recipe B. Step 3 is a step of Recipe A, not Recipe B. The FK insert succeeds (step exists) but the link is semantically wrong.
**Why it happens:** step dropdown value persists across recipe changes without explicit clearing.
**How to avoid:** The `useEffect` on `watchedRecipeId` clearing `recipe_step_id` to null (Pattern 3 above). This is in the locked decisions.

### Pitfall 3: createSession INSERT Column Count Mismatch
**What goes wrong:** The INSERT statement currently has 4 columns and 4 params (`$1..$4`). Adding recipe_id and recipe_step_id requires expanding to 6 columns and 6 params. The existing query test asserts the exact SQL string — it will fail until updated.
**Why it happens:** The test in `tests/hobby-journal/paintingSessionQueries.test.ts` line 39 asserts `VALUES ($1, $2, $3, $4)`.
**How to avoid:** Update both the query function AND the test in the same plan.

### Pitfall 4: useCreatePaintingSession Missing Cache Invalidation
**What goes wrong:** A session is logged with recipe_id = 5. RecipeDetailSheet for recipe 5 shows the sessions list stale (no new session visible) until page reload.
**Why it happens:** `useCreatePaintingSession.onSuccess` currently invalidates `PAINTING_SESSIONS_KEY(unit_id)`, `hobby-analytics`, `recent-activity`, and `goal-progress` — but not the new `RECIPE_SESSIONS_KEY(recipe_id)`.
**How to avoid:** Add `qc.invalidateQueries({ queryKey: RECIPE_SESSIONS_KEY(variables.recipe_id) })` inside `onSuccess`, guarded by `if (variables.recipe_id !== null && variables.recipe_id !== undefined)`.

### Pitfall 5: LogSessionSheet recipe_id Passed to createSession
**What goes wrong:** The form has `recipe_id` as a form field (may be null), but `CreateSessionInput` currently does not have that field. The `mutateAsync` call extracts fields explicitly, so new fields must be explicitly forwarded.
**Why it happens:** The `onSubmit` handler builds the `CreateSessionInput` manually (`{ unit_id, session_date, duration_minutes, notes: ... }`). Recipe_id and recipe_step_id must be added.
**How to avoid:** Extend both `CreateSessionInput` and the `onSubmit` handler in the same plan.

### Pitfall 6: Radix Select value type — number vs string
**What goes wrong:** Radix Select value must be a string. recipe_id and recipe_step_id are integers. Forgetting to `String(id)` in value and `Number(v)` in onValueChange causes type errors or silent NaN storage.
**Why it happens:** The unit_id field in LogSessionSheet already does `String(ctrl.value)` / `Number(v)` — follow the same pattern.
**How to avoid:** Copy the unit_id field's string/number conversion pattern exactly.

---

## Code Examples

### Migration 014
```sql
-- 014_session_recipe_link.sql — Phase 41: Link painting sessions to recipes/steps
-- Additive only — two nullable FK columns added via ALTER TABLE.
-- ON DELETE SET NULL: session survives deletion of recipe or step; link is cleared.
ALTER TABLE painting_sessions
  ADD COLUMN recipe_id INTEGER REFERENCES painting_recipes(id) ON DELETE SET NULL;
ALTER TABLE painting_sessions
  ADD COLUMN recipe_step_id INTEGER REFERENCES recipe_steps(id) ON DELETE SET NULL;
```

### lib.rs — migration 013 + 014 registration entries to add
```rust
Migration {
    version: 13,
    description: "step_photos_alt_paint",
    sql: include_str!("../migrations/013_step_photos_alt_paint.sql"),
    kind: MigrationKind::Up,
},
Migration {
    version: 14,
    description: "session_recipe_link",
    sql: include_str!("../migrations/014_session_recipe_link.sql"),
    kind: MigrationKind::Up,
},
```

### Extended PaintingSession type
```typescript
export interface PaintingSession {
  id: number;
  unit_id: number;
  session_date: string;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  // Phase 41
  recipe_id: number | null;
  recipe_step_id: number | null;
}

export interface CreateSessionInput {
  unit_id: number;
  session_date: string;
  duration_minutes: number;
  notes?: string | null;
  // Phase 41
  recipe_id?: number | null;
  recipe_step_id?: number | null;
}
```

### Extended createSession INSERT
```typescript
export async function createSession(input: CreateSessionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO painting_sessions (unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id) VALUES ($1, $2, $3, $4, $5, $6)",
    [
      input.unit_id,
      input.session_date,
      input.duration_minutes,
      input.notes ?? null,
      input.recipe_id ?? null,
      input.recipe_step_id ?? null,
    ]
  );
}
```

### New getSessionsByRecipe query
```typescript
// Returns PaintingSession[] — unit names resolved via useUnits() already in RecipeDetailSheet
export async function getSessionsByRecipe(recipeId: number): Promise<PaintingSession[]> {
  const db = await getDb();
  return db.select<PaintingSession[]>(
    "SELECT * FROM painting_sessions WHERE recipe_id = $1 ORDER BY session_date DESC, id DESC",
    [recipeId]
  );
}
```

### logSessionSchema extension
```typescript
export const logSessionSchema = z.object({
  unit_id: z.number({ message: "Select a unit" }).int().positive("Select a unit"),
  session_date: z.string().min(1).regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.number().int().positive().max(1440),
  notes: z.string().max(2000).nullable(),
  new_status: z.enum(PAINTING_STATUS_ORDER).nullable().optional(),
  // Phase 41 — INTEG-01
  recipe_id: z.number().int().positive().nullable().optional(),
  recipe_step_id: z.number().int().positive().nullable().optional(),
});
```

### buildDefaultValues extension
```typescript
function buildDefaultValues(defaultUnitId?: number): LogSessionFormValues {
  return {
    unit_id: defaultUnitId ?? 0,
    session_date: todayISO(),
    duration_minutes: 30,
    notes: null,
    new_status: null,
    recipe_id: null,       // Phase 41
    recipe_step_id: null,  // Phase 41
  };
}
```

### Recipe picker sort (faction-then-alpha within faction)
```typescript
function sortRecipesForPicker(recipes: PaintingRecipe[], factions: Faction[]): PaintingRecipe[] {
  const factionOrder = new Map(factions.map((f, i) => [f.id, i]));
  return [...recipes].sort((a, b) => {
    const fa = factionOrder.get(a.faction_id ?? -1) ?? 999;
    const fb = factionOrder.get(b.faction_id ?? -1) ?? 999;
    if (fa !== fb) return fa - fb;
    return a.name.localeCompare(b.name);
  });
}
```

### Step-clear useEffect in LogSessionSheet
```typescript
const watchedRecipeId = form.watch("recipe_id");
useEffect(() => {
  form.setValue("recipe_step_id", null);
}, [watchedRecipeId, form]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat recipe_paints | Structured recipe_steps (renamed) | Phase 37 / Migration 012 | `recipe_steps.id` is now the FK target for `recipe_step_id` |
| recipe_paints type name | RecipeStep interface (RecipePaint deprecated alias) | Phase 37 | Import from `@/types/recipePaint` still works via alias |
| SELECT * in session queries | SELECT * still appropriate | — | PaintingSession interface will have the new columns once migration runs |

**Confirmed current migration sequence:**
- 001–012 registered in lib.rs
- 013 (`013_step_photos_alt_paint.sql`) exists on disk, NOT in lib.rs — must be added as version 13
- 014 (`014_session_recipe_link.sql`) will be new — version 14

---

## Open Questions

1. **Was migration 013 intentionally omitted from lib.rs?**
   - What we know: The file `013_step_photos_alt_paint.sql` exists and adds `step_photo_path` and `alt_paint_id` to `recipe_steps`. The lib.rs only registers up to version 12. The Phase 40 delivery log shows these columns were used successfully.
   - What's unclear: Whether the migration was run out-of-band (direct DB edit) or if the app is erroring silently.
   - Recommendation: Wave 0 must add the version 13 entry to lib.rs. If the app is already running with those columns (Phase 40 shipped), adding the migration registration will attempt to run the ALTER TABLE statements again. SQLite ALTER TABLE ADD COLUMN does not have IF NOT EXISTS. This could cause a startup crash. **Resolution:** Either wrap in a CREATE TABLE IF NOT EXISTS or use a separate idempotent check. Safest approach: the migration registration will only run on databases that haven't had it run yet; existing databases where columns already exist will fail. **Actual resolution needed:** Verify if the migration was run on test/dev databases before adding. If it was already applied via some mechanism, the migration may need to be kept in lib.rs regardless since new installs need it.

2. **Unit name display in recipe session rows**
   - What we know: `getSessionsByRecipe` returns `PaintingSession[]` which has `unit_id`. `useUnits()` is already called in RecipeDetailSheet.
   - What's unclear: Whether to JOIN in the query or resolve in the component.
   - Recommendation: Resolve via `useUnits()` map in RecipeDetailSheet — no new query type needed, consistent with how `unit` is already resolved in RecipeDetailSheet.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest section) |
| Quick run command | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts tests/dashboard/logSessionSchema.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTEG-01 | logSessionSchema accepts recipe_id and recipe_step_id as nullable optional numbers | unit | `pnpm test -- tests/dashboard/logSessionSchema.test.ts` | Yes (extend existing) |
| INTEG-01 | createSession INSERT includes recipe_id and recipe_step_id as $5 and $6 | unit | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts` | Yes (update existing) |
| INTEG-01 | getSessionsByRecipe SELECT filters by recipe_id with correct ORDER BY | unit | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts` | Yes (add to existing) |
| INTEG-01 | LogSessionSheet recipe Select renders when recipes available | component | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | Yes (extend existing) |
| INTEG-01 | Step Select disabled when no recipe selected | component | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | Yes (extend existing) |
| INTEG-02 | RecipeDetailSheet renders sessions section with correct rows | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | Yes (extend existing) |
| INTEG-02 | RecipeDetailSheet shows empty state text when no sessions linked | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | Yes (extend existing) |
| INTEG-01 | Migration 014 SQL is additive-only (no DROP/DELETE) | content | `pnpm test -- tests/hobby-journal/migration005.test.ts` (new file) | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts tests/dashboard/logSessionSchema.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/hobby-journal/migration014.test.ts` — covers INTEG-01 migration content assertions (additive-only, both ALTER TABLE statements present)
- [ ] Add version 13 entry to `src-tauri/src/lib.rs` — unblocks any new install; required before 014 can register as version 14

*(All other test files exist and require extension, not creation)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all files read from canonical refs listed in CONTEXT.md
- `src/features/dashboard/LogSessionSheet.tsx` — form patterns, Controller/Select, `__none__` sentinel, buildDefaultValues, unit_id number/string conversion
- `src/features/dashboard/logSessionSchema.ts` — Zod nullable optional pattern (DATA-01)
- `src/features/recipes/RecipeDetailSheet.tsx` — Field helper, existing hook calls, section layout
- `src/db/queries/paintingSessions.ts` — INSERT column list, SELECT pattern, getDb() usage
- `src/hooks/useJournalSessions.ts` — PAINTING_SESSIONS_KEY, cache invalidation targets, staleTime: Infinity
- `src/hooks/useRecipePaints.ts` — recipe-scoped query hook template
- `src/types/paintingSession.ts` — current interface shape
- `src/types/recipePaint.ts` — RecipeStep interface, FK target for recipe_step_id
- `src-tauri/migrations/005_hobby_journal.sql` — painting_sessions original schema
- `src-tauri/migrations/013_step_photos_alt_paint.sql` — unregistered migration (critical gap)
- `src-tauri/src/lib.rs` — migration registration (versions 1–12 only)
- `tests/hobby-journal/paintingSessionQueries.test.ts` — exact SQL assertions to update
- `tests/dashboard/logSessionSchema.test.ts` — schema test pattern to extend
- `tests/painting/logSessionSheet.test.tsx` — component test pattern to extend
- `tests/painting/recipeDetailSheet.test.tsx` — component test pattern to extend

### Secondary (MEDIUM confidence)
- SQLite documentation on ALTER TABLE ADD COLUMN with REFERENCES — behavior confirmed from project's existing migration 013 pattern (same ALTER TABLE style used successfully)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies
- Architecture: HIGH — all patterns observed directly in existing codebase
- Pitfalls: HIGH — migration gap (013 unregistered) confirmed by direct file inspection; SQL string assertion tests directly observed
- Test gaps: HIGH — existing test files confirmed; migration014.test.ts confirmed absent

**Research date:** 2026-05-07
**Valid until:** Stable (no fast-moving dependencies; all internal codebase patterns)
