# Navigation & Layout UX Audit — HobbyForge

**Audited:** 2026-06-11
**Scope:** Read-only audit of routing, sidebar, cross-linking, scrollbars, keyboard nav, and layout consistency.

---

## 1. Route Structure Summary

**Total routes:** 18

| Route | Parent Layout | In Sidebar? | Notes |
|---|---|---|---|
| `/` | layoutRoute | Yes — Command | Dashboard |
| `/collection` | layoutRoute | Yes — Command | |
| `/painting-projects` | layoutRoute | Yes — Command | |
| `/goals` | layoutRoute | Yes — Command | |
| `/paints` | layoutRoute | Yes — Workshop | |
| `/recipes` | layoutRoute | Yes — Workshop | Accepts `?paintId` search param |
| `/army-lists` | layoutRoute | Yes — Play | |
| `/army-lists/$listId` | layoutRoute | **No** | Detail drill-down |
| `/battle-log` | layoutRoute | Yes — Play | |
| `/rules-hub` | layoutRoute | Yes — Play | |
| `/unit-database` | layoutRoute | Yes — Play | |
| `/factions` | layoutRoute | Yes — Management | |
| `/spending` | layoutRoute | Yes — Management | |
| `/wishlist` | layoutRoute | Yes — Management | |
| `/data-health` | layoutRoute | Yes — Management | |
| `/settings` | layoutRoute | **Yes — pinned bottom** | Not in a nav group |
| `/game-day/$listId` | layoutRoute | **No** | Accessible via army-list detail only |
| `/painting-mode/$assignmentId` | bareLayoutRoute | **No** | Distraction-free, no sidebar |

**Key observation:** `/game-day/$listId` uses the standard `layoutRoute` (sidebar is present) but the page renders its own custom `GameDayHeader` with a back button. The active sidebar item will be `/army-lists` due to the `startsWith` check in `NavItem.tsx` line 21 — that part works correctly. However, navigating directly to a game-day URL from outside army lists (e.g., bookmark or deep link) shows a sidebar with no highlighted item until the URL matches `/army-lists/...`, which it doesn't.

---

## 2. Sidebar & Navigation Issues

### ISSUE NAV-01 — Section group labels vanish in collapsed mode, leaving no visual grouping
**WHERE:** `src/components/common/AppSidebar.tsx` lines 153–220
**WHAT:** The four group labels ("Command", "Workshop", "Play", "Management") are hidden when `collapsed === true` (`!collapsed &&`). In the collapsed 48px state, 14 icons are stacked with no separator between groups. The icon list becomes an undifferentiated vertical column.
**WHY IT MATTERS:** A user scanning the collapsed sidebar cannot distinguish Command from Workshop from Play from Management icons. Cognitive overhead increases. Section grouping — the primary information architecture of the sidebar — is silently discarded when most compact.
**SUGGESTION:** Add thin `<hr>` or `<Separator>` lines between nav groups in the collapsed state. They cost 1px vertically but preserve the 4-group structure. Example: between the last COMMAND_NAV item and the first WORKSHOP_NAV item, render `<li role="separator" className="mx-2 my-1 border-t border-border/40" />` regardless of collapsed state.

### ISSUE NAV-02 — Settings is visually orphaned; not in any nav group
**WHERE:** `src/components/common/AppSidebar.tsx` lines 242–253
**WHAT:** Settings is pinned to the bottom in its own `<div className="border-t ...">` zone, outside all four nav groups and their `<ul>` lists. This is a common pattern, but the "Management" group (Factions, Spending, Wishlist, Data Health) is conceptually the right home for Settings. Alternatively, the current bottom-pinned treatment means Settings has no group label and sits in an ambiguous zone between the collapse toggle and the bottom border.
**WHY IT MATTERS:** Users learn navigation via groupings. Settings being outside all groups makes it harder to predict where management-level actions live. It's also inconsistent — Data Health (also a management concern) is inside the Management group, but Settings is not.
**SUGGESTION:** Either move Settings into the MANAGEMENT_NAV array so it appears alongside Data Health, or add a small "Settings" label above the bottom zone in expanded state to signal its identity, matching the pattern of the other four group labels.

