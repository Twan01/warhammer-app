# Architecture: v0.3.7 Smart Automation Integration

**Project:** HobbyForge — v0.3.7 Smart Automation
**Researched:** 2026-05-28
**Confidence:** HIGH — based on direct source reading, not inference

---

## Existing Architecture (Reference)

```
UI components  (src/features/**)
      ↓
React Query hooks  (src/hooks/use*.ts)
      ↓
Query modules  (src/db/queries/*.ts)
      ↓
DB client singleton  (src/db/client.ts)
      ↓
Tauri plugin-sql → SQLite (hobbyforge.db)
```

Pure functions in `src/lib/` sit outside all layers — no React, no DB imports. They are called from query modules and hooks alike.

---

## What Already Exists (Critical Baseline)

Before designing new components, understand what the existing codebase already does:

### Auto-Derived Statuses — ALREADY IMPLEMENTED (partial)

`src/db/queries/recipeAssignments.ts` already contains `syncDerivedStatuses()` (lines 211–272), which runs after every step progress change and assignment create/delete. It:

- Maps `painting_percentage` → `status_painting` via `percentageToStatus()` (9-tier text scale)
- Detects basing completion by scanning sections whose name contains "basing" (LIKE '%basing%')
- Detects varnish completion by scanning sections whose name contains "varnish" (LIKE '%varnish%')
- Writes `status_painting`, `status_basing`, `status_varnished` atomically in a single UPDATE

**What is NOT yet done:** Assembly status derivation. The `status_assembly` field is not auto-derived — it must still be set manually. The existing code has no `section_type`-based detection; it only uses name-matching for basing/varnish.

**Gap:** The existing basing/varnish detection is name-based (fragile). Section `section_type` column (values: `prep`, `basecoat`, `shade`, `layer`, `detail`, `effect`, `finishing`) exists on `recipe_sections` but is not used by `syncDerivedStatuses()`. The `applies_to` column (free text, e.g. "bases", "models") is also unused in automation.

### is_active_project — NOT AUTO-MANAGED

`is_active_project` (0|1 integer on `units` table) is currently a fully manual field. No code sets it based on recipe assignment lifecycle. The `createAssignment` function at line 96–104 does not touch `is_active_project`.

### Recipe Pre-fill — PARTIAL

`RecipeFormSheet` has `faction_id` and `unit_id` fields. `buildDefaults()` populates them from an existing recipe on edit, but `DEFAULT_VALUES` sets both to `null` for new recipes. The `useActiveFaction()` context provides `activeFactionId` globally but is not wired into `RecipeFormSheet`.

### Battle-Readiness in Unit Picker — NOT IMPLEMENTED

`UnitPickerDialog` calls `useUnits()` and shows `unit.category` as the only badge. It does not display `status_painting`, `painting_percentage`, `status_assembly`, `status_basing`, or `status_varnished`. The `getArmyListWithUnits()` query already selects `status_assembly`, `status_painting`, `painting_percentage` on joined rows (for the unit rows inside the list), but this data is not used in the picker itself.

---

## Feature 1: Auto-Derive Assembly from Recipe Section Completion

### What to Build

Extend `syncDerivedStatuses()` in `src/db/queries/recipeAssignments.ts` to detect "prep" sections:

- Query: count incomplete steps in sections where `section_type = 'prep'` (type-safe, not name-based)
- If all steps in all `prep`-type sections are complete AND at least one `prep` section exists → `status_assembly = 1`
- Adopt the same pattern already used for basing/varnish detection

**Parallel improvement:** Migrate existing basing/varnish detection from name-matching to `section_type`-matching. The `section_type = 'finishing'` value maps to varnish/final coat. This requires a convention: treat `finishing` as the varnish trigger. The existing name-based LIKE '%varnish%' and LIKE '%basing%' can remain as fallbacks for recipes without `section_type` set.

### Integration Points

**Modified file:** `src/db/queries/recipeAssignments.ts`
- `syncDerivedStatuses()` — add assembly detection SQL (same pattern as lines 229–266)
- No new query function needed

