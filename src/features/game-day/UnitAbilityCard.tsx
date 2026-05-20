import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useDatasheet } from "@/hooks/useDatasheet";
import { useStrategyNote } from "@/hooks/useStrategyNote";
import { useGameDayStore, useGameDayListState } from "./gameDayStore";
import type { ArmyListUnitRow } from "@/types/armyList";
import type { RwDatasheetAbility } from "@/types/datasheet";

function getPaintingBadgeVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "Battle Ready" || status === "Parade Ready") return "default";
  if (status === "Not Started") return "outline";
  return "secondary";
}

function isOncePerGame(ability: RwDatasheetAbility): boolean {
  const text = [ability.name ?? "", ability.description ?? "", ability.parameter ?? ""]
    .join(" ")
    .toLowerCase();
  return text.includes("once per battle") || text.includes("once per game");
}

interface UnitAbilityCardProps {
  unit: ArmyListUnitRow;
  listId: number;
}

export function UnitAbilityCard({ unit, listId }: UnitAbilityCardProps) {
  const unitIdOrUndefined = unit.unit_id ?? undefined;
  const { data: datasheet, isLoading: dsLoading } = useDatasheet(unitIdOrUndefined);
  const { data: strategyNote, isLoading: noteLoading } = useStrategyNote(unitIdOrUndefined);
  const listState = useGameDayListState(listId);
  const toggleAbilityUsed = useGameDayStore((s) => s.toggleAbilityUsed);

  const opgAbilities = useMemo(() => {
    const abilities = datasheet?.abilities ?? [];
    if (abilities.length === 0) return [];
    return abilities
      .filter(isOncePerGame)
      .map((ability) => ({
        ability,
        key: `${unit.unit_id}::${ability.ability_id ?? ability.name}`,
      }));
  }, [datasheet?.abilities, unit.unit_id]);

  const regularAbilities = useMemo(() => {
    const abilities = datasheet?.abilities ?? [];
    return abilities.filter((a) => !isOncePerGame(a));
  }, [datasheet?.abilities]);

  const strategyFields = useMemo(() => {
    if (!strategyNote) return [];
    const fields: { label: string; value: string }[] = [];
    if (strategyNote.abilities) fields.push({ label: "Abilities", value: strategyNote.abilities });
    if (strategyNote.strengths) fields.push({ label: "Strengths", value: strategyNote.strengths });
    if (strategyNote.weaknesses) fields.push({ label: "Weaknesses", value: strategyNote.weaknesses });
    if (strategyNote.best_targets) fields.push({ label: "Best Targets", value: strategyNote.best_targets });
    if (strategyNote.notes) fields.push({ label: "Notes", value: strategyNote.notes });
    return fields;
  }, [strategyNote]);

  const hasAbilities = opgAbilities.length > 0 || regularAbilities.length > 0;
  const hasNotes = strategyFields.length > 0;

  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left [&[data-state=open]>svg:last-child]:rotate-180">
        <span className="flex-1 text-sm font-medium">{unit.unit_name}</span>
        <Badge variant={getPaintingBadgeVariant(unit.status_painting ?? "")} className="mx-2 shrink-0">
          {unit.status_painting ?? "—"}
        </Badge>
        <span className="mr-2 shrink-0 text-xs text-muted-foreground">
          {unit.effective_points}pts
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </CollapsibleTrigger>

      <CollapsibleContent className="flex flex-col gap-3 px-3 pb-3">
        {(dsLoading || noteLoading) && <Skeleton className="h-20 w-full" />}

        {!dsLoading && !noteLoading && (
          <>
            {opgAbilities.length > 0 && (
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Once Per Game
                </span>
                {opgAbilities.map(({ ability, key }) => {
                  const isUsed = listState.usedAbilities.includes(key);
                  return (
                    <div key={key} className="flex items-start gap-2 rounded-md border p-2">
                      <div className={cn("flex-1", isUsed && "opacity-50 line-through")}>
                        <div className="text-sm font-medium">{ability.name}</div>
                        {ability.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {ability.description}
                          </div>
                        )}
                      </div>
                      <Button
                        variant={isUsed ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleAbilityUsed(listId, key)}
                      >
                        {isUsed ? "Used" : "Available"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {regularAbilities.length > 0 && (
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Abilities
                </span>
                {regularAbilities.map((ability) => (
                  <div key={ability.ability_id ?? ability.name} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{ability.name}</span>
                      {ability.type && (
                        <Badge variant="outline" className="text-xs">
                          {ability.type}
                        </Badge>
                      )}
                    </div>
                    {ability.description && (
                      <div className="text-xs text-muted-foreground">{ability.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {hasNotes && (
              <div className="flex flex-col gap-1 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes
                </span>
                {strategyFields.map(({ label, value }) => (
                  <div key={label}>
                    <span className="text-xs font-medium text-muted-foreground">{label}:</span>{" "}
                    <span className="text-xs">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {!hasAbilities && !hasNotes && (
              <p className="py-2 text-xs text-muted-foreground">
                No ability data available. Link a datasheet or add notes in the Playbook tab.
              </p>
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
