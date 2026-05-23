---
phase: 93-datasheet-browser-ghost-units
verified: 2026-05-21T07:35:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "Open army list detail, click Browse Datasheets, verify dialog shows datasheets grouped by role"
    expected: "Dialog opens with Command palette showing faction datasheets grouped by role headings (Character, Battleline, etc.) with points displayed"
    why_human: "Dialog rendering, Command palette UX, and visual grouping cannot be verified via grep"
  - test: "Select a datasheet in the browser and verify ghost unit appears in the list"
    expected: "Unit appears in the army list with 'Planned' badge, muted text, no painting status, and points counting toward list total"
    why_human: "Full end-to-end flow requires running app with SQLite database"
  - test: "Verify ghost unit does NOT appear in Collection, Dashboard, or Kanban"
    expected: "Ghost unit only visible in army list context, not in Collection page, Dashboard stats, or Painting Kanban"
    why_human: "Schema-level isolation is verified in code but runtime confirmation ensures no UI leakage"
---

# Phase 93: Datasheet Browser + Ghost Units Verification Report

**Phase Goal:** Users can browse all faction datasheets and plan their list with unowned units clearly distinguished from their collection
**Verified:** 2026-05-21T07:35:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can open a DatasheetBrowserDialog from the army list and see all datasheets for the active faction | VERIFIED | `DatasheetBrowserDialog.tsx` (142 lines) renders Dialog+Command with grouped datasheets via `useDatasheetsByFactionWithPoints`. Wired into `ArmyListsPage.tsx` as sibling portal (line 158). "Browse Datasheets" button in `ArmyListDetailSheet.tsx` (line 216) triggers `onBrowseDatasheets` callback. 4 passing tests confirm rendering. |
| 2 | User can add an unowned datasheet as a "planned" unit with clear visual marker | VERIFIED | `handleSelect` in `DatasheetBrowserDialog.tsx` (line 80) calls `addGhostUnit.mutate({ list_id, ghost_unit_name: ds.name })` -- passes canonical name, not ID. `ArmyListUnitRow.tsx` (line 64) detects `isGhost = unit.unit_id === null`, renders `<Badge variant="outline">Planned</Badge>` (line 185) and muted text class (line 184). 9 ghost treatment tests pass. |
| 3 | Ghost/planned units do not appear in Collection, Dashboard, or Kanban | VERIFIED | Schema-level isolation: ghost units exist only in `army_list_units` with `unit_id=NULL`. Collection queries `units` table (`src/db/queries/units.ts`), Dashboard queries `units` table (`src/db/queries/dashboard.ts`) -- neither references `army_list_units` or `ghost_unit_name`. Migration 031 enforces `CHECK (unit_id IS NOT NULL OR ghost_unit_name IS NOT NULL)`. |
| 4 | Points for ghost units resolve from synced data and count toward list total | VERIFIED | COALESCE chain in `armyLists.ts` (line 76) joins on `COALESCE(u.name, alu.ghost_unit_name)` via LEFT JOIN to `synced_unit_points` (line 81). Ghost units resolve points through synced data or fall back to 0. `SUM` aggregation (line 375) includes all rows including ghost units in total. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/army-lists/DatasheetBrowserDialog.tsx` | Dialog for browsing faction datasheets | VERIFIED | 142 lines, exports `DatasheetBrowserDialog`, uses Dialog+Command+Badge, groups by role, adds ghost via ds.name |
| `src/features/army-lists/ArmyListUnitRow.tsx` | Ghost unit visual treatment | VERIFIED | 330 lines, `isGhost` detection at line 64, conditional rendering for badge/muted/status/role |
| `src/features/army-lists/ArmyListsPage.tsx` | Sibling portal wiring | VERIFIED | `datasheetBrowserOpen` state (line 43), `closeDetail` resets it (line 70), renders `DatasheetBrowserDialog` (line 158) |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | Browse Datasheets trigger button | VERIFIED | `onBrowseDatasheets` prop (line 59), BookOpen icon button (line 216) |
| `tests/army-lists/DatasheetBrowserDialog.test.tsx` | Dialog component tests | VERIFIED | 4 tests: grouped rendering, ghost unit add with ds.name, empty state, dialog stays open |
| `tests/army-lists/ArmyListUnitRow.test.tsx` | Ghost unit treatment tests | VERIFIED | 9 ghost tests + 3 existing = 12 total, all passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| DatasheetBrowserDialog.tsx | useDatasheetsByFactionWithPoints | React Query hook | WIRED | Import at line 22, called at line 61 with conditional wahapediaFactionId |
| DatasheetBrowserDialog.tsx | useAddGhostUnitToList | Mutation hook | WIRED | Import at line 24, called at line 79 with `ghost_unit_name: ds.name` |
| ArmyListsPage.tsx | DatasheetBrowserDialog | Sibling portal | WIRED | Import at line 15, rendered at line 158, controlled by datasheetBrowserOpen state |
| ArmyListDetailSheet.tsx | ArmyListsPage | onBrowseDatasheets callback | WIRED | Prop at line 59, destructured at line 63, passed from ArmyListsPage at line 131 |
| ArmyListUnitRow.tsx | unit_id === null | Ghost detection | WIRED | Line 64: `const isGhost = unit.unit_id === null`, used in 4 conditional renders |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| DatasheetBrowserDialog tests | `npx vitest run tests/army-lists/DatasheetBrowserDialog.test.tsx` | 4/4 passed | PASS |
| ArmyListUnitRow tests | `npx vitest run tests/army-lists/ArmyListUnitRow.test.tsx` | 12/12 passed (3 existing + 9 new) | PASS |

### Probe Execution

Step 7c: SKIPPED (no probe scripts found for this phase)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BRW-01 | 93-01 | Browse all faction datasheets from army list context | SATISFIED | DatasheetBrowserDialog uses useDatasheetsByFactionWithPoints to show all datasheets, not just owned |
| BRW-02 | 93-01, 93-02 | Add unowned datasheets as "planned" units, clearly marked | SATISFIED | Ghost add via ds.name in DatasheetBrowserDialog; Planned badge + muted text in ArmyListUnitRow |
| BRW-03 | 93-02 | Ghost units isolated from Collection/Dashboard/Kanban | SATISFIED | Schema-level: ghost units in army_list_units only; Collection/Dashboard/Kanban query units table directly |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none found) | - | - | - | - |

No debt markers (TBD/FIXME/XXX/TODO/HACK) found in modified files.

### Human Verification Required

### 1. DatasheetBrowserDialog Visual UX

**Test:** Open an army list with a faction set, click "Browse Datasheets" button, interact with the Command palette
**Expected:** Dialog opens showing datasheets grouped by role headings (Character, Battleline, etc.) with Badge and points. Search filters items. Selecting adds a toast confirmation and dialog stays open.
**Why human:** Dialog layout, Command palette search UX, and visual grouping require runtime observation

### 2. Ghost Unit End-to-End Flow

**Test:** Add a ghost unit via the DatasheetBrowserDialog, then inspect the army list unit row
**Expected:** Ghost unit appears with "Planned" badge (outline variant), muted text, "--" instead of painting status, no tactical role selector, but Configure button and points input visible. Points count toward list total in summary bar.
**Why human:** Full data flow from add-to-display requires running app with SQLite

### 3. Ghost Isolation Runtime Check

**Test:** After adding ghost units, navigate to Collection, Dashboard, and Painting Kanban
**Expected:** Ghost units do NOT appear anywhere outside the army list context
**Why human:** Schema-level isolation is verified in code but runtime check confirms no UI pathway leaks ghost data

---

_Verified: 2026-05-21T07:35:00Z_
_Verifier: Claude (gsd-verifier)_
