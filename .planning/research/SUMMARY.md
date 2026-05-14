# Research Summary: HobbyForge v0.2.13

**Project:** HobbyForge v0.2.13 — Data Integrity, Diagnostics & Product Coherence
**Researched:** 2026-05-14

## Executive Summary

v0.2.13 is a hardening and coherence milestone built entirely on the existing stack. No new npm or Cargo dependencies are required. The key architectural work is restructuring three brittle patterns: the sequential recipe save in `RecipeFormSheet.tsx`, the triplicated 5-level COALESCE chain across query files, and the order_index-keyed progress records that become unreliable after step reordering.

The recommended approach is schema-first, then data-layer corrections, then query/lib consolidation, then diagnostics, then Rust-side backup, then UX features. Two hard architectural constraints must be enforced throughout: no nested `BEGIN TRANSACTION` calls (tauri-plugin-sql does not support savepoints), and `VACUUM INTO` rather than raw file copy for backup (file copy is unsafe without explicit WAL checkpoint).

The single highest-risk item is the order_index → recipe_step_id migration back-fill. The SQL must join through `recipe_sections` to disambiguate per-section `order_index` values — without this, multi-section recipes will have progress silently re-attributed to the wrong steps.

## Stack Additions

**None required.** All capabilities implementable with existing Tauri 2 + React 19 + SQLite toolkit:
- Transactions: `BEGIN/COMMIT/ROLLBACK` via `db.execute()` (already proven in `duplicateRecipe`, `bulkCreateAssignments`, `replaceSyncedUnitPoints`)
- Backup: New Rust command using `VACUUM INTO` (not raw file copy — unsafe without WAL checkpoint)
- Diagnostics: SQLite PRAGMAs + `SELECT COUNT(*)` via existing `db.select()`
- Points resolver: Pure TypeScript function in `src/lib/`

## Feature Assessment

### Table Stakes (P1 — must ship)
- Applied recipe identity hardening (order_index → recipe_step_id)
- Transactional recipe graph save (`saveRecipeGraph()`)
- Centralized points resolver + PointsSourceChip UI
- Split list/unit warnings
- Dashboard next-action step text
- Game Day End Game flow (close the loop to BattleLogSheet)
- Data Health/Diagnostics page
- Manual backup/export
- Version parity check script

### Differentiators
- Points source labeling ("95 pts · synced" vs "100 pts · manual override") — no competitor does this
- Data Health diagnostics page — neither Tabletop Battles nor BattleBase have one
- After-action review analytics (per-mission/faction win rates)
- Unit-to-rules mapping confirmation layer

### Defer to v0.3+
- Restore from backup (connection lifecycle complexity)
- Auto-backup on schedule
- Army list snapshot versioning
- Per-round VP tracking

## Architecture Impact

- Four-layer stack unchanged (UI → hooks → queries → DB client)
- Two new migrations: 026 (unit_rules_mapping), 027 (battle_log_game_day columns)
- Three new pure functions in `src/lib/`: `resolveUnitPoints()`, `splitWarnings()`, points SQL constant
- Key new query: `saveRecipeGraph()` — flat inlined SQL transaction (no helper delegation)
- New Rust command: `backup_database` using `VACUUM INTO`
- New pages/components: DataHealthPage, BackupSection, AfterActionSheet, NextActionsPanel, PointsSourceChip

## Key Pitfalls

1. **order_index back-fill must join through recipe_sections** to disambiguate per-section values — hardest SQL in milestone
2. **saveRecipeGraph must inline all SQL** — tauri-plugin-sql does not support nested transactions
3. **Backup must use VACUUM INTO**, not std::fs::copy — raw copy unsafe without WAL checkpoint
4. **COALESCE site-3 divergence** in `dashboard.ts` uses only 2-level chain — must resolve or document
5. **gameDayStore has no version/migrate** in persist config — must add before any new nested fields

## Suggested Phase Order

| Phase | Focus | Risk | Dependencies |
|-------|-------|------|--------------|
| 1 | Schema Foundation (migrations 026+027, version parity) | LOW | None |
| 2 | Applied Recipe Identity Hardening | HIGH | Phase 1 |
| 3 | Transactional Recipe Graph Save | MEDIUM | Phase 1 |
| 4 | Points Resolver + Unit Rules Mapping + Split Warnings | MEDIUM | Phase 1 |
| 5 | Data Health Page + Backup/Export | MEDIUM | Phases 1-2 (clean data for diagnostics) |
| 6 | Dashboard Command Center + Game Day After-Action | LOW-MEDIUM | Phases 1-4 |

## Research Confidence

**Overall: HIGH** — all findings from direct codebase inspection (~290 source files). Key confirmed patterns:
- Transaction pattern proven in 3 existing query functions
- COALESCE divergence at site-3 directly verified
- gameDayStore persist config inspected (no version/migrate)
- Migration numbers confirmed (last is 025_tactical_role)

## Open Questions

- Whether `VACUUM INTO` works through the tauri-plugin-sql JS bridge — recommended early spike in Phase 5
- COALESCE site-3 semantic decision: `getArmyReadinessByFaction` cannot use `alu.points_override` (no army_list_units join) — decide during Phase 4 planning
- Whether restore from backup is deferred to v0.2.14 or included as stretch goal

---
*Synthesized: 2026-05-14*
