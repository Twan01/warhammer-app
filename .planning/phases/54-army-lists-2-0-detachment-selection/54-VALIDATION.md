---
phase: 54
slug: army-lists-2-0-detachment-selection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 54 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 54-01-01 | 01 | 1 | ARMY-01 | unit | `pnpm test -- tests/army-list/DetachmentPicker.test.tsx` | ❌ W0 | ⬜ pending |
| 54-01-02 | 01 | 1 | ARMY-01 | unit | `pnpm test -- tests/army-list/ArmyListDetailSheet.test.tsx` | ❌ W0 | ⬜ pending |
| 54-02-01 | 02 | 1 | ARMY-02 | unit | `pnpm test -- tests/army-list/DetachmentRulesSection.test.tsx` | ❌ W0 | ⬜ pending |
| 54-02-02 | 02 | 1 | ARMY-03 | unit | `pnpm test -- tests/army-list/DetachmentRulesSection.test.tsx` | ❌ W0 | ⬜ pending |
| 54-02-03 | 02 | 1 | ARMY-04 | unit | `pnpm test -- tests/army-list/StaleDataBanner.test.tsx` | ❌ W0 | ⬜ pending |
| 54-03-01 | 03 | 1 | ARMY-05 | unit | `pnpm test -- tests/army-list/RemindersSection.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/army-list/DetachmentPicker.test.tsx` — stubs for ARMY-01 (picker UX, disabled state, selection persistence)
- [ ] `tests/army-list/DetachmentRulesSection.test.tsx` — stubs for ARMY-02, ARMY-03 (ability display, stratagems list)
- [ ] `tests/army-list/StaleDataBanner.test.tsx` — stubs for ARMY-04 (30-day threshold, null sync date, fresh data)
- [ ] `tests/army-list/RemindersSection.test.tsx` — stubs for ARMY-05 (reminder display, hidden when empty)

*Existing test files `tests/army-list/ArmyListsPage.test.tsx` and `tests/army-list/UnitDeleteDialog.test.tsx` need no changes.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Combobox search/filter UX | ARMY-01 | Interactive dropdown behavior in jsdom unreliable | Open ArmyListDetailSheet with faction set, verify Combobox popover opens with faction detachments |
| Stale-data banner visual styling | ARMY-04 | Visual amber styling check | Verify banner appears with correct yellow/amber coloring |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
