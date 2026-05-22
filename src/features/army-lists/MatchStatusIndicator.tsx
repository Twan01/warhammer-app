/**
 * Phase 76 -- Match status indicator (PV-03, PV-05, D-09, D-10).
 *
 * Small inline icon button on each unit row showing the unit-to-rules
 * mapping status. Clickable to open the RulesMappingSheet.
 *
 * States (priority order):
 * 1. ambiguous (ambiguousCount > 1 && status is "auto" or null) -> AlertTriangle destructive
 * 2. no mapping (null) -> AlertTriangle amber
 * 3. confirmed -> Check emerald
 * 4. auto -> LinkIcon muted
 * 5. manual -> Pencil blue
 */
import { Check, Link as LinkIcon, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { MatchStatus } from "@/types/unitRulesMapping";

interface MatchStatusIndicatorProps {
  matchStatus: MatchStatus | null;
  ambiguousCount?: number;
  onClick: () => void;
}

function getIndicatorConfig(
  matchStatus: MatchStatus | null,
  ambiguousCount: number,
) {
  // Ambiguous takes priority when auto or no mapping
  if (
    ambiguousCount > 1 &&
    (matchStatus === "auto" || matchStatus === null)
  ) {
    return {
      icon: AlertTriangle,
      className: "text-destructive",
      tooltip: `Ambiguous match (${ambiguousCount} candidates) -- click to resolve`,
    };
  }

  if (matchStatus === null) {
    return {
      icon: AlertTriangle,
      className: "text-amber-500",
      tooltip: "No rules mapping -- click to resolve",
    };
  }

  switch (matchStatus) {
    case "confirmed":
      return {
        icon: Check,
        className: "text-emerald-500",
        tooltip: "Rules mapping confirmed",
      };
    case "auto":
      return {
        icon: LinkIcon,
        className: "text-muted-foreground",
        tooltip: "Auto-matched -- click to confirm",
      };
    case "manual":
      return {
        icon: Pencil,
        className: "text-blue-500",
        tooltip: "Manually mapped",
      };
  }
}

export function MatchStatusIndicator({
  matchStatus,
  ambiguousCount = 0,
  onClick,
}: MatchStatusIndicatorProps) {
  const config = getIndicatorConfig(matchStatus, ambiguousCount);
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClick}
          aria-label={config.tooltip}
        >
          <Icon className={`h-3.5 w-3.5 ${config.className}`} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{config.tooltip}</TooltipContent>
    </Tooltip>
  );
}
