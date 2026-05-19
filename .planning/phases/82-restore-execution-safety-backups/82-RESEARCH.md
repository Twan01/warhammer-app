# Phase 82: Restore Execution + Safety Backups - Research

**Researched:** 2026-05-19
**Domain:** Tauri 2 Rust commands (file operations), @tauri-apps/plugin-process, React Query mutation hooks, React component state
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New Rust command `restore_from_backup(path: String)` handles the entire destructive sequence: (1) call the existing `create_safety_backup` helper internally, (2) delete WAL/SHM/journal sidecar files, (3) extract `hobbyforge.db` from the validated zip and write it to app_data_dir, replacing the existing file.
- **D-02:** Frontend calls `invoke("restore_from_backup", { path })` from `handleConfirmRestore` in BackupCard. On success, calls `relaunch()` from `@tauri-apps/plugin-process`.
- **D-03:** Rust command does NOT restart the app — only file operations. Frontend owns the restart call so it can show a "Restoring..." state before relaunch.
- **D-04:** If the safety backup step fails inside `restore_from_backup`, the restore aborts immediately — no file swap occurs. The user sees an error toast and can retry.
- **D-05:** `restore_from_backup` reuses the existing `vacuum_to_temp` + `create_backup_zip` pattern. No new backup logic needed.
- **D-06:** Use `relaunch()` from `@tauri-apps/plugin-process` (already installed: `tauri-plugin-process = "2.3.1"` in Cargo.toml, `@tauri-apps/plugin-process ^2.3.1` in package.json, plugin initialized in lib.rs).
- **D-07:** The process:allow-restart capability must be added to `src-tauri/capabilities/default.json` for `relaunch()` to work.
- **D-08:** Add `await invoke("create_safety_backup")` at the top of the `useRulesSync` mutation function (in `src/hooks/useRulesSync.ts`), before any CSV fetching begins. If the safety backup fails, the sync aborts with an error toast.
- **D-09:** The safety backup call in the sync path uses the same `create_safety_backup` Tauri command — no new Rust code needed for this requirement.
- **D-10:** New Rust command `list_safety_backups(app: AppHandle) -> Vec<SafetyBackupEntry>` reads `{app_data_dir}/backups/` and returns entries with filename, timestamp (parsed from `safety-YYYY-MM-DD-HHMM.zip`), and file size in bytes.
- **D-11:** New `SafetyBackupsList` component rendered below BackupCard on the Data Health page. Simple collapsible list showing timestamp and size for each safety backup. If no safety backups exist, show "No safety backups yet" with brief explanation.
- **D-12:** The list is purely informational in this phase — no delete or restore-from-safety-backup actions.

### Claude's Discretion

- Component decomposition for SafetyBackupsList (inline vs extracted)
- Whether to create a dedicated React Query hook for `list_safety_backups` or keep it simpler
- Loading/empty state UX for the safety backups list
- Whether to show a progress indicator during restore before relaunch
- Error message wording for restore failures (spirit of decisions must be preserved)
- `SafetyBackupEntry` struct fields beyond filename/timestamp/size

### Deferred Ideas (OUT OF SCOPE)

- Safety backup auto-cleanup (cap at N backups, oldest deleted) — Future requirement SAF-F02
- Pre-migration safety backup (before app updates with schema changes) — Future requirement SAF-F01
- Restore from a safety backup (currently listing only) — future enhancement
- Delete individual safety backups — future enhancement
- Backup diagnostics (never-backed-up flag, staleness threshold, version mismatch) — Phase 83
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RST-06 | Automatic safety backup is created before any restore | D-01 reuses `create_safety_backup` inside `restore_from_backup`; verified command exists at lib.rs line 758 |
| RST-07 | Restore replaces hobbyforge.db atomically (sidecar cleanup + file swap) | D-01 sequence: delete WAL/SHM/journal, then extract db from zip; verified zip crate already present |
| RST-08 | App restarts after successful restore to reinitialize DB connections | D-02/D-03/D-06; `relaunch()` confirmed in installed plugin-process 2.3.1 source |
| SAF-02 | Automatic safety backup created before Wahapedia rules sync | D-08/D-09; insertion point identified in useRulesSync.ts mutationFn at top of async body |
| SAF-04 | User can see safety backups in Data Health | D-10/D-11; new Rust command + SafetyBackupsList component below BackupCard |
</phase_requirements>

