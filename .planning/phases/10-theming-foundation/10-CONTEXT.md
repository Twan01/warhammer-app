# Phase 10: Theming Foundation - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver faction-aware dynamic accent theming: a CSS custom property system that shifts primary buttons, faction badges, and nav active highlights to the selected faction's color — plus confirming UI-01/02/03 (sidebar collapse, persistence, tooltips) are already shipped. Users select their active faction by clicking a FactionSummaryCard on the Dashboard.

</domain>

<decisions>
## Implementation Decisions

### Accent Color Architecture
- CSS custom property `--color-faction-accent` defined in Tailwind v4 `@theme` block in index.css with zinc neutral default
- Runtime updates via `document.documentElement.style.setProperty('--color-faction-accent', hex)` — zero re-render cost
- Tailwind utilities `bg-faction-accent`, `text-faction-accent`, `border-faction-accent` defined against the custom property
- A React context (`ActiveFactionContext`) holds the active faction id + hex, calls the DOM update on change

### Active Faction Storage
- localStorage with key `active-faction-id` — synchronous read on init, same pattern as `useSidebarCollapsed`
- No SQLite table needed — this is a UI preference, not domain data
- Default when no key present: no faction selected = zinc/neutral (app looks identical to current state on first launch)

### Dashboard Picker UX
- Clicking a FactionSummaryCard sets it as the active faction — no separate picker widget
- Active card shows: faction-accent ring (2px border) + small "Active" badge
- Clicking the already-active card deselects it → back to zinc/neutral
- `FactionSummaryCard` receives `isActive: boolean` prop and `onActivate: () => void` callback

### Accent Scope — Elements That Change Color
- **Primary buttons** (`variant="default"`) — bg-faction-accent replaces bg-primary
- **Faction badges** — each badge already uses `faction.color_theme` inline; the active faction's badge uses accent color from context instead
- **Nav active highlight** — NavItem active state uses bg-faction-accent / text-faction-accent instead of zinc bg-accent
- **Excluded**: painting status rings (those encode painting state, not faction identity)

### Claude's Discretion
- Whether to use a TooltipProvider wrapper or assume it's already provided globally
- Exact Tailwind v4 @theme syntax for registering the custom property as a color utility
- Whether FactionSummaryCard gets the active state via prop or reads context directly (prop preferred for testability)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useSidebarCollapsed` — localStorage read/write pattern to copy exactly for `useActiveFaction`
- `FactionSummaryCard` in `src/features/dashboard/` — existing card component to extend with `isActive` + `onActivate` props
- `AppSidebar.tsx` / `NavItem.tsx` — sidebar already complete (UI-01/02/03 shipped); NavItem already uses Radix Tooltip in collapsed mode
- `faction.color_theme` — hex string stored per faction in DB, already used in `FactionRow.tsx` as inline border style

### Established Patterns
- localStorage persistence: synchronous init in `useState` initializer, `useEffect` to sync on change (see `useSidebarCollapsed.ts`)
- Context pattern: wrap at App root, consume via custom hook
- Tailwind v4 `@theme` layer for CSS custom properties (STATE.md prior decision)
- All query modules in `src/db/queries/`, hooks in `src/hooks/` — no DB work needed here (using localStorage)

### Integration Points
- `src/App.tsx` (or router root) — wrap with `ActiveFactionProvider`
- `src/index.css` — add `@theme` block with `--color-faction-accent` and utilities
- `src/components/common/NavItem.tsx` — update active class to use `bg-faction-accent`
- `src/components/ui/button.tsx` — update `default` variant to use `bg-faction-accent`
- `src/features/dashboard/FactionSummaryCard.tsx` — add `isActive` prop + ring + badge
- `src/features/dashboard/DashboardPage.tsx` — wire up active faction selection from card clicks

</code_context>

<specifics>
## Specific Ideas

- Active FactionSummaryCard gets `ring-2 ring-[var(--color-faction-accent)]` styling — not an inline border swap
- "Active" badge should be small (text-xs) and use the faction accent color itself so it matches
- Deselect by clicking the active card again (toggle behavior)

</specifics>

<deferred>
## Deferred Ideas

- THEME-04: Custom faction color picker (override default hex per faction) — explicitly in Out of Scope in REQUIREMENTS.md
- Painting status rings using faction accent — rejected in discussion (status rings encode painting state)
- SQLite app_settings table for preference storage — localStorage is sufficient

</deferred>
