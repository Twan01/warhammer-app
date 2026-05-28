# Domain Pitfalls: v0.3.7 Smart Automation

**Domain:** Adding auto-derivation and smart defaults to an existing manual system
**Codebase context:** HobbyForge v0.3.0 — Tauri 2 + React 19 + TypeScript + SQLite
**Research date:** 2026-05-28
**Confidence:** HIGH — all pitfalls derived from direct inspection of the live codebase:
`recipeAssignments.ts`, `units.ts`, `armyLists.ts`, `UnitSheet.tsx`, `StatusPopover.tsx`,
`unitSchema.ts`, `useRecipeAssignments.ts`, `recipeSection.ts` types, `unit.ts` types,
`computeAssignmentProgress.ts`, `kanbanUtils.ts`, and `.planning/PROJECT.md` Key Decisions log.

---

## Critical Pitfalls

Mistakes that cause silent data loss, status corruption, or require a codebase rewrite.

---

### Pitfall 1: Auto-Derive Silently Overwrites a Manual Status the User Just Set

**What goes wrong:** `syncDerivedStatuses()` in `recipeAssignments.ts` fires after every step toggle and unconditionally writes `status_painting`, `status_basing`, and `status_varnished` to the DB:

```sql
UPDATE units SET status_painting = $2, status_basing = $3, status_varnished = $4,
  updated_at = datetime('now') WHERE id = $1
```

If the user manually set "Varnished" via `StatusPopover` and then ticks any recipe step, the sync recalculates from section completion — and if no varnish section exists (or is not fully complete), the value is overwritten. The overwrite is silent: no toast, no warning, no rollback.

**Why it happens:** No "manual override" flag exists on any of the three status columns. `syncDerivedStatuses()` was added without a guard for the case where the user set the status independently of recipe progress. The `updateUnit` query uses `COALESCE($N, column)` which prevents *clearing* via UPDATE from edit form saves — but `syncDerivedStatuses()` bypasses `updateUnit()` entirely with a direct write.

**Consequences:**
- User marks "Varnished" to confirm hand-applied spray. Next Painting Mode step tick reverts it to "Highlighted" (or whatever `percentageToStatus()` computes). Silent data loss.
- `status_basing = 1` and `status_varnished = 1` become unset on any step toggle for units whose assigned recipe has no basing/varnish section — even units already confirmed as done.
- `StatusPopover` raises a toast on error (it does not — it only rolls back on DB error) but not on auto-overwrite, so the user has no feedback that their manual choice was discarded.

**Prevention:** Introduce a `status_manually_set` bitmask or per-field override flags (`status_basing_locked`, `status_varnished_locked`, `status_painting_locked`) on the `units` table. When `StatusPopover` writes a manual choice, it sets the lock bit. `syncDerivedStatuses()` checks the lock before writing that field; if locked, it skips it. The COALESCE-for-display pattern already established for points (5-level COALESCE chain) is the model: auto-derived value is the fallback, manual override wins.

Simplest safe approach that requires no schema change: in `syncDerivedStatuses()`, read the current `status_painting` value first and only overwrite `status_basing` / `status_varnished` (the boolean flags) when the recipe has the relevant section type. Leave `status_painting` as a read-only derived display — `StatusPopover` is the only write path for that field.

**Detection:** Unit has `status_painting = 'Varnished'` in DB. User ticks a recipe step. Unit `updated_at` changes without user action and `status_painting` drops to a lower value. Any unit status regression after a step toggle is a symptom.

**Phase to address:** Phase 1 (foundation) — must be designed before any auto-derive logic ships. Retrofitting the lock mechanism after is a migration + schema change.

---

### Pitfall 2: `section_type` Values Do Not Cover the Status Fields Being Auto-Derived

**What goes wrong:** The current `syncDerivedStatuses()` detects basing/varnish sections by matching `LOWER(sec.name) LIKE '%basing%'` and `LOWER(sec.name) LIKE '%varnish%'` — it uses **section name text matching**, not `section_type`. The `SECTION_TYPES` const in `src/types/recipeSection.ts` defines: `prep`, `basecoat`, `shade`, `layer`, `detail`, `effect`, `finishing`. None of these values map to "assembly", "basing", or "varnished" — the three boolean status fields the milestone targets.

