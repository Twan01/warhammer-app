/**
 * DASH-07 — Dashboard stats hook.
 *
 * `["dashboard-stats"]` is the SAME query key that all three useUnits
 * mutations already invalidate (decision 02-02, STATE.md):
 *   useCreateUnit -> qc.invalidateQueries({ queryKey: ["dashboard-stats"] })
 *   useUpdateUnit -> qc.invalidateQueries({ queryKey: ["dashboard-stats"] })
 *   useDeleteUnit -> qc.invalidateQueries({ queryKey: ["dashboard-stats"] })
 *
 * Therefore: any unit mutation anywhere in the app automatically refreshes
 * the dashboard. No additional wiring needed in this plan.
 */
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/db/queries/dashboard";
import { computeStats, type ComputedDashboardStats } from "@/features/dashboard/computeStats";

export const DASHBOARD_STATS_KEY = ["dashboard-stats"] as const;

export function useDashboardStats() {
  return useQuery<ComputedDashboardStats, Error>({
    queryKey: DASHBOARD_STATS_KEY,
    queryFn: async () => {
      const { units, factions } = await getDashboardStats();
      return computeStats(units, factions);
    },
  });
}
