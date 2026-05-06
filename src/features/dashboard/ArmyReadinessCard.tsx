/**
 * Phase 32 — PANEL-04/05: Army Readiness Card.
 *
 * Shows per-faction battle-ready points against a user-selected target threshold.
 * Target buttons: 500 / 1000 / 1500 / 2000 pts (default 2000).
 * Target persists in localStorage via useArmyReadinessTarget.
 *
 * Each faction row shows:
 * - Faction name
 * - Progress bar colored with faction's color_theme
 * - "{pointsPainted} / {target} pts ready, {pointsOwned} pts owned"
 * - text-battle-gold when pointsPainted >= target
 *
 * Factions with 0 units are excluded by the INNER JOIN in the query.
 * Empty state: Shield icon + "Add units to see army readiness".
 */
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useArmyReadiness,
  useArmyReadinessTarget,
  ARMY_READINESS_TARGETS,
} from "@/hooks/useArmyReadiness";
import type { FactionReadiness } from "@/db/queries/dashboard";

export function ArmyReadinessCard() {
  const { data: factions, isLoading } = useArmyReadiness();
  const [target, setTarget] = useArmyReadinessTarget();

  if (isLoading) {
    return (
      <section className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Army Readiness
        </p>
        <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </section>
    );
  }

  if (!factions || factions.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Army Readiness
        </p>
        <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Shield size={20} className="opacity-40" />
            <span className="text-sm">Add units to see army readiness</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Army Readiness
        </p>
        <div className="flex gap-1">
          {ARMY_READINESS_TARGETS.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={target === t ? "default" : "ghost"}
              onClick={() => setTarget(t)}
              className="h-7 px-2 tabular-nums text-xs"
            >
              {t}
            </Button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          {factions.map((row) => (
            <FactionRow key={row.faction_id} row={row} target={target} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FactionRow({ row, target }: { row: FactionReadiness; target: number }) {
  const pct = Math.min(100, Math.round((row.points_painted / target) * 100));
  const isTargetMet = row.points_painted >= target;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{row.faction_name}</span>
      <div className="h-1.5 w-full rounded-full bg-border/40">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: row.color_theme,
          }}
        />
      </div>
      <span
        className={`text-xs tabular-nums ${isTargetMet ? "text-battle-gold" : "text-muted-foreground"}`}
      >
        {row.points_painted} / {target} pts ready, {row.points_owned} pts owned
      </span>
    </div>
  );
}
