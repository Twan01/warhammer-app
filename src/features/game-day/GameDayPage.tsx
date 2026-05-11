import { useMemo } from "react";
import { Swords, Users, ClipboardList } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArmyList, useArmyListWithUnits } from "@/hooks/useArmyLists";
import { useFactions } from "@/hooks/useFactions";
import { GameDayHeader } from "./GameDayHeader";
import { StrategemsTab } from "./StrategemsTab";

interface GameDayPageProps {
  listId: number;
}

export function GameDayPage({ listId }: GameDayPageProps) {
  const navigate = useNavigate();
  const { data: list, isLoading: listLoading } = useArmyList(listId);
  const { data: _units } = useArmyListWithUnits(listId);
  const { data: factions } = useFactions();

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
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Units tab coming soon
          </div>
        </TabsContent>

        <TabsContent value="checklist" className="mt-3">
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Checklist tab coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
