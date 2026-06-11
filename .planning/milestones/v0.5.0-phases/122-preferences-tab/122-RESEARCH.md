# Phase 122: Preferences Tab - Research

**Researched:** 2026-06-11
**Domain:** Settings UI, localStorage-to-DB migration, cross-component integration
**Confidence:** HIGH

## Summary

Phase 122 replaces the placeholder text in the Settings Preferences tab with 4 real settings controls (language, currency, default faction, army readiness target). Each setting persists to the `app_settings` table via the Phase 121 foundation (`useAppSettings`/`useUpdateSetting`) and integrates with an existing consumer system. The core challenge is not building the UI controls (straightforward shadcn components) but correctly migrating 3 localStorage-backed systems to DB-backed persistence while maintaining backward compatibility and keeping the sidebar `LocaleToggle` in sync.

The Phase 123 `HobbyDefaultsSection` establishes the definitive inline auto-save pattern: read settings from `useAppSettings()`, call `updateSetting.mutate()` on change, show `toast.error()` on failure. All 4 preference controls follow this same pattern with zero deviation.

**Primary recommendation:** Build a `GeneralPreferencesSection` component (parallel to `HobbyDefaultsSection`) containing 4 setting rows, each following the two-column label+control layout from the UI spec. Refactor `LocaleToggle`, `formatCurrency` call sites, `ActiveFactionContext`, and `useArmyReadinessTarget` to read from `app_settings` instead of localStorage/hardcoded defaults.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Single source of truth in `app_settings` (key: `locale`). Zustand `localeStore` removed or converted to derived cache. Both Settings picker and sidebar LocaleToggle write to `app_settings` via `useUpdateSetting`. `Locale` type re-exported from shared types if localeStore is removed.
- D-02: On locale change, invalidate 7 query keys: `udb-factions`, `udb-units`, `udb-unit-detail`, `wahapedia-factions`, `datasheets-by-faction`, `datasheets-with-points`, `datasheet`.
- D-03: Locale-currency mapping: EUR->fr-FR, GBP->en-GB, USD->en-US, CAD->en-CA, AUD->en-AU, JPY->ja-JP. Setting key: `currency`.
- D-04: All `formatCurrency` call sites read user's currency preference (spending, wishlist, unit detail).
- D-05: Typed convenience hook `useCurrencyPreference()` returns `{locale, currency}` with GBP/en-GB default.
- D-06: `ActiveFactionContext` checks `app_settings` for `default_faction_id` on mount. Falls back to localStorage.
- D-07: Settings control is faction dropdown from `useFactions()`. "None" clears the setting.
- D-08: Sidebar faction picker sets runtime active faction. Setting only affects cold start.
- D-09: Move army readiness target from localStorage to `app_settings` (key: `army_readiness_target`).
- D-10: Preset values 500/1000/1500/2000 plus custom numeric input.
- D-11: ArmyReadinessCard reads persisted default on load, can still be overridden within the card for current session.
- D-12: Preferences controls go ABOVE `<HobbyDefaultsSection />` with "General" or "App Preferences" heading.

### Claude's Discretion
- Exact visual arrangement of the 4 settings controls
- Form-based vs inline controls (Phase 123 established inline auto-save as the pattern)
- Whether locale-currency mapping table is hidden or shown to user

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PREF-01 | User can set default language (EN/FR) from Settings, persisted in `app_settings` | Locale setting row + localeStore migration + LocaleToggle sync + 7-key invalidation |
| PREF-02 | User can pick currency; spending tracker uses selected currency | Currency setting row + `useCurrencyPreference` hook + formatCurrency call site wiring |
| PREF-03 | User can set a default faction that loads as active on app start | Faction dropdown + ActiveFactionContext boot integration |
| PREF-04 | User can set a default army readiness points target (500/1000/1500/2000 or custom) | Points target control + useArmyReadinessTarget migration to app_settings |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Language preference UI | Frontend (React) | -- | Settings form control, purely presentational |
| Locale storage migration | Database (SQLite) | Frontend (React) | Moves from localStorage to app_settings table |
| Locale query invalidation | Frontend (React Query) | -- | 7 query keys invalidated on locale change |
| Currency preference UI | Frontend (React) | -- | Select dropdown control |
| Currency formatting | Frontend (React) | -- | `Intl.NumberFormat` in browser, reads DB-backed preference |
| Default faction UI | Frontend (React) | -- | Faction select populated from DB query |
| Default faction boot | Frontend (React Context) | Database (SQLite) | Context reads app_settings on mount for initial faction |
| Army readiness target UI | Frontend (React) | -- | Button group + custom input |
| Army readiness storage | Database (SQLite) | Frontend (React) | Migrates from localStorage to app_settings |

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Project standard |
| @tanstack/react-query | 5.x | Server state (useAppSettings, useFactions) | Project standard |
| shadcn/ui | N/A | Button, Select, Input, Skeleton components | Project standard |
| Zustand | 5.x | localeStore (being migrated away from) | Project standard |
| sonner | N/A | Toast notifications for save errors | Project standard |

