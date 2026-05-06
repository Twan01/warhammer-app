/**
 * DASH-04 / LAYOUT-03 — 5-bucket painting pipeline.
 *
 * Groups the 11 PAINTING_STATUS_ORDER stages into 5 semantic buckets:
 *   Not Started → Assembly → Painting → Finishing → Done
 *
 * Each bucket sums the model count from its constituent statuses.
 * Bucket colors are co-located here (not imported from status-badge.tsx)
 * because the 5-bucket palette differs from the 4-tier StatusBadge palette.
 */
import { Card } from "@/components/ui/card";
import type { PaintingStatus } from "@/types/unit";
import type { Unit } from "@/types/unit";

type Bucket = "Not Started" | "Assembly" | "Painting" | "Finishing" | "Done";

const BUCKET_ORDER: Bucket[] = ["Not Started", "Assembly", "Painting", "Finishing", "Done"];

const BUCKET_GROUPS: Record<Bucket, PaintingStatus[]> = {
  "Not Started": ["Not Started"],
  "Assembly":    ["Built", "Primed"],
  "Painting":    ["Basecoated", "Shaded", "Layered", "Highlighted", "Details Done"],
  "Finishing":   ["Based", "Varnished"],
  "Done":        ["Completed"],
};

const BUCKET_BUBBLE_CLASS: Record<Bucket, string> = {
  "Not Started": "bg-muted-foreground/30 text-foreground",
  "Assembly":    "bg-slate-400/30 text-foreground",
  "Painting":    "bg-violet-400/30 text-foreground",
  "Finishing":   "bg-emerald-400/30 text-foreground",
  "Done":        "bg-battle-gold/30 text-foreground",
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
      <ol className="flex items-end gap-4" role="list">
        {BUCKET_ORDER.map((bucket) => {
          const count = BUCKET_GROUPS[bucket].reduce(
            (sum, status) => sum + units.filter((u) => u.status_painting === status).length,
            0
          );
          return (
            <li
              key={bucket}
              className="flex flex-1 flex-col items-center gap-1"
              aria-label={`${bucket}: ${count} units`}
            >
              <span className="text-xs text-muted-foreground text-center">
                {bucket}
              </span>
              <span
                className={`inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-full text-sm font-semibold tabular-nums ${BUCKET_BUBBLE_CLASS[bucket]}`}
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
