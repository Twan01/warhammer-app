# Phase 14: Spending Tracker - Research

**Researched:** 2026-05-03
**Domain:** SQLite schema migration, integer-pence currency, TanStack Query aggregation, TanStack Router route registration, shadcn Table/Card/Skeleton, react-hook-form + zod field extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Schema migration (migration 005)
- Add `purchase_price_pence INTEGER NULL` to `units` table — replaces existing `purchase_price REAL` column
- Migrate data: multiply existing REAL values by 100 (if any) to convert to pence
- The old `purchase_price REAL` column is deprecated after migration 005
- Add `purchase_price_pence INTEGER NULL` to `paints` table — no date column for paints (SPEND-02 requires price only)
- Both tables use the same column name `purchase_price_pence` for consistency

#### Unit spend UX placement
- Purchase price and purchase date fields added to `UnitSheet` form (the Add/Edit form)
- Fields shown in both create mode and edit mode — user can log spend at time of purchase
- Price/date shown as read-only display in the Details tab of `UnitDetailSheet` (alongside faction, status, etc.)
- No new tab needed in UnitDetailSheet — read-only display only, editing still via UnitSheet

#### Paint spend UX placement
- Add `purchase_price_pence` field to `PaintSheet` react-hook-form form — same pattern as UnitSheet
- Price only — no date field for paints
- Field shown in both create and edit modes

#### Spending page layout
- Hero "Total Hobby Spend" card at top (sum of all unit purchase_price_pence + all owned-paint purchase_price_pence)
- Breakdown table below with rows for each faction (all 4 always shown, even at £0.00) + one "Paints" row at the bottom
- Per-faction subtotal = sum of `purchase_price_pence` for all units belonging to that faction
- "Paints" row subtotal = sum of `purchase_price_pence` for paints where `owned = 1` only
- New "Spending" sidebar nav entry — first-class route at `/spending`

#### Faction breakdown for paint spend
- Paint spend is NOT attributed to any faction — it appears as a separate "Paints" row at the bottom of the breakdown table
- Only owned paints (owned = 1) count toward the Paints row total — wishlist items excluded
- All 4 factions always shown in breakdown, even with £0.00 spend — makes unpopulated factions visible

#### Currency formatting
- All spend values stored as integer pence in SQLite, formatted as currency in the UI layer only
- `formatCurrency(pence: number, locale?: string, currency?: string)` utility function — defaults to `'en-GB'` / `'GBP'`
- Function accepts locale/currency args so it can be wired to a future settings page without changes to call sites
- Default display: `£12.50` (via `Intl.NumberFormat`)

### Claude's Discretion
- Where exactly the price/date fields appear in the UnitSheet form layout (position, grouping)
- Loading skeleton design for the Spending page
- Icon choice for the Spending sidebar nav item
- Error state handling for the Spending page query
- Whether to show a count of units per faction alongside the spend total

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SPEND-01 | User can log a purchase price and purchase date per unit in the unit detail sheet | UnitSheet already has `purchase_price` (REAL) and `purchase_date` fields; migration 005 renames column to `purchase_price_pence` (INTEGER); schema + form + query changes documented below |
| SPEND-02 | User can log a purchase price per paint pot in the paint detail sheet | PaintSheet has no price field yet; add `purchase_price_pence` to schema, form, and queries exactly as `purchase_price_pence` in UnitSheet but without date |
| SPEND-03 | User can view a Spending page showing total hobby spend (units + paints combined) | New `/spending` route + SpendingPage + `useSpendingStats` hook + `getSpendingStats` query — follows `useDashboardStats` / `computeStats` pattern |
| SPEND-04 | Spending page breaks down total spend by faction | SQL GROUP BY faction on units; paints as separate un-factioned row; all 4 factions always rendered even at £0 |
| SPEND-05 | Spending values are stored as integer pence in SQLite and displayed as formatted currency throughout the UI | Migration 005 converts REAL → INTEGER pence; `formatCurrency` utility in `src/lib/formatCurrency.ts` used at all display sites |
</phase_requirements>

---

## Summary

Phase 14 is a well-scoped data-entry and aggregation phase. The entire technical surface is within patterns already established in this codebase: additive SQLite migrations, react-hook-form + zod form extension, TanStack Query hooks, and TanStack Router route registration. No new dependencies are required — all shadcn components needed (Card, Table, Skeleton, Separator) are already installed.

