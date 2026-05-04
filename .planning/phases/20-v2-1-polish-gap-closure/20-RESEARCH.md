# Phase 20: v2.1 Polish & Gap Closure - Research

**Researched:** 2026-05-04
**Domain:** React component refactoring, targeted tech debt elimination
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**PaintingProjectsPage CTA behavior**
- CTA opens the AddProjectPicker popover (not navigate to Collection)
- Button text in KanbanEmptyState: change "Go to Collection" → "Add Project"
- Implementation: controlled props on AddProjectPicker — add optional `open?: boolean` and `onOpenChange?: (open: boolean) => void` props; internal `useState` becomes the fallback when props are not provided
- PaintingProjectsPage holds `pickerOpen` + `setPickerOpen` state
- Passes `open={pickerOpen} onOpenChange={setPickerOpen}` to `AddProjectPicker`
- Passes `onAddProject={() => setPickerOpen(true)}` to `KanbanBoard`

**FactionsEmptyState icon**
- Replace `PackageOpen` with `Shield` from lucide-react
- Outer flex: `gap-3 py-16` (was `gap-4`)
- Icon wrapped in: `<div className="rounded-xl bg-muted/40 p-4"><Shield className="h-8 w-8 text-muted-foreground" /></div>` (was bare `h-12 w-12`)
- Text block wrapped in: `<div className="space-y-1">` (was unwrapped)
- Button: `<Button className="mt-2" onClick={onAdd}>Add Faction</Button>` (add `className="mt-2"`)

**DS-08 DashboardPage conflict dialog**
- Mirror `CollectionPage.tsx:78-84` exactly — add `conflictPayload` + `pendingResolution` states
- Add all 3 conflict props to the populated UnitDetailSheet at line 340 only
- The empty-state no-op UnitDetailSheet at line 201 (always `open={false}`) is left unchanged
- Add `DatasheetImportDialog` sibling after the lightbox Dialog, mirroring `CollectionPage.tsx:247-255`
- Import `DatasheetImportDialog` and `DatasheetImportPayload` / `DatasheetImportResolution` from existing modules

**upsertSyncMeta removal**
- Remove the `upsertSyncMeta` function export from `src/db/queries/datasheets.ts` (~line 167)
- Rust command `bulk_sync_rules` is the sole sync-meta write path — no callers to update
- Remove the reference in the module JSDoc comment at line 14

### Claude's Discretion
- Exact positioning of DatasheetImportDialog import in DashboardPage.tsx import block
- Whether to add a JSDoc comment on AddProjectPicker's new controlled props (keep consistent with existing zero-comment style)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DS-08 (secondary path) | Opening a unit from DashboardPage's active-projects or recently-updated lists and triggering a Re-import with stat conflicts must show DatasheetImportDialog (same UX as CollectionPage) | Verified via DashboardPage.tsx line 340 — 3 conflict props absent; CollectionPage.tsx lines 78-84 and 247-255 provide the exact mirror pattern. All referenced types and components already imported/available in the codebase. |
</phase_requirements>

---

## Summary

Phase 20 is a pure tech debt closure phase: 4 targeted edits to existing files, no new schema, no new routes, no new libraries. All patterns are already proven in adjacent files within the same codebase. The work amounts to mechanical mirroring of established patterns — the DS-08 fix copies ~30 lines from CollectionPage, the FactionsEmptyState fix copies ~14 lines from ArmyListsEmptyState, the AddProjectPicker controlled-props pattern is a standard React lift pattern, and the `upsertSyncMeta` removal is a one-function delete.

The primary risk in this phase is editing exactness: the wrong UnitDetailSheet in DashboardPage (the no-op empty-state one at line 201 vs the populated one at line 340), accidentally leaving the `upsertSyncMeta` JSDoc reference in the module comment, or not removing the `querySelector` call site at the same time as adding `pickerOpen` state. Research surfaces no external dependencies to investigate — everything is internal.

**Primary recommendation:** Execute as a single-wave plan with one task per fix item (4 tasks total). No Wave 0 test stubs needed — these fixes are UI wiring / dead-code removal that do not require new behavioral test coverage. Amend existing KanbanBoard and DashboardPage tests if they break due to prop interface changes.

---

## Standard Stack

No new packages. All tools in use:

