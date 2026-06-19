# Technology Stack: v0.7.0 Technique Library

**Project:** HobbyForge v0.7.0
**Researched:** 2026-06-19
**Confidence:** HIGH
**Scope:** Stack additions/changes for the new "Technique Library" feature only. The fully validated existing stack (Tauri 2, React 19, TypeScript 5, Vite 6, TailwindCSS 4, shadcn/ui, tauri-plugin-sql, React Query, Zustand, RHF+Zod, @dnd-kit, react-hotkeys-hook, Vitest 4, better-sqlite3) is NOT re-researched and NOT changed.

> **Verdict: zero new runtime dependencies.** Every capability the Technique Library requires — new SQLite tables, CRUD forms with DnD section/step reorder, slot-fill dialogs, live-linked JOIN resolution, badge components, progress keying, and data-layer tests — is already present in the installed stack. This is a schema + React Query + RHF + @dnd-kit feature, identical in pattern to the existing recipe-sections subsystem it extends.

---

## Recommended Stack

### New Runtime Dependencies

**None.**

### New Dev Dependencies

**None.**

---

## Why the Existing Stack Is Sufficient

The Technique Library has five technical challenges. Each maps cleanly to an existing, proven pattern in the codebase.

### 1. Technique data model (new SQLite tables)

**What is needed:** Tables for `techniques`, `technique_sections`, `technique_steps`, `technique_colour_slots`, and `recipe_technique_instances` (the per-recipe slot→paint mapping). Foreign keys, CASCADE rules, and a join path that resolves colour slots to real paints at read time.

**How it is covered:** `tauri-plugin-sql` directly with `$1, $2` positional-syntax parameterized queries — the same pattern used for `recipe_sections`, `recipe_steps`, `applied_recipe_progress`, and every other table added since v0.2.5. The FK enforcement, transaction pattern (`BEGIN`/`COMMIT` inlined, never nested), and `PRAGMA foreign_keys = ON` boot setup are already in place.

**Pattern precedent:** `saveRecipeGraph` (transactional five-phase diff for sections + steps) is functionally identical to what the technique save needs. The colour-slot resolution (`JOIN recipe_technique_instances ON slot_name = ...`) is standard SQL, no library required.

### 2. Technique library UI (CRUD with DnD section/step reorder)

**What is needed:** A technique library page listing all techniques, a detail/edit Sheet with multiple sections and steps that can be reordered, and a form for creating/editing the colour slots a technique declares.

