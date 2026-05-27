/**
 * Phase 17 â€” Enrichment schema contract tests.
 *
 * Verifies ENRCH-01 (faction lore_notes), ENRCH-02 (unit lore_notes),
 * and ENRCH-03 (unit undercoat) Zod field contracts.
 *
 * Pattern mirrors tests/spending/unitSchema.test.ts.
 */
import { describe, it, expect } from "vitest";
import { unitSchema } from "@/features/units/unitSchema";
import { factionSchema } from "@/features/factions/factionSchema";

const requiredBase = {
  faction_id: 1,
  name: "Test Unit",
  category: "Infantry",
  status_assembly: false,
  status_painting: "Not Started" as const,
  painting_percentage: 0,
  status_basing: false,
  status_varnished: false,
  is_active_project: false,
};

const requiredFactionBase = {
  name: "Blood Ravens",
  game_system: "Warhammer 40K",
  description: null,
  color_theme: "#4A90D9",
  icon_path: null,
  lore_notes: null,
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ENRCH-02 â€” unit lore_notes
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("unitSchema â€” ENRCH-02 (lore_notes field)", () => {
  it("accepts a string value for lore_notes", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      lore_notes: "A veteran of a hundred campaigns, bearing the scars of Cadia.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for lore_notes (nullable)", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      lore_notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts undefined for lore_notes (optional â€” can be omitted)", () => {
    // lore_notes is not included in the object at all
    const result = unitSchema.safeParse({ ...requiredBase });
    expect(result.success).toBe(true);
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ENRCH-03 â€” unit undercoat
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("unitSchema â€” ENRCH-03 (undercoat field)", () => {
  it("accepts a string value for undercoat (e.g. 'Chaos Black')", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      undercoat: "Chaos Black",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for undercoat (nullable)", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      undercoat: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts undefined for undercoat (optional)", () => {
    // undercoat is not included in the object at all
    const result = unitSchema.safeParse({ ...requiredBase });
    expect(result.success).toBe(true);
  });

  it("rejects undercoat string longer than 120 characters (.max(120) constraint)", () => {
    const tooLong = "A".repeat(121);
    const result = unitSchema.safeParse({
      ...requiredBase,
      undercoat: tooLong,
    });
    expect(result.success).toBe(false);
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ENRCH-01 â€” faction lore_notes
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("factionSchema â€” ENRCH-01 (lore_notes field)", () => {
  it("accepts a string value for lore_notes (faction backstory)", () => {
    const result = factionSchema.safeParse({
      ...requiredFactionBase,
      lore_notes:
        "The Blood Ravens are a mysterious Chapter of Space Marines whose origins are shrouded in secrecy.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for lore_notes (nullable)", () => {
    const result = factionSchema.safeParse({
      ...requiredFactionBase,
      lore_notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects undefined for lore_notes (nullable but required)", () => {
    const { lore_notes: _, ...withoutLoreNotes } = requiredFactionBase;
    const result = factionSchema.safeParse(withoutLoreNotes);
    expect(result.success).toBe(false);
  });
});