| File | Pattern | Already Used In |
|------|---------|-----------------|
| `DatasheetImportDialog` | Sibling portal Dialog | `CollectionPage.tsx` |
| `DatasheetImportPayload`, `DatasheetImportResolution` | Type imports from `@/types/datasheet` | `CollectionPage.tsx`, `UnitDetailSheet.tsx` |
| `Shield` from `lucide-react` | Icon import | Multiple empty states |
| `useState` | Controlled-props lift | All feature pages |

**Installation:** None required.

---

## Architecture Patterns

### Pattern 1: DS-08 Sibling-Portal Conflict Dialog

**What:** The parent page owns conflict state; the Dialog is mounted as a sibling (not child) of the Sheet portal.

**Reference code in CollectionPage.tsx (lines 78-84):**
```typescript
// DS-08 — conflict-resolution dialog state. Owned by CollectionPage so the
// Dialog is a sibling of UnitDetailSheet's Sheet portal (not nested).
const [conflictPayload, setConflictPayload] = useState<DatasheetImportPayload | null>(null);
const [pendingResolution, setPendingResolution] = useState<{
  resolution: DatasheetImportResolution;
  payload: DatasheetImportPayload;
} | null>(null);
```

**Props wired to UnitDetailSheet (CollectionPage lines 205-207):**
```typescript
onDatasheetConflict={(payload) => setConflictPayload(payload)}
pendingImportResolution={pendingResolution}
onClearImportResolution={() => setPendingResolution(null)}
```

**DatasheetImportDialog sibling (CollectionPage lines 242-255):**
```typescript
{/* DS-08 — conflict-resolution dialog. Sibling to Sheet portal — NEVER nested.
    PlaybookTab raises onDatasheetConflict via UnitDetailSheet → setConflictPayload.
    When the user confirms, we drop the payload back into pendingResolution and
    PlaybookTab subscribes via useEffect, applies the resolution, then calls
    onClearImportResolution to reset state. */}
<DatasheetImportDialog
  open={conflictPayload !== null}
  conflicts={conflictPayload?.conflicts ?? []}
  onConfirm={(resolution) => {
    if (conflictPayload) setPendingResolution({ resolution, payload: conflictPayload });
    setConflictPayload(null);
  }}
  onClose={() => setConflictPayload(null)}
/>
```

**DashboardPage target:** Line 340 is the populated-state UnitDetailSheet. The no-op one at line 201 (inside the `!stats.hasUnits` branch, always `open={false}`) must NOT receive conflict props — those would be dead state since the branch never opens a unit.

### Pattern 2: Controlled-Props with Internal Fallback

**What:** AddProjectPicker currently uses `const [open, setOpen] = useState(false)` internally. The controlled-props lift adds optional `open` and `onOpenChange` props while preserving uncontrolled behavior when props are absent.

**Decision (from CONTEXT.md specifics):**
```typescript
const [internalOpen, setInternalOpen] = useState(false);
const isOpen = open ?? internalOpen;
const handleOpenChange = onOpenChange ?? setInternalOpen;
```

Replace every reference to the old `open` state with `isOpen`, and every reference to `setOpen` with `handleOpenChange`.

**Props interface addition:**
```typescript
export function AddProjectPicker({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
```

**PaintingProjectsPage wires as:**
```typescript
const [pickerOpen, setPickerOpen] = useState(false);
// ...
<AddProjectPicker open={pickerOpen} onOpenChange={setPickerOpen} />
// ...
<KanbanBoard
  onEditUnit={openEdit}
  onAddProject={() => setPickerOpen(true)}
/>
```

The `querySelector` block (lines 33-38 of PaintingProjectsPage.tsx) is removed entirely.

### Pattern 3: Icon-Pill Empty State

**Reference implementation (ArmyListsEmptyState.tsx):**
```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <div className="rounded-xl bg-muted/40 p-4">
    <Swords className="h-8 w-8 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <p className="text-base font-semibold">No army lists yet</p>
    <p className="text-sm text-muted-foreground max-w-xs">...</p>
  </div>
  <Button className="mt-2" onClick={onAdd}>New list</Button>
</div>
```

**FactionsEmptyState current state (all 3 deviations):**
1. `gap-4` instead of `gap-3`
2. Bare `<PackageOpen className="h-12 w-12 text-muted-foreground" />` instead of icon-pill div
3. No `<div className="space-y-1">` wrapper on text block
4. No `className="mt-2"` on Button
5. `PackageOpen` import instead of `Shield`

### Anti-Patterns to Avoid

