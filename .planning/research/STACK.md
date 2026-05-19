# Stack Research

**Domain:** Painting Mode — focused recipe execution + session logging (HobbyForge v0.2.15)
**Researched:** 2026-05-19
**Confidence:** HIGH

---

## Context

This is an **additive** milestone. The existing validated stack handles virtually everything needed
for Painting Mode. This document evaluates only the net-new capabilities: keyboard shortcut handling,
full-screen/focus mode, step-by-step wizard UX, and step transition animations.

---

## Summary

**One new npm package needed: `react-hotkeys-hook` v5.3.2.**

Everything else — fullscreen, step navigation, animations, session logging — is covered by the
existing stack. The fullscreen pattern is already proven in `ShowcaseMode.tsx`. Step navigation is
trivial index state. Animations are covered by Tailwind v4 + the `tw-animate-css` package already
installed.

---

## Recommended Stack

### New Package

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `react-hotkeys-hook` | `^5.3.2` | Declarative keyboard shortcut hook for Space/Arrow/Escape in Painting Mode | Handles conditional enable/disable (`enabled` option), does not require a provider, scopes to focused elements via ref, cleans up automatically. The existing native `addEventListener` pattern in `ShowcaseMode.tsx` works for 2–3 keys in a single isolated overlay but scales poorly to 5+ shortcuts with focus-aware disabling. 8 KB gzipped. React 19 compatible (`peerDeps: react >= 16.8`). Actively maintained (v5.3.2 released May 2026). |

### Existing Stack — No Changes Needed

| Capability | Existing Mechanism | Notes |
|------------|-------------------|-------|
| Full-screen window | `@tauri-apps/api/window` — `getCurrentWindow().setFullscreen(true/false)` | Already used in `ShowcaseMode.tsx`. Proven pattern. `core:window:allow-set-fullscreen` already in `capabilities/default.json`. |
| Distraction-free overlay layout | `fixed inset-0 z-50` + Tailwind CSS | Same structure as `ShowcaseMode.tsx`. Covers AppLayout's sidebar/header without any state changes. |
| Step navigation state | React `useState` (local) | Trivial index in a custom `usePaintingMode` hook. No Zustand needed for step index; Zustand used only for the entry point (which unit/recipe to open). |
| Step completion reads/writes | React Query + existing `applied_recipe_step_progress` queries | No new query keys needed. Same cache as the collection/applied-recipe views. |
| Session log form | React Hook Form + Zod | Same pattern as `LogSessionSheet.tsx`. Pre-fill context from Painting Mode props. |
| Step transition animation | Tailwind v4 `transition-opacity duration-150` + `tw-animate-css` `animate-fade-in` | Already installed. Sufficient for a 150 ms opacity fade between steps. |
| Section progress display | `useMemo` over completed step IDs | Pure computation, no library. |
| Paint availability warnings | Existing `recipe_step_paint_availability` query pattern | Already proven in Recipe detail view. |
| Icons | Lucide React | `Play`, `Check`, `ChevronLeft`, `ChevronRight`, `Maximize2`, `X` already in bundle. |
| UI primitives | shadcn/ui `Card`, `Badge`, `Button`, `Progress` | No new component categories. |

---

## Key Integration Points

### Keyboard Shortcuts (useHotkeys)

```ts
import { useHotkeys } from "react-hotkeys-hook";

// In PaintingModeOverlay.tsx
useHotkeys("space", () => markCurrentStepDone(), {
  preventDefault: true,
  enabled: !sessionFormOpen,   // disable when log form is open
});
useHotkeys("arrowRight", goNext, { preventDefault: true, enabled: !sessionFormOpen });
useHotkeys("arrowLeft",  goPrev, { preventDefault: true, enabled: !sessionFormOpen });
useHotkeys("escape",     onExit, { preventDefault: true });
```

The `enabled` option accepts a boolean — set it to `false` when a form input has focus (derive
from a `sessionFormOpen` state flag) so Space does not interfere with textarea input.

### Fullscreen Lifecycle (copy-adapt ShowcaseMode.tsx)

```ts
// Enter on mount, exit on unmount — identical to ShowcaseMode.tsx
useEffect(() => {
  if (isTauri()) getCurrentWindow().setFullscreen(true);
  return () => { getCurrentWindow().setFullscreen(false).catch(() => {}); };
}, []);
```

No new imports beyond what `ShowcaseMode.tsx` already uses.

### Step Wizard (no library)

