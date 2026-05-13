---
phase: 62
slug: applied-recipe-data-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-13
---

# Phase 62 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest section) |
| **Quick run command** | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts tests/painting/recipeAssignments.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/lib/computeAssignmentProgress.test.ts tests/painting/recipeAssignments.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 62-01-01 | 01 | 1 | AR-01 | — | N/A | unit | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | ❌ W0 | ⬜ pending |
| 62-01-02 | 01 | 1 | AR-01 | — | N/A | unit | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/computeAssignmentProgress.test.ts` — stubs for pure function tests (computeCompletionPercentage, computeAssignmentProgress)
- [ ] `tests/painting/recipeAssignments.test.ts` — stubs for query/hook tests (CRUD, upsert, bulk create)

*Existing test infrastructure (vitest, jest-dom, setup.ts) covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration creates tables on fresh DB | AR-01 | Migration runner is Tauri-native, not testable in jsdom | Run `pnpm tauri dev`, open dev tools, execute `SELECT * FROM unit_recipe_assignments` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
