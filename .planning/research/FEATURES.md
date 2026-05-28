# Feature Landscape — v0.3.7 Smart Automation

**Domain:** Smart automation in hobby/project tracking — status auto-derivation, lifecycle management, context pre-filling, battle-readiness filtering
**Researched:** 2026-05-28
**Overall confidence:** HIGH (grounded in existing codebase + domain survey of competitor apps)

---

## What Already Exists (Do Not Rebuild)

These are live in the codebase and must not be re-proposed as new features.

| Existing Capability | Location |
|---------------------|----------|
| `painting_percentage` auto-computed from recipe step completion on every `upsertStepProgress` | `src/db/queries/recipeAssignments.ts: syncPaintingPercentageByUnitId()` |
| `status_painting` auto-derived from `painting_percentage` via `percentageToStatus()` | Same file, runs inside `syncDerivedStatuses()` |
| `status_basing` auto-derived by section name fuzzy match (LIKE '%basing%') | `syncDerivedStatuses()` |
| `status_varnished` auto-derived by section name fuzzy match (LIKE '%varnish%') | `syncDerivedStatuses()` |
| `is_active_project` manual toggle on collection page, kanban, unit detail sheet | Multiple UI surfaces; `src/features/units/CollectionPage.tsx`, `UnitDetailSheet.tsx` |
| Bulk apply recipe to multiple units | `bulkCreateAssignments()` in `recipeAssignments.ts` |
| Recipe form has `faction_id` and `unit_id` fields | `recipeSchema.ts` |
| Army list `getArmyListWithUnits` returns `status_painting`, `painting_percentage`, `status_assembly` per unit | `armyLists.ts` — already in SQL projection |
| Points resolved via 6-level COALESCE chain in army list SQL | `armyLists.ts: getArmyListWithUnits()` |
| `SECTION_TYPES` const with values: prep, basecoat, shade, layer, detail, effect, finishing | `src/types/recipeSection.ts` |

**Critical finding 1:** `status_basing` and `status_varnished` are already auto-derived, but by section *name* fuzzy match (LIKE '%basing%'). The v0.3.7 goal is a precision upgrade to use the `section_type` field instead — not a new feature category. `status_assembly` is NOT yet auto-derived at all.

**Critical finding 2:** `is_active_project` auto-lifecycle does not exist. `createAssignment()` does not set it. Completing all steps does not clear it. This is fully new behavior.

**Critical finding 3:** No competitor app (Figure Case, Pile of Potential, Liber Pigmenta) implements automatic status derivation from workflow data. All require manual status updates. HobbyForge's existing auto-derivation of basing/varnish is already ahead of the market. This milestone extends that lead.

---

## Table Stakes

Features users expect given the existing level of automation in the app. Missing = feels like a regression or inconsistency.

| Feature | Why Expected | Complexity | Dependency |
|---------|--------------|------------|------------|
| **status_assembly auto-set when Assembly section completes** | Basing + varnish already auto-derive; assembly is the conspicuous gap. The inconsistency reads as a bug. | Low | `syncDerivedStatuses()` in `recipeAssignments.ts`; add assembly branch matching basing/varnish pattern |
| **section_type-based basing/varnish derivation** | Current LIKE '%basing%' name match is fragile — "Base Coat" section would false-match. `section_type` field exists from v0.2.9. Using it is strictly more reliable. | Low-Medium | Update `syncDerivedStatuses()` to check `section_type` first, fall back to name match for pre-v0.2.9 recipes without section_type set |
| **is_active_project auto-set when recipe is assigned** | Assigning a recipe is the clearest possible signal of active painting intent. Users expect the Kanban to reflect this immediately without a manual second step. | Low | Add `UPDATE units SET is_active_project = 1 WHERE id = $1` in `createAssignment()` and `bulkCreateAssignments()` |
| **is_active_project auto-clear at 100% step completion** | A fully-complete recipe has no remaining steps. Leaving the unit "active" contradicts the data and clutters the Kanban and ActiveProjectsPanel. | Low | Add conditional clear in `syncPaintingPercentageByUnitId()` when computed pct = 100 |
| **Battle-readiness badge in army list unit picker** | Army list query already returns `status_painting` and `painting_percentage` per unit. Not surfacing it in the picker forces users to cross-reference the Collection page. Data is present; just not shown. | Low | UI-only addition; `ArmyListUnitRow` already has `painting_percentage` and `status_assembly` |
| **Points-remaining filter in army list unit picker** | Quartermaster (comparable tool) has this as a toggle. Without it, users manually compute what still fits in budget. The 6-level COALESCE chain already resolves points per unit; `points_limit` is on `army_lists`. | Medium | Compute `remaining = points_limit - sum(effective_points)` from list state; filter picker list to units where `effective_points <= remaining` |

