# Requirements: HobbyForge v0.3.0

**Defined:** 2026-05-22
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" -- with reliable backup/restore so local data is always recoverable

## v0.3.0 Requirements

Requirements for the Robustness & Architecture Hardening milestone. Each maps to roadmap phases.

### Error Handling & Resilience

- [ ] **ERR-01**: App renders a fallback UI (not blank screen) when any component throws during render
- [ ] **ERR-02**: Each route has its own error boundary -- a crash on one page doesn't break other pages
- [ ] **ERR-03**: App verifies DB connection and schema integrity before rendering the main layout
- [ ] **ERR-04**: Unhandled promise rejections and uncaught errors are captured and logged (not silently swallowed)
- [ ] **ERR-05**: Main database uses WAL journal mode and busy_timeout (matching rules-client.ts)

### Database Hardening

- [ ] **DBH-01**: All foreign key columns have database indexes (units.faction_id, recipe_steps.recipe_id, army_list_units.list_id, painting_sessions.unit_id, battle_logs.army_list_id, painting_recipes.faction_id, painting_recipes.unit_id, recipe_sections.recipe_id)
- [ ] **DBH-02**: Temporal query columns have indexes (painting_sessions.session_date DESC, battle_logs.battle_date DESC)
- [ ] **DBH-03**: Data integrity CHECK constraints prevent invalid values (points >= 0, quantity >= 0, painting_percentage BETWEEN 0 AND 100)
- [ ] **DBH-04**: Sync/import operations use batched INSERT statements instead of N individual INSERTs

### Performance

- [ ] **PERF-01**: Route pages are lazy-loaded via React.lazy() -- only the current page's code loads on navigation
- [ ] **PERF-02**: Mutation invalidation chains are precise -- each mutation only invalidates queries actually affected by it
- [ ] **PERF-03**: Kanban enrichment fetches assignments and recipe data in batched queries instead of N sequential per-unit calls
- [ ] **PERF-04**: High-frequency render components (KanbanCard, ArmyListUnitRow, CurrentFocusCard) are wrapped with React.memo

### Architecture Cleanup

- [ ] **ARCH-01**: DB query layer has zero imports from src/features/ -- all shared logic lives in src/lib/ or src/types/
- [ ] **ARCH-02**: PlaybookTab.tsx is decomposed into sub-tab components (each under 300 lines)
- [ ] **ARCH-03**: UnitSheet.tsx is decomposed into form section components (each under 200 lines)
- [ ] **ARCH-04**: ArmyListsPage modal state uses a reducer or state machine instead of 14+ individual useState calls

## Future Requirements

### Potential v0.3.1+

- **FUT-01**: Virtualized lists for 1000+ item collections
- **FUT-02**: Branded ID types for compile-time ID safety (ListId vs UnitId)
- **FUT-03**: Generic filter utility replacing per-feature applyFilters implementations
- **FUT-04**: Component-level error logging to persistent storage (not just console)
- **FUT-05**: Vite build config optimization (rollupOptions chunk splitting, explicit build targets)

## Out of Scope

| Feature | Reason |
|---------|--------|
| New user-facing features | This is a pure internal quality milestone |
| ESLint / Prettier | Project convention is strict TypeScript only; no linter/formatter without explicit discussion |
| ORM migration (Drizzle) | Raw typed queries working well; ORM is v3 escape hatch only |
| Virtualization | Dataset sizes don't warrant it yet (25-row pages) |
| Zustand filter standardization | Low-impact inconsistency; not worth the churn for this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ERR-01 | Phase 97 | Pending |
| ERR-02 | Phase 97 | Pending |
| ERR-03 | Phase 97 | Pending |
| ERR-04 | Phase 97 | Pending |
| ERR-05 | Phase 96 | Pending |
| DBH-01 | Phase 96 | Pending |
| DBH-02 | Phase 96 | Pending |
| DBH-03 | Phase 96 | Pending |
| DBH-04 | Phase 98 | Pending |
| PERF-01 | Phase 98 | Pending |
| PERF-02 | Phase 98 | Pending |
| PERF-03 | Phase 98 | Pending |
| PERF-04 | Phase 98 | Pending |
| ARCH-01 | Phase 99 | Pending |
| ARCH-02 | Phase 99 | Pending |
| ARCH-03 | Phase 99 | Pending |
| ARCH-04 | Phase 99 | Pending |

**Coverage:**
- v0.3.0 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-05-22*
*Last updated: 2026-05-22 after roadmap creation*