### Supporting
No new libraries needed. All UI components are already installed shadcn primitives.

**Installation:** None required.

## Architecture Patterns

### System Architecture Diagram

```
Settings Page (Preferences tab)
    |
    v
GeneralPreferencesSection
    |
    +-- LanguageSetting -----> useUpdateSetting("locale", value)
    |                              |
    |                              +--> invalidate 7 query keys
    |                              +--> LocaleToggle reads from app_settings (sync)
    |
    +-- CurrencySetting -----> useUpdateSetting("currency", value)
    |                              |
    |                              +--> useCurrencyPreference() hook
    |                              +--> formatCurrency call sites read preference
    |
    +-- DefaultFactionSetting -> useUpdateSetting("default_faction_id", value)
    |                              |
    |                              +--> ActiveFactionContext reads on boot
    |
    +-- ReadinessTargetSetting -> useUpdateSetting("army_readiness_target", value)
                                   |
                                   +--> useArmyReadinessTarget reads from app_settings
                                   +--> ArmyReadinessCard can override per-session
```

### Recommended Project Structure

```
src/features/settings/
  GeneralPreferencesSection.tsx   # New — wrapper for 4 settings rows
  LanguageSetting.tsx             # New — EN/FR segmented button
  CurrencySetting.tsx             # New — currency Select dropdown
  DefaultFactionSetting.tsx       # New — faction Select dropdown
  ReadinessTargetSetting.tsx      # New — preset buttons + custom input
  HobbyDefaultsSection.tsx        # Existing — stays below GeneralPreferencesSection
src/hooks/
  useCurrencyPreference.ts        # New — typed {locale, currency} from app_settings
  useAppSettings.ts               # Existing — no changes
  useArmyReadiness.ts             # Modified — reads from app_settings instead of localStorage
src/stores/
  localeStore.ts                  # Removed or gutted — replaced by app_settings
src/types/
  locale.ts                       # New or inline — re-export Locale type if localeStore removed
```

### Pattern 1: Inline Auto-Save Setting Row (established in Phase 123)

**What:** Each setting control immediately writes to `app_settings` on user action. No form, no submit button.
**When to use:** All 4 preference controls.
**Example:**
```typescript
// Source: src/features/settings/PipelineLabelsEditor.tsx (Phase 123 pattern)
const updateSetting = useUpdateSetting();

function handleChange(value: string) {
  updateSetting.mutate(
    { key: "currency", value },
    { onError: () => toast.error("Could not save setting. Try again.") }
  );
}
```

### Pattern 2: Two-Column Setting Row Layout (from UI spec)

**What:** Label+description on left, control on right.
**When to use:** All 4 setting rows in GeneralPreferencesSection.
**Example:**
```typescript
// Source: 122-UI-SPEC.md layout contract
function SettingRow({ label, description, children }: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-[160px]">{children}</div>
    </div>
  );
}
```

### Pattern 3: localStorage-to-DB Migration

