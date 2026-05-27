import { Check, Hammer, Paintbrush, Palette, Droplets, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Unit, PaintingStatus } from "@/types/unit";
import { StatusBadge } from "@/components/ui/status-badge";

interface PaintingPipelineProps {
  unit: Unit;
}

interface PipelineStage {
  label: string;
  icon: React.ReactNode;
  done: boolean;
  active: boolean;
}

const STATUS_ORDER: PaintingStatus[] = [
  "Not Started", "Built", "Primed", "Basecoated", "Shaded",
  "Layered", "Highlighted", "Details Done", "Based", "Varnished", "Completed",
];

function getStatusIndex(status: PaintingStatus): number {
  return STATUS_ORDER.indexOf(status);
}

export function PaintingPipeline({ unit }: PaintingPipelineProps) {
  const statusIdx = getStatusIndex(unit.status_painting);

  const stages: PipelineStage[] = [
    {
      label: "Assembly",
      icon: <Hammer className="h-3.5 w-3.5" />,
      done: !!unit.status_assembly,
      active: !unit.status_assembly && statusIdx <= 1,
    },
    {
      label: "Painting",
      icon: <Paintbrush className="h-3.5 w-3.5" />,
      done: statusIdx >= 8,
      active: statusIdx >= 2 && statusIdx < 8,
    },
    {
      label: "Basing",
      icon: <Palette className="h-3.5 w-3.5" />,
      done: !!unit.status_basing,
      active: statusIdx === 8,
    },
    {
      label: "Varnished",
      icon: <Droplets className="h-3.5 w-3.5" />,
      done: !!unit.status_varnished,
      active: statusIdx === 9,
    },
    {
      label: "Complete",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      done: statusIdx === 10,
      active: false,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Painting Progress
        </span>
        <StatusBadge status={unit.status_painting} />
      </div>

      <div className="flex items-center gap-2">
        <Progress value={unit.painting_percentage} className="h-2 flex-1" />
        <span className="text-sm text-muted-foreground tabular-nums">{unit.painting_percentage}%</span>
      </div>

      <div className="flex items-center justify-between gap-1">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-1">
            {i > 0 && (
              <div className={cn(
                "h-px w-3 sm:w-5",
                stages[i - 1].done ? "bg-primary" : "bg-border",
              )} />
            )}
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors",
                stage.done && "bg-primary/10 text-primary",
                stage.active && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                !stage.done && !stage.active && "bg-muted text-muted-foreground",
              )}
            >
              {stage.done ? (
                <Check className="h-3 w-3" />
              ) : (
                stage.icon
              )}
              <span className="hidden sm:inline">{stage.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
