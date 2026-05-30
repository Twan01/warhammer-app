import { ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useUdbUnitDetail } from "@/hooks/useUnitDatabase";
import type { UdbAbility } from "@/db/queries/unitDatabase";
import { UdbStatBlock } from "./UdbStatBlock";
import { UdbWeaponsTable } from "./UdbWeaponsTable";

const SECTION_LABEL =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

interface UdbDatasheetSheetProps {
  unitId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UdbDatasheetSheet({
  unitId,
  open,
  onOpenChange,
}: UdbDatasheetSheetProps) {
  const { data: unit, isLoading } = useUdbUnitDetail(unitId);

  const rangedWeapons = (unit?.weapons ?? []).filter(
    (w) => w.category?.toLowerCase() === "ranged",
  );
  const meleeWeapons = (unit?.weapons ?? []).filter(
    (w) => w.category?.toLowerCase() === "melee",
  );

  const coreAbilities = (unit?.abilities ?? []).filter(
    (a) => a.ability_type === "Core",
  );
  const factionAbilities = (unit?.abilities ?? []).filter(
    (a) => a.ability_type === "Faction",
  );
  const unitAbilities = (unit?.abilities ?? []).filter(
    (a) => a.ability_type !== "Core" && a.ability_type !== "Faction",
  );
  const hasAbilities =
    coreAbilities.length > 0 ||
    factionAbilities.length > 0 ||
    unitAbilities.length > 0;

  const factionKeywords = (unit?.keywords ?? []).filter(
    (k) => k.is_faction === 1,
  );
  const regularKeywords = (unit?.keywords ?? []).filter(
    (k) => k.is_faction !== 1,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[480px] sm:w-[600px] overflow-y-auto"
      >
        {isLoading && (
          <div className="flex flex-col gap-4 p-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!isLoading && unit && (
          <>
            <SheetHeader>
              <SheetTitle className="text-xl font-semibold">
                {unit.name}
              </SheetTitle>
              {unit.role && (
                <Badge variant="secondary" className="w-fit">
                  {unit.role}
                </Badge>
              )}
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 pb-6">
              <Separator />

              {/* Stat Block */}
              {unit.models.length > 0 && (
                <UdbStatBlock models={unit.models} />
              )}

              {/* Composition & Points */}
              {(unit.composition.length > 0 || unit.points.length > 0) && (
                <div className="flex flex-col gap-1">
                  <span className={SECTION_LABEL}>Composition</span>
                  {unit.composition.map((c) => (
                    <p key={c.id} className="text-sm text-muted-foreground">
                      {c.min_models === c.max_models
                        ? `${c.min_models} model${c.min_models !== 1 ? "s" : ""}`
                        : `${c.min_models}–${c.max_models} models`}
                      {c.notes && ` (${c.notes})`}
                    </p>
                  ))}
                  {unit.points.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {unit.points.map((p) => (
                        <Badge key={p.id} variant="outline" className="text-xs">
                          {p.points} pts ({p.model_count} model
                          {p.model_count !== 1 ? "s" : ""})
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Ranged Weapons */}
              {rangedWeapons.length > 0 && (
                <CollapsibleSection title="Ranged Weapons">
                  <UdbWeaponsTable
                    weapons={rangedWeapons}
                    statLabel="BS"
                  />
                </CollapsibleSection>
              )}

              {/* Melee Weapons */}
              {meleeWeapons.length > 0 && (
                <CollapsibleSection title="Melee Weapons">
                  <UdbWeaponsTable
                    weapons={meleeWeapons}
                    statLabel="WS"
                  />
                </CollapsibleSection>
              )}

              {(rangedWeapons.length > 0 || meleeWeapons.length > 0) && (
                <Separator />
              )}

              {/* Abilities */}
              {hasAbilities && (
                <CollapsibleSection title="Abilities">
                  <div className="flex flex-col gap-4">
                    {coreAbilities.length > 0 && (
                      <AbilityGroup label="Core" abilities={coreAbilities} />
                    )}
                    {factionAbilities.length > 0 && (
                      <AbilityGroup
                        label="Faction"
                        abilities={factionAbilities}
                      />
                    )}
                    {unitAbilities.length > 0 && (
                      <AbilityGroup label="Unit" abilities={unitAbilities} />
                    )}
                  </div>
                </CollapsibleSection>
              )}

              {/* Keywords */}
              {(factionKeywords.length > 0 || regularKeywords.length > 0) && (
                <div className="flex flex-col gap-2">
                  {factionKeywords.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className={SECTION_LABEL}>Faction Keywords</span>
                      <div className="flex flex-wrap gap-1">
                        {factionKeywords.map((k) => (
                          <Badge key={k.keyword} variant="secondary">
                            {k.keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {regularKeywords.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className={SECTION_LABEL}>Keywords</span>
                      <div className="flex flex-wrap gap-1">
                        {regularKeywords.map((k) => (
                          <Badge key={k.keyword} variant="outline">
                            {k.keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Damaged Profile */}
              {unit.damaged_w != null && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <span className={SECTION_LABEL}>Damaged Profile</span>
                    <p className="text-sm font-medium">
                      Damaged: {unit.damaged_w} wounds remaining
                    </p>
                    {unit.damaged_desc && (
                      <p className="text-sm text-muted-foreground">
                        {unit.damaged_desc}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full py-2 text-left"
        >
          <span className="text-base font-semibold">{title}</span>
          <ChevronDown
            className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

function AbilityGroup({
  label,
  abilities,
}: {
  label: string;
  abilities: UdbAbility[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className={SECTION_LABEL}>{label}</span>
      {abilities.map((a) => (
        <div
          key={a.id}
          className="flex flex-col gap-1 pl-2 border-l border-border"
        >
          <span className="text-sm font-semibold">{a.name}</span>
          {a.description && (
            <p className="text-sm text-muted-foreground">{a.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
