---
phase: 53
slug: rules-data-hub-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 53 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `pnpm test -- tests/rules-hub/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/rules-hub/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 53-01-01 | 01 | 1 | RULES-01 | unit | `pnpm test -- tests/rules-hub/SyncStatusCard.test.tsx` | ❌ W0 | ⬜ pending |
| 53-01-02 | 01 | 1 | RULES-02 | unit | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` | ❌ W0 | ⬜ pending |
| 53-01-03 | 01 | 1 | RULES-03 | unit | `pnpm test -- tests/rules-hub/SyncStatusCard.test.tsx` | ❌ W0 | ⬜ pending |
| 53-01-04 | 01 | 1 | RULES-04 | unit | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` | ❌ W0 | ⬜ pending |
| 53-02-01 | 02 | 2 | RULES-05 | unit | `pnpm test -- tests/rules-hub/applyRulesHubFilters.test.ts` | ❌ W0 | ⬜ pending |
| 53-03-01 | 03 | 3 | RULES-06 | unit | `pnpm test -- tests/rules-hub/DetachmentCard.test.tsx` | ❌ W0 | ⬜ pending |
| 53-03-02 | 03 | 3 | RULES-07 | unit | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` | ❌ W0 | ⬜ pending |
| 53-02-02 | 02 | 2 | RULES-08 | unit | `pnpm test -- tests/rules-hub/applyRulesHubFilters.test.ts` | ❌ W0 | ⬜ pending |
| 53-03-03 | 03 | 3 | RULES-09 | unit | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/rules-hub/RulesHubPage.test.tsx` — stubs for RULES-02, RULES-04, RULES-07, RULES-09
- [ ] `tests/rules-hub/SyncStatusCard.test.tsx` — stubs for RULES-01, RULES-03
- [ ] `tests/rules-hub/applyRulesHubFilters.test.ts` — stubs for RULES-05, RULES-08 (pure filter function)
- [ ] `tests/rules-hub/DetachmentCard.test.tsx` — stubs for RULES-06

*Existing infrastructure covers framework and setup — only test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual freshness badge color | RULES-01 | CSS class → color mapping not unit-testable | Verify green/yellow/red dot in browser |
| Tab navigation UX | RULES-05/06/07 | Interaction flow requires visual verification | Switch tabs, verify correct content loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
