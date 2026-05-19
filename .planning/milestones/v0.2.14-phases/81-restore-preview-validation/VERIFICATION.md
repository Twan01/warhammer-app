---
phase: 81-restore-preview-validation
verified: 2026-05-18T21:50:00Z
status: human_needed
score: 9/9
overrides_applied: 0
human_verification:
  - test: "Click Restore from Backup button on Data Health page and verify native file picker opens filtered to .zip files"
    expected: "OS-native file dialog appears with filter showing only .zip files"
    why_human: "Native OS dialog cannot be tested programmatically in jsdom environment"
  - test: "Select a valid backup .zip and verify the preview dialog renders with correct manifest fields and styling"
    expected: "AlertDialog shows backup date (relative + ISO), app version, schema version with colored badge, platform (capitalized), database size (human-readable). Layout matches UI-SPEC grid."
    why_human: "Visual styling verification (badge colors, banner colors, layout) requires human eyes"
  - test: "Select a backup with newer schema version and verify error banner and disabled button"
    expected: "Red error banner with ShieldAlert icon reads 'Update the app before restoring'. Replace current database button is visually disabled (grayed out)."
    why_human: "Visual state of disabled destructive button and red banner styling requires human verification"
  - test: "Select a backup with older schema version and verify warning banner and enabled button"
    expected: "Amber warning banner with AlertTriangle icon reads 'Some data may need migration after restore'. Replace current database button is enabled."
    why_human: "Amber vs red banner color distinction is visual"
---

# Phase 81: Restore Preview + Validation Verification Report

**Phase Goal:** Users can select a backup file and see a safe, informative preview of what will be restored before committing to anything destructive
**Verified:** 2026-05-18T21:50:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking "Restore from Backup" opens file picker filtered to .zip | VERIFIED | BackupCard.tsx L79-84: `openDialog({ multiple: false, directory: false, filters: [{ name: "Backup Archive", extensions: ["zip"] }] })`. Test #2 confirms filter assertion. |
| 2 | After selecting a file, app validates manifest via Rust backend | VERIFIED | BackupCard.tsx L90-91: `invoke<BackupManifest>("validate_backup", { path: result })` followed by `invoke<number>("get_schema_version")`. Test #4 confirms invoke called with correct args. |
| 3 | Preview shows backup date, app version, schema version, platform, database size | VERIFIED | RestorePreviewDialog.tsx L78-133: 5-row grid with "Created", "App Version", "Schema Version", "Platform", "Database Size" labels. Test #7 asserts all 5 labels present. |
| 4 | No data is modified during preview (non-destructive) | VERIFIED | BackupCard.tsx handleConfirmRestore (L107-111) only shows placeholder toast per D-13. No DB writes, no file operations. Actual restore is Phase 82. |
| 5 | Newer schema version is rejected: disabled button + error banner | VERIFIED | RestorePreviewDialog.tsx L136-143: red banner with "Update the app before restoring" when schemaState==="newer". L159: `disabled={schemaState === "newer"}`. Tests #8 and #9 confirm. |
| 6 | Older schema version shows warning but allows continue | VERIFIED | RestorePreviewDialog.tsx L145-153: amber banner with "Some data may need migration after restore" when schemaState==="older". Button NOT disabled (no condition for "older"). Test #10 confirms enabled + warning text. |
| 7 | Matching schema shows no banner | VERIFIED | RestorePreviewDialog.tsx: banners only render for "newer" and "older" states. Test #11 confirms neither banner present. |
| 8 | Confirmation button reads "Replace current database" | VERIFIED | RestorePreviewDialog.tsx L162: `Replace current database` with `buttonVariants({ variant: "destructive" })`. Test #12 confirms button name and placeholder toast on click. |
| 9 | Validation failure shows error toast (no dialog opens) | VERIFIED | BackupCard.tsx L98-101: catch block calls `toast.error("Invalid backup file: ...")`. `setPreviewOpen(true)` only in try block. Test #5 confirms error toast on reject. |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/src/lib.rs` | get_schema_version Tauri command | VERIFIED | L800-803: `#[tauri::command] fn get_schema_version() -> u32 { get_migrations().len() as u32 }`. Registered in generate_handler at L834. |
| `src/types/backup.ts` | BackupManifest TypeScript interface | VERIFIED | 14 lines. Exports `BackupManifest` with 5 fields: app_version, schema_version, created_at, platform, db_size_bytes. Mirrors Rust struct. |
| `src/lib/formatBytes.ts` | Byte formatting utility | VERIFIED | 20 lines. Exports `formatBytes(bytes: number): string`. Binary units (1024-based), conditional decimal formatting. |
| `src/features/data-health/RestorePreviewDialog.tsx` | AlertDialog-based preview with schema banners | VERIFIED | 168 lines. Named export `RestorePreviewDialog`. Props: manifest, currentSchemaVersion, open, onOpenChange, onConfirm. Three schema states with badges and banners. |
| `src/features/data-health/BackupCard.tsx` | Restore button, file picker, validation invoke | VERIFIED | 173 lines. Contains handleRestore (file picker + validate_backup + get_schema_version), handleConfirmRestore (placeholder toast), conditional RestorePreviewDialog render. |
| `tests/data-health/RestorePreviewDialog.test.tsx` | 12 unit tests | VERIFIED | 263 lines. 12 test cases in describe("Restore flow") covering file picker, validation, preview, schema states, and confirmation. |
| `tests/data-health/formatBytes.test.ts` | 9 unit tests | VERIFIED | 47 lines. 9 test cases covering 0 B, negative, small, KB, fractional MB, large MB, GB, and TB-clamping. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| BackupCard.tsx | validate_backup | invoke from @tauri-apps/api/core | WIRED | L90: `invoke<BackupManifest>("validate_backup", { path: result })` |
| BackupCard.tsx | get_schema_version | invoke from @tauri-apps/api/core | WIRED | L94: `invoke<number>("get_schema_version")` |
| BackupCard.tsx | RestorePreviewDialog | import + conditional render | WIRED | L26: import, L162-170: conditional render with all 5 props |
| RestorePreviewDialog.tsx | BackupManifest type | import from @/types/backup | WIRED | L22: `import type { BackupManifest } from "@/types/backup"` |
| RestorePreviewDialog.tsx | formatBytes | import from @/lib/formatBytes | WIRED | L23: `import { formatBytes } from "@/lib/formatBytes"`, used at L130 |
| BackupCard.tsx | @tauri-apps/plugin-dialog | import open | WIRED | L9: `import { save, open as openDialog } from "@tauri-apps/plugin-dialog"`, used at L80 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| RestorePreviewDialog.tsx | manifest (BackupManifest) | invoke("validate_backup") via BackupCard | Rust backend reads metadata.json from zip | FLOWING |
| RestorePreviewDialog.tsx | currentSchemaVersion | invoke("get_schema_version") via BackupCard | Rust get_migrations().len() | FLOWING |
| BackupCard.tsx | manifest state | invoke result stored via setManifest | Upstream validated | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Tests pass (RestorePreviewDialog) | pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx | 12/12 passed | PASS |
| Tests pass (formatBytes) | pnpm test -- tests/data-health/formatBytes.test.ts | 9/9 passed | PASS |
| TypeScript build | pnpm build | Success (26.57s) | PASS |
| Full test suite | pnpm test | 1812 passed, 0 failed | PASS |

