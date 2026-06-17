---
phase: 134-no-dead-ends
verified: 2026-06-17T00:00:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the Rules Hub for a faction that has detachment abilities (e.g. Space Marines). Click the Shared Abilities tab."
    expected: "Real ability names and descriptions appear — at least one SharedAbilityCard renders with a legend badge showing the detachment name."
    why_human: "Cannot render the live Tauri app or query the SQLite DB from the verifier. The code wiring is confirmed correct but actual data presence requires a running app."
  - test: "Open the Rules Hub for a faction that has no canonical abilities (if any). Click the Shared Abilities tab with an empty search box."
    expected: "The message 'No shared abilities for this faction in the canonical database.' appears — never a blank panel."
    why_human: "Requires knowing which factions have zero udb_detachment_abilities rows; only verifiable in the running app."
  - test: "Open a unit whose collection faction has no wahapedia_faction_id. Verify the 'Link unit' button is clickable."
    expected: "Clicking 'Link unit' opens the CollectionFactionLinkDialog (not a disabled/grey button)."
    why_human: "Cannot drive the Tauri UI from the verifier; dialog interaction requires a live app."
  - test: "In the CollectionFactionLinkDialog, select a canonical faction and click 'Link & open datasheets'."
    expected: "Toast 'Faction linked. Datasheets now available.' appears; DatasheetPicker opens scoped to the newly-mapped faction."
    why_human: "updateFaction.mutateAsync writes to SQLite — requires a running Tauri app."
  - test: "In the CollectionFactionLinkDialog, click 'Cancel — browse all instead'."
    expected: "DatasheetPicker opens in browse-all mode with the prompt 'Type at least 2 characters to search all datasheets.'; typing 2+ chars returns results."
    why_human: "Browse-all path requires useUdbSearch FTS5 against the live rules.db; not testable without the Tauri backend."
---

# Phase 134: No Dead Ends — Verification Report

**Phase Goal:** Every datasheet surface the user reaches leads somewhere real — no empty stub tabs, no permanent dead-end buttons.
**Verified:** 2026-06-17
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Opening the Shared Abilities tab for a faction with canonical abilities shows real ability names and descriptions | ✓ VERIFIED | `RulesHubPage.tsx` line 66: `useDetachmentAbilities(selectedFactionId ?? null)` → `rawAbilities.map(toRwAbility)` → `SharedAbilityCard` render at line 312. Real hook, real data path. |
| 2 | A faction with zero canonical abilities shows "No shared abilities for this faction in the canonical database." | ✓ VERIFIED | Lines 304-308: `filteredAbilities.length === 0` + `!searchText` branch renders that exact string. |
| 3 | A non-matching search shows "No shared abilities match your search." (distinct from the no-data message) | ✓ VERIFIED | Same branch, `searchText` truthy case at line 306 renders that exact string. |
| 4 | The `useSharedAbilitiesByFaction` stub no longer exists; build is green (no unused code) | ✓ VERIFIED | `grep useSharedAbilitiesByFaction src/` returns no matches. Strict TS build enforces no dead branches. |
| 5 | The "Link unit" / "Re-link unit" button is clickable even when the collection faction has no wahapedia_faction_id | ✓ VERIFIED | `PlaybookStats.tsx` lines 80-88: Button has only `onClick={onPickerOpen}` — no `disabled` prop of any kind. |
| 6 | Clicking Link unit on an unmapped faction opens CollectionFactionLinkDialog; confirming persists wahapedia_faction_id and opens scoped DatasheetPicker | ✓ VERIFIED | `PlaybookTab.tsx` lines 163-184: `handlePickerOpen()` routes to `setFactionLinkOpen(true)` when `!wahapediaFactionId`; `handleFactionLinkConfirm()` calls `updateFaction.mutateAsync({ id, wahapedia_faction_id })`, then `setPickerOpen(true)` + success toast. |
| 7 | Cancelling the dialog opens DatasheetPicker in browse-all mode | ✓ VERIFIED | `PlaybookTab.tsx` lines 336-339: `onOpenChange` sets `setPickerOpen(true)` on `!open`; `DatasheetPicker` receives `factionId={wahapediaFactionId ?? undefined}` — when null → undefined → isBrowseAll path. |
| 8 | In browse-all mode, `<2` chars shows "Type at least 2 characters to search all datasheets."; 2+ chars uses useUdbSearch | ✓ VERIFIED | `DatasheetPicker.tsx` lines 41-43, 88-91: `isBrowseAll = factionId === undefined`, `useUdbSearch(isBrowseAll ? search : "")`, exact prompt string at line 89. |
| 9 | Button copy is "Link unit" when unlinked and "Re-link unit" when linked | ✓ VERIFIED | `PlaybookStats.tsx` line 86: `{hasDatasheetLink ? "Re-link unit" : "Link unit"}`. |

