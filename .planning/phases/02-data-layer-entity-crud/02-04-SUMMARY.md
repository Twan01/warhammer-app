---
phase: 02-data-layer-entity-crud
plan: "04"
subsystem: ui
tags: [react, react-hook-form, zod, tanstack-query, shadcn, sonner, tauri, sqlite]

# Dependency graph
requires:
  - phase: 02-data-layer-entity-crud plan 02
    provides: useUnits, usePaints, useFactions hooks + entity types (Unit, Paint, Faction) + PAINTING_STATUS_ORDER, PAINT_TYPES
  - phase: 02-data-layer-entity-crud plan 03
    provides: Faction CRUD pattern (Sheet form, zod schema, key= reset, Dialog confirm, FK error toast), FactionSheet/FactionDeleteDialog as reference implementations
provides:
  - Full Unit CRUD UI (UnitSheet two-step form, CategoryCombobox free-text+suggestions, UnitDeleteDialog)
  - Full Paints page UI (PaintsPage list table, PaintSheet form, PaintDeleteDialog FK-aware, PaintsEmptyState)
  - FactionsPage updated to group units per faction with Add/Edit/Delete unit affordances
  - /paints route replaced (placeholder removed, PaintsPage rendered)
  - unitSchema.ts and paintSchema.ts zod schemas covering all UNIT-01..03 and PAINT-01 fields
affects:
  - phase-03-collection (UnitSheet reused for collection entry points)
  - phase-04-paint-inventory (PaintsPage expanded with more columns and recipe links)
  - phase-05-dashboard (unit/paint counts feed dashboard stats)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-step collapsible form layout: required fields always visible, 'More details' toggle via useState reveals optional fields below a Separator"
    - "Command+Popover free-text combobox (CategoryCombobox): suggestions list + Enter key commits typed value not in list"
    - "Boolean coercion both ways: 0|1 from DB coerced to boolean for form (!!unit.status_assembly), boolean coerced back to 0|1 for DB write (values.status_assembly ? 1 : 0)"
    - "Per-faction unit grouping: useUnits() + useMemo to group by faction_id, one Card per faction in FactionsPage"
    - "FK error detection: catch block checks err.message.toLowerCase().includes('foreign key') to show domain-specific toast"

key-files:
  created:
    - src/features/units/unitSchema.ts
    - src/features/units/CategoryCombobox.tsx
    - src/features/units/UnitSheet.tsx
    - src/features/units/UnitDeleteDialog.tsx
    - src/features/paints/paintSchema.ts
    - src/features/paints/PaintsEmptyState.tsx
    - src/features/paints/PaintRow.tsx
    - src/features/paints/PaintSheet.tsx
    - src/features/paints/PaintDeleteDialog.tsx
    - src/features/paints/PaintsPage.tsx
  modified:
    - src/features/factions/FactionsPage.tsx
    - src/features/factions/FactionRow.tsx
    - src/app/paints/page.tsx

key-decisions:
  - "UnitSheet two-step layout locked per CONTEXT.md: name/faction/category required top, all 13 optional fields in collapsible More details section below Separator"
  - "CategoryCombobox uses Command+Popover (shadcn primitives) with shouldFilter — Enter on free-text commits typed value, CommandEmpty provides click-to-commit fallback"
  - "FactionRow.tsx converted to FactionCard export accepting faction+units+callbacks; FactionsPage uses per-faction Card layout (not Table) to accommodate unit sub-lists"
  - "PaintRow includes hex_color swatch as an additional deviation (Rule 2) — auto-added after Task 2 to make paint identity clearer in the list"
  - "Boolean coercion both ways applied to all 4 unit booleans and 3 paint booleans per Pitfall 1 guidance in RESEARCH.md"

patterns-established:
  - "Two-step collapsible form: use Separator + useState toggle (not shadcn Collapsible which is not installed) for forms with many optional fields"
  - "Free-text combobox: Command+Popover with shouldFilter, onKeyDown Enter handler, CommandEmpty click-to-commit button"
  - "Per-entity grouping: load all entities via hook, useMemo to group, render parent Cards with child lists"

