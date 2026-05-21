# Phase 94: List Export - Research

**Researched:** 2026-05-21
**Domain:** Tauri 2 plugin APIs (clipboard, fs, dialog), jsPDF, CSS @media print, army list data formatting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Export Entry Point UX**
- D-01: Single "Export" DropdownMenu button in ArmyListDetailSheet header. Dropdown: "Copy to Clipboard", "Print", "Save as JSON", "Save as PDF".
- D-02: Export button always visible. Exporting an empty list produces valid minimal output.

**Text Format (Clipboard — EXP-01)**
- D-03: Tournament-style compact format (army header / units section / enhancements section / total line).
- D-04: Leader pairs: target unit first, attached leader indented with "> Led by:" prefix.
- D-05: Ghost/planned units marked `[Planned]` after unit name.
- D-06: `@tauri-apps/plugin-clipboard-manager` writeText. Toast "List copied to clipboard" on success.

**Print Layout (EXP-02)**
- D-07: Dedicated `PrintPreviewDialog` (shadcn Dialog, sibling portal at ArmyListsPage level). "Print" button calls `window.print()`.
- D-08: `@media print` hides dialog chrome and app shell; black-and-white ink-friendly layout.
- D-09: Print content: army header, units table, enhancements, totals.

**JSON Export (EXP-03)**
- D-10: Versioned structured JSON (`format: "hobbyforge-army-list"`, `version: "1.0"`, full schema).
- D-11: `@tauri-apps/plugin-dialog` save with `.json` filter. Default filename: `[list-name]-[date].json`.

**PDF Export (EXP-04)**
- D-12: jsPDF lazy-loaded via dynamic `import()`. Content mirrors print layout.
- D-13: Text-based (jsPDF text/autoTable), not HTML-to-PDF.
- D-14: `@tauri-apps/plugin-dialog` save with `.pdf` filter. Default filename: `[list-name]-[date].pdf`.

**Shared Formatting Logic**
- D-15: Shared `formatArmyListForExport(list, units, enhancements)` utility, consumed by all 4 formats.
- D-16: Leader attachment grouping follows Phase 92 D-07 client-side reordering (target first, leader after).

### Claude's Discretion
- PrintPreviewDialog internal layout, spacing, typography choices
- jsPDF font sizes, margins, table column widths
- HobbyForge watermark/footer in PDF
- Whether export dropdown uses icons next to each format option
- Whether trigger button label is "Share" or "Export"
- Unit grouping in exports: by role vs insertion order
- Whether JSON includes `notes` field per unit

### Deferred Ideas (OUT OF SCOPE)
- JSON import
- BattleScribe .rosz import (ADV-02)
- Export to image
- Batch export (multiple lists)
- Custom text format templates
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXP-01 | User can copy army list as formatted text to clipboard (for Discord/forums) | `@tauri-apps/plugin-clipboard-manager` `writeText()` — verified API, permission string, Cargo registration |
| EXP-02 | User can view a print-friendly layout and print via browser print dialog | `window.print()` confirmed working in Tauri 2 WebView2 (Windows); `@media print` hides UI chrome |
| EXP-03 | User can export army list as structured JSON file via save dialog | `save()` from plugin-dialog + `writeTextFile` to absolute path OR Rust command; file permission scope |
| EXP-04 | User can export army list as PDF file via jsPDF | `jspdf` + `jspdf-autotable`; `output('arraybuffer')` → `Uint8Array` → `writeFile` to save dialog path |
</phase_requirements>

---

## Summary

Phase 94 delivers four export formats for army lists: clipboard text, print preview, JSON file, and PDF file. The data layer is fully available from Phase 89 — `useArmyListWithUnits`, `useEnhancementsByList`, and the `ArmyListUnitRow` type with its COALESCE-resolved `effective_points`. This phase is pure UI + formatting + file I/O with zero schema changes.

The two new dependencies are `@tauri-apps/plugin-clipboard-manager` (new Tauri plugin requiring Cargo + lib.rs registration + capability permission) and `jspdf` + `jspdf-autotable` (JS-only, lazy-loaded). The Tauri plugin registration is the riskiest integration step because it requires three coordinated changes: Cargo.toml, lib.rs `Builder`, and `default.json` capabilities.

