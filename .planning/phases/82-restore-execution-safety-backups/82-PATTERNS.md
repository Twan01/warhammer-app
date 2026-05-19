# Phase 82: Restore Execution + Safety Backups - Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 6 new/modified files
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src-tauri/src/lib.rs` (add `restore_from_backup` + `list_safety_backups`) | Rust command | file-I/O + request-response | `lib.rs: create_safety_backup` (line 758), `validate_backup` (line 725) | exact |
| `src/features/data-health/BackupCard.tsx` (wire `handleConfirmRestore`) | component | request-response + event-driven | `BackupCard.tsx: handleBackup` pattern (lines 41–77) | exact |
| `src/features/data-health/SafetyBackupsList.tsx` (new component) | component | request-response (read-only list) | `DiagnosticsCard.tsx` (entire file) | role-match |
| `src/features/data-health/DataHealthPage.tsx` (add `<SafetyBackupsList />`) | component | request-response | `DataHealthPage.tsx` (entire file) | exact |
| `src/hooks/useRulesSync.ts` (prepend safety backup invoke) | hook / mutation | event-driven | `useRulesSync.ts: mutationFn` (lines 86–91) | exact |
| `tests/data-health/backupCard.test.tsx` (extend restore tests) | test | — | `backupCard.test.tsx` (entire file) | exact |
| `tests/data-health/SafetyBackupsList.test.tsx` (new test) | test | — | `backupCard.test.tsx` (entire file) | role-match |
| `tests/rules-sync/useRulesSync.test.ts` (new test file) | test | — | `backupCard.test.tsx` mock pattern | partial-match |

---

## Pattern Assignments

### `src-tauri/src/lib.rs` — `restore_from_backup` command (new)

**Analog:** `lib.rs: create_safety_backup` (lines 758–795) + `validate_backup` (lines 725–752)

**Struct pattern** — `BackupManifest` at line 577; new `SafetyBackupEntry` follows the same derive layout:

```rust
// lib.rs lines 577–584
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct BackupManifest {
    pub app_version: String,
    pub schema_version: u32,
    pub created_at: String,
    pub platform: String,
    pub db_size_bytes: u64,
}

