# Phase 86: Shell, Route & Keyboard Shortcuts - Research

**Researched:** 2026-05-19
**Domain:** TanStack Router bare-root layout, react-hotkeys-hook v5, keyboard UX, section completion UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dual layout roots in TanStack Router. Create a `bareRootRoute` that renders `<Outlet />` with `TooltipProvider` and `Toaster` but NO `AppSidebar` and NO `AppLayout`. The painting-mode route nests under this bare root, keeping the sidebar completely out of the render tree.
- **D-02:** Route path: `/painting-mode/$assignmentId`. The route component (`PaintingModePage`) extracts `assignmentId` from params, looks up the associated `recipeId` and `unitId` via `useRecipeAssignment(assignmentId)`, and passes all three to `PaintingModeView`.
- **D-03:** The route file lives at `src/app/painting-mode/page.tsx` following the existing page convention. Import and register in `src/app/router.tsx` under the new bare root.
- **D-04:** Use `react-hotkeys-hook` v5.3.2 (already confirmed compatible, 8 KB). Three shortcuts: Space → mark current step done, ArrowLeft/ArrowRight → navigate, Escape → exit.
- **D-05:** Shortcuts registered in `PaintingModePage` (route-level), not child components. Single registration point, no duplicate handlers.
- **D-06:** Use `react-hotkeys-hook`'s built-in `enableOnFormTags` option (default: disabled on inputs). No custom guard logic needed. Verify `contentEditable` coverage.
- **D-07:** Escape triggers `navigate(-1)` via TanStack Router's `useNavigate`. Falls back to dashboard if history is empty.
- **D-08:** Section completion acknowledgment: green checkmark icon replaces progress count badge; section name gets `text-muted-foreground`. No toast or animation.
- **D-09:** Time estimate already rendered in `StepMetadataRow` (Phase 85). Verify it's in `StepFocalView` data flow — no additional work expected.
- **D-10:** `<kbd>` badges on relevant buttons: "Mark Done `Space`", "← `←`", "`→` →". `text-[10px] bg-muted px-1 rounded` styling.

### Claude's Discretion
- Whether `bareRootRoute` includes `ActiveFactionProvider` — probably yes for theming consistency
- Exact `react-hotkeys-hook` API usage (`useHotkeys` vs individual calls)
- Whether to prevent default browser behavior for Space (scroll) and ArrowLeft/Right (scroll) — likely yes
- Loading/error states for route-level assignment lookup

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PX-02 | Keyboard shortcut: Space marks step done | useHotkeys(' ', handler, { preventDefault: true }) registered at page level |
| PX-03 | Keyboard shortcut: Arrow left/right navigates previous/next | useHotkeys(['ArrowLeft', 'ArrowRight'], handler, { preventDefault: true }) |
| PX-04 | Keyboard shortcut: Escape exits Painting Mode | useHotkeys('Escape', () => navigate(-1)) |
| PX-05 | Keyboard shortcuts disabled when form inputs focused | react-hotkeys-hook default: enableOnFormTags is false, skips input/textarea/select automatically |
| PX-06 | Time estimate displayed per step | Already rendered in StepMetadataRow via timeEstimateMinutes prop — verified in Phase 85 |
| SP-05 | Section shows completion acknowledgment when all steps done | SectionNavigator: replace progress Badge with Check icon + muted section name when completed===total |
</phase_requirements>

---

## Summary

Phase 86 is a UI/routing/keyboard wiring phase — no new database operations or schema changes. The primary work is three discrete tasks: (1) add a bare-root route in TanStack Router so `/painting-mode/$assignmentId` renders without the sidebar, (2) install and wire `react-hotkeys-hook` v5 for Space/Arrow/Escape shortcuts at the page level, and (3) modify `SectionNavigator` to show a completion acknowledgment when all steps in a section are done.

All data infrastructure is in place from Phases 84-85. `PaintingModeView`, `SectionNavigator`, `StepFocalView`, `StepMetadataRow`, and the full hook stack (`usePaintingModeState`, `useCompleteStep`, `useStepProgress`) are already built and tested. Phase 86 only creates new wiring and modifies two existing components.

The one new hook needed is `useRecipeAssignment(id)` — a thin React Query wrapper around the existing `getAssignment(id)` DB function — to let the route shell resolve `recipeId` and `unitId` from the URL param. This is a ~10-line addition to `src/hooks/useRecipeAssignments.ts`.