**Cache invalidation:** Already correct. `upsertStepProgress` → `syncPaintingPercentageFromAssignment` → `syncDerivedStatuses` → writes `status_assembly`. The hook `useToggleStepProgress` already invalidates `UNITS_KEY`, which refreshes all unit-dependent UI.

**No new hook or component needed.** This is a pure query-layer change.

### New SQL Pattern (assembly detection)

```sql
-- Check assembly: all steps in sections where section_type = 'prep' are complete
SELECT COUNT(*) AS incomplete
FROM recipe_steps rs
JOIN recipe_sections sec ON sec.id = rs.section_id
JOIN unit_recipe_assignments a ON a.recipe_id = rs.recipe_id AND a.unit_id = $1
LEFT JOIN unit_recipe_step_progress sp ON sp.assignment_id = a.id AND sp.recipe_step_id = rs.id
WHERE sec.section_type = 'prep'
  AND (sp.completed IS NULL OR sp.completed = 0)
```

Plus the "has any prep sections" guard:

```sql
SELECT COUNT(*) AS cnt
FROM recipe_sections sec
JOIN unit_recipe_assignments a ON a.recipe_id = sec.recipe_id AND a.unit_id = $1
WHERE sec.section_type = 'prep'
```

---

## Feature 2: Auto-Manage is_active_project from Recipe Assignment Lifecycle

### What to Build

Two trigger points:

**On recipe assign (createAssignment / bulkCreateAssignments):**
- After the INSERT, run: `UPDATE units SET is_active_project = 1, updated_at = datetime('now') WHERE id = $unitId AND painting_percentage < 100`
- Condition: only auto-activate if not already at 100% (avoid re-activating a completed unit)

**On all steps completed (via syncDerivedStatuses, after percentageToStatus returns "Completed"):**
- Run: `UPDATE units SET is_active_project = 0, updated_at = datetime('now') WHERE id = $unitId`
- Only runs when `pct === 100`

**On assignment delete (deleteAssignment):**
- If no remaining assignments after delete: `UPDATE units SET is_active_project = 0, updated_at = datetime('now') WHERE id = $unitId`
- Fetching remaining count is already done in `deleteAssignment` (it reads `unit_id` before delete), so adding a count check is cheap

### Integration Points

**Modified file:** `src/db/queries/recipeAssignments.ts`
- `syncPaintingPercentageByUnitId()` — after calling `syncDerivedStatuses`, add active-project auto-clear when `pct === 100`
- `createAssignment()` — after `syncPaintingPercentageByUnitId`, add auto-activate UPDATE
- `bulkCreateAssignments()` — same auto-activate UPDATE inside the loop, after the per-unit sync
- `deleteAssignment()` — after delete, check remaining assignment count, auto-deactivate if zero

**New private helper:** `autoManageActiveProject(db, unitId, pct)` — reads `pct`, sets `is_active_project` to 0 if `pct === 100`, to 1 if assignment just created (caller passes `force = true`).

**Cache invalidation:** `UNITS_KEY` invalidation is already in all the relevant mutation hooks. No new keys needed.

### Design Decision

Do NOT add a separate `autoManageActiveProject` query function to the public API. Keep this logic private inside `recipeAssignments.ts` to maintain query-layer isolation (ARCH-01 constraint: zero feature imports from query layer).

---

## Feature 3: Smart Context Pre-filling in Forms

### Sub-feature 3a: Faction Pre-fill in New Recipe Form

**What to build:** When opening `RecipeFormSheet` to create a new recipe, default `faction_id` to `activeFactionId` from `ActiveFactionContext`.

**Modified file:** `src/features/recipes/RecipeFormSheet.tsx`
- Change `buildDefaults` signature: `buildDefaults(recipe: PaintingRecipe | null, defaultFactionId?: number | null)`
- When `recipe` is null (new recipe), set `faction_id: defaultFactionId ?? null`
- Caller (`RecipesPage` or wherever `RecipeFormSheet` is invoked) passes `activeFactionId` from `useActiveFaction()`

**Alternative (simpler):** Change `DEFAULT_VALUES` to be a factory function inside `RecipeFormSheet` that reads `useActiveFaction()` at render time, then calls `form.reset(buildDefaults(recipe))` in the `useEffect` that fires when `open` changes. This keeps the pre-fill logic inside the component.

