---
phase: 54-army-lists-2-0-detachment-selection
verified: 2026-05-11T09:15:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 54: Army Lists 2.0 — Detachment Selection Verification Report

**Phase Goal:** Users can select a detachment for each army list and immediately see the detachment's ability and its filtered stratagems in the army list detail — closing the most-requested gap in the current army list builder
**Verified:** 2026-05-11T09:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can select a detachment via a searchable Combobox scoped to faction | VERIFIED | `DetachmentPicker.tsx` — Popover+Command pattern, `role="combobox"`, populates from `useDetachmentsByFaction(factionWahapediaId)` |
| 2 | Selecting a detachment persists detachment_id and detachment_name to hobbyforge.db | VERIFIED | `handleDetachmentSelect` in `ArmyListDetailSheet.tsx` calls `updateArmyList.mutate({ id, detachment_id, detachment_name })`; `updateArmyList` in DB queries writes both columns; migration 019 adds both columns to `army_lists` |
| 3 | User can clear the selected detachment | VERIFIED | `handleDetachmentClear` calls `clearDetachment.mutate(list.id)`; `clearArmyListDetachment` in DB sets both columns to NULL (bypasses COALESCE correctly) |
| 4 | Picker is disabled with helper text when no faction is set | VERIFIED | `disabled={!faction}` passed to picker; `DetachmentPicker` returns disabled button with "Select a faction first" text when `disabled=true` |
| 5 | User sees stale-data warning when rules data is older than 30 days | VERIFIED | `StaleDataBanner` uses inline `ageDays > 30` check (not 14-day `getSyncFreshness`); renders amber alert with correct text; wired in `ArmyListDetailSheet` via `syncMeta?.last_sync_at` |
| 6 | No stale-data warning appears when data is 30 days old or less | VERIFIED | `isDataStale` returns false when `ageDays <= 30`; component returns `null`; confirmed by 2 test cases |
| 7 | User can see the detachment ability displayed inline after selecting a detachment | VERIFIED | `DetachmentRulesSection` renders ability name + description in non-collapsible `<div>` cards under "Detachment Ability" header; wired in sheet with `detachmentId={list.detachment_id}` |
| 8 | User can see stratagems filtered to the selected detachment | VERIFIED | `DetachmentRulesSection` maps `useStratagemsByDetachment(detachmentId)` result to `<StratagemCard>` instances reused from rules-hub; "Stratagems (N)" header shows count |
| 9 | Empty state shown when no detachment selected | VERIFIED | `DetachmentRulesSection` returns "Select a detachment to see its rules" when `!detachmentId` |
| 10 | User can see a Reminders section with is_reminder=1 favorites when any exist | VERIFIED | `RemindersSection` filters `useRulesFavorites()` to `f.is_reminder === 1`; renders Star header + reminder rows with rule_type badges |
| 11 | Reminders section hidden when no reminders exist | VERIFIED | `RemindersSection` returns `null` when `reminders.length === 0` |

