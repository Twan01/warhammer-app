/**
 * Phase 14 — paintSchema purchase_price_pence field tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 14-02 will:
 *   1. Modify src/features/paints/paintSchema.ts to ADD
 *      `purchase_price_pence: z.number().int().min(0).optional().nullable()` field
 *      (additive — no existing field is removed; PaintSheet has no purchase_price today).
 *   2. Replace `describe.skip` below with `describe`.
 *   3. Add real assertions verifying the integer constraint and nullability.
 */
import { describe, it } from "vitest";

describe.skip("paintSchema — SPEND-02 (purchase_price_pence integer field)", () => {
  it("accepts a valid integer pence value (e.g. 350 for £3.50)", () => {
    // Plan 14-02 will:
    //   - import { paintSchema } from "@/features/paints/paintSchema";
    //   - const valid = { brand: "Citadel", name: "Abaddon Black", paint_type: "Base",
    //       owned: true, running_low: false, wishlist: false, purchase_price_pence: 350 };
    //   - expect(paintSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts null for purchase_price_pence (optional + nullable per Pitfall 6)", () => {
    // Plan 14-02 will:
    //   - const withNull = { /* required fields */, purchase_price_pence: null };
    //   - expect(paintSchema.safeParse(withNull).success).toBe(true);
  });

  it("accepts the schema with purchase_price_pence omitted entirely (optional)", () => {
    // Plan 14-02 will:
    //   - const withoutField = { brand: "Citadel", name: "Abaddon Black", paint_type: "Base",
    //       owned: true, running_low: false, wishlist: false };
    //   - expect(paintSchema.safeParse(withoutField).success).toBe(true);
  });

  it("rejects negative pence values (.min(0) constraint)", () => {
    // Plan 14-02 will:
    //   - const invalid = { /* required fields */, purchase_price_pence: -50 };
    //   - expect(paintSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects non-integer (decimal) pence values (.int() constraint)", () => {
    // Plan 14-02 will:
    //   - const invalid = { /* required fields */, purchase_price_pence: 3.5 };
    //   - expect(paintSchema.safeParse(invalid).success).toBe(false);
  });
});