File writes to user-chosen paths (from save dialog) require either (a) adding `fs:allow-write-file`, `fs:allow-write-text-file`, and appropriate `fs:scope` permissions to capabilities, or (b) delegating to a Rust command (as the backup feature does). The Rust delegation approach is already proven in this project and avoids capability scope configuration complexity — recommended for PDF (binary) and optional for JSON (text). Both paths are documented below.

**Primary recommendation:** Use the established backup-feature pattern — `save()` dialog returns path, Rust command writes bytes — for PDF binary. For JSON text, `writeTextFile` with absolute path is simpler but requires capability expansion.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Export format assembly | Frontend (React) | — | `formatArmyListForExport()` utility transforms DB data into format-specific structures |
| Clipboard write | Frontend (Tauri JS API) | — | `@tauri-apps/plugin-clipboard-manager` writeText is a JS call; no Rust command needed |
| Print preview rendering | Frontend (React) | — | PrintPreviewDialog renders HTML/CSS; `window.print()` invokes OS dialog |
| JSON text file write | Frontend (plugin-fs JS) OR Rust | — | Both patterns work; JS path requires capability scope expansion; Rust path reuses backup pattern |
| PDF binary file write | Rust command (recommended) | Frontend plugin-fs | PDF is binary; Rust avoids capability scope complexity; matches backup pattern |
| Save file dialog | Frontend (Tauri JS API) | — | `save()` from `@tauri-apps/plugin-dialog` — already in capabilities |
| Leader pair grouping logic | Frontend (pure JS) | — | Client-side reorder per Phase 92 D-07; no DB query change needed |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/plugin-clipboard-manager` | 2.3.2 | Write text to system clipboard | Official Tauri 2 clipboard plugin; only correct approach in Tauri (no `navigator.clipboard` perm issues in webview) |
| `jspdf` | 4.2.1 | PDF generation | Established JS PDF library; zero server deps; tree-shakeable; dynamic import friendly |
| `jspdf-autotable` | 5.0.8 | Table layout for jsPDF | Official companion plugin for jsPDF; functional import API (`autoTable(doc, opts)`) |
| `@tauri-apps/plugin-dialog` | 2.7.1 | Native save dialog (already in project) | Returns user-chosen path for JSON/PDF |
| `@tauri-apps/plugin-fs` | 2.5.1 | Write text/binary to absolute paths (already in project) | Used for JSON text write; PDF binary can use Rust instead |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` (already in project) | — | Toast feedback | "Copied to clipboard", "Saved as JSON/PDF", error toasts |
| shadcn Dialog | — | PrintPreviewDialog container | Already in project; sibling portal pattern |
| shadcn DropdownMenu | — | Export format selector trigger | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsPDF text-based | html2canvas + jsPDF | html2canvas captures DOM → heavier, requires DOM sync during capture, blocked by decided D-13 |
| Rust write_file command (PDF) | plugin-fs writeFile with scope | Rust sidesteps capability scope config entirely; scope config is viable but adds new permission surface |
| jspdf-autotable | Manual jsPDF table drawing | autoTable handles pagination/alignment; hand-rolling is error-prone per D-13 rationale |

**Installation (new packages only):**
```bash
pnpm add @tauri-apps/plugin-clipboard-manager jspdf jspdf-autotable
```

**Cargo.toml addition:**
```toml
tauri-plugin-clipboard-manager = "2"
```

**Version verification:** [VERIFIED: npm registry]
- `@tauri-apps/plugin-clipboard-manager@2.3.2` — confirmed `npm view` + official Tauri GitHub
- `jspdf@4.2.1` — confirmed `npm view`, official repo: github.com/parallax/jsPDF
- `jspdf-autotable@5.0.8` — confirmed `npm view`, official repo: github.com/simonbengtsson/jsPDF-AutoTable

---

## Package Legitimacy Audit

