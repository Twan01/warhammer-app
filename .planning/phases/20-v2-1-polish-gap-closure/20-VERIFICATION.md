---
phase: 20-v2-1-polish-gap-closure
verified: 2026-05-04T18:30:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - test: "Open Factions page with zero factions"
    expected: "Shield icon inside a rounded-xl bg-muted/40 pill is visible; gap-3 outer flex, space-y-1 text wrapper, mt-2 button render correctly"
    why_human: "Visual layout and CSS class rendering cannot be verified without a browser or Tauri window"
  - test: "Mark all units inactive, navigate to Painting Projects; click 'Add Project' on the empty-state CTA"
    expected: "AddProjectPicker popover opens (not page navigation); no document.querySelector call fires"
    why_human: "DOM interaction and popover opening requires a running Tauri app"
  - test: "Open a unit from Dashboard active-projects or recently-updated list, open Playbook tab, trigger Re-import with a stat conflict"
    expected: "DatasheetImportDialog appears with per-field Keep/Use toggles, same as from CollectionPage"
    why_human: "Requires live rules.db sync data and a stat conflict to reproduce the conflict dialog flow"
---

# Phase 20: v2.1 Polish & Gap Closure — Verification Report

**Phase Goal:** Close the one integration gap found in the v2.1 milestone audit (DS-08 secondary path) and eliminate accumulated tech debt — DashboardPage conflict dialog wiring, FactionsEmptyState icon pattern, dead upsertSyncMeta export, PaintingProjectsPage DOM query CTA
**Verified:** 2026-05-04T18:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | FactionsEmptyState renders Shield icon inside rounded-xl bg-muted/40 p-4 pill, gap-3 outer flex, space-y-1 text wrapper, mt-2 Button | VERIFIED | File confirmed: `import { Shield }`, `rounded-xl bg-muted/40 p-4`, `gap-3 py-16`, `space-y-1`, `<Button className="mt-2"` — all present at exact lines 1–23 |
| 2  | datasheets.ts has no exported upsertSyncMeta function and no JSDoc mention of upsertSyncMeta | VERIFIED | grep across entire `src/` returns zero matches; "Writes:" JSDoc block at lines 11-15 references only upsertDatasheetLink |
| 3  | AddProjectPicker accepts optional controlled open/onOpenChange props with internal useState fallback | VERIFIED | Lines 18-27: destructure rename `open: controlledOpen`, `onOpenChange: controlledOnOpenChange`, `= {}` default, `internalOpen ?? controlledOpen` pattern all present |
| 4  | PaintingProjectsPage holds pickerOpen state and wires it to AddProjectPicker and KanbanBoard.onAddProject; no document.querySelector | VERIFIED | `const [pickerOpen, setPickerOpen] = useState(false)`, `<AddProjectPicker open={pickerOpen} onOpenChange={setPickerOpen} />`, `onAddProject={() => setPickerOpen(true)}` confirmed; grep on `document.querySelector` returns nothing |
| 5  | KanbanEmptyState button reads "Add Project" not "Go to Collection" | VERIFIED | Line 20: `>Add Project<` confirmed; grep on `Go to Collection` returns nothing |
| 6  | DashboardPage populated UnitDetailSheet has onDatasheetConflict, pendingImportResolution, onClearImportResolution props | VERIFIED | Lines 358-360 of DashboardPage.tsx; exactly 1 occurrence of `onDatasheetConflict=` (on populated sheet only, not on empty-state no-op sheet at line 211) |
| 7  | DatasheetImportDialog is mounted as a sibling after the lightbox Dialog in the populated-state fragment | VERIFIED | Line 400: `<DatasheetImportDialog` inside the populated-state `<>...</>` fragment, after `</Dialog>` at line 393; exactly 1 occurrence |
| 8  | conflictPayload and pendingResolution state hooks owned at DashboardPage level | VERIFIED | Lines 54-58: `useState<DatasheetImportPayload \| null>(null)` and `useState<{resolution: DatasheetImportResolution; payload: DatasheetImportPayload} \| null>(null)` present; imports at lines 20-21 resolve correctly |
| 9  | Empty-state no-op UnitDetailSheet at line 211 unchanged — no conflict props added | VERIFIED | grep count of `onDatasheetConflict=` is 1 (only on populated sheet); line 211 sheet has `key="none-detail"` and `open={false}` only |
| 10 | 2× UnitDetailSheet mounts, 1× DatasheetImportDialog mount in DashboardPage | VERIFIED | grep count `<UnitDetailSheet` = 2; `<DatasheetImportDialog` = 1 |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/factions/FactionsEmptyState.tsx` | Shield icon-pill empty state with mt-2 button | VERIFIED | 23 lines; imports Shield from lucide-react; contains all 5 canonical icon-pill classes |
| `src/db/queries/datasheets.ts` | Datasheet query module without upsertSyncMeta | VERIFIED | 207 lines (under 230 max); exports 7 functions: getDatasheetsByFaction, getFullDatasheet, getRulesSyncMeta, getDatasheetIdForUnit, upsertDatasheetLink, resolveWahapediaFactionIdByName, searchAllDatasheets; zero mentions of upsertSyncMeta |
| `src/features/painting-projects/AddProjectPicker.tsx` | Controlled-props popover with internal-state fallback | VERIFIED | Lines 18-27: `open: controlledOpen`, `onOpenChange: controlledOnOpenChange`, `const [internalOpen, setInternalOpen] = useState(false)`, `const open = controlledOpen ?? internalOpen`, `const setOpen = controlledOnOpenChange ?? setInternalOpen`; all exact string matches from plan |
| `src/features/painting-projects/PaintingProjectsPage.tsx` | Page that holds pickerOpen state and passes it to AddProjectPicker | VERIFIED | `const [pickerOpen, setPickerOpen] = useState(false)` at line 10; `<AddProjectPicker open={pickerOpen} onOpenChange={setPickerOpen} />` at line 29; `onAddProject={() => setPickerOpen(true)}` at line 34 |
| `src/features/painting-projects/KanbanEmptyState.tsx` | Add Project CTA button text | VERIFIED | Line 20: `>Add Project<`; `Layers` import preserved; helper copy preserved |
| `src/features/dashboard/DashboardPage.tsx` | Dashboard with DS-08 conflict-resolution wiring on populated UnitDetailSheet | VERIFIED | `conflictPayload` state at line 54; `<DatasheetImportDialog` at line 400; 2 imports at lines 20-21 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `FactionsEmptyState.tsx` | lucide-react | `import { Shield }` | WIRED | Line 1 exact match |
| `datasheets.ts` | (removed) | zero callers of upsertSyncMeta | WIRED (negative) | grep across `src/` returns 0 matches |
| `AddProjectPicker.tsx` | Popover | `<Popover open={open} onOpenChange={setOpen}>` | WIRED | Line 51; controlled/internal aliases correctly resolved |
| `PaintingProjectsPage.tsx` | AddProjectPicker | `open={pickerOpen} onOpenChange={setPickerOpen}` | WIRED | Line 29 |
| `PaintingProjectsPage.tsx` | KanbanBoard | `onAddProject={() => setPickerOpen(true)}` | WIRED | Line 34 |
| `PaintingProjectsPage.tsx` | (removed) | no document.querySelector call | WIRED (negative) | grep across painting-projects returns 0 matches |
| `DashboardPage.tsx` (populated UnitDetailSheet) | conflictPayload state | `onDatasheetConflict={(payload) => setConflictPayload(payload)}` | WIRED | Line 358; 1 occurrence only (not on empty-state sheet) |
| `DashboardPage.tsx` (DatasheetImportDialog) | pendingResolution state | `setPendingResolution({ resolution, payload: conflictPayload })` | WIRED | Line 404 inside onConfirm handler |
| `DashboardPage.tsx` (populated UnitDetailSheet) | pendingResolution state | `pendingImportResolution={pendingResolution}` + `onClearImportResolution={() => setPendingResolution(null)}` | WIRED | Lines 359-360; setPendingResolution appears 3 times (declaration + onConfirm + onClear) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DS-08 (secondary path) | 20-03-PLAN.md | Conflict review dialog wired for DashboardPage path (secondary entry point alongside CollectionPage) | SATISFIED | DatasheetImportDialog mounted as sibling in populated-state fragment; 3 conflict props on populated UnitDetailSheet; 2 state hooks at page level. Closes gap documented in v2.1-MILESTONE-AUDIT.md line 62 |
| tech-debt:FactionsEmptyState-icon-pill | 20-01-PLAN.md | Align FactionsEmptyState with project-wide icon-pill pattern | SATISFIED | Shield in rounded-xl pill; all 5 structural deviations corrected |
| tech-debt:upsertSyncMeta-removal | 20-01-PLAN.md | Remove dead upsertSyncMeta export from datasheets.ts | SATISFIED | Function + JSDoc block removed; zero callers; getRulesDb import preserved for 4 remaining functions |
| tech-debt:PaintingProjectsPage-DOM-query | 20-02-PLAN.md | Replace document.querySelector hack with React state lift | SATISFIED | pickerOpen state lifted to page; AddProjectPicker controlled-props; querySelector absent from codebase |

**Note on DS-08 in REQUIREMENTS.md:** The formal `REQUIREMENTS.md` file in `.planning/` covers only v2.2 requirements. DS-08 was a v2.1 requirement defined within Phase 15's context (tracked in `15-VERIFICATION.md` and `v2.1-MILESTONE-AUDIT.md`). The three tech-debt IDs have no formal requirement entry — they are internal tracking labels scoped to Phase 20. No orphaned requirements found.

### Anti-Patterns Found

None found. All five modified source files were scanned for TODO/FIXME/HACK/PLACEHOLDER markers, empty implementations, and stub return patterns. Clean result.

| File | Pattern | Severity | Result |
|------|---------|----------|--------|
| `FactionsEmptyState.tsx` | TODO/FIXME/stub return | — | Clean |
| `datasheets.ts` | upsertSyncMeta remaining | — | Clean (0 matches) |
| `AddProjectPicker.tsx` | TODO/stub | — | Clean |
| `PaintingProjectsPage.tsx` | document.querySelector, aria-haspopup | — | Clean (0 matches) |
| `DashboardPage.tsx` | TODO/FIXME | — | Clean |

### Human Verification Required

#### 1. FactionsEmptyState visual render

**Test:** With zero factions in the app, navigate to the Factions page
**Expected:** Shield icon centred inside a rounded-xl bg-muted/40 pill, text below in tighter gap-3 flex, "Add Faction" button with extra top margin
**Why human:** CSS class rendering and visual alignment require a browser/Tauri window

#### 2. PaintingProjectsPage empty-state CTA

**Test:** Mark all units inactive (or use a fresh database), navigate to Painting Projects — the Kanban board shows the empty state; click "Add Project"
**Expected:** AddProjectPicker popover opens (a searchable unit list appears); no navigation occurs; button text reads "Add Project" not "Go to Collection"
**Why human:** Popover open/close interaction and visual confirmation require a running Tauri app

#### 3. DS-08 Dashboard conflict dialog

**Test:** Sync Wahapedia rules, open a unit from Dashboard active-projects or recently-updated list, open the Playbook tab, click Re-import on a datasheet that has stat differences from the linked datasheet
**Expected:** DatasheetImportDialog appears with per-field Keep/Use toggles, identical to the experience from CollectionPage; confirming or discarding resolves correctly
**Why human:** Requires live rules.db sync data, an existing datasheet link on a unit, a stat conflict to trigger, and a Tauri window to observe the dialog

### Gaps Summary

No automated gaps. All 10 truths verified. All 6 artifacts pass all three levels (exists, substantive, wired). All 9 key links confirmed. No orphaned requirements. No anti-patterns.

Three human verification items remain — all are visual/interactive confirmations of already-verified code paths. They cannot be resolved programmatically but do not block the assessment: the code wiring is complete and correct.

---

_Verified: 2026-05-04T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
