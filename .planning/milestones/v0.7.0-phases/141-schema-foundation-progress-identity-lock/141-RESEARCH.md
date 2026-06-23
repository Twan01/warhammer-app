# Phase 141: Schema Foundation & Progress-Identity Lock — Research

**Researched:** 2026-06-20
**Phase goal:** The technique schema exists in `hobbyforge.db` with correct FK cascades, the Option A materialisation strategy is encoded in migration 051, and the progress-identity invariant is proven by a better-sqlite3 data-layer test — before any technique UI is built.
**Requirements addressed:** FND-01, FND-02, FND-03, FND-04, FND-05

> Locked decisions (CONTEXT.md) are NOT re-litigated here. This document is HOW to
> implement them, grounded in the existing codebase.

---

## RESEARCH COMPLETE

---

## 1. The migration-parity gate — IMPORTANT CORRECTION

CONTEXT.md (D-07) referenced an `EXPECTED_SCHEMA_VERSION` constant. **No such constant
exists in this codebase.** `pnpm check:version` runs `scripts/check-version.mjs`, which has
three legs (all must pass):

1. **Version parity** — `package.json.version === src-tauri/tauri.conf.json.version`.
   *(Not touched this phase — no version bump in 141.)*
2. **Migration-count parity** — count of `*.sql` files in `src-tauri/migrations/`
   **===** count of `Migration {` structs in `src-tauri/src/lib.rs`.
3. **CR-byte scan** — every migration `.sql` file must be **LF-only**; a single `0x0D`
   (CR) byte fails the gate. CRLF breaks the `_sqlx_migrations` SHA-384 checksum and is
   the root cause of the historical "update breaks launch" bug.

There is a transitive third value: `tests/data-layer/migration-parity.test.ts` asserts
`libRsCount === HOBBYFORGE_MIGRATION_COUNT`, where `HOBBYFORGE_MIGRATION_COUNT` is
**disk-derived** (`db-helpers.ts` reads the migrations dir at import time). So all three
numbers (disk files, lib.rs structs, test count) agree by construction once the file and
the lib.rs entry are both added.

### What Phase 141 must do for the gate to stay green
- **Current count: 50** (`001`…`050`; `lib.rs` has 50 `Migration {` structs ending at
  `version: 50, "udb_leader_targets"`).
- **After this phase: 51.** Two edits, both mandatory:
  1. Create `src-tauri/migrations/051_technique_library_foundation.sql` — **LF line
     endings only, no trailing CR** (verify before commit).
  2. Append to the `get_migrations()` vec in `src-tauri/src/lib.rs` (after the
     `version: 50` block, before the closing `]`):
     ```rust
     Migration {
         version: 51,
         description: "technique_library_foundation",
         sql: include_str!("../migrations/051_technique_library_foundation.sql"),
         kind: MigrationKind::Up,
     },
     ```
- No manual edit to `db-helpers.ts` — it auto-updates from disk.

### CR-byte hazard (high risk on Windows)
This is a Windows dev box; editors/git can introduce CRLF. The new `.sql` MUST be
LF-only or both `check:version` (leg 3) and the historical launch bug recur. Plan a task
that verifies `grep -c $'\r' 051_*.sql` returns 0 (or the existing CR-byte scan) before
commit. `.gitattributes` may already enforce LF for `*.sql` — the planner should confirm.

---

## 2. Existing schema to mirror (ground truth)

### `recipe_sections` (migration 018 + Phase 57 workflow metadata)
```
id, recipe_id (FK painting_recipes ON DELETE CASCADE), name (DEFAULT 'Steps'),
surface, optional (0|1), order_index, notes, created_at, updated_at,
section_type, technique, execution_mode, applies_to   -- workflow metadata
```
No UNIQUE on `order_index` (bulk reorder loops would conflict mid-update — deliberate).

### `recipe_steps` (final shape after migration 022 rebuild)
```
id, recipe_id (FK painting_recipes ON DELETE CASCADE),
paint_id (FK paints ON DELETE RESTRICT, NULLABLE — paintless steps),
step_name NOT NULL, order_index DEFAULT 0, notes, created_at,
painting_phase, tool, technique, dilution, time_estimate_minutes,
step_photo_path, alt_paint_id (FK paints), section_id (FK recipe_sections ON DELETE CASCADE)
```