The most critical discipline is the **integer-pence contract**: the old `purchase_price REAL` column on `units` must be superseded by `purchase_price_pence INTEGER` in migration 005, and the `formatCurrency` utility must be the only place division by 100 ever occurs. Every other part of the codebase stores and passes raw integer pence.

The Spending page follows the `useDashboardStats` → `computeStats` layered pattern: a raw query function (`getSpendingStats`) fetches units + factions + paints, a pure compute function aggregates the results into typed output, and a hook wires them together with TanStack Query. This separation makes the aggregation logic unit-testable without IPC mocks.

**Primary recommendation:** Implement in this order — migration 005, types, query functions, hook, route registration, SpendingPage, UnitSheet/PaintSheet field additions, UnitDetailSheet read-only display, formatCurrency utility, then tests.

---

## Standard Stack

### Core (all already installed — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/plugin-sql` | 2.4.0 | SQLite access via IPC | Project-wide DB layer; all queries use this |
| `@tanstack/react-query` | 5.100.6 | Async state + cache invalidation | Project-wide data-fetching pattern |
| `@tanstack/react-router` | 1.168.26 | Route registration | Project router; new route added to routeTree |
| `react-hook-form` | 7.74.0 | Form state + validation | Used in UnitSheet and PaintSheet already |
| `zod` | 4.4.1 | Schema validation | Used in unitSchema.ts and paintSchema.ts already |
| `lucide-react` | 0.460.0 | Icon set | `Wallet` icon for sidebar nav item |

### shadcn Components (all already installed)

| Component | File | Used In |
|-----------|------|---------|
| `Card` | `src/components/ui/card.tsx` | SpendingPage hero card |
| `Table` | `src/components/ui/table.tsx` | SpendingPage breakdown table |
| `Skeleton` | `src/components/ui/skeleton.tsx` | SpendingPage loading state |
| `Separator` | `src/components/ui/separator.tsx` | Paints row divider in table |
| `Input` | `src/components/ui/input.tsx` | Price input in UnitSheet + PaintSheet |
| `Form` / `FormField` | `src/components/ui/form.tsx` | Form integration in both sheets |

**Installation:** No new packages needed for this phase.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src-tauri/migrations/
└── 005_spend_pence.sql              # ALTER TABLE units + paints; UPDATE data migration

src/
├── lib/
│   └── formatCurrency.ts            # NEW: Intl.NumberFormat utility
├── types/
│   ├── unit.ts                      # MODIFY: purchase_price → purchase_price_pence
│   └── paint.ts                     # MODIFY: add purchase_price_pence field
├── db/queries/
│   ├── units.ts                     # MODIFY: column rename in INSERT/UPDATE
│   ├── paints.ts                    # MODIFY: add purchase_price_pence to INSERT/UPDATE
│   └── spending.ts                  # NEW: getSpendingStats query
├── hooks/
│   └── useSpendingStats.ts          # NEW: TanStack Query wrapper
├── features/
│   ├── units/
│   │   ├── unitSchema.ts            # MODIFY: rename field, change type to integer
│   │   ├── UnitSheet.tsx            # MODIFY: rename field, update Input step/placeholder
│   │   └── UnitDetailSheet.tsx     # MODIFY: add formatCurrency display row
│   ├── paints/
│   │   ├── paintSchema.ts           # MODIFY: add purchase_price_pence field
│   │   └── PaintSheet.tsx           # MODIFY: add price input field
│   └── spending/
│       └── SpendingPage.tsx         # NEW: hero card + breakdown table
├── app/
│   ├── spending/
│   │   └── page.tsx                 # NEW: re-exports SpendingPage
│   └── router.tsx                   # MODIFY: register spendingRoute
└── components/common/
    └── AppSidebar.tsx               # MODIFY: add Wallet nav item

tests/
└── spending/
    ├── formatCurrency.test.ts       # NEW: unit tests for formatCurrency
    ├── getSpendingStats.test.ts     # NEW: SQL query content assertions (migration pattern)
    └── SpendingPage.test.tsx        # NEW: component rendering with mock data