### Probe Execution

Step 7c: SKIPPED (no probe scripts defined for this phase)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RST-01 | 81-02 | File picker filtered to .zip | SATISFIED | BackupCard.tsx L80-84: openDialog with extensions: ["zip"] |
| RST-02 | 81-02 | Validate manifest from backup | SATISFIED | BackupCard.tsx L90: invoke("validate_backup", { path }), error handling at L98-101 |
| RST-03 | 81-02 | Preview card showing manifest details | SATISFIED | RestorePreviewDialog.tsx L78-133: 5-field grid (date, app version, schema version, platform, size) |
| RST-04 | 81-01, 81-02 | Reject newer schema version | SATISFIED | RestorePreviewDialog.tsx L159: disabled={schemaState === "newer"}, L136-143: error banner |
| RST-05 | 81-01, 81-02 | Warn older schema version | SATISFIED | RestorePreviewDialog.tsx L145-153: amber warning banner, button NOT disabled for "older" |
| RST-09 | 81-02 | Explicit confirmation | SATISFIED | RestorePreviewDialog.tsx L157-164: AlertDialogAction "Replace current database" with destructive variant |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| BackupCard.tsx | 108 | `toast.info("Restore execution coming in a future update")` | Info | Intentional placeholder per D-13. Phase 82 will replace with actual restore logic. Not a stub -- documented design decision. |

No TBD, FIXME, XXX, HACK, or PLACEHOLDER markers found in any modified file.

### Human Verification Required

### 1. Native File Picker Behavior

**Test:** Click "Restore from Backup" on the Data Health page
**Expected:** OS-native file dialog opens with filter showing only .zip files. Cancelling returns to page with no changes. Selecting a non-zip file is prevented by the filter.
**Why human:** Native OS dialog behavior cannot be tested in jsdom environment

### 2. Preview Dialog Visual Styling

**Test:** Select a valid backup .zip file and inspect the preview dialog
**Expected:** AlertDialog shows 5-row manifest grid with correct typography (muted labels, bold values). Schema version badge uses correct color (green for match, amber for older, red/destructive for newer). Banner colors match spec. Layout is clean and readable.
**Why human:** CSS styling, color accuracy, and layout quality require visual inspection

### 3. Schema Compatibility Visual States

**Test:** Test with backups having newer, older, and matching schema versions
**Expected:** Newer: red error banner + ShieldAlert icon + disabled gray button. Older: amber warning banner + AlertTriangle icon + enabled destructive button. Match: no banner + green badge + enabled destructive button.
**Why human:** Visual distinction between three states (especially color differences) needs human eyes

### 4. Destructive Button Interaction Feel

**Test:** Click "Replace current database" when enabled (matching or older schema)
**Expected:** Button has destructive (red) styling. Clicking shows info toast "Restore execution coming in a future update" and closes the dialog. The interaction feels deliberate and safe.
**Why human:** UX feel of destructive action confirmation gate cannot be verified programmatically

### Gaps Summary

No gaps found. All 9 observable truths verified. All 6 requirements (RST-01, RST-02, RST-03, RST-04, RST-05, RST-09) satisfied. All artifacts exist, are substantive, are wired, and have data flowing. All tests pass. No anti-pattern blockers.

Status is human_needed because the native file picker behavior and visual styling of schema compatibility states require human verification.

---

_Verified: 2026-05-18T21:50:00Z_
_Verifier: Claude (gsd-verifier)_
