import { useState, useEffect, useCallback, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getDb } from "@/db/client";
import { DbDiagnosticScreen } from "@/components/common/DbDiagnosticScreen";

/**
 * Expected schema version for hobbyforge.db.
 * Must match the highest-numbered migration prefix in get_migrations().
 */
export const EXPECTED_SCHEMA_VERSION = 44;

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
      // Source of truth is the migrator's own ledger (_sqlx_migrations), NOT
      // PRAGMA user_version. user_version is only set by a couple of migrations
      // (033, 039) and the Rust sync_user_version() early-returns on a fresh install
      // (db file doesn't exist at preflight), so on first launch user_version lags at
      // 39 and would fail this gate spuriously. MAX(version) from _sqlx_migrations is
      // populated by the migrator before this runs and always reflects the real schema.
      let version: number;
      try {
        const mrows = await db.select<Record<string, number>[]>(
          "SELECT MAX(version) AS version FROM _sqlx_migrations"
        );
        version = extractVersion(mrows[0]);
      } catch {
        const rows = await db.select<Record<string, number>[]>("PRAGMA user_version");
        version = extractVersion(rows[0]);
      }
      if (version < EXPECTED_SCHEMA_VERSION) {
        throw new Error(
          `Schema version mismatch: found v${version}, expected v${EXPECTED_SCHEMA_VERSION}. ` +
            `The database may need migration.`
        );
      }
      setState("ok");
      invoke("ack_successful_launch").catch(() => {});
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
