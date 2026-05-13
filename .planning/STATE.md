---
gsd_state_version: 1.0
milestone: v0.2.11
milestone_name: Foundation Hardening
status: executing
stopped_at: Phase 66 context gathered
last_updated: "2026-05-13T14:00:00.000Z"
last_activity: 2026-05-13
progress:
  total_phases: 12
  completed_phases: 8
  total_plans: 14
  completed_plans: 14
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play"
**Current focus:** Phase 66 — Army List Validation

## Current Position

Phase: 66 (Army List Validation) — CONTEXT GATHERED
Plan: 0 of 0 complete
Next: Plan Phase 66
Last activity: 2026-05-13

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- v0.2.9: 8 plans across 4 phases (single day)
- v0.2.8: 12 plans across 5 phases (2 days)
- v0.2.7: 8 plans across 4 phases (single day)
- v0.2.6: 11 plans across 6 phases (single day)
- v0.2.5: 12 plans across 5 phases (single day)

## Accumulated Context

### Decisions Carried Forward

- synced_unit_points cache in hobbyforge.db solves cross-DB JOIN problem (Research Pitfall 1 Option B) — rw_datasheet_points in rules.db cannot be JOINed directly from hobbyforge.db queries
- 5-level COALESCE: alu.points_override > sup.points > uo.points > u.points > 0 (D-06)
- Dashboard queries intentionally NOT updated with synced points (D-09: different concern)
- Non-destructive recipe save (REC-02/Phase 70) must precede session FK (REC-04/Phase 71) — FK is pointless while DELETE-all fires ON DELETE SET NULL on every edit
- COALESCE blocks null-clearing on 4 workflow metadata fields in recipeSections.ts — direct assignment fix in Phase 68
- better-sqlite3 (devDep) chosen over node:sqlite for tests — Vitest 4.x import-stripping bug (#7177)
- duplicateRecipe step fetch has same section-ordering bug as REC-05 — included in Phase 68 scope
- Paintless step guard is a single removal in RecipeFormSheet.tsx line 292 (Phase 69 is LOW risk)
- Three-way diff for non-destructive save requires dbId tracking in form state (Phase 70 — DONE)
- removeRecipePaint hook removed from RecipeFormSheet — edit path now uses direct removeRecipeStep query function
- PointsFreshnessBadge is self-contained (no props) — queries useRulesSyncMeta internally, shares React Query cache
- getArmyListUnitNames lightweight query added for delta impact analysis

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-13T14:00:00.000Z
Stopped at: Phase 66 context gathered
Resume: .planning/phases/66-army-list-validation/66-CONTEXT.md
