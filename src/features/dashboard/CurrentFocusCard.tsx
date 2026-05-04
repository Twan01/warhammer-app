/**
 * DASH-03 — Primary visual anchor on the Dashboard.
 *
 * Shows the most recently active project (`activeProjects[0]` from computeStats,
 * which is already sorted by updated_at DESC). Displays unit name with the
 * faction's color_theme as a left-border accent (matches FactionSummaryCard
 * pattern), painting StatusBadge, painting_percentage progress bar, and the
 * `getNextActionHint` text for the current stage.
 *
 * Empty state: when `unit` is null (no active projects), renders a muted
 * placeholder directing the user to mark a project active.
 */
import { Card } from "@/components/ui/card";
import { Target } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { getNextActionHint } from "./getNextActionHint";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

export interface CurrentFocusCardProps {
  unit: Unit | null;
  faction: Faction | undefined;
}

export function CurrentFocusCard({ unit, faction }: CurrentFocusCardProps) {
  if (!unit) {
    return (
      <Card className="bg-card border border-border/60 shadow-sm px-6 py-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Target size={16} className="shrink-0" aria-hidden="true" />
          <p className="text-sm">
            No active project — mark one in Projects to focus on it here.
          </p>
        </div>
      </Card>
    );
  }

  const accent = faction?.color_theme ?? "transparent";
  const hint = getNextActionHint(unit.status_painting);

  return (
    <Card
      style={{ borderLeftColor: accent }}
      className="bg-card border border-border/60 border-l-4 shadow-sm px-6 py-6"
      aria-label={`Current focus: ${unit.name}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Current Focus
          </p>
          <h2 className="text-xl font-semibold tracking-tight">{unit.name}</h2>
          <div className="flex items-center gap-3">
            {faction && (
              <span className="text-sm text-muted-foreground">{faction.name}</span>
            )}
            <StatusBadge status={unit.status_painting} />
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end md:min-w-[220px]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="tabular-nums">{unit.painting_percentage}%</span>
            <span>painted</span>
          </div>
          <div className="h-1 w-full md:w-[220px] rounded-full bg-border/40">
            <div
              className="h-1 rounded-full bg-faction-accent transition-all duration-500"
              style={{ width: `${unit.painting_percentage}%` }}
            />
          </div>
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">Next: </span>
            {hint}
          </p>
        </div>
      </div>
    </Card>
  );
}