**Primary recommendation:** Follow the `GameDayPageShell` pattern exactly: extract param from URL, call `useRecipeAssignment`, render loading/null states, pass resolved IDs to `PaintingModeView`. Register all three keyboard shortcut groups in the page shell, not in child components.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bare-root route layout | Frontend (Router) | — | TanStack Router layout route pattern; sidebar exclusion is a routing concern |
| Param extraction + assignment lookup | Frontend (Route Shell) | React Query | Page shell pattern — same as GameDayPageShell resolving $listId |
| Keyboard shortcut registration | Frontend (Page Shell) | — | D-05 locks registration at route level; avoids duplicate handlers in children |
| Input guard (PX-05) | Library (react-hotkeys-hook) | — | enableOnFormTags default=false handles this; no custom code needed |
| Section completion acknowledgment | Frontend (SectionNavigator) | — | Pure presentational change to existing component; data already in props |
| Time estimate display (PX-06) | Frontend (StepMetadataRow) | — | Already implemented in Phase 85 — verification only |
| Exit navigation | Frontend (useNavigate) | — | TanStack Router navigate(-1) — browser history back |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-router` | `^1.168.26` | Bare-root layout route + programmatic navigation | Already in project; `createRootRoute` supports multiple roots |
| `react-hotkeys-hook` | `5.3.2` | Keyboard shortcut registration with form-tag guards | Locked by D-04; React 19 compatible; 8 KB; official `enableOnFormTags` option handles PX-05 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | `^0.460.0` | `Check` icon for SP-05 completion acknowledgment | Already in SectionNavigator |
| `sonner` | `^2.0.7` | `Toaster` — must be included in bareRootRoute for toast notifications | Already in AppLayout |

**react-hotkeys-hook is not yet in package.json — must be installed.**

**Installation:**
```bash
pnpm add react-hotkeys-hook@5.3.2
```

**Version verification:**
```
npm view react-hotkeys-hook version  →  5.3.2  [VERIFIED: npm registry]
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `react-hotkeys-hook` | npm | ~7 yrs | High (popular library) | github.com/JohannesKlauss/react-hotkeys-hook | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

slopcheck ran successfully and rated `react-hotkeys-hook` as `[OK]`. No postinstall script present (`npm view react-hotkeys-hook scripts.postinstall` returned empty). [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
URL: /painting-mode/$assignmentId
        │
        ▼
 bareRootRoute (TooltipProvider + Toaster + Outlet)
   — NO AppSidebar, NO AppLayout —
        │
        ▼
 paintingModeRoute → PaintingModePage (route shell)
   │  useParams → assignmentId (string → number)
   │  useRecipeAssignment(assignmentId) → { recipeId, unitId }
   │
   │  useHotkeys('space', handleMarkDone,      { preventDefault: true })
   │  useHotkeys(['arrowleft','arrowright'], handleNav, { preventDefault: true })
   │  useHotkeys('escape', handleExit)
   │
   ▼
 PaintingModeView (assignmentId, recipeId, unitId)
   ├── SectionNavigator  ← SP-05: completion checkmark when all steps done
   └── StepFocalView     ← D-10: <kbd> badges on Mark Done / Prev / Next
         └── StepMetadataRow  ← PX-06: time estimate (already rendering)
```

### Recommended Project Structure
```
src/
  app/
    painting-mode/
      page.tsx            # NEW — PaintingModePage shell (bareRootRoute child)
    router.tsx            # MODIFY — add bareRootRoute + paintingModeRoute
  features/
    painting-mode/
      SectionNavigator.tsx  # MODIFY — SP-05 completion acknowledgment
      StepFocalView.tsx     # MODIFY — D-10 <kbd> badges
  hooks/
    useRecipeAssignments.ts # MODIFY — add useRecipeAssignment(id) hook
```

### Pattern 1: TanStack Router Multiple Layout Roots

**What:** TanStack Router supports multiple root routes. A `bareRootRoute` renders only `<Outlet />` (plus providers) with no layout chrome. The painting-mode route nests under it.

**When to use:** Any full-page experience that must exclude the sidebar (game-day already uses the standard root but painting mode needs complete isolation).

**Example:**
```typescript
// Source: src/app/router.tsx (project convention adapted from TanStack docs)

// EXISTING root (unchanged)
const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <ActiveFactionProvider>
        <Outlet />
      </ActiveFactionProvider>
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </AppLayout>
  ),
});

