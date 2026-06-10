/**
 * Phase 125-01 -- About tab for the Settings page.
 *
 * Renders three stacked sections (D-01):
 *   1. App Identity — name, description, version
 *   2. Data Stats — unit count, faction count, data date from udb_meta
 *   3. Credits — Wahapedia attribution, tech stack
 *
 * No card wrappers (D-02). Read-only display.
 */
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Skeleton } from "@/components/ui/skeleton";
import { useUdbMeta } from "@/hooks/useUdbMeta";

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

export function AboutTab() {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const { data: udbMeta, isLoading: udbMetaLoading } = useUdbMeta();

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
  }, []);

  return (
    <div className="space-y-6">
      {/* Section 1: App Identity (D-07) */}
      <section className="space-y-1">
        <h2 className="text-lg font-semibold">HobbyForge</h2>
        <p className="text-sm text-muted-foreground">
          Your personal Warhammer hobby command center.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Version
          </span>
          {appVersion === null ? (
            <Skeleton className="inline-block w-16 h-4" />
          ) : (
            <span className="font-mono">{appVersion}</span>
          )}
        </div>
      </section>

      {/* Section 2: Data Stats (D-03) */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Unit Database
        </h3>
        {udbMetaLoading ? (
          <div className="space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : udbMeta ? (
          <div className="space-y-1">
            <p className="text-sm">
              {udbMeta.unit_count ?? 0} units across {udbMeta.faction_count ?? 0} factions
            </p>
            <p className="text-sm text-muted-foreground">
              Data date: {formatBuiltAt(udbMeta.built_at)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not imported yet</p>
        )}
      </section>

      {/* Section 3: Credits (D-05, D-06) */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Credits
        </h3>
        <p className="text-sm text-muted-foreground">
          Unit rules data is sourced from Wahapedia (wahapedia.ru), an independent fan-made
          database. HobbyForge is not affiliated with Games Workshop or Wahapedia.
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Built with</span>{" "}
          Tauri 2, React, TypeScript, SQLite
        </p>
      </section>
    </div>
  );
}