requirements-completed: [UNIT-01, UNIT-02, UNIT-03, UNIT-04, UNIT-05, PAINT-01, PAINT-02]

# Metrics
duration: ~45min (Tasks 1+2 execution) + human-verify approval
completed: 2026-04-30
---

# Phase 2 Plan 04: Unit Form and Paints CRUD Summary

**16-field two-step UnitSheet with CategoryCombobox, full PaintsPage CRUD with FK-blocked delete, and per-faction unit grouping in FactionsPage — all 7 UNIT/PAINT requirements verified end-to-end**

## Performance

- **Duration:** ~45 min execution + human-verify checkpoint
- **Started:** 2026-04-30 (continuation of Phase 2 execution session)
- **Completed:** 2026-04-30T14:09:55Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint — approved)
- **Files modified:** 13 (10 created, 3 modified)

## Accomplishments

- UnitSheet two-step form: required fields (name, faction Select, category Combobox) always visible; "More details" toggle reveals 13 optional fields including all 4 boolean checkboxes, painting_status dropdown in PAINTING_STATUS_ORDER, dates, numbers, notes textarea
- CategoryCombobox (Command+Popover): 10 built-in suggestions with filter, Enter key commits any free-text value, CommandEmpty provides click-to-commit fallback — implements UNIT-01
- FactionsPage refactored from Table to per-faction Cards: each faction shows header + unit sub-list with Add Unit / Edit Unit / Delete Unit affordances; FactionRow.tsx converted to FactionCard export
- PaintsPage replaces Phase 1 placeholder: 6 seeded paints visible with Owned badges, Add/Edit via Sheet, Delete via Dialog with FK error toast for recipe-referenced paints (PAINT-02)
- Boolean coercion applied in both directions for all 4 unit booleans and 3 paint booleans (Pitfall 1 — DB stores 0|1, form uses true/false)
- Human-verify checkpoint: all 14 sign-off criteria passed — persistence, stale-data prevention (Pitfall 3), FK enforcement, model_instances absence all confirmed at runtime

## Task Commits

1. **Task 1: Build Unit form, schema, combobox, delete dialog, surface in FactionsPage** - `18ad5fd` (feat)
2. **Task 2: Build Paints page with list, sheet form, delete dialog, empty state** - `7267a37` (feat)
3. **Deviation: Add hex_color swatch to paint list rows** - `00f36c9` (feat — Rule 2 auto-add)
4. **Task 3: Human-verify checkpoint** - approved (no commit — verification only)

**Plan metadata:** (this commit)

## Files Created/Modified

**Created:**
- `src/features/units/unitSchema.ts` - Zod schema for all UNIT-01..03 fields; PAINTING_STATUS_ORDER enum, boolean defaults, nullable optionals
- `src/features/units/CategoryCombobox.tsx` - Free-text + suggestions combobox via Command+Popover; 10 suggestions + Enter-to-commit free text (UNIT-01)
- `src/features/units/UnitSheet.tsx` - Two-step Sheet form: required section (name/faction/category) + More details collapsible (13 optional fields); useEffect reset (Pitfall 3); boolean coercion both ways (Pitfall 1)
- `src/features/units/UnitDeleteDialog.tsx` - Dialog confirm for unit delete; "Unit deleted." toast on success
- `src/features/paints/paintSchema.ts` - Zod schema for all PAINT-01 fields; boolean defaults, nullable optionals, hex_color regex validation
- `src/features/paints/PaintsEmptyState.tsx` - Centered Droplets icon + "No paints yet" heading + "Add paints..." body + CTA
- `src/features/paints/PaintRow.tsx` - Table row: Name | Brand | Type | Owned badge + hex_color swatch + Edit/Delete actions
- `src/features/paints/PaintSheet.tsx` - Sheet form with all PAINT-01 fields (brand/name/type/color_family/hex_color/owned/quantity/running_low/wishlist/notes); useEffect reset; boolean coercion
- `src/features/paints/PaintDeleteDialog.tsx` - Dialog confirm with FK detection: "Cannot delete paint — it's used in a recipe step." (PAINT-02)
- `src/features/paints/PaintsPage.tsx` - Page composition: header + Add Paint CTA + skeleton loader + table + empty state + Sheet + Dialog state management

