# Phase 94: List Export - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 5 new/modified files
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/exportArmyList.ts` | utility | transform | `src/lib/resolveUnitPoints.ts` | role-match |
| `src/features/army-lists/ExportDropdown.tsx` | component | request-response | `src/components/common/AppSidebar.tsx` (DropdownMenu block) | role-match |
| `src/features/army-lists/PrintPreviewDialog.tsx` | component | request-response | `src/features/army-lists/DatasheetBrowserDialog.tsx` | exact |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | component | request-response | itself (modification) | exact |
| `src/features/army-lists/ArmyListsPage.tsx` | component | request-response | itself (modification) | exact |
| `src-tauri/src/lib.rs` | config | file-I/O | itself (modification — add plugin registration + optional Rust command) | exact |
| `src-tauri/capabilities/default.json` | config | — | itself (modification — add clipboard + fs scope permissions) | exact |
| `tests/lib/exportArmyList.test.ts` | test | — | `tests/lib/resolveUnitPoints.test.ts` | exact |
| `tests/army-lists/PrintPreviewDialog.test.tsx` | test | — | `tests/lib/resolveUnitPoints.test.ts` | role-match |

---

## Pattern Assignments

### `src/lib/exportArmyList.ts` (utility, transform)

**Analog:** `src/lib/resolveUnitPoints.ts`

**Imports pattern** (`src/lib/resolveUnitPoints.ts` lines 1–0, no imports — pure function file):
```typescript
// No external imports in pure utility files. Types imported from @/types/*.
import type { ArmyList, ArmyListUnitRow, ArmyListEnhancement } from "@/types/armyList";
```

**Core pattern — pure function with explicit typed interfaces** (`src/lib/resolveUnitPoints.ts` lines 20–44):
```typescript
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PointsSource = "override" | "tier" | "synced" | "user-override" | "base" | "unknown";

