---
phase: 55
slug: playbook-enhancements-favorites-and-notes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 55 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | vite.config.ts (vitest section) |
| **Quick run command** | `pnpm test -- tests/rules-hub/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/rules-hub/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 55-01-01 | 01 | 1 | PLAY-01 | unit | `pnpm test -- tests/rules-hub/RuleAnnotationControls.test.tsx` | ❌ W0 | ⬜ pending |
| 55-01-02 | 01 | 1 | PLAY-02 | unit | `pnpm test -- tests/rules-hub/RuleAnnotationControls.test.tsx` | ❌ W0 | ⬜ pending |
| 55-01-03 | 01 | 1 | PLAY-03 | unit | `pnpm test -- tests/rules-hub/RuleNoteEditor.test.tsx` | ❌ W0 | ⬜ pending |
| 55-01-04 | 01 | 1 | PLAY-01 | unit | `pnpm test -- tests/rules-hub/StratagemCard.test.tsx` | ❌ W0 | ⬜ pending |
| 55-01-05 | 01 | 1 | PLAY-04 | unit | `pnpm test -- tests/rules-hub/StratagemCard.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/rules-hub/RuleAnnotationControls.test.tsx` — stubs for PLAY-01, PLAY-02
- [ ] `tests/rules-hub/RuleNoteEditor.test.tsx` — stubs for PLAY-03
- [ ] `tests/rules-hub/StratagemCard.test.tsx` — annotation prop coverage for PLAY-01, PLAY-04

*(SharedAbilityCard.test.tsx and DetachmentCard.test.tsx may need annotation prop coverage added)*

*Existing infrastructure covers framework installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual distinction (border + bg tint) renders correctly in dark theme | PLAY-04 | CSS visual appearance | Open PlaybookTab and RulesHubPage, favorite a rule, verify left border and background tint visible |
| Debounced auto-save fires after typing stops | PLAY-03 | Timing-dependent behavior | Type in note textarea, wait 500ms, verify toast or DB write occurs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
