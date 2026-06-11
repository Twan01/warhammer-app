---
phase: 122
plan: 01
subsystem: settings
tags: [preferences, settings-ui, currency, locale, readiness]
dependency_graph:
  requires: [121-settings-foundation]
  provides: [GeneralPreferencesSection, useCurrencyPreference, LOCALE_QUERY_KEYS]
  affects: [settings-page, app-settings]
tech_stack:
  added: []
  patterns: [inline-auto-save, two-column-setting-row, segmented-button-toggle]
key_files:
  created:
    - src/features/settings/GeneralPreferencesSection.tsx
    - src/features/settings/LanguageSetting.tsx
    - src/features/settings/CurrencySetting.tsx
    - src/features/settings/DefaultFactionSetting.tsx
    - src/features/settings/ReadinessTargetSetting.tsx
    - src/hooks/useCurrencyPreference.ts
    - src/lib/localeQueryKeys.ts
    - tests/settings/GeneralPreferencesSection.test.tsx
    - tests/settings/useCurrencyPreference.test.ts
  modified:
    - src/app/settings/page.tsx
    - tests/settings/SettingsPage.test.tsx
decisions:
  - "Used __none__ sentinel for DefaultFactionSetting Select since Radix Select prohibits empty string values"
  - "Blur-only save for ReadinessTarget custom input (no debounce), matching PipelineLabelsEditor pattern"
metrics:
  duration: 9min
  completed: 2026-06-11
---

# Phase 122 Plan 01: General Preferences Section Summary

Built the GeneralPreferencesSection with 4 inline auto-save setting controls and useCurrencyPreference convenience hook, wired into the Settings Preferences tab above HobbyDefaultsSection.

## What Was Built

### Task 1: Shared constants and useCurrencyPreference hook
- `src/lib/localeQueryKeys.ts` -- LOCALE_QUERY_KEYS const array with 7 query key strings for locale-sensitive cache invalidation
- `src/hooks/useCurrencyPreference.ts` -- Convenience hook returning {locale, currency} from app_settings with GBP/en-GB default; exports CURRENCY_LOCALE_MAP (6 entries) and SUPPORTED_CURRENCIES array
- `tests/settings/useCurrencyPreference.test.ts` -- 6 tests covering defaults, known currencies, unknown fallback, and const validation

### Task 2: GeneralPreferencesSection and 4 setting components
- `src/features/settings/GeneralPreferencesSection.tsx` -- Section wrapper calling useAppSettings, rendering 4 child controls with "App Preferences" heading and bottom Separator
- `src/features/settings/LanguageSetting.tsx` -- EN/FR segmented toggle matching LocaleToggle pattern; invalidates 7 query keys via LOCALE_QUERY_KEYS on change
- `src/features/settings/CurrencySetting.tsx` -- shadcn Select with 6 currencies (GBP/EUR/USD/CAD/AUD/JPY), auto-save on change
- `src/features/settings/DefaultFactionSetting.tsx` -- shadcn Select populated from useFactions, sorted alphabetically, "None" option clears setting, Skeleton while loading
- `src/features/settings/ReadinessTargetSetting.tsx` -- 4 preset buttons (500/1000/1500/2000) + custom number input (min=1, max=99999, no spinner), blur-save
- `src/app/settings/page.tsx` -- Replaced placeholder text with GeneralPreferencesSection above HobbyDefaultsSection
- `tests/settings/GeneralPreferencesSection.test.tsx` -- 10 tests covering all controls and interactions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Radix Select empty string value**
- **Found during:** Task 2
- **Issue:** Radix UI Select throws error when SelectItem has `value=""` -- empty string is reserved for clearing selection/showing placeholder
- **Fix:** Used `__none__` sentinel value for "None" option, mapped back to empty string before saving to DB
- **Files modified:** src/features/settings/DefaultFactionSetting.tsx
- **Commit:** 959cb312

**2. [Rule 1 - Bug] SettingsPage test broken by new QueryClient dependency**
- **Found during:** Verification
- **Issue:** LanguageSetting uses useQueryClient directly, causing SettingsPage tests to fail without a QueryClientProvider wrapper
- **Fix:** Updated SettingsPage test with QC wrapper, added useFactions and sonner mocks
- **Files modified:** tests/settings/SettingsPage.test.tsx
- **Commit:** 4c983bf3

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 208087d2 | feat(122-01): add locale query keys, useCurrencyPreference hook, and tests |
| 2 | 959cb312 | feat(122-01): add GeneralPreferencesSection with 4 setting controls and tests |
| fix | 4c983bf3 | fix(122-01): update SettingsPage test with QueryClientProvider wrapper |

## Verification

- `pnpm test -- tests/settings/` -- 10 files, 75 tests, all passing
- `pnpm build` -- TypeScript check passes, Vite build succeeds

## Known Stubs

None -- all 4 setting controls are fully wired to useUpdateSetting with auto-save. Consumer integration (LocaleToggle sync, formatCurrency wiring, ActiveFactionContext boot, useArmyReadinessTarget migration) is deferred to Plan 02 as designed.

## Self-Check: PASSED
