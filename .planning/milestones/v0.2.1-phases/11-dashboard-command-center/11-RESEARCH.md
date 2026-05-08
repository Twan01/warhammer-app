# Phase 11: Dashboard Command Center - Research

**Researched:** 2026-05-03
**Domain:** React animation hooks, `requestAnimationFrame`, prefers-reduced-motion, existing dashboard component integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Custom `useCountUp(target: number, duration?: number)` hook using `requestAnimationFrame` — no new dependencies
- Ease-out easing: values increase quickly at first then slow to the final number
- Duration: ~600ms (fast — feels snappy, appropriate for a dashboard visited repeatedly)
- Integers only throughout animation — no decimal values mid-count
- Hook lives in `src/hooks/useCountUp.ts`
- The 4 top hero StatCards all animate: Total Models, Fully Painted, Battle-Ready Points, Active Projects
- The 3 Progress section cards (Painting %, Assembly %, Basing %) do NOT animate — they stay static
- For the percentage suffix cards (if ever added): animate the numeric part, append `%` statically
- Counters animate on every Dashboard mount — TanStack Router unmounts on navigation, so every page visit naturally re-triggers
- Counters also re-animate when the `dashboard-stats` query refetches with new data
- No session-level deduplication flag needed — every mount and every data change re-animates
- Phase 10 already delivered `ring-2 ring-faction-accent` on the active `FactionSummaryCard`
- Phase 11 verification only: confirm the ring renders with the correct faction color at runtime
- No additional changes to `FactionSummaryCard` are required — the Phase 10 implementation satisfies UI-08

### Claude's Discretion
- Exact rAF easing formula (e.g. `1 - Math.pow(1 - progress, 3)` cubic ease-out)
- Whether `useCountUp` accepts an optional `delay` parameter for staggered starts
- Loading skeleton design for the animated cards (if skeleton differs from current static skeleton)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-07 | Dashboard hero section shows animated stat counters for total units, painted count, and battle-ready percentage — counters animate from zero on first render | `useCountUp` hook with `requestAnimationFrame` + cubic ease-out; wired to the 4 hero `StatCard` instances in `DashboardPage.tsx` lines 184–187 |
| UI-08 | Dashboard faction summary section displays cards with faction-accent color accents driven by the active theme | Already delivered in Phase 10: `FactionSummaryCard` renders `ring-2 ring-faction-accent` when `isActive=true`; `ActiveFactionContext` mutates `--faction-accent` CSS property at runtime; Phase 11 is verify-only |
</phase_requirements>

---

## Summary

Phase 11 is a focused visual enhancement with two delivery items: (1) a custom `useCountUp` hook that drives count-up animation on the four hero `StatCard` instances, and (2) runtime verification that the faction-accent ring on `FactionSummaryCard` renders correctly with Phase 10's theming infrastructure.

The implementation surface is extremely narrow. No new routes, no new DB tables, no new shadcn components. Two files are modified (`StatCard.tsx`, `DashboardPage.tsx`), one file is created (`src/hooks/useCountUp.ts`), and one component is verified without code change (`FactionSummaryCard.tsx`). Everything else — the loading skeleton, the progress cards, the error and empty states — is explicitly out of scope.

The `requestAnimationFrame` count-up pattern is a well-established React primitive. The key implementation details are all locked: cubic ease-out formula, 600ms duration, integer-only output, every-mount re-trigger via TanStack Router's natural unmount-on-navigate behavior, and `prefers-reduced-motion` short-circuit as an accessibility requirement.

**Primary recommendation:** Build `useCountUp` as a pure `useEffect`/`useRef` rAF loop. Add an `animate?: boolean` prop to `StatCard`. Wire the 4 hero cards with `animate={true}`. Write one unit test for the hook and one integration test asserting the animated value is present in `DashboardPage`. Verify faction ring with a single targeted test.

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.0.0 | `useEffect`, `useRef`, `useState` for rAF loop | Already in project |
| TypeScript | ^5.6.3 | Type-safe hook signature | Already in project |
| Vitest | ^4.1.5 | Unit + component tests | Established test framework |
| @testing-library/react | ^16.3.2 | Component rendering in tests | Established test framework |

