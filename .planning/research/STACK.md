# Stack Research

**Domain:** Warhammer hobby management — applied recipes, points import, list validation
**Researched:** 2026-05-12
**Confidence:** HIGH

---

## Executive Summary

All three v0.2.10 feature areas (applied recipes, points import, army list validation) are
achievable with **zero new npm dependencies**. Every capability needed is already present
in the installed stack or is a pure TypeScript implementation. The research below maps each
requirement to the specific existing tool that covers it, and calls out exactly what
integration work each feature requires.

---

## Recommended Stack

### Core Technologies (no version changes)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| tauri-plugin-sql | ^2.4.0 (installed) | New hobbyforge.db tables for applied recipe progress + points import | All existing DB patterns; 20 migrations already landed with this plugin |
| React Query | ^5.100.6 (installed) | Cache layer for progress state, imported points, validation results | Established `ENTITY_KEY + useEntity + useMutation + invalidate` pattern; every feature area follows this |
| React Hook Form + Zod | ^7.74 + ^4.4.1 (installed) | Import form (version label, faction scope field, file path) | Used for every Sheet form in the app |
| shadcn/ui Progress | installed via radix-ui | Per-unit applied recipe completion bar | `src/components/ui/progress.tsx` exists, wired to Radix Progress primitive. Used on ArmyReadinessCard already. |
| shadcn/ui Checkbox | installed via radix-ui | Per-step completion tick in applied recipe checklist view | `src/components/ui/checkbox.tsx` exists, wired to Radix Checkbox primitive |
| tauri-plugin-fs | ^2.5.1 (installed) | Read CSV bytes for points import pipeline | Already used by Wahapedia sync. Same `readTextFile()` call. |
| tauri-plugin-dialog | ^2.7.1 (installed) | File picker for points CSV (`dialog.open({ filters: [{ name: 'CSV', extensions: ['csv'] }] })`) | Used in sync pipeline. Same pattern. |
| Zustand | ^5.0.12 (installed) | UI-only state for bulk-apply unit selection checkbox set | Follows collection filter / game day Zustand patterns |
| shadcn/ui Badge | installed | Validation warning severity indicators, freshness badges, tag chips | Already used for painting status, override markers, sync freshness |

### Supporting Libraries (internal, no new installs)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/parseWahapediaCsv.ts` | internal | Points CSV parsing (trivial comma variant) | Points CSV is simpler than Wahapedia's pipe-delimited format. Add `parsePointsCsv()` alongside it — a one-line change to the separator. |
| `src/lib/validateCsvHeaders.ts` | internal | Column validation for points CSV | Extend `REQUIRED_HEADERS` map with the points CSV key (e.g., `"points.csv": ["unit_name", "points"]`). Zero new code. |
| `src/lib/dates.ts` | internal | `todayISO()` for import timestamps; freshness delta computation | Single source of truth for timezone-safe dates. `julianday()` staleness in SQL; `todayISO()` for default version label. |

---

## Feature-to-Stack Mapping

### AR-01 to AR-07 — Applied Recipes

**New migrations required:**

`021_applied_recipes.sql` — two new tables:

```sql
CREATE TABLE IF NOT EXISTS unit_recipe_assignments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id    INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  recipe_id  INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes      TEXT
);

CREATE TABLE IF NOT EXISTS unit_recipe_step_progress (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL
                REFERENCES unit_recipe_assignments(id) ON DELETE CASCADE,
  step_id       INTEGER NOT NULL
                REFERENCES recipe_steps(id) ON DELETE CASCADE,
  completed     INTEGER NOT NULL DEFAULT 0,  -- 0|1 SQLite boolean
  completed_at  TEXT,
  UNIQUE (assignment_id, step_id)
);
```

**Stack coverage by AR requirement:**

| Requirement | How Met |
|-------------|---------|
| AR-01 data model | New migration above; `src/db/queries/appliedRecipes.ts` query file |
| AR-02 assignment UX | Sheet over existing UnitDetailSheet or Collection page; RHF + existing recipe Select/Combobox |
| AR-03 per-unit step completion | `UPDATE unit_recipe_step_progress SET completed=1` on checkbox click; React Query mutation + invalidate |
| AR-04 applied recipe display | `<Progress value={pct} />` (installed) + checkbox list in new AppliedRecipeSheet |
| AR-05 Log Session integration | Add optional `assignment_id` to `logSessionSchema`; mark step complete as side-effect of logging |
| AR-06 Kanban/CurrentFocus | Extend `useKanbanEnrichment` batch query — same pattern as `useWorkflowPositions` added in v0.2.9 |
| AR-07 bulk apply | Sequential `mutateAsync` loop — established pattern per KEY DECISIONS (bulk wishlist add) |

**No new dependencies needed.**

### PI-01 to PI-05 — Points Import

**New migration required:**

