# Phase 145: Integration Pass — Research

**Researched:** 2026-06-22
**Domain:** effectivePaintId() wire-up across all paint consumers — Painting Mode, availability, apply-to-units, SectionedTimeline, Log Session, recipe duplication
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Resolve every step's paint via `useSlotResolutionMap(recipeId)` + `effectivePaintId(step, slotMap)` — replace direct `step.paint_id` reads in `PaintingModeView` and `StepFocalView`.
- Step completion is unchanged — records against `recipe_step.id` (already stable; technique steps are materialised recipe_steps).
- Keyboard shortcuts are unchanged.
- A **distinct unfilled-slot indicator** (dashed/outline swatch + "slot unfilled" affordance) is shown for technique steps whose slot has no paint — visually separate from the paintless-step indicator.
- `useRecipePaints` / the readiness computation resolves technique steps via `effectivePaintId()` so owned/missing counts match Painting Mode.
- Unfilled slots are **not** counted as "missing"; they are surfaced separately as an "N colour slots unfilled" warning in `PaintReadinessBanner`.
- `AssignmentChecklist` / `ChecklistStepRow` resolve technique steps via `effectivePaintId()` so the per-unit checklist is not empty for technique-owned steps.
- `SectionedTimeline` gains the "from technique X" badge on technique-sourced sections (slotMap already wired in 143; badge is added here).
- Log Session's cascading section selector includes technique-sourced section names (they are real `recipe_sections`).
- All three reuse the same `useSlotResolutionMap(recipeId)` spine — no per-consumer resolution queries.
- Duplication keeps Phase 143 CR-02 behaviour — new `recipe_technique_instances` + copies `recipe_technique_slot_maps`; `recipe_steps` keep `technique_step_id` (live link preserved, not flattened). Add integration test.
- Painting Mode inline fill (SC#6/INTG-07): tapping a technique step's swatch opens a single-slot mini-dialog, saves via `updateSlotMap` + invalidation.
- Mini-dialog scope: focused single-slot reassign (not the full multi-slot dialog).
- Test strategy: cross-consumer integration test proving `effectivePaintId()` resolution and no silent undercounting.

### Claude's Discretion

- Exact unfilled-slot indicator visual treatment (within the shadcn/zinc system and the Phase 143 swatch conventions).
- Whether the inline mini-dialog is a new focused component or a single-slot mode of the existing slot-fill dialog.
- Precise placement/wording of the "N colour slots unfilled" line in the readiness banner.
- Integration test file placement under `tests/`.

### Deferred Ideas (OUT OF SCOPE)

- Detach (break live link → materialise as plain editable recipe content with progress remapped) + persistent "from technique X" section badges/safety rails → Phase 146.
- TQOL items (per-instance timestamp, slot suggestions, bulk reassign, soft-override flow) → v0.7.0 v2.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTG-01 | Painting Mode executes technique-sourced steps correctly — slot-resolved paint swatch, progress against stable identity, keyboard shortcuts unaffected | PaintingModeView lines 49-50,102-104 + StepFocalView line 61 — three direct `step.paint_id` reads; `useSlotResolutionMap(recipeId)` wired into PaintingModeView, slotMap prop threaded to StepFocalView |
| INTG-02 | Paint availability ("owned/missing") counts slot-resolved paints via `effectivePaintId()`, matching what Painting Mode shows | `useRecipePaints` returns raw steps; `missingPaints` useMemo in PaintingModeView reads `step.paint_id` directly; must route through `effectivePaintId(step, slotMap)` |
| INTG-03 | Apply-to-units per-unit step progress works for technique-sourced steps | `AssignmentChecklist` lines 127,152,169 + `ChecklistStepRow` lines 38,80 — four direct `step.paint_id` reads; need `useSlotResolutionMap(recipeId)` + `effectivePaintId()` wired in |
| INTG-04 | SectionedTimeline displays technique-sourced sections with badge; Log Session cascade selectors include technique-sourced section names | SectionedTimeline already has slotMap + `techniqueSectionInfoMap` infrastructure; badge wiring needed for non-detail-view use. Log Session (`PaintingSessionSheet`) displays `sectionName` passed from parent — no selector at all; already correct. |
| INTG-05 | Duplicating a recipe preserves live links — new instances + slot maps for copy, not flattened | `duplicateRecipe` already implements this in recipes.ts lines 181-209 + 248-265; need integration test only |
| INTG-06 | Paint readiness surfaces "N colour slots unfilled" warning alongside owned/missing warning | `PaintReadinessBanner` accepts only `missingPaints` today; add `unfilledSlotCount?: number` prop; compute count via new query |
| INTG-07 | User can reassign a slot's paint inline during Painting Mode | New `SlotReassignMiniDialog` component; know which slot a tapped step maps to via step's `technique_step_id` → `technique_steps.colour_slot_id`; save via `useUpdateSlotMap` |

</phase_requirements>

---

## Summary

Phase 145 is a pure integration-and-wiring phase. The data layer (`effectivePaintId`, `useSlotResolutionMap`, `updateSlotMap`, `duplicateRecipe`) is complete and correct from Phases 141–143. The only required work is (a) replacing direct `step.paint_id` reads in the four consuming surfaces with `effectivePaintId(step, slotMap)` calls, (b) adding two small UI affordances (unfilled-slot indicator, "N colour slots unfilled" banner extension), (c) one new component (`SlotReassignMiniDialog`), and (d) wiring the SectionedTimeline technique badge in non-detail-view contexts (INTG-04).

The most complex non-obvious decision is the unfilled-slot count query: how to efficiently count NULL-mapped slots without a new migration. The answer is a pure SQL query over existing tables (recipe_technique_instances → recipe_technique_slot_maps LEFT JOIN technique_colour_slots). This can be a new query function in `recipeTechniqueSlotMaps.ts` and a corresponding hook in `useSlotResolutionMap.ts`.

The Log Session (INTG-04) concern turns out to be a non-issue: `PaintingSessionSheet` receives `sectionName` as a scalar prop from the parent — there is no cascading section selector in this component. Technique-sourced sections are real `recipe_sections` rows, so they appear in `useRecipeSections(recipeId)` automatically. The SectionNavigator in PaintingModeView already lists all sections from `useRecipeSections`; technique sections will appear there already.

**Primary recommendation:** Wire `useSlotResolutionMap(recipeId)` once in `PaintingModeView` and thread `slotMap` as a prop to `StepFocalView`. Wire it once in `AssignmentChecklist`. Extend `PaintReadinessBanner` with an `unfilledSlotCount` prop. Create `SlotReassignMiniDialog` as a focused single-slot variant of `EditColoursDialog`. Confirm `duplicateRecipe` already satisfies INTG-05 and write only the test.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Paint resolution (effectivePaintId) | Frontend (lib) | — | Pure function; no DB call; called from components and hooks |
| Slot resolution map | React Query hook | DB query | `useSlotResolutionMap` is the single source; all consumers share this cache entry |
| Unfilled-slot count | DB query (new) | React Query hook (new) | Aggregate SQL over recipe_technique_slot_maps; keyed per-recipe |
| Unfilled-slot indicator | UI component (StepFocalView) | — | Visual affordance on the swatch; opens mini-dialog |
| Inline slot reassign | UI component (new SlotReassignMiniDialog) | useUpdateSlotMap mutation | Single-slot focused dialog; reuses SlotFillRow |
| Banner unfilled warning | UI component (PaintReadinessBanner) | — | Extend existing banner with optional second line |
| SectionedTimeline badge | UI component (SectionedTimeline) | — | TechniqueSectionBadge already exists; just add pass-through in Painting Mode path |
| Log Session section display | Already correct | — | sectionName is a scalar prop; real recipe_sections include technique sections automatically |
| Availability counts | useRecipePaints (RECIPE_AVAILABILITY_KEY) | DB query | `getRecipePaintAvailability` uses GROUP BY on recipe_steps; must be updated to skip technique steps (paint_id IS NULL) and instead count via effectivePaintId resolution |
| Recipe duplication (live-link) | DB query (`duplicateRecipe`) | — | Already implemented; integration test only |

---

## Standard Stack

No new packages. All patterns use existing codebase stack. [VERIFIED: codebase grep]

| Library | Already Used | Purpose in Phase 145 |
|---------|-------------|----------------------|
| `@tanstack/react-query` | Yes | `useSlotResolutionMap`, new `useUnfilledSlotCount` hook |
| `sonner` | Yes | Toast on SlotReassignMiniDialog save |
| shadcn/ui Dialog | Yes | SlotReassignMiniDialog shell |
| shadcn/ui Separator | Yes | Banner second-line divider |
| `lucide-react` Circle | Yes | Banner unfilled-slot icon |
| `src/lib/effectivePaintId` | Yes | The resolution spine every consumer routes through |

**Installation:** None required.

---

## Package Legitimacy Audit

Not applicable — no new packages are installed in this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
PaintingModeView
  └── useSlotResolutionMap(recipeId) → SlotResolutionMap    [NEW]
  ├── missingPaints useMemo → effectivePaintId(step, slotMap)    [REPLACE step.paint_id]
  ├── unfilledSlotCount → useUnfilledSlotCount(recipeId)    [NEW]
  ├── PaintReadinessBanner(missingPaints, unfilledSlotCount)    [EXTEND]
  ├── StepFocalView(slotMap, onReassignSlot)    [EXTEND]
  │   └── effectivePaintId(step, slotMap) → hasPaint / unfilled indicator
  │       └── unfilled → SlotReassignMiniDialog(stepId, slotMap)    [NEW]
  │           └── useUpdateSlotMap() → invalidates SLOT_RESOLUTION_MAP_KEY
  └── SectionNavigator (unchanged — sections come from useRecipeSections)

AssignmentChecklist
  └── useSlotResolutionMap(recipeId) → SlotResolutionMap    [NEW]
  └── ChecklistStepRow(paint = paintMap.get(effectivePaintId(step, slotMap)))    [REPLACE]

SectionedTimeline (Painting Mode non-detail path)
  └── techniqueSectionInfoMap prop → wire TechniqueSectionBadge display-only    [EXTEND]

PaintReadinessBanner
  └── unfilledSlotCount?: number prop (new) → "N colour slots unfilled" line    [EXTEND]

getUnfilledSlotCount(recipeId) — new DB query
  SELECT COUNT(*)
  FROM recipe_technique_instances rti
  JOIN technique_colour_slots tcs ON tcs.technique_id = rti.technique_id
  LEFT JOIN recipe_technique_slot_maps sm ON sm.instance_id = rti.id AND sm.slot_id = tcs.id
  WHERE rti.recipe_id = $1
    AND rti.detached = 0
    AND (sm.paint_id IS NULL OR sm.instance_id IS NULL)
```

### Recommended Project Structure

No new directories. New files follow existing conventions:

```
src/
  db/queries/
    recipeTechniqueSlotMaps.ts    ← add getUnfilledSlotCount()
  hooks/
    useSlotResolutionMap.ts       ← add useUnfilledSlotCount()
  features/
    painting-mode/
      SlotReassignMiniDialog.tsx  ← NEW component
      PaintingModeView.tsx        ← wire slotMap + unfilledSlotCount
      StepFocalView.tsx           ← accept slotMap + onReassignSlot, replace hasPaint
      PaintReadinessBanner.tsx    ← add unfilledSlotCount prop
    recipes/
      AssignmentChecklist.tsx     ← wire useSlotResolutionMap + effectivePaintId
      ChecklistStepRow.tsx        ← accept effectivePaint?: Paint prop (rename)

tests/
  techniques/
    recipe-duplication-live-link.test.ts    ← INTG-05 integration test (new)
  painting-mode/
    PaintReadinessBanner.test.tsx           ← extend with unfilledSlotCount tests
```

---

## Detailed Consumer Analysis

### INTG-01: PaintingModeView + StepFocalView

**Direct `step.paint_id` reads to replace:**

1. `PaintingModeView.tsx` line 49:
   ```typescript
   if (step.paint_id == null) continue; // in missingPaints useMemo
   ```
   Replace with: `const resolvedId = effectivePaintId(step, slotMap); if (resolvedId == null) continue;`

2. `PaintingModeView.tsx` line 50:
   ```typescript
   const paint = paintMap.get(step.paint_id);
   ```
   Replace with: `const paint = resolvedId !== null ? paintMap.get(resolvedId) : undefined;`

3. `PaintingModeView.tsx` lines 102-103:
   ```typescript
   const currentPaint =
     currentStep?.paint_id != null ? paintMap.get(currentStep.paint_id) : undefined;
   ```
   Replace with `effectivePaintId(currentStep, slotMap)` lookup.

4. `StepFocalView.tsx` line 61:
   ```typescript
   const hasPaint = currentStep.paint_id !== null && paint;
   ```
   Three-state logic needed: (a) plain step with paint, (b) technique step with filled slot, (c) technique step with unfilled slot, (d) plain paintless step. The `paint` prop resolved by PaintingModeView already encodes the resolution; what needs to change is *how PaintingModeView decides what to pass* and how StepFocalView detects "unfilled slot" vs "no paint intended".

**Key insight for StepFocalView three-state logic:**

PaintingModeView knows `currentStep.technique_step_id`. It can pass an additional prop:
```typescript
isUnfilledSlot: boolean  // true when technique_step_id != null && effectivePaintId = null
```
StepFocalView renders the unfilled-slot indicator when `isUnfilledSlot`, the resolved swatch when `paint` exists, and "(no paint)" for plain paintless steps. Alternatively, pass `slotMap` to StepFocalView and let it call `effectivePaintId` itself — this is cleaner because StepFocalView already has `currentStep`.

**Decision for planner:** Pass `slotMap` prop to StepFocalView directly. StepFocalView derives:
```typescript
const resolvedPaintId = effectivePaintId(currentStep, slotMap);
const isUnfilledSlot  = currentStep.technique_step_id != null && resolvedPaintId === null;
const hasPaint        = resolvedPaintId !== null && paint; // paint = paintMap.get(resolvedPaintId)
```
The `paint` prop from PaintingModeView is replaced by `slotMap` + `paintMap` props, or PaintingModeView resolves paint via effectivePaintId and passes the resolved `Paint | undefined` plus `isUnfilledSlot: boolean`.

**Recommendation:** Keep the existing `paint: Paint | undefined` prop (already resolved by parent) and add `isUnfilledSlot: boolean` prop. This minimises the diff to StepFocalView's interface.

### INTG-02: useRecipePaints / missingPaints in PaintingModeView

**Current behaviour (line 44-57 of PaintingModeView):**
```typescript
const missingPaints = useMemo(() => {
  for (const step of state.orderedSteps) {
    if (step.paint_id == null) continue;   // ← skips technique steps (paint_id IS NULL)
    const paint = paintMap.get(step.paint_id);
    if (!paint || !isPaintMissing(paint)) continue;
    ...
  }
}, [state.orderedSteps, paintMap]);
```

Technique steps have `paint_id = NULL` so they are silently skipped — this is the undercounting bug. After the fix:
```typescript
const missingPaints = useMemo(() => {
  for (const step of state.orderedSteps) {
    const resolvedId = effectivePaintId(step, slotMap);  // ← replaces step.paint_id read
    if (resolvedId == null) continue;
    const paint = paintMap.get(resolvedId);
    if (!paint || !isPaintMissing(paint)) continue;
    ...
  }
}, [state.orderedSteps, paintMap, slotMap]);  // ← slotMap added to deps
```

**The `RECIPE_AVAILABILITY_KEY` batch query** (`getRecipePaintAvailability` in `recipePaints.ts`) runs at the database level via a GROUP BY JOIN and does not know about slot maps. It is used for recipe *card* availability badges on the recipes page, NOT for the PaintingModeView banner. PaintingModeView computes its own `missingPaints` independently. So the batch query is a separate concern — it will undercount technique steps permanently until a future phase that updates it. This is acceptable for Phase 145 because the requirements scope Painting Mode, not the recipe card badges.

**Confirmation from context:** INTG-02 says "paint availability ('owned/missing') counts slot-resolved paints via `effectivePaintId()`" — the PRIMARY surface is the Painting Mode banner. The recipe card batch query (`useRecipePaintAvailability`) is a batch SQL query that cannot be trivially injected with effectivePaintId without architectural changes. Planner should confirm scope is PaintingModeView `missingPaints` only, not the batch query.

### INTG-03: AssignmentChecklist + ChecklistStepRow

**Direct reads to replace:**

`AssignmentChecklist.tsx` line 127 (orphan steps section):
```typescript
paint={step.paint_id !== null ? paintsById.get(step.paint_id) : undefined}
```

`AssignmentChecklist.tsx` line 152 (sectioned accordion):
```typescript
paint={step.paint_id !== null ? paintsById.get(step.paint_id) : undefined}
```

`AssignmentChecklist.tsx` line 169 (flat list):
```typescript
paint={step.paint_id !== null ? paintsById.get(step.paint_id) : undefined}
```

All three pass the same expression. After fix, all three become:
```typescript
paint={(() => { const id = effectivePaintId(step, slotMap); return id !== null ? paintsById.get(id) : undefined; })()}
```
Or better: extract a helper `resolvedPaint(step)` using the slotMap closure.

`ChecklistStepRow.tsx` line 38 (`hasDetail` check):
```typescript
(step.paint_id !== null && !!paint) ||
```
Must change to: `(resolvedPaintId !== null && !!paint) ||` — where the row now receives a pre-resolved `paint` (which the parent already resolves via effectivePaintId), not the raw step.

`ChecklistStepRow.tsx` line 80 (swatch render):
```typescript
{step.paint_id !== null && paint && (
```
Same — becomes `{paint && (` since the parent resolves the paint (no need to check step.paint_id again once paint is resolved by parent).

**Strategy:** `AssignmentChecklist` calls `useSlotResolutionMap(recipeId)` and resolves paint before passing it to `ChecklistStepRow`. `ChecklistStepRow` receives `paint: Paint | undefined` (already resolved) and its internal `step.paint_id` checks become `paint !== undefined` checks.

### INTG-04: SectionedTimeline badge + Log Session

**SectionedTimeline badge analysis:**

`SectionedTimeline.tsx` already has full infrastructure:
- `techniqueSectionInfoMap?: Map<number, TechniqueSectionInfo>` prop
- `TechniqueSectionBadge` import + render (lines 149-153): renders when `techniqueInfo !== undefined`
- `onNavigateToTechniques` prop controls badge interactivity

Currently the badge is wired in `RecipeDetailSheet` which builds `techniqueSectionInfoMap` via `useInstancesForRecipe` + `useTechniques`. In Painting Mode, `SectionedTimeline` is NOT used — the `SectionNavigator` component is used instead, which shows sections as a left-panel nav. The `SectionedTimeline` in the recipe detail view already shows the badge.

**INTG-04 for SectionedTimeline in Painting Mode context:** Painting Mode does NOT render `SectionedTimeline`. The badge requirement for INTG-04 applies to the existing `SectionedTimeline` in the recipe detail view — which already has the badge wired when `techniqueSectionInfoMap` is provided. The only gap is that the recipe detail view (`RecipeDetailSheet`) already provides this map, so the badge already shows there. **No new wiring needed for SectionedTimeline in Phase 145** beyond what was done in Phase 143.

If there is a Painting Mode path that renders `SectionedTimeline` without `techniqueSectionInfoMap`, that is the gap. Based on the codebase, `SectionedTimeline` is rendered in `RecipeDetailSheet` only (detail view). In Painting Mode, `SectionNavigator` is used. So INTG-04 for SectionedTimeline is already satisfied by Phase 143.

**Log Session analysis:**

`PaintingSessionSheet.tsx` is a simple form Sheet that receives `sectionName: string | null` as a scalar prop (line 32). It does NOT have a section selector — the session is always logged against the currently active step's section, which comes from `PaintingModeView`:
```typescript
const sectionName = currentStep?.section_id
  ? (sections.find((s) => s.id === currentStep.section_id)?.name ?? null)
  : null;
```
Where `sections` comes from `useRecipeSections(recipeId)`. Since technique-sourced sections are real `recipe_sections` rows (created by `applyTechnique`), they appear in `useRecipeSections(recipeId)` automatically. **Log Session already includes technique-sourced section names — no change needed.** [VERIFIED: PaintingModeView.tsx line 35, 105-107; PaintingSessionSheet.tsx line 33]

**Conclusion for INTG-04:** The only real work is confirming the badge appears correctly in `SectionedTimeline` in the recipe detail view. Phase 143 already wired this. No code changes needed for INTG-04 unless the planner discovers a specific path where `SectionedTimeline` renders without `techniqueSectionInfoMap` when it should have it. If SectionedTimeline is also rendered somewhere in Painting Mode path (not found in codebase), that would need wiring.

### INTG-05: duplicateRecipe already technique-aware

**Confirmed implementation in `recipes.ts` lines 181-265:** [VERIFIED: codebase read]

Step 3a (lines 182-195): Reads all `recipe_technique_instances` for the original recipe; inserts new instances for the copy with the same `technique_id`; builds `instanceIdMap: Map<oldId, newId>`.

Step 3b (lines 197-209): For each old instance, copies all `recipe_technique_slot_maps` rows to the new instance. Slot fills are preserved.

Step 5 (lines 220-237): Copies `recipe_sections` with `technique_instance_id` remapped via `instanceIdMap` (null for plain sections). Technique-sourced sections point to the new instances.

Step 7 (lines 252-265): Copies `recipe_steps` with `technique_step_id` carried forward unchanged (`step.technique_step_id ?? null`). The materialised steps in the copy still carry `technique_step_id` — the live link is preserved.

**INTG-05 is satisfied by existing code. Only the integration test needs to be written.**

### INTG-06: Unfilled-slot count

**New DB query needed:** `getUnfilledSlotCount(recipeId: number): Promise<number>`

Logic: for a recipe, count colour slots across all non-detached technique instances that have no paint assigned (either no `recipe_technique_slot_maps` row, or a row with `paint_id = NULL`).

```sql
SELECT COUNT(*) AS unfilled_count
FROM recipe_technique_instances rti
JOIN technique_colour_slots tcs ON tcs.technique_id = rti.technique_id
LEFT JOIN recipe_technique_slot_maps sm
  ON sm.instance_id = rti.id AND sm.slot_id = tcs.id
WHERE rti.recipe_id = $1
  AND rti.detached = 0
  AND (sm.instance_id IS NULL OR sm.paint_id IS NULL)
```

Explanation:
- `JOIN technique_colour_slots ON technique_id` → gives all slots that should be filled for this technique
- `LEFT JOIN recipe_technique_slot_maps` ON `(instance_id, slot_id)` → gives the current fill (NULL join = no fill row; `sm.paint_id IS NULL` = explicit NULL fill)
- `rti.detached = 0` → exclude instances broken by detach (Phase 146 concern, but the column exists from migration 051)
- `sm.instance_id IS NULL` → no map row = unfilled; `sm.paint_id IS NULL` → explicit empty fill

**New hook:** `useUnfilledSlotCount(recipeId: number | undefined)` in `useSlotResolutionMap.ts`.

Query key: `["unfilled-slot-count", recipeId]` — invalidated by `useUpdateSlotMap` (same `SLOT_RESOLUTION_MAP_KEY` invalidation pattern, or a dedicated key).

**Invalidation:** When `updateSlotMap` succeeds, the `useUpdateSlotMap` onSuccess already invalidates `SLOT_RESOLUTION_MAP_KEY`. The new unfilled count key must be added to this invalidation list.

**New query key constant:** `UNFILLED_SLOT_COUNT_KEY = (recipeId: number) => ["unfilled-slot-count", recipeId] as const`

**Where to add:** `recipeTechniqueSlotMaps.ts` (query function) + `useSlotResolutionMap.ts` (hook). Add `UNFILLED_SLOT_COUNT_KEY` to the `useUpdateSlotMap` invalidation in `useTechniqueInstances.ts`.

### INTG-07: SlotReassignMiniDialog — knowing which slot to target

**The question:** When a user taps a technique step's swatch in StepFocalView, which slot should the mini-dialog target?

**Resolution path:**
1. `currentStep.technique_step_id` → the `technique_steps.id` for this materialised step
2. `technique_steps.colour_slot_id` → the `technique_colour_slots.id` for the slot
3. The slot belongs to a specific instance determined by `currentStep.section_id` → `recipe_sections.technique_instance_id`

**What the mini-dialog needs:**
- `instanceId` — to load the slot via `useSlotMapByInstance` and save via `useUpdateSlotMap`
- `slotId` — to show only the one relevant slot (the slot referenced by the tapped step)
- `recipeId` — for invalidation

**Strategy:** PaintingModeView already has access to `sections` from `useRecipeSections(recipeId)`. Given `currentStep.section_id`, it can find the section's `technique_instance_id`. PaintingModeView also has access to `slotMap` (the full resolution map). What it doesn't have in-memory is `technique_steps.colour_slot_id` for the tapped step.

**Two approaches:**
A. Derive `slotId` from the `slotMap`: the slotMap is keyed by `recipe_step.id` → `paint_id`. We cannot reverse-lookup `slotId` from `slotMap` alone (the map doesn't store slot IDs, only resolved paint IDs).
B. Add a separate query: `getTechniqueSlotForStep(recipeStepId)` that does `SELECT ts.colour_slot_id FROM recipe_steps rs JOIN technique_steps ts ON ts.id = rs.technique_step_id WHERE rs.id = $1`.
C. Build an extended resolution map that also stores `slotId` per recipe_step_id in a side-channel.
D. Pass the `slotId` + `slotName` + `instanceId` directly: in `SlotReassignMiniDialog`, use `useSlotMapByInstance(instanceId)` (already exists) to get the current fill for that slot, and `useTechniqueColourSlots(techniqueId)` filtered to just the one slot.

**Recommended approach (D):** The mini-dialog receives `{ instanceId, slotId, techniqueId, recipeId }` as props. It fetches the full slot list via `useTechniqueColourSlots(techniqueId)`, filters to the single `slot = slots.find(s => s.id === slotId)`, loads current fill via `useSlotMapByInstance(instanceId)`, and saves a single-entry Map via `useUpdateSlotMap`.

**How PaintingModeView knows `instanceId` and `slotId`:** PaintingModeView has `sections` from `useRecipeSections`. Given `currentStep.section_id`, it can find `section.technique_instance_id`. For `slotId`, it needs to know `technique_steps.colour_slot_id` for the current step.

**Simplest solution:** Build a `stepToSlotId: Map<recipe_step_id, slot_id | null>` alongside the existing `slotMap`. This can be added to `getSlotResolutionMap` as a second return value, or as a separate query `getStepSlotIdMap(recipeId)`:

```sql
SELECT rs.id AS recipe_step_id, ts.colour_slot_id AS slot_id
FROM recipe_steps rs
JOIN recipe_sections rsec ON rsec.id = rs.section_id
JOIN recipe_technique_instances rti ON rti.id = rsec.technique_instance_id
JOIN technique_steps ts ON ts.id = rs.technique_step_id
WHERE rs.recipe_id = $1 AND rs.technique_step_id IS NOT NULL
```

This reuses the same JOIN chain as `getSlotResolutionMap`. Store as `Map<recipe_step_id, slot_id | null>` in the hook alongside `slotMap`. The planner may choose to extend `getSlotResolutionMap` to return both maps, or add a second query.

**Alternative simplest approach:** Extend `getSlotResolutionMap` to return `{ resolutionMap, stepToSlotId }` as an object. Update `useSlotResolutionMap` accordingly. All existing consumers use only `resolutionMap` (now at `.data.resolutionMap`). Since only one consumer currently reads the hook, the migration is local.

Or keep them separate: add `useStepSlotIdMap(recipeId)` as a separate hook. This avoids changing the `SlotResolutionMap` type and all existing consumers.

**Recommendation for planner:** Add `getStepSlotIdMap(recipeId)` as a separate query function in `recipeTechniqueSlotMaps.ts` and `useStepSlotIdMap(recipeId)` as a separate hook in `useSlotResolutionMap.ts`. `PaintingModeView` calls both hooks and derives `slotId = stepSlotIdMap.get(currentStep.id)` and `instanceId = sections.find(s => s.id === currentStep.section_id)?.technique_instance_id`.

**Also needed in `useTechniqueInstances.ts`:** `useUpdateSlotMap` invalidation must include the new `UNFILLED_SLOT_COUNT_KEY` so the banner updates after an inline reassignment.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slot fill save | Custom DB write | `useUpdateSlotMap` + `updateSlotMap` | Already handles INSERT OR REPLACE + full CASCADE invalidation (7 keys) |
| Slot fill prefill | Custom query | `useSlotMapByInstance(instanceId)` | Already pre-populates keyed by slot_id |
| Paint picker | Custom combobox | `PaintCombobox` + `SlotFillRow` | Phase 143 established pattern; includes a11y, dashed swatch for empty |
| Dialog accessibility | Custom modal | shadcn `Dialog` + `DialogDescription` | Radix Dialog requires DialogDescription for a11y; pattern proven in EditColoursDialog |
| Slot resolution | Direct `step.paint_id` reads | `effectivePaintId(step, slotMap)` | The FND-04 invariant; technique steps always have `paint_id = NULL` |

---

## Common Pitfalls

### Pitfall 1: Missing slotMap in deps array
**What goes wrong:** `missingPaints` useMemo or `resolvedPaint` callsite does not include `slotMap` in its dependency array.
**Why it happens:** Adding a new input to a memo without updating deps — stale closure returns wrong result.
**How to avoid:** Every useMemo/useCallback that calls `effectivePaintId(step, slotMap)` must list `slotMap` as a dep.
**Warning signs:** Swatch shows wrong paint after a slot fill update; TypeScript strict mode won't catch this.

### Pitfall 2: Counting unfilled slots with wrong JOIN
**What goes wrong:** The unfilled count query joins only on existing `recipe_technique_slot_maps` rows, missing slots that have no row at all.
**Why it happens:** Using `INNER JOIN` instead of `LEFT JOIN` on `recipe_technique_slot_maps`.
**How to avoid:** `LEFT JOIN recipe_technique_slot_maps ON (instance_id, slot_id)` then filter `WHERE sm.instance_id IS NULL OR sm.paint_id IS NULL`.
**Warning signs:** Count = 0 even when no paints have been assigned to any slot.

### Pitfall 3: RECIPE_AVAILABILITY_KEY not invalidated after updateSlotMap
**What goes wrong:** Recipe card availability badges don't update after an inline slot reassignment.
**Why it happens:** `useUpdateSlotMap` invalidation list doesn't include the new `UNFILLED_SLOT_COUNT_KEY`.
**How to avoid:** Add `UNFILLED_SLOT_COUNT_KEY(variables.recipeId)` to `useUpdateSlotMap` onSuccess in `useTechniqueInstances.ts`.

### Pitfall 4: ChecklistStepRow step.paint_id checks after parent resolves paint
**What goes wrong:** After `AssignmentChecklist` resolves paint via `effectivePaintId`, `ChecklistStepRow` still gates on `step.paint_id !== null`. Technique steps with filled slots (paint_id IS NULL, but resolved paint is valid) fail this check and don't render swatch.
**Why it happens:** The guard at `ChecklistStepRow` line 38 and line 80 both check `step.paint_id !== null`.
**How to avoid:** Once the parent resolves and passes `paint: Paint | undefined`, `ChecklistStepRow` gates on `!!paint` only, not on `step.paint_id`.

### Pitfall 5: Log Session "section selector" non-issue
**What goes wrong:** Spending time searching for a non-existent section selector in `PaintingSessionSheet`.
**Why it happens:** The INTG-04 requirement mentions "cascading section selector" but the actual component has no such UI.
**How to avoid:** Confirm that `PaintingSessionSheet` receives `sectionName` as a scalar prop from parent. Technique sections ARE included because they are real `recipe_sections` rows returned by `useRecipeSections`. No code change needed.

### Pitfall 6: SlotReassignMiniDialog rendered inside SheetContent
**What goes wrong:** Dialog appears below the Painting Mode panel or clips at Sheet boundaries.
**Why it happens:** Radix Dialog portal renders at document.body — but if positioned inside a SheetContent with overflow styling, it may be clipped.
**How to avoid:** Render `SlotReassignMiniDialog` as a sibling to the Sheet/main content, not nested inside it. Follow the EditColoursDialog/RecipeDetailSheet P6 pattern (React fragment wrapper).

### Pitfall 7: detached instances included in unfilled count
**What goes wrong:** Unfilled slot count is too high because it counts slots from detached (future-Phase-146) instances.
**Why it happens:** The WHERE clause on `getUnfilledSlotCount` does not filter `rti.detached = 0`.
**How to avoid:** Always filter `AND rti.detached = 0`. The `detached` column exists on `recipe_technique_instances` from migration 051.

---

## Code Examples

### Pattern 1: effectivePaintId wire-up in a consumer

```typescript
// Source: src/lib/effectivePaintId.ts (verified) + existing pattern in SectionedTimeline.tsx

// In the consuming component:
import { effectivePaintId } from "@/lib/effectivePaintId";
import { useSlotResolutionMap } from "@/hooks/useSlotResolutionMap";

// 1. Fetch slotMap once at the component level (or receive as prop):
const { data: slotMap = new Map() } = useSlotResolutionMap(recipeId);

// 2. In a useMemo or render:
const resolvedId = effectivePaintId(step, slotMap);
// resolvedId === null → unfilled slot OR intentionally no paint
// Distinguish: step.technique_step_id != null && resolvedId === null → unfilled slot
// step.technique_step_id == null && resolvedId === null → plain paintless step
const isUnfilledSlot = step.technique_step_id != null && resolvedId === null;
const paint = resolvedId !== null ? paintMap.get(resolvedId) : undefined;
```

### Pattern 2: getUnfilledSlotCount SQL (new)

```typescript
// Add to src/db/queries/recipeTechniqueSlotMaps.ts
// Source: derived from getSlotResolutionMap JOIN chain + LEFT JOIN pattern

export async function getUnfilledSlotCount(recipeId: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ unfilled_count: number }[]>(
    `SELECT COUNT(*) AS unfilled_count
     FROM recipe_technique_instances rti
     JOIN technique_colour_slots tcs ON tcs.technique_id = rti.technique_id
     LEFT JOIN recipe_technique_slot_maps sm
       ON sm.instance_id = rti.id AND sm.slot_id = tcs.id
     WHERE rti.recipe_id = $1
       AND rti.detached = 0
       AND (sm.instance_id IS NULL OR sm.paint_id IS NULL)`,
    [recipeId],
  );
  return rows[0]?.unfilled_count ?? 0;
}
```

### Pattern 3: useUnfilledSlotCount hook (new)

```typescript
// Add to src/hooks/useSlotResolutionMap.ts
// Source: enabled-by-id pattern from existing useSlotResolutionMap

export const UNFILLED_SLOT_COUNT_KEY = (recipeId: number) =>
  ["unfilled-slot-count", recipeId] as const;

export function useUnfilledSlotCount(recipeId: number | undefined) {
  return useQuery({
    queryKey:
      recipeId !== undefined
        ? UNFILLED_SLOT_COUNT_KEY(recipeId)
        : ["unfilled-slot-count"],
    queryFn: () =>
      recipeId !== undefined
        ? getUnfilledSlotCount(recipeId)
        : Promise.resolve(0),
    enabled: recipeId !== undefined,
  });
}
```

### Pattern 4: updateSlotMap invalidation extension (existing file)

```typescript
// In src/hooks/useTechniqueInstances.ts — extend useUpdateSlotMap onSuccess
// Source: existing invalidation pattern in useTechniqueInstances.ts lines 118-130

import { UNFILLED_SLOT_COUNT_KEY } from "@/hooks/useSlotResolutionMap";

// In useUpdateSlotMap onSuccess:
qc.invalidateQueries({ queryKey: UNFILLED_SLOT_COUNT_KEY(variables.recipeId) }); // add
```

### Pattern 5: SlotReassignMiniDialog structure

```typescript
// Source: EditColoursDialog.tsx (Phase 143) — single-slot focused variant
// New file: src/features/painting-mode/SlotReassignMiniDialog.tsx

interface SlotReassignMiniDialogProps {
  open: boolean;
  instanceId: number | null;
  slotId: number | null;
  techniqueId: number | null;
  recipeId: number;
  onClose: () => void;
}

// Uses:
//   useTechniqueColourSlots(techniqueId) — filtered to single slot
//   useSlotMapByInstance(instanceId)     — current fill prefill
//   useUpdateSlotMap()                   — save
//   SlotFillRow                          — single row (no ScrollArea)
// Dialog title: "Reassign slot colour"
// Description:  "Change the paint assigned to this colour slot."
// Confirm btn:  "Reassign paint" (primary variant)
// Close btn:    "Close" (outline)
// max-w-xs     (320px — narrower than SlotFillDialog max-w-md)
```

### Pattern 6: INTG-05 integration test structure

```typescript
// New file: tests/techniques/recipe-duplication-live-link.test.ts
// Source: tests/data-layer/apply-technique.test.ts structure

// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";
import { duplicateRecipe } from "@/db/queries/recipes";
import { createHobbyforgeDb, createTestRecipe, createDbBridge } from "../data-layer/db-helpers";

describe("duplicateRecipe — live link preserved (INTG-05)", () => {
  // Assertions:
  // 1. Copy has distinct recipe_technique_instances rows (new IDs)
  // 2. Copy's instances have same technique_id as original
  // 3. Copy's slot maps are independent (same slot→paint, distinct instance_id)
  // 4. Copy's recipe_steps carry technique_step_id (live link intact)
  // 5. Copy's recipe_sections carry technique_instance_id pointing to copy's instances
});
```

---

## Runtime State Inventory

Not applicable — this phase involves no renames, refactors, or migrations. All schema work was completed in migrations 051-053 (Phases 141-144). No new migration expected for Phase 145. [VERIFIED: CONTEXT.md "No new migration expected — the schema (051/052/053) already supports this phase; new migration would start at 054"]

---

## Common Pitfalls (Anti-Patterns)

### Anti-Pattern: Reading step.paint_id in a technique-aware consumer
Step rows from `getRecipePaintsByRecipe` always have `paint_id = NULL` for technique steps (materialised with `paint_id = NULL` in `applyTechnique` and in `resyncTechniqueInstances`). Any consumer that reads `step.paint_id` directly will silently skip or misrender technique-owned steps. The only correct entry point is `effectivePaintId(step, slotMap)`.

### Anti-Pattern: Calling useSlotResolutionMap at the row level
Calling `useSlotResolutionMap` inside a per-step or per-row component creates N+1 hook calls. The map must be fetched once at the page/list level and threaded down as a prop.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct `step.paint_id` reads in all consumers | `effectivePaintId(step, slotMap)` via `useSlotResolutionMap` | Phase 143 (data layer) | All consumers must be migrated in Phase 145 |
| SlotResolutionMap keyed on `technique_step_id` | Keyed on `recipe_step.id` (CR-01 fix) | Phase 143 | Two applications of same technique no longer collide |
| Recipe duplication ignored technique instances | CR-02: duplicates instances + slot maps + preserves technique_step_id | Phase 143 | duplicateRecipe is now technique-aware |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `PaintingSessionSheet` has no section selector — `sectionName` is scalar prop from parent | INTG-04 analysis | If there IS a hidden section picker, Log Session may not list technique sections |
| A2 | `SectionedTimeline` is rendered only in `RecipeDetailSheet`, not in Painting Mode | INTG-04 analysis | If a Painting Mode path also renders `SectionedTimeline`, it may not have `techniqueSectionInfoMap` |
| A3 | `getRecipePaintAvailability` (batch card query) is out of scope for INTG-02 | INTG-02 analysis | Recipe card availability badges will still undercount until a future phase |
| A4 | `recipe_technique_instances.detached` column exists from migration 051 | Unfilled count query | If column absent, filter `AND rti.detached = 0` causes SQL error |

**A1 verification:** [VERIFIED: PaintingSessionSheet.tsx line 32 — `sectionName: string | null` is a scalar prop; no selector UI in the component]
**A2 verification:** [VERIFIED: codebase glob — SectionedTimeline is imported in RecipeDetailSheet.tsx, RecipeFormSheet.tsx (editor); neither is rendered in PaintingModeView]
**A4 verification:** [VERIFIED: recipeTechniqueInstances.ts applyTechnique INSERT — `detached` not in INSERT; migration 051 likely has a DEFAULT. Need to confirm column existence before using in WHERE]

**A4 follow-up check needed by planner:** Run `grep -r "detached" src-tauri/migrations/` to confirm `recipe_technique_instances.detached` column exists. If absent, drop the `AND rti.detached = 0` filter (all instances are live-linked in Phase 145; detach is Phase 146).

---

## Open Questions (RESOLVED)

> All resolved before planning. Q1 → CONFIRMED the `detached` column exists with
> `DEFAULT 0` (migration `051_technique_library_foundation.sql` line 61), so the
> `AND rti.detached = 0` filter is KEPT in `getUnfilledSlotCount`. Q2 → scoped to
> the Painting Mode `missingPaints` path (card-badge batch query deferred). Q3 →
> `tests/data-layer/recipe-duplication-live-link.test.ts`.

1. **Does `recipe_technique_instances` have a `detached` column?** — RESOLVED: yes, `detached INTEGER NOT NULL DEFAULT 0` (migration 051 line 61). Use `AND rti.detached = 0`.
2. **Should `getRecipePaintAvailability` (batch SQL card query) be updated for INTG-02?** — RESOLVED: no — scope INTG-02 to the Painting Mode `missingPaints` useMemo only; card-badge batch query is a separate surface (future).
3. **Where should the INTG-05 integration test file live?** — RESOLVED: `tests/data-layer/recipe-duplication-live-link.test.ts` (data-layer invariant test via `createHobbyforgeDb()`).

---

## Environment Availability

Step 2.6: SKIPPED — this phase installs no external tools. Runtime is standard Tauri 2 + Node.js + pnpm already confirmed operational.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (jsdom) / `// @vitest-environment node` per-file override |
| Quick run command | `pnpm test -- tests/techniques/recipe-duplication-live-link.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTG-01 | Painting Mode resolves technique steps via effectivePaintId | Component (RTL) | `pnpm test -- tests/painting-mode/` | Existing; extend |
| INTG-02 | missingPaints counts include slot-resolved paints | Unit (useMemo logic) | `pnpm test -- tests/painting-mode/PaintReadinessBanner.test.tsx` | Existing; extend |
| INTG-03 | AssignmentChecklist shows technique step paints | Component (RTL) | `pnpm test -- tests/techniques/AssignmentChecklist.test.tsx` | NO — Wave 0 gap |
| INTG-04 | Log Session includes technique section names | Manual / integration | N/A — no UI test needed (sectionName is scalar prop from real DB rows) | N/A |
| INTG-05 | duplicateRecipe preserves live links | Data-layer (node) | `pnpm test -- tests/data-layer/recipe-duplication-live-link.test.ts` | NO — new file |
| INTG-06 | PaintReadinessBanner shows unfilled slot count | Component (RTL) | `pnpm test -- tests/painting-mode/PaintReadinessBanner.test.tsx` | Existing; extend |
| INTG-07 | SlotReassignMiniDialog saves single slot | Component (RTL) | `pnpm test -- tests/painting-mode/SlotReassignMiniDialog.test.tsx` | NO — Wave 0 gap |

### Sampling Rate
- **Per task commit:** Quick run on the affected test file
- **Per wave merge:** `pnpm test` full suite (currently 335 passing)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/data-layer/recipe-duplication-live-link.test.ts` — covers INTG-05 (data-layer, node env)
- [ ] `tests/techniques/AssignmentChecklist.test.tsx` — covers INTG-03 (RTL, jsdom env)
- [ ] `tests/painting-mode/SlotReassignMiniDialog.test.tsx` — covers INTG-07 (RTL, jsdom env)

---

## Security Domain

No new auth, network, or sensitive data flows. This phase is pure local SQLite reads/writes via the existing Tauri plugin-sql bridge. ASVS V5 input validation: slot fills are `number | null` (typed by TypeScript + the existing `SlotFillRow` / `PaintCombobox` which constrain to known paint IDs from the DB). No new ASVS categories apply beyond those already covered by Phase 143.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/effectivePaintId.ts` — resolution spine (read in full)
- `src/hooks/useSlotResolutionMap.ts` — hook structure (read in full)
- `src/db/queries/recipeTechniqueSlotMaps.ts` — query implementations (read in full)
- `src/db/queries/recipeTechniqueInstances.ts` — applyTechnique implementation (read in full)
- `src/db/queries/recipes.ts` lines 148-270 — duplicateRecipe full implementation (read in full)
- `src/features/painting-mode/PaintingModeView.tsx` — all direct paint_id reads identified (read in full)
- `src/features/painting-mode/StepFocalView.tsx` — line 61 hasPaint check (read in full)
- `src/features/painting-mode/PaintReadinessBanner.tsx` — current props interface (read in full)
- `src/features/painting-mode/PaintingSessionSheet.tsx` — sectionName scalar prop confirmed (read in full)
- `src/features/painting-mode/SectionNavigator.tsx` — sections from useRecipeSections confirmed (read in full)
- `src/features/recipes/AssignmentChecklist.tsx` — all three step.paint_id read sites identified (read in full)
- `src/features/recipes/ChecklistStepRow.tsx` — lines 38 and 80 identified (read in full)
- `src/features/recipes/SectionedTimeline.tsx` — badge infrastructure already present (read in full)
- `src/features/recipes/EditColoursDialog.tsx` — template for SlotReassignMiniDialog (read in full)
- `src/features/recipes/SlotFillRow.tsx` — reusable single-row slot fill component (read in full)
- `src/hooks/useTechniqueInstances.ts` — useUpdateSlotMap + CASCADE invalidation (read in full)
- `src/types/recipePaint.ts` — RecipeStep.technique_step_id field (read in full)
- `src/types/recipeSection.ts` — RecipeSection.technique_instance_id field (read in full)
- `src/types/technique.ts` — TechniqueColourSlot, TechniqueStep.colour_slot_id (read in full)
- `.planning/phases/143-*/143-04-SUMMARY.md` — Phase 143 final deliverables (read)
- `.planning/phases/144-*/144-03-SUMMARY.md` — Phase 144 final deliverables (read)
- `tests/data-layer/db-helpers.ts` — test infrastructure pattern (read)
- `tests/data-layer/apply-technique.test.ts` — integration test pattern (read)

### Metadata

**Confidence breakdown:**
- Consumer read sites (INTG-01/02/03): HIGH — verified by direct file read
- duplicateRecipe already satisfies INTG-05: HIGH — full implementation read
- Log Session already correct (INTG-04): HIGH — PaintingSessionSheet read; no selector exists
- SectionedTimeline badge already in RecipeDetailSheet: HIGH — SectionedTimeline.tsx read
- Unfilled slot count SQL: HIGH — derived from existing JOIN chain in getSlotResolutionMap
- slotId lookup for INTG-07: MEDIUM — derived from schema; exact approach TBD by planner

**Research date:** 2026-06-22
**Valid until:** 2026-07-22 (stable codebase, no fast-moving deps)
