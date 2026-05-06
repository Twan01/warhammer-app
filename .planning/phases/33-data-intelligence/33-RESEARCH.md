# Phase 33: Data Intelligence - Research

**Researched:** 2026-05-06
**Domain:** React Query cache invalidation, pure function aggregation, Zod schema extension, bidirectional navigation
**Confidence:** HIGH

## Summary

Phase 33 is a pure integration phase — no schema changes, no new database tables, no new hooks beyond wiring existing ones together. Every requirement is satisfied by extending or composing existing code that has already been validated. The domain breaks into four non-overlapping sub-problems: (1) adding an optional field to an existing form + atomic mutation sequencing, (2) extending a pure aggregation function with new derived metrics, (3) making an existing text label clickable, (4) passing an existing batch query result as a prop to an existing card.

The highest-risk element is the atomic session+status update in DATA-01/DATA-02: `createSession.mutateAsync` and `updateUnit.mutateAsync` are called sequentially in a single `onSubmit` handler. SQLite does not support cross-mutation transactions from the JS layer, so the partial-failure path (session logged, status update fails) must be handled gracefully with a warning toast rather than a silent failure or rollback. The CONTEXT.md decision is explicit on this: show a warning, do not roll back the session.

The spending metrics (DATA-03/DATA-04) only require extending `computeSpendingStats` — a pure function with a strong existing test suite — and the `getSpendingStats` SQL query to include `status_painting` in the unit SELECT. The hook and page consume the extended interface transparently. The recipe navigation (DATA-05) requires a single line change in `RecipeDetailSheet.tsx`. The focus card recipe display (DATA-06) needs a prop addition and a `useRecipeNamesByFocusUnit` call in DashboardPage.

**Primary recommendation:** Implement in four independent tasks per requirement group. All tasks are low-risk incremental changes to well-understood code paths.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Log Session Status Update (DATA-01, DATA-02)**
- LogSessionSheet gains an optional "Update Painting Status" Select dropdown between the Unit picker and Date field
- Default value: "No change" (null/empty) — submitting without selecting a status logs the session only, no unit update
- Dropdown options: "No change" + all 11 values from PAINTING_STATUS_ORDER
- Status update is atomic with session creation — the onSubmit handler calls both createSession and updateUnit in sequence (updateUnit only if a status was selected)
- If updateUnit fails after createSession succeeds, show a warning toast ("Session logged but status update failed") — don't roll back the session
- After submit with status change, invalidate all affected caches:
  - `["painting-sessions", unitId]` (existing)
  - `["dashboard-stats"]` (existing)
  - `["units"]` (from status change)
  - `["hobby-analytics"]` (existing)
  - `["recent-activity"]` (existing)
  - `["goal-progress"]` (existing)
  - `["army-list-readiness"]` (from status change)
  - `["spending-stats"]` (from status change)
- The Zod schema (logSessionSchema) gains an optional `new_status` field: `z.enum(PAINTING_STATUS_ORDER).nullable().optional()`

**Spending Intelligence Metrics (DATA-03, DATA-04)**
- Two new metric cards appear between the hero "Total Hobby Spend" card and the "Monthly Trend" section
- Metric 1: "Cost Per Completed Model" — `totalPence / count of units where status_painting === "Completed"` displayed via formatCurrency
- Metric 2: "Painted vs Unpainted Value" — two figures: sum of purchase_price_pence for Completed units (painted value) vs sum for all other units (unpainted/in-progress value)
- When no units are at Completed status: cost-per-model shows "—" (not zero, not infinity), painted value shows £0.00, unpainted value shows full total
- Metric cards use `bg-card border border-border/60 shadow-sm` with label above and value below (same as hero card but without ring-2 accent)
- Metrics computed in computeSpendingStats.ts — extend SpendingStats interface with `costPerCompletedModelPence: number | null`, `paintedValuePence: number`, `unpaintedValuePence: number`
- The computation needs unit status_painting data — extend the unit Pick type in computeSpendingStats to include `status_painting`

