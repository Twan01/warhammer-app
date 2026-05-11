import { Skeleton } from "@/components/ui/skeleton";
import {
  useDetachmentAbilitiesByDetachment,
  useStratagemsByDetachment,
} from "@/hooks/useRulesExtended";
import { StratagemCard } from "@/features/rules-hub/StratagemCard";

interface DetachmentRulesSectionProps {
  detachmentId: string | null | undefined;
}

export function DetachmentRulesSection({ detachmentId }: DetachmentRulesSectionProps) {
  const { data: abilities, isLoading: abilitiesLoading } =
    useDetachmentAbilitiesByDetachment(detachmentId ?? undefined);
  const { data: stratagems, isLoading: stratagemssLoading } =
    useStratagemsByDetachment(detachmentId ?? undefined);

  if (!detachmentId) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        Select a detachment to see its rules
      </p>
    );
  }

  const isLoading = abilitiesLoading || stratagemssLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 px-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const abilitiesList = abilities ?? [];
  const stratagemsList = stratagems ?? [];

  if (abilitiesList.length === 0 && stratagemsList.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        No rules data available — sync rules from the Rules Hub
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {abilitiesList.length > 0 && (
        <div className="flex flex-col gap-2 px-4">
          <span className="text-sm font-semibold">Detachment Ability</span>
          {abilitiesList.map((ability) => (
            <div key={ability.id} className="rounded-lg border bg-card p-4">
              <p className="font-medium text-sm">{ability.name}</p>
              {ability.description && (
                <p className="mt-1 text-sm text-muted-foreground">{ability.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {stratagemsList.length > 0 && (
        <div className="flex flex-col gap-2 px-4">
          <span className="text-sm font-semibold">Stratagems ({stratagemsList.length})</span>
          {stratagemsList.map((s) => (
            <StratagemCard key={s.id} stratagem={s} />
          ))}
        </div>
      )}
    </div>
  );
}
