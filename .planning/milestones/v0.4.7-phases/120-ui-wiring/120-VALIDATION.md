---
phase: 120
slug: ui-wiring
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-08
validated: 2026-06-09
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

| Task ID | Plan | Wave | Requirement | Test Type | Test File | Status |
|---------|------|------|-------------|-----------|-----------|--------|
| 120-01-01 | 01 | 1 | STR-03, STR-04 | integration | `tests/game-day/StratagemsByPhase.test.tsx`, `tests/rules-hub/applyRulesHubFilters.test.ts`, `tests/rules-hub/StratagemCard.test.tsx` | ✅ green |
| 120-01-02 | 01 | 1 | DET-03, DET-04 | integration | `tests/rules-hub/DetachmentCard.test.tsx` | ✅ green |
| 120-02-01 | 02 | 2 | STR-03 | component | `tests/game-day/StratagemsByPhase.test.tsx` | ✅ green |
| 120-02-01 | 02 | 2 | DET-03 | component | `tests/army-list/DetachmentPicker.test.tsx` | ✅ green |
| 120-02-02 | 02 | 2 | ENH-02, ENH-03 | component | `tests/army-list/enhancementPickerSheet.test.tsx` | ✅ green |
| 120-02-02 | 02 | 2 | DET-04 | component | `tests/units/PlaybookDetachmentAbilities.test.tsx` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or fixture setup needed.

---

## Requirement Coverage Summary

| Requirement | Description | Test Files | Status |
|-------------|-------------|------------|--------|
| STR-03 | StrategemsTab shows real stratagems grouped by phase | `StratagemsByPhase.test.tsx` (7 tests: phase grouping, normalization, empty states, loading) | COVERED |
| STR-04 | Rules Hub stratagems with search/filter | `applyRulesHubFilters.test.ts` (10 tests: UdbStratagem filters, cp_cost coercion), `StratagemCard.test.tsx` | COVERED |
| ENH-02 | Enhancement picker uses canonical cost | `enhancementPickerSheet.test.tsx` (11 tests: cost badge, "Free" label, detachment_id guards) | COVERED |
| ENH-03 | Enhancement picker shows HTML descriptions | `enhancementPickerSheet.test.tsx` (2 tests: HTML rendering, dangerouslySetInnerHTML verification) | COVERED |
| DET-03 | DetachmentPicker shows real detachment names | `DetachmentPicker.test.tsx` (9 tests: combobox rendering, selection, clear, guard states) | COVERED |
| DET-04 | PlaybookTab shows detachment abilities | `PlaybookDetachmentAbilities.test.tsx` (9 tests: grouping, collapsible, HTML descriptions, null guards) | COVERED |

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

## Validation Audit 2026-06-09

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated | 0 |

**Details:**
- `tests/game-day/StratagemsByPhase.test.tsx` — updated: mocks `@/hooks/useGameData`, uses `UdbStratagem` fixtures, tests phase normalization (7 tests)
- `tests/army-list/enhancementPickerSheet.test.tsx` — updated: mocks `useEnhancementsByDetachment` from `useGameData`, tests `cost` field, HTML descriptions, validation logic (13 tests)
- `tests/army-list/DetachmentPicker.test.tsx` — updated: mocks `useDetachmentsByFaction` from `useGameData`, tests combobox rendering and guard states (9 tests)
- `tests/units/PlaybookDetachmentAbilities.test.tsx` — created: tests `useDetachmentAbilities` hook, grouped rendering, collapsible behavior, null description guard (9 tests)

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete
