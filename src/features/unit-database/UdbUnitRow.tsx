import { GitCompare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";
import { PAINTING_STATUS_ORDER } from "@/types/unit";
import { useDatabaseBrowserFilters } from "./databaseBrowserFilters";
import { useCollectionFilters } from "@/features/units/collectionFilters";

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
    if (idx < worstIndex) {
      worstIndex = idx;
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
  // No owned copies / no status data → neutral, not "in progress".
  if (!allStatuses) return "bg-muted-foreground/50";
  const statuses = allStatuses.split("|");

  const allDone = statuses.every((s) => DONE_STATUSES.has(s));
  if (allDone) return "bg-emerald-400";

  const allNotStarted = statuses.every((s) => s === "Not Started");
  if (allNotStarted) return "bg-muted-foreground/50";

  return "bg-amber-500";
}

function resolveReadinessLabel(allStatuses: string): string {
  if (!allStatuses) return "Not started";
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
  const { compareIds, addToCompare, removeFromCompare } = useDatabaseBrowserFilters();
  // Phase 138-03 D-06: deep-link into the Collection filtered to this unit
  const setUdbUnitIdFilter = useCollectionFilters((s) => s.setUdbUnitIdFilter);
  const isInCompare = compareIds.has(unit.id);
  // Cap: disabled when 3 are already selected AND this unit is not one of them
  const compareDisabled = compareIds.size >= 3 && !isInCompare;

  const compareAriaLabel = isInCompare
    ? `Remove ${unit.name} from comparison`
    : `Add ${unit.name} to comparison`;

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
        <Link
          to="/collection"
          onClick={(e) => {
            e.stopPropagation();
            setUdbUnitIdFilter(unit.id);
          }}
          aria-label={`View ${ownershipData.owned_count} owned ${unit.name} in Collection`}
        >
          <Badge variant="outline" className="text-xs shrink-0 hover:bg-secondary cursor-pointer">
            Owned x{ownershipData.owned_count}
          </Badge>
        </Link>
      )}
      {isOwned && (
        <span
          className={`inline-block h-2 w-2 rounded-full shrink-0 ${resolveReadinessDotClass(ownershipData.all_statuses)}`}
          title={resolveReadinessLabel(ownershipData.all_statuses)}
        />
      )}

      {/* Compare toggle — icon-only button with tooltip (UI-SPEC FLAG) */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={[
                "h-6 w-6 shrink-0",
                isInCompare ? "text-faction-accent bg-faction-accent/10" : "",
                compareDisabled ? "opacity-50 cursor-not-allowed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={compareDisabled}
              aria-label={compareAriaLabel}
              onClick={(e) => {
                e.stopPropagation();
                if (isInCompare) {
                  removeFromCompare(unit.id);
                } else {
                  addToCompare(unit.id);
                }
              }}
            >
              <GitCompare size={16} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{compareAriaLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <span className="text-xs text-muted-foreground tabular-nums w-20 text-right shrink-0">
        {unit.base_points !== null ? `from ${unit.base_points} pts` : "—"}
      </span>
    </div>
  );
}
