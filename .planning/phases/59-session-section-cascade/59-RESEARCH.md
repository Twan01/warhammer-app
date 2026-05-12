# Phase 59: Session Section Cascade - Research

**Researched:** 2026-05-12
**Domain:** React Hook Form cascade selectors, conditional rendering, client-side filtering
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Section selector uses the same Select component pattern as recipe and step selectors — consistent form UX
- **D-02:** Section selector appears between the recipe selector and step selector
- **D-03:** Section selector is conditionally rendered only when the selected recipe has 2+ sections
- **D-04:** When only 1 section exists, skip the section selector entirely — step dropdown shows all steps unfiltered
- **D-05:** Two useEffect reset chains: `watchedRecipeId` change → clear both `section_name` and `recipe_step_id`; `watchedSectionId` change → clear `recipe_step_id` only
- **D-06:** The existing `watchedRecipeId` useEffect already clears `recipe_step_id` — extend it to also clear section selection
- **D-07:** Add a new useEffect for `watchedSectionId` that clears `recipe_step_id`
- **D-08:** Changing recipe clears both section and step; changing section clears step only
- **D-09:** Filter steps client-side from the existing `recipeSteps` array using `section_id` match — no new query
- **D-10:** When a section is selected, filter `recipeSteps` to only show steps where `step.section_id === selectedSectionId`
- **D-11:** When no section is selected (or recipe has only 1 section), show all steps unfiltered
- **D-12:** Use existing `useRecipeSections(recipeId)` hook to fetch sections for the selected recipe
- **D-13:** Sections are fetched reactively when `watchedRecipeId` changes — same pattern as `useRecipePaints`
- **D-14:** Add `section_name` to `logSessionSchema` as `z.string().nullable().optional()`
- **D-15:** Store a local `watchedSectionId` (numeric, for filtering) but resolve and submit `section_name` (denormalized text)
- **D-16:** At submit time, look up the selected section's name from the sections array and pass it as `section_name` to `createSession`
- **D-17:** Add `section_name` to the `buildDefaultValues` return with `null` default
- **D-18:** All three selectors remain fully optional (SESS-05)
- **D-19:** Valid combinations: recipe only, recipe+section, recipe+section+step, recipe+step (when 1 section), or none

### Claude's Discretion

- Internal state management approach for section ID tracking (form field vs local useState)
- Whether to use a `useMemo` for filtered steps or inline filter
- Exact label text for the section selector
- SelectItem display format for sections

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SESS-01 | LogSessionSheet shows a section selector between recipe and step selectors when a recipe with 2+ sections is selected | UI-SPEC confirms conditional render rule: `watchedRecipeId != null && sections.length >= 2`. Pattern exists for step selector. |
| SESS-02 | Selecting a section filters the step selector to only that section's steps | Client-side filter via `recipeSteps.filter(s => s.section_id === watchedSectionId)`. `RecipeStep.section_id` confirmed present. |
| SESS-03 | Changing recipe clears both section and step selections | Extend existing `watchedRecipeId` useEffect to also reset `watchedSectionId` local state. |
| SESS-04 | Changing section clears step selection | New `watchedSectionId` useEffect that calls `form.setValue("recipe_step_id", null)`. |
| SESS-05 | All three selectors remain optional — user can log with any combination | `section_name` is `nullable().optional()` in schema; `__none__` sentinel maps to `null`; submit handler passes `null` when not set. |
</phase_requirements>

---

## Summary

Phase 59 is a focused UI extension to `LogSessionSheet.tsx` and `logSessionSchema.ts`. The entire data layer (migration, type, query, mutation) was completed in Phase 57. This phase wires the UI: a conditional section selector appears between the existing recipe and step selectors when the selected recipe has 2+ sections.

The implementation follows a single established pattern repeated three times: a `FormField` + `Controller` + shadcn `Select` block, a `useEffect` reset chain, and a reactive hook call. No new hooks, components, or DB queries are required. The primary decision points concern state management for `watchedSectionId` (local `useState` vs form field) and whether to derive `filteredSteps` via `useMemo` or inline filter.

