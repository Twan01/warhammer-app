# Requirements: HobbyForge v0.2.11

**Defined:** 2026-05-13
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play"

## v0.2.11 Requirements

Requirements for the foundation hardening milestone. Each maps to roadmap phases.

### Migrations & Validation

- [ ] **MIG-01**: All schema migrations (018-021) are registered in lib.rs and applied on fresh install
- [ ] **MIG-02**: Fresh app launch from empty app data directory creates all required tables/columns without errors

### Recipe Data Integrity

- [x] **REC-01**: User can create and save a recipe step without selecting a paint; paintless steps persist across edit/reopen and are excluded from paint availability calculations
- [ ] **REC-02**: Editing a recipe preserves existing section/step IDs — only changed fields are updated in place, only user-removed sections/steps are deleted
- [ ] **REC-03**: User can set and clear section workflow metadata (section_type, technique, execution_mode, applies_to); clearing persists after save/reopen
- [ ] **REC-04**: Painting sessions store a stable recipe_section_id FK alongside denormalized section_name; renaming a section does not break session analytics
- [ ] **REC-05**: Recipe-level step queries return steps ordered by section index then step index; steps from different sections never interleave (includes duplicateRecipe fix)

### Version Hygiene

- [ ] **VER-01**: package.json and tauri.conf.json version numbers match the current release

### Testing

- [ ] **TST-01**: Data-layer tests cover migration parity, recipe persistence (paintless steps, non-destructive save round-trip), session section FK, and schema shape validation

## Future Requirements

Deferred to post-v0.2.11.

### Applied Recipes & Points (from v0.2.10)

- **AR-01**: Applied recipe data model — unit_recipe_assignments + unit_recipe_step_progress tables
- **AR-02**: Recipe-to-unit assignment UX
- **AR-03**: Per-unit step completion
- **AR-04**: Applied recipe display
- **AR-05**: Log Session integration
- **AR-06**: Kanban/CurrentFocus progress
- **AR-07**: Bulk apply
- **PI-01–05**: Points import data layer, sync pipeline, freshness tracking, delta detection, resolution chain
- **LV-01–04**: List validation (hard warnings, tactical tags, role coverage, health UI)
- **GD-01**: Game Day pre-game warnings

### Post-Hardening

- **unit_recipe_step_progress FK upgrade**: Replace order_index composite key with real recipe_step_id FK (after REC-02 ships)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Recipe versioning | Non-destructive save (REC-02) is simpler and sufficient for current needs |
| Full migration framework overhaul | Existing tauri-plugin-sql migration system works; just needs registration completeness |
| Automated version bumping CI | VER-01 is a one-time manual fix; automation deferred |
| Production SQLite testing | better-sqlite3 devDep for tests only; no changes to production DB layer |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MIG-01 | Phase 68 | Pending |
| MIG-02 | Phase 68 | Pending |
| VER-01 | Phase 68 | Pending |
| REC-03 | Phase 68 | Pending |
| REC-05 | Phase 68 | Pending |
| REC-01 | Phase 69 | Complete |
| REC-02 | Phase 70 | Pending |
| REC-04 | Phase 71 | Pending |
| TST-01 | Phase 72 | Pending |

**Coverage:**
- v0.2.11 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-05-13*
*Last updated: 2026-05-13 — traceability mapped to phases 68-72*
