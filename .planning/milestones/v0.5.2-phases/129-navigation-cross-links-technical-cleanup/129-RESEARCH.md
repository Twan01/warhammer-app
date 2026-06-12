# Phase 129: Navigation, Cross-Links & Technical Cleanup - Research

**Researched:** 2026-06-11
**Domain:** TanStack Router navigation, React.memo, React.useReducer extraction, sidebar UX, cross-page linking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Add a `returnTo` search parameter to the painting-mode route. All 6 entry points pass their current path as `returnTo`. `handleExit` reads `returnTo` and navigates there; falls back to `"/"`.
- **D-02:** Use TanStack Router's `search` param (not manual query string). Define the schema with `z.object({ returnTo: z.string().optional() })` on the painting-mode route.
- **D-03:** In `UnitDetailSheet.tsx`, add a "View Datasheet" button/link to `/unit-database` with a ghost Button + ExternalLink or BookMarked icon, near the unit name/header.
- **D-04:** Only show the "View Datasheet" link when `unit.udb_unit_id` is not null. Omit entirely when unlinked — no disabled state.
- **D-05:** Add a subtle cross-link button in each page's PageHeader actions area. Rules Hub → "Browse Units" to `/unit-database`. Unit Database → "View Rules" to `/rules-hub`. Ghost variant Button with ArrowRight icon.
- **D-06:** Add `{ to: "/game-day", label: "Game Day", icon: Sword }` to `PLAY_NAV`. The `to` path is `/game-day` for matching. The link itself navigates to `/army-lists`. Claude has discretion on exact UX.
- **D-07:** When sidebar is collapsed, add thin horizontal dividers (`border-b border-border/40` or `<Separator />`) between nav groups. Use `border-border/40` opacity.
- **D-08:** In `BattleLogRow.tsx`, make the army list name a clickable `<Link>` to `/army-lists/$listId` when `army_list_id` is not null and `armyListName` is truthy.
- **D-09:** Audit `ArmyListDetailSheet.tsx` (483 lines) for dead/unused code. Check if the component is still imported anywhere. Delete confirmed dead code; keep actively-used portions.
- **D-10:** Wrap `RecipeCard` export in `React.memo()` following the `export const X = memo(function X() {...})` pattern.
- **D-11:** Extract `detailPortalReducer`, its state type, initial state, and action types from `ArmyListDetailPage.tsx` into a new file `src/features/army-lists/armyListDetailReducer.ts`. Import it back.
- **D-12:** Verify sidebar collapse animation smoothness; add `overflow-hidden` if text snaps. Claude has discretion on CSS approach.
- **D-13:** In `StepFocalView.tsx`, add a subtle "Esc to exit" hint in the active painting view (not just completion screen). Bottom-right or footer area with `text-xs text-muted-foreground`.

