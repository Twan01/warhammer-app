# Technology Stack Research

**Project:** HobbyForge v0.2.18 — Army Lists 3.0 Smart List Builder
**Researched:** 2026-05-20
**Confidence:** HIGH

---

## Context

This is a SUBSEQUENT milestone. The existing stack (Tauri 2 + React 19 + TypeScript 5 +
Vite 6 + TailwindCSS 4 + shadcn/ui + SQLite + React Query + Zustand + RHF + Zod +
@dnd-kit) handles virtually everything for the smart list builder.

This document covers ONLY the net-new capabilities:

1. Clipboard copy (text export)
2. PDF/print export (save to file or print dialog)
3. Version snapshots (SQLite-only — no library needed)
4. Loadout builder UI (form complexity analysis)

---

## Summary

**Two new packages needed:**

- `@tauri-apps/plugin-clipboard-manager` — for text clipboard copy (one-click "Copy list to clipboard")
- `jspdf` — for PDF file generation (programmatic text-only, no HTML-to-image conversion)

**Everything else is covered by the existing stack:**

- Version snapshots → plain SQLite JSON column (TEXT column in new migration)
- Print-friendly view → CSS `@media print` + `window.print()` (confirmed working in Tauri 2 via WebView2 on Windows)
- Loadout builder UI → existing RHF + Zod + shadcn/ui `Select`/`Checkbox` — no new library
- JSON export → `JSON.stringify` + `@tauri-apps/plugin-fs` `writeFile` (already installed)
- Save file dialog → `@tauri-apps/plugin-dialog` `save()` (already installed)

---

## New Package: Clipboard

### @tauri-apps/plugin-clipboard-manager

| Property | Value |
|----------|-------|
| npm package | `@tauri-apps/plugin-clipboard-manager` |
| Rust crate | `tauri-plugin-clipboard-manager = "2"` |
| Permission needed | `clipboard-manager:allow-write-text` |
| Why Tauri-specific | `navigator.clipboard.writeText()` is blocked in Tauri 2 by the WebView2 security context without an explicit capability grant; the Tauri plugin is the sanctioned path |

**Why NOT `navigator.clipboard.writeText()` directly:** Tauri 2 ACL blocks clipboard access
from the WebView unless `clipboard-manager:allow-write-text` is granted. The plugin wraps
this correctly and is the pattern used by all Tauri 2 apps requiring clipboard write. Confirmed
in official Tauri 2 docs (HIGH confidence).

**Installation:**
```bash
# JS side
pnpm add @tauri-apps/plugin-clipboard-manager

# Rust side — add to src-tauri/Cargo.toml [dependencies]
# tauri-plugin-clipboard-manager = "2"
```

**Capability grant** — add to `src-tauri/capabilities/default.json`:
```json
"clipboard-manager:allow-write-text"
```

**Registration** — add to `src-tauri/src/lib.rs` builder:
```rust
.plugin(tauri_plugin_clipboard_manager::init())
```

**Usage pattern:**
```ts
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

async function copyListToClipboard(text: string) {
  await writeText(text);
  // show sonner toast "Copied to clipboard"
}
```

---

## New Package: PDF Generation

### jsPDF v4.2.1

| Property | Value |
|----------|-------|
| npm package | `jspdf` |
| Latest version | `4.2.1` (March 2025) |
| Bundle size | ~300 KB minified (acceptable — only loaded on export action, can be lazy-imported) |
| TypeScript | Built-in types included |

**Why jsPDF over alternatives:**

| Option | Verdict | Reason |
|--------|---------|--------|
| `jspdf` | RECOMMENDED | Programmatic text API, no HTML-to-image conversion needed for a text army list, works in Tauri WebView2 (browser JS context), mature (30K+ GitHub stars, 2.6M weekly downloads), TypeScript types included |
| `@react-pdf/renderer` | DO NOT USE | Known Vite compatibility issues (requires `vite-plugin-shim-react-pdf` shim, doubles bundle when used in workers), 3.x required for Vite compat but still fragile; overkill for plain-text army list output |
| `html2pdf.js` (html2canvas + jsPDF) | DO NOT USE | html2canvas renders the DOM to a canvas bitmap — slow, produces pixelated text, fails with Tailwind's CSS variables/custom properties, and the output is an image not selectable text in the PDF |
| Headless Chrome / `wkhtmltopdf` | DO NOT USE | Requires bundling an external binary (50+ MB), Tauri plugin for wkhtmltopdf is unmaintained (0.1.0, crates.io), overkill for a structured text document |
| `window.print()` + CSS `@media print` | SUPPLEMENTARY | Use for the in-app print dialog; works in Tauri 2 on Windows via WebView2's `ShowPrintUI()` underneath. Not a PDF saver but good for quick print |