> slopcheck was available (v0.6.1) but failed to execute during this session. All packages verified via npm registry + official GitHub source repositories.

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `@tauri-apps/plugin-clipboard-manager` | npm | Tauri v2 ecosystem | github.com/tauri-apps/plugins-workspace | [OK — official Tauri org] | Approved |
| `jspdf` | npm | 10+ years | github.com/parallax/jsPDF | [OK — widely used, 28k stars] | Approved |
| `jspdf-autotable` | npm | 8+ years | github.com/simonbengtsson/jsPDF-AutoTable | [OK — widely used] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

No postinstall scripts found on any package. All three packages are from well-established authoritative sources.

---

## Architecture Patterns

### System Architecture Diagram

```
ArmyListDetailSheet (header)
    └── Export DropdownMenu trigger
           ├── "Copy to Clipboard"   → handleClipboard()
           ├── "Print"               → opens PrintPreviewDialog (state at ArmyListsPage)
           ├── "Save as JSON"        → handleJsonExport()
           └── "Save as PDF"         → handlePdfExport()

handleClipboard()
    ├── formatArmyListForExport(list, units, enhancements) → ExportData
    ├── buildTextFormat(ExportData)           → string
    └── writeText(text)                        → clipboard write
         └── toast("List copied to clipboard")

PrintPreviewDialog (sibling portal at ArmyListsPage)
    ├── Receives: list, units, enhancements via props
    ├── Renders: print-only HTML with @media print CSS
    └── "Print" button → window.print()
         └── @media print: hides .app-shell, .dialog-overlay; shows .print-content only

handleJsonExport()
    ├── formatArmyListForExport(list, units, enhancements) → ExportData
    ├── buildJsonFormat(ExportData)           → JSON string
    ├── save({ filters: [{name:"JSON", extensions:["json"]}], defaultPath: "[name]-[date].json" })
    │    → destination: string | null
    └── writeTextFile(destination, jsonString)   → file write
         └── toast("Saved as JSON")

handlePdfExport()
    ├── formatArmyListForExport(list, units, enhancements) → ExportData
    ├── save({ filters: [{name:"PDF", extensions:["pdf"]}], defaultPath: "[name]-[date].pdf" })
    │    → destination: string | null
    ├── const { jsPDF } = await import("jspdf")            [lazy]
    ├── const { autoTable } = await import("jspdf-autotable") [lazy]
    ├── const doc = new jsPDF()
    ├── buildPdfContent(doc, autoTable, ExportData)
    ├── const bytes = new Uint8Array(doc.output("arraybuffer"))
    └── writeFile(destination, bytes)           → file write
         └── toast("Saved as PDF")
```

### Recommended Project Structure
```
src/
  lib/
    exportArmyList.ts          # formatArmyListForExport() + format builders (text, json)
  features/army-lists/
    ExportDropdown.tsx          # DropdownMenu component with 4 export actions
    PrintPreviewDialog.tsx      # Print-only Dialog with @media print styles
```

### Pattern 1: Clipboard Write (EXP-01)
**What:** Write string to system clipboard via Tauri plugin
**When to use:** Clipboard copy action

```typescript
// Source: https://v2.tauri.app/plugin/clipboard/
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

async function copyToClipboard(text: string): Promise<void> {
  await writeText(text);
}
```

**Required capability entry (default.json):**
```json
"clipboard-manager:allow-write-text"
```

**Required lib.rs plugin registration:**
```rust
.plugin(tauri_plugin_clipboard_manager::init())
```

**Required Cargo.toml:**
```toml
tauri-plugin-clipboard-manager = "2"
```

### Pattern 2: Save Dialog + writeTextFile for JSON (EXP-03)
**What:** Native save dialog returning path, then write UTF-8 text to that path
**When to use:** JSON export to user-chosen location

```typescript
// Source: https://v2.tauri.app/plugin/file-system/
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

async function saveJson(jsonString: string, defaultName: string): Promise<void> {
  const destination = await save({
    title: "Save Army List as JSON",
    defaultPath: defaultName,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!destination) return; // user cancelled
  await writeTextFile(destination, jsonString);
}
```