### ISSUE NAV-03 — Game Day has no sidebar highlight; user loses position context
**WHERE:** `src/components/common/NavItem.tsx` lines 18–21, `src/app/router.tsx` lines 181–185
**WHAT:** `/game-day/$listId` is a child of `layoutRoute` so the sidebar is visible. However, `NavItem` active detection is `pathname.startsWith(to + "/")`, which means `/game-day/42` does NOT highlight the Army Lists nav item (`/army-lists`). No sidebar item lights up during a Game Day session.
**WHY IT MATTERS:** The user loses orientation. The sidebar's faction-accent active highlight communicates "you are here." In Game Day, that signal disappears entirely, making the app feel disjointed.
**SUGGESTION:** Extend the `isActive` check in `NavItem` to support an optional `activeFor` prop (array of path prefixes). Register `/army-lists` with `activeFor: ["/army-lists", "/game-day"]`. This is a small prop addition and a one-line change to the active detection logic.

---

## 3. Cross-page Linking Gaps

### ISSUE LINK-01 — Painting Mode exit lands on Dashboard, not the originating context
**WHERE:** `src/app/painting-mode/page.tsx` line 110
**WHAT:** `handleExit` navigates unconditionally to `{ to: "/" }` (Dashboard). Painting Mode can be entered from three places: Dashboard (active project card), Painting Projects (Kanban card), and Recipe Detail Sheet (assign & start). Pressing Escape or clicking Exit always discards the originating context and drops the user at the Dashboard.
**WHY IT MATTERS:** If a user starts Painting Mode from the Painting Projects Kanban, exiting should return them to `/painting-projects`. Returning to Dashboard instead breaks the workflow loop: user must manually re-navigate to Painting Projects to resume their session context.
**SUGGESTION:** Pass the originating path as a URL search param (`?returnTo=/painting-projects`) when navigating into Painting Mode. On exit, `navigate({ to: returnTo ?? "/" })`. All three entry points (Dashboard, KanbanBoard, RecipeDetailSheet) need to pass the param.

### ISSUE LINK-02 — "All steps complete" state in Painting Mode has no exit affordance
**WHERE:** `src/features/painting-mode/StepFocalView.tsx` lines 42–49
**WHAT:** When all steps are marked done, the view shows a green checkmark and "All steps complete!" with no button. The only way out is pressing Escape (keyboard shortcut) or using the sidebar (which is not rendered — bareLayoutRoute has no sidebar).
**WHY IT MATTERS:** Painting Mode uses `bareLayoutRoute` — there is no sidebar. Escape is the only escape hatch on the success screen. Users unfamiliar with the keyboard shortcut are stuck; there is no visible "Back to Projects" or "Done" button. This is a dead-end UX state.
**SUGGESTION:** Add a `Button` on the completion screen: "Back to Projects" (or "Done") that calls the exit handler. The `onExit` prop needs to be threaded from `PaintingModePage` → `PaintingModeView` → `StepFocalView`. Alternatively, auto-navigate after a short delay (2–3s) with a visible countdown, giving the user a moment to see the completion state.