**Recipe-Unit Bidirectional Navigation (DATA-05)**
- RecipeDetailSheet already shows "Linked Unit" as text — upgrade to a `variant="link"` Button that closes the sheet and navigates to `/collection`
- UnitDetailSheet already shows "Linked Recipes" with navigation to /recipes — this is sufficient for the unit→recipe direction
- RecipeDetailSheet also lists which units use the recipe — since the FK is `recipe.unit_id`, one recipe links to at most one unit, so the existing single "Linked Unit" field is correct (not a list)

**Focus Card Recipe Display (DATA-06)**
- CurrentFocusCard shows the linked recipe name when the focus unit has an associated recipe
- Display position: below the faction name in the metadata stack, as small muted text with a Palette icon from lucide-react
- Recipe data comes from the `getRecipeNamesByUnitIds` query (already exists in recipes.ts) — call it for the focus unit ID
- When no recipe is linked: omit the recipe line entirely
- When multiple recipes are linked to the focus unit: show the first recipe name + "(+N more)" suffix

### Claude's Discretion
- Exact visual layout of the two spending metric cards (side-by-side in a grid-cols-2 or stacked)
- Whether the status dropdown in LogSessionSheet uses the same StatusBadge colors/styling as the collection page
- Loading skeleton adjustments for the new spending metrics section
- Whether RecipeDetailSheet's unit link navigates to /collection or opens a unit detail (simpler to just navigate)
- Error handling details for the atomic session+status update flow
- How to pass recipe data to CurrentFocusCard (prop from DashboardPage or internal hook call)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | LogSessionSheet includes an optional painting status field that updates the unit's status_painting on submit | logSessionSchema extension + onSubmit sequential mutation pattern |
| DATA-02 | Log Session status update correctly invalidates dashboard-stats, units, and painting-sessions query caches | useUpdateUnit already invalidates all required keys; DATA-02 verifies cache coverage from both createSession and updateUnit |
| DATA-03 | Spending page displays cost per completed model metric (total spend / fully painted model count) | computeSpendingStats pure function extension; SQL query already returns all unit rows including status_painting |
| DATA-04 | Spending page displays painted vs unpainted collection value split | Same computeSpendingStats extension as DATA-03; status_painting drives partition |
| DATA-05 | User can see which units are associated with a given recipe and vice versa | Single-line change: RecipeDetailSheet line 87 unit name → variant="link" Button with navigate + onClose |
| DATA-06 | CurrentFocusCard shows linked recipe name when a recipe is associated with the focus unit | getRecipeNamesByUnitIds already exists; wire to DashboardPage and pass as prop to CurrentFocusCard |
</phase_requirements>

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Hook Form + Zod | existing | Form schema extension for new_status field | Already used by LogSessionSheet; zodResolver pattern established |
| TanStack React Query | existing | Cache invalidation after mutations | All query keys already defined and tested |
| TanStack Router (useNavigate) | existing | Navigation from RecipeDetailSheet to /collection | Used by UnitDetailSheet for recipe→collection link |
| Lucide React (Palette) | existing | Icon for recipe name in CurrentFocusCard | Palette icon available, consistent with icon vocabulary |

### No New Dependencies
This phase requires zero new packages. Every library needed is already installed and in use.

**Installation:**
```bash
# No new packages required
```

---

## Architecture Patterns

### Pattern 1: Sequential Mutation with Graceful Partial-Failure

DATA-01 requires calling two mutations in sequence. The project does not use saga/transaction middleware — the pattern is explicit sequential `mutateAsync` calls in the form's `onSubmit`, with a try/catch per step.

```typescript
// Source: LogSessionSheet.tsx onSubmit — extend this pattern
async function onSubmit(values: LogSessionFormValues) {
  try {
    await createSession.mutateAsync({ ... });
  } catch {
    toast.error("Failed to log session — try again.");
    return; // abort — don't attempt status update if session failed
  }

  // Session succeeded. Attempt optional status update.
  if (values.new_status) {
    try {
      await updateUnit.mutateAsync({ id: values.unit_id, status_painting: values.new_status });
    } catch {
      toast.warning("Session logged but status update failed.");
      // Do NOT close sheet here — session IS logged, but warn user
      onClose();
      return;
    }
  }

  toast.success("Session logged.");
  onClose();
}
```

