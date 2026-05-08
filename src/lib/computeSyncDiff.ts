/**
 * Phase 46/47 — Post-sync diff computation (OVRD-06, OVRD-07).
 *
 * Compares the pre-sync snapshot of rw_datasheets (stored as JSON in
 * rules_snapshot.snapshot_data) against the current post-sync state.
 *
 * Pure function — no database access, no side effects. Input comes from:
 * - snapshotData: rules_snapshot.snapshot_data for table_name='rw_datasheets'
 * - currentDatasheets: SELECT id, name FROM rw_datasheets after sync
 * - extended (optional): full row snapshots for models, keywords, abilities
 *   enabling per-field change detection (Phase 47, OVRD-06 gap closure)
 *
 * Used in Plan 02 to surface a post-sync change summary in the PlaybookTab
 * sync section, so users can see which datasheets were added/removed/renamed
 * or had specific fields changed by the latest Wahapedia update.
 */

// ── Internal row types ────────────────────────────────────────────────────────

interface ModelRow {
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

interface KeywordRow {
  datasheet_id: string;
  keyword: string;
  is_faction_keyword: number;
}

interface AbilityRow {
  datasheet_id: string;
  line: number;
  ability_id: string | null;
  name: string;
  description: string | null;
  type: string | null;
}

const STAT_FIELDS = ["M", "T", "Sv", "inv_sv", "W", "Ld", "OC"] as const;

// ── Exported interfaces ───────────────────────────────────────────────────────

export interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface ModifiedDatasheet {
  id: string;
  name: string;
  changes: FieldChange[];
}

/**
 * Optional extended snapshot data for per-field comparison.
 * Each entry holds before (pre-sync snapshot JSON) and after (post-sync JSON).
 * Omitting this parameter or passing undefined produces an empty `modified` array.
 */
export interface ExtendedSnapshotData {
  models?: { before: string | null; after: string | null };
  keywords?: { before: string | null; after: string | null };
  abilities?: { before: string | null; after: string | null };
}

export interface SyncDiff {
  added: { id: string; name: string }[];
  removed: { id: string; name: string }[];
  renamed: { id: string; oldName: string; newName: string }[];
  modified: ModifiedDatasheet[];
  total_changed: number;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const arr = map.get(key);
    if (arr) arr.push(item);
    else map.set(key, [item]);
  }
  return map;
}

// ── Per-field comparison helpers ──────────────────────────────────────────────

