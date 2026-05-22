import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRulesFavorites, useUpsertRulesFavorite, useDeleteRulesFavorite } from "@/hooks/useRulesFavorites";
import { useRulesNotes } from "@/hooks/useRulesNotes";
import { useDetachmentAbilitiesByDetachment } from "@/hooks/useRulesExtended";
import { RuleAnnotationControls } from "@/features/rules-hub/RuleAnnotationControls";
import { RuleNoteEditor } from "@/features/rules-hub/RuleNoteEditor";
import { cn } from "@/lib/utils";
import type { RwDetachment, RwStratagem, RwDetachmentAbility } from "@/types/datasheet";
import type { RulesFavorite } from "@/types/rulesFavorite";
import type { RulesNote } from "@/types/rulesNote";

const SECTION_LABEL_CLASS = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

interface PlaybookRulesProps {
  stratagems: RwStratagem[];
  detachments: RwDetachment[];
  sharedAbilities: { id: string; name: string; description: string | null; legend: string | null; faction_id: string | null }[];
}

export function PlaybookRules({
  stratagems,
  detachments,
  sharedAbilities,
}: PlaybookRulesProps) {
  const { data: rulesFavorites = [] } = useRulesFavorites();
  const { data: rulesNotes = [] } = useRulesNotes();

  const favoritesMap = useMemo(() => {
    const m = new Map<string, RulesFavorite>();
    for (const f of rulesFavorites) m.set(`${f.rule_id}:${f.rule_type}`, f);
    return m;
  }, [rulesFavorites]);

  const notesMap = useMemo(() => {
    const m = new Map<string, RulesNote>();
    for (const n of rulesNotes) m.set(`${n.rule_id}:${n.rule_type}`, n);
    return m;
  }, [rulesNotes]);

  const hasStratagems = stratagems.length > 0;
  const hasDetachments = detachments.length > 0;
  const hasSharedAbilities = sharedAbilities.length > 0;

  const stratagemsByPhase = useMemo(() => {
    const map = new Map<string, RwStratagem[]>();
    for (const s of stratagems) {
      const key = s.phase ?? "Other";
      const group = map.get(key) ?? [];
      group.push(s);
      map.set(key, group);
    }
    return map;
  }, [stratagems]);

  return (
    <>
      {/* SCHEMA-01: Stratagems grouped by phase */}
      {hasStratagems && (
        <>
          <Separator />
          <Collapsible defaultOpen={true}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center justify-between w-full py-2 text-left">
                <span className="text-base font-semibold">Stratagems</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" aria-hidden="true" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-4">
                {Array.from(stratagemsByPhase.entries()).map(([phaseName, phaseStratagems]) => (
                  <div key={phaseName} className="flex flex-col gap-2">
                    <span className={SECTION_LABEL_CLASS}>{phaseName}</span>
                    {phaseStratagems.map((s) => (
                      <StratagemEntry
                        key={s.id}
                        stratagem={s}
                        favorite={favoritesMap.get(`${s.id}:stratagem`) ?? null}
                        note={notesMap.get(`${s.id}:stratagem`) ?? null}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* SCHEMA-02 + SCHEMA-03: Detachments with nested abilities */}
      {hasDetachments && (
        <>
          <Separator />
          <Collapsible defaultOpen={true}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center justify-between w-full py-2 text-left">
                <span className="text-base font-semibold">Detachments</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" aria-hidden="true" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-4">
                {detachments.map((det) => (
                  <DetachmentSection key={det.id} detachment={det} favoritesMap={favoritesMap} notesMap={notesMap} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* SCHEMA-04: Shared Faction Abilities */}
      {hasSharedAbilities && (
        <>
          <Separator />
          <Collapsible defaultOpen={true}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center justify-between w-full py-2 text-left">
                <span className="text-base font-semibold">Shared Faction Abilities</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" aria-hidden="true" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-2">
                {sharedAbilities.map((a) => (
                  <ExtendedAbilityEntry
                    key={a.id}
                    id={a.id}
                    name={a.name}
                    description={a.description}
                    favorite={favoritesMap.get(`${a.id}:shared_ability`) ?? null}
                    note={notesMap.get(`${a.id}:shared_ability`) ?? null}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </>
  );
}

function StratagemEntry({ stratagem, favorite, note }: { stratagem: RwStratagem; favorite: RulesFavorite | null; note: RulesNote | null }) {
  const upsertFavorite = useUpsertRulesFavorite();
  const deleteFavorite = useDeleteRulesFavorite();
  const isAnnotated = favorite !== null || note !== null;

  function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (favorite) {
      deleteFavorite.mutate({ ruleId: stratagem.id, ruleType: 'stratagem' });
    } else {
      upsertFavorite.mutate({ rule_id: stratagem.id, rule_type: 'stratagem', rule_name: stratagem.name, is_reminder: 0 });
    }
  }

  function handleToggleReminder(e: React.MouseEvent) {
    e.stopPropagation();
    upsertFavorite.mutate({ rule_id: stratagem.id, rule_type: 'stratagem', rule_name: stratagem.name, is_reminder: favorite?.is_reminder === 1 ? 0 : 1 });
  }

  return (
    <div className={cn("flex flex-col gap-1 pl-2 border-l", isAnnotated ? "border-l-2 border-l-primary bg-primary/5" : "border-border")}>
      <div className="flex items-center gap-2">
        <RuleAnnotationControls
          isFavorited={!!favorite}
          isReminder={favorite?.is_reminder === 1}
          hasNote={!!note}
          onToggleFavorite={handleToggleFavorite}
          onToggleReminder={handleToggleReminder}
        />
        <span className="text-sm font-semibold text-foreground">{stratagem.name}</span>
        {stratagem.cp_cost && (
          <span className="text-xs font-medium text-muted-foreground">{stratagem.cp_cost} CP</span>
        )}
        {stratagem.type && (
          <span className="text-xs text-muted-foreground">{stratagem.type}</span>
        )}
      </div>
      {stratagem.turn && (
        <span className="text-xs text-muted-foreground">{stratagem.turn}</span>
      )}
      {stratagem.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{stratagem.description}</p>
      )}
      <RuleNoteEditor ruleId={stratagem.id} ruleType="stratagem" ruleName={stratagem.name} note={note} />
    </div>
  );
}

// DetachmentAbilityRow — per-ability sub-component satisfying Rules of Hooks (no hooks-in-loop).
function DetachmentAbilityRow({ ability, favorite, note }: { ability: RwDetachmentAbility; favorite: RulesFavorite | null; note: RulesNote | null }) {
  const upsertFavorite = useUpsertRulesFavorite();
  const deleteFavorite = useDeleteRulesFavorite();
  const isAnnotated = favorite !== null || note !== null;

  function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (favorite) {
      deleteFavorite.mutate({ ruleId: ability.id, ruleType: 'detachment_ability' });
    } else {
      upsertFavorite.mutate({ rule_id: ability.id, rule_type: 'detachment_ability', rule_name: ability.name, is_reminder: 0 });
    }
  }

  function handleToggleReminder(e: React.MouseEvent) {
    e.stopPropagation();
    upsertFavorite.mutate({ rule_id: ability.id, rule_type: 'detachment_ability', rule_name: ability.name, is_reminder: favorite?.is_reminder === 1 ? 0 : 1 });
  }

  return (
    <div className={cn("flex flex-col gap-1 pl-2 border-l", isAnnotated ? "border-l-2 border-l-primary bg-primary/5" : "border-border")}>
      <div className="flex items-center gap-2">
        <RuleAnnotationControls
          isFavorited={!!favorite}
          isReminder={favorite?.is_reminder === 1}
          hasNote={!!note}
          onToggleFavorite={handleToggleFavorite}
          onToggleReminder={handleToggleReminder}
        />
        <span className="text-sm font-semibold text-foreground">{ability.name}</span>
      </div>
      {ability.description && <p className="text-sm text-muted-foreground leading-relaxed">{ability.description}</p>}
      <RuleNoteEditor ruleId={ability.id} ruleType="detachment_ability" ruleName={ability.name} note={note} />
    </div>
  );
}

// DetachmentSection — resolves hooks-in-loop by being a proper component that calls
// useDetachmentAbilitiesByDetachment unconditionally (no conditional hook call).
function DetachmentSection({ detachment, favoritesMap, notesMap }: { detachment: RwDetachment; favoritesMap: Map<string, RulesFavorite>; notesMap: Map<string, RulesNote> }) {
  const { data: abilities = [] } = useDetachmentAbilitiesByDetachment(detachment.id);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-foreground">{detachment.name}</span>
      {detachment.legend && (
        <p className="text-xs text-muted-foreground">{detachment.legend}</p>
      )}
      {detachment.type && (
        <span className="text-xs text-muted-foreground">Type: {detachment.type}</span>
      )}
      {abilities.length > 0 && (
        <div className="flex flex-col gap-1 pl-2">
          {abilities.map((a) => (
            <DetachmentAbilityRow
              key={a.id}
              ability={a}
              favorite={favoritesMap.get(`${a.id}:detachment_ability`) ?? null}
              note={notesMap.get(`${a.id}:detachment_ability`) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ExtendedAbilityEntry — structural-typed sub-component for shared faction abilities.
function ExtendedAbilityEntry({ id, name, description, favorite, note }: { id: string; name: string; description: string | null; favorite: RulesFavorite | null; note: RulesNote | null }) {
  const upsertFavorite = useUpsertRulesFavorite();
  const deleteFavorite = useDeleteRulesFavorite();
  const isAnnotated = favorite !== null || note !== null;

  function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (favorite) {
      deleteFavorite.mutate({ ruleId: id, ruleType: 'shared_ability' });
    } else {
      upsertFavorite.mutate({ rule_id: id, rule_type: 'shared_ability', rule_name: name, is_reminder: 0 });
    }
  }

  function handleToggleReminder(e: React.MouseEvent) {
    e.stopPropagation();
    upsertFavorite.mutate({ rule_id: id, rule_type: 'shared_ability', rule_name: name, is_reminder: favorite?.is_reminder === 1 ? 0 : 1 });
  }

  return (
    <div className={cn("flex flex-col gap-1 pl-2 border-l", isAnnotated ? "border-l-2 border-l-primary bg-primary/5" : "border-border")}>
      <div className="flex items-center gap-2">
        <RuleAnnotationControls
          isFavorited={!!favorite}
          isReminder={favorite?.is_reminder === 1}
          hasNote={!!note}
          onToggleFavorite={handleToggleFavorite}
          onToggleReminder={handleToggleReminder}
        />
        <span className="text-sm font-semibold text-foreground">{name}</span>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      )}
      <RuleNoteEditor ruleId={id} ruleType="shared_ability" ruleName={name} note={note} />
    </div>
  );
}
