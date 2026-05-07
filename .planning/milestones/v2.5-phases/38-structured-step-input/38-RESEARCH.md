# Phase 38: Structured Step Input - Research

**Researched:** 2026-05-07
**Domain:** React form UI extension — DraftStep type, RecipeStepRow layout, query layer expansion
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Step row layout**
- Two-line layout per step row inside RecipeFormSheet
- First line: painting phase dropdown + freeform step title + paint combobox (existing PaintCombobox)
- Second line: tool input + technique input + dilution input + time estimate input
- Drag handle and delete button remain in their current positions (left and right)
- Notes field stays as a third line (already exists)

**Painting phase vs step title**
- painting_phase is a categorical Select dropdown using the enum: prime, basecoat, shade, layer, highlight, glaze, weathering, basing, varnish, other
- step_name remains as a freeform text input for a custom title (e.g., "Edge highlight on shoulders")
- Both fields coexist — painting_phase categorizes the step type, step_name gives it a human label
- Use the Radix Select `__none__` sentinel pattern (established convention) for the painting_phase dropdown

**Time estimate display**
- Show the sum of all step time_estimate_minutes values next to the "Recipe Steps" section header in RecipeFormSheet
- Format as human-readable (e.g., "~45 min" or "~1h 30min")
- Recipe card time display is Phase 39 scope (STUDIO-01) — not included here

**Field optionality**
- painting_phase: required (core categorization from success criteria SC-1)
- step_name: required (already required — min 1 char)
- paint_id: optional
- tool: optional free text
- technique: optional free text
- dilution: optional free text
- time_estimate_minutes: optional integer (minutes)

**Save behavior**
- Expand the addRecipePaint INSERT query to include all 5 new columns
- Expand DraftStep type to carry the 5 new fields alongside existing localId/step_name/paint_id/notes
- RecipeFormSheet on save: pass all new fields from DraftStep to the mutation (currently hardcoded to null)
- Keep the existing remove-all + re-add pattern for edit mode

### Claude's Discretion
- Exact Input component sizing and responsive behavior within the two-line layout
- Whether tool/technique/dilution use free text inputs or comboboxes with suggestions
- Datalist suggestions for tool/technique/dilution if using free text
- Exact format of the time estimate sum display (e.g., "~45 min" vs "45m" vs "0:45")
- Whether painting_phase dropdown auto-populates step_name when step_name is empty

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STEP-01 | User can add/edit/delete steps with title, phase (prime/basecoat/shade/layer/highlight/glaze/weathering/basing/varnish/other), and paint link | painting_phase Select + step_name Input + existing PaintCombobox already in RecipeStepRow; extend DraftStep + addRecipePaint INSERT |
| STEP-02 | User can reorder steps via drag-and-drop (reuses @dnd-kit) | @dnd-kit already fully wired in RecipeStepList — no new code needed for reorder; persists via computeOrderIndex on submit |
| STEP-03 | User can set tool, dilution, and technique per step | Three new optional text Inputs on the second row of RecipeStepRow; extend DraftStep; extend INSERT |
| STEP-04 | User can set time estimate per step (minutes), which rolls up to recipe total | Fourth new input on second row; `useMemo` sum displayed next to "Recipe Steps" header in RecipeFormSheet |
</phase_requirements>

---

## Summary

Phase 38 is a pure UI + query layer extension. Phase 37 already added all five new DB columns (`painting_phase`, `tool`, `technique`, `dilution`, `time_estimate_minutes`) to the `recipe_steps` table and added them to the `RecipeStep` interface in `src/types/recipePaint.ts`. The DB schema is complete; nothing to migrate. The `addRecipePaint` INSERT in `src/db/queries/recipePaints.ts` still writes only the original 5 columns and hard-codes `null` for the new fields; `RecipeFormSheet.onSubmit` also passes `null` for all new fields. Phase 38 closes both gaps.

The work is entirely additive: extend `DraftStep` with 5 new fields, update `makeDraftStep` to initialise them, update `RecipeStepRow` to render a second input row plus a painting_phase Select, update `addRecipePaint` INSERT to write all 10 columns, and update `RecipeFormSheet.onSubmit` to pass real values instead of `null`. The drag-and-drop reorder mechanism (STEP-02) is already complete — `arrayMove` + `computeOrderIndex` on submit gives persistence automatically. No new hooks, no new DB tables, no new routes.