**Why it happens:** `section_type` was introduced in v0.2.9 as recipe authoring metadata (Phase 57, WF-01). It was never given a semantic contract with unit status fields. The name-matching approach in `syncDerivedStatuses()` is a pragmatic shortcut that is fragile and invisible to users.

**Consequences:**
- A user names their section "Ground Work" (section_type: `detail`) — it never triggers `status_basing = 1` even when all steps complete.
- `section_type = 'finishing'` is ambiguous — it could mean edge highlights, not just varnish. Auto-triggering `status_varnished` from a `finishing` section type would be wrong in many recipes.
- No `assembly` value exists in `SECTION_TYPES` at all — there is no typed way to declare "this section represents assembly work."
- If the milestone tries to use `section_type` as the trigger mechanism, it cannot — the vocabulary is wrong for that purpose.

**Prevention:** Decide the trigger mechanism before any code is written. Two valid options:

Option A — Extend `SECTION_TYPES` to include `assembly`, `basing`, `varnish` and migrate the detection logic from name-matching to type-matching. A safe additive schema change: text column with no CHECK constraint, existing sections keep their values, users can set the new types on existing sections.

Option B — Document the name-matching contract as intentional, make it visible in the UX. Show a hint in the section editor: "Sections named 'basing' / 'varnish' / 'assembly' automatically update unit status flags." This is lower change impact but requires user education.

Option A is cleaner at the cost of a migration. Option B avoids a migration at the cost of a fragile hidden contract.

**Detection:** User creates a recipe with a section they intend as basing work but uses a different name. All steps complete, `status_basing` remains 0. The detection is silent — the user has no feedback.

**Phase to address:** Phase 1 (schema / section_type vocabulary decision) — must be resolved before writing any auto-derive trigger logic.

---

### Pitfall 3: `is_active_project` Auto-Management Conflicts with Manual Toggle

**What goes wrong:** The Kanban board (`kanbanUtils.ts` `applyActiveFilter()`) shows only units where `is_active_project = 1`. If auto-management sets `is_active_project = 1` on recipe assign and clears it on completion, two write paths exist for the same column: (a) manual toggle via `updateUnit` from the Kanban or UnitSheet, and (b) automatic writes from `createAssignment` / `upsertStepProgress`.

In Tauri's `sqlx::Pool<Sqlite>`, each `db.execute()` runs on a pool-managed connection. Two React mutations in-flight concurrently (e.g., user clicks "Mark Active" while a step toggle is processing) reach the DB in an undefined order. The last writer wins.

**The specific dangerous case:** User manually deactivates a unit (parks it, does not want it in Kanban). Later they tick a recipe step via Painting Mode. `upsertStepProgress` → `syncPaintingPercentageFromAssignment` → `syncPaintingPercentageByUnitId`. If the auto-management logic also touches `is_active_project` in this chain, the unit re-activates against the user's explicit intent.

**Why it happens:** There is no semantic distinction between "user set active = 1" and "system set active = 1". The DB column is a single INTEGER bit with no history.

**Consequences:** Units the user deliberately parked reappear in Kanban. The Kanban becomes unreliable as a curated work-in-progress view. User loses trust in the tool.

**Prevention:** Auto-*set* only (on recipe assign). Never auto-*clear*. The system does not know why a user deactivated a unit — maybe they finished the recipe but are still doing touch-ups, or they are taking a break. Let the user decide when to deactivate. The auto-set rule: if a recipe is assigned and `is_active_project` is currently 0, set it to 1. No write to `is_active_project` ever happens inside `syncDerivedStatuses()` or any step-toggle path.

**Detection:** Unit disappears from / reappears in Kanban without the user touching the active toggle. Specifically: deactivate a unit manually, complete a step in Painting Mode — the unit should stay off Kanban.

**Phase to address:** Phase 2 (active project lifecycle) — establish the auto-set-only rule as a written policy before any auto-management code is written.

---

### Pitfall 4: Smart Context Pre-Fill Reads Stale State from Zustand Filter Stores

**What goes wrong:** Zustand filter stores (collection page faction filter, recipe page filters) persist across navigations — they are not reset on component unmount. If the pre-fill logic for the new unit form reads `faction_id` from the collection filter store rather than from `FactionContext` (the globally selected sidebar faction), the pre-fill reflects "whichever faction the user last filtered by" rather than "the faction the user has set as their current focus."

**Concrete scenario:** User browses Space Marines collection (filter store = Space Marines faction). Switches to Death Guard to buy new models. Opens the Quick Add → New Unit sheet. The pre-fill reads the stale filter store and sets faction to Space Marines. User saves without noticing — the new Death Guard unit is in the wrong faction.

