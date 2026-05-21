---
phase: 94-list-export
verified: 2026-05-21T09:05:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "Open an army list detail sheet, click Export > Copy to Clipboard, paste into a text editor"
    expected: "Tournament-style formatted text appears with army name, faction, detachment, units (grouped with leaders), enhancements, and totals"
    why_human: "Clipboard write via Tauri plugin cannot be tested without the native bridge"
  - test: "Click Export > Print, verify the print preview dialog opens, click Print button"
    expected: "Browser print dialog opens; the preview shows only the army list content (no app shell, no dialog chrome)"
    why_human: "@media print CSS and window.print() require a real browser rendering context"
  - test: "Click Export > Save as JSON, choose a destination, open the saved file"
    expected: "Valid JSON with format=hobbyforge-army-list, version=1.0, exported_at timestamp, list metadata, units array, enhancements array"
    why_human: "Requires Tauri native save dialog and filesystem write"
  - test: "Click Export > Save as PDF, choose a destination, open the saved file"
    expected: "Valid PDF document with army name header, unit table, enhancements section, totals, and HobbyForge footer"
    why_human: "Requires Tauri native save dialog, jsPDF rendering, and Rust write_bytes_to_path command"
---

# Phase 94: List Export Verification Report

**Phase Goal:** Users can share or archive their army list in multiple formats without leaving the app
**Verified:** 2026-05-21T09:05:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can copy army list as formatted plain text to clipboard with a single action | VERIFIED | `writeText` from `@tauri-apps/plugin-clipboard-manager` called in `handleCopyToClipboard` (ArmyListDetailSheet.tsx:210); `buildClipboardText` produces tournament format with `[Planned]`, `(Warlord)`, `> Led by:` markers; clipboard-manager plugin registered in lib.rs:973 and permitted in capabilities/default.json:30 |
| 2 | User can open a print-friendly view and print via browser print dialog | VERIFIED | `PrintPreviewDialog` renders structured table layout with units, enhancements, totals; "Print" button calls `window.print()` (line 185); `@media print` CSS in globals.css hides app shell, shows only `#print-content`; dialog wired as sibling portal in ArmyListsPage.tsx:202-209 |
| 3 | User can save army list as structured JSON file via native save dialog | VERIFIED | `handleSaveJson` (ArmyListDetailSheet.tsx:218-235) calls `buildJsonFormat` which produces `{format: "hobbyforge-army-list", version: "1.0", exported_at: ...}`; uses `save()` from `@tauri-apps/plugin-dialog` with `.json` filter; `writeTextFile` writes to chosen path; null destination guard on line 228 |
| 4 | User can export army list as PDF via jsPDF (lazy-loaded, startup not impacted) | VERIFIED | `handleSavePdf` (ArmyListDetailSheet.tsx:237-336) lazy-loads jsPDF via `await import("jspdf")` + `await import("jspdf-autotable")`; generates PDF with header, unit autoTable, enhancements section, totals; writes via `invoke("write_bytes_to_path", ...)` Rust command (never calls `doc.save()`); null destination guard on line 246 |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/exportArmyList.ts` | Shared formatting utility | VERIFIED | 236 lines; exports `formatArmyListForExport`, `buildClipboardText`, `buildJsonFormat`, `slugify`, `dateStamp`; leader pair grouping, ghost/warlord tagging, enhancement mapping all implemented |
| `src/features/army-lists/ExportDropdown.tsx` | 4-item dropdown menu | VERIFIED | 59 lines; 4 menu items: Copy to Clipboard, Print, Save as JSON, Save as PDF; icons from lucide-react; callbacks passed via props |
| `src/features/army-lists/PrintPreviewDialog.tsx` | Print preview with table layout | VERIFIED | 193 lines; Dialog with units table, enhancements table, totals, Print button calling `window.print()`; uses `formatArmyListForExport` for data; `id="print-content"` for @media print targeting |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | Export handlers wired | VERIFIED | Imports all export utilities + Tauri APIs; 4 async handlers (`handleCopyToClipboard`, `handleSaveJson`, `handleSavePdf`, `onPrintPreview`); `ExportDropdown` rendered in header area (line 367-373) |
| `src/features/army-lists/ArmyListsPage.tsx` | PrintPreviewDialog sibling portal | VERIFIED | `PrintPreviewDialog` rendered at page root level (line 202-209); state managed via `printPreviewOpen`/`setPrintPreviewOpen`; `onPrintPreview` callback passed to ArmyListDetailSheet |
| `src/styles/globals.css` | @media print rules | VERIFIED | 50+ lines of print CSS; hides `body > *:not(#print-content)`, makes `#print-content` fixed full-width, print typography for headings, separator styling, italic for ghost units |
| `src-tauri/src/lib.rs` | clipboard plugin + write_bytes_to_path | VERIFIED | `tauri_plugin_clipboard_manager::init()` at line 973; `write_bytes_to_path` command at line 943 (writes `Vec<u8>` to path); registered in invoke_handler at line 988 |
| `src-tauri/capabilities/default.json` | Permissions for clipboard + fs | VERIFIED | `clipboard-manager:allow-write-text` at line 30; `fs:allow-write-text-file` at line 31; fs scope includes $HOME, $DESKTOP, $DOWNLOAD, $DOCUMENT |
| `tests/lib/exportArmyList.test.ts` | Export utility tests | VERIFIED | 419 lines; 28 tests covering formatArmyListForExport (leader grouping, ghost, warlord, points, enhancements), buildClipboardText (all format markers), buildJsonFormat (schema fields), slugify (edge cases), dateStamp |
| `tests/army-lists/PrintPreviewDialog.test.tsx` | Print preview tests | VERIFIED | 205 lines; 6 tests covering render with data, unit names, Print button presence, closed state, warlord suffix, points totals |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ExportDropdown | ArmyListDetailSheet | Props (onCopyToClipboard, onPrint, onSaveJson, onSavePdf) | WIRED | ExportDropdown rendered at line 367 with all 4 callbacks bound to async handlers |
| ArmyListDetailSheet | exportArmyList.ts | import of formatArmyListForExport, buildClipboardText, buildJsonFormat, slugify, dateStamp | WIRED | Import at lines 38-43; used in all 3 async handlers |
| ArmyListDetailSheet | Tauri clipboard | import writeText from @tauri-apps/plugin-clipboard-manager | WIRED | Import at line 33; called in handleCopyToClipboard at line 210 |
| ArmyListDetailSheet | Tauri save dialog | import save from @tauri-apps/plugin-dialog | WIRED | Import at line 34; called in handleSaveJson (line 223) and handleSavePdf (line 243) |
| ArmyListDetailSheet | Rust write_bytes_to_path | invoke("write_bytes_to_path") | WIRED | Import at line 36; called in handleSavePdf at line 327 |
| ArmyListDetailSheet | jsPDF | dynamic import("jspdf") + import("jspdf-autotable") | WIRED | Lazy-loaded inside handleSavePdf at lines 249-251; never imported at module level (startup safe) |
| ArmyListsPage | PrintPreviewDialog | Props (open, list, units, enhancements, factionName, onClose) | WIRED | Sibling portal at line 202-209; state via printPreviewOpen; data from useArmyListWithUnits + useEnhancementsByList |
| ArmyListsPage | ArmyListDetailSheet.onPrintPreview | Callback prop | WIRED | openPrintPreview passed at line 156; sets printPreviewOpen=true |
| PrintPreviewDialog | exportArmyList.ts | import formatArmyListForExport | WIRED | Import at line 29; used in useMemo at line 52 |
| globals.css | PrintPreviewDialog #print-content | @media print targeting | WIRED | CSS targets `#print-content` ID; PrintPreviewDialog sets `id="print-content"` at line 80 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ExportDropdown | N/A (presentational) | Props from parent | N/A | FLOWING |
| PrintPreviewDialog | exportData | formatArmyListForExport(list, units, enhancements, factionName) | Yes -- data from useArmyListWithUnits DB query passed via props | FLOWING |
| ArmyListDetailSheet export handlers | units, listEnhancements | useArmyListWithUnits(list.id), useEnhancementsByList(list.id) | Yes -- React Query hooks fetching from SQLite | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Export utility tests pass | `npx vitest run tests/lib/exportArmyList.test.ts` | 28/28 tests passed | PASS |
| Print preview tests pass | `npx vitest run tests/army-lists/PrintPreviewDialog.test.tsx` | 6/6 tests passed | PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | No errors | PASS |
| jsPDF dependency installed | `grep jspdf package.json` | jspdf ^4.2.1, jspdf-autotable ^5.0.8 | PASS |
| clipboard-manager dependency installed | `grep clipboard-manager package.json Cargo.toml` | JS ^2.3.2, Rust "2" | PASS |

### Probe Execution

Step 7c: SKIPPED (no probe scripts declared for this phase)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EXP-01 | 94-01, 94-02 | Copy army list as formatted text to clipboard | SATISFIED | buildClipboardText + writeText + clipboard-manager plugin + permission |
| EXP-02 | 94-02 | Print-friendly layout with @media print CSS + window.print() | SATISFIED | PrintPreviewDialog + @media print CSS + sibling portal wiring |
| EXP-03 | 94-01, 94-02 | Save army list as versioned JSON file via native save dialog | SATISFIED | buildJsonFormat (format/version/exported_at) + save dialog + writeTextFile |
| EXP-04 | 94-01, 94-02 | Save army list as PDF via lazy-loaded jsPDF | SATISFIED | Dynamic import of jsPDF + autoTable rendering + write_bytes_to_path Rust command |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | -- | No debt markers, no stubs, no empty implementations found | -- | -- |

### Human Verification Required

### 1. Clipboard Copy (EXP-01)

**Test:** Open an army list with units, click Export dropdown > Copy to Clipboard, paste into a text editor
**Expected:** Tournament-style formatted text with army name, faction, detachment, units grouped with leaders, `[Planned]` tags on ghost units, `(Warlord)` suffix, enhancements section, and point totals. Toast confirms "List copied to clipboard"
**Why human:** Clipboard write requires the Tauri native bridge (not available in test/dev-server context)

### 2. Print Preview and Print (EXP-02)

**Test:** Click Export > Print, verify the dialog opens with a clean table layout, click Print
**Expected:** Browser print dialog opens; preview shows only army list content (no app sidebar, no dialog chrome); black-and-white friendly layout with section separators
**Why human:** @media print CSS behavior and window.print() rendering require a real browser context

### 3. JSON File Save (EXP-03)

**Test:** Click Export > Save as JSON, choose a destination, open the saved file
**Expected:** Valid JSON file with `format: "hobbyforge-army-list"`, `version: "1.0"`, ISO-8601 `exported_at`, full list metadata, units array with is_warlord/is_ghost/leader_attached_to, enhancements array
**Why human:** Requires native save dialog interaction and filesystem write verification

### 4. PDF File Save (EXP-04)

**Test:** Click Export > Save as PDF, choose a destination, open the saved PDF
**Expected:** A4 PDF with army name header, faction/detachment metadata, unit table with points, enhancements table (if any), total line, "Generated by HobbyForge" footer
**Why human:** Requires Tauri save dialog + jsPDF rendering + Rust binary write; visual quality check needed

---

_Verified: 2026-05-21T09:05:00Z_
_Verifier: Claude (gsd-verifier)_
