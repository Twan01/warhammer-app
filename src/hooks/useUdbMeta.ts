/**
 * Phase 107 -- Canonical replacement for useRulesSyncMeta.
 *
 * Reads the single-row udb_meta table from hobbyforge.db to provide
 * data version, build timestamp, and counts. 11 consumer components
 * previously used useRulesSyncMeta(); they now import useUdbMeta().
 *
 * staleTime: Infinity -- udb_meta only changes when a new
 * unit_database.json is imported (app release).
 */
import { useQuery } from "@tanstack/react-query";
import { getDb } from "@/db/client";

export interface UdbMeta {
  version: string;
  built_at: string;
  game_system: string;
  unit_count: number | null;
  faction_count: number | null;
}

export const UDB_META_KEY = ["udb-meta"] as const;

export function useUdbMeta() {
  return useQuery({
    queryKey: UDB_META_KEY,
    queryFn: async () => {
      const db = await getDb();
      const rows = await db.select<UdbMeta[]>(
        "SELECT version, built_at, game_system, unit_count, faction_count FROM udb_meta WHERE id = 1",
      );
      return rows[0] ?? null;
    },
    staleTime: Infinity,
  });
}