### ISSUE LINK-03 — Collection page has no direct link to Unit Database
**WHERE:** `src/features/units/CollectionPage.tsx`, `src/features/units/UnitDetailSheet.tsx`
**WHAT:** The Unit Database (`/unit-database`) is the canonical 40k data hub where users can browse rules for units they own. There is no cross-link from Collection → Unit Database for a specific unit, nor from UnitDetailSheet to the corresponding datasheet in the Unit Database. The existing link in `UnitDetailSheet.tsx` line 212 goes to `/recipes` (not unit database).
**WHY IT MATTERS:** The natural workflow is: "I have this unit in my collection, let me look up its stats." Without a link, the user must navigate to Unit Database via sidebar and manually re-find the unit. This severs one of the app's most valuable feature relationships.
**SUGGESTION:** In `UnitDetailSheet`, add a "View Datasheet" button that navigates to `/unit-database` with the unit's name pre-filled in the search store (via the `databaseBrowserFilters` Zustand store), or opens `UdbDatasheetSheet` directly. The `PlaybookTab` already fetches from `unitDatabase` — this connection exists internally but is not surfaced as a navigation action.

### ISSUE LINK-04 — Rules Hub has no link to Unit Database and vice versa
**WHERE:** `src/features/rules-hub/RulesHubPage.tsx`, `src/features/unit-database/DatabaseBrowserPage.tsx`
**WHAT:** Rules Hub shows stratagems, detachments, and points by faction. Unit Database shows datasheets by faction. They share a faction selector but are entirely siloed — no "See units for this faction" link from Rules Hub, no "See stratagems for this faction" link from Unit Database.
**WHY IT MATTERS:** During army building and game prep, users constantly switch between these two views. The sidebar-only navigation forces two clicks (click sidebar Rules Hub, then sidebar Unit Database) with no faction context preserved.
**SUGGESTION:** In Rules Hub, add a subtle "View units →" link/button next to the faction selector that navigates to `/unit-database` and sets `selectedFactionId` in the `databaseBrowserFilters` store. Mirror this in Unit Database with a "View stratagems →" link that navigates to `/rules-hub` and sets `selectedFactionId` in `rulesHubFilters`. Both Zustand stores already exist.

### ISSUE LINK-05 — Spending page has no link to Wishlist and vice versa
**WHERE:** `src/features/spending/SpendingPage.tsx`, `src/features/wishlist/WishlistPage.tsx`
**WHAT:** These two pages are conceptually linked (wishlist → buy → spending), but neither references the other. Marking a wishlist item as purchased requires manually navigating to Spending to log it.
**WHY IT MATTERS:** The user flow "I bought something from my wishlist" is broken into two disconnected actions with no prompting or shortcut.
**SUGGESTION:** In `WishlistItemRow` or `WishlistItemSheet`, add a "Mark as purchased" action that pre-fills the Spending add form with the item's name, cost, and faction. This would require a QuickAdd integration or a direct navigate with search params. At minimum, add a "View Spending" text link in Wishlist's `PageHeader` subtitle zone.

### ISSUE LINK-06 — Battle Log has no link to Army Lists or Game Day
**WHERE:** `src/features/battle-log/BattleLogPage.tsx`
**WHAT:** The Battle Log records game results. There is no link from a logged battle back to the army list used, nor a "Play Again" CTA that opens Game Day with the same list.
**WHY IT MATTERS:** After reviewing a battle log entry, the natural next action is "let me open the army list I used." This context is stored (`army_list_id` is on the battle record) but not surfaced.
**SUGGESTION:** In `BattleLogRow` or the battle detail view, add a "View Army List" link that navigates to `/army-lists/$listId` if `army_list_id` is set.

### ISSUE LINK-07 — Goals page has no links to the entities it tracks
**WHERE:** `src/features/goals/GoalsPage.tsx`, `src/features/goals/GoalCard.tsx`
**WHAT:** Goals track painting progress, unit purchases, battles won, etc. A goal card showing "Paint 10 units (7/10)" has no link to the Collection or Painting Projects pages. The user sees progress but must manually navigate to act on it.
**WHY IT MATTERS:** Goals are meant to drive action. Without CTAs pointing to the relevant feature page, goals become read-only dashboards rather than motivating navigation hubs.
**SUGGESTION:** Each `GoalCard` should show a contextual "Go paint →" or "View collection →" link based on `goal.type`. The goal type enum already exists — map it to target routes.

---