export interface ResolvedPoints {
  points: number;
  source: PointsSource;
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export function resolveUnitPoints(row: {
  points_override: number | null;
  tier_points: number | null;
  synced_points: number | null;
  override_points: number | null;
  unit_points: number | null;
}): ResolvedPoints {
  if (row.points_override != null) return { points: row.points_override, source: "override" };
  if (row.tier_points != null)     return { points: row.tier_points,     source: "tier" };
  if (row.synced_points != null)   return { points: row.synced_points,   source: "synced" };
  if (row.override_points != null) return { points: row.override_points, source: "user-override" };
  if (row.unit_points != null)     return { points: row.unit_points,     source: "base" };
  return { points: 0, source: "unknown" };
}
```

**Apply to `exportArmyList.ts`:** Export typed interfaces (`ExportUnit`, `ExportData`) at the top of the file, then export named pure functions (`formatArmyListForExport`, `buildClipboardText`, `buildJsonFormat`). No default export. No side effects. No async. No imports except project types.

**File structure to copy:**
```
Phase header comment block (purpose + requirement IDs)
// Types block (ExportUnit, ExportData interfaces)
// formatArmyListForExport() — main transform (calls groupLeaderPairs internally)
// buildClipboardText(data: ExportData): string
// buildJsonFormat(data: ExportData): string
// slugify(name: string): string
// dateStamp(): string
```

---

### `src/features/army-lists/ExportDropdown.tsx` (component, request-response)

**Analog:** `src/components/common/AppSidebar.tsx` (lines 27–32, 80–145) — the only existing DropdownMenu usage in the main source tree.

**Imports pattern** (`src/components/common/AppSidebar.tsx` lines 27–32):
```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
```

**Core DropdownMenu pattern** (`src/components/common/AppSidebar.tsx` lines 80–145):
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" className="w-full border-dashed justify-start gap-2">
      <Plus className="h-4 w-4 shrink-0" />
      Quick Add
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent side="right" align="start" sideOffset={8}>
    <DropdownMenuItem onClick={() => openQuickAdd("add-unit")}>
      <Package className="mr-2 h-4 w-4" />
      Add Unit
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => openQuickAdd("add-purchase")}>
      <Wallet className="mr-2 h-4 w-4" />
      Add Purchase
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Apply to `ExportDropdown.tsx`:** Same DropdownMenu shell. Trigger button labeled "Export" (or with a `Share2` / `Download` icon from Lucide). Four `DropdownMenuItem` entries: "Copy to Clipboard", "Print", "Save as JSON", "Save as PDF". Each item fires an `onClick` prop passed in from the parent. The component owns no async logic itself — it delegates all handlers to props to keep it testable and thin. Named export `ExportDropdown`.

**Prop interface:**
```typescript
interface ExportDropdownProps {
  onCopyToClipboard: () => void;
  onPrint: () => void;
  onSaveJson: () => void;
  onSavePdf: () => void;
  disabled?: boolean;
}
```

---

### `src/features/army-lists/PrintPreviewDialog.tsx` (component, request-response)

**Analog:** `src/features/army-lists/DatasheetBrowserDialog.tsx` (lines 1–52)

**Imports pattern** (`DatasheetBrowserDialog.tsx` lines 1–26):
```typescript
import { useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
```

**Sibling portal prop interface pattern** (`DatasheetBrowserDialog.tsx` lines 27–34):
```typescript
interface DatasheetBrowserDialogProps {
  open: boolean;
  listId: number | null;
  factionId: number | null;
  onClose: () => void;
}
```

**Dialog shell pattern** (`DatasheetBrowserDialog.tsx` lines 47–52):
```tsx
export function DatasheetBrowserDialog({ open, listId, factionId, onClose }: DatasheetBrowserDialogProps) {
  // ...
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>...</DialogTitle>
          <DialogDescription>...</DialogDescription>
        </DialogHeader>
        {/* content */}
      </DialogContent>
    </Dialog>
  );
}
```

**Apply to `PrintPreviewDialog.tsx`:** Follow exactly the same Dialog shell. Props receive the full data objects needed for rendering (no hooks inside the dialog — data comes from parent already loaded in `ArmyListsPage`). Add `print:hidden` to `DialogContent` className to hide dialog chrome during printing. Add a `.print-content` wrapper div containing the list layout. Add a "Print" `Button` that calls `window.print()`. Named export `PrintPreviewDialog`.

**Prop interface:**
```typescript
interface PrintPreviewDialogProps {
  open: boolean;
  list: ArmyList | null;
  units: ArmyListUnitRow[];
  enhancements: ArmyListEnhancement[];
  factionName: string | null;
  onClose: () => void;
}
```

---

### `src/features/army-lists/ArmyListDetailSheet.tsx` (modification)

**Analog:** itself — add `ExportDropdown` to the header area and wire four async handler functions.

**Existing header area to extend** (lines 169–230, the SheetHeader + summary bar + units toolbar):

The export button goes in the `div` at lines 208–228 (the units toolbar row), or as a standalone row between `ArmyListSummaryBar` and the detachment picker. Per D-01, it goes near the summary bar.

**Async handler pattern to copy from** (`BackupCard.tsx` lines 56–93):
```typescript
async function handleBackup() {
  const destination = await save({
    title: "Save Backup",
    defaultPath: defaultFilename,
    filters: [{ name: "HobbyForge Backup", extensions: ["zip"] }],
  });
  if (!destination) return;   // user cancelled — always guard this

  setIsBackingUp(true);
  try {
    await invoke("export_backup", { destination });
    toast.success("Backup created successfully");
  } catch (error) {
    toast.error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    setIsBackingUp(false);
  }
}
```

**New prop to add to `ArmyListDetailSheetProps`:**
```typescript
onExport: (format: "clipboard" | "print" | "json" | "pdf") => void;
```

The Sheet itself calls `onExport(format)`. All async file I/O logic lives in `ArmyListsPage` (the sibling portal owner) or in the Sheet itself as local async functions that access already-loaded `units` and `listEnhancements` data.

---

### `src/features/army-lists/ArmyListsPage.tsx` (modification)

**Analog:** itself — add `PrintPreviewDialog` sibling portal and `printOpen` state, following the existing portal pattern.

**Existing sibling portal state machine** (lines 38–83):
```typescript
// Page-level portal state
const [selectedListId, setSelectedListId] = useState<number | null>(null);
const [datasheetBrowserOpen, setDatasheetBrowserOpen] = useState(false);
// ...
const openDatasheetBrowser = () => setDatasheetBrowserOpen(true);
const closeDatasheetBrowser = () => setDatasheetBrowserOpen(false);
```

**Existing sibling portal render pattern** (lines 128–178):
```tsx
{/* Sibling portals at page root — Pitfall 1 (never nested) */}
<DatasheetBrowserDialog
  open={datasheetBrowserOpen}
  listId={selectedListId}
  factionId={selectedList?.faction_id ?? null}
  onClose={closeDatasheetBrowser}
/>
```

**Apply:** Add `const [printOpen, setPrintOpen] = useState(false)` alongside existing portal states. Add `openPrint` / `closePrint` handlers. Pass `onPrint={openPrint}` into `ArmyListDetailSheet`. Render `<PrintPreviewDialog>` as a sibling portal at the bottom of the JSX portals block, passing `list={selectedList}`, `units={selectedListUnits ?? []}`, and `enhancements` loaded from `useEnhancementsByList(selectedListId)` (already available via `ArmyListCardWrapper`).

---

### `src-tauri/src/lib.rs` (modification — plugin registration)

**Analog:** itself — follow the `.plugin(...)` chain pattern.

**Existing plugin registration** (`src-tauri/src/lib.rs` lines 950–966):
```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                // ...
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            bulk_sync_rules,
            export_backup,
            // ...
        ])
