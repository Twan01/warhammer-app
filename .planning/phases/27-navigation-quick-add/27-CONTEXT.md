# Phase 27: Navigation & Quick Add - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Rename sidebar group labels to hobby-native names (Command / Workshop / Play / Management), add a Quick Add dropdown button to the sidebar with 8 creation actions, and ensure each action opens its corresponding create Sheet as an overlay on the current page without navigation. No new database tables, no new CRUD — all target Sheets already exist.

</domain>

<decisions>
## Implementation Decisions

### Sidebar Group Naming (NAV-01)
- Rename the 3 existing groups + add a 4th:
  - **Command** (was "Manage"): Dashboard, Collection, Projects
  - **Workshop** (was "Inventory"): Paints, Recipes
  - **Play** (was "Tracking" minus Spending): Army Lists, Battle Log
  - **Management** (new group): Factions, Spending
- Factions moves from the old "Manage" group to "Management"
- Spending moves from the old "Tracking" group to "Management"
- Group label rendering unchanged (hidden when collapsed, uppercase text-xs tracking-widest)

### Quick Add Button Placement (NAV-02)
- Position: below the wordmark row, above the first nav group ("Command") — always visible regardless of scroll
- Style: `Button` variant="outline" with Plus icon + "Quick Add" text
- Collapsed state: icon-only `Button` (Plus icon centered), same position
- Trigger: click opens a `DropdownMenu` (shadcn — needs to be added: `npx shadcn@latest add dropdown-menu`)
- The button is visually distinct from nav items — slightly larger padding, maybe `border-dashed` or accent border to draw attention

