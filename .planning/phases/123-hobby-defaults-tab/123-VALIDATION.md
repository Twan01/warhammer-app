---
phase: 123
slug: hobby-defaults-tab
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
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
| 123-01-01 | 01 | 1 | HOB-01 | — | N/A | unit | `pnpm test -- tests/settings/stageLabel.test.ts` | ❌ W0 | ⬜ pending |
| 123-01-02 | 01 | 1 | HOB-01 | — | N/A | component | `pnpm test -- tests/settings/HobbyDefaultsSection.test.tsx` | ❌ W0 | ⬜ pending |
| 123-01-03 | 01 | 1 | HOB-02 | — | N/A | component | `pnpm test -- tests/settings/HobbyDefaultsSection.test.tsx` | ❌ W0 | ⬜ pending |
| 123-01-04 | 01 | 1 | HOB-02 | — | N/A | unit | `pnpm test -- tests/settings/stageLabel.test.ts` | ❌ W0 | ⬜ pending |
| 123-01-05 | 01 | 1 | HOB-03 | — | N/A | component | `pnpm test -- tests/settings/HobbyDefaultsSection.test.tsx` | ❌ W0 | ⬜ pending |
| 123-01-06 | 01 | 1 | HOB-03 | — | N/A | component | `pnpm test -- tests/battle-log/BattleLogSheet.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/settings/stageLabel.test.ts` — stubs for HOB-01 (getBucketLabel utility), HOB-02 (getDefaultChecklist utility)
- [ ] `tests/settings/HobbyDefaultsSection.test.tsx` — component tests for all 3 settings sections
- [ ] `tests/battle-log/BattleLogSheet.test.tsx` — verify mission pre-fill behavior (check if file already exists)

*Existing infrastructure covers framework installation.*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
