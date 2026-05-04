/**
 * Phase 19 — Hobby analytics hook (ANLY-04, ANLY-05, ANLY-06, ANLY-07).
 *
 * `["hobby-analytics"]` is the cache key reserved by STATE.md architecture
 * constraint for all v2.2 analytics. Plan 02 wires Dashboard HOBBY HEALTH
 * and SpendingPage Monthly Trend to this hook. Plan 02 also patches
 * useJournalSessions, useUnits, and usePaints mutations to invalidate this
 * key so that velocity / streak / chart all stay fresh after data changes.
 *
 * Mirrors src/hooks/useSpendingStats.ts (single-key contract test in
 * tests/analytics/useHobbyAnalytics.test.ts catches accidental renames).
 */
import { useQuery } from "@tanstack/react-query";
import { getAnalyticsData } from "@/db/queries/analytics";
import {
  computeHobbyAnalytics,
  type HobbyAnalytics,
} from "@/features/dashboard/computeHobbyAnalytics";

export const HOBBY_ANALYTICS_KEY = ["hobby-analytics"] as const;

export function useHobbyAnalytics() {
  return useQuery<HobbyAnalytics, Error>({
    queryKey: HOBBY_ANALYTICS_KEY,
    queryFn: async () => {
      const { sessions, monthlySpend } = await getAnalyticsData();
      return computeHobbyAnalytics(sessions, monthlySpend);
    },
  });
}
