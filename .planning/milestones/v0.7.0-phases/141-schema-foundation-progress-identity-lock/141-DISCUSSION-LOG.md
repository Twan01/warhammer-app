# Phase 141: Schema Foundation & Progress-Identity Lock - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-19
**Phase:** 141-Schema Foundation & Progress-Identity Lock
**Mode:** `--auto` (all gray areas auto-resolved with recommended/default option)
**Areas discussed:** Materialisation strategy, Schema layout & table names, Migration packaging, effectivePaintId() design, Progress-identity test scope

---

## Materialisation strategy (FND-02) — the #1 locking decision

| Option | Description | Selected |
|--------|-------------|----------|
| Option A — Materialise | Insert concrete `recipe_steps` rows carrying a `technique_step_id` FK; `recipe_step_id` PK stays the progress key; no progress-table change; resync on technique edit | ✓ |
| Option B — Read-time resolve | Technique steps never copied; virtual JOIN at read time; `unit_recipe_step_progress` rebuilt with dual `technique_step_id` column + CHECK; no resync | |

**Choice:** Option A (auto — recommended default).
**Notes:** FND-02 default and the ARCHITECTURE.md/SUMMARY.md recommendation. Lower total risk for this codebase: progress table is unchanged (it has many consumers), `saveRecipeGraph`'s diff is a proven template for resync, and detach is a simple FK-clear vs Option B's progress remap. Conditional caveat from research: if re-sync cost at scale (30+ recipes/technique) becomes unacceptable, Option B is the fallback — but that is not expected here.

---

## Schema layout & table names (FND-01)

| Option | Description | Selected |
|--------|-------------|----------|
| ROADMAP names | `techniques`, `technique_sections`, `technique_steps`, `technique_colour_slots`, `recipe_technique_instances`, `recipe_technique_slot_maps` | ✓ |
| Research working names | `technique_slots`, `recipe_slot_fills` (older names) | |

**Choice:** ROADMAP six-table names (auto).
**Notes:** Success criteria are the phase gate, so their names are authoritative. CASCADE hierarchy + `UNIQUE(instance_id, slot_id)` orphan prevention baked into the foundation migration. Plus nullable FK columns `recipe_sections.technique_instance_id` and `recipe_steps.technique_step_id` (Option A needs them).

---

## Migration packaging

| Option | Description | Selected |
|--------|-------------|----------|
| Single migration 051 | All six CREATE TABLEs + two ALTER ADD COLUMNs in one file | ✓ |
| Split migrations | Separate files per concern | |

**Choice:** Single `051_*.sql` (auto).
**Notes:** Honours FND-01 "baked into the foundation (not patched later)". Nullable ALTER ADD COLUMN avoids a table rebuild. `EXPECTED_SCHEMA_VERSION` + data-layer derived list move in lockstep so `pnpm check:version` stays green (SC#5).

---

## effectivePaintId() design (FND-04)

| Option | Description | Selected |
|--------|-------------|----------|
| `src/lib/effectivePaintId.ts` pure fn | Slot-map lookup → fallback `step.paint_id`; single source for all paint consumers | ✓ |
| Inline in query layer | Resolve inside each query | |

**Choice:** Dedicated pure function in `src/lib/` (auto).
**Notes:** Matches `src/lib/*` one-function convention. Created + unit-tested this phase; consumers rewired in Phases 143/145. All existing tests stay green (SC#4).

---

## Progress-identity test scope (FND-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Schema-invariant test now | better-sqlite3 test simulating add/remove/reorder via direct SQL; asserts recipe_step_id PK stability + CASCADE cleanup; production resync deferred to 144 | ✓ |
| Full resync function + test now | Build `resyncTechniqueInstance` in 141 | |

**Choice:** Schema-invariant test in 141 (auto).
**Notes:** Production `resyncTechniqueInstance` belongs to Phase 144 per roadmap, but FND-03 requires the invariant proven before UI. Phase 141 locks it with a direct-SQL data-layer test.

---

## Claude's Discretion

- Exact column sets / nullability of the six tables beyond CASCADE + UNIQUE.
- Precise TypeScript signature of `effectivePaintId()`.
- Test file placement under `tests/data-layer/` and helper reuse.

## Deferred Ideas

- Production `resyncTechniqueInstance` / propagation → Phase 144.
- All technique UI (authoring, browse, picker, slot-fill, badges, detach) → Phases 142/143/146.
- Consumer rewiring to `effectivePaintId()` → Phases 143/145.
- Dropping `synced_leader_targets` (v0.6.0 tail) → unrelated, not this milestone.
