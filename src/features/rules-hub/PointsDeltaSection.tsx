/**
 * Phase 65 -- Points delta section for RulesHubPage (PI-04).
 *
 * Collapsible display of per-unit point changes after a Wahapedia sync.
 * Shows summary counts (added/removed/changed) and an expandable detail
 * list with direction indicators and army list impact.
 */
import { useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { PointsDelta } from "@/types/pointsDelta";

interface PointsDeltaSectionProps {
  pointsDelta: PointsDelta;
  affectedLists: Array<{ id: number; name: string }>;
}

export function PointsDeltaSection({
  pointsDelta,
  affectedLists,
}: PointsDeltaSectionProps) {
  const [open, setOpen] = useState(false);

  const totalChanges =
    pointsDelta.added + pointsDelta.removed + pointsDelta.changed;

  if (totalChanges === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No point changes in this sync
      </p>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Points Changes
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <p className="mt-1 text-xs">
          <span className="text-green-600">+{pointsDelta.added} added</span>
          {" / "}
          <span className="text-red-600">-{pointsDelta.removed} removed</span>
          {" / "}
          <span className="text-amber-600">~{pointsDelta.changed} changed</span>
        </p>

        <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
          {pointsDelta.details.map((detail, idx) => (
            <div
              key={`${detail.unitName}-${detail.factionId}-${idx}`}
              className="flex items-center gap-2"
            >
              <span className="text-sm">{detail.unitName}</span>
              <span className="text-xs text-muted-foreground">
                {detail.changeType === "added" && (
                  <>{detail.newPoints} pts</>
                )}
                {detail.changeType === "removed" && (
                  <span className="line-through">{detail.oldPoints} pts</span>
                )}
                {detail.changeType === "changed" && (
                  <>
                    {detail.oldPoints} &rarr; {detail.newPoints}
                  </>
                )}
              </span>
              {detail.changeType === "changed" && detail.newPoints !== null && detail.oldPoints !== null && (
                detail.newPoints > detail.oldPoints ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )
              )}
              {detail.changeType === "added" && (
                <TrendingUp className="h-3 w-3 text-green-600" />
              )}
              {detail.changeType === "removed" && (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
            </div>
          ))}
        </div>

        {affectedLists.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {affectedLists.length} army list(s) affected:{" "}
            {affectedLists.map((l) => l.name).join(", ")}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
