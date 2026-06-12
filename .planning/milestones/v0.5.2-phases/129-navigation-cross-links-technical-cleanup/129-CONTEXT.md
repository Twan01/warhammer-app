# Phase 129: Navigation, Cross-Links & Technical Cleanup - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve navigation flow between related pages, add cross-links between logically connected features, fix sidebar active-state highlighting for Game Day, and clean up dead code and performance issues. No new features — routing, linking, and refactoring only.

11 requirements: NAV-01 through NAV-11.

</domain>

<decisions>
## Implementation Decisions

### Painting Mode Return Navigation (NAV-01)
- **D-01:** Add a `returnTo` search parameter to the painting-mode route. All 6 entry points (Collection, Kanban, Recipe detail, Dashboard NextPaintingActionCard, AppliedRecipesTab, etc.) pass their current path as `returnTo` when navigating to `/painting-mode/$assignmentId`. The `handleExit` function in `page.tsx` reads `returnTo` from search params and navigates there; falls back to `"/"` if absent. The Escape key handler uses the same `handleExit`.
- **D-02:** Use TanStack Router's `search` param (not query string manually). Define the search schema on the painting-mode route with `z.object({ returnTo: z.string().optional() })`.

### Collection-to-Database Cross-Link (NAV-02)
- **D-03:** In `UnitDetailSheet.tsx`, add a "View Datasheet" button/link that navigates to `/unit-database` with a search filter pre-set to the unit's canonical name (or direct ID match if the unit has a `canonical_unit_id` FK). Use a secondary ghost Button with ExternalLink or BookMarked icon, placed near the unit name/header area of the sheet.
- **D-04:** Only show the link when the unit has a `canonical_unit_id` (linked to the canonical database). If unlinked, omit the button entirely — no disabled state needed.

### Rules Hub / Unit Database Cross-Links (NAV-03)
- **D-05:** Add a subtle cross-link button in each page's PageHeader actions area. Rules Hub gets "Browse Units →" linking to `/unit-database`. Unit Database gets "View Rules →" linking to `/rules-hub`. Use ghost variant Button with ArrowRight icon. Simple navigation, no context passing needed.

### Game Day Sidebar Highlighting (NAV-04)
- **D-06:** Game Day is at `/game-day/$listId` which doesn't match any existing sidebar nav item. Two options considered — adding Game Day to the Play nav group is cleaner than special-casing NavItem. Add `{ to: "/game-day", label: "Game Day", icon: Sword }` to `PLAY_NAV` array. NavItem's `startsWith` matching will highlight it for `/game-day/123`. The Game Day route requires a listId param, so the sidebar item should either: (a) link to the last-used list, or (b) be a non-navigable highlighted indicator. **Decision:** Make it a regular nav link to `/game-day` that shows a "Select an army list" prompt if accessed without a listId. This requires adding a `/game-day` index route. Alternatively, keep it simpler: just ensure the NavItem highlights when on `/game-day/*` by matching the pattern, but don't add a sidebar entry — instead fix NavItem to recognize Game Day as belonging to the Play group for highlighting purposes. **Final:** Add a Game Day entry to PLAY_NAV. The `to` path is `/game-day` for matching. The link itself navigates to `/army-lists` (the entry point for Game Day). Claude has discretion on the exact UX.

### Collapsed Sidebar Dividers (NAV-05)
- **D-07:** When sidebar is collapsed, the group labels ("Command", "Workshop", etc.) are hidden. Add thin horizontal dividers (`border-b border-border/40` or a `<Separator />`) between nav groups in collapsed mode. These replace the text labels as visual group separators. Use the same `border-border/40` opacity as the existing wordmark/Quick Add borders for consistency.

### Battle Log → Army List Links (NAV-06)
- **D-08:** In `BattleLogRow.tsx`, make the army list name a clickable `<Link>` to `/army-lists/$listId` when `army_list_id` is not null and the list still exists (armyListName is truthy). When the list was deleted (armyListName is null but army_list_id is set), keep the current italic "(Army list deleted)" text with no link.

### Dead Code Removal (NAV-07)
- **D-09:** Audit `ArmyListDetailSheet.tsx` (483 lines) for dead/unused code. The requirement says ~340 lines — verify actual dead code scope before deleting. Check if the component is still imported anywhere or has been superseded by `ArmyListDetailPage.tsx`. Delete confirmed dead code; keep any actively-used portions.

### RecipeCard Memoization (NAV-08)
- **D-10:** Wrap `RecipeCard` export in `React.memo()` following the established pattern: `export const RecipeCard = memo(function RecipeCard({...}: RecipeCardProps) { ... })`. This matches KanbanCard, CurrentFocusCard, and ArmyListUnitRow patterns already in the codebase.

