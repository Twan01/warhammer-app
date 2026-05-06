/**
 * Phase 32 — PANEL-04/05: Army Readiness hooks.
 *
 * useArmyReadiness — React Query hook for per-faction battle-ready points.
 * useArmyReadinessTarget — localStorage-backed hook for the target threshold
 *   (500 / 1000 / 1500 / 2000 pts). Defaults to 2000, validates on read,
 *   falls back to 2000 for unknown values.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getArmyReadinessByFaction,
  type FactionReadiness,
} from "@/db/queries/dashboard";

export const ARMY_READINESS_KEY = ["army-readiness"] as const;
export const ARMY_READINESS_TARGETS = [500, 1000, 1500, 2000] as const;
export type ArmyReadinessTarget = (typeof ARMY_READINESS_TARGETS)[number];

// Re-export for component convenience
export type { FactionReadiness } from "@/db/queries/dashboard";

const TARGET_STORAGE_KEY = "army-readiness:target";

export function useArmyReadiness() {
  return useQuery<FactionReadiness[]>({
    queryKey: ARMY_READINESS_KEY,
    queryFn: getArmyReadinessByFaction,
  });
}

export function useArmyReadinessTarget(): readonly [
  ArmyReadinessTarget,
  (next: ArmyReadinessTarget) => void,
] {
  const [target, setTarget] = useState<ArmyReadinessTarget>(() => {
    try {
      const raw = window.localStorage.getItem(TARGET_STORAGE_KEY);
      const parsed = Number(raw);
      return (ARMY_READINESS_TARGETS as readonly number[]).includes(parsed)
        ? (parsed as ArmyReadinessTarget)
        : 2000;
    } catch {
      return 2000;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(TARGET_STORAGE_KEY, String(target));
    } catch {
      /* storage may be blocked */
    }
  }, [target]);

  return [target, setTarget] as const;
}