---

## Summary

Phase 82 completes the restore path and integrates automatic safety backups. All major dependencies are already in place: `tauri-plugin-process` is installed and initialized, `create_safety_backup` exists as a Tauri command, `zip = "2"` is in Cargo.toml, and `RestorePreviewDialog`'s `onConfirm` callback is wired and waiting for real implementation.

The work decomposes cleanly into four independent deliverables: (1) the `restore_from_backup` Rust command, (2) the BackupCard wiring that invokes it and calls `relaunch()`, (3) the pre-sync safety backup addition to `useRulesSync`, and (4) the `list_safety_backups` command plus `SafetyBackupsList` UI component.

One non-obvious gap exists in the current `BackupCard` state: the file path selected via the open dialog (`result` in `handleRestore`) is a local variable and is never stored in component state. `handleConfirmRestore` currently has no access to it. The plan must add a `selectedPath` state variable to bridge the restore selection to the confirm handler.

An important capability finding: `process:default` is **already present** in `default.json` and the ACL manifest confirms `process:default` grants both `allow-exit` and `allow-restart`. D-07 says to add `process:allow-restart` — but the permission is already covered by `process:default`. The planner should note this: the capability change required by D-07 is a no-op (already granted), and no edit to `default.json` is needed.

**Primary recommendation:** Implement in four discrete tasks — Rust commands first (restore_from_backup + list_safety_backups), then BackupCard wiring, then useRulesSync pre-sync backup, then SafetyBackupsList UI.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| DB file swap + sidecar cleanup | Rust (Tauri command) | — | File system ops requiring native access; JS cannot safely write to app_data_dir path with atomic guarantees |
| Safety backup creation | Rust (Tauri command) | — | Reuses existing `create_safety_backup` command; all backup logic lives in Rust |
| App restart | Frontend (JS) | — | D-03 locked: Rust stays pure file ops; frontend controls UX timing before relaunch |
| Backup path threading (dialog → confirm) | Frontend component state | — | The selected zip path must persist through the confirm dialog lifecycle |
| Pre-sync safety backup trigger | Frontend hook (useRulesSync) | — | A JS invoke call prepended to the existing mutation function |
| Safety backup listing | Rust (list command) + React component | React Query hook | Rust reads directory; UI renders the list |
| Capability permission for restart | Tauri capabilities/default.json | — | process:allow-restart — already granted via process:default |

---

## Standard Stack

### Core (no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zip` (Rust) | `2` | Extract `hobbyforge.db` from backup zip | [VERIFIED: Cargo.toml] already present; used by all existing backup commands |
| `@tauri-apps/plugin-process` | `^2.3.1` | `relaunch()` for app restart | [VERIFIED: package.json + node_modules] already installed and initialized |
| `tauri-plugin-process` (Rust) | `2.3.1` | Rust-side process plugin | [VERIFIED: Cargo.toml] already present; already registered in `run()` |
| `time` (Rust) | `0.3` | Parse timestamps from safety backup filenames | [VERIFIED: Cargo.toml] already present; used by `format_filename_timestamp()` |

### No New Dependencies

All required packages are already in the project. No `cargo add` or `npm install` steps are needed for this phase.

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase. All libraries are already present in `Cargo.toml` and `package.json`.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User clicks "Replace current database"
        |
        v
BackupCard.handleConfirmRestore(selectedPath)
        |
        +-- setIsRestoring(true)  [brief "Restoring..." UI state]
        |
        v
invoke("restore_from_backup", { path: selectedPath })
        |
        v [Rust: restore_from_backup]
        +-- create_safety_backup(&app)  ← abort if fails
        |       |
        |       +-- vacuum_to_temp() → create_backup_zip() → backups/safety-YYYY-MM-DD-HHMM.zip
        |
        +-- delete hobbyforge.db-wal, hobbyforge.db-shm, hobbyforge.db-journal  (ignore NotFound)
        |
        +-- ZipArchive::new(backup_zip) → extract "hobbyforge.db" → write to app_data_dir
        |
        +-- Ok(()) returned to frontend
        |
        v [Frontend: on success]