**Primary recommendation:** Use `useState<number | null>(null)` for `watchedSectionId` (keeps it off the form submission shape, matches D-15), and derive `filteredSteps` via `useMemo` (referential stability prevents unnecessary re-renders of the step `SelectContent`).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Section selector rendering | Frontend (LogSessionSheet) | — | Pure form UI — no server interaction needed |
| Section data fetch | Frontend (useRecipeSections hook) | DB (recipeSections query) | Reactive hook already exists; cache managed by React Query |
| Step client-side filtering | Frontend (LogSessionSheet) | — | D-09 explicitly excludes a new query; `section_id` field already on `RecipeStep` |
| Cascade reset logic | Frontend (LogSessionSheet) | — | useEffect pattern already established for step reset |
| section_name persistence | DB (painting_sessions.section_name) | Frontend (submit handler lookup) | Column + query already complete from Phase 57 |

---

## Standard Stack

### Core (already installed — no new packages)

| Library | Version (verified) | Purpose | Role in Phase |
|---------|-------------------|---------|---------------|
| React Hook Form | already in use | Form state management | `useForm`, `Controller`, `watch`, `setValue` |
| Zod | already in use | Schema validation | Add `section_name` field |
| shadcn/ui Select | already in use | Dropdown component | Section picker |
| @tanstack/react-query | already in use | Server state | `useRecipeSections` hook |

**Installation:** None required — all dependencies already present. [VERIFIED: reading package imports in LogSessionSheet.tsx and logSessionSchema.ts]

### No new libraries needed

This phase adds zero new npm packages. The section selector is assembled from components already imported in `LogSessionSheet.tsx`.

---

## Architecture Patterns

### System Architecture Diagram

```
User selects recipe
        ↓
watchedRecipeId changes
        ↓
┌───────────────────────────────────────────┐
│  useEffect (reset chain 1)                │
│  form.setValue("recipe_step_id", null)    │
│  setWatchedSectionId(null)                │
└───────────────────────────────────────────┘
        ↓
useRecipeSections(watchedRecipeId) fetches
        ↓
sections.length check
  ≥ 2 → render Section selector
  < 2 → skip (step shows all steps unfiltered)
        ↓
User selects section
        ↓
setWatchedSectionId(numericId)
        ↓
┌───────────────────────────────────────────┐
│  useEffect (reset chain 2)                │
│  form.setValue("recipe_step_id", null)    │
└───────────────────────────────────────────┘
        ↓
filteredSteps = useMemo(
  recipeSteps.filter(s => s.section_id === watchedSectionId)
  [recipeSteps, watchedSectionId]
)
        ↓
Step selector renders filteredSteps
        ↓
User submits → section_name resolved from sections[]
        ↓
createSession({ ..., section_name: resolvedName })
        ↓
DB: painting_sessions.section_name stored
```

### Recommended File Structure

No new files. Two existing files are modified:

```
src/features/dashboard/
├── logSessionSchema.ts       ← add section_name field
└── LogSessionSheet.tsx       ← add section hook, selector, effects, submit update
```

### Pattern 1: Conditional Section Selector (SESS-01)

**What:** Render the section `FormField` block only when recipe is selected AND has 2+ sections.
**When to use:** Between the recipe FormField block and the existing `{watchedRecipeId != null && ...}` step block.

```tsx
// Source: CONTEXT.md D-03, UI-SPEC interaction contract
// Mirrors the existing step selector conditional pattern
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
        <input type="hidden" value={field.value ?? ""} readOnly />
      </FormItem>
    )}
  />
)}
```

**Note on `section_name` form field:** `section_name` is stored in the form (for Zod + submission) but `watchedSectionId` is local state (for filtering). The `onValueChange` handler sets both simultaneously. The form's `section_name` field holds the human-readable name string; `watchedSectionId` holds the numeric ID for filtering. [VERIFIED: CONTEXT.md D-15, D-16]

