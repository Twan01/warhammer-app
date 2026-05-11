import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { useDetachmentAbilitiesByDetachment } from "@/hooks/useRulesExtended";
import type { RwDetachment } from "@/types/datasheet";

export function DetachmentCard({ detachment }: { detachment: RwDetachment }) {
  // Called unconditionally at component top level — each card is its own component instance
  const { data: abilities = [], isLoading } = useDetachmentAbilitiesByDetachment(detachment.id);

  return (
    <Collapsible className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left [&[data-state=open]>svg:last-child]:rotate-180">
        <span className="flex-1 font-medium text-sm">{detachment.name}</span>
        <Badge
          variant="outline"
          className="shrink-0 border-transparent bg-muted text-muted-foreground"
        >
          {abilities.length} {abilities.length === 1 ? "ability" : "abilities"}
        </Badge>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 pt-1">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : abilities.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No abilities found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {abilities.map((ability) => (
              <div key={ability.id} className="text-sm">
                <p className="font-semibold">{ability.name}</p>
                {ability.description && (
                  <p className="text-muted-foreground mt-0.5">{ability.description}</p>
                )}
                {!ability.description && ability.legend && (
                  <p className="text-muted-foreground italic mt-0.5">{ability.legend}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