`022_points_imports.sql` — two new tables (schema from `.planning/points-import-design.md`):

```sql
CREATE TABLE IF NOT EXISTS points_imports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_name   TEXT    NOT NULL,
  faction_id  TEXT,
  points      INTEGER NOT NULL,
  source      TEXT    NOT NULL DEFAULT 'csv',
  imported_at TEXT    NOT NULL DEFAULT (datetime('now')),
  version     TEXT,
  UNIQUE (unit_name, faction_id)
);

CREATE TABLE IF NOT EXISTS points_import_history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  imported_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  source_file   TEXT,
  version       TEXT,
  row_count     INTEGER NOT NULL DEFAULT 0,
  delta_added   INTEGER NOT NULL DEFAULT 0,
  delta_removed INTEGER NOT NULL DEFAULT 0,
  delta_changed INTEGER NOT NULL DEFAULT 0
);
```

**Stack coverage by PI requirement:**

| Requirement | How Met |
|-------------|---------|
| PI-01 data layer | Migration above; `src/db/queries/pointsImports.ts` |
| PI-02 import pipeline | `dialog.open()` (plugin-dialog) + `readTextFile()` (plugin-fs) + `parsePointsCsv()` (internal lib) + sequential INSERT OR REPLACE loop |
| PI-03 freshness tracking | `points_import_history.imported_at` + staleness badge from `julianday('now') - julianday(imported_at) > 30` SQL |
| PI-04 delta detection | TypeScript `Map<string, number>` before/after snapshot comparison — pure TS, < 10ms on 500 rows |
| PI-05 COALESCE chain | SQL-only change to `getArmyListWithUnits` + `getArmyListReadiness`: add `LEFT JOIN points_imports pi ON pi.unit_name = u.name AND (pi.faction_id IS NULL OR pi.faction_id = ...)` and extend COALESCE from 3-level to 5-level |

**COALESCE update** (both queries in `armyLists.ts`):

```sql
-- Before (3-level):
COALESCE(alu.points_override, uo.points, u.points, 0)

-- After (5-level per points-import-design.md):
COALESCE(alu.points_override, pi.points, uo.points, u.points, 0)
```

**No new dependencies needed.**

### LV-01 to LV-04 — Army List Validation

**New migration required:**

`023_tactical_tags.sql` — one new column:

```sql
ALTER TABLE units ADD COLUMN tactical_tags TEXT DEFAULT NULL;
```

Comma-separated list of user-assigned tag strings (e.g., `"anti_tank,screening"`). Consistent with `keywords TEXT` column pattern in `unit_overrides`.

**Stack coverage by LV requirement:**

| Requirement | How Met |
|-------------|---------|
| LV-01 hard validation | `validateArmyList(units, list, importMeta): ValidationWarning[]` pure TS function in `src/lib/validateArmyList.ts`. Same testable pure-function pattern as `computeWorkflowPosition`. |
| LV-02 tactical tags | New `tactical_tags TEXT` column on units. Tag editor: comma-separated Input or multi-select using existing shadcn/ui cmdk Command component (already installed — used by PaintCombobox). |
| LV-03 role coverage | Pure TS: split `tactical_tags` strings for all units in list, aggregate into `Map<tag, count>`, compare against expected set. No graph library. |
| LV-04 health UI | Compose existing Badge + shadcn/ui Card + Separator. Warning types map to Badge variants: `destructive` (over limit, unknown points), `secondary` (stale import, unbuilt), `outline` (coverage gap). |
| GD-01 Game Day warnings | Same `validateArmyList()` function output, rendered in GameDayPage pre-game checklist. Zero new tooling. |

**`ValidationWarning` type:**

```typescript
export type ValidationWarningType =
  | 'over_limit'
  | 'unknown_points'
  | 'stale_import'
  | 'no_import'
  | 'unbuilt_units'
  | 'unpainted_units'
  | 'coverage_gap';

export interface ValidationWarning {
  type: ValidationWarningType;
  severity: 'hard' | 'soft';
  message: string;
  unit_id?: number;
  tag?: string;  // for coverage_gap type
}
```

**No new dependencies needed.**

---

## What NOT to Add