## 4. Scrollbar Status

**No custom scrollbar styling is defined anywhere in the codebase.**

`src/styles/globals.css` contains no `::-webkit-scrollbar`, `scrollbar-width`, or `scrollbar-color` declarations. The native browser/WebView scrollbars are used throughout.

**WHERE:** `src/styles/globals.css` (entire file), `src/components/common/AppLayout.tsx` line 24 (`overflow-auto`), `src/components/common/AppSidebar.tsx` line 152 (`overflow-y-auto`)

**Implications:**
- On macOS/Linux Tauri webview, scrollbars auto-hide and use the OS overlay style — this is generally fine and unobtrusive.
- On Windows (the primary dev platform per `env.Platform: win32`), the default Chromium scrollbar renders as a wide, visually heavy bar with the light grey track. This clashes with the dark zinc UI theme.
- The sidebar nav (`overflow-y-auto`) will show a native scrollbar if the nav items exceed the window height — which can happen with 14 items at small window heights (min is 600px). This scrollbar will be visually jarring against the card-background sidebar.

**SUGGESTION:** Add a minimal custom scrollbar rule to `globals.css`:

```css
/* Thin, theme-aware scrollbars */
* {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 3px;
}
```

This is a ~12-line addition with zero runtime cost and no component changes required.

---

## 5. Keyboard Navigation Gaps

### ISSUE KB-01 — Keyboard shortcuts exist only in Painting Mode; no global shortcuts documented
**WHERE:** `src/app/painting-mode/page.tsx` lines 116–119
**WHAT:** Four shortcuts exist: `Space` (mark done), `ArrowLeft` (previous step), `ArrowRight` (next step), `Escape` (exit). These are shown as `<kbd>` hints in `StepFocalView.tsx` lines 130, 145, 160 — but only for the arrow and space keys. `Escape` has no visible hint.
**WHY IT MATTERS:** A user discovering Painting Mode for the first time has no indication that Escape exits. The completion screen (ISSUE LINK-02) makes this especially dangerous — Escape is the only exit and it is completely undocumented in the UI at that point.
**SUGGESTION:** Add an `Escape` hint somewhere visible in Painting Mode UI (e.g., top-right corner: `<kbd>Esc</kbd> to exit`). This is a 2-line addition to `StepFocalView` or the parent `PaintingModeView`.

### ISSUE KB-02 — No keyboard shortcut to open Quick Add
**WHERE:** `src/components/common/AppSidebar.tsx` lines 83–148
**WHAT:** The Quick Add dropdown is mouse/click only. Common desktop apps bind `Cmd+N` or `Ctrl+N` to "New item." There is no global hotkey.
**WHY IT MATTERS:** Power users learn keyboard-first patterns. The Quick Add menu is the most used creation entry point — requiring a mouse click to open it creates unnecessary friction for experienced users.
**SUGGESTION:** Add `useHotkeys("mod+k", openQuickAdd)` at the AppLayout level (global scope). `mod+k` is a well-understood "command palette" convention that works on both Windows (`Ctrl+K`) and macOS (`Cmd+K`). Alternatively use `mod+n` for "new."

### ISSUE KB-03 — No keyboard shortcut to collapse/expand sidebar
**WHERE:** `src/components/common/AppSidebar.tsx` lines 226–240
**WHAT:** The collapse toggle button is mouse-only. The shadcn sidebar component referenced in `src/components/ui/sidebar.tsx` line 94 has a keyboard shortcut (Ctrl+B) but that component is not being used — HobbyForge uses a custom `AppSidebar` with `useSidebarCollapsed`.
**WHY IT MATTERS:** For users working in focused mode (e.g., comparing army lists and unit database), quickly collapsing the sidebar to reclaim 240px of horizontal space should be a single keypress, not a click hunt to a small icon.
**SUGGESTION:** Add `useHotkeys("mod+b", () => setCollapsed(!collapsed))` in `AppSidebar` or `AppLayout`. This matches the shadcn/ui sidebar keyboard convention documented in the existing `sidebar.tsx`.

