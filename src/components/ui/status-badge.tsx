/**
 * Phase 25 (DSFD-04) — Unified painting StatusBadge.
 *
 * 4-tier color system across the 11 PaintingStatus values defined in
 * src/types/unit.ts. The tier map is co-located here (not in types/unit.ts)
 * to keep the visual logic encapsulated — callers only need to pass a
 * PaintingStatus value.
 *
 * NOT applied to any page in Phase 25 — applications live in Phase 28
 * (COLL-02 wires this into UnitTable rows and UnitGallery cards).
 */
import type { PaintingStatus } from "@/types/unit";

type Tier = "not-started" | "prep" | "painting" | "done";

export const PAINTING_STATUS_TIER: Record<PaintingStatus, Tier> = {
  "Not Started": "not-started",
  Built: "prep",
  Primed: "prep",
  Basecoated: "prep",
  Shaded: "painting",
  Layered: "painting",
  Highlighted: "painting",
  "Details Done": "painting",
  Based: "painting",
  Varnished: "done",
  Completed: "done",
};

const TIER_DOT_CLASS: Record<Tier, string> = {
  "not-started": "bg-muted-foreground/50",
  prep: "bg-slate-400",
  painting: "bg-violet-400",
  done: "bg-emerald-400",
};

export interface StatusBadgeProps {
  status: PaintingStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const tier = PAINTING_STATUS_TIER[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2 w-2 rounded-full shrink-0 ${TIER_DOT_CLASS[tier]}`} />
      {status}
    </span>
  );
}
