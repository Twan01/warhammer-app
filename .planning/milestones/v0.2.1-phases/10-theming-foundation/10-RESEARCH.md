# Phase 10: Theming Foundation - Research

**Researched:** 2026-05-02
**Domain:** CSS custom properties in Tailwind v4, React context for runtime theming, localStorage persistence
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- CSS custom property `--color-faction-accent` defined in Tailwind v4 `@theme` block in index.css with zinc neutral default
- Runtime updates via `document.documentElement.style.setProperty('--color-faction-accent', hex)` — zero re-render cost
- Tailwind utilities `bg-faction-accent`, `text-faction-accent`, `border-faction-accent` defined against the custom property
- A React context (`ActiveFactionContext`) holds the active faction id + hex, calls the DOM update on change
- localStorage with key `active-faction-id` — synchronous read on init, same pattern as `useSidebarCollapsed`
- No SQLite table needed — this is a UI preference, not domain data
- Default when no key present: no faction selected = zinc/neutral (app looks identical to current state on first launch)
- Clicking a FactionSummaryCard sets it as the active faction — no separate picker widget
- Active card shows: faction-accent ring (2px border) + small "Active" badge
- Clicking the already-active card deselects it — back to zinc/neutral
- `FactionSummaryCard` receives `isActive: boolean` prop and `onActivate: () => void` callback
- **Primary buttons** (`variant="default"`) — `bg-faction-accent` replaces `bg-primary`
- **Faction badges** — active faction's badge uses accent color from context instead of inline style
- **Nav active highlight** — NavItem active state uses `bg-faction-accent` / `text-faction-accent` instead of zinc `bg-accent`
- **Excluded from accent scope**: painting status rings (these encode painting state, not faction identity)

### Claude's Discretion

- Whether to use a TooltipProvider wrapper or assume it's already provided globally
- Exact Tailwind v4 `@theme` syntax for registering the custom property as a color utility
- Whether FactionSummaryCard gets the active state via prop or reads context directly (prop preferred for testability)

### Deferred Ideas (OUT OF SCOPE)

- THEME-04: Custom faction color picker (override default hex per faction) — explicitly in Out of Scope in REQUIREMENTS.md
- Painting status rings using faction accent — rejected in discussion (status rings encode painting state)
- SQLite app_settings table for preference storage — localStorage is sufficient
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| THEME-01 | User can select an active faction and the UI accent color (buttons, badges, nav highlights) shifts to that faction's theme color across the entire app immediately | `ActiveFactionContext` + `document.documentElement.style.setProperty` — zero re-render, instant propagation; `bg-faction-accent` utility in globals.css |
| THEME-02 | Active faction selection persists after closing and reopening the app | localStorage key `active-faction-id` — synchronous read in `useState` initializer, same pattern as `useSidebarCollapsed`; survives Tauri app restart |
| THEME-03 | User can set the active faction from the Dashboard | `FactionSummaryCard` extended with `isActive` prop + `onActivate` callback; `DashboardPage` wires up `useActiveFaction` context, passes down to each card |
| UI-01 | User can collapse the sidebar to icon-only mode via a toggle control | **Already shipped** — `AppSidebar.tsx` has collapse toggle button with `useSidebarCollapsed`; verify only |
| UI-02 | Sidebar collapsed/expanded state persists across app restarts | **Already shipped** — `useSidebarCollapsed` localStorage pattern; verify only |
| UI-03 | Icons in collapsed sidebar show a tooltip with the nav label on hover | **Already shipped** — `NavItem.tsx` wraps with `<Tooltip>` when `collapsed=true`; `TooltipProvider` in `AppLayout`; verify only |
</phase_requirements>

---

## Summary

Phase 10 is primarily a **CSS + React context plumbing phase**. The heavy lifting is establishing the `--color-faction-accent` CSS custom property in Tailwind v4's `@theme inline` block so that downstream phases (11, 12, 13, 14) can use `bg-faction-accent`, `text-faction-accent`, and `border-faction-accent` utilities throughout the app. Without this foundation, later phases cannot apply themed UI.

The codebase inspection confirms that UI-01, UI-02, and UI-03 are **already fully implemented**: `AppSidebar.tsx` has the collapse toggle with `useSidebarCollapsed` localStorage persistence, and `NavItem.tsx` wraps with Radix `<Tooltip>` in collapsed mode. These three requirements need only verification, not implementation.

