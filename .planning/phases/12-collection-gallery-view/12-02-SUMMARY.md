---
phase: 12-collection-gallery-view
plan: "02"
subsystem: collection-ui
tags: [gallery, view-toggle, unit-cards, painting-ring, zustand, ui-04, ui-05, ui-06]
dependency_graph:
  requires:
    - 12-00 (UnitGallery.test.tsx stubs)
    - 12-01 (useCollectionViewMode hook + PaintingRing component)
  provides:
    - UnitGallery responsive card grid component
    - CollectionPage view toggle (table/gallery)
    - 6 passing integration tests for UI-04/05/06
  affects:
    - src/features/units/CollectionPage.tsx (wired)
    - tests/collection/UnitGallery.test.tsx (activated)
tech_stack:
  added: []
  patterns:
    - Responsive CSS grid with Tailwind (grid-cols-2 md:grid-cols-3 lg:grid-cols-4)
    - tailwind-merge cn() override for Card defaults (gap-6/py-6 → gap-2/pt-4/pb-4)
    - role=button + tabIndex=0 + onKeyDown e.preventDefault() for Space (Pitfall 4 pattern)
    - Zustand getState()/setState() in tests for filter store seeding + assertion
key_files:
  created:
    - src/features/units/UnitGallery.tsx
  modified:
    - src/features/units/CollectionPage.tsx
    - tests/collection/UnitGallery.test.tsx
decisions:
  - "Pitfall 3 (Card defaults): cn() + tailwind-merge correctly overrides gap-6/py-6 — plain <div> fallback NOT needed; Card className override worked as expected"
  - "mockFaction type required game_system + description fields (plan template was missing these) — auto-corrected per Rule 1"
  - "useRouter warning in CollectionPage tests is benign — UnitDetailSheet only calls useRouter when open; tests never open the sheet"
metrics:
  duration_seconds: 230
  completed_date: "2026-05-03"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 12 Plan 02: UnitGallery + CollectionPage View Toggle Summary

**One-liner:** Responsive gallery card grid (UnitGallery) wired into CollectionPage with localStorage-persistent view toggle (useCollectionViewMode), delivering UI-04/05/06 with 6 new passing tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create UnitGallery.tsx (UI-05 card grid) | c05e96d | src/features/units/UnitGallery.tsx (new, 121 LOC) |
| 2 | Wire useCollectionViewMode + UnitGallery into CollectionPage (UI-04) | 3f677c6 | src/features/units/CollectionPage.tsx (+35 lines) |
| 3 | Replace 6 it.skip stubs with real test bodies (UI-04/05/06) | 0218cb1 | tests/collection/UnitGallery.test.tsx (180 insertions) |

## What Was Built

**UnitGallery component** (`src/features/units/UnitGallery.tsx`, ~121 LOC):
- 7-prop interface: `data`, `factions`, `isLoading`, `hasActiveFilters`, `onRowClick`, `onAdd`, `onClearFilters`
- Responsive grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4` with alphabetical sort (useMemo)
- factionMap lookup (O(1) per card) built from `factions` prop via useMemo
- Per-card composition (top-to-bottom): PaintingRing(96px) → name → faction Badge with `data-testid="faction-badge"` + `style={{ backgroundColor: faction.color_theme }}` → status_painting → model_count/points line → Flame icon (only when `is_active_project === 1`)
- Loading state: 8-card skeleton grid with `data-testid="gallery-skeleton-card"`
- Empty state: `<CollectionEmptyState mode={hasActiveFilters ? 'filtered' : 'no-data'} ...>`
- Keyboard accessibility: `role="button"` + `tabIndex={0}` + `aria-label={unit.name}` + `onKeyDown` intercepts Enter and Space with `e.preventDefault()` (Pitfall 4)
- Card override: `className="flex flex-col items-center px-4 pt-4 pb-4 gap-2 cursor-pointer hover:bg-muted/50"` — cn() correctly overrides Card's default `gap-6 py-6` via tailwind-merge (Pitfall 3 resolved)

**CollectionPage wiring** (4 surgical edits):
1. `import { Plus, LayoutList, LayoutGrid } from "lucide-react"` (LayoutList/LayoutGrid added)
2. Two new imports: `useCollectionViewMode` + `UnitGallery`
3. `const [viewMode, setViewMode] = useCollectionViewMode()` hook call
4. Header row toggle buttons (`aria-label="Table view"/"Gallery view"`, `bg-muted` active class) + ternary conditional render (`viewMode === "gallery" ? <UnitGallery ...> : <UnitTable ...>`)

**Test suite** (6 tests, 0 mocks of SUT hooks):
- UI-04: toggle buttons present, click flips `bg-muted`, localStorage pre-set reads synchronously
- UI-05: card renders name + badge with inline `backgroundColor: "#1e40af"` + PaintingRing with correct aria-label and text; click calls `onRowClick(mockUnit)`
- UI-06: Zustand `useCollectionFilters` store seeded before render, search + factions preserved after gallery→table→gallery toggle cycle

## Verification Results

- `pnpm tsc --noEmit`: exit 0 (clean)
- `pnpm test -- --run tests/collection/UnitGallery.test.tsx`: 6/6 passing
- `pnpm test` (full suite): 228 passing, 0 skipped, 0 failed
  - Baseline 222 + 3 PaintingRing (Plan 12-01) + 6 UnitGallery (this plan) = 228 confirmed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] mockFaction missing required Faction type fields**
- **Found during:** Task 3 — TypeScript strict mode would reject the test file
- **Issue:** The plan's mockFaction template omitted `game_system: string` and `description: string | null` fields required by the Faction interface
- **Fix:** Added `game_system: "Warhammer 40K"` and `description: null` to mockFaction before writing the test file
- **Files modified:** `tests/collection/UnitGallery.test.tsx`
- **Commit:** 0218cb1

### Out-of-scope Observations

None.

## Pitfall Resolution Log

- **Pitfall 3 (Card defaults gap-6 py-6):** Card uses `cn("flex flex-col gap-6 rounded-xl border bg-card py-6 ...", className)` — tailwind-merge correctly drops `gap-6` in favor of `gap-2` and `py-6` in favor of `pt-4 pb-4` when override className is appended. Plain `<div>` fallback was NOT needed.
- **Pitfall 4 (Space key default scroll):** `e.preventDefault()` on `e.key === " "` applied in all card `onKeyDown` handlers as specified.
- **Pitfall 5 (NaN guard):** `unit.painting_percentage ?? 0` applied at every PaintingRing call site.
- **Pitfall 6 (matchMedia polyfill):** Confirmed unnecessary — no test assertions or warnings required it; gallery has no animation dependency.

## Self-Check: PASSED

- `src/features/units/UnitGallery.tsx`: FOUND
- `src/features/units/CollectionPage.tsx`: FOUND (contains `viewMode === "gallery"`, `useCollectionViewMode`, `UnitGallery`)
- `tests/collection/UnitGallery.test.tsx`: FOUND (0 `it.skip`, 6 `it(`)
- Commit c05e96d: FOUND
- Commit 3f677c6: FOUND
- Commit 0218cb1: FOUND