**Recommended approach:** Factory inside `RecipeFormSheet` using `useActiveFaction()` — no prop threading needed.

**Files modified:**
- `src/features/recipes/RecipeFormSheet.tsx` — add `useActiveFaction()` call, update `buildDefaults` factory

**No query or hook changes needed.**

### Sub-feature 3b: Recipe Picker Filtering by Unit Context

**What to build:** When `ApplyRecipeDialog` is opened from a unit's context (unit detail, collection page), filter the recipe list to show same-faction recipes first (not exclusively — user should still reach all recipes).

**Current state:** `ApplyRecipeDialog` receives `unitId` but only uses it for the assignment mutation. It loads all recipes via `useRecipes()`.

**What to change:** Add a `factionId?: number | null` prop to `ApplyRecipeDialog`. Use it to sort/group the recipe list: faction-matching recipes appear in a "Suggested" group at top, remaining recipes in "Other" group below.

**Modified files:**
- `src/features/recipes/ApplyRecipeDialog.tsx` — add `factionId` prop, split recipes into two groups using cmdk `CommandGroup`
- Call sites where `ApplyRecipeDialog` is used — pass `unit.faction_id`

**No query or hook changes needed.** The faction-match filtering is pure in-component computation on already-loaded data.

### Sub-feature 3c: Unit Context Pre-fill in ApplyToUnitsDialog

**What to build:** `ApplyToUnitsDialog` (bulk apply from recipe page) currently shows all units. Add faction pre-filtering: if `recipe.faction_id` is set, move same-faction units to the top or pre-select them.

**Modified file:** `src/features/recipes/ApplyToUnitsDialog.tsx`
- Sort `units` so that `unit.faction_id === recipe.faction_id` units appear first in the command list
- No filtering (user should still reach all units)

**Minimal change, pure component logic.**

---

## Feature 4: Battle-Readiness Display in Unit Picker

### What to Build

Enrich `UnitPickerDialog` to show painting status alongside each unit so the user can make informed army-building decisions.

**Readiness signal:** A unit is "battle ready" for typical army purposes when:
- `status_assembly === 1` (assembled)
- `status_painting !== "Not Started"` (at least primed)
- OR per personal preference — the current collection's definition of "ready"

The existing `unit.status_painting`, `unit.painting_percentage`, `unit.status_assembly`, `unit.status_basing` are already on the `Unit` type and available from `useUnits()`.

### Integration Points

**Modified file:** `src/features/army-lists/UnitPickerDialog.tsx`
- Uses `useUnits()` already — data already available, no new query
- Add a readiness indicator per unit row (colored dot or badge)
- Sort order: battle-ready units first, then in-progress, then not started

**New pure function:** `src/lib/computeUnitReadiness.ts`
```ts
export type UnitReadinessTier = "ready" | "in-progress" | "not-started";

export function computeUnitReadiness(unit: Pick<Unit,
  "status_assembly" | "status_painting" | "painting_percentage"
>): UnitReadinessTier {
  if (unit.painting_percentage === 100) return "ready";
  if (unit.status_assembly === 1 || unit.painting_percentage > 0) return "in-progress";
  return "not-started";
}
```

**This function has no deps on React or DB** — testable in isolation, consistent with `computeAssignmentProgress` pattern.

**No new hook needed.** `useUnits()` data is sufficient.

**Sort in UnitPickerDialog:** `useMemo` to sort `filteredUnits` by readiness tier before rendering. Ready units first, then in-progress, then not-started.

---

## New Components and Functions Summary