### Quick Add Menu Actions (NAV-02)
- 8 actions in the dropdown, grouped logically:
  1. **Add Unit** — Package icon → opens `UnitSheet` in create mode
  2. **Add Faction** — Shield icon → opens `FactionSheet` in create mode
  3. **Add Paint** — Droplets icon → opens `PaintSheet` in create mode
  4. **Add Recipe** — BookOpen icon → opens `RecipeFormSheet` in create mode
  5. **Create Project** — Palette icon → opens `AddProjectPicker`
  6. **Log Session** — Paintbrush icon → opens `LogSessionSheet`
  7. **Add Purchase** — Wallet icon → opens `UnitSheet` in create mode with cost field visible (Claude's discretion on exact flow)
  8. **Log Battle** — Swords icon → opens `BattleLogSheet` in create mode
- Dropdown uses `DropdownMenuSeparator` between logical groups: [Unit, Faction] | [Paint, Recipe] | [Project, Session] | [Purchase, Battle]

### Sheet Overlay Wiring (NAV-03)
- **Global Quick Add context**: a `QuickAddProvider` React context wrapping the app (in AppLayout or main.tsx) that:
  - Holds state: `activeSheet: QuickAddAction | null`
  - Provides: `openQuickAdd(action: QuickAddAction)` and `closeQuickAdd()` functions
  - `QuickAddAction` = union type of the 8 action identifiers
- **Global sheet mount point**: all 8 Sheet components mounted once at the AppLayout level (sibling portal pattern — same as Dashboard's existing pattern but app-wide)
- **Page-level deduplication**: pages that already mount their own create Sheet (e.g. CollectionPage's UnitSheet) can either:
  - Share the global instance via context (preferred — avoid double mounts)
  - Keep their own instance if the usage is more complex (e.g. edit mode)
  - Claude's discretion on the exact deduplication strategy per page
- **Props pattern**: all Sheets use `{ open, onClose }` consistently — context simply controls the `open` boolean for each
- **No navigation**: sheets are overlays — the URL and underlying page do not change when Quick Add is triggered

### Claude's Discretion
- Exact "Add Purchase" flow — whether it opens UnitSheet with cost pre-focused, a PaintSheet, or a lightweight dedicated form
- Whether to use `border-dashed` or another visual treatment to distinguish Quick Add button from nav items
- Deduplication approach for pages that already mount create Sheets — share global vs keep local
- DropdownMenu grouping separators — exact visual grouping of the 8 items
- Quick Add button icon choice when collapsed — Plus or CirclePlus
- Whether QuickAddProvider lives in AppLayout or wraps at main.tsx level

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §NAV-01..03 — Acceptance criteria for sidebar rename, Quick Add dropdown, and overlay Sheet flows

### Phase 25/26 outputs (design system prerequisites)
- `.planning/phases/25-design-foundation/25-CONTEXT.md` — PageHeader API, StatusBadge, design token names
- `.planning/phases/26-dashboard-redesign/26-CONTEXT.md` — Sibling portal pattern, LogSessionSheet creation, Quick Add button on Dashboard (DASH-02)

### Existing sidebar code to modify
- `src/components/common/AppSidebar.tsx` — Current nav groups (MANAGE_NAV, INVENTORY_NAV, TRACKING_NAV), wordmark, collapse logic
- `src/components/common/NavItem.tsx` — Individual nav item component
- `src/components/common/useSidebarCollapsed.ts` — Sidebar collapsed state hook

### Existing Sheet components (all targets for Quick Add)
- `src/features/units/UnitSheet.tsx` — Unit create/edit Sheet (open, unit?, onClose props)
- `src/features/factions/FactionSheet.tsx` — Faction create/edit Sheet
- `src/features/paints/PaintSheet.tsx` — Paint create/edit Sheet
- `src/features/recipes/RecipeFormSheet.tsx` — Recipe create/edit Sheet
- `src/features/painting-projects/AddProjectPicker.tsx` — Project creation picker (controlled-props pattern)
- `src/features/dashboard/LogSessionSheet.tsx` — Log painting session (from Phase 26 DASH-02)
- `src/features/battle-log/BattleLogSheet.tsx` — Battle log create/edit Sheet
- `src/features/army-lists/ArmyListSheet.tsx` — Army list create/edit Sheet (for "Add Purchase" fallback)

### Out of Scope (per REQUIREMENTS.md)
- `.planning/REQUIREMENTS.md` §Out of Scope — "Command palette (Cmd+K)" explicitly rejected; dropdown Quick Add is the chosen interaction model

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AppSidebar.tsx`: group labels are inline `<p>` elements with `text-xs font-semibold text-muted-foreground uppercase tracking-widest` — same styling preserved, only text changes
- `LogSessionSheet`: already built in Phase 26 (DASH-02) — one of the 8 Quick Add targets
- All 7 other Sheet components exist with consistent `{ open, onClose }` prop patterns
- `AddProjectPicker`: uses controlled-props pattern (`open: controlledOpen`) with `??` fallback — needs careful wiring for global context

### Established Patterns
- Sibling portal pattern: sheets mounted as top-level siblings, never nested inside other Radix portals
- `selectedUnitId` pattern for detail/edit sheets — not needed for create-mode Quick Add (no selection step)
- Nav groups are `const` arrays with `{ to, label, icon }` shape — group membership change is just moving items between arrays
- Sidebar collapse: `useSidebarCollapsed` hook (localStorage) — Quick Add button must handle both collapsed and expanded states

### Integration Points
- `AppSidebar.tsx` — Quick Add button and DropdownMenu added here
- `AppLayout.tsx` or equivalent — QuickAddProvider wraps app, global Sheet instances mounted as siblings
- `src/components/ui/` — DropdownMenu needs to be installed (`npx shadcn@latest add dropdown-menu`)
- Pages with existing create Sheets — may need refactoring to use global context instead of local state

</code_context>

<specifics>
## Specific Ideas

- NAV-01 group names are prescriptive from requirements: "Command", "Workshop", "Play", "Management" — no creative freedom on naming
- Quick Add must work identically whether sidebar is expanded or collapsed (dropdown anchors to the button either way)
- The 8 actions map 1:1 to existing Sheet components — no new forms or schemas needed
- "Add Purchase" is the only ambiguous action — all others have a clear single Sheet target

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 27-navigation-quick-add*
*Context gathered: 2026-05-05*