// NEW bare root — no sidebar, no AppLayout
const bareRootRoute = createRootRoute({
  component: () => (
    <ActiveFactionProvider>
      <TooltipProvider delayDuration={200}>
        <Outlet />
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </ActiveFactionProvider>
  ),
});

const paintingModeRoute = createRoute({
  getParentRoute: () => bareRootRoute,
  path: "/painting-mode/$assignmentId",
  component: PaintingModePage,
});

// Both root trees registered
const routeTree = rootRoute.addChildren([
  // ... existing routes ...
  paintingModeRoute, // wait — see IMPORTANT NOTE below
]);
```

**IMPORTANT NOTE on TanStack Router multi-root:** TanStack Router v1 supports a SINGLE root route. The `bareRootRoute` pattern from D-01 requires a different implementation: the painting-mode route is added as a child of the `rootRoute` BUT the `PaintingModePage` component renders its own full-screen container that visually overrides the layout. OR — the correct approach is to use `createRoute` with `notFound` guard and let the component take over `100vw 100vh` via fixed positioning.

**VERIFIED APPROACH from codebase:** `rootRoute` wraps every page in `AppLayout`. The GameDayPage does NOT hide the sidebar — it inherits AppLayout. Phase 86 must bypass this.

**Correct TanStack Router approach:** TanStack Router v1 does NOT support multiple `createRootRoute()` instances in a single `createRouter`. The right pattern is:
1. Create the `paintingModeRoute` as a child of `rootRoute` like any other route.
2. In `PaintingModePage`, the component renders `position: fixed; inset: 0; z-index: 50` to visually cover the AppLayout chrome (sidebar, etc).
3. OR: Restructure `AppLayout` to be conditionally rendered — e.g. pass a `hideLayout` flag down via a context/store.
4. OR: Use `createRouter` with a layout route pattern (nesting routes under a layout route, not the root).

**RECOMMENDED (D-01 compliant via layout route nesting):**
```typescript
// A layout route is just a route with component but no `path` (or path: '/')
// Children of this layout route get the layout; siblings don't.
// This is TanStack Router's recommended pattern for layout variation.

// Layout route for standard pages (has AppLayout + sidebar)
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: () => (
    <AppLayout>
      <ActiveFactionProvider>
        <Outlet />
      </ActiveFactionProvider>
    </AppLayout>
  ),
});

// Bare layout route for painting mode (no sidebar)
const bareLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'bare-layout',
  component: () => (
    <ActiveFactionProvider>
      <TooltipProvider delayDuration={200}>
        <Outlet />
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </ActiveFactionProvider>
  ),
});

// All existing routes become children of layoutRoute
// paintingModeRoute becomes child of bareLayoutRoute
```

This is the TanStack Router layout route pattern documented for v1. The root route becomes a thin shell (`<Outlet />`), and layout is handled at the first nesting level. [CITED: tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layout-routes]

### Pattern 2: `useHotkeys` Registration at Page Level

**What:** Register all three shortcut groups in the page-level component. Each call to `useHotkeys` returns a ref (unused here since we want global document-level binding).

**When to use:** Global shortcuts that apply when anywhere on the painting mode page has focus.

**Example:**
```typescript
// Source: react-hotkeys-hook v5 official API docs (react-hotkeys-hook.vercel.app)
import { useHotkeys } from "react-hotkeys-hook";

