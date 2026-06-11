---
gsd_state_version: 1.0
milestone: v0.5.0
milestone_name: Settings & Preferences
status: executing
stopped_at: Phase 124 complete — only Phase 122 (Preferences Tab) remains
last_updated: "2026-06-10T19:37:00.000Z"
last_activity: 2026-06-10
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 10
  completed_plans: 9
  percent: 90
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-10)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with accurate canonical data and reliable backup/restore so local data is always recoverable
**Current focus:** Phase 122 — preferences-tab

## Current Position

Phase: 122 (preferences-tab) — Plan 01 complete
Plan: 1 of 2
Status: Plan 01 complete — GeneralPreferencesSection with 4 setting controls wired into Settings page
Last activity: 2026-06-11 -- Phase 122 Plan 01 complete

Progress: [█████████░] 90%

## Performance Metrics

**Velocity (recent milestones):**

- v0.4.7: 10 plans across 5 phases (6 days)
- v0.4.5: 7 plans across 4 phases (2 days)
- v0.4.2: 11 plans across 4 phases (single day)
- v0.4.0: 12 plans across 5 phases (3 days)
- v0.3.7: 6 plans across 3 phases (single day)

**Phase 121 (settings-foundation):**

- Plan 01: 18min, 3 tasks, 9 files

## Accumulated Context

### Key Decisions (carried forward)

- Single-database architecture — all data in hobbyforge.db
- Pre-built canonical unit database (not runtime sync)
- Settings page route stub exists at src/app/settings/page.tsx
- Sidebar link already wired for Settings
- Pipeline stage labels now have getBucketLabel() utility with custom label support via app_settings
- Hobby Defaults section in Settings Preferences tab with pipeline labels, checklist, mission format editors
- HobbyPipeline renders dynamic bucket labels from app_settings (only bucket-label consumer per D-05)
- BattleLogSheet pre-fills mission from default_mission_format on create only (D-11)
- gameDayStore exports getDefaultChecklist async + setDefaultChecklist action with existing-session guard
- GameDayPage wires async checklist defaults for new sessions via Zustand vanilla access
- Currency integration targets spending tracker (formatCurrency)
- Default faction integration targets ActiveFactionContext
- DB browser locale toggle (localStorage) must coexist with PREF-01 setting
- GeneralPreferencesSection renders 4 auto-save controls above HobbyDefaultsSection
- useCurrencyPreference hook returns {locale, currency} from app_settings with GBP/en-GB default
- LOCALE_QUERY_KEYS shared const used by LanguageSetting (Plan 02 will migrate LocaleToggle)
- DefaultFactionSetting uses __none__ sentinel for Radix Select empty-value workaround
- DDL-only migration 044 — no seed data, defaults in hook layer (boot-loop prevention per migration 038 precedent)
- AppSettingsMap = Record<string,string> — generic typed map, no convenience wrappers in Phase 121
- INSERT OR REPLACE upsert pattern for app_settings (idiomatic SQLite)
- Loading/error guard only on Preferences tab — Data and About are static placeholders in Phase 121
- No QueryClientProvider wrapper in SettingsPage tests — useAppSettings fully mocked at module level

### Pending Todos

None.

### Open Blockers

None.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 scope | EXT-01: Leader attachment targets | Deferred | v0.4.0 planning |
| v2 scope | ADV-01..02: Unit comparison, faction overview | Deferred | v0.4.0 planning |
| v2 scope | FR-EXT-01..02: French ability text, full UI translation | Deferred | v0.4.2 planning |
| Future | EFA-01..03: Extended faction audits (22 factions) | Future milestone | v0.4.5 planning |
| Future | French translations for stratagems/enhancements | Future milestone | v0.4.7 planning |

## Session Continuity

Last session: 2026-06-11T07:10:00.000Z
Stopped at: Phase 122 Plan 01 complete — Plan 02 (consumer integration) remains
Resume file: .planning/phases/122-preferences-tab/122-02-PLAN.md
Resume: Plan 01 delivered GeneralPreferencesSection with 4 setting controls, useCurrencyPreference hook, and LOCALE_QUERY_KEYS. Plan 02 wires consumers (LocaleToggle, formatCurrency, ActiveFactionContext, useArmyReadinessTarget).