**How it is covered:** This is structurally the same as `RecipeFormSheet.tsx` with its two-DndContext nested approach (outer for section reorder, inner per section for step reorder), which already ships in the codebase. `@dnd-kit/core` (6.3.1), `@dnd-kit/sortable` (10.0.0), and `@dnd-kit/utilities` (3.2.2) are installed and in active use. The manual array + `useMemo` pattern (not `useFieldArray`) to avoid the documented RHF + @dnd-kit ID collision bug (RHF #10607) is already established and documented as a Key Decision.

**shadcn/ui primitives** (Sheet, Badge, Button, Input, Select, Separator, Tabs) are all present. No new component library is needed.

### 3. Slot-fill apply flow (dropping a technique into a recipe)

**What is needed:** A dialog or Sheet that lists a technique's named colour slots and lets the user pick a real paint for each slot, then saves a `recipe_technique_instances` row per slot per recipe.

**How it is covered:** Standard `react-hook-form` (7.74.0) + Zod form with a controlled `<Select>` per slot, populated from `usePaints()` (already exists). The apply dialog follows the existing `ApplyRecipeDialog` pattern — a `Dialog` component with a form inside, mutations that write to the DB via a new query function, and `useQueryClient().invalidateQueries(...)` for cache synchronisation. No new library.

### 4. Live-link propagation (technique structure edits reach all recipe consumers)

**What is needed:** When a technique's sections or steps are edited, every recipe that has applied that technique must reflect the updated structure. Each recipe retains its own slot→paint colour mapping.

**How it is covered:** The implementation is a **JOIN at read time**, not a materialised copy. The query that fetches a recipe's effective step list JOINs through `recipe_technique_instances` to `technique_steps`, rather than copying rows at apply time. This is pure SQL — no live-sync library, no event bus, no reactive graph engine. React Query's `invalidateQueries` on the `["techniques", id]` and `["recipes", "by-id", recipeId]` keys handles UI refresh after a technique edit, exactly as it does for any other mutation.

This is the same principle as the existing `COALESCE`-in-SQL points resolution: computation stays in the database layer, not duplicated in JS.

**No new library is needed.** The existing tauri-plugin-sql bridge, typed query functions, and React Query cache invalidation cover this entirely.

### 5. Progress identity across live-link edits

**What is needed:** Step-completion progress must survive technique structure edits (add/remove/reorder steps). The `recipe_step_id`-keyed progress system (established in v0.2.13, DI-01/DI-02) cannot be used directly for technique-driven steps because those rows are virtual — they resolve from `technique_steps`, not from materialised `recipe_steps` rows.

**How it is covered:** The solution is a schema decision, not a new library. Applied technique steps are keyed by `technique_step_id` (the stable PK of the source technique step) in a new progress table (e.g., `applied_technique_progress`), paralleling the existing `applied_recipe_progress` table. Reordering or renaming a technique step leaves the `technique_step_id` stable. Adding a new step produces a new ID with no existing progress entry (uncompleted by default). Removing a step orphans its progress rows, which are cleaned up by CASCADE on the FK.

This is identical in structure to the `recipe_step_id` → `applied_recipe_progress` pattern already proven in v0.2.13. No library required — it is a schema + migration decision.

---

## Patterns to Reuse (no new dependencies, just apply existing patterns)

| Pattern | Where it lives now | How v0.7.0 uses it |
|---------|-------------------|-------------------|
| Two-DndContext nested section/step reorder | `RecipeFormSheet.tsx` | `TechniqueFormSheet.tsx` — identical structure |
| Five-phase diff for non-destructive save | `saveRecipeGraph` in queries | `saveTechniqueGraph` — same algorithm |
| `technique_step_id`-keyed progress | `applied_recipe_progress` pattern | `applied_technique_progress` table, same FK/CASCADE structure |
| Slot-fill controlled form | `ApplyRecipeDialog` + existing paint Select | New `ApplyTechniqueDialog` with per-slot paint selects |
| JOIN-at-read-time for effective values | `COALESCE` points resolution | Recipe step list JOIN through `recipe_technique_instances` |
| Badge on linked content | shadcn/ui `Badge` (already used throughout) | "From technique X" badge on linked recipe sections |
| Detach/override escape hatch | Existing mutation + toast pattern | `detachTechniqueFromRecipeSection` mutation |
| `useQueryClient().invalidateQueries` symmetry rule | All existing mutations | Invalidate both `["techniques", id]` and `["recipes", ...]` on technique edits |
| Page-level `Map<key, T>` for O(1) lookup | `useAnnotations`, `useWorkflowPositions` | Technique-to-recipe index for "used in N recipes" badge |
| `staleTime: Infinity + gcTime: Infinity` | Game data hooks | Technique list hooks (read-heavy, write-rare, session-stable) |

---

## What NOT to Add (scope-creep guard)

| Temptation | Why it would be wrong | What to use instead |
|------------|----------------------|---------------------|
| A graph database or reactive DAG library | Techniques have at most two levels (sections → steps); the "live link" is a SQL JOIN, not a dependency graph. Graph tooling is massive overkill. | Plain SQL JOIN in the recipe step query |
| An ORM (Drizzle, Prisma) | Prisma is a confirmed Tauri production dead-end (Key Decision, locked). Drizzle is explicitly a v3-only escape hatch. Neither adds capability the typed query functions + `better-sqlite3` tests don't already provide. | Raw `tauri-plugin-sql` queries with `$N` syntax |
| A diff/patch library for live-link change detection | The five-phase diff algorithm (delete removed → update existing → insert new) already lives in TypeScript in the recipe save path. Technique structure changes propagate at read time via JOIN; no diff library is needed to sync consumers. | Existing `saveRecipeGraph` pattern applied to `saveTechniqueGraph` |
| A rich-text / markdown editor | Technique step descriptions are plain text (same as recipe steps). The existing `<Input>`/`<Textarea>` from shadcn/ui is correct. | `shadcn/ui` `Input` and `Textarea` |
| A colour-picker library | Colour slots are *named roles* (e.g. "Glow Core"), not hex values. The user maps slot → paint from their inventory, using the existing paint `<Select>`. No colour picker. | Existing `usePaints()` + shadcn/ui `Select` |
| A conflict-resolution library for live-link edits | Single-user, local-first, no concurrent writes. There is never a conflict to resolve. | N/A — constraint makes this a non-problem |
| `node:sqlite` for new data-layer tests | Vitest 4 import-stripping bug (#7177) breaks it — logged Key Decision. | `better-sqlite3` (already the data-layer test harness) |

---

## Schema Migration Estimate

The feature needs approximately 5–7 new SQL migration files (no existing migrations are modified):

| Migration | Tables / changes |
|-----------|-----------------|
| 051 | `techniques` (id, name, description, effect, created_at, updated_at) |
| 052 | `technique_sections` (id, technique_id FK CASCADE, name, position, section_type, technique, execution_mode) |
| 053 | `technique_steps` (id, technique_section_id FK CASCADE, technique_id FK CASCADE, position, instruction, painting_phase, tool, dilution, time_minutes, notes) |
| 054 | `technique_colour_slots` (id, technique_id FK CASCADE, slot_name, description, position) — slots referenced by `technique_steps.slot_name` |
| 055 | `recipe_technique_instances` (id, recipe_id FK CASCADE, technique_id FK RESTRICT, applied_at) + `recipe_technique_slot_fills` (id, instance_id FK CASCADE, slot_name, paint_id FK SET NULL) |
| 056 | `applied_technique_progress` (id, instance_id FK CASCADE, technique_step_id FK CASCADE, completed_at, UNIQUE(instance_id, technique_step_id)) |
| 057 | Indexes on all FK columns per the v0.3.0 hardening pattern |

All migrations use the established patterns: `PRAGMA foreign_keys = ON` at connection time, `0|1` booleans, positional `$N` parameters, no editing of existing files.

---

## Data-Layer Tests

New `tests/data-layer/techniques.test.ts` using `better-sqlite3` (already installed, already the data-layer harness) should cover:

- Migration parity: all technique tables present after migrations 051–057
- `technique_step_id`-keyed progress survives step reorder (the load-bearing invariant)
- Slot fill: `recipe_technique_slot_fills` rows survive a `saveTechniqueGraph` structural edit
- CASCADE correctness: deleting a technique cascades to sections, steps, slots, instances, slot fills, and progress rows
- FK enforcement: `recipe_technique_instances.technique_id` RESTRICT blocks delete of an in-use technique (or, if the design chooses CASCADE, this test asserts that instead)

---

## Version Compatibility Confirmation

No version changes required. All in-use packages are current as of v0.6.0:

| Package | Installed | Status |
|---------|-----------|--------|
| `@tauri-apps/plugin-sql` | 2.4.0 | Current — no new SQL capabilities needed |
| `@dnd-kit/core` | 6.3.1 | Current — two-DndContext pattern fully supported |
| `@dnd-kit/sortable` | 10.0.0 | Current |
| `react-hook-form` | 7.74.0 | Current — manual array pattern (not useFieldArray) already established |
| `zod` | 4.4.1 | Current |
| `@tanstack/react-query` | 5.100.6 | Current |
| `better-sqlite3` | 12.10.0 | Current — data-layer test harness |
| `vitest` | 4.1.5 | Current |

---

## Sources

- `package.json` (read directly, 2026-06-19) — all installed dependency versions confirmed — HIGH
- `.planning/PROJECT.md` (read directly, 2026-06-19) — v0.7.0 milestone spec, Key Decisions table (RHF+dnd-kit ID collision, five-phase diff, recipe_step_id progress keying, tauri-plugin-sql no-ORM, flat inline transactions, saveRecipeGraph pattern) — HIGH
- `CLAUDE.md` (read directly, 2026-06-19) — stack, DB patterns, code conventions — HIGH
- PROJECT.md Key Decisions — `useFieldArray NOT used for step forms` (RHF #10607, confirmed); `Five-phase diff for non-destructive save` (confirmed); `recipe_step_id as progress key` (DI-01, confirmed); `tauri-plugin-sql directly, no ORM` (Prisma dead-end, Drizzle escape-hatch only) — HIGH
- PROJECT.md shipped requirements — v0.2.7 (section data layer: recipe_sections, section_id FK, batch step counts, section CRUD hooks), v0.2.13 (DI-01/DI-02: recipe_step_id-keyed progress, five-phase diff), v0.2.15 (Painting Mode on top of same data layer) confirm that the exact patterns v0.7.0 needs are in production and working — HIGH

---

*Stack research for: HobbyForge v0.7.0 "Technique Library" — parameterized, live-linked, reusable painting techniques on a mature Tauri 2 desktop app*
*Researched: 2026-06-19*