### No New Dependencies
Phase 11 uses zero new npm packages. `requestAnimationFrame` is a browser built-in available in jsdom (with polyfill if needed — see Pitfall 3).

**Installation:** none required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── hooks/
│   └── useCountUp.ts        # NEW — rAF count-up hook
├── features/dashboard/
│   ├── StatCard.tsx          # MODIFY — add animate?: boolean prop
│   └── DashboardPage.tsx     # MODIFY — pass animate={true} to 4 hero cards
tests/
└── dashboard/
    └── useCountUp.test.ts   # NEW — unit tests for hook behavior
```

### Pattern 1: requestAnimationFrame Count-Up Hook

**What:** A `useEffect`-based hook that captures start time on first frame, computes `progress = clamp(elapsed / duration, 0, 1)`, applies cubic ease-out, and sets state to `Math.round(eased * target)`. Cancels the rAF handle on unmount and re-starts when `target` or `duration` changes.

**When to use:** Any numeric counter that should animate from 0 to a target value on mount.

**Accessibility gate (REQUIRED):** Before starting the rAF loop, check `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. If true, return `target` immediately — no animation.

**Verified implementation pattern:**

```typescript
// src/hooks/useCountUp.ts
import { useEffect, useRef, useState } from "react";

export function useCountUp(
  target: number,
  duration = 600,
  delay = 0,
): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Accessibility: skip animation if user prefers reduced motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }

    // Reset to 0 on every new target / duration
    setValue(0);
    startTimeRef.current = null;

    const delayId = delay > 0
      ? window.setTimeout(startLoop, delay)
      : (startLoop(), undefined);

    function startLoop() {
      rafRef.current = requestAnimationFrame(tick);
    }

    function tick(timestamp: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out: fast start, slow end
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target); // ensure exact final value
      }
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (delayId !== undefined) clearTimeout(delayId);
    };
  }, [target, duration, delay]);

  return value;
}
```

**Re-trigger on data refetch:** Because `target` is driven by `stats.totalModels` etc., when `useDashboardStats` returns new data the prop changes, which changes `target`, which triggers the `useEffect` dependency and re-animates from 0.

### Pattern 2: StatCard animate prop

**What:** `StatCard` receives an optional `animate?: boolean` prop. When `animate={true}` and `value` is a `number`, it calls `useCountUp(value)` internally and renders the animated integer. When `animate={false}` or `value` is a string (e.g. `"72%"`), it renders `value` as-is. This avoids a separate wrapper component.

**The conditional hook problem:** React hooks cannot be called conditionally. The standard solution is to create an inner component `AnimatedValue` that always calls `useCountUp`, and render it only when `animate={true}` and the value is a number. Alternatively, the hook call lives at the top of `StatCard` unconditionally but uses `target=0` when animation is disabled — however this produces a flash to 0. The clean solution is a separate `AnimatedNumber` sub-component.

```typescript
// src/features/dashboard/StatCard.tsx — modified
import { Card, CardContent } from "@/components/ui/card";
import { useCountUp } from "@/hooks/useCountUp";

function AnimatedNumber({ value }: { value: number }) {
  const display = useCountUp(value);
  return <>{display}</>;
}

export interface StatCardProps {
  value: number | string;
  label: string;
  animate?: boolean;
}

export function StatCard({ value, label, animate = false }: StatCardProps) {
  const displayValue =
    animate && typeof value === "number"
      ? <AnimatedNumber value={value} />
      : value;

  return (
    <Card className="px-6">
      <CardContent className="flex flex-col gap-1 px-0">
        <span className="text-3xl font-semibold">{displayValue}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
```

### Pattern 3: DashboardPage hero wiring

Four StatCard call sites at lines 184–187 gain `animate={true}`. No other changes to DashboardPage:

```typescript
// Lines 183–188 in DashboardPage.tsx — after change
<div className="grid grid-cols-4 gap-6">
  <StatCard value={stats.totalModels}        label="Total Models"        animate={true} />
  <StatCard value={stats.fullyPainted}       label="Fully Painted"       animate={true} />
  <StatCard value={stats.battleReadyPoints}  label="Battle-Ready Points" animate={true} />
  <StatCard value={stats.activeProjectsCount} label="Active Projects"    animate={true} />
</div>
```

