---
phase: 94-list-export
plan: 01
subsystem: export
tags: [clipboard, jspdf, tauri-plugin, army-list, formatting]

requires:
  - phase: 89-schema-data-layer
    provides: ArmyListUnitRow type, effective_points, ghost units, leader attachment, is_warlord
  - phase: 92-leader-attachment
    provides: Leader pair grouping logic (D-07 client-side reorder)
provides:
  - "Tauri clipboard-manager plugin registered (Cargo + lib.rs + capabilities)"
  - "write_bytes_to_path Rust command for PDF binary export"
  - "fs:scope expanded for user-chosen save-dialog paths"
  - "formatArmyListForExport utility with leader pair grouping"
  - "buildClipboardText tournament-style text formatter"
  - "buildJsonFormat versioned JSON export formatter"
  - "slugify and dateStamp filename utilities"
affects: [94-02, 94-03]

tech-stack:
  added: ["@tauri-apps/plugin-clipboard-manager@2.3.2", "jspdf@4.2.1", "jspdf-autotable@5.0.8", "tauri-plugin-clipboard-manager (Rust)"]
  patterns: ["Pure export formatting utility consumed by multiple output formats", "Rust command for binary file write bypassing fs scope"]

key-files:
  created:
    - src/lib/exportArmyList.ts
    - tests/lib/exportArmyList.test.ts
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/src/lib.rs
    - src-tauri/capabilities/default.json
    - package.json

key-decisions:
  - "Used -- separator in clipboard text (not em dash) for plain-text compatibility"
  - "Leader label placed on target ExportUnit, not on leader unit itself"
  - "write_bytes_to_path Rust command bypasses fs scope for PDF binary writes"

patterns-established:
  - "Export formatting: pure function transforms DB rows to ExportData, consumed by all format builders"
  - "Filename sanitization: slugify() strips non-alphanumeric + path traversal before save dialog"

requirements-completed: [EXP-01, EXP-02, EXP-03, EXP-04]

duration: 9min
completed: 2026-05-21
---

# Phase 94 Plan 01: Export Foundation Summary

**Clipboard-manager + jsPDF + jspdf-autotable installed, Tauri plugin registered, pure export formatting utility with 28 passing tests covering leader pair grouping, ghost marking, warlord tagging, and JSON schema**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-21T06:39:02Z
- **Completed:** 2026-05-21T06:48:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed 3 npm packages and 1 Rust crate for clipboard and PDF export capabilities
- Registered Tauri clipboard-manager plugin with proper capability permissions
- Created shared export formatting utility with 5 pure functions and full test coverage (28 tests)
- Added write_bytes_to_path Rust command for PDF binary export (bypasses fs scope)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and register Tauri clipboard plugin** - `99d0a8f` (chore)
2. **Task 2 RED: Add failing tests for export formatting** - `5d9476e` (test)
3. **Task 2 GREEN: Implement export formatting utility** - `d0076fd` (feat)

## Files Created/Modified
- `src/lib/exportArmyList.ts` - Pure export formatting functions (formatArmyListForExport, buildClipboardText, buildJsonFormat, slugify, dateStamp)
- `tests/lib/exportArmyList.test.ts` - 28 test cases covering all export functions
- `src-tauri/Cargo.toml` - Added tauri-plugin-clipboard-manager dependency
- `src-tauri/src/lib.rs` - Registered clipboard plugin + write_bytes_to_path command
- `src-tauri/capabilities/default.json` - Added clipboard-manager:allow-write-text, fs:allow-write-text-file, fs:scope
- `package.json` - Added @tauri-apps/plugin-clipboard-manager, jspdf, jspdf-autotable

## Decisions Made
- Used `--` separator in clipboard text instead of em dash for universal plain-text compatibility across Discord/forum pastes
- Leader label (e.g., "Led by: Captain -- 80pts") is placed on the target unit's ExportUnit, not on a separate leader row — keeps the sorted array flat while preserving grouping info
- write_bytes_to_path Rust command bypasses fs capability scope entirely for binary writes, matching the existing backup export pattern

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED gate: `5d9476e` (test commit with 28 test cases, all failing due to missing module)
- GREEN gate: `d0076fd` (feat commit implementing all functions, 28/28 tests passing)
- REFACTOR gate: skipped (code clean on first pass, no refactoring needed)

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 5 export functions available for Plan 02 (ExportDropdown UI + clipboard/JSON/PDF handlers)
- Tauri clipboard plugin fully registered and permitted
- fs scope expanded for save-dialog paths (JSON writeTextFile)
- write_bytes_to_path ready for PDF binary export
- jsPDF + jspdf-autotable available for lazy-load dynamic import

---
*Phase: 94-list-export*
*Completed: 2026-05-21*