**Why it happens:** The existing `UnitSheet` already accepts a `defaultFactionId` prop passed from the parent. The risk is if the milestone changes the prop source from "explicitly selected by parent" to "implicitly read from a filter store." The `FactionContext` is an explicit user action (clicking the faction in the sidebar), while the filter store is an ephemeral navigation artifact.

**Prevention:** Pre-fill `faction_id` exclusively from `FactionContext` (the globally selected faction), not from filter stores. The filter store is scoped to its page and should never leak as a signal to creation forms. Document this rule in the pre-fill implementation comment. The `defaultFactionId` prop on `UnitSheet` already exists — the parent just needs to source it from `useFaction()` context, not from a Zustand store.

**Detection:** User creates a unit while a faction filter is active — the faction field is pre-filled to the filtered faction, not the active context faction.

**Phase to address:** Phase 3 (smart context pre-filling) — must specify exactly which context source drives each pre-fill value before implementation.

---

### Pitfall 5: Pre-Filled Form Values Submit Unreviewed When User Clicks Save Immediately

**What goes wrong:** React Hook Form treats `defaultValues` as the initial form state. A pre-filled form that opens with faction, recipe, and section already selected submits those values if the user clicks Save without reviewing any field. If the pre-fill is wrong (see Pitfall 4) or stale, the error is committed to the DB with no warning.

This is not a bug in isolation — it is the design of pre-filling. It becomes a pitfall when the pre-fill sources (stale context, last-used values from a different session) are imprecise.

