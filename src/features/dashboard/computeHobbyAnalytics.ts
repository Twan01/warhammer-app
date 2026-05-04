/**
 * Phase 19 — Pure aggregation for Dashboard HOBBY HEALTH + SpendingPage Monthly Trend.
 *
 * Takes raw arrays from getAnalyticsData() and returns formatted display strings
 * + 12-entry chart data. Mirrors src/features/spending/computeSpendingStats.ts
 * (pure, testable, no I/O, no React).
 *
 * Pitfall coverage:
 *  - Pitfall 2 (velocity): floor monthsDiff to 1 so single-day session does not
 *    produce Infinity from divide-by-zero.
 *  - Pitfall 3 (monthly gaps): SQL only returns months with data — JS pads to 12.
 *  - Pitfall 5 (streak timezone): use todayISO() + parseLocalDate() from dates.ts
 *    instead of new Date().toISOString() — prevents off-by-one for non-UTC users.
 *  - Pitfall 6 (year boundary): months in a year before the current year render
 *    "Jan '25" style; current-year months render "Jan".
 */
import { todayISO, parseLocalDate } from "@/lib/dates";

export interface HobbyAnalytics {
  velocityString: string;                                 // "3.1" or "0.0"
  streakString: string;                                   // "14 days" or "0 days"
  monthlyData: { month: string; pence: number }[];        // length === 12, oldest-first
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildLabel(year: number, monthIdx: number, currentYear: number): string {
  const abbr = MONTH_ABBR[monthIdx];
  if (year === currentYear) return abbr;
  // Two-digit suffix, e.g. "Jan '25" for 2025 when current year is 2026.
  return `${abbr} '${pad2(year % 100)}`;
}

/**
 * ANLY-04 velocity:
 *   distinct unit_ids ÷ Math.max(monthsDiff, 1)
 *   monthsDiff = (last.year - first.year) * 12 + (last.month - first.month)
 *   formatted with toFixed(1) so "3.0", "3.1", "0.0".
 */
function computeVelocityString(sessions: { unit_id: number; session_date: string }[]): string {
  if (sessions.length === 0) return "0.0";
  const unitIds = new Set(sessions.map((s) => s.unit_id));
  const dates = sessions.map((s) => s.session_date).slice().sort();
  const first = parseLocalDate(dates[0]);
  const last = parseLocalDate(dates[dates.length - 1]);
  const monthsDiff =
    (last.getFullYear() - first.getFullYear()) * 12 +
    (last.getMonth() - first.getMonth());
  const months = Math.max(monthsDiff, 1); // Pitfall 2 floor
  return (unitIds.size / months).toFixed(1);
}

/**
 * ANLY-05 streak:
 *   walk backwards from todayISO() through a Set of session_dates,
 *   stop on first gap. Returns "{N} days" or "0 days".
 */
function computeStreakString(sessions: { unit_id: number; session_date: string }[]): string {
  if (sessions.length === 0) return "0 days";
  const sessionSet = new Set(sessions.map((s) => s.session_date));
  let streak = 0;
  const cursor = parseLocalDate(todayISO()); // Pitfall 5 timezone-safe
  // Walk backwards: stop as soon as a date is missing.
  while (sessionSet.has(formatDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return `${streak} days`;
}

/**
 * ANLY-06 monthlyData:
 *   build 12-entry array oldest-first ending at the current month;
 *   merge SQL rows into it by YYYY-MM key; year-suffix labels for prior years.
 */
function buildMonthlyData(
  rawMonthlySpend: { month: string; pence: number }[]
): { month: string; pence: number }[] {
  const lookup = new Map(rawMonthlySpend.map((r) => [r.month, r.pence]));
  const result: { month: string; pence: number }[] = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  // 11 months ago … current month → 12 entries, oldest first.
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    const label = buildLabel(d.getFullYear(), d.getMonth(), currentYear);
    result.push({ month: label, pence: lookup.get(key) ?? 0 });
  }
  return result;
}

export function computeHobbyAnalytics(
  sessions: { unit_id: number; session_date: string }[],
  rawMonthlySpend: { month: string; pence: number }[]
): HobbyAnalytics {
  return {
    velocityString: computeVelocityString(sessions),
    streakString: computeStreakString(sessions),
    monthlyData: buildMonthlyData(rawMonthlySpend),
  };
}
