/**
 * Phase 14 — paintSchema purchase_price_pence field tests.
 *
 * Verifies SPEND-02 schema contract: integer pence, non-negative, optional, nullable.
 */
import { describe, it, expect } from "vitest";
import { paintSchema } from "@/features/paints/paintSchema";

const requiredBase = {
  brand: "Citadel",
  name: "Abaddon Black",
  paint_type: "Base" as const,
  owned: true,
  running_low: false,
  wishlist: false,
};

describe("paintSchema — SPEND-02 (purchase_price_pence integer field)", () => {
  it("accepts a valid integer pence value (e.g. 350 for £3.50)", () => {
    const result = paintSchema.safeParse({
      ...requiredBase,
      purchase_price_pence: 350,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for purchase_price_pence (optional + nullable per Pitfall 6)", () => {
    const result = paintSchema.safeParse({
      ...requiredBase,
      purchase_price_pence: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts the schema with purchase_price_pence omitted entirely (optional)", () => {
    const result = paintSchema.safeParse(requiredBase);
    expect(result.success).toBe(true);
  });

  it("rejects negative pence values (.min(0) constraint)", () => {
    const result = paintSchema.safeParse({
      ...requiredBase,
      purchase_price_pence: -50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer (decimal) pence values (.int() constraint)", () => {
    const result = paintSchema.safeParse({
      ...requiredBase,
      purchase_price_pence: 3.5,
    });
    expect(result.success).toBe(false);
  });
});
