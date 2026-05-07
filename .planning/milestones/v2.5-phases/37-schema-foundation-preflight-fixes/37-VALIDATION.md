---
phase: 37
slug: schema-foundation-preflight-fixes
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-07
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/foundation/useRecipes.test.ts tests/foundation/recipeStepCountQuery.test.ts tests/foundation/useAllStepCounts.test.ts tests/painting/recipeSchema.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~42 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 42 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 01 | 1 | SCHEMA-01 | unit | `pnpm test -- tests/paint-inventory/recipePaintQuery.test.ts` | ✅ | ✅ green |
| 37-01-02 | 01 | 1 | SCHEMA-02 | unit | `pnpm test -- tests/painting/recipeSchema.test.ts` | ✅ | ✅ green |
| 37-01-02 | 01 | 1 | SCHEMA-02 | unit | `pnpm test -- tests/painting/RecipeTable.test.tsx` | ✅ | ✅ green |
| 37-01-02 | 01 | 1 | SCHEMA-03 | unit | `pnpm test -- tests/foundation/useRecipes.test.ts` | ✅ | ✅ green |
| 37-02-01 | 02 | 2 | SCHEMA-04 | unit | `pnpm test -- tests/foundation/recipeStepCountQuery.test.ts` | ✅ | ✅ green |
| 37-02-01 | 02 | 2 | SCHEMA-04 | unit | `pnpm test -- tests/foundation/useAllStepCounts.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 012 preserves existing recipe_paints rows as recipe_steps | SCHEMA-01 | Cannot run SQLite migration in jsdom | Open app after update, verify existing recipe steps appear |
| Recipe metadata round-trips through UI (style, surface, etc.) | SCHEMA-02 | Requires live Tauri + React Query environment | Edit a recipe, set metadata, save, reopen, verify values persist |
| Deleting recipe clears kanban-enrichment stale entries in live UI | SCHEMA-03 | Cache invalidation timing requires live React Query | Delete recipe from Kanban board, navigate back, confirm no stale entries |

---

## Validation Audit 2026-05-07

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated | 0 |

### Gap Resolution Details

| Gap | Requirement | Resolution | Test File |
|-----|-------------|------------|-----------|
| useDeleteRecipe kanban-enrichment invalidation untested | SCHEMA-03 | Added `it()` block to existing test | tests/foundation/useRecipes.test.ts |
| getStepCountsByRecipe batch query untested | SCHEMA-04 | New test file (SQL string, row mapping, empty result) | tests/foundation/recipeStepCountQuery.test.ts |
| useAllStepCounts hook + STEP_COUNTS_KEY invalidation untested | SCHEMA-04 | New test file (hook return type, add/remove mutation invalidation) | tests/foundation/useAllStepCounts.test.ts |
| recipeSchema Zod metadata validation untested | SCHEMA-02 | New test file (const arrays, nullable fields, estimated_minutes validation) | tests/painting/recipeSchema.test.ts |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 42s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-07
