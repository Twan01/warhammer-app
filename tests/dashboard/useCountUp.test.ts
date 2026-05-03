/**
 * Phase 11 — useCountUp hook tests (Plan 11-01 fills in stubs).
 *
 * Uses vitest fake timers (vi.useFakeTimers) — vitest 4.x fake timers stub
 * requestAnimationFrame alongside setTimeout/setInterval, so vi.advanceTimersByTime()
 * advances the rAF loop. If a test fails because the counter never advances,
 * the documented Pitfall 3 fallback is to add `vi.stubGlobal('requestAnimationFrame',
 * (cb) => { cb(performance.now()); return 0; })` — but try fake timers first.
 *
 * Each test mocks window.matchMedia explicitly per Pitfall 5 (reduced-motion gate).
 * jsdom does not define window.matchMedia, so we use Object.defineProperty to install
 * it as a configurable function before vi.spyOn can override the return value per test.
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountUp } from "@/hooks/useCountUp";

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList),
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useCountUp — UI-07 (count-up animation)", () => {
  it("returns target immediately when window.matchMedia('(prefers-reduced-motion: reduce)') matches", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useCountUp(42));

    // Effect runs synchronously after render under @testing-library/react.
    // The reduced-motion branch calls setValue(target) once and returns — no rAF scheduled.
    expect(result.current).toBe(42);
  });

  it("starts at 0 and reaches target after duration when reduced-motion is OFF", () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useCountUp(100, 600));

    // Initial render: useState(0) returns 0 before the rAF fires.
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Snap-to-exact at progress >= 1: setValue(target) is called explicitly.
    expect(result.current).toBe(100);
  });

  it("re-animates from 0 when target changes (re-trigger on data refetch)", () => {
    mockMatchMedia(false);

    const { result, rerender } = renderHook(
      ({ target }: { target: number }) => useCountUp(target, 600),
      { initialProps: { target: 50 } },
    );

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current).toBe(50);

    rerender({ target: 75 });
    // Effect re-runs with new target — first thing it does is setValue(0)
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current).toBe(75);
  });
});
