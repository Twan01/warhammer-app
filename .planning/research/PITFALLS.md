# Pitfalls Research

**Domain:** Adding Paint Inventory UI, Army List Builder, and Unit Playbook to an existing Tauri + React + SQLite app (HobbyForge v1.1)
**Researched:** 2026-05-01
**Confidence:** HIGH — all pitfalls derived from reading the actual codebase, not from general advice. Each entry names the specific file or code path that creates the risk.

---

## Critical Pitfalls

### Pitfall 1: COALESCE Update Pattern Cannot Clear a Field to NULL

**What goes wrong:**
`updateUnit`, `updatePaint`, and `updateRecipe` in `src/db/queries/` use `SET col = COALESCE($n, col)`. This means passing `null` for a field is a no-op — the current DB value is kept. You cannot clear an optional field to NULL via a partial update. For the Army List Builder, `points_override` on `army_list_units` starts as NULL (meaning "inherit from unit.points") and must be clearable back to NULL after being set. Using the existing COALESCE pattern will make "clear override" permanently impossible.

**Why it happens:**
The COALESCE pattern was chosen in v1.0 for partial updates (e.g., `useUpdateUnit({ id, is_active_project: 1 })` without having to send all 20 columns). It works because v1.0 never needed to set a column back to NULL after it had a value. `points_override` breaks this assumption.

**How to avoid:**
Write `army_list_units` queries with full-replacement semantics: always pass every column, never use COALESCE. For `updateArmyListUnit`, the update SQL should be `SET points_override = $2, notes = $3` with explicit null-able parameters, not `COALESCE`. Do not copy the existing COALESCE pattern for this table. The same applies to any Unit Playbook field (stats, abilities) where the user may want to erase a value they previously entered.

**Warning signs:**
- "Clear override" button calls `updateArmyListUnit({ id, points_override: null })` but the DB value stays unchanged
- Unit Playbook stats that can't be zeroed out because `0` passes through COALESCE but `null` does not

**Phase to address:** Army List Builder plan (the `army_list_units` query layer). Unit Playbook plan (the `unit_strategy_notes` update query).

---

### Pitfall 2: OC = 0 Is a Valid Stat — Zod `.min(1)` Silently Rejects It

**What goes wrong:**
Objective Control (OC) in Warhammer 40K 10th edition is a legitimate stat that can be 0 for some units (units that cannot score objectives at all). If the Unit Playbook stats schema uses `z.number().int().min(1)` on any stat field, saving OC = 0 will fail Zod validation and silently revert to the previous value or block submission with a confusing error.

**Why it happens:**
The existing `unitSchema.ts` uses `z.number().int().min(0)` on fields like `model_count` and `owned_count`. A developer writing the playbook schema may instinctively type `.min(1)` for stats that "should be positive," not knowing OC is the exception. Similarly, a unit with M (Movement) = 0 is theoretically possible for stationary emplacements.

**How to avoid:**
All Unit Playbook stat fields (M, T, Sv, W, Ld, OC) must use `z.number().int().min(0)` or `z.number().int().nonnegative()`. Add a comment in the schema file explicitly noting that OC = 0 is valid. Sv (Save) is expressed as a number 2–6 representing `2+` to `6+` — define the range as `.min(2).max(6)` and note the convention. Do not use a string like `"3+"` for Sv — store the integer, display with the `+` suffix in the UI.

**Warning signs:**
- Unit Playbook form rejects OC = 0 submission
- Stats schema uses `.positive()` or `.min(1)` on any stat field
- Sv stored as a string `"3+"` in the DB instead of integer `3`

**Phase to address:** Unit Playbook plan — stat schema definition, before the form is built.

---

### Pitfall 3: Migration 002 Must Be Purely Additive — No Column Renames, No DROP

**What goes wrong:**
The existing `001_core_schema.sql` already includes the `unit_strategy_notes` table (for Unit Playbook), `army_lists` and `army_list_units` tables (for Army List Builder). These tables exist in the schema but are currently empty. When v1.1 adds a migration `002` to add Unit Playbook stat columns (`movement`, `toughness`, `save`, `wounds`, `leadership`, `oc`) to `unit_strategy_notes`, using `DROP TABLE` + `CREATE TABLE` instead of `ALTER TABLE ... ADD COLUMN` will destroy any existing user-entered rows.

