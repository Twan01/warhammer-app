# Project Research Summary

**Project:** HobbyForge v0.2.11 — Foundation Hardening
**Domain:** Data integrity hardening for Tauri 2 + SQLite desktop app
**Researched:** 2026-05-13

## Executive Summary

v0.2.11 is an internal hardening milestone. The goal is to close seven categories of data integrity debt accumulated across v0.2.7–v0.2.10: unregistered migrations, a destructive DELETE-all recipe save, a COALESCE bug preventing null-clearing, silent dropping of paintless steps, incorrect cross-section step ordering, missing session-to-section FK, and version string drift. Every requirement maps to a named defect discovered through direct codebase inspection.

## Stack Additions

| Addition | Version | Purpose | Risk |
|----------|---------|---------|------|
| `better-sqlite3` (devDep) | ^12.10.0 | In-memory SQLite for DDL behavioral tests | LOW — devDep only, no production impact |

No production dependencies added. `node:sqlite` rejected due to Vitest 4.x import-stripping bug (#7177).

## Feature Assessment

### Table Stakes (must fix)
- **MIG-01/02**: Migration registration completeness + fresh install validation
- **REC-01**: Paintless recipe steps — guard removal in RecipeFormSheet.tsx line 292
- **REC-03**: Section metadata clearing — 4× COALESCE → direct assignment in recipeSections.ts

### Differentiators (high-value hardening)
- **REC-02**: Non-destructive recipe save — replace DELETE-all + re-INSERT with three-way diff
- **REC-04**: Stable recipe_section_id FK on painting_sessions (migration 022)
- **REC-05**: Section-aware step ordering — LEFT JOIN + double-column ORDER BY
- **TST-01**: Data-layer test suite covering all fixes

### Cosmetic
- **VER-01**: Version number alignment in package.json and tauri.conf.json

## Architecture Impact

- Four-layer stack unchanged (UI → hooks → queries → DB client)
- All work is at query layer (SQL fixes), form layer (REC-02 diff), and migration layer (022)
- New query function: `updateRecipeStep()` in recipePaints.ts
- No new cache keys, routes, or Rust commands

## Key Pitfalls

1. **Non-destructive save partial writes** — deletion pass omitted → orphaned DB rows. Fix: delete-first ordering.
2. **COALESCE blocking null** — four workflow metadata fields treat null as "keep old." Fix: direct assignment.
3. **Migration parity gap** — fresh installs silently fail on unregistered migrations. Fix: parity test.
4. **REC-04 FK pointless without REC-02** — ON DELETE SET NULL fires on every edit under DELETE-all save. Hard dependency.
5. **Section ordering absent from flat consumers** — steps interleave across sections. Fix: LEFT JOIN + ORDER BY.

## Suggested Phase Order

| Phase | Requirements | Risk | Notes |
|-------|-------------|------|-------|
| 1 | MIG-01, MIG-02, VER-01, REC-03, REC-05 | LOW | Independent quick wins, no form changes |
| 2 | REC-01 | LOW | Guard removal, must precede REC-02 |
| 3 | REC-02 | HIGH | Three-way diff, dbId tracking, highest complexity |
| 4 | REC-04 | MEDIUM | Migration 022, FK wiring, gated on Phase 3 |
| 5 | TST-01 | LOW | Verification layer asserting Phases 1–4 |

## Research Confidence

**Overall: HIGH** — all findings from direct inspection of ~290 source files. No inference or assumption.

## Open Questions

- Whether `// @vitest-environment node` suffices for `better-sqlite3` or `pool: 'forks'` is needed — confirmed by running first test.
- `duplicateRecipe` step fetch has same ordering bug as REC-05 — include in Phase 1 scope.
- `unit_recipe_step_progress` FK upgrade (replace order_index key with real recipe_step_id FK) deferred to post-v0.2.11.