### Pattern 2: Cascade Reset useEffect Chains (SESS-03, SESS-04)

**What:** Two `useEffect` hooks — the first extended, the second new.

```tsx
// Source: CONTEXT.md D-05, D-06, D-07
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

**Critical:** The existing reset useEffect (line 133–135 in `LogSessionSheet.tsx`) is extended, not replaced. The new second useEffect is added below it.

### Pattern 3: Section Fetch (SESS-01)

**What:** Call `useRecipeSections` reactively — same pattern as `useRecipePaints`.

```tsx
// Source: CONTEXT.md D-12, D-13 / useRecipeSections.ts (verified)
const { data: sections = [] } = useRecipeSections(
  watchedRecipeId != null ? watchedRecipeId : undefined
);
```

The hook accepts `number | undefined` and is disabled when `undefined`. Returns `RecipeSection[]` with `id`, `name`, `order_index` fields. [VERIFIED: reading useRecipeSections.ts]

### Pattern 4: Step Filtering (SESS-02)

**What:** Derive `filteredSteps` from `recipeSteps` using `watchedSectionId`.

```tsx
// Source: CONTEXT.md D-09, D-10, D-11
const filteredSteps = useMemo(() => {
  if (watchedSectionId == null) return recipeSteps;
  return recipeSteps.filter((s) => s.section_id === watchedSectionId);
}, [recipeSteps, watchedSectionId]);
```

Replace `recipeSteps` with `filteredSteps` in the step `SelectContent` map. `useMemo` provides referential stability. [VERIFIED: RecipeStep.section_id confirmed in recipePaint.ts]

### Pattern 5: Schema Extension (SESS-01, SESS-05)

```ts
// Source: CONTEXT.md D-14 / logSessionSchema.ts pattern
// In logSessionSchema.ts, add to z.object({...}):
section_name: z.string().nullable().optional(),
```

Follows the same pattern as `recipe_id` and `recipe_step_id`. [VERIFIED: reading logSessionSchema.ts]

### Pattern 6: buildDefaultValues Extension (SESS-05)

```ts
// Source: CONTEXT.md D-17
function buildDefaultValues(defaultUnitId?: number): LogSessionFormValues {
  return {
    unit_id: defaultUnitId ?? 0,
    session_date: todayISO(),
    duration_minutes: 30,
    notes: null,
    new_status: null,
    recipe_id: null,
    recipe_step_id: null,
    section_name: null,   // ← add this
  };
}
```

### Pattern 7: onSubmit section_name Lookup (SESS-01)

**What:** The form field `section_name` already holds the string by the time of submission (set in `onValueChange`). No additional lookup is needed at submit time if `onValueChange` sets the form field directly. However, if using local state only, look up at submit:

```tsx
// Source: CONTEXT.md D-16
// If section_name is managed via local state instead of the form field:
section_name: watchedSectionId != null
  ? (sections.find((s) => s.id === watchedSectionId)?.name ?? null)
  : null,