**Why army lists are a good fit for programmatic jsPDF:** The output is fully structured text
(faction, detachment, unit rows with points, enhancement line, total). No rich layout,
no embedded images required. jsPDF's `doc.text()` and `doc.line()` API handles this in
~50 lines. No autotable plugin needed.

**Installation:**
```bash
pnpm add jspdf
```

**No Rust changes. No Tauri capability changes.** jsPDF produces a `Uint8Array` buffer in
JS. The existing `@tauri-apps/plugin-fs` `writeFile` + `@tauri-apps/plugin-dialog` `save()`
pattern (both already installed and permitted) handles saving to disk.

**Save-to-disk pattern (existing plugins, no new permissions):**
```ts
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import jsPDF from "jspdf";

async function exportListAsPDF(list: ArmyListExport) {
  const doc = new jsPDF();
  // ... doc.text() calls to lay out the list
  const pdfBytes = doc.output("arraybuffer");

  const path = await save({
    defaultPath: `${list.name}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!path) return; // user cancelled

  await writeFile(path, new Uint8Array(pdfBytes));
}
```

**Lazy-load to keep initial bundle small:**
```ts
const { default: jsPDF } = await import("jspdf");
```

---

## Version Snapshots — No Library Needed

Version snapshots (save a named version of the army list for comparison) are a pure SQLite
pattern — no new library required.

**Implementation approach:**

New migration table:
```sql
CREATE TABLE IF NOT EXISTS army_list_snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id     INTEGER NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,              -- user-supplied label e.g. "2000pt GT v1"
  snapshot    TEXT NOT NULL,              -- JSON blob of the list at save time
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

The `snapshot` column stores a JSON string produced by `JSON.stringify(listWithUnits)`.
This is the same pattern as `rulesSnapshot.ts` (`snapshot TEXT NOT NULL`) which already
works reliably in production.

**Side-by-side comparison:** Two snapshots are loaded into React state, parsed with
`JSON.parse()`, and compared with a pure TypeScript diff function in `src/lib/`. No diff
library needed — the data shape is shallow (list + flat unit array). Simple
`unitsBefore.map(u => u.unit_name + u.effective_points)` vs `unitsAfter` comparison is
sufficient for display.

**This follows the exact pattern of `rulesSnapshot.ts`** (production-proven). No risk.

---

## Print-Friendly View — CSS + window.print()

`window.print()` works in Tauri 2 on Windows via WebView2's underlying print support.
The Tauri v1 `window.print()` crash was macOS-only (WryWebView selector error, not
relevant here). Windows WebView2 fully supports `window.print()` and opens the system
print dialog.

**Pattern:** A dedicated `PrintableListView` component rendered in a hidden `div` with
`id="print-area"`. CSS `@media print` hides everything except `#print-area`.

```css
@media print {
  body > #root > * { display: none !important; }
  #print-area { display: block !important; }
}
```

No library needed. No new Tauri capability. Existing CSP (disabled in `tauri.conf.json`)
does not block `window.print()`.

---

## Loadout Builder UI — Existing Stack

The loadout builder UI (model count selector, wargear option checkboxes, enhancement
assignment) maps cleanly onto the existing stack.

| Capability | Existing Tool | Notes |
|------------|--------------|-------|
| Model count tier picker | shadcn `Select` | `synced_model_counts` → 2-3 options max per unit |
| Wargear option checkboxes | shadcn `Checkbox` + RHF `Controller` | `synced_loadout_options` grouped by `group_name`; `is_exclusive` groups → radio-style behavior |
| Enhancement picker | shadcn `Select` | `synced_enhancements` filtered by `faction_id` + `detachment_name` |
| Per-unit loadout form | RHF `useForm` | One form per unit row — NOT `useFieldArray` (see below) |
| Points delta display | computed from `synced_unit_point_tiers` | Existing COALESCE chain, resolved in SQL |
| Rules browse + add unowned units | existing `bsdataExtended.ts` queries | Read from rules.db via dual-query merge pattern |

