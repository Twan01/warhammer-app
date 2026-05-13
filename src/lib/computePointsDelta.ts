/**
 * Phase 65 — Pure delta computation for points import (PI-04).
 *
 * Compares before/after points maps (keyed by "unitName:factionId")
 * and returns counts + details of added, removed, and changed entries.
 *
 * Pure function — no database access, no side effects.
 */
import type { PointsDelta } from "@/types/pointsDelta";

/**
 * Compute the delta between two points maps.
 *
 * @param beforeMap - Pre-sync points keyed by "unitName:factionId" -> points
 * @param afterMap - Post-sync points keyed by "unitName:factionId" -> points
 * @returns PointsDelta with counts and per-unit detail array
 */
export function computePointsDelta(
  _beforeMap: Record<string, number>,
  _afterMap: Record<string, number>,
): PointsDelta {
  // Stub — TDD RED phase: tests must fail first
  return { added: 0, removed: 0, changed: 0, details: [] };
}
