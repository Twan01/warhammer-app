---
phase: 59
slug: session-section-cascade
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-12
---

# Phase 59 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/painting/logSessionSheet.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/logSessionSheet.test.tsx`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 59-01-01 | 01 | 1 | SESS-01 | — | N/A | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ | ⬜ pending |
| 59-01-02 | 01 | 1 | SESS-02 | — | N/A | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ | ⬜ pending |
| 59-01-03 | 01 | 1 | SESS-03, SESS-04 | — | N/A | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ | ⬜ pending |
| 59-01-04 | 01 | 1 | SESS-05 | — | N/A | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ | ⬜ pending |
| 59-02-01 | 02 | 1 | SESS-01..05 | — | N/A | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add `useRecipeSections` mock to `tests/painting/logSessionSheet.test.tsx`

*Existing infrastructure covers most phase requirements — only the new hook mock is needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Section selector appears between recipe and step in the form | SESS-01 | Visual layout verification | Open LogSessionSheet, select a recipe with 2+ sections, verify section selector renders in correct position |
| Cascade reset clears visually | SESS-03, SESS-04 | UI state transition | Change recipe → verify section and step selectors reset to placeholder |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
