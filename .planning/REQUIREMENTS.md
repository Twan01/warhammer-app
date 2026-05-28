# Requirements — v0.3.7 Smart Automation

## Status Auto-Derivation

- [ ] **SAD-01**: Assembly status auto-derives from recipe section completion — when all steps in sections with `section_type = 'assembly'` are complete, `status_assembly` is set to 1
- [ ] **SAD-02**: Basing and varnish auto-derivation uses `section_type` field instead of fragile section name LIKE matching
- [ ] **SAD-03**: `SECTION_TYPES` vocabulary extended with 'assembly', 'basing', 'varnish' values for explicit section_type mapping
- [ ] **SAD-04**: Manual-override guard — auto-derivation does not overwrite statuses that were explicitly set by the user via StatusPopover

## Active Project Lifecycle

- [ ] **APL-01**: `is_active_project` auto-set to 1 when a recipe is first assigned to a unit
- [ ] **APL-02**: `is_active_project` auto-cleared to 0 when all applied recipe steps reach 100% completion
- [ ] **APL-03**: Manual `is_active_project` toggle continues to work and is not overridden by auto-management within the same session

## Smart Context Pre-Filling

- [ ] **SCP-01**: Recipe creation form pre-fills faction from FactionContext when opened from a unit context
- [ ] **SCP-02**: Recipe picker in ApplyRecipeDialog pre-filters recipes by the target unit's faction
- [ ] **SCP-03**: Pre-filled values are visible and editable — user can override any auto-filled field

## Battle-Readiness & Points

- [ ] **BRP-01**: `isUnitBattleReady()` pure function established as canonical readiness definition (painting complete + assembled + based)
- [ ] **BRP-02**: Army list unit picker shows painting status and assembly state inline per unit
- [ ] **BRP-03**: Army list unit picker supports filtering/sorting by units that fit within remaining points budget

## Future Requirements

None deferred — all proposed features included in this milestone.

## Out of Scope

- Auto-suggest base colors per faction — requires faction color schema extension, deferred
- Paint inventory auto-tracking (auto-set owned, running_low warnings) — separate concern, deferred
- Batch status updates from collection view — separate UX scope
- Auto-sync rules on app launch — local-first design, user triggers manually

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SAD-01 | Phase 100 | Pending |
| SAD-02 | Phase 100 | Pending |
| SAD-03 | Phase 100 | Pending |
| SAD-04 | Phase 100 | Pending |
| APL-01 | Phase 100 | Pending |
| APL-02 | Phase 100 | Pending |
| APL-03 | Phase 100 | Pending |
| SCP-01 | Phase 102 | Pending |
| SCP-02 | Phase 102 | Pending |
| SCP-03 | Phase 102 | Pending |
| BRP-01 | Phase 101 | Pending |
| BRP-02 | Phase 101 | Pending |
| BRP-03 | Phase 101 | Pending |