### `unit_recipe_assignments` (migration 021)
```
id, unit_id (FK units CASCADE), recipe_id (FK painting_recipes CASCADE),
created_at, UNIQUE(unit_id, recipe_id)
```

### `unit_recipe_step_progress` — CURRENT shape is the migration 028 rebuild (NOT 021)
Migration 021 originally keyed progress by `(assignment_id, order_index)`. **Migration 028
rebuilt it** to be `recipe_step_id`-keyed — this is the invariant the whole milestone
protects:
```
id, assignment_id (FK unit_recipe_assignments CASCADE),
recipe_step_id (FK recipe_steps ON DELETE CASCADE),
completed (0|1), completed_at, UNIQUE(assignment_id, recipe_step_id)
```
**Option A keeps this table 100% unchanged.** That is the entire point of choosing A.

---

## 3. Proposed migration 051 DDL

Single file, six CREATE TABLEs + two ALTER ADD COLUMNs. Style matches existing migrations
(`IF NOT EXISTS`, `INTEGER PRIMARY KEY AUTOINCREMENT`, `created_at TEXT DEFAULT
(datetime('now'))`, explicit ON DELETE). Order matters: parents before children, **colour
slots created before any step that references them** (FND-01).

```sql
-- 051_technique_library_foundation.sql — Phase 141: Technique Library foundation
-- Decision: Option A (materialise technique steps as recipe_steps rows carrying
-- technique_step_id). unit_recipe_step_progress is intentionally UNCHANGED.
-- See PROJECT.md Key Decisions.

-- 1. techniques (root)
CREATE TABLE IF NOT EXISTS techniques (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    effect      TEXT,            -- OSL | NMM | … (free text, mirrors recipe.effect)
    difficulty  TEXT,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. technique_sections (child of techniques)
CREATE TABLE IF NOT EXISTS technique_sections (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    technique_id  INTEGER NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
    name          TEXT NOT NULL DEFAULT 'Steps',
    surface       TEXT,
    optional      INTEGER NOT NULL DEFAULT 0,
    order_index   INTEGER NOT NULL DEFAULT 0,
    notes         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. technique_colour_slots (child of techniques) — DECLARED BEFORE steps (FND-01)
CREATE TABLE IF NOT EXISTS technique_colour_slots (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    technique_id  INTEGER NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,        -- "Glow Core", "Surface Tint", …
    role_hint     TEXT,                 -- guidance shown in slot-fill UI
    order_index   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. technique_steps (child of technique_sections; may reference a colour slot)
CREATE TABLE IF NOT EXISTS technique_steps (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    technique_section_id  INTEGER NOT NULL REFERENCES technique_sections(id) ON DELETE CASCADE,
    colour_slot_id        INTEGER REFERENCES technique_colour_slots(id) ON DELETE SET NULL,
    step_name             TEXT NOT NULL,
    order_index           INTEGER NOT NULL DEFAULT 0,
    notes                 TEXT,
    painting_phase        TEXT,
    tool                  TEXT,
    technique             TEXT,
    dilution              TEXT,
    time_estimate_minutes INTEGER,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. recipe_technique_instances (one row per application of a technique into a recipe)
CREATE TABLE IF NOT EXISTS recipe_technique_instances (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id     INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    technique_id  INTEGER NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
    detached      INTEGER NOT NULL DEFAULT 0,   -- 0|1; Phase 146 sets to 1 on detach
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. recipe_technique_slot_maps (per-instance slot → paint mapping; orphan-proof)
CREATE TABLE IF NOT EXISTS recipe_technique_slot_maps (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id   INTEGER NOT NULL REFERENCES recipe_technique_instances(id) ON DELETE CASCADE,
    slot_id       INTEGER NOT NULL REFERENCES technique_colour_slots(id) ON DELETE CASCADE,
    paint_id      INTEGER REFERENCES paints(id) ON DELETE RESTRICT,  -- NULLABLE = unfilled
    UNIQUE(instance_id, slot_id)   -- FND-01 orphan/duplicate prevention, baked in
);

-- 7. Materialisation FK columns on the recipe graph (Option A) — nullable ALTER
ALTER TABLE recipe_sections ADD COLUMN technique_instance_id INTEGER
    REFERENCES recipe_technique_instances(id) ON DELETE SET NULL;
ALTER TABLE recipe_steps ADD COLUMN technique_step_id INTEGER
    REFERENCES technique_steps(id) ON DELETE SET NULL;
```

