# Phase 141: Schema Foundation & Progress-Identity Lock - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

> Captured in `--auto` mode. All gray areas auto-resolved with the
> research-recommended / requirement-default option. Decisions logged inline
> below; review and adjust before planning if any default is wrong.

<domain>
## Phase Boundary

This phase delivers the **data foundation** for the v0.7.0 Technique Library —
nothing user-facing. Specifically:

1. Six new technique tables exist in `hobbyforge.db` with the correct
   ON DELETE CASCADE hierarchy and slot-fill orphan prevention (FND-01).
2. The **materialise-vs-read-time-resolve** strategy is decided, recorded in
   PROJECT.md Key Decisions, and encoded in the migration so no future
   migration can contradict it (FND-02).
3. The progress-identity invariant (v0.2.13 "completed step jumps" must never
   recur) is locked and proven by a data-layer test written **before any UI**
   (FND-03 — the gate for the whole milestone).
4. A single pure `effectivePaintId()` resolution function exists in `src/lib/`
   (FND-04).
5. All technique-structure propagation is expressed as flat, single-db-handle
   SQL — no nested `BEGIN`/transactions (FND-05).
6. `pnpm check:version` migration parity passes with the new migration counted.

**Out of scope (later phases):** any technique authoring UI, library browse,
apply flow, the production `resyncTechniqueInstance` function, detach, and all
consumer-surface wiring (Painting Mode, paint availability, etc.). This phase
builds and proves the schema + the resolution primitive only.

</domain>

<decisions>
## Implementation Decisions

### Materialisation strategy (FND-02) — THE locking decision
- **D-01:** Adopt **Option A — materialise technique steps as `recipe_steps`
  rows.** When a technique is applied to a recipe (Phase 143), concrete
  `recipe_steps` rows are inserted, each carrying a nullable `technique_step_id`
  FK pointing back to its source `technique_steps` row. The existing
  `recipe_step_id` PK remains the progress key — **`unit_recipe_step_progress`
  is NOT changed** (no dual-column key, no table rebuild). Chosen because the
  progress table has extensive downstream consumers, `saveRecipeGraph`'s diff
  is already battle-tested (resync is structurally identical), and detach is a
  simple FK-clear rather than a progress remap. This is the FND-02 default and
  the ARCHITECTURE.md / SUMMARY.md recommendation.