The progress section cards keep `animate` absent (defaults to `false`):

```typescript
<StatCard value={`${stats.paintingPct}%`} label="Painting Progress" />
<StatCard value={`${stats.assemblyPct}%`} label="Assembly Progress" />
<StatCard value={`${stats.basingPct}%`}  label="Basing Progress" />
```

### Anti-Patterns to Avoid

- **Calling useCountUp conditionally at top level of StatCard:** React rules of hooks forbid conditional hook calls. Always call hooks at the top level — use a sub-component (`AnimatedNumber`) to gate the hook invocation based on the `animate` prop.
- **Animating string values:** The `value` prop accepts `number | string`. Never pass string values like `"72%"` to `useCountUp` — the hook takes `number`. Guard with `typeof value === "number"` before the `AnimatedNumber` render path.
- **Setting CSS custom property directly from the hook:** Phase 10 already owns `--faction-accent` mutation in `ActiveFactionContext`. Phase 11 never touches this; counter values use default foreground color, not accent.
- **Animating on skeleton or error branches:** The skeleton branch renders `<Skeleton>` components, not `<StatCard>`. The `animate` prop only exists in the populated data branch. No guard needed — the code paths are already separate.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reduced motion check | Custom event listener for `prefers-reduced-motion` | `window.matchMedia('(prefers-reduced-motion: reduce)').matches` one-shot read in `useEffect` | The media query result is synchronously available; no listener overhead needed for a 600ms animation |
| Animation timing | `setTimeout`-based counter (increments by fixed step every N ms) | `requestAnimationFrame` with elapsed-time progress | rAF is frame-rate-independent — steps align to display refresh, giving smooth visual on 60Hz and 120Hz screens |
| Exact final value | Trust the easing math to land exactly on target | Explicit `setValue(target)` when `progress >= 1` | Floating point rounding in the ease-out formula means the last frame may compute `Math.round(0.9998 * target)` — always snap to exact value at completion |

---

## Common Pitfalls

### Pitfall 1: Conditional Hook Call in StatCard
**What goes wrong:** Writing `if (animate) { const val = useCountUp(value); }` inside `StatCard` — React will throw "Rendered more hooks than during the previous render" on prop changes.
**Why it happens:** React requires hooks to be called in the same order on every render.
**How to avoid:** Create `AnimatedNumber` as a separate component that unconditionally calls `useCountUp`. Render `<AnimatedNumber value={value} />` in the animate branch. The separate component mount/unmount handles the conditional cleanly.
**Warning signs:** React error in console mentioning "hooks rendered in different order."

### Pitfall 2: stale target after data refetch
**What goes wrong:** The counter shows the OLD value after a mutation elsewhere in the app updates `dashboard-stats`, because `useCountUp`'s `useEffect` dependency array doesn't include `target`.
**Why it happens:** Missing dependency in `useEffect([target, duration, delay])`.
**How to avoid:** Always list `target`, `duration`, and `delay` in the dependency array. This is also what causes the re-animate-on-refetch behavior for free.
**Warning signs:** Counter freezes at old value after navigating away, performing a unit mutation, and returning.

### Pitfall 3: requestAnimationFrame in jsdom tests
**What goes wrong:** `requestAnimationFrame` is not implemented in jsdom. Calling `useCountUp` in a test that doesn't mock rAF results in the counter stuck at 0 indefinitely.
**Why it happens:** jsdom test environment lacks browser animation APIs.
**How to avoid:** Two strategies — (a) in unit tests for `useCountUp`, use `vi.useFakeTimers()` with `vi.advanceTimersByTime()` (vitest fake timers also stub rAF); OR (b) in component-level tests, pass a mocked `stats` and assert the label is present without asserting the exact animated value (labels like "Total Models" are stable regardless of animation state). The existing `DashboardPage.test.tsx` uses option (b) pattern implicitly.
**Warning signs:** `expect(screen.getByText("5")).toBeInTheDocument()` fails intermittently or the animated number never updates in test.

