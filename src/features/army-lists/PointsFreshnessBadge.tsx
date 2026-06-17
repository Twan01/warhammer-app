/**
 * Phase 107 -- Points freshness badge.
 *
 * Self-contained badge showing data version from udb_meta.
 */
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useUdbMeta } from "@/hooks/useUdbMeta";

export function PointsFreshnessBadge() {
  const { data: udbMeta, isLoading } = useUdbMeta();

  if (isLoading) {
    return <Skeleton className="h-2 w-16" />;
  }

  const displayLabel = udbMeta ? `v${udbMeta.version}` : "No data";
  const tooltipText = udbMeta
    ? `Data version ${udbMeta.version} (built ${udbMeta.built_at})`
    : "Unit database not imported";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-xs text-muted-foreground">{displayLabel}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