---

## Differentiators

Features that set HobbyForge apart from any hobby tracker. Not expected, but high per-interaction value.

| Feature | Value Proposition | Complexity | Dependency |
|---------|-------------------|------------|------------|
| **Faction auto-fill in recipe form opened from unit context** | When opening "New Recipe" from a unit detail, pre-fill `faction_id` from the unit's faction. Eliminates the most common redundant selection for a single-faction painter. | Low | `RecipeFormSheet` already has `faction_id` field; add `defaultFactionId` prop wired into `defaultValues` |
| **Recipe picker pre-filtered by unit faction** | When applying a recipe to a unit, show faction-matched recipes at the top (or as default filter). Users with multiple factions waste time scanning cross-faction recipes. | Low | `ApplyRecipeDialog` — sort/filter `recipes` array by `recipe.faction_id === unit.faction_id` before rendering |
| **"Assembly" as an explicit section_type enum value** | Current `SECTION_TYPES` = [prep, basecoat, shade, layer, detail, effect, finishing]. "prep" is ambiguous. An explicit "assembly" type enables unambiguous auto-derivation of `status_assembly` and helps users label their sections correctly. | Low | Extend `SECTION_TYPES` const in `src/types/recipeSection.ts`; no schema migration needed (stored as TEXT) |
| **Smart points-remaining badge in army list picker header** | Show the live remaining points budget prominently as units are added, updated on every list mutation. Combined with the filter toggle, this replaces mental math entirely. | Medium | Requires `useMemo` on `points_limit - sum(effective_points)` over current list state |
| **Active project count becomes reliable metric on dashboard** | Once auto-lifecycle manages `is_active_project`, the count in ActiveProjectsPanel and CurrentFocusCard is trustworthy (not "whatever the user remembered to toggle"). No new UI needed; existing dashboard cards become more meaningful. | None (side effect) | Depends on is_active_project auto-lifecycle being in place |

---

## Anti-Features

Features that seem natural to request but would harm this specific app.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Remove manual is_active_project toggle after adding auto-lifecycle** | User may intentionally keep a unit active during a planning phase before any recipe is assigned. Removing the manual override breaks legitimate use cases. | Keep the checkbox as an escape hatch; auto-lifecycle adds behavior on top, does not replace the toggle |
| **Replace name-based basing/varnish heuristic entirely with section_type** | Recipes created before v0.2.9 have no `section_type` set. Removing the LIKE fallback would silently break auto-derivation for all existing recipes with named sections but no `section_type`. | Check `section_type` first; fall back to name LIKE when `section_type IS NULL` |
| **Auto-assign a recipe when creating a unit** | Aggressive. User may want to log ownership (and even mark it active) without a painting plan yet. | Prompt or suggest post-create; never auto-assign |
| **Block adding an unready unit to an army list** | Competitive players run unpainted lists for playtesting. Blocking contradicts the personal tool purpose. | Show readiness badge as purely informational, never gating |
| **Auto-deactivate is_active_project if a recipe is removed** | Removing a recipe is a correction action, not a completion signal. Auto-clearing would surprise and hide units the user intends to keep active. | Only auto-clear when `painting_percentage` reaches 100 via step completion |
| **AI/ML recipe suggestions or smart recommendations** | Out of scope per PROJECT.md. Desktop-local, no network, no telemetry. | Explicit user actions only |
| **Automatic is_active_project set when unit is created** | Creation is not an activity signal. The user may create dozens of units in a bulk import session. | Only trigger on recipe assignment |

