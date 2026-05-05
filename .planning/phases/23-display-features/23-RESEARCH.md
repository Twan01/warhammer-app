# Phase 23: Display Features - Research

**Researched:** 2026-05-05
**Domain:** Collection filtering (Zustand) + fullscreen overlay (Tauri 2 window API + React)
**Confidence:** HIGH

## Summary

Phase 23 adds two independent display features to the Collection page: a Battle Ready quick-filter and a Showcase Mode. Both operate entirely on existing data — no new tables, no new query hooks, no migration files required. The implementation is surgical: extend the Zustand filter store, the pure filter function, and the filter bar UI; then add a fullscreen overlay component mounted as a sibling at CollectionPage level.

The Battle Ready filter is a straightforward clone of the existing `activeOnly` toggle pattern. The implementation delta is minimal: one new boolean field in the Zustand store, one new condition in `applyUnitFilters`, one new button in `UnitFilters`, and one new line in `hasActiveFilters` in CollectionPage. The criteria (`status_assembly === 1 && status_painting === "Completed"`) map directly to existing typed fields on the `Unit` interface.

Showcase Mode requires the Tauri 2 window API (`getCurrentWindow().setFullscreen(true/false)`) and a new permission in `default.json`. The overlay is a full-screen React component rendered as a sibling portal in CollectionPage — consistent with the established sibling portal pattern already used for lightbox, Sheet, and Dialog portals. Photo data comes directly from `useLatestUnitPhotos()` which already returns `Map<number, UnitPhotoWithUrl>`. A dev-mode fallback using `document.documentElement.requestFullscreen()` is needed because `pnpm dev` runs a browser tab (no Tauri context), making `getCurrentWindow()` unavailable.

**Primary recommendation:** Implement in two isolated waves — Wave 1: Battle Ready filter (3 files touched, fully testable), Wave 2: Showcase Mode overlay (2 new files + 1 capabilities update).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Battle Ready Filter Criteria (DISP-01)**
- "Battle Ready" = `status_assembly === 1` AND `status_painting === "Completed"`
- Basing and varnish status are NOT required for Battle Ready
- Filter is a boolean toggle like `activeOnly` — stored in Zustand collectionFilters store
- Composes additively with all existing filters

**Battle Ready Filter Placement (DISP-01)**
- Toggle button placed alongside "Active only" in UnitFilters component
- Same visual style: `variant="outline"` when off, `variant="default"` when active, with `aria-pressed`
- Active filter state reflected in `hasActiveFilters` check (clears with "Clear filters")
- Works in both table and gallery view modes

**Showcase Mode Scope**
- Showcase shows currently filtered units that have at least one photo
- Respects active filters — composes with Battle Ready + any other filter
- Units without photos excluded; if none have photos → "No photos to showcase" message
- Entry button disabled when no filtered units have photos

**Showcase Mode Entry (DISP-02)**
- "Enter Showcase" button in PageHeader actions area, next to view mode toggles
- Icon: `Maximize` (lucide) or `Presentation` — small icon button with tooltip
- Disabled with tooltip when no photos available

**Showcase Mode Implementation (DISP-02)**
- Use Tauri window API: `getCurrentWindow().setFullscreen(true)` from `@tauri-apps/api/window`
- Hide app chrome by rendering a dedicated full-screen overlay component
- Showcase is a React component mounted at CollectionPage level (sibling portal pattern)
- Dark background (`bg-black`) fills the entire screen
- Add required Tauri capability permission for window fullscreen operations

**Showcase Navigation**
- Arrow keys (left/right) cycle through units
- On-screen arrow buttons (semi-transparent, appear on hover) on left/right edges
- Unit counter "3 of 15" displayed bottom-center
- Current unit's name and faction shown as minimal overlay at bottom

**Showcase Display**
- Photo displayed large and centered, `object-contain`
- Unit name and faction name as minimal translucent overlay bar at bottom
- No other chrome — no progress bars, no metadata, no action buttons
- Background: solid black

