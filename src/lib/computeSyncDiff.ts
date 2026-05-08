/**
 * Phase 46 — Post-sync diff computation (OVRD-06, OVRD-07).
 *
 * Compares the pre-sync snapshot of rw_datasheets (stored as JSON in
 * rules_snapshot.snapshot_data) against the current post-sync state.
 *
 * Pure function — no database access, no side effects. Input comes from:
 * - snapshotData: rules_snapshot.snapshot_data for table_name='rw_datasheets'
 * - currentDatasheets: SELECT id, name FROM rw_datasheets after sync
 *
 * Used in Plan 02 to surface a post-sync change summary in the PlaybookTab
 * sync section, so users can see which datasheets were added/removed/renamed
 * by the latest Wahapedia update.
 */

export interface SyncDiff {
  added: { id: string; name: string }[];
  removed: { id: string; name: string }[];
  renamed: { id: string; oldName: string; newName: string }[];
  total_changed: number;
}

/**
 * Compute the diff between a pre-sync snapshot and the post-sync state.
 *
 * @param snapshotData - JSON string of [{id, name}] from rules_snapshot,
 *   or null if no snapshot was captured before this sync.
 * @param currentDatasheets - Current rw_datasheets rows after sync completes.
 * @returns SyncDiff with empty arrays when snapshotData is null (no baseline).
 */
export function computeSyncDiff(
  snapshotData: string | null,
  currentDatasheets: { id: string; name: string }[],
): SyncDiff {
  if (!snapshotData) {
    return { added: [], removed: [], renamed: [], total_changed: 0 };
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

  return {
    added,
    removed,
    renamed,
    total_changed: added.length + removed.length + renamed.length,
  };
}