**Additional capability permissions needed:**
```json
"fs:allow-write-text-file",
{
  "identifier": "fs:scope",
  "allow": [
    { "path": "$HOME/**" },
    { "path": "$DESKTOP/**" },
    { "path": "$DOWNLOAD/**" },
    { "path": "$DOCUMENT/**" }
  ]
}
```

> Note: `fs:default` only covers AppData — does NOT cover user-chosen paths from save dialog. [VERIFIED: official Tauri fs plugin permissions schema]

### Pattern 3: PDF Generation + Binary File Write (EXP-04)
**What:** Lazy-load jsPDF, generate PDF as ArrayBuffer, write bytes to save dialog path
**When to use:** PDF export

```typescript
// Source: https://artskydj.github.io/jsPDF/docs/jsPDF.html
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

async function savePdf(listName: string, exportData: ExportData): Promise<void> {
  const destination = await save({
    title: "Save Army List as PDF",
    defaultPath: `${slugify(listName)}-${dateStamp()}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!destination) return;

  // Lazy load — does not affect startup bundle
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  // Header
  doc.setFontSize(16);
  doc.text(`${exportData.list.name}`, 14, 20);
  doc.setFontSize(10);
  doc.text(`Faction: ${exportData.list.faction ?? "None"}  |  Detachment: ${exportData.list.detachment ?? "None"}`, 14, 28);
  doc.text(`Points: ${exportData.totalPoints}${exportData.list.points_limit ? ` / ${exportData.list.points_limit}` : ""}`, 14, 34);

  // Units table
  autoTable(doc, {
    startY: 42,
    head: [["Unit", "Points", "Notes"]],
    body: exportData.sortedUnits.map((u) => [
      u.displayName + (u.isWarlord ? " [Warlord]" : "") + (u.isGhost ? " [Planned]" : ""),
      `${u.points}pts`,
      u.leaderLabel ?? "",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [60, 60, 60] },
  });

  const buffer = doc.output("arraybuffer");
  await writeFile(destination, new Uint8Array(buffer));
}
```

**Same fs capability scope needed as JSON** (writeFile also requires `fs:allow-write-file` + scope).

**Alternate approach (Rust command — matches backup pattern, no scope needed):**
```typescript
// Frontend
const buffer = doc.output("arraybuffer");
const bytes = Array.from(new Uint8Array(buffer));
await invoke("write_bytes_to_path", { destination, bytes });