The two areas requiring judgment are: (1) layout density for the second row of inputs inside the already-compact Sheet, and (2) the time-sum display format next to the "Recipe Steps" header. Both are Claude's Discretion.

**Primary recommendation:** Extend the existing files in a single coherent wave: types → query → form state → UI → tests. Avoid splitting the type change from the UI change — they are tightly coupled and splitting creates a phase where the UI renders fields that aren't persisted.

---

## Standard Stack

### Core (all already in the project)

| Library | Version in use | Purpose | Why Standard |
|---------|---------------|---------|--------------|
| @dnd-kit/core + @dnd-kit/sortable | already installed | Drag-and-drop reorder | Already wired in RecipeStepList; no reinstall needed |
| @radix-ui/react-select (via shadcn) | already installed | painting_phase dropdown with `__none__` sentinel | Established project pattern for nullable selects |
| React Hook Form | already installed | Recipe-level form only — step fields bypass RHF | useFieldArray explicitly excluded (ID collision with useSortable, RHF #10607) |
| Zod | already installed | Recipe schema validation — step fields are not in the Zod schema | Step fields live in DraftStep[], not RHF fields |
| @tanstack/react-query | already installed | Cache invalidation after step add/remove | STEP_COUNTS_KEY + RECIPE_PAINTS_KEY + RECIPE_SWATCH_KEY |

### No New Installations Required

All libraries needed for Phase 38 are already installed. This phase touches no package.json.

---

## Architecture Patterns

### Recommended Project Structure

No new files or directories needed. All changes are in-place extensions of existing files:

```
src/
  features/recipes/
    recipeSteps.ts           ← extend DraftStep type + makeDraftStep
    RecipeStepRow.tsx        ← add painting_phase Select + second input row
    RecipeFormSheet.tsx      ← wire new DraftStep fields; add time sum display
  db/queries/
    recipePaints.ts          ← expand addRecipePaint INSERT from 5 to 10 columns
tests/
  painting/
    recipeSteps.test.ts      ← extend with new field initialization tests
  painting/
    recipeStepRow.test.ts    ← NEW: renders new inputs, time sum display (Wave 0 gap)
```

### Pattern 1: DraftStep Type Extension

The `DraftStep` interface in `src/features/recipes/recipeSteps.ts` currently has 4 fields. Add the 5 new fields, all nullable/optional to match `RecipeStep`:

```typescript
// src/features/recipes/recipeSteps.ts
export interface DraftStep {
  localId: string;
  step_name: string;
  paint_id: number | null;
  notes: string | null;
  // Phase 38 structured fields
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
}

export function makeDraftStep(): DraftStep {
  return {
    localId: crypto.randomUUID(),
    step_name: "",
    paint_id: null,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
  };
}
```

The `computeOrderIndex` function needs no change — it spreads the full DraftStep already.

### Pattern 2: Edit Mode Hydration in RecipeFormSheet

The `useEffect` that builds draft steps from `existingSteps` currently maps only 4 fields. It must map all 9 non-localId fields from `RecipeStep`:

```typescript
// RecipeFormSheet.tsx — useEffect for edit mode
setSteps(
  existingSteps.map((s) => ({
    localId: crypto.randomUUID(),
    step_name: s.step_name,
    paint_id: s.paint_id,
    notes: s.notes,
    painting_phase: s.painting_phase,
    tool: s.tool,
    technique: s.technique,
    dilution: s.dilution,
    time_estimate_minutes: s.time_estimate_minutes,
  })),
);
```

If this is not updated, editing an existing recipe will silently discard the new fields.

### Pattern 3: painting_phase Select with `__none__` Sentinel

The project convention for optional Radix Select is the `__none__` sentinel (Radix forbids empty string in `SelectItem`). The painting_phase field uses the same pattern as style/surface/effect:

```typescript
// Inside RecipeStepRow
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

<Select
  value={step.painting_phase ?? "__none__"}
  onValueChange={(v) =>
    onChange({ ...step, painting_phase: v === "__none__" ? null : v })
  }
>
  <SelectTrigger className="w-32">
    <SelectValue placeholder="Phase" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="__none__">— phase —</SelectItem>
    {PAINTING_PHASES.map((p) => (
      <SelectItem key={p} value={p}>{p}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Pattern 4: PAINTING_PHASES Const Array in recipeSchema.ts

Follow the exact same pattern as `RECIPE_STYLES`:

```typescript
// src/features/recipes/recipeSchema.ts — add alongside existing consts
export const PAINTING_PHASES = [
  "prime", "basecoat", "shade", "layer", "highlight",
  "glaze", "weathering", "basing", "varnish", "other",
] as const;
export type PaintingPhase = typeof PAINTING_PHASES[number];
```

This const array lives in `recipeSchema.ts` (not `recipeSteps.ts`) because it follows the pattern established by `RECIPE_STYLES`, `RECIPE_SURFACES`, etc. Both `RecipeStepRow.tsx` and any future tests import from the same location.

### Pattern 5: Time Sum Display in RecipeFormSheet

The sum is a derived value from `steps[]` state — use `useMemo`:

```typescript
// RecipeFormSheet.tsx
const totalMinutes = useMemo(
  () => steps.reduce((acc, s) => acc + (s.time_estimate_minutes ?? 0), 0),
  [steps],
);

function formatMinutes(total: number): string {
  if (total === 0) return "";
  if (total < 60) return `~${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}min`;
}
```

Display alongside the "Recipe Steps" section header:

```tsx
<div className="flex items-center gap-2">
  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    Recipe Steps
  </span>
  {totalMinutes > 0 && (
    <span className="text-xs text-muted-foreground">
      {formatMinutes(totalMinutes)}
    </span>
  )}
</div>
```

### Pattern 6: addRecipePaint INSERT Expansion

The current INSERT writes 5 columns and omits the 5 new ones:

```typescript
// BEFORE (current)
`INSERT INTO recipe_steps (recipe_id, paint_id, step_name, order_index, notes)
 VALUES ($1, $2, $3, $4, $5)`
[input.recipe_id, input.paint_id, input.step_name, input.order_index, input.notes ?? null]

// AFTER (Phase 38)
`INSERT INTO recipe_steps
 (recipe_id, paint_id, step_name, order_index, notes,
  painting_phase, tool, technique, dilution, time_estimate_minutes)
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
[
  input.recipe_id, input.paint_id, input.step_name, input.order_index, input.notes ?? null,
  input.painting_phase ?? null, input.tool ?? null, input.technique ?? null,
  input.dilution ?? null, input.time_estimate_minutes ?? null,
]
```

The `CreateRecipeStepInput` type already includes all 10 fields (defined from `Omit<RecipeStep, 'id'|'created_at'>`), so the TypeScript signature is already correct — only the runtime SQL string needs updating.

### Pattern 7: RecipeFormSheet onSubmit — Pass Real Values

Two call sites pass `null` for all new fields; both must pass real values:

```typescript
// Replace the null literals with DraftStep field values
await addRecipePaint.mutateAsync({
  recipe_id: /* ... */,
  paint_id: s.paint_id,
  step_name: s.step_name,
  order_index: s.order_index,
  notes: s.notes,
  painting_phase: s.painting_phase,   // was null
  tool: s.tool,                       // was null
  technique: s.technique,             // was null
  dilution: s.dilution,               // was null
  time_estimate_minutes: s.time_estimate_minutes, // was null
});
```

Note the existing guard `if (s.paint_id !== null)` skips steps without a paint. The CONTEXT.md decision keeps this guard — steps with no paint are not persisted. If this behavior needs to change (persist steps even without a paint), that is a future decision, not Phase 38 scope.

### Anti-Patterns to Avoid

- **Splitting DraftStep change from UI change:** TypeScript will not catch the mismatch at runtime if DraftStep is extended but RecipeStepRow still reads the old shape. Do both in the same commit.
- **Forgetting to update edit-mode hydration:** The `useEffect` in RecipeFormSheet that maps `existingSteps → DraftStep[]` will silently drop new fields if not updated. This causes edit mode to zero out all 5 new fields on save.
- **Adding painting_phase to the Zod recipe schema:** Step fields live in `DraftStep[]` state, not in `RecipeFormValues`. Do NOT add them to `recipeSchema.ts`'s Zod object — it would break the existing form.
- **Using `useFieldArray` for steps:** Explicitly documented in STATE.md and REQUIREMENTS.md as causing ID collision with `@dnd-kit/useSortable` (RHF #10607). The existing `useState<DraftStep[]>` pattern is correct.
- **Persisting steps without a paint:** The `if (s.paint_id !== null)` guard in `onSubmit` is intentional per existing behavior. Phase 38 does not change this contract.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reorder | Custom drag logic | @dnd-kit (already wired) | Already in RecipeStepList with PointerSensor + KeyboardSensor + arrayMove |
| Nullable dropdown | Empty string in SelectItem | `__none__` sentinel + null coercion | Radix forbids empty string; project convention already established |
| Const array for enum values | Inline string literals in JSX | `PAINTING_PHASES` in recipeSchema.ts | Enables type safety, tests, and future reuse by Phase 39 |

---

## Common Pitfalls

### Pitfall 1: Edit Mode Drops New Fields
**What goes wrong:** User opens an existing recipe, sees new fields populated from DB, saves — the new fields are reset to null because the `useEffect` hydration doesn't map them.
**Why it happens:** `recipeSteps.ts` DraftStep is extended but the mapping in RecipeFormSheet's `useEffect` still constructs `{ localId, step_name, paint_id, notes }` with no new fields.
**How to avoid:** Update the `existingSteps.map(...)` inside the `useEffect` to include all 9 non-localId fields.
**Warning signs:** TypeScript will not catch this if `DraftStep` has the new fields with `| null` — undefined falls to `null` default silently. Test explicitly.

### Pitfall 2: INSERT Parameter Count Mismatch
**What goes wrong:** Runtime error "expected N parameters, got M" from tauri-plugin-sql.
**Why it happens:** SQL string updated but params array not (or vice versa).
**How to avoid:** Count `$N` placeholders and array positions together. The project uses `$1`…`$10` positional syntax — they must match exactly.
**Warning signs:** The mutation throws; `toast.error("Failed to save recipe.")` appears on save.

### Pitfall 3: STEP_SUGGESTIONS Datalist Conflicts with painting_phase
**What goes wrong:** The current `STEP_SUGGESTIONS` datalist (`list="recipe-step-suggestions"`) overlaps with painting_phase values ("Primer", "Basecoat", etc.) and confuses the purpose of `step_name`.
**Why it happens:** The original design used `step_name` for both categorization and title; Phase 38 splits this.
**How to avoid:** Remove `STEP_SUGGESTIONS` datalist from `RecipeStepRow` and the `list="recipe-step-suggestions"` attribute from the `step_name` Input. The painting_phase Select now handles categorization. `step_name` becomes a freeform title input with a new placeholder like "e.g. Edge highlight on pauldrons".
**Warning signs:** Users see autocomplete suggestions on the title field that duplicate the dropdown options.

### Pitfall 4: Second Row Layout Overflow in Sheet
**What goes wrong:** Four inputs (tool, technique, dilution, time) rendered in a single row overflow the 576px max-width Sheet on smaller screens.
**Why it happens:** Each input needs a label + minimum tap target; four in a row is too wide for the Sheet's content area.
**How to avoid:** Use a `grid grid-cols-2 gap-1.5` for the second row (tool + technique left, dilution + time right), or wrap to two rows of two. Tool and technique can be wider (flex-1); dilution and time can be fixed-width (`w-24`). Confirmed pattern: existing RecipeStepRow uses `flex gap-2` per row.
**Warning signs:** Horizontal scroll appears inside the Sheet, or inputs clip their text.

### Pitfall 5: time_estimate_minutes Input Accepts Non-Integer
**What goes wrong:** A user types "1.5" in the time field; it passes as a float to the DB INTEGER column. SQLite stores it as a float (no type enforcement at DB level), breaking the rollup sum.
**Why it happens:** `<Input type="number" />` allows decimal values by default.
**How to avoid:** Add `step={1}` and use `Math.round()` or `parseInt()` on the onChange handler, same as the recipe-level `estimated_minutes` field in RecipeFormSheet.
**Warning signs:** The time sum shows fractional minutes; future queries treating the column as INTEGER behave unexpectedly.

---

## Code Examples

### Complete DraftStep Extension

```typescript
// src/features/recipes/recipeSteps.ts
export interface DraftStep {
  localId: string;
  step_name: string;
  paint_id: number | null;
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
}

export function makeDraftStep(): DraftStep {
  return {
    localId: crypto.randomUUID(),
    step_name: "",
    paint_id: null,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
  };
}
```

### PAINTING_PHASES Const (add to recipeSchema.ts)

```typescript
export const PAINTING_PHASES = [
  "prime", "basecoat", "shade", "layer", "highlight",
  "glaze", "weathering", "basing", "varnish", "other",
] as const;
export type PaintingPhase = typeof PAINTING_PHASES[number];
```

### Expanded INSERT (recipePaints.ts)

```typescript
export async function addRecipePaint(input: CreateRecipeStepInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO recipe_steps
     (recipe_id, paint_id, step_name, order_index, notes,
      painting_phase, tool, technique, dilution, time_estimate_minutes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      input.recipe_id, input.paint_id, input.step_name, input.order_index, input.notes ?? null,
      input.painting_phase ?? null, input.tool ?? null, input.technique ?? null,
      input.dilution ?? null, input.time_estimate_minutes ?? null,
    ]
  );
  return result.lastInsertId ?? 0;
}
```

### RecipeStepRow Second-Line Layout Sketch

```tsx
{/* Line 1: phase dropdown + title + paint */}
<div className="flex items-center gap-2">
  <Select value={step.painting_phase ?? "__none__"} onValueChange={...}>
    <SelectTrigger className="w-32"><SelectValue placeholder="Phase" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="__none__">— phase —</SelectItem>
      {PAINTING_PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
    </SelectContent>
  </Select>
  <Input className="flex-1" placeholder="e.g. Edge highlight on pauldrons" value={step.step_name} onChange={...} />
  <div className="w-40"><PaintCombobox ... /></div>
</div>

{/* Line 2: tool + technique + dilution + time */}
<div className="grid grid-cols-2 gap-1.5">
  <Input placeholder="Tool" value={step.tool ?? ""} onChange={...} />
  <Input placeholder="Technique" value={step.technique ?? ""} onChange={...} />
  <Input placeholder="Dilution" value={step.dilution ?? ""} onChange={...} />
  <Input type="number" step={1} min={1} placeholder="Time (min)" value={step.time_estimate_minutes ?? ""} onChange={...} />
</div>

{/* Line 3: notes (existing) */}
<Input className="text-xs" placeholder="Notes…" value={step.notes ?? ""} onChange={...} />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RecipePaint type | RecipeStep (alias maintained) | Phase 37-01 | No import changes needed; alias in recipePaint.ts |
| 5-column INSERT | 10-column INSERT | Phase 38 | New fields persisted |
| DraftStep (4 fields) | DraftStep (9 fields) | Phase 38 | RecipeStepRow renders new inputs |
| Null-hardcoded onSubmit | Real values from DraftStep | Phase 38 | Fields actually saved to DB |
| step_name datalist autocomplete | painting_phase Select dropdown | Phase 38 | Categorical enum replaces freeform datalist |

---

## Open Questions

1. **Should steps without a paint be persisted?**
   - What we know: The current `if (s.paint_id !== null)` guard silently skips paint-less steps on save. With Phase 38, users may legitimately want to record a "Varnish" step with no paint, only a tool and technique.
   - What's unclear: Whether dropping paint-less steps is intentional or a legacy artifact.
   - Recommendation: Treat as out of scope for Phase 38 (guard stays); note in STATE.md for Phase 40 review. The CONTEXT.md does not address this — do not change it silently.

2. **Auto-populate step_name from painting_phase?**
   - What we know: CONTEXT.md marks this as Claude's Discretion. E.g., selecting "basecoat" could auto-fill "Basecoat" in step_name if blank.
   - What's unclear: Whether this is more helpful or more intrusive for hobbyists who use specific labels.
   - Recommendation: Do NOT auto-populate. The two fields serve different purposes (category vs label); an artist writing "Thin blue-black undercoat" wants their own label, not "basecoat". Keep fields independent.

3. **Datalist suggestions for tool/technique/dilution?**
   - What we know: CONTEXT.md marks this as Claude's Discretion.
   - What's unclear: Value of suggestions vs complexity of maintaining lists.
   - Recommendation: Add lightweight `<datalist>` suggestions for tool (e.g., "Size 0 brush", "Size 1 brush", "Airbrush", "Dry brush", "Sponge") and technique (e.g., "Thin layers", "Stipple", "Wet blend", "Dry brush", "Wash"). Keep dilution as free text with no datalist — too model-specific. This adds no dependencies and improves discoverability.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest section) |
| Quick run command | `pnpm test -- tests/painting/recipeSteps.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STEP-01 | DraftStep has painting_phase + makeDraftStep initialises it to null | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (extend existing) |
| STEP-01 | addRecipePaint INSERT includes painting_phase in SQL + params | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ❌ Wave 0 gap |
| STEP-01 | RecipeStepRow renders painting_phase Select | unit | `pnpm test -- tests/painting/recipeStepRow.test.ts` | ❌ Wave 0 gap |
| STEP-02 | computeOrderIndex still works after DraftStep field addition | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (existing tests verify spread behavior) |
| STEP-03 | DraftStep has tool/technique/dilution + makeDraftStep initialises them | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (extend existing) |
| STEP-03 | INSERT includes tool/technique/dilution in SQL + params | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ❌ Wave 0 gap |
| STEP-04 | DraftStep has time_estimate_minutes + makeDraftStep initialises it | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (extend existing) |
| STEP-04 | INSERT includes time_estimate_minutes in SQL + params | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ❌ Wave 0 gap |
| STEP-04 | formatMinutes pure function returns correct strings | unit | `pnpm test -- tests/painting/recipeStepRow.test.ts` | ❌ Wave 0 gap |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/painting/recipeSteps.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/painting/addRecipePaintQuery.test.ts` — covers STEP-01/03/04 INSERT expansion (mirrors `tests/foundation/recipeStepCountQuery.test.ts` pattern)
- [ ] `tests/painting/recipeStepRow.test.ts` — covers RecipeStepRow renders new inputs + formatMinutes pure function

*(Existing `tests/painting/recipeSteps.test.ts` requires extension for new DraftStep fields, but the file already exists.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `src/features/recipes/recipeSteps.ts` — current DraftStep type (4 fields)
- Direct code read: `src/features/recipes/RecipeStepRow.tsx` — current row layout and datalist
- Direct code read: `src/features/recipes/RecipeStepList.tsx` — @dnd-kit wiring, no changes needed
- Direct code read: `src/features/recipes/RecipeFormSheet.tsx` — onSubmit null-hardcoding, edit-mode hydration
- Direct code read: `src/db/queries/recipePaints.ts` — current 5-column INSERT
- Direct code read: `src/types/recipePaint.ts` — RecipeStep with all 10 fields already defined
- Direct code read: `src-tauri/migrations/012_recipe_steps.sql` — confirms DB has all columns
- Direct code read: `src/features/recipes/recipeSchema.ts` — PAINTING_PHASES const location + pattern
- Direct code read: `src/hooks/useRecipePaints.ts` — cache invalidation keys
- Direct code read: `.planning/phases/38-structured-step-input/38-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- Radix UI Select docs pattern — `__none__` sentinel for nullable selects confirmed by recipeSchema.ts existing usage in RecipeFormSheet (4 selects use this pattern)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and verified in code
- Architecture: HIGH — all integration points confirmed by direct code read; patterns verified against existing implementations
- Pitfalls: HIGH — edit-mode hydration gap and INSERT parameter mismatch are confirmed by reading the code (null-hardcoding is visible in RecipeFormSheet lines 199–204, 240–245)
- Test map: HIGH — test file structure confirmed by reading existing tests

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (stable — no external dependencies changing)
