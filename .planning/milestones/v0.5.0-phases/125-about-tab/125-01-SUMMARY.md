---
phase: 125-about-tab
plan: "01"
subsystem: settings
tags: [about-tab, settings, version-display, attribution]
dependency_graph:
  requires: [121-01]
  provides: [AboutTab component, ABT-01, ABT-02, ABT-03]
  affects: [src/app/settings/page.tsx]
tech_stack:
  added: []
  patterns: [useState/useEffect for async version, three-branch render for nullable hook data, locale-aware date formatting]
key_files:
  created:
    - src/features/settings/AboutTab.tsx
    - tests/settings/AboutTab.test.tsx
  modified:
    - src/app/settings/page.tsx
    - tests/settings/SettingsPage.test.tsx
decisions:
  - "Date test uses locale-agnostic function matcher instead of English month regex (system locale is French)"
  - "Version section uses div.flex instead of p > div to avoid invalid HTML nesting (Skeleton renders as div)"
metrics:
  duration: "7min"
  completed_date: "2026-06-10"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 125 Plan 01: About Tab Summary

**One-liner:** Read-only About tab with app version via `getVersion()`, unit/faction stats from `useUdbMeta()`, and Wahapedia attribution — no card wrappers, three stacked sections, 9 tests covering ABT-01/02/03.

## What Was Built

### Task 1: Create AboutTab tests and component (TDD)

Created `src/features/settings/AboutTab.tsx` — a named-export component rendering three stacked sections in a `space-y-6` div (D-01, D-02):

- **Section 1 — App Identity:** h2 "HobbyForge", one-line description, async version loaded via `useState<string | null>(null)` + `useEffect(() => getVersion().then(setAppVersion))`. Skeleton while null, `font-mono` span when loaded.
- **Section 2 — Data Stats:** `useUdbMeta()` with three-branch render: Skeleton div while `udbMetaLoading`, formatted counts + `formatBuiltAt(built_at)` when data present, "Not imported yet" when null.
- **Section 3 — Credits:** Wahapedia attribution paragraph (no clickable links per D-05), "Tauri 2, React, TypeScript, SQLite" tech stack.

`formatBuiltAt` helper co-located in `AboutTab.tsx` (copied from `VersionInfoCard.tsx`, not imported).

Created `tests/settings/AboutTab.test.tsx` with 9 tests covering all three requirements (ABT-01, ABT-02, ABT-03).

### Task 2: Integrate AboutTab into SettingsPage

- `src/app/settings/page.tsx`: Added `AboutTab` import; replaced placeholder h2+p in `TabsContent value="about"` with `<AboutTab />`.
- `tests/settings/SettingsPage.test.tsx`: Added `vi.mock("@tauri-apps/api/app")` and `vi.mock("@/hooks/useUdbMeta")` after the existing `useAppSettings` mock to prevent async hook errors in the SettingsPage test environment.

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| tests/settings/AboutTab.test.tsx | 9 | PASS |
| tests/settings/SettingsPage.test.tsx | 5 | PASS |
| TypeScript compilation | — | CLEAN |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed invalid HTML: `<div>` inside `<p>` for version Skeleton**
- **Found during:** Task 1 GREEN phase
- **Issue:** Plan spec showed Skeleton inside a `<p>` tag, but `Skeleton` renders as a `<div>` which is invalid inside `<p>`. React reported hydration warning.
- **Fix:** Changed the version row from `<p>` to `<div className="flex items-center gap-2">`.
- **Files modified:** `src/features/settings/AboutTab.tsx`
- **Commit:** 1669a07

**2. [Rule 1 - Bug] Fixed locale-dependent date regex in test**
- **Found during:** Task 1 GREEN phase — test failed because system locale is French ("20 mai 2026" not "May 20, 2026")
- **Issue:** Test used `/May.*2026|2026.*May/` regex which only matches English locale.
- **Fix:** Replaced regex with a function matcher checking for "Data date:" and "2026" substrings (locale-agnostic).
- **Files modified:** `tests/settings/AboutTab.test.tsx`
- **Commit:** 1669a07

## Known Stubs

None. All three sections render real data from Tauri's `getVersion()` and `useUdbMeta()`.

## Threat Flags

None. This tab is read-only, renders no user input, makes no mutations, and accesses only internal app data (version string, aggregate counts). Confirmed safe per plan threat model.

## Self-Check: PASSED

- [x] `src/features/settings/AboutTab.tsx` exists
- [x] `tests/settings/AboutTab.test.tsx` exists
- [x] `src/app/settings/page.tsx` modified (AboutTab imported + integrated)
- [x] `tests/settings/SettingsPage.test.tsx` modified (two vi.mock blocks added)
- [x] Commit 1669a07 exists (Task 1)
- [x] Commit 8d852c9 exists (Task 2)
- [x] All 14 tests pass
- [x] TypeScript compilation clean