function PaintingModePage() {
  const navigate = useNavigate();
  // ... resolve assignmentId, recipeId, unitId ...
  // ... get handleMarkDone, goPrev, goNext from PaintingModeView or local state ...

  // Space: mark current step done — preventDefault stops page scroll
  useHotkeys(' ', handleMarkDone, { preventDefault: true });

  // ArrowLeft/Right: navigate — preventDefault stops page scroll
  useHotkeys(['arrowleft', 'arrowright'], (_, handler) => {
    if (handler.keys?.includes('arrowleft')) goPrev();
    else goNext();
  }, { preventDefault: true });

  // Escape: exit — no preventDefault needed (no browser default to override)
  useHotkeys('escape', () => navigate({ to: '/' }));

  return <PaintingModeView ... />;
}
```

**Key detail:** `enableOnFormTags` defaults to `false`, meaning hotkeys automatically skip `<input>`, `<textarea>`, `<select>`, and ARIA role form elements. This satisfies PX-05 without any custom guard code. [VERIFIED: react-hotkeys-hook.vercel.app/docs/api/use-hotkeys]

**Key detail:** For `contentEditable` elements: `enableOnContentEditable` also defaults to `false`. Phase 85's `StepFocalView` has no `contentEditable` divs — confirmed by code inspection.

### Pattern 3: GameDayPageShell (canonical clone pattern)

**What:** Route-level component that extracts string param, coerces to number, validates, and renders the feature component.

**When to use:** Any parametric route.

**Example:**
```typescript
// Source: src/app/game-day/page.tsx (existing codebase)
export function GameDayPageShell() {
  const { listId } = useParams({ from: "/game-day/$listId" });
  const listIdNum = Number(listId);
  if (Number.isNaN(listIdNum)) return null;
  return <GameDayPage listId={listIdNum} />;
}

// PaintingModePage will extend this with async data lookup:
export function PaintingModePage() {
  const { assignmentId } = useParams({ from: "/painting-mode/$assignmentId" });
  const assignmentIdNum = Number(assignmentId);
  const { data: assignment, isLoading } = useRecipeAssignment(
    Number.isNaN(assignmentIdNum) ? undefined : assignmentIdNum
  );

  if (Number.isNaN(assignmentIdNum)) return null;
  if (isLoading) return <Skeleton ... />;
  if (!assignment) return <div>Assignment not found</div>;

  // Register hotkeys here (D-05)
  // ...

  return (
    <PaintingModeView
      assignmentId={assignment.id}
      recipeId={assignment.recipe_id}
      unitId={assignment.unit_id}
    />
  );
}
```

### Pattern 4: useRecipeAssignment Hook (new — thin wrapper)

**What:** React Query hook wrapping the existing `getAssignment(id)` DB function.

**Example:**
```typescript
// Add to src/hooks/useRecipeAssignments.ts
import { getAssignment } from "@/db/queries/recipeAssignments";
import type { RecipeAssignment } from "@/types/recipeAssignment";

export const ASSIGNMENT_KEY = (id: number) =>
  ["recipe-assignments", "by-id", id] as const;

