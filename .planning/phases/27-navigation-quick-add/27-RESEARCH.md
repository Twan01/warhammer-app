# Phase 27: Navigation & Quick Add - Research

**Researched:** 2026-05-05
**Domain:** React Context, shadcn/ui DropdownMenu, sidebar restructure, Sheet overlay wiring
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**NAV-01 — Sidebar group rename:**
- Command (was "Manage"): Dashboard, Collection, Projects
- Workshop (was "Inventory"): Paints, Recipes
- Play (was "Tracking" minus Spending): Army Lists, Battle Log
- Management (new group): Factions, Spending
- Factions moves from MANAGE_NAV to Management group
- Spending moves from TRACKING_NAV to Management group
- Group label rendering unchanged (hidden when collapsed, uppercase text-xs tracking-widest)

**NAV-02 — Quick Add button:**
- Position: below the wordmark row, above the first nav group ("Command") — always visible regardless of scroll
- Style: Button variant="outline" with Plus icon + "Quick Add" text (expanded); icon-only Plus (collapsed)
- Trigger: click opens a DropdownMenu (shadcn — needs install: `pnpm dlx shadcn@latest add dropdown-menu`)
- Visually distinct from nav items: slightly larger padding, border-dashed or accent border
- 8 actions with separators between logical groups: [Unit, Faction] | [Paint, Recipe] | [Project, Session] | [Purchase, Battle]

