/**
 * Phase 76 -- Points source chip (PV-02, D-03).
 *
 * Displays the resolved points value with a colored dot indicating
 * the provenance source. Follows the PointsFreshnessBadge pattern:
 * colored dot + text label with Tooltip.
 */
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { PointsSource } from "@/lib/resolveUnitPoints";

const SOURCE_DOT_CLASS: Record<PointsSource, string> = {
  synced: "bg-emerald-500",
  override: "bg-violet-500",
  tier: "bg-cyan-500",
  "user-override": "bg-amber-500",
  base: "bg-blue-500",
  unknown: "bg-muted-foreground/50",
};

const SOURCE_LABEL: Record<PointsSource, string> = {
  synced: "synced",
  override: "override",
  tier: "tier",
  "user-override": "user-override",
  base: "base",
  unknown: "unknown",
};

export function PointsSourceChip({
  points,
  source,
}: {
  points: number | null;
  source: PointsSource;
}) {
  const displayPoints = source === "unknown" ? "--" : `${points ?? 0}`;

  return (
    <div
      className="inline-flex items-center gap-1.5"
      aria-label={`${displayPoints} points, source: ${source}`}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full shrink-0",
              SOURCE_DOT_CLASS[source],
            )}
          />
        </TooltipTrigger>
        <TooltipContent>{SOURCE_LABEL[source]}</TooltipContent>
      </Tooltip>
      <span className="text-xs text-muted-foreground">
        {displayPoints} pts
      </span>
    </div>
  );
}