```

### Pattern 1: Additive SQLite Migration (migration 005)

**What:** Add `purchase_price_pence INTEGER NULL` to both `units` and `paints` tables using `ALTER TABLE ... ADD COLUMN`. Separately, use `UPDATE` to populate from the existing `purchase_price REAL` values. The old `purchase_price` column remains in the schema but is no longer read or written by the application layer — SQLite does not support `DROP COLUMN` in all versions, and the column is nullable so leaving it is harmless.

**When to use:** Whenever a new nullable column is added to an existing table. Never modify 001_core_schema.sql.

**Example** (follows exact pattern from `004_unit_playbook_stats.sql`):
```sql
-- 005_spend_pence.sql
-- Adds purchase_price_pence INTEGER NULL to units and paints.
-- Migrates existing REAL purchase_price values to integer pence (multiply by 100).
-- The old purchase_price REAL column is no longer written by the application.

ALTER TABLE units ADD COLUMN purchase_price_pence INTEGER;
ALTER TABLE paints ADD COLUMN purchase_price_pence INTEGER;

-- Migrate existing REAL values to pence (rounds to nearest pence)
UPDATE units
   SET purchase_price_pence = CAST(ROUND(purchase_price * 100) AS INTEGER)
 WHERE purchase_price IS NOT NULL;
```

**lib.rs registration** (must increment version to 5):
```rust
Migration {
    version: 5,
    description: "spend_pence",
    sql: include_str!("../migrations/005_spend_pence.sql"),
    kind: MigrationKind::Up,
},
```

### Pattern 2: Type / Schema / Query Update Chain

**What:** When the DB schema changes, ALL four layers must be updated together: (1) TypeScript interface, (2) zod schema, (3) form `buildDefaultValues`, (4) SQL query INSERT/UPDATE columns. Missing any one layer causes a type error or silent data loss.

**Chain for `purchase_price_pence` on units:**

1. **`src/types/unit.ts`** — remove `purchase_price: number | null`, add `purchase_price_pence: number | null`
2. **`src/features/units/unitSchema.ts`** — remove `purchase_price` field, add `purchase_price_pence: z.number().int().min(0).optional().nullable()`
3. **`src/features/units/UnitSheet.tsx`** — `buildDefaultValues`: map `unit.purchase_price_pence ?? null`; onSubmit payload: pass `purchase_price_pence: values.purchase_price_pence ?? null`; field: `type="number" step={1}` (integer pence only)
4. **`src/db/queries/units.ts`** — replace `purchase_price` with `purchase_price_pence` in the INSERT column list and UPDATE SET clause and the parameter array (parameter position is the same — no recount needed if just a rename)

**Chain for `purchase_price_pence` on paints** (new field, no rename):

1. **`src/types/paint.ts`** — add `purchase_price_pence: number | null` to `Paint` interface and `CreatePaintInput`
2. **`src/features/paints/paintSchema.ts`** — add `purchase_price_pence: z.number().int().min(0).optional().nullable()`
3. **`src/features/paints/PaintSheet.tsx`** — `buildDefaultValues`: `purchase_price_pence: paint.purchase_price_pence ?? null`; new FormField appended before SheetFooter
4. **`src/db/queries/paints.ts`** — add `purchase_price_pence` to INSERT columns and VALUES (new `$11` param) and UPDATE SET clause (new `$12` param)

### Pattern 3: Spending Stats Hook (mirrors useDashboardStats)

**What:** A `getSpendingStats` query function fetches raw data (units + factions + owned paints) via `Promise.all`. A pure `computeSpendingStats` function aggregates it. A `useSpendingStats` hook wires them with `useQuery`.

**Source pattern:** `src/db/queries/dashboard.ts` + `src/features/dashboard/computeStats.ts` + `src/hooks/useDashboardStats.ts`.

```typescript
// src/db/queries/spending.ts
export interface RawSpendingData {
  units: Unit[];
  factions: Faction[];
  paintsPence: number; // SUM from SQL — not full paint rows
}

export async function getSpendingStats(): Promise<RawSpendingData> {
  const db = await getDb();
  const [units, factions, paintRows] = await Promise.all([
    db.select<Unit[]>("SELECT id, faction_id, purchase_price_pence FROM units"),
    db.select<Faction[]>("SELECT id, name FROM factions ORDER BY id ASC"),
    db.select<{ total: number }[]>(
      "SELECT COALESCE(SUM(purchase_price_pence), 0) AS total FROM paints WHERE owned = 1 AND purchase_price_pence IS NOT NULL"
    ),
  ]);
  return {
    units,
    factions,
    paintsPence: paintRows[0]?.total ?? 0,
  };
}
```

```typescript
// src/features/spending/computeSpendingStats.ts (pure function, testable)
export interface FactionSpend {
  faction: Faction;
  pence: number;
}

