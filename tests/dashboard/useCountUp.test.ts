/**
 * Phase 11 — useCountUp hook tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 11-01 will:
 *   1. Create src/hooks/useCountUp.ts exporting `useCountUp(target, duration?, delay?)` per
 *      11-RESEARCH.md §Architecture Patterns Pattern 1 (rAF elapsed-time loop with cubic
 *      ease-out and prefers-reduced-motion short-circuit).
 *   2. Replace `describe.skip` below with `describe`.
 *   3. Add real assertions matching 11-VALIDATION.md §Per-Task Verification Map rows
 *      11-01-01, 11-01-02, 11-01-03 (UI-07 hook contract).
 *
 * The stub exists in Wave 0 so Plan 11-01 has a concrete failing target to flip green
 * (Nyquist sampling rate per 11-VALIDATION.md).
 *
 * Note: stays a .ts file (no JSX in this hook test — useFactions analog uses .tsx because of
 * a wrapper element, but useCountUp tests via renderHook() pass `target` as a plain number).
 */
import { describe, it } from "vitest";

describe.skip("useCountUp — UI-07 (count-up animation)", () => {
  it("returns target immediately when window.matchMedia('(prefers-reduced-motion: reduce)') matches", () => {
    // Plan 11-01 will:
    //   - vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList)
    //   - const { result } = renderHook(() => useCountUp(42))
    //   - expect(result.current).toBe(42)  // no animation; immediate snap to target
    //   - assert NO setTimeout/rAF was scheduled (optional — spy on requestAnimationFrame)
  });

  it("starts at 0 and reaches target after duration when reduced-motion is OFF", () => {
    // Plan 11-01 will:
    //   - vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList)
    //   - vi.useFakeTimers() in beforeEach (vitest 4.x fake timers stub rAF too)
    //   - const { result } = renderHook(() => useCountUp(100, 600))
    //   - expect(result.current).toBe(0)            // initial render value before rAF tick
    //   - act(() => { vi.advanceTimersByTime(600); })
    //   - expect(result.current).toBe(100)          // exact target after duration completes
  });

  it("re-animates from 0 when target changes (re-trigger on data refetch)", () => {
    // Plan 11-01 will:
    //   - vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList)
    //   - vi.useFakeTimers()
    //   - const { result, rerender } = renderHook(({ target }) => useCountUp(target, 600), {
    //       initialProps: { target: 50 }
    //     })
    //   - act(() => { vi.advanceTimersByTime(600); })
    //   - expect(result.current).toBe(50)
    //   - rerender({ target: 75 })
    //   - act(() => { vi.advanceTimersByTime(0); })  // flush effect re-run
    //   - expect(result.current).toBe(0)             // resets to 0 on new target
    //   - act(() => { vi.advanceTimersByTime(600); })
    //   - expect(result.current).toBe(75)            // animates to new target
  });
});
