/**
 * PANEL-03 — Active Projects compact list panel (Phase 31, Plan 02).
 *
 * Shows up to 5 active painting projects as compact rows with:
 * - UnitThumbnail (44px, size="sm") on the left
 * - Unit name + painting percentage + relative last-updated date in the middle
 * - Open and Log ghost action buttons on the right
 *
 * Empty state: Target icon + guidance text when no active projects exist.
 *
 * Design decisions (CONTEXT.md):
 * - latestPhotos received as prop — hook called once in DashboardPage (Pitfall 2)
 * - No Sheet/Dialog inside this component — onOpen/onLog callbacks to DashboardPage (Pitfall 1)
 */
import { UnitThumbnail } from "@/components/common/UnitThumbnail";
import { Button } from "@/components/ui/button";
import { ExternalLink, Paintbrush, Target } from "lucide-react";
import { relativeDate } from "@/lib/dates";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

interface ActiveProjectsPanelProps {
  projects: Unit[];
  factions: Faction[];
  latestPhotos: Map<number, UnitPhotoWithUrl> | undefined;
  onOpen: (unitId: number) => void;
  onLog: (unitId: number) => void;
}

export function ActiveProjectsPanel({
  projects,
  factions,
  latestPhotos,
  onOpen,
  onLog,
}: ActiveProjectsPanelProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Active Projects
        </p>
        <div className="flex items-center gap-3 text-muted-foreground py-4">
          <Target size={16} className="shrink-0" aria-hidden="true" />
          <p className="text-sm">
            No active projects -- mark one in Projects to see it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Active Projects
      </p>
      <div className="flex flex-col gap-2">
        {projects.map((unit) => {
          const faction = factions.find((f) => f.id === unit.faction_id);
          const photo = latestPhotos?.get(unit.id);
          return (
            <div
              key={unit.id}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 hover:bg-accent/50 transition-colors"
            >
              <UnitThumbnail photo={photo} unit={unit} faction={faction} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{unit.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {unit.painting_percentage}% painted · {relativeDate(unit.updated_at)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => onOpen(unit.id)}>
                  <ExternalLink size={14} className="mr-1" aria-hidden />
                  Open
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onLog(unit.id)}>
                  <Paintbrush size={14} className="mr-1" aria-hidden />
                  Log
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
