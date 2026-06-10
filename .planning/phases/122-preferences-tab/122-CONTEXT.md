# Phase 122: Preferences Tab - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the Preferences tab placeholder with 4 real settings controls: language (EN/FR), currency (EUR/GBP/USD/CAD/AUD/JPY), default faction, and army readiness points target. Each setting persists to the `app_settings` table (Phase 121 foundation) and integrates with the existing system that consumes it — locale store, formatCurrency, ActiveFactionContext, ArmyReadinessCard.

</domain>

<decisions>
## Implementation Decisions

### Language Setting & Locale Sync
- **D-01:** Single source of truth in `app_settings` (key: `locale`). The Zustand `localeStore` is either removed or converted to a derived cache seeded from `app_settings` on boot. Both the Settings language picker and the sidebar LocaleToggle write to `app_settings` via `useUpdateSetting`.
- **D-02:** On locale change, invalidate the same query keys the current `LocaleToggle` invalidates (`udb-factions`, `udb-units`, `udb-unit-detail`, `wahapedia-factions`, `datasheets-by-faction`, `datasheets-with-points`, `datasheet`).

### Currency Picker
- **D-03:** Standard locale-currency mapping: EUR→fr-FR, GBP→en-GB, USD→en-US, CAD→en-CA, AUD→en-AU, JPY→ja-JP. Setting key: `currency`.
- **D-04:** All `formatCurrency` call sites read the user's currency preference — not just the spending tracker. This ensures consistency across spending page, wishlist, and unit detail sheet.
- **D-05:** A typed convenience hook (e.g., `useCurrencyPreference()`) returns `{locale, currency}` derived from the settings map, with GBP/en-GB as the default when no setting exists.

### Default Faction on Boot
- **D-06:** `ActiveFactionContext` checks `app_settings` for key `default_faction_id` on mount. If set and valid, use it as the initial active faction. If not set, fall back to current localStorage behavior.
- **D-07:** The Settings control is a faction dropdown populated from `useFactions()`. Selecting "None" clears the setting (removes the key or sets empty).
- **D-08:** The sidebar faction picker continues to set the runtime active faction. The setting only affects cold start (which faction loads on app open).

### Army Readiness Target
- **D-09:** Move target persistence from localStorage to `app_settings` (key: `army_readiness_target`). Refactor `useArmyReadinessTarget` to read/write via `useAppSettings`/`useUpdateSetting`.
- **D-10:** Preset values remain 500/1000/1500/2000, plus a custom numeric input. The Settings UI shows the same presets as buttons (matching the ArmyReadinessCard pattern) plus a custom input field.
- **D-11:** The ArmyReadinessCard on the dashboard reads the persisted default on load but can still be overridden within the card's button group for the current session.

### Claude's Discretion
- Layout and visual arrangement of the 4 settings controls within the Preferences tab
- Whether to use a form-based approach or inline controls (selects, buttons, combobox)
- Whether to add a "Save" button or auto-save each setting on change
- How to surface the locale mapping table (hidden implementation detail vs. shown to user)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — PREF-01 through PREF-04 are the 4 requirements
- `.planning/ROADMAP.md` §Phase 122 — Success criteria and dependencies

### Phase 121 Foundation (prerequisite)
- `.planning/phases/121-settings-foundation/121-CONTEXT.md` — D-01 through D-10 define the settings infrastructure this phase builds on
- `src/db/queries/appSettings.ts` — Query module: `getAppSettings`, `getAppSetting`, `upsertAppSetting`
- `src/hooks/useAppSettings.ts` — Hook pair: `useAppSettings()` + `useUpdateSetting()`
- `src/app/settings/page.tsx` — Settings page shell with Tabs (replace Preferences placeholder)

### Existing Patterns (code)
- `src/stores/localeStore.ts` — Current Zustand locale store (to be replaced/refactored)
- `src/components/common/LocaleToggle.tsx` — Sidebar locale toggle (must sync with new setting)
- `src/lib/formatCurrency.ts` — Currency formatter accepting locale + currency params
- `src/context/ActiveFactionContext.tsx` — Faction context with localStorage persistence (integrate default)
- `src/hooks/useArmyReadiness.ts` — Army readiness hooks with localStorage target (migrate to DB)
- `src/features/dashboard/ArmyReadinessCard.tsx` — Dashboard card consuming readiness target

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useAppSettings.ts`: Generic settings hook pair — all 4 preferences read/write through this
- `src/components/ui/select.tsx`: shadcn Select for language and currency dropdowns
- `src/components/ui/button.tsx`: Button group pattern for points target presets (matches ArmyReadinessCard)
- `src/components/ui/input.tsx`: Number input for custom points target
- `src/hooks/useFactions.ts`: Faction list for the default faction dropdown

### Established Patterns
- Settings stored as TEXT in `app_settings`; type coercion in hook layer
- `INSERT OR REPLACE` upsert pattern for settings writes
- React Query invalidation on mutation via `queryClient.invalidateQueries`
- localStorage used for sidebar collapsed, locale, army readiness target — Phase 122 migrates the latter two to DB

### Integration Points
- `formatCurrency` already accepts locale + currency params — wire settings values through
- `ActiveFactionContext` already reads localStorage on init — add `app_settings` check before localStorage fallback
- `LocaleToggle` invalidates 7 query keys on locale change — same invalidation needed from Settings picker
- `useArmyReadinessTarget` currently returns `[target, setTarget]` — same API shape, different storage backend

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard settings controls following established codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 122-Preferences Tab*
*Context gathered: 2026-06-10*
