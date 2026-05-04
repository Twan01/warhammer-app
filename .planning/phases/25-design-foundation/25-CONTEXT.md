# Phase 25: Design Foundation - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the shared visual primitives that every subsequent v2.3 phase builds on: semantic design tokens in `globals.css`, a reusable `PageHeader` component applied to all main pages, an enriched `StatCard` (optional icon + trend + progress), and a unified `StatusBadge` for painting status. No feature work, no page restructuring beyond adopting PageHeader.

</domain>

<decisions>
## Implementation Decisions

### Color Tokens (DSFD-01)
- **Alias-only strategy** — keep all existing zinc dark theme values exactly as-is. No color value changes.
- Add semantic CSS variable names as aliases in `globals.css` `@theme inline` block, mapping to existing values:
  - `--forge-black` → existing `--background` (240 10% 3.9%)
  - `--panel-elevated` → existing `--card` (240 10% 5.9%)
  - `--panel-surface` → existing `--secondary` (240 3.7% 15.9%)
  - `--battle-gold` → genuinely new token (amber/gold — no existing value; choose a ~oklch 0.78 chroma 0.17 hue 85 warm gold that reads well on dark)
- `--faction-accent` remains the runtime-mutable color from Phase 10 — unchanged
- No Plasma Blue/Teal accent introduced in Phase 25 (deferred unless a later phase needs it)

### Battle Gold (DSFD-01)
- Define `--battle-gold` as a new CSS custom property in Phase 25
- **Do NOT apply it yet** — Phases 26+ apply it to HobbyPipeline, StatusBadge "Done" tier, and Army readiness panel
- Add it to `@theme inline` as `--color-battle-gold` for Tailwind utility use (`text-battle-gold`, `bg-battle-gold`)

### StatusBadge (DSFD-04)
- **Format**: colored dot (4px circle) + status text — compact, works in table rows and gallery cards
- **4-tier color system** across 11 statuses:
  - **Not Started tier** (1 status): `Not Started` → muted gray dot (`text-muted-foreground`)
  - **Prep tier** (3 statuses): `Built`, `Primed`, `Basecoated` → slate/steel-blue dot
  - **Painting tier** (5 statuses): `Shaded`, `Layered`, `Highlighted`, `Details Done`, `Based` → indigo/violet dot
  - **Done tier** (2 statuses): `Varnished`, `Completed` → warm green or gold-green dot
- **Exact shade values**: Claude's discretion — pick colors that sit well on dark zinc backgrounds and read clearly at `text-sm`
- Export a `PAINTING_STATUS_TIER` map from `src/types/unit.ts` or co-locate in the badge component
- Component path: `src/components/ui/status-badge.tsx`
- Props: `status: PaintingStatus` — no other props needed for the initial version

### StatCard Enrichment (DSFD-03)
- **Extend StatCard in-place** with optional props — all existing callers continue to work without changes
- New optional props:
  - `icon?: React.ComponentType<{ size?: number; className?: string }>` — Lucide icon component, caller-supplied
  - `trend?: { value: number; label: string }` — e.g. `{ value: 12, label: "+12 this month" }` for optional trend line below the label
  - `progress?: number` — 0–100 value; renders a thin progress bar at the bottom of the card when provided
- Icon renders at `size={16}` in `text-muted-foreground` above the value, when passed
- Progress bar: thin (2px height), `bg-faction-accent` fill, `bg-border/40` track, no percentage label
- Existing `value`, `label`, `animate` props unchanged

### PageHeader (DSFD-02)
- **Flexible API**: `title` (required string), `subtitle?` (optional string), `actions?` (optional ReactNode)
- `title` renders as `<h1 className="text-3xl font-semibold tracking-tight">`
- `subtitle` renders as `<p className="text-sm text-muted-foreground mt-1">` when provided
- `actions` renders in the right-aligned slot when provided
- Outer container: `<div className="flex items-center justify-between pb-6 border-b border-border/40">` — matches the existing inline pattern in DashboardPage
- Component path: `src/components/common/PageHeader.tsx`
- **Applied to all 8 main pages** in Phase 25: Dashboard, Collection, Painting Projects, Paints, Recipes, Army Lists, Battle Log, Spending (and Factions page)
- Each page replaces its inline header block with `<PageHeader title="..." subtitle="..." />`