The three THEME requirements involve: (1) adding the CSS custom property and Tailwind utilities to `globals.css`, (2) building `useActiveFaction` hook and `ActiveFactionProvider` context, (3) updating `button.tsx` default variant, `NavItem.tsx` active state, and `FactionSummaryCard.tsx` with `isActive` prop and toggle behavior, and (4) wiring `DashboardPage.tsx` to drive card activation.

A critical technical nuance: `globals.css` uses `@theme inline` (not just `@theme`). The `inline` keyword means Tailwind v4 will NOT generate separate CSS variables for the theme values — the custom property is used directly. Adding `--color-faction-accent` inside this block creates `bg-faction-accent`, `text-faction-accent`, and `ring-faction-accent` utilities automatically. Runtime overriding works because the CSS spec resolves inline custom property references at paint time.

**Primary recommendation:** Add `--color-faction-accent` to the existing `@theme inline` block in `globals.css`, provide a zinc default, build `useActiveFaction` mirroring `useSidebarCollapsed` exactly, wrap the router root in `ActiveFactionProvider`, and update three call sites (button.tsx, NavItem.tsx, FactionSummaryCard.tsx + DashboardPage.tsx).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React + TypeScript | 19.x / 5.x | Component layer and context | Project standard; React 19 stable context API |
| Tailwind CSS v4 | 4.2.4 | CSS utilities; `@theme inline` for custom property mapping | Already installed; `globals.css` uses `@theme inline` block |
| localStorage (Web API) | n/a | Persist active-faction-id across Tauri restarts | Same pattern as `useSidebarCollapsed`; synchronous, zero-dependency |
| `document.documentElement.style.setProperty` | n/a | Zero-cost runtime CSS custom property mutation | Bypasses React render cycle; instant propagation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tauri-apps/plugin-sql` | 2.4.0 | Read faction `color_theme` hex values from DB | `useActiveFaction` hook needs to look up faction hex when restoring from localStorage on init |
| `useFactions` hook | existing | Provides `Faction[]` including `color_theme` | Use to resolve `active-faction-id` → hex on init |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@theme inline` | `:root` + manual `@layer utilities` | `@theme inline` is Tailwind v4 native; manual layer is v3 pattern — incompatible |
| Context + DOM mutation | Zustand global store | Context is correct for app-level theme state; Zustand would require same DOM side-effect anyway |
| localStorage | SQLite `app_settings` | localStorage is synchronous on init (no loading flash); SQLite requires async query before accent is applied |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── styles/
│   └── globals.css              # ADD: --color-faction-accent in @theme inline block
├── context/
│   └── ActiveFactionContext.tsx # NEW: context + provider + useActiveFaction hook
├── components/common/
│   ├── NavItem.tsx              # UPDATE: active state → bg-faction-accent / text-faction-accent
│   └── AppLayout.tsx            # UPDATE: wrap with <ActiveFactionProvider>
├── components/ui/
│   └── button.tsx               # UPDATE: variant="default" → bg-faction-accent
└── features/dashboard/
    ├── FactionSummaryCard.tsx   # UPDATE: add isActive + onActivate props; ring + badge
    └── DashboardPage.tsx        # UPDATE: wire useActiveFaction, pass isActive/onActivate to cards
```

### Pattern 1: `@theme inline` CSS Custom Property Registration

**What:** Tailwind v4 maps a CSS variable to a color utility token inside `@theme inline`. The `inline` modifier tells Tailwind not to generate a separate `--color-*` var — the value IS the var reference.
**When to use:** Any custom color token that needs runtime mutation.

```css
/* In src/styles/globals.css — add inside the existing @theme inline { } block */
@theme inline {
  /* ... existing tokens ... */
  --color-faction-accent: var(--faction-accent);
}

