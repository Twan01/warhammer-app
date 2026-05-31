/**
 * Phase 107 -- Version & Data Info card.
 *
 * Shows App Version, DB Schema, and Unit Database details from udb_meta.
 * Sync-era fields (Rules Schema, Last Sync, Sync Errors) fully removed.
 */
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function formatBuiltAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const GAME_SYSTEM_LABELS: Record<string, string> = {
  "40k-10th": "Warhammer 40,000 10th Edition",
};

export function VersionInfoCard() {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const { data: schemaVersions, isLoading: schemaLoading } =
    useSchemaVersions();
  const { data: udbMeta, isLoading: udbMetaLoading } = useUdbMeta();

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
  }, []);

  const gameSystemLabel = udbMeta?.game_system
    ? GAME_SYSTEM_LABELS[udbMeta.game_system] ?? udbMeta.game_system
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" />
          {udbMeta ? `Unit Database v${udbMeta.version}` : "Unit Database"}
        </CardTitle>
        {udbMeta?.built_at && (
          <p className="text-xs text-muted-foreground">
            Built: {formatBuiltAt(udbMeta.built_at)}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-8 pt-0">
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

        <InfoItem label="Units">
          {udbMetaLoading ? (
            <Skeleton className="w-16 h-4" />
          ) : udbMeta ? (
            `${udbMeta.unit_count ?? 0} units across ${udbMeta.faction_count ?? 0} factions`
          ) : (
            "Not imported"
          )}
        </InfoItem>

        {gameSystemLabel && (
          <InfoItem label="Game System">{gameSystemLabel}</InfoItem>
        )}
      </CardContent>
    </Card>
  );
}
