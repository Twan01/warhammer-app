import { Database, HardDrive } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import { useDiagnosticFlags, useBackupStatus } from "@/hooks/useDiagnostics";
import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";

export function DataHealthSummaryCard() {
  const { data: syncMeta, isLoading: syncLoading } = useRulesSyncMeta();
  const { data: flags, isLoading: flagsLoading } = useDiagnosticFlags();
  const backup = useBackupStatus();

  const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
  const syncLabel = getSyncAgeLabel(syncMeta?.last_sync_at ?? null);

  const warningCount = flags
    ? flags.reduce((sum, f) => sum + f.count, 0)
    : 0;

  const backupLabel = (() => {
    if (!backup) return "No backup";
    const ageMs = Date.now() - new Date(backup.date).getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    if (ageDays === 0) return "Backed up today";
    if (ageDays === 1) return "Backed up yesterday";
    return `Backed up ${ageDays} days ago`;
  })();

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {syncLoading ? (
            <Skeleton className="h-4 w-28" />
          ) : (
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${FRESHNESS_DOT_CLASS[freshness]}`} />
              <span className="text-muted-foreground">{syncLabel}</span>
            </div>
          )}

          {flagsLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <div className="flex items-center gap-1.5">
              <Database size={12} />
              {warningCount === 0 ? (
                <span className="text-muted-foreground">No warnings</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  {warningCount} warning{warningCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <HardDrive size={12} />
            <span className="text-muted-foreground">{backupLabel}</span>
          </div>
        </div>

        <Link
          to="/data-health"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          View full report
        </Link>
      </div>
    </div>
  );
}
