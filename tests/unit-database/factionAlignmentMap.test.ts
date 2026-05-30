/**
 * Phase 104 — BUI-01: factionAlignmentMap static map tests.
 *
 * Verifies the alignment map covers all 25 faction IDs, has 4 alignment groups,
 * and specific factions map to the expected alignment.
 */
import { describe, it, expect } from "vitest";
import {
  FACTION_ALIGNMENT,
  ALIGNMENT_ORDER,
  type Alignment,
} from "@/features/unit-database/factionAlignmentMap";

describe("factionAlignmentMap", () => {
  it("maps all 25 faction IDs", () => {
    const keys = Object.keys(FACTION_ALIGNMENT);
    expect(keys).toHaveLength(25);
  });

  it("ALIGNMENT_ORDER has 4 entries", () => {
    expect(ALIGNMENT_ORDER).toHaveLength(4);
    expect(ALIGNMENT_ORDER).toEqual(["Space Marines", "Imperium", "Chaos", "Xenos"]);
  });

  it("every faction maps to a valid alignment", () => {
    const valid: Alignment[] = ["Space Marines", "Imperium", "Chaos", "Xenos"];
    for (const [factionId, alignment] of Object.entries(FACTION_ALIGNMENT)) {
      expect(valid).toContain(alignment);
      // Ensure no empty string keys
      expect(factionId.length).toBeGreaterThan(0);
    }
  });

  it("SM maps to Space Marines", () => {
    expect(FACTION_ALIGNMENT["SM"]).toBe("Space Marines");
  });

  it("CSM maps to Chaos", () => {
    expect(FACTION_ALIGNMENT["CSM"]).toBe("Chaos");
  });

  it("NEC maps to Xenos", () => {
    expect(FACTION_ALIGNMENT["NEC"]).toBe("Xenos");
  });

  it("AM maps to Imperium", () => {
    expect(FACTION_ALIGNMENT["AM"]).toBe("Imperium");
  });
});
