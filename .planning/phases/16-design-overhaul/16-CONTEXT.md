# Phase 16: Design Overhaul - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Significantly improve visual design across all existing pages — typography, spacing, layouts, empty states, and sidebar polish. No new features, no new routes, no DB changes. Pure visual/UX improvement applied to all 7 pages (Dashboard, Collection, Painting Projects, Paint Inventory, Army Lists, Recipes, Spending) and all shared components.

</domain>

<decisions>
## Implementation Decisions

### Design Direction
- Target aesthetic: **Linear-inspired polished tooling** — clean, precise, professional. Refined without changing the core character of the app
- Visual reference: **Linear** specifically (not gaming HUD, not editorial) — the gold standard for this kind of dark tool UI
- Problem to solve: consistent baseline — the app looks functional but unfinished throughout, no single biggest offender
- Completion criterion: every page reviewed and polished systematically; done when all pages pass a visual review

### Execution Order
- **Shared foundations first** — typography system, spacing standards, page header pattern, sidebar polish — so improvements cascade naturally to all pages
- **Then pages in sequence**, applying the established system
- **No pages excluded** — full overhaul: Dashboard, Collection, Painting Projects, Paint Inventory, Army Lists, Recipes, Spending, and all empty states
- Sheets and dialogs (UnitDetailSheet, ArmyListDetailSheet, etc.) **are included** — interior polish is in scope

### Typography
- **Custom font**: Claude decides (Geist Sans is the recommended choice — used by Linear and Vercel, available via `@fontsource-variable/geist`, clean and modern)
- **Page heading hierarchy**: upgrade from current `text-xl font-semibold` to clearly dominant headings — `text-2xl` or `text-3xl`, `tracking-tight`, separated from content by a clear visual break (border or spacing). Every page title should be visually stronger than any card title
- **Tabular nums**: add `font-variant-numeric: tabular-nums` (`tabular-nums` Tailwind class) to all numeric values — painted percentages, points, stat numbers — keeps column alignment clean
- Current inconsistency: every page uses the same heading weight as card titles — this must be fixed across all pages

### Sidebar Polish
- **Keep structure, improve appearance** — no nav item changes, no routing changes
- Improvements: better icon-to-label spacing, active item highlight using `bg-faction-accent` (consistent with Phase 10 system), visual nav section grouping, **app logo/wordmark area at the top** of the sidebar
- The collapsible icon-only mode from Phase 10 remains unchanged — polish only applies to the expanded state visual presentation

### Empty States
- **Treatment**: icon + polished copy — better icon choice, stronger headline, more specific helper text, consistent layout across all pages
- Pattern: `[Icon]` / `[Strong headline]` / `[Specific helper text]` / `[Primary CTA button]`
- Icons: choose lucide icons that feel more specific to the page context (not generic PackageSearch everywhere)
- Copy: headlines should be direct ("No units yet", "No projects active"), helper text should reference the core action not just "nothing here"
- **Dashboard special case**: when no units exist, show a **welcome screen** (first-run experience) — app name/wordmark, clear CTA to add first unit, brief one-line explanation of what the app does. This is the onboarding moment; it should set the tone
- All other pages: consistent polished icon + copy pattern (not illustrated, not elaborate)

### Claude's Discretion
- Exact font choice (Geist Sans recommended but researcher should verify best Tailwind v4 integration)
- Precise heading sizes (text-2xl vs text-3xl per context)
- Exact spacing scale refinements
- Loading skeleton visual polish
- Card elevation / surface depth decisions (subtle shadow improvements, border treatments)
- Specific lucide icon choices for empty states
- Whether to add a page-level `<header>` structural element or keep the current div approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project character & constraints
- `.planning/PROJECT.md` §Context — "Serious dashboard, not toy-like", dark-mode-first, current tech stack state
- `.planning/PROJECT.md` §Key Decisions — dark-mode-first rationale, zinc/shadcn dark theme decision

### Design system foundation (Phase 10)
- `.planning/phases/10-theming-foundation/10-CONTEXT.md` — `bg-faction-accent` / `ring-faction-accent` CSS utilities, sidebar collapse behavior; any sidebar polish must not break Phase 10 collapse mechanics

### Existing page structures (researcher should read all)
- `src/features/dashboard/DashboardPage.tsx` — current Dashboard layout
- `src/features/units/CollectionPage.tsx` — current Collection layout and header pattern
- `src/features/painting-projects/PaintingProjectsPage.tsx` — current Kanban page
- `src/features/paints/PaintsPage.tsx` — current Paint Inventory page
- `src/features/army-lists/ArmyListsPage.tsx` — current Army Lists page
- `src/features/recipes/RecipesPage.tsx` — current Recipes page

### Existing empty state components (all need to be upgraded)
- `src/features/units/CollectionEmptyState.tsx`
- `src/features/dashboard/DashboardEmptyState.tsx`
- `src/features/painting-projects/KanbanEmptyState.tsx`
- `src/features/paints/PaintsEmptyState.tsx`
- `src/features/army-lists/ArmyListsEmptyState.tsx`
- `src/features/recipes/RecipeEmptyState.tsx`

### Sidebar
- `src/components/ui/sidebar.tsx` — shadcn sidebar component
- `src/components/common/NavItem.tsx` — nav item with active state and tooltip

No external design specs — decisions are fully captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bg-faction-accent` / `ring-faction-accent` — Phase 10 CSS utilities for accent color; use for active sidebar item highlight
- `src/components/ui/` — full shadcn/ui library (button, card, badge, table, skeleton, etc.) — overhaul refines usage, doesn't replace components
- `src/features/dashboard/StatCard.tsx` — card component used in Dashboard hero; polish target for this phase

### Established Patterns
- All page files use `<div className="flex flex-col gap-6 p-6">` as top-level wrapper — spacing refinements apply here
- Page header pattern: `<div className="flex items-center justify-between">` with `<h1 className="text-xl font-semibold">` — every page uses this; upgrading the h1 size is the most impactful single change
- Empty states: `<div className="flex flex-col items-center justify-center gap-4 py-16 text-center">` — consistent structure, refine the content
- `src/hooks/useSidebarCollapsed.ts` — sidebar collapse persistence; must not be disturbed by sidebar visual changes

### Integration Points
- `src/index.css` — where the custom font `@import` and `font-family` global rule should land (same file as the `@theme` block from Phase 10)
- `src/components/ui/sidebar.tsx` + `src/components/common/NavItem.tsx` — sidebar polish targets
- All `*EmptyState.tsx` files — direct upgrade targets
- All `*Page.tsx` files — heading size and spacing upgrades

</code_context>

<specifics>
## Specific Ideas

- Linear reference confirmed — the planner should look at Linear's actual UI for heading size, nav active states, empty state copy, and table row density
- Page headings should feel clearly different from card titles — currently `text-xl font-semibold` is the same for both; fix this
- Sidebar app logo/wordmark at the top: "HobbyForge" in a clean typographic treatment, possibly with a small icon
- Dashboard welcome screen (first-run): sets the tone for the whole app — should feel polished and warm, not generic
- Tabular-nums on all numbers: percentages, points totals, stat values, spend amounts

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 16-design-overhaul*
*Context gathered: 2026-05-04*