| Asset | Type | New/Modified | File |
|-------|------|--------------|------|
| `syncDerivedStatuses` assembly detection | Query function (private) | Modified | `src/db/queries/recipeAssignments.ts` |
| `autoManageActiveProject` | Query helper (private) | New (private) | `src/db/queries/recipeAssignments.ts` |
| `createAssignment` active-project trigger | Query function | Modified | `src/db/queries/recipeAssignments.ts` |
| `bulkCreateAssignments` active-project trigger | Query function | Modified | `src/db/queries/recipeAssignments.ts` |
| `deleteAssignment` active-project auto-clear | Query function | Modified | `src/db/queries/recipeAssignments.ts` |
| `computeUnitReadiness` | Pure lib function | New | `src/lib/computeUnitReadiness.ts` |
| `RecipeFormSheet` faction pre-fill | UI component | Modified | `src/features/recipes/RecipeFormSheet.tsx` |
| `ApplyRecipeDialog` faction filtering | UI component | Modified | `src/features/recipes/ApplyRecipeDialog.tsx` |
| `ApplyToUnitsDialog` faction sorting | UI component | Modified | `src/features/recipes/ApplyToUnitsDialog.tsx` |
| `UnitPickerDialog` readiness display | UI component | Modified | `src/features/army-lists/UnitPickerDialog.tsx` |

**No new hook files needed.** All automation runs in the query layer and propagates via existing `UNITS_KEY` cache invalidation. No new React Query keys needed. No new migrations needed.

---

## Data Flow Changes

### Before (status updates)

```
User toggles step → upsertStepProgress
                  → syncPaintingPercentage (painting_percentage, status_painting)
                  → syncDerivedStatuses (status_basing via name-match, status_varnished via name-match)
                  → UNITS_KEY invalidated
```

### After (status updates)

```
User toggles step → upsertStepProgress
                  → syncPaintingPercentage (painting_percentage, status_painting)
                  → syncDerivedStatuses (status_assembly via section_type='prep',
                                         status_basing via section_type + name fallback,
                                         status_varnished via section_type + name fallback)
                  → autoManageActiveProject (is_active_project = 0 if pct=100)
                  → UNITS_KEY invalidated
```

### Before (recipe assignment)

```
User assigns recipe → createAssignment → syncPaintingPercentageByUnitId
                   → UNIT_ASSIGNMENTS_KEY, KANBAN_ENRICHMENT, NEXT_PAINTING_ACTION, UNITS_KEY invalidated
```

### After (recipe assignment)

```
User assigns recipe → createAssignment → syncPaintingPercentageByUnitId
                                       → autoManageActiveProject (is_active_project = 1 if pct < 100)
                   → (same cache invalidations — UNITS_KEY already covers is_active_project)
```

---

## Cache Invalidation Contract

The existing `UNITS_KEY` invalidation in every mutation hook (`useCreateAssignment`, `useDeleteAssignment`, `useToggleStepProgress`, `useBulkCreateAssignments`, `useCompleteStep`) already covers all the unit columns being modified by the automation. **No new cache keys are needed.**

The existing symmetry rule (if useCreate invalidates a key, useDelete must too) is maintained — `is_active_project` flows through the same `UNITS_KEY` path.

---

## Suggested Build Order

### Phase 1: Query-layer automation (no UI risk)
Work entirely in `src/db/queries/recipeAssignments.ts`:
1. Extend `syncDerivedStatuses` with assembly detection (`section_type = 'prep'`)
2. Migrate basing/varnish detection to prefer `section_type` with name-match fallback
3. Add `autoManageActiveProject` private helper
4. Wire `autoManageActiveProject` into `createAssignment`, `bulkCreateAssignments`, `deleteAssignment`

**Why first:** Pure backend logic. Zero UI changes. Easy to test with existing better-sqlite3 data-layer tests. De-risks the most complex change before UI work begins.

### Phase 2: Pure function + unit picker readiness
1. Write `src/lib/computeUnitReadiness.ts` with unit tests
2. Modify `UnitPickerDialog` to sort and display readiness

**Why second:** Isolated to a new pure function (testable) + a single component modification. No form state involved. Low risk.

### Phase 3: Smart pre-filling in recipe forms
1. Modify `RecipeFormSheet` to pre-fill `faction_id` from `useActiveFaction()`
2. Modify `ApplyRecipeDialog` to accept and use `factionId` prop for group ordering
3. Modify `ApplyToUnitsDialog` to sort by faction match

**Why last:** Form state changes require careful reset testing (`useEffect` on `open` flag). Do after simpler changes are validated.

---

## Pitfalls and Constraints

### Constraint: tauri-plugin-sql cannot nest transactions
All automation SQL in `syncDerivedStatuses` uses auto-commit per statement (confirmed by comments in existing code). This is intentional and correct — do not attempt to wrap the status sync in a BEGIN/COMMIT.