**Showcase Exit (DISP-03)**
- Escape key exits showcase (keydown listener)
- Visible X button in top-right corner (semi-transparent, appears on hover/mouse move)
- Exit calls `getCurrentWindow().setFullscreen(false)` and unmounts the showcase overlay

### Claude's Discretion
- Exact Tauri capability permission name for window fullscreen
- Whether to use `requestFullscreen` (browser API) as fallback for dev mode
- Photo transition animation between units (crossfade, instant swap, or slide)
- Exact semi-transparent styling for nav arrows and exit button
- Whether to auto-hide cursor after inactivity in Showcase Mode

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISP-01 | Battle Ready collection filter preset | Zustand toggle pattern already established via `activeOnly`; `applyUnitFilters` pure function is the single extension point; `Unit.status_assembly` (0\|1) and `Unit.status_painting` ("Completed") are typed fields |
| DISP-02 | Showcase Mode for completed units | `useLatestUnitPhotos()` returns `Map<number, UnitPhotoWithUrl>` ready for Showcase; `getCurrentWindow().setFullscreen(true)` from `@tauri-apps/api/window`; requires `core:window:allow-set-fullscreen` in capabilities; sibling portal pattern already established in CollectionPage |
| DISP-03 | Exit Showcase Mode (Escape key + X button) | `keydown` event listener on `document`; `getCurrentWindow().setFullscreen(false)` + overlay unmount; `isTauri()` from `@tauri-apps/api/core` for dev-mode fallback branching |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/api` | ^2.0.0 (installed) | Window management (`getCurrentWindow`) | Only path to native fullscreen in Tauri desktop; already in package.json |
| Zustand | ^5.0.12 (installed) | `battleReady` toggle state | Existing filter store — no new dependency |
| React (keydown listener) | ^19 (installed) | Escape key / arrow key handler in Showcase | Standard DOM event pattern, no library needed |
| `isTauri` from `@tauri-apps/api/core` | ^2.0.0 (installed) | Runtime check to branch between Tauri and browser dev | Official Tauri utility; avoids crashes in `pnpm dev` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | ^0.460.0 (installed) | `Maximize`, `X`, `ChevronLeft`, `ChevronRight` icons | All icon needs in this phase |
| shadcn/ui `Tooltip` | Installed | Disabled-state explanation for Showcase button | When showcaseUnits.length === 0 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `getCurrentWindow().setFullscreen()` | `document.documentElement.requestFullscreen()` | Browser API works in dev/browser, but is not the Tauri idiomatic approach; use Tauri API with browser fallback |
| Sibling overlay component | React `createPortal` to `document.body` | Portal would work identically; sibling at page level is the established project pattern — stay consistent |
| CSS `z-index` overlay | New Tauri window | New window requires window creation commands; overlay achieves same result with far less complexity |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/features/units/
├── collectionFilters.ts        # ADD: battleReady boolean + toggleBattleReady + clearAll update
├── applyUnitFilters.ts         # ADD: battleReady condition
├── UnitFilters.tsx             # ADD: Battle Ready toggle button
├── CollectionPage.tsx          # ADD: showcaseOpen state + battleReady filter wiring + Showcase mount
└── ShowcaseMode.tsx            # NEW: full-screen overlay component
```

### Pattern 1: Battle Ready Zustand Toggle (Clone of `activeOnly`)
**What:** Add `battleReady: boolean` and `toggleBattleReady` action to the existing Zustand store. Update `clearAll` to also reset `battleReady: false`.
**When to use:** Already decided — mirror the `activeOnly` pattern exactly.
**Example:**
```typescript
// collectionFilters.ts — additions to existing store
interface CollectionFiltersState {
  // ... existing fields ...
  battleReady: boolean;
  toggleBattleReady: () => void;
}

// In create() initializer:
battleReady: false,
toggleBattleReady: () => set((s) => ({ battleReady: !s.battleReady })),

// clearAll must also reset battleReady:
clearAll: () =>
  set({ search: "", factions: [], statuses: [], categories: [], activeOnly: false, battleReady: false }),
```

