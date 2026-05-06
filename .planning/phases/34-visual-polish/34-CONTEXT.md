# Phase 34: Visual Polish - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

CSS-only visual upgrades to the dashboard: FactionSummaryCards become larger with a dominant faction-accent color band and unmistakable active/focus indicator; the dashboard hero area gains premium depth through a radial gradient; all dashboard card surfaces adopt an elevated/hover shadow hierarchy. No new data queries, hooks, or database changes.

</domain>

<decisions>
## Implementation Decisions

### FactionCard Accent Band & Size (VIS-01)
- Replace current `border-l-4` with a **full-width top color band** — a solid bar across the top of the card using the faction's `color_theme`
- Band height: ~8px (border-t-[8px] or equivalent) — visually dominant, clearly the primary decorative element
- Card size increase: `min-w-[220px]` (up from 180px), increased vertical padding (`py-5` → `py-6`), slightly more internal gap between info rows
- Keep the existing content layout (name, model count, painted %, battle-ready points) but allow more breathing room with the increased card size
- Remove `border-l-4` entirely — the top band replaces it as the faction color carrier

### Active/Focus Indicator (VIS-01)
- Remove the small Star icon button in the top-right corner — replace with a **full-card glow treatment**
- Active state: `bg-faction-accent/10` background fill + `ring-2 ring-faction-accent` + slightly elevated shadow (`shadow-md`)
- Inactive state: default `bg-card` background + no ring + base shadow (`shadow-sm`)
- The entire card surface signals active/focus state — unmistakably distinct without relying on a small icon
- Click-to-activate behavior moves to the entire card (existing pattern: card already has onClick)
- Add a separate small click target or visual indicator for "set active theme" vs "navigate to collection" — two actions on one card:
  - **Card click** → navigate to collection (existing behavior)
  - **Accent band area or dedicated icon** → toggle faction theme (existing onActivate behavior)
  - If separating is too complex, keep the Star but make it a subtle glow dot instead of a star icon, AND apply the background fill — both signals together

### Radial Gradient Hero (VIS-02)
- Apply a radial gradient background behind the **PageHeader + top StatCards row** area (the "hero" area as defined by VIS-02: "title + top stat row")
- Gradient: radial from center, `faction-accent` at very low opacity (~5-8%) fading to transparent — ties the hero area to the active faction without obscuring any text
- Implementation: a wrapper div around the PageHeader and StatCards grid cells with the gradient as a CSS background
- When no faction is active, fall back to a neutral gradient (e.g., from `muted/5` center to transparent) — never show an empty/jarring state
- Gradient should be subtle — premium depth, not flashy; should not affect text readability

### Card Hover Depth Hierarchy (VIS-03)
- **Dashboard-scoped only** — apply hover shadow transitions to dashboard card surfaces, not the global Card primitive
- Resting state: `shadow-sm` (already present on most dashboard cards via `bg-card border shadow-sm`)
- Hover state: `shadow-md` with `transition-shadow duration-150`
- Apply to: FactionSummaryCard, CurrentFocusCard, HobbyPipeline card, RecentActivityFeed card, ArmyReadinessCard, StatCard (all Card-based dashboard surfaces)
- Implementation: add `transition-shadow duration-150 hover:shadow-md` to each dashboard Card's className — lightweight, no wrapper component needed
- The panel-elevated token (`bg-panel-elevated` = `bg-card`) is already in use as the resting surface — hover just adds depth via shadow

### Claude's Discretion
- Exact radial gradient CSS syntax and opacity values (within the 5-8% range for faction-accent)
- Whether to use `border-t-[8px]` or a pseudo-element/inner div for the top color band
- Transition timing and easing for hover shadow (150ms suggested but flexible)
- How to separate the "activate theme" click target from the "navigate" click target on FactionCards (star replacement vs band click vs other pattern)
- Loading skeleton visual adjustments for the larger FactionCards
- Exact shadow-md values that look premium on dark zinc background

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §VIS-01, VIS-02, VIS-03 — Acceptance criteria for FactionCard upgrade, radial gradient hero, and card hover hierarchy

### Components to modify
- `src/features/dashboard/FactionSummaryCard.tsx` — Primary target: replace border-l-4 with top band, enlarge card, replace Star icon with glow treatment
- `src/features/dashboard/DashboardPage.tsx` — Add radial gradient wrapper around hero area; add hover shadow classes to card containers
- `src/features/dashboard/CurrentFocusCard.tsx` — Add hover shadow transition class
- `src/features/dashboard/HobbyPipeline.tsx` — Add hover shadow transition class
- `src/features/dashboard/RecentActivityFeed.tsx` — Add hover shadow transition class (if Card-based)
- `src/features/dashboard/ArmyReadinessCard.tsx` — Add hover shadow transition class
- `src/features/dashboard/StatCard.tsx` — Add hover shadow transition class

### Design tokens
- `src/styles/globals.css` — Existing tokens: `--panel-elevated`, `--faction-accent`, `--forge-black`, `--battle-gold`; radial gradient uses `--faction-accent`

### Prior design context
- `.planning/phases/25-design-foundation/25-CONTEXT.md` — Design token definitions, color system, semantic surface aliases
- `.planning/phases/30-grid-layout-foundation/30-CONTEXT.md` — CSS grid layout structure, StatCard placement, responsive breakpoints
- `.planning/phases/26-dashboard-redesign/26-CONTEXT.md` — Dashboard section order, FactionSummaryCard upgrade history (DASH-05)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FactionSummaryCard` (`src/features/dashboard/FactionSummaryCard.tsx`): Currently has border-l-4, Star icon, ring-2 active state, min-w-[180px], hover:bg-muted/50 — all being replaced/upgraded
- `Card` (`src/components/ui/card.tsx`): Base class `rounded-xl border bg-card shadow-sm` — NOT modified; hover is applied via className overrides on consuming components
- `--faction-accent` CSS variable: Already runtime-mutable per active faction (Phase 10) — radial gradient can reference this directly
- `--panel-elevated` token: Maps to `bg-card` (hsl 240 10% 5.9%) — already the dashboard resting surface

### Established Patterns
- Tailwind v4 CSS-first: all color tokens in `globals.css` @theme inline block
- `style={{ borderLeftColor: stat.faction.color_theme }}` for per-card faction coloring — will shift to `borderTopColor`
- `useActiveFaction()` context provides `activeFactionId` — already used to conditionally apply `ring-2 ring-faction-accent` on FactionSummaryCard
- Dashboard grid: `grid grid-cols-1 gap-6 p-6 lg:grid-cols-[3fr_2fr]` — gradient wrapper must respect this grid structure

### Integration Points
- `DashboardPage.tsx` populated render branch — gradient wrapper goes around the first 2-3 `col-span-full` children (PageHeader + StatCards)
- `FactionSummaryCard` — the `isActive` prop already drives conditional styling; expand its visual treatment
- All 6+ dashboard Card instances — each gets `transition-shadow duration-150 hover:shadow-md` added to their className

</code_context>

<specifics>
## Specific Ideas

- The top color band on FactionCards should feel like a "paint swatch" or "army banner" — a thick, bold stripe of the faction's signature color that immediately identifies the army
- Active faction glow should feel like "this card is lit up" — the faction color emanating subtly from the card surface, not just a border change
- The radial gradient hero effect should mirror premium dashboard apps (Linear, Raycast) where the background has subtle depth without being distracting
- Shadow transitions should feel tactile — cards lift slightly on hover, creating a layered 3D effect across the bento grid

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 34-visual-polish*
*Context gathered: 2026-05-06*
