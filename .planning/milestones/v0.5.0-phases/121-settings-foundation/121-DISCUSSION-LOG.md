# Phase 121: Settings Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 121-Settings Foundation
**Areas discussed:** Key-value schema design, Tab structure & navigation, Settings hook API shape, Migration strategy
**Mode:** --auto (all decisions auto-selected)

---

## Key-Value Schema Design

| Option | Description | Selected |
|--------|-------------|----------|
| Flat key-value table | `app_settings(key TEXT PK, value TEXT, updated_at TEXT)` — flexible, type coercion in TS | ✓ |
| Typed columns | One column per setting — rigid, migration per new setting | |
| JSON blob | Single row with JSON — no per-key queries, harder to extend | |

**Auto-selected:** Flat key-value table (recommended default)
**Notes:** Most flexible for a multi-phase settings system where Phases 122–125 each add their own keys. Matches the app's pattern of simple DB + rich TypeScript layer.

---

## Tab Structure & Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| 3 tabs (Preferences / Data / About) | Matches ROADMAP.md specification exactly | ✓ |
| 4+ tabs (split Hobby Defaults) | More granular, may feel sparse | |

**Auto-selected:** 3 tabs as specified (recommended default)
**Notes:** ROADMAP.md and REQUIREMENTS.md are explicit. Hobby Defaults (Phase 123) fits under Preferences or can be split later.

---

## Settings Hook API Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Generic pair (useAppSettings + useUpdateSetting) | Matches INF-02, extensible, phases add typed wrappers | ✓ |
| Per-setting hooks | One hook per setting key — many small files, premature | |

**Auto-selected:** Generic hook pair (recommended default)
**Notes:** Follows INF-02 requirement verbatim. Individual typed convenience wrappers can be added by downstream phases.

---

## Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Table only (044_app_settings.sql) | Creates table, defaults in hook layer | ✓ |
| Table + seed defaults | Pre-populates default settings rows | |

**Auto-selected:** Table only, no seed data (recommended default)
**Notes:** App should work with empty table. Hook layer provides fallback defaults. Each phase seeds its own defaults when needed.

---

## Claude's Discretion

- File organization within `src/features/settings/` or directly in `src/app/settings/`
- Component structure for the tab shell
- Error handling for malformed settings values

## Deferred Ideas

None — discussion stayed within phase scope
