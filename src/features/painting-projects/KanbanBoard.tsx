import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaintingStatus, Unit } from "@/types/unit";
import { PAINTING_STATUS_ORDER } from "@/types/unit";
import { useUnits, useUpdateUnit, UNITS_KEY } from "@/hooks/useUnits";
import { useFactions } from "@/hooks/useFactions";
import { useKanbanEnrichment } from "@/hooks/useKanbanEnrichment";
import { useWorkflowPositions } from "@/hooks/useWorkflowPositions";
import {
  applyActiveFilter,
  groupByStatus,
  sortKanbanCards,
  getVisibleColumns,
} from "./kanbanUtils";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { KanbanEmptyState } from "./KanbanEmptyState";

export interface KanbanBoardProps {
  onEditUnit: (unit: Unit) => void;
  onAddProject: () => void;
  onLogSession: (unitId: number) => void;
}

export function KanbanBoard({ onEditUnit, onAddProject, onLogSession }: KanbanBoardProps) {
  const navigate = useNavigate();
  const { data: units = [], isLoading } = useUnits();
  const { data: factions = [] } = useFactions();
  const qc = useQueryClient();
  const updateUnit = useUpdateUnit();
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null);

  const factionMap = useMemo(() => {
    const m = new Map<number, (typeof factions)[number]>();
    for (const f of factions) m.set(f.id, f);
    return m;
  }, [factions]);

  const activeUnitIds = useMemo(
    () => applyActiveFilter(units).map((u) => u.id),
    [units],
  );
  const { data: enrichment } = useKanbanEnrichment(activeUnitIds);
  const { data: workflowPositions } = useWorkflowPositions(activeUnitIds);

  const { grouped, visibleColumns } = useMemo(() => {
    const active = applyActiveFilter(units);
    const g = groupByStatus(active);
    // Sort each bucket
    for (const s of PAINTING_STATUS_ORDER) g[s] = sortKanbanCards(g[s]);
    return { grouped: g, visibleColumns: getVisibleColumns(g) };
  }, [units]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleRemoveFromBoard(unit: Unit) {
    const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
    qc.setQueryData<Unit[]>(UNITS_KEY, (old) =>
      old?.map((u) => (u.id === unit.id ? { ...u, is_active_project: 0 as const } : u)) ?? [],
    );
    updateUnit.mutate(
      { id: unit.id, is_active_project: 0 },
      {
        onError: () => {
          qc.setQueryData(UNITS_KEY, previous);
          toast.error("Failed to update project status. Changes were not saved.");
        },
      },
    );
  }

  function handlePaint(assignmentId: number) {
    navigate({
      to: "/painting-mode/$assignmentId",
      params: { assignmentId: String(assignmentId) },
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.startsWith("unit-")) {
      const unitId = Number(id.slice(5));
      setActiveUnit(units.find((u) => u.id === unitId) ?? null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveUnit(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("unit-")) return;
    const unitId = Number(activeId.slice(5));
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;

    let targetStatus: PaintingStatus | null = null;
    if (overId.startsWith("column-")) {
      targetStatus = overId.slice(7) as PaintingStatus;
    } else if (overId.startsWith("unit-")) {
      const overUnitId = Number(overId.slice(5));
      const overUnit = units.find((u) => u.id === overUnitId);
      targetStatus = overUnit?.status_painting ?? null;
    }
    if (!targetStatus || !(PAINTING_STATUS_ORDER as readonly string[]).includes(targetStatus) || targetStatus === unit.status_painting) return;

    // Optimistic update
    const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
    qc.setQueryData<Unit[]>(UNITS_KEY, (old) =>
      old?.map((u) => (u.id === unit.id ? { ...u, status_painting: targetStatus! } : u)) ?? [],
    );
    updateUnit.mutate(
      { id: unit.id, status_painting: targetStatus },
      {
        onError: () => {
          qc.setQueryData(UNITS_KEY, previous);
          toast.error("Status update failed. The card has been moved back.");
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex gap-8 px-6 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex w-[280px] flex-shrink-0 flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-[280px] rounded-lg" />
            <Skeleton className="h-24 w-[280px] rounded-lg" />
            <Skeleton className="h-24 w-[280px] rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const activeUnits = applyActiveFilter(units);
  if (activeUnits.length === 0) {
    return <KanbanEmptyState onAddProject={onAddProject} />;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-8 overflow-x-auto px-6 py-4">
        {visibleColumns.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            units={grouped[status]}
            factionMap={factionMap}
            onRemoveFromBoard={handleRemoveFromBoard}
            onEditUnit={onEditUnit}
            onLogSession={onLogSession}
            onPaint={handlePaint}
            enrichment={enrichment}
            workflowPositions={workflowPositions}
          />
        ))}
      </div>
      <DragOverlay>
        {activeUnit ? (
          <KanbanCard
            unit={activeUnit}
            faction={factionMap.get(activeUnit.faction_id)}
            onRemoveFromBoard={() => {}}
            onEditUnit={() => {}}
            onLogSession={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