**Planner discretion notes:**
- Column sets above are a complete, defensible proposal; the planner may add/trim non-load-
  bearing columns (e.g. a `result_photo_path` on technique_steps) but MUST keep: the CASCADE
  hierarchy, `UNIQUE(instance_id, slot_id)`, slots-before-steps ordering, nullable
  `paint_id`, and the two ALTER columns.
- `detached` on `recipe_technique_instances` is added now (cheap, avoids a Phase 146
  migration) but only *consumed* in Phase 146. Optional — planner may defer it; if deferred,
  Phase 146 needs its own migration. Recommend including now.

---

## 4. SQLite / tauri-plugin-sql gotchas (confirmed)

- **ALTER ADD COLUMN with FK + ON DELETE works.** Migration 018 already does
  `ALTER TABLE recipe_steps ADD COLUMN section_id INTEGER REFERENCES recipe_sections(id)
  ON DELETE CASCADE` and it is in production. SQLite accepts a column-level FK clause
  (including `ON DELETE SET NULL`) on `ALTER TABLE … ADD COLUMN`, **provided the new column
  is NULLABLE with no non-NULL default** — both ALTERs here satisfy that. No table rebuild
  needed. The nullable-ALTER path is preferred over a 022-style rebuild precisely to avoid
  the `PRAGMA foreign_keys=OFF` window.
- **FK enforcement is ON.** `src/db/client.ts` sets `PRAGMA foreign_keys = ON` per
  connection; the test harness (`createHobbyforgeDb`) sets it too and asserts it survives
  the chain. So CASCADE/SET NULL are live and testable.
- **No `PRAGMA foreign_keys = OFF` needed** for 051 (pure CREATE + nullable ALTER). Do NOT
  copy the 022/028 OFF/ON wrapper — unnecessary here and it muddies the migration.
- **tauri-plugin-sql / sqlx applies each migration in its own transaction** and records a
  SHA-384 checksum in `_sqlx_migrations`. Consequence: migration files are immutable once
  shipped (never edit), and line endings must be LF (checksum stability). Both are existing
  project rules (CLAUDE.md: "never edit existing migration files").
- **Flat single-handle SQL (FND-05):** this phase writes no production write-path SQL beyond
  the migration. The *test* harness uses one better-sqlite3 handle throughout (no nested
  transactions). When the resync function lands in Phase 144 it must mirror `saveRecipeGraph`
  (`src/db/queries/recipes.ts:219-243`): one `await getDb()`, auto-commit (WAL makes writes
  immediately visible), no `BEGIN`, no calls into other query modules that re-`getDb()`.

---

## 5. `effectivePaintId()` design (FND-04)

New pure module `src/lib/effectivePaintId.ts`, matching the one-function `src/lib/*`
convention (cf. `recipeSteps.ts`, `resolveUnitPoints.ts`). It must be DB-free and pure so it
is trivially unit-testable and callable from any consumer.

**Resolution rule:** A materialised technique step has `technique_step_id != null` and
`paint_id == null`; its real paint comes from the slot map. A plain step has
`paint_id` set and `technique_step_id == null`.

