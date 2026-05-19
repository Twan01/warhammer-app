# Phase 81: Restore Preview + Validation - Pattern Map

**Mapped:** 2026-05-18
**Files analyzed:** 6 (3 new, 3 modified)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/data-health/BackupCard.tsx` | component | request-response | itself (current version) | exact |
| `src/features/data-health/RestorePreviewDialog.tsx` | component | request-response | `src/features/recipes/RecipeSectionCard.tsx` (AlertDialog) + `src/features/data-health/BackupCard.tsx` (invoke) | exact |
| `src/types/backup.ts` | type | N/A | `src/types/*.ts` (entity interfaces) | exact |
| `src/lib/formatBytes.ts` | utility | transform | `src/lib/formatCurrency.ts` | exact |
| `src-tauri/src/lib.rs` | backend | request-response | itself (`validate_backup` command pattern) | exact |
| `tests/data-health/RestorePreviewDialog.test.tsx` | test | N/A | `tests/data-health/backupCard.test.tsx` | exact |

## Pattern Assignments

### `src/features/data-health/BackupCard.tsx` (component, MODIFY)

**Analog:** itself -- extend with restore button and dialog trigger

**Current structure** (lines 34-99): Single Card with one button. Add a second button for restore alongside existing export button.

**Import additions to follow** (from JournalTab.tsx line 4):
```typescript
import { open as openDialog } from "@tauri-apps/plugin-dialog";
```

**File picker pattern** (from JournalTab.tsx lines 100-104):
```typescript
const result = (await openDialog({
  multiple: false,
  directory: false,
  filters: [{ name: "Backup Archive", extensions: ["zip"] }],
})) as string | null;
if (result === null) return;
```

**Invoke pattern** (from BackupCard.tsx lines 53-54):
```typescript
await invoke("backup_database", { destination });
```
New usage will be:
```typescript
const manifest = await invoke<BackupManifest>("validate_backup", { path: result });
```

**Error handling pattern** (from BackupCard.tsx lines 63-67):
```typescript
} catch (error) {
  toast.error(
    `Backup failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
```

**Loading state pattern** (from BackupCard.tsx lines 39, 52, 68-69):
```typescript
const [isBackingUp, setIsBackingUp] = useState(false);
// ...
setIsBackingUp(true);
try { /* ... */ } finally { setIsBackingUp(false); }
```

---

### `src/features/data-health/RestorePreviewDialog.tsx` (component, NEW)

**Analog:** `src/features/recipes/RecipeSectionCard.tsx` lines 259-273 for AlertDialog structure

**AlertDialog pattern** (RecipeSectionCard.tsx lines 7-14, 259-273):
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete section &quot;{section.name}&quot;?</AlertDialogTitle>
      <AlertDialogDescription>
        This will also delete {section.steps.length} step
        {section.steps.length !== 1 ? "s" : ""} in this section. This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={onRemove}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Props pattern** -- named function export with inline prop type (CLAUDE.md convention):
```typescript
export function RestorePreviewDialog({
  manifest,
  currentSchemaVersion,
  open,
  onOpenChange,
  onConfirm,
}: {
  manifest: BackupManifest;
  currentSchemaVersion: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) { ... }
```

**Icon imports pattern** (from BackupCard.tsx line 11):
```typescript
import { AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
```

**Toast pattern** (from BackupCard.tsx lines 12, 62):
```typescript
import { toast } from "sonner";
toast.success("Backup created successfully");
toast.error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
```

---

### `src/types/backup.ts` (type, NEW)

**Analog:** Rust struct at `src-tauri/src/lib.rs` lines 620-627

**Rust source** (lib.rs lines 620-627):
```rust
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct BackupManifest {
    pub app_version: String,
    pub schema_version: u32,
    pub created_at: String,
    pub platform: String,
    pub db_size_bytes: u64,
}
```

**TypeScript mirror** -- follows Entity interface pattern from `src/types/`:
```typescript
export interface BackupManifest {
  app_version: string;
  schema_version: number;
  created_at: string;
  platform: string;
  db_size_bytes: number;
}
```

---

### `src/lib/formatBytes.ts` (utility, NEW)

**Analog:** `src/lib/formatCurrency.ts` (lines 1-23)

**File structure pattern** (formatCurrency.ts):
```typescript
/**
 * Phase NN (REQ-ID) — Purpose description.
 *
 * Detail about the utility's role and constraints.
 */
export function formatCurrency(
  pence: number | null | undefined,
  locale: string = "en-GB",
  currency: string = "GBP"
): string {
  if (pence == null) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    pence / 100
  );
}
```

Key conventions:
- JSDoc header with phase number and requirement ID
- Single named export
- Handle null/edge cases first
- Pure function, no side effects

---

### `src-tauri/src/lib.rs` (backend, MODIFY)

**Analog:** Existing commands in same file

**Tauri command pattern** (lib.rs lines 767-768 for `validate_backup`):
```rust
#[tauri::command]
async fn validate_backup(path: String) -> Result<BackupManifest, String> {
```

**New `get_schema_version` follows same pattern but simpler** (sync, no args):
```rust
#[tauri::command]
fn get_schema_version() -> u32 {
    get_migrations().len() as u32
}
```

**Registration pattern** (lib.rs lines 864-870):
```rust
.invoke_handler(tauri::generate_handler![
    bulk_sync_rules,
    backup_database,
    export_backup,
    validate_backup,
    create_safety_backup,
])
```
Add `get_schema_version` to this list.

---

### `tests/data-health/RestorePreviewDialog.test.tsx` (test, NEW)

**Analog:** `tests/data-health/backupCard.test.tsx` (lines 1-121)

**Mock setup pattern** (backupCard.test.tsx lines 13-35):
```typescript
const mockSave = vi.fn();
const mockInvoke = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => mockSave(...args),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
```

For RestorePreviewDialog tests, mock `open` instead of `save`:
```typescript
const mockOpen = vi.fn();
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => mockOpen(...args),
}));
```

**Test structure pattern** (backupCard.test.tsx lines 46-121):
```typescript
describe("BackupCard", () => {
  it("renders the Create Backup button", () => {
    render(<BackupCard />);
    expect(screen.getByRole("button", { name: /create backup/i })).toBeInTheDocument();
  });

  it("calls save dialog when button is clicked", async () => {
    mockSave.mockResolvedValueOnce(null);
    render(<BackupCard />);
    const button = screen.getByRole("button", { name: /create backup/i });
    await userEvent.click(button);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it("shows error toast when backup fails", async () => {
    mockSave.mockResolvedValueOnce("C:\\backups\\test.db");
    mockInvoke.mockRejectedValueOnce(new Error("disk full"));
    render(<BackupCard />);
    await userEvent.click(screen.getByRole("button", { name: /create backup/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Backup failed: disk full");
    });
  });
});
```

**Import pattern** (backupCard.test.tsx lines 9-11):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
```

**Reset pattern** (backupCard.test.tsx lines 40-44):
```typescript
beforeEach(() => {
  mockSave.mockReset();
  mockInvoke.mockReset();
  localStorage.clear();
});
```

---

## Shared Patterns

### Toast Feedback
**Source:** `src/features/data-health/BackupCard.tsx` lines 62-66
**Apply to:** BackupCard (restore flow), RestorePreviewDialog
```typescript
import { toast } from "sonner";
toast.success("message");
toast.error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
```

### File Picker with Type Cast
**Source:** `src/features/units/JournalTab.tsx` lines 4, 100-104
**Apply to:** BackupCard (restore button handler)
```typescript
import { open as openDialog } from "@tauri-apps/plugin-dialog";
const result = (await openDialog({
  multiple: false,
  directory: false,
  filters: [{ name: "Backup Archive", extensions: ["zip"] }],
})) as string | null;
if (result === null) return;
```

### Tauri Invoke with Typed Response
**Source:** `src/features/data-health/BackupCard.tsx` line 54
**Apply to:** BackupCard (validate_backup call), RestorePreviewDialog or BackupCard (get_schema_version call)
```typescript
import { invoke } from "@tauri-apps/api/core";
const manifest = await invoke<BackupManifest>("validate_backup", { path });
const schemaVersion = await invoke<number>("get_schema_version");
```

### Loading State with Spinner
**Source:** `src/features/data-health/BackupCard.tsx` lines 39, 83-89
**Apply to:** BackupCard restore button during validation
```typescript
const [isValidating, setIsValidating] = useState(false);
// In JSX:
{isValidating ? (
  <>
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    Validating...
  </>
) : (
  <>
    <Upload className="mr-2 h-4 w-4" />
    Restore from Backup
  </>
)}
```

### Tauri Mock in Tests
**Source:** `tests/data-health/backupCard.test.tsx` lines 13-28
**Apply to:** All new test files for data-health
```typescript
const mockOpen = vi.fn();
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => mockOpen(...args),
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
```

## No Analog Found

No files lack an analog. All new files have strong matches in the existing codebase.

## Metadata

**Analog search scope:** `src/features/data-health/`, `src/features/recipes/`, `src/features/units/`, `src/lib/`, `src/types/`, `src-tauri/src/`, `tests/data-health/`
**Files scanned:** 8 analog files read
**Pattern extraction date:** 2026-05-18
