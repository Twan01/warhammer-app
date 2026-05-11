import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useDetachmentAbilitiesByDetachment } from "@/hooks/useRulesExtended";
import { useUpsertRulesFavorite, useDeleteRulesFavorite } from "@/hooks/useRulesFavorites";
import type { RwDetachment, RwDetachmentAbility } from "@/types/datasheet";
import type { RulesFavorite } from "@/types/rulesFavorite";
import type { RulesNote } from "@/types/rulesNote";
import { RuleAnnotationControls } from "./RuleAnnotationControls";
import { RuleNoteEditor } from "./RuleNoteEditor";

interface DetachmentAbilityRowProps {
  ability: RwDetachmentAbility;
  favorite: RulesFavorite | null;
  note: RulesNote | null;
}

function DetachmentAbilityRow({ ability, favorite, note }: DetachmentAbilityRowProps) {
  const upsertFavorite = useUpsertRulesFavorite();
  const deleteFavorite = useDeleteRulesFavorite();

  function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (favorite) {
      deleteFavorite.mutate({ ruleId: ability.id, ruleType: 'detachment_ability' });
    } else {
      upsertFavorite.mutate({
        rule_id: ability.id,
        rule_type: 'detachment_ability',
        rule_name: ability.name,
        is_reminder: 0,
      });
    }
  }

  function handleToggleReminder(e: React.MouseEvent) {
    e.stopPropagation();
    upsertFavorite.mutate({
      rule_id: ability.id,
      rule_type: 'detachment_ability',
      rule_name: ability.name,
      is_reminder: favorite?.is_reminder === 1 ? 0 : 1,
    });
  }

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1">
        <RuleAnnotationControls
          isFavorited={!!favorite}
          isReminder={favorite?.is_reminder === 1}
          hasNote={!!note}
          onToggleFavorite={handleToggleFavorite}
          onToggleReminder={handleToggleReminder}
        />
        <p className="font-semibold">{ability.name}</p>
      </div>
      {ability.description && (
        <p className="text-muted-foreground mt-0.5">{ability.description}</p>
      )}
      {!ability.description && ability.legend && (
        <p className="text-muted-foreground italic mt-0.5">{ability.legend}</p>
      )}
      <RuleNoteEditor
        ruleId={ability.id}
        ruleType="detachment_ability"
        ruleName={ability.name}
        note={note}
      />
    </div>
  );
}

interface DetachmentCardProps {
  detachment: RwDetachment;
  favoritesMap: Map<string, RulesFavorite>;
  notesMap: Map<string, RulesNote>;
}

export function DetachmentCard({ detachment, favoritesMap, notesMap }: DetachmentCardProps) {
  // Called unconditionally at component top level — each card is its own component instance
  const { data: abilities = [], isLoading } = useDetachmentAbilitiesByDetachment(detachment.id);

  const hasAnyAnnotation = abilities.some(
    (a) =>
      favoritesMap.has(a.id + ':detachment_ability') ||
      notesMap.has(a.id + ':detachment_ability')
  );

  return (
    <Collapsible
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        hasAnyAnnotation && "border-l-2 border-l-primary bg-primary/5"
      )}
    >
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
              <DetachmentAbilityRow
                key={ability.id}
                ability={ability}
                favorite={favoritesMap.get(ability.id + ':detachment_ability') ?? null}
                note={notesMap.get(ability.id + ':detachment_ability') ?? null}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
