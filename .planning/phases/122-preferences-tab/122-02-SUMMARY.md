---
phase: 122
plan: 02
subsystem: settings
tags: [preferences, locale-migration, currency-wiring, faction-boot, readiness-migration]
dependency_graph:
  requires: [122-01-GeneralPreferencesSection, 121-settings-foundation]
  provides: [locale-app-settings-migration, currency-consumer-wiring, faction-boot-integration, readiness-app-settings-migration]
  affects: [LocaleToggle, useUnitDatabase, useDatasheet, SpendingPage, WishlistPage, UnitDetailSheet, ActiveFactionContext, ArmyReadinessCard]
tech_stack:
  added: []
  patterns: [app-settings-backed-locale, session-override-pattern, convenience-hook-delegation]
key_files:
  created:
    - tests/settings/consumerIntegration.test.tsx
  modified:
    - src/stores/localeStore.ts
    - src/components/common/LocaleToggle.tsx
    - src/hooks/useUnitDatabase.ts
    - src/hooks/useDatasheet.ts
    - src/features/spending/SpendingPage.tsx
    - src/features/spending/SpendTrendChart.tsx
    - src/features/wishlist/WishlistPage.tsx
    - src/features/wishlist/WishlistItemRow.tsx
    - src/features/units/UnitDetailSheet.tsx
    - src/context/ActiveFactionContext.tsx
    - src/hooks/useArmyReadiness.ts
    - tests/unit-database/locale-store.test.ts
    - tests/unit-database/locale-toggle.test.ts
    - tests/datasheet/useDatasheet.test.tsx
    - tests/dashboard/armyReadinessQuery.test.ts
    - tests/theming/useActiveFaction.test.tsx
decisions:
  - "Gutted localeStore to re-export shim with useLocale() convenience hook instead of full removal -- avoids breaking Locale type imports"
  - "SpendTrendChart receives currency preference via props (not hook) since it is a pure chart component"
  - "WishlistItemRow receives currency preference via props from WishlistPage parent"
  - "useArmyReadinessTarget return type widened from ArmyReadinessTarget to number for custom value support (D-10)"
  - "ActiveFactionContext boot effect only fires when activeFactionId is null (localStorage empty) -- one-time migration per D-06"
metrics:
  duration: 27min
  completed: 2026-06-11
---

# Phase 122 Plan 02: Consumer Integration Summary

Wired 4 preference settings into their downstream consumer systems: locale from app_settings replaces Zustand localeStore, currency preference flows to all formatCurrency call sites, ActiveFactionContext reads default faction on cold start, and useArmyReadinessTarget migrates from localStorage to app_settings with session override.

## What Was Built

### Task 1: Locale migration and currency wiring
- `src/stores/localeStore.ts` -- Gutted Zustand store; now exports Locale type + useLocale() convenience hook reading from useAppSettings
- `src/components/common/LocaleToggle.tsx` -- Reads locale from useAppSettings, writes via useUpdateSetting, invalidates 7 query keys via LOCALE_QUERY_KEYS on success
- `src/hooks/useUnitDatabase.ts` -- 3 hooks migrated from useLocaleStore((s) => s.locale) to useLocale()
- `src/hooks/useDatasheet.ts` -- 4 hooks migrated from useLocaleStore((s) => s.locale) to useLocale()
- `src/features/spending/SpendingPage.tsx` -- 7 formatCurrency calls now pass currencyLocale and currency from useCurrencyPreference
- `src/features/spending/SpendTrendChart.tsx` -- Receives currencyLocale/currency via props, passes to formatCurrency in axis tick formatter and tooltip
- `src/features/wishlist/WishlistPage.tsx` -- 1 formatCurrency call wired; passes currency props to WishlistItemRow children
- `src/features/wishlist/WishlistItemRow.tsx` -- Accepts currencyLocale/currency props, passes to formatCurrency
- `src/features/units/UnitDetailSheet.tsx` -- 1 formatCurrency call wired via useCurrencyPreference
- Updated 3 test files: locale-store, locale-toggle, useDatasheet tests now mock useAppSettings

