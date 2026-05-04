---
phase: 12-collection-gallery-view
plan: "01"
subsystem: ui
tags: [react, svg, localStorage, hooks, vitest, testing-library]

# Dependency graph
requires:
  - phase: 12-00
    provides: Wave 0 stub files (PaintingRing.test.tsx with 3 it.skip, UnitGallery.test.tsx with 6 it.skip)
provides:
  - useCollectionViewMode hook (localStorage-backed 'table'|'gallery' state, UI-04)
  - PaintingRing SVG component (96x96 circular progress ring, UI-05)
  - 3 passing PaintingRing unit tests (percentage text, aria-label, dashoffset math)
affects:
  - 12-02 (consumes both primitives — wires them into UnitGallery + CollectionPage)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "localStorage hook pattern: synchronous read in useState initializer + useEffect write + try/catch silent degradation + SSR guard (mirrors useSidebarCollapsed.ts)"
    - "SVG stroke color via stroke='currentColor' + className='text-primary' (Tailwind v4 Pitfall 1 workaround)"
    - "SVG text fill via fill='currentColor' + className for resilient color inheritance (Open Question 2 pattern)"

key-files:
  created:
    - src/hooks/useCollectionViewMode.ts
    - src/components/common/PaintingRing.tsx
  modified:
    - tests/collection/PaintingRing.test.tsx

key-decisions:
  - "useCollectionViewMode parse guard: only 'gallery' literal accepted — anything else (including 'table', null, or unknown) defaults to 'table'"
  - "PaintingRing stroke color uses stroke='currentColor' + className='text-primary' NOT stroke-primary utility (Tailwind v4 stroke-* utilities don't apply directly to SVG stroke)"
  - "PaintingRing text fill uses fill='currentColor' (Open Question 2 resilient pattern — both className and fill attribute set)"
  - "No unit test for useCollectionViewMode hook — behavior verified end-to-end by UnitGallery toggle tests in Plan 12-02 (same pattern as useSidebarCollapsed.ts which has no standalone hook test)"

patterns-established:
  - "SVG ring: 2*PI*r dasharray with offset = circumference*(1 - pct/100), rotate(-90 cx cy) for 12-o-clock start"
  - "Pitfall 5 guard: const pct = percentage ?? 0 at top of function prevents NaN% from nullish callers"

requirements-completed:
  - UI-04
  - UI-05

# Metrics
duration: 4min
completed: 2026-05-03
---

# Phase 12 Plan 01: Collection Gallery Primitives Summary

**useCollectionViewMode localStorage hook (UI-04) + PaintingRing SVG ring component (UI-05) with 3 passing unit tests — both primitives ready for Plan 12-02 composition**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-03T12:01:56Z
- **Completed:** 2026-05-03T12:05:41Z
- **Tasks:** 3 completed
- **Files modified:** 3

## Accomplishments

- Created `useCollectionViewMode` hook mirroring `useSidebarCollapsed.ts` exactly — localStorage round-trip with 'table'|'gallery' union type, default 'table', SSR-safe, try/catch silent degradation on both read and write
- Created `PaintingRing` SVG component — 96x96 viewBox, zinc-600 track circle, primary-colored progress arc via currentColor+text-primary (Pitfall 1 workaround), rotate(-90) for 12-o-clock start, centered percentage text, role=img + aria-label for accessibility
- Flipped 3 `it.skip` stubs in PaintingRing.test.tsx to passing real tests — covers UI-05 percentage text content, aria-label/role=img, and dashoffset=0 at full-ring boundary

## Task Commits

1. **Task 1: useCollectionViewMode hook** - `5b5d138` (feat)
2. **Task 2: PaintingRing SVG component** - `01dbc89` (feat)
3. **Task 3: PaintingRing tests flipped to passing** - `035fbf9` (test)

## Files Created/Modified

- `src/hooks/useCollectionViewMode.ts` — New 38-LOC localStorage hook; exports `useCollectionViewMode()` returning readonly ['table'|'gallery', setter]; Plan 12-02 wires into CollectionPage
- `src/components/common/PaintingRing.tsx` — New 75-LOC SVG component; exports `PaintingRing({ percentage })`; Plan 12-02 embeds in UnitGallery cards via `<PaintingRing percentage={unit.painting_percentage} />`
- `tests/collection/PaintingRing.test.tsx` — 3 stubs replaced with real test bodies; 3 passing (was 3 skipped)

## Decisions Made

- useCollectionViewMode parse guard accepts only the literal string `'gallery'` — any other localStorage value (including `'table'`, null, garbage) defaults to `'table'`. This prevents stale/corrupted storage from breaking the UI.
- PaintingRing progress arc color: `stroke="currentColor"` + `className="text-primary"` is the correct Tailwind v4 pattern (stroke-primary utility does not apply to SVG stroke attributes in Tailwind v4 — Pitfall 1).
- PaintingRing text fill: `fill="currentColor"` attribute applied alongside className for resilient color inheritance in jsdom test environments (Open Question 2 pattern).
- No standalone unit test for useCollectionViewMode — the hook contract (localStorage persistence, toggle behavior, view mode survival across remount) is verified end-to-end by the 3 UnitGallery toggle tests in Plan 12-02.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `useCollectionViewMode()` ready to import in CollectionPage — `const [viewMode, setViewMode] = useCollectionViewMode()`
- `<PaintingRing percentage={unit.painting_percentage} />` ready to embed in UnitGallery gallery cards
- 6 UnitGallery test stubs remain skipped — Plan 12-02 flips them after wiring UnitGallery + CollectionPage
- Full suite: 222 passing, 6 skipped, 0 failed; tsc clean

---
*Phase: 12-collection-gallery-view*
*Completed: 2026-05-03*
