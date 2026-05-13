---
phase: 64
slug: applied-recipe-integrations
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 64-01-01 | 01 | 1 | AR-05 | — | N/A | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | Partial | ⬜ pending |
| 64-01-02 | 01 | 1 | AR-05 | — | N/A | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | Partial | ⬜ pending |
| 64-02-01 | 02 | 1 | AR-06 | — | N/A | unit | `pnpm test -- tests/painting/KanbanCard.test.tsx` | Partial | ⬜ pending |
| 64-02-02 | 02 | 1 | AR-06 | — | N/A | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.tsx` | Partial | ⬜ pending |

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
