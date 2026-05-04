/**
 * Phase 14 — unitSchema purchase_price_pence field tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 14-02 will:
 *   1. Modify src/features/units/unitSchema.ts to REPLACE
 *      `purchase_price: z.number().min(0).optional().nullable()`
 *      with
 *      `purchase_price_pence: z.number().int().min(0).optional().nullable()`.
 *      (Note: int() — pence are integers only — and the field name changes)
 *   2. Replace `describe.skip` below with `describe`.
 *   3. Add real assertions verifying the integer constraint and nullability.
 */
import { describe, it } from "vitest";

describe.skip("unitSchema — SPEND-01 (purchase_price_pence integer field)", () => {
  it("accepts a valid integer pence value (e.g. 1250 for £12.50)", () => {
    // Plan 14-02 will:
    //   - import { unitSchema } from "@/features/units/unitSchema";
    //   - const valid = { faction_id: 1, name: "Test", category: "Infantry",
    //       status_assembly: false, status_painting: "Not Started", painting_percentage: 0,
    //       status_basing: false, status_varnished: false, is_active_project: false,
    //       purchase_price_pence: 1250 };
    //   - expect(unitSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts null for purchase_price_pence (optional + nullable per Pitfall 6)", () => {
    // Plan 14-02 will:
    //   - const withNull = { /* required fields */, purchase_price_pence: null };
    //   - expect(unitSchema.safeParse(withNull).success).toBe(true);
  });

  it("rejects negative pence values (.min(0) constraint)", () => {
    // Plan 14-02 will:
    //   - const invalid = { /* required fields */, purchase_price_pence: -100 };
    //   - const result = unitSchema.safeParse(invalid);
    //   - expect(result.success).toBe(false);
  });

  it("rejects non-integer (decimal) pence values (.int() constraint)", () => {
    // Plan 14-02 will:
    //   - const invalid = { /* required fields */, purchase_price_pence: 12.5 };
    //   - const result = unitSchema.safeParse(invalid);
    //   - expect(result.success).toBe(false);
  });

  it("does NOT contain the legacy `purchase_price` field after Plan 14-02 migration", () => {
    // Plan 14-02 will:
    //   - // Confirm rename: legacy field should be absent from inferred type
    //   - import type { UnitFormValues } from "@/features/units/unitSchema";
    //   - const v: UnitFormValues = { /* required fields */, purchase_price_pence: null };
    //   - // @ts-expect-error — purchase_price field has been removed
    //   - const _legacy: UnitFormValues = { /* required */, purchase_price: 12.5 };
  });
});