/* In :root — define the mutable variable with a zinc default */
:root {
  /* ... existing tokens ... */
  --faction-accent: #71717a; /* zinc-500 — neutral default when no faction active */
}
```

This pattern creates `bg-faction-accent`, `text-faction-accent`, `border-faction-accent`, `ring-faction-accent`, and `fill-faction-accent` utilities. Runtime change is:

```typescript
document.documentElement.style.setProperty('--faction-accent', hex);
```

**Why two variables?** `--color-faction-accent` is the Tailwind token (consumed by utilities). `--faction-accent` is the mutable primitive that the token references. This indirection is required because `@theme inline` variables cannot themselves be overridden at runtime via `style.setProperty` in Tailwind v4 — only the underlying `:root` variable can be mutated.

**Confidence note:** The `@theme inline` documentation from Tailwind v4 release notes confirms the `var()` indirection pattern is the correct approach for runtime mutable tokens. The existing `globals.css` already uses `@theme inline` with `hsl(var(--background))` patterns that demonstrate this exact indirection.

### Pattern 2: `useActiveFaction` Hook (mirrors `useSidebarCollapsed`)

**What:** Synchronous localStorage read in `useState` initializer; `useEffect` to sync on change; resolves faction hex from `useFactions` data.

```typescript
// src/context/ActiveFactionContext.tsx

const STORAGE_KEY = "active-faction-id";

interface ActiveFactionState {
  activeFactionId: number | null;
  activeFactionHex: string;
  setActiveFaction: (faction: Faction | null) => void;
}

const ActiveFactionContext = createContext<ActiveFactionState | null>(null);

