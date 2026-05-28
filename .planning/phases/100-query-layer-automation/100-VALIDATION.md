---
phase: 100
slug: query-layer-automation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-28
---

# Phase 100 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm vitest run tests/painting/syncDerivedStatuses.test.ts tests/painting/recipeAssignments.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~2 seconds (quick) / ~80 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run quick command (2s)
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 100-01-01 | 01 | 1 | SAD-03 | — | SECTION_TYPES has 10 values incl. assembly, basing, varnish | unit | `pnpm vitest run tests/lib/computeWorkflowPosition.test.ts` | ✅ | ✅ green |
| 100-01-02 | 01 | 1 | SAD-04 | T-100-01 | Override columns exist, updateUnit accepts $24-$26 via COALESCE | build | `pnpm build` | ✅ | ✅ green |
| 100-02-01 | 02 | 2 | SAD-01 | T-100-03 | Assembly auto-derives from section completion; dual-path SQL | unit | `pnpm vitest run tests/painting/syncDerivedStatuses.test.ts` | ✅ | ✅ green |
| 100-02-02 | 02 | 2 | SAD-02 | T-100-03 | section_type-first matching with name-LIKE backward-compat fallback | unit | `pnpm vitest run tests/painting/syncDerivedStatuses.test.ts` | ✅ | ✅ green |
| 100-02-03 | 02 | 2 | SAD-04 | T-100-03 | Override guard: null param + CASE WHEN skips auto-derivation | unit | `pnpm vitest run tests/painting/syncDerivedStatuses.test.ts` | ✅ | ✅ green |
| 100-02-04 | 02 | 2 | APL-01 | T-100-04 | is_active_project auto-set to 1 on recipe assign | unit | `pnpm vitest run tests/painting/recipeAssignments.test.ts` | ✅ | ✅ green |
| 100-02-05 | 02 | 2 | APL-02 | — | is_active_project auto-cleared at 100% painting completion | unit | `pnpm vitest run tests/painting/syncDerivedStatuses.test.ts` | ✅ | ✅ green |
| 100-02-06 | 02 | 2 | APL-03 | — | syncDerivedStatuses never sets is_active_project = 1 | unit | `pnpm vitest run tests/painting/syncDerivedStatuses.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Test Coverage Summary

| Test File | Tests | Requirements Covered |
|-----------|-------|---------------------|
| `tests/painting/syncDerivedStatuses.test.ts` | 20 | SAD-01, SAD-02, SAD-04, APL-02, APL-03 |
| `tests/painting/recipeAssignments.test.ts` | 30 (3 APL-01 specific) | APL-01 |
| `tests/lib/computeWorkflowPosition.test.ts` | 2 (SECTION_TYPES specific) | SAD-03 |

**Total:** 52 tests covering 7/7 requirements

---

## Validation Audit 2026-05-28

| Metric | Count |
|--------|-------|
| Requirements audited | 7 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-28