**Score:** 11/11 truths verified

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/army-lists/DetachmentPicker.tsx` | Combobox for detachment selection | VERIFIED | 111 lines; exports `DetachmentPicker`; uses Popover+Command; imports `useDetachmentsByFaction`; has `role="combobox"`, "Select a faction first", "Select detachment...", `onClear`, clear X button |
| `src/features/army-lists/StaleDataBanner.tsx` | Amber warning for stale rules | VERIFIED | 24 lines; exports `StaleDataBanner`; `ageDays > 30` threshold; "Rules data is over 30 days old" message; no `getSyncFreshness` import |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | Sheet with picker and banner wired | VERIFIED | Contains all 4 new imports, 3 new hooks, 2 new handlers, `<DetachmentPicker` + `<StaleDataBanner` JSX block between summary bar and units toolbar |
| `tests/army-list/DetachmentPicker.test.tsx` | Unit tests for DetachmentPicker | VERIFIED | 4 tests covering placeholder, disabled state, valueName display, clear button |
| `tests/army-list/StaleDataBanner.test.tsx` | Unit tests for StaleDataBanner | VERIFIED | 5 tests covering null/undefined, >30 days, <30 days, exactly 30 days |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/army-lists/DetachmentRulesSection.tsx` | Detachment ability + stratagems list | VERIFIED | 75 lines; exports `DetachmentRulesSection`; calls `useDetachmentAbilitiesByDetachment` + `useStratagemsByDetachment`; imports `StratagemCard` from `@/features/rules-hub/StratagemCard`; all empty/loading states present |
| `src/features/army-lists/RemindersSection.tsx` | Favorited rules reminders | VERIFIED | 40 lines; exports `RemindersSection`; uses `useRulesFavorites`; filters `is_reminder === 1`; `return null` for empty; `RULE_TYPE_LABELS` with all 3 label strings; Star icon + Badge |
| `tests/army-list/DetachmentRulesSection.test.tsx` | Unit tests for DetachmentRulesSection | VERIFIED | 5 tests covering null state, ability inline display, stratagem cards, no-data state, loading skeletons |
| `tests/army-list/RemindersSection.test.tsx` | Unit tests for RemindersSection | VERIFIED | 4 tests covering null return, Star header, badge labels, is_reminder=0 filtering |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DetachmentPicker.tsx` | `useDetachmentsByFaction` | import from `@/hooks/useRulesExtended` | WIRED | Line 14: `import { useDetachmentsByFaction } from "@/hooks/useRulesExtended"` — called at line 34 |
| `ArmyListDetailSheet.tsx` | `DetachmentPicker` | import + render | WIRED | Line 30 import; line 153 `<DetachmentPicker` in JSX |
| `ArmyListDetailSheet.tsx` | `useClearArmyListDetachment` | import from `@/hooks/useArmyLists` | WIRED | Line 23 import; line 56 `const clearDetachment = useClearArmyListDetachment()`; line 117 `clearDetachment.mutate(list.id)` |
| `StaleDataBanner.tsx` | `useRulesSyncMeta` | 30-day threshold on last_sync_at | WIRED | Banner is presentational; sheet calls `useRulesSyncMeta()` at line 57 and passes `syncMeta?.last_sync_at` to banner at line 162 |

### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DetachmentRulesSection.tsx` | `StratagemCard` | import from `@/features/rules-hub/StratagemCard` | WIRED | Line 6: `import { StratagemCard } from "@/features/rules-hub/StratagemCard"` — used at line 69 |
| `DetachmentRulesSection.tsx` | `useDetachmentAbilitiesByDetachment` | import from `@/hooks/useRulesExtended` | WIRED | Lines 3-5 import; line 13 hook call |
| `RemindersSection.tsx` | `useRulesFavorites` | import from `@/hooks/useRulesFavorites`, filtered to `is_reminder === 1` | WIRED | Line 3 import; line 12 hook call; line 13 `filter((f) => f.is_reminder === 1)` |
| `ArmyListDetailSheet.tsx` | `DetachmentRulesSection` | render below StaleDataBanner | WIRED | Line 32 import; line 165 `<DetachmentRulesSection detachmentId={list.detachment_id} />` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ARMY-01 | 54-01 | User can select a detachment for an army list | SATISFIED | `DetachmentPicker` + `handleDetachmentSelect` + `updateArmyList` + DB `detachment_id` column |
| ARMY-02 | 54-02 | User can view the selected detachment's ability in the army list detail | SATISFIED | `DetachmentRulesSection` renders abilities inline from `useDetachmentAbilitiesByDetachment` |
| ARMY-03 | 54-02 | User can view relevant stratagems for the selected detachment | SATISFIED | `DetachmentRulesSection` renders `StratagemCard` per stratagem from `useStratagemsByDetachment` |
| ARMY-04 | 54-01 | User sees a stale-data warning when rules data is older than 30 days | SATISFIED | `StaleDataBanner` with `ageDays > 30` threshold wired into sheet |
| ARMY-05 | 54-02 | User can view list-level rules reminders (user-marked favorites from Playbook) | SATISFIED | `RemindersSection` filters `useRulesFavorites()` to `is_reminder === 1` and renders with badges |

All 5 required IDs satisfied. No orphaned requirements.

---

## Anti-Patterns Found

None detected. Scanned all 4 new components and updated `ArmyListDetailSheet.tsx`:

- No TODO/FIXME/PLACEHOLDER comments
- No `return null` stubs (only intentional conditional nulls — `StaleDataBanner` when not stale, `RemindersSection` when no reminders)
- No empty handlers — all `onChange`/`onClear`/`onSubmit` handlers call real mutations
- No static returns from API-like functions
- `clearDetachment.mutate(list.id)` correctly avoids the COALESCE NULL passthrough in `updateArmyList`

---

## Test Suite Results

Full army-list test suite: **149 test files passed, 0 failed** (1184 tests passed, 6 skipped, 12 todo).

Specific phase 54 tests:
- `tests/army-list/DetachmentPicker.test.tsx` — 4 tests PASSED
- `tests/army-list/StaleDataBanner.test.tsx` — 5 tests PASSED
- `tests/army-list/DetachmentRulesSection.test.tsx` — 5 tests PASSED
- `tests/army-list/RemindersSection.test.tsx` — 4 tests PASSED

---

## Human Verification Required

### 1. Detachment Combobox Interaction

**Test:** Open an army list with a faction set. Click the Detachment picker. Type part of a detachment name. Select one.
**Expected:** Picker updates to show the detachment name; data persists on sheet reopen.
**Why human:** Popover+Command open/close interaction, keyboard navigation, and search filtering require a running Tauri window.

### 2. Detachment Clear Flow

**Test:** With a detachment selected, click the X clear button.
**Expected:** Picker reverts to "Select detachment..."; rules sections below show "Select a detachment to see its rules".
**Why human:** Requires live mutation + React Query cache invalidation observable in UI.

### 3. DetachmentRulesSection Layout in Sheet

**Test:** Select a detachment that has both abilities and stratagems. Scroll the sheet.
**Expected:** Detachment Ability section appears first (non-collapsible), then Stratagems section with count, then Reminders (if any), then separator, then Units table.
**Why human:** Visual layout order and scroll behavior cannot be verified from static code.

### 4. Stale-Data Banner Visibility

**Test:** Sync rules and verify banner is absent. Manually set `last_sync_at` to 31 days ago in rules.db and reopen a list.
**Expected:** Amber banner with "Rules data is over 30 days old. Sync from the Rules Hub for the latest." appears.
**Why human:** Requires DB manipulation and live rendering.

---

## Gaps Summary

None. All 11 must-have truths verified, all 5 requirements satisfied, all key links wired, all tests passing. Phase goal fully achieved.

---

_Verified: 2026-05-11T09:15:00Z_
_Verifier: Claude (gsd-verifier)_