- **Modifying the no-op UnitDetailSheet at DashboardPage line 201:** This is inside the `!stats.hasUnits` empty-state branch; it is always `open={false}`. Adding conflict props there would create state that can never be triggered.
- **Nesting DatasheetImportDialog inside a Sheet or Dialog:** Must be a top-level sibling — the Radix portal pattern requires it. In DashboardPage, the Dialog goes after the lightbox Dialog, before the closing `</>` fragment.
- **Forgetting to remove the querySelector block:** PaintingProjectsPage lines 33-38 contain the `document.querySelector` call. The entire arrow function body must be replaced, not just the inner call.
- **Leaving the `upsertSyncMeta` JSDoc reference:** The module comment at line 14 of `datasheets.ts` lists `upsertSyncMeta` in the "Writes:" section. This line should be removed together with the function itself.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conflict dialog | Custom Dialog | Existing `DatasheetImportDialog` | Already implements Keep/Use toggle, default resolution, onConfirm/onClose API |
| Popover open state | External click simulation | `open`/`onOpenChange` props on Popover | Radix Popover is already controlled-capable; just expose the props |

---

## Common Pitfalls

### Pitfall 1: Wrong UnitDetailSheet in DashboardPage
**What goes wrong:** Developer adds conflict props to the no-op UnitDetailSheet (line 201) instead of the populated one (line 340).
**Why it happens:** Two UnitDetailSheet mounts exist in the same file, separated by ~140 lines.
**How to avoid:** The populated UnitDetailSheet is inside the `// --- Populated state ---` return block starting at line 220. It has `key={selectedUnit?.id ?? "none-detail"}` and `open={selectedUnitId !== null}`. The no-op one has `key="none-detail"` and `open={false}`.
**Warning signs:** If conflict dialog never appears, check which UnitDetailSheet got the props.

### Pitfall 2: Fragment vs Div in DashboardPage Populated Return
**What goes wrong:** DatasheetImportDialog added inside the inner `<div className="flex flex-col gap-12 p-6">` instead of as a sibling at the fragment level.
**Why it happens:** The populated-state return is wrapped in `<>...</>` (fragment); the inner div holds visible content; the Sheet/Dialog siblings live outside the div but inside the fragment.
**How to avoid:** Follow the existing pattern — UnitDetailSheet, UnitSheet, UnitDeleteDialog, and the lightbox Dialog are all after the closing `</div>` at line 337, inside the fragment. DatasheetImportDialog goes there too.

### Pitfall 3: Controlled-Props Naming Collision
**What goes wrong:** AddProjectPicker's new prop `open` shadows the old internal state `open`.
**Why it happens:** The internal state was named `open`. Adding a prop named `open` creates a shadowing bug.
**How to avoid:** Rename the internal state to `internalOpen` first, then add the `open` prop. The CONTEXT.md decision specifies this exact rename: `const [internalOpen, setInternalOpen] = useState(false)`.

### Pitfall 4: KanbanBoard test breakage from prop changes
**What goes wrong:** `tests/painting/KanbanBoard.test.tsx` tests that call `AddProjectPicker` or check the DOM for the picker button may fail if the picker's internal `open` state name changes or if the test renders `PaintingProjectsPage` with the picker mounted.
**Why it happens:** KanbanBoard test renders KanbanBoard directly (not PaintingProjectsPage) and mocks unit data. The `onAddProject` prop is passed as a spy.
**How to avoid:** KanbanBoard.test.tsx does not mount AddProjectPicker — it only tests KanbanBoard. AddProjectPicker changes are isolated. Verify `pnpm test` passes after the fix.

### Pitfall 5: TypeScript strict unused-import error
**What goes wrong:** After removing `upsertSyncMeta`, the TypeScript compiler errors if the module comment still references it, or if any import elsewhere tried to use it.
**Why it happens:** Strict mode (`noUnusedLocals`) catches stale exports only at the consumer side; but grep confirmed zero callers in `src/` and `src-tauri/`.
**How to avoid:** Verify with grep before deletion (confirmed by CONTEXT.md: zero callers). Also remove the line-14 JSDoc reference in `datasheets.ts`.

---

## Code Examples

### AddProjectPicker controlled-props interface
```typescript
// Source: CONTEXT.md §Specific Ideas
export function AddProjectPicker({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  // ... rest of component uses `open` and `setOpen` unchanged
```

Note: using `open` and `setOpen` as the derived variable names means the Popover JSX (`<Popover open={open} onOpenChange={setOpen}>`) requires no changes.

