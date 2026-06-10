# Phase 122: Preferences Tab - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 122-Preferences Tab
**Areas discussed:** Language sync, Currency mapping, Default faction boot, Readiness target migration
**Mode:** --auto (all decisions auto-selected)

---

## Language Setting & Locale Sync

| Option | Description | Selected |
|--------|-------------|----------|
| Single source of truth in app_settings | Remove/refactor Zustand localeStore, both Settings and sidebar write to DB | [auto] ✓ |
| Dual-write from both controls | Keep Zustand store and DB, sync between them | |

**Auto-selected:** Single source of truth in app_settings (recommended default)
**Notes:** Two stores for the same setting creates sync bugs. The existing LocaleToggle query invalidation pattern is preserved.

---

## Currency Picker Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Standard locale-currency pairs, wire all call sites | EUR→fr-FR, GBP→en-GB, USD→en-US, etc. All formatCurrency consumers use the setting | [auto] ✓ |
| Wire spending tracker only | Only the spending page reads the currency setting | |

**Auto-selected:** Standard locale-currency pairs, wire all call sites (recommended default)
**Notes:** Consistency across all monetary displays. formatCurrency already accepts locale+currency params.

---

## Default Faction on Boot

| Option | Description | Selected |
|--------|-------------|----------|
| Read from app_settings, localStorage fallback | Check DB first, fall back to localStorage if no setting | [auto] ✓ |
| Replace localStorage entirely | Remove localStorage persistence from ActiveFactionContext | |

**Auto-selected:** Read from app_settings, localStorage fallback (recommended default)
**Notes:** Preserves existing UX for users who haven't set a preference. Setting only affects cold start.

---

## Army Readiness Target Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Move to app_settings | Refactor useArmyReadinessTarget to use DB instead of localStorage | [auto] ✓ |
| Keep localStorage | Leave as-is, don't migrate | |

**Auto-selected:** Move to app_settings (recommended default)
**Notes:** All preferences in one place for backup/restore consistency. Same API shape, different storage.

---

## Claude's Discretion

- Layout and arrangement of settings controls within Preferences tab
- Form-based vs. inline controls approach
- Auto-save vs. explicit save button
- Locale mapping visibility

## Deferred Ideas

None — discussion stayed within phase scope