### Claude's Discretion
- Exact placement of cross-link buttons within PageHeader actions
- Whether Game Day sidebar entry navigates to `/army-lists` or a dedicated `/game-day` index route
- CSS approach for sidebar collapse smoothness
- Whether `ArmyListDetailSheet.tsx` dead code is the entire file or a subset
- Exact icon choices for cross-links

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | Painting Mode exit returns to originating page (returnTo param) not always Dashboard | TanStack Router `validateSearch` + `useSearch` pattern confirmed; `handleExit` at line 111-113 of `page.tsx` is the single change point |
| NAV-02 | Collection UnitDetailSheet has "View Datasheet" link to Unit Database | `unit.udb_unit_id` field confirmed in Unit type; UnitDetailSheet header area identified |
| NAV-03 | Rules Hub and Unit Database have cross-links to each other | Both pages confirmed to use `PageHeader` with `actions` prop; simple `Link`/`Button` addition |
| NAV-04 | Game Day page highlights correct sidebar item | `NavItem` `startsWith` matching confirmed; PLAY_NAV array is the injection point; `/game-day/$listId` route exists, no index route |
| NAV-05 | Collapsed sidebar shows group dividers between Command/Workshop/Play/Management | Sidebar collapse structure confirmed; `!collapsed` guards on group labels identified as insertion points |
| NAV-06 | Battle Log entries link to the army list used | `BattleLogRow` line 85-98 identified; `log.army_list_id` and `armyListName` props available |
| NAV-07 | ArmyListDetailSheet dead code deleted (~340 lines) | File is 483 lines, confirmed NOT imported in `src/app`; only used in `src/features/army-lists` internal refs (ExportDropdown comments, DatasheetBrowserDialog comments) — component itself appears orphaned |
| NAV-08 | RecipeCard wrapped in React.memo to prevent O(N) re-renders on search | `RecipeCard` confirmed as plain function export; `KanbanCard` memo pattern confirmed as template |
| NAV-09 | ArmyListDetailPage reducer extracted to separate file | Reducer spans lines 82-196 of `ArmyListDetailPage.tsx`; `armyListsReducer.ts` sibling pattern already exists |
| NAV-10 | Sidebar collapse has CSS transition (not instant snap) | `transition-[width] duration-200 ease-in-out` already on `<aside>`; content snap is the remaining issue |
| NAV-11 | Painting Mode Escape key hint visible in StepFocalView | `StepFocalView.tsx` already has "Esc to exit" at line 181 — ALREADY IMPLEMENTED |
</phase_requirements>

---

## Summary

Phase 129 is a focused navigation and technical hygiene phase with 11 requirements. The work splits cleanly into three buckets: routing improvements (NAV-01, NAV-02, NAV-03, NAV-04, NAV-06), sidebar polish (NAV-05, NAV-10), and code quality cleanup (NAV-07, NAV-08, NAV-09). NAV-11 is already done.

All routing work uses TanStack Router patterns already established in this codebase. The `validateSearch` + `z.object()` pattern is confirmed in the existing `recipesRoute`. Reading search params back uses `route.useSearch()` — confirmed in `RecipesPage.tsx`. The `useLocation()` hook for current path reading is confirmed in `NavItem.tsx`. Entry point updates are mechanical: 6 call sites each need `search: { returnTo: location.pathname }` added to their navigate calls.

The technical cleanup requirements are low-risk: `ArmyListDetailSheet.tsx` is confirmed orphaned (no imports in `src/app`, only referenced in inline comments in sibling files). The reducer extraction follows the existing `armyListsReducer.ts` pattern. `RecipeCard` memo wrapping follows the `KanbanCard` template exactly.

**Primary recommendation:** Execute in dependency order — router schema first (NAV-01), then cross-links (NAV-02, NAV-03, NAV-06), then sidebar (NAV-04, NAV-05, NAV-10), then cleanup (NAV-07, NAV-08, NAV-09). NAV-11 is a no-op.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| returnTo navigation param | Frontend Router | UI components | TanStack Router owns route schema; entry-point components pass the value |
| Cross-page links (UnitDetailSheet → Unit DB) | UI components | Frontend Router | Component owns the conditional render; router handles navigation |
| Sidebar active state (Game Day) | UI components | Frontend Router | NavItem reads `useLocation()`; PLAY_NAV array is the config |
| Sidebar collapsed dividers | UI components | — | Pure CSS/layout in AppSidebar |
| BattleLogRow army list link | UI components | Frontend Router | Row component owns the conditional link render |
| ArmyListDetailSheet dead code | — | — | File deletion — no tier concerns |
| RecipeCard memoization | UI components | — | React performance optimization at render tier |
| Reducer extraction | UI components | — | Pure refactor; no behavior change |
| Sidebar transition smoothness | UI components | — | CSS only |

---

## Standard Stack

No new packages are introduced in this phase. All work uses the existing stack.

