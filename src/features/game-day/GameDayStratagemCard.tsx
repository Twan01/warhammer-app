import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { sanitizeRulesHtml } from "@/lib/sanitizeHtml";
import { getPhaseBadgeClass, cpLabel } from "@/lib/stratagemStyles";
import type { UdbStratagem } from "@/types/gameData";

interface GameDayStratagemCardProps {
  stratagem: UdbStratagem;
  onSpendCp: (cost: number) => void;
}

export function GameDayStratagemCard({
  stratagem,
  onSpendCp,
}: GameDayStratagemCardProps) {
  const cost = stratagem.cp_cost;
  const isFree = cost === 0;

  return (
    <Collapsible className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left [&[data-state=open]>svg:last-child]:rotate-180">
        <span className="flex-1 font-medium text-sm">{stratagem.name}</span>
        {stratagem.phase && (
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 border-transparent",
              getPhaseBadgeClass(stratagem.phase),
            )}
          >
            {stratagem.phase}
          </Badge>
        )}
        {stratagem.turn && (
          <Badge
            variant="outline"
            className="shrink-0 border-transparent bg-muted text-muted-foreground text-xs"
          >
            {stratagem.turn}
          </Badge>
        )}
        <Badge
          variant="outline"
          className="shrink-0 border-transparent bg-muted text-muted-foreground"
        >
          {cpLabel(cost)}
        </Badge>
        {!isFree && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onSpendCp(cost);
            }}
          >
            Spend
          </Button>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 pt-1 text-sm text-muted-foreground space-y-2">
        <div
          className="text-sm text-muted-foreground [&_b]:font-semibold [&_.kwb]:text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeRulesHtml(stratagem.description) }}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
