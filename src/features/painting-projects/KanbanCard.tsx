import { GripVertical, Flag, Calendar, Camera, Paintbrush } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { WorkflowPosition } from "@/lib/computeWorkflowPosition";
import type { AppliedRecipeProgress } from "@/types/recipeAssignment";
import { KanbanCardActions } from "./KanbanCardActions";
import { formatRelativeTime } from "@/features/dashboard/relativeTime";
import { getNextActionHint } from "@/features/dashboard/getNextActionHint";

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
  onLogSession: (unitId: number) => void;
  recipeName?: string;
  photoCount?: number;
  workflowPosition?: WorkflowPosition | null;
  appliedProgress?: AppliedRecipeProgress | null;
}

export function KanbanCard({
  unit,
  faction,
  onRemoveFromBoard,
  onEditUnit,
  onLogSession,
  recipeName,
  photoCount,
  workflowPosition,
  appliedProgress,
}: KanbanCardProps) {
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
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onLogSession(unit.id); }}
          aria-label={`Log session for ${unit.name}`}
          title="Log Session"
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Paintbrush size={14} />
        </button>
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
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span>{formatRelativeTime(unit.updated_at)}</span>
        {recipeName && (
          <span className="truncate max-w-[10rem]" title={recipeName}>
            Recipe: {recipeName.length > 20 ? recipeName.slice(0, 20) + "…" : recipeName}
          </span>
        )}
        {(photoCount ?? 0) > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <Camera className="h-3 w-3" aria-hidden="true" />
            <span aria-label={`${photoCount} photos`}>{photoCount}</span>
          </span>
        )}
      </div>
      {appliedProgress ? (
        <p className="mt-1 truncate text-xs text-muted-foreground/70">
          {appliedProgress.recipeName}: {appliedProgress.completed}/{appliedProgress.total} steps
          {appliedProgress.assignmentCount > 1 ? ` (+${appliedProgress.assignmentCount - 1} more)` : ""}
        </p>
      ) : workflowPosition ? (
        <p className="mt-1 truncate text-xs italic text-muted-foreground/70">
          {"→"}{" "}
          {workflowPosition.isComplete
            ? "Complete"
            : workflowPosition.sectionName
              ? workflowPosition.nextStepName
                ? `${workflowPosition.sectionName}: ${workflowPosition.nextStepName}`
                : workflowPosition.sectionName
              : workflowPosition.stepIndex !== null
                ? `step ${workflowPosition.stepIndex + 1}/${workflowPosition.totalSteps}`
                : ""}
        </p>
      ) : unit.status_painting !== "Completed" ? (
        <p className="mt-1 text-xs italic text-muted-foreground/70">
          {"→"} {getNextActionHint(unit.status_painting)}
        </p>
      ) : null}
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
