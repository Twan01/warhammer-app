import { Shield, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useArmyLists, useArmyListWithUnits } from "@/hooks/useArmyLists";
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";

export function ReadyToPlayCard() {
  const { data: lists, isLoading: listsLoading } = useArmyLists();

  const sortedList = lists
    ?.slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null;

  if (listsLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!sortedList) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Shield size={20} className="opacity-40" />
          <span className="text-sm font-semibold">No army lists yet</span>
          <span className="text-xs">Create an army list to track battle readiness.</span>
        </div>
      </div>
    );
  }

  return <ReadyToPlayCardInner listId={sortedList.id} listName={sortedList.name} />;
}

function ReadyToPlayCardInner({ listId, listName }: { listId: number; listName: string }) {
  const { data: units } = useArmyListWithUnits(listId);
  const { data: syncMeta } = useRulesSyncMeta();

  const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
  const syncLabel = getSyncAgeLabel(syncMeta?.last_sync_at ?? null);

  const totalPoints = units?.reduce((sum, u) => sum + u.effective_points, 0) ?? 0;
  const unpaintedCount = units?.filter((u) => u.status_painting !== "Completed").length ?? 0;
  const totalCount = units?.length ?? 0;
  const battleReadyPct = totalCount > 0
    ? Math.round(((totalCount - unpaintedCount) / totalCount) * 100)
    : 0;
  const allReady = battleReadyPct === 100 && unpaintedCount === 0;

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
      <div className="flex flex-col gap-2">
        <span className={`text-sm font-semibold ${allReady ? "text-battle-gold" : ""}`}>
          {listName}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {totalPoints} pts
        </span>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield size={12} />
            <span>{unpaintedCount} unpainted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${FRESHNESS_DOT_CLASS[freshness]}`} />
            <Clock size={12} />
            <span>{syncLabel}</span>
          </div>
        </div>

        {(unpaintedCount > 0 || freshness === "stale" || freshness === "aging") && (
          <span className="inline-flex w-fit items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-600 dark:text-amber-400">
            {unpaintedCount > 0 ? `${unpaintedCount} unpainted` : "Sync stale"}
          </span>
        )}
      </div>
    </div>
  );
}