| Library | Reason to Skip |
|---------|---------------|
| papaparse | 43 KB bundle weight for a hand-rolled parser problem. Existing `parseWahapediaCsv` is pipe-delimited; points CSV is comma-delimited. Adding a variant function is 5 lines. Wahapedia research (v0.2.6) explicitly chose no library — same decision applies here. |
| immer | Mutations are server-state via React Query + tauri-plugin-sql. No complex nested client objects. |
| @tanstack/react-virtual | Applied recipe step list: 10-30 steps maximum. Virtualization would be premature. |
| xstate | Validation is a pure function returning a flat array. 7 warning types do not warrant a state machine. |
| json-rules-engine | Validation rules are simple arithmetic and null checks. A typed switch in TypeScript is clearer and faster. |
| Drizzle ORM | PROJECT.md: Drizzle is a v3 escape hatch only. At 24 typed query files, raw queries remain manageable. |
| Worker threads / SharedWorker | Delta computation runs on < 500 rows. Main-thread TypeScript Map comparison: < 5ms. No background worker needed. |
| Any tag/chip UI library | Tags are rendered as `<Badge>` components. The project already has the badge primitive and the cmdk Command component for multi-select search. |
| react-dropzone | CSV import uses `dialog.open()` from Tauri's native file picker. No drag-and-drop dropzone; native picker matches the app's desktop-native feel. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| CSV parsing | Internal `parsePointsCsv()` (5-line variant of existing parser) | papaparse | Zero dependency, zero bundle impact, no quoting edge cases in points CSV |
| Progress UI | shadcn/ui Progress (installed) | react-circular-progressbar | No install needed; `<Progress>` is already consistent with ArmyReadinessCard bars |
| Validation engine | Pure TypeScript function returning typed array | json-rules-engine | 7 warning types, no dynamic rule loading, no JSON config needed |
| Tactical tags storage | TEXT column on units (comma-separated) | Junction table `unit_tactical_tags` | Tags are user labels with < 10 values per unit. TEXT column with TS split follows `keywords TEXT` pattern in unit_overrides. Junction table adds migration + query complexity at no scale benefit. |
| Delta detection | In-memory TypeScript Map comparison | SQL EXCEPT / MINUS | tauri-plugin-sql does not expose multi-statement temp-table transactions cleanly; TS Map on < 500 rows is faster to write and easier to test |
| File picker | `dialog.open()` (tauri-plugin-dialog, installed) | HTML `<input type="file">` | Tauri's native picker matches desktop-native feel; HTML file input works in Tauri but is less polished. Existing sync pipeline uses `dialog.open()`. |

---

## Integration Contracts

### Migration numbering
Next migration after `020_workflow_metadata.sql` is `021`. Three new migrations needed:
- `021_applied_recipes.sql` — `unit_recipe_assignments` + `unit_recipe_step_progress`
- `022_points_imports.sql` — `points_imports` + `points_import_history`
- `023_tactical_tags.sql` — `ALTER TABLE units ADD COLUMN tactical_tags TEXT`

Register in `src-tauri/src/lib.rs` at versions 21, 22, 23.

### Cache key conventions
Follow existing pattern exactly:

```typescript
export const APPLIED_RECIPE_KEY = (unitId: number) => ["applied-recipe", unitId] as const;
export const POINTS_IMPORTS_KEY = ["points-imports"] as const;
export const POINTS_IMPORT_HISTORY_KEY = ["points-import-history"] as const;
```

Invalidate `["army-lists"]` and `["dashboard-stats"]` after every points import (cache symmetry rule).

### COALESCE atomic update
Both `getArmyListWithUnits` and `getArmyListReadiness` in `src/db/queries/armyLists.ts` must be updated to the 5-level COALESCE **in the same commit**. Following the CSS grid atomic migration precedent — never half-migrated.

### points_imports faction_id type
`points_imports.faction_id` is the Wahapedia TEXT key (e.g., `"SM"`, `"NEC"`) — NOT the integer `factions.id` from hobbyforge.db. Consistent with `unit_overrides` and `detachment_name` denormalization patterns. See `.planning/points-import-design.md` for the IS NULL global-scope join condition.

---

## Sources

- `C:\Documents\Claude Apps\Warhammer App\package.json` — installed dependency inventory (verified directly)
- `C:\Documents\Claude Apps\Warhammer App\.planning\points-import-design.md` — authoritative points import schema, delta algorithm, 5-level COALESCE chain (Phase 52 design, confirmed still current)
- `C:\Documents\Claude Apps\Warhammer App\.planning\PROJECT.md` — Key Decisions table: no ORM, sequential mutateAsync for bulk ops, TEXT copy for denormalization, no papaparse, Drizzle as escape hatch only
- `C:\Documents\Claude Apps\Warhammer App\src\lib\parseWahapediaCsv.ts` — existing CSV parser (hand-rolled precedent confirmed)
- `C:\Documents\Claude Apps\Warhammer App\src\components\ui\progress.tsx` — Progress component (Radix-backed, installed)
- `C:\Documents\Claude Apps\Warhammer App\src\components\ui\checkbox.tsx` — Checkbox component (Radix-backed, installed)
- `C:\Documents\Claude Apps\Warhammer App\src\db\queries\armyLists.ts` — current 3-level COALESCE (verified, to be extended to 5-level)
- `C:\Documents\Claude Apps\Warhammer App\src-tauri\migrations\` — 20 existing migrations confirming migration pattern
- Confidence: HIGH — all patterns verified from direct codebase inspection; no training data assumptions
