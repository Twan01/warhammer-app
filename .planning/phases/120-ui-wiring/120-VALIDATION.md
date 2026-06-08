---
phase: 120
slug: ui-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-08
---

# Phase 120 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 120-01-01 | 01 | 1 | STR-03, STR-04, DET-03, DET-04 | integration | `pnpm test` | ⬜ pending |
| 120-01-02 | 01 | 1 | ENH-02, ENH-03 | integration | `pnpm test` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or fixture setup needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Game Day shows real stratagems grouped by phase | STR-03 | Visual layout verification | Open Game Day with an army list that has a detachment selected; verify stratagems appear grouped by battle phase |
| Rules Hub stratagems tab search/filter | STR-04 | Interactive UI verification | Navigate to Rules Hub > Stratagems tab; select a faction; verify search and detachment filter work |
| Enhancement picker shows descriptions + points | ENH-02, ENH-03 | Visual + interaction verification | Open army list > add enhancement; verify description HTML renders and points badge shows |
| Detachment picker shows real names | DET-03 | Visual verification | Open army list detail; verify detachment picker combobox lists real detachment names |
| PlaybookTab detachment abilities | DET-04 | Visual verification | Open a unit's PlaybookTab; verify "Detachment Abilities" section shows real ability text |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