**What:** Replace localStorage reads with app_settings reads, maintaining the same hook API shape.
**When to use:** Locale (D-01), army readiness target (D-09), default faction boot (D-06).
**Example:**
```typescript
// useArmyReadinessTarget: same [target, setTarget] API, different storage backend
export function useArmyReadinessTarget(): readonly [number, (next: number) => void] {
  const { data: settings } = useAppSettings();
  const updateSetting = useUpdateSetting();

  const persisted = Number(settings?.["army_readiness_target"]) || 2000;
  const [sessionOverride, setSessionOverride] = useState<number | null>(null);

  const target = sessionOverride ?? persisted;

  function setTarget(next: number) {
    setSessionOverride(next);
    // Optionally write to DB for persistence
  }

  return [target, setTarget] as const;
}
```

### Anti-Patterns to Avoid
- **Dual source of truth:** Do NOT have both localStorage and app_settings storing the same preference. The migration must be clean: read from app_settings, localStorage is fallback only for first-time migration, then cleared.
- **Invalidating settings on every preference write:** The `useUpdateSetting` hook already invalidates `APP_SETTINGS_KEY`. Do NOT also invalidate it manually. For locale, the additional 7 query keys are separate and DO need explicit invalidation.
- **Wrapping all 4 controls in a React Hook Form:** This phase uses inline auto-save, not form submission. Each control is independent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency formatting | Custom number formatting | `Intl.NumberFormat` (already in `formatCurrency`) | Handles locale-specific decimal/grouping separators, currency symbols |
| Locale-currency mapping | Hardcoded switch statement | Const object/map (`CURRENCY_LOCALE_MAP`) | Single source of truth, easy to extend |
| Debounced input save | setTimeout/clearTimeout | Blur-based save for custom points input | UI spec says debounce 400ms or on blur; blur is simpler and matches PipelineLabelsEditor pattern |

## Common Pitfalls

### Pitfall 1: LocaleToggle and Settings Language Out of Sync
**What goes wrong:** User changes language in Settings, but the sidebar LocaleToggle still shows the old locale because it reads from the Zustand store, not app_settings.
**Why it happens:** Two separate state sources (Zustand localeStore vs app_settings).
**How to avoid:** Both must read from the same source. Either (a) remove localeStore entirely and have both read from `useAppSettings`, or (b) keep localeStore as a derived cache that is updated whenever `app_settings` changes. Option (a) is cleaner.
**Warning signs:** Toggle shows "EN" but settings shows "FR" selected.

### Pitfall 2: LocaleToggle Re-render Frequency
**What goes wrong:** If LocaleToggle reads from `useAppSettings()` (which returns the entire settings map), it re-renders on ANY setting change, not just locale.
**Why it happens:** `useAppSettings` returns a new object reference on every query refetch.
**How to avoid:** Use `select` option in useQuery to extract just the locale value, or create a `useLocaleSetting()` convenience hook that selects only the locale key. Alternatively, `useMemo` on the extracted value.
**Warning signs:** Unnecessary sidebar re-renders when changing currency or other settings.

### Pitfall 3: Consumers Reading Locale from localeStore After Migration
**What goes wrong:** `useUnitDatabase.ts` and `useDatasheet.ts` (4+ call sites) import `useLocaleStore` to get the current locale for query functions. If localeStore is removed but these imports are not updated, the app breaks.
**Why it happens:** Incomplete migration — forgot to update all consumers.
**How to avoid:** Grep for ALL `useLocaleStore` imports (found in: `useUnitDatabase.ts`, `useDatasheet.ts`, `LocaleToggle.tsx`). Each must be migrated to read from `app_settings`.
**Warning signs:** TypeScript compilation errors if localeStore is removed; stale locale if it's kept but not updated.

### Pitfall 4: formatCurrency Call Sites Not Receiving Currency Preference
**What goes wrong:** `formatCurrency` defaults to GBP/en-GB. If call sites don't pass the user's preference, changing currency in Settings has no visible effect.
**Why it happens:** `formatCurrency` accepts optional locale/currency params, but 14 call sites currently pass no arguments (using defaults).
**How to avoid:** Create `useCurrencyPreference()` hook. Each component that calls `formatCurrency` must call this hook and pass the values through. Affected files: `SpendingPage.tsx` (7 calls), `SpendTrendChart.tsx` (2 calls), `WishlistPage.tsx` (1 call), `WishlistItemRow.tsx` (1 call), `UnitDetailSheet.tsx` (1 call).
**Warning signs:** User selects EUR in Settings but spending page still shows GBP amounts.

