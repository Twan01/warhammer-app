import { Badge } from "@/components/ui/badge";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";
import { PAINTING_STATUS_ORDER } from "@/types/unit";

interface UdbUnitRowProps {
  unit: UdbUnitSummary;
  onOpen: (id: string) => void;
  ownershipData?: { owned_count: number; all_statuses: string } | null;
}

const DONE_STATUSES = new Set(["Varnished", "Completed"]);

/**
 * Returns the painting status with the lowest index in PAINTING_STATUS_ORDER
 * from a pipe-delimited string of statuses.
 * Statuses not found in PAINTING_STATUS_ORDER are treated as index -1 (worst/unknown).
 */
export function resolveWorstStatus(allStatuses: string): string {
  if (!allStatuses) return "Not Started";
  const statuses = allStatuses.split("|");
  let worstIndex = Infinity;
  let worstStatus = statuses[0] ?? "Not Started";

  for (const status of statuses) {
    const idx = PAINTING_STATUS_ORDER.indexOf(
      status as (typeof PAINTING_STATUS_ORDER)[number],
    );
    const effectiveIdx = idx === -1 ? -1 : idx;
    if (effectiveIdx < worstIndex) {
      worstIndex = effectiveIdx;
      worstStatus = status;
    }
  }

  return worstStatus;
}

/**
 * Returns the Tailwind color class for the readiness dot based on painting statuses.
 * - bg-emerald-400: ALL statuses are in DONE_STATUSES
 * - bg-muted-foreground/50: ALL statuses are "Not Started"
 * - bg-amber-500: anything else (in progress)
 */
export function resolveReadinessDotClass(allStatuses: string): string {
  const statuses = allStatuses.split("|");

  const allDone = statuses.every((s) => DONE_STATUSES.has(s));
  if (allDone) return "bg-emerald-400";

  const allNotStarted = statuses.every((s) => s === "Not Started");
  if (allNotStarted) return "bg-muted-foreground/50";

  return "bg-amber-500";
}

function resolveReadinessLabel(allStatuses: string): string {
  const statuses = allStatuses.split("|");
  const allDone = statuses.every((s) => DONE_STATUSES.has(s));
  if (allDone) return "All copies painted";

  const allNotStarted = statuses.every((s) => s === "Not Started");
  if (allNotStarted) return "Not started";

  const worstStatus = resolveWorstStatus(allStatuses);
  return `In progress (${worstStatus})`;
}

export function UdbUnitRow({ unit, onOpen, ownershipData }: UdbUnitRowProps) {
  const isOwned = ownershipData != null && ownershipData.owned_count > 0;

  return (
    <div
      className="flex items-center gap-3 px-4 h-10 hover:bg-secondary cursor-pointer transition-colors"
      onClick={() => onOpen(unit.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(unit.id);
        }
      }}
    >
      <span className="text-sm font-medium flex-1 truncate">{unit.name}</span>
      {unit.role && (
        <Badge variant="secondary" className="text-xs shrink-0">
          {unit.role}
        </Badge>
      )}
      {isOwned && (
        <Badge variant="outline" className="text-xs shrink-0">
          Owned x{ownershipData.owned_count}
        </Badge>
      )}
      {isOwned && (
        <span
          className={`inline-block h-2 w-2 rounded-full shrink-0 ${resolveReadinessDotClass(ownershipData.all_statuses)}`}
          title={resolveReadinessLabel(ownershipData.all_statuses)}
        />
      )}
      <span className="text-xs text-muted-foreground tabular-nums w-20 text-right shrink-0">
        {unit.base_points !== null ? `from ${unit.base_points} pts` : "—"}
      </span>
    </div>
  );
}