// New struct — same derive pattern, Serialize only (never deserialized from JS)
#[derive(serde::Serialize)]
pub struct SafetyBackupEntry {
    pub filename: String,
    pub timestamp: String,   // ISO 8601 parsed from filename
    pub size_bytes: u64,
}
```

**Command signature pattern** (lib.rs line 758):

```rust
#[tauri::command]
async fn create_safety_backup(app: tauri::AppHandle) -> Result<String, String> {
```

`restore_from_backup` must be `async` (it awaits `create_safety_backup`). Use `app: tauri::AppHandle` as sole parameter, plus `path: String`:

```rust
#[tauri::command]
async fn restore_from_backup(
    app: tauri::AppHandle,
    path: String,
) -> Result<(), String> {
```

**app_data_dir resolution pattern** (lib.rs lines 761–764):

```rust
let app_data_dir = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("app_data_dir: {e}"))?;
```

**NotFound-tolerant file deletion pattern** (lib.rs lines 629–633 inside `vacuum_to_temp`):

```rust
if let Err(e) = std::fs::remove_file(&temp_path) {
    if e.kind() != std::io::ErrorKind::NotFound {
        return Err(format!("remove temp file: {e}"));
    }
}
```

Apply this same pattern for each of `-wal`, `-shm`, `-journal` sidecar deletions.

**ZipArchive by_name pattern** (lib.rs lines 735–742 inside `validate_backup`):

```rust
use std::io::Read;
let file = std::fs::File::open(&path)
    .map_err(|e| format!("open zip: {e}"))?;
let mut archive = zip::ZipArchive::new(file)
    .map_err(|e| format!("invalid zip archive: {e}"))?;
archive
    .by_name("hobbyforge.db")
    .map_err(|_| "backup missing hobbyforge.db".to_string())?;
```

**Internal safety backup call** — pass `app.clone()` to keep `app` available afterwards (Pitfall 3):

```rust
create_safety_backup(app.clone()).await?;
```

**invoke_handler registration** (lib.rs lines 829–835) — add both new commands:

```rust
.invoke_handler(tauri::generate_handler![
    bulk_sync_rules,
    export_backup,
    validate_backup,
    create_safety_backup,
    get_schema_version,
    restore_from_backup,   // ADD
    list_safety_backups,   // ADD
])
```

---

### `src-tauri/src/lib.rs` — `list_safety_backups` command (new)

**Analog:** `create_safety_backup` (lines 758–795) for app_data_dir pattern; `format_filename_timestamp` (lines 596–606) for the timestamp format knowledge.

**Command signature** — synchronous (no async needed, no DB access):

```rust
#[tauri::command]
fn list_safety_backups(app: tauri::AppHandle) -> Vec<SafetyBackupEntry> {
```

**Return empty vec on missing directory** (Pitfall 4) — replicate the `NotFound` tolerance:

```rust
let read_dir = match std::fs::read_dir(&backups_dir) {
    Ok(d) => d,
    Err(_) => return vec![],  // dir doesn't exist yet — normal first-run state
};
```

**Filename format to parse** — `safety-YYYY-MM-DD-HHMM.zip` produced by `format_filename_timestamp()` (lib.rs line 596):

```rust
format!("{:04}-{:02}-{:02}-{:02}{:02}", year, month, day, hour, minute)
// Result: "2026-05-19-1430"
// Full filename: "safety-2026-05-19-1430.zip"
```

Parse to ISO 8601: `"2026-05-19T14:30:00Z"` by splitting on `-` (4 parts after stripping prefix/suffix).

---

### `src/features/data-health/BackupCard.tsx` (modify — wire restore)

**Analog:** The existing `handleBackup` async pattern (lines 41–77) is the direct model for the new `handleConfirmRestore` implementation.

**Imports to add** (lines 8–11, current file):

```typescript
import { useState } from "react";                          // already imported
import { invoke } from "@tauri-apps/api/core";             // already imported
import { toast } from "sonner";                            // already imported
// ADD:
import { relaunch } from "@tauri-apps/plugin-process";
```

**New state variable** — add alongside existing state declarations (lines 30–39):

```typescript
const [selectedPath, setSelectedPath] = useState<string | null>(null);
const [isRestoring, setIsRestoring] = useState(false);
```

**Where to set `selectedPath`** — in `handleRestore`, alongside `setManifest(validatedManifest)` (line 95):

```typescript
// BackupCard.tsx lines 90-97 (current)
const validatedManifest = await invoke<BackupManifest>("validate_backup", { path: result });
const schemaVersion = await invoke<number>("get_schema_version");
setManifest(validatedManifest);
setCurrentSchemaVersion(schemaVersion);
setSelectedPath(result);   // ADD THIS LINE
setPreviewOpen(true);
```

**`handleConfirmRestore` replacement** — copy the try/catch/finally structure of `handleBackup` (lines 59–77):

```typescript
// CURRENT (placeholder, line 107-111):
function handleConfirmRestore() {
  toast.info("Restore execution coming in a future update");
  setPreviewOpen(false);
  setManifest(null);
}

// REPLACE WITH (async, mirrors handleBackup try/catch pattern):
async function handleConfirmRestore() {
  if (!selectedPath) return;
  setIsRestoring(true);
  try {
    await invoke("restore_from_backup", { path: selectedPath });
    await relaunch();
    // Note: code after relaunch() may not execute — process restarts
  } catch (error) {
    toast.error(
      `Restore failed: ${error instanceof Error ? error.message : String(error)}`
    );
    setIsRestoring(false);
    setPreviewOpen(false);
    setManifest(null);
    setSelectedPath(null);
  }
}
```

Note: the `finally` block is intentionally omitted for the success path — `relaunch()` restarts the process (Pitfall 5). Cleanup only needed on error.

**`isRestoring` loading state in JSX** — copy the `isValidating` button pattern (lines 142–158) and apply to the `RestorePreviewDialog`'s `onConfirm` button or disable both restore-related buttons:

```typescript
// Disable "Restore from Backup" button while restoring
disabled={isValidating || isRestoring}
```

---

### `src/features/data-health/SafetyBackupsList.tsx` (new component)

**Analog:** `DiagnosticsCard.tsx` (entire file) — same data-health card pattern: `useQuery` hook, loading skeleton, empty state, list rendering.

**Imports pattern** (DiagnosticsCard.tsx lines 1–17):

```typescript
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/formatBytes";
```

**Query key + useQuery pattern** (mirrors `useDiagnostics.ts` lines 32–37):

```typescript
export const SAFETY_BACKUPS_KEY = ["safety-backups"] as const;

// Inline useQuery (Claude's discretion — simpler than a dedicated hook file
// since this is a read-only, no-mutation query consumed only by this component)
const { data: entries = [], isLoading } = useQuery({
  queryKey: SAFETY_BACKUPS_KEY,
  queryFn: () => invoke<SafetyBackupEntry[]>("list_safety_backups"),
});
```

**Empty state pattern** (DiagnosticsCard.tsx lines 55–60):

```typescript
// DiagnosticsCard empty state — copy the flex + dot + muted-foreground text style
<div className="flex items-center gap-2">
  <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
  <span className="text-sm text-muted-foreground">
    No safety backups yet. Created automatically before restores and rules syncs.
  </span>
</div>
```

**Loading state pattern** (DiagnosticsCard.tsx lines 49–54):

```typescript
{isLoading ? (
  <div className="flex flex-col gap-2">
    {Array.from({ length: 2 }).map((_, i) => (
      <Skeleton key={i} className="w-full h-8" />
    ))}
  </div>
) : ...}
```

**List item pattern** — `formatBytes` already exists at `src/lib/formatBytes.ts` (line 8). Use `new Date(e.timestamp).toLocaleString()` for display.

**TypeScript interface** for the data shape (mirrors `BackupManifest` in `src/types/backup.ts`):

```typescript
interface SafetyBackupEntry {
  filename: string;
  timestamp: string;   // ISO 8601
  size_bytes: number;
}
```

---

### `src/features/data-health/DataHealthPage.tsx` (modify — add SafetyBackupsList)

**Analog:** `DataHealthPage.tsx` itself (lines 13–35) — add import and `<SafetyBackupsList />` after `<BackupCard />`.

**Current bottom of component** (lines 31–35):

```typescript
      <DiagnosticsCard />

      <BackupCard />
    </div>
  );
```

**Modified bottom** — append `<SafetyBackupsList />`:

```typescript
      <DiagnosticsCard />

      <BackupCard />

      <SafetyBackupsList />
    </div>
  );
