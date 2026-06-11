# Phase 124: Data Management Tab - Pattern Map

**Mapped:** 2026-06-10
**Files analyzed:** 3 new/modified files
**Analogs found:** 3 / 3

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/features/settings/DataManagementTab.tsx` | component | request-response + file-I/O | `src/features/data-health/BackupCard.tsx` | exact |
| `src/app/settings/page.tsx` | component | request-response | `src/app/settings/page.tsx` (self — modify) | self |
| `src-tauri/src/lib.rs` | config/backend | file-I/O | `src-tauri/src/lib.rs` (self — modify) | self |
| `tests/settings/DataManagementTab.test.tsx` | test | — | `tests/data-health/backupCard.test.tsx` | exact |

---

## Pattern Assignments

### `src/features/settings/DataManagementTab.tsx` (component, file-I/O + request-response)

**Analog:** `src/features/data-health/BackupCard.tsx`

**Imports pattern** (BackupCard.tsx lines 8–34):
```typescript
import { useState } from "react";
import { save, open as openDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { getAppSettings } from "@/db/queries/appSettings";
import { upsertAppSetting } from "@/db/queries/appSettings";
import { APP_SETTINGS_KEY } from "@/hooks/useAppSettings";
```

**Navigation pattern** (ArmyListDetailSheet.tsx line 2 + BackupCard pattern):
```typescript
// useNavigate is the standard for programmatic routing in this codebase
import { useNavigate } from "@tanstack/react-router";

// Usage inside component:
const navigate = useNavigate();
// In button onClick:
onClick={() => navigate({ to: "/data-health" })}
```

**save() dialog + writeTextFile pattern** (ArmyListDetailSheet.tsx lines 238–254):
```typescript
// Source: src/features/army-lists/ArmyListDetailSheet.tsx lines 238-254
async function handleExport() {
  try {
    const settings = await getAppSettings();
    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      settings,
    };
    const destination = await save({
      title: "Export Preferences",
      defaultPath: `hobbyforge-preferences-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!destination) return; // user cancelled
    await writeTextFile(destination, JSON.stringify(payload, null, 2));
    toast.success("Preferences exported");
  } catch {
    toast.error("Failed to export preferences — check file permissions");
  }
}
```

**open() dialog + readTextFile pattern** (BackupCard.tsx lines 95–102):
```typescript
// Source: src/features/data-health/BackupCard.tsx lines 95-102
// NOTE: cast to `string | null` — TypeScript does not narrow multiple: false automatically
const path = (await openDialog({
  multiple: false,
  directory: false,
  filters: [{ name: "JSON", extensions: ["json"] }],
})) as string | null;
if (path === null) return;
```

**Import validation + cache invalidation pattern** (useAppSettings.ts lines 17–25):
```typescript
// Source: src/hooks/useAppSettings.ts lines 17-25
const qc = useQueryClient();

async function handleImport() {
  const path = (await openDialog({
    multiple: false,
    directory: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  })) as string | null;
  if (!path) return;

  let payload: unknown;
  try {
    const raw = await readTextFile(path);
    payload = JSON.parse(raw);
  } catch {
    toast.error("Could not read file — is it a valid JSON file?");
    return;
  }

  // Validate ENTIRE structure before writing anything (D-11)
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as { version?: unknown }).version !== 1 ||
    typeof (payload as { settings?: unknown }).settings !== "object"
  ) {
    toast.error("Invalid preferences file — missing version or settings");
    return;
  }

  const entries = Object.entries(
    (payload as { settings: Record<string, unknown> }).settings,
  );
  for (const [key, value] of entries) {
    if (typeof value === "string") {
      await upsertAppSetting(key, value);
    }
  }
  await qc.invalidateQueries({ queryKey: APP_SETTINGS_KEY });
  toast.success(`Imported ${entries.length} setting(s)`);
}
```

**Safety backup + invoke + relaunch pattern** (BackupCard.tsx lines 124–143):
```typescript
// Source: src/features/data-health/BackupCard.tsx lines 124-143
const [isResetting, setIsResetting] = useState(false);

async function handleFactoryReset() {
  setIsResetting(true);
  try {
    await invoke("factory_reset"); // Rust handles safety backup + file deletion
    await relaunch();
  } catch (error) {
    toast.error(
      `Reset failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    setIsResetting(false);
  }
}
```

**AlertDialog destructive confirmation pattern** (RestorePreviewDialog.tsx lines 69, 181–198):
```typescript
// Source: src/features/data-health/RestorePreviewDialog.tsx lines 69, 181-198
// Controlled via open prop; prevent close while action is in progress
<AlertDialog open={open} onOpenChange={(v) => { if (!isResetting) onOpenChange(v); }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Factory Reset</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete all your collection, army lists, recipes,
        paints, and battle logs. A safety backup will be created before reset.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>

    {/* Typed confirmation phrase */}
    <Input
      value={phrase}
      onChange={(e) => setPhrase(e.target.value)}
      placeholder='Type "RESET" to confirm'
      autoComplete="off"
    />

    <AlertDialogFooter>
      <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
      <Button
        variant="destructive"
        disabled={phrase !== "RESET" || isResetting}
        onClick={handleFactoryReset}
      >
        {isResetting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Resetting...
          </>
        ) : (
          "Reset App"
        )}
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**CRITICAL — Reset phrase input state on close:**
```typescript
// Pitfall 2 from RESEARCH.md: phrase must be cleared when dialog closes
// Use onOpenChange to reset phrase when dialog is dismissed
const [open, setOpen] = useState(false);
const [phrase, setPhrase] = useState("");

function handleOpenChange(next: boolean) {
  if (!isResetting) {
    setOpen(next);
    if (!next) setPhrase(""); // clear on close
  }
}
```

---

### `src/app/settings/page.tsx` (component — modify existing)

**Current file:** `src/app/settings/page.tsx` (lines 33–38)

**Only change:** Replace the Data tab placeholder paragraph with `<DataManagementTab />`.

```typescript
// Current placeholder (lines 33-38) — REPLACE with:
import { DataManagementTab } from "@/features/settings/DataManagementTab";

// In the TabsContent value="data" block:
<TabsContent value="data" className="mt-4">
  <DataManagementTab />
</TabsContent>
```

No other changes to this file. The tab shell, loading/error states, and Preferences/About tabs are untouched.

---

### `src-tauri/src/lib.rs` (backend — add factory_reset command)

**Analog:** `restore_from_backup` command (lib.rs lines 1178–1219)

**Command structure pattern** (lib.rs lines 1122–1163):
```rust
// Source: src-tauri/src/lib.rs lines 1122-1163 (create_safety_backup)
// and lines 1178-1219 (restore_from_backup)
#[tauri::command]
async fn factory_reset(app: tauri::AppHandle) -> Result<(), String> {
    // 1. Safety backup first — abort entire reset if this fails (D-04)
    create_safety_backup(app.clone()).await?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;

    // 2. Delete sidecar files — tolerate NotFound (same pattern as restore_from_backup lines 1193-1201)
    for sidecar in ["-wal", "-shm", "-journal"] {
        let sidecar_path = app_data_dir.join(format!("hobbyforge.db{sidecar}"));
        if let Err(e) = std::fs::remove_file(&sidecar_path) {
            if e.kind() != std::io::ErrorKind::NotFound {
                return Err(format!("remove sidecar {sidecar}: {e}"));
            }
        }
    }

    // 3. Delete hobbyforge.db — do NOT tolerate NotFound for the main file (Pitfall 4)
    std::fs::remove_file(app_data_dir.join("hobbyforge.db"))
        .map_err(|e| format!("delete hobbyforge.db: {e}"))?;

    // 4. Delete photo files — stored as flat UUID files in appDataDir (not subdirectories)
    // IMPORTANT: Photos are stored with BaseDirectory.AppData as flat UUID files
    // (e.g. "a3f8c1d2-xxxx.jpg") — NOT in unit-photos/ or step-photos/ subdirs.
    // Use readdir + extension filter to delete image files only.
    if let Ok(entries) = std::fs::read_dir(&app_data_dir) {
        let image_extensions = ["jpg", "jpeg", "png", "webp", "gif"];
        for entry in entries.flatten() {
            if let Some(ext) = entry.path().extension().and_then(|e| e.to_str()) {
                if image_extensions.contains(&ext.to_lowercase().as_str()) {
                    let _ = std::fs::remove_file(entry.path()); // best-effort
                }
            }
        }
    }

    Ok(())
    // JS caller calls relaunch() — migration plugin recreates hobbyforge.db on startup
}
```

**Registration — add to invoke_handler** (lib.rs lines 1355–1365):
```rust
// Source: src-tauri/src/lib.rs lines 1355-1365
.invoke_handler(tauri::generate_handler![
    import_unit_database,
    export_backup,
    validate_backup,
    create_safety_backup,
    get_schema_version,
    restore_from_backup,
    list_safety_backups,
    write_bytes_to_path,
    ack_successful_launch,
    factory_reset,  // ADD THIS
])
```

---

### `tests/settings/DataManagementTab.test.tsx` (test)

**Analog:** `tests/data-health/backupCard.test.tsx` (lines 1–66)

**Mock setup pattern** (backupCard.test.tsx lines 15–66):
```typescript
// Source: tests/data-health/backupCard.test.tsx lines 15-66
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSave = vi.fn();
const mockOpen = vi.fn();
const mockInvoke = vi.fn();
const mockRelaunch = vi.fn();
const mockWriteTextFile = vi.fn();
const mockReadTextFile = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => mockSave(...args),
  open: (...args: unknown[]) => mockOpen(...args),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
  readTextFile: (...args: unknown[]) => mockReadTextFile(...args),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: () => mockRelaunch(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => () => mockNavigate(),
}));

vi.mock("@/db/queries/appSettings", () => ({
  getAppSettings: vi.fn().mockResolvedValue({ theme: "dark", language: "en" }),
  upsertAppSetting: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## Shared Patterns

### Toast notifications
**Source:** `src/features/data-health/BackupCard.tsx` (lines 86–89, 135–138)
**Apply to:** All async handlers in `DataManagementTab.tsx`
```typescript
toast.success("Operation succeeded");
toast.error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
```

### Loading state with spinner
**Source:** `src/features/data-health/BackupCard.tsx` (lines 257–265)
**Apply to:** Factory reset button, export button
```typescript
{isLoading ? (
  <>
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    Processing...
  </>
) : (
  "Action label"
)}
```

### Card section layout
**Source:** `src/features/data-health/BackupCard.tsx` (lines 186–189)
**Apply to:** Each section in `DataManagementTab.tsx`
```typescript
<Card>
  <CardContent className="p-6">
    <div className="flex items-center justify-between gap-4">
      {/* description on left, action button(s) on right */}
    </div>
  </CardContent>
</Card>
```

### Error handling in async handlers
**Source:** `src/features/data-health/BackupCard.tsx` (lines 74–92)
**Apply to:** All async handlers
```typescript
async function handleAction() {
  setIsLoading(true);
  try {
    // ... operation
  } catch (error) {
    toast.error(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    setIsLoading(false);
  }
}
```

---

## Critical Finding: Photo Storage Layout

**RESEARCH.md assumption A1 is INCORRECT.** The research assumes photos are stored in `unit-photos/` and `step-photos/` subdirectories. The actual codebase stores ALL photos as flat UUID files directly in `appDataDir()` using `BaseDirectory.AppData` with no subdirectory:

- `src/features/units/JournalTab.tsx` line 133: `writeFile(filename, data, { baseDir: BaseDirectory.AppData })`
- `src/features/recipes/RecipeStepRow.tsx` line 54: `writeFile(filename, data, { baseDir: BaseDirectory.AppData })`
- `src/features/recipes/RecipeFormSheet.tsx` line 209: `writeFile(filename, data, { baseDir: BaseDirectory.AppData })`

The `factory_reset` Rust command must enumerate files in `app_data_dir` and delete by image extension (jpg, jpeg, png, webp, gif), NOT by subdirectory name. The pattern assignment above reflects this correction.

---

## No Analog Found

None — all files have close analogs in the codebase.

---

## Metadata

**Analog search scope:** `src/features/data-health/`, `src/features/army-lists/`, `src/app/settings/`, `src/hooks/`, `src/db/queries/`, `src-tauri/src/`, `tests/data-health/`, `tests/settings/`
**Files scanned:** 10
**Pattern extraction date:** 2026-06-10
