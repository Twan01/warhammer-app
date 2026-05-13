---
phase: 64
slug: applied-recipe-integrations
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-13
---

# Phase 64 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/dashboard/ tests/painting/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/logSessionSheet.test.tsx tests/painting/KanbanCard.test.tsx tests/dashboard/CurrentFocusCard.test.tsx`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 64-01-01 | 01 | 1 | AR-05 | — | N/A | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | Yes | ✅ green |
| 64-01-02 | 01 | 1 | AR-05 | — | N/A | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | Yes | ✅ green |
| 64-02-01 | 02 | 1 | AR-06 | — | N/A | unit | `pnpm test -- tests/painting/KanbanCard.test.tsx` | Yes | ✅ green |
| 64-02-02 | 02 | 1 | AR-06 | — | N/A | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.tsx` | Yes | ✅ green |
| 64-02-03 | 02 | 1 | AR-06 | — | N/A | unit | `pnpm test -- tests/painting/kanbanEnrichment.test.ts` | Yes | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Test cases are additions to existing test files, not new files.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual progress display on KanbanCard | AR-06 | Visual rendering, spacing, truncation | Launch app, navigate to Projects, verify progress fraction shows on cards with applied recipes |
| Visual progress display on CurrentFocusCard | AR-06 | Visual rendering, layout | Launch app, verify dashboard focus card shows recipe progress |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

---

## Validation Audit 2026-05-13

| Metric | Count |
|--------|-------|
| Gaps found | 5 |
| Resolved | 5 |
| Escalated | 0 |

Tests added:
- `tests/painting/logSessionSheet.test.tsx` — 5 tests (AR-05 bridge hooks wiring)
- `tests/painting/KanbanCard.test.tsx` — 7 tests (AR-06 appliedProgress display)
- `tests/dashboard/CurrentFocusCard.test.tsx` — 7 tests (AR-06 appliedProgress display)
- `tests/painting/kanbanEnrichment.test.ts` — 6 tests (AR-06 appliedProgress enrichment pipeline)
