---
phase: 03-collection-module
plan: "00"
subsystem: testing
tags: [vitest, jsdom, testing-library, react, typescript]

# Dependency graph
requires:
  - phase: 02-data-layer-entity-crud
    provides: established project structure (src/, tsconfig.json, vite.config.ts, package.json)
provides:
  - vitest 4.1.5 test framework with jsdom environment installed and configured
  - tests/setup.ts with @testing-library/jest-dom matchers and afterEach cleanup
  - vitest.config.ts with @ alias, jsdom env, globals, setupFiles
  - four stub test files covering all Phase 3 automated test requirements (COLL-02..07, COLL-10, COLL-12, POLISH-02, POLISH-05)
  - pnpm test script (vitest run) as canonical phase-gate command
affects:
  - 03-01-collection-page (fills UnitTable and collectionFilters stubs)
  - 03-02-filter-bar (fills unitFilters stubs)
  - 03-03-status-popover (fills StatusPopover stubs)

# Tech tracking
tech-stack:
  added:
    - vitest@4.1.5
    - "@testing-library/react@16.3.2"
    - "@testing-library/jest-dom@6.9.1"
    - jsdom@29.1.1
    - "@vitest/ui@4.1.5"
  patterns:
    - vitest globals:true (describe/it/expect without imports in test files)
    - afterEach cleanup pattern for React Testing Library renders
    - it.skip stubs for Wave 0 — Wave N+ fills test bodies in-place without restructuring

key-files:
  created:
    - vitest.config.ts
    - tests/setup.ts
    - tests/collection/unitFilters.test.ts
    - tests/collection/collectionFilters.test.ts
    - tests/collection/StatusPopover.test.ts
    - tests/collection/UnitTable.test.ts
  modified:
    - package.json
    - tsconfig.json
    - pnpm-lock.yaml

key-decisions:
  - "vitest 4.1.5 exits code 1 when zero test files found (changed from vitest 3.x behavior of exit 0) — resolved by Task 3 always creating stubs first"
  - "globals: true in vitest.config.ts so test stubs need no imports — satisfies tsconfig noUnusedLocals constraint"
  - "@vitest/ui installed alongside vitest for optional interactive browser mode during development"

patterns-established:
  - "Wave 0 stub pattern: create it.skip() stubs with exact test-name strings matching VALIDATION.md -t filters; Wave N+ plans fill bodies in-place"
  - "Test directory at tests/ (not src/__tests__) to keep test concerns outside src/ build boundary"
  - "tsconfig.json includes tests/ so TypeScript strict-mode checks test files"

requirements-completed: []

# Metrics
duration: 4min
completed: "2026-05-01"
---

# Phase 3 Plan 00: Test Infrastructure (Wave 0) Summary

**Vitest 4.1.5 + jsdom + @testing-library/react installed with four stub test files covering all 10 Phase 3 automated requirements (COLL-02..07, COLL-10, COLL-12, POLISH-02, POLISH-05) — pnpm vitest run exits 0**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-01T07:13:42Z
- **Completed:** 2026-05-01T07:17:49Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Installed vitest@4.1.5, @testing-library/react@16.3.2, @testing-library/jest-dom@6.9.1, jsdom@29.1.1, @vitest/ui@4.1.5 as devDependencies
- Created vitest.config.ts (jsdom environment, globals:true, @ alias mirroring vite.config.ts, setupFiles pointing to tests/setup.ts)
- Created tests/setup.ts (imports @testing-library/jest-dom/vitest matchers, afterEach cleanup)
- Updated tsconfig.json to include tests/ directory and vitest/globals + @testing-library/jest-dom types
- Created 4 stub test files with 20 it.skip() stubs covering every Phase 3 automated requirement

## Task Commits

1. **Task 1: Install vitest + testing-library devDependencies** - `5f1ec95` (chore)
2. **Task 2: Create vitest.config.ts and tests/setup.ts** - `0e92933` (chore)
3. **Task 3: Create four stub test files** - `40a4173` (test)

## Files Created/Modified

- `vitest.config.ts` - Vitest config: jsdom env, globals, setupFiles, @ alias, verbose reporter
- `tests/setup.ts` - Jest-dom matchers import + afterEach cleanup hook
- `tests/collection/unitFilters.test.ts` - COLL-02..06: search/faction/status/category/active stubs
- `tests/collection/collectionFilters.test.ts` - COLL-07: Zustand store stubs (7 it.skip)
- `tests/collection/StatusPopover.test.ts` - COLL-10: optimistic update + rollback stubs (4 it.skip)
- `tests/collection/UnitTable.test.ts` - COLL-12/POLISH-02/POLISH-05: loading/empty/faction badge stubs
- `package.json` - Added vitest devDeps + scripts.test/test:watch
- `tsconfig.json` - Added types array, added "tests" to include array
- `pnpm-lock.yaml` - Updated with new devDependencies

## Decisions Made

- vitest 4.1.5 exits code 1 when zero test files found (changed from vitest 3.x behavior). Task 3 stub files resolve this — `pnpm vitest run` now exits 0 with 4 files / 20 tests all skipped.
- `globals: true` in vitest.config.ts eliminates need to import describe/it/expect in every test file, which satisfies tsconfig `noUnusedLocals` constraint (no unused import statements in stub files).
- `@vitest/ui` installed for interactive browser-based test runner during development (optional — doesn't affect CI path).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **vitest 4.x exit code change:** Plan acceptance criteria for Task 2 said "`pnpm vitest run` exits 0 with 'No test files found, exiting with code 0'". In vitest 4.1.5, the exit code is 1 when no test files exist (behavior changed from 3.x). This was a non-issue because Task 3 immediately creates the stub files, and after Task 3 `pnpm vitest run` exits 0. No fix required.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Wave 1 plans (03-01 collection page, 03-02 filter bar) can author real test bodies directly inside existing stub files without restructuring file paths
- VALIDATION.md sampling commands all verified working: `pnpm vitest run tests/collection/unitFilters.test.ts -t "search"` etc. all exit 0
- `pnpm test` is the canonical phase-gate command from repo root

---
*Phase: 03-collection-module*
*Completed: 2026-05-01*