**Modified:**
- `src/features/factions/FactionsPage.tsx` - Refactored to per-faction Card layout; useUnits() + useMemo grouping; UnitSheet + UnitDeleteDialog wired; Add Unit / Edit Unit / Delete Unit affordances
- `src/features/factions/FactionRow.tsx` - Converted from Table row to FactionCard: accepts faction + units + callbacks; renders Card with color border, unit sub-list, Add Unit button
- `src/app/paints/page.tsx` - Replaced PlaceholderPage with thin wrapper rendering PaintsPage

## Decisions Made

- UnitSheet two-step layout locked per CONTEXT.md: required fields always visible, "More details" toggle via useState (not shadcn Collapsible which is not installed in this repo)
- CategoryCombobox: shouldFilter on Command + Enter handler on CommandInput + CommandEmpty button — provides both keyboard and mouse commit paths for free text
- FactionRow.tsx converted to FactionCard export (renamed component, same file) to accept units and callbacks without breaking import structure
- hex_color swatch auto-added to PaintRow (Rule 2 deviation) — essential for paint identification in list view, especially for paints with similar names/brands
- Zod schema .nullable().optional() pattern for all optional DB-nullable fields (consistent with paintSchema and unitSchema); empty strings coerced to null in submit handler

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added hex_color swatch to PaintRow**
- **Found during:** Task 2 (PaintRow.tsx implementation)
- **Issue:** Paint rows without visual color preview are hard to distinguish for paints with similar names; hex_color is stored but not surfaced in the list, making the feature incomplete for practical use
- **Fix:** Added a small colored square swatch next to the paint name using the hex_color value; swatch conditionally rendered only when hex_color is present
- **Files modified:** src/features/paints/PaintRow.tsx
- **Verification:** 6 seeded paints displayed correctly; paints with hex_color show swatch, paints without do not
- **Committed in:** 00f36c9 (post-Task-2 auto-fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical visual affordance)
**Impact on plan:** Auto-fix added paint identification UX without scope creep. No architectural changes.

## Issues Encountered

None beyond the Rule 2 deviation above. TypeScript and Vite build passed after both tasks. Human-verify checkpoint passed on first attempt with all 14 criteria met.

## Phase 2 Success Criteria Status

| Criterion | Description | Plan | Status |
|-----------|-------------|------|--------|
| 1 | Faction CRUD (list, create, edit, delete) — FK enforcement on delete | 02-03 | COMPLETE (verified in 02-03 checkpoint) |
| 2 | User can create a unit with all required fields; unit persists after restart | 02-04 | COMPLETE (verified steps 2-3) |
| 3 | User can create/delete a paint; deleting a paint in a recipe is blocked | 02-04 | COMPLETE (verified steps 8, 10, 11) |
| 4 | 4 seeded factions, 5 units, 6 paints, 3 recipes visible in app | 02-02/02-03/02-04 | COMPLETE (verified steps 1, 8) |
| 5 | model_instances table does NOT exist in schema | 02-01/02-04 | COMPLETE (DevTools verified in step 13) |

All 5 Phase 2 success criteria are satisfied. Phase 2 is complete.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All Phase 2 entity CRUD complete: Factions, Units, Paints with full create/read/update/delete
- UnitSheet can be reused directly in Phase 3 (Collection page) — same two-step layout, same hooks
- PaintsPage ready for Phase 4 expansion (more columns, recipe links, paint usage counts)
- All 10 DB tables populated with seed data; FK relationships enforced at runtime
- TanStack Query cache invalidation wired for all 5 entities including dashboard-stats key (DATA-09 forward compatibility)
- Phase 3 (Collection) can start immediately — no blockers

---
*Phase: 02-data-layer-entity-crud*
*Completed: 2026-04-30*

## Self-Check: PASSED

All 13 files verified present on disk. All 3 task commits verified in git history (18ad5fd, 7267a37, 00f36c9).
