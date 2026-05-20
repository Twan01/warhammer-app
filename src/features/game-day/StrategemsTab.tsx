import { useMemo } from "react";
import { Star, ChevronDown, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { useStratagemsByDetachment } from "@/hooks/useRulesExtended";
import { useRulesFavorites } from "@/hooks/useRulesFavorites";
import { useForgottenRules } from "@/hooks/useBattleLogs";
import { useGameDayStore } from "./gameDayStore";
import { GameDayStratagemCard } from "./GameDayStratagemCard";
import type { RwStratagem } from "@/types/datasheet";

const PHASE_ORDER = ["Command", "Movement", "Shooting", "Charge", "Fight"] as const;

const PHASE_STYLES: Record<string, string> = {
  Command: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  Movement: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  Shooting: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  Charge: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  Fight: "bg-red-500/20 text-red-700 dark:text-red-300",
};

const RULE_TYPE_LABELS: Record<string, string> = {
  stratagem: "Stratagem",
  detachment_ability: "Detachment Ability",
  shared_ability: "Shared Ability",
};

interface StrategemsTabProps {
  detachmentId: string | null;
  listId: number;
}

export function StrategemsTab({ detachmentId, listId }: StrategemsTabProps) {
  const { data: stratagems, isLoading } = useStratagemsByDetachment(
    detachmentId ?? undefined,
  );
  const { data: favorites } = useRulesFavorites();
  const { data: forgottenRules } = useForgottenRules(listId);
  const spendCp = useGameDayStore((s) => s.spendCp);

  const reminders = useMemo(
    () => (favorites ?? []).filter((f) => f.is_reminder === 1),
    [favorites],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, RwStratagem[]>();
    for (const phase of PHASE_ORDER) map.set(phase, []);
    map.set("Other", []);
    for (const s of stratagems ?? []) {
      const key =
        s.phase && PHASE_ORDER.includes(s.phase as (typeof PHASE_ORDER)[number])
          ? s.phase
          : "Other";
      map.get(key)!.push(s);
    }
    return map;
  }, [stratagems]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!detachmentId) {
    return (
      <p className="text-center py-8 text-sm text-muted-foreground">
        No detachment selected — select one in your army list to see stratagems.
      </p>
    );
  }

  if ((stratagems ?? []).length === 0) {
    return (
      <p className="text-center py-8 text-sm text-muted-foreground">
        No stratagems found for this detachment.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Reminders pinned at top */}
      {reminders.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">Reminders</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {reminders.map((r) => (
              <div
                key={`${r.rule_id}-${r.rule_type}`}
                className="flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <span className="flex-1 text-sm">{r.rule_name}</span>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {RULE_TYPE_LABELS[r.rule_type] ?? r.rule_type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forgotten rules from recent games */}
      {(forgottenRules ?? []).length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">Rules You Forgot Recently</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {(forgottenRules ?? []).map((rule, i) => (
              <div
                key={`forgotten-${i}`}
                className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2"
              >
                <span className="flex-1 text-sm">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase-grouped stratagems */}
      {[...PHASE_ORDER, "Other" as const].map((phase) => {
        const items = grouped.get(phase) ?? [];
        if (items.length === 0) return null;
        return (
          <Collapsible key={phase} defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border bg-card px-4 py-3 text-left [&[data-state=open]>svg:last-child]:rotate-180">
              <span className="flex-1 font-medium text-sm">{phase}</span>
              <Badge
                variant="outline"
                className={`shrink-0 border-transparent ${PHASE_STYLES[phase] ?? "bg-muted text-muted-foreground"}`}
              >
                {items.length}
              </Badge>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 flex flex-col gap-2">
              {items.map((s) => (
                <GameDayStratagemCard
                  key={s.id}
                  stratagem={s}
                  onSpendCp={(cost) => spendCp(listId, cost)}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

