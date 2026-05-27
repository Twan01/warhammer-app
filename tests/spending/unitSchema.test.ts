/**
 * Phase 14 — unitSchema purchase_price_pounds field tests.
 *
 * Verifies schema contract: non-negative pounds, optional, nullable.
 * Pence conversion happens in the submit handler, not the schema.
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

describe("unitSchema — purchase_price_pounds field", () => {
  it("accepts a valid pounds value (e.g. 12.50)", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      purchase_price_pounds: 12.50,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for purchase_price_pounds (optional + nullable)", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      purchase_price_pounds: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative values (.min(0) constraint)", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      purchase_price_pounds: -10,
    });
    expect(result.success).toBe(false);
  });

  it("accepts decimal pounds values (not integer-only)", () => {
    const result = unitSchema.safeParse({
      ...requiredBase,
      purchase_price_pounds: 12.99,
    });
    expect(result.success).toBe(true);
  });

  it("parsed output contains purchase_price_pounds key", () => {
    const parsed = unitSchema.parse({
      ...requiredBase,
      purchase_price_pounds: 10.00,
    });
    expect("purchase_price_pounds" in parsed).toBe(true);
  });
});
