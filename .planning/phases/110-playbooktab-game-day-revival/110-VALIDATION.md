---
phase: 110
slug: playbooktab-game-day-revival
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-01
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
| 110-01-01 | 01 | 1 | INT-02 | unit | `pnpm test -- tests/units/WeaponTable.test.tsx` | ⬜ pending |
| 110-01-02 | 01 | 1 | INT-02 | unit | `pnpm test -- tests/game-day/UnitAbilityCard.test.tsx` | ⬜ pending |
| 110-02-01 | 02 | 1 | INT-03 | unit | `pnpm test -- tests/game-day/gameDayStore.test.ts` | ⬜ pending |
| 110-03-01 | 03 | 2 | INT-04 | unit | `pnpm test -- tests/collection/computeUnitWarnings.test.ts` | ⬜ pending |
| 110-01-03 | 01 | 1 | INT-01 | manual | PlaybookTab visual verification | ⬜ pending |

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
