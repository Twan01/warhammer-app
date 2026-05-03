import { useMemo } from "react";
import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaintingRing } from "@/components/common/PaintingRing";
import { CollectionEmptyState } from "./CollectionEmptyState";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

export interface UnitGalleryProps {
  data: Unit[];
  factions: Faction[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onRowClick: (unit: Unit) => void;
  onAdd: () => void;
  onClearFilters: () => void;
}

const GRID_CLASSES = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";
const CARD_CLASSES =
  "flex flex-col items-center px-4 pt-4 pb-4 gap-2 cursor-pointer hover:bg-muted/50";

export function UnitGallery({
  data,
  factions,
  isLoading,
  hasActiveFilters,
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
            className="flex flex-col items-center rounded-xl border bg-card px-4 pt-4 pb-4 gap-2"
          >
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-4 w-3/4 mt-2" />
            <Skeleton className="h-5 w-16 mt-1" />
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
            <PaintingRing percentage={unit.painting_percentage ?? 0} />
            <span className="text-sm font-semibold">{unit.name}</span>
            {faction && (
              <Badge
                style={{ backgroundColor: faction.color_theme }}
                className="border-transparent text-white"
                data-testid="faction-badge"
              >
                {faction.name}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {unit.status_painting}
            </span>
            <span className="text-sm text-muted-foreground">
              {unit.model_count ?? "—"} models · {unit.points ?? "—"} pts
            </span>
            {unit.is_active_project === 1 && (
              <Flame
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}
