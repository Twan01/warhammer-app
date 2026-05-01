/**
 * DASH-02 — One per faction, in a wrapping flex row.
 *
 * Click-through pattern (Pitfall 2 in 05-RESEARCH.md):
 *   useCollectionFilters.setState({
 *     factions: [stat.faction.id], search: "", statuses: [], categories: [], activeOnly: false,
 *   });
 * — replaces the factions slice (does NOT toggle); also clears every other filter so
 * the Collection page shows exactly that faction's units.
 *
 * Left border accent (POLISH-05 / DASH-02): border-l-4 + inline borderLeftColor.
 */
import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useCollectionFilters } from "@/features/units/collectionFilters";
import type { FactionStat } from "./computeStats";

export interface FactionSummaryCardProps {
  stat: FactionStat;
}

export function FactionSummaryCard({ stat }: FactionSummaryCardProps) {
  const navigate = useNavigate();
  const handleClick = () => {
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
      className="min-w-[180px] cursor-pointer border-l-4 px-4 py-4 hover:bg-muted/50"
    >
      <div className="flex flex-col gap-2">
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