export interface SpendingStats {
  totalPence: number;
  factionBreakdown: FactionSpend[];
  paintsPence: number;
}

export function computeSpendingStats(
  units: Pick<Unit, "faction_id" | "purchase_price_pence">[],
  factions: Faction[],
  paintsPence: number
): SpendingStats {
  const factionBreakdown: FactionSpend[] = factions.map((f) => ({
    faction: f,
    pence: units
      .filter((u) => u.faction_id === f.id)
      .reduce((sum, u) => sum + (u.purchase_price_pence ?? 0), 0),
  }));

  const unitTotalPence = units.reduce((sum, u) => sum + (u.purchase_price_pence ?? 0), 0);

  return {
    totalPence: unitTotalPence + paintsPence,
    factionBreakdown,
    paintsPence,
  };
}
```

```typescript
// src/hooks/useSpendingStats.ts
export const SPENDING_STATS_KEY = ["spending-stats"] as const;

export function useSpendingStats() {
  return useQuery<SpendingStats, Error>({
    queryKey: SPENDING_STATS_KEY,
    queryFn: async () => {
      const { units, factions, paintsPence } = await getSpendingStats();
      return computeSpendingStats(units, factions, paintsPence);
    },
  });
}
```

**Cache invalidation:** `useCreateUnit`, `useUpdateUnit`, `useDeleteUnit` must add `qc.invalidateQueries({ queryKey: ["spending-stats"] })` in their `onSuccess` callbacks. Same for `useCreatePaint` / `useUpdatePaint` / `useDeletePaint`.

### Pattern 4: TanStack Router Route Registration

**What:** Add `spendingRoute` to `src/app/router.tsx` following the same pattern as every other route. Import `SpendingPage` from `./spending/page`.

```typescript
// In router.tsx
import { SpendingPage } from "./spending/page";

const spendingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/spending",
  component: SpendingPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  factionsRoute,
  collectionRoute,
  paintingProjectsRoute,
  recipesRoute,
  paintsRoute,
  armyListsRoute,
  settingsRoute,
  spendingRoute, // add here
]);
```

### Pattern 5: Sidebar Nav Item Addition

**What:** Add `{ to: "/spending", label: "Spending", icon: Wallet }` to the `MAIN_NAV` array in `AppSidebar.tsx`. Position after the Paints entry.

```typescript
// AppSidebar.tsx — add to import list
import { ..., Wallet } from "lucide-react";

