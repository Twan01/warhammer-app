import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { CollectionEmptyState } from "./CollectionEmptyState";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

export interface UnitGalleryProps {
  data: Unit[];
  factions: Faction[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  latestPhotos?: Map<number, UnitPhotoWithUrl>;
  onRowClick: (unit: Unit) => void;
  onAdd: () => void;
  onClearFilters: () => void;
}

const GRID_CLASSES = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";
const CARD_CLASSES =
  "flex flex-col cursor-pointer bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-150 overflow-hidden rounded-lg";

function GalleryCardPhoto({
  unit,
  photo,
  factionColor,
}: {
  unit: Unit;
  photo: UnitPhotoWithUrl | undefined;
  factionColor: string | undefined;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (photo && !imgFailed) {
    return (
      <img
        src={photo.assetUrl}
        alt={`${unit.name} photo`}
        className="w-full aspect-square object-cover"
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="w-full aspect-square bg-panel-surface flex items-center justify-center"
      style={factionColor ? { borderTop: `4px solid ${factionColor}` } : undefined}
    >
      <span className="text-lg font-semibold text-muted-foreground" aria-hidden="true">
        {unit.name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

export function UnitGallery({
  data,
  factions,
  isLoading,
  hasActiveFilters,
  latestPhotos,
  onRowClick,
  onAdd,
  onClearFilters,
}: UnitGalleryProps) {
  const factionMap = useMemo(() => {
    const map = new Map<number, Faction>();
    for (const f of factions) map.set(f.id, f);
    return map;
  }, [factions]);

  // Locked decision (12-CONTEXT.md §Gallery Card Layout): fixed alphabetical sort by name
  const sorted = useMemo(
    () => [...data].sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  if (isLoading) {
    return (
      <div className={GRID_CLASSES}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`skeleton-${i}`}
            data-testid="gallery-skeleton-card"
            className="flex flex-col rounded-lg border bg-card overflow-hidden"
          >
            <Skeleton className="w-full aspect-square" />
            <div className="px-3 pb-3 pt-2 flex flex-col gap-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <CollectionEmptyState
        mode={hasActiveFilters ? "filtered" : "no-data"}
        onAdd={onAdd}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div className={GRID_CLASSES}>
      {sorted.map((unit) => {
        const faction = factionMap.get(unit.faction_id);
        return (
          <Card
            key={unit.id}
            role="button"
            tabIndex={0}
            aria-label={unit.name}
            onClick={() => onRowClick(unit)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRowClick(unit);
              }
            }}
            className={CARD_CLASSES}
          >
            <GalleryCardPhoto
              unit={unit}
              photo={latestPhotos?.get(unit.id)}
              factionColor={faction?.color_theme}
            />
            <div className="flex flex-col gap-1.5 px-3 pb-3 pt-2">
              {faction && (
                <Badge
                  style={{ backgroundColor: faction.color_theme }}
                  className="border-transparent text-white text-xs w-fit"
                  data-testid="faction-badge"
                >
                  {faction.name}
                </Badge>
              )}
              <span className="text-sm font-semibold truncate w-full">{unit.name}</span>
              <StatusBadge status={unit.status_painting} />
              <div className="w-full h-0.5 bg-border/40 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-faction-accent transition-all"
                  style={{ width: `${unit.painting_percentage ?? 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {unit.painting_percentage ?? 0}% · {unit.model_count ?? "—"} models · {unit.points ?? "—"} pts
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
