---
phase: 54
slug: army-lists-2-0-detachment-selection
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
validated: 2026-05-11
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
| **Estimated runtime** | ~6 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/army-list/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 6 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 54-01-01 | 01 | 1 | ARMY-01 | unit | `pnpm test -- tests/army-list/DetachmentPicker.test.tsx` | ✅ | ✅ green |
| 54-01-02 | 01 | 1 | ARMY-01 | unit | `pnpm test -- tests/army-list/ArmyListsPage.test.tsx` | ✅ | ✅ green |
| 54-02-01 | 02 | 1 | ARMY-02 | unit | `pnpm test -- tests/army-list/DetachmentRulesSection.test.tsx` | ✅ | ✅ green |
| 54-02-02 | 02 | 1 | ARMY-03 | unit | `pnpm test -- tests/army-list/DetachmentRulesSection.test.tsx` | ✅ | ✅ green |
| 54-02-03 | 02 | 1 | ARMY-04 | unit | `pnpm test -- tests/army-list/StaleDataBanner.test.tsx` | ✅ | ✅ green |
| 54-03-01 | 02 | 1 | ARMY-05 | unit | `pnpm test -- tests/army-list/RemindersSection.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Additional Test Coverage

| Test File | Tests | Covers |
|-----------|-------|--------|
| `tests/army-list/clearArmyListDetachment.test.ts` | 3 | ARMY-01 (clear mutation SQL correctness) |
| `tests/army-list/UnitDeleteDialog.test.tsx` | 2 | ARMY-05 (army list membership warnings) |
| `tests/army-list/armyListQueries.test.ts` | 2 | ARMY-05 (getArmyListsByUnitId query) |
| `tests/army-list/deltaPreview.test.ts` | 3 | Points delta computation |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Combobox search/filter UX | ARMY-01 | Interactive dropdown behavior in jsdom unreliable | Open ArmyListDetailSheet with faction set, verify Combobox popover opens with faction detachments |
| Stale-data banner visual styling | ARMY-04 | Visual amber styling check | Verify banner appears with correct yellow/amber coloring |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s (actual: ~6s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-05-11

---

## Validation Audit 2026-05-11

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests | 32 |
| Test files | 9 |
| All green | yes |