**Key insight:** `useUpdateUnit` already invalidates ALL required keys (units, dashboard-stats, spending-stats, hobby-analytics, army-list-readiness, army-lists). Calling it from LogSessionSheet automatically satisfies the full DATA-02 invalidation list. No custom invalidation code needed.

### Pattern 2: Zod Schema Extension Without .default()

The project has a documented pitfall (Pitfall 8): `zod .default()` breaks with `zodResolver`. Use `nullable().optional()` and supply defaults via `buildDefaultValues()`.

```typescript
// Source: src/features/dashboard/logSessionSchema.ts — extend this
export const logSessionSchema = z.object({
  unit_id: z.number().int().positive("Select a unit"),
  session_date: z.string().min(1).regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.number().int().positive().max(1440),
  notes: z.string().max(2000).nullable(),
  // DATA-01: optional status update — NO .default() (Pitfall 8)
  new_status: z.enum(PAINTING_STATUS_ORDER).nullable().optional(),
});
```

`buildDefaultValues()` gains `new_status: null` to match the "No change" default.

### Pattern 3: Pure Function Extension (computeSpendingStats)

The spending aggregation is a pure function with a strong test suite. The extension follows the established Pick type pattern.

```typescript
// Source: src/features/spending/computeSpendingStats.ts
// Extend the Pick type to include status_painting:
export function computeSpendingStats(
  units: Pick<Unit, "faction_id" | "purchase_price_pence" | "status_painting">[],
  factions: Faction[],
  paintsPence: number
): SpendingStats { ... }

// New SpendingStats fields:
export interface SpendingStats {
  totalPence: number;
  factionBreakdown: FactionSpend[];
  paintsPence: number;
  costPerCompletedModelPence: number | null;  // null when 0 Completed units
  paintedValuePence: number;
  unpaintedValuePence: number;
}
```

The SQL query in `getSpendingStats()` already runs `SELECT * FROM units` so `status_painting` is already in the returned rows. The type annotation on the Pick just needs to be extended — no SQL change required.

### Pattern 4: variant="link" Button for Cross-Page Navigation

Established by UnitDetailSheet lines 205-218. The pattern: `Button variant="link"` + `onClick` that calls `onClose()` then `navigate({ to: "..." })`.

```typescript
// Source: src/features/units/UnitDetailSheet.tsx lines 205-218
// Apply same pattern in RecipeDetailSheet.tsx line 87:
<Button
  variant="link"
  size="sm"
  className="h-auto p-0"
  onClick={() => {
    onClose();
    navigate({ to: "/collection" });
  }}
>
  {unit.name}
</Button>
```

RecipeDetailSheet already imports `useUnits()` and derives `unit` via `useMemo` (lines 47-53). Only the render at line 87 needs to change from `<span>` to `<Button>`. Add `useNavigate` import from TanStack Router.

### Pattern 5: Batch Recipe Lookup for CurrentFocusCard

`getRecipeNamesByUnitIds` already exists in `src/db/queries/recipes.ts`. The wiring follows the DashboardPage prop-passing pattern.

```typescript
// In DashboardPage.tsx — add alongside existing focusUnit derivation:
const focusUnitRecipes = useRecipeNamesByFocusUnit(focusUnit?.id);

// Pass to CurrentFocusCard as new prop:
<CurrentFocusCard
  unit={focusUnit}
  faction={focusFaction}
  recipeName={focusUnitRecipes[0]?.name ?? null}
  extraRecipeCount={Math.max(0, focusUnitRecipes.length - 1)}
/>
```

The CONTEXT.md decision leaves wiring approach to discretion (internal hook or prop from page). The prop-from-page approach is simpler and consistent with how `faction` is passed. A lightweight inline hook in DashboardPage using `useQuery` + `getRecipeNamesByUnitIds([focusUnit.id])` is sufficient — no new hook file required unless reuse elsewhere is anticipated.

