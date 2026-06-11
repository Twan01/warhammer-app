/**
 * Query keys that depend on the active locale and must be invalidated
 * when the user switches language (EN/FR).
 *
 * Shared between LanguageSetting (Settings page) and LocaleToggle (sidebar)
 * to keep the invalidation list in sync.
 */
export const LOCALE_QUERY_KEYS = [
  "udb-factions",
  "udb-units",
  "udb-unit-detail",
  "wahapedia-factions",
  "datasheets-by-faction",
  "datasheets-with-points",
  "datasheet",
] as const;