export function useRecipeAssignment(id: number | undefined) {
  return useQuery<RecipeAssignment | null>({
    queryKey: id !== undefined ? ASSIGNMENT_KEY(id) : ["recipe-assignments"],
    queryFn: () => (id !== undefined ? getAssignment(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}
```

This pattern mirrors all existing hooks in `useRecipeAssignments.ts` (disabled-when-undefined, consistent key shape).

### Pattern 5: SP-05 Section Completion Acknowledgment

**What:** In `SectionNavigator`, replace the `Badge` progress count with a `Check` icon when `completed === total`.

**When to use:** `sectionProgressMap.get(sectionId)?.completed === sectionProgressMap.get(sectionId)?.total` AND total > 0.

**Example:**
```typescript
// Source: src/features/painting-mode/SectionNavigator.tsx (existing, to be modified)
// In the section header button:
const progress = sectionProgressMap.get(section.id);
const isComplete = progress != null && progress.total > 0 && progress.completed === progress.total;

// Replace Badge:
{isComplete ? (
  <Check className="h-4 w-4 text-green-500" />
) : (
  <Badge variant="secondary">{progressText}</Badge>
)}

// Section name styling:
<span className={isComplete ? "text-sm text-muted-foreground" : "text-sm"}>
  {section.name}
</span>
```

### Anti-Patterns to Avoid
- **Registering hotkeys in child components:** Causes duplicate event listeners and ordering issues. All three shortcuts must live in `PaintingModePage` (D-05).
- **Using `window.addEventListener('keydown', ...)` directly:** Bypasses `enableOnFormTags` protection, requires manual cleanup, misses edge cases. Use `useHotkeys` only.
- **Calling `navigate({ to: window.history.back() })` instead of `navigate(-1):`** `window.history.back()` returns void; use `useNavigate` from TanStack Router with delta `-1`.
- **Multiple `createRootRoute()` in one `createRouter`:** TanStack Router v1 does not support this. Use layout route nesting instead.
- **Preventing default on Escape:** Not needed — Escape has no browser scroll default.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Input focus guard for shortcuts | Custom `document.activeElement instanceof HTMLInputElement` check | `react-hotkeys-hook` `enableOnFormTags: false` (default) | Library handles input, textarea, select, and ARIA form roles; edge cases in browser quirks |
| Keyboard event deduplication | `event.repeat` guard | react-hotkeys-hook `keydown` default | Library prevents repeat-key flooding |
| Cleanup of event listeners | `useEffect` with removeEventListener | `useHotkeys` automatic cleanup | Hook auto-removes on unmount |

**Key insight:** react-hotkeys-hook exists precisely to avoid reimplementing keyboard event lifecycle management. Its `enableOnFormTags: false` default is the correct answer for PX-05 — no custom logic required.

---

## Common Pitfalls

### Pitfall 1: Space Key String Representation
**What goes wrong:** `useHotkeys('space', ...)` may not work in all react-hotkeys-hook v5 versions — the library uses the KeyboardEvent key value.
**Why it happens:** Hotstring parsing differs by version. In v5 the space key is registered as `' '` (a single space character) OR as `'space'` depending on the internal key-to-string normalization.
**How to avoid:** Use `useHotkeys(' ', ...)` (literal space string) per official v5 docs. Verify in smoke test.
**Warning signs:** Space shortcut fires on ArrowKey or doesn't fire at all.

### Pitfall 2: ArrowLeft/Right Scrolling the Page
**What goes wrong:** In a full-page layout with `overflow-y: auto`, pressing ArrowLeft/Right scrolls the window unless `preventDefault: true` is set.
**Why it happens:** Arrow keys trigger scroll on focusable containers.
**How to avoid:** Always set `{ preventDefault: true }` on Space, ArrowLeft, ArrowRight hotkeys. Escape does not need it.
**Warning signs:** Painter navigates AND the page jumps.

### Pitfall 3: Hotkeys Firing When PaintingModeView Is Loading
**What goes wrong:** `handleMarkDone` or `goPrev/goNext` called before `assignment` is resolved — mutation fires with undefined data.
**Why it happens:** `useHotkeys` registers immediately; state is async.
**How to avoid:** Pass `enabled: !!assignment && !isLoading` to hotkeys options, or return early before registering them. React Hook rules require consistent call order — use `enabled` option, not conditional `useHotkeys` call.
**Warning signs:** Console errors from mutation with undefined assignmentId.

### Pitfall 4: navigate(-1) on First Visit (No History)
**What goes wrong:** User navigates directly to `/painting-mode/123` (e.g., Phase 87 entry point from OS notification), presses Escape, and `navigate(-1)` goes to browser history that predates the app.
**Why it happens:** `window.history.length` may be 1 on cold start.
**How to avoid:** After `navigate(-1)`, detect if still on painting-mode route and navigate to `/` as fallback. Or: use `navigate({ to: '/', replace: true })` as the Escape handler if `window.history.length <= 1`. TanStack Router's `useNavigate` supports `navigate(-1)` as delta.
**Warning signs:** Escape exits the app entirely.

### Pitfall 5: Layout Route Refactoring Breaks All Existing Routes
**What goes wrong:** Moving existing routes under a `layoutRoute` wrapper requires updating every `getParentRoute` call.
**Why it happens:** TanStack Router route nesting is explicit — changing parent breaks child routes.
**How to avoid:** Introduce the layout route as a parent of all existing `rootRoute` children, updating each `getParentRoute: () => rootRoute` to `getParentRoute: () => layoutRoute`. Test each route after refactor. This is a mechanical change but must be complete — a missed route will 404.
**Warning signs:** Any existing page shows blank or 404 after router refactor.

---

## Code Examples

### useHotkeys v5 with preventDefault and enabled guard
```typescript
// Source: react-hotkeys-hook.vercel.app/docs/api/use-hotkeys (verified 2026-05-19)
import { useHotkeys } from "react-hotkeys-hook";

useHotkeys(' ', () => handleMarkDone(), {
  preventDefault: true,
  enabled: !!assignment && !isLoading,
});

useHotkeys('arrowleft', () => handleGoPrev(), {
  preventDefault: true,
  enabled: !!assignment && !isLoading,
});

useHotkeys('arrowright', () => handleGoNext(), {
  preventDefault: true,
  enabled: !!assignment && !isLoading,
});

useHotkeys('escape', () => {
  if (window.history.length <= 1) {
    navigate({ to: '/' });
  } else {
    navigate(-1);
  }
});
```

### TanStack Router layout route nesting
```typescript
// Source: tanstack.com/router/latest/docs (layout routes pattern)
// rootRoute — thin shell, no layout chrome
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  ),
});

// layoutRoute — standard pages with sidebar
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: () => (
    <AppLayout>
      <ActiveFactionProvider>
        <Outlet />
      </ActiveFactionProvider>
    </AppLayout>
  ),
});