### Recommended Project Structure (no changes needed)
All new code lands in existing files:
```
src/features/dashboard/
  logSessionSchema.ts          # +new_status field
  LogSessionSheet.tsx          # +status dropdown + sequential mutation
  CurrentFocusCard.tsx         # +recipeName prop + Palette display
  DashboardPage.tsx            # +recipe query + prop pass

src/features/spending/
  computeSpendingStats.ts      # +3 new fields in SpendingStats
  SpendingPage.tsx             # +2 new metric cards between hero and Monthly Trend

src/features/recipes/
  RecipeDetailSheet.tsx        # line 87: span → Button with navigate
```

### Anti-Patterns to Avoid
- **Calling `updateUnit.mutate` without `await` inside `onSubmit`:** The toast/close timing will be wrong and cache invalidation races. Use `mutateAsync` throughout.
- **Adding `.default(null)` to `new_status` in Zod schema:** Breaks zodResolver type inference (Pitfall 8). Use `buildDefaultValues()` instead.
- **Accessing `data.costPerCompletedModelPence` without null check in SpendingPage:** It is `number | null` — render "—" when null, not `0`.
- **Nesting `LogSessionSheet` inside another component instead of as a sibling:** Pitfall 1 (sibling portal pattern). Sheet stays at DashboardPage top level.
- **Adding a new `useQuery` hook call inside CurrentFocusCard:** Breaks the component's "receive data as props" contract. Fetch in DashboardPage and pass down.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cache invalidation after status update | Custom invalidation list in LogSessionSheet | Call existing `useUpdateUnit` — it already has the complete invalidation set | useUpdateUnit.onSuccess already covers units, dashboard-stats, spending-stats, hobby-analytics, army-list-readiness, army-lists |
| Spending metric math | SQL aggregation query | Extend `computeSpendingStats` pure function | Pure function is testable in isolation, already has test suite, no DB trip needed |
| Recipe lookup for focus card | New query module | `getRecipeNamesByUnitIds` in recipes.ts | Batch query already handles empty array guard, positional params, and the unit_id filter |
| Status dropdown options | Hardcoded string array | `PAINTING_STATUS_ORDER` from `src/types/unit.ts` | Single source of truth for all 11 statuses |
| Currency display of new metrics | Raw pence / 100 in JSX | `formatCurrency()` from `@/lib/formatCurrency` | "Integer pence discipline: formatCurrency is the only /100 site" |

**Key insight:** Every sub-problem in this phase has an existing asset that solves the hard part. The work is wiring, not building.

---

## Common Pitfalls

### Pitfall 1: Missing `dashboard-stats` Invalidation from LogSessionSheet
**What goes wrong:** After a status-change log session, the dashboard stat cards (fullyPainted count, battleReadyPoints) don't update.
**Why it happens:** `useCreatePaintingSession` does NOT invalidate `["dashboard-stats"]`. It only invalidates painting-sessions, hobby-analytics, recent-activity, goal-progress. The `dashboard-stats` invalidation comes from `useUpdateUnit` — but only if `updateUnit.mutateAsync` is actually called.
**How to avoid:** Ensure `useUpdateUnit` is called when `values.new_status` is non-null. Do not rely on `useCreatePaintingSession` for the full DATA-02 invalidation.
**Warning signs:** Dashboard stat cards show stale counts after a Log Session with status change.

### Pitfall 2: Zod `.default()` on `new_status`
**What goes wrong:** TypeScript infers `LogSessionFormValues.new_status` as `PaintingStatus` (non-nullable) due to zodResolver/zod v4 interaction.
**Why it happens:** Documented as Pitfall 8 in STATE.md — `.default()` in Zod schemas breaks the zodResolver type inference for react-hook-form.
**How to avoid:** Use `.nullable().optional()` and set `new_status: null` in `buildDefaultValues()`.
**Warning signs:** TypeScript error on `values.new_status` comparison to null, or form reset not clearing the field.

