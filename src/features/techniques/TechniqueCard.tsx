import { Copy, Layers, ListChecks, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TechniqueWithCounts } from "@/types/technique";

const difficultyColors: Record<string, string> = {
  Beginner: "text-green-500",
  Intermediate: "text-yellow-500",
  Advanced: "text-orange-500",
  Expert: "text-red-500",
};

export interface TechniqueCardProps {
  technique: TechniqueWithCounts;
  onClick: (technique: TechniqueWithCounts) => void;
  onEdit: (technique: TechniqueWithCounts) => void;
  onDelete: (technique: TechniqueWithCounts) => void;
  onDuplicate: (technique: TechniqueWithCounts) => void;
}

export function TechniqueCard({
  technique,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
}: TechniqueCardProps) {
  const { slot_count, step_count, usage_count } = technique;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow gap-3"
      onClick={() => onClick(technique)}
      aria-label={`View ${technique.name}`}
    >
      <CardHeader className="pb-0">
        <span className="text-sm font-semibold leading-tight">{technique.name}</span>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 pt-0">
        {/* Effect + difficulty badge row */}
        <div className="flex flex-wrap items-center gap-1">
          {technique.effect && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {technique.effect}
            </Badge>
          )}
          {technique.difficulty && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 border-transparent ${difficultyColors[technique.difficulty] ?? ""}`}
            >
              {technique.difficulty}
            </Badge>
          )}
        </div>

        {/* Slot count + step count rows */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {slot_count} {slot_count === 1 ? "slot" : "slots"}
          </span>
          <span className="flex items-center gap-1">
            <ListChecks className="h-3 w-3" />
            {step_count} {step_count === 1 ? "step" : "steps"}
          </span>
        </div>

        {/* Usage count line — always shown */}
        <span className="text-xs text-muted-foreground">
          {usage_count === 0
            ? "Not used yet"
            : `Used by ${usage_count} recipe${usage_count === 1 ? "" : "s"}`}
        </span>

        {/* Action row */}
        <div
          className="flex items-center gap-1 pt-1 border-t border-border/50"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(technique)}
            aria-label="Edit technique"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDuplicate(technique)}
            aria-label="Duplicate technique"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDelete(technique)}
            aria-label="Delete technique"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