relaunch()  ← @tauri-apps/plugin-process
        |
        v
App process restarts → Tauri plugin-sql reinitializes DB connections → restored DB in effect


Pre-sync safety backup path:
useRulesSync.mutationFn()
        |
        +-- [NEW] await invoke("create_safety_backup")  ← abort sync if fails
        |
        +-- Promise.all(RULES_SYNC_FILES.map(fetchCsv))  [existing]
        |
        +-- ...rest of sync...


Safety backup listing:
DataHealthPage
  └── SafetyBackupsList
        |
        +-- useQuery → invoke("list_safety_backups")
        |       |
        |       +-- read backups/ directory
        |       +-- filter safety-*.zip files
        |       +-- parse timestamp from filename
        |       +-- read file sizes
        |       +-- return Vec<SafetyBackupEntry>
        |
        +-- renders collapsible list of timestamp + size
```

### Recommended Project Structure

No new directories needed. New files:

```
src-tauri/src/lib.rs                    # Add restore_from_backup, list_safety_backups commands
src/features/data-health/
  BackupCard.tsx                        # Wire handleConfirmRestore + add selectedPath state
  SafetyBackupsList.tsx                 # New component (Claude's discretion: inline or extracted)
  DataHealthPage.tsx                    # Add <SafetyBackupsList /> below <BackupCard />
src/hooks/useRulesSync.ts               # Prepend create_safety_backup invoke
tests/data-health/
  backupCard.test.tsx                   # Extend with restore execution tests (replace placeholder test)
  SafetyBackupsList.test.tsx            # New test file
```

### Pattern 1: Rust Destructive File Operation Command

**What:** Tauri command that performs a multi-step destructive operation with abort-on-first-failure semantics.
**When to use:** Any time a file operation sequence must leave the system in a consistent state.

```rust
// Source: existing pattern from create_safety_backup (lib.rs line 758)
#[tauri::command]
async fn restore_from_backup(
    app: tauri::AppHandle,
    path: String,
) -> Result<(), String> {
    // Step 1: Safety backup — abort if fails (D-04)
    create_safety_backup(app.clone()).await?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let db_path = app_data_dir.join("hobbyforge.db");

    // Step 2: Delete WAL/SHM/journal sidecars (ignore NotFound)
    for sidecar in &["-wal", "-shm", "-journal"] {
        let sidecar_path = app_data_dir.join(format!("hobbyforge.db{sidecar}"));
        if let Err(e) = std::fs::remove_file(&sidecar_path) {
            if e.kind() != std::io::ErrorKind::NotFound {
                return Err(format!("remove sidecar {sidecar}: {e}"));
            }
        }
    }

    // Step 3: Extract hobbyforge.db from zip
    use std::io::Read;
    let file = std::fs::File::open(&path)
        .map_err(|e| format!("open backup zip: {e}"))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("invalid zip: {e}"))?;
    let mut db_entry = archive
        .by_name("hobbyforge.db")
        .map_err(|_| "backup missing hobbyforge.db".to_string())?;
    let mut db_bytes = Vec::new();
    db_entry
        .read_to_end(&mut db_bytes)
        .map_err(|e| format!("read db from zip: {e}"))?;
    std::fs::write(&db_path, &db_bytes)
        .map_err(|e| format!("write hobbyforge.db: {e}"))?;

    Ok(())
}
```

### Pattern 2: list_safety_backups Command

**What:** Rust command that reads a directory and parses structured data from filenames.
**When to use:** Any time the frontend needs a list of files with metadata from a managed directory.

```rust
// Source: [ASSUMED] — follows established AppHandle pattern from create_safety_backup
#[derive(serde::Serialize)]
pub struct SafetyBackupEntry {
    pub filename: String,
    pub timestamp: String,   // ISO 8601, parsed from filename
    pub size_bytes: u64,
}

