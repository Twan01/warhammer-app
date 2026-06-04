// @vitest-environment node
/**
 * Gap 2 (PTS-04) — Keyword-based sub-faction assignment behavioral tests.
 *
 * PTS-04: Sub-faction assignment uses keyword matching against SUB_FACTION_MAP values.
 * The logic lives inline in build-unit-db.ts Step 8b, reproduced here as a pure function
 * to verify the matching contract against the actual SUB_FACTION_MAP values.
 *
 * Pattern under test:
 *   subFactionValues = new Set(Object.values(SUB_FACTION_MAP))
 *   for each keyword row: if keyword in subFactionValues && unit.sub_faction === null
 *     → assign unit.sub_faction = keyword
 */
import { describe, it, expect } from "vitest";
import { SUB_FACTION_MAP } from "../../scripts/lib/factionMap.ts";

// ---------------------------------------------------------------------------
// Inline reproduction of Step 8b logic — pure, no file I/O
// ---------------------------------------------------------------------------

interface UnitStub {
  id: string;
  sub_faction: string | null;
}

interface KeywordStub {
  unit_id: string;
  keyword: string;
}

function applySubFactionKeywords(
  units: UnitStub[],
  keywords: KeywordStub[]
): UnitStub[] {
  const subFactionValues = new Set(Object.values(SUB_FACTION_MAP));
  const unitById = new Map(units.map((u) => [u.id, u]));

  for (const kw of keywords) {
    if (subFactionValues.has(kw.keyword)) {
      const unit = unitById.get(kw.unit_id);
      if (unit && unit.sub_faction === null) {
        unit.sub_faction = kw.keyword;
      }
    }
  }

  return units;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("subFactionKeyword: PTS-04 — keyword-based sub-faction assignment", () => {
  it("assigns 'Blood Angels' when unit keyword matches the SUB_FACTION_MAP value", () => {
    const units: UnitStub[] = [{ id: "unit-1", sub_faction: null }];
    const keywords: KeywordStub[] = [{ unit_id: "unit-1", keyword: "Blood Angels" }];

    const result = applySubFactionKeywords(units, keywords);
    expect(result[0].sub_faction).toBe("Blood Angels");
  });

  it("assigns 'Death Guard' when unit keyword matches", () => {
    const units: UnitStub[] = [{ id: "unit-2", sub_faction: null }];
    const keywords: KeywordStub[] = [{ unit_id: "unit-2", keyword: "Death Guard" }];

    const result = applySubFactionKeywords(units, keywords);
    expect(result[0].sub_faction).toBe("Death Guard");
  });

  it("does NOT assign sub_faction for a keyword that is not in SUB_FACTION_MAP values", () => {
    // "Space Marines" is not a sub-faction label — base faction units stay null
    const units: UnitStub[] = [{ id: "unit-3", sub_faction: null }];
    const keywords: KeywordStub[] = [{ unit_id: "unit-3", keyword: "Space Marines" }];

    const result = applySubFactionKeywords(units, keywords);
    expect(result[0].sub_faction).toBeNull();
  });

  it("does NOT overwrite an already-assigned sub_faction (first match wins)", () => {
    // Unit already has Blood Angels from a prior keyword — Dark Angels keyword must not replace it
    const units: UnitStub[] = [{ id: "unit-4", sub_faction: "Blood Angels" }];
    const keywords: KeywordStub[] = [{ unit_id: "unit-4", keyword: "Dark Angels" }];

    const result = applySubFactionKeywords(units, keywords);
    expect(result[0].sub_faction).toBe("Blood Angels");
  });

  it("handles multiple units independently — each gets its own matching keyword", () => {
    const units: UnitStub[] = [
      { id: "u-sw", sub_faction: null },
      { id: "u-um", sub_faction: null },
      { id: "u-ts", sub_faction: null },
    ];
    const keywords: KeywordStub[] = [
      { unit_id: "u-sw", keyword: "Space Wolves" },
      { unit_id: "u-um", keyword: "Ultramarines" },
      { unit_id: "u-ts", keyword: "Thousand Sons" },
    ];

    const result = applySubFactionKeywords(units, keywords);
    expect(result.find((u) => u.id === "u-sw")!.sub_faction).toBe("Space Wolves");
    expect(result.find((u) => u.id === "u-um")!.sub_faction).toBe("Ultramarines");
    expect(result.find((u) => u.id === "u-ts")!.sub_faction).toBe("Thousand Sons");
  });

  it("ignores keyword rows whose unit_id does not match any unit (no crash, no side-effect)", () => {
    const units: UnitStub[] = [{ id: "unit-real", sub_faction: null }];
    const keywords: KeywordStub[] = [
      { unit_id: "unit-ghost", keyword: "Blood Angels" }, // orphan keyword row
    ];

    const result = applySubFactionKeywords(units, keywords);
    // The real unit must remain untouched
    expect(result[0].sub_faction).toBeNull();
  });

  it("SUB_FACTION_MAP actually contains 'Blood Angels' — verifies the map values used by the logic", () => {
    // Adversarial: if the map were empty, every test above would pass vacuously
    const values = Object.values(SUB_FACTION_MAP);
    expect(values).toContain("Blood Angels");
    expect(values).toContain("Death Guard");
    expect(values).toContain("Space Wolves");
    expect(values.length).toBeGreaterThan(5);
  });

  it("all values in SUB_FACTION_MAP are non-empty strings (no null/undefined values in the map)", () => {
    for (const value of Object.values(SUB_FACTION_MAP)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
