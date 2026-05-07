---
phase: 41
slug: session-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-07
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest section) |
| **Quick run command** | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts tests/dashboard/logSessionSchema.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts tests/dashboard/logSessionSchema.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 1 | INTEG-01 | unit | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts` | ✅ (extend) | ⬜ pending |
| 41-01-02 | 01 | 1 | INTEG-01 | unit | `pnpm test -- tests/dashboard/logSessionSchema.test.ts` | ✅ (extend) | ⬜ pending |
| 41-01-03 | 01 | 1 | INTEG-01 | unit | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts` | ✅ (add) | ⬜ pending |
| 41-02-01 | 02 | 2 | INTEG-01 | component | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ (extend) | ⬜ pending |
| 41-02-02 | 02 | 2 | INTEG-01 | component | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ (extend) | ⬜ pending |
| 41-02-03 | 02 | 2 | INTEG-02 | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ (extend) | ⬜ pending |
| 41-02-04 | 02 | 2 | INTEG-02 | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/hobby-journal/migration014.test.ts` — covers INTEG-01 migration content assertions (additive-only, both ALTER TABLE statements present)
- [ ] Verify `src-tauri/src/lib.rs` has all migration versions registered (research flagged 013 gap)

*All other test files exist and require extension, not creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recipe Select cascades to step dropdown | INTEG-01 | Interactive form behavior with dependent selectors | 1. Open LogSessionSheet 2. Select a recipe 3. Verify step dropdown populates with recipe's steps 4. Clear recipe 5. Verify step dropdown clears/disables |
| Sessions section in RecipeDetailSheet | INTEG-02 | Visual layout verification | 1. Log session linked to recipe 2. Open recipe detail 3. Verify session appears with date, unit, duration |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
