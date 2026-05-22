import { ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { FullDatasheet, RwDatasheetAbility, RwDatasheetWargear } from "@/types/datasheet";

const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

interface PlaybookDatasheetProps {
  datasheet: FullDatasheet | null | undefined;
}

export function PlaybookDatasheet({ datasheet }: PlaybookDatasheetProps) {
  const coreAbilities = (datasheet?.abilities ?? []).filter((a) => a.type === "Core");
  const factionAbilities = (datasheet?.abilities ?? []).filter((a) => a.type === "Faction");
  const unitAbilities = (datasheet?.abilities ?? []).filter((a) =>
    a.type !== "Core" && a.type !== "Faction"
  );
  const hasAnyDatasheetAbility = coreAbilities.length > 0 || factionAbilities.length > 0 || unitAbilities.length > 0;
  const sources = datasheet?.source ? [datasheet.source] : [];
  const rangedWeapons = (datasheet?.wargear ?? []).filter((w) => w.type === "Ranged");
  const meleeWeapons = (datasheet?.wargear ?? []).filter((w) => w.type === "Melee" || (w.type !== "Ranged" && w.range === "Melee"));
  const hasWeapons = (datasheet?.wargear ?? []).length > 0;

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
                  <WargearTable weapons={rangedWeapons} statLabel="BS" />
                </div>
              )}
              {meleeWeapons.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className={SECTION_LABEL_CLASS}>Melee</span>
                  <WargearTable weapons={meleeWeapons} statLabel="WS" />
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
                    <AbilityEntry key={`${a.datasheet_id}-${a.line}-${idx}`} ability={a} />
                  ))}
                </div>
              )}
              {factionAbilities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className={SECTION_LABEL_CLASS}>Faction Abilities</span>
                  {factionAbilities.map((a, idx) => (
                    <AbilityEntry key={`${a.datasheet_id}-${a.line}-${idx}`} ability={a} />
                  ))}
                </div>
              )}
              {unitAbilities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className={SECTION_LABEL_CLASS}>Unit Abilities</span>
                  {unitAbilities.map((a, idx) => (
                    <AbilityEntry key={`${a.datasheet_id}-${a.line}-${idx}`} ability={a} />
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* DS-10 Sources list */}
      {sources.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={SECTION_LABEL_CLASS}>Sources</span>
          <ul className="flex flex-col gap-1 pl-2">
            {sources.map((s) => (
              <li key={s.id} className="text-sm text-muted-foreground">
                {s.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(hasAnyDatasheetAbility || sources.length > 0) && <Separator />}
    </>
  );
}

// WargearTable sub-component — renders a weapon stat table for one type (Ranged/Melee).
function WargearTable({ weapons, statLabel }: { weapons: RwDatasheetWargear[]; statLabel: "BS" | "WS" }) {
  return (
    <div className="flex flex-col">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1 border-b border-border">
        {["Name", "Rng", "A", statLabel, "S", "AP", "D"].map((h) => (
          <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center first:text-left">
            {h}
          </span>
        ))}
      </div>
      {weapons.map((w, i) => {
        const range = w.range && /^\d+$/.test(w.range) ? `${w.range}"` : (w.range ?? "—");
        const attacks = w.dice ? `${w.dice}+${w.A ?? 0}` : (w.A ?? "—");
        const bsws = w.BS_WS ? `${w.BS_WS}+` : "—";
        return (
          <div key={`${w.datasheet_id}-${w.line}-${w.line_in_wargear}-${i}`} className="border-b border-border last:border-0">
            <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1.5 items-center">
              <span className="text-sm font-medium truncate">{w.name}</span>
              <span className="text-xs text-center tabular-nums">{range}</span>
              <span className="text-xs text-center tabular-nums">{attacks}</span>
              <span className="text-xs text-center tabular-nums">{bsws}</span>
              <span className="text-xs text-center tabular-nums">{w.S ?? "—"}</span>
              <span className="text-xs text-center tabular-nums">{w.AP ?? "0"}</span>
              <span className="text-xs text-center tabular-nums">{w.D ?? "—"}</span>
            </div>
            {w.description && (
              <p className="px-2 pb-1.5 text-xs text-muted-foreground leading-relaxed">
                {w.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// AbilityEntry sub-component — module-local, NOT exported.
function AbilityEntry({ ability }: { ability: RwDatasheetAbility }) {
  return (
    <div className="flex flex-col gap-1 pl-2 border-l border-border">
      <span className="text-sm font-semibold text-foreground">{ability.name}</span>
      {ability.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {ability.description}
        </p>
      )}
    </div>
  );
}
