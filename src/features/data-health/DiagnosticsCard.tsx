/**
 * Phase 77 -- Diagnostics card (UI-SPEC Section 4).
 *
 * Combines database diagnostic flags (orphaned progress, ambiguous points).
 * Data version is sourced from udb_meta (udb_meta.version contains the content hash).
 * When all diagnostics pass, shows a green dot + "All diagnostics passed".
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiagnosticFlags } from "@/hooks/useDiagnostics";
import { useUdbMeta } from "@/hooks/useUdbMeta";
import type { DiagnosticFlag } from "@/db/queries/diagnostics";

export function DiagnosticsCard() {
  const { data: dbFlags, isLoading: flagsLoading } = useDiagnosticFlags();
  const { data: _udbMeta, isLoading: syncLoading } = useUdbMeta();

  const isLoading = flagsLoading || syncLoading;

  // Phase 107: stale sync check removed -- data is bundled with app
  const allFlags: DiagnosticFlag[] = [];
  if (dbFlags) {
    allFlags.push(...dbFlags);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-10" />
            ))}
          </div>
        ) : allFlags.length === 0 ? (
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">
              All diagnostics passed
            </span>
          </div>
        ) : (
          <div className="flex flex-col">
            {allFlags.map((flag, i) => (
              <div
                key={flag.type}
                className={`flex items-center gap-3 py-3 ${
                  i < allFlags.length - 1
                    ? "border-b border-border/40"
                    : ""
                }`}
              >
                <Badge
                  variant={
                    flag.severity === "warning" ? "destructive" : "secondary"
                  }
                >
                  {flag.type.replace(/_/g, " ")}
                </Badge>
                <span className="text-sm text-foreground flex-1">
                  {flag.description}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {flag.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