### Pitfall 5: Army Readiness Session Override vs Persisted Default
**What goes wrong:** D-11 says the ArmyReadinessCard can override the target for the current session. If `useArmyReadinessTarget` always writes to DB, the dashboard override persists and changes the Settings default unexpectedly.
**Why it happens:** Conflating "session override in the card" with "persisted default in settings."
**How to avoid:** The hook needs two layers: (1) persisted default from `app_settings` (written by Settings), (2) session-level override state in the card component. The card's button group sets the session override; Settings sets the persisted default.
**Warning signs:** Clicking 500 in the dashboard card permanently changes the Settings target.

### Pitfall 6: ActiveFactionContext Boot Race Condition
**What goes wrong:** `ActiveFactionContext` initializes from localStorage synchronously in `useState(() => ...)`. If it now needs to read from `app_settings` (async React Query), the initial render has no faction, causing a flash.
**Why it happens:** localStorage reads are synchronous; DB reads via React Query are async.
**How to avoid:** Keep localStorage as immediate boot value. Layer the `app_settings` read as a secondary effect: on first load, if `app_settings.default_faction_id` exists and localStorage has no value, set it. This is a one-time migration path. After migration, localStorage stays in sync as a cache.
**Warning signs:** Faction accent flashes from zinc to faction color on every cold start.

## Code Examples

### Currency Preference Hook
```typescript
// Source: pattern derived from D-03/D-05 in CONTEXT.md
const CURRENCY_LOCALE_MAP: Record<string, string> = {
  EUR: "fr-FR",
  GBP: "en-GB",
  USD: "en-US",
  CAD: "en-CA",
  AUD: "en-AU",
  JPY: "ja-JP",
};

export function useCurrencyPreference() {
  const { data: settings } = useAppSettings();
  const currency = settings?.["currency"] ?? "GBP";
  const locale = CURRENCY_LOCALE_MAP[currency] ?? "en-GB";
  return { locale, currency };
}
```

### Locale Setting with Invalidation
```typescript
// Source: pattern derived from LocaleToggle.tsx invalidation list (D-02)
const LOCALE_QUERY_KEYS = [
  "udb-factions", "udb-units", "udb-unit-detail",
  "wahapedia-factions", "datasheets-by-faction",
  "datasheets-with-points", "datasheet",
] as const;

function handleLocaleChange(next: "en" | "fr") {
  updateSetting.mutate(
    { key: "locale", value: next },
    {
      onSuccess: () => {
        LOCALE_QUERY_KEYS.forEach(k =>
          queryClient.invalidateQueries({ queryKey: [k] })
        );
      },
      onError: () => toast.error("Could not save setting. Try again."),
    }
  );
}
```