**Score: 9/9 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/rules-hub/RulesHubPage.tsx` | Shared Abilities wired to `useDetachmentAbilities` via `toRwAbility` adapter | ✓ VERIFIED | Lines 20-41 (import + adapter), line 66 (hook call), lines 290-318 (tab content). Favorites/notes wiring at line 312 unchanged (`a.id + ':shared_ability'`). |
| `tests/rules-hub/RulesHubSharedAbilities.test.tsx` | 3 HON-03 test cases: real data, no-data, search-filtered | ✓ VERIFIED | File exists. Three `describe` blocks. Exact UI-SPEC strings asserted. Uses `useDetachmentAbilities` mock from `@/hooks/useGameData`. |
| `src/features/units/CollectionFactionLinkDialog.tsx` | Collection→UDB dialog; onConfirm receives STRING id; no `Number()` | ✓ VERIFIED | File exists (~84 lines). `onConfirm: (wahapediaFactionId: string) => void`. `handleConfirm` calls `onConfirm(selectedId)` directly — no `Number()` anywhere. |
| `src/features/units/PlaybookStats.tsx` | disabled gate removed; "Re-link unit" label | ✓ VERIFIED | `wahapediaFactionId` prop aliased to `_wahapediaFactionId` (noUnusedParameters compliance). Button has no `disabled` prop. Label conditional at line 86. |
| `src/features/units/PlaybookTab.tsx` | handlePickerOpen interceptor + factionLinkOpen state + updateFaction + browse-all | ✓ VERIFIED | Lines 93-95 (state + hooks), 163-184 (handlers), 334-344 (dialog JSX). |
| `src/features/units/DatasheetPicker.tsx` | `factionId === undefined` browse-all branch via `useUdbSearch` | ✓ VERIFIED | Lines 41-47: `isBrowseAll` flag, dual hooks, normalized `datasheets` array. 2-char prompt at line 89. |
| `tests/units/PlaybookStatsLinkUnit.test.tsx` | Button NOT disabled with null/undefined/valid id; "Re-link unit" copy | ✓ VERIFIED | File exists. 6 test cases including the 3 `not.toBeDisabled()` assertions and label assertions. |
| `tests/units/CollectionFactionLinkDialog.test.tsx` | STRING id assertion; confirm disabled until selection; cancel button present | ✓ VERIFIED | File exists. `typeof calledWith === 'string'` + `toBe("SM")`; `toBeDisabled()` with no selection. |
| `tests/units/DatasheetPicker.test.tsx` | 2-char prompt in browse-all; `useUdbSearch` engaged; scoped path unchanged | ✓ VERIFIED | File exists. 7 test cases. Exact prompt string asserted. `useUdbSearch` called check. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `RulesHubPage.tsx` | `useDetachmentAbilities` | `useDetachmentAbilities(selectedFactionId ?? null)` | ✓ WIRED | Line 20 import; line 66 call with correct `string \| null` signature. |
| `RulesHubPage toRwAbility` | `SharedAbilityCard` | `legend: a.detachment_name` mapping | ✓ WIRED | Line 38 in `toRwAbility`; line 312 `filteredAbilities.map()` renders `SharedAbilityCard`. |
| `PlaybookStats.tsx` | `onPickerOpen` | `onClick={onPickerOpen}` (NO disabled prop) | ✓ WIRED | Lines 80-88: button renders; no `disabled` attribute on button element. |
| `PlaybookTab.tsx` | `updateFaction.mutateAsync` | `handleFactionLinkConfirm` persists `wahapedia_faction_id` (string) | ✓ WIRED | Lines 171-184: `await updateFaction.mutateAsync({ id: localFaction.id, wahapedia_faction_id: wahapediaFactionId })`. String type confirmed via TypeScript. |
| `PlaybookTab.tsx` cancel path | `DatasheetPicker` browse-all | `onOpenChange(!open) → setPickerOpen(true)` with `factionId=undefined` | ✓ WIRED | Lines 336-339: `if (!open) setPickerOpen(true)`; DatasheetPicker at line 331 receives `factionId={wahapediaFactionId ?? undefined}` — null → undefined when unmapped. |
| `DatasheetPicker.tsx` | `useUdbSearch` | `factionId === undefined` branch | ✓ WIRED | Line 14 import; line 43 `useUdbSearch(isBrowseAll ? search : "")`. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `RulesHubPage.tsx` Shared Abilities tab | `rawAbilities` / `sharedAbilities` | `useDetachmentAbilities(selectedFactionId ?? null)` → `getDetachmentAbilitiesByFaction()` → `udb_detachment_abilities` table | Yes — faction-scoped SQL query; 284 abilities across 26 factions per CONTEXT.md | ✓ FLOWING |
| `DatasheetPicker.tsx` browse-all | `searchResults` | `useUdbSearch(search)` → `searchUdbUnits()` → FTS5 `udb_search` table | Yes — FTS5 full-text search; gated at ≥2 chars | ✓ FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for the database-dependent paths — requires running Tauri app with live SQLite. See Human Verification section.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HON-03 | 134-01-PLAN.md | Shared Abilities tab shows real faction data (no empty stub) | ✓ SATISFIED | Stub removed; `useDetachmentAbilities` wired; honest empty states implemented; 3 tests green per SUMMARY-01. |
| HON-04 | 134-02-PLAN.md | Link unit action never a permanent dead end | ✓ SATISFIED | `disabled` gate removed; `CollectionFactionLinkDialog` + browse-all path implemented; 3 test files green per SUMMARY-02. |

No orphaned requirements — both HON-03 and HON-04 are fully claimed by plans 01 and 02.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No debt markers (TBD/FIXME/XXX), no stubs, no hardcoded empty returns found in modified files. |

Specific checks run:
- `useSharedAbilitiesByFaction` stub: GONE (confirmed no match in `src/`)
- `disabled={!wahapediaFactionId}`: GONE from `PlaybookStats.tsx`
- `Number()` conversion in `CollectionFactionLinkDialog.tsx`: ABSENT (correct — UDB ids are strings)
- Highest migration: `047_army_list_unit_wargear.sql` — no new migration added (plan constraint honored)
- `wahapediaFactionId` unused parameter: handled via `_wahapediaFactionId` alias (TS strict compliance)

---

### Human Verification Required

The automated checks confirm every code path is correctly wired. The following require a running `pnpm tauri dev` session because they depend on live SQLite data:

#### 1. Shared Abilities tab renders real data

**Test:** Open Rules Hub, select a faction with detachment abilities (e.g. Space Marines), click "Shared Abilities" tab.
**Expected:** SharedAbilityCard rows appear with real ability names and description text; the legend badge shows the detachment name (e.g. "Gladius Task Force").
**Why human:** Cannot query `udb_detachment_abilities` without the Tauri SQL bridge.

#### 2. Shared Abilities honest empty state for a zero-ability faction

**Test:** Open Rules Hub, select a faction that has no entries in `udb_detachment_abilities`, click "Shared Abilities" tab with empty search.
**Expected:** Message "No shared abilities for this faction in the canonical database." appears — no blank panel.
**Why human:** Requires knowing which factions have zero rows, only determinable from live DB.

#### 3. Link unit button is clickable on unmapped faction

**Test:** Open a unit whose collection faction has `wahapedia_faction_id = NULL`. Observe the Stats section.
**Expected:** "Link unit" button is visibly enabled (not greyed out). Clicking it opens the CollectionFactionLinkDialog.
**Why human:** Requires navigating the live Tauri desktop UI.

#### 4. Faction-link flow: map then open scoped picker

**Test:** In CollectionFactionLinkDialog, select a canonical faction and click "Link & open datasheets".
**Expected:** Toast "Faction linked. Datasheets now available." appears; DatasheetPicker opens with the faction's datasheets listed (not browse-all mode).
**Why human:** `updateFaction.mutateAsync` writes to SQLite; requires Tauri backend.

#### 5. Faction-link flow: cancel → browse-all

**Test:** In CollectionFactionLinkDialog, click "Cancel — browse all instead".
**Expected:** DatasheetPicker opens showing "Type at least 2 characters to search all datasheets."; entering 2+ characters returns search results from across all factions.
**Why human:** `useUdbSearch` FTS5 query requires the live rules.db; cannot run without the Tauri backend.

---

### Gaps Summary

No gaps found. All 9 observable truths are VERIFIED in the codebase. Both HON-03 and HON-04 success criteria are satisfied by the implementation evidence.

The `human_needed` status reflects that the live database round-trip paths (real ability data render, faction-link DB write, browse-all FTS5 search) require the running Tauri app to confirm end-to-end behavior — this is expected for a desktop app with an embedded SQLite database.

---

_Verified: 2026-06-17_
_Verifier: Claude (gsd-verifier)_
