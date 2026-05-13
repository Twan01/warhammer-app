/**
 * Phase 65 — Pure delta computation for points import (PI-04).
 *
 * Compares before/after points maps (keyed by "unitName:factionId")
 * and returns counts + details of added, removed, and changed entries.
 *
 * Pure function — no database access, no side effects.
 */
import type { PointsDelta, PointsDeltaDetail } from "@/types/pointsDelta";

/**
 * Parse a composite key "unitName:factionId" into its components.
 * The faction portion "null" (string) is treated as null.
 */
function parseKey(key: string): { unitName: string; factionId: string | null } {
  const colonIdx = key.lastIndexOf(":");
  if (colonIdx === -1) return { unitName: key, factionId: null };
  const unitName = key.slice(0, colonIdx);
  const raw = key.slice(colonIdx + 1);
  return { unitName, factionId: raw === "null" ? null : raw };
}

/**
 * Compute the delta between two points maps.
 *
 * @param beforeMap - Pre-sync points keyed by "unitName:factionId" -> points
 * @param afterMap - Post-sync points keyed by "unitName:factionId" -> points
 * @returns PointsDelta with counts and per-unit detail array
 */
export function computePointsDelta(
  beforeMap: Record<string, number>,
  afterMap: Record<string, number>,
): PointsDelta {
  const details: PointsDeltaDetail[] = [];

  // Check afterMap for added and changed entries
  for (const key of Object.keys(afterMap)) {
    const { unitName, factionId } = parseKey(key);
    if (!(key in beforeMap)) {
      details.push({
        unitName,
        factionId,
        oldPoints: null,
        newPoints: afterMap[key],
        changeType: "added",
      });
    } else if (beforeMap[key] !== afterMap[key]) {
      details.push({
        unitName,
        factionId,
        oldPoints: beforeMap[key],
        newPoints: afterMap[key],
        changeType: "changed",
      });
    }
  }

  // Check beforeMap for removed entries
  for (const key of Object.keys(beforeMap)) {
    if (!(key in afterMap)) {
      const { unitName, factionId } = parseKey(key);
      details.push({
        unitName,
        factionId,
        oldPoints: beforeMap[key],
        newPoints: null,
        changeType: "removed",
      });
    }
  }

  return {
    added: details.filter((d) => d.changeType === "added").length,
    removed: details.filter((d) => d.changeType === "removed").length,
    changed: details.filter((d) => d.changeType === "changed").length,
    details,
  };
}
