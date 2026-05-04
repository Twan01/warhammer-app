# Phase 20: v2.1 Polish & Gap Closure - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Close 4 specific tech debt items identified in the v2.1 milestone audit. No new features, no schema changes, no new routes. Every fix is a targeted edit to existing files.

1. **DS-08 DashboardPage** — Wire conflict dialog props to the populated UnitDetailSheet; add DatasheetImportDialog sibling
2. **FactionsEmptyState** — Apply icon-pill pattern with Shield icon to match all other empty states
3. **PaintingProjectsPage CTA** — Replace fragile querySelector with controlled-props state lift
4. **upsertSyncMeta dead export** — Remove the unused export from datasheets.ts

</domain>

<decisions>
## Implementation Decisions

### PaintingProjectsPage CTA behavior
- CTA should **open the AddProjectPicker popover** (not navigate to Collection)
- Button text in KanbanEmptyState: change "Go to Collection" → **"Add Project"** (matches actual action)
- Implementation: **controlled props** on AddProjectPicker — add optional `open?: boolean` and `onOpenChange?: (open: boolean) => void` props; internal `useState` becomes the fallback when props are not provided
- PaintingProjectsPage holds `pickerOpen` + `setPickerOpen` state
- Passes `open={pickerOpen} onOpenChange={setPickerOpen}` to `AddProjectPicker`
- Passes `onAddProject={() => setPickerOpen(true)}` to `KanbanBoard` (which forwards unchanged to `KanbanEmptyState`)

### FactionsEmptyState icon
- Replace `PackageOpen` with **`Shield`** from lucide-react
- Apply full icon-pill pattern matching `ArmyListsEmptyState` and `KanbanEmptyState`:
  - Outer flex: `gap-3 py-16` (was `gap-4`)
  - Icon wrapped in: `<div className="rounded-xl bg-muted/40 p-4"><Shield className="h-8 w-8 text-muted-foreground" /></div>` (was bare `h-12 w-12`)
  - Text block wrapped in: `<div className="space-y-1">` (was unwrapped)
  - Button: `<Button className="mt-2" onClick={onAdd}>Add Faction</Button>` (add `className="mt-2"`)

### DS-08 DashboardPage conflict dialog
- Mirror `CollectionPage.tsx:78-84` exactly — add `conflictPayload` + `pendingResolution` states
- Add all 3 conflict props to the **populated UnitDetailSheet** at line 340 only
- The empty-state no-op UnitDetailSheet at line 201 (always `open={false}`) is left unchanged
- Add `DatasheetImportDialog` sibling after the lightbox Dialog, mirroring `CollectionPage.tsx:247-255`
- Import `DatasheetImportDialog` and `DatasheetImportPayload` / `DatasheetImportResolution` types from existing modules

### upsertSyncMeta removal
- Remove the `upsertSyncMeta` function export from `src/db/queries/datasheets.ts` (line ~167)
- Rust command `bulk_sync_rules` is the sole sync-meta write path — no callers to update
- No import cleanup needed in other files (confirm with grep before deleting)

### Claude's Discretion
- Exact positioning of DatasheetImportDialog import in DashboardPage.tsx import block
- Whether to add a JSDoc comment on AddProjectPicker's new controlled props (keep consistent with existing zero-comment style)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tech debt audit (source of truth for all 4 items)
- `.planning/milestones/v2.1-MILESTONE-AUDIT.md` — exact item descriptions, fix effort estimates, and evidence file locations

### DS-08 conflict dialog reference implementation
- `src/features/units/CollectionPage.tsx` lines 78–84 — conflictPayload + pendingResolution state declarations
- `src/features/units/CollectionPage.tsx` lines 205–207 — the 3 conflict props wired on UnitDetailSheet
- `src/features/units/CollectionPage.tsx` lines 247–255 — DatasheetImportDialog sibling mount

### Icon-pill pattern reference implementations
- `src/features/army-lists/ArmyListsEmptyState.tsx` — full icon-pill structure (rounded-xl bg-muted/40 p-4, h-8 w-8, space-y-1, mt-2 Button)
- `src/features/painting-projects/KanbanEmptyState.tsx` — second reference; also shows gap-3 py-16 outer flex

### Files being modified
- `src/features/dashboard/DashboardPage.tsx` — DS-08 fix target; line 340 = populated UnitDetailSheet; line 201 = no-op (leave alone)
- `src/features/factions/FactionsEmptyState.tsx` — icon-pill fix target
- `src/features/painting-projects/PaintingProjectsPage.tsx` — querySelector fix target (lines 34–38)
- `src/features/painting-projects/AddProjectPicker.tsx` — add controlled open/onOpenChange props
- `src/features/painting-projects/KanbanEmptyState.tsx` — button text "Go to Collection" → "Add Project"
- `src/db/queries/datasheets.ts` — remove upsertSyncMeta export (~line 167)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DatasheetImportDialog` from `@/features/units/DatasheetImportDialog` — already used in CollectionPage; same import path for DashboardPage
- `DatasheetImportPayload`, `DatasheetImportResolution` from `@/types/datasheet` — already imported in CollectionPage
- `Shield` from `lucide-react` — not yet imported in FactionsEmptyState; needs to replace `PackageOpen`

### Established Patterns
- Sibling Sheet/Dialog portal pattern — DatasheetImportDialog must be a sibling of UnitDetailSheet's Sheet (never nested)
- Controlled-props pattern with internal fallback — AddProjectPicker's internal `useState(false)` becomes `props.open ?? internalOpen`
- Zero-comment style — don't add explanatory comments unless mirroring existing comment blocks

### Integration Points
- DashboardPage's populated UnitDetailSheet (line 340): receives 3 new optional props
- KanbanBoard.onAddProject: already passes through to KanbanEmptyState unchanged — no changes needed in KanbanBoard
- `upsertSyncMeta` grep before removal: confirm zero callers in `src/` and `src-tauri/`

</code_context>

<specifics>
## Specific Ideas

- PaintingProjectsPage fix: controlled props on AddProjectPicker should use the pattern `const [internalOpen, setInternalOpen] = useState(false); const isOpen = open ?? internalOpen; const handleOpenChange = onOpenChange ?? setInternalOpen;` — avoids breaking the uncontrolled (no props) usage from DashboardPage's AddProjectPicker (there isn't one, but the pattern is defensive)
- DS-08 comment block in CollectionPage.tsx lines 242–245 is a good template for the equivalent comment in DashboardPage.tsx above the DatasheetImportDialog

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 20-v2-1-polish-gap-closure*
*Context gathered: 2026-05-04*