### Pitfall 3: `costPerCompletedModelPence` Division by Zero
**What goes wrong:** When no units are at "Completed" status, `totalPence / 0` produces `Infinity` which then gets passed to `formatCurrency`.
**Why it happens:** JavaScript division by zero returns `Infinity`, not an error.
**How to avoid:** In `computeSpendingStats`, return `costPerCompletedModelPence: completedCount === 0 ? null : Math.round(unitTotalPence / completedCount)`. In SpendingPage, render "—" when the value is null.
**Warning signs:** "£∞" appearing in the Spending page.

### Pitfall 4: `SELECT *` vs Pick type mismatch for spending query
**What goes wrong:** `getSpendingStats` runs `SELECT * FROM units` so status_painting is already in the returned data — but if someone changes the SELECT to a column list that omits status_painting, the type will lie.
**Why it happens:** The `Pick<Unit, ...>` type on the function parameter only validates at compile time; the SQL is untyped.
**How to avoid:** The current `SELECT * FROM units` is already sufficient. Document in the query function comment that status_painting must be included.
**Warning signs:** `undefined` for `status_painting` in computeSpendingStats, causing all units to be counted as unpainted.

### Pitfall 5: RecipeDetailSheet `useNavigate` import
**What goes wrong:** Build error — `useNavigate` is not imported.
**Why it happens:** RecipeDetailSheet doesn't currently need navigation; adding the unit link requires importing from `@tanstack/react-router`.
**How to avoid:** Add `import { useNavigate } from "@tanstack/react-router";` and call `const navigate = useNavigate();` at the top of the component.
**Warning signs:** TypeScript error "Cannot find name 'navigate'".

### Pitfall 6: CurrentFocusCard Phase 31 Interface Change
**What goes wrong:** DATA-06 extends `CurrentFocusCardProps` with a `recipeName` prop, but Phase 31 will also change the component's props (adding photo, action callbacks, etc.).
**Why it happens:** Phase 33 depends on Phase 31 being complete. If Phase 33 is planned before Phase 31 is fully designed, the prop interface in PLAN.md may be stale.
**How to avoid:** Implementer must read the final Phase 31 CurrentFocusCard prop interface before adding `recipeName`. The CONTEXT.md specifies "below the faction name in the metadata stack" — this will be the Phase 31 metadata layout.
**Warning signs:** TypeScript errors about unexpected/missing props on CurrentFocusCard after Phase 31 ships.

---

## Code Examples

### DATA-01: logSessionSchema Extension
```typescript
// src/features/dashboard/logSessionSchema.ts
import { PAINTING_STATUS_ORDER } from "@/types/unit";

export const logSessionSchema = z.object({
  unit_id: z.number({ message: "Select a unit" }).int().positive("Select a unit"),
  session_date: z.string().min(1, "Date is required").regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  duration_minutes: z.number({ message: "Duration is required" }).int().positive("Duration must be greater than 0").max(1440, "Duration cannot exceed 24 hours"),
  notes: z.string().max(2000).nullable(),
  new_status: z.enum(PAINTING_STATUS_ORDER).nullable().optional(), // NO .default()
});
```

### DATA-01: buildDefaultValues Extension
```typescript
function buildDefaultValues(defaultUnitId?: number): LogSessionFormValues {
  return {
    unit_id: defaultUnitId ?? 0,
    session_date: todayISO(),
    duration_minutes: 30,
    notes: null,
    new_status: null,   // "No change" default
  };
}
```