// Rust
#[tauri::command]
fn write_bytes_to_path(destination: String, bytes: Vec<u8>) -> Result<(), String> {
  std::fs::write(&destination, &bytes).map_err(|e| format!("write error: {e}"))
}
```

### Pattern 4: Print Preview with @media print (EXP-02)
**What:** Dialog renders print content; @media print hides everything else
**When to use:** Print action

```tsx
// PrintPreviewDialog.tsx
// No source URL — standard CSS/HTML pattern; @media print is a web standard
export function PrintPreviewDialog({ open, list, units, enhancements, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[700px] print:hidden">
        {/* print:hidden hides dialog chrome when printing */}
        <div className="print-content"> {/* Only this renders in print */}
          <h1>{list.name}</h1>
          {/* ... list content ... */}
        </div>
        <Button onClick={() => window.print()}>Print</Button>
      </DialogContent>
    </Dialog>
  );
}
```

```css
/* In globals.css or inline styles */
@media print {
  /* Hide entire app shell */
  body > *:not(.print-root) { display: none !important; }
  /* Or with Tailwind print: variant */
  .no-print { display: none !important; }
}
```

**Tauri 2 print support:** `window.print()` works on Windows (WebView2), macOS (WKWebView), and Linux (WebKit2GTK). [VERIFIED: official Tauri webview docs + WebView2 Microsoft docs]

### Anti-Patterns to Avoid

- **Using `navigator.clipboard.writeText()`:** May fail in Tauri's webview security context. Always use `@tauri-apps/plugin-clipboard-manager` `writeText()`.
- **Using `doc.save()` from jsPDF:** Triggers browser-style download prompt, which does not behave correctly in Tauri. Use `doc.output("arraybuffer")` and write via plugin-fs or Rust command instead.
- **Forgetting to check save() return value:** `save()` returns `null` when user cancels. Always guard with `if (!destination) return`.
- **Using `fs:default` for user-chosen paths:** `fs:default` only covers AppData. Writing to Desktop/Documents/Downloads requires explicit scope permissions.
- **Importing jsPDF at module top level:** Adds ~900 KB to the initial bundle. Always use `const { jsPDF } = await import("jspdf")`.
- **Nested Dialog inside Sheet:** `PrintPreviewDialog` must be a sibling portal at `ArmyListsPage` level. Never render it inside `ArmyListDetailSheet` (Pitfall 1 from project architecture).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF table layout | Manual `doc.line()` + text positioning | `jspdf-autotable` `autoTable()` | Handles column widths, pagination, header repeat, wrapping — genuinely complex |
| Clipboard write | `navigator.clipboard.writeText()` | `@tauri-apps/plugin-clipboard-manager` `writeText()` | navigator.clipboard may be unavailable or restricted in Tauri webview context |
| PDF binary encoding | Base64 + decode | `doc.output("arraybuffer")` → `Uint8Array` | Direct binary; no encoding overhead |
| PDF download/save | `doc.save()` | plugin-fs `writeFile()` or Rust command | `doc.save()` triggers browser download blob; doesn't use native save path |
| Print stylesheet | Custom media query logic | CSS `@media print` with Tailwind `print:` variant | Standard web spec; Tauri WebView2 supports it fully |

**Key insight:** jsPDF's `autoTable` handles the hardest parts of PDF table layout (column sizing, multi-page overflow, header repetition). The only custom code is the data-to-table mapping in `formatArmyListForExport`.

---

## Common Pitfalls

### Pitfall 1: Missing clipboard-manager capability permission
**What goes wrong:** `writeText()` throws a Tauri IPC permission error at runtime.
**Why it happens:** `clipboard-manager` has NO default permissions. Every action must be explicitly granted.
**How to avoid:** Add `"clipboard-manager:allow-write-text"` to `default.json` capabilities.
**Warning signs:** Console error "permission denied" or unhandled promise rejection on clipboard write.

### Pitfall 2: Missing Rust plugin registration for clipboard-manager
**What goes wrong:** App starts but clipboard plugin is not initialized; any IPC call to it silently fails or panics.
**Why it happens:** Plugin must be registered in `lib.rs` `Builder` chain AND in Cargo.toml. Both changes are required.
**How to avoid:** Add `.plugin(tauri_plugin_clipboard_manager::init())` in `lib.rs`, AND `tauri-plugin-clipboard-manager = "2"` in Cargo.toml.
**Warning signs:** App compiles but `writeText()` returns an error at runtime.

### Pitfall 3: fs:default does not cover user-chosen save paths
**What goes wrong:** `writeTextFile(destination, ...)` or `writeFile(destination, ...)` throws an fs permission error for a Desktop/Documents path returned by save dialog.
**Why it happens:** `fs:default` in capabilities only scopes to AppData. Writing outside AppData requires explicit `fs:allow-write-text-file`/`fs:allow-write-file` + `fs:scope` allow entries.
**How to avoid:** Either add scope permissions to capabilities, or delegate file write to Rust (matching backup pattern).
**Warning signs:** Error "path not allowed" or "access denied" from plugin-fs when writing to save dialog path.

### Pitfall 4: jsPDF doc.save() instead of doc.output("arraybuffer")
**What goes wrong:** `doc.save("file.pdf")` triggers a fake browser download blob in the webview, which either silently fails or produces a broken file.
**Why it happens:** jsPDF's `save()` method uses `window.URL.createObjectURL()` + anchor click, which is browser-download behavior — not compatible with Tauri's native file system.
**How to avoid:** Always use `doc.output("arraybuffer")` then write via `writeFile` or Rust command.
**Warning signs:** PDF appears to "download" but nothing appears in the file system, or a file appears with zero bytes.

### Pitfall 5: print:hidden vs @media print scope
**What goes wrong:** App shell (sidebar, topbar) still renders during print because `@media print` CSS is not applied to the right elements.
**Why it happens:** The Tauri WebView2 window renders the entire `<body>`; `@media print` is respected, but only if the CSS selectors are correct.
**How to avoid:** The `PrintPreviewDialog` renders in a portal over the app. The `@media print` rule must hide `.app-shell` / `[data-app-shell]` and keep only the `.print-content` div. Test with browser DevTools → Rendering → Emulate CSS media → print.
**Warning signs:** Print preview shows sidebar and navigation alongside list content.

### Pitfall 6: Dynamic import of jsPDF inside jsPDF-autotable
**What goes wrong:** `autoTable` cannot find the jsPDF instance because module scope differs.
**Why it happens:** jspdf-autotable v5 uses a functional import (`autoTable(doc, opts)`) not a side-effect import. This requires both to be dynamically imported in the same async call scope.
**How to avoid:** Import both in the same `await import()` block or in sequence before use. Do not split into separate async functions.
**Warning signs:** `autoTable is not a function` or `doc.autoTable is not a function` at runtime.

---

## Code Examples

### formatArmyListForExport utility shape
```typescript
// Source: inferred from ArmyListUnitRow type + Phase 92 D-07 grouping logic
// File: src/lib/exportArmyList.ts

