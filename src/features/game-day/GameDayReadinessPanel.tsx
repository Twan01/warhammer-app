/**
 * Phase 67 -- Pre-game readiness panel (GD-01).
 *
 * Surfaces Phase 66 validation infrastructure into the Game Day page.
 * Shows points status, freshness badge, warning counts with collapsible
 * per-unit detail, readiness gaps, and tactical role coverage pills.
 *
 * Pure presentation component -- receives data as props from GameDayPage.
 * Calls computeListHealthStats and computeUnitWarnings for aggregation.
 */
import { useMemo, useState } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  computeListHealthStats,
  computeUnitWarnings,
} from "@/lib/computeUnitWarnings";
import type { WarningContext } from "@/lib/computeUnitWarnings";
import { PointsFreshnessBadge } from "@/features/army-lists/PointsFreshnessBadge";
import type { ArmyListUnitRow } from "@/types/armyList";
import {
  TACTICAL_ROLES,
  TACTICAL_ROLES_DISPLAY,
} from "@/types/armyList";
import type { TacticalRole } from "@/types/armyList";
import type { SyncFreshness } from "@/lib/syncFreshness";
import type { PaintingStatus } from "@/types/unit";
import { AlertCircle, AlertTriangle, ChevronDown } from "lucide-react";

interface GameDayReadinessPanelProps {
  units: ArmyListUnitRow[];
  pointsLimit: number | null;
  freshness: SyncFreshness;
}

export function GameDayReadinessPanel({
  units,
  pointsLimit,
  freshness,
}: GameDayReadinessPanelProps) {
  const [open, setOpen] = useState(false);

  const stats = useMemo(
    () => computeListHealthStats(units, pointsLimit, freshness),
    [units, pointsLimit, freshness],
  );

  const totalWarnings = stats.hardWarningCount + stats.softWarningCount;

  const context: WarningContext = useMemo(
    () => ({
      totalPoints: stats.totalPoints,
      pointsLimit,
      freshness,
    }),
    [stats.totalPoints, pointsLimit, freshness],
  );

  const unitsWithWarnings = useMemo(
    () =>
      units
        .map((u) => ({ unit: u, warnings: computeUnitWarnings(u, context) }))
        .filter(
          ({ warnings }) => warnings.hard.length + warnings.soft.length > 0,
        ),
    [units, context],
  );

  const notReadyUnits = useMemo(
    () =>
      units.filter(
        (u) => u.status_painting !== "Completed" || u.status_assembly === 0,
      ),
    [units],
  );

  const roleCounts = useMemo(() => {
    const counts: Record<TacticalRole, number> = {
      anti_tank: 0,
      screening: 0,
      objective_holder: 0,
      fire_support: 0,
      melee_threat: 0,
      utility: 0,
      transport: 0,
    };
    for (const u of units) {
      if (u.tactical_role && u.tactical_role in counts) {
        counts[u.tactical_role as TacticalRole] += 1;
      }
    }
    return counts;
  }, [units]);

  const hasAnyRole = useMemo(
    () => units.some((u) => u.tactical_role !== null),
    [units],
  );

  const pointsValue =
    pointsLimit !== null
      ? `${stats.totalPoints} / ${pointsLimit} pts`
      : `${stats.totalPoints} pts`;

  return (
    <div className="flex flex-col gap-3 px-4 py-3 bg-muted/30 border-b">
      {/* Stat row */}
      <div className="flex items-center gap-6">
        <Stat
          label="Total"
          value={pointsValue}
          valueClassName={
            stats.pointsExceeded ? "text-destructive" : undefined
          }
        />
        <Stat label="Owned" value={`${stats.ownershipPct}%`} />
        <Stat label="Ready" value={`${stats.battleReadyPct}%`} />
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-battle-gold transition-all duration-300"
          style={{ width: `${stats.battleReadyPct}%` }}
        />
      </div>

      {/* Freshness + warnings row */}
      <div className="flex items-center justify-between">
        <PointsFreshnessBadge />

        {totalWarnings > 0 && (
          <Collapsible open={open} onOpenChange={setOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 text-xs font-medium cursor-pointer ${
                      stats.hardWarningCount > 0
                        ? "text-destructive"
                        : "text-amber-500"
                    }`}
                  >
                    Warnings: {totalWarnings}
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </CollapsibleTrigger>
              </TooltipTrigger>
              <TooltipContent>
                {stats.hardWarningCount} critical, {stats.softWarningCount}{" "}
                informational
              </TooltipContent>
            </Tooltip>

            <CollapsibleContent>
              <div className="flex flex-col gap-2 mt-2">
                {unitsWithWarnings.map(({ unit, warnings }) => (
                  <div key={unit.id} className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{unit.unit_name}</span>
                    {warnings.hard.map((w, i) => (
                      <span
                        key={`hard-${i}`}
                        className="flex items-center gap-1 text-xs text-destructive"
                      >
                        <AlertCircle className="h-3 w-3" />
                        {w}
                      </span>
                    ))}
                    {warnings.soft.map((w, i) => (
                      <span
                        key={`soft-${i}`}
                        className="flex items-center gap-1 text-xs text-amber-500"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {w}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Role coverage -- only when at least one unit has a role */}
      {hasAnyRole && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Role Coverage
          </span>
          <div className="flex flex-wrap gap-2">
            {TACTICAL_ROLES.map((role) => {
              const count = roleCounts[role];
              const isCovered = count >= 1;
              return (
                <span
                  key={role}
                  className={
                    isCovered
                      ? "bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-xs"
                      : "bg-transparent border border-dashed border-muted-foreground/40 text-muted-foreground rounded-full px-2 py-1 text-xs"
                  }
                >
                  {TACTICAL_ROLES_DISPLAY[role]} {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Readiness section */}
      {notReadyUnits.length === 0 && totalWarnings === 0 ? (
        <p className="text-sm bg-battle-gold/10 text-battle-gold rounded px-2 py-1">
          All units battle-ready
        </p>
      ) : notReadyUnits.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Not ready ({notReadyUnits.length})
          </p>
          {notReadyUnits.map((u) => (
            <div key={u.id} className="flex flex-col py-0.5">
              <div className="flex items-center justify-between text-sm">
                <span>{u.unit_name}</span>
                <StatusBadge status={u.status_painting as PaintingStatus} />
              </div>
              {u.status_assembly === 0 && (
                <span className="text-muted-foreground text-xs">
                  Not assembled
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <span className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className={`font-semibold ${valueClassName ?? ""}`}>{value}</span>
    </span>
  );
}
