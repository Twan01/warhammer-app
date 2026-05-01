import { GripVertical, Flag, Calendar } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import { KanbanCardActions } from "./KanbanCardActions";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(iso: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso) < today;
}

export interface KanbanCardProps {
  unit: Unit;
  faction: Faction | undefined;
  onRemoveFromBoard: (unit: Unit) => void;
  onEditUnit: (unit: Unit) => void;
}

export function KanbanCard({ unit, faction, onRemoveFromBoard, onEditUnit }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `unit-${unit.id}`,
    data: { type: "card", unit },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const overdue = unit.target_completion_date ? isOverdue(unit.target_completion_date) : false;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="w-full cursor-grab select-none rounded-lg bg-card p-3"
      aria-label={unit.name}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-sm font-semibold">{unit.name}</span>
        <KanbanCardActions
          onRemoveFromBoard={() => onRemoveFromBoard(unit)}
          onEditUnit={() => onEditUnit(unit)}
        />
      </div>
      {faction && (
        <div className="mt-2">
          <Badge
            style={{ backgroundColor: faction.color_theme }}
            className="border-transparent text-xs text-white"
          >
            {faction.name}
          </Badge>
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Progress value={unit.painting_percentage} className="h-1.5 flex-1" />
        <span className="text-xs text-muted-foreground">{unit.painting_percentage}%</span>
      </div>
      {(unit.priority !== null || unit.target_completion_date !== null) && (
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {unit.priority !== null && (
            <span className="inline-flex items-center gap-1">
              <Flag className="h-3 w-3" /> {unit.priority}
            </span>
          )}
          {unit.target_completion_date !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue && "text-destructive",
              )}
              aria-label={
                overdue ? `Target date overdue: ${unit.target_completion_date}` : undefined
              }
            >
              <Calendar className="h-3 w-3" /> {formatDate(unit.target_completion_date)}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