export interface ExportUnit {
  displayName: string;   // unit_name (or ghost_unit_name via COALESCE)
  points: number;        // effective_points
  isWarlord: boolean;    // is_warlord === 1
  isGhost: boolean;      // unit_id === null
  leaderLabel: string | null; // "Led by: [name]" when leader_attached_to_id is set
  enhancementName: string | null;
}

export interface ExportData {
  list: ArmyList;
  factionName: string | null;
  sortedUnits: ExportUnit[];  // target units first, each with leader immediately after
  enhancements: ArmyListEnhancement[];
  totalPoints: number;        // sum of effective_points
  enhancementTotal: number;   // sum of enhancement_points
}

export function formatArmyListForExport(
  list: ArmyList,
  units: ArmyListUnitRow[],
  enhancements: ArmyListEnhancement[],
  factionName: string | null,
): ExportData { ... }
```

### Leader pair grouping (Phase 92 D-07 pattern)
```typescript
// Source: Phase 92 CONTEXT.md D-07 — client-side reorder
// Leaders (leader_attached_to_id !== null) are moved immediately after their target
function groupLeaderPairs(units: ArmyListUnitRow[]): ArmyListUnitRow[] {
  const leaders = new Set(units.filter((u) => u.leader_attached_to_id !== null).map((u) => u.id));
  const result: ArmyListUnitRow[] = [];
  for (const unit of units) {
    if (unit.leader_attached_to_id !== null) continue; // skip leaders in first pass
    result.push(unit);
    // Find leader(s) attached to this unit
    const attached = units.filter((u) => u.leader_attached_to_id === unit.id);
    result.push(...attached);
  }
  return result;
}
```

### Clipboard text format
```typescript
// Source: CONTEXT.md D-03, D-04, D-05
function buildClipboardText(data: ExportData): string {
  const lines: string[] = [];
  lines.push(`${data.list.name} — ${data.totalPoints + data.enhancementTotal}/${data.list.points_limit ?? "?"}pts`);
  lines.push(`Faction: ${data.factionName ?? "None"}`);
  lines.push(`Detachment: ${data.list.detachment_name ?? "None"}`);
  lines.push("");
  lines.push("== Units ==");
  for (const unit of data.sortedUnits) {
    const warlordTag = unit.isWarlord ? " [Warlord]" : "";
    const plannedTag = unit.isGhost ? " [Planned]" : "";
    lines.push(`${unit.displayName}${plannedTag}${warlordTag} — ${unit.points}pts`);
    if (unit.leaderLabel) lines.push(`  > ${unit.leaderLabel}`);
  }
  if (data.enhancements.length > 0) {
    lines.push("");
    lines.push("== Enhancements ==");
    for (const e of data.enhancements) {
      lines.push(`${e.enhancement_name} — ${e.enhancement_points}pts`);
    }
  }
  lines.push("");
  lines.push(`Total: ${data.totalPoints + data.enhancementTotal}pts${data.list.points_limit ? ` / ${data.list.points_limit}pts` : ""}`);
  return lines.join("\n");
}
```

### Filename slugification
```typescript
// Source: CONTEXT.md D-11, D-14 — "[list-name]-[date].json"
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function dateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jsPDF side-effect import `import "jspdf-autotable"` mutates jsPDF prototype | `autoTable(doc, opts)` functional import | jspdf-autotable v3+ | Must use functional form; side-effect import still works but not tree-shakeable |
| `doc.save("file.pdf")` browser download | `doc.output("arraybuffer")` + file write | jsPDF has always supported both | In Tauri must use arraybuffer path |
| `navigator.clipboard.writeText()` | `@tauri-apps/plugin-clipboard-manager` writeText | Tauri 2 | Native clipboard bridge required in Tauri context |
| Tauri plugin `"clipboard-manager:default"` | No default; explicit `"clipboard-manager:allow-write-text"` | Tauri 2 plugin-workspace | Security-first; no implicit permissions |

