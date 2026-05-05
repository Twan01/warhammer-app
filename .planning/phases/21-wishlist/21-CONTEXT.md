# Phase 21: Wishlist - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can maintain a running list of models they want to buy — with name, faction, optional estimated cost, and notes — on a dedicated Wishlist page before the items exist in their collection. This is a standalone CRUD page with no conversion-to-collection workflow (that would be a separate phase).

</domain>

<decisions>
## Implementation Decisions

### List display
- Table row layout matching BattleLogPage pattern (not cards, not gallery)
- Each row shows: name, faction name, estimated cost (formatted), notes snippet, date added
- Rows are clickable for edit (open Sheet) or have inline Edit/Delete actions matching BattleLogRow pattern
- EmptyState follows the icon-pill pattern (Heart or Gift icon — domain-appropriate)

### Sidebar placement
- Wishlist added to MANAGEMENT_NAV group (alongside Factions and Spending)
- Route: `/wishlist`
- Buying intent / spending planning is a management concern

### Cost handling
- Integer pence discipline (existing project pattern) — `estimated_cost_pence INTEGER` in schema
- formatCurrency for display (the single /100 conversion site)
- Page-level summary stat showing total estimated cost across all items
- Cost is optional (nullable) per WISH-01

### Item ordering
- Default sort: created_at DESC (newest first)
- Matches BattleLog and Collection patterns
- No priority/ranking field for MVP (not in WISH-01..04 requirements)

### Form fields
- Name: required, text input (min 1, max 120 — matches unit name constraints)
- Faction: required, select/combobox from existing factions (FK relationship)
- Estimated cost: optional, currency input (stored as integer pence)
- Notes: optional, textarea (e.g. "wait for sale", "for Crusade roster")

### Claude's Discretion
- Exact icon choice for empty state and sidebar nav item
- Whether to show faction color indicator on rows (dot/badge)
- Table column widths and responsive behavior
- Loading skeleton layout
- Whether notes truncate with ellipsis or show in full

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/milestones/v2.2-REQUIREMENTS.md` — WISH-01..04 requirement definitions (lines 16-21)
- `.planning/ROADMAP.md` — Phase 21 success criteria (lines 133-141)

### Patterns to follow
- `src/features/battle-log/BattleLogPage.tsx` — Closest pattern (CRUD page with sibling-portal Sheet/Dialog)
- `src/features/battle-log/BattleLogSheet.tsx` — Form Sheet pattern for create/edit
- `src/features/battle-log/BattleLogDeleteDialog.tsx` — Delete confirmation pattern
- `src/features/battle-log/BattleLogEmptyState.tsx` — EmptyState icon-pill pattern
- `src/features/spending/computeSpendingStats.ts` — Integer pence + formatCurrency pattern

### Integration points
- `src/components/common/AppSidebar.tsx` — MANAGEMENT_NAV array (add Wishlist entry)
- `src/app/router.tsx` — Route registration
- `src/hooks/useFactions.ts` — Faction picker data source

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PageHeader` component: shared page header with title + actions slot
- `Button`, `Sheet`, `Dialog` from shadcn/ui: form containers
- `useFactions` hook: provides faction list for the faction picker
- `formatCurrency` from spending: integer pence → display string
- Zod + react-hook-form pattern: consistent form validation
- `BattleLogPage` architecture: complete CRUD page blueprint

### Established Patterns
- Feature folder structure: `src/features/wishlist/` with schema, Sheet, DeleteDialog, EmptyState, Page
- Query module: `src/db/queries/wishlistItems.ts` with CRUD functions
- Hook module: `src/hooks/useWishlistItems.ts` with React Query keys + mutations
- Type module: `src/types/wishlistItem.ts` with entity/create/update interfaces
- Sibling Sheet/Dialog portal pattern (never nest Radix portals)
- Integer pence for currency, 0|1 for booleans
- `$1, $2` positional params for tauri-plugin-sql

### Integration Points
- Migration: next available number (009) for `wishlist_items` table
- Route: `/wishlist` added to router.tsx
- Sidebar: entry in MANAGEMENT_NAV array
- Quick Add: "Add Wishlist Item" action in QuickAddContext (if wired)
- Dashboard invalidation: mutations should invalidate `['dashboard-stats']` for forward-compat

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow BattleLogPage as the structural blueprint.

</specifics>

<deferred>
## Deferred Ideas

- "Convert to collection" workflow (move wishlist item → create unit in collection) — would be its own phase
- Priority/ranking system for wishlist items — not in WISH-01..04
- Wishlist total cost on Dashboard — potential future dashboard card
- Shared/public wishlist for gift-giving — out of scope (local-first app)

</deferred>

---

*Phase: 21-wishlist*
*Context gathered: 2026-05-05*