```ts
// Minimal data the function needs from a step row.
export interface PaintResolvableStep {
  paint_id: number | null;
  technique_step_id: number | null;
}

// Lookup the caller builds once from recipe_technique_slot_maps joined to the
// step's source technique_steps.colour_slot_id.
//   key:   technique_step_id
//   value: resolved paint_id for that step in THIS recipe instance (or null = unfilled)
export type SlotResolutionMap = ReadonlyMap<number, number | null>;

export function effectivePaintId(
  step: PaintResolvableStep,
  slotMap: SlotResolutionMap,
): number | null {
  if (step.technique_step_id != null) {
    // Technique-owned step → resolve via slot map; unfilled slot → null.
    return slotMap.get(step.technique_step_id) ?? null;
  }
  // Plain recipe step → its own paint_id (FND-04 fallback).
  return step.paint_id;
}
```

- Keep the input shape **structural/minimal** (not the full `RecipeStep`) so callers with
  partial rows can use it. `RecipeStep`/`DraftStep` (`src/types/recipe.ts`) both satisfy
  `PaintResolvableStep` once `technique_step_id` is added to those types — adding the field to
  the TS types is in-scope here (the DB column exists after 051), even though consumer
  *wiring* is Phases 143/145.
- Phase 141 deliverable for FND-04 = the function + a unit test covering: technique step with
  filled slot, technique step with unfilled slot (→ null), plain step (→ paint_id), plain step
  with null paint (→ null). "All existing tests remain green" (SC#4) — pure addition, no edits
  to existing consumers.

---

## 6. FND-03 invariant test (the gate) — structure given resync is deferred

The production `resyncTechniqueInstance` lands in **Phase 144**. Phase 141 cannot test that
function (it doesn't exist yet), so the test proves the **schema/SQL invariant directly** —
exactly the operations the future resync will perform — using the better-sqlite3 harness.

### Harness (existing pattern, `tests/data-layer/db-helpers.ts`)
`createHobbyforgeDb()` builds an in-memory DB and applies all migrations from disk (so 051 is
included automatically once the file exists). Use `createTestUnit`, `createTestRecipe`,
`createTestSection`, plus new inline inserts for technique rows. New file:
`tests/data-layer/technique-progress-identity.test.ts` (`// @vitest-environment node`).

### Setup
1. Create a technique + section + 3 technique_steps (S1,S2,S3) + colour slot.
2. Create a recipe + a `recipe_technique_instances` row.
3. Materialise: INSERT 3 `recipe_steps` rows with `technique_step_id = S1,S2,S3`,
   `section_id` pointing at a recipe_section whose `technique_instance_id` = instance.
4. Create `unit_recipe_assignments` + mark step S2's materialised `recipe_steps` row
   completed in `unit_recipe_step_progress`. **Record S2's `recipe_step_id` PK.**

### The four cases (each asserts the invariant)
| Case | SQL the test runs (what resync will do) | Assertion |
|------|------------------------------------------|-----------|
| **Reorder** (S1↔S3) | `UPDATE recipe_steps SET order_index=… WHERE technique_step_id=…` | S2's progress row still exists, **same `recipe_step_id`**, `completed=1`; order changed |
| **Add step S4** | `INSERT INTO recipe_steps (technique_step_id=S4,…)` | New `recipe_steps` row exists; it has **no** progress row (uncompleted); S2 progress untouched |
| **Remove step S1** | `DELETE FROM recipe_steps WHERE technique_step_id=S1` | S1's progress (if any) gone via CASCADE; S2's progress untouched; count drops by 1 |
| **Remove slot** | `DELETE FROM technique_colour_slots WHERE id=slot` | `recipe_technique_slot_maps` rows for that slot gone via CASCADE (orphan prevention); `technique_steps.colour_slot_id` → NULL (SET NULL); no dangling slot-map rows |

**Core assertion across all:** a surviving step is updated by **`UPDATE … WHERE
technique_step_id = ?` (same PK)**, never DELETE+re-INSERT — so its
`unit_recipe_step_progress.recipe_step_id` never changes. This is the v0.2.13 "completed step
jumps" guard expressed at the schema level. The test is the executable spec the Phase 144
resync must satisfy.

### Validation Architecture
- **Critical invariant under test:** technique-step edits never move/orphan a completion
  marker (FND-03). Sampling/coverage = the four edit cases above (reorder, add, remove step,
  remove slot) × assertion on `recipe_step_id` PK stability + CASCADE cleanup.
- **Failure mode guarded:** silent progress reassignment (a completed step's marker pointing
  at a different step after a structural edit) — the exact v0.2.13 regression class.
- **Test layer:** better-sqlite3 in-memory, node environment, real migration chain (no mocks)
  — highest-fidelity layer available without the Tauri runtime.
- **Acceptance signal:** new test file green + full suite (~2896 tests) green + `pnpm
  check:version` exit 0.

---

## 7. Recording the Option A decision (FND-02 / SC#2)

PROJECT.md has a **`## Key Decisions`** table (line ~363; columns: Decision | Rationale |
Outcome). Append one row:

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Technique steps **materialised** as `recipe_steps` rows with `technique_step_id` FK (Option A, not read-time JOIN / Option B) | Keeps `unit_recipe_step_progress` keyed by `recipe_step_id` unchanged (many consumers); resync reuses the battle-tested `saveRecipeGraph` diff; detach = clear FK columns. v0.2.13 progress invariant preserved. | (set when phase verified) |

The migration header comment (§3) also states the decision so "no future migration can
contradict it" (SC#2). Both edits are Phase 141 deliverables.

---

## 8. Project conventions to honour (CLAUDE.md + skills)

- Migrations are **append-only**; never edit `001`–`050`. Add `051` only.
- Parameterized queries use `$1,$2` in the app layer (tauri-plugin-sql); the **test** layer
  uses better-sqlite3 `?` placeholders (see `db-helpers.ts`).
- Booleans are `0|1` integers (`optional`, `detached`, `completed`).
- No linter/formatter — strict TS (`noUnusedLocals`/`noUnusedParameters`) is the quality gate.
- Project skill **`new-migration`** exists (`.claude/skills/`) — the planner should follow it
  for the migration scaffold; **`test-feature`** / **`check-queries`** for the test + any
  query stubs. (Phase 141 adds no production query module — only the migration, the pure
  function, type additions, and the test.)

---

## 9. Risk register

| Risk | Severity | Mitigation |
|------|----------|------------|
| CRLF sneaks into `051_*.sql` on Windows → `check:version` leg 3 + launch-bug recurs | HIGH | LF-only; verify CR-byte scan returns 0 before commit; confirm `.gitattributes` covers `*.sql` |
| Forgetting the `lib.rs` `Migration{}` entry → migration-count parity fails | MED | Mandatory paired edit; `pnpm check:version` catches it pre-build |
| ALTER ADD COLUMN FK rejected | LOW | Precedent migration 018 proves it works for nullable FK columns |
| FND-03 test passes trivially (asserts nothing real) | MED | Plan must require the explicit "same `recipe_step_id` PK after UPDATE" assertion + a deliberate DELETE+INSERT counter-case that would FAIL the invariant, to prove the test has teeth |
| Adding `technique_step_id` to `RecipeStep`/`DraftStep` TS types breaks existing consumers | LOW | Field is optional/nullable; pure addition; `noUnusedLocals` unaffected |

---

## 10. Plan-shaping summary (for the planner)

Likely 2–3 plans, all data-layer (no UI):
- **Plan 01 — Migration 051 + lib.rs registration + PROJECT.md decision.** DDL per §3,
  paired lib.rs entry per §1, LF verification, Key Decisions row. Gate: `pnpm check:version`
  exits 0; migration-parity test green.
- **Plan 02 — `effectivePaintId()` + TS type additions + unit test.** Pure function per §5,
  add `technique_step_id` to recipe types, focused unit test. Gate: SC#4 (function exists,
  all existing tests green).
- **Plan 03 — FND-03 invariant data-layer test.** Per §6, including a teeth-proving
  counter-case. Gate: SC#3 (test green, exercises add/remove/reorder/remove-slot).

All three independent enough to parallelise except Plan 03 depends on Plan 01 (needs 051
applied). Plan 02 depends on Plan 01 (needs the `technique_step_id` column to exist for the
type to be meaningful, though the pure fn itself is column-agnostic).
