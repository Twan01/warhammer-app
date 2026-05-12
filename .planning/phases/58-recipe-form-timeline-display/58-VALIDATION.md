---
phase: 58
slug: recipe-form-timeline-display
status: complete
nyquist_compliant: true
wave_0_complete: true
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
| 58-01-01 | 01 | 1 | RUI-01 | — | N/A | component | `pnpm test -- tests/painting/recipeSectionCard.test.tsx` | ✅ | ✅ green |
| 58-01-02 | 01 | 1 | RUI-02 | — | N/A | component | `pnpm test -- tests/painting/recipeSectionCard.test.tsx` | ✅ | ✅ green |
| 58-02-01 | 02 | 1 | RUI-03 | — | N/A | component | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | ✅ | ✅ green |
| 58-02-02 | 02 | 1 | RUI-04 | — | N/A | component | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | ✅ | ✅ green |

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-12

---

## Validation Audit 2026-05-12

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 4 requirements (RUI-01 through RUI-04) have automated test coverage across 2 test files. 45/45 tests pass in 3.2s.