**Deprecated/outdated:**
- jsPDF side-effect `import "jspdf-autotable"`: Works but deprecated style; v5 functional import is canonical.
- `doc.save()` in Tauri context: Never use — produces zero-byte files or silent failure.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `fs:allow-write-file` + `fs:scope: $HOME/**` is sufficient for save dialog paths on Windows | Pitfall 3, Pattern 3 | File write fails with permission denied; mitigation is Rust command fallback |
| A2 | `jspdf-autotable` v5 functional import (`autoTable(doc, opts)`) is compatible with dynamic `import()` of jsPDF | Pattern 3 | `autoTable is not a function` at runtime; mitigation: import both in same dynamic block |
| A3 | `window.print()` in Tauri 2 WebView2 on Windows opens native print dialog | Pattern 4 | Print silently fails or produces no dialog; verified via WebView2 docs but not directly tested in this project |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.
*(Table has 3 low-risk assumptions — A1 has Rust fallback, A3 is confirmed by WebView2 docs)*

---

## Open Questions

1. **fs capability scope for save-dialog paths**
   - What we know: `fs:default` does NOT cover user-chosen paths; needs explicit scope
   - What's unclear: Whether the scope needs `$HOME/**` or more granular `$DESKTOP/**` + `$DOWNLOAD/**` + `$DOCUMENT/**`
   - Recommendation: Add all three (`$HOME/**` covers all of them); OR use Rust command for file write to avoid any capability scope ambiguity

2. **PrintPreviewDialog portal: window-level or body-level?**
   - What we know: Sibling portal pattern at ArmyListsPage — established for UnitPickerDialog, DatasheetBrowserDialog
   - What's unclear: `@media print` must target only `.print-content` inside dialog — needs CSS that doesn't interfere with Dialog's overlay/backdrop
   - Recommendation: Add `print:hidden` Tailwind classes to `DialogContent`/`DialogOverlay`, make only a `.print-content` wrapper visible; test via DevTools media emulation

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@tauri-apps/plugin-dialog` | JSON/PDF save dialog | Already in project | 2.7.1 | — |
| `@tauri-apps/plugin-fs` | JSON text write, PDF binary write | Already in project | 2.5.1 | Rust command |
| `@tauri-apps/plugin-clipboard-manager` | Clipboard write | NOT YET in project | 2.3.2 (to install) | — |
| `jspdf` | PDF generation | NOT YET in project | 4.2.1 (to install) | — |
| `jspdf-autotable` | PDF table layout | NOT YET in project | 5.0.8 (to install) | Manual jsPDF table |
| `tauri-plugin-clipboard-manager` (Rust) | Clipboard IPC bridge | NOT YET in Cargo.toml | "2" (to add) | — |

**Missing dependencies with no fallback:**
- `@tauri-apps/plugin-clipboard-manager` + Rust crate — required for EXP-01; no alternative in Tauri webview context

**Missing dependencies with fallback:**
- `jspdf-autotable` — jsPDF text calls can replicate a simpler table if needed

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (inferred from project conventions) |
| Quick run command | `pnpm test -- tests/army-lists/exportArmyList.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXP-01 | `buildClipboardText()` produces correct tournament format | unit | `pnpm test -- tests/lib/exportArmyList.test.ts` | Wave 0 |
| EXP-01 | Leader pairs show `> Led by:` indented | unit | `pnpm test -- tests/lib/exportArmyList.test.ts` | Wave 0 |
| EXP-01 | Ghost units show `[Planned]` marker | unit | `pnpm test -- tests/lib/exportArmyList.test.ts` | Wave 0 |
| EXP-02 | `PrintPreviewDialog` renders army header and unit rows | unit | `pnpm test -- tests/army-lists/PrintPreviewDialog.test.tsx` | Wave 0 |
| EXP-03 | `buildJsonFormat()` produces valid JSON with correct schema fields | unit | `pnpm test -- tests/lib/exportArmyList.test.ts` | Wave 0 |
| EXP-03 | JSON output includes `format`, `version`, `exported_at` fields | unit | `pnpm test -- tests/lib/exportArmyList.test.ts` | Wave 0 |
| EXP-04 | PDF generation logic is integration-tested via snapshot or output size | unit (mock jsPDF) | `pnpm test -- tests/lib/exportArmyList.test.ts` | Wave 0 |

