import { Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  DndContext,
  closestCenter,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ArmyListUnitRow } from "./ArmyListUnitRow";
import type { ArmyListUnitRow as ArmyListUnitRowType, ArmyListEnhancement } from "@/types/armyList";
import type { SyncedLeaderTargetRow } from "@/db/queries/bsdataExtended";

// ---------------------------------------------------------------------------
// Sortable row wrapper for dnd-kit
// ---------------------------------------------------------------------------

function SortableUnitRow({
  unit, onRemove, onConfigure, onEnhance, onAttachLeader, onToggleWarlord,
  enhancementName, isIndentedLeader, leaderName, leaderTargets,
}: {
  unit: ArmyListUnitRowType;
  onRemove: () => void;
  onConfigure: () => void;
  onEnhance: () => void;
  onAttachLeader: () => void;
  onToggleWarlord: () => void;
  enhancementName?: string;
  isIndentedLeader: boolean;
  leaderName?: string;
  leaderTargets: SyncedLeaderTargetRow[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: unit.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr ref={setNodeRef} style={style}>
      <td colSpan={5} className="p-0">
        <table className="w-full"><tbody>
          <ArmyListUnitRow
            unit={unit}
            onRemove={onRemove}
            onConfigure={onConfigure}
            onEnhance={onEnhance}
            onAttachLeader={onAttachLeader}
            onToggleWarlord={onToggleWarlord}
            enhancementName={enhancementName}
            isIndentedLeader={isIndentedLeader}
            leaderName={leaderName}
            leaderTargets={leaderTargets}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        </tbody></table>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// ArmyListUnitTable
// ---------------------------------------------------------------------------

interface ArmyListUnitTableProps {
  unitsByCategory: Array<[string, Array<{ unit: ArmyListUnitRowType; isIndentedLeader: boolean }>]>;
  collapsedCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
  leaderNameMap: Map<number, string>;
  leaderTargets: SyncedLeaderTargetRow[];
  listEnhancements: ArmyListEnhancement[];
  listId: number;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  onRemove: (armyListUnitId: number) => void;
  onConfigure: (armyListUnitId: number) => void;
  onEnhance: (armyListUnitId: number) => void;
  onAttachLeader: (armyListUnitId: number) => void;
  onToggleWarlord: (armyListUnitId: number) => void;
}

export function ArmyListUnitTable({
  unitsByCategory,
  collapsedCategories,
  onToggleCategory,
  leaderNameMap,
  leaderTargets,
  listEnhancements,
  sensors,
  onDragEnd,
  onRemove,
  onConfigure,
  onEnhance,
  onAttachLeader,
  onToggleWarlord,
}: ArmyListUnitTableProps) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unit Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Remove</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {unitsByCategory.map(([category, catUnits]) => {
            const catTotal = catUnits.reduce((s, e) => s + e.unit.effective_points, 0);
            const ownedCount = catUnits.filter((e) => e.unit.unit_id !== null).length;
            const readyCount = catUnits.filter((e) => e.unit.status_painting === "Completed").length;
            const readyPct = catUnits.length > 0 ? Math.round((readyCount / catUnits.length) * 100) : 0;
            const isCollapsed = collapsedCategories.has(category);
            return (
              <Fragment key={category}>
                <TableRow
                  className="bg-muted/40 hover:bg-muted/50 cursor-pointer"
                  onClick={() => onToggleCategory(category)}
                >
                  <TableCell colSpan={2} className="py-2">
                    <div className="flex items-center gap-2">
                      {isCollapsed
                        ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({catUnits.length})
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {ownedCount} owned · {readyCount} ready
                      </span>
                    </div>
                    {!isCollapsed && (
                      <div className="mt-1 w-32">
                        <Progress value={readyPct} className="h-1" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {catTotal}pts
                    </span>
                  </TableCell>
                  <TableCell colSpan={2} className="py-2" />
                </TableRow>
                {!isCollapsed && (
                  <SortableContext items={catUnits.map((e) => e.unit.id)} strategy={verticalListSortingStrategy}>
                    {catUnits.map(({ unit: alu, isIndentedLeader }) => (
                      <SortableUnitRow
                        key={alu.id}
                        unit={alu}
                        onRemove={() => onRemove(alu.id)}
                        onConfigure={() => onConfigure(alu.id)}
                        onEnhance={() => onEnhance(alu.id)}
                        onAttachLeader={() => onAttachLeader(alu.id)}
                        onToggleWarlord={() => onToggleWarlord(alu.id)}
                        enhancementName={listEnhancements.find((le) => le.army_list_unit_id === alu.id)?.enhancement_name}
                        isIndentedLeader={isIndentedLeader}
                        leaderName={leaderNameMap.get(alu.id)}
                        leaderTargets={leaderTargets}
                      />
                    ))}
                  </SortableContext>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </DndContext>
  );
}
