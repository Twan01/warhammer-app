import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import type { RwAbility } from "@/types/datasheet";

export function SharedAbilityCard({ ability }: { ability: RwAbility }) {
  return (
    <Collapsible className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left [&[data-state=open]>svg:last-child]:rotate-180">
        <span className="flex-1 font-medium text-sm">{ability.name}</span>
        {ability.legend && (
          <Badge
            variant="outline"
            className="shrink-0 border-transparent bg-muted text-muted-foreground"
          >
            {ability.legend}
          </Badge>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 pt-1 text-sm text-muted-foreground space-y-2">
        {ability.description ? (
          <p>{ability.description}</p>
        ) : ability.legend ? (
          <p className="italic">{ability.legend}</p>
        ) : (
          <p className="italic">No description available.</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
