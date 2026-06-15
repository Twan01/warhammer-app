/**
 * exportRoster — assemble all data needed for a full battle-ready roster PDF.
 *
 * Orchestrates:
 *  - Deduplication of units by udb_unit_id (or ghost key)
 *  - Single fetch per distinct udb_unit_id (Map cache, T-h48-02 mitigation)
 *  - Enhancement-to-unit mapping
 *  - Detachment section assembly (rule + stratagems + assigned enhancements)
 *
 * Pure assembly: no jsPDF, no rendering. All DB calls are injected via `deps`
 * so tests can provide mocks without hitting SQLite.
 */

import type { ArmyList, ArmyListUnitRow, ArmyListEnhancement } from "@/types/armyList";
import type { UdbUnitDetail } from "@/db/queries/unitDatabase";
import type { UdbStratagem, UdbDetachmentAbility } from "@/types/gameData";
import type { ExportData } from "@/lib/exportArmyList";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RosterDatasheet {
  /** Display name (first-seen unit_name for ghost; UDB name otherwise). */
  displayName: string;
  /** Number of army list units sharing this profile key. */
  count: number;
  /** Sum of effective_points for all instances. */
  points: number;
  /** Full UDB detail, or null when unavailable / ghost unit. */
  detail: UdbUnitDetail | null;
  /** True when udb_unit_id is null (ghost/planned unit). */
  isGhost: boolean;
}

export interface RosterEnhancement {
  name: string;
  points: number;
  /** Display name of the unit this enhancement was assigned to. Falls back to "—". */
  onUnit: string;
}

export interface RosterDetachment {
  detachmentName: string;
  abilities: UdbDetachmentAbility[];
  stratagems: UdbStratagem[];
  enhancements: RosterEnhancement[];
}

export interface RosterData {
  /** Passthrough: the ExportData built by formatArmyListForExport (Section A source). */
  summary: ExportData;
  /** Deduped datasheets in first-seen order. */
  datasheets: RosterDatasheet[];
  /** Detachment section, or null when detachment_id is not set on the list. */
  detachment: RosterDetachment | null;
}

// ---------------------------------------------------------------------------
// Dep injection types (for testability)
// ---------------------------------------------------------------------------

interface AssembleRosterDeps {
  getUdbUnitDetail: (id: string, locale?: "en" | "fr") => Promise<UdbUnitDetail | null>;
  getStratagemsByDetachment: (detachmentId: string) => Promise<UdbStratagem[]>;
  getDetachmentAbilitiesByDetachment: (detachmentId: string) => Promise<UdbDetachmentAbility[]>;
}

// ---------------------------------------------------------------------------
// assembleRoster
// ---------------------------------------------------------------------------

/**
 * Build a RosterData object for the given army list.
 *
 * @param opts.list            The army list record.
 * @param opts.units           All army_list_unit rows for this list.
 * @param opts.enhancements    All enhancement rows for this list.
 * @param opts.summary         Pre-built ExportData from formatArmyListForExport (Section A).
 * @param opts.locale          Locale for UDB name lookup.
 * @param opts.deps            Injected DB functions (default: real query-module imports).
 */