**NAV-02 — Quick Add actions:**
1. Add Unit — Package icon → UnitSheet create mode
2. Add Faction — Shield icon → FactionSheet create mode
3. Add Paint — Droplets icon → PaintSheet create mode
4. Add Recipe — BookOpen icon → RecipeFormSheet create mode
5. Create Project — Palette icon → AddProjectPicker
6. Log Session — Paintbrush icon → LogSessionSheet
7. Add Purchase — Wallet icon → (exact flow at Claude's discretion)
8. Log Battle — Swords icon → BattleLogSheet create mode

**NAV-03 — Sheet overlay wiring:**
- QuickAddProvider React context wrapping the app (AppLayout or main.tsx)
- State: `activeSheet: QuickAddAction | null`
- Exposes: `openQuickAdd(action: QuickAddAction)` and `closeQuickAdd()`
- All 8 Sheet components mounted once at AppLayout level as siblings
- Pages with existing create Sheets: Claude's discretion on deduplication strategy

### Claude's Discretion
- Exact "Add Purchase" flow
- Whether to use border-dashed or another visual treatment for Quick Add button
- Deduplication approach for pages that already mount create Sheets
- DropdownMenu grouping separators exact visual grouping
- Quick Add button icon when collapsed: Plus or CirclePlus
- Whether QuickAddProvider lives in AppLayout or wraps at main.tsx level

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | Sidebar group labels renamed to hobby-native names: Command, Workshop, Play, Management with specific route membership | CONTEXT.md locked the exact membership; AppSidebar.tsx const arrays are the sole change surface |
| NAV-02 | Quick Add button in sidebar opens DropdownMenu with 8 creation actions | DropdownMenu not yet installed; button placement and collapse-state handling verified in AppSidebar code |
| NAV-03 | Each Quick Add action opens the corresponding create Sheet as an overlay — user stays on current page | QuickAddProvider pattern modelled on ActiveFactionContext; sibling portal pattern already established in DashboardPage |
</phase_requirements>

---

## Summary

Phase 27 is a self-contained sidebar and global overlay upgrade with no new database tables, migrations, or query modules. All complexity lives in the React layer: (1) reorganising three const arrays in `AppSidebar.tsx`, (2) installing and wiring `DropdownMenu`, and (3) introducing a `QuickAddProvider` context that controls which of 8 Sheet overlays is visible at any time.

The most important architectural decision is where the Sheet mount point lives. The project's established rule is that Sheets must be top-level siblings (never nested Radix portals). `AppLayout` already wraps the entire route tree and is the natural home for a global mount point — but it currently has no state. Moving the Sheets there means `QuickAddProvider` must be inserted between `AppLayout` and `AppSidebar` so the sidebar's Quick Add button can call `openQuickAdd()`, and `AppLayout`'s JSX mounts the Sheet siblings adjacent to `<main>`. Alternatively, `QuickAddProvider` can wrap at `main.tsx` level (outside the router), which is simpler but means the context is available to all routes including the router's root component — this mirrors the existing `ActiveFactionProvider` placement inside the root route component.

The deduplication concern for pages that already own a create Sheet (CollectionPage owns `UnitSheet` in create mode, for example) is real but low-risk for Phase 27: Quick Add create Sheets are distinct from the page's own edit Sheet. The `key="quick-add"` pattern already used on `DashboardPage` (separate React instance via key prop) is the cleanest path and avoids any refactoring of existing pages.

**Primary recommendation:** Add `QuickAddProvider` inside `AppLayout` (wrapping `AppSidebar` + `main`), mount all 8 Sheet siblings inside `AppLayout`'s JSX, and use `key="quick-add-*"` to keep global Sheet instances separate from per-page edit Sheet instances.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui DropdownMenu | via `pnpm dlx shadcn@latest add dropdown-menu` | Quick Add trigger menu | Project uses shadcn exclusively; DropdownMenu uses Radix under the hood, consistent with all other shadcn primitives |
| React Context | React 19 (already installed) | QuickAddProvider state | Same pattern as `ActiveFactionContext` already in `src/context/` |
| Lucide React | already installed | Quick Add item icons | All icons are already available: Package, Shield, Droplets, BookOpen, Palette, Paintbrush, Wallet, Swords, Plus, CirclePlus |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Sheet | already installed | All 8 target Sheet components | Already used for all create/edit forms |
| shadcn/ui Button | already installed | Quick Add button trigger | Variant="outline" per CONTEXT.md |
| shadcn/ui Tooltip | already installed | Quick Add button tooltip when collapsed | Already used in NavItem collapsed state |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Context for QuickAddProvider | Zustand store | Zustand is lighter but context is the established pattern for global UI state in this codebase (ActiveFactionProvider); no external dependency needed |
| DropdownMenu (Radix-based) | Popover + manual list | DropdownMenu provides correct keyboard nav, focus trapping, and close-on-outside-click for free; Popover would require reimplementing those |

**Installation (DropdownMenu only — all other deps already present):**
```bash
pnpm dlx shadcn@latest add dropdown-menu
```

This creates `src/components/ui/dropdown-menu.tsx` (consistent with project structure).

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. All changes are within existing modules:

```
src/
  context/
    ActiveFactionContext.tsx     # existing — model for QuickAddContext
    QuickAddContext.tsx           # NEW — QuickAddProvider + useQuickAdd hook
  components/
    common/
      AppSidebar.tsx              # MODIFIED — group rename + Quick Add button
      AppLayout.tsx               # MODIFIED — QuickAddProvider wrapping + Sheet mount point
  features/
    spending/SpendingPage.tsx    # check: already has own Sheet? verify dedup need
    factions/FactionsPage.tsx    # check: already has FactionSheet in create mode?
    paints/PaintsPage.tsx        # check: already has PaintSheet in create mode?
    recipes/RecipesPage.tsx      # check: already has RecipeFormSheet?
```

### Pattern 1: QuickAddProvider (modelled on ActiveFactionContext)

**What:** A React context that holds a single `activeSheet` discriminant. Any component can call `openQuickAdd(action)` to trigger the corresponding Sheet.

**When to use:** Whenever a Quick Add button anywhere in the app (sidebar, future page shortcuts) needs to open a Sheet without navigating or lifting state through props.

**Example (modelled exactly on src/context/ActiveFactionContext.tsx):**
```typescript
// src/context/QuickAddContext.tsx

export type QuickAddAction =
  | "add-unit"
  | "add-faction"
  | "add-paint"
  | "add-recipe"
  | "create-project"
  | "log-session"
  | "add-purchase"
  | "log-battle";

interface QuickAddState {
  activeSheet: QuickAddAction | null;
  openQuickAdd: (action: QuickAddAction) => void;
  closeQuickAdd: () => void;
}

const QuickAddContext = createContext<QuickAddState | null>(null);

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [activeSheet, setActiveSheet] = useState<QuickAddAction | null>(null);
  const openQuickAdd = (action: QuickAddAction) => setActiveSheet(action);
  const closeQuickAdd = () => setActiveSheet(null);
  return (
    <QuickAddContext.Provider value={{ activeSheet, openQuickAdd, closeQuickAdd }}>
      {children}
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd(): QuickAddState {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd must be used within QuickAddProvider");
  return ctx;
}
```

### Pattern 2: Global Sheet Mount Point in AppLayout

**What:** `AppLayout` renders the provider, wraps children, and mounts all 8 Sheet siblings adjacent to `<main>`. Uses `key="quick-add-*"` to create separate React instances from any per-page edit Sheets.

**When to use:** Enforces the sibling portal contract — no Sheet is nested inside another Radix portal.

**Example:**
```typescript
// src/components/common/AppLayout.tsx

export function AppLayout({ children }: { children: ReactNode }) {
  const { activeSheet, closeQuickAdd } = useQuickAdd();
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen bg-background text-foreground">
        <AppSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      {/* Global Quick Add Sheet siblings — sibling portal contract */}
      <UnitSheet key="quick-add-unit"
        open={activeSheet === "add-unit"} unit={null} onClose={closeQuickAdd} />
      <FactionSheet key="quick-add-faction"
        open={activeSheet === "add-faction"} faction={null} onClose={closeQuickAdd} />
      <PaintSheet key="quick-add-paint"
        open={activeSheet === "add-paint"} paint={null} onClose={closeQuickAdd} />
      <RecipeFormSheet key="quick-add-recipe"
        open={activeSheet === "add-recipe"} recipe={null} onClose={closeQuickAdd} />
      <AddProjectPicker
        open={activeSheet === "create-project"} onOpenChange={(o) => !o && closeQuickAdd()} />
      <LogSessionSheet key="quick-add-session"
        open={activeSheet === "log-session"} onClose={closeQuickAdd} />
      <BattleLogSheet key="quick-add-battle"
        open={activeSheet === "log-battle"} log={null} onClose={closeQuickAdd} />
      {/* Add Purchase — see Open Questions for exact mapping */}
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  );
}
```

**Critical:** `QuickAddProvider` must wrap `AppLayout`'s body — either:
- Option A: `QuickAddProvider` wraps in `main.tsx` (outside `RouterProvider`) — consistent with `QueryProvider` placement
- Option B: `QuickAddProvider` wraps inside `AppLayout`'s JSX, and `AppLayout` reads context via `useQuickAdd()` — requires the provider to wrap the component that calls the hook

Option A is simpler: `QuickAddProvider` in `main.tsx` alongside `QueryProvider`, `AppLayout` calls `useQuickAdd()`. Option B puts provider and consumer in the same file, requiring a thin inner component to call the hook. **Recommend Option A** (same pattern as `QueryProvider`).

### Pattern 3: Sidebar Restructure (NAV-01)

**What:** Move items between const arrays and rename group labels. Pure text/array changes — no new components.

**Current state:**
```
MANAGE_NAV:   Dashboard, Factions, Collection, Painting Projects
INVENTORY_NAV: Paints, Recipes
TRACKING_NAV: Army Lists, Battle Log, Spending
```

**Target state:**
```
COMMAND_NAV:    Dashboard, Collection, Painting Projects
WORKSHOP_NAV:   Paints, Recipes
PLAY_NAV:       Army Lists, Battle Log
MANAGEMENT_NAV: Factions, Spending
```

Group label `<p>` elements change text only: "Manage" → "Command", "Inventory" → "Workshop", "Tracking" → "Play", + new "Management" label before the 4th group.

### Pattern 4: Quick Add Button in Sidebar (NAV-02)

**What:** A `Button` + `DropdownMenu` mounted between the wordmark and the first nav group. Uses `collapsed` prop from `useSidebarCollapsed` to switch between full and icon-only variants.

**Key concerns:**
- The button sits inside the `<aside>` — the DropdownMenu popup must escape the sidebar's overflow constraints. Radix DropdownMenu uses a portal by default, so the menu renders outside the `<aside>` DOM node. No special handling needed.
- Collapsed state: icon-only `Button` renders a `CirclePlus` or `Plus`. When collapsed, the sidebar is 48px wide — the DropdownMenu will still open (portal escapes width constraint).
- Tooltip for collapsed button: wrap in `Tooltip` (same pattern as `NavItem`) to show "Quick Add" on hover.

**DropdownMenu structure:**
```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" ...>
      {collapsed ? <Plus /> : <><Plus /> Quick Add</>}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent side="right" align="start" sideOffset={8}>
    <DropdownMenuItem onClick={() => openQuickAdd("add-unit")}>
      <Package /> Add Unit
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => openQuickAdd("add-faction")}>
      <Shield /> Add Faction
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => openQuickAdd("add-paint")}>
      <Droplets /> Add Paint
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => openQuickAdd("add-recipe")}>
      <BookOpen /> Add Recipe
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => openQuickAdd("create-project")}>
      <Palette /> Create Project
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => openQuickAdd("log-session")}>
      <Paintbrush /> Log Session
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => openQuickAdd("add-purchase")}>
      <Wallet /> Add Purchase
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => openQuickAdd("log-battle")}>
      <Swords /> Log Battle
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

`side="right"` places the dropdown to the right of the sidebar button (avoids clipping against the sidebar's left edge). When the sidebar is expanded at 240px, `side="bottom"` or `side="right"` both work.

### Anti-Patterns to Avoid

- **Nesting sheets inside portals:** All 8 Quick Add Sheets MUST be siblings of `<main>`, never inside the sidebar `<aside>` JSX tree.
- **Passing `openQuickAdd` as prop through the component tree:** Use `useQuickAdd()` hook at the call site — AppSidebar calls it directly.
- **Using `open={activeSheet !== null}` with a single generic Sheet:** Each action maps to a distinct Sheet component — use 8 separate boolean comparisons.
- **Forgetting to reset form state on close:** All 8 Sheets use `useEffect` with `open` dependency to reset form (existing pattern in all Sheet components) — this is already handled by each Sheet internally, but only when `unit={null}` / `recipe={null}` etc. is passed correctly.
- **AddProjectPicker dedup pitfall:** `AddProjectPicker` uses controlled-props with `??` fallback (see Phase 20 decisions). Passing `open={activeSheet === "create-project"}` as the controlled prop and `onOpenChange={(o) => !o && closeQuickAdd()}` correctly hands off close responsibility.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown menu with keyboard nav | Custom div + click handlers | `DropdownMenu` from shadcn | Radix handles focus, keyboard arrows, Escape, outside-click; reimplementing these is error-prone |
| Sheet open/close dispatch | Redux / event emitter | React Context (QuickAddProvider) | Context is the project pattern; already used for ActiveFactionContext with same shape |
| Sidebar portal escape | Manual z-index tricks | Radix DropdownMenu portal (built-in) | DropdownMenu content renders in a portal by default — no extra work needed |

**Key insight:** The entire phase is wiring together already-built pieces. The only new artifact is `QuickAddContext.tsx` (< 40 lines) and `dropdown-menu.tsx` (shadcn generated). Everything else is configuration of existing components.

---

## Common Pitfalls

### Pitfall 1: QuickAddProvider Below AppSidebar in the Tree
**What goes wrong:** `AppSidebar` calls `useQuickAdd()`, but `QuickAddProvider` is mounted as a child of `AppSidebar`'s parent — or worse, only wraps `<main>`. The hook throws "must be used within QuickAddProvider".
**Why it happens:** Provider placement is easy to get wrong when the consumer (sidebar) and the mount point (layout) are siblings.
**How to avoid:** Mount `QuickAddProvider` in `main.tsx` wrapping `RouterProvider` — same level as `QueryProvider`. Both `AppSidebar` and `AppLayout` are descendants and can call `useQuickAdd()`.
**Warning signs:** Runtime error "useQuickAdd must be used within QuickAddProvider" on app start.

### Pitfall 2: Sheet Siblings Nested Inside `<aside>`
**What goes wrong:** Developer puts the 8 Sheet components inside `AppSidebar`'s JSX for co-location. Radix Sheet portals render correctly at DOM level but the component tree creates unexpected lifecycle coupling — form state shared between nav rerenders.
**Why it happens:** Feels natural to co-locate trigger and target.
**How to avoid:** Sheets go in `AppLayout`, not `AppSidebar`. AppSidebar only calls `openQuickAdd()` — it never renders Sheets.
**Warning signs:** Sheet briefly flickers or form state persists after close when sidebar collapses.

### Pitfall 3: DropdownMenu Clipped by Sidebar Overflow
**What goes wrong:** In some CSS layouts, `overflow: hidden` or `overflow-y: auto` on `<aside>` clips the Radix portal. Radix escapes via `document.body` by default but if sidebar has `transform` or `will-change` set, the stacking context can trap the portal.
**Why it happens:** The sidebar uses `transition-[width]` which does NOT create a stacking context (only `transform`, `opacity < 1`, `filter` do). So this should NOT be a problem here.
**How to avoid:** Verify by inspection — the existing `transition-[width] duration-200` is safe. If issues appear, add `data-side="right"` and confirm Radix is rendering to `document.body`.
**Warning signs:** Dropdown appears truncated or invisible when sidebar is at 240px.

### Pitfall 4: Deduplication Double-Mount for CollectionPage UnitSheet
**What goes wrong:** CollectionPage renders its own `<UnitSheet>` in create mode (when `editingUnit === null`). Global Quick Add also renders `<UnitSheet key="quick-add-unit">`. Both can be open simultaneously if a user clicks Quick Add while CollectionPage has its own create Sheet visible (edge case, but bad UX).
**Why it happens:** Two independent `open` booleans control two separate instances.
**How to avoid:** Quick Add's `key="quick-add-unit"` creates a React instance separate from CollectionPage's `key` (implicit or explicit). This is acceptable for Phase 27 — the two Sheet instances are independent. A user cannot trigger both simultaneously without deliberate effort (they'd have to be on CollectionPage with no create Sheet open, then use the sidebar Quick Add). Do not refactor CollectionPage for Phase 27.
**Warning signs:** None — this is intentional coexistence, not a bug.

### Pitfall 5: AddProjectPicker onOpenChange vs onClose Prop Mismatch
**What goes wrong:** `AddProjectPicker` uses `onOpenChange?: (open: boolean) => void` (not `onClose: () => void`). Passing `onClose={closeQuickAdd}` directly doesn't exist on that component's interface.
**Why it happens:** `AddProjectPicker` was designed with the controlled-props pattern (`open: controlledOpen ?? internalOpen`, `setOpen = controlledOnOpenChange ?? setInternalOpen`).
**How to avoid:** Wire it as `onOpenChange={(o) => { if (!o) closeQuickAdd(); }}`. This correctly delegates close to `closeQuickAdd` when the picker closes itself.
**Warning signs:** TypeScript type error "Property 'onClose' does not exist on type AddProjectPickerProps".

### Pitfall 6: Existing AppSidebar Tests Break on Group Label Rename
**What goes wrong:** `tests/theming/AppSidebar.test.tsx` currently tests for "Spending" nav label. After NAV-01, the group containing Spending changes from TRACKING_NAV to MANAGEMENT_NAV — the label text is unchanged, but if any test asserts group membership by label text order, it will fail.
**Why it happens:** The test file at `tests/theming/AppSidebar.test.tsx` has SPEND-03 tests that check Spending is present and has href="/spending". These should still pass. The test at `tests/app-shell/AppSidebar.test.tsx` checks original Phase 1 nav entries — no group-label assertions, so also fine.
**How to avoid:** After renaming the groups, run `pnpm test -- tests/theming/AppSidebar.test.tsx tests/app-shell/AppSidebar.test.tsx` to confirm.
**Warning signs:** Test failures mentioning "Manage", "Inventory", or "Tracking" group label text.

---

## Code Examples

### DropdownMenuItem with icon (shadcn pattern)
```typescript
// Source: shadcn/ui DropdownMenu docs
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

<DropdownMenuItem onClick={() => openQuickAdd("add-unit")}>
  <Package className="mr-2 h-4 w-4" />
  Add Unit
</DropdownMenuItem>
```

### QuickAddProvider placement in main.tsx
```typescript
// src/main.tsx
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryProvider>
      <QuickAddProvider>
        <RouterProvider router={router} />
      </QuickAddProvider>
    </QueryProvider>
  </React.StrictMode>
);
```

### AppLayout with Sheet siblings
```typescript
// src/components/common/AppLayout.tsx
export function AppLayout({ children }: { children: ReactNode }) {
  const { activeSheet, closeQuickAdd } = useQuickAdd();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen bg-background text-foreground">
        <AppSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      {/* Global Quick Add Sheet siblings — sibling portal contract */}
      <UnitSheet key="quick-add-unit"
        open={activeSheet === "add-unit"} unit={null} onClose={closeQuickAdd} />
      <FactionSheet key="quick-add-faction"
        open={activeSheet === "add-faction"} faction={null} onClose={closeQuickAdd} />
      <PaintSheet key="quick-add-paint"
        open={activeSheet === "add-paint"} paint={null} onClose={closeQuickAdd} />
      <RecipeFormSheet key="quick-add-recipe"
        open={activeSheet === "add-recipe"} recipe={null} onClose={closeQuickAdd} />
      <AddProjectPicker
        open={activeSheet === "create-project"}
        onOpenChange={(o) => { if (!o) closeQuickAdd(); }} />
      <LogSessionSheet key="quick-add-session"
        open={activeSheet === "log-session"} onClose={closeQuickAdd} />
      <BattleLogSheet key="quick-add-battle"
        open={activeSheet === "log-battle"} log={null} onClose={closeQuickAdd} />
      {/* Add Purchase: UnitSheet in create mode (same as add-unit for Phase 27) */}
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  );
}
```

### Collapsed Quick Add button with tooltip
```typescript
// AppSidebar.tsx — inside the nav section, between wordmark and COMMAND_NAV
{collapsed ? (
  <Tooltip>
    <TooltipTrigger asChild>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="mx-auto my-2"
          aria-label="Quick Add"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
    </TooltipTrigger>
    <TooltipContent side="right">Quick Add</TooltipContent>
  </Tooltip>
) : (
  <DropdownMenuTrigger asChild>
    <Button
      variant="outline"
      className="w-full my-2 border-dashed justify-start gap-2"
    >
      <Plus className="h-4 w-4 shrink-0" />
      Quick Add
    </Button>
  </DropdownMenuTrigger>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-page create Sheet state (local useState) | Global QuickAddProvider context (Phase 27) | Phase 27 | Quick Add in sidebar without prop drilling |
| Group labels: Manage / Inventory / Tracking | Command / Workshop / Play / Management | Phase 27 | Hobby-native naming |
| No global Quick Add entry point | Quick Add button in sidebar | Phase 27 | Creates any entity from any page |

**Deprecated/outdated:**
- MANAGE_NAV, INVENTORY_NAV, TRACKING_NAV constant names in `AppSidebar.tsx` — replaced by COMMAND_NAV, WORKSHOP_NAV, PLAY_NAV, MANAGEMENT_NAV
- Group label text "Manage", "Inventory", "Tracking" — replaced by locked names

---

## Open Questions

1. **"Add Purchase" exact flow**
   - What we know: CONTEXT.md says Claude's discretion; options are UnitSheet with cost field visible, a PaintSheet, or a lightweight dedicated form
   - What's unclear: Whether to create a third Sheet instance for the same UnitSheet component, or map it to a different Sheet
   - Recommendation: Map "add-purchase" to `UnitSheet` in create mode (same as "add-unit") — simplest, no new form needed. The distinction between "Add Unit" and "Add Purchase" is intent, not form shape. If the user logs a purchase they'd fill the cost field. Use `key="quick-add-purchase"` so it's a separate React instance. The QuickAdd union type simply has two actions that both render `<UnitSheet open={...} unit={null} .../>`.

2. **QuickAddProvider placement: main.tsx vs AppLayout**
   - What we know: Both work. main.tsx is cleaner (follows QueryProvider pattern). AppLayout requires an inner component pattern to avoid the hook-called-outside-provider error.
   - Recommendation: main.tsx. Exactly one line change: wrap `RouterProvider` in `<QuickAddProvider>`.

3. **"Add Purchase" as separate Sheet instance in AppLayout**
   - What we know: QuickAddAction union has 8 members including "add-purchase". AppLayout renders a Sheet for each distinct action.
   - Recommendation: Render `<UnitSheet key="quick-add-purchase" open={activeSheet === "add-purchase"} unit={null} onClose={closeQuickAdd} />` as a separate sibling — separate React instance, independent form state, same Sheet component. This is 1 extra line in AppLayout and requires no new component.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (inferred from `pnpm test` in CLAUDE.md) |
| Quick run command | `pnpm test -- tests/app-shell/AppSidebar.test.tsx tests/theming/AppSidebar.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | Sidebar renders "Command", "Workshop", "Play", "Management" group labels | unit | `pnpm test -- tests/navigation/AppSidebar.nav01.test.tsx` | ❌ Wave 0 |
| NAV-01 | Factions link appears in Management group (after Army Lists/Battle Log group, before Spending) | unit | same file | ❌ Wave 0 |
| NAV-01 | No "Manage", "Inventory", "Tracking" labels remain | unit | same file | ❌ Wave 0 |
| NAV-02 | "Quick Add" button renders in expanded sidebar | unit | `pnpm test -- tests/navigation/QuickAdd.nav02.test.tsx` | ❌ Wave 0 |
| NAV-02 | Icon-only button renders when collapsed | unit | same file | ❌ Wave 0 |
| NAV-02 | Clicking Quick Add opens dropdown with 8 labeled items | unit | same file | ❌ Wave 0 |
| NAV-03 | Clicking "Add Unit" closes dropdown and calls openQuickAdd("add-unit") | unit | same file | ❌ Wave 0 |
| NAV-03 | QuickAddProvider exposes openQuickAdd / closeQuickAdd / activeSheet | unit | `pnpm test -- tests/navigation/QuickAddContext.test.tsx` | ❌ Wave 0 |
| NAV-03 | activeSheet controls which Sheet's `open` prop is true | unit | same file | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/navigation/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/navigation/AppSidebar.nav01.test.tsx` — covers NAV-01 group rename assertions
- [ ] `tests/navigation/QuickAdd.nav02.test.tsx` — covers NAV-02 button render + dropdown items
- [ ] `tests/navigation/QuickAddContext.test.tsx` — covers NAV-03 context state + Sheet open routing

*(The existing `tests/theming/AppSidebar.test.tsx` and `tests/app-shell/AppSidebar.test.tsx` cover collapse toggle and SPEND-03; they do NOT cover the new group labels or Quick Add button — new test files are required.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/components/common/AppSidebar.tsx` — current group arrays, label styles, collapse logic
- Direct code inspection: `src/components/common/AppLayout.tsx` — current layout, Toaster placement
- Direct code inspection: `src/context/ActiveFactionContext.tsx` — canonical model for QuickAddProvider
- Direct code inspection: `src/features/dashboard/DashboardPage.tsx` — sibling portal pattern, key="quick-add" precedent, QuickAdd + LogSession state
- Direct code inspection: `src/features/painting-projects/AddProjectPicker.tsx` — controlled-props pattern with `??` fallback
- Direct code inspection: all 7 Sheet component interfaces — confirmed `{ open, entity | null, onClose }` pattern
- Direct code inspection: `tests/theming/AppSidebar.test.tsx` + `tests/app-shell/AppSidebar.test.tsx` — existing test coverage surface

### Secondary (MEDIUM confidence)
- shadcn/ui DropdownMenu: not currently in `src/components/ui/` (confirmed by directory listing) — must be installed before use
- Radix DropdownMenu portal behavior: renders to `document.body` by default, escaping any overflow constraints on the sidebar

### Tertiary (LOW confidence)
- None — all findings are based on direct codebase inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; only DropdownMenu install is new
- Architecture: HIGH — QuickAddProvider pattern directly modelled on existing ActiveFactionContext; sibling portal pattern already proven in DashboardPage
- Pitfalls: HIGH — all pitfalls derived from reading actual code and established project decisions in STATE.md

**Research date:** 2026-05-05
**Valid until:** Stable — no external dependencies other than shadcn DropdownMenu install; valid until project stack changes
