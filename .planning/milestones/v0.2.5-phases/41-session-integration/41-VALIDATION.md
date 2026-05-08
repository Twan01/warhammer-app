---
phase: 41
slug: session-integration
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-07
validated: 2026-05-07
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest section) |
| **Quick run command** | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts tests/dashboard/logSessionSchema.test.ts tests/hobby-journal/migration014.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~50 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts tests/dashboard/logSessionSchema.test.ts tests/hobby-journal/migration014.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 1 | INTEG-01 | unit | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts` | ✅ | ✅ green |
| 41-01-02 | 01 | 1 | INTEG-01 | unit | `pnpm test -- tests/dashboard/logSessionSchema.test.ts` | ✅ | ✅ green |
| 41-01-03 | 01 | 1 | INTEG-01 | unit | `pnpm test -- tests/hobby-journal/paintingSessionQueries.test.ts` | ✅ | ✅ green |
| 41-02-01 | 02 | 2 | INTEG-01 | component | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ | ✅ green |
| 41-02-02 | 02 | 2 | INTEG-01 | component | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ | ✅ green |
| 41-02-03 | 02 | 2 | INTEG-02 | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ | ✅ green |
| 41-02-04 | 02 | 2 | INTEG-02 | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/hobby-journal/migration014.test.ts` — covers INTEG-01 migration content assertions (additive-only, both ALTER TABLE statements present) — **7 tests, all green**
- [x] Verify `src-tauri/src/lib.rs` has all migration versions registered (research flagged 013 gap) — **covered in migration014.test.ts**

*All Wave 0 requirements fulfilled.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recipe Select cascades to step dropdown | INTEG-01 | Interactive form behavior with dependent selectors | 1. Open LogSessionSheet 2. Select a recipe 3. Verify step dropdown populates with recipe's steps 4. Clear recipe 5. Verify step dropdown clears/disables |
| Sessions section in RecipeDetailSheet | INTEG-02 | Visual layout verification | 1. Log session linked to recipe 2. Open recipe detail 3. Verify session appears with date, unit, duration |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 50s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-07

---

## Validation Audit 2026-05-07

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

**Tests added:** `tests/hobby-journal/migration014.test.ts` (7 tests — 5 migration content assertions + 2 lib.rs registration checks)
**Total suite:** 932 tests, all green
