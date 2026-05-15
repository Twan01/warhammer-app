---
phase: 74
slug: applied-recipe-identity-hardening
status: complete
nyquist_compliant: true
created: 2026-05-15
---

# Phase 74 — Validation Strategy

> Per-phase validation contract for applied recipe identity hardening.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (jsdom environment) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/foundation/migration028.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 74-01-01 | 01 | 1 | DI-02 | T-74-01 | INNER JOIN drops orphaned rows; FK re-enabled after rebuild | content-shape | `pnpm test -- tests/foundation/migration028.test.ts` | ✅ | ✅ green |
| 74-01-01 | 01 | 1 | DI-02 | T-74-01 | recipe_step_id FK + UNIQUE constraint prevent invalid/duplicate progress | content-shape | `pnpm test -- tests/foundation/migration028.test.ts` | ✅ | ✅ green |
| 74-01-02 | 01 | 1 | DI-01 | — | computeAssignmentProgress matches by step.id not order_index | unit | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | ✅ | ✅ green |
| 74-02-01 | 02 | 2 | DI-01 | T-74-04 | upsertStepProgress uses recipeStepId; SQL ON CONFLICT uses recipe_step_id | unit | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ✅ | ✅ green |
| 74-02-01 | 02 | 2 | DI-01 | — | AssignmentChecklist passes step.id to toggle, completedSet keyed by recipe_step_id | component | `pnpm test -- tests/applied-recipes/assignmentChecklist.test.tsx` | ✅ | ✅ green |
| 74-02-02 | 02 | 2 | DI-02 | — | Migration 28 registered in lib.rs, highest version in get_migrations() | content-shape | `pnpm test -- tests/foundation/migration028.test.ts` | ✅ | ✅ green |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Audit 2026-05-15

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

Gap resolved: Migration 028 SQL content test (`tests/foundation/migration028.test.ts` — 19 assertions covering table-rebuild pattern, FK constraints, back-fill JOIN, orphan-drop, lib.rs registration).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-15
