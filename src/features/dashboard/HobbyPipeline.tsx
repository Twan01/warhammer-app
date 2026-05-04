/**
 * DASH-04 — Horizontal painting funnel replacing the old isolated %% StatCards.
 *
 * Renders all 11 PAINTING_STATUS_ORDER stages as a wrapping flex strip. Each
 * stage shows the stage label and a count bubble (units currently at that exact
 * stage). Bubble background color is driven by PAINTING_STATUS_TIER from
 * status-badge.tsx so the visual mapping stays consistent with StatusBadge dots.
 *
 * Pitfall 6 (26-RESEARCH.md): unit counts MUST come from the full units array
 * (now exposed on ComputedDashboardStats.units in Wave 1) — NEVER from the
 * sliced activeProjects/recentlyUpdated arrays which cap at 5.
 */
import { Card } from "@/components/ui/card";
import { PAINTING_STATUS_ORDER, type PaintingStatus } from "@/types/unit";
import { PAINTING_STATUS_TIER } from "@/components/ui/status-badge";
import type { Unit } from "@/types/unit";

type Tier = "not-started" | "prep" | "painting" | "done";

const TIER_BUBBLE_CLASS: Record<Tier, string> = {
  "not-started": "bg-muted-foreground/30 text-foreground",
  prep: "bg-slate-400/30 text-foreground",
  painting: "bg-violet-400/30 text-foreground",
  done: "bg-battle-gold/30 text-foreground",
};

const STAGE_LABEL_SHORT: Record<PaintingStatus, string> = {
  "Not Started": "Not Started",
  Built: "Built",
  Primed: "Primed",
  Basecoated: "Basecoat",
  Shaded: "Shaded",
  Layered: "Layered",
  Highlighted: "Highlight",
  "Details Done": "Details",
  Based: "Based",
  Varnished: "Varnish",
  Completed: "Done",
};

export interface HobbyPipelineProps {
  units: Unit[];
}

export function HobbyPipeline({ units }: HobbyPipelineProps) {
  return (
    <Card className="bg-card border border-border/60 shadow-sm px-6 py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Pipeline
      </p>
      <ol className="flex flex-wrap items-end gap-x-4 gap-y-3" role="list">
        {PAINTING_STATUS_ORDER.map((stage) => {
          const tier = PAINTING_STATUS_TIER[stage];
          const count = units.filter((u) => u.status_painting === stage).length;
          return (
            <li
              key={stage}
              className="flex flex-col items-center gap-1 min-w-[64px]"
              aria-label={`${stage}: ${count} units`}
            >
              <span className="text-xs text-muted-foreground text-center">
                {STAGE_LABEL_SHORT[stage]}
              </span>
              <span
                className={`inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-full text-sm font-semibold tabular-nums ${TIER_BUBBLE_CLASS[tier]}`}
              >
                {count}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
