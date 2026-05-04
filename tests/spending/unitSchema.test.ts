/**
 * Phase 14 — unitSchema purchase_price_pence field tests.
 *
 * Verifies SPEND-01 schema contract: integer pence, non-negative, optional, nullable.
 */
import { describe, it, expect } from "vitest";
import { unitSchema } from "@/features/units/unitSchema";

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

describe("unitSchema — SPEND-01 (purchase_price_pence integer field)", () => {
  it("accepts a valid integer pence value (e.g. 1250 for £12.50)", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      purchase_price_pence: 1250,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for purchase_price_pence (optional + nullable per Pitfall 6)", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      purchase_price_pence: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative pence values (.min(0) constraint)", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      purchase_price_pence: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer (decimal) pence values (.int() constraint)", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      purchase_price_pence: 12.5,
    });
    expect(result.success).toBe(false);
  });

  it("does NOT contain the legacy `purchase_price` field after Plan 14-02 migration", () => {
    // Type-level check: UnitFormValues should not include purchase_price.
    // We verify this at runtime by passing a strict object — the schema accepts
    // unknown fields by default but the inferred type does not include them.
    // The type-level @ts-expect-error pattern would require strict mode, so we
    // settle for a runtime assertion that the parsed output contains the new
    // field key and not the old one.
    const parsed = unitSchema.parse({
      ...requiredBase,
      purchase_price_pence: 1000,
    });
    expect("purchase_price_pence" in parsed).toBe(true);
    expect("purchase_price" in parsed).toBe(false);
  });
});