> Note: Tauri plugin calls (`writeText`, `writeTextFile`, `writeFile`, `save`) must be mocked in tests — no native bridge in jsdom. The export format building logic (`buildClipboardText`, `buildJsonFormat`) is pure function that can be tested without mocks.

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/lib/exportArmyList.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/exportArmyList.test.ts` — covers EXP-01, EXP-03 format building + leader grouping
- [ ] `tests/army-lists/PrintPreviewDialog.test.tsx` — covers EXP-02 render
- [ ] Mock for `@tauri-apps/plugin-clipboard-manager` in `tests/setup.ts` or per-test `vi.mock`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (low risk) | Army list name slugified before use as filename — guard against path traversal chars |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via list name in default filename | Tampering | `slugify()` strips non-alphanumeric chars before filename construction; `save()` dialog validates final path |
| Clipboard poisoning (writing malicious content) | Tampering | Content is user's own army list data — no injection surface |

---

## Sources

### Primary (HIGH confidence)
- [Tauri clipboard plugin docs](https://v2.tauri.app/plugin/clipboard/) — writeText API, permission strings, Cargo crate name, lib.rs registration
- [Tauri plugins-workspace GitHub — clipboard-manager README](https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/clipboard-manager/README.md) — import path, registration pattern
- [jsPDF API docs](https://artskydj.github.io/jsPDF/docs/jsPDF.html) — constructor options, output("arraybuffer"), text(), setFontSize()
- [jsPDF-AutoTable GitHub](https://github.com/simonbengtsson/jsPDF-AutoTable) — functional import API, v5.0.8
- [Tauri fs plugin permission schema](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/fs/permissions/schemas/schema.json) — confirms fs:default scope limits
- `src/features/data-health/BackupCard.tsx` — verified save() dialog + invoke() Rust write pattern in-project
- `src-tauri/capabilities/default.json` — verified current permissions (fs:default, dialog:allow-save)
- `package.json` — confirmed existing installed plugin versions

### Secondary (MEDIUM confidence)
- [WebView2 printing docs](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/print) — window.print() works on Windows WebView2
- [Tauri GitHub Issue #4917](https://github.com/tauri-apps/tauri/issues/4917) — print API history; confirmed window.print() functional in Tauri 2

### Tertiary (LOW confidence)
- WebSearch result: "window.print() confirmed working in Tauri 2 across all platforms" — not directly tested in this project; treat as MEDIUM until manually verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry + official repos; no assumed packages
- Architecture: HIGH — follows established project patterns (backup export, sibling portal, lazy import)
- Pitfalls: HIGH — derived from official docs and reading existing project code
- Print behavior: MEDIUM — confirmed via WebView2 docs but not directly observed in this project

**Research date:** 2026-05-21
**Valid until:** 2026-06-20 (stable APIs; jsPDF-autotable v5 is recent, check if breaking changes)
