// @vitest-environment jsdom

/**
 * Nyquist test: applyTechniqueFilters pure function (LIB-03).
 *
 * Tests name filter (case-insensitive substring) and effect filter (exact match).
 *
 * Wave 0 — RED until applyTechniqueFilters is implemented in plan 04.
 */

import { describe, it, expect } from "vitest";
import type { TechniqueWithCounts } from "@/types/technique";

// Import function under test — RED until plan 04 implements it
import { applyTechniqueFilters } from "@/features/techniques/applyTechniqueFilters";

const makeTechnique = (
  partial: Partial<TechniqueWithCounts> & { id: number; name: string },
): TechniqueWithCounts => ({
  id: partial.id,
  name: partial.name,
  effect: partial.effect ?? null,
  difficulty: partial.difficulty ?? null,
  notes: partial.notes ?? null,
  created_at: "2026-06-21T00:00:00Z",
  updated_at: "2026-06-21T00:00:00Z",
  slot_count: partial.slot_count ?? 0,
  step_count: partial.step_count ?? 0,
  usage_count: partial.usage_count ?? 0,
});

const TECHNIQUES: TechniqueWithCounts[] = [
  makeTechnique({ id: 1, name: "OSL Glow", effect: "OSL", difficulty: "Advanced" }),
  makeTechnique({ id: 2, name: "NMM Gold", effect: "NMM", difficulty: "Expert" }),
  makeTechnique({ id: 3, name: "Wet Blend Skin", effect: "Wet Blend", difficulty: "Intermediate" }),
  makeTechnique({ id: 4, name: "Quick Contrast Base", effect: "Contrast", difficulty: "Beginner" }),
  makeTechnique({ id: 5, name: "OSL Source Spot", effect: "OSL", difficulty: "Expert" }),
];

describe("applyTechniqueFilters (LIB-03)", () => {
  it("empty filters return all techniques", () => {
    const result = applyTechniqueFilters(TECHNIQUES, {
      nameFilter: "",
      effectFilter: null,
    });
    expect(result).toHaveLength(5);
  });

  it("name filter narrows by case-insensitive substring on technique.name", () => {
    const result = applyTechniqueFilters(TECHNIQUES, {
      nameFilter: "osl",
      effectFilter: null,
    });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toContain(1);
    expect(result.map((t) => t.id)).toContain(5);
  });

  it("name filter is case-insensitive", () => {
    const result = applyTechniqueFilters(TECHNIQUES, {
      nameFilter: "NMM",
      effectFilter: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("name filter matches partial substrings", () => {
    const result = applyTechniqueFilters(TECHNIQUES, {
      nameFilter: "blend",
      effectFilter: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it("effect filter narrows by exact effect match", () => {
    const result = applyTechniqueFilters(TECHNIQUES, {
      nameFilter: "",
      effectFilter: "OSL",
    });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toContain(1);
    expect(result.map((t) => t.id)).toContain(5);
  });

  it("effect filter does not match partial effect strings", () => {
    const result = applyTechniqueFilters(TECHNIQUES, {
      nameFilter: "",
      effectFilter: "OS",
    });
    expect(result).toHaveLength(0);
  });

  it("name + effect filters combine (AND logic)", () => {
    const result = applyTechniqueFilters(TECHNIQUES, {
      nameFilter: "source",
      effectFilter: "OSL",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
  });

  it("returns empty array when no techniques match", () => {
    const result = applyTechniqueFilters(TECHNIQUES, {
      nameFilter: "nonexistent",
      effectFilter: null,
    });
    expect(result).toHaveLength(0);
  });

  it("whitespace-only name filter is treated as empty (returns all)", () => {
    const result = applyTechniqueFilters(TECHNIQUES, {
      nameFilter: "   ",
      effectFilter: null,
    });
    expect(result).toHaveLength(5);
  });
});
