# Requirements: HobbyForge v0.2.10

**Defined:** 2026-05-12
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## v1 Requirements

### Recipe Hardening

- [ ] **RH-01**: Fresh install and existing DB both create recipe_sections with all 4 workflow metadata columns (section_type, technique, execution_mode, applies_to)
- [ ] **RH-02**: Section-aware log session uses stable section reference — renaming a section does not break session analytics
- [ ] **RH-03**: Workflow metadata UX refined — section_type values match user mental model, progressive disclosure preserved for simple recipes

### Applied Recipes

- [ ] **AR-01**: Schema: unit_recipe_assignments + unit_recipe_step_progress tables with stable composite key (survives DELETE-all + re-INSERT save)
- [ ] **AR-02**: User can apply one or more recipes to a unit from Collection/Unit Detail with section/step preview
- [ ] **AR-03**: User can tick sections/steps as completed for a specific unit assignment — progress stored separately from recipe template
- [ ] **AR-04**: Applied recipe progress visible on unit detail — checklist-like section/step view with completion percentage
- [ ] **AR-05**: Log Session can optionally complete an applied recipe step during session creation
- [ ] **AR-06**: Kanban cards and CurrentFocusCard show applied recipe progress and next step (replaces session-derived position when available)
- [ ] **AR-07**: User can apply same recipe to multiple selected units — each gets separate progress

### Points Import

- [ ] **PI-01**: Schema: points import tables in hobbyforge.db with source_name, source_version, import_date, row_count
- [ ] **PI-02**: User can import points from CSV file — validation, versioning, error logging, import history
- [ ] **PI-03**: Points freshness visible — source name, version, import date, stale/fresh/unknown badges on army lists and rules hub
- [ ] **PI-04**: After import, user can see per-unit points deltas (increased/decreased/new/removed) and affected army lists
- [ ] **PI-05**: 5-level points resolution: list override > loadout override > imported points > unit default > unknown — applied atomically across all COALESCE sites

### List Validation

- [ ] **LV-01**: Hard validation warnings on army list: points exceeded, unknown/stale points, manual override in use, unowned/unbuilt/unpainted/not-battle-ready units
- [ ] **LV-02**: User can assign tactical role tags (anti_tank, screening, objective_holder, etc.) to units
- [ ] **LV-03**: Army list shows tactical role coverage — aggregated tag strengths/weaknesses with visual indicators
- [ ] **LV-04**: Army list detail shows health summary panel: points total, ownership %, readiness %, freshness status, warning count

### Game Day Integration

- [ ] **GD-01**: Game Day pre-game warnings: surface points freshness, readiness gaps, tactical coverage warnings, and stale data alerts before playing

## v2 Requirements

### Applied Recipes — Future

- **AR-08**: Batch/group recipe assignments with shared progress across units
- **AR-09**: Prompt to update painting status on recipe completion (not auto-advance)

### Points Import — Future

- **PI-06**: Multiple points sources comparison (e.g., different community FAQ versions)
- **PI-07**: Points import history with rollback capability

### List Validation — Future

- **LV-05**: Soft warnings with configurable thresholds (e.g., "too many points in unpainted units")
- **LV-06**: Export validation report as text for sharing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Official points bundled in app source | Copyright constraint — never in scope |
| Auto-fetch/scrape points from external sources | Local-first constraint; user triggers import manually |
| Complex dependency graphs between recipe steps | Over-engineering; deferred |
| Rules-legal validation (detachment slots, army composition) | New Recruit/BattleScribe territory; not our differentiator |
| Auto-advance painting status from recipe completion | Anti-feature per research; creates ghost updates |
| Shared batch progress across units | Design separately; separate assignments safer |
| AI recipe generation | Deferred to future milestone |
| Tournament compliance checks | Not the goal — hobby readiness, not competitive optimization |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RH-01 | — | Pending |
| RH-02 | — | Pending |
| RH-03 | — | Pending |
| AR-01 | — | Pending |
| AR-02 | — | Pending |
| AR-03 | — | Pending |
| AR-04 | — | Pending |
| AR-05 | — | Pending |
| AR-06 | — | Pending |
| AR-07 | — | Pending |
| PI-01 | — | Pending |
| PI-02 | — | Pending |
| PI-03 | — | Pending |
| PI-04 | — | Pending |
| PI-05 | — | Pending |
| LV-01 | — | Pending |
| LV-02 | — | Pending |
| LV-03 | — | Pending |
| LV-04 | — | Pending |
| GD-01 | — | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20 ⚠️ (awaiting roadmap)

---
*Requirements defined: 2026-05-12*
*Last updated: 2026-05-12 after initial definition*
