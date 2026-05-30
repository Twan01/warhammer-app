import { Badge } from "@/components/ui/badge";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";

interface UdbUnitRowProps {
  unit: UdbUnitSummary;
  onOpen: (id: string) => void;
}

export function UdbUnitRow({ unit, onOpen }: UdbUnitRowProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 h-10 hover:bg-secondary cursor-pointer transition-colors"
      onClick={() => onOpen(unit.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(unit.id);
        }
      }}
    >
      <span className="text-sm font-medium flex-1 truncate">{unit.name}</span>
      {unit.role && (
        <Badge variant="secondary" className="text-xs shrink-0">
          {unit.role}
        </Badge>
      )}
      <span className="text-xs text-muted-foreground tabular-nums w-20 text-right shrink-0">
        {unit.base_points !== null ? `from ${unit.base_points} pts` : "—"}
      </span>
    </div>
  );
}
