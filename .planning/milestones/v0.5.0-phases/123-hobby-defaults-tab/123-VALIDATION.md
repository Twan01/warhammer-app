---
phase: 123
slug: hobby-defaults-tab
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-10
updated: 2026-06-11
---

# Phase 123 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + React Testing Library 16.3.2 |
| **Config file** | `vite.config.ts` (vitest inline config) |
| **Quick run command** | `pnpm test -- tests/settings/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/settings/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 123-01-01 | 01 | 1 | HOB-01 | — | N/A | unit | `pnpm test -- tests/settings/stageLabel.test.ts` | yes | green |
| 123-01-02 | 01 | 1 | HOB-01 | — | N/A | component | `pnpm test -- tests/settings/HobbyDefaultsSection.test.tsx` | yes | green |
| 123-01-03 | 01 | 1 | HOB-02 | — | N/A | component | `pnpm test -- tests/settings/HobbyDefaultsSection.test.tsx` | yes | green |
| 123-01-04 | 01 | 1 | HOB-02 | — | N/A | unit | `pnpm test -- tests/settings/HobbyPipelineIntegration.test.tsx` | yes | green |
| 123-01-05 | 01 | 1 | HOB-03 | — | N/A | component | `pnpm test -- tests/settings/HobbyDefaultsSection.test.tsx` | yes | green |
| 123-01-06 | 01 | 1 | HOB-03 | — | N/A | integration | `pnpm test -- tests/settings/HobbyPipelineIntegration.test.tsx` | yes | green |
| 123-GAP-01 | — | — | HOB-01 | — | parsePipelineLabels utility | unit | `pnpm test -- tests/settings/HobbyDefaultsGaps.test.tsx` | yes | green |
| 123-GAP-02 | — | — | HOB-01 | — | Label reset deletes key; trim on save | component | `pnpm test -- tests/settings/HobbyDefaultsGaps.test.tsx` | yes | green |
| 123-GAP-03 | — | — | HOB-01 | — | Inputs show existing custom labels | component | `pnpm test -- tests/settings/HobbyDefaultsGaps.test.tsx` | yes | green |
| 123-GAP-04 | — | — | HOB-02 | — | Enter key submits new checklist item | component | `pnpm test -- tests/settings/HobbyDefaultsGaps.test.tsx` | yes | green |
| 123-GAP-05 | — | — | HOB-02 | — | Add Item disabled on empty/whitespace | component | `pnpm test -- tests/settings/HobbyDefaultsGaps.test.tsx` | yes | green |
| 123-GAP-06 | — | — | HOB-02 | — | Custom checklist items from settings | component | `pnpm test -- tests/settings/HobbyDefaultsGaps.test.tsx` | yes | green |
| 123-GAP-07 | — | — | HOB-03 | — | Mission format shows saved value | component | `pnpm test -- tests/settings/HobbyDefaultsGaps.test.tsx` | yes | green |
| 123-GAP-08 | — | — | HOB-03 | — | Mission format trims whitespace on save | component | `pnpm test -- tests/settings/HobbyDefaultsGaps.test.tsx` | yes | green |
| 123-GAP-09 | — | — | HOB-02 | — | Empty text add-item does not mutate | component | `pnpm test -- tests/settings/HobbyDefaultsGaps.test.tsx` | yes | green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test File Summary

| # | File | Tests | Type | Command |
|---|------|-------|------|---------|
| 1 | `tests/settings/stageLabel.test.ts` | 9 | unit | `pnpm test -- tests/settings/stageLabel.test.ts` |
| 2 | `tests/settings/HobbyDefaultsSection.test.tsx` | 9 | component | `pnpm test -- tests/settings/HobbyDefaultsSection.test.tsx` |
| 3 | `tests/settings/HobbyPipelineIntegration.test.tsx` | 7 | integration | `pnpm test -- tests/settings/HobbyPipelineIntegration.test.tsx` |
| 4 | `tests/settings/HobbyDefaultsGaps.test.tsx` | 15 | unit+component | `pnpm test -- tests/settings/HobbyDefaultsGaps.test.tsx` |

**Total: 40 tests across 4 files (25 existing + 15 new gap-fill)**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Custom pipeline labels appear on Dashboard | HOB-01 | Visual verification across multiple routes | 1. Set custom label in Settings 2. Navigate to Dashboard 3. Verify HobbyPipeline shows custom label |
| Drag-to-reorder checklist items | HOB-02 | DnD interaction not testable in jsdom | 1. Open Settings > Hobby Defaults 2. Drag checklist item up/down 3. Verify new order persists |
| New Game Day session uses custom checklist | HOB-02 | Cross-feature integration | 1. Set custom checklist in Settings 2. Start new Game Day session 3. Verify checklist shows custom items |
| New battle log pre-fills mission format | HOB-03 | Cross-feature integration | 1. Set default mission format in Settings 2. Create new battle log 3. Verify mission field pre-filled |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete — 2026-06-11
