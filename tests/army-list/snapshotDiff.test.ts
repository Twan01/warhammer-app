/**
 * Phase 95 — snapshotDiff pure function tests.
 *
 * Tests computeSnapshotDiff with various combinations of unit sets and points.
 * No mocks needed — pure function, no side effects.
 */
import { describe, it, expect } from "vitest";
import { computeSnapshotDiff } from "@/lib/snapshotDiff";
import type { ParsedSnapshot, ParsedSnapshotUnit } from "@/lib/snapshotDiff";

function makeUnit(name: string, points = 100): ParsedSnapshotUnit {
  return { name, points, is_warlord: false, is_ghost: false };
}

function makeSnapshot(
  units: ParsedSnapshotUnit[],
  totalPoints: number,
  enhancementPoints = 0,
): ParsedSnapshot {
  return {
    list: { total_points: totalPoints, enhancement_points: enhancementPoints },
    units,
  };
}

describe("computeSnapshotDiff", () => {
  it("computes added, removed, and common units correctly", () => {
    const snapshotA = makeSnapshot(
      [makeUnit("Intercessors", 200), makeUnit("Hellblasters", 150)],
      350,
    );
    const snapshotB = makeSnapshot(
      [makeUnit("Hellblasters", 150), makeUnit("Eradicators", 180)],
      330,
    );

    const diff = computeSnapshotDiff(snapshotA, snapshotB);

    expect(diff.unitsAdded).toHaveLength(1);
    expect(diff.unitsAdded[0].name).toBe("Eradicators");
    expect(diff.unitsRemoved).toHaveLength(1);
    expect(diff.unitsRemoved[0].name).toBe("Intercessors");
    expect(diff.unitsCommon).toHaveLength(1);
    expect(diff.unitsCommon[0].name).toBe("Hellblasters");
  });

  it("computes points delta including enhancement points", () => {
    const snapshotA = makeSnapshot([], 500, 50);  // total = 550
    const snapshotB = makeSnapshot([], 600, 100);  // total = 700

    const diff = computeSnapshotDiff(snapshotA, snapshotB);
    expect(diff.pointsDelta).toBe(150); // 700 - 550
  });

  it("returns empty arrays and zero delta for two empty snapshots", () => {
    const snapshotA = makeSnapshot([], 0);
    const snapshotB = makeSnapshot([], 0);

    const diff = computeSnapshotDiff(snapshotA, snapshotB);

    expect(diff.pointsDelta).toBe(0);
    expect(diff.unitsAdded).toHaveLength(0);
    expect(diff.unitsRemoved).toHaveLength(0);
    expect(diff.unitsCommon).toHaveLength(0);
  });

  it("returns all common and no added/removed for identical snapshots", () => {
    const units = [makeUnit("Intercessors"), makeUnit("Hellblasters")];
    const snapshotA = makeSnapshot(units, 300);
    const snapshotB = makeSnapshot(units, 300);

    const diff = computeSnapshotDiff(snapshotA, snapshotB);

    expect(diff.pointsDelta).toBe(0);
    expect(diff.unitsAdded).toHaveLength(0);
    expect(diff.unitsRemoved).toHaveLength(0);
    expect(diff.unitsCommon).toHaveLength(2);
  });

  it("reverses added/removed and negates delta when A and B are swapped", () => {
    const snapshotA = makeSnapshot(
      [makeUnit("Intercessors", 200)],
      200,
    );
    const snapshotB = makeSnapshot(
      [makeUnit("Eradicators", 180)],
      180,
    );

    const diffAB = computeSnapshotDiff(snapshotA, snapshotB);
    const diffBA = computeSnapshotDiff(snapshotB, snapshotA);

    expect(diffAB.pointsDelta).toBe(-20);
    expect(diffBA.pointsDelta).toBe(20);
    expect(diffAB.unitsAdded.map((u) => u.name)).toEqual(["Eradicators"]);
    expect(diffAB.unitsRemoved.map((u) => u.name)).toEqual(["Intercessors"]);
    expect(diffBA.unitsAdded.map((u) => u.name)).toEqual(["Intercessors"]);
    expect(diffBA.unitsRemoved.map((u) => u.name)).toEqual(["Eradicators"]);
  });
});
