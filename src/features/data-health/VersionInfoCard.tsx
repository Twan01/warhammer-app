/**
 * Phase 77 -- Version & Schema Info card (UI-SPEC Section 2).
 *
 * Horizontal flex row of 5 key-value pairs: App Version, DB Schema,
 * Rules Schema, Last Sync (with freshness dot), Sync Errors (with Badge).
 * Each value loads independently via its own hook, showing Skeleton
 * while pending.
 */
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchemaVersions } from "@/hooks/useDiagnostics";
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import { useRulesSyncErrors } from "@/hooks/useSyncErrors";
import {
  getSyncFreshness,
  getSyncAgeLabel,
  FRESHNESS_DOT_CLASS,
} from "@/lib/syncFreshness";

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-semibold">{children}</span>
    </div>
  );
}

export function VersionInfoCard() {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const { data: schemaVersions, isLoading: schemaLoading } =
    useSchemaVersions();
  const { data: syncMeta, isLoading: syncMetaLoading } = useRulesSyncMeta();
  const { data: syncErrors, isLoading: errorsLoading } =
    useRulesSyncErrors();

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
  }, []);

  const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
  const ageLabel = getSyncAgeLabel(syncMeta?.last_sync_at ?? null);
  const errorCount = syncErrors?.length ?? 0;

  return (
    <Card>
      <CardContent className="flex flex-wrap gap-8 p-6">
        <InfoItem label="App Version">
          {appVersion === null ? (
            <Skeleton className="w-16 h-4" />
          ) : (
            `v${appVersion}`
          )}
        </InfoItem>

        <InfoItem label="DB Schema">
          {schemaLoading ? (
            <Skeleton className="w-16 h-4" />
          ) : (
            `v${schemaVersions?.hobbyforge ?? "?"}`
          )}
        </InfoItem>

        <InfoItem label="Rules Schema">
          {schemaLoading ? (
            <Skeleton className="w-16 h-4" />
          ) : (
            `v${schemaVersions?.rules ?? "?"}`
          )}
        </InfoItem>

        <InfoItem label="Last Sync">
          {syncMetaLoading ? (
            <Skeleton className="w-16 h-4" />
          ) : (
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${FRESHNESS_DOT_CLASS[freshness]}`}
              />
              {ageLabel}
            </span>
          )}
        </InfoItem>

        <InfoItem label="Sync Errors">
          {errorsLoading ? (
            <Skeleton className="w-16 h-4" />
          ) : (
            <Badge variant={errorCount > 0 ? "destructive" : "secondary"}>
              {errorCount}
            </Badge>
          )}
        </InfoItem>
      </CardContent>
    </Card>
  );
}