```

**Recommended approach:** Set `section_name` form field directly in `onValueChange` (Pattern 1 above). This keeps the form state as the single source of truth and avoids needing extra lookup at submit. [ASSUMED — either approach works; form field approach is simpler]

### Anti-Patterns to Avoid

- **Using `section_id` FK on `painting_sessions`:** Explicitly rejected in STATE.md accumulated context — DELETE-all + re-INSERT save pattern destroys FK links. Use denormalized `section_name` (already implemented in Phase 57).
- **Adding a new DB query for filtered steps:** D-09 locks this to client-side filtering from the already-fetched `recipeSteps` array.
- **Using `.default()` in Zod schema:** Documented project pitfall — `zod v4 + react-hook-form zodResolver` type inference breaks with `.default()`. Use `buildDefaultValues` pattern instead. [VERIFIED: logSessionSchema.ts comment]
- **Disabling the section selector while loading:** UI-SPEC states no explicit loading state for sections — if still loading, SelectContent renders empty list (same as step selector behavior).
- **Storing `watchedSectionId` in the form:** D-15 separates tracking concern (local state) from submission concern (form `section_name` field). Only `section_name` (the string) goes to the DB.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Section options rendering | Custom dropdown/list | shadcn `Select` + `SelectItem` | Already installed; consistent with recipe/step selectors |
| Form state cascading | Manual DOM event handlers | `useEffect` watching `form.watch()` values | Established pattern in LogSessionSheet; works correctly with RHF |
| Step filtering | Server-side filtered query | `useMemo` over existing `recipeSteps` | D-09 locks to client-side; `recipeSteps` already fetched |
| Section data fetching | New query function | `useRecipeSections(recipeId)` | Hook already complete with correct React Query config |

---

## Runtime State Inventory

Phase 59 is a UI-only extension modifying two existing files. No rename/refactor involved.

Step 2.5 SKIPPED — not a rename/refactor/migration phase.

---

## Common Pitfalls

### Pitfall 1: Double-firing reset useEffect
**What goes wrong:** React re-renders cause the `watchedSectionId` useEffect to fire and clear `recipe_step_id` immediately after the recipe useEffect sets it to null — causing two consecutive calls to `form.setValue("recipe_step_id", null)`.
**Why it happens:** Both effects depend on values that change together when recipe changes.
**How to avoid:** Harmless — setting `null` twice is idempotent. No user-visible effect. Accept it.
**Warning signs:** No observable symptom — purely mechanical.

### Pitfall 2: stale `sections` when recipe changes
**What goes wrong:** Section selector briefly shows old sections after recipe changes, before new sections load from cache.
**Why it happens:** `useRecipeSections` has a cache key per `recipeId`; first load is async.
**How to avoid:** The reset useEffect clears `watchedSectionId` synchronously, so even if old sections appear briefly, the selection is cleared. The `sections.length >= 2` guard ensures the selector doesn't show until data is loaded (empty array = hidden).
**Warning signs:** Section selector flashing visible/hidden — acceptable, no functional impact.

### Pitfall 3: `section_name` form field not in `buildDefaultValues`
**What goes wrong:** TypeScript error on `useForm<LogSessionFormValues>` if `section_name` is added to schema but not to `buildDefaultValues`.
**Why it happens:** RHF `defaultValues` must match the inferred form type.
**How to avoid:** Add `section_name: null` to `buildDefaultValues` (D-17) before adding the schema field.
**Warning signs:** TypeScript compile error `Type '...' is not assignable to type 'LogSessionFormValues'`.

### Pitfall 4: Forgetting to import `useRecipeSections`
**What goes wrong:** Runtime error or TypeScript import resolution failure.
**Why it happens:** New hook import required in `LogSessionSheet.tsx`.
**How to avoid:** Add `import { useRecipeSections } from "@/hooks/useRecipeSections";` alongside the existing `useRecipePaints` import.
**Warning signs:** TypeScript `Cannot find name 'useRecipeSections'`.

### Pitfall 5: `onValueChange` sets `watchedSectionId` but not form field `section_name`
**What goes wrong:** Session saves with `section_name: null` even when a section is selected, because the form field was never updated.
**Why it happens:** Two state objects to update (local state + form field) — easy to forget one.
**How to avoid:** In `onValueChange`, always update both: `setWatchedSectionId(numId)` AND `ctrl.onChange(resolvedName)`.
**Warning signs:** Section visible in UI but `painting_sessions.section_name` is NULL in DB after submit.

### Pitfall 6: `useState` for `watchedSectionId` placement
**What goes wrong:** `useState` declared after early returns (loading states) causes React Hooks rules violation.
**Why it happens:** Hooks cannot be called conditionally.
**How to avoid:** Declare `const [watchedSectionId, setWatchedSectionId] = useState<number | null>(null)` at the top of the component with all other hooks, before any conditional logic.

---

## Code Examples

### Complete state declarations block (additions only)

```tsx
// Source: CONTEXT.md D-12, D-15 / useRecipeSections.ts verified
const [watchedSectionId, setWatchedSectionId] = useState<number | null>(null);

