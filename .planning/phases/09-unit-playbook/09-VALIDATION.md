---
phase: 9
slug: unit-playbook
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + React Testing Library + jsdom |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npm test -- tests/collection/PlaybookTab.test.tsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds (quick), ~30 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- tests/collection/PlaybookTab.test.tsx`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-W0-01 | 01 | 0 | STRAT-01..05 | unit | `npm test -- tests/collection/PlaybookTab.test.tsx` | ❌ W0 | ⬜ pending |
| 9-01-01 | 01 | 1 | STRAT-01 | component | `npm test -- tests/collection/PlaybookTab.test.tsx` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | STRAT-02 | component | `npm test -- tests/collection/PlaybookTab.test.tsx` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | STRAT-03 | component | `npm test -- tests/collection/PlaybookTab.test.tsx` | ❌ W0 | ⬜ pending |
| 9-01-04 | 01 | 1 | STRAT-04 | component | `npm test -- tests/collection/PlaybookTab.test.tsx` | ❌ W0 | ⬜ pending |
| 9-01-05 | 01 | 1 | STRAT-05 | component | `npm test -- tests/collection/PlaybookTab.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/collection/PlaybookTab.test.tsx` — stubs for STRAT-01 through STRAT-05 (component-layer tests)

*Note: `tests/foundation/strategyNoteQueries.test.ts` already covers the query layer (Phase 6 deliverable). Phase 9 tests cover the component layer only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tab switching works without closing/reopening sheet | STRAT-01 | Visual/interaction verification | Open unit sheet → click Playbook tab → confirm Details content replaced → click Details → confirm switch |
| Stats suffix display (", +) at render time | STRAT-02 | Rendered output verification | Set M=6, T=4, Sv=3, W=2, Ld=7, OC=1 → verify display shows 6", 4, 3+, 2, 7+, 1+ |
| SheetFooter Edit/Delete visible on both tabs | STRAT-01 | Layout verification | Switch between Details and Playbook tabs → confirm Edit Unit and Delete Unit buttons remain visible in footer |
| Escape key cancels stats edit mode | STRAT-02 | Keyboard interaction | Enter stats edit mode → change values → press Escape → confirm cells revert to display mode |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
