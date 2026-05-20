/**
 * UTC-safe date utilities — Phase 17 (ENRCH-04 JournalTab fix; prerequisite for
 * Phase 19 ANLY-04/05 streak/velocity and Phase 21 ANLY-01..03 hobby goals).
 *
 * todayISO() and parseLocalDate() use local-timezone arithmetic instead of
 * UTC midnight to prevent off-by-one date errors for users east or west of UTC.
 *
 * Replaces all uses of `new Date().toISOString().split("T")[0]` in JournalTab.
 */

/** Returns today's date as YYYY-MM-DD in the user's local timezone. */
export function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses a YYYY-MM-DD string as local midnight (not UTC midnight). */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formats a SQLite datetime string ("YYYY-MM-DD HH:MM:SS") as a human-readable
 * relative time string. Replaces the space separator with "T" before parsing
 * to handle SQLite's non-ISO format safely (Pitfall 4 from 31-RESEARCH.md).
 */
export function relativeDate(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString.replace(" ", "T"));
  const diffMs = now.getTime() - then.getTime();
  if (diffMs <= 0) return "just now";
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}
