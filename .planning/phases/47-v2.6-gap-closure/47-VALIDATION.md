---
phase: 47
slug: v2-6-gap-closure
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
validated: 2026-05-08
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/datasheet/computeSyncDiff.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 47-01-01 | 01 | 1 | OVRD-06 | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ✅ | ✅ green |
| 47-01-02 | 01 | 1 | OVRD-06 | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ✅ | ✅ green |
| 47-01-03 | 01 | 1 | OVRD-06 | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ✅ | ✅ green |
| 47-02-01 | 02 | 2 | OVRD-06 | integration | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ✅ | ✅ green |
| 47-02-02 | 02 | 2 | OVRD-06 | manual | See Manual-Only | N/A | ✅ manual |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. `computeSyncDiff.test.ts` exists (7 passing tests) and accepts in-process extension.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Diff UI shows per-field changes | OVRD-06 | Visual UI rendering in Tauri window | Trigger sync, verify diff collapsible shows stat/keyword/ability changes |
| Toast includes modified count | OVRD-06 | Visual UI rendering in Tauri window | Trigger sync with data changes, verify toast shows "N modified" |

---

## Validation Audit 2026-05-08

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved | 1 |
| Escalated (manual-only) | 2 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated — 1031 tests pass (1 added by Nyquist audit), 2 manual-only
