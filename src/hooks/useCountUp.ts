/**
 * Phase 11 — useCountUp hook (UI-07).
 *
 * Animates a numeric value from 0 to `target` using requestAnimationFrame with cubic
 * ease-out timing. Integer-only output via Math.round. Snaps to exact `target` on the
 * final frame to avoid floating-point near-miss.
 *
 * Accessibility (WCAG 2.1 SC 2.3.3): If the user prefers reduced motion, the hook
 * returns `target` immediately without scheduling any rAF — no animation runs.
 *
 * Re-trigger: Changing `target` (e.g. when useDashboardStats refetches new data) resets
 * to 0 and animates again — TanStack Router unmounts the page on navigate so every
 * Dashboard mount also re-triggers naturally.
 *
 * Pattern source: 11-RESEARCH.md §Architecture Patterns Pattern 1.
 */
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
    // Accessibility gate: skip animation if user prefers reduced motion.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }

    if (duration <= 0) {
      setValue(target);
      return;
    }

    // Reset to 0 on every new target / duration / delay
    setValue(0);
    startTimeRef.current = null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function startLoop() {
      rafRef.current = requestAnimationFrame(tick);
    }

    function tick(timestamp: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out: fast start, slow end (11-UI-SPEC.md §Animation Contract)
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Snap to exact final value on completion (avoid floating-point near-miss)
        setValue(target);
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