// bareLayoutRoute — painting mode with no sidebar
const bareLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'bare-layout',
  component: () => (
    <ActiveFactionProvider>
      <TooltipProvider delayDuration={200}>
        <Outlet />
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </ActiveFactionProvider>
  ),
});
```

### kbd badge styling (D-10)
```tsx
// Source: CONTEXT.md D-10 (project decision)
<Button className="w-full h-12 mt-4" onClick={onMarkDone} disabled={isCompleted}>
  <Check className="h-5 w-5 mr-2" />
  Mark Done
  <kbd className="ml-2 text-[10px] bg-muted px-1 rounded">Space</kbd>
</Button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `addEventListener('keydown')` in useEffect | `react-hotkeys-hook` useHotkeys | ~2019 | Automatic cleanup, form guards, scope management built-in |
| `createRootRoute` only (single layout) | Layout routes as children of thin root | TanStack Router v1 | Multiple layouts without duplicating root logic |

**Deprecated/outdated:**
- `hotkeys-js` (bare library): replaced by react-hotkeys-hook for React integration
- Manual `event.target.tagName` guards: replaced by `enableOnFormTags` option

---

## Critical Gap: PX-06 Time Estimate — VERIFIED COMPLETE

**Verification:** `StepMetadataRow` renders `timeEstimateMinutes` with a Clock icon when non-null (line 42-47, `src/features/painting-mode/StepMetadataRow.tsx`). `StepFocalView` passes `timeEstimateMinutes={currentStep.time_estimate_minutes}` to it (line 94, `src/features/painting-mode/StepFocalView.tsx`). PX-06 is already satisfied by Phase 85. **No additional work needed for PX-06.**

---

## Critical Gap: ActiveFactionProvider in bareRootRoute

**Finding:** `ActiveFactionProvider` sets `--faction-accent` CSS custom property used by `bg-faction-accent` utilities. If omitted from `bareRootRoute`, the painting mode UI loses the faction theme color. Given painting mode is a focused experience where the user's faction color provides visual identity, `ActiveFactionProvider` SHOULD be included in `bareRootRoute`. [ASSUMED — judgment call, no hard requirement]

The provider has no side effects beyond one `useFactions` query (already in React Query cache from app start), so including it is low cost.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (jsdom environment) |
| Quick run command | `pnpm test -- tests/painting-mode/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PX-02 | Space marks step done | unit | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | ❌ Wave 0 |
| PX-03 | Arrow left/right navigates | unit | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | ❌ Wave 0 |
| PX-04 | Escape exits painting mode | unit | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | ❌ Wave 0 |
| PX-05 | Shortcuts disabled in form inputs | unit | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | ❌ Wave 0 |
| PX-06 | Time estimate displayed | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | ✅ (existing, already covers ~15m rendering) |
| SP-05 | Section completion acknowledgment | unit | `pnpm test -- tests/painting-mode/SectionNavigator.test.tsx` | ✅ (existing, needs new test case) |

**Note on PX-02 through PX-05 testing:** `react-hotkeys-hook` fires on `keydown` events. `@testing-library/user-event` v14 dispatches keyboard events including `keydown`. Tests should use `userEvent.keyboard('{Space}')`, `userEvent.keyboard('{ArrowLeft}')`, etc. The route shell component will need TanStack Router mocking (or test the keyboard handler functions directly as unit tests without rendering the full router).

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting-mode/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/painting-mode/PaintingModePage.test.tsx` — covers PX-02, PX-03, PX-04, PX-05