### DATA-03/04: SpendingStats Interface Extension
```typescript
// src/features/spending/computeSpendingStats.ts
export interface SpendingStats {
  totalPence: number;
  factionBreakdown: FactionSpend[];
  paintsPence: number;
  costPerCompletedModelPence: number | null;  // null = no Completed units
  paintedValuePence: number;
  unpaintedValuePence: number;
}

export function computeSpendingStats(
  units: Pick<Unit, "faction_id" | "purchase_price_pence" | "status_painting">[],
  factions: Faction[],
  paintsPence: number
): SpendingStats {
  // ... existing faction breakdown logic ...

  const completedUnits = units.filter(u => u.status_painting === "Completed");
  const completedCount = completedUnits.length;
  const paintedValuePence = completedUnits.reduce((sum, u) => sum + (u.purchase_price_pence ?? 0), 0);
  const unpaintedValuePence = unitTotalPence - paintedValuePence;

  return {
    totalPence: unitTotalPence + paintsPence,
    factionBreakdown,
    paintsPence,
    costPerCompletedModelPence: completedCount === 0 ? null : Math.round(unitTotalPence / completedCount),
    paintedValuePence,
    unpaintedValuePence,
  };
}
```

### DATA-05: RecipeDetailSheet Unit Link
```typescript
// src/features/recipes/RecipeDetailSheet.tsx — add import
import { useNavigate } from "@tanstack/react-router";

// Inside component:
const navigate = useNavigate();

// Line 86-88 replacement:
<Field label="Linked Unit">
  {unit ? (
    <Button
      variant="link"
      size="sm"
      className="h-auto p-0"
      onClick={() => { onClose(); navigate({ to: "/collection" }); }}
    >
      {unit.name}
    </Button>
  ) : (
    <span className="text-sm text-muted-foreground">—</span>
  )}
</Field>
```

### DATA-06: CurrentFocusCard Recipe Display
```typescript
// CurrentFocusCard — extend props
export interface CurrentFocusCardProps {
  unit: Unit | null;
  faction: Faction | undefined;
  recipeName: string | null;       // first linked recipe name, or null
  extraRecipeCount?: number;       // count beyond first (for "+N more")
}

// In metadata stack, below faction name:
{recipeName && (
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    <Palette size={12} aria-hidden />
    {recipeName}{extraRecipeCount > 0 ? ` (+${extraRecipeCount} more)` : ""}
  </span>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createSession.mutate()` (fire-and-forget) | `createSession.mutateAsync()` (awaitable) | Established in existing code | DATA-01 needs `await` to sequence the status update after session creation |
| `zod .default()` for form field defaults | `buildDefaultValues()` pattern | Phase 13 (Pitfall 8) | Must be followed for `new_status` field |
| Separate SQL aggregation for spending metrics | Pure function in computeSpendingStats | Phase 14 | DATA-03/04 extends the pure function, not the SQL |

**No deprecated approaches to avoid** in this phase.

---

## Open Questions

1. **CurrentFocusCard Phase 31 final prop interface**
   - What we know: Phase 31 adds photo, model_count, points, and action button props to CurrentFocusCard
   - What's unclear: The exact prop names Phase 31 will use (e.g., `onOpenUnit`, `onLogSession`)
   - Recommendation: DATA-06 PLAN must note that the implementer reads the Phase 31 shipped CurrentFocusCard before adding `recipeName` prop — interface may differ from the current single-file version

