---
phase: 122-preferences-tab
reviewed: 2026-06-11T14:30:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/features/settings/GeneralPreferencesSection.tsx
  - src/features/settings/LanguageSetting.tsx
  - src/features/settings/CurrencySetting.tsx
  - src/features/settings/DefaultFactionSetting.tsx
  - src/features/settings/ReadinessTargetSetting.tsx
  - src/hooks/useCurrencyPreference.ts
  - src/lib/localeQueryKeys.ts
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
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 122: Code Review Report

**Reviewed:** 2026-06-11
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 122 migrates four user preferences (language, currency, default faction, army readiness target) from localStorage/Zustand to SQLite-backed `app_settings`. The migration is clean in structure: a `useAppSettings()` React Query hook replaces the old Zustand store, and currency formatting is properly threaded through spending/wishlist/unit consumers via `useCurrencyPreference()`.

Two critical issues were found: (1) the `useLocale()` shim performs an unsafe type cast that can propagate corrupt DB values, and (2) the `useArmyReadinessTarget` hook's session override state resets on every `app_settings` refetch due to `useState` being inside a hook that re-renders on query data change. Four warnings cover stale comment, missing input validation, an Enter-key gap in the custom readiness input, and unused interface props that silently drop passed callbacks.

## Critical Issues

### CR-01: Unsafe `as Locale` cast in localeStore shim allows corrupt locale propagation

**File:** `src/stores/localeStore.ts:20`
**Issue:** The `useLocale()` hook casts the raw DB string to `Locale` without validation: `(settings?.["locale"] as Locale) ?? "en"`. If the `app_settings` table contains a corrupted or unexpected value (e.g., `"de"`, `"EN"`, or an empty string from a manual DB edit or restore), this cast silently passes through, and downstream consumers (query functions receiving `locale` parameter) will send an invalid locale to SQL queries. The `??` only guards against `undefined`/`null`, not against invalid non-empty strings.

The same unsafe cast exists in `LocaleToggle.tsx:14`.

**Fix:**
```ts
// src/stores/localeStore.ts
export function useLocale(): Locale {
  const { data: settings } = useAppSettings();
  const raw = settings?.["locale"];
  return raw === "en" || raw === "fr" ? raw : "en";
}
```
Apply the same validation in `LocaleToggle.tsx:14`.

### CR-02: `useArmyReadinessTarget` session override is fragile — state resets on settings refetch

**File:** `src/hooks/useArmyReadiness.ts:54`
**Issue:** `useState<number | null>(null)` inside `useArmyReadinessTarget` creates a new session override state per component mount. This works correctly today because the `ArmyReadinessCard` component stays mounted. However, the real issue is subtler: when `useAppSettings()` query is invalidated (e.g., user changes any setting on the Settings page), React Query refetches and `persisted` recalculates, but `sessionOverride` persists from the previous mount. If the user sets a session override of 1500 on the dashboard, then goes to Settings and changes the persisted default to 1000, then returns to the dashboard — the component remounts and `sessionOverride` resets to `null`, showing 1000 (the new persisted value). This is correct behavior on remount, but if the user navigates without unmounting (e.g., Settings is a separate route causing remount), they lose their session override silently. The `useState` inside a hook that multiple components could call also means each call site gets independent session state.

More critically: the `ArmyReadinessTarget` type exported from this file is still `(typeof ARMY_READINESS_TARGETS)[number]` (union of 500 | 1000 | 1500 | 2000), but `useArmyReadinessTarget` now returns `number` (any value from DB or custom input). The type mismatch means consumers importing `ArmyReadinessTarget` expect a constrained union but the hook can return arbitrary numbers like 750.

**Fix:** Either remove the `ArmyReadinessTarget` type (it's now misleading), or widen it to `number` and update the JSDoc. The session override behavior should be documented as intentionally ephemeral.

## Warnings

### WR-01: ReadinessTargetSetting does not handle Enter key — users expect submit on Enter

**File:** `src/features/settings/ReadinessTargetSetting.tsx:62-71`
**Issue:** The custom readiness input only saves on `onBlur`. Users typing a custom value and pressing Enter will not see it save — they must click away. This is a UX gap that will feel like a bug.

**Fix:** Add an `onKeyDown` handler:
```tsx
onKeyDown={(e) => {
  if (e.key === "Enter") {
    e.currentTarget.blur(); // triggers handleBlur
  }
}}
```

### WR-02: CurrencySetting accepts any string from Select without validation

**File:** `src/features/settings/CurrencySetting.tsx:30-34`
**Issue:** `handleChange(value: string)` writes the value directly to DB without checking it's in `SUPPORTED_CURRENCIES`. While the Select UI constrains choices, a programmatic call or future code change could persist an unsupported currency code, causing `Intl.NumberFormat` to throw at every `formatCurrency` call site.

**Fix:**
```ts
function handleChange(value: string) {
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(value)) return;
  updateSetting.mutate(
    { key: "currency", value },
    { onError: () => toast.error("Could not save setting. Try again.") },
  );
}
```

### WR-03: Stale comment in ArmyReadinessCard references localStorage after migration

**File:** `src/features/dashboard/ArmyReadinessCard.tsx:6`
**Issue:** Comment says "Target persists in localStorage via useArmyReadinessTarget" but Phase 122 migrated persistence to `app_settings` in the DB. This will mislead future developers.

**Fix:** Update the comment to reference `app_settings` persistence.

### WR-04: UnitDetailSheet interface declares 3 props that are silently dropped

**File:** `src/features/units/UnitDetailSheet.tsx:38-40,50`
**Issue:** The `UnitDetailSheetProps` interface declares `onDatasheetConflict`, `pendingImportResolution`, and `onClearImportResolution`, and `CollectionPage.tsx` passes them (lines 270-272). However, the component destructuring at line 50 omits them: `{ open, unit, onClose, onEdit, onDelete, onPhotoClick }`. These callbacks are accepted but never used, meaning datasheet conflict handling is silently broken.

This is not a Phase 122 regression (it appears to be a pre-existing issue), but it was found during review and the props are actively passed by a consumer.

**Fix:** Either destructure and wire the three props to their intended consumers (likely `PlaybookTab`), or remove them from the interface and the call site if the feature was intentionally removed.

## Info

### IN-01: `CURRENCY_LOCALE_MAP` hardcodes EUR to `fr-FR` locale

**File:** `src/hooks/useCurrencyPreference.ts:5`
**Issue:** EUR is mapped to `fr-FR` formatting, which formats as `1 234,56 EUR`. Users in Germany, Spain, or other EUR countries would expect their local formatting conventions. This is acceptable for v1 but should be noted as a known limitation.

**Fix:** No immediate action needed. Future enhancement could allow explicit locale selection independent of currency.

### IN-02: Duplicated locale toggle UI between LanguageSetting and LocaleToggle

**File:** `src/features/settings/LanguageSetting.tsx` and `src/components/common/LocaleToggle.tsx`
**Issue:** Both files contain nearly identical EN/FR button toggle UI with the same invalidation logic (both import `LOCALE_QUERY_KEYS` and call `invalidateQueries` in the same pattern). The shared `LOCALE_QUERY_KEYS` module was a good extraction, but the button rendering and mutation logic could be further deduplicated.

**Fix:** Consider extracting a shared `LocaleButtonGroup` component used by both.

---

_Reviewed: 2026-06-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
