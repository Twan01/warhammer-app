import { useNavigate } from "@tanstack/react-router";
import { Circle } from "lucide-react";
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
      className={`relative overflow-hidden min-w-[220px] cursor-pointer px-4 py-6 transition-shadow duration-150${
        isActive
          ? " bg-faction-accent/10 ring-2 ring-faction-accent shadow-md"
          : " bg-card shadow-sm hover:shadow-md"
      }`}
    >
      {/* VIS-01 — top accent band (inner div avoids border-radius clipping on rounded-xl) */}
      <div
        className="absolute inset-x-0 top-0 h-2"
        style={{ backgroundColor: stat.faction.color_theme }}
        aria-hidden="true"
      />
      <button
        onClick={handleActivate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleActivate(e);
          }
        }}
        aria-label={isActive ? "Deactivate faction theme" : "Set as active faction theme"}
        className="absolute right-2 top-3 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        <Circle
          size={8}
          className={isActive ? "fill-faction-accent text-faction-accent" : "fill-muted-foreground/30 text-muted-foreground/30"}
        />
      </button>
      <div className="mt-2 flex flex-col gap-2">
        <span className="text-sm font-semibold">{stat.faction.name}</span>
        <span className="text-sm text-muted-foreground">
          <span className="tabular-nums">{stat.modelCount}</span> models
        </span>

        {/* DASH-05 — painting progress bar (mirrors StatCard progress pattern) */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            <span className="tabular-nums">{stat.paintedPct}%</span> painted
          </span>
          <div className="h-0.5 w-full rounded-full bg-border/40">
            <div
              className="h-0.5 rounded-full bg-faction-accent transition-all duration-500"
              style={{ width: `${stat.paintedPct}%` }}
            />
          </div>
        </div>

        {/* DASH-05 — battle-ready points (primary) + owned points (de-emphasized) */}
        <span className="text-sm text-foreground">
          <span className="tabular-nums font-semibold">{stat.pointsPainted}</span>
          <span className="text-muted-foreground"> pts battle-ready</span>
        </span>
        <span className="text-xs text-muted-foreground">
          <span className="tabular-nums">{stat.pointsOwned}</span> pts owned
        </span>
      </div>
    </Card>
  );
}