// MAIN_NAV array — insert after Paints entry
{ to: "/spending", label: "Spending", icon: Wallet },
```

`Wallet` is already available in lucide-react 0.460.0. No install needed.

### Pattern 6: formatCurrency Utility

```typescript
// src/lib/formatCurrency.ts
export function formatCurrency(
  pence: number | null | undefined,
  locale: string = "en-GB",
  currency: string = "GBP"
): string {
  if (pence == null) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(pence / 100);
}
```

This is the **only** location where division by 100 happens. All call sites receive raw integer pence.

### Anti-Patterns to Avoid

- **COALESCE trap in updateUnit/updatePaint:** The existing `COALESCE($N, column)` pattern in `updateUnit` means passing `null` for `purchase_price_pence` will NOT clear the value — it will retain the old value. This is correct for partial updates, but when the user explicitly clears the price field the form should pass `null` and the query needs to handle it. The current pattern already handles this correctly because the form submits `null` (not undefined) when the field is empty, and the COALESCE pattern in the existing queries is only for partial update callers — the full-form submit always provides all fields so COALESCE never masks a clear.

  Actually: re-check. Looking at `updateUnit` — it uses `COALESCE($18, purchase_price)`. If the user clears the purchase price field, the form submits `purchase_price_pence: null`. The COALESCE will retain the old value. **This is a bug that must be addressed** by adding explicit NULL-capable SET for the price column. Solution: keep COALESCE for all other fields, but use unconditional assignment for nullable optional fields like price. The simplest fix is to keep the full-replacement pattern only for these price fields.

  Preferred fix: pass `purchase_price_pence` as an unconditional parameter (not COALESCE'd). Since these are full-form submits (not partial updates), this is safe.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency display | Custom `toPounds` string manipulation | `Intl.NumberFormat` | Handles locale-specific formatting, decimal separators, GBP symbol; edge cases around 0 pence |
| Fraction/decimal pence | `parseFloat` + `toFixed(2)` | Integer pence stored; `Intl.NumberFormat` divides | Floating-point display errors (£12.499999...) |
| Faction spend aggregation | JS `Array.reduce` on re-fetched unit array | Single SQL query with data passed to pure JS function | Avoids N+1 fetch; pure function is testable |
| Loading state | Custom CSS spinner | `<Skeleton>` (already installed shadcn component) | Matches existing dashboard loading pattern |

**Key insight:** The `Intl.NumberFormat` API eliminates all floating-point display edge cases. Storing as integer pence and formatting at display time is the canonical approach for money in web apps.

---

## Common Pitfalls

### Pitfall 1: COALESCE Masks Explicit NULL Clears on Price Fields

**What goes wrong:** User opens UnitSheet for an existing unit, clears the Purchase Price field (sets it to blank/null), saves. The `COALESCE($N, purchase_price_pence)` in `updateUnit` retains the old value because `null` is passed as `$N`.

**Why it happens:** The existing `updateUnit` uses COALESCE for all fields so partial callers (like `toggleActiveProject`) don't need to supply every field. But the form always submits all fields, including deliberate nulls.

**How to avoid:** For `purchase_price_pence` specifically, use an unconditional assignment in the UPDATE (not COALESCE). The form is always a full-replace submit, so this is safe. Alternatively: check if `purchase_price_pence` is in `input` and use a conditional approach. Simplest: just use direct assignment for this column since no partial updater needs it.

**Warning signs:** User reports "can't clear the purchase price once set."

### Pitfall 2: Forgetting Cache Invalidation for spending-stats

**What goes wrong:** User saves a unit with a price, navigates to Spending page — the total is stale because `useCreateUnit` / `useUpdateUnit` don't invalidate `["spending-stats"]`.

**Why it happens:** New query key `["spending-stats"]` isn't wired to existing mutation hooks. The pattern from `["dashboard-stats"]` must be replicated.

**How to avoid:** In `useCreateUnit`, `useUpdateUnit`, `useDeleteUnit` — add `qc.invalidateQueries({ queryKey: ["spending-stats"] })`. Same for `useCreatePaint`, `useUpdatePaint`, `useDeletePaint`.

**Warning signs:** Spending page shows correct values only after page reload.

### Pitfall 3: Input type="number" Returns NaN on Empty String

**What goes wrong:** `e.target.valueAsNumber` returns `NaN` when the input is empty, and zod `.min(0)` fails to catch it cleanly — the form error shows "Expected number, received nan".

**Why it happens:** `valueAsNumber` for an empty `<input type="number">` is `NaN`, not `null`.

**How to avoid:** Use the existing pattern from UnitSheet for optional numeric fields:
```typescript
onChange={(e) =>
  field.onChange(e.target.value === "" ? null : e.target.valueAsNumber)
}
```
The zod schema uses `.optional().nullable()` which accepts null.

### Pitfall 4: Migration 005 Must Be Registered in lib.rs at version: 5

**What goes wrong:** Migration file exists but `lib.rs` still only registers versions 1–4. App boots, no error, but `purchase_price_pence` column doesn't exist — all INSERT statements fail silently or throw at runtime.

**Why it happens:** The `get_migrations()` function in `src-tauri/src/lib.rs` must be updated manually — it's not auto-discovered.

**How to avoid:** Add version 5 entry to `get_migrations()` vec in the same commit as the migration file. Test file (migration005.test.ts) verifies both.

### Pitfall 5: COALESCE SUM Returns NULL for Empty Tables

**What goes wrong:** `SUM(purchase_price_pence)` returns SQL NULL (not 0) when no rows match. If the spending query passes this to JS, `totalPence` becomes `null` and `formatCurrency` returns `"—"` instead of `"£0.00"`.

**Why it happens:** SQL `SUM()` of zero rows returns NULL, not 0.

**How to avoid:** Always wrap with `COALESCE(SUM(purchase_price_pence), 0)` in the SQL query. Already documented in the Pattern 3 example above.

### Pitfall 6: Zod v4 `.default()` Must Not Be Used

**What goes wrong:** Adding `.default(null)` to the new zod fields causes a TypeScript resolver type mismatch with react-hook-form, producing a confusing compile error about input vs output types.

**Why it happens:** Documented in both `unitSchema.ts` and `paintSchema.ts` comment headers — zod v4 `.default()` makes the input type `optional`, which conflicts with react-hook-form's resolver.

**How to avoid:** Use `.optional().nullable()` only, and set defaults via `buildDefaultValues` in the form component. This is the existing pattern.

---

## Code Examples

### formatCurrency — verified pattern

```typescript
// src/lib/formatCurrency.ts
// Source: MDN Intl.NumberFormat, project decision in 14-CONTEXT.md
export function formatCurrency(
  pence: number | null | undefined,
  locale: string = "en-GB",
  currency: string = "GBP"
): string {
  if (pence == null) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    pence / 100
  );
}
// formatCurrency(1250) → "£12.50"
// formatCurrency(0)    → "£0.00"
// formatCurrency(null) → "—"
```

### UnitSheet purchase_price_pence field (integer pence, step=1)

```tsx
<FormField
  name="purchase_price_pence"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Purchase Price</FormLabel>
      <FormControl>
        <Input
          type="number"
          min={0}
          step={1}
          placeholder="e.g. 1250 for £12.50"
          {...field}
          value={field.value ?? ""}
          onChange={(e) =>
            field.onChange(e.target.value === "" ? null : e.target.valueAsNumber)
          }
        />
      </FormControl>
      <p className="text-xs text-muted-foreground">
        Enter amount in pence (100 = £1.00)
      </p>
      <FormMessage />
    </FormItem>
  )}
