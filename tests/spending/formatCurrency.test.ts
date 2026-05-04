/**
 * Phase 14 — formatCurrency utility tests.
 *
 * Verifies the integer-pence to formatted-currency contract that every Phase 14
 * display site depends on (SpendingPage, UnitDetailSheet).
 */
import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/formatCurrency";

describe("formatCurrency — SPEND-05 (integer pence to GBP currency)", () => {
  it("returns '—' when pence is null", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
  });

  it("returns '£0.00' for zero pence (not '—', not 'None' — UI-SPEC §Copywriting Contract)", () => {
    expect(formatCurrency(0)).toBe("£0.00");
  });

  it("formats positive integer pence as GBP currency by default", () => {
    expect(formatCurrency(1250)).toBe("£12.50");
    expect(formatCurrency(100)).toBe("£1.00");
    expect(formatCurrency(99)).toBe("£0.99");
    expect(formatCurrency(247500)).toBe("£2,475.00");
  });

  it("accepts custom locale and currency arguments (forward-compat for future settings page)", () => {
    expect(formatCurrency(1250, "en-US", "USD")).toBe("$12.50");
    // de-DE / EUR uses comma decimal separator
    expect(formatCurrency(1250, "de-DE", "EUR")).toMatch(/12,50/);
  });
});
