/**
 * Phase 107 -- Version & Schema Info card.
 *
 * Shows App Version, DB Schema, and Data Version.
 * Sync-era fields (Rules Schema, Last Sync, Sync Errors) removed.
 */
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchemaVersions } from "@/hooks/useDiagnostics";
import { useUdbMeta } from "@/hooks/useUdbMeta";

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
  const { data: udbMeta, isLoading: udbMetaLoading } = useUdbMeta();

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
  }, []);

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

        <InfoItem label="Data Version">
          {udbMetaLoading ? (
            <Skeleton className="w-16 h-4" />
          ) : (
            udbMeta?.version ?? "Not imported"
          )}
        </InfoItem>
      </CardContent>
    </Card>
  );
}
