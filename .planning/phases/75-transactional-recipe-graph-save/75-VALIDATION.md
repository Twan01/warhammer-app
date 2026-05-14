---
phase: 75
slug: transactional-recipe-graph-save
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-14
---

# Phase 75 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/saveRecipeGraph.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 75-01-01 | 01 | 1 | DI-03 | — | Atomic save: all-or-nothing on error | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ❌ W0 | ⬜ pending |
| 75-01-02 | 01 | 1 | DI-03 | — | ROLLBACK leaves recipe in previous state | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ❌ W0 | ⬜ pending |
| 75-01-03 | 01 | 1 | DI-04 | — | Existing section/step IDs preserved | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ❌ W0 | ⬜ pending |
| 75-01-04 | 01 | 1 | DI-04 | — | New section/step IDs assigned | unit | `pnpm test -- tests/painting/saveRecipeGraph.test.ts` | ❌ W0 | ⬜ pending |
| 75-02-01 | 02 | 1 | DI-03 | — | RecipeFormSheet calls saveRecipeGraph | integration | `pnpm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/painting/saveRecipeGraph.test.ts` — stubs for DI-03 + DI-04; mock `@/db/client` to intercept `db.execute` calls
- [ ] Reference: `tests/army-list/armyListQueries.test.ts` for mocking style

*Existing test infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
