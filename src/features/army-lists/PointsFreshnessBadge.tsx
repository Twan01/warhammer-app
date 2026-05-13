/**
 * Phase 65 -- Points freshness badge (PI-03).
 *
 * Self-contained badge: internally queries useRulesSyncMeta() to determine
 * freshness tier and age label. Renders an 8x8 colored dot + text label.
 * Shared React Query cache ensures no duplicate fetches when multiple
 * badges are mounted simultaneously.
 */
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import {
  getSyncFreshness,
  getSyncAgeLabel,
  FRESHNESS_DOT_CLASS,
} from "@/lib/syncFreshness";

export function PointsFreshnessBadge() {
  const { data: syncMeta, isLoading } = useRulesSyncMeta();

  if (isLoading) {
    return <Skeleton className="h-2 w-16" />;
  }

  const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
  const ageLabel = getSyncAgeLabel(syncMeta?.last_sync_at ?? null);

  const noPointsData =
    freshness === "never" &&
    (syncMeta?.points_count === null ||
      syncMeta?.points_count === undefined ||
      syncMeta?.points_count === 0);

  const displayLabel = noPointsData ? "No points data" : ageLabel;
  const tooltipText = noPointsData
    ? "No official points data synced"
    : ageLabel;

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              FRESHNESS_DOT_CLASS[freshness],
            )}
          />
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
      <span className="text-xs text-muted-foreground">{displayLabel}</span>
    </div>
  );
}
