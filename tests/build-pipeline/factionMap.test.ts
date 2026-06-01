// @vitest-environment node
/**
 * Gap 5 (SF-02) -- FACTION_MAP and SUB_FACTION_MAP behavioral tests.
 *
 * SF-02: FACTION_MAP has expected keys, SUB_FACTION_MAP has exactly 17 entries
 * (11 SM chapters, 4 CSM warbands, 2 Aeldari sub-factions).
 */
import { describe, it, expect } from "vitest";
import { FACTION_MAP, SUB_FACTION_MAP, CROSS_FACTION_MAP } from "../../scripts/lib/factionMap.ts";

describe("FACTION_MAP: SF-02 — faction catalogue mappings", () => {
  it("maps Space Marine base catalogue to SM faction_id", () => {
    expect(FACTION_MAP["Imperium - Space Marines"]).toBe("SM");
  });

  it("maps chapter-specific catalogues to SM faction_id", () => {
    expect(FACTION_MAP["Imperium - Black Templars"]).toBe("SM");
    expect(FACTION_MAP["Imperium - Blood Angels"]).toBe("SM");
    expect(FACTION_MAP["Imperium - Dark Angels"]).toBe("SM");
    expect(FACTION_MAP["Imperium - Space Wolves"]).toBe("SM");
    expect(FACTION_MAP["Imperium - Ultramarines"]).toBe("SM");
  });

  it("maps Chaos Space Marines to CSM", () => {
    expect(FACTION_MAP["Chaos - Chaos Space Marines"]).toBe("CSM");
  });

  it("maps Aeldari Drukhari catalogue to DRU", () => {
    expect(FACTION_MAP["Aeldari - Drukhari"]).toBe("DRU");
  });

  it("maps Aeldari Library catalogue to AE (for cross-faction Drukhari units)", () => {
    expect(FACTION_MAP["Aeldari - Aeldari Library"]).toBe("AE");
  });

  it("contains at least 30 entries (base factions + library catalogues)", () => {
    expect(Object.keys(FACTION_MAP).length).toBeGreaterThanOrEqual(30);
  });
});

describe("SUB_FACTION_MAP: SF-02 — exactly 17 sub-faction entries", () => {
  it("has exactly 17 entries total", () => {
    expect(Object.keys(SUB_FACTION_MAP).length).toBe(17);
  });

  it("contains 11 Space Marines chapter entries", () => {
    const smChapters = Object.entries(SUB_FACTION_MAP).filter(
      ([, value]) =>
        [
          "Black Templars",
          "Blood Angels",
          "Dark Angels",
          "Deathwatch",
          "Imperial Fists",
          "Iron Hands",
          "Raven Guard",
          "Salamanders",
          "Space Wolves",
          "Ultramarines",
          "White Scars",
        ].includes(value)
    );
    expect(smChapters).toHaveLength(11);
  });

  it("contains 4 Chaos Space Marines warband entries", () => {
    const csmWarbands = Object.entries(SUB_FACTION_MAP).filter(
      ([, value]) =>
        [
          "Death Guard",
          "Thousand Sons",
          "World Eaters",
          "Emperor's Children",
        ].includes(value)
    );
    expect(csmWarbands).toHaveLength(4);
  });

  it("contains 2 Aeldari sub-faction entries", () => {
    const aeldari = Object.entries(SUB_FACTION_MAP).filter(
      ([, value]) => ["Drukhari", "Ynnari"].includes(value)
    );
    expect(aeldari).toHaveLength(2);
  });

  it("maps Ultramarines catalogue to 'Ultramarines' sub-faction label", () => {
    expect(SUB_FACTION_MAP["Imperium - Ultramarines"]).toBe("Ultramarines");
  });

  it("maps Death Guard catalogue to 'Death Guard' sub-faction label", () => {
    expect(SUB_FACTION_MAP["Chaos - Death Guard"]).toBe("Death Guard");
  });

  it("does NOT contain base catalogue entries (base catalogues have null sub-faction)", () => {
    expect(SUB_FACTION_MAP["Imperium - Space Marines"]).toBeUndefined();
    expect(SUB_FACTION_MAP["Chaos - Chaos Space Marines"]).toBeUndefined();
  });
});

describe("CROSS_FACTION_MAP: cross-faction routing", () => {
  it("routes Aeldari Library to DRU for Drukhari cross-faction matching", () => {
    expect(CROSS_FACTION_MAP["Aeldari - Aeldari Library"]).toBe("DRU");
  });
});
