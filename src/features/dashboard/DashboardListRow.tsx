/**
 * Shared list row for Active Projects (DASH-05) and Recently Updated (DASH-06).
 * Recently Updated rows pass showTime=true to render the relativeTime label.
 *
 * Pattern mirrors KanbanCard inline-style faction badge:
 *   <Badge style={{ backgroundColor: faction.color_theme }} ...>
 *
 * Rendered as <button> (not <div>) for native keyboard activation + screen reader support.
 */
import { Badge } from "@/components/ui/badge";
import { STATUS_ABBR } from "./statusAbbr";
import { formatRelativeTime } from "./relativeTime";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

export interface DashboardListRowProps {
  unit: Unit;
  faction: Faction | undefined;
  showTime?: boolean;
  onClick: (unit: Unit) => void;
}

export function DashboardListRow({ unit, faction, showTime = false, onClick }: DashboardListRowProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(unit)}
      className="flex min-h-[44px] w-full items-center gap-2 rounded-md px-4 py-2 text-left hover:bg-muted/50"
    >
      <span className="flex-1 truncate text-sm font-semibold">{unit.name}</span>
      {faction ? (
        <Badge
          style={{ backgroundColor: faction.color_theme }}
          className="border-transparent text-white"
        >
          {faction.name}
        </Badge>
      ) : null}
      <span className="text-sm text-muted-foreground">
        {STATUS_ABBR[unit.status_painting]}
      </span>
      {showTime ? (
        <span className="text-sm text-muted-foreground">
          {formatRelativeTime(unit.updated_at)}
        </span>
      ) : null}
    </button>
  );
}