Even more dangerous: if a developer decides to rename a column in `001_core_schema.sql` directly (treating the migration file as a draft), the migration runner will not rerun it (it's already marked as applied in `_sqlx_migrations`). The schema seen by the app diverges silently from the schema in source control.

**How to avoid:**
Migration `002` must use only `ALTER TABLE unit_strategy_notes ADD COLUMN movement INTEGER`, one per stat field, never DROP. Never edit `001_core_schema.sql` again — it is immutable. New columns added in `002` will be NULL by default for existing rows; document this in the migration comment. Verify migration is additive before running: the words `DROP` and `CREATE TABLE` should not appear in any `002_*.sql` file.

**Warning signs:**
- `002_*.sql` contains `DROP TABLE` or `CREATE TABLE unit_strategy_notes`
- Developer edits `001_core_schema.sql` to add the stat columns instead of creating a new file
- App startup fails with "table already exists" or "no such column" after schema change

**Phase to address:** Unit Playbook plan — the migration file must be reviewed before being committed.

---

### Pitfall 4: army_list_units.unit_id Uses RESTRICT — Deleting a Unit Silently Fails

**What goes wrong:**
`army_list_units.unit_id` is declared `REFERENCES units(id) ON DELETE RESTRICT`. Attempting to delete a unit that is referenced in any army list will throw a foreign key violation. The existing `useDeleteUnit` hook comments say "FK errors ... reject — handled by component try/catch with toast." The Unit Collection delete dialog (`UnitDeleteDialog`) does not warn users about army list membership before attempting the delete, causing a confusing error toast instead of a helpful "this unit is in 2 army lists" message.

**Why it happens:**
The FK protection is correct and intentional (you don't want orphaned list entries), but the UI doesn't surface it. In v1.0 this wasn't an issue because army lists didn't exist in the UI. In v1.1, users will actually have army lists.

**How to avoid:**
Before calling `deleteUnit`, query `army_list_units WHERE unit_id = ?` and count the rows. If count > 0, show a dialog that says "This unit is in N army list(s). Remove it from all lists before deleting." Do not attempt the delete until the user has cleaned up the lists, or add a "Remove from all lists then delete" option that CASCADE-removes the `army_list_units` rows first. This check belongs in the `UnitDeleteDialog` component, which already exists at `src/features/units/UnitDeleteDialog.tsx`.

**Warning signs:**
- Unit delete shows a generic error toast instead of actionable guidance
- `UnitDeleteDialog` does not query `army_list_units` before attempting delete
- Developers assume FK errors are "edge cases" when army lists are being actively used

**Phase to address:** Army List Builder plan — add the pre-delete check when building the list feature, before it's possible to have units in lists.

---

### Pitfall 5: Unit Playbook Form Inside UnitDetailSheet Creates a Nested Submit Problem

**What goes wrong:**
`UnitDetailSheet` (`src/features/units/UnitDetailSheet.tsx`) is a read-only `<Sheet>`. The plan is to add a "Playbook" tab inside this Sheet using the shadcn `<Tabs>` component. If the Playbook tab contains a react-hook-form `<form>` with a `<Button type="submit">`, the submit button will trigger the closest ancestor `<form>`. If the edit sheet (`UnitSheet`) is also open at the same time (stacked sheets pattern), pressing Enter or clicking submit in the inner form may fire the wrong form's `handleSubmit`. Even with only one open sheet, an `<form>` nested inside a `<Sheet>` that also has footer buttons can produce double-submit behavior.

**Why it happens:**
The `RecipeFormSheet` demonstrates the safe pattern: the form `<form>` element wraps the entire `SheetContent` body, and the submit button is inside that form. The `UnitDetailSheet` is read-only and has no form today. Adding a form inside one of its tabs puts a `<form>` inside what was previously a display-only `<SheetContent>`. The risk is compounded if the Playbook tab's form accidentally inherits a parent form's submit handler.

**How to avoid:**
Do not put a `<form>` element inside the Playbook tab content if `UnitDetailSheet` already has an outer `<form>` element. Instead, one of two patterns:
1. Make the entire detail Sheet a form-capable Sheet (like `RecipeFormSheet`) and handle saves per-tab.
2. Use `react-hook-form` with `handleSubmit` triggered by a button's `onClick` (not `type="submit"` on a form child). Pass `form.handleSubmit(onSave)` directly to the button's `onClick`, and use a plain `<div>` as the container instead of `<form>`.

Check `UnitDetailSheet.tsx` before building the Playbook tab — currently there is no `<form>` wrapper, only a `<div className="flex flex-col gap-4 p-4">`. This is safe — add the Playbook's react-hook-form but do NOT wrap its controls in a `<form>` element. Call `form.handleSubmit(onSave)()` from a button's `onClick` instead.

**Warning signs:**
- Playbook save button is `type="submit"` inside a `<form>` element inside `SheetContent`
- Pressing Enter in a Playbook text field triggers an unexpected navigation or page action
- Two `<form>` elements exist in the same Sheet's DOM tree

**Phase to address:** Unit Playbook plan — Playbook tab form architecture decision before any code is written.

---

### Pitfall 6: Stale Points in Army List When Unit.points Changes

**What goes wrong:**
`army_list_units` has a `points_override INTEGER` column. The intended behavior is: if `points_override IS NULL`, display and sum `unit.points`; if `points_override IS NOT NULL`, use the override. If a unit's `points` value is later edited (user changes it in the collection), any army list using that unit with `points_override IS NULL` should automatically reflect the new points in its total — which is correct behavior. BUT the `getArmyListWithUnits` query must JOIN `units` to get the live points value, not cache points at list-creation time. If the query stores `unit.points` in a local variable at the time of insertion, the list total goes stale.

**Why it happens:**
A naive implementation of army list totals might store `points_at_time_of_add` as a non-null column instead of relying on the JOIN. Alternatively, a front-end developer might cache the points value in React state after fetching the list, then display that cached value without re-fetching when the unit is edited.

**How to avoid:**
The `getArmyList` SQL query must JOIN `army_list_units` to `units` on every fetch:
```sql
SELECT alu.id, alu.list_id, alu.unit_id, alu.points_override, alu.notes,
       u.name, u.points AS unit_points, u.faction_id,
       COALESCE(alu.points_override, u.points) AS effective_points
FROM army_list_units alu
JOIN units u ON u.id = alu.unit_id
WHERE alu.list_id = $1
```
Never store `unit.points` redundantly in `army_list_units`. The `effective_points` value is computed per-query. Army list mutations (`useCreateArmyList`, `useUpdateArmyList`) must also invalidate `['units']` if unit points are changed from within the list builder.

**Warning signs:**
- `army_list_units` has a `points` or `points_at_add` column that is not `points_override`
- Army list total is computed in the React component from cached unit data, not from the query result
- Army list total does not update after editing a unit's points in the Collection page

**Phase to address:** Army List Builder plan — the JOIN query design before any list UI is built.

---

## High-Severity Pitfalls

### Pitfall 7: Paint Inventory Filter State Leaks Between "All Paints" and "Used in Recipe" Views

**What goes wrong:**
The Paint Inventory page needs three distinct views: (1) all paints, (2) running low, (3) wishlist. These are implemented as toggle buttons or tabs that change the active filter. The existing Collection page uses a Zustand store (`src/features/units/collectionFilters.ts`) for filter state. If a similar Zustand store is created for paint filters and the store persists across navigation (Zustand stores are module-level singletons), switching from "/paints?view=running-low" to "/collection" and back to "/paints" will correctly restore the running-low filter — but this may be surprising or unwanted behavior if the user expected to see all paints.

More critically, the "used in recipes" back-link feature (clicking a recipe's paint link → opening the paint filtered to that paint) requires either URL search params or a cross-module store signal. If implemented as shared Zustand state, setting `selectedPaintId` from the Recipe detail sheet may conflict with existing filter state.

**How to avoid:**
Create a dedicated `paintInventoryFilters.ts` Zustand store in `src/features/paints/` mirroring the pattern in `collectionFilters.ts`. Keep the three views (all/running-low/wishlist) as a single `view: 'all' | 'running_low' | 'wishlist'` field in the store, not as separate filter toggles. For "used in recipes" navigation, use TanStack Router search params (`/paints?highlight=42`) rather than Zustand, so the navigation state is URL-driven and doesn't corrupt filter state. Reset the view to `'all'` on store initialization (don't persist to localStorage for v1.1).

**Warning signs:**
- Running-low filter is still active when the user navigates away and returns expecting all paints
- "Used in recipes" feature implemented as a Zustand action that collides with existing filter selectors
- Paint page has two separate Zustand stores that can get out of sync

**Phase to address:** Paint Inventory UI plan — filter store design before the UI components are written.

---

### Pitfall 8: "Used in Recipes" JOIN Query Conflicts With the Existing `getPaints()` Flat Query

**What goes wrong:**
`src/db/queries/paints.ts` `getPaints()` returns `Paint[]` using `SELECT * FROM paints`. The "used in recipes" back-link requires knowing, for each paint, how many recipes use it and which ones. This is a GROUP BY JOIN query:
```sql
SELECT p.*, COUNT(rp.id) as recipe_count FROM paints p
LEFT JOIN recipe_paints rp ON rp.paint_id = p.id
GROUP BY p.id
```
If this extended result is added to `getPaints()` and its return type is changed from `Paint[]` to `PaintWithRecipeCount[]`, every existing consumer of `getPaints()` (PaintsPage, PaintSheet, RecipeFormSheet's `usePaints()`, RecipeDetailSheet's `usePaints()`) would need to be updated or would receive unexpected extra columns.

**How to avoid:**
Do not modify `getPaints()`. Add a new query function `getPaintsWithRecipeCount()` that returns `PaintWithRecipeCount[]` (which extends `Paint` with `recipe_count: number`). Use `usePaintsWithRecipeCount()` only in the Paint Inventory page where the column is needed. The existing `usePaints()` hook remains unchanged. The recipe count is display-only — zero, one, or many — not a filter criterion for v1.1.

**Warning signs:**
- `getPaints()` return type is modified from `Paint[]`
- `usePaints()` is the same hook used in `RecipeFormSheet` and `PaintsPage`, causing both to fetch recipe count data they don't need
- `PaintWithRecipeCount` is imported in components that only need `Paint`

**Phase to address:** Paint Inventory UI plan — query layer decisions before adding the JOIN.

---

### Pitfall 9: Playbook Tab Mounts a useForm That Fetches Even When Tab Is Not Active

**What goes wrong:**
Adding a "Playbook" tab to `UnitDetailSheet` means the tab content (including its `useForm`, data-fetching hooks, and DB query for `unit_strategy_notes`) mounts when the Sheet opens, regardless of which tab is active. If `useStrategyNotes(unit.id)` fires an IPC query every time any tab in the detail sheet is viewed — even if the user never opens the Playbook tab — it creates unnecessary round-trips.

With Radix Tabs, tab content is rendered but not displayed when inactive (by default, Radix renders all tab panel content but hides inactive panels with CSS). This means the hook IS mounted and the query IS fired when the sheet opens.

**How to avoid:**
Use the `lazy` prop on tab content (if available in this version of Radix Tabs) or conditionally render the tab panel:
```tsx
<TabsContent value="playbook">
  {activeTab === 'playbook' && <PlaybookTabContent unit={unit} />}
</TabsContent>
```
Alternatively, since the IPC round-trip is fast on a local SQLite file (sub-5ms), accept the eager fetch and set a `staleTime` of `Infinity` on the `unit_strategy_notes` query — it only changes when the user saves. The important thing is to not do expensive computation on every tab switch. Check the shadcn Tabs implementation in `src/components/ui/tabs.tsx` — it uses `TabsPrimitive.Content` from Radix which renders hidden panels by default, confirming the hook-mounts-immediately behavior.

**Warning signs:**
- IPC calls to `unit_strategy_notes` table fire when opening any unit's detail sheet, not just when the Playbook tab is clicked
- Console shows fetch activity when switching between non-Playbook tabs

**Phase to address:** Unit Playbook plan — tab architecture and query strategy.

---

### Pitfall 10: Army List Total Points Computation: Client vs DB Mismatch

**What goes wrong:**
The army list points total (sum of `COALESCE(points_override, unit.points)` for all entries) can be computed two ways: in SQL (via the JOIN query described in Pitfall 6) or in the React component by summing the rows. If these two computations produce different results — because one path has stale data or applies different null-handling — the displayed total will flicker or disagree between the list header and the individual row sums.

**Why it happens:**
When a unit has `points = null` in the database (user never entered a points value) and `points_override = null` in the army list, `COALESCE(null, null)` is `null`. If the React code treats `null` as `0` for summation but SQL treats it as `NULL` (which excludes from SUM), the totals disagree. Additionally, the army list "painted points" calculation (points of painted units only) must also handle null points correctly.

**How to avoid:**
Compute all points totals in SQL, not in the React component. The query should return `effective_points` per row, and the React component sums those values. Define the null rule once in SQL: `COALESCE(alu.points_override, u.points, 0)` — null points count as 0. Document this convention in the query file. The React component sums `row.effective_points` using `reduce`, never re-implementing the COALESCE logic.

**Warning signs:**
- Points total computed by `data.reduce((sum, r) => sum + (r.points_override ?? r.unit_points ?? 0), 0)` in a React component
- The SQL query and the React sum produce different totals when any unit has null points
- "Painted points" subtotal computed differently than the main total

**Phase to address:** Army List Builder plan — define point calculation convention before building the list display.

---

## Moderate Pitfalls

### Pitfall 11: Paint Inventory Table Uses Same Column Keys as Collection Table, Breaking Column Visibility State

**What goes wrong:**
The Collection page uses TanStack Table with column IDs like `name`, `faction`, `status`, `points`. If the Paint Inventory page reuses the same Zustand column visibility store (if one is created) or if TanStack Table column IDs happen to collide, hiding a column on one page may persist to the other page's table. Both tables exist simultaneously in the module cache.

**How to avoid:**
Paint Inventory table column IDs should be namespaced or simply kept as plain strings that clearly differ from Collection columns (`paint_name`, `paint_type`, `brand` vs `unit_name`, `faction`, `status`). More importantly, column visibility state — if stored at all — must be in separate Zustand store slices. In practice, neither the Collection table nor the Paint Inventory table needs persistent column visibility in v1.1 (all columns visible by default is the existing decision), so this is only a risk if column toggling is added.

**Warning signs:**
- Two TanStack Table instances share a Zustand key named `columnVisibility`
- Hiding "Brand" on the paints table also hides "Faction" on the collection table

**Phase to address:** Paint Inventory UI plan — use separate state per table.

---

### Pitfall 12: Zustand Store for Paint Filters Is a Module Singleton — Test Pollution

**What goes wrong:**
The existing `collectionFilters.ts` Zustand store is a module-level singleton created with `create()`. In the vitest test environment, module-level state persists between tests unless explicitly reset. If paint filter state is implemented the same way and tests modify the store (e.g., set `view: 'running_low'`), subsequent tests may see unexpected state.

**How to avoid:**
Follow the same pattern established for `collectionFilters.ts` in existing tests — call the store's `clearAll` (or equivalent reset action) in `beforeEach`. Add a `reset()` action to the paint filter store explicitly for test use. This is not a new problem but is a known gotcha when mirroring the Zustand pattern.

**Warning signs:**
- Paint inventory tests pass individually but fail when run in sequence
- Filter state from one test leaks into the next

**Phase to address:** Paint Inventory UI plan — include a `reset()` action in the store and a `beforeEach` reset in any tests.

---

### Pitfall 13: Army List "Add Unit" Picker Needs to Prevent Duplicate Entries Per List

**What goes wrong:**
The Army List Builder allows adding units from the collection to a list. If the same unit can be added multiple times (e.g., three squads of the same "Space Marines Intercessors" unit — but represented as one unit row in the `units` table), the schema allows it. However, if the intent is "each unit in your collection appears at most once per list" (which is the more common hobby app model), there is no `UNIQUE (list_id, unit_id)` constraint on `army_list_units` in the existing schema.

**How to avoid:**
Decide the data model explicitly: does the same unit row in `units` represent one physical box (owned once) or a platoon slot (can appear multiple times in a list)? For HobbyForge v1.1, the simpler model is: a unit can be added multiple times to a list (the user might have 3 squads purchased separately). This means no UNIQUE constraint is needed. BUT the "Add Unit" picker must make the current list membership visible (show which units are already in the list, perhaps with a count) so the user doesn't accidentally add a unit twice. This is a UX protection, not a DB constraint.

**Warning signs:**
- User adds the same unit 5 times to a list and gets a points total 5x higher than expected
- Add Unit picker has no indication of existing list membership

**Phase to address:** Army List Builder plan — document the data model decision and add list membership indication to the picker UI.

---

### Pitfall 14: UnitDetailSheet Growing Too Large With a Third Tab

**What goes wrong:**
`UnitDetailSheet` currently shows unit info inline (no tabs). Adding a "Playbook" tab (stats, abilities, strategy notes) via `<Tabs>` restructures the entire sheet's layout. The existing sheet body (`<div className="flex flex-col gap-4 p-4">`) becomes the content of a "Details" tab. This restructuring touches the Sheet layout, the existing `Field` and `BoolIndicator` local components, and the `SheetFooter` positioning. It is a significant refactor of an existing, working component.

**How to avoid:**
Plan the tab restructuring explicitly before touching `UnitDetailSheet.tsx`. The safest approach:
1. Wrap the existing sheet body content in a `<TabsContent value="details">` block without changing its internals.
2. Add a new `<TabsContent value="playbook">` below it.
3. Add `<TabsList>` + `<TabsTrigger>` before the content block.
4. The `SheetFooter` stays outside the `<Tabs>` wrapper — it applies to both tabs.

Read `src/features/units/UnitDetailSheet.tsx` in full before touching it. The current footer has Edit and Delete buttons that apply regardless of which tab is active — they must remain accessible from both tabs.

**Warning signs:**
- `SheetFooter` is placed inside a `TabsContent` (making it invisible on other tabs)
- The existing `Field` subcomponent or `BoolIndicator` is moved or renamed unnecessarily
- The refactor introduces a re-render on tab switch that resets `StatusPopover` state

**Phase to address:** Unit Playbook plan — tab layout design before any implementation.

---

### Pitfall 15: invalidateQueries After Army List Mutations Must Also Invalidate Dashboard Stats

**What goes wrong:**
The existing `useCreateUnit`, `useUpdateUnit`, and `useDeleteUnit` hooks all call `qc.invalidateQueries({ queryKey: ["dashboard-stats"] })` with the comment "DATA-09: forward-compatibility." When Army List Builder mutations run (create list, add unit to list, remove unit from list), they must also invalidate `["dashboard-stats"]` if the dashboard shows army list counts or painted points totals for lists. Missing this invalidation means the dashboard shows stale list counts after the user modifies a list.

**How to avoid:**
When creating the army list hooks (`useCreateArmyList`, `useAddUnitToList`, `useRemoveUnitFromList`, `useDeleteArmyList`), include `qc.invalidateQueries({ queryKey: ["dashboard-stats"] })` in every `onSuccess` callback, matching the established pattern. Check `src/app/dashboard/page.tsx` to see what query keys the dashboard uses before deciding what to invalidate.

**Warning signs:**
- Dashboard army list count doesn't update after creating a new list
- Army list hook `onSuccess` only invalidates `["army-lists"]` and not `["dashboard-stats"]`

**Phase to address:** Army List Builder plan — mirror the DATA-09 invalidation pattern from day one.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy COALESCE update pattern to `army_list_units` | Consistent with existing queries | Cannot clear `points_override` to null — permanently broken feature | Never for this table |
| Compute army list points total in React instead of SQL | Simpler component code | Two code paths for null handling; totals diverge when unit.points is null | Never — do it in SQL |
| Modify `001_core_schema.sql` to add stat columns | One fewer migration file | Migration runner skips the change; schema diverges from DB silently | Never — always add a new migration |
| Add Playbook form with `<form>` element inside existing SheetContent | Familiar form pattern | Nested form submits; potential double-submit on Enter key | Never — use onClick with handleSubmit instead |
| Reuse `usePaints()` for paint inventory with recipe count | One fewer hook | Forces a JOIN on every recipe form open; bloats paint data model | Never — add a separate query function |
| Skip "unit in army list" pre-delete check | Simpler delete flow | Generic FK error toast instead of actionable guidance | Never in v1.1 when lists are actively used |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `army_list_units` + COALESCE update | Copying the COALESCE partial-update pattern | Use full-replacement UPDATE with explicit NULLable params; `points_override` must be clearable |
| Unit delete + army lists | Attempting delete without checking `army_list_units` first | Query `army_list_units WHERE unit_id = ?` before delete; surface count in UnitDeleteDialog |
| Unit Playbook form inside Sheet | Wrapping tab content in `<form>` element | Use `form.handleSubmit(onSave)` on a button's onClick; container is a `<div>`, not `<form>` |
| TanStack Query + army list mutations | Only invalidating `["army-lists"]` | Also invalidate `["dashboard-stats"]` matching the DATA-09 pattern from `useUnits.ts` |
| `getPaints()` + recipe count | Adding recipe_count to existing `getPaints()` | Add a new `getPaintsWithRecipeCount()` query; keep `getPaints()` unchanged |
| Zustand paint filter store | No `reset()` action | Add `reset()` action for test cleanup; call in `beforeEach` |
| Radix Tabs in UnitDetailSheet | Placing SheetFooter inside a TabsContent | Keep SheetFooter outside the Tabs wrapper so Edit/Delete apply to all tabs |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `getPaintsWithRecipeCount()` on paint inventory load | Noticeable delay opening paints page with 300+ paints and 50+ recipes | Cache with `staleTime: 30_000`; only call from PaintInventoryPage, not from recipe forms | ~50+ recipes with 300+ paints |
| Army list JOIN query on every keystroke in list builder | UI stutter when typing in unit picker | Keep unit search client-side (filter already-fetched units array); only refetch list totals on save | Immediate if query fires on input change |
| `useStrategyNotes(unit.id)` fetching on every Sheet open | IPC traffic proportional to how often user views unit details | Set `staleTime: Infinity` on playbook query; refetch only after save | Never a problem at this scale, but worth the annotation |
| Paint inventory client-side filter over 300+ paint rows | Filter keystroke lag | TanStack Table client-side filtering is fast enough; do not add a debounce unless lag is observed | ~500+ paint rows |

---

## "Looks Done But Isn't" Checklist

- [ ] **Paint Inventory filters:** running-low and wishlist views show only paints with the correct flag set (test with a paint where `running_low = 0` — it must not appear in the running-low view)
- [ ] **Paint Inventory — owned vs wishlist:** A paint can be `owned = 0, wishlist = 1` (want to buy) or `owned = 1, wishlist = 0` (have it) or `owned = 1, wishlist = 1` (have it, want another). The filter views must handle all combinations correctly
- [ ] **Army list points total:** Sums correctly when some units have `points = null` (treated as 0, not excluded)
- [ ] **points_override nullable:** Setting `points_override` then clearing it back to null actually results in `NULL` in DB (not 0, not the old value)
- [ ] **Unit Playbook OC = 0:** Form accepts 0, saves 0, displays 0 — not treated as falsy and silently converted to null
- [ ] **Unit delete with list membership:** Attempting to delete a unit that is in an army list shows a helpful error, not a generic toast
- [ ] **Migration 002:** Contains only `ALTER TABLE ... ADD COLUMN` statements; `001_core_schema.sql` is unchanged
- [ ] **Playbook tab:** Edit and Delete buttons in SheetFooter are visible and functional when Playbook tab is active
- [ ] **Army list invalidation:** After adding a unit to a list, the dashboard stats update on next navigation to dashboard
- [ ] **Sibling sheet mounting:** Any sheets opened from within `UnitDetailSheet` (e.g., a PlaybookEditSheet) are mounted as siblings at the page level, not nested inside `SheetContent`

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| COALESCE blocks null-clearing on points_override | MEDIUM | Rewrite `updateArmyListUnit` query to use full-replacement UPDATE; no data loss, just query rewrite |
| OC = 0 rejected by Zod | LOW | Change `.min(1)` to `.min(0)` in playbook schema; no DB change needed |
| Migration 002 uses DROP TABLE | HIGH | Write migration 003 to recreate data from backup; user loses all playbook entries; no recovery if no backup |
| Nested form submit fires wrong handler | LOW | Convert submit button to `onClick={form.handleSubmit(onSave)}`; remove `<form>` wrapper |
| Stale army list points (computed in React) | MEDIUM | Move computation to SQL JOIN; update TypeScript types to include `effective_points` |
| Unit delete FK error without helpful message | LOW | Add pre-delete query to `UnitDeleteDialog`; no schema change needed |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| COALESCE cannot clear to null | Army List Builder — query layer | Test: set then clear `points_override`; confirm DB shows NULL |
| OC = 0 rejected | Unit Playbook — schema | Test: submit playbook form with OC = 0; confirm save succeeds |
| Migration 002 not additive | Unit Playbook — migration | Grep `002_*.sql` for DROP or CREATE TABLE; must find none |
| Unit delete FK with army list | Army List Builder — UnitDeleteDialog update | Test: add unit to list; try to delete unit; confirm helpful message shown |
| Nested form submit | Unit Playbook — tab architecture | Inspect DOM: zero `<form>` elements inside SheetContent for playbook tab |
| Stale points when unit edited | Army List Builder — query | Edit a unit's points; confirm army list total updates without page reload |
| Paint filter state leaks | Paint Inventory UI — filter store | Navigate away and back; confirm filter resets to `all` view |
| getPaints() modified | Paint Inventory UI — query layer | Grep: `getPaints` return type must still be `Paint[]` in recipes context |
| Playbook query fires on every tab open | Unit Playbook — query config | Check React DevTools network: `unit_strategy_notes` fetch fires once per Sheet open, not per tab switch |
| Army list mutations skip dashboard invalidation | Army List Builder — hooks | Create a list; navigate to dashboard; confirm list count updated |

---

## Sources

- `src/db/queries/units.ts` — COALESCE pattern in `updateUnit` (Pitfall 1 root cause)
- `src/db/queries/paints.ts` — `getPaints()` flat query (Pitfall 8 root cause)
- `src/features/units/UnitDeleteDialog.tsx` — no pre-delete list membership check (Pitfall 4)
- `src/features/recipes/RecipeFormSheet.tsx` — safe pattern: `<form>` wraps SheetContent, no nesting (Pitfall 5 reference)
- `src/features/units/UnitDetailSheet.tsx` — current read-only sheet structure before Playbook tab (Pitfall 5 and 14 context)
- `src/features/units/collectionFilters.ts` — Zustand singleton pattern to mirror for paint filters (Pitfall 7, 12)
- `src/hooks/useUnits.ts` — DATA-09 dashboard-stats invalidation pattern to replicate (Pitfall 15)
- `src/components/ui/tabs.tsx` — Radix Tabs renders all panels; SheetFooter placement (Pitfall 9, 14)
- `src/types/unit.ts` — `Unit` interface shows `points: number | null` (Pitfall 10)
- `src-tauri/migrations/001_core_schema.sql` — `army_list_units` schema: no UNIQUE on (list_id, unit_id), RESTRICT on unit_id FK (Pitfalls 3, 4, 13)
- `src/features/units/unitSchema.ts` — `.min(0)` pattern for integer stats, no `.default()` pattern (Pitfall 2)

---
*Pitfalls research for: HobbyForge v1.1 — Paint Inventory UI, Army List Builder, Unit Playbook*
*Researched: 2026-05-01*
