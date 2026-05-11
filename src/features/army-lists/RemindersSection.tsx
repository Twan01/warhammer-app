import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRulesFavorites } from "@/hooks/useRulesFavorites";

const RULE_TYPE_LABELS: Record<string, string> = {
  stratagem: "Stratagem",
  detachment_ability: "Detachment Ability",
  shared_ability: "Shared Ability",
};

export function RemindersSection() {
  const { data: favorites } = useRulesFavorites();
  const reminders = (favorites ?? []).filter((f) => f.is_reminder === 1);

  if (reminders.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 px-4">
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
  );
}