2. **Recipe query fetch timing in DashboardPage**
   - What we know: `getRecipeNamesByUnitIds([focusUnit.id])` is a fast indexed query; `focusUnit` may be null
   - What's unclear: Whether to use a standalone `useQuery` in DashboardPage or extract a small hook
   - Recommendation: Inline `useQuery` in DashboardPage with `enabled: focusUnit !== null` is sufficient; skip creating a new hook file unless Phase 34 reuses it

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest config inline) |
| Quick run command | `pnpm test -- tests/spending/computeSpendingStats.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | logSessionSchema accepts `new_status` as nullable enum, rejects invalid values | unit | `pnpm test -- tests/dashboard/logSessionSchema.test.ts` | ❌ Wave 0 |
| DATA-01 | buildDefaultValues returns `new_status: null` | unit | included in logSessionSchema.test.ts | ❌ Wave 0 |
| DATA-02 | After status-change submit, all 8 query keys are invalidated | unit (mock QC) | `pnpm test -- tests/dashboard/useLogSessionWithStatus.test.ts` | ❌ Wave 0 |
| DATA-03 | computeSpendingStats returns correct costPerCompletedModelPence | unit | `pnpm test -- tests/spending/computeSpendingStats.test.ts` | ✅ (extend) |
| DATA-03 | costPerCompletedModelPence is null when no Completed units | unit | included in computeSpendingStats.test.ts | ✅ (extend) |
| DATA-04 | paintedValuePence + unpaintedValuePence = unitTotalPence | unit | included in computeSpendingStats.test.ts | ✅ (extend) |
| DATA-05 | RecipeDetailSheet unit link renders a Button (not span) when unit is linked | unit (RTL) | `pnpm test -- tests/painting/recipeDetailSheet.test.ts` | ❌ Wave 0 |
| DATA-06 | CurrentFocusCard renders recipe name with Palette icon when recipeName prop is provided | unit (RTL) | `pnpm test -- tests/dashboard/currentFocusCard.test.ts` | ❌ Wave 0 |
| DATA-06 | CurrentFocusCard renders nothing for recipe when recipeName is null | unit (RTL) | included in currentFocusCard.test.ts | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/spending/computeSpendingStats.test.ts` (or relevant test file)
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dashboard/logSessionSchema.test.ts` — covers DATA-01 schema extension
- [ ] `tests/dashboard/useLogSessionWithStatus.test.ts` — covers DATA-02 cache invalidation (mock QueryClient + vi.mock useCreatePaintingSession + useUpdateUnit)
- [ ] `tests/painting/recipeDetailSheet.test.ts` — covers DATA-05 unit link Button render
- [ ] `tests/dashboard/currentFocusCard.test.ts` — covers DATA-06 recipe name display + null omission

Existing test to extend (no new file needed):
- [ ] `tests/spending/computeSpendingStats.test.ts` — add cases for DATA-03/04 new fields

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `src/features/dashboard/LogSessionSheet.tsx` — current form structure, mutation wiring
- Direct code inspection of `src/features/dashboard/logSessionSchema.ts` — Zod schema pattern (Pitfall 8)
- Direct code inspection of `src/features/spending/computeSpendingStats.ts` — pure function interface
- Direct code inspection of `src/db/queries/spending.ts` — `SELECT * FROM units` confirms status_painting is already fetched
- Direct code inspection of `src/hooks/useUnits.ts` — `useUpdateUnit` invalidation list (lines 42-58)
- Direct code inspection of `src/hooks/useJournalSessions.ts` — `useCreatePaintingSession` invalidation list (lines 35-46)
- Direct code inspection of `src/features/recipes/RecipeDetailSheet.tsx` — Linked Unit text field at lines 86-88
- Direct code inspection of `src/features/dashboard/CurrentFocusCard.tsx` — current props + metadata layout
- Direct code inspection of `src/features/dashboard/DashboardPage.tsx` — CurrentFocusCard prop-passing pattern
- Direct code inspection of `src/db/queries/recipes.ts` — `getRecipeNamesByUnitIds` exists and is tested
- Direct code inspection of `src/types/unit.ts` — PAINTING_STATUS_ORDER (11 values)
- Direct code inspection of `tests/spending/computeSpendingStats.test.ts` — existing test patterns to extend
- Direct code inspection of `.planning/STATE.md` — established patterns, Pitfall 8, cache-key contracts

### Secondary (MEDIUM confidence)
- `.planning/phases/33-data-intelligence/33-CONTEXT.md` — all implementation decisions (locked)
- `.planning/phases/31-focus-projects-panels/31-CONTEXT.md` — Phase 31 CurrentFocusCard v2 design (DATA-06 depends on this)

### Tertiary (LOW confidence)
None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing dependencies verified in code
- Architecture: HIGH — all patterns sourced from existing codebase files
- Pitfalls: HIGH — sourced from STATE.md decisions + direct code analysis
- Test gaps: HIGH — test file listing confirmed via glob; existing test patterns confirmed by reading

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (stable domain — pure integration work, no external API dependencies)
