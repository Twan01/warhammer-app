import { ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { UdbUnitDetail, UdbAbility } from "@/db/queries/unitDatabase";
import { WeaponTable } from "@/features/units/WeaponTable";
import { sanitizeRulesHtml } from "@/lib/sanitizeHtml";

const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

interface PlaybookDatasheetProps {
  datasheet: UdbUnitDetail | null | undefined;
}

export function PlaybookDatasheet({ datasheet }: PlaybookDatasheetProps) {
  const coreAbilities = (datasheet?.abilities ?? []).filter((a) => a.ability_type === "Core");
  const factionAbilities = (datasheet?.abilities ?? []).filter((a) => a.ability_type === "Faction");
  const unitAbilities = (datasheet?.abilities ?? []).filter((a) =>
    a.ability_type !== "Core" && a.ability_type !== "Faction"
  );
  const hasAnyDatasheetAbility = coreAbilities.length > 0 || factionAbilities.length > 0 || unitAbilities.length > 0;
  const rangedWeapons = (datasheet?.weapons ?? []).filter((w) => w.category === "Ranged");
  const meleeWeapons = (datasheet?.weapons ?? []).filter((w) => w.category === "Melee" || (w.category !== "Ranged" && w.range === "Melee"));
  const hasWeapons = (datasheet?.weapons ?? []).length > 0;

  return (
    <>
      {/* Weapons collapsible */}
      {hasWeapons && (
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex items-center justify-between w-full py-2 text-left">
              <span className="text-base font-semibold">Weapons</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" aria-hidden="true" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-4">
              {rangedWeapons.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className={SECTION_LABEL_CLASS}>Ranged</span>
                  <WeaponTable weapons={rangedWeapons} statLabel="BS" />
                </div>
              )}
              {meleeWeapons.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className={SECTION_LABEL_CLASS}>Melee</span>
                  <WeaponTable weapons={meleeWeapons} statLabel="WS" />
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {hasWeapons && <Separator />}

      {/* DS-09 Datasheet Abilities collapsible */}
      {hasAnyDatasheetAbility && (
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between w-full py-2 text-left"
            >
              <span className="text-base font-semibold">Datasheet Abilities</span>
              <ChevronDown
                className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-4">
              {coreAbilities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className={SECTION_LABEL_CLASS}>Core Abilities</span>
                  {coreAbilities.map((a, idx) => (
                    <AbilityEntry key={`${a.unit_id}-${a.line_order}-${idx}`} ability={a} />
                  ))}
                </div>
              )}
              {factionAbilities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className={SECTION_LABEL_CLASS}>Faction Abilities</span>
                  {factionAbilities.map((a, idx) => (
                    <AbilityEntry key={`${a.unit_id}-${a.line_order}-${idx}`} ability={a} />
                  ))}
                </div>
              )}
              {unitAbilities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className={SECTION_LABEL_CLASS}>Unit Abilities</span>
                  {unitAbilities.map((a, idx) => (
                    <AbilityEntry key={`${a.unit_id}-${a.line_order}-${idx}`} ability={a} />
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {hasAnyDatasheetAbility && <Separator />}
    </>
  );
}

// AbilityEntry sub-component -- module-local, NOT exported.
function AbilityEntry({ ability }: { ability: UdbAbility }) {
  return (
    <div className="flex flex-col gap-1 pl-2 border-l border-border">
      <span className="text-sm font-semibold text-foreground">{ability.name}</span>
      {ability.description && (
        <div
          className="text-sm text-muted-foreground leading-relaxed [&_b]:font-semibold [&_.kwb]:text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeRulesHtml(ability.description) }}
        />
      )}
    </div>
  );
}