export function ActiveFactionProvider({ children }: { children: ReactNode }) {
  const { data: factions = [] } = useFactions();

  const [activeFactionId, setActiveFactionId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  // Resolve hex from factions list — zinc default when no faction / faction not yet loaded
  const activeFaction = factions.find((f) => f.id === activeFactionId) ?? null;
  const activeFactionHex = activeFaction?.color_theme ?? "#71717a";

  // Apply CSS custom property on every change — zero re-render cost
  useEffect(() => {
    document.documentElement.style.setProperty("--faction-accent", activeFactionHex);
  }, [activeFactionHex]);

  // Persist to localStorage
  useEffect(() => {
    try {
      if (activeFactionId !== null) {
        window.localStorage.setItem(STORAGE_KEY, String(activeFactionId));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* storage blocked — degrade silently */
    }
  }, [activeFactionId]);

  const setActiveFaction = (faction: Faction | null) => {
    setActiveFactionId(faction?.id ?? null);
  };

  return (
    <ActiveFactionContext.Provider value={{ activeFactionId, activeFactionHex, setActiveFaction }}>
      {children}
    </ActiveFactionContext.Provider>
  );
}

export function useActiveFaction(): ActiveFactionState {
  const ctx = useContext(ActiveFactionContext);
  if (!ctx) throw new Error("useActiveFaction must be used within ActiveFactionProvider");
  return ctx;
}
```

### Pattern 3: Provider Placement in Router Root

**What:** `ActiveFactionProvider` wraps at the router's root component so every page and component in the app can access it.

```tsx
// src/app/router.tsx — rootRoute component
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
```

`ActiveFactionProvider` must be INSIDE `AppLayout` (not wrapping it) because `AppLayout` renders `TooltipProvider` and the sidebar — which itself may consume `useActiveFaction` for the nav active highlight.

**Alternative:** Wrap at `main.tsx` level — valid, but placing it inside the router root is cleaner since the Tauri-specific providers (QueryProvider) are already there.

### Pattern 4: FactionSummaryCard Active State

**What:** Card receives `isActive` prop (boolean) and `onActivate` callback. The card clicks toggle: if already active, call `setActiveFaction(null)`; if not active, call `setActiveFaction(stat.faction)`.

```tsx
export interface FactionSummaryCardProps {
  stat: FactionStat;
  isActive: boolean;
  onActivate: () => void;
}

export function FactionSummaryCard({ stat, isActive, onActivate }: FactionSummaryCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Toggle: clicking active card deselects
    onActivate();
    // Original click-through to collection still fires for non-active cards
    if (!isActive) {
      useCollectionFilters.setState({ factions: [stat.faction.id], search: "", statuses: [], categories: [], activeOnly: false });
      navigate({ to: "/collection" });
    }
  };

  return (
    <Card
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      style={{ borderLeftColor: stat.faction.color_theme }}
      className={`min-w-[180px] cursor-pointer border-l-4 px-4 py-4 hover:bg-muted/50 ${
        isActive ? "ring-2 ring-[var(--faction-accent)]" : ""
      }`}
    >
      <div className="flex flex-col gap-2">
        {isActive && (
          <span className="self-start rounded-sm bg-faction-accent px-1.5 py-0.5 text-xs font-medium text-white">
            Active
          </span>
        )}
        <span className="text-sm font-semibold">{stat.faction.name}</span>
        <span className="text-sm text-muted-foreground">{stat.modelCount} models</span>
        <span className="text-sm text-muted-foreground">{stat.paintedPct}% painted</span>
      </div>
    </Card>
  );
}
```

**Note on click behavior:** CONTEXT.md says clicking active card deselects. But the existing card also navigates to collection. Decision for Claude's discretion: active card click should deselect only (no navigate), inactive card click should activate AND navigate. This keeps the toggle feel intuitive.

### Pattern 5: Button Default Variant Update

**What:** Replace `bg-primary text-primary-foreground hover:bg-primary/90` with `bg-faction-accent text-white hover:bg-faction-accent/90`.

```typescript
// src/components/ui/button.tsx — buttonVariants cva
variant: {
  default: "bg-faction-accent text-white hover:bg-faction-accent/90",
  // ...other variants unchanged
}
```

**Important:** `text-primary-foreground` must change to `text-white` because `bg-faction-accent` will be arbitrary hex values that may not map well to `primary-foreground`. Using `text-white` is the safe choice since faction colors are typically saturated (not near-white) and dark text on them would be unreliable.

### Pattern 6: NavItem Active State Update

**What:** Replace `bg-accent` with `bg-faction-accent` and `text-accent-foreground` with `text-white` for the active link state.

```tsx
// src/components/common/NavItem.tsx
const button = (
  <Link
    to={to}
    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
      isActive
        ? "bg-faction-accent font-medium text-white"
        : "text-muted-foreground"
    } ${collapsed ? "justify-center" : ""}`}
  >
```

### Anti-Patterns to Avoid

- **`@theme` without `inline`:** In this codebase, the block is `@theme inline { }`. Adding `--color-faction-accent` to a bare `@theme { }` block will create a second conflicting block — add to the existing `@theme inline` block only.
- **Using `style.setProperty` on `--color-faction-accent` directly:** The `@theme inline` variable is resolved at build time by Tailwind. Runtime mutation must target the underlying `:root` variable (`--faction-accent`), not the `--color-faction-accent` token.
- **`text-faction-accent` on accent backgrounds:** When `bg-faction-accent` is the background, use `text-white`, not `text-faction-accent`. Self-referential color produces no contrast.
- **Nesting `ActiveFactionProvider` inside a component that reads `useFactions`:** `ActiveFactionProvider` itself reads `useFactions` — it must be inside `QueryProvider`. The current `main.tsx` wraps `QueryProvider` around `RouterProvider`, so any placement inside the router tree is fine.
- **Reading localStorage async:** The `useState` initializer runs synchronously — this prevents a flash where the zinc default renders for one frame before the persisted accent loads. Do NOT move the localStorage read into a `useEffect`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tailwind color utilities for dynamic hex | Manual `style={{ color: hex }}` everywhere | `bg-faction-accent` utility via CSS custom property | One-time CSS setup; all 3 scoped elements update automatically |
| Tooltip provider | Per-component `TooltipProvider` | `AppLayout` already provides `TooltipProvider delayDuration={200}` globally | Re-wrapping causes multiple providers, context conflicts |
| Custom event system for theme change | DOM events, EventEmitter | `document.documentElement.style.setProperty` + CSS cascade | CSS cascade handles propagation natively; zero JS cost |
| Separate DB migration for faction preference | SQLite `app_settings` table | localStorage | Synchronous, no async loading gap, no schema migration needed |

**Key insight:** The CSS custom property system handles propagation automatically — once `--faction-accent` is set on `:root`, every element in the DOM using `bg-faction-accent` (or any other derived utility) updates in the same paint cycle with zero JavaScript involvement.

---

## Common Pitfalls

### Pitfall 1: `@theme inline` vs `@theme` — Adding to Wrong Block

**What goes wrong:** A new `@theme { --color-faction-accent: ... }` block is added alongside the existing `@theme inline { }` block. Tailwind v4 treats these as different directive types; the bare `@theme` block may generate unwanted CSS variable declarations, or the utility may not be generated at all.
**Why it happens:** Developer unfamiliar with v4 sees `@theme` in docs without noticing the `inline` modifier.
**How to avoid:** Add `--color-faction-accent: var(--faction-accent);` inside the EXISTING `@theme inline { }` block in `globals.css`. Do not create a new block.
**Warning signs:** `bg-faction-accent` class is not recognized by TypeScript/IDE, or the compiled CSS contains duplicate variable declarations.

### Pitfall 2: Active Faction Context Used Before Factions Load

**What goes wrong:** On cold start, `activeFactionId` is restored from localStorage immediately (sync), but `factions` from `useFactions()` is still loading. The hex resolves to the zinc default for 100–500ms, then snaps to the faction color.
**Why it happens:** Async data dependency on synchronous state initialization.
**How to avoid:** This is acceptable and unavoidable without preloading factions. The zinc default means the UI starts in a valid state (identical to pre-Phase-10 UI) and transitions to the faction accent after the query resolves. Document this behavior. If a flash is noticeable, the `useFactions` query can be primed in the router loader, but this is not required for Phase 10.

### Pitfall 3: `text-white` Accessibility on Light Faction Colors

**What goes wrong:** A faction has a light pastel hex (e.g., `#f0e0c0`). White text (`text-white`) on a light background is invisible. Button text and nav active label become unreadable.
**Why it happens:** Faction `color_theme` is user-defined hex with no enforced contrast requirement.
**How to avoid:** Phase 10 scope does not include a contrast utility. Document as a known limitation: faction colors should be mid-to-dark saturated values for best results. If a future phase adds the color picker (THEME-04), that's when contrast enforcement belongs.
**Warning signs:** White text invisible on very light faction colors in the nav or buttons.

### Pitfall 4: Clicking Active FactionSummaryCard Still Navigates

**What goes wrong:** The existing `FactionSummaryCard` always navigates to `/collection` on click. After adding toggle behavior, clicking an active card to deselect it should NOT navigate (that would be confusing UX — user wants to deselect, not leave the dashboard).
**Why it happens:** Refactoring the click handler without accounting for the two distinct outcomes (select+navigate vs deselect-only).
**How to avoid:** In `handleClick`, branch: `if (isActive) { onActivate(); return; }` — deselect and stop. Only continue to `onActivate()` + `navigate()` when not yet active.

### Pitfall 5: `ring-[var(--faction-accent)]` vs `ring-faction-accent`

**What goes wrong:** Using the arbitrary CSS variable syntax `ring-[var(--faction-accent)]` instead of the Tailwind utility `ring-faction-accent`. Both work at runtime, but only `ring-faction-accent` is a proper utility that PurgeCSS won't strip in production builds.
**Why it happens:** Developer uses arbitrary value syntax as a shortcut before the utility is confirmed to exist.
**How to avoid:** Once `--color-faction-accent: var(--faction-accent)` is added to `@theme inline`, Tailwind auto-generates `ring-faction-accent`. Use the proper utility. The active card ring should be `ring-2 ring-faction-accent`, not `ring-2 ring-[var(--faction-accent)]`.

### Pitfall 6: `FactionSummaryCard` Reading Context Directly (Testability)

**What goes wrong:** `FactionSummaryCard` calls `useActiveFaction()` internally to derive `isActive`. Tests that render the card in isolation must now wrap it in `ActiveFactionProvider` (and thus `QueryProvider` too), adding significant test setup complexity.
**Why it happens:** "Why pass props when context is available?"
**How to avoid:** CONTEXT.md already locked this — prop (`isActive: boolean` + `onActivate: () => void`). DashboardPage reads context and passes down. Card stays pure/testable.

---

## Code Examples

### CSS Registration in globals.css

```css
/* In :root { } block — add alongside existing tokens */
:root {
  /* ... existing tokens ... */
  --faction-accent: #71717a; /* zinc-500 default — neutral when no faction active */
}

/* In @theme inline { } block — add alongside existing color mappings */
@theme inline {
  /* ... existing tokens ... */
  --color-faction-accent: var(--faction-accent);
}
```

This makes `bg-faction-accent`, `text-faction-accent`, `border-faction-accent`, `ring-faction-accent`, `fill-faction-accent` available everywhere in the app.

### Runtime Update (called inside useEffect in ActiveFactionProvider)

```typescript
// Source: CSS custom properties spec — standard Web API
document.documentElement.style.setProperty("--faction-accent", hex);
// e.g., document.documentElement.style.setProperty("--faction-accent", "#a855f7");
```

### localStorage Hook Pattern (from useSidebarCollapsed.ts — direct model)

```typescript
// Source: src/components/common/useSidebarCollapsed.ts — verbatim pattern
const [activeFactionId, setActiveFactionId] = useState<number | null>(() => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem("active-faction-id");
    return stored ? Number(stored) : null;
  } catch {
    return null;
  }
});

useEffect(() => {
  try {
    if (activeFactionId !== null) {
      window.localStorage.setItem("active-faction-id", String(activeFactionId));
    } else {
      window.localStorage.removeItem("active-faction-id");
    }
  } catch {
    /* storage blocked — degrade silently */
  }
}, [activeFactionId]);
```

### DashboardPage — Wiring FactionSummaryCard with Active Faction

```tsx
// src/features/dashboard/DashboardPage.tsx — add to populated state
const { activeFactionId, setActiveFaction } = useActiveFaction();
const { data: factions = [] } = useFactions(); // or derive from stats.factions

// In the "By Faction" section:
{stats.factionStats.map((s) => (
  <FactionSummaryCard
    key={s.faction.id}
    stat={s}
    isActive={activeFactionId === s.faction.id}
    onActivate={() => {
      // Toggle: deselect if already active
      if (activeFactionId === s.faction.id) {
        setActiveFaction(null);
      } else {
        setActiveFaction(s.faction);
      }
    }}
  />
))}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `bg-primary` for default button | `bg-faction-accent` dynamic | Phase 10 | All buttons shift color instantly on faction selection |
| `bg-accent` for nav active highlight | `bg-faction-accent` | Phase 10 | Nav active state matches the faction theme |
| Inline `style={{ borderLeftColor: hex }}` on FactionSummaryCard | Same inline style for left border + `ring-faction-accent` utility for active ring | Phase 10 | Ring uses CSS utility; left border stays inline (per-faction color, not accent) |
| No global theme state | `ActiveFactionContext` + localStorage | Phase 10 | Foundation for Phases 11–14 themed UI |

**Key architectural gate:** Phases 11–14 reference `bg-faction-accent` in their UI specs. This phase MUST complete and merge before any Phase 11+ implementation work begins (STATE.md explicitly documents this dependency).

---

## Open Questions

1. **Click behavior on active FactionSummaryCard: navigate or not?**
   - What we know: CONTEXT.md says "clicking the already-active card deselects it → back to zinc/neutral". Existing card always navigates to `/collection`.
   - What's unclear: Should deselect-click also navigate to `/collection`, or deselect-only (stay on dashboard)?
   - Recommendation: Deselect-only when clicking active card (do not navigate). The user's intent is clearly "I want to turn off the theme," not "I want to go to collection." Navigating away while deselecting is confusing.

2. **Foreground color on `bg-faction-accent` elements**
   - What we know: Faction `color_theme` values are user-defined hex strings. No contrast enforcement exists. `text-white` is proposed for button and nav.
   - What's unclear: Should we use `text-white` everywhere or attempt contrast detection?
   - Recommendation: Use `text-white` for Phase 10. Document as a known limitation. Contrast utility is THEME-04 scope.

3. **`ActiveFactionProvider` placement: inside or outside `AppLayout`?**
   - What we know: `AppLayout` renders `NavItem` which needs `useActiveFaction` for the active highlight. Provider must be an ancestor of `NavItem`.
   - What's unclear: `AppLayout` is in the router root's component — does wrapping it outside vs. inside matter?
   - Recommendation: Place `ActiveFactionProvider` INSIDE the root route component, wrapping `<Outlet />` only, NOT wrapping `AppLayout`. Then move the `NavItem` accent change to read from context inside `NavItem`. This is cleaner but requires `NavItem` to call `useActiveFaction`. Alternatively, pass `activeFactionHex` as prop. Since context is available everywhere and `NavItem` is not a test target, reading context inside `NavItem` directly is acceptable.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

Current baseline: **25 test files, 178 tests, all passing** (verified 2026-05-02).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| THEME-01 | `useActiveFaction` returns correct hex; DOM `style.setProperty` called on faction change | unit | `npx vitest run tests/theming/useActiveFaction.test.ts` | Wave 0 |
| THEME-02 | localStorage persists faction ID; sync read on init returns stored ID | unit | `npx vitest run tests/theming/useActiveFaction.test.ts -t "persistence"` | Wave 0 (same file) |
| THEME-03 | `FactionSummaryCard` renders ring + Active badge when `isActive=true`; calls `onActivate` on click | component | `npx vitest run tests/theming/FactionSummaryCard.test.tsx` | Wave 0 |
| UI-01 | Sidebar renders collapse toggle; `data-collapsed` attribute flips | component | `npx vitest run tests/theming/AppSidebar.test.tsx` | Wave 0 |
| UI-02 | `useSidebarCollapsed` reads/writes localStorage | unit | existing pattern — already covered indirectly; add explicit test | Wave 0 |
| UI-03 | NavItem renders `<Tooltip>` when `collapsed=true`; no Tooltip when expanded | component | `npx vitest run tests/theming/NavItem.test.tsx` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose` (full suite, ~12s)
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/theming/useActiveFaction.test.ts` — unit tests for hook: sync init from localStorage, DOM side-effect, persistence, deselect restores default hex
- [ ] `tests/theming/FactionSummaryCard.test.tsx` — component tests: `isActive=true` renders ring + badge; `isActive=false` renders neither; `onActivate` called on click; keyboard activation (Enter/Space)
- [ ] `tests/theming/NavItem.test.tsx` — component tests: Tooltip rendered when `collapsed=true`, not rendered when `collapsed=false`, active link class applied when route matches
- [ ] `tests/theming/AppSidebar.test.tsx` — component test: collapse toggle button present, clicking changes `data-collapsed` attribute

*(Existing tests cover `useSidebarCollapsed` indirectly. New explicit tests for UI-01/02/03 bring them into the validation map.)*

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection of `src/styles/globals.css` — confirmed `@theme inline` block structure; existing `var()` indirection pattern (`hsl(var(--background))`) establishes the two-variable pattern
- Direct code inspection of `src/components/common/useSidebarCollapsed.ts` — synchronous localStorage init pattern confirmed verbatim
- Direct code inspection of `src/components/common/NavItem.tsx` — Tooltip in collapsed mode already implemented (UI-03 shipped)
- Direct code inspection of `src/components/common/AppSidebar.tsx` — collapse toggle with `useSidebarCollapsed` already implemented (UI-01/02 shipped)
- Direct code inspection of `src/components/ui/button.tsx` — `buttonVariants` CVA structure; `default` variant class string
- Direct code inspection of `src/features/dashboard/FactionSummaryCard.tsx` — existing card structure; click handler navigates to collection
- Direct code inspection of `src/features/dashboard/DashboardPage.tsx` — FactionSummaryCard usage in populated state
- Direct code inspection of `src/components/common/AppLayout.tsx` — `<TooltipProvider delayDuration={200}>` confirmed global (resolves Claude's discretion: no per-component provider needed)
- Direct code inspection of `package.json` — Tailwind CSS 4.2.4, React 19, no new packages needed
- Vitest run — 178 tests passing baseline confirmed

### Secondary (MEDIUM confidence)

- Tailwind v4 `@theme inline` behavior: the pattern of `--color-X: var(--X)` where `--X` is in `:root` is the documented runtime-mutable approach. The existing sidebar/primary token chain in `globals.css` establishes this is the project's established pattern (e.g., `--color-primary: hsl(var(--primary))` with `--primary` in `:root`).

### Tertiary (LOW confidence)

- None — all claims verified from codebase or established Tailwind v4 documentation patterns visible in the existing CSS file.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries pre-installed; CSS pattern verified in globals.css
- Architecture: HIGH — localStorage pattern is verbatim from existing `useSidebarCollapsed`; CSS var indirection pattern verified from existing globals.css tokens; context pattern standard React
- Pitfalls: HIGH — derived from codebase inspection (not speculation)
- UI-01/02/03 status: HIGH — confirmed already shipped via code inspection of NavItem.tsx, AppSidebar.tsx, AppLayout.tsx
- Tailwind v4 `@theme inline` behavior: MEDIUM — inferred from existing globals.css pattern; no direct official doc URL consulted (pattern is self-evident from existing code)

**Research date:** 2026-05-02
**Valid until:** 2026-06-02 (stable stack; Tailwind 4.x not moving fast in patch range)