#[tauri::command]
fn list_safety_backups(app: tauri::AppHandle) -> Vec<SafetyBackupEntry> {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return vec![],
    };
    let backups_dir = app_data_dir.join("backups");
    let read_dir = match std::fs::read_dir(&backups_dir) {
        Ok(d) => d,
        Err(_) => return vec![],  // dir doesn't exist yet — normal first-run state
    };

    let mut entries: Vec<SafetyBackupEntry> = read_dir
        .filter_map(|entry| entry.ok())
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .starts_with("safety-")
                && e.file_name().to_string_lossy().ends_with(".zip")
        })
        .filter_map(|e| {
            let filename = e.file_name().to_string_lossy().to_string();
            let size_bytes = e.metadata().ok()?.len();
            // Parse "safety-YYYY-MM-DD-HHMM.zip" → "YYYY-MM-DDTHH:MM:00Z"
            let inner = filename
                .strip_prefix("safety-")?
                .strip_suffix(".zip")?;
            // inner = "YYYY-MM-DD-HHMM"
            let parts: Vec<&str> = inner.splitn(4, '-').collect();
            if parts.len() != 4 { return None; }
            let hhmm = parts[3];
            if hhmm.len() != 4 { return None; }
            let timestamp = format!(
                "{}-{}-{}T{}:{}:00Z",
                parts[0], parts[1], parts[2], &hhmm[..2], &hhmm[2..]
            );
            Some(SafetyBackupEntry { filename, timestamp, size_bytes })
        })
        .collect();

    entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));  // newest first
    entries
}
```

### Pattern 3: BackupCard selectedPath State

**What:** The `result` from `openDialog` is a local variable in `handleRestore`. It is NOT currently persisted to state, so `handleConfirmRestore` cannot access it.
**How to fix:** Add a `selectedPath` state variable.

```typescript
// Source: [VERIFIED] — code inspection of BackupCard.tsx lines 34-37, 79-111
const [selectedPath, setSelectedPath] = useState<string | null>(null);

// In handleRestore, after setManifest(validatedManifest):
setSelectedPath(result);