### Pattern 2: applyUnitFilters Extension
**What:** Add a `battleReady` field to `UnitFiltersInput` and a guard at the top of the filter chain.
**When to use:** Before any other filter check (short-circuit pattern).
**Example:**
```typescript
// applyUnitFilters.ts
export interface UnitFiltersInput {
  // ... existing fields ...
  battleReady: boolean;
}

export function applyUnitFilters(units: Unit[], filters: UnitFiltersInput): Unit[] {
  const search = filters.search.trim().toLowerCase();
  return units.filter((unit) => {
    if (filters.battleReady && !(unit.status_assembly === 1 && unit.status_painting === "Completed")) return false;
    if (filters.activeOnly && unit.is_active_project !== 1) return false;
    // ... rest unchanged ...
  });
}
```

### Pattern 3: Tauri Fullscreen with Dev-Mode Fallback
**What:** `isTauri()` guard before calling the window API; browser API as fallback.
**When to use:** Every enter/exit call in ShowcaseMode.
**Example:**
```typescript
// Source: https://v2.tauri.app/reference/javascript/api/namespacewindow/
// Source: https://v2.tauri.app/reference/javascript/api/namespacecore/
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";

async function enterFullscreen(): Promise<void> {
  if (isTauri()) {
    await getCurrentWindow().setFullscreen(true);
  } else {
    // Dev mode fallback (pnpm dev runs in browser tab)
    await document.documentElement.requestFullscreen?.();
  }
}

async function exitFullscreen(): Promise<void> {
  if (isTauri()) {
    await getCurrentWindow().setFullscreen(false);
  } else {
    if (document.fullscreenElement) await document.exitFullscreen?.();
  }
}
```

### Pattern 4: Showcase Overlay (Sibling Portal at CollectionPage Level)
**What:** A `showCaseOpen` boolean and `showcaseUnits` in CollectionPage. When open, render `<ShowcaseMode>` as a sibling — not nested inside any Sheet/Dialog.
**When to use:** Follows established project constraint: "Sibling Sheet/Dialog portal pattern — never nest Radix portals".
**Example:**
```typescript
// CollectionPage.tsx additions
const [showcaseOpen, setShowcaseOpen] = useState(false);

// Compute showcase-eligible units from filteredUnits (those with photos)
const showcaseUnits = useMemo(
  () => filteredUnits.filter((u) => latestPhotos?.has(u.id)),
  [filteredUnits, latestPhotos],
);

// In return JSX — sibling, not nested:
{showcaseOpen && latestPhotos && (
  <ShowcaseMode
    units={showcaseUnits}
    photos={latestPhotos}
    factions={factions ?? []}
    onClose={() => setShowcaseOpen(false)}
  />
)}
```

### Pattern 5: Escape Key Handler in Showcase
**What:** `useEffect` adds a `keydown` listener to `document` on mount; cleans up on unmount.
**When to use:** Standard React pattern for global keyboard shortcuts.
**Example:**
```typescript
useEffect(() => {
  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight") setIndex((i) => (i + 1) % units.length);
    if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + units.length) % units.length);
  }
  document.addEventListener("keydown", handleKey);
  return () => document.removeEventListener("keydown", handleKey);
}, [units.length, onClose]);
```

### Anti-Patterns to Avoid
- **Nesting ShowcaseMode inside Dialog or Sheet:** Radix portals nested inside each other break z-index stacking in jsdom and cause issues in production. Keep ShowcaseMode as a sibling.
- **Using `z-index: 9999` with CSS position fixed without also setting `inset: 0`:** Always use `position: fixed; inset: 0` to guarantee full screen coverage regardless of scroll position.
- **Calling `getCurrentWindow()` unconditionally:** In `pnpm dev` (browser context), this throws. Always guard with `isTauri()`.
- **Forgetting to reset `battleReady` in `clearAll`:** The `clearAll` action resets all filter state — missing `battleReady: false` causes the filter to persist after "Clear filters".
- **Forgetting to pass `battleReady` to `applyUnitFilters`:** CollectionPage must read the new Zustand field and pass it to `applyUnitFilters`. The `UnitFiltersInput` interface enforces this at compile time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toggle button style for Battle Ready | Custom CSS active state | shadcn `Button variant="default"/"outline"` + `aria-pressed` | Already used for `activeOnly` — consistent, accessible |
| Photo URL resolution in Showcase | Manual `asset://` URL construction | `useLatestUnitPhotos()` — already returns `UnitPhotoWithUrl` with `assetUrl` ready | Pattern established in Phase 13; batch query already runs on CollectionPage |
| Fullscreen toggle logic | Custom window resize/overlay trick | `getCurrentWindow().setFullscreen()` | Handles OS-level fullscreen, window decorations, taskbar — browser tricks don't |
| Tooltip on disabled button | Manual `title` attribute + pointer-events | shadcn `Tooltip` component | Works correctly on disabled buttons (which suppress native `title`) |

