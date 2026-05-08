/**
 * Phase 46 — computeSyncDiff pure function tests (OVRD-06, OVRD-07).
 *
 * Pure function — no mocks needed. All tests use inline data.
 */
import { describe, it, expect } from "vitest";
import { computeSyncDiff } from "@/lib/computeSyncDiff";
import type { SyncDiff } from "@/lib/computeSyncDiff";

// ── Helpers ────────────────────────────────────────────────────────────────

function ds(id: string, name: string) {
  return { id, name };
}

function snap(items: { id: string; name: string }[]): string {
  return JSON.stringify(items);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("computeSyncDiff", () => {
  // Edge case: null snapshotData — no baseline to compare against
  it("OVRD-06: returns empty diff when snapshotData is null", () => {
    const result = computeSyncDiff(null, [ds("1", "Space Marines")]);
    expect(result).toEqual<SyncDiff>({
      added: [],
      removed: [],
      renamed: [],
      modified: [],
      total_changed: 0,
    });
  });

  // Edge case: identical sets — nothing changed
  it("OVRD-06: returns empty diff when snapshot and current are identical", () => {
    const items = [ds("1", "Alpha"), ds("2", "Beta")];
    const result = computeSyncDiff(snap(items), items);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.renamed).toHaveLength(0);
    expect(result.total_changed).toBe(0);
  });

  // Added: present in current but not in snapshot
  it("OVRD-06: detects added datasheets (present in current, absent in snapshot)", () => {
    const before = [ds("1", "Alpha"), ds("2", "Beta")];
    const after = [ds("1", "Alpha"), ds("2", "Beta"), ds("3", "Gamma")];
    const result = computeSyncDiff(snap(before), after);
    expect(result.added).toHaveLength(1);
    expect(result.added[0]).toEqual(ds("3", "Gamma"));
    expect(result.removed).toHaveLength(0);
    expect(result.renamed).toHaveLength(0);
    expect(result.total_changed).toBe(1);
  });

  // Removed: present in snapshot but not in current
  it("OVRD-06: detects removed datasheets (present in snapshot, absent in current)", () => {
    const before = [ds("1", "Alpha"), ds("2", "Beta"), ds("3", "Gamma")];
    const after = [ds("1", "Alpha"), ds("2", "Beta")];
    const result = computeSyncDiff(snap(before), after);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]).toEqual(ds("3", "Gamma"));
    expect(result.added).toHaveLength(0);
    expect(result.renamed).toHaveLength(0);
    expect(result.total_changed).toBe(1);
  });

  // Renamed: same id, different name
  it("OVRD-06: detects renamed datasheets (same id, different name)", () => {
    const before = [ds("1", "Alpha")];
    const after = [ds("1", "Beta")];
    const result = computeSyncDiff(snap(before), after);
    expect(result.renamed).toHaveLength(1);
    expect(result.renamed[0]).toEqual({ id: "1", oldName: "Alpha", newName: "Beta" });
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.total_changed).toBe(1);
  });

  // Mixed: added, removed, and renamed simultaneously
  it("OVRD-07: handles mixed scenario (added + removed + renamed simultaneously)", () => {
    // Before: A(1), B(2), C(3, name="Charlie")
    // After:  A(1), D(4, new), C(3, name="Charlie-Renamed") — B removed, D added, C renamed
    const before = [ds("1", "Alpha"), ds("2", "Beta"), ds("3", "Charlie")];
    const after = [ds("1", "Alpha"), ds("4", "Delta"), ds("3", "Charlie-Renamed")];
    const result = computeSyncDiff(snap(before), after);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]).toEqual(ds("2", "Beta"));
    expect(result.added).toHaveLength(1);
    expect(result.added[0]).toEqual(ds("4", "Delta"));
    expect(result.renamed).toHaveLength(1);
    expect(result.renamed[0]).toEqual({ id: "3", oldName: "Charlie", newName: "Charlie-Renamed" });
    expect(result.total_changed).toBe(3);
  });

  // total_changed is always the sum of all three arrays
  it("OVRD-07: total_changed equals added.length + removed.length + renamed.length", () => {
    const before = [ds("1", "A"), ds("2", "B"), ds("3", "C")];
    // Add D(4), remove B(2), rename C(3) -> CX
    const after = [ds("1", "A"), ds("4", "D"), ds("3", "CX")];
    const result = computeSyncDiff(snap(before), after);
    expect(result.total_changed).toBe(
      result.added.length + result.removed.length + result.renamed.length,
    );
    expect(result.total_changed).toBe(3);
  });

  // Empty snapshot, non-empty current — all current are "added"
  it("OVRD-06: all current datasheets appear as added when snapshot is empty array", () => {
    const result = computeSyncDiff(snap([]), [ds("1", "Alpha"), ds("2", "Beta")]);
    expect(result.added).toHaveLength(2);
    expect(result.removed).toHaveLength(0);
    expect(result.renamed).toHaveLength(0);
    expect(result.total_changed).toBe(2);
  });
});