**`useFieldArray` is NOT used for the loadout builder.** The existing project decision
(CONTEXT.md) already documents that `useFieldArray` has a known ID collision with
`@dnd-kit/useSortable` (RHF issue #10607). Army list unit rows already use a manual
array approach. Loadout options within a unit follow the same pattern: controlled
checkboxes with `useState` or inline RHF `Controller` fields, not a field array.

---

## JSON Export — No New Capability

Exporting the list as JSON uses the same pipeline as the PDF save pattern above:

```ts
const json = JSON.stringify(listWithUnits, null, 2);
const encoder = new TextEncoder();
const path = await save({ defaultPath: `${list.name}.json` });
if (path) await writeFile(path, encoder.encode(json));
```

`@tauri-apps/plugin-fs` `writeFile` accepts `Uint8Array`. `TextEncoder` is a standard
Web API present in WebView2. No new permissions needed — `fs:allow-appdata-write-recursive`
is already granted, and `dialog:allow-save` is already granted.

**Note:** The save dialog allows the user to pick any path, which the `fs` plugin permits
when initiated from a dialog (the path comes from a user gesture, bypassing the appdata-only
restriction).

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@react-pdf/renderer` | Vite shim required, bundle doubles in workers, complex for plain-text list | `jspdf` programmatic text API |
| `html2pdf.js` / `html2canvas` | Bitmap rendering, fails with CSS variables, slow | `jspdf` |
| `pdfmake` | Large bundle, complex document definition format, no advantage over jsPDF for simple text list | `jspdf` |
| `react-diff-viewer` or `diff` library | Overkill for shallow list comparison (unit name + points) | Pure TypeScript comparison function |
| Nested `useFieldArray` for loadout form | RHF/dnd-kit ID collision (CONTEXT.md documented decision) | Manual array + `Controller` |
| `tauri-plugin-printer-wkhtml-bin` | Unmaintained crate (0.1.0), requires wkhtmltopdf binary (+50 MB) | `window.print()` for print, `jspdf` for PDF |
| Any snapshot/history library | Army list snapshot is a single JSON blob per version — no tree/branching | Plain SQLite TEXT column |
| `react-hotkeys-hook` additional shortcuts | Already installed from v0.2.15 | Already in `dependencies` |

---

## Required Changes Summary

### New npm package
```bash
pnpm add @tauri-apps/plugin-clipboard-manager
pnpm add jspdf
```

### New Rust dependency (src-tauri/Cargo.toml)
```toml
tauri-plugin-clipboard-manager = "2"
```

### New Tauri plugin registration (src-tauri/src/lib.rs)
```rust
.plugin(tauri_plugin_clipboard_manager::init())
```

### New capability permission (src-tauri/capabilities/default.json)
```json
"clipboard-manager:allow-write-text"
```

### New SQLite migration
One new migration for `army_list_snapshots` table (plain SQL, no schema risk).

### No changes to
- `@tauri-apps/plugin-fs` (already installed + permitted)
- `@tauri-apps/plugin-dialog` (already installed + permitted)
- Rust commands (no new Rust command needed)
- Tailwind / shadcn config
- Router (new routes added, not router config)

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `@tauri-apps/plugin-clipboard-manager` | `^2.0.0` | Tauri 2 | First-party Tauri plugin, versioned with Tauri 2 |
| `jspdf` | `^4.2.1` | React 19 + Vite 6 | Pure JS, no React dependency, no Vite shim needed, browser-compatible |

---

## Sources

- [Tauri 2 Clipboard Plugin docs](https://v2.tauri.app/plugin/clipboard/) — permissions, usage confirmed (HIGH)
- [Tauri clipboard bug #10835](https://github.com/tauri-apps/tauri/issues/10835) — confirms `navigator.clipboard` blocked without plugin (HIGH)
- [jsPDF GitHub releases](https://github.com/parallax/jsPDF/releases) — v4.2.1 confirmed March 2025 (HIGH)
- [react-pdf Vite issue #2454](https://github.com/diegomura/react-pdf/issues/2454) — `@react-pdf/renderer` does not work with Vite 5/6 without shim (HIGH)
- [vite-plugin-shim-react-pdf npm](https://www.npmjs.com/package/vite-plugin-shim-react-pdf) — confirms shim required (MEDIUM)
- [Tauri print issue #3066](https://github.com/tauri-apps/tauri/issues/3066) — v1 crash was macOS WryWebView, not Windows WebView2 (MEDIUM)
- [WebView2 print docs](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/print) — Windows WebView2 supports window.print() (HIGH)
- [tauri-plugin-clipboard-manager Cargo.toml](https://github.com/tauri-apps/tauri-plugin-clipboard-manager/blob/v2/Cargo.toml) — v2 branch confirmed (HIGH)
- `src-tauri/capabilities/default.json` (project file) — `dialog:allow-save`, `fs:allow-appdata-write-recursive` already present (HIGH)
- `src-tauri/Cargo.toml` (project file) — `tauri-plugin-clipboard-manager` NOT present, must be added (HIGH)
- `src/db/queries/rulesSnapshot.ts` (project file) — snapshot TEXT column pattern proven in production (HIGH)
- `src-tauri/migrations/030_bsdata_extended.sql` (project file) — `synced_loadout_options`, `synced_enhancements`, `synced_model_counts` confirmed in schema (HIGH)

---
*Stack research for: HobbyForge v0.2.18 Army Lists 3.0 Smart List Builder*
*Researched: 2026-05-20*
