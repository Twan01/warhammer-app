/**
 * Phase 77 -- Table Counts grid (UI-SPEC Section 3).
 *
 * Responsive grid of 5 StatCard instances showing row counts for key
 * tables: Units, Recipes, Assignments, Step Progress, Synced Points.
 * Loading state renders 5 skeleton cards matching the StatCard layout.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/features/dashboard/StatCard";
import { useTableCounts } from "@/hooks/useDiagnostics";
import type { TableCounts } from "@/db/queries/diagnostics";

const TABLE_LABELS: Array<{ key: keyof TableCounts; label: string }> = [
  { key: "units", label: "Units" },
  { key: "painting_recipes", label: "Recipes" },
  { key: "unit_recipe_assignments", label: "Assignments" },
  { key: "unit_recipe_step_progress", label: "Step Progress" },
  { key: "synced_unit_points", label: "Synced Points" },
];

function SkeletonCard() {
  return (
    <Card className="px-6">
      <CardContent className="flex flex-col gap-1 px-0">
        <Skeleton className="w-12 h-8" />
        <Skeleton className="w-20 h-4" />
      </CardContent>
    </Card>
  );
}

export function TableCountsGrid() {
  const { data: counts, isLoading } = useTableCounts();

  if (isLoading || !counts) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {TABLE_LABELS.map(({ key, label }) => (
        <StatCard
          key={key}
          value={counts[key as keyof typeof counts]}
          label={label}
        />
      ))}
    </div>
  );
}
