import { useAppSettings } from "@/hooks/useAppSettings";

/** Maps currency code to the Intl locale string used by formatCurrency. */
export const CURRENCY_LOCALE_MAP: Record<string, string> = {
  EUR: "fr-FR",
  GBP: "en-GB",
  USD: "en-US",
  CAD: "en-CA",
  AUD: "en-AU",
  JPY: "ja-JP",
};

/** Ordered list of currencies shown in the CurrencySetting dropdown. */
export const SUPPORTED_CURRENCIES = [
  "GBP",
  "EUR",
  "USD",
  "CAD",
  "AUD",
  "JPY",
] as const;

/**
 * Convenience hook returning the user's preferred currency and matching
 * Intl locale, derived from the `currency` key in app_settings.
 *
 * Defaults to GBP / en-GB when no setting exists.
 */
export function useCurrencyPreference(): {
  locale: string;
  currency: string;
} {
  const { data: settings } = useAppSettings();
  const currency = settings?.["currency"] ?? "GBP";
  const locale = CURRENCY_LOCALE_MAP[currency] ?? "en-GB";
  return { locale, currency };
}
