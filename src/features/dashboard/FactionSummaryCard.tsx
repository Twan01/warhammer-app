/**
 * DASH-02 — One per faction, in a wrapping flex row.
 *
 * Click-through pattern: useCollectionFilters.setState replaces the factions slice
 * and clears other filters so Collection shows exactly that faction's units.
 *
 * Left border accent (POLISH-05 / DASH-02): border-l-4 + inline borderLeftColor.
 * Active state (THEME-03): ring-2 ring-faction-accent + Active badge when isActive=true.
 * Toggle: clicking active card deselects only (no navigate); clicking inactive activates + navigates.
 *
 * isActive and onActivate are optional with defaults so DashboardPage compiles
 * before Plan 10-03 wires them.
 */
import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useCollectionFilters } from "@/features/units/collectionFilters";
import type { FactionStat } from "./computeStats";

export interface FactionSummaryCardProps {
  stat: FactionStat;
  isActive?: boolean;
  onActivate?: () => void;
}

export function FactionSummaryCard({
  stat,
  isActive = false,
  onActivate = () => {},
}: FactionSummaryCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (isActive) {
      onActivate();
      return;
    }
    onActivate();
    useCollectionFilters.setState({
      factions: [stat.faction.id],
      search: "",
      statuses: [],
      categories: [],
      activeOnly: false,
    });
    navigate({ to: "/collection" });
  };

  return (
    <Card
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{ borderLeftColor: stat.faction.color_theme }}
      className={`min-w-[180px] cursor-pointer border-l-4 px-4 py-4 hover:bg-muted/50${isActive ? " ring-2 ring-faction-accent" : ""}`}
    >
      <div className="flex flex-col gap-2">
        {isActive && (
          <span className="self-start rounded-sm bg-faction-accent px-1.5 py-0.5 text-xs font-medium text-white">
            Active
          </span>
        )}
        <span className="text-sm font-semibold">{stat.faction.name}</span>
        <span className="text-sm text-muted-foreground">{stat.modelCount} models</span>
        <span className="text-sm text-muted-foreground">{stat.paintedPct}% painted</span>
        <span className="text-sm text-muted-foreground">
          {stat.pointsOwned} pts owned / {stat.pointsPainted} pts painted
        </span>
      </div>
    </Card>
  );
}
