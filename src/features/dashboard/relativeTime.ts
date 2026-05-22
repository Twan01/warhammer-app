/**
 * Manual relative-time formatter (DASH-06).
 * Rules locked by 05-UI-SPEC.md "Relative time formatting".
 *
 * Pitfall 5 (05-RESEARCH.md): SQLite datetime('now') stores
 * "YYYY-MM-DD HH:MM:SS" (space separator, no Z). new Date(...) parses
 * this as local time in some browsers — to force UTC we replace the space
 * with "T" and append "Z", producing a valid ISO 8601 UTC string.
 */
export function formatRelativeTime(sqliteDatetime: string): string {
  const date = new Date(sqliteDatetime.replace(" ", "T") + "Z");
  const diffMs = Date.now() - date.getTime();
  if (diffMs <= 0) return "just now";
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w`;
  const months = Math.floor(diffWeeks / 4);
  if (months >= 12) return `${Math.floor(months / 12)}y`;
  return `${months}mo`;
}