### Pitfall 4: Animation on every re-render (not just data change)
**What goes wrong:** The counter re-starts on every parent re-render (e.g., when the user opens a UnitDetailSheet), making the numbers flash and restart unexpectedly.
**Why it happens:** If the `target` reference isn't stable (e.g., computed inline), `useEffect` sees a "new" target on every render.
**How to avoid:** `stats.totalModels` etc. are primitive numbers from a stable query result. Primitive equality comparison in `useEffect` dependencies means the effect only re-fires when the value actually changes. No special memoization needed.
**Warning signs:** Counters restart when opening/closing the detail sheet.

### Pitfall 5: Forgetting reduced motion accessibility
**What goes wrong:** The hook animates regardless of the user's OS accessibility setting, violating WCAG 2.1 Success Criterion 2.3.3.
**Why it happens:** Forgetting to check `prefers-reduced-motion` before starting the rAF loop.
**How to avoid:** The UI-SPEC.md §Accessibility section mandates this check explicitly: `window.matchMedia('(prefers-reduced-motion: reduce)').matches` must be read at the top of the `useEffect` before any rAF call. If true, set `setValue(target)` immediately and return.
**Warning signs:** Accessibility audit failure; user reports motion sickness.

---

## Code Examples

All patterns are drawn from codebase inspection + established rAF patterns. No external library needed.

### useCountUp — full implementation with delay support

```typescript
// src/hooks/useCountUp.ts
// Source: rAF elapsed-time pattern + CONTEXT.md decisions
import { useEffect, useRef, useState } from "react";

export function useCountUp(
  target: number,
  duration = 600,
  delay = 0,
): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }

    setValue(0);
    startTimeRef.current = null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function startLoop() {
      rafRef.current = requestAnimationFrame(tick);
    }

    function tick(timestamp: number) {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target); // exact snap on completion
      }
    }

    if (delay > 0) {
      timeoutId = setTimeout(startLoop, delay);
    } else {
      startLoop();
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [target, duration, delay]);

  return value;
}
```

### useCountUp unit test pattern

```typescript
// tests/dashboard/useCountUp.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountUp } from "@/hooks/useCountUp";

describe("useCountUp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns target immediately when prefers-reduced-motion is true", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);
    const { result } = renderHook(() => useCountUp(42));
    expect(result.current).toBe(42);
  });

  it("starts at 0 and reaches target after duration", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);
    const { result } = renderHook(() => useCountUp(100, 600));
    expect(result.current).toBe(0);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current).toBe(100);
  });

  it("re-animates from 0 when target changes", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);
    const { result, rerender } = renderHook(
      ({ target }: { target: number }) => useCountUp(target, 600),
      { initialProps: { target: 50 } },
    );
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(50);

    rerender({ target: 75 });
    // After rerender with new target, counter resets to 0 before animating
    act(() => { vi.advanceTimersByTime(0); }); // flush effect
    expect(result.current).toBe(0);
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(75);
  });
});
```

### FactionSummaryCard ring verification pattern

```typescript
// In tests/dashboard/DashboardPage.test.tsx or a new targeted test
// Verify ring-2 ring-faction-accent is present when isActive=true
it("active FactionSummaryCard has ring-2 ring-faction-accent class (UI-08)", async () => {
  const tau = f({ id: 1 });
  vi.mocked(getDashboardStats).mockResolvedValue({ units: [u({ faction_id: 1 })], factions: [tau] });
  // Set active faction id via localStorage before render
  window.localStorage.setItem("active-faction-id", "1");
  renderWithProviders(<DashboardPage />);

  await screen.findByText("Total Models");
  // FactionSummaryCard outer element has the ring classes when isActive=true
  const card = screen.getByRole("button", { name: "Tau" });
  expect(card.className).toContain("ring-2");
  expect(card.className).toContain("ring-faction-accent");
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setInterval` step-based counter | `requestAnimationFrame` elapsed-time counter | N/A (rAF is the established standard) | Frame-rate-independent; smooth on 60Hz and 120Hz |
| External library (e.g. `react-countup`) | Custom `useCountUp` hook with zero dependencies | Phase 11 decision (locked) | No bundle size increase; full control over easing |