- **D-02:** The Option A decision MUST be written into **PROJECT.md → Key
  Decisions** (success criterion #2) and referenced in the migration header
  comment, so it is structurally locked, not just acknowledged.

### Schema layout & table names (FND-01)
- **D-03:** Use the **ROADMAP success-criteria table names** as authoritative
  (they are the phase gate), not the working names in research docs. The six
  tables are: `techniques`, `technique_sections`, `technique_steps`,
  `technique_colour_slots`, `recipe_technique_instances`,
  `recipe_technique_slot_maps`. (Research's `technique_slots` →
  `technique_colour_slots`; research's `recipe_slot_fills` →
  `recipe_technique_slot_maps`.)
- **D-04:** CASCADE hierarchy baked into the foundation migration:
  `technique → technique_sections → technique_steps` (ON DELETE CASCADE);
  `technique → technique_colour_slots` (ON DELETE CASCADE);
  `recipe_technique_instances → recipe_technique_slot_maps` (ON DELETE CASCADE).
- **D-05:** Slot-fill **orphan prevention is in the foundation migration, not
  patched later** (FND-01): `recipe_technique_slot_maps` carries a
  `UNIQUE(instance_id, slot_id)` constraint and FK CASCADE on both the instance
  and the slot it references. Colour slots are declared (table created) before
  the steps that reference them.
- **D-06:** Under Option A, also add the two nullable FK columns that
  materialisation needs: `recipe_sections.technique_instance_id`
  (nullable FK, ON DELETE SET NULL) and `recipe_steps.technique_step_id`
  (nullable FK, ON DELETE SET NULL). These are plain `ALTER TABLE ADD COLUMN`
  (nullable → no table rebuild required).

### Migration packaging
- **D-07:** Ship the whole foundation as a **single migration `051_*.sql`**
  (six CREATE TABLEs + two ALTER ADD COLUMNs). Atomic foundation honours FND-01
  "baked into the foundation migration (not patched later)." Migration count
  goes 050 → 051; `EXPECTED_SCHEMA_VERSION` and the data-layer
  derived-migration-list must move in lockstep so `pnpm check:version` /
  migration-parity stays green (success criterion #5). If a table-rebuild
  proves unavoidable during planning, follow the established
  `PRAGMA foreign_keys=OFF → CREATE-new → INSERT → DROP → RENAME → ON` pattern
  (migrations 022/028) — but the nullable-ALTER approach above avoids it.

### effectivePaintId() (FND-04)
- **D-08:** New pure function at **`src/lib/effectivePaintId.ts`** (one function
  per the existing `src/lib/*` convention — e.g. `recipeSteps.ts`,
  `resolveUnitPoints.ts`). It resolves a step's effective paint by looking up
  the step's slot fill (via the recipe's slot map) and **falling back to
  `step.paint_id`** when the step is not technique-owned or its slot is
  unfilled. Pure (no DB/IO), unit-tested, and designated the single source
  every paint consumer reads from. Wiring consumers to it happens in later
  phases; this phase only creates + tests the function and keeps all existing
  tests green.

### Progress-identity test scope (FND-03)
- **D-09:** The production `resyncTechniqueInstance` function lands in
  **Phase 144**, but the **invariant must be locked and proven now**. Phase 141
  writes a **better-sqlite3 data-layer test** that exercises the schema/SQL
  diff directly (simulating add / remove / reorder of a technique step against
  materialised `recipe_steps` rows) and asserts: surviving steps keep the same
  `recipe_step_id` PK (UPDATE, never DELETE+INSERT) so their
  `unit_recipe_step_progress` rows are untouched; removed steps' progress is
  cleaned via CASCADE; added steps start uncompleted. This is the FND-03 gate —
  written before any UI.

### Flat-SQL constraint (FND-05)
- **D-10:** Any propagation/diff SQL introduced here (and the test harness it
  proves) uses a **single db handle, flat inline SQL, no nested `getDb()`, no
  nested `BEGIN`** — identical to the `saveRecipeGraph` auto-commit/WAL pattern
  documented in `src/db/queries/recipes.ts:219-235`.

### Claude's Discretion
- Exact column sets / nullability of the six tables beyond the CASCADE + UNIQUE
  constraints above (planner/researcher derive from the recipe model:
  sections → steps with `painting_phase`/`tool`/`technique`/`dilution`/`time`).
- The precise TypeScript signature/param shape of `effectivePaintId()`.
- Test file placement under `tests/data-layer/` and helper reuse.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The locking design decision (read first)
- `.planning/research/SUMMARY.md` § "Open Design Decision: Progress Key and
  Step Materialisation Strategy" — the full Option A vs B comparison, trade-off
  tables, and the conditional recommendation. D-01 selects Option A from here.
- `.planning/research/ARCHITECTURE.md` — Option A mechanism, `resyncTechniqueInstance`
  diff design, schema additions, consumer-surface impact.
- `.planning/research/PITFALLS.md` — Option B rationale + the v0.2.13 progress-jump
  failure mode this phase must prevent.

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` § FND-01..FND-05 (lines 24-28) + top-engineering-risk
  note (lines 12-14) — the locked requirements for this phase.
- `.planning/ROADMAP.md` § "Phase 141" — goal, 5 success criteria (the gate).

### Existing schema / patterns to mirror
- `src-tauri/migrations/028_step_progress_identity.sql` — the recipe_step_id-keyed
  progress rebuild + back-fill CTE; the invariant this phase extends.
- `src-tauri/migrations/022_paintless_steps.sql` — the table-rebuild pattern
  (PRAGMA OFF → new → insert → drop → rename) if ever needed.
- `src-tauri/migrations/021_applied_recipe_assignments.sql` — `unit_recipe_step_progress`
  + `unit_recipe_assignments` definitions.
- `src/db/queries/recipes.ts` (esp. `saveRecipeGraph`, lines 219-243) — the
  flat single-db-handle auto-commit SQL pattern FND-05 mandates.
- `src/lib/recipeSteps.ts`, `src/lib/resolveUnitPoints.ts` — `src/lib/` pure-function
  conventions for `effectivePaintId()`.

### Release gate
- `pnpm check:version` — migration-count ↔ `EXPECTED_SCHEMA_VERSION` ↔
  package/tauri version parity gate (REL-03/04/05, v0.6.0). Must stay green
  after adding migration 051.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`saveRecipeGraph` diff engine** (`src/db/queries/recipes.ts`): the
  five-phase create/edit diff is the structural template for the future
  `resyncTechniqueInstance` (Phase 144); its discipline (flat SQL, single
  handle, $N params) is the FND-05 reference for this phase.
- **`src/lib/recipeSteps.ts`**: `DraftStep` shape (`paint_id`, `painting_phase`,
  `tool`, `technique`, `dilution`, `time_estimate_minutes`, `alt_paint_id`) — the
  technique step model promotes the same fields; `effectivePaintId()` will read
  this shape.
- **Data-layer test harness** (`tests/data-layer/`, better-sqlite3 — ~14 tests
  incl. migration parity / recipe persistence): the FND-03 test plugs into this
  existing harness.

### Established Patterns
- Migrations are append-only, run in filename order; never edit existing ones.
  Add `051_*.sql` only.
- Progress is keyed by `recipe_step_id` (protected by migrations 014/021/028 and
  the entire v0.2.13 milestone) — Option A preserves this exactly.
- `PRAGMA foreign_keys = ON` is set on every connection (`src/db/client.ts`), so
  CASCADE/SET NULL FK behaviour is live and testable.
- Booleans stored as `0|1`; `$1,$2` positional params required by plugin-sql.

### Integration Points
- The new migration must be reflected in the data-layer's self-derived migration
  list (`readdirSync`, fail-loud) and in `EXPECTED_SCHEMA_VERSION` so the
  migration-parity test + `pnpm check:version` both pass (Phase 130 machinery).
- `effectivePaintId()` is created here but consumed in Phases 143/145 — this
  phase only proves it in isolation without rewiring consumers.

</code_context>

<specifics>
## Specific Ideas

- User-confirmed milestone decisions (PROJECT.md) that bound this schema:
  colour **slots/roles** (not paint re-pick), **live link** (not snapshot),
  technique unit = **full mini-recipe** (multiple sections). The schema must
  support all three from the foundation.
- FND-01's wording "baked into the foundation (not patched later)" is a hard
  constraint: the UNIQUE/CASCADE orphan-prevention ships in migration 051, never
  as a follow-up migration.

</specifics>

<deferred>
## Deferred Ideas

- **Production `resyncTechniqueInstance` / virtual-JOIN propagation** → Phase 144
  (LINK-01..03). Phase 141 only proves the invariant via a direct-SQL test.
- **All technique UI** (authoring, library browse, picker, slot-fill dialog,
  badges, detach) → Phases 142, 143, 146.
- **Consumer rewiring** to `effectivePaintId()` (Painting Mode, paint
  availability, apply-to-units, SectionedTimeline, duplication) → Phases 143/145.
- **Dropping `synced_leader_targets`** (v0.6.0 D-10 tail) — unrelated; not this
  milestone.

None of the above is in Phase 141 scope — discussion stayed within the schema
foundation boundary.

</deferred>

---

*Phase: 141-Schema Foundation & Progress-Identity Lock*
*Context gathered: 2026-06-19*
