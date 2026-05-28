import { useState, useEffect, useCallback, type ReactNode } from "react";
import { getDb } from "@/db/client";
import { getRulesDb } from "@/db/rules-client";
import { replaceSyncedUnitPoints } from "@/db/queries/syncedUnitPoints";
import { normalizePointsNames } from "@/lib/normalizePointsNames";
import { DbDiagnosticScreen } from "@/components/common/DbDiagnosticScreen";

/**
 * Expected schema version for hobbyforge.db.
 * Must match the highest-numbered migration prefix (036_unit_form_simplification.sql).
 */
export const EXPECTED_SCHEMA_VERSION = 36;

/**
 * Extract user_version from a PRAGMA result row.
 * Handles driver column-name variance (some drivers return { user_version: N },
 * others return { "user_version": N } or an anonymous first column).
 */
const extractVersion = (row: Record<string, number> | undefined): number => {
  if (!row) return 0;
  if (typeof row.user_version === "number") return row.user_version;
  const values = Object.values(row);
  return typeof values[0] === "number" ? values[0] : 0;
};

type HealthState = "checking" | "ok" | "failed";

/**
 * Startup gate that blocks the app from rendering until the database
 * passes a health check (SELECT 1 + schema version validation).
 *
 * Renders null while checking, DbDiagnosticScreen on failure, or
 * children on success. Sits OUTSIDE QueryProvider in the render tree.
 */
export function DbHealthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HealthState>("checking");
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setState("checking");
    setError(null);
    try {
      const db = await getDb();
      await db.select<Record<string, number>[]>("SELECT 1");
      const rows = await db.select<Record<string, number>[]>(
        "PRAGMA user_version"
      );
      const version = extractVersion(rows[0]);
      if (version < EXPECTED_SCHEMA_VERSION) {
        throw new Error(
          `Schema version mismatch: found v${version}, expected v${EXPECTED_SCHEMA_VERSION}. ` +
            `The database may need migration.`
        );
      }
      // Repair synced_unit_points cache if stale
      try {
        const rulesDb = await getRulesDb();

        // Normalize BSData point names to match Wahapedia datasheet names.
        // Fixes mismatches like "Canoptek Spyder" (BSData) vs "Canoptek Spyders" (Wahapedia)
        // that would cause points to show as null in the UI.
        try {
          const normResult = await normalizePointsNames(rulesDb);
          if (normResult.unmatched.length > 0) {
            console.warn(
              `[DbHealthGate] ${normResult.unmatched.length} points still unmatched after normalization`,
            );
          }
        } catch (normErr) {
          console.warn("[DbHealthGate] points name normalization failed:", normErr);
        }

        const [{ c: rulesCount }] = await rulesDb.select<[{ c: number }]>(
          "SELECT COUNT(*) as c FROM rw_datasheet_points", [],
        );
        const [{ c: cacheCount }] = await db.select<[{ c: number }]>(
          "SELECT COUNT(*) as c FROM synced_unit_points", [],
        );
        if (rulesCount > 0 && cacheCount < rulesCount) {
          console.info(`[DbHealthGate] synced_unit_points stale (${cacheCount}/${rulesCount}), repairing...`);
          const rows = await rulesDb.select<{ datasheet_name: string; faction_id: string | null; points: number }[]>(
            "SELECT datasheet_name, faction_id, points FROM rw_datasheet_points ORDER BY datasheet_name", [],
          );
          await replaceSyncedUnitPoints(
            rows.map(r => ({ unit_name: r.datasheet_name, faction_id: r.faction_id, points: r.points })),
            new Date().toISOString(),
          );
          console.info(`[DbHealthGate] synced_unit_points repaired: ${rows.length} rows`);
        }
      } catch (repairErr) {
        console.warn("[DbHealthGate] points cache repair failed:", repairErr);
      }
      setState("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("failed");
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (state === "checking") return null;
  if (state === "failed")
    return <DbDiagnosticScreen error={error} onRetry={runCheck} />;
  return <>{children}</>;
}