---

## Feature Dependencies

```
[Existing] syncDerivedStatuses() — basing/varnish by name LIKE match
      ↓ precision upgrade (same function, same call sites)
section_type-based derivation: check section_type field first, name LIKE fallback
      + assembly derivation: new branch (section_type = "assembly" OR name LIKE "%assembl%")

"Assembly" added to SECTION_TYPES const
      → Must happen before assembly auto-derivation is testable by users
      → Zero migration (TypeScript const, TEXT column in SQLite)

[Existing] createAssignment() / bulkCreateAssignments()
      ↓ side effect addition
is_active_project = 1 UPDATE after recipe assignment INSERT

[Existing] syncPaintingPercentageByUnitId() — called on every step completion and assignment mutation
      ↓ conditional addition after percentage UPDATE
is_active_project = 0 UPDATE when painting_percentage reaches 100

[Existing] getArmyListWithUnits() — already returns status_painting, painting_percentage
      ↓ UI-only addition
Battle-readiness badge on each unit row in army list picker

[Existing] points_limit on army_lists + effective_points per unit in ArmyListUnitRow
      ↓ computed value (useMemo)
Remaining budget = points_limit - sum(effective_points of all list units)
      ↓ filter toggle
Points-remaining filter: show only units where effective_points <= remaining

[Existing] RecipeFormSheet — has faction_id field with defaultValues
      ↓ prop addition
defaultFactionId prop → wired into RHF defaultValues on open

[Existing] ApplyRecipeDialog — loads all recipes for a faction
      ↓ sort/filter logic
faction-matched recipes at top or default-selected in filter
```

---

## Complexity Notes

### Low complexity — pure additions, zero schema risk

- **Assembly auto-derivation:** Add one branch to `syncDerivedStatuses()` mirroring basing pattern. Check `section_type = 'assembly'` OR `LOWER(sec.name) LIKE '%assembl%'`. Three SQL statements added (hasAssemblySections, incompleteAssembly, boolResult) matching the existing basing/varnish pattern exactly.
- **is_active_project auto-set on assign:** Two-line addition per create function — `UPDATE units SET is_active_project = 1 WHERE id = $1`. Must also invalidate `["units"]` React Query key post-mutation (already invalidated by `createAssignment` hook).
- **is_active_project auto-clear on 100%:** One conditional inside `syncPaintingPercentageByUnitId()` after the percentage UPDATE — `if pct === 100 then UPDATE units SET is_active_project = 0`.
- **Faction auto-fill in recipe form:** Pass `defaultFactionId?: number` prop to `RecipeFormSheet`; include in `defaultValues` object. Caller (unit detail context) provides the unit's `faction_id`. No DB changes.
- **Recipe picker pre-filter by faction:** In `ApplyRecipeDialog`, sort `recipes` so `recipe.faction_id === unit.faction_id` items appear first, or add a "faction match" filter chip. UI-only.
- **Battle-readiness badge in army list picker:** Data is already on `ArmyListUnitRow`. Add a colored badge showing painted % or assembly status next to each unit in the picker. UI-only.
- **"Assembly" in SECTION_TYPES const:** One string added to the TypeScript const array. Zero migration. Dropdown gains one option.

### Medium complexity — computed state + UI work

- **section_type-based basing/varnish derivation:** Update `syncDerivedStatuses()` SQL queries to include `OR sec.section_type IN ('basing', 'finishing')` alongside the existing LIKE clause. Must test fallback path for older recipes. Requires identifying which `section_type` value maps to "basing" (possibly a new explicit value) and which maps to "varnish" (currently "finishing" is closest). May need a schema-level decision on whether to add "basing" to `SECTION_TYPES` or reuse "finishing" for varnish.
- **Points-remaining filter:** Compute remaining budget via `useMemo` over list state (already available in `useArmyList` hook result). Add toggle state in `armyListsReducer`. Filter unit picker list to affordable units. Handle edge cases: ghost units with 0 points, units with null effective_points defaulting to 0.