### Core (in use, relevant to this phase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-router | existing | Route schema, navigation, search params | Project standard |
| react | 19 | memo(), useReducer() | Project standard |
| zod | existing | Search param schema validation | Already used on `recipesRoute` |
| lucide-react | existing | ArrowRight, ExternalLink, BookMarked icons for cross-links | Project icon standard |
| @/components/ui/button | existing | Ghost variant for cross-link buttons | shadcn/ui standard |
| @/components/common/NavItem | existing | Sidebar nav item with active-state matching | Internal standard |

**Installation:** No new packages required.

---

## Package Legitimacy Audit

No external packages are installed in this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
Entry Points (6 surfaces)          Painting Mode Route
  AppliedRecipesTab ──────────────→ /painting-mode/$assignmentId?returnTo=/collection
  NextPaintingActionCard ──────────→ /painting-mode/$assignmentId?returnTo=/
  KanbanBoard ────────────────────→ /painting-mode/$assignmentId?returnTo=/painting-projects
  RecipeDetailSheet ───────────────→ /painting-mode/$assignmentId?returnTo=/recipes
  CollectionPage (direct) ─────────→ /painting-mode/$assignmentId?returnTo=/collection
  DashboardPage (direct) ──────────→ /painting-mode/$assignmentId?returnTo=/

                              PaintingModePage.handleExit()
                                    ↓
                              reads returnTo from search
                                    ↓
                         navigate({ to: returnTo ?? "/" })

Cross-links (bidirectional)
  RulesHubPage  ←→  UnitDatabasePage   (PageHeader actions)
  UnitDetailSheet  →  UnitDatabasePage  (conditional on udb_unit_id)
  BattleLogRow  →  ArmyListDetailPage  (conditional on army_list_id + armyListName)
```

### Recommended Project Structure

No structural changes except new file:
```
src/features/army-lists/
  armyListDetailReducer.ts    ← NEW (extracted from ArmyListDetailPage.tsx)
  ArmyListDetailPage.tsx      ← reducer import replaces inline definition
  ArmyListDetailSheet.tsx     ← DELETE (confirmed orphaned)
```

### Pattern 1: TanStack Router Search Params

**What:** Define a typed search schema on a route, read it with `route.useSearch()`.

**When to use:** When navigation needs to carry optional context between pages without polluting the URL path.

**Example (confirmed from `recipesRoute` in `router.tsx`):**
```typescript
// router.tsx — add search schema to painting-mode route
const paintingModeRoute = createRoute({
  getParentRoute: () => bareLayoutRoute,
  path: "/painting-mode/$assignmentId",
  validateSearch: z.object({
    returnTo: z.string().optional(),
  }),
  component: PaintingModePage,
});

// page.tsx — read search params
const { returnTo } = paintingModeRoute.useSearch();

const handleExit = () => {
  navigate({ to: returnTo ?? "/" });
};

// Entry point — pass current path
const location = useLocation();
navigate({
  to: "/painting-mode/$assignmentId",
  params: { assignmentId: String(assignmentId) },
  search: { returnTo: location.pathname },
});
```

### Pattern 2: React.memo with Named Function

**What:** Wrap a component in `memo()` to prevent re-renders when parent re-renders with unchanged props.

**When to use:** Components rendered in a list where the parent has frequently-changing state (e.g., search text in RecipesPage triggers re-renders of all RecipeCards).

**Example (from `KanbanCard.tsx` — confirmed template):**
```typescript
import { memo } from "react";

export const RecipeCard = memo(function RecipeCard({
  recipe,
  faction,
  // ...props
}: RecipeCardProps) {
  // same body as current function
});
```
Named function form (not arrow function) preserves component name in React DevTools.

### Pattern 3: Reducer Extraction

**What:** Move a reducer, its state type, initial state, and action union to a sibling `.ts` file.

**When to use:** When a reducer exceeds ~50 lines or needs sharing.

**Example (confirmed from `armyListsReducer.ts` pattern):**
```typescript
// armyListDetailReducer.ts
export type DetailPortalState = { ... };
export type DetailPortalAction = { type: "OPEN_EDIT"; ... } | ...;
export const initialDetailPortalState: DetailPortalState = { ... };
export function detailPortalReducer(state: DetailPortalState, action: DetailPortalAction): DetailPortalState { ... }