const { data: sections = [] } = useRecipeSections(
  watchedRecipeId != null ? watchedRecipeId : undefined
);

const filteredSteps = useMemo(() => {
  if (watchedSectionId == null) return recipeSteps;
  return recipeSteps.filter((s) => s.section_id === watchedSectionId);
}, [recipeSteps, watchedSectionId]);
```

### Updated reset useEffect (chain 1 — extends existing)

```tsx
// Source: CONTEXT.md D-05, D-06 / LogSessionSheet.tsx line 133
// REPLACE the existing useEffect at line 133-135 with:
useEffect(() => {
  form.setValue("recipe_step_id", null);
  form.setValue("section_name", null);
  setWatchedSectionId(null);
}, [watchedRecipeId, form]);
```

### New reset useEffect (chain 2)

```tsx
// Source: CONTEXT.md D-07
useEffect(() => {
  form.setValue("recipe_step_id", null);
}, [watchedSectionId, form]);
```

### Updated onSubmit section_name pass-through

```tsx
// Source: CONTEXT.md D-16 / paintingSessions.ts createSession verified
await createSession.mutateAsync({
  unit_id: values.unit_id,
  session_date: values.session_date,
  duration_minutes: values.duration_minutes,
  notes: values.notes && values.notes.trim() !== "" ? values.notes.trim() : null,
  recipe_id: values.recipe_id ?? null,
  recipe_step_id: values.recipe_step_id ?? null,
  section_name: values.section_name ?? null,   // ← add this
});
```

### Form open reset (extend existing)

```tsx
// Source: CONTEXT.md D-17 / LogSessionSheet.tsx line 118
// Inside the open useEffect, form.reset calls buildDefaultValues which already
// returns section_name: null — the local state must also be reset:
useEffect(() => {
  if (open) {
    form.reset(buildDefaultValues(defaultUnitId));
    setWatchedSectionId(null);   // ← add this
  }
}, [open, form, defaultUnitId]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `recipe_paints` table name | `recipe_steps` table (renamed) | Phase 37 (v0.2.5) | Use `RecipeStep` type, not `RecipePaint` |
| No section grouping on steps | `section_id` FK on `recipe_steps` | Phase 48 (v0.2.7) | Enables client-side step filtering by section |
| No section_name on sessions | `section_name TEXT DEFAULT NULL` on `painting_sessions` | Phase 57 (v0.2.9) | Column and insert already complete |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Setting `section_name` form field directly in `onValueChange` (rather than only in submit handler) is the preferred approach | Architecture Patterns / Pattern 7 | Low — both approaches produce correct results; difference is code style only |
| A2 | `sections` data loads fast enough from React Query cache that no loading spinner is needed for the section selector | Common Pitfalls / Pitfall 2 | Low — worst case is brief empty list; no data integrity risk |

---

## Open Questions

1. **Label text for section selector**
   - What we know: UI-SPEC specifies "Section" (shorter label matching "Recipe" brevity)
   - What's unclear: Nothing — UI-SPEC resolves this
   - Recommendation: Use "Section"

2. **`watchedSectionId` state management approach**
   - What we know: D-15 requires separating tracking (numeric ID) from submission (string name)
   - What's unclear: Whether to use `useState` vs. deriving from a form field holding the ID
   - Recommendation: `useState<number | null>(null)` — simpler, not submitted, cleaner TypeScript

---

## Environment Availability

Step 2.6 SKIPPED — phase is a code-only modification to two existing files. No external tools, services, runtimes, or CLIs beyond the project's existing `pnpm dev` / `pnpm test` stack.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test -- tests/painting/logSessionSheet.test.tsx tests/dashboard/logSessionSchema.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SESS-01 | Section selector appears between recipe and step when recipe has 2+ sections | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ (extend existing) |
| SESS-01 | Section selector hidden when recipe has 0 or 1 section | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ (extend existing) |
| SESS-02 | Step selector filters to selected section's steps only | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ (extend existing) |
| SESS-03 | Changing recipe clears section and step | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ (extend existing) |
| SESS-04 | Changing section clears step only | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ (extend existing) |
| SESS-05 | Schema accepts section_name as nullable optional | unit | `pnpm test -- tests/dashboard/logSessionSchema.test.ts` | ✅ (extend existing) |
| SESS-05 | Form submits with no selectors selected (fully optional) | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ (extend existing) |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/painting/logSessionSheet.test.tsx tests/dashboard/logSessionSchema.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. Both test files exist and must be extended with new test cases, not created from scratch.

**Existing mocks to extend in `logSessionSheet.test.tsx`:**
- Add mock for `useRecipeSections` (currently not mocked — hook is new to this component)
- Existing mocks for `useRecipePaints`, `useRecipes`, `useFactions`, `useUnits`, `useJournalSessions` remain unchanged

---

## Security Domain

This phase adds a UI form field that stores a denormalized text string. No authentication, session management, access control, or cryptography is involved.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Zod schema: `z.string().nullable().optional()` — no min/max needed (name sourced from DB sections list, not free text) |
| V6 Cryptography | no | — |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale section_name if section is deleted | Tampering (data integrity) | Denormalized string — acceptable; section_name is display-only, not FK-linked. Documented in REQUIREMENTS.md out-of-scope table. |

---

## Sources

### Primary (HIGH confidence)

- `src/features/dashboard/LogSessionSheet.tsx` — full component read; existing patterns for Select, FormField, Controller, useEffect, `__none__` sentinel, `buildDefaultValues`, `onSubmit`
- `src/features/dashboard/logSessionSchema.ts` — confirmed field pattern for `recipe_id`, `recipe_step_id`, anti-default() note
- `src/hooks/useRecipeSections.ts` — confirmed hook signature: `useRecipeSections(recipeId: number | undefined)` returns `RecipeSection[]`; enabled guard pattern
- `src/hooks/useRecipePaints.ts` — confirmed `useRecipePaints(recipeId: number | undefined)` pattern; `RECIPE_PAINTS_KEY` export
- `src/types/recipeSection.ts` — confirmed `RecipeSection.id`, `.name`, `.order_index` fields; `section_type`, `technique`, `execution_mode` present
- `src/types/recipePaint.ts` — confirmed `RecipeStep.section_id: number | null` field
- `src/types/paintingSession.ts` — confirmed `CreateSessionInput.section_name?: string | null` and `PaintingSession.section_name: string | null`
- `src/db/queries/paintingSessions.ts` — confirmed `createSession` INSERT includes `section_name` at position `$7`
- `.planning/phases/59-session-section-cascade/59-CONTEXT.md` — all 19 locked decisions
- `.planning/phases/59-session-section-cascade/59-UI-SPEC.md` — approved interaction contract, copywriting, component inventory
- `tests/painting/logSessionSheet.test.tsx` — confirmed existing test structure, mock pattern for hooks
- `tests/dashboard/logSessionSchema.test.ts` — confirmed existing schema test pattern
- `.planning/REQUIREMENTS.md` — SESS-01 through SESS-05 definitions
- `.planning/STATE.md` — accumulated context; DELETE-all + re-INSERT decision; section_id FK rejection

### Secondary (MEDIUM confidence)

None required — all claims verified directly from codebase.

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all imports verified from existing source files
- Architecture: HIGH — all patterns verified against existing LogSessionSheet code and confirmed hooks/types
- Pitfalls: HIGH — derived from verified code reading + documented project pitfalls in schema file comments

**Research date:** 2026-05-12
**Valid until:** 2026-06-12 (stable — no fast-moving dependencies)
