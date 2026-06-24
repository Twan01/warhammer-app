---
gsd_state_version: 1.0
milestone: v0.7.0
milestone_name: Technique Library
status: Awaiting next milestone
stopped_at: Phase 146 UI-SPEC approved
last_updated: "2026-06-23T08:48:47.155Z"
last_activity: 2026-06-23 — Milestone v0.7.0 completed and archived
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 22
  completed_plans: 22
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-19)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with accurate canonical data and reliable backup/restore
**Current focus:** Milestone complete

## Current Position

Phase: Milestone v0.7.0 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-06-23 — Milestone v0.7.0 completed and archived

## Performance Metrics

**Velocity (recent milestones):**

- v0.6.0: 32 plans across 11 phases (4 days)
- v0.5.2: 13 plans across 4 phases (1 day)
- v0.5.0: 9 plans across 5 phases (2 days)
- v0.4.7: 10 plans across 5 phases (6 days)

*Updated after each plan completion*

## Accumulated Context

### Key Decisions (carried forward + new for v0.7.0)

- Single-database architecture — all data in hobbyforge.db
- Current migration count: 050 (new technique migrations start at 051)
- Schema version = migration count; `pnpm check:version` three-leg gate enforced via prebuild hook
- Progress keyed by `recipe_step_id` (v0.2.13 invariant); technique-step identity must be equally stable — FND-03 is the top engineering risk
- **v0.7.0 LOCKED (Phase 141-01):** Option A selected — technique steps materialised as concrete recipe_steps rows with technique_step_id FK. unit_recipe_step_progress unchanged. Encoded in migration 051 header + PROJECT.md Key Decisions.
- Flat inline SQL only — tauri-plugin-sql cannot nest transactions; resync must use single db handle
- No new runtime or dev dependencies — every v0.7.0 pattern maps to an existing codebase pattern
- No new top-level sidebar entry — technique library lives under Workshop/Recipes
- effectivePaintId() must be the single resolution spine for ALL paint consumers — direct step.paint_id reads on technique-owned steps always return NULL
- **v0.7.0 gap-closure (Phase 146.1-01):** technique_section_id must be written by applyTechnique (section.id) and copied by duplicateRecipe — required so resyncTechniqueInstances UPDATEs rather than INSERTs duplicate sections. LINK-01 + INTG-05 closed.

### Phase 141 Critical Gate

Phase 141 must be complete (Option A/B locked, migrations written, data-layer tests green) before Phase 142 begins. The progress-stability test (FND-03) must exist and pass before any technique UI is written.

### Phase 144 Critical Gate

Phase 144 data-layer tests must pass before Phase 145 integration work begins. The resync loop is the highest-risk novel code in the milestone — stub test cases first, then implement.

### Pending Todos

None.

### Open Blockers

None. (LINK-01 and INTG-05 closed by Phase 146.1-01 gap-closure plan)

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Future | PLAY-FUT-01: Faction overview page | Future milestone | v0.6.0 planning |
| Future | PLAY-FUT-02: Auto-backup on schedule | Future milestone | v0.6.0 planning |
| Future | HON-FUT-01: Theme customization / custom painting-status labels | Future milestone | v0.6.0 planning |
| Future | French translations for stratagems/enhancements | Future milestone | v0.4.7 planning |
| v0.7.0 v2 | TQOL-01..04: Technique QoL (per-instance timestamp, slot suggestions, bulk reassign, soft-override flow) | v0.7.0 v2 | v0.7.0 scoping |
| v0.7.0 v2 | TECH-UX-01: Technique step colour-slot dropdown discoverability — RESOLVED 2026-06-23 (commit 9e9cf36c): empty dropdown now shows "add one in Colour Slots above" hint | RESOLVED | 146 UAT |
| v0.7.0 v2 | TECH-UX-02: Slot-fill inline paint create — RESOLVED 2026-06-23 (commit 9e9cf36c): PaintCombobox now offers "Add new paint" (stacked PaintSheet + new-paint detection); clearer slot-less copy | RESOLVED | 146 UAT |
| v0.7.0 v2 | DEVENV-01: Dev/prod data-dir isolation — `pnpm tauri dev` shares the prod DB (`com.hobbyforge.app/hobbyforge.db`); dev migrations broke an installed older app (v0.7.0 release incident, 2026-06-24). Thread a dev/debug-gated data dir/identifier through preflight `resolve_app_data_dir` (lib.rs:454) AND the whole backup/restore/export/factory-reset subsystem (~15 sites); release-build-verify prod path unchanged. Gotcha documented in CLAUDE.md. | v0.7.0 v2 | 0.7.0 release incident |
| v0.7.0 v2 | TECHDEBT-01: `invalidateAfterApply` (useTechniqueInstances.ts) omits `UNFILLED_SLOT_COUNT_KEY` — readiness banner stale until staleTime after applying a technique with unfilled slots | v0.7.0 v2 | 145 integration audit |
| Phase 142 P01 | 15 | 3 tasks | 8 files |
| Phase 144-live-link-re-sync P01 | 21 | 3 tasks | 4 files |
| Phase 144-live-link-re-sync P02 | 18 | 2 tasks | 4 files |
| Phase 144-live-link-re-sync P03 | 12 | 1 tasks | 1 files |
| Phase 145-integration-pass P02 | 14 minutes | 3 tasks | 5 files |
| Phase 145-integration-pass P03 | 45 | 3 tasks | 5 files |
| Phase 145-integration-pass P04 | 25 | 3 tasks | 3 files |
| Phase 146-detach-safety-rails P03 | 15m | 2 tasks | 4 files |

## Session Continuity

Last session: 2026-06-23T08:43:22.331Z
Stopped at: Phase 146 UI-SPEC approved
Resume file: None

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
