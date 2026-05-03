import { useNavigate } from "@tanstack/react-router";
import { Star } from "lucide-react";
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

  const handleCardClick = () => {
    useCollectionFilters.setState({
      factions: [stat.faction.id],
      search: "",
      statuses: [],
      categories: [],
      activeOnly: false,
    });
    navigate({ to: "/collection" });
  };

  const handleActivate = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onActivate();
  };

  return (
    <Card
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={stat.faction.name}
      style={{ borderLeftColor: stat.faction.color_theme }}
      className={`relative min-w-[180px] cursor-pointer border-l-4 px-4 py-4 hover:bg-muted/50${isActive ? " ring-2 ring-faction-accent" : ""}`}
    >
      <button
        onClick={handleActivate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleActivate(e);
          }
        }}
        aria-label={isActive ? "Deactivate faction theme" : "Set as active faction theme"}
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        <Star
          size={14}
          className={isActive ? "fill-faction-accent text-faction-accent" : ""}
        />
      </button>
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
