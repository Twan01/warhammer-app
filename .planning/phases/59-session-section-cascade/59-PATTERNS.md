# Phase 59: Session Section Cascade - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 2 (modified — no new files)
**Analogs found:** 2 / 2 (exact matches; files modify themselves)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/dashboard/LogSessionSheet.tsx` | component (form sheet) | request-response | Self — existing recipe/step selector block (lines 264–348) | exact |
| `src/features/dashboard/logSessionSchema.ts` | utility (Zod schema) | transform | Self — existing `recipe_id` / `recipe_step_id` fields (lines 33–35) | exact |
| `tests/painting/logSessionSheet.test.tsx` | test | request-response | Self — INTEG-01 describe block (lines 171–208) | exact |
| `tests/dashboard/logSessionSchema.test.ts` | test | transform | Self — INTEG-01 describe block (lines 64–130) | exact |

---

## Pattern Assignments

### `src/features/dashboard/logSessionSchema.ts` (utility/schema, transform)

**Analog:** Self — the existing `recipe_id` and `recipe_step_id` fields are the direct template.

**Existing field pattern to copy** (lines 33–35):
```ts
// Phase 41 — INTEG-01 (recipe+step selector in LogSessionSheet)
recipe_id: z.number().int().positive().nullable().optional(),
recipe_step_id: z.number().int().positive().nullable().optional(),
```

**New field to add** (insert after line 35):
```ts
// Phase 59 — SESS-01/05 (section cascade)
section_name: z.string().nullable().optional(),
```

**Anti-pattern (documented at lines 6–11):** Do NOT use `.default()`. The schema file explicitly warns against it:
```ts
// NOTE: `.default()` is deliberately NOT used (zod v4 + react-hook-form
// zodResolver type inference breaks with .default() — same issue as
// armyListSchema and battleLogSchema, documented in STATE.md Phase 18 decisions).
```

---

### `src/features/dashboard/LogSessionSheet.tsx` (component/form, request-response)

**Analog:** Self — the existing recipe selector (lines 264–304) and step selector (lines 306–348) are the direct templates for the section selector.

#### Imports pattern (lines 22–61)

The current import block — add `useState` to line 22 and `useRecipeSections` alongside `useRecipePaints`:

```tsx
import { useEffect, useMemo, useState } from "react";   // add useState
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { useRecipeSections } from "@/hooks/useRecipeSections";   // ADD
```

#### buildDefaultValues — add section_name (lines 69–79)

Current function to extend:
```tsx
function buildDefaultValues(defaultUnitId?: number): LogSessionFormValues {
  return {
    unit_id: defaultUnitId ?? 0,
    session_date: todayISO(),
    duration_minutes: 30,
    notes: null,
    new_status: null,
    recipe_id: null,
    recipe_step_id: null,
    // ADD:
    section_name: null,
  };
}
```

#### Hook declarations to add (after line 130, before line 132)

Current reactive hook pattern to mirror:
```tsx
// Existing pattern (lines 128–130):
const { data: recipeSteps = [] } = useRecipePaints(
  watchedRecipeId != null ? watchedRecipeId : undefined
);

// ADD after line 130 — same enabled-guard pattern:
const [watchedSectionId, setWatchedSectionId] = useState<number | null>(null);

const { data: sections = [] } = useRecipeSections(
  watchedRecipeId != null ? watchedRecipeId : undefined
);

const filteredSteps = useMemo(() => {
  if (watchedSectionId == null) return recipeSteps;
  return recipeSteps.filter((s) => s.section_id === watchedSectionId);
}, [recipeSteps, watchedSectionId]);
```

#### Reset useEffect chains (lines 132–135)

**Replace** the existing single-field reset (lines 132–135) with the extended chain 1, then add chain 2 below it:

```tsx
// REPLACE lines 132–135 with:

// Reset chain 1: recipe changes → clear section AND step
useEffect(() => {
  form.setValue("recipe_step_id", null);
  form.setValue("section_name", null);
  setWatchedSectionId(null);
}, [watchedRecipeId, form]);

