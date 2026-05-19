/**
 * Phase 15 — useRulesSync mutation hook (DS-01), extended with full data download.
 * Phase 44 — Hardened with CSV header validation, typed Rust SyncResult, error
 * persistence, and complete cache invalidation (SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05).
 *
 * Fetches 12 Wahapedia CSVs, parses them, strips HTML, then calls the
 * `bulk_sync_rules` Tauri command which runs a single native SQLite transaction.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";
import { parseWahapediaCsv } from "@/lib/parseWahapediaCsv";
import { stripHtml } from "@/lib/stripHtml";
import { RULES_SYNC_META_KEY } from "@/hooks/useDatasheet";
import { validateCsvHeaders } from "@/lib/validateCsvHeaders";
import { insertSyncError } from "@/db/queries/syncErrors";
import type { InsertSyncErrorInput } from "@/db/queries/syncErrors";
import { capturePreSyncSnapshot, getLatestSnapshot } from "@/db/queries/rulesSnapshot";
import { SYNC_ERRORS_KEY } from "@/hooks/useSyncErrors";
import { getRulesSyncMeta } from "@/db/queries/datasheets";
import { computeSyncDiff } from "@/lib/computeSyncDiff";
import type { SyncDiff, ExtendedSnapshotData } from "@/lib/computeSyncDiff";
import { getRulesDb } from "@/db/rules-client";
import { computePointsDelta } from "@/lib/computePointsDelta";
import type { PointsDelta } from "@/types/pointsDelta";
import { replaceSyncedUnitPoints } from "@/db/queries/syncedUnitPoints";
import { insertPointsImportHistory } from "@/db/queries/pointsImportHistory";

/** Mirrors the Rust SyncResult struct returned by bulk_sync_rules via Tauri IPC. */
interface RustSyncResult {
  factions: number;
  sources: number;
  datasheets: number;
  models: number;
  abilities: number;
  keywords: number;
  wargear: number;
  shared_abilities: number;
  stratagems: number;
  detachments: number;
  detachment_abilities: number;
  points: number;
}

const WAHAPEDIA_BASE = "https://wahapedia.ru/wh40k10ed";

export const RULES_SYNC_FILES = [
  "Factions.csv",
  "Source.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
  "Abilities.csv",
  "Stratagems.csv",
  "Detachments.csv",
  "Detachment_abilities.csv",
  "Last_update.csv",
] as const;