export async function assembleRoster(opts: {
  list: ArmyList;
  units: ArmyListUnitRow[];
  enhancements: ArmyListEnhancement[];
  summary: ExportData;
  locale: "en" | "fr";
  deps?: Partial<AssembleRosterDeps>;
}): Promise<RosterData> {
  const { list, units, enhancements, summary, locale } = opts;

  // Resolve deps — default to real imports when not provided.
  // Dynamic imports allow tests to never import the DB module.
  const deps = opts.deps as AssembleRosterDeps | undefined;

  let getUdbUnitDetailFn: AssembleRosterDeps["getUdbUnitDetail"];
  let getStratagemsByDetachmentFn: AssembleRosterDeps["getStratagemsByDetachment"];
  let getDetachmentAbilitiesByDetachmentFn: AssembleRosterDeps["getDetachmentAbilitiesByDetachment"];

  if (deps?.getUdbUnitDetail) {
    getUdbUnitDetailFn = deps.getUdbUnitDetail;
  } else {
    const { getUdbUnitDetail } = await import("@/db/queries/unitDatabase");
    getUdbUnitDetailFn = getUdbUnitDetail;
  }

  if (deps?.getStratagemsByDetachment) {
    getStratagemsByDetachmentFn = deps.getStratagemsByDetachment;
  } else {
    const { getStratagemsByDetachment } = await import("@/db/queries/udbGameData");
    getStratagemsByDetachmentFn = getStratagemsByDetachment;
  }

  if (deps?.getDetachmentAbilitiesByDetachment) {
    getDetachmentAbilitiesByDetachmentFn = deps.getDetachmentAbilitiesByDetachment;
  } else {
    const { getDetachmentAbilitiesByDetachment } = await import("@/db/queries/udbGameData");
    getDetachmentAbilitiesByDetachmentFn = getDetachmentAbilitiesByDetachment;
  }

  // ── Step 1: Dedupe units before fetching (T-h48-02 mitigation) ─────────────

  // Key: udb_unit_id if present, else "ghost:<unit_name>" for ghosts
  interface DedupEntry {
    key: string;
    displayName: string;
    points: number;
    count: number;
    isGhost: boolean;
    udbUnitId: string | null;
  }

  const dedupMap = new Map<string, DedupEntry>();
  const keyOrder: string[] = [];

  for (const unit of units) {
    const isGhost = unit.udb_unit_id === null;
    const key = isGhost ? `ghost:${unit.unit_name}` : unit.udb_unit_id!;

    if (dedupMap.has(key)) {
      const entry = dedupMap.get(key)!;
      entry.count += 1;
      entry.points += unit.effective_points;
    } else {
      keyOrder.push(key);
      dedupMap.set(key, {
        key,
        displayName: unit.unit_name,
        points: unit.effective_points,
        count: 1,
        isGhost,
        udbUnitId: unit.udb_unit_id,
      });
    }
  }

  // ── Step 2: Fetch details for distinct non-ghost udb_unit_ids ──────────────

  const detailCache = new Map<string, UdbUnitDetail | null>();
  const distinctIds = keyOrder
    .map((k) => dedupMap.get(k)!)
    .filter((e) => !e.isGhost)
    .map((e) => e.udbUnitId!);

  // Fetch all in parallel for efficiency
  await Promise.all(
    distinctIds.map(async (id) => {
      const detail = await getUdbUnitDetailFn(id, locale);
      detailCache.set(id, detail);
    })
  );

  // ── Step 3: Build datasheets[] in first-seen order ─────────────────────────

  const datasheets: RosterDatasheet[] = keyOrder.map((key) => {
    const entry = dedupMap.get(key)!;
    const detail = entry.isGhost ? null : (detailCache.get(entry.udbUnitId!) ?? null);
    return {
      displayName: entry.displayName,
      count: entry.count,
      points: entry.points,
      detail,
      isGhost: entry.isGhost,
    };
  });

  // ── Step 4: Enhancement mapping (army_list_unit_id -> unit_name) ───────────

  const unitNameById = new Map<number, string>();
  for (const unit of units) {
    unitNameById.set(unit.id, unit.unit_name);
  }

  const rosterEnhancements: RosterEnhancement[] = enhancements.map((e) => ({
    name: e.enhancement_name,
    points: e.enhancement_points,
    onUnit: unitNameById.get(e.army_list_unit_id) ?? "—",
  }));

  // ── Step 5: Detachment section ─────────────────────────────────────────────

  let detachment: RosterDetachment | null = null;

  if (list.detachment_id != null) {
    const [abilities, stratagems] = await Promise.all([
      getDetachmentAbilitiesByDetachmentFn(list.detachment_id),
      getStratagemsByDetachmentFn(list.detachment_id),
    ]);

    detachment = {
      detachmentName: list.detachment_name ?? "Detachment",
      abilities,
      stratagems,
      enhancements: rosterEnhancements,
    };
  }

  return {
    summary,
    datasheets,
    detachment,
  };
}
