/**
 * Phase 46/47 — computeSyncDiff pure function tests (OVRD-06, OVRD-07).
 *
 * Pure function — no mocks needed. All tests use inline data.
 */
import { describe, it, expect } from "vitest";
import { computeSyncDiff } from "@/lib/computeSyncDiff";
import type { SyncDiff, ExtendedSnapshotData } from "@/lib/computeSyncDiff";

// ── Helpers ────────────────────────────────────────────────────────────────

function ds(id: string, name: string) {
  return { id, name };
}

function snap(items: { id: string; name: string }[]): string {
  return JSON.stringify(items);
}

function modelSnap(
  rows: Array<{
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
  }>,
): string {
  return JSON.stringify(rows);
}

function keywordSnap(
  rows: Array<{
    datasheet_id: string;
    keyword: string;
    is_faction_keyword: number;
  }>,
): string {
  return JSON.stringify(rows);
}

function abilitySnap(
  rows: Array<{
    datasheet_id: string;
    line: number;
    ability_id: string | null;
    name: string;
    description: string | null;
    type: string | null;
  }>,
): string {
  return JSON.stringify(rows);
}

/** A minimal single-line model row with sensible defaults */
function model(
  datasheet_id: string,
  line: number,
  overrides: Partial<{
    name: string | null;
    M: string | null;
    T: number | null;
    Sv: string | null;
    inv_sv: string | null;
    W: number | null;
    Ld: string | null;
    OC: number | null;
  }> = {},
) {
  return {
    datasheet_id,
    line,
    name: null,
    M: "6\"",
    T: 4,
    Sv: "3+",
    inv_sv: null,
    W: 2,
    Ld: "6+",
    OC: 1,
    ...overrides,
  };
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

// ── Phase 47 per-field diff tests ─────────────────────────────────────────────

describe("computeSyncDiff — per-field diff (Phase 47)", () => {
  // ── Stat changes ──────────────────────────────────────────────────────────

  it("detects T stat change from 5 to 6 on a persisted datasheet", () => {
    const beforeModels = modelSnap([model("ds1", 1, { T: 5 })]);
    const afterModels = modelSnap([model("ds1", 1, { T: 6 })]);
    const extended: ExtendedSnapshotData = {
      models: { before: beforeModels, after: afterModels },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha")],
      extended,
    );
    expect(result.modified).toHaveLength(1);
    expect(result.modified[0].id).toBe("ds1");
    expect(result.modified[0].name).toBe("Alpha");
    const tChange = result.modified[0].changes.find((c) => c.field === "T");
    expect(tChange).toBeDefined();
    expect(tChange?.oldValue).toBe("5");
    expect(tChange?.newValue).toBe("6");
  });

  it("detects multiple stat changes on a single-line model (W and M both change)", () => {
    const beforeModels = modelSnap([model("ds1", 1, { W: 2, M: "6\"" })]);
    const afterModels = modelSnap([model("ds1", 1, { W: 3, M: "8\"" })]);
    const extended: ExtendedSnapshotData = {
      models: { before: beforeModels, after: afterModels },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha")],
      extended,
    );
    expect(result.modified).toHaveLength(1);
    const fields = result.modified[0].changes.map((c) => c.field);
    expect(fields).toContain("M");
    expect(fields).toContain("W");
  });

  it("includes model name in parentheses in field label when datasheet has multiple model lines", () => {
    // ds1 has 2 model lines — Sergeant (line 1) and Intercessor (line 2)
    const beforeModels = modelSnap([
      model("ds1", 1, { name: "Sergeant", W: 3 }),
      model("ds1", 2, { name: "Intercessor", W: 2 }),
    ]);
    const afterModels = modelSnap([
      model("ds1", 1, { name: "Sergeant", W: 4 }), // W changed for Sergeant
      model("ds1", 2, { name: "Intercessor", W: 2 }),
    ]);
    const extended: ExtendedSnapshotData = {
      models: { before: beforeModels, after: afterModels },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha")],
      extended,
    );
    expect(result.modified).toHaveLength(1);
    const wChange = result.modified[0].changes.find((c) => c.field === "W (Sergeant)");
    expect(wChange).toBeDefined();
    expect(wChange?.oldValue).toBe("3");
    expect(wChange?.newValue).toBe("4");
  });

  // ── Keyword changes ───────────────────────────────────────────────────────

  it("detects keyword added (present in after, absent in before)", () => {
    const beforeKw = keywordSnap([
      { datasheet_id: "ds1", keyword: "INFANTRY", is_faction_keyword: 0 },
      { datasheet_id: "ds1", keyword: "IMPERIUM", is_faction_keyword: 0 },
    ]);
    const afterKw = keywordSnap([
      { datasheet_id: "ds1", keyword: "INFANTRY", is_faction_keyword: 0 },
      { datasheet_id: "ds1", keyword: "CORE", is_faction_keyword: 0 },
    ]);
    const extended: ExtendedSnapshotData = {
      keywords: { before: beforeKw, after: afterKw },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha")],
      extended,
    );
    expect(result.modified).toHaveLength(1);
    const changes = result.modified[0].changes;
    const added = changes.find((c) => c.field === "CORE");
    expect(added).toBeDefined();
    expect(added?.oldValue).toBe("");
    expect(added?.newValue).toBe("CORE");
  });

  it("detects keyword removed (present in before, absent in after)", () => {
    const beforeKw = keywordSnap([
      { datasheet_id: "ds1", keyword: "INFANTRY", is_faction_keyword: 0 },
      { datasheet_id: "ds1", keyword: "IMPERIUM", is_faction_keyword: 0 },
    ]);
    const afterKw = keywordSnap([
      { datasheet_id: "ds1", keyword: "INFANTRY", is_faction_keyword: 0 },
    ]);
    const extended: ExtendedSnapshotData = {
      keywords: { before: beforeKw, after: afterKw },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha")],
      extended,
    );
    expect(result.modified).toHaveLength(1);
    const removed = result.modified[0].changes.find((c) => c.field === "IMPERIUM");
    expect(removed).toBeDefined();
    expect(removed?.oldValue).toBe("IMPERIUM");
    expect(removed?.newValue).toBe("");
  });

  // ── Ability changes ───────────────────────────────────────────────────────

  it("detects ability added (present in after, absent in before)", () => {
    const beforeAb = abilitySnap([
      { datasheet_id: "ds1", line: 1, ability_id: "ab1", name: "Rapid Fire", description: null, type: null },
    ]);
    const afterAb = abilitySnap([
      { datasheet_id: "ds1", line: 1, ability_id: "ab1", name: "Rapid Fire", description: null, type: null },
      { datasheet_id: "ds1", line: 2, ability_id: "ab2", name: "Bolter Discipline", description: null, type: null },
    ]);
    const extended: ExtendedSnapshotData = {
      abilities: { before: beforeAb, after: afterAb },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha")],
      extended,
    );
    expect(result.modified).toHaveLength(1);
    const added = result.modified[0].changes.find((c) => c.field === "Bolter Discipline");
    expect(added).toBeDefined();
    expect(added?.oldValue).toBe("");
    expect(added?.newValue).toBe("Bolter Discipline");
  });

  it("detects ability removed (present in before, absent in after)", () => {
    const beforeAb = abilitySnap([
      { datasheet_id: "ds1", line: 1, ability_id: "ab1", name: "Rapid Fire", description: null, type: null },
      { datasheet_id: "ds1", line: 2, ability_id: "ab2", name: "Close Order", description: null, type: null },
    ]);
    const afterAb = abilitySnap([
      { datasheet_id: "ds1", line: 1, ability_id: "ab1", name: "Rapid Fire", description: null, type: null },
    ]);
    const extended: ExtendedSnapshotData = {
      abilities: { before: beforeAb, after: afterAb },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha")],
      extended,
    );
    expect(result.modified).toHaveLength(1);
    const removed = result.modified[0].changes.find((c) => c.field === "Close Order");
    expect(removed).toBeDefined();
    expect(removed?.oldValue).toBe("Close Order");
    expect(removed?.newValue).toBe("");
  });

  // ── Mixed changes on same datasheet ──────────────────────────────────────

  it("merges stats + keywords + abilities changes into one ModifiedDatasheet entry", () => {
    const beforeModels = modelSnap([model("ds1", 1, { T: 4 })]);
    const afterModels = modelSnap([model("ds1", 1, { T: 5 })]);
    const beforeKw = keywordSnap([{ datasheet_id: "ds1", keyword: "INFANTRY", is_faction_keyword: 0 }]);
    const afterKw = keywordSnap([
      { datasheet_id: "ds1", keyword: "INFANTRY", is_faction_keyword: 0 },
      { datasheet_id: "ds1", keyword: "CORE", is_faction_keyword: 0 },
    ]);
    const beforeAb = abilitySnap([]);
    const afterAb = abilitySnap([
      { datasheet_id: "ds1", line: 1, ability_id: null, name: "New Ability", description: null, type: null },
    ]);
    const extended: ExtendedSnapshotData = {
      models: { before: beforeModels, after: afterModels },
      keywords: { before: beforeKw, after: afterKw },
      abilities: { before: beforeAb, after: afterAb },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha")],
      extended,
    );
    expect(result.modified).toHaveLength(1);
    const changes = result.modified[0].changes;
    expect(changes.some((c) => c.field === "T")).toBe(true);
    expect(changes.some((c) => c.field === "CORE")).toBe(true);
    expect(changes.some((c) => c.field === "New Ability")).toBe(true);
  });

  // ── Null / missing extended data ──────────────────────────────────────────

  it("returns empty modified array when null models snapshot data is provided", () => {
    const extended: ExtendedSnapshotData = {
      models: { before: null, after: null },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha")],
      extended,
    );
    expect(result.modified).toHaveLength(0);
  });

  it("returns empty modified array when no extended param is passed (backward compat)", () => {
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha")],
    );
    expect(result.modified).toHaveLength(0);
    expect(result.total_changed).toBe(0);
  });

  // ── total_changed includes modified ──────────────────────────────────────

  it("total_changed includes modified.length in addition to added/removed/renamed", () => {
    // ds1 persists with a stat change, ds2 is added, ds3 is removed
    const beforeModels = modelSnap([model("ds1", 1, { T: 4 }), model("ds3", 1, { T: 4 })]);
    const afterModels = modelSnap([model("ds1", 1, { T: 5 })]);
    const extended: ExtendedSnapshotData = {
      models: { before: beforeModels, after: afterModels },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha"), ds("ds3", "Gamma")]),
      [ds("ds1", "Alpha"), ds("ds2", "Beta")],
      extended,
    );
    expect(result.added).toHaveLength(1);   // ds2 added
    expect(result.removed).toHaveLength(1); // ds3 removed
    expect(result.modified).toHaveLength(1); // ds1 stat change
    expect(result.total_changed).toBe(
      result.added.length + result.removed.length + result.renamed.length + result.modified.length,
    );
    expect(result.total_changed).toBe(3);
  });

  // ── No double-counting ────────────────────────────────────────────────────

  it("added datasheets are NOT included in modified array", () => {
    // ds2 is newly added — should appear in added, not modified
    const beforeModels = modelSnap([model("ds1", 1, { T: 4 })]);
    const afterModels = modelSnap([model("ds1", 1, { T: 5 }), model("ds2", 1, { T: 4 })]);
    const extended: ExtendedSnapshotData = {
      models: { before: beforeModels, after: afterModels },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha"), ds("ds2", "Beta")],
      extended,
    );
    expect(result.added).toHaveLength(1);
    expect(result.added[0].id).toBe("ds2");
    expect(result.modified.some((m) => m.id === "ds2")).toBe(false);
  });

  it("renamed datasheets are NOT included in modified array", () => {
    // ds1 is renamed — should appear in renamed, not modified
    const beforeModels = modelSnap([model("ds1", 1, { T: 4 })]);
    const afterModels = modelSnap([model("ds1", 1, { T: 5 })]);
    const extended: ExtendedSnapshotData = {
      models: { before: beforeModels, after: afterModels },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha-Renamed")], // same id, different name = renamed
      extended,
    );
    expect(result.renamed).toHaveLength(1);
    expect(result.renamed[0].id).toBe("ds1");
    expect(result.modified.some((m) => m.id === "ds1")).toBe(false);
  });

  // ── Identical extended data ───────────────────────────────────────────────

  it("returns empty modified array when extended data is identical before and after", () => {
    const models = modelSnap([model("ds1", 1, { T: 4 })]);
    const keywords = keywordSnap([{ datasheet_id: "ds1", keyword: "INFANTRY", is_faction_keyword: 0 }]);
    const abilities = abilitySnap([
      { datasheet_id: "ds1", line: 1, ability_id: null, name: "Rapid Fire", description: null, type: null },
    ]);
    const extended: ExtendedSnapshotData = {
      models: { before: models, after: models },
      keywords: { before: keywords, after: keywords },
      abilities: { before: abilities, after: abilities },
    };
    const result = computeSyncDiff(
      snap([ds("ds1", "Alpha")]),
      [ds("ds1", "Alpha")],
      extended,
    );
    expect(result.modified).toHaveLength(0);
    expect(result.total_changed).toBe(0);
  });
});
