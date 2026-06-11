/**
 * Phase 122 — Locale store migration shim.
 *
 * The Zustand locale store has been replaced by app_settings persistence.
 * This file re-exports the Locale type and provides a useLocale() convenience
 * hook that reads from useAppSettings().
 *
 * All previous consumers of useLocaleStore should migrate to useLocale().
 */
import { useAppSettings } from "@/hooks/useAppSettings";

export type Locale = "en" | "fr";

/**
 * Convenience hook returning the current locale from app_settings.
 * Falls back to "en" when settings haven't loaded yet.
 */
export function useLocale(): Locale {
  const { data: settings } = useAppSettings();
  const raw = settings?.["locale"];
  return raw === "en" || raw === "fr" ? raw : "en";
}
