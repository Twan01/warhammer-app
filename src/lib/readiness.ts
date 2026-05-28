/**
 * Phase 101 — Battle readiness computation (BR-01).
 *
 * Pure function: no DB, no hooks, no React imports. Takes four status fields,
 * returns individual readiness booleans plus an aggregate battleReady flag.
 *
 * battleReady = assembled AND painted AND based AND varnished.
 */
import type { PaintingStatus } from "@/types/unit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReadinessInput {
  status_painting: PaintingStatus;
  status_assembly: 0 | 1;
  status_basing: 0 | 1;
  status_varnished: 0 | 1;
}

export interface UnitReadiness {
  assembled: boolean;
  painted: boolean;
  based: boolean;
  varnished: boolean;
  battleReady: boolean;
}

// ---------------------------------------------------------------------------
// computeUnitReadiness
// ---------------------------------------------------------------------------

/**
 * Computes readiness flags for a single unit.
 *
 * - `assembled`: status_assembly === 1
 * - `painted`: status_painting === "Completed"
 * - `based`: status_basing === 1
 * - `varnished`: status_varnished === 1
 * - `battleReady`: all four above are true
 */
export function computeUnitReadiness(input: ReadinessInput): UnitReadiness {
  const assembled = input.status_assembly === 1;
  const painted = input.status_painting === "Completed";
  const based = input.status_basing === 1;
  const varnished = input.status_varnished === 1;

  return {
    assembled,
    painted,
    based,
    varnished,
    battleReady: assembled && painted && based && varnished,
  };
}
