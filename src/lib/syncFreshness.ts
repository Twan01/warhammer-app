/**
 * Phase 107 -- Simplified freshness utilities.
 *
 * With rules.db eliminated and data bundled in the app, sync freshness
 * is always "fresh". These stubs maintain backward compatibility with
 * the 12 consumer files that reference SyncFreshness types.
 */

export type SyncFreshness = "fresh" | "aging" | "stale";

export function getSyncFreshness(_lastSyncAt: string | null): SyncFreshness {
  return "fresh";
}

export function getSyncAgeLabel(_lastSyncAt: string | null): string {
  return "Data bundled with app";
}

export const FRESHNESS_DOT_CLASS: Record<SyncFreshness, string> = {
  fresh: "bg-green-500",
  aging: "bg-yellow-500",
  stale: "bg-red-500",
};
