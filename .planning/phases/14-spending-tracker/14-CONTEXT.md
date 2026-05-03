# Phase 14: Spending Tracker - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can record what they spent on units and paints, then navigate to a dedicated Spending page showing total hobby spend broken down by faction. This phase covers: cost/date fields on UnitSheet, cost field on PaintSheet, a new /spending route with a Spending page, and the schema migration to store values as integer pence.

</domain>

<decisions>
## Implementation Decisions

### Schema migration (migration 005)
- Add `purchase_price_pence INTEGER NULL` to `units` table — replaces existing `purchase_price REAL` column
- Migrate data: multiply existing REAL values by 100 (if any) to convert to pence
- The old `purchase_price REAL` column is deprecated after migration 005
- Add `purchase_price_pence INTEGER NULL` to `paints` table — no date column for paints (SPEND-02 requires price only)
- Both tables use the same column name `purchase_price_pence` for consistency

### Unit spend UX placement
- Purchase price and purchase date fields added to `UnitSheet` form (the Add/Edit form)
- Fields shown in both create mode and edit mode — user can log spend at time of purchase
- Price/date shown as read-only display in the Details tab of `UnitDetailSheet` (alongside faction, status, etc.)
- No new tab needed in UnitDetailSheet — read-only display only, editing still via UnitSheet

### Paint spend UX placement
- Add `purchase_price_pence` field to `PaintSheet` react-hook-form form — same pattern as UnitSheet
- Price only — no date field for paints
- Field shown in both create and edit modes

### Spending page layout
- Hero "Total Hobby Spend" card at top (sum of all unit purchase_price_pence + all owned-paint purchase_price_pence)
- Breakdown table below with rows for each faction (all 4 always shown, even at £0.00) + one "Paints" row at the bottom
- Per-faction subtotal = sum of `purchase_price_pence` for all units belonging to that faction
- "Paints" row subtotal = sum of `purchase_price_pence` for paints where `owned = 1` only
- New "Spending" sidebar nav entry — first-class route at `/spending`

### Faction breakdown for paint spend
- Paint spend is NOT attributed to any faction — it appears as a separate "Paints" row at the bottom of the breakdown table
- Only owned paints (owned = 1) count toward the Paints row total — wishlist items excluded
- All 4 factions always shown in breakdown, even with £0.00 spend — makes unpopulated factions visible

### Currency formatting
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §SPEND-01 — Unit purchase price + date entry spec
- `.planning/REQUIREMENTS.md` §SPEND-02 — Paint purchase price entry spec
- `.planning/REQUIREMENTS.md` §SPEND-03 — Spending page total spend spec
- `.planning/REQUIREMENTS.md` §SPEND-04 — Per-faction breakdown spec
- `.planning/REQUIREMENTS.md` §SPEND-05 — Integer pence storage + formatted currency display

### Database schema
- `src-tauri/migrations/001_core_schema.sql` — `units` table (has `purchase_price REAL` to be superseded) and `paints` table (no purchase column yet)
- `src-tauri/migrations/004_unit_playbook_stats.sql` — pattern to follow for migration 005 (additive ALTER TABLE)

### Existing UI patterns to follow
- `.planning/phases/07-paint-inventory/07-CONTEXT.md` — PaintSheet form pattern, paint type/query structure
- `.planning/phases/09-unit-playbook/09-CONTEXT.md` — UnitDetailSheet tab structure (header/footer outside Tabs), sibling portal pattern

No external specs — requirements are fully captured in REQUIREMENTS.md and the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/units/UnitSheet.tsx` — Add price + date fields here; uses react-hook-form + zod, reset on prop change
- `src/features/units/unitSchema.ts` — Add `purchase_price_pence` and `purchase_date` to the zod schema
- `src/features/units/UnitDetailSheet.tsx` — Details tab for read-only display; follows key={unit?.id} reset pattern
- `src/features/paints/PaintSheet.tsx` — Add price field here; identical react-hook-form pattern to UnitSheet
- `src/features/paints/paintSchema.ts` — Add `purchase_price_pence` to the zod schema
- `src/types/unit.ts` — `Unit` type already has `purchase_date: string | null` and `purchase_price: number | null`; update to `purchase_price_pence: number | null`
- `src/types/paint.ts` — `Paint` type needs `purchase_price_pence: number | null` added
- `src/db/queries/units.ts` — `createUnit` and `updateUnit` need `purchase_price_pence` wired; remove `purchase_price`
- `src/db/queries/paints.ts` — `createPaint` and `updatePaint` need `purchase_price_pence` wired

### Established Patterns
- `useDashboardStats` + `computeStats.ts` — pattern for a computed query that aggregates DB data; new `useSpendingStats` hook follows the same shape
- Sidebar nav: check `src/app/Layout.tsx` or `src/components/AppSidebar.tsx` for where nav items are registered
- TanStack Router: new route file pattern from `src/routes/` — e.g. `spending.tsx` or `_layout.spending.tsx`
- Feature-folder: new `src/features/spending/` folder for SpendingPage and related components

### Integration Points
- Sidebar nav — add "Spending" entry with wallet/coin icon (same nav item pattern as Collection, Paints, etc.)
- TanStack Router route tree — register `/spending` route
- `src/db/queries/` — new `spending.ts` query module for the aggregated spend query (units + paints join to factions)
- `src/hooks/` — new `useSpendingStats.ts` hook
- Migration 005 must run before any new columns are accessed

</code_context>

<specifics>
## Specific Ideas

- Layout mockup confirmed by user:
  ```
  ┌────────────────────────────┐
  | Total Hobby Spend         |
  |   £247.50                |
  └────────────────────────────┘

   Breakdown
   ┌─────────────────┬────────┐
   | Faction         | Spend  |
   |─────────────────|────────|
   | Tau Empire      | £85.00 |
   | Ultramarines    | £62.50 |
   | Necrons         | £45.00 |
   | Tyranids        | £00.00 |
   |─────────────────|────────|
   | Paints          | £55.00 |
   └─────────────────┴────────┘
  ```
- Currency formatter should use `Intl.NumberFormat` with locale/currency args so it's ready to wire to a future settings page

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-spending-tracker*
*Context gathered: 2026-05-03*
