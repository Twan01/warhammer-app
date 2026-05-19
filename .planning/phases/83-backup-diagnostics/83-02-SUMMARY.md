---
phase: 83-backup-diagnostics
plan: 02
subsystem: ui
tags: [collapsible, diagnostics, version-mismatch, progressive-disclosure]

# Dependency graph
requires:
  - phase: 83-01
    provides: BackupStatus.app_version, hasVersionMismatch, app_version persistence
provides:
  - Collapsible diagnostic detail section in BackupCard (age, version, status rows)
  - Version mismatch indicator on DataHealthSummaryCard dashboard
  - 4 new tests covering DGN-01/03/04 diagnostic behaviors
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Collapsible defaultOpen={false} for progressive disclosure"
    - "Mutable vi.fn() mock for per-test hook return value overrides"

key-files:
  created: []
  modified:
    - src/features/data-health/BackupCard.tsx
    - src/features/dashboard/DataHealthSummaryCard.tsx
    - tests/data-health/backupCard.test.tsx

key-decisions:
  - "Version mismatch uses amber (bg-amber-500) not red per D-04 informational"
  - "Never state shows CTA text: No backup -- export one to protect your data"
  - "CollapsibleTrigger is a chevron button with aria-label for accessibility"

patterns-established:
  - "Mutable mock pattern: const mockFn = vi.fn() in vi.mock factory for per-test overrides"

requirements-completed: [DGN-01, DGN-02, DGN-03, DGN-04]

# Metrics
duration: 8min
completed: 2026-05-19
---

# Phase 83 Plan 02: Backup Diagnostic UI Summary

**Collapsible diagnostic detail section in BackupCard with age/version/status rows, dashboard mismatch indicator, and 4 new tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-19T09:03:40Z
- **Completed:** 2026-05-19T09:11:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- BackupCard now has a collapsible diagnostic section (collapsed by default) with 3 detail rows: backup age, app version comparison, and status summary
- Version mismatch row uses amber dot (not red) per D-04 informational design decision
- Never-backed-up state shows prominent CTA: "No backup -- export one to protect your data"
- Healthy state with matching version shows all-green confirmations
- DataHealthSummaryCard shows AlertTriangle icon + "(outdated)" text in amber when version mismatch detected
- 4 new test cases covering progressive disclosure, never-state CTA, and version mismatch display

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Collapsible diagnostic section to BackupCard** - `38915ad` (feat)
2. **Task 2: Add version mismatch indicator to DataHealthSummaryCard + write tests** - `8bf8ed7` (feat)

## Files Created/Modified
- `src/features/data-health/BackupCard.tsx` - Added Collapsible with 3 diagnostic rows (age, version, status), ChevronDown trigger
- `src/features/dashboard/DataHealthSummaryCard.tsx` - Added getVersion() fetch, hasVersionMismatch check, AlertTriangle + "(outdated)" indicator
- `tests/data-health/backupCard.test.tsx` - 4 new tests (DGN-04 hidden/expand, DGN-01 CTA, DGN-03 amber mismatch), refactored mocks to mutable pattern

## Decisions Made
- Version mismatch uses amber (bg-amber-500) not red, per D-04 informational intent
- Never-backed-up expanded status shows "No backup -- export one to protect your data" as a subtle CTA
- CollapsibleTrigger uses a small chevron button with aria-label="Toggle backup details" for accessibility
- Test mocks refactored to mutable vi.fn() pattern for per-test hook return value overrides

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None.

## Self-Check: PASSED

All 3 modified files verified present. Both task commits (38915ad, 8bf8ed7) verified in git log. 1831 tests passing (4 new).

---
*Phase: 83-backup-diagnostics*
*Completed: 2026-05-19*