async function fetchCsv(filename: string): Promise<string> {
  const response = await fetch(`${WAHAPEDIA_BASE}/${filename}`, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/csv,text/plain,*/*",
      "Referer": "https://wahapedia.ru/",
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${filename}: HTTP ${response.status}`);
  return response.text();
}

function parseLastUpdate(raw: string): string {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return "";
  const parts = lines[1].split("|");
  return parts[0]?.trim() ?? "";
}

export function useRulesSync() {
  const qc = useQueryClient();

  return useMutation<{ wahapediaVersion: string; rowCounts: Record<string, number>; diff: SyncDiff; pointsDelta: PointsDelta }, Error, void>({
    mutationFn: async () => {
      // SAF-02: Safety backup before any sync operation — abort sync if fails
      await invoke("create_safety_backup");

      const [
        factionsRaw, sourcesRaw, dsRaw, modelsRaw, abilitiesRaw, keywordsRaw,
        wargearRaw, sharedAbilitiesRaw, stratagemsRaw, detachmentsRaw,
        detachmentAbilitiesRaw, lastUpdateRaw,
      ] = await Promise.all(RULES_SYNC_FILES.map((f) => fetchCsv(f)));

      const factions       = parseWahapediaCsv(factionsRaw);
      const sources        = parseWahapediaCsv(sourcesRaw);
      const datasheets     = parseWahapediaCsv(dsRaw);
      const models         = parseWahapediaCsv(modelsRaw);
      const abilities      = parseWahapediaCsv(abilitiesRaw);
      const keywords       = parseWahapediaCsv(keywordsRaw);
      const wargear        = parseWahapediaCsv(wargearRaw);
      const sharedAbils    = parseWahapediaCsv(sharedAbilitiesRaw);
      const stratagems     = parseWahapediaCsv(stratagemsRaw);
      const detachments    = parseWahapediaCsv(detachmentsRaw);
      const detachAbils    = parseWahapediaCsv(detachmentAbilitiesRaw);
      const wahapediaVersion = parseLastUpdate(lastUpdateRaw);

      // Graceful points CSV fetch — separate from Promise.all so 404 does not
      // fail the entire sync (D-18, T-65-04). Wahapedia may not have this file.
      let pointsRows: Record<string, string>[] = [];
      try {
        const pointsRaw = await fetchCsv("Datasheets_points.csv");
        const parsed = parseWahapediaCsv(pointsRaw);
        if (parsed.length > 0) {
          validateCsvHeaders("Datasheets_points.csv", parsed);
          pointsRows = parsed;
        }
      } catch {
        // Points CSV unavailable (404 or parse error) — sync proceeds without points
        console.warn("[useRulesSync] Datasheets_points.csv not available — skipping points import");
      }

      // Validate CSV headers before any data transformation (SYNC-03)
      validateCsvHeaders("Factions.csv", factions);
      validateCsvHeaders("Source.csv", sources);
      validateCsvHeaders("Datasheets.csv", datasheets);
      validateCsvHeaders("Datasheets_models.csv", models);
      validateCsvHeaders("Datasheets_abilities.csv", abilities);
      validateCsvHeaders("Datasheets_keywords.csv", keywords);
      validateCsvHeaders("Datasheets_wargear.csv", wargear);
      validateCsvHeaders("Abilities.csv", sharedAbils);
      validateCsvHeaders("Stratagems.csv", stratagems);
      validateCsvHeaders("Detachments.csv", detachments);
      validateCsvHeaders("Detachment_abilities.csv", detachAbils);

      // Strip HTML before sending to Rust
      const datasheetRows = datasheets.map((d) => ({
        ...d,
        damaged_description: d.damaged_description ? stripHtml(d.damaged_description) : "",
      }));
      const abilityRows = abilities.map((a) => ({
        ...a,
        name: stripHtml(a.name || ""),
        description: a.description ? stripHtml(a.description) : "",
      }));
      const wargearRows = wargear.map((w) => ({
        ...w,
        description: w.description ? stripHtml(w.description) : "",
      }));
      const sharedAbilRows = sharedAbils.map((a) => ({
        ...a,
        description: a.description ? stripHtml(a.description) : "",
      }));
      const stratagemRows = stratagems.map((s) => ({
        ...s,
        description: s.description ? stripHtml(s.description) : "",
        legend: s.legend ? stripHtml(s.legend) : "",
      }));
      const detachAbilRows = detachAbils.map((a) => ({
        ...a,
        description: a.description ? stripHtml(a.description) : "",
        legend: a.legend ? stripHtml(a.legend) : "",
      }));

      // Read pre-sync snapshot for diff computation BEFORE capturing new snapshot (OVRD-06, OVRD-07)
      let preSyncSnapshotData: string | null = null;
      let preSyncModelsData: string | null = null;
      let preSyncKeywordsData: string | null = null;
      let preSyncAbilitiesData: string | null = null;
      try {
        const existingSnapshot = await getLatestSnapshot();
        preSyncSnapshotData = existingSnapshot.find((r) => r.table_name === "rw_datasheets")?.snapshot_data ?? null;
        preSyncModelsData = existingSnapshot.find((r) => r.table_name === "rw_datasheet_models")?.snapshot_data ?? null;
        preSyncKeywordsData = existingSnapshot.find((r) => r.table_name === "rw_datasheet_keywords")?.snapshot_data ?? null;
        preSyncAbilitiesData = existingSnapshot.find((r) => r.table_name === "rw_datasheet_abilities")?.snapshot_data ?? null;
      } catch {
        // First sync ever — no snapshot exists yet
      }

      // Pre-sync points snapshot for delta computation (D-14)
      let preSyncPointsMap: Record<string, number> = {};
      try {
        const rulesDb = await getRulesDb();
        const pointsSnap = await rulesDb.select<{ datasheet_name: string; faction_id: string | null; points: number }[]>(
          "SELECT datasheet_name, faction_id, points FROM rw_datasheet_points ORDER BY datasheet_name",
          [],
        );
        for (const row of pointsSnap) {
          preSyncPointsMap[`${row.datasheet_name}:${row.faction_id}`] = row.points;
        }
      } catch {
        // First sync or table doesn't exist yet — empty map is correct
      }

      // META-06: Capture pre-sync snapshot before Rust deletes all rows
      try {
        const currentMeta = await getRulesSyncMeta();
        await capturePreSyncSnapshot(currentMeta?.wahapedia_version);
      } catch (e) {
        // Non-blocking: snapshot failure must not prevent sync
        console.warn("[useRulesSync] snapshot capture failed — proceeding with sync:", e);
      }

      const rustResult = await invoke<RustSyncResult>("bulk_sync_rules", {
        payload: {
          factions,
          sources,
          datasheets: datasheetRows,
          models,
          abilities: abilityRows,
          keywords,
          wargear: wargearRows,
          shared_abilities: sharedAbilRows,
          stratagems: stratagemRows,
          detachments,
          detachment_abilities: detachAbilRows,
          points: pointsRows,
          last_sync_at: new Date().toISOString(),
          wahapedia_version: wahapediaVersion,
        },
      });

      // Compute post-sync diff (OVRD-06, OVRD-07)
      let diff: SyncDiff = { added: [], removed: [], renamed: [], modified: [], total_changed: 0 };
      try {
        const rulesDb = await getRulesDb();
        const currentDatasheets = await rulesDb.select<{ id: string; name: string }[]>(
          "SELECT id, name FROM rw_datasheets ORDER BY id",
          [],
        );

        // Query current post-sync state for per-field diff (Phase 47 — OVRD-06)
        const [currentModels, currentKeywords, currentAbilities] = await Promise.all([
          rulesDb.select<Record<string, unknown>[]>(
            "SELECT datasheet_id, line, name, M, T, Sv, inv_sv, W, Ld, OC FROM rw_datasheet_models ORDER BY datasheet_id, line",
            [],
          ),
          rulesDb.select<Record<string, unknown>[]>(
            "SELECT datasheet_id, keyword, is_faction_keyword FROM rw_datasheet_keywords ORDER BY datasheet_id, keyword",
            [],
          ),
          rulesDb.select<Record<string, unknown>[]>(
            "SELECT datasheet_id, line, ability_id, name, description, type FROM rw_datasheet_abilities ORDER BY datasheet_id, line",
            [],
          ),
        ]);

        const extended: ExtendedSnapshotData = {
          models: { before: preSyncModelsData, after: JSON.stringify(currentModels) },
          keywords: { before: preSyncKeywordsData, after: JSON.stringify(currentKeywords) },
          abilities: { before: preSyncAbilitiesData, after: JSON.stringify(currentAbilities) },
        };

        diff = computeSyncDiff(preSyncSnapshotData, currentDatasheets, extended);
      } catch {
        // Diff is best-effort; sync itself succeeded
        console.warn("[useRulesSync] diff computation failed");
      }

      // Post-sync points: read new state, compute delta, populate cache, log history (PI-02, PI-04)
      let pointsDelta: PointsDelta = { added: 0, removed: 0, changed: 0, details: [] };
      try {
        const rulesDb = await getRulesDb();
        const afterPointsRows = await rulesDb.select<{ datasheet_name: string; faction_id: string | null; points: number }[]>(
          "SELECT datasheet_name, faction_id, points FROM rw_datasheet_points ORDER BY datasheet_name",
          [],
        );

        // Build afterPointsMap
        const afterPointsMap: Record<string, number> = {};
        const cacheRows: Array<{ unit_name: string; faction_id: string | null; points: number }> = [];
        for (const row of afterPointsRows) {
          afterPointsMap[`${row.datasheet_name}:${row.faction_id}`] = row.points;
          cacheRows.push({ unit_name: row.datasheet_name, faction_id: row.faction_id, points: row.points });
        }

        // Compute delta
        pointsDelta = computePointsDelta(preSyncPointsMap, afterPointsMap);

        // Populate synced_unit_points cache in hobbyforge.db
        await replaceSyncedUnitPoints(cacheRows, new Date().toISOString());

        // Store delta in points_import_history
        await insertPointsImportHistory({
          source_file: "Datasheets_points.csv",
          version: wahapediaVersion,
          row_count: afterPointsRows.length,
          delta_added: pointsDelta.added,
          delta_removed: pointsDelta.removed,
          delta_changed: pointsDelta.changed,
        });
      } catch {
        // Points processing is best-effort — sync itself succeeded
        console.warn("[useRulesSync] points post-processing failed");
      }

      return {
        wahapediaVersion,
        rowCounts: {
          factions: rustResult.factions,
          sources: rustResult.sources,
          datasheets: rustResult.datasheets,
          models: rustResult.models,
          abilities: rustResult.abilities,
          keywords: rustResult.keywords,
          wargear: rustResult.wargear,
          shared_abilities: rustResult.shared_abilities,
          stratagems: rustResult.stratagems,
          detachments: rustResult.detachments,
          detachment_abilities: rustResult.detachment_abilities,
          points: rustResult.points,
        },
        diff,
        pointsDelta,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RULES_SYNC_META_KEY });
      qc.invalidateQueries({ queryKey: ["datasheets-by-faction"], exact: false });
      qc.invalidateQueries({ queryKey: ["datasheet"], exact: false });
      // Phase 44 additions — Phase 43 query keys (SYNC-05)
      qc.invalidateQueries({ queryKey: ["stratagems-by-faction"], exact: false });
      qc.invalidateQueries({ queryKey: ["detachments-by-faction"], exact: false });
      qc.invalidateQueries({ queryKey: ["detachment-abilities"], exact: false });
      qc.invalidateQueries({ queryKey: ["shared-abilities-by-faction"], exact: false });
      qc.invalidateQueries({ queryKey: SYNC_ERRORS_KEY });
      // Phase 52 — new rules.db query keys
      qc.invalidateQueries({ queryKey: ["detachment-by-id"], exact: false });
      qc.invalidateQueries({ queryKey: ["stratagems-by-detachment"], exact: false });
      // Phase 65 — invalidate army list caches since effective_points may change (D-20)
      qc.invalidateQueries({ queryKey: ["army-lists"], exact: false });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"], exact: false });
      // NOTE: do NOT add rules-favorites or rules-notes here —
      // they live in hobbyforge.db and survive sync unchanged.
    },
    onError: async (err: Error) => {
      const message = err.message ?? "Unknown sync error";
      let errorType: InsertSyncErrorInput["error_type"] = "sync_error";
      if (message.includes("Failed to fetch") || message.includes("HTTP")) {
        errorType = "fetch_failed";
      } else if (message.includes("missing required columns") || message.includes("CSV is empty")) {
        errorType = "validation_error";
      }
      const csvFileMatch = message.match(/^([A-Za-z_]+\.csv):/);
      try {
        await insertSyncError({
          occurred_at: new Date().toISOString(),
          error_type: errorType,
          message,
          csv_file: csvFileMatch?.[1] ?? null,
        });
      } catch {
        // Fire-and-forget: toast is the primary user feedback. DB write failure is non-critical.
        console.error("[useRulesSync] failed to log sync error to DB");
      }
      qc.invalidateQueries({ queryKey: SYNC_ERRORS_KEY });
    },
  });
}
