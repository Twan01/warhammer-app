/**
 * Phase 15 — useRulesSync mutation hook (DS-01).
 *
 * Pipeline:
 *   1. Fetch all 6 Wahapedia CSVs (Datasheets, Datasheets_models, Datasheets_abilities,
 *      Datasheets_keywords, Factions, Source) plus Last_update.csv (1-line freshness file).
 *   2. parseWahapediaCsv() each body.
 *   3. Open a single transaction on rules.db, DELETE FROM all 6 rw_* tables,
 *      INSERT all rows. stripHtml() applied to ability description and ability name.
 *      is_faction_keyword "true"/"false" coerced to 1/0.
 *   4. COMMIT.
 *   5. upsertSyncMeta({ last_sync_at: now, wahapedia_version: lastUpdate }).
 *   6. Invalidate query keys so PlaybookTab + Picker refetch.
 *
 * On any failure, ROLLBACK and rethrow so the mutation surface is surfaced
 * via toast in PlaybookTab (Plan 15-05 wires the error toast).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetch } from "@tauri-apps/plugin-http";
import { parseWahapediaCsv } from "@/lib/parseWahapediaCsv";
import { stripHtml } from "@/lib/stripHtml";
import { getRulesDb } from "@/db/rules-client";
import { upsertSyncMeta } from "@/db/queries/datasheets";
import { RULES_SYNC_META_KEY } from "@/hooks/useDatasheet";

const WAHAPEDIA_BASE = "https://wahapedia.ru/wh40k10ed";

/** Files fetched by useRulesSync — exposed for tests / debug. */
export const RULES_SYNC_FILES = [
  "Factions.csv",
  "Source.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Last_update.csv",
] as const;

async function fetchCsv(filename: string): Promise<string> {
  const response = await fetch(`${WAHAPEDIA_BASE}/${filename}`, { method: "GET" });
  if (!response.ok) throw new Error(`Failed to fetch ${filename}: ${response.status}`);
  return response.text();
}

function parseLastUpdate(raw: string): string {
  // Last_update.csv format: "last_update|2026-04-27 20:55:42|\n"
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return "";
  const parts = lines[1].split("|");
  return parts[0]?.trim() ?? "";
}

export function useRulesSync() {
  const qc = useQueryClient();

  return useMutation<{ wahapediaVersion: string; rowCounts: Record<string, number> }, Error, void>({
    mutationFn: async () => {
      // STEP 1: fetch all 7 files in parallel
      const [factionsRaw, sourcesRaw, dsRaw, modelsRaw, abilitiesRaw, keywordsRaw, lastUpdateRaw] =
        await Promise.all(RULES_SYNC_FILES.map((f) => fetchCsv(f)));

      // STEP 2: parse (Last_update is 1-line, special handling)
      const factions = parseWahapediaCsv(factionsRaw);
      const sources = parseWahapediaCsv(sourcesRaw);
      const datasheets = parseWahapediaCsv(dsRaw);
      const models = parseWahapediaCsv(modelsRaw);
      const abilities = parseWahapediaCsv(abilitiesRaw);
      const keywords = parseWahapediaCsv(keywordsRaw);
      const wahapediaVersion = parseLastUpdate(lastUpdateRaw);

      // STEP 3+4: single transaction on rules.db (Pitfall 7 — without transaction, ~30s)
      const db = await getRulesDb();
      await db.execute("BEGIN");
      try {
        await db.execute("DELETE FROM rw_datasheet_keywords");
        await db.execute("DELETE FROM rw_datasheet_abilities");
        await db.execute("DELETE FROM rw_datasheet_models");
        await db.execute("DELETE FROM rw_datasheets");
        await db.execute("DELETE FROM rw_sources");
        await db.execute("DELETE FROM rw_factions");

        for (const f of factions) {
          await db.execute(
            "INSERT INTO rw_factions (id, name) VALUES ($1, $2)",
            [f.id, f.name]
          );
        }
        for (const s of sources) {
          await db.execute(
            "INSERT INTO rw_sources (id, name, type, edition, version, errata_date) VALUES ($1, $2, $3, $4, $5, $6)",
            [
              s.id, s.name, s.type || null,
              s.edition ? Number(s.edition) : null,
              s.version || null, s.errata_date || null,
            ]
          );
        }
        for (const d of datasheets) {
          await db.execute(
            "INSERT INTO rw_datasheets (id, name, faction_id, source_id, role, damaged_w, damaged_description) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
              d.id, d.name, d.faction_id || null, d.source_id || null,
              d.role || null, d.damaged_w || null,
              d.damaged_description ? stripHtml(d.damaged_description) : null,
            ]
          );
        }
        // Some Wahapedia model rows have duplicate (datasheet_id, line) keys due to
        // text quirks. INSERT OR IGNORE keeps the first occurrence and avoids
        // crashing the transaction on the duplicate-PK error.
        for (const m of models) {
          await db.execute(
            "INSERT OR IGNORE INTO rw_datasheet_models (datasheet_id, line, name, M, T, Sv, inv_sv, W, Ld, OC) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            [
              m.datasheet_id, Number(m.line) || 1, m.name || null,
              m.M || null,
              m.T ? Number(m.T) : null,
              m.Sv || null,
              m.inv_sv || null,
              m.W ? Number(m.W) : null,
              m.Ld || null,
              m.OC ? Number(m.OC) : null,
            ]
          );
        }
        for (const a of abilities) {
          await db.execute(
            "INSERT OR IGNORE INTO rw_datasheet_abilities (datasheet_id, line, ability_id, name, description, type, parameter) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
              a.datasheet_id, Number(a.line) || 1, a.ability_id || null,
              stripHtml(a.name || ""),
              a.description ? stripHtml(a.description) : null,
              a.type || null, a.parameter || null,
            ]
          );
        }
        for (const k of keywords) {
          if (!k.datasheet_id || !k.keyword) continue;
          await db.execute(
            "INSERT INTO rw_datasheet_keywords (datasheet_id, keyword, is_faction_keyword) VALUES ($1, $2, $3)",
            [
              k.datasheet_id, k.keyword,
              k.is_faction_keyword === "true" ? 1 : 0,
            ]
          );
        }

        await db.execute("COMMIT");
      } catch (e) {
        await db.execute("ROLLBACK");
        throw e;
      }

      // STEP 5: write sync meta after successful commit
      const last_sync_at = new Date().toISOString();
      await upsertSyncMeta({ last_sync_at, wahapedia_version: wahapediaVersion });

      return {
        wahapediaVersion,
        rowCounts: {
          factions: factions.length,
          sources: sources.length,
          datasheets: datasheets.length,
          models: models.length,
          abilities: abilities.length,
          keywords: keywords.length,
        },
      };
    },
    onSuccess: () => {
      // STEP 6: invalidate sync meta + ALL per-faction picker lists + ALL per-unit datasheet queries
      qc.invalidateQueries({ queryKey: RULES_SYNC_META_KEY });
      qc.invalidateQueries({ queryKey: ["datasheets-by-faction"] });
      qc.invalidateQueries({ queryKey: ["datasheet"] });
    },
  });
}