### Reducer Extraction (NAV-09)
- **D-11:** Extract `detailPortalReducer`, its state type, initial state, and action types from `ArmyListDetailPage.tsx` into a new file `src/features/army-lists/armyListDetailReducer.ts`. Import it back. Pure refactor — no behavior change.

### Sidebar Collapse Transition (NAV-10)
- **D-12:** The sidebar `<aside>` already has `transition-[width] duration-200 ease-in-out`. Verify that the collapse animation is smooth. If the content (text labels, icons) snaps while the width transitions, add `overflow-hidden` to prevent text wrapping during transition and consider `transition-opacity` on the text elements for a fade effect. Claude has discretion on the exact CSS approach.

### Painting Mode Escape Hint (NAV-11)
- **D-13:** In `StepFocalView.tsx`, add a subtle "Esc to exit" hint visible during normal step view (not just completion/error screens). Place it in the bottom-right or footer area with `text-xs text-muted-foreground`. This was partially addressed in Phase 126 (D-03) for the completion screen — NAV-11 extends it to the active painting view.

### Claude's Discretion
- Exact placement of cross-link buttons within PageHeader actions
- Whether Game Day sidebar entry navigates to `/army-lists` or a dedicated `/game-day` index route
- CSS approach for sidebar collapse smoothness (overflow-hidden, opacity transitions, etc.)
- Whether `ArmyListDetailSheet.tsx` dead code is the entire file or a subset — depends on audit findings
- Exact icon choices for cross-links (ArrowRight, ExternalLink, BookMarked, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Navigation & Routing
- `src/app/router.tsx` — Route tree, painting-mode route definition (needs search schema for returnTo)
- `src/components/common/AppSidebar.tsx` — Sidebar nav groups (COMMAND_NAV, WORKSHOP_NAV, PLAY_NAV, MANAGEMENT_NAV)
- `src/components/common/NavItem.tsx` — Active route matching logic (pathname.startsWith)

### Painting Mode
- `src/app/painting-mode/page.tsx` — handleExit (line 111-113), Escape handler, "not found" screen
- `src/features/painting-mode/StepFocalView.tsx` — Step display, completion screen, Escape hint target (NAV-11)

### Cross-Link Targets
- `src/features/units/UnitDetailSheet.tsx` — Collection unit detail, target for "View Datasheet" link (NAV-02)
- `src/features/battle-log/BattleLogRow.tsx` — Army list name display (line 85-98), target for army list link (NAV-06)
- Rules Hub page component — Target for cross-link button (NAV-03)
- Unit Database page component — Target for cross-link button (NAV-03)

### Technical Cleanup
- `src/features/army-lists/ArmyListDetailSheet.tsx` — 483 lines, dead code audit target (NAV-07)
- `src/features/army-lists/ArmyListDetailPage.tsx` — useReducer at line 82/269, extraction target (NAV-09)
- `src/features/recipes/RecipeCard.tsx` — Plain function export, memo target (NAV-08)

### Entry Points for returnTo (NAV-01)
- `src/features/units/AppliedRecipesTab.tsx` — Navigates to painting-mode (line 78)
- `src/features/dashboard/NextPaintingActionCard.tsx` — Link to painting-mode (line 65)
- `src/features/painting-projects/KanbanBoard.tsx` — Navigates to painting-mode (line 91)
- `src/features/recipes/RecipeDetailSheet.tsx` — Navigates to painting-mode (line 315)

### Requirements
- `.planning/REQUIREMENTS.md` §v0.5.2 — NAV-01 through NAV-11 requirement definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NavItem` component: already handles active-state matching via `pathname.startsWith(to + "/")` — Game Day just needs an entry in PLAY_NAV
- `Link` from TanStack Router: used throughout for navigation — use for cross-links
- `React.memo()` pattern: established in KanbanCard, CurrentFocusCard, ArmyListUnitRow — follow same `export const X = memo(function X() {...})` pattern
- `PageHeader` actions prop: accepts ReactNode for action buttons — use for cross-link buttons
- Existing `border-border/40` divider pattern: used in sidebar wordmark and Quick Add borders

### Established Patterns
- Navigation: `navigate({ to: "/path", params: {...}, search: {...} })` via TanStack Router
- Cross-links: ghost Button with icon + text, navigating to related feature pages
- Memoization: `memo(function NamedComponent({...}: Props) {...})` with named function for DevTools
- Reducer extraction: separate `.ts` file with types, initial state, and reducer function

### Integration Points
- `src/app/router.tsx` line 203-207: painting-mode route — needs search schema addition
- `src/components/common/AppSidebar.tsx` PLAY_NAV array: Game Day entry addition
- All 6 painting-mode entry points: need `search: { returnTo: location.pathname }` added
- `src/styles/globals.css`: sidebar transition CSS if needed

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All changes are well-defined by the requirements and existing codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 129-Navigation, Cross-Links & Technical Cleanup*
*Context gathered: 2026-06-11*