### Schema impact

- Adding "assembly" to `SECTION_TYPES` const: zero migration (TypeScript const only; SQLite stores section_type as TEXT).
- All auto-lifecycle changes target existing columns (`is_active_project`, `status_assembly`): zero migration.
- This milestone requires **no new SQL migrations**.

---

## MVP Recommendation

Ordered by value/effort ratio:

1. **is_active_project auto-lifecycle** (assign → active, 100% → inactive)
   Highest perceived value, lowest implementation risk. Changes two functions in `recipeAssignments.ts`. Makes Kanban self-managing. Delivers immediately visible dashboard improvement.

2. **Assembly auto-derivation + "assembly" section_type + section_type precision for basing/varnish**
   Completes the status derivation story. All three boolean flags (assembly, basing, varnish) then auto-derive from recipe data. Ship together so the feature feels complete.

3. **Battle-readiness badge in army list unit picker**
   UI-only. Data already present. Immediate visual payoff, zero risk.

4. **Faction auto-fill + recipe picker pre-filter**
   Reduces friction in the most frequent workflow (unit → apply recipe). Low risk, high daily-use value.

5. **Points-remaining filter in army list picker**
   Most complex UI of the set. Logically final since it benefits most once the readiness badge provides context about *why* filtering matters.

**Defer:** Dashboard active count enhancement — implement after auto-lifecycle is stable so the count is reliable. No new UI needed; the existing ActiveProjectsPanel just becomes more accurate.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Existing auto-derivation code (basing/varnish) | HIGH | Read directly from recipeAssignments.ts |
| is_active_project current behavior | HIGH | Traced through all 12 call sites in codebase |
| section_type values and meaning | HIGH | Read from types/recipeSection.ts |
| Competitor apps (no auto-derivation) | HIGH | Figure Case, Pile of Potential confirmed manual-only |
| Points-remaining filter UX | MEDIUM | Quartermaster described in search; exact interaction model requires design decision |
| Recipe picker faction pre-filter UX | MEDIUM | Standard "sort by relevance" UX pattern, implementation straightforward |

---

## Sources

- Codebase: `src/db/queries/recipeAssignments.ts` — syncDerivedStatuses(), syncPaintingPercentageByUnitId(), createAssignment(), bulkCreateAssignments()
- Codebase: `src/types/recipeSection.ts` — SECTION_TYPES const
- Codebase: `src/db/queries/armyLists.ts` — getArmyListWithUnits() projection
- Codebase: `src/types/unit.ts` — Unit interface, PaintingStatus
- Codebase: `src/features/recipes/recipeSchema.ts` — faction_id, unit_id fields
- [Figure Case — Hobby Progress (App Store)](https://apps.apple.com/us/app/figure-case-hobby-progress/id1487460834) — configurable workflow steps; no automatic status derivation
- [Pile of Potential (Wargamer review)](https://www.wargamer.com/warhammer-40k/pile-of-potential-app) — tracks built/primed/painted/based + points; manual updates only
- [Quartermaster army builder](https://quartermaster.app/) — points-remaining filter toggle pattern; MEDIUM confidence (described in search results, not verified by direct access)
- [UX patterns: Good Defaults (UI-Patterns.com)](https://ui-patterns.com/patterns/GoodDefaults) — pre-fill from context, allow override
- [Context-Aware Fields UX (UXPin)](https://www.uxpin.com/studio/blog/how-context-aware-fields-improve-ux/) — parent context drives child form defaults
- [Zuko Blog: Smart Defaults in Forms](https://www.zuko.io/blog/how-to-use-defaults-to-optimize-your-form-ux) — defaults should reflect most-likely user intent