### GeneralPreferencesSection Structure
```typescript
// Source: mirrors HobbyDefaultsSection.tsx structure
export function GeneralPreferencesSection() {
  const { data: settings = {} } = useAppSettings();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">App Preferences</h3>
      </div>
      <LanguageSetting settings={settings} />
      <CurrencySetting settings={settings} />
      <DefaultFactionSetting settings={settings} />
      <ReadinessTargetSetting settings={settings} />
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Locale in Zustand+localStorage | Locale in app_settings (SQLite) | Phase 122 | Single source of truth, survives app data operations |
| Army readiness target in localStorage | Target in app_settings (SQLite) | Phase 122 | Included in backup/restore, Settings UI access |
| formatCurrency hardcoded to GBP | formatCurrency reads user preference | Phase 122 | Multi-currency support across entire app |
| Active faction init from localStorage only | Active faction init checks app_settings first | Phase 122 | Default faction survives browser storage clear |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/settings/` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PREF-01 | Language setting renders EN/FR toggle, saves to app_settings | unit | `pnpm test -- tests/settings/GeneralPreferencesSection.test.tsx` | No - Wave 0 |
| PREF-02 | Currency select saves value, useCurrencyPreference returns correct locale/currency | unit | `pnpm test -- tests/settings/useCurrencyPreference.test.ts` | No - Wave 0 |
| PREF-03 | Default faction select populated from useFactions, saves ID | unit | `pnpm test -- tests/settings/GeneralPreferencesSection.test.tsx` | No - Wave 0 |
| PREF-04 | Points target presets + custom input save to app_settings | unit | `pnpm test -- tests/settings/GeneralPreferencesSection.test.tsx` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/settings/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/settings/GeneralPreferencesSection.test.tsx` -- covers PREF-01, PREF-03, PREF-04
- [ ] `tests/settings/useCurrencyPreference.test.ts` -- covers PREF-02 hook logic

## Security Domain

No security concerns in this phase. All 4 settings are non-sensitive user preferences stored in a local SQLite database. No authentication, no external network calls, no user input that reaches SQL (parameterized queries already enforced by the existing `upsertAppSetting` function).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | yes (minimal) | HTML `type=number` + `min/max` for custom points; Locale type union constraint; currency value from closed set |
| V6 Cryptography | no | -- |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `useAppSettings` hook returns data synchronously enough for LocaleToggle to avoid flash of wrong locale | Pitfalls | If stale, sidebar shows wrong locale for one frame until query resolves |
| A2 | Removing localeStore entirely is cleaner than keeping it as derived cache | Architecture | If other code depends on Zustand's synchronous access pattern, may need to keep localeStore as thin wrapper |

## Open Questions

1. **Should localeStore be removed entirely or kept as a thin derived cache?**
   - What we know: 3 files import `useLocaleStore` (useUnitDatabase, useDatasheet, LocaleToggle). All could be migrated to read from `useAppSettings` with a select/memo.
   - What's unclear: Whether the synchronous nature of Zustand (no loading state) is critical for the query hooks that use locale as a parameter.
   - Recommendation: Remove localeStore entirely. The `useAppSettings` query will be cached after first load (5min staleTime). The hooks that need locale can use a `useLocale()` convenience hook that selects from app_settings with a default of "en". If loading, "en" default is acceptable for the brief initial period.

2. **Custom points target: debounce vs blur-only?**
   - What we know: UI spec says "debounce 400ms after last keystroke, or fire on blur." PipelineLabelsEditor uses blur-only.
   - What's unclear: Whether users expect live feedback as they type a custom value.
   - Recommendation: Use blur-only (matching PipelineLabelsEditor pattern). Simpler, proven in codebase.

## Sources

### Primary (HIGH confidence)
- `src/hooks/useAppSettings.ts` -- Phase 121 settings hook pair (read directly)
- `src/stores/localeStore.ts` -- Current locale storage (read directly)
- `src/components/common/LocaleToggle.tsx` -- Sidebar toggle with 7-key invalidation (read directly)
- `src/lib/formatCurrency.ts` -- Currency formatter with locale/currency params (read directly)
- `src/context/ActiveFactionContext.tsx` -- Faction context with localStorage init (read directly)
- `src/hooks/useArmyReadiness.ts` -- Army readiness hooks with localStorage target (read directly)
- `src/features/settings/HobbyDefaultsSection.tsx` -- Phase 123 pattern for settings sections (read directly)
- `src/features/settings/PipelineLabelsEditor.tsx` -- Inline auto-save editor pattern (read directly)
- `src/app/settings/page.tsx` -- Settings page shell with placeholder (read directly)
- `122-CONTEXT.md` -- All 12 implementation decisions (read directly)
- `122-UI-SPEC.md` -- Full visual and interaction contract (read directly)

### Secondary (MEDIUM confidence)
- Grep results for `formatCurrency` -- 14 call sites across 5 files (verified via codebase grep)
- Grep results for `useLocaleStore` -- 3 consumer files beyond the store itself (verified via codebase grep)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all shadcn/React Query patterns already established
- Architecture: HIGH -- follows Phase 123 patterns exactly, all integration points read directly
- Pitfalls: HIGH -- based on direct code analysis of all 6 integration points

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (stable internal patterns, no external dependencies)
