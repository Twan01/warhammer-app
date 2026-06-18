/**
 * Phase 138-02 — PLAY-01: Full-page side-by-side unit comparison.
 *
 * Replaces the stub created in 138-01.
 * Reads compareIds from Zustand, runs ONE batched useUdbUnitsByIds call,
 * computes statDiffMap at page level, and renders N UnitCompareColumn instances.
 */
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { useUdbUnitsByIds } from "@/hooks/useUnitDatabase";
import { useDatabaseBrowserFilters } from "./databaseBrowserFilters";
import { UnitCompareColumn } from "./UnitCompareColumn";

const STAT_FIELDS = ["M", "T", "Sv", "W", "Ld", "OC"] as const;

export function UnitComparePage() {
  const { compareIds, clearCompare } = useDatabaseBrowserFilters();
  const navigate = useNavigate();

  // Sorted stable array from the Set — needed for a stable React Query key
  const ids = useMemo(() => [...compareIds].sort(), [compareIds]);

  // ONE batched call — never a hook in a loop (PITFALL #8)
  const { data: units = [], isLoading, isError } = useUdbUnitsByIds(ids);

  // Compute statDiffMap at page level and pass down to columns
  const statDiffMap = useMemo<Map<string, boolean>>(() => {
    const map = new Map<string, boolean>();
    for (const field of STAT_FIELDS) {
      const values = units.map((u) =>
        String(u.models[0]?.[field as keyof (typeof u.models)[0]] ?? null),
      );
      map.set(field, new Set(values).size > 1);
    }
    return map;
  }, [units]);

  // Loading branch
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex gap-4">
          <Skeleton className="h-64 flex-1 rounded-lg" />
          <Skeleton className="h-64 flex-1 rounded-lg" />
        </div>
      </div>
    );
  }

  // Error branch
  if (isError) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <p className="text-sm text-muted-foreground">
          Failed to load unit data. Try navigating back and reselecting.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/unit-database" })}
        >
          Back to Unit Database
        </Button>
      </div>
    );
  }

  // Empty / under-2 branch
  if (ids.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <h2 className="text-xl font-semibold">Select units to compare</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Choose 2 or 3 units from the Unit Database to compare them side by side.
        </p>
        <Button onClick={() => navigate({ to: "/unit-database" })}>
          Browse Unit Database
        </Button>
      </div>
    );
  }

  // Populated branch
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Compare Units"
        actions={
          <Button variant="ghost" onClick={clearCompare}>
            Clear
          </Button>
        }
      />
      <div
        className="grid gap-4 overflow-x-auto"
        style={{
          gridTemplateColumns: `repeat(${units.length}, minmax(280px, 1fr))`,
        }}
      >
        {units.map((unit) => (
          <UnitCompareColumn
            key={unit.id}
            unit={unit}
            statDiffMap={statDiffMap}
            allUnits={units}
          />
        ))}
      </div>
    </div>
  );
}
