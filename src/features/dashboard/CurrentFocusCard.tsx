/**
 * DASH-03 v2 — Primary visual anchor on the Dashboard (Phase 31 upgrade).
 *
 * PANEL-01: Displays left-side 80px photo thumbnail (or faction-colored Swords
 * icon fallback), unit name, faction name, model count, points, and painting
 * percentage progress bar.
 *
 * PANEL-02: Ghost action buttons — Open (opens UnitDetailSheet) and Log (opens
 * LogSessionSheet with unit pre-selected). Both callbacks are owned by
 * DashboardPage to maintain sibling portal contract.
 *
 * Empty state: when `unit` is null (no active projects), renders a muted
 * placeholder directing the user to mark a project active. No changes.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, ExternalLink, Paintbrush, Palette } from "lucide-react";
import { UnitThumbnail } from "@/components/common/UnitThumbnail";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

export interface CurrentFocusCardProps {
  unit: Unit | null;
  faction: Faction | undefined;
  photo: UnitPhotoWithUrl | undefined;
  onOpen: () => void;
  onLog: () => void;
  recipeName?: string | null;
  extraRecipeCount?: number;
}

export function CurrentFocusCard({ unit, faction, photo, onOpen, onLog, recipeName, extraRecipeCount = 0 }: CurrentFocusCardProps) {
  if (!unit) {
    return (
      <Card className="bg-card border border-border/60 shadow-sm px-6 py-6 transition-shadow duration-150 hover:shadow-md">
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

  return (
    <Card
      style={{ borderLeftColor: accent }}
      className="bg-card border border-border/60 border-l-4 shadow-sm px-6 py-5 transition-shadow duration-150 hover:shadow-md"
      aria-label={`Current focus: ${unit.name}`}
    >
      <div className="flex items-start gap-4">
        <UnitThumbnail size="md" photo={photo} unit={unit} faction={faction} />

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Current Focus
          </p>
          <h2 className="text-lg font-semibold tracking-tight truncate">{unit.name}</h2>
          {faction && (
            <div className="text-sm text-muted-foreground">{faction.name}</div>
          )}
          {recipeName && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Palette size={12} aria-hidden />
              {recipeName}{extraRecipeCount > 0 ? ` (+${extraRecipeCount} more)` : ""}
            </span>
          )}
          <div className="text-sm text-muted-foreground tabular-nums">
            {unit.model_count ?? "---"} models · {unit.points ?? "---"} pts
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground tabular-nums">
              {unit.painting_percentage}% painted
            </span>
            <div className="h-1 flex-1 rounded-full bg-border/40">
              <div
                className="h-1 rounded-full bg-faction-accent transition-all duration-500"
                style={{ width: `${unit.painting_percentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" onClick={onOpen}>
            <ExternalLink size={14} className="mr-1.5" aria-hidden={true} />
            Open
          </Button>
          <Button variant="ghost" size="sm" onClick={onLog}>
            <Paintbrush size={14} className="mr-1.5" aria-hidden={true} />
            Log
          </Button>
        </div>
      </div>
    </Card>
  );
}
