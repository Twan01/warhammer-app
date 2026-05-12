---
phase: 58
slug: recipe-form-timeline-display
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-12
---

# Phase 58 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest config inline) |
| **Quick run command** | `pnpm test -- tests/painting/recipeSectionCard.test.tsx tests/painting/sectionedTimeline.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/recipeSectionCard.test.tsx tests/painting/sectionedTimeline.test.tsx`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 58-01-01 | 01 | 1 | RUI-01 | — | N/A | component | `pnpm test -- tests/painting/recipeSectionCard.test.tsx` | ✅ | ⬜ pending |
| 58-01-02 | 01 | 1 | RUI-02 | — | N/A | component | `pnpm test -- tests/painting/recipeSectionCard.test.tsx` | ✅ | ⬜ pending |
| 58-02-01 | 02 | 1 | RUI-03 | — | N/A | component | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | ✅ | ⬜ pending |
| 58-02-02 | 02 | 1 | RUI-04 | — | N/A | component | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Both test files exist and cover the components being modified.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual layout of 2×2 grid in collapsible | RUI-01 | CSS layout rendering | Open recipe form, expand Workflow section, verify grid layout |
| Dot-separated string readability | RUI-04 | Visual spacing and typography | Open timeline for a recipe with all metadata set, verify format |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
