/**
 * Phase 15 — TypeScript types for rules.db rows + import payload.
 *
 * Rules:
 * - All IDs are TEXT in Wahapedia (zero-padded 9-digit strings) — typed `string`.
 * - Stats M / Sv / Ld are stored as TEXT in raw form ("6\"", "3+", "6+") because
 *   Wahapedia includes the suffix. UI strips/parses on display.
 * - is_faction_keyword is stored as 0|1 INTEGER in SQLite (converted from
 *   Wahapedia's "true"/"false" string at sync time).
 * - Field names mirror SQLite column names exactly (snake_case) — same convention
 *   as types/strategyNote.ts.
 */

export interface RwFaction {
  id: string;
  name: string;
}

export interface RwDatasheet {
  id: string;
  name: string;
  faction_id: string | null;
  source_id: string | null;
  role: string | null;
  damaged_w: string | null;
  damaged_description: string | null;
}

export interface RwDatasheetModel {
  datasheet_id: string;
  line: number;
  name: string | null;
  M: string | null;
  T: number | null;
  Sv: string | null;
  inv_sv: string | null;
  W: number | null;
  Ld: string | null;
  OC: number | null;
}

export interface RwDatasheetAbility {
  datasheet_id: string;
  line: number;
  ability_id: string | null;
  name: string;
  description: string | null;
  type: string | null;       // "Core", "Faction", "Datasheet", "Wargear", "Primarch", etc.
  parameter: string | null;
}

export interface RwDatasheetKeyword {
  datasheet_id: string;
  keyword: string;
  is_faction_keyword: 0 | 1;
}

export interface RwSource {
  id: string;
  name: string;
  type: string | null;
  edition: number | null;
  version: string | null;
  errata_date: string | null;
}

export interface RulesSyncMeta {
  id: 1;
  last_sync_at: string | null;
  wahapedia_version: string | null;
}

/** Weapon stat line from Datasheets_wargear.csv. */
export interface RwDatasheetWargear {
  datasheet_id: string;
  line: number;
  line_in_wargear: number;
  dice: string | null;
  name: string;
  description: string | null;  // special rules text (HTML stripped)
  range: string | null;        // e.g. "24", "Melee"
  type: string | null;         // "Ranged" | "Melee"
  A: string | null;
  BS_WS: string | null;        // e.g. "3" (display as "3+")
  S: string | null;
  AP: string | null;           // e.g. "0", "-1"
  D: string | null;
}

/** Shared faction-wide ability from Abilities.csv. */
export interface RwAbility {
  id: string;
  name: string;
  legend: string | null;
  faction_id: string | null;
  description: string | null;
}

/** Stratagem from rw_stratagems (synced from Stratagems.csv). */
export interface RwStratagem {
  id: string;
  faction_id: string | null;
  name: string;
  type: string | null;
  cp_cost: string | null;
  legend: string | null;
  turn: string | null;
  phase: string | null;
  detachment: string | null;
  detachment_id: string | null;
  description: string | null;
}

/** Detachment from rw_detachments (synced from Detachments.csv). */
export interface RwDetachment {
  id: string;
  faction_id: string | null;
  name: string;
  legend: string | null;
  type: string | null;
}

/** Detachment ability from rw_detachment_abilities (synced from Detachment_abilities.csv). */
export interface RwDetachmentAbility {
  id: string;
  faction_id: string | null;
  name: string;
  legend: string | null;
  description: string | null;
  detachment: string | null;
  detachment_id: string | null;
}

/** Lightweight projection used by the DatasheetPicker faction-filtered list. */
export interface DatasheetSummary {
  id: string;
  name: string;
  role: string | null;
}

/** Full payload returned by getFullDatasheet — rendered in PlaybookTab. */
export interface FullDatasheet {
  ds: RwDatasheet;
  models: RwDatasheetModel[];
  abilities: RwDatasheetAbility[];
  keywords: RwDatasheetKeyword[];
  source: RwSource | null;
  wargear: RwDatasheetWargear[];
}

/**
 * Conflict descriptor consumed by DatasheetImportDialog (UI-SPEC §Conflict Resolution Flow).
 * One entry per field where BOTH the current Playbook value AND the incoming datasheet
 * value are non-empty AND differ. Default choice is "use" (datasheet wins).
 */
export interface DatasheetConflict {
  /** Stable key identifying the field — used for state lookup. */
  key:
    | "M" | "T" | "Sv" | "W" | "Ld" | "OC"
    | "abilities" | "keywords";
  /** Human-friendly label rendered in the dialog row. */
  label: string;
  /** The user's existing PlaybookTab value (string-coerced for display). */
  currentValue: string;
  /** The incoming Wahapedia value (string-coerced for display). */
  incomingValue: string;
  /** Per-field decision; defaults to "use" (datasheet wins) per UI-SPEC. */
  choice: "keep" | "use";
}

/** Resolved selection map returned by DatasheetImportDialog onConfirm. */
export type DatasheetImportResolution = Record<DatasheetConflict["key"], "keep" | "use">;

/**
 * Payload passed from PlaybookTab → CollectionPage → DatasheetImportDialog when
 * a conflict is detected at import time. Carries the FullDatasheet plus the
 * already-derived conflict list. Non-conflicting fields are applied directly
 * (without dialog) before this payload is dispatched.
 */
export interface DatasheetImportPayload {
  unitId: number;
  datasheet: FullDatasheet;
  conflicts: DatasheetConflict[];
}