function compareModels(
  beforeJson: string | null,
  afterJson: string | null,
  persistedIds: Set<string>,
): Map<string, FieldChange[]> {
  const changes = new Map<string, FieldChange[]>();
  if (!beforeJson || !afterJson) return changes;

  const before: ModelRow[] = JSON.parse(beforeJson);
  const after: ModelRow[] = JSON.parse(afterJson);

  const beforeByDs = groupBy(before, (r) => r.datasheet_id);
  const afterByDs = groupBy(after, (r) => r.datasheet_id);

  for (const dsId of persistedIds) {
    const bLines = beforeByDs.get(dsId) ?? [];
    const aLines = afterByDs.get(dsId) ?? [];
    const dsChanges: FieldChange[] = [];

    const bByLine = new Map(bLines.map((r) => [r.line, r]));
    const aByLine = new Map(aLines.map((r) => [r.line, r]));

    for (const [line, aRow] of aByLine) {
      const bRow = bByLine.get(line);
      if (!bRow) continue; // new line — structural change, not a field change

      const lineLabel = aLines.length > 1 && aRow.name ? ` (${aRow.name})` : "";
      for (const stat of STAT_FIELDS) {
        const oldVal = String(bRow[stat] ?? "");
        const newVal = String(aRow[stat] ?? "");
        if (oldVal !== newVal) {
          dsChanges.push({
            field: `${stat}${lineLabel}`,
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      }
    }

    if (dsChanges.length > 0) changes.set(dsId, dsChanges);
  }
  return changes;
}

function compareKeywords(
  beforeJson: string | null,
  afterJson: string | null,
  persistedIds: Set<string>,
): Map<string, FieldChange[]> {
  const changes = new Map<string, FieldChange[]>();
  if (!beforeJson || !afterJson) return changes;

  const before: KeywordRow[] = JSON.parse(beforeJson);
  const after: KeywordRow[] = JSON.parse(afterJson);

  const beforeByDs = groupBy(before, (r) => r.datasheet_id);
  const afterByDs = groupBy(after, (r) => r.datasheet_id);

  for (const dsId of persistedIds) {
    const bKeywords = new Set((beforeByDs.get(dsId) ?? []).map((r) => r.keyword));
    const aKeywords = new Set((afterByDs.get(dsId) ?? []).map((r) => r.keyword));
    const dsChanges: FieldChange[] = [];

    for (const kw of aKeywords) {
      if (!bKeywords.has(kw)) {
        dsChanges.push({ field: kw, oldValue: "", newValue: kw });
      }
    }
    for (const kw of bKeywords) {
      if (!aKeywords.has(kw)) {
        dsChanges.push({ field: kw, oldValue: kw, newValue: "" });
      }
    }

    if (dsChanges.length > 0) changes.set(dsId, dsChanges);
  }
  return changes;
}

function compareAbilities(
  beforeJson: string | null,
  afterJson: string | null,
  persistedIds: Set<string>,
): Map<string, FieldChange[]> {
  const changes = new Map<string, FieldChange[]>();
  if (!beforeJson || !afterJson) return changes;

  const before: AbilityRow[] = JSON.parse(beforeJson);
  const after: AbilityRow[] = JSON.parse(afterJson);

  const beforeByDs = groupBy(before, (r) => r.datasheet_id);
  const afterByDs = groupBy(after, (r) => r.datasheet_id);

  for (const dsId of persistedIds) {
    const bNames = new Set((beforeByDs.get(dsId) ?? []).map((r) => r.name));
    const aNames = new Set((afterByDs.get(dsId) ?? []).map((r) => r.name));
    const dsChanges: FieldChange[] = [];

    for (const name of aNames) {
      if (!bNames.has(name)) {
        dsChanges.push({ field: name, oldValue: "", newValue: name });
      }
    }
    for (const name of bNames) {
      if (!aNames.has(name)) {
        dsChanges.push({ field: name, oldValue: name, newValue: "" });
      }
    }

    if (dsChanges.length > 0) changes.set(dsId, dsChanges);
  }
  return changes;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Compute the diff between a pre-sync snapshot and the post-sync state.
 *
 * @param snapshotData - JSON string of [{id, name}] from rules_snapshot for
 *   table_name='rw_datasheets', or null if no snapshot exists (first sync).
 * @param currentDatasheets - Current rw_datasheets rows after sync completes.
 * @param extended - Optional per-field snapshot data for models, keywords, and
 *   abilities. When provided, populates the `modified` array with per-field
 *   changes for datasheets that persisted between syncs.
 * @returns SyncDiff with empty arrays when snapshotData is null (no baseline).
 */
export function computeSyncDiff(
  snapshotData: string | null,
  currentDatasheets: { id: string; name: string }[],
  extended?: ExtendedSnapshotData,
): SyncDiff {
  if (!snapshotData) {
    return { added: [], removed: [], renamed: [], modified: [], total_changed: 0 };
  }

  const before: { id: string; name: string }[] = JSON.parse(snapshotData);
  const beforeMap = new Map(before.map((d) => [d.id, d.name]));
  const afterMap = new Map(currentDatasheets.map((d) => [d.id, d.name]));

  const added = currentDatasheets.filter((d) => !beforeMap.has(d.id));
  const removed = before.filter((d) => !afterMap.has(d.id));
  const renamed = currentDatasheets
    .filter((d) => {
      const oldName = beforeMap.get(d.id);
      return oldName !== undefined && oldName !== d.name;
    })
    .map((d) => ({
      id: d.id,
      oldName: beforeMap.get(d.id)!,
      newName: d.name,
    }));

  // Persisted datasheets: present in both snapshot and current with the SAME name
  // (renamed datasheets are already in the `renamed` array — exclude them here)
  const persistedIds = new Set(
    currentDatasheets
      .filter((d) => beforeMap.has(d.id) && beforeMap.get(d.id) === d.name)
      .map((d) => d.id),
  );

  // Per-field comparison for persisted datasheets (OVRD-06 Phase 47)
  const modified: ModifiedDatasheet[] = [];
  if (extended) {
    const statChanges = compareModels(
      extended.models?.before ?? null,
      extended.models?.after ?? null,
      persistedIds,
    );
    const kwChanges = compareKeywords(
      extended.keywords?.before ?? null,
      extended.keywords?.after ?? null,
      persistedIds,
    );
    const abilChanges = compareAbilities(
      extended.abilities?.before ?? null,
      extended.abilities?.after ?? null,
      persistedIds,
    );

    // Merge changes by datasheet ID
    const allDsIds = new Set([
      ...statChanges.keys(),
      ...kwChanges.keys(),
      ...abilChanges.keys(),
    ]);

    for (const dsId of allDsIds) {
      const dsName = afterMap.get(dsId) ?? dsId;
      const changes = [
        ...(statChanges.get(dsId) ?? []),
        ...(kwChanges.get(dsId) ?? []),
        ...(abilChanges.get(dsId) ?? []),
      ];
      if (changes.length > 0) {
        modified.push({ id: dsId, name: dsName, changes });
      }
    }
  }

  return {
    added,
    removed,
    renamed,
    modified,
    total_changed: added.length + removed.length + renamed.length + modified.length,
  };
}
