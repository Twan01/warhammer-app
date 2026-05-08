/**
 * Phase 45 — React Query hook for sync error history (META-04).
 *
 * Wraps getSyncErrors() with staleTime: 0 because error data changes
 * after each failed sync. SYNC_ERRORS_KEY must be invalidated in
 * useRulesSync.onError after insertSyncError().
 */
import { useQuery } from "@tanstack/react-query";
import { getSyncErrors } from "@/db/queries/syncErrors";

export const SYNC_ERRORS_KEY = ["sync-errors"] as const;

export function useRulesSyncErrors() {
  return useQuery({
    queryKey: SYNC_ERRORS_KEY,
    queryFn: getSyncErrors,
    staleTime: 0,
  });
}
