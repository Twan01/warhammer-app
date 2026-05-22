/**
 * Phase 45 — Freshness tier computation (META-05).
 *
 * Three tiers based on age since last sync:
 * - fresh: <7 days (green) — Wahapedia updates roughly weekly
 * - aging: 7-14 days (amber)
 * - stale: >14 days (red)
 * - never: no sync has occurred
 *
 * Pure function — no side effects, no backend dependency.
 */

export type SyncFreshness = "fresh" | "aging" | "stale" | "never";

export function getSyncFreshness(lastSyncAt: string | null): SyncFreshness {
  if (!lastSyncAt) return "never";
  const ageMs = Date.now() - new Date(lastSyncAt).getTime();
  if (Number.isNaN(ageMs)) return "never";
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 7) return "fresh";
  if (ageDays < 14) return "aging";
  return "stale";
}

/** Returns human-readable age string for tooltip. */
export function getSyncAgeLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Never synced";
  const ageMs = Date.now() - new Date(lastSyncAt).getTime();
  if (Number.isNaN(ageMs)) return "Never synced";
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (ageDays === 0) return "Synced today";
  if (ageDays === 1) return "Synced yesterday";
  return `Synced ${ageDays} days ago`;
}

/** CSS class for the freshness dot color. */
export const FRESHNESS_DOT_CLASS: Record<SyncFreshness, string> = {
  fresh: "bg-green-500",
  aging: "bg-amber-500",
  stale: "bg-red-500",
  never: "bg-muted-foreground",
};