// Reset chain 2: section changes → clear step only
useEffect(() => {
  form.setValue("recipe_step_id", null);
}, [watchedSectionId, form]);
```

#### Form open reset — extend the existing open useEffect (lines 117–119)

```tsx
// REPLACE lines 117–119 with:
useEffect(() => {
  if (open) {
    form.reset(buildDefaultValues(defaultUnitId));
    setWatchedSectionId(null);   // reset local section tracking
  }
}, [open, form, defaultUnitId]);
```

#### Section selector FormField block (insert between lines 304 and 306)

**Template:** Copy from the recipe_step_id block (lines 306–348), adapt for section. The `__none__` sentinel, FormField+Controller+Select nesting, and `<input type="hidden">` suppression are mandatory.

```tsx
{watchedRecipeId != null && sections.length >= 2 && (
  <FormField
    name="section_name"
    control={form.control}
    render={({ field }) => (
      <FormItem>
        <FormLabel>Section</FormLabel>
        <Controller
          name="section_name"
          control={form.control}
          render={({ field: ctrl }) => (
            <Select
              value={watchedSectionId != null ? String(watchedSectionId) : "__none__"}
              onValueChange={(v) => {
                const numId = v === "__none__" ? null : Number(v);
                setWatchedSectionId(numId);
                ctrl.onChange(
                  v === "__none__"
                    ? null
                    : sections.find((s) => s.id === numId)?.name ?? null
                );
              }}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No section" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="__none__">No section</SelectItem>
                {sections
                  .slice()
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        />
        <FormMessage />
        {/* unused render arg silenced */}
        <input type="hidden" value={field.value ?? ""} readOnly />
      </FormItem>
    )}
  />
)}
```

#### Step selector — replace recipeSteps with filteredSteps (line 330)

The step selector's `SelectContent` map currently iterates `recipeSteps` (line 330–336). Replace with `filteredSteps`:

```tsx
// BEFORE (line 330):
{recipeSteps
  .slice()
  .sort((a, b) => a.order_index - b.order_index)
  .map((s) => (

// AFTER:
{filteredSteps
  .slice()
  .sort((a, b) => a.order_index - b.order_index)
  .map((s) => (
```

#### onSubmit — add section_name to mutateAsync call (lines 143–151)

```tsx
// REPLACE lines 143–151 with:
await createSession.mutateAsync({
  unit_id: values.unit_id,
  session_date: values.session_date,
  duration_minutes: values.duration_minutes,
  notes: values.notes && values.notes.trim() !== "" ? values.notes.trim() : null,
  recipe_id: values.recipe_id ?? null,
  recipe_step_id: values.recipe_step_id ?? null,
  section_name: values.section_name ?? null,   // ADD
});
```

---

### `tests/painting/logSessionSheet.test.tsx` (test, request-response)

**Analog:** Self — the INTEG-01 describe block (lines 171–208) is the direct template.

**Mock pattern to add** (insert alongside existing hook mocks at lines 39–42):
```tsx
// ADD: Mock useRecipeSections (new import in LogSessionSheet)
const useRecipeSectionsMock = vi.fn();
vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: (recipeId: number | undefined) => useRecipeSectionsMock(recipeId),
}));
```

**beforeEach default** (extend the existing block at lines 105–110):
```tsx
beforeEach(() => {
  vi.clearAllMocks();
  useUnitsMock.mockReturnValue({ data: units, isLoading: false });
  useRecipesMock.mockReturnValue({ data: recipes, isLoading: false });
  useRecipePaintsMock.mockReturnValue({ data: [], isLoading: false });
  useRecipeSectionsMock.mockReturnValue({ data: [] });   // ADD — default: no sections
});
```

**Test describe block pattern to copy** (lines 171–208):
```tsx
// Existing INTEG-01 block structure — copy for new SESS-01 through SESS-05 describe block:
describe("LogSessionSheet — SESS-01 (section cascade)", () => {
  it("does not render Section selector when recipe has 0 sections", () => { ... });
  it("does not render Section selector when recipe has 1 section", () => { ... });
  it("renders Section selector between Recipe and Step when recipe has 2+ sections", () => { ... });
  // SESS-02
  it("filters step selector to selected section's steps", () => { ... });
  // SESS-03
  it("clearing recipe clears section and step selections", () => { ... });
  // SESS-04
  it("changing section clears step selection only", () => { ... });
  // SESS-05
  it("submits with section_name: null when no section selected", () => { ... });
});
```

---

### `tests/dashboard/logSessionSchema.test.ts` (test, transform)

**Analog:** Self — the INTEG-01 describe block (lines 64–130) is the direct template.

**BASE_VALID shape** (lines 11–16) — already used as the baseline. New tests extend it with `section_name`.

**Test describe block pattern to copy** (lines 64–130):
```ts
// Existing INTEG-01 block structure — copy for SESS-05:
describe("logSessionSchema — SESS-05 (section_name field)", () => {
  it("parses successfully when section_name is omitted (field is optional)", () => {
    const result = logSessionSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
  });

  it("parses successfully when section_name is null (field is nullable)", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, section_name: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.section_name).toBeNull();
  });

  it("parses successfully when section_name is a non-empty string", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, section_name: "Base Coat" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.section_name).toBe("Base Coat");
  });

  it("buildDefaultValues shape with section_name: null parses successfully", () => {
    const result = logSessionSchema.safeParse({
      unit_id: 1,
      session_date: "2026-01-01",
      duration_minutes: 30,
      notes: null,
      new_status: null,
      recipe_id: null,
      recipe_step_id: null,
      section_name: null,
    });
    expect(result.success).toBe(true);
  });
});
```

---

## Shared Patterns

### `__none__` Sentinel for Nullable Selects
**Source:** `src/features/dashboard/LogSessionSheet.tsx` lines 238–240, 276–279, 318–321
**Apply to:** Section selector `onValueChange`
```tsx
// The sentinel pattern — string "__none__" maps to null in form state:
value={ctrl.value ?? "__none__"}
onValueChange={(v) => ctrl.onChange(v === "__none__" ? null : v)}
```

### FormField + Controller + Select Nesting + Hidden Input Suppression
**Source:** `src/features/dashboard/LogSessionSheet.tsx` lines 227–262 (new_status), 264–304 (recipe_id), 306–348 (recipe_step_id)
**Apply to:** Section selector block
```tsx
// Required nesting: FormField outer > Controller inner > Select
// Always end with: <input type="hidden" value={field.value ?? ""} readOnly />
// This suppresses the "unused render arg" TypeScript strict warning.
```

### Reactive Hook with Enabled Guard
**Source:** `src/hooks/useRecipePaints.ts` lines 32–38 / `src/hooks/useRecipeSections.ts` lines 23–29
**Apply to:** `useRecipeSections` call in `LogSessionSheet`
```tsx
// Both hooks accept `number | undefined`; `enabled: recipeId !== undefined` disables the query
// Pass `watchedRecipeId != null ? watchedRecipeId : undefined` at the call site
const { data: sections = [] } = useRecipeSections(
  watchedRecipeId != null ? watchedRecipeId : undefined
);
```

### sort().slice() for SelectContent
**Source:** `src/features/dashboard/LogSessionSheet.tsx` lines 331–336
**Apply to:** Section `SelectContent` mapping
```tsx
// Always .slice() before .sort() to avoid mutating cached array:
{sections
  .slice()
  .sort((a, b) => a.order_index - b.order_index)
  .map((s) => (
    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
  ))}
```

---

## No Analog Found

None — all changes are extensions to existing files with direct internal analogs.

---

## Metadata

**Analog search scope:** `src/features/dashboard/`, `src/hooks/`, `tests/painting/`, `tests/dashboard/`
**Files read:** 6 (LogSessionSheet.tsx, logSessionSchema.ts, useRecipeSections.ts, useRecipePaints.ts, logSessionSheet.test.tsx, logSessionSchema.test.ts)
**Pattern extraction date:** 2026-05-12
