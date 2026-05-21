---
phase: 92
slug: leader-attachment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 92 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/army-list/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/army-list/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 92-01-01 | 01 | 1 | LDR-01 | — | N/A | unit | `pnpm test -- tests/army-list/leaderAttachment` | ❌ W0 | ⬜ pending |
| 92-01-02 | 01 | 1 | LDR-01 | — | N/A | unit | `pnpm test -- tests/army-list/leaderAttachment` | ❌ W0 | ⬜ pending |
| 92-02-01 | 02 | 2 | LDR-02 | — | N/A | unit | `pnpm test -- tests/army-list/leaderAttachment` | ❌ W0 | ⬜ pending |
| 92-02-02 | 02 | 2 | LDR-02 | — | N/A | unit | `pnpm test -- tests/army-list/leaderAttachment` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/army-list/leaderAttachment.test.ts` — stubs for LDR-01, LDR-02
- [ ] Test mocks for `getLeaderTargetsByFaction`, `setLeaderAttachment`, `clearLeaderAttachment`

*Existing infrastructure covers framework and shared fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual grouping renders correctly (indent + left border) | LDR-02 | CSS visual layout not testable via jsdom | Open army list with attached leader, verify indent and border accent appear |
| Leader row reorders to appear after target | LDR-02 | DOM order testable but visual position depends on CSS | Verify leader row visually appears immediately below target unit |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
