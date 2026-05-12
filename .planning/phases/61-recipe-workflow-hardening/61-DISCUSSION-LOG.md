# Phase 61: Recipe Workflow Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 61-recipe-workflow-hardening
**Areas discussed:** Migration verification approach, Section rename session stability, section_type value set, Uncommitted bug fixes handling
**Mode:** --auto (all decisions auto-selected)

---

## Migration Verification Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Dev app startup + build check | Verify migrations run on fresh install via dev startup; cargo check + pnpm build for CI | ✓ |
| Automated migration integration test | Write a test that creates a fresh DB and verifies schema | |
| Manual smoke test protocol | Document a manual verification checklist | |

**Auto-selected:** Dev app startup + build check (recommended default)
**Notes:** The root cause (migrations 018-020 not registered in lib.rs) was already found and fixed via debug session. Phase 61 verifies the fix works. Automated migration tests are overkill for a personal desktop app with Tauri's built-in migration runner.

---

## Section Rename Session Stability

| Option | Description | Selected |
|--------|-------------|----------|
| Keep denormalized TEXT, no propagation | Old sessions retain old section name — snapshot behavior | ✓ |
| Propagate renames to existing sessions | UPDATE painting_sessions SET section_name = new WHERE section_name = old | |
| Hybrid: propagate + keep history | Add renamed_from field to track changes | |

**Auto-selected:** Keep denormalized TEXT, no propagation (recommended default)
**Notes:** Deliberate v0.2.9 architectural decision. DELETE-all + re-INSERT save pattern makes FK-based references unstable. Denormalized TEXT is the established pattern (matches detachment_name, weapon_name). computeWorkflowPosition already handles orphaned references gracefully.

---

## section_type Value Set

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current 7 values | prep, basecoat, shade, layer, detail, effect, finishing | ✓ |
| Expand with additional stages | Add varnish, weathering, basing, priming as separate types | |
| Reduce to fewer categories | Merge similar stages (e.g., shade + layer → coloring) | |

**Auto-selected:** Keep current 7 values (recommended default)
**Notes:** Current values cover the standard Warhammer painting workflow. Adding more values can happen in a future phase if users find gaps.

---

## Uncommitted Bug Fixes

| Option | Description | Selected |
|--------|-------------|----------|
| Commit before Phase 61 | Treat as independent bug fixes, commit separately | ✓ |
| Include in Phase 61 | Bundle fixes as Phase 61 deliverables | |

**Auto-selected:** Commit before Phase 61 (recommended default)
**Notes:** Three pre-existing bugs: migration registration (lib.rs), React error #185 (RecipeDetailSheet), faction resolution (datasheets.ts). These are independent fixes discovered during development, not Phase 61 scope.

---

## Claude's Discretion

- Test approach for verifying RH-01/RH-02/RH-03
- Whether to add defensive checks in recipe save path
- Minor code cleanup discovered during hardening

## Deferred Ideas

None — hardening phase with clear scope boundaries.