```

**Apply:** Add `.plugin(tauri_plugin_clipboard_manager::init())` to the plugin chain. If using Rust command for PDF/JSON write (recommended per RESEARCH.md), add `write_bytes_to_path` to `invoke_handler!`. Rust command pattern from existing `export_backup`:
```rust
#[tauri::command]
async fn export_backup(app: tauri::AppHandle, destination: String) -> Result<String, String> {
    // ...
    Ok(destination)
}
```

**Cargo.toml addition (no analog in file — follow pattern from existing entries):**
```toml
tauri-plugin-clipboard-manager = "2"
```

---

### `src-tauri/capabilities/default.json` (modification)

**Analog:** itself — follow the existing flat permissions array pattern.

**Existing permissions array** (`src-tauri/capabilities/default.json` lines 8–31):
```json
"permissions": [
  "core:default",
  "fs:default",
  "fs:allow-appdata-read-recursive",
  "fs:allow-appdata-write-recursive",
  "dialog:default",
  "dialog:allow-open",
  "dialog:allow-save",
  // ...
]
```

**Apply:** Add clipboard permission:
```json
"clipboard-manager:allow-write-text"
```

Add fs write permissions for user-chosen paths (required for save-dialog paths outside AppData):
```json
"fs:allow-write-text-file",
"fs:allow-write-file",
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

Note: If PDF write is delegated to a Rust command (`write_bytes_to_path`), the `fs:allow-write-file` + scope entries can be omitted for PDF specifically — only needed for `writeTextFile` (JSON).

---

### `tests/lib/exportArmyList.test.ts` (test)

**Analog:** `tests/lib/resolveUnitPoints.test.ts` (lines 1–162)

**Test file structure** (`tests/lib/resolveUnitPoints.test.ts` lines 1–5):
```typescript
import { describe, expect, it } from "vitest";
import { resolveUnitPoints } from "@/lib/resolveUnitPoints";
import type { ResolvedPoints, PointsSource } from "@/lib/resolveUnitPoints";

describe("resolveUnitPoints", () => {
  it("returns 'override' source when points_override is set", () => {
    // arrange
    const result = resolveUnitPoints({ points_override: 100, ... });
    // assert
    expect(result).toEqual({ points: 100, source: "override" });
  });
```

**Apply:** Same `describe` + `it` block structure. No mocks needed — `formatArmyListForExport`, `buildClipboardText`, `buildJsonFormat` are pure functions. Test cases must cover:
- Leader pairs produce `> Led by:` indented line (EXP-01)
- Ghost units produce `[Planned]` marker (EXP-01)
- Warlord unit produces `[Warlord]` tag (EXP-01)
- Empty list produces valid minimal text output (D-02)
- `buildJsonFormat` output has `format`, `version`, `exported_at` fields (EXP-03)
- `slugify` strips special characters including path traversal chars (security)

---

### `tests/army-lists/PrintPreviewDialog.test.tsx` (test)

**Analog:** `tests/lib/resolveUnitPoints.test.ts` for structure; component test pattern from any existing `.test.tsx` in `tests/army-lists/`.

**Apply:** Import `render` from `@testing-library/react`, `screen` for assertions. Mock `@tauri-apps/plugin-clipboard-manager` and `@tauri-apps/plugin-fs` with `vi.mock`. Wrap in a `QueryClientProvider` if any hooks are used inside the component (but prefer passing data via props to keep the test simple). Test cases:
- Renders army name when `open={true}` and `list` is provided
- Renders unit rows
- Print button is present
- Does not render content when `open={false}`

