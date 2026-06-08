import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { useDetachmentAbilities } from "@/hooks/useGameData";
import type { UdbDetachmentAbilityWithDetachment } from "@/types/gameData";

interface PlaybookDetachmentAbilitiesProps {
  factionId: string;
}

/**
 * Phase 120 — Displays all detachment abilities for a faction, grouped by
 * detachment name, in a collapsible section inside PlaybookTab.
 *
 * Per D-14/D-15: always shows all detachments for the faction so the user
 * can review abilities regardless of which detachment is active in their list.
 */
export function PlaybookDetachmentAbilities({ factionId }: PlaybookDetachmentAbilitiesProps) {
  const { data: abilities = [], isLoading } = useDetachmentAbilities(factionId);

  const grouped = useMemo(() => {
    const map = new Map<string, UdbDetachmentAbilityWithDetachment[]>();
    for (const ability of abilities) {
      const key = ability.detachment_name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ability);
    }
    return map;
  }, [abilities]);

  if (isLoading || abilities.length === 0) {
    return null;
  }

  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border bg-card px-4 py-3 text-left [&[data-state=open]>svg:last-child]:rotate-180">
        <span className="flex-1 font-medium text-sm">Detachment Abilities</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 flex flex-col gap-4">
        {[...grouped.entries()].map(([detachmentName, detachmentAbilities]) => (
          <div key={detachmentName} className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {detachmentName}
            </p>
            {detachmentAbilities.map((ability) => (
              <div key={ability.id} className="rounded-md border bg-card p-3">
                <p className="text-sm font-semibold">{ability.name}</p>
                {ability.description && (
                  <div
                    className="text-sm text-muted-foreground [&_b]:font-semibold [&_.kwb]:text-foreground mt-1"
                    dangerouslySetInnerHTML={{ __html: ability.description }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