```

Import to add at top (line 16):

```typescript
import { SafetyBackupsList } from "./SafetyBackupsList";
```

---

### `src/hooks/useRulesSync.ts` (modify — prepend safety backup)

**Analog:** `useRulesSync.ts: mutationFn` lines 86–91 — the insertion point is the very first line of the async function body.

**Current mutationFn opening** (lines 86–91):

```typescript
mutationFn: async () => {
  const [
    factionsRaw, sourcesRaw, dsRaw, modelsRaw, abilitiesRaw, keywordsRaw,
    wargearRaw, sharedAbilitiesRaw, stratagemsRaw, detachmentsRaw,
    detachmentAbilitiesRaw, lastUpdateRaw,
  ] = await Promise.all(RULES_SYNC_FILES.map((f) => fetchCsv(f)));
```

**Modified mutationFn opening** — prepend safety backup invoke (D-08, D-09):

```typescript
mutationFn: async () => {
  // SAF-02: Safety backup before any sync operation — abort sync if fails
  await invoke("create_safety_backup");

  const [
    factionsRaw, sourcesRaw, dsRaw, modelsRaw, abilitiesRaw, keywordsRaw,
    wargearRaw, sharedAbilitiesRaw, stratagemsRaw, detachmentsRaw,
    detachmentAbilitiesRaw, lastUpdateRaw,
  ] = await Promise.all(RULES_SYNC_FILES.map((f) => fetchCsv(f)));
```

`invoke` is already imported at line 11. No new import needed. Do NOT wrap in try/catch — let the error bubble to `onError` (anti-pattern from RESEARCH.md).

---

### `tests/data-health/backupCard.test.tsx` (extend existing)

**Analog:** `backupCard.test.tsx` itself (lines 1–157) — extend the existing describe block with new test cases.

**Mock pattern for `open` dialog + `invoke`** (lines 14–26):

```typescript
const mockOpen = vi.fn();
const mockInvoke = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => mockSave(...args),
  open: (...args: unknown[]) => mockOpen(...args),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));