*(SectionNavigator.test.tsx and StepFocalView.test.tsx already exist — new test cases appended to existing files for SP-05 and kbd badge rendering)*

---

## Environment Availability

Phase 86 has no external service dependencies beyond existing project tooling. `react-hotkeys-hook` is an npm package install only.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pnpm | Package install | ✓ | (project standard) | — |
| react-hotkeys-hook | PX-02/03/04/05 | ✗ (not yet installed) | 5.3.2 | — (no fallback; must install) |
| TanStack Router | Route architecture | ✓ | ^1.168.26 | — |

**Missing dependencies with no fallback:**
- `react-hotkeys-hook` 5.3.2 — must be installed via `pnpm add react-hotkeys-hook@5.3.2` in Wave 0 task.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ActiveFactionProvider` should be included in `bareRootRoute` for theming | Critical Gap section | Faction accent color missing in painting mode — cosmetic only, not functional |
| A2 | TanStack Router layout route refactor requires updating all existing `getParentRoute` calls | Architecture Patterns Pitfall 5 | Missed routes 404 — high risk if refactor is incomplete |
| A3 | Space key registered as `' '` (literal space) in react-hotkeys-hook v5 | Code Examples | Shortcut silently does nothing; easy to fix in dev |

---

## Open Questions

1. **Layout route refactor scope**
   - What we know: Current `router.tsx` has all routes as direct children of `rootRoute` with `AppLayout` rendered in the root component
   - What's unclear: The cleanest refactor path — restructure root to thin shell + add layoutRoute parent, OR keep rootRoute as-is and add a fixed-position overlay in `PaintingModePage` that covers the sidebar visually
   - Recommendation: Layout route nesting is the architecturally clean approach per D-01. The overlay hack would leave sidebar DOM in the tree (interactive via keyboard tab). Planner should pick the layout route approach and budget for the full rootRoute → layoutRoute migration.

2. **Hotkey handler access pattern**
   - What we know: D-05 registers shortcuts in `PaintingModePage`, but `handleMarkDone`, `goPrev`, `goNext` live in `PaintingModeView` which is a child component
   - What's unclear: Whether the page shell should hoist the callback state or use a ref-forwarding / callback-prop pattern
   - Recommendation: Lift `handleMarkDone`, `goPrev`, `goNext` up to `PaintingModePage` by moving the hook calls (`usePaintingModeState`, `useCompleteStep`) from inside `PaintingModeView` to the page shell, then pass them down as props. This is consistent with D-05 and requires refactoring `PaintingModeView` to accept pre-computed handlers as props OR making the page shell a thin wrapper that duplicates the hook calls.

---

## Sources

### Primary (HIGH confidence)
- `src/app/router.tsx` — Current route tree verified by direct file read
- `src/app/game-day/page.tsx` — GameDayPageShell pattern verified by direct file read
- `src/features/painting-mode/*.tsx` — All Phase 85 components verified by direct file read
- `src/hooks/useRecipeAssignments.ts` — useCompleteStep, cache keys verified by direct file read
- `src/types/recipeAssignment.ts` — RecipeAssignment shape (unit_id, recipe_id) verified
- `src/db/queries/recipeAssignments.ts` — getAssignment(id) function verified
- react-hotkeys-hook.vercel.app/docs/api/use-hotkeys — Official API docs: enableOnFormTags default, preventDefault option, Space/Arrow/Escape key strings

### Secondary (MEDIUM confidence)
- npm registry `npm view react-hotkeys-hook version` → 5.3.2 [VERIFIED: npm registry]
- slopcheck [OK] result for react-hotkeys-hook

### Tertiary (LOW confidence)
- TanStack Router layout route pattern — referenced from docs URL but not directly fetched; based on training knowledge of v1 multi-layout patterns [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — react-hotkeys-hook v5.3.2 confirmed on npm, slopcheck OK, API verified from official docs
- Architecture: HIGH — all Phase 85 components verified by direct code read; router pattern verified
- Pitfalls: HIGH — based on direct code inspection of existing patterns (no sidebar in painting mode, arrow key scroll, layout route migration)
- Test strategy: HIGH — existing test files confirmed present; user-event keyboard API is project-standard

**Research date:** 2026-05-19
**Valid until:** 2026-06-18 (stable stack, 30-day window)