/>
```

### SpendingPage skeleton + hero card structure (from UI-SPEC)

```tsx
// Loading state
if (isLoading) {
  return (
    <div className="max-w-3xl mx-auto p-8 flex flex-col gap-12" aria-label="Loading spending data">
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}

// Hero card
<Card className="ring-2 ring-faction-accent rounded-lg px-6 py-6">
  <span className="text-sm text-muted-foreground">Total Hobby Spend</span>
  <span className="text-3xl font-semibold">{formatCurrency(data.totalPence)}</span>
</Card>
```

### UnitDetailSheet read-only price display

```tsx
<Field label="Purchase Price">
  <span className="text-sm">
    {formatCurrency(unit.purchase_price_pence)}
  </span>
</Field>
```

### SQL aggregation for spending query

```sql
-- Faction spend: group units by faction
SELECT faction_id, COALESCE(SUM(purchase_price_pence), 0) AS faction_pence
FROM units
GROUP BY faction_id;

-- Paint spend: owned only
SELECT COALESCE(SUM(purchase_price_pence), 0) AS total
FROM paints
WHERE owned = 1 AND purchase_price_pence IS NOT NULL;
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `purchase_price REAL` in units | `purchase_price_pence INTEGER` after migration 005 | Eliminates floating-point storage; industry standard for money |
| No spend tracking on paints | `purchase_price_pence INTEGER NULL` in paints | New column, no data migration needed |
| Floating-point price display | `Intl.NumberFormat` formatting of integer pence | No `toFixed()` or manual string ops |

**Deprecated after migration 005:**
- `purchase_price REAL` column: still present in `units` table (SQLite can't drop columns without full table rebuild), but application code must never read or write it after migration 005 applies. The `Unit` TypeScript type removes it.

---

## Open Questions

1. **COALESCE vs unconditional assignment for purchase_price_pence in updateUnit**
   - What we know: current `updateUnit` uses COALESCE for all fields to support partial callers (like `toggleActiveProject`)
   - What's unclear: is there a partial update caller that sets `purchase_price_pence`? (No — the only callers are the form submit and the active-project toggle; the toggle doesn't touch price)
   - Recommendation: Use unconditional `purchase_price_pence = $N` for just this column in the UPDATE, keeping COALESCE for everything else

2. **Whether to SELECT full Unit rows or projected columns in getSpendingStats**
   - What we know: `getDashboardStats` does `SELECT *` for units — fine for dashboard which uses many columns
   - What's unclear: spending only needs `faction_id` and `purchase_price_pence` — is a projected SELECT worth it?
   - Recommendation: Use `SELECT *` for simplicity and type reuse (existing `Unit` type). The unit count in this app is small (personal collection). A projected query would require a new type.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm test -- --reporter=verbose tests/spending/` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPEND-01 | Unit form accepts purchase_price_pence integer field | unit | `npm test -- tests/spending/unitSchema.test.ts` | Wave 0 |
| SPEND-02 | Paint form accepts purchase_price_pence integer field | unit | `npm test -- tests/spending/paintSchema.test.ts` | Wave 0 |
| SPEND-03 | SpendingPage renders hero total correctly | component | `npm test -- tests/spending/SpendingPage.test.tsx` | Wave 0 |
| SPEND-04 | computeSpendingStats breaks down by faction; Paints row separate | unit | `npm test -- tests/spending/computeSpendingStats.test.ts` | Wave 0 |
| SPEND-05 | formatCurrency handles pence, null, zero | unit | `npm test -- tests/spending/formatCurrency.test.ts` | Wave 0 |
| SPEND-05 | Migration 005 adds correct columns; lib.rs registers version 5 | content | `npm test -- tests/spending/migration005.test.ts` | Wave 0 |
| SPEND-03/04 | SPENDING_STATS_KEY contract (matches cache invalidation key) | unit | `npm test -- tests/spending/useSpendingStats.test.ts` | Wave 0 |
| (sidebar) | AppSidebar includes Spending nav entry | component | extend `tests/theming/AppSidebar.test.tsx` | existing |

### Sampling Rate

- **Per task commit:** `npm test -- tests/spending/`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/spending/formatCurrency.test.ts` — covers SPEND-05 (utility unit test)
- [ ] `tests/spending/computeSpendingStats.test.ts` — covers SPEND-04 (pure function, no mocks)
- [ ] `tests/spending/migration005.test.ts` — covers SPEND-05 storage contract (pattern from `tests/foundation/migration004.test.ts`)
- [ ] `tests/spending/useSpendingStats.test.ts` — covers SPENDING_STATS_KEY contract (pattern from `tests/dashboard/useDashboardStats.test.ts`)
- [ ] `tests/spending/SpendingPage.test.tsx` — covers SPEND-03/04 (mock `useSpendingStats`, assert hero value and faction rows render)
- [ ] `tests/spending/unitSchema.test.ts` — covers SPEND-01 schema validation (purchase_price_pence integer, no negative)
- [ ] `tests/spending/paintSchema.test.ts` — covers SPEND-02 schema validation

Note: `tests/theming/AppSidebar.test.tsx` should be extended (not replaced) to assert "Spending" label renders — this test already exists.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection:
  - `src-tauri/migrations/001_core_schema.sql` — existing `units` and `paints` table shapes
  - `src-tauri/migrations/004_unit_playbook_stats.sql` — canonical migration 005 pattern
  - `src-tauri/src/lib.rs` — migration registration pattern; confirmed `version: 4` is current max
  - `src/features/units/UnitSheet.tsx` — exact existing form field patterns
  - `src/features/paints/PaintSheet.tsx` — exact existing paint form pattern
  - `src/features/units/unitSchema.ts` + `paintSchema.ts` — zod schema patterns; .default() prohibition documented
  - `src/types/unit.ts` + `src/types/paint.ts` — current type shapes
  - `src/db/queries/units.ts` + `paints.ts` — INSERT/UPDATE column ordering, COALESCE pattern
  - `src/db/queries/dashboard.ts` + `src/features/dashboard/computeStats.ts` + `src/hooks/useDashboardStats.ts` — aggregation hook pattern to replicate
  - `src/app/router.tsx` — route registration pattern
  - `src/components/common/AppSidebar.tsx` + `NavItem.tsx` — nav item addition pattern
  - `src/lib/utils.ts` — confirms `src/lib/` folder exists for `formatCurrency.ts`
  - `vitest.config.ts` + `package.json` — test infrastructure
- `.planning/phases/14-spending-tracker/14-CONTEXT.md` — locked implementation decisions
- `.planning/phases/14-spending-tracker/14-UI-SPEC.md` — visual/interaction contract
- `.planning/config.json` — `nyquist_validation: true` confirmed

### Secondary (MEDIUM confidence)

- MDN Intl.NumberFormat — `{ style: "currency", currency: "GBP" }` formatting verified against standard spec; produces `£12.50` for en-GB locale

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are installed; versions confirmed in package.json
- Architecture: HIGH — all patterns verified against existing codebase files
- Pitfalls: HIGH — Pitfalls 1–6 verified from actual code inspection (COALESCE, valueAsNumber, zod .default(), migration registration)
- Validation architecture: HIGH — vitest config and test file patterns verified

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (stable stack — no fast-moving dependencies introduced)