// handleConfirmRestore becomes async:
async function handleConfirmRestore() {
  if (!selectedPath) return;
  setIsRestoring(true);
  try {
    await invoke("restore_from_backup", { path: selectedPath });
    // Brief delay so "Restoring..." renders before relaunch
    await relaunch();
  } catch (error) {
    toast.error(
      `Restore failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    setIsRestoring(false);
    setPreviewOpen(false);
    setManifest(null);
    setSelectedPath(null);
  }
}
```

### Pattern 4: Pre-Sync Safety Backup in useRulesSync

**What:** Prepend `create_safety_backup` invoke before the existing CSV fetch logic.
**Critical:** Must use `await` (blocking), and must propagate failure by not catching the error (letting it bubble to the mutation's `onError` handler).

```typescript
// Source: [VERIFIED] — code inspection of useRulesSync.ts line 86
mutationFn: async () => {
  // SAF-02: Safety backup before any sync operation
  await invoke("create_safety_backup");
  // ...existing Promise.all(RULES_SYNC_FILES.map(fetchCsv)) continues...
}
```

The existing `onError` handler in `useRulesSync` already logs sync errors to the DB and invalidates `SYNC_ERRORS_KEY`. A safety backup failure will flow through it — but the `error_type` logic (line 336-339) will not match `fetch_failed` or `validation_error`, so it will default to `sync_error`. That is acceptable — no changes needed to `onError`.

### Pattern 5: invoke_handler Registration

```rust
// Source: [VERIFIED] — lib.rs lines 829-835
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

### Anti-Patterns to Avoid

- **Catching the safety backup error in useRulesSync:** The sync MUST abort if safety backup fails (D-08). Do not wrap the invoke in a try/catch — let it throw and hit the mutation's onError handler.
- **Calling `relaunch()` from Rust:** D-03 explicitly forbids this. The restart must happen from JS so the frontend can show "Restoring..." before the process dies.
- **Not deleting sidecar files before the swap:** SQLite WAL/SHM files from the old database will corrupt the newly-written file if left in place. The sidecar deletion step in `restore_from_backup` is mandatory.
- **Storing `create_safety_backup`'s internal logic inline in restore_from_backup:** D-05 specifies reuse of the existing `create_safety_backup` command call (not copy-pasting its internals). Call `create_safety_backup(app.clone()).await?` directly.
- **Using `process:allow-restart` as a new capability entry:** `process:default` already grants `allow-restart` (verified in `acl-manifests.json`). Adding a redundant entry is harmless but unnecessary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| App restart after restore | Custom exit + relaunch logic | `relaunch()` from `@tauri-apps/plugin-process` | Process plugin handles platform-specific restart correctly; already installed |
| ZIP extraction | Manual byte-range parsing | `zip::ZipArchive::by_name()` | Already used in `validate_backup`; consistent pattern |
| Atomic file replacement | temp-file + rename | Direct `std::fs::write` after sidecar cleanup | Sidecar cleanup + write is sufficient for SQLite; VACUUM INTO already created a clean snapshot |
| Timestamp formatting for safety backup list | Custom date parsing library | Inline string parsing from known `safety-YYYY-MM-DD-HHMM.zip` format | Format is controlled and predictable; full ISO 8601 library overkill |

---

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration phase. This phase adds new commands and wires existing UI.

---

## Common Pitfalls

### Pitfall 1: selectedPath Not Available in handleConfirmRestore

**What goes wrong:** The confirmation handler can't find the zip path to pass to `restore_from_backup`.
**Why it happens:** `handleRestore` stores the dialog result in a local variable (`result`), never in state. `handleConfirmRestore` is a separate function without closure access.
**How to avoid:** Add `const [selectedPath, setSelectedPath] = useState<string | null>(null)` and call `setSelectedPath(result)` alongside `setManifest(validatedManifest)` in `handleRestore`.
**Warning signs:** TypeScript will error if you try to reference `result` inside `handleConfirmRestore` — it's out of scope.

### Pitfall 2: Capability Already Granted — process:default Covers restart

**What goes wrong:** The plan adds `"process:allow-restart"` as a new line in `default.json`, making the change larger than necessary and potentially confusing future readers.
**Why it happens:** D-07 says "The process:allow-restart capability must be added." But `process:default` is already in `default.json` (line 30), and the ACL manifest confirms `process:default` includes `allow-restart`.
**How to avoid:** The planner should verify `default.json` before writing a task for this. No capability change is needed.
**Warning signs:** `process:default` already present in `default.json` — confirmed.

### Pitfall 3: create_safety_backup Is an Async Tauri Command — Must Use app.clone()

**What goes wrong:** `restore_from_backup` tries to call `create_safety_backup(app)` but `app` is moved into the inner call, leaving the rest of the function without an `AppHandle`.
**Why it happens:** `tauri::AppHandle` implements `Clone` but does not implement `Copy`.
**How to avoid:** Pass `app.clone()` to the inner `create_safety_backup` call, keeping `app` available for the subsequent path resolution steps.
**Warning signs:** Rust borrow checker will catch this — compile error on subsequent `app.path()` use.

### Pitfall 4: list_safety_backups Returns Empty Vec on Missing Directory

**What goes wrong:** First-run users (who have never triggered a safety backup) will have no `backups/` directory. If the command errors instead of returning an empty vec, the UI breaks.
**Why it happens:** `std::fs::read_dir` returns an error for non-existent paths.
**How to avoid:** Pattern-match the `read_dir` result: on `Err(_)`, return `vec![]` rather than propagating the error.
**Warning signs:** `SafetyBackupsList` always shows an error state on fresh installs.

### Pitfall 5: relaunch() Resolves Before the Process Actually Dies

**What goes wrong:** Code after `await relaunch()` might execute briefly.
**Why it happens:** `relaunch()` internally calls `plugin:process|restart` via IPC — the process exit happens asynchronously.
**How to avoid:** Do not put cleanup logic after `await relaunch()`. The "finally" block in `handleConfirmRestore` should be before the relaunch call (or omitted for the happy path — the process is restarting anyway).
**Warning signs:** State setters called after `relaunch()` have no practical effect but are not harmful.

### Pitfall 6: useRulesSync Error Logging for Safety Backup Failure

**What goes wrong:** If `create_safety_backup` fails, the `onError` handler logs the error to the DB with `error_type: "sync_error"` — which is technically not a sync error.
**Why it happens:** The existing error type detection in `onError` only recognizes fetch and validation error patterns.
**How to avoid:** This is acceptable per D-08 (the sync aborts with an error toast). The DB log entry type being `sync_error` is a minor semantic imprecision, not a functional bug. Accept it for this phase.

---

## Code Examples

### relaunch() usage (confirmed from installed package source)

```typescript
// Source: [VERIFIED] node_modules/@tauri-apps/plugin-process/dist-js/index.cjs
import { relaunch } from "@tauri-apps/plugin-process";

await relaunch();  // No arguments — internally calls plugin:process|restart
```

### ACL manifest confirming process:default grants allow-restart

```json
// Source: [VERIFIED] src-tauri/gen/schemas/acl-manifests.json
"default_permission": {
  "identifier": "default",
  "permissions": ["allow-exit", "allow-restart"]
}
```

`"process:default"` is already on line 30 of `capabilities/default.json`. No capability change required.

### SafetyBackupsList component sketch (Claude's discretion)

```tsx
// Source: [ASSUMED] — follows existing data-health component patterns
import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";
import { formatBytes } from "@/lib/formatBytes";

interface SafetyBackupEntry {
  filename: string;
  timestamp: string;   // ISO 8601
  size_bytes: number;
}

export const SAFETY_BACKUPS_KEY = ["safety-backups"] as const;

export function SafetyBackupsList() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: SAFETY_BACKUPS_KEY,
    queryFn: () => invoke<SafetyBackupEntry[]>("list_safety_backups"),
  });

  if (isLoading) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">Safety Backups</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No safety backups yet. They are created automatically before restores and rules syncs.
        </p>
      ) : (
        <ul className="space-y-1">
          {entries.map((e) => (
            <li key={e.filename} className="flex justify-between text-sm">
              <span>{new Date(e.timestamp).toLocaleString()}</span>
              <span className="text-muted-foreground">{formatBytes(e.size_bytes)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `handleConfirmRestore` shows placeholder toast | `handleConfirmRestore` invokes `restore_from_backup` + calls `relaunch()` | Phase 82 | RST-06, RST-07, RST-08 complete |
| No safety backup before rules sync | `create_safety_backup` prepended to `useRulesSync.mutationFn` | Phase 82 | SAF-02 complete |
| No safety backup listing on Data Health page | `SafetyBackupsList` component + `list_safety_backups` Rust command | Phase 82 | SAF-04 complete |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `SafetyBackupEntry` struct with `filename`, `timestamp`, `size_bytes` fields is sufficient | Standard Stack / Code Examples | Planner adds more fields — low risk, easy to extend |
| A2 | `list_safety_backups` returns `Vec<SafetyBackupEntry>` as infallible (empty vec on error) rather than `Result<Vec<...>, String>` | Code Examples | If it returns Result, the React Query hook needs to handle the error case — minor change |
| A3 | `SafetyBackupsList` uses a dedicated React Query hook (not inline useQuery) | Code Examples | Claude's discretion area — either approach works |

---

## Open Questions (RESOLVED)

1. **process:default vs process:allow-restart in capabilities**
   - What we know: `process:default` is already in `default.json`; ACL manifest confirms it includes `allow-restart`
   - What's unclear: D-07 says to add `process:allow-restart` specifically — this may have been written without checking the current `default.json` state
   - Recommendation: The plan task for D-07 should verify the capability is already covered and mark the task as "no change needed" or skip it. Do not add a redundant entry.
   - RESOLVED: `process:default` already grants `allow-restart`; no capability change needed (per Pitfall 2). Plan 82-01 Task 1 notes this as already covered.

2. **isRestoring UI state in BackupCard**
   - What we know: D-03 says "show a brief 'Restoring...' state before the relaunch"
   - What's unclear: Whether this requires a dedicated `isRestoring` state variable or can reuse the existing `isValidating` state
   - Recommendation: Add a dedicated `isRestoring` state to keep the UI states semantically distinct.
   - RESOLVED: Dedicated `isRestoring` state added in BackupCard (per 82-02 Task 1). Keeps semantics clear from `isValidating`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `tauri-plugin-process` (Rust) | RST-08 (relaunch) | Yes | 2.3.1 | — |
| `@tauri-apps/plugin-process` (JS) | RST-08 (relaunch) | Yes | 2.3.1 | — |
| `zip` crate | RST-07 (zip extraction) | Yes | 2.x | — |
| `process:allow-restart` capability | RST-08 | Yes (via process:default) | — | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (jsdom environment) |
| Quick run command | `pnpm test -- tests/data-health/backupCard.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| RST-06 | Safety backup created before restore (Rust abort if fails) | Unit (frontend mock) | `pnpm test -- tests/data-health/backupCard.test.tsx` | Yes (extend existing) |
| RST-07 | restore_from_backup invoked with correct path | Unit (frontend mock) | `pnpm test -- tests/data-health/backupCard.test.tsx` | Yes (extend existing) |
| RST-08 | relaunch() called after successful restore_from_backup | Unit (frontend mock) | `pnpm test -- tests/data-health/backupCard.test.tsx` | Yes (extend existing) |
| RST-08 | Error toast shown when restore_from_backup fails; no relaunch | Unit (frontend mock) | `pnpm test -- tests/data-health/backupCard.test.tsx` | Yes (extend existing) |
| SAF-02 | create_safety_backup invoked first in useRulesSync mutation | Unit (mock invoke) | `pnpm test -- tests/rules-sync/useRulesSync.test.ts` | No — Wave 0 gap |
| SAF-04 | SafetyBackupsList renders entries returned by list_safety_backups | Unit (RTL) | `pnpm test -- tests/data-health/SafetyBackupsList.test.tsx` | No — Wave 0 gap |
| SAF-04 | SafetyBackupsList shows empty state when list is empty | Unit (RTL) | `pnpm test -- tests/data-health/SafetyBackupsList.test.tsx` | No — Wave 0 gap |

**Existing test that must be updated (breaks when placeholder is replaced):**
- `tests/data-health/RestorePreviewDialog.test.tsx` line 241-262: tests `toast.info("Restore execution coming in a future update")`. This test must be replaced with a test for real restore behavior.

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/data-health/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/rules-sync/useRulesSync.test.ts` — covers SAF-02 (create_safety_backup called before fetch)
- [ ] `tests/data-health/SafetyBackupsList.test.tsx` — covers SAF-04 (list renders, empty state)
- [ ] Update `tests/data-health/RestorePreviewDialog.test.tsx` — replace placeholder toast test with real restore behavior tests

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Yes | Zip path validated in existing `validate_backup` before being passed to `restore_from_backup` |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal in zip extraction | Tampering | Use `ZipArchive::by_name("hobbyforge.db")` — exact name lookup prevents traversal; consistent with existing `validate_backup` pattern |
| Arbitrary file write via zip entry name | Tampering | Same mitigation — `by_name` only accesses the named entry, not arbitrary paths |

---

## Sources

### Primary (HIGH confidence)

- `src-tauri/src/lib.rs` — direct code inspection of `create_safety_backup` (line 758), `vacuum_to_temp` (line 610), `create_backup_zip` (line 650), `validate_backup` (line 725), `invoke_handler` (line 829)
- `src/features/data-health/BackupCard.tsx` — direct code inspection; identified `selectedPath` gap
- `src-tauri/gen/schemas/acl-manifests.json` — [VERIFIED] process plugin ACL: `process:default` grants `allow-exit` + `allow-restart`
- `src-tauri/capabilities/default.json` — [VERIFIED] `"process:default"` already present on line 30
- `node_modules/@tauri-apps/plugin-process/dist-js/index.cjs` — [VERIFIED] `relaunch()` source: calls `plugin:process|restart` via invoke, no arguments
- `src/hooks/useRulesSync.ts` — direct code inspection; insertion point for pre-sync backup at top of mutationFn
- `Cargo.toml` — [VERIFIED] `zip = "2"`, `tauri-plugin-process = "2.3.1"`, `time = "0.3"` all present
- `package.json` — [VERIFIED] `@tauri-apps/plugin-process ^2.3.1` present

### Secondary (MEDIUM confidence)

- `tests/data-health/backupCard.test.tsx` — existing test patterns; identifies placeholder test to replace
- `tests/data-health/RestorePreviewDialog.test.tsx` — confirms placeholder toast test at line 241-262

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in installed files
- Architecture: HIGH — all integration points verified by direct code inspection
- Pitfalls: HIGH — most identified by direct code reading (selectedPath gap, capability already granted)
- Test gaps: HIGH — confirmed by directory listing

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (stable project; no fast-moving dependencies)
