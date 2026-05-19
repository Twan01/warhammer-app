import { useState, useEffect } from "react";
import { AlertTriangle, Database } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getVersion } from "@tauri-apps/api/app";
import { Skeleton } from "@/components/ui/skeleton";
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import { useDiagnosticFlags, useBackupStatus } from "@/hooks/useDiagnostics";
import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";
import { getBackupFreshness, getBackupAgeLabel, hasVersionMismatch, BACKUP_FRESHNESS_DOT_CLASS } from "@/lib/backupFreshness";

export function DataHealthSummaryCard() {
  const { data: syncMeta, isLoading: syncLoading } = useRulesSyncMeta();
  const { data: flags, isLoading: flagsLoading } = useDiagnosticFlags();
  const backup = useBackupStatus();
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
  }, []);

  const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
  const syncLabel = getSyncAgeLabel(syncMeta?.last_sync_at ?? null);

  const warningCount = flags
    ? flags.reduce((sum, f) => sum + f.count, 0)
    : 0;

  const backupTier = getBackupFreshness(backup?.date ?? null);
  const backupLabel = getBackupAgeLabel(backup?.date ?? null);
  const versionMismatch = hasVersionMismatch(backup?.app_version, appVersion);

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
            <span className={`inline-block h-2 w-2 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[backupTier]}`} />
            <span className="text-muted-foreground">{backupLabel}</span>
            {versionMismatch && (
              <>
                <AlertTriangle size={12} className="text-amber-500" />
                <span className="text-amber-500">(outdated)</span>
              </>
            )}
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
