---
phase: 110
slug: playbooktab-game-day-revival
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-01
audited: 2026-06-01
---

# Phase 110 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/units` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/units`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 110-01-01 | 01 | 1 | INT-02 | unit | `pnpm test -- tests/units/WeaponTable.test.tsx` | ✅ green |
| 110-01-02 | 01 | 1 | INT-02 | unit | `pnpm test -- tests/game-day/UnitAbilityCard.test.tsx` | ✅ green |
| 110-02-01 | 02 | 1 | INT-03 | unit | `pnpm test -- tests/game-day/gameDayStore.test.ts` | ✅ green |
| 110-03-01 | 03 | 2 | INT-04 | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ✅ green |
| 110-01-03 | 01 | 1 | INT-01 | manual | PlaybookTab visual verification | ✅ green |
| 110-02-02 | 02 | 1 | INT-01 | unit | `npx vitest run tests/collection/PlaybookTab.test.tsx -t "INT-01"` | ✅ green |
| 110-02-03 | 02 | 1 | INT-04 | unit | `npx vitest run tests/army-lists/ArmyListSummaryBar.test.tsx -t "INT-04"` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Vitest + RTL already configured with jsdom environment and Tauri mocks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PlaybookTab shows canonical stats for linked unit | INT-01 | Visual rendering in Tauri window | Link a unit via DatasheetPicker, verify M/T/Sv/W/Ld/OC, weapons, abilities render |
| Weapon profiles visible in Game Day card | INT-02 | Collapsible interaction in Tauri window | Open Game Day, expand a unit card, verify weapons section appears |
| OPG toggles persist across re-import | INT-03 | Requires re-import action | Toggle an OPG ability, re-import unit_database.json, verify toggle state persists |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-06-01

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated | 0 |

**Tests generated:**
- `tests/units/WeaponTable.test.tsx` — 8 tests (weapon rendering, stat columns, empty state, keywords)
- `tests/game-day/UnitAbilityCard.test.tsx` — 11 tests (weapons section, collapsed default, OPG key format)
- `tests/collection/PlaybookTab.test.tsx` — 3 tests added (INT-01 canonical stat fallback, D-02 user value preservation, no-link placeholder)
- `tests/army-lists/ArmyListSummaryBar.test.tsx` — 4 tests added (INT-04 role rendering, count accuracy, null exclusion, descending sort)
