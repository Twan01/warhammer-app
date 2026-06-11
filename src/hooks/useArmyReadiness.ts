/**
 * Phase 32 — PANEL-04/05: Army Readiness hooks.
 * Phase 122 — D-09/D-10/D-11: Migrated target from localStorage to app_settings.
 *
 * useArmyReadiness — React Query hook for per-faction battle-ready points.
 * useArmyReadinessTarget — app_settings-backed hook for the target threshold
 *   with session-only override support for the ArmyReadinessCard.
 *
 * The Settings page writes the persisted default via useUpdateSetting directly.
 * The ArmyReadinessCard calls setTarget() which sets a session-only override
 * (does NOT write to DB per D-11).
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getArmyReadinessByFaction,
  type FactionReadiness,
} from "@/db/queries/dashboard";
import { useAppSettings } from "@/hooks/useAppSettings";

export const ARMY_READINESS_KEY = ["army-readiness"] as const;
export const ARMY_READINESS_TARGETS = [500, 1000, 1500, 2000] as const;
/** @deprecated Preset values only — the hook now returns arbitrary `number` including custom values. */
export type ArmyReadinessTarget = (typeof ARMY_READINESS_TARGETS)[number];

// Re-export for component convenience
export type { FactionReadiness } from "@/db/queries/dashboard";

export function useArmyReadiness() {
  return useQuery<FactionReadiness[]>({
    queryKey: ARMY_READINESS_KEY,
    queryFn: getArmyReadinessByFaction,
  });
}

/**
 * Returns [target, setTarget] where:
 * - `target` is the session override if set, otherwise the persisted default from app_settings
 * - `setTarget` sets a session-only override (does not write to DB)
 *
 * The persisted default is written by the Settings ReadinessTargetSetting component
 * via useUpdateSetting. This hook only reads it.
 *
 * T-122-05 mitigation: Parse with Number() and fallback to 2000 if NaN or non-positive.
 */
export function useArmyReadinessTarget(): readonly [
  number,
  (next: number) => void,
] {
  const { data: settings } = useAppSettings();

  const raw = Number(settings?.["army_readiness_target"]);
  const persisted = Number.isFinite(raw) && raw > 0 ? raw : 2000;

  const [sessionOverride, setSessionOverride] = useState<number | null>(null);

  const target = sessionOverride ?? persisted;

  function setTarget(next: number) {
    setSessionOverride(next);
  }

  return [target, setTarget] as const;
}