---

## Shared Patterns

### File I/O: save dialog + async handler
**Source:** `src/features/data-health/BackupCard.tsx` lines 56–93
**Apply to:** `ExportDropdown.tsx` handlers (or `ArmyListDetailSheet.tsx` if handlers live there)

```typescript
// Pattern: save() + null guard + try/catch/finally + toast
const destination = await save({
  title: "Save Army List as JSON",
  defaultPath: defaultFilename,
  filters: [{ name: "JSON", extensions: ["json"] }],
});
if (!destination) return;   // user cancelled

setIsExporting(true);
try {
  await writeTextFile(destination, jsonString);
  toast.success("Saved as JSON");
} catch (error) {
  toast.error(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  setIsExporting(false);
}
```

### Toast feedback
**Source:** `src/features/army-lists/ArmyListDetailSheet.tsx` lines 108–119
**Apply to:** All four export handlers

```typescript
onSuccess: () => toast.success("Unit removed."),
onError: (err) => {
  console.error("[ArmyListDetailSheet] Failed to remove unit:", err);
  toast.error("Failed to remove unit. Please try again.");
},
```

### Sibling portal state registration
**Source:** `src/features/army-lists/ArmyListsPage.tsx` lines 38–83
**Apply to:** Adding `printOpen` state and `PrintPreviewDialog` portal

```typescript
// Add alongside existing portal states:
const [printOpen, setPrintOpen] = useState(false);
const openPrint = () => setPrintOpen(true);
const closePrint = () => setPrintOpen(false);

// Add to closeDetail to ensure print closes when detail sheet closes:
const closeDetail = () => {
  setSelectedListId(null);
  setUnitPickerOpen(false);
  setLoadoutUnitId(null);
  setEnhancementUnitId(null);
  setDatasheetBrowserOpen(false);
  setPrintOpen(false);  // add this
};
```

### Tauri plugin init chain
**Source:** `src-tauri/src/lib.rs` lines 950–966
**Apply to:** Adding `tauri_plugin_clipboard_manager::init()` — append after `tauri_plugin_dialog::init()`

### Dynamic import for heavy dependencies
**Source:** RESEARCH.md Pattern 3 (no existing codebase analog — this is the first lazy-loaded dependency)
**Apply to:** PDF handler only:
```typescript
const { jsPDF } = await import("jspdf");
const { autoTable } = await import("jspdf-autotable");
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/styles/globals.css` (addition) | config | — | `@media print` CSS additions; no existing print styles in codebase |

The `@media print` styles are new territory. The pattern from RESEARCH.md applies: add `.no-print { display: none !important; }` under an `@media print` block in `globals.css`, and apply `print:hidden` Tailwind utility classes to `DialogContent` and the app shell wrapper.

---

## Key Pitfalls Captured (from RESEARCH.md)

These must be called out explicitly in every plan task that touches the relevant file:

1. **Pitfall 1 (capability missing):** `clipboard-manager:allow-write-text` must be in `default.json` — no default exists. Without it, `writeText()` throws IPC permission error at runtime.
2. **Pitfall 2 (Rust plugin not registered):** `tauri_plugin_clipboard_manager::init()` must be in `lib.rs` builder chain AND `tauri-plugin-clipboard-manager = "2"` in `Cargo.toml`. Both required.
3. **Pitfall 3 (fs scope):** `fs:default` covers AppData only. Save dialog returns Desktop/Documents paths. Must add `fs:allow-write-text-file` + `fs:scope` or use Rust command.
4. **Pitfall 4 (jsPDF save):** Never call `doc.save()` in Tauri. Use `doc.output("arraybuffer")` + `writeFile`.
5. **Pitfall 5 (print CSS scope):** `@media print` must hide `.app-shell` / sidebar. PrintPreviewDialog is a portal — only `.print-content` should be visible.
6. **Pitfall 6 (jsPDF + autotable dynamic import):** Both `jspdf` and `jspdf-autotable` must be imported in the same async block. Do not split across functions.

---

## Metadata

**Analog search scope:** `src/features/army-lists/`, `src/features/data-health/`, `src/lib/`, `src/components/common/`, `src-tauri/src/`, `tests/lib/`
**Files scanned:** 9 primary files read in full
**Pattern extraction date:** 2026-05-21
