/**
 * Phase 107 -- Points freshness badge.
 *
 * Self-contained badge showing data version from udb_meta.
 */
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useUdbMeta } from "@/hooks/useUdbMeta";
import {
  getSyncFreshness,
  FRESHNESS_DOT_CLASS,
} from "@/lib/syncFreshness";

export function PointsFreshnessBadge() {
  const { data: udbMeta, isLoading } = useUdbMeta();

  if (isLoading) {
    return <Skeleton className="h-2 w-16" />;
  }

  const freshness = getSyncFreshness(udbMeta?.built_at ?? null);
  const displayLabel = udbMeta ? `v${udbMeta.version}` : "No data";
  const tooltipText = udbMeta
    ? `Data version ${udbMeta.version} (built ${udbMeta.built_at})`
    : "Unit database not imported";

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