// ArmyListDetailPage.tsx
import { detailPortalReducer, initialDetailPortalState } from "./armyListDetailReducer";
const [state, dispatch] = useReducer(detailPortalReducer, initialDetailPortalState);
```

### Pattern 4: Conditional Cross-Link in Sheet Header

**What:** Render a ghost button that navigates to a related page, gated on a nullable FK.

**When to use:** NAV-02 — UnitDetailSheet "View Datasheet" link.

```typescript
// UnitDetailSheet.tsx — in SheetHeader, after SheetTitle/SheetDescription
{unit.udb_unit_id && (
  <Button
    variant="ghost"
    size="sm"
    className="mt-1 h-auto px-0 text-xs text-muted-foreground"
    onClick={() => {
      onClose();
      navigate({ to: "/unit-database" });
    }}
  >
    <BookMarked className="mr-1 h-3 w-3" />
    View Datasheet
  </Button>
)}
```

Note: `unit.udb_unit_id` is the FK field (confirmed in `src/types/unit.ts` — `udb_unit_id: string | null`). The CONTEXT.md mentions `canonical_unit_id` but the actual field is `udb_unit_id`.

### Pattern 5: Sidebar Collapsed Dividers

**What:** Replace group label whitespace with a thin `<hr>` or `border-b` div in collapsed mode.

**When to use:** NAV-05.

```tsx
// AppSidebar.tsx — between each nav group in the collapsed sidebar
{collapsed && <div className="my-1 border-b border-border/40" />}
```
The existing `border-border/40` opacity is already used for the wordmark divider at line 74 and Quick Add divider at line 82 — use the same value for visual consistency.

### Pattern 6: Game Day Sidebar Entry (NAV-04)

**What:** Add a nav entry that highlights on `/game-day/*` but navigates to `/army-lists` as the entry point.

**Decision from CONTEXT.md (D-06):** The `to` field for `NavItem` matching is `/game-day`, but clicking it navigates to `/army-lists`. This requires a small customization since `NavItem` currently uses `to` for both matching AND the `Link` target.

**Implementation options (Claude's discretion):**
- Option A: Add `/game-day` index route that redirects to `/army-lists` — NavItem links to `/game-day`, gets redirected.
- Option B: Extend `NavItem` to accept a separate `href` prop for the Link target vs `to` for active matching.
- Option C: Render the Game Day item manually (not via NavItem) with custom active logic.

Option A is cleanest — add a `gameDayIndexRoute` at `/game-day` that renders a "Select an army list to start Game Day" prompt or redirect. This avoids modifying NavItem and keeps all nav items consistent.

NavItem active-state matching: `location.pathname.startsWith(to + "/")` — a `/game-day` entry will match `/game-day/123` correctly. [VERIFIED: confirmed in `NavItem.tsx` lines 18-21]

### Anti-Patterns to Avoid
- **Manual query string building:** Do not use `?returnTo=...` as a raw string — use `validateSearch` + `z.object()` for type safety.
- **Nested navigation on `<Link>` for entry points:** `NextPaintingActionCard` uses `<Link>` not `navigate()` — needs different treatment (pass `search` prop to `<Link>`).
- **Modifying NavItem `to` for dual behavior:** Avoid making `to` serve double duty (active matching + href) without explicit opt-in props.
- **Keeping `ArmyListDetailSheet` around "just in case":** It is confirmed orphaned. Partial deletion leaves dead types and imports.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Typed search params | Manual URL string parsing | `validateSearch` + `z.object()` on route | TanStack Router handles encoding, decoding, and TypeScript inference |
| Memoization | Custom `shouldUpdate` logic | `React.memo()` | React's built-in shallow-comparison memo is sufficient for prop-equality checks |
| Active route detection | Custom pathname comparison | `useLocation()` + `startsWith` via existing NavItem | Already correct in NavItem; just add the nav entry |

**Key insight:** Every requirement in this phase has an established in-project pattern. No novel solutions needed.

---

## Critical Finding: NAV-11 Already Implemented

`StepFocalView.tsx` line 181 already contains:
```typescript
<p className="text-xs text-muted-foreground text-center mt-2">Esc to exit</p>
```

This is in the active step view (not just the completion screen). NAV-11 is ALREADY DONE. The plan must mark this requirement as pre-satisfied and include a verification step to confirm it, not an implementation task.

---

## Critical Finding: `udb_unit_id` vs `canonical_unit_id`

The CONTEXT.md (D-04) mentions "canonical_unit_id FK" but the actual field name in `src/types/unit.ts` and the database is `udb_unit_id: string | null`. The plan must use `unit.udb_unit_id` (not `unit.canonical_unit_id`) for the conditional display of the "View Datasheet" button.

---

## Critical Finding: `ArmyListDetailSheet` Is Orphaned

The `ArmyListDetailSheet` component is confirmed NOT imported anywhere in `src/app/`. The grep audit found it only in:
- `src/features/army-lists/ExportDropdown.tsx` line 4-5 — a comment mentioning it (not an import)
- `src/features/army-lists/DatasheetBrowserDialog.tsx` line 41 — a comment mentioning it (not an import)
- `src/features/army-lists/ArmyListUnitRow.tsx` line 47 — a comment mentioning it (not an import)
- `src/features/army-lists/LoadoutBuilderSheet.tsx` line 9 — a comment mentioning it (not an import)

The entire 483-line file can be deleted. D-09 says "verify actual dead code scope before deleting" — the verification is already done: the file is fully dead.

---

## Critical Finding: `NextPaintingActionCard` Uses `<Link>`, Not `navigate()`

`NextPaintingActionCard.tsx` line 64 uses `<Link to="/painting-mode/$assignmentId" params={...}>` — not `navigate()`. To pass search params via `<Link>`, add a `search` prop:
```typescript
<Link
  to="/painting-mode/$assignmentId"
  params={{ assignmentId: String(data.assignment_id) }}
  search={{ returnTo: "/" }}  // Dashboard is the fixed origin for this card
  className="..."
>
```
The Dashboard is always the origin for `NextPaintingActionCard` so `returnTo: "/"` is correct (or `location.pathname` can be read with `useLocation()` if more precision is needed).

---

## Common Pitfalls

### Pitfall 1: Wrong Field Name for UDB Link Condition
**What goes wrong:** Using `unit.canonical_unit_id` instead of `unit.udb_unit_id`.
**Why it happens:** CONTEXT.md D-04 mentions "canonical_unit_id" but the actual TypeScript interface uses `udb_unit_id`.
**How to avoid:** Read `src/types/unit.ts` — the field is `udb_unit_id: string | null`.
**Warning signs:** TypeScript error `Property 'canonical_unit_id' does not exist on type 'Unit'`.

### Pitfall 2: NAV-11 Re-Implementation
**What goes wrong:** Implementing NAV-11 as a new feature when it is already done.
**Why it happens:** The requirement says "add Esc hint to StepFocalView" but line 181 already has it.
**How to avoid:** The plan should treat NAV-11 as a verification task, not implementation.
**Warning signs:** Duplicate "Esc to exit" text appearing twice in the view.

### Pitfall 3: `<Link>` Entry Point Missing `search` Prop
**What goes wrong:** `NextPaintingActionCard` does not pass `returnTo` because it uses `<Link>` rather than `navigate()`.
**Why it happens:** Different entry points use different navigation mechanisms.
**How to avoid:** Pass `search={{ returnTo: "/" }}` (or `location.pathname`) on the `<Link>` component directly.

### Pitfall 4: Game Day NavItem Breaking Existing Nav
**What goes wrong:** Modifying `NavItem` for Game Day dual-to/href behavior breaks the other 11 nav items.
**Why it happens:** Adding an optional `href` prop that overrides `to` for the `<Link>` is easy to get wrong.
**How to avoid:** Use Option A (index route redirect) which requires zero changes to `NavItem`.

### Pitfall 5: Sidebar Divider in Expanded Mode
**What goes wrong:** Showing dividers in expanded mode where group labels already serve as separators.
**Why it happens:** Not gating the divider rendering on `collapsed`.
**How to avoid:** Wrap each divider in `{collapsed && <div className="..." />}`.

### Pitfall 6: `returnTo` Encoding Complex Paths
**What goes wrong:** Routes with search params in the path (e.g., `/recipes?paintId=5`) get mangled when stored in `returnTo`.
**Why it happens:** TanStack Router serializes search params separately from pathname.
**How to avoid:** Use only `location.pathname` for `returnTo` (no search params). This is sufficient — the user returns to the page, not the exact filter state.

---

## Code Examples

### NAV-01: Route Schema Addition
```typescript
// router.tsx — replace existing paintingModeRoute definition
const paintingModeRoute = createRoute({
  getParentRoute: () => bareLayoutRoute,
  path: "/painting-mode/$assignmentId",
  validateSearch: z.object({
    returnTo: z.string().optional(),
  }),
  component: PaintingModePage,
});
```

### NAV-01: handleExit Update
```typescript
// page.tsx — inside PaintingModePageInner
const { returnTo } = paintingModeRoute.useSearch();

const handleExit = () => {
  navigate({ to: returnTo ?? "/" });
};
```

### NAV-01: Entry Point Update (navigate variant)
```typescript
// AppliedRecipesTab.tsx, KanbanBoard.tsx, RecipeDetailSheet.tsx
const location = useLocation();
navigate({
  to: "/painting-mode/$assignmentId",
  params: { assignmentId: String(assignment.id) },
  search: { returnTo: location.pathname },
});
```

### NAV-01: Entry Point Update (Link variant)
```typescript
// NextPaintingActionCard.tsx
<Link
  to="/painting-mode/$assignmentId"
  params={{ assignmentId: String(data.assignment_id) }}
  search={{ returnTo: "/" }}
  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
>
  Start Painting
</Link>
```

### NAV-02: UnitDetailSheet "View Datasheet" Button
```typescript
// UnitDetailSheet.tsx — after SheetTitle in SheetHeader
{unit.udb_unit_id && (
  <Button
    variant="ghost"
    size="sm"
    className="mt-1 h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
    onClick={() => {
      onClose();
      navigate({ to: "/unit-database" });
    }}
  >
    <BookMarked className="mr-1 h-3 w-3" />
    View Datasheet
  </Button>
)}
```

### NAV-03: Cross-Link Buttons in PageHeader
```typescript
// RulesHubPage.tsx — inside PageHeader actions prop
<Button variant="ghost" size="sm" asChild>
  <Link to="/unit-database">
    <ArrowRight className="mr-1 h-4 w-4" />
    Browse Units
  </Link>
</Button>

// DatabaseBrowserPage.tsx — inside PageHeader actions prop
<Button variant="ghost" size="sm" asChild>
  <Link to="/rules-hub">
    <ArrowRight className="mr-1 h-4 w-4" />
    View Rules
  </Link>
</Button>
```

### NAV-05: Collapsed Sidebar Dividers
```typescript
// AppSidebar.tsx — between each nav group's <ul>, gated on collapsed
{collapsed && <div className="my-1 border-b border-border/40" />}
<ul className="flex flex-col gap-1">
  {WORKSHOP_NAV.map((item) => (...))}
</ul>
```

### NAV-06: BattleLogRow Army List Link
```typescript
// BattleLogRow.tsx — line 85-88 area (armyListName conditional)
{armyListName ? (
  <>
    <Link
      to="/army-lists/$listId"
      params={{ listId: String(log.army_list_id!) }}
      className="hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {armyListName}
    </Link>
    {armyListReadiness && (
      <span className="tabular-nums">
        {" "}({armyListReadiness.battleReady}/{armyListReadiness.total} pts ready)
      </span>
    )}
  </>
) : ...}
```
Note: `onClick={(e) => e.stopPropagation()}` prevents the row's Collapsible toggle from firing when clicking the link.

### NAV-08: RecipeCard Memo Wrap
```typescript
// RecipeCard.tsx — change export
import { memo } from "react";

export const RecipeCard = memo(function RecipeCard({
  recipe,
  faction,
  stepCount,
  sectionCount,
  swatches,
  availability,
  onClick,
  onEdit,
  onDelete,
}: RecipeCardProps) {
  // existing body unchanged
});
```

### NAV-09: Reducer Extraction
```typescript
// NEW: src/features/army-lists/armyListDetailReducer.ts
// Move from ArmyListDetailPage.tsx lines 82-196:
export type DetailPortalState = { ... };
export const initialDetailPortalState: DetailPortalState = { ... };
export type DetailPortalAction = | { type: "OPEN_EDIT"; list: ArmyList } | ...;
export function detailPortalReducer(state, action): DetailPortalState { ... }

// ArmyListDetailPage.tsx — replace inline definitions with import:
import { detailPortalReducer, initialDetailPortalState } from "./armyListDetailReducer";
import type { DetailPortalState, DetailPortalAction } from "./armyListDetailReducer";
```

---

## Runtime State Inventory

Phase 129 is routing/UI-only — no database changes, no migrations, no stored data changes.

**Nothing found in any category** — verified by code audit. This phase touches only TypeScript/TSX source files and one file deletion.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual `?returnTo=` query string | `validateSearch: z.object({...})` on route | Full TypeScript inference; auto encoding/decoding |
| Inline reducers in large page components | Extracted reducer files (sibling `.ts`) | Same pattern as `armyListsReducer.ts` already in place |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `CollectionPage` has a direct entry point to painting mode (listed in CONTEXT.md §Entry Points but no code found during audit) | NAV-01 entry points | Low — if CollectionPage doesn't directly navigate, only 5 entry points need updating instead of 6 |
| A2 | `DashboardPage` has a direct entry point to painting mode (separate from NextPaintingActionCard and CurrentFocusCard) | NAV-01 entry points | Low — same as A1 |

---

## Open Questions

1. **Game Day index route vs. redirect**
   - What we know: `/game-day` has no index route; only `/game-day/$listId` exists
   - What's unclear: Whether to add a full index route with prompt UI, or a simple redirect to `/army-lists`
   - Recommendation: Add a minimal `/game-day` index route that renders "Select an army list to start Game Day" with a Link to `/army-lists`. Cleaner than a redirect and avoids a confusing browser back-button loop.

2. **Exact CollectionPage entry point for painting mode**
   - What we know: CONTEXT.md lists it but `CollectionPage` was not directly audited (only `UnitDetailSheet` and `AppliedRecipesTab` were checked)
   - Recommendation: Planner should note that the implementer must grep for all `"/painting-mode/$assignmentId"` navigate calls and update all of them, regardless of which file they're in.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code-only changes with no external tool dependencies.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (Vitest configured inline) |
| Quick run command | `pnpm test -- tests/navigation/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | handleExit navigates to returnTo param | unit | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | ✅ (extend) |
| NAV-01 | Entry points pass returnTo on navigate | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | ✅ (extend) |
| NAV-02 | "View Datasheet" button shown when udb_unit_id is set | unit | `pnpm test -- tests/collection/UnitDetailSheet.nav.test.tsx` | ❌ Wave 0 |
| NAV-02 | Button absent when udb_unit_id is null | unit | same file | ❌ Wave 0 |
| NAV-03 | Rules Hub has "Browse Units" link | unit | `pnpm test -- tests/rules-hub/crossLink.test.tsx` | ❌ Wave 0 |
| NAV-04 | Game Day sidebar item highlights on /game-day/* | unit | `pnpm test -- tests/navigation/AppSidebar.nav01.test.tsx` | ✅ (extend) |
| NAV-06 | armyListName renders as Link when army_list_id set | unit | `pnpm test -- tests/battle-log/BattleLogRow.test.tsx` | ❌ Wave 0 |
| NAV-07 | ArmyListDetailSheet deleted | manual | confirm file absent | — |
| NAV-08 | RecipeCard.displayName = "RecipeCard" (memo set name) | unit | `pnpm test -- tests/recipes/RecipeCard.memo.test.tsx` | ❌ Wave 0 |
| NAV-09 | detailPortalReducer in separate file, behavior unchanged | unit | existing reducer tests cover behavior | existing in tests/army-lists |
| NAV-10 | aside has transition-[width] class | unit | `pnpm test -- tests/navigation/AppSidebar.nav01.test.tsx` | ✅ (check) |
| NAV-11 | "Esc to exit" visible in active step view | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | ✅ (verify existing) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting-mode/ tests/navigation/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/collection/UnitDetailSheet.nav.test.tsx` — covers NAV-02 (View Datasheet conditional display)
- [ ] `tests/rules-hub/crossLink.test.tsx` — covers NAV-03 (cross-link buttons present)
- [ ] `tests/battle-log/BattleLogRow.test.tsx` — covers NAV-06 (army list name as Link)
- [ ] `tests/recipes/RecipeCard.memo.test.tsx` — covers NAV-08 (memo wrapping / displayName)

---

## Security Domain

This phase makes no changes to authentication, session management, data validation, cryptography, or access control. The only user-facing inputs are URL search params (`returnTo`) — TanStack Router's `validateSearch` with Zod provides input validation automatically (invalid values are rejected by the schema).

No ASVS categories apply beyond V5 Input Validation, which is handled by the existing `z.string().optional()` schema on the route.

---

## Sources

### Primary (HIGH confidence)
- Codebase audit — `src/app/router.tsx` (route definitions, search param pattern)
- Codebase audit — `src/components/common/NavItem.tsx` (active-state matching logic)
- Codebase audit — `src/components/common/AppSidebar.tsx` (PLAY_NAV array, collapse behavior)
- Codebase audit — `src/app/painting-mode/page.tsx` (handleExit, entry point navigation)
- Codebase audit — `src/features/painting-mode/StepFocalView.tsx` (NAV-11 already done)
- Codebase audit — `src/types/unit.ts` (udb_unit_id field name)
- Codebase audit — `src/features/army-lists/ArmyListDetailSheet.tsx` (confirmed orphaned)
- Codebase audit — `src/features/army-lists/ArmyListDetailPage.tsx` (reducer at lines 82-196)
- Codebase audit — `src/features/painting-projects/KanbanCard.tsx` (memo pattern template)
- Codebase audit — `src/features/recipes/RecipesPage.tsx` (route.useSearch() pattern)
- Codebase audit — `src/features/units/AppliedRecipesTab.tsx`, `src/features/dashboard/NextPaintingActionCard.tsx`, `src/features/painting-projects/KanbanBoard.tsx` (entry points)

### Secondary (MEDIUM confidence)
- TanStack Router documentation (training knowledge, cross-referenced with in-codebase usage patterns) [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all work uses confirmed in-project patterns
- Architecture: HIGH — direct code audit of every relevant file
- Pitfalls: HIGH — sourced from concrete code observations (wrong field name, already-done NAV-11, Link vs navigate difference)

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (stable codebase, no external dependencies)