```

**Mock `relaunch`** — new mock needed for the process plugin:

```typescript
const mockRelaunch = vi.fn();
vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: () => mockRelaunch(),
}));
```

**Replace the placeholder toast test** (lines 241–262 of `RestorePreviewDialog.test.tsx`) — the existing test asserts `toast.info("Restore execution coming in a future update")`. This test must be deleted and replaced with:

1. Test: `restore_from_backup` invoked with correct `selectedPath` when user confirms
2. Test: `relaunch()` called after successful `restore_from_backup`
3. Test: error toast shown when `restore_from_backup` rejects; `relaunch()` not called

**Invoke call sequence mock pattern** (lines 89–100 for reference):

```typescript
// For restore flow: invoke("validate_backup") → manifest, invoke("get_schema_version") → number,
// then invoke("restore_from_backup") → void
mockInvoke
  .mockResolvedValueOnce(MOCK_MANIFEST)       // validate_backup
  .mockResolvedValueOnce(32)                  // get_schema_version
  .mockResolvedValueOnce(undefined);          // restore_from_backup
```

---

### `tests/data-health/SafetyBackupsList.test.tsx` (new test file)

**Analog:** `backupCard.test.tsx` (entire file) — same mock structure, same RTL render + waitFor pattern.

**File header pattern** (backupCard.test.tsx lines 1–50):

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// React Query wrapper needed for useQuery
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafetyBackupsList } from "@/features/data-health/SafetyBackupsList";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => { mockInvoke.mockReset(); });
```

**Required test cases** (from RESEARCH.md Validation Architecture):
- SAF-04: renders list entries returned by `list_safety_backups`
- SAF-04: shows empty state when list returns `[]`

---

### `tests/rules-sync/useRulesSync.test.ts` (new test file)

**Analog:** `backupCard.test.tsx` mock-invoke pattern. No existing rules-sync test exists.

**Required test case** (from RESEARCH.md Validation Architecture):
- SAF-02: `create_safety_backup` is the first invoke call in the mutation; if it rejects, the subsequent `Promise.all(RULES_SYNC_FILES.map(fetchCsv))` is never called.

**Key mock needed:**

```typescript
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));
vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn(),  // ensure fetch is never called when safety backup fails
}));
```

---

## Shared Patterns

### Tauri `invoke` call pattern
**Source:** `BackupCard.tsx` lines 61, 90–94; `useRulesSync.ts` line 202
**Apply to:** `BackupCard.tsx handleConfirmRestore`, `useRulesSync.ts mutationFn`

```typescript
// Typed invoke — returns T or throws string error from Rust
await invoke("command_name", { argName: value });
const result = await invoke<ReturnType>("command_name", { argName: value });
```

### Toast feedback pattern
**Source:** `BackupCard.tsx` lines 69–73
**Apply to:** `BackupCard.tsx handleConfirmRestore` error path

```typescript
toast.success("Message");
toast.error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
```

### Rust Result<T, String> error convention
**Source:** `lib.rs` lines 693, 725, 758 — all backup commands
**Apply to:** `restore_from_backup`, `list_safety_backups`

All Tauri commands use `Result<T, String>` where the `Err` variant is a human-readable `format!("context: {e}")` string. `list_safety_backups` is infallible — returns `Vec<SafetyBackupEntry>` (not `Result`).

### React Query hook query key constants
**Source:** `useDiagnostics.ts` lines 22–24
**Apply to:** `SafetyBackupsList.tsx` query key

```typescript
export const TABLE_COUNTS_KEY = ["diagnostics", "table-counts"] as const;
// Pattern: string array tuple, exported const, `as const`
```

---

## No Analog Found

All files in this phase have close analogs in the codebase.

| File | Note |
|------|------|
| `tests/rules-sync/useRulesSync.test.ts` | No existing rules-sync test exists. Partial-match on `backupCard.test.tsx` mock-invoke pattern. The hook is complex; test scope is narrow (SAF-02 only — verify `create_safety_backup` is first invoke call). |

---

## Metadata

**Analog search scope:** `src-tauri/src/`, `src/features/data-health/`, `src/hooks/`, `tests/data-health/`, `src/lib/`
**Files read:** `lib.rs` (lines 570–870), `BackupCard.tsx`, `RestorePreviewDialog.tsx`, `DataHealthPage.tsx`, `DiagnosticsCard.tsx`, `useRulesSync.ts`, `useDiagnostics.ts`, `formatBytes.ts`, `backupCard.test.tsx` (lines 230–263)
**Pattern extraction date:** 2026-05-19