---

## Common Pitfalls

### Pitfall 1: `clearAll` Not Resetting `battleReady`
**What goes wrong:** User clicks "Clear filters" — all filters clear but Battle Ready stays active. Filtered count doesn't update.
**Why it happens:** `clearAll` was written before `battleReady` existed; the new field is not added to the reset object.
**How to avoid:** Add `battleReady: false` to the `clearAll` `set()` call. Also update `hasActiveFilters` in CollectionPage to include `|| battleReady`.
**Warning signs:** Test `clearAll` in the Zustand store test — add a case that sets `battleReady: true` then clears, asserts `battleReady` is `false`.

### Pitfall 2: Tauri API Called in Browser Dev Context
**What goes wrong:** `getCurrentWindow().setFullscreen(true)` throws `"Not in Tauri context"` when using `pnpm dev` (browser tab, no Tauri WebView).
**Why it happens:** `pnpm dev` runs the frontend in a standard browser. The Tauri IPC bridge doesn't exist.
**How to avoid:** Always guard with `isTauri()` from `@tauri-apps/api/core`, fall back to `document.documentElement.requestFullscreen()`.
**Warning signs:** Console error mentioning IPC or `__TAURI_INTERNALS__` not defined.

### Pitfall 3: Showcase Overlay Not Covering Full Screen
**What goes wrong:** The overlay renders but doesn't fill the entire screen — page header or sidebar still visible.
**Why it happens:** `position: fixed` without `inset: 0` only covers from the element's natural position.
**How to avoid:** Use `className="fixed inset-0 z-50 bg-black"` on the Showcase root. `z-50` is the shadcn convention for overlays; verify it sits above the sidebar's z-index.
**Warning signs:** During dev, toggle Showcase — if any chrome peeks through, check z-index hierarchy.

### Pitfall 4: Showcase Closes But Window Stays Fullscreen
**What goes wrong:** `onClose` unmounts the overlay but forgets to call `setFullscreen(false)` — window remains fullscreen.
**Why it happens:** Exit path only unmounts the React component but doesn't call the Tauri API.
**How to avoid:** `ShowcaseMode.tsx` must call `exitFullscreen()` inside `onClose` before propagating to CollectionPage. Use a `useEffect` cleanup as a safety net.
**Warning signs:** After closing Showcase, the window stays fullscreen and app chrome doesn't reappear.

### Pitfall 5: Empty Showcase State When No Photos Exist
**What goes wrong:** User clicks "Enter Showcase" with an active filter that results in 0 photo-bearing units — the Showcase renders an empty gallery with no navigation affordance.
**Why it happens:** `showcaseUnits` can be empty if filtered units exist but none have photos.
**How to avoid:** Disable the Showcase button when `showcaseUnits.length === 0`. Also add an in-Showcase empty state message "No photos to showcase — add journal photos to your units" as a defense in depth.
**Warning signs:** `showcaseUnits.length === 0` when button is enabled.

### Pitfall 6: Arrow Key Navigation Wraps Incorrectly
**What goes wrong:** `(index - 1) % units.length` in JS returns `-1` when `index === 0` (JS modulo is signed).
**Why it happens:** JS `%` operator preserves sign of left operand.
**How to avoid:** Use `(index - 1 + units.length) % units.length` for left/prev navigation.
**Warning signs:** Index goes negative, then the photo lookup returns `undefined`, image disappears.

---

## Code Examples

