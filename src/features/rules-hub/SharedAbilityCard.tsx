import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { RwAbility } from "@/types/datasheet";
import type { RulesFavorite } from "@/types/rulesFavorite";
import type { RulesNote } from "@/types/rulesNote";
import { RuleAnnotationControls } from "./RuleAnnotationControls";
import { RuleNoteEditor } from "./RuleNoteEditor";
import { useUpsertRulesFavorite, useDeleteRulesFavorite } from "@/hooks/useRulesFavorites";

interface SharedAbilityCardProps {
  ability: RwAbility;
  favorite: RulesFavorite | null;
  note: RulesNote | null;
}

export function SharedAbilityCard({ ability, favorite, note }: SharedAbilityCardProps) {
  const upsertFavorite = useUpsertRulesFavorite();
  const deleteFavorite = useDeleteRulesFavorite();

  const isAnnotated = favorite !== null || note !== null;

  function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (favorite) {
      deleteFavorite.mutate({ ruleId: ability.id, ruleType: 'shared_ability' });
    } else {
      upsertFavorite.mutate({
        rule_id: ability.id,
        rule_type: 'shared_ability',
        rule_name: ability.name,
        is_reminder: 0,
      });
    }
  }

  function handleToggleReminder(e: React.MouseEvent) {
    e.stopPropagation();
    upsertFavorite.mutate({
      rule_id: ability.id,
      rule_type: 'shared_ability',
      rule_name: ability.name,
      is_reminder: favorite?.is_reminder === 1 ? 0 : 1,
    });
  }

  return (
    <Collapsible
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        isAnnotated && "border-l-2 border-l-primary bg-primary/5"
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left [&[data-state=open]>svg:last-child]:rotate-180">
        <RuleAnnotationControls
          isFavorited={!!favorite}
          isReminder={favorite?.is_reminder === 1}
          hasNote={!!note}
          onToggleFavorite={handleToggleFavorite}
          onToggleReminder={handleToggleReminder}
        />
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
        <RuleNoteEditor
          ruleId={ability.id}
          ruleType="shared_ability"
          ruleName={ability.name}
          note={note}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