### ISSUE KB-04 — No keyboard navigation for table/list items
**WHERE:** All page list components (CollectionPage, RecipesPage, PaintsPage, etc.)
**WHAT:** Row-level actions (edit, delete) require mouse interaction. No `onKeyDown` handlers exist on table rows. Arrow keys do not move between rows.
**WHY IT MATTERS:** Desktop-class apps (the target platform is Tauri desktop, not web) are expected to support keyboard navigation in lists. The `DataTable` pattern from shadcn/ui supports `tabIndex` and focus management, but it is not implemented here.
**SUGGESTION:** This is a larger undertaking. Minimum viable: ensure all interactive row elements (`Button` actions) are reachable via Tab key, which they already are as shadcn `Button` components. Full arrow-key row navigation is a Phase-level feature, not a quick fix.

---

## 6. Layout Consistency Issues

### ISSUE LAYOUT-01 — Page title font size is inconsistent across pages
**WHERE:**
- `src/components/common/PageHeader.tsx` line 24: `text-3xl font-semibold tracking-tight`
- `src/features/rules-hub/RulesHubPage.tsx` line 107: `text-3xl font-semibold tracking-tight` (raw `h1`, not PageHeader)
- `src/features/unit-database/DatabaseBrowserPage.tsx` line 191: `text-3xl font-semibold tracking-tight` (raw `h1`, not PageHeader)
- `src/app/settings/page.tsx` line 14: `text-xl font-semibold` (smaller, no `tracking-tight`)
- `src/features/data-health/DataHealthPage.tsx` line 23: `text-xl font-semibold` (smaller, no `tracking-tight`)

**WHAT:** Settings and Data Health use `text-xl` (20px) for their page titles. All other pages use `text-3xl` (30px) via `PageHeader`. Rules Hub and Unit Database use the correct `text-3xl` size but bypass `PageHeader` with raw `h1` tags, losing the `border-b border-border/40 pb-6 flex justify-between` layout contract.

**WHY IT MATTERS:** The visual hierarchy breaks. Settings and Data Health feel like subsections of another page, not top-level pages. Rules Hub and Unit Database miss the bottom separator that visually separates the header from page content on every other page.

**SUGGESTION:**
1. Migrate Settings (`src/app/settings/page.tsx` line 14) and Data Health (`src/features/data-health/DataHealthPage.tsx` line 23) to use `<PageHeader title="Settings" />` and `<PageHeader title="Data Health" />` respectively. This brings them to `text-3xl` with the border separator.
2. Migrate Rules Hub (`RulesHubPage.tsx` line 107) and Unit Database (`DatabaseBrowserPage.tsx` line 191) raw `h1` blocks to use `PageHeader`. These two pages already have the right font size but lack the `border-b` separator and the `flex justify-between` header layout. Wrapping their title + filter controls in `PageHeader` with an `actions` prop would add the separator and enable a consistent action zone.

### ISSUE LAYOUT-02 — PageHeader has no `back` prop; back buttons are implemented ad hoc
**WHERE:**
- `src/features/army-lists/ArmyListDetailPage.tsx` lines 548–554: `Button variant="ghost" size="sm"` with `ArrowLeft` above `PageHeader`
- `src/features/game-day/GameDayHeader.tsx` lines 31–37: `Button variant="ghost" size="icon"` with `ArrowLeft` (different size, different variant)
- `src/components/common/PageHeader.tsx` lines 14–18: no `back` prop exists

**WHAT:** Army List Detail uses `variant="ghost" size="sm"` back button. Game Day uses `variant="ghost" size="icon"` back button. They render identically to the user but use different sizes. Neither approach is wrong, but they live outside PageHeader's layout contract.

