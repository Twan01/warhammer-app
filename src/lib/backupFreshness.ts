/**
 * Phase 80 — Backup freshness tier computation (STS-01, STS-02).
 *
 * Three tiers based on age since last backup:
 * - healthy:     <= 7 days (green) — regular backup habit
 * - recommended: <= 30 days (amber) — backup suggested soon
 * - overdue:     > 30 days (orange) — backup overdue
 * - never:       no backup has occurred
 *
 * Pure function — no side effects, no backend dependency.
 */

export type BackupFreshness = "healthy" | "recommended" | "overdue" | "never";

export function getBackupFreshness(date: string | null): BackupFreshness {
  if (!date) return "never";
  const ageMs = Date.now() - new Date(date).getTime();
  if (Number.isNaN(ageMs)) return "never";
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return "healthy";
  if (ageDays <= 30) return "recommended";
  return "overdue";
}

/** Returns human-readable age string for display. */
export function getBackupAgeLabel(date: string | null): string {
  if (!date) return "No backup";
  const ageMs = Date.now() - new Date(date).getTime();
  if (Number.isNaN(ageMs)) return "No backup";
  const ageDays = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
  if (ageDays === 0) return "Backed up today";
  if (ageDays === 1) return "Backed up yesterday";
  return `Backed up ${ageDays} days ago`;
}

/** CSS class for the backup freshness dot color. */
export const BACKUP_FRESHNESS_DOT_CLASS: Record<BackupFreshness, string> = {
  healthy: "bg-green-500",
  recommended: "bg-amber-500",
  overdue: "bg-orange-500",
  never: "bg-muted-foreground",
};