### Battle Ready Filter Button (UnitFilters.tsx)
```typescript
// Mirrors the existing activeOnly button exactly — same variant toggle pattern
const battleReady = useCollectionFilters((s) => s.battleReady);
const toggleBattleReady = useCollectionFilters((s) => s.toggleBattleReady);

<Button
  variant={battleReady ? "default" : "outline"}
  size="sm"
  onClick={toggleBattleReady}
  aria-pressed={battleReady}
>
  Battle Ready
</Button>
```

### Showcase Entry Button with Disabled Tooltip (CollectionPage.tsx actions)
```typescript
// shadcn Tooltip works correctly on disabled buttons
// (disabled buttons suppress native title attribute)
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Maximize } from "lucide-react";

<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Enter Showcase Mode"
        disabled={showcaseUnits.length === 0}
        onClick={() => setShowcaseOpen(true)}
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </span>
  </TooltipTrigger>
  {showcaseUnits.length === 0 && (
    <TooltipContent>No photos to showcase</TooltipContent>
  )}
</Tooltip>
```

### ShowcaseMode Component Skeleton
```typescript
// src/features/units/ShowcaseMode.tsx
import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

interface ShowcaseModeProps {
  units: Unit[];
  photos: Map<number, UnitPhotoWithUrl>;
  factions: Faction[];
  onClose: () => void;
}

export function ShowcaseMode({ units, photos, factions, onClose }: ShowcaseModeProps) {
  const [index, setIndex] = useState(0);
  const factionMap = useMemo(() => new Map(factions.map(f => [f.id, f])), [factions]);

  const handleClose = useCallback(async () => {
    if (isTauri()) {
      await getCurrentWindow().setFullscreen(false);
    } else if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    }
    onClose();
  }, [onClose]);

  // Enter fullscreen on mount, exit on unmount
  useEffect(() => {
    async function enter() {
      if (isTauri()) {
        await getCurrentWindow().setFullscreen(true);
      } else {
        await document.documentElement.requestFullscreen?.();
      }
    }
    enter();
    return () => {
      // Safety net: exit fullscreen when component unmounts for any reason
      if (isTauri()) {
        getCurrentWindow().setFullscreen(false).catch(() => {});
      } else if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % units.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + units.length) % units.length);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [units.length, handleClose]);

  const unit = units[index];
  const photo = unit ? photos.get(unit.id) : undefined;
  const faction = unit ? factionMap.get(unit.faction_id) : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Exit button — top right */}
      {/* Prev/Next arrows — left/right edges */}
      {/* Photo — centered, object-contain */}
      {/* Bottom overlay — name + faction + counter */}
    </div>
  );
}
```