---

## Open Questions

1. **requestAnimationFrame in vitest fake timers**
   - What we know: `vi.useFakeTimers()` in vitest stubs `setTimeout`/`setInterval` but rAF behavior depends on vitest version.
   - What's unclear: Whether `vi.advanceTimersByTime()` in vitest ^4.1.5 also advances rAF callbacks or requires separate treatment.
   - Recommendation: Use `vi.advanceTimersByTime()` — in vitest 4.x, fake timers include rAF by default. If the hook test fails to advance, add `vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(performance.now()); return 0; })` as a fallback mock.

2. **Skeleton unchanged for animated cards**
   - What we know: The loading skeleton is `<Skeleton className="h-24 w-full" />` in a grid-cols-4, unchanged.
   - What's unclear: Whether the `animate={true}` StatCard should show any different loading placeholder. CONTEXT.md says "skeleton remains unchanged."
   - Recommendation: No change needed — the existing skeleton already covers the loading state adequately.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.5 + @testing-library/react ^16.3.2 |
| Config file | `vitest.config.ts` (jsdom environment, globals:true) |
| Quick run command | `pnpm test -- --run tests/dashboard/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-07 | `useCountUp` returns 0 initially and reaches target after duration | unit | `pnpm test -- --run tests/dashboard/useCountUp.test.ts` | ❌ Wave 0 |
| UI-07 | `useCountUp` returns target immediately when `prefers-reduced-motion: reduce` | unit | `pnpm test -- --run tests/dashboard/useCountUp.test.ts` | ❌ Wave 0 |
| UI-07 | `useCountUp` re-animates from 0 when target changes | unit | `pnpm test -- --run tests/dashboard/useCountUp.test.ts` | ❌ Wave 0 |
| UI-07 | DashboardPage hero section renders animated stat value > 0 after data loads | component | `pnpm test -- --run tests/dashboard/DashboardPage.test.tsx` | ✅ (extend existing test) |
| UI-08 | Active FactionSummaryCard has `ring-2 ring-faction-accent` CSS classes | component | `pnpm test -- --run tests/dashboard/DashboardPage.test.tsx` | ✅ (new it() in existing file) |

### Sampling Rate

- **Per task commit:** `pnpm test -- --run tests/dashboard/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/dashboard/useCountUp.test.ts` — covers UI-07 hook unit tests (3 test cases minimum)

*(The `DashboardPage.test.tsx` file already exists and will be extended in-place for UI-07 component test and UI-08 ring class verification — no new file required for those.)*

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `src/features/dashboard/StatCard.tsx`, `DashboardPage.tsx`, `FactionSummaryCard.tsx`, `computeStats.ts`, `useDashboardStats.ts`, `ActiveFactionContext.tsx`
- `tests/dashboard/DashboardPage.test.tsx` — confirmed test patterns, mock structure, `renderWithProviders` helper
- `tests/theming/useActiveFaction.test.tsx` — confirmed rAF/hook test patterns for this codebase
- `vitest.config.ts` — confirmed jsdom environment, globals:true, include pattern
- `package.json` — confirmed vitest ^4.1.5, no rAF polyfill needed separately
- `11-CONTEXT.md` — locked decisions for counter animation
- `11-UI-SPEC.md` — animation contract, accessibility requirements, component inventory

### Secondary (MEDIUM confidence)
- MDN `requestAnimationFrame` — elapsed-time pattern is canonical for frame-rate-independent animation
- WCAG 2.1 SC 2.3.3 — `prefers-reduced-motion` requirement established

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — everything already installed; zero new deps
- Architecture: HIGH — all integration points confirmed by direct codebase read; hook pattern mirrors existing `useSidebarCollapsed` / `ActiveFactionContext` conventions
- Pitfalls: HIGH — conditional hooks pitfall is a React rule; rAF-in-jsdom is a known testing concern verified against this project's test setup
- Validation: HIGH — existing test infrastructure is complete; only one new test file (Wave 0 gap)

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (stable tech — React hooks, rAF, Tailwind utilities; no fast-moving dependencies)