### Claude's Discretion
- Exact hex/oklch values for the 4-tier StatusBadge colors (within the tier descriptions above)
- Whether to co-locate the tier map inside `status-badge.tsx` or export from `src/types/unit.ts`
- Exact `--battle-gold` value (warm amber-gold, visible on dark background)
- Progress bar height and corner radius on enriched StatCard

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §DSFD-01..04 — Acceptance criteria for all four Design Foundation requirements

### Existing code to extend/replace
- `src/styles/globals.css` — Current @theme inline block; new tokens go here in Phase 25
- `src/features/dashboard/StatCard.tsx` — Component to extend with icon/trend/progress props
- `src/components/common/AppSidebar.tsx` — Nav group labels (NOT changed in Phase 25 — that is NAV-01 in Phase 27)
- `src/types/unit.ts` — `PAINTING_STATUS_ORDER` array (all 11 statuses); `PaintingStatus` type used by StatusBadge

### Existing page header patterns (inline — to be replaced by PageHeader)
- `src/features/dashboard/DashboardPage.tsx` — inline header div pattern (line ~108)
- Repeat pattern across: CollectionPage, PaintingProjectsPage, PaintsPage, RecipesPage, ArmyListsPage, BattleLogPage, SpendingPage, FactionsPage

### Prior context
- `.planning/phases/19-analytics-core/19-CONTEXT.md` — StatCard usage context (animate prop, existing callers)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/dashboard/StatCard.tsx` — Will be extended in-place; existing `animate`, `value`, `label` props stay; add `icon?`, `trend?`, `progress?`
- `src/types/unit.ts` — `PAINTING_STATUS_ORDER` and `PaintingStatus` are imported by StatusBadge
- `@/components/ui/*` — All shadcn components available (Card, Badge, etc.) — StatusBadge can use the shadcn Badge primitive or be a fully custom component

### Established Patterns
- Tailwind v4 CSS-first: new tokens go in `globals.css` `@theme inline` block as `--color-*` — maps to Tailwind utilities automatically
- `--faction-accent` / `--color-faction-accent` pattern (Phase 10) is the model for adding new design tokens
- All new components go in `src/components/ui/` (primitives) or `src/components/common/` (app-shell level)
- Named function exports with inline prop types (no separate interface files for simple components)
- No default exports — use named exports throughout

### Integration Points
- `globals.css` `@theme inline {}` block — add `--color-battle-gold` and `--color-forge-black` etc. here
- All 8+ page components — each has an inline header div to replace with `<PageHeader ...>`
- `src/features/dashboard/StatCard.tsx` — extend in-place, no new file
- `src/components/ui/status-badge.tsx` — new file (does not exist yet)
- `src/components/common/PageHeader.tsx` — new file (does not exist yet)

</code_context>

<specifics>
## Specific Ideas

- The audit uses "Forge Black", "Gunmetal", "Panel Elevated", "Battle Gold" as token names — use these as the CSS variable names for clarity and traceability to the design doc
- The dot+text badge format mirrors how Linear shows status (small colored dot before text) — compact and scannable
- The PageHeader pattern already exists inline in DashboardPage; Phase 25 extracts and standardizes it, not invents a new pattern

</specifics>

<deferred>
## Deferred Ideas

- Plasma Blue/Teal as a primary CTA accent — not introduced in Phase 25; evaluate if needed in Phase 26 or 27
- Light mode support — explicitly out of scope per PROJECT.md constraints
- `--battle-gold` application to specific UI elements — deferred to Phases 26+ per user decision

</deferred>

---

*Phase: 25-design-foundation*
*Context gathered: 2026-05-04*