**Prevention:** For high-stakes pre-fills (faction assignment, recipe-to-unit linking), add a visual indicator that the value was auto-filled — a small "auto" badge or muted field styling. This prompts the user to review. Do not pre-fill required fields (like `faction_id`) to any value that the user cannot visually distinguish from a manual selection. For low-stakes pre-fills (today's date, last-used duration), no indicator is needed. Follow the `prefill` prop pattern already established in `BattleLogSheet` — mark the `isPrefilled` state and adjust the sheet description accordingly.

**Detection:** User reports a unit or log entry in the wrong faction/state. The form defaulted to a value the user never consciously chose.

**Phase to address:** Phase 3 (smart context pre-filling) — UX spec must define which fields get auto-fill indicators before implementation.

---

## Moderate Pitfalls

---

### Pitfall 6: N+1 Queries for Per-Unit Battle-Readiness in Army List Unit Picker

**What goes wrong:** The unit picker for army lists needs to show each unit's battle-readiness state. If the component fetches all units via `getUnitsWithPoints()` (single JOIN query) and then queries recipe progress per unit individually, it creates N+1 round-trips.

**Current state for comparison:** `getKanbanProgressByUnitIds()` (PERF-03 in v0.3.0) was introduced specifically to eliminate this pattern for Kanban enrichment — one CTE with `IN ($1, $2, ...)` for all unit IDs, returning progress for the full set. `getArmyListReadiness()` uses GROUP BY for a per-list summary. The unit rows returned by `getUnitsWithPoints()` already carry `status_painting`, `status_basing`, `status_varnished`, `status_assembly` — so *current-status readiness* is computable client-side from the existing single query.

The risk materializes if the picker needs *recipe-derived readiness* (e.g., "recipe is 80% complete") — this requires joining assignment, step, and progress tables, which cannot be embedded in `getUnitsWithPoints()` without creating a complex query for every picker open.

**Prevention:** Use the `getKanbanProgressByUnitIds()` pattern for recipe progress enrichment. Fetch unit list, extract IDs, batch-fetch progress in a single CTE query, merge client-side via `Map<unitId, progress>`. Never call a per-unit progress query inside a loop. If only boolean readiness (painted = true/false) is needed, compute it from the unit row itself — no extra query needed.

**Detection:** Open the army list unit picker with 30+ units. Observe DB query count via Tauri SQL logging. More than 2 queries (units + readiness) = N+1 regression.

**Phase to address:** Phase 4 (battle-readiness in unit picker) — design the enrichment query before writing the picker component.

---

### Pitfall 7: `updateUnit` Edit Form Accidentally Overwrites Auto-Derived Status Fields

**What goes wrong:** The `UnitSheet.tsx` submit handler in edit mode explicitly strips auto-derived fields:

```typescript
const { painting_percentage: _pp, status_painting: _sp, status_basing: _sb, status_varnished: _sv, status_assembly: _sa, ...rest } = payload;
await updateUnit.mutateAsync({ id: unit.id, ...rest });
```

This is correct. But the `updateUnit` query in `units.ts` uses `COALESCE($9, status_assembly)` — so if any other call site passes these fields with non-null values, they overwrite auto-derived status. Any new edit surface (a batch editor, a quick-edit row action, a context menu) that builds the payload differently and forgets the stripping will silently reset status fields.

**Prevention:** Split `updateUnit` into two typed functions:
- `updateUnitMetadata(input: UpdateUnitMetadataInput)` — all non-status fields (name, faction, points, category, etc.)
- `updateUnitStatus(unitId: number, status: Partial<UnitStatusFields>)` — status fields only, called exclusively from `StatusPopover` and `syncDerivedStatuses()`

This enforces the separation at the TypeScript type level. No edit form can accidentally write status fields because `UpdateUnitMetadataInput` does not include them.

**Detection:** A new edit surface (quick-edit, batch edit, inline edit row) saves a unit and the `status_painting` resets to "Not Started". This happens when the payload was built without stripping.

**Phase to address:** Phase 1 (foundation) — before adding any new edit surfaces that touch unit fields.

---

### Pitfall 8: Bulk Recipe Apply Creates Per-Unit Sync Pressure in a Sequential Loop

**What goes wrong:** `bulkCreateAssignments()` uses a sequential `for` loop calling `syncPaintingPercentageByUnitId()` after each INSERT. That sync chain runs 5 SELECT queries + 1 UPDATE per unit (percentage sync + 4 basing/varnish section queries + status write). For 20 units, that is 120 DB round-trips in a loop with auto-commit.

In WAL mode, concurrent reads are allowed but the sequential SELECT→UPDATE chain per unit serializes against writes. For large batches this creates visible latency spikes (>500ms UI freeze).

**Prevention:** Defer percentage sync to after all inserts complete. Add `bulkSyncPaintingPercentages(unitIds: number[])` that runs one batch `UPDATE ... WHERE id IN (...)` with a computed CASE WHEN subquery per unit, or runs the per-unit sync sequentially but only once (not N times during the loop). The INSERTs themselves are fast; the sync is the bottleneck.

**Detection:** UI freezes or progress bar stalls noticeably when applying a recipe to 10+ units simultaneously. Time the mutation with `console.time()` around the `bulkCreateAssignments` call.

**Phase to address:** Phase 4 (batch operations) — before shipping bulk-apply UI.

---

### Pitfall 9: Battle-Readiness Definition Diverges Across Surfaces

**What goes wrong:** "Battle-ready" is defined as `status_painting = 'Completed'` in `getArmyListReadiness()` and `getArmyReadinessByFaction()` on the dashboard. If the unit picker shows a *different* definition (e.g., `status_painting = 'Completed' AND status_basing = 1 AND status_varnished = 1`), the readiness percentage in the picker diverges from what the army list summary panel and Dashboard show.

**Established precedent:** This codebase has the `resolveUnitPoints()` pure function in `src/lib/` specifically to prevent COALESCE divergence across 3 query sites (PV-01 in v0.2.13). The same principle applies to readiness definitions.

**Prevention:** Define a canonical `isUnitBattleReady(unit: Pick<Unit, 'status_painting' | 'status_basing' | 'status_varnished' | 'status_assembly'>): boolean` pure function in `src/lib/`. Every component and query uses this predicate. The equivalent SQL expression is documented in a comment next to the function and copied consistently into all SQL WHERE clauses that filter battle-ready units. If the definition ever changes, it changes in one place.

**Detection:** Open army list summary panel (shows X% ready), then open the unit picker for the same list — the per-unit readiness indicators should be consistent with the summary percentage. Any divergence = missing centralization.

**Phase to address:** Phase 4 (battle-readiness in unit picker) — define the canonical predicate before any readiness-display code is written.

---

## Minor Pitfalls

---

### Pitfall 10: React Query Cache Not Invalidated After Auto-Derive Writes to `units` Table

**What goes wrong:** `syncDerivedStatuses()` and `syncPaintingPercentageByUnitId()` write directly to the `units` table inside the query layer. The mutation hooks (`useToggleStepProgress`, `useCompleteStep`) do invalidate `UNITS_KEY` in `onSuccess` — covering the collection list. But no `UNIT_KEY(id)` per-unit key exists yet (all reads go through the list key). If the milestone adds a `useUnit(id)` query for the picker or unit detail enrichment, it must also be invalidated on every step toggle and assignment change.

**Prevention:** Before adding any new `useQuery` with a unit-specific key (e.g., `["units", id]`), audit all call sites of `syncDerivedStatuses()` and confirm the enclosing mutation hook's `onSuccess` invalidates the new key. Add the key to the invalidation set in `useToggleStepProgress`, `useCompleteStep`, `useCreateAssignment`, and `useDeleteAssignment` at the same time the new query key is introduced.

**Detection:** Unit status badge in a detail view shows stale value after a step is completed in Painting Mode. The list view updated correctly (UNITS_KEY invalidated) but the detail view did not.

**Phase to address:** Phase 1 — whenever a new per-unit query key is introduced.

---

### Pitfall 11: `percentageToStatus()` Thresholds Are Arbitrary and Invisible to the User

**What goes wrong:** The function maps `painting_percentage` → `PaintingStatus` with hardcoded thresholds (`pct <= 15 → "Primed"`, `pct <= 30 → "Basecoated"`, etc.). A unit that is 31% complete auto-derives as "Basecoated" even if the user has only applied a wash — which maps more naturally to "Shaded." The user has no visibility into why the status changed to what it changed to.

**Prevention:** Either (a) show the derived value with a visual "auto" indicator (small muted chip next to the badge in `StatusBadge`) so the user understands it is computed, not chosen; or (b) drop the text-status auto-derive entirely and only auto-derive the boolean flags (`status_basing`, `status_varnished`) which are binary and unambiguous. The percentage → text status mapping is inherently imprecise for hobby work that does not follow a linear progression.

**Detection:** User reports that their unit jumped from "Primed" to "Layered" after ticking a step, bypassing Basecoated/Shaded. The status change felt unexpected because their recipe steps do not map to the `percentageToStatus` thresholds.

**Phase to address:** Phase 1 — decide the UX contract for status auto-derivation before shipping.

---

### Pitfall 12: Form `useEffect` Reset Fires While the Sheet Is Open, Discarding Partial Input

**What goes wrong:** `UnitSheet.tsx` uses:

```typescript
useEffect(() => {
  form.reset(buildDefaultValues(unit, defaultFactionId));
}, [unit, defaultFactionId]);
```

If the parent passes `defaultFactionId` derived from a context value that changes while the sheet is open (e.g., the globally active faction changes because the user taps a sidebar link), the effect fires and resets the form — discarding any partially typed values.

**Prevention:** Compute `defaultFactionId` in the parent at the moment the Sheet *opens* (not continuously from live context). Use `useRef` to freeze the initial faction value, or only update the prop when `open` transitions from `false` to `true`. The context should never be read live inside an open form — capture it at open time and pass it as a stable prop.

**Detection:** User opens UnitSheet, starts typing a name, clicks a faction in the sidebar — the form resets to empty. The `unit` prop did not change, but `defaultFactionId` did.

**Phase to address:** Phase 3 (smart pre-filling) — audit the `defaultFactionId` prop source before wiring context-derived pre-fills.

---

## Integration Pitfalls Specific to This Codebase

### The Two-Write-Path Problem for Status Fields

`units.ts` `updateUnit()` uses `COALESCE($N, column)` for status fields — null = "don't change". But `syncDerivedStatuses()` bypasses `updateUnit()` with a direct `SET status_painting = $2, status_basing = $3, status_varnished = $4`. These two write paths are inconsistent by design and must stay coordinated. Any future modification to status persistence must update both paths. The safest resolution is Pitfall 7's prevention: split into `updateUnitMetadata` / `updateUnitStatus`.

### The "No Nested Transactions" Constraint

`tauri-plugin-sql` cannot nest transactions (established constraint, see Project.md Key Decisions). `syncDerivedStatuses()` runs as a chain of sequential `db.select()` + `db.execute()` calls without a transaction wrapper. If the process crashes between the percentage UPDATE and the status UPDATE, the unit ends up with `painting_percentage = 75` but `status_painting = 'Not Started'`. This is an accepted known risk in WAL + auto-commit mode. The milestone must not attempt to wrap auto-derive in a transaction helper that internally calls BEGIN — it will crash. Keep using the sequential auto-commit pattern already established.

### React Query `staleTime: 5 min` Masks Auto-Derive Results for New Query Keys

The `QueryProvider` sets `staleTime: 5 minutes`. After a step toggle invalidates `UNITS_KEY`, the refetch is immediate for that key. But any *new* query key introduced by this milestone (e.g., a per-unit readiness key for the picker) will serve stale data for up to 5 minutes unless explicitly invalidated. Every new query key that reads from `units` must be added to the invalidation chain in `useToggleStepProgress`, `useCompleteStep`, `useCreateAssignment`, and `useDeleteAssignment`. Treat the invalidation audit as a mandatory checklist item in each phase plan.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Auto-derive statuses from recipe sections | Pitfall 1 (silent overwrite of manual status) | Design manual override flag/lock before writing any auto-derive logic |
| Auto-derive via section_type field | Pitfall 2 (section_type vocabulary gap) | Extend SECTION_TYPES with assembly/basing/varnish, or document name-match contract; decide first |
| Active project auto-management | Pitfall 3 (race condition between manual toggle and auto-set) | Auto-set only on recipe assign; never auto-clear from any step toggle path |
| Smart context pre-filling | Pitfall 4 (stale Zustand faction) + Pitfall 5 (pre-fill submits unreviewed) | Use FactionContext not filter stores; add auto-fill indicators on high-stakes fields |
| Battle-readiness in unit picker | Pitfall 6 (N+1 queries) + Pitfall 9 (diverging definitions) | Batch progress via CTE; define `isUnitBattleReady()` pure function first |
| Batch recipe apply | Pitfall 8 (per-unit sync pressure in loop) | Defer sync to after all inserts; batch in one pass |
| Any new edit surface touching unit fields | Pitfall 7 (accidental status field overwrite) | Split updateUnit into metadata vs status variants at the query layer |
| Any new per-unit query key added | Pitfall 10 (cache invalidation gap) | Audit all syncDerivedStatuses call sites; add new key to all relevant mutation invalidation sets |
| Status auto-derive UX | Pitfall 11 (arbitrary thresholds invisible to user) | Add "auto" indicator to StatusBadge when value is derived, not user-chosen |
| Form pre-fill wiring | Pitfall 12 (form reset on live context change) | Freeze defaultFactionId at sheet-open time, not from live context subscription |

---

## Sources

All findings derived from direct codebase inspection (no web search required — all pitfalls are internal integration issues):

- `src/db/queries/recipeAssignments.ts` — `syncDerivedStatuses()`, `syncPaintingPercentageByUnitId()`, `bulkCreateAssignments()`
- `src/db/queries/units.ts` — `updateUnit()` COALESCE pattern, status field parameter handling
- `src/db/queries/armyLists.ts` — `getArmyListReadiness()` battle-ready definition (`status_painting = 'Completed'`)
- `src/features/units/UnitSheet.tsx` — status field stripping in edit mode, `defaultFactionId` reset pattern
- `src/features/units/StatusPopover.tsx` — manual status override write path (optimistic update + rollback)
- `src/features/units/unitSchema.ts` — comment "auto-managed by recipe sync, kept in schema for DB compat"
- `src/features/units/PaintingPipeline.tsx` — stage definitions, assembly/basing/varnish boolean usage
- `src/hooks/useRecipeAssignments.ts` — full invalidation chains in `useToggleStepProgress`, `useCompleteStep`, `useCreateAssignment`, `useBulkCreateAssignments`
- `src/types/recipeSection.ts` — SECTION_TYPES const (no assembly/basing/varnish values)
- `src/types/unit.ts` — PAINTING_STATUS_ORDER, Unit interface, status field types
- `src/lib/computeAssignmentProgress.ts` — pure function pattern (precedent for new derivations)
- `src/features/painting-projects/kanbanUtils.ts` — `applyActiveFilter()` consuming `is_active_project`
- `src/features/battle-log/BattleLogSheet.tsx` — `prefill` prop + `isPrefilled` pattern (precedent for pre-fill UX)
- `.planning/PROJECT.md` — Key Decisions log (no nested transactions, COALESCE patterns, cache invalidation symmetry rule, resolveUnitPoints precedent, PERF-03 Kanban batch enrichment)

---
*Pitfalls research for: v0.3.7 Smart Automation features added to HobbyForge v0.3.0+*
*Researched: 2026-05-28*
