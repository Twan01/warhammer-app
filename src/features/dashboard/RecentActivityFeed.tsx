/**
 * DASH-06 — Recent Activity feed on the Dashboard.
 *
 * Renders ActivityEvent[] (up to 10 by default per useRecentActivity) as a
 * compact vertical list. Each row: type icon, event label, relative time.
 *
 * Icon mapping per CONTEXT.md:
 *   unit_added     -> Plus
 *   unit_updated   -> PenLine
 *   session_logged -> Paintbrush
 *   battle_logged  -> Sword
 *
 * Click behavior: rows for unit_added/unit_updated invoke `onUnitClick(unitId)`
 * if provided so DashboardPage can open UnitDetailSheet (Pitfall 3 resolution
 * recommendation in 26-RESEARCH.md). session_logged and battle_logged rows are
 * non-interactive in Phase 26.
 */
import { Plus, PenLine, Paintbrush, Sword } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "./relativeTime";
import type {
  ActivityEvent,
  ActivityEventType,
} from "./computeRecentActivity";

type IconComponent = React.ComponentType<{
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
}>;

const EVENT_ICON: Record<ActivityEventType, IconComponent> = {
  unit_added: Plus,
  unit_updated: PenLine,
  session_logged: Paintbrush,
  battle_logged: Sword,
};

export interface RecentActivityFeedProps {
  events: ActivityEvent[];
  onUnitClick?: (unitId: number) => void;
}

export function RecentActivityFeed({ events, onUnitClick }: RecentActivityFeedProps) {
  if (events.length === 0) {
    return (
      <Card className="bg-card border border-border/60 shadow-sm px-6 py-6 transition-shadow duration-150 hover:shadow-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Recent Activity
        </p>
        <p className="text-sm text-muted-foreground">
          No activity yet — add a unit, log a session, or record a battle.
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-card border border-border/60 shadow-sm px-6 py-6 transition-shadow duration-150 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Recent Activity
      </p>
      <ul className="flex flex-col gap-1" role="list">
        {events.map((event) => {
          const Icon = EVENT_ICON[event.type];
          const isUnitClickable =
            (event.type === "unit_added" || event.type === "unit_updated") &&
            event.unitId !== undefined &&
            onUnitClick !== undefined;

          const rowInner = (
            <>
              <Icon
                size={14}
                className="text-muted-foreground shrink-0"
                aria-hidden={true}
              />
              <span className="flex-1 truncate text-sm">{event.label}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatRelativeTime(event.timestamp)}
              </span>
            </>
          );

          return (
            <li key={event.id}>
              {isUnitClickable ? (
                <button
                  type="button"
                  onClick={() => onUnitClick!(event.unitId!)}
                  className="flex min-h-[36px] w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted/50"
                >
                  {rowInner}
                </button>
              ) : (
                <div className="flex min-h-[36px] w-full items-center gap-3 rounded-md px-3 py-2">
                  {rowInner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