### Tauri Capability Permission
```json
// src-tauri/capabilities/default.json — add to "permissions" array:
"core:window:allow-set-fullscreen"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `appWindow` exported from `@tauri-apps/api/window` (Tauri 1) | `getCurrentWindow()` function call (Tauri 2) | Tauri 2.0 release | Must use function, not import; project already on Tauri 2 |
| All window commands allowed by default (Tauri 1) | Explicit capabilities per command (Tauri 2) | Tauri 2.0 release | Must add `core:window:allow-set-fullscreen` to `default.json` |
| `withGlobalTauri: true` check via `window.__TAURI__` | `isTauri()` from `@tauri-apps/api/core` | Tauri 2.0 | Official function; cleaner than checking globals |

---

## Open Questions

1. **Tooltip component availability**
   - What we know: shadcn/ui `Tooltip` is a standard component in the new-york style
   - What's unclear: Whether it has already been added to the project's `src/components/ui/` directory
   - Recommendation: Planner should add a Wave 0 step to check for `src/components/ui/tooltip.tsx`; if absent, run `pnpm dlx shadcn@latest add tooltip`

2. **Photo transition animation (Claude's Discretion)**
   - What we know: Options are instant swap, CSS crossfade (`transition-opacity`), or slide
   - What's unclear: Performance in jsdom tests and Tauri WebView
   - Recommendation: Use instant swap (no transition) for Wave 1; can add `transition-opacity duration-200` as a trivial CSS change in a follow-on task. Instant swap avoids complexity and is completely testable.

3. **Cursor auto-hide in Showcase (Claude's Discretion)**
   - What we know: Can be done with CSS `cursor: none` after inactivity timer
   - What's unclear: Whether this is worth the inactivity timer complexity (mousemove listener + setTimeout)
   - Recommendation: Skip cursor auto-hide — it is not in the success criteria. The semi-transparent button hover affordance is sufficient.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/collection/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISP-01 | `battleReady` toggle added to Zustand store | unit | `pnpm test -- tests/collection/collectionFilters.test.ts` | ✅ (extend) |
| DISP-01 | `battleReady: false` reset by `clearAll` | unit | `pnpm test -- tests/collection/collectionFilters.test.ts` | ✅ (extend) |
| DISP-01 | `applyUnitFilters` with `battleReady: true` keeps only `status_assembly=1 && status_painting="Completed"` | unit | `pnpm test -- tests/collection/unitFilters.test.ts` | ✅ (extend) |
| DISP-01 | `applyUnitFilters` `battleReady` composes with `activeOnly` | unit | `pnpm test -- tests/collection/unitFilters.test.ts` | ✅ (extend) |
| DISP-02 | Showcase entry button is disabled when `showcaseUnits.length === 0` | component smoke | `pnpm test -- tests/collection/showcaseMode.test.tsx` | ❌ Wave 0 |
| DISP-02 | Showcase renders unit name, faction, and photo when open | component smoke | `pnpm test -- tests/collection/showcaseMode.test.tsx` | ❌ Wave 0 |
| DISP-03 | Escape key calls `onClose` | component smoke | `pnpm test -- tests/collection/showcaseMode.test.tsx` | ❌ Wave 0 |
| DISP-03 | X button click calls `onClose` | component smoke | `pnpm test -- tests/collection/showcaseMode.test.tsx` | ❌ Wave 0 |
| DISP-02/03 | Arrow keys navigate between units | component smoke | `pnpm test -- tests/collection/showcaseMode.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/collection/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/collection/showcaseMode.test.tsx` — covers DISP-02 and DISP-03; mock `@tauri-apps/api/window` and `@tauri-apps/api/core` (same mock pattern as `@tauri-apps/api/core` used in existing tests)
- Extend `tests/collection/collectionFilters.test.ts` — add `battleReady` cases (no new file, but new test cases)
- Extend `tests/collection/unitFilters.test.ts` — add `battleReady` filter cases

---

## Sources

### Primary (HIGH confidence)
- `https://v2.tauri.app/reference/javascript/api/namespacewindow/` — `getCurrentWindow()` API, `setFullscreen(boolean)` signature confirmed
- `https://v2.tauri.app/reference/acl/core-permissions/` — `core:window:allow-set-fullscreen` permission identifier confirmed; `core:window:default` does NOT include mutating operations
- `https://v2.tauri.app/reference/javascript/api/namespacecore/` — `isTauri()` function, import from `@tauri-apps/api/core`
- Project source files (direct read): `collectionFilters.ts`, `applyUnitFilters.ts`, `UnitFilters.tsx`, `CollectionPage.tsx`, `UnitGallery.tsx`, `useUnitPhotos.ts`, `unit.ts`, `default.json`, `tauri.conf.json`

### Secondary (MEDIUM confidence)
- WebSearch result: `core:window:allow-set-fullscreen` identifier verified against official docs page
- WebSearch + official discussion: `isTauri()` detection pattern for dev-mode fallback

### Tertiary (LOW confidence)
- Tooltip component availability — assumed present but not verified (Wave 0 gap)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified against official Tauri 2 docs; all dependencies already installed
- Architecture: HIGH — patterns read directly from project source; sibling portal pattern is a locked project convention
- Pitfalls: HIGH — JS modulo sign, `clearAll` omission, and Tauri dev-mode crash are all verifiable from source code
- Permission name: HIGH — `core:window:allow-set-fullscreen` confirmed from official ACL reference

**Research date:** 2026-05-05
**Valid until:** 2026-11-05 (stable Tauri 2 APIs; ~6 months)