### DashboardPage import additions
```typescript
import { DatasheetImportDialog } from "@/features/units/DatasheetImportDialog";
import type { DatasheetImportPayload, DatasheetImportResolution } from "@/types/datasheet";
```

These go in the import block. CollectionPage adds them at line 26-27; DashboardPage can mirror that placement after the existing `@/features/units/` imports.

### FactionsEmptyState complete replacement
```tsx
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FactionsEmptyStateProps {
  onAdd: () => void;
}

export function FactionsEmptyState({ onAdd }: FactionsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-xl bg-muted/40 p-4">
        <Shield className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">No factions yet</p>
        <p className="text-sm text-muted-foreground">
          Add your first faction to start organizing your collection.
        </p>
      </div>
      <Button className="mt-2" onClick={onAdd}>Add Faction</Button>
    </div>
  );
}
```

---

## State of the Art

| Before | After | Notes |
|--------|-------|-------|
| DashboardPage: conflict props absent from populated UnitDetailSheet | Conflict props present; DatasheetImportDialog sibling mounted | Closes DS-08 secondary path |
| FactionsEmptyState: bare h-12 w-12 PackageOpen icon | Icon-pill pattern matching all other empty states | Visual consistency |
| PaintingProjectsPage: document.querySelector hack | Controlled open state passed down through props | React idiomatic; testable |
| datasheets.ts: `upsertSyncMeta` exported but never called | Function removed; module comment updated | Dead code eliminated |

---

## Open Questions

None — all implementation details are fully specified in CONTEXT.md. All referenced files have been read and verified. Zero ambiguities remain.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test -- tests/painting/KanbanBoard.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DS-08 (secondary path) | DashboardPage populates conflict props on UnitDetailSheet | Integration (render check) | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ✅ exists |
| FactionsEmptyState icon | Shield icon-pill renders correctly | Unit (render) | `pnpm test` (no dedicated test; snapshot-free) | N/A |
| AddProjectPicker controlled-props | KanbanBoard onAddProject triggers picker open | Unit | `pnpm test -- tests/painting/KanbanBoard.test.tsx` | ✅ exists |
| upsertSyncMeta removal | No TypeScript errors; no callers broken | Type check | `pnpm build` (tsc) | N/A |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/KanbanBoard.test.tsx tests/dashboard/DashboardPage.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. No new test stubs required.

- `tests/dashboard/DashboardPage.test.tsx` — existing; may need minor update if DashboardPage's prop list changes break the mock setup (unlikely — the test mocks at the query layer, not the component prop layer)
- `tests/painting/KanbanBoard.test.tsx` — existing; will pass unchanged since KanbanBoard.test.tsx renders KanbanBoard directly (AddProjectPicker not mounted in that test)

---

## Sources

### Primary (HIGH confidence)
All findings are based on direct code inspection of the project codebase. No external research required — this is a pure internal refactoring phase.

- `src/features/units/CollectionPage.tsx` — DS-08 reference implementation (lines 78-84, 205-207, 242-255)
- `src/features/army-lists/ArmyListsEmptyState.tsx` — icon-pill pattern canonical reference
- `src/features/painting-projects/KanbanEmptyState.tsx` — second icon-pill reference; confirms gap-3 py-16
- `src/features/painting-projects/AddProjectPicker.tsx` — current implementation; internal open state at line 19
- `src/features/painting-projects/PaintingProjectsPage.tsx` — querySelector at lines 33-38
- `src/features/painting-projects/KanbanBoard.tsx` — confirms onAddProject prop passes straight through to KanbanEmptyState unchanged
- `src/features/dashboard/DashboardPage.tsx` — confirms populated UnitDetailSheet at line 340 missing 3 props; no-op at line 201 is correct to leave alone
- `src/db/queries/datasheets.ts` — confirms `upsertSyncMeta` at line 167; confirmed zero callers via grep
- `src/features/units/UnitDetailSheet.tsx` — confirms prop interface (onDatasheetConflict, pendingImportResolution, onClearImportResolution all optional)

---

## Metadata

**Confidence breakdown:**
- All fix targets: HIGH — read directly from source files
- Implementation patterns: HIGH — exact mirror of proven patterns in sibling files
- Test impact: HIGH — KanbanBoard.test.tsx confirmed to render KanbanBoard only, not AddProjectPicker

**Research date:** 2026-05-04
**Valid until:** Indefinite — no external dependencies; internal codebase only
