import { useEffect, useMemo, useState } from "react";
import { Swords, Users, ClipboardList, AlertCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArmyList, useArmyListWithUnits } from "@/hooks/useArmyLists";
import { useFactions } from "@/hooks/useFactions";
import { GameDayHeader } from "./GameDayHeader";
import { GameDayReadinessPanel } from "./GameDayReadinessPanel";
import { StrategemsTab } from "./StrategemsTab";
import { UnitsTab } from "./UnitsTab";
import { ChecklistTab } from "./ChecklistTab";
import { useGameDayStore, getDefaultChecklist } from "./gameDayStore";
import { BattleLogSheet } from "@/features/battle-log/BattleLogSheet";
import { todayISO } from "@/lib/dates";

interface GameDayPageProps {
  listId: number;
}

export function GameDayPage({ listId }: GameDayPageProps) {
  const navigate = useNavigate();
  const [endGameOpen, setEndGameOpen] = useState(false);
  const { data: list, isLoading: listLoading, isError: listError, refetch: refetchList } = useArmyList(listId);
  const { data: units } = useArmyListWithUnits(listId);
  const { data: factions } = useFactions();
  useEffect(() => {
    const existing = useGameDayStore.getState().listStates[String(listId)];
    if (existing) return;
    let cancelled = false;
    getDefaultChecklist()
      .then((items) => {
        if (!cancelled) {
          useGameDayStore.getState().setDefaultChecklist(listId, items);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [listId]);

  const battlePrefill = useMemo(
    () => ({ army_list_id: listId, battle_date: todayISO() }),
    [listId],
  );

  const faction = useMemo(
    () =>
      list?.faction_id
        ? (factions ?? []).find((f) => f.id === list.faction_id) ?? null
        : null,
    [factions, list?.faction_id],
  );

  if (listLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (listError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">Failed to load game day data</h2>
          <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
        </div>
        <Button variant="outline" onClick={() => refetchList()}>Try Again</Button>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Army list not found.</p>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/army-lists" })}
        >
          Back to Army Lists
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <GameDayHeader
        listName={list.name}
        factionName={faction?.name ?? null}
        detachmentName={list.detachment_name}
        listId={listId}
        onEndGame={() => setEndGameOpen(true)}
      />

      <GameDayReadinessPanel
        units={units ?? []}
        pointsLimit={list.points_limit}
      />

      <Tabs defaultValue="stratagems" className="flex-1 px-4 py-3">
        <TabsList className="w-full">
          <TabsTrigger value="stratagems">
            <Swords className="h-4 w-4" />
            Stratagems
          </TabsTrigger>
          <TabsTrigger value="units">
            <Users className="h-4 w-4" />
            Units
          </TabsTrigger>
          <TabsTrigger value="checklist">
            <ClipboardList className="h-4 w-4" />
            Checklist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stratagems" className="mt-3">
          <StrategemsTab
            detachmentId={list.detachment_id}
            listId={listId}
          />
        </TabsContent>

        <TabsContent value="units" className="mt-3">
          <UnitsTab units={units ?? []} listId={listId} />
        </TabsContent>

        <TabsContent value="checklist" className="mt-3">
          <ChecklistTab listId={listId} />
        </TabsContent>
      </Tabs>

      <BattleLogSheet
        open={endGameOpen}
        log={null}
        prefill={battlePrefill}
        onClose={() => setEndGameOpen(false)}
      />
    </div>
  );
}