### Constraint: COALESCE for nullable field updates vs direct assignment
`status_assembly` uses COALESCE in `updateUnit` (line 84 of units.ts: `status_assembly = COALESCE($9, status_assembly)`). This means writing `null` will not clear the field. The automation always writes `1` or `0` explicitly — never `null` — so this is fine. Do not change the update pattern.

### Pitfall: Conflicting manual and auto-derived assembly
If a user manually sets `status_assembly = 1` before completing any recipe steps, `syncDerivedStatuses` will overwrite it with `0` the next time a step is toggled (if no `prep` sections exist with all steps complete). **Resolution:** Only auto-derive `status_assembly` when the unit has at least one recipe with a `prep`-typed section. Without a `prep` section, leave `status_assembly` untouched. This matches the existing pattern for basing/varnish (the `hasBasingSections.cnt > 0` guard at line 246).

### Pitfall: is_active_project auto-clear on 100% may surprise user
If user completes all steps but wants to keep the unit marked as active (e.g. for touch-up work), the auto-clear will remove the flag. **Resolution:** Accept this behavior — "completed = done" is the intended semantic. The user can re-activate manually. This matches the existing `percentageToStatus` logic that sets `"Completed"` at 100%.

### Pitfall: section_type column may be null for recipes created before v0.2.9
Most existing recipe sections will have `section_type = NULL` (workflow metadata was added in Phase 57). The assembly detection query uses `WHERE sec.section_type = 'prep'` which will match nothing for these sections — leaving `status_assembly` unchanged. This is correct and safe: name-based fallback for basing/varnish still applies.

### Pitfall: Faction pre-fill in RecipeFormSheet conflicts with "reset on open"
The component already calls `form.reset(buildDefaults(recipe))` in a `useEffect([open])`. If `useActiveFaction()` value changes between opens, the pre-fill must be read at `useEffect` time, not at component definition time. The factory function approach (read `activeFactionId` inside the `useEffect` callback) avoids stale closure.

### Constraint: ApplyRecipeDialog factionId is for display sorting only
Do NOT hide recipes that don't match the faction. The user may want to apply a generic (no faction) recipe or a borrowed recipe. Grouping is the correct UX — not filtering.

---

## What Requires No Changes

- `src/db/queries/units.ts` — `updateUnit` does not need modification; all automation writes go through internal helpers in `recipeAssignments.ts` using the raw `db.execute` handle
- `src/hooks/useRecipeAssignments.ts` — all cache keys and invalidation chains are already correct
- `src/hooks/useUnits.ts` — no changes; existing `UNITS_KEY` invalidation covers all new writes
- All migration files — no schema changes needed for any of these features
- `src-tauri/src/lib.rs` — no new Rust commands needed

---

## Sources

- `src/db/queries/recipeAssignments.ts` — verified: `syncDerivedStatuses` (lines 211–272), `createAssignment` (96–104), `deleteAssignment` (110–119), `bulkCreateAssignments` (167–179)
- `src/db/queries/units.ts` — verified: `updateUnit` COALESCE pattern (73–114)
- `src/hooks/useRecipeAssignments.ts` — verified: all cache invalidation chains
- `src/hooks/useUnits.ts` — verified: `UNITS_KEY` invalidation coverage
- `src/features/army-lists/UnitPickerDialog.tsx` — verified: current unit display (no readiness)
- `src/features/recipes/RecipeFormSheet.tsx` — verified: `DEFAULT_VALUES` and `buildDefaults` (no faction pre-fill on create)
- `src/features/recipes/ApplyRecipeDialog.tsx` — verified: full recipe list, no faction grouping
- `src/types/recipeSection.ts` — verified: `SECTION_TYPES` const array including `"prep"` and `"finishing"`
- `src/types/unit.ts` — verified: `status_assembly`, `status_basing`, `status_varnished`, `is_active_project` field types
- `src/lib/computeAssignmentProgress.ts` — verified: pure function pattern used as template for `computeUnitReadiness`
- `.planning/PROJECT.md` — v0.3.7 feature targets and architectural constraints
