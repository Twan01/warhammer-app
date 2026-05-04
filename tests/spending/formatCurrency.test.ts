/**
 * Phase 14 — formatCurrency utility tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 14-01 will:
 *   1. Create src/lib/formatCurrency.ts exporting `formatCurrency(pence, locale?, currency?)`
 *      per 14-RESEARCH.md §Pattern 6 (defaults to 'en-GB' / 'GBP', returns '—' on null).
 *   2. Replace `describe.skip` below with `describe`.
 *   3. Add real assertions matching 14-VALIDATION.md §Per-Task Verification Map row 14-00-01.
 *
 * The stub exists in Wave 0 so Plan 14-01 has a concrete failing target to flip green
 * (Nyquist sampling rate per 14-VALIDATION.md).
 */
import { describe, it } from "vitest";

describe.skip("formatCurrency — SPEND-05 (integer pence to GBP currency)", () => {
  it("returns '—' when pence is null", () => {
    // Plan 14-01 will:
    //   - import { formatCurrency } from "@/lib/formatCurrency";
    //   - expect(formatCurrency(null)).toBe("—");
    //   - expect(formatCurrency(undefined)).toBe("—");
  });

  it("returns '£0.00' for zero pence (not '—', not 'None' — UI-SPEC §Copywriting Contract)", () => {
    // Plan 14-01 will:
    //   - expect(formatCurrency(0)).toBe("£0.00");
  });

  it("formats positive integer pence as GBP currency by default", () => {
    // Plan 14-01 will:
    //   - expect(formatCurrency(1250)).toBe("£12.50");
    //   - expect(formatCurrency(100)).toBe("£1.00");
    //   - expect(formatCurrency(99)).toBe("£0.99");
    //   - expect(formatCurrency(247500)).toBe("£2,475.00");  // grouping separator
  });

  it("accepts custom locale and currency arguments (forward-compat for future settings page)", () => {
    // Plan 14-01 will:
    //   - // en-US / USD path
    //   - expect(formatCurrency(1250, "en-US", "USD")).toBe("$12.50");
    //   - // de-DE / EUR path uses comma decimal separator
    //   - expect(formatCurrency(1250, "de-DE", "EUR")).toMatch(/12,50/);
  });
});