**WHY IT MATTERS:** If a third or fourth drill-down page is added, the ad hoc back button pattern will proliferate. Each implementor makes a slightly different choice on size, spacing, and label text.

**SUGGESTION:** Add an optional `back?: { label: string; to: string }` prop to `PageHeader`. When provided, renders an `ArrowLeft` + label above the title. This centralises the back-navigation pattern and ensures consistent sizing across all detail pages.

### ISSUE LAYOUT-03 — Painting Mode "assignment not found" error state has no back navigation
**WHERE:** `src/app/painting-mode/page.tsx` lines 127–138
**WHAT:** The error state for an invalid assignment renders a centered message ("The painting assignment could not be found.") with no button to navigate away. The page uses `bareLayoutRoute` — there is no sidebar. Escape keyboard shortcut also does nothing since `enabled` is false when `!assignment`.

**WHY IT MATTERS:** If a user lands on `/painting-mode/99999` (stale bookmark, deleted assignment), they are completely stuck. No back button, no sidebar, no working keyboard shortcut.

**SUGGESTION:** Add a `Button` to the error state:
```tsx
<Button variant="outline" onClick={() => navigate({ to: "/painting-projects" })}>
  Back to Painting Projects
</Button>
```
Also ensure `useHotkeys("escape", ...)` is registered unconditionally with its own navigate handler (not gated behind `enabled`).

### ISSUE LAYOUT-04 — Main content area uses system default scrollbar; no overflow padding
**WHERE:** `src/components/common/AppLayout.tsx` line 24: `<main className="flex-1 overflow-auto">`
**WHAT:** Page content scrolls with no right-side padding buffer. When a page scrolls, the scrollbar appears flush against the right edge of the content. Pages that use `p-6` (24px padding) on their content container get the padding on left/right, but the scrollbar overlays on top of the right padding, visually eating into content on Windows where scrollbars are non-overlay.
**WHY IT MATTERS:** On Windows, the 15px native scrollbar will overlap the `p-6` right padding, causing content to appear to have 9px of right clearance instead of 24px. This is especially visible in tables and card grids.
**SUGGESTION:** Combine with the scrollbar styling fix from section 4. Using `scrollbar-width: thin` reduces the scrollbar to 6px on Windows, which is well within the 24px padding budget and eliminates the visual crowding.

---

## Summary of Priority

| Priority | Issue | Effort | Impact |
|---|---|---|---|
| P1 | LINK-02 — Painting Mode all-complete state is a dead end | Low | High |
| P1 | LAYOUT-03 — Painting Mode "not found" is a dead end | Low | High |
| P1 | LAYOUT-01 — Settings/DataHealth title inconsistency | Low | High |
| P1 | Scrollbar styling (Section 4) | Low | High (Windows) |
| P2 | LINK-01 — Painting Mode exit always goes to Dashboard | Medium | High |
| P2 | NAV-01 — No visual group separation in collapsed sidebar | Low | Medium |
| P2 | LINK-03 — Collection has no link to Unit Database | Medium | High |
| P2 | LINK-04 — Rules Hub / Unit Database cross-link missing | Low | Medium |
| P2 | NAV-03 — Game Day does not highlight sidebar item | Low | Medium |
| P3 | KB-01 — Escape has no visible hint in Painting Mode | Low | Medium |
| P3 | KB-02 — No global Quick Add keyboard shortcut | Low | Medium |
| P3 | LAYOUT-02 — PageHeader lacks `back` prop | Medium | Low |
| P3 | LINK-05 — Wishlist/Spending not cross-linked | Medium | Medium |
| P3 | LINK-06 — Battle Log has no army list link | Low | Low |
| P3 | LINK-07 — Goals have no action CTAs | Medium | Medium |
| P3 | NAV-02 — Settings orphaned from nav groups | Low | Low |
| Backlog | KB-03 — Sidebar collapse keyboard shortcut | Low | Low |
| Backlog | KB-04 — List keyboard navigation | High | Medium |
