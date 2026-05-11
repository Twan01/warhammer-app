import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { RwStratagem } from "@/types/datasheet";
import type { RulesFavorite } from "@/types/rulesFavorite";
import type { RulesNote } from "@/types/rulesNote";
import { RuleAnnotationControls } from "./RuleAnnotationControls";
import { RuleNoteEditor } from "./RuleNoteEditor";
import { useUpsertRulesFavorite, useDeleteRulesFavorite } from "@/hooks/useRulesFavorites";

const PHASE_STYLES: Record<string, string> = {
  Command: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  Movement: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  Shooting: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  Charge: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  Fight: "bg-red-500/20 text-red-700 dark:text-red-300",
};

function getPhaseBadgeClass(phase: string | null): string {
  if (!phase) return "bg-muted text-muted-foreground";
  return PHASE_STYLES[phase] ?? "bg-muted text-muted-foreground";
}

function cpLabel(cost: string | null): string {
  if (!cost || cost === "0") return "Free";
  return `${cost} CP`;
}

interface StratagemCardProps {
  stratagem: RwStratagem;
  favorite: RulesFavorite | null;
  note: RulesNote | null;
}

export function StratagemCard({ stratagem, favorite, note }: StratagemCardProps) {
  const upsertFavorite = useUpsertRulesFavorite();
  const deleteFavorite = useDeleteRulesFavorite();

  const isAnnotated = favorite !== null || note !== null;

  function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (favorite) {
      deleteFavorite.mutate({ ruleId: stratagem.id, ruleType: 'stratagem' });
    } else {
      upsertFavorite.mutate({
        rule_id: stratagem.id,
        rule_type: 'stratagem',
        rule_name: stratagem.name,
        is_reminder: 0,
      });
    }
  }

  function handleToggleReminder(e: React.MouseEvent) {
    e.stopPropagation();
    upsertFavorite.mutate({
      rule_id: stratagem.id,
      rule_type: 'stratagem',
      rule_name: stratagem.name,
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
        <span className="flex-1 font-medium text-sm">{stratagem.name}</span>
        {stratagem.phase && (
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 border-transparent",
              getPhaseBadgeClass(stratagem.phase)
            )}
          >
            {stratagem.phase}
          </Badge>
        )}
        <Badge
          variant="outline"
          className="shrink-0 border-transparent bg-muted text-muted-foreground"
        >
          {cpLabel(stratagem.cp_cost)}
        </Badge>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 pt-1 text-sm text-muted-foreground space-y-2">
        {stratagem.legend && (
          <p className="italic text-xs">{stratagem.legend}</p>
        )}
        {stratagem.description && <p>{stratagem.description}</p>}
        {!stratagem.legend && !stratagem.description && (
          <p className="italic">No description available.</p>
        )}
        <RuleNoteEditor
          ruleId={stratagem.id}
          ruleType="stratagem"
          ruleName={stratagem.name}
          note={note}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
