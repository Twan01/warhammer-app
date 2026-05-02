# Phase 9: Unit Playbook - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a "Playbook" tab to the existing `UnitDetailSheet` so users can record personal stats (M/T/Sv/W/Ld/OC), abilities, keywords, and 8 strategy note fields per unit — saving inline without closing the sheet or toggling a global edit mode. The Details tab content is untouched. No new routes, no new sidebar entries. All back-end plumbing (migration, types, queries, hooks) is already done in Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Stats block visual
- Six bordered cells in a horizontal row, each with the stat abbreviation label above the value — faithful to a 40K 10th edition datasheet style
- Display mode (default): cells show the value or "—" when empty; dark borders, subtle fill, compact
- Edit mode: clicking the stats block (or an "Edit Stats" button) switches all six cells to number inputs simultaneously; Save commits and returns to display mode
- Suffix logic at display time only (never stored in DB):
  - M → append `"` (e.g. `6"`)
  - Sv, Ld, OC → append `+` (e.g. `3+`, `7+`, `1+`)
  - T, W → raw integer (no suffix)
- Input mode shows raw integers only; no suffix in inputs

### Strategy notes layout
- Single column, full-width — all 8 fields stacked vertically in the order from STRAT-04: Battlefield Role, Strengths, Weaknesses, Best Targets, Synergies, Mistakes to Avoid, Rules Page References, Personal Notes
- Each field: muted label + `rows={2}` Textarea (shadcn Textarea component)
- No grouping, collapsibles, or 2-column grid — space in sm:max-w-md does not support it cleanly

### Playbook tab content order
Stats block → Abilities (multi-line textarea) → Keywords (single-line or small textarea, comma-separated) → 8 strategy note fields → Save button

### Save button placement
- Save button lives at the **bottom of the Playbook tab scroll area** — not in SheetFooter
- SheetFooter retains only Edit Unit and Delete Unit, visible on both tabs regardless of scroll position
- Dirty state: Save button is disabled when no fields have changed since last load or save; enabled as soon as any field is edited
- On save success: `toast.success("Playbook saved")` via sonner — consistent with the rest of the app
- On save error: `toast.error("Failed to save playbook")` — same pattern

### Tabs integration
- `UnitDetailSheet` is restructured to use shadcn `Tabs` (already installed at `src/components/ui/tabs.tsx`)
- Tab labels: "Details" | "Playbook"
- Tabs wrap only the scrollable content area; `SheetHeader` and `SheetFooter` remain outside tabs
- Default tab: "Details" (existing behavior preserved on first open)
- Details tab content: unchanged — existing flat `div` content becomes `TabsContent value="details"` with no edits

### Data loading
- `useStrategyNote(unitId)` is called eagerly when the sheet opens (not lazy on tab switch) — `staleTime: Infinity` on the hook means no redundant refetches; cost is negligible on local SQLite

### Claude's Discretion
- Exact border and fill styling for the stat cells (follow app's zinc/dark-mode palette)
- Whether the stats block edit mode is triggered by clicking any cell or by a dedicated small "Edit" icon button
- Column widths/flex layout for the 6 stat cells to fit sm:max-w-md
- Whether Keywords uses a single-line Input or a small 1-row Textarea

</decisions>

<specifics>
## Specific Ideas

- Stats block should look like a real Warhammer 40K 10th edition datasheet row — the visual reference is the horizontal M / T / Sv / W / Ld / OC strip at the top of every GW datasheet
- "No global edit/view mode toggle" (STRAT-05) means the strategy note textareas are always editable; only the stats block has a click-to-edit mode due to its display-cell aesthetic

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §Phase 9 — success criteria 1–5 are the acceptance bar
- `.planning/milestones/v1.1-REQUIREMENTS.md` §STRAT-01..05 — exact requirement text for the five playbook requirements (STRAT-06 was Phase 6 scope, already done)

### Phase 6 deliverables this phase consumes
- `src/hooks/useStrategyNote.ts` — `useStrategyNote(unitId)` and `useUpsertStrategyNote()` hooks; already implemented and tested
- `src/types/strategyNote.ts` — `StrategyNote` and `UpsertStrategyNoteInput` types; all 17 user-editable fields defined
- `src/db/queries/strategyNotes.ts` — `getStrategyNote()` and `upsertStrategyNote()` query functions; already implemented

### File being modified
- `src/features/units/UnitDetailSheet.tsx` — the only existing file that changes structure; must be wrapped in Tabs without altering Details tab content

### shadcn/ui components available
- `src/components/ui/tabs.tsx` — Tabs, TabsList, TabsTrigger, TabsContent (Radix-based, already installed)
- `src/components/ui/sheet.tsx` — Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription (already in use)

### Established patterns to follow
- `src/features/units/CollectionPage.tsx` `handleToggleActive` — optimistic mutation pattern (for reference, though Playbook save is not optimistic)
- `src/features/paints/PaintSheet.tsx` or `src/features/recipes/RecipeFormSheet.tsx` — form-in-sheet pattern with dirty state and toast feedback (closest analogues)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/units/UnitDetailSheet.tsx` — file being modified; existing `Field` and `BoolIndicator` helper components at the bottom of the file can be reused in the Details tab
- `src/components/ui/tabs.tsx` — Tabs component, already installed, zero setup needed
- `src/components/ui/sheet.tsx` `SheetFooter` — stays outside tabs, wraps Edit/Delete buttons as today
- `sonner` toast — `toast.success()` / `toast.error()` already wired in the app

### Established Patterns
- `key={unit?.id ?? "none"}` on `SheetContent` forces a fresh mount when switching units (Pitfall 6 from Phase 3 polish) — keep this; it means the Playbook form state resets automatically when a different unit is opened
- `0|1` integers for SQLite booleans — not relevant to Playbook fields (all stats are integers, text fields are strings)
- `staleTime: Infinity` on `useStrategyNote` — fetch runs once per unit, no background refetches; rely on `useUpsertStrategyNote` `onSuccess` invalidation to refresh after save

### Integration Points
- `UnitDetailSheet.tsx` — all changes are self-contained in this file plus one new `PlaybookTab.tsx` component extracted into `src/features/units/`
- No router changes, no sidebar changes, no new routes
- `useStrategyNote` and `useUpsertStrategyNote` are the only hooks the Playbook tab needs — no new hooks required

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-unit-playbook*
*Context gathered: 2026-05-02*
