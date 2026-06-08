import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { UdbStratagem } from "@/types/gameData";

const PHASE_STYLES: Record<string, string> = {
  Command: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  Movement: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  Shooting: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  Charge: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  Fight: "bg-red-500/20 text-red-700 dark:text-red-300",
};

function getPhaseBadgeClass(phase: string | null): string {
  if (!phase) return "bg-muted text-muted-foreground";
  return PHASE_STYLES[phase] ?? "bg-muted text-muted-foreground";
}

function cpLabel(cost: number): string {
  if (cost === 0) return "Free";
  return `${cost} CP`;
}

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
          dangerouslySetInnerHTML={{ __html: stratagem.description }}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