### Task 2: ActiveFactionContext boot + useArmyReadinessTarget migration + integration tests
- `src/context/ActiveFactionContext.tsx` -- Added useEffect to read default_faction_id from app_settings on cold start when localStorage has no value (D-06); synchronous localStorage initializer preserved to prevent flash (Pitfall 6)
- `src/hooks/useArmyReadiness.ts` -- Replaced localStorage with useAppSettings read; added sessionOverride state for ArmyReadinessCard per-session override (D-11); T-122-05 mitigation: fallback to 2000 for NaN/non-positive values
- `tests/settings/consumerIntegration.test.tsx` -- 10 tests covering useArmyReadinessTarget (read, default, NaN, session override, no-persist) and LocaleToggle (FR active, EN active, default, mutate call)
- Updated tests/dashboard/armyReadinessQuery.test.ts -- Migrated from localStorage mocks to useAppSettings mocks; added custom value test (D-10)
- Updated tests/theming/useActiveFaction.test.tsx -- Added useAppSettings mock for ActiveFactionContext boot integration; fixed file encoding

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] useDatasheet test missing useAppSettings mock**
- **Found during:** Task 1 verification
- **Issue:** tests/datasheet/useDatasheet.test.tsx rendered hooks that internally called useLocale()->useAppSettings() without a mock, causing test failures
- **Fix:** Added vi.mock("@/hooks/useAppSettings") to the test file
- **Files modified:** tests/datasheet/useDatasheet.test.tsx
- **Commit:** ffdd39d9

**2. [Rule 1 - Bug] useActiveFaction test missing useAppSettings mock**
- **Found during:** Task 2 verification
- **Issue:** ActiveFactionProvider now calls useAppSettings() for boot integration; existing tests had no QueryClientProvider or mock
- **Fix:** Added vi.mock("@/hooks/useAppSettings") to tests/theming/useActiveFaction.test.tsx
- **Files modified:** tests/theming/useActiveFaction.test.tsx
- **Commit:** 1c543335

**3. [Rule 1 - Bug] File encoding corruption in useActiveFaction test**
- **Found during:** Task 2 verification
- **Issue:** Edit tool mixed UTF-8 em-dash with pre-existing garbled encoding, causing esbuild parse failure
- **Fix:** Rewrote entire file with ASCII-safe comments (-- instead of em-dash)
- **Files modified:** tests/theming/useActiveFaction.test.tsx
- **Commit:** 1c543335

**4. [Rule 1 - Bug] Unused React import in armyReadinessQuery test**
- **Found during:** Final build verification
- **Issue:** TypeScript noUnusedLocals flagged unused React import after removing QueryClientProvider wrapper
- **Fix:** Removed unused import
- **Files modified:** tests/dashboard/armyReadinessQuery.test.ts
- **Commit:** 86d7c386

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | ffdd39d9 | feat(122-02): migrate locale consumers to app_settings and wire currency preference |
| 2 | 1c543335 | feat(122-02): integrate ActiveFactionContext boot + refactor useArmyReadinessTarget + tests |
| fix | 86d7c386 | fix(122-02): remove unused React import from armyReadinessQuery test |

## Verification

- `pnpm build` -- TypeScript check passes, Vite build succeeds
- `pnpm test` -- 2549 tests pass (2 pre-existing failures in build-pipeline/determinism.test.ts unrelated to this plan)
- Zero imports of `useLocaleStore` remain in `src/`
- Zero localStorage references remain in `useArmyReadiness.ts` (except comment)
- All 5 formatCurrency consumer files pass currency preference

## Known Stubs

None -- all 4 preference settings are fully wired to their downstream consumers. The preference controls (Plan 01) and consumer integrations (Plan 02) together complete the full preference lifecycle.

## Self-Check: PASSED
