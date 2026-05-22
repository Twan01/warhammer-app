/**
 * Pure date logic for hobby goal period computation.
 *
 * Relocated from src/features/goals/computeGoalPeriod.ts to src/lib/ so the
 * query layer (src/db/queries/goals.ts) can import it without crossing the
 * feature boundary. All functions are pure — no async, no DB, no React.
 */
import { todayISO } from "@/lib/dates";
import type { GoalTimeframe } from "@/types/goal";

export type GoalStatus = "active" | "completed" | "missed";

export interface GoalPeriod {
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  label: string;       // e.g. "May 2026" or "Q2 2026"
  isExpired: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Derives start/end dates, label, and expiry for a given period key.
 *
 * - month: period = "YYYY-MM" -> startDate = first day, endDate = last day
 * - quarter: period = "YYYY-QN" -> startDate = first day of Q, endDate = last day of Q
 *
 * isExpired: true when todayISO() is strictly after endDate (i.e., today > endDate).
 */
export function computeGoalPeriod(timeframe: GoalTimeframe, period: string): GoalPeriod {
  const today = todayISO();

  if (timeframe === "month") {
    const [yearStr, monthStr] = period.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-indexed
    const startDate = `${yearStr}-${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate(); // month is 1-indexed; Date(y, m, 0) = last day of month m
    const endDate = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[month - 1]} ${year}`;
    const isExpired = today > endDate;
    return { startDate, endDate, label, isExpired };
  } else {
    // quarter: "YYYY-QN"
    const [yearStr, qStr] = period.split("-");
    const year = parseInt(yearStr, 10);
    const q = parseInt(qStr.slice(1), 10); // remove "Q" prefix
    const startMonth = (q - 1) * 3 + 1; // 1-indexed
    const endMonth = startMonth + 2;     // 1-indexed
    const startMonthPadded = String(startMonth).padStart(2, "0");
    const endMonthPadded = String(endMonth).padStart(2, "0");
    const startDate = `${yearStr}-${startMonthPadded}-01`;
    const lastDay = new Date(year, endMonth, 0).getDate();
    const endDate = `${yearStr}-${endMonthPadded}-${String(lastDay).padStart(2, "0")}`;
    const label = `Q${q} ${year}`;
    const isExpired = today > endDate;
    return { startDate, endDate, label, isExpired };
  }
}

/**
 * Returns the current period key for a given timeframe.
 * month -> "YYYY-MM"
 * quarter -> "YYYY-QN"
 */
export function currentPeriod(timeframe: GoalTimeframe): string {
  const today = todayISO();
  const [yearStr, monthStr] = today.split("-");
  const month = parseInt(monthStr, 10);

  if (timeframe === "month") {
    return `${yearStr}-${monthStr}`;
  } else {
    const q = Math.ceil(month / 3);
    return `${yearStr}-Q${q}`;
  }
}

/**
 * Derives goal status.
 *
 * ORDER IS CRITICAL (Pitfall 4):
 * 1. Check completed FIRST (progressCount >= targetCount) -- even expired goals are "completed"
 * 2. Then check isExpired -> "missed"
 * 3. Default -> "active"
 */
export function deriveGoalStatus(
  progressCount: number,
  targetCount: number,
  isExpired: boolean,
): GoalStatus {
  if (progressCount >= targetCount) return "completed";
  if (isExpired) return "missed";
  return "active";
}
