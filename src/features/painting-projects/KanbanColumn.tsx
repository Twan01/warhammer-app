import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PaintingStatus, Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { KanbanEnrichment } from "@/hooks/useKanbanEnrichment";
import { KanbanCard } from "./KanbanCard";

export interface KanbanColumnProps {
  status: PaintingStatus;
  units: Unit[];
  factionMap: Map<number, Faction>;
  onRemoveFromBoard: (unit: Unit) => void;
  onEditUnit: (unit: Unit) => void;
  onLogSession: (unitId: number) => void;
  enrichment?: KanbanEnrichment;
}

export function KanbanColumn({
  status,
  units,
  factionMap,
  onRemoveFromBoard,
  onEditUnit,
  onLogSession,
  enrichment,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });
  const itemIds = units.map((u) => `unit-${u.id}`);

  return (
    <div className="flex w-[280px] flex-shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {status}
        </h2>
        <Badge variant="secondary">{units.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[60px] flex-col gap-2 overflow-y-auto rounded-md p-1",
          isOver && "bg-accent/30",
        )}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {units.map((u) => (
            <KanbanCard
              key={u.id}
              unit={u}
              faction={factionMap.get(u.faction_id)}
              onRemoveFromBoard={onRemoveFromBoard}
              onEditUnit={onEditUnit}
              onLogSession={onLogSession}
              recipeName={enrichment?.recipeNames.get(u.id)}
              photoCount={enrichment?.photoCounts.get(u.id)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
