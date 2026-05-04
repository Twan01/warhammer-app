/**
 * Phase 14 (SPEND-05) — Integer-pence to formatted currency string.
 *
 * This is the ONLY location in the codebase where division by 100 is allowed.
 * All call sites (SpendingPage, UnitDetailSheet, future settings page) pass raw
 * integer pence and receive a locale-formatted currency string.
 *
 * Defaults to en-GB / GBP per CONTEXT.md decision. Locale + currency args are
 * accepted so a future settings page can wire user preferences without changes
 * to call sites (open-closed principle).
 *
 * Returns '—' on null/undefined per UI-SPEC §Copywriting Contract.
 */
export function formatCurrency(
  pence: number | null | undefined,
  locale: string = "en-GB",
  currency: string = "GBP"
): string {
  if (pence == null) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    pence / 100
  );
}
