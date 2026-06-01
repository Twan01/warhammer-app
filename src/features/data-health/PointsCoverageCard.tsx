/**
 * DQ-06 -- Per-faction points coverage card for the Data Health page.
 *
 * Shows a grid of factions with color-coded badges indicating coverage:
 *   - Green (85%+): Excellent coverage
 *   - Amber (50-84%): Partial coverage
 *   - Red (<50%): Low coverage
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePointsCoverage } from "@/hooks/useDiagnostics";

function coverageBadge(pct: number) {
  if (pct >= 85) {
    return (
      <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-0">
        {pct}%
      </Badge>
    );
  }
  if (pct >= 50) {
    return (
      <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0">
        {pct}%
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      {pct}%
    </Badge>
  );
}

export function PointsCoverageCard() {
  const { data: factions, isLoading } = usePointsCoverage();

  const overall = useMemo(() => {
    if (!factions || factions.length === 0) return null;
    const totalUnits = factions.reduce((s, f) => s + f.total_units, 0);
    const withPoints = factions.reduce((s, f) => s + f.units_with_points, 0);
    return {
      totalUnits,
      withPoints,
      pct: totalUnits > 0 ? Math.round((100 * withPoints) / totalUnits) : 0,
    };
  }, [factions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Points Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-8" />
            ))}
          </div>
        ) : !factions || factions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No unit database imported
          </p>
        ) : (
          <div className="space-y-4">
            {overall && (
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <span className="text-sm font-medium">Overall</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {overall.withPoints}/{overall.totalUnits} units
                  </span>
                  {coverageBadge(overall.pct)}
                </div>
              </div>
            )}
            <div className="grid gap-2">
              {factions.map((f) => (
                <div
                  key={f.faction_id}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm">{f.faction_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {f.units_with_points}/{f.total_units}
                    </span>
                    {coverageBadge(f.coverage_pct)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