```ts
// src/features/painting-mode/usePaintingMode.ts
export function usePaintingMode(steps: RecipeStep[]) {
  const [index, setIndex] = useState(0);
  return {
    index,
    current: steps[index],
    total: steps.length,
    goNext: () => setIndex(i => Math.min(i + 1, steps.length - 1)),
    goPrev: () => setIndex(i => Math.max(i - 1, 0)),
    jumpTo: (i: number) => setIndex(i),
    isFirst: index === 0,
    isLast:  index === steps.length - 1,
  };
}
```

Section progress derives from `completedStepIds: Set<number>` passed in from React Query.

### Step Transition Animation

Use `key={currentIndex}` on the step content card to trigger a remount + fade-in:

```tsx
<div key={index} className="animate-fade-in">
  {/* current step content */}
</div>
```

`animate-fade-in` is provided by `tw-animate-css` (already installed). Duration is ~150 ms by
default — appropriate for a desk-side execution UI. No Framer Motion needed.

---

## Installation

```bash
# One new package
pnpm add react-hotkeys-hook
```

No Rust changes. No Tauri capability changes. No new shadcn components.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `react-hotkeys-hook` | Native `addEventListener` (ShowcaseMode pattern) | Scales poorly past 3 shortcuts; no `enabled` toggle; no element scoping; boilerplate cleanup per component |
| `react-hotkeys-hook` | TanStack Hotkeys | Newer, less adoption, different API paradigm (template-string bindings), no established use in project |
| Custom `usePaintingMode` hook | `react-step-wizard`, `react-wizard` | Abstract over trivial index state; no shadcn integration; no benefit for linear array navigation |
| Custom `usePaintingMode` hook | shadcn community stepper packages | Copy-paste compatibility risk; shadcn native stepper not yet available (GitHub #5987 open) |
| Tailwind v4 `animate-fade-in` | Framer Motion | +30 KB for a 150 ms fade already solved by `tw-animate-css`; no spring/gesture needs in Painting Mode |
| Existing `@tauri-apps/api/window` | New Tauri child window | Child window requires new Rust commands, IPC for state sync, separate window lifecycle; overkill for an overlay mode |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Framer Motion / Motion React | +30 KB bundle for effects already handled by Tailwind v4 + `tw-animate-css` | `animate-fade-in` utility class, `transition-opacity duration-150` |
| Any stepper/wizard library | Step navigation is 10 lines of `useState`; no generic wizard adds value | Custom `usePaintingMode` hook |
| `@tauri-apps/plugin-global-shortcut` | Registers OS-level shortcuts active when window is unfocused — intrusive for an in-app mode | `useHotkeys` scoped to the overlay component |
| `react-use` or `ahooks` | Large utility bundles; keyboard hook is one of hundreds of unrelated utilities | Targeted `react-hotkeys-hook` at 8 KB |
| Tauri child windows | IPC complexity, separate lifecycle, new Rust commands | `fixed inset-0 z-50` overlay over existing window |
| New Tauri capability permissions | `core:window:allow-set-fullscreen` already present in `capabilities/default.json` | No changes needed |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `react-hotkeys-hook` | `^5.3.2` | React `>=16.8` — confirmed React 19 compatible | `peerDependencies` uses `>=16.8.0`; no upper bound restriction |

---

## Sources

- [react-hotkeys-hook GitHub](https://github.com/JohannesKlauss/react-hotkeys-hook) — peerDependencies and release history verified (HIGH)
- [react-hotkeys-hook API docs](https://react-hotkeys-hook.vercel.app/docs/api/use-hotkeys) — `enabled`, `preventDefault`, scope options confirmed (HIGH)
- [Tauri Core Permissions](https://v2.tauri.app/reference/acl/core-permissions/) — `core:window:allow-set-fullscreen` confirmed (HIGH)
- [Tauri Window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/) — `setFullscreen`, `isFullscreen` confirmed (HIGH)
- [shadcn stepper issue #5987](https://github.com/shadcn-ui/ui/issues/5987) — no native Stepper, still open as of 2026 (MEDIUM)
- `src-tauri/capabilities/default.json` (project file) — `core:window:allow-set-fullscreen` already present (HIGH)
- `src/features/units/ShowcaseMode.tsx` (project file) — fullscreen + keyboard pattern proven in production (HIGH)
- `package.json` (project file) — `tw-animate-css` already installed; Framer Motion absent (HIGH)

---
*Stack research for: HobbyForge v0.2.15 Painting Mode*
*Researched: 2026-05-19*
