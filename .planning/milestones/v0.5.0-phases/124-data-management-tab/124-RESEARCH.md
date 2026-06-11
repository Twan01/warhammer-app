# Phase 124: Data Management Tab - Research

**Researched:** 2026-06-10
**Domain:** Tauri 2 file I/O, Tauri commands (Rust), React Query cache invalidation, destructive confirmation UX
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — Data Health Link:** Simple card/section at top of Data tab with brief description ("View diagnostics, backup & restore") and a button/link that navigates to `/data-health` using TanStack Router's `useNavigate()`. No inline health status summary.

**D-02 — Factory Reset scope:** Wipes all user data from `hobbyforge.db` by dropping and re-running migrations. Canonical unit database (udb_* tables) is rebuilt automatically at relaunch by the existing import hook. Photo files in `appDataDir()` are also deleted during reset.

**D-03 — Multi-step confirmation flow:** (1) Destructive-styled "Factory Reset" button. (2) Confirmation dialog explaining what will be lost. (3) User must type a confirmation phrase into a text input to enable the final "Reset" button.

**D-04 — Safety backup before reset:** Call `create_safety_backup` Rust command before executing reset — same pattern as BackupCard restore flow.

**D-05 — App restart after reset:** Call `relaunch()` from `@tauri-apps/plugin-process` after reset completes.

**D-06 — DB reset implementation:** New Rust command `factory_reset` that closes the DB connection, deletes the `hobbyforge.db` file, and lets Tauri's migration plugin recreate it on relaunch.

**D-07 — Export JSON structure:** `{ "version": 1, "exported_at": "ISO date", "settings": { "key": "value", ... } }`. Reads all rows via `getAppSettings()`.

**D-08 — Export file dialog:** Native save dialog via `save()` from `@tauri-apps/plugin-dialog`, suggested filename `hobbyforge-preferences-YYYY-MM-DD.json`, JSON file filter. Writes via `writeTextFile()` from `@tauri-apps/plugin-fs`.

**D-09 — Import file dialog:** Native open dialog via `open()` from `@tauri-apps/plugin-dialog` with JSON file filter. Reads file, validates JSON structure.

**D-10 — Import success flow:** Invalidate `APP_SETTINGS_KEY` React Query cache. Show success toast with count of imported settings.

**D-11 — Import validation:** If JSON is malformed or missing version field, show error toast and do not modify any settings. No partial imports — validate entire file before writing any values.

### Claude's Discretion
- Layout and visual hierarchy within the Data tab (card sections, spacing, dividers)
- Exact confirmation phrase text for factory reset
- Whether to show a loading spinner during reset or just let the app close and relaunch
- Error handling UX for file read/write failures during export/import
- Whether export/import buttons are in a single card or separate sections

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DAT-01 | Settings Data tab shows a link to navigate to Data Health page | `useNavigate()` from TanStack Router; `dataHealthRoute` at `/data-health` already exists in `router.tsx` |
| DAT-02 | User can trigger a factory reset with multi-step confirmation; after reset app restarts with clean DB | New `factory_reset` Rust command; `AlertDialog` + text input confirm pattern; `create_safety_backup` + `relaunch()` |
| DAT-03 | User can export current preferences to a JSON file via file picker | `getAppSettings()` + `save()` dialog + `writeTextFile()` — all proven in codebase |
| DAT-04 | User can import a previously exported preferences JSON file; all settings update to imported values | `open()` dialog + `readTextFile()` + validate + `upsertAppSetting()` per key + `APP_SETTINGS_KEY` invalidation |
</phase_requirements>

---

## Summary

Phase 124 replaces the Data tab placeholder in `src/app/settings/page.tsx` with four real features. All four rely exclusively on patterns that already exist in the codebase — there is nothing net-new to discover architecturally. The work splits cleanly into frontend (React component composition) and backend (one new Rust command).

The most complex piece is the `factory_reset` Rust command (DAT-02). The pattern for it is clear from the existing `restore_from_backup` command: safety backup first, then destructive file-system operation, then the caller relaunches. The difference is that factory reset deletes the DB file rather than replacing it — Tauri's migration plugin recreates a fresh DB on the next startup. Photo files are stored as flat UUID-named files (e.g. `a3f8c1d2-xxxx.jpg`) directly in `appDataDir()` — NOT in subdirectories — and must be enumerated and deleted by extension.

The export/import flow (DAT-03, DAT-04) is a thin wrapper around `getAppSettings()` / `upsertAppSetting()` with file I/O using already-imported Tauri plugins. The main correctness requirement for import is all-or-nothing validation: read the entire file, check structure, then write — never write partial state.

**Primary recommendation:** Build a `DataManagementTab` component that composes four sub-sections. Frontend-only for DAT-01/03/04; add the `factory_reset` Tauri command in Rust for DAT-02.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Data Health navigation link | Frontend (React) | — | Pure routing — `useNavigate()` to existing route |
| Factory reset DB wipe | Rust backend | Frontend (confirmation UI) | File deletion must happen outside the JS bridge; frontend owns confirmation flow |
| Factory reset confirmation UI | Frontend (React) | — | Multi-step dialog is pure UI state |
| Safety backup before reset | Rust backend | — | Delegates to existing `create_safety_backup` command |
| App restart after reset | Frontend (React) | — | `relaunch()` called from JS after Rust command succeeds |
| localStorage clearing | Frontend (React) | — | `localStorage.clear()` called from JS after invoke succeeds, before `relaunch()` |
| Preference export | Frontend (React) | — | JS reads DB via existing hook, writes file via plugin-fs |
| Preference import | Frontend (React) | — | JS reads file, validates, writes DB via existing query function |
| Import cache invalidation | Frontend (React Query) | — | Standard `invalidateQueries` on `APP_SETTINGS_KEY` |

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Installed Version | Purpose | Source |
|---------|------------------|---------|--------|
| `@tauri-apps/plugin-dialog` | 2.7.1 | Native save/open file pickers | [VERIFIED: package.json] |
| `@tauri-apps/plugin-fs` | 2.5.1 | `writeTextFile`, `readTextFile` | [VERIFIED: package.json + node_modules export check] |
| `@tauri-apps/plugin-process` | 2.3.1 | `relaunch()` after reset | [VERIFIED: package.json] |
| `@tauri-apps/api` | 2.0.0 | `invoke()` for Rust commands | [VERIFIED: package.json] |
| `@tanstack/react-query` | (project standard) | Cache invalidation after import | [VERIFIED: codebase patterns] |
| shadcn `AlertDialog` | (project standard) | Confirmation dialog for factory reset | [VERIFIED: used in codebase] |
| shadcn `Card`, `Button` | (project standard) | Tab section layout | [VERIFIED: used across features] |
| `sonner` (toast) | (project standard) | Success/error notifications | [VERIFIED: used across features] |

**No new packages required for this phase.**

---

## Package Legitimacy Audit

> No new packages are introduced in this phase. All dependencies are already installed.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User interaction (Settings page -> Data tab)
         |
         v
DataManagementTab component
   |-- DataHealthLinkSection
   |       +-- useNavigate() -> /data-health route
   |
   |-- FactoryResetSection
   |       +-- AlertDialog (step 1 explanation)
   |               +-- text input "RESET" confirmation (step 2)
   |                       +-- invoke("factory_reset")  --> Rust: factory_reset
   |                               |-- create_safety_backup (existing Rust fn)
   |                               |-- delete hobbyforge.db file
   |                               +-- delete flat UUID photo files (by extension)
   |                       +-- localStorage.clear()
   |                       +-- relaunch() -> app restarts, migrations recreate DB
   |
   |-- PreferenceExportSection
   |       +-- getAppSettings() --> DB: SELECT * FROM app_settings
   |               +-- save() dialog -> writeTextFile(path, json)
   |                       +-- toast.success
   |
   +-- PreferenceImportSection
           +-- open() dialog -> readTextFile(path)
                   +-- JSON.parse + validate (version field + settings object)
                           +-- upsertAppSetting(key, value) x N
                                   +-- invalidateQueries(APP_SETTINGS_KEY)
                                           +-- toast.success(count)
```

### Recommended Project Structure

```
src/
  app/settings/
    page.tsx              # Update: replace Data tab placeholder with DataManagementTab
  features/settings/      # (create if not exists, or add to existing)
    DataManagementTab.tsx  # New component: composes all 4 sections
src-tauri/src/
  lib.rs                  # Add: factory_reset command + register in invoke_handler
```

### Pattern 1: TanStack Router `useNavigate` for Data Health link

**What:** Programmatic navigation to `/data-health` from a button within the Settings tab.
**When to use:** Whenever navigating from within a component that is already inside the router tree.

```typescript
// Source: established codebase pattern (router.tsx)
import { useNavigate } from "@tanstack/react-router";

function DataHealthLinkSection() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Data Health</p>
          <p className="text-sm text-muted-foreground">View diagnostics, backup &amp; restore</p>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/data-health" })}>
          Open Data Health
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Pattern 2: Multi-step Destructive Confirmation with AlertDialog + typed phrase

**What:** AlertDialog with a text input that must equal a specific phrase before the final action button is enabled.
**When to use:** Factory reset and other irreversible operations.

```typescript
// Source: BackupCard.tsx / RestorePreviewDialog.tsx patterns + shadcn AlertDialog
import { AlertDialog, AlertDialogContent, AlertDialogHeader,
         AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
         AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

const CONFIRM_PHRASE = "RESET";
const [phrase, setPhrase] = useState("");
const canConfirm = phrase === CONFIRM_PHRASE;

<AlertDialogFooter>
  <AlertDialogCancel>Cancel</AlertDialogCancel>
  <Button
    variant="destructive"
    disabled={!canConfirm || isResetting}
    onClick={handleFactoryReset}
  >
    {isResetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting...</> : "Reset App"}
  </Button>
</AlertDialogFooter>
```

### Pattern 3: Safety backup + Rust command + localStorage clear + relaunch

**What:** Call `create_safety_backup`, then invoke the destructive command, clear localStorage, then call `relaunch()`.
**When to use:** Any action that irreversibly destroys user data.

```typescript
// Source: BackupCard.tsx handleConfirmRestore pattern (extended with localStorage.clear)
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";

async function handleFactoryReset() {
  setIsResetting(true);
  try {
    await invoke("factory_reset"); // Rust handles safety backup internally
    localStorage.clear(); // Clear stale sidebar state, backup status, view modes
    await relaunch();
  } catch (error) {
    toast.error(`Reset failed: ${error instanceof Error ? error.message : String(error)}`);
    setIsResetting(false);
  }
}
```

### Pattern 4: Preference Export (save dialog + writeTextFile)

**What:** Build JSON payload from `getAppSettings()`, open save dialog, write to chosen path.
**When to use:** Any feature that lets the user export data to a user-chosen file location.

```typescript
// Source: ArmyListDetailSheet.tsx handleSaveJson pattern
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { getAppSettings } from "@/db/queries/appSettings";

async function handleExport() {
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
}
```

### Pattern 5: Preference Import (open dialog + readTextFile + validate + upsert all)

**What:** Open JSON file, parse + validate entire structure, then write all keys atomically.
**When to use:** Any import operation where partial state is worse than no-op.

```typescript
// Source: JournalTab.tsx open dialog pattern + appSettings query layer
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { upsertAppSetting } from "@/db/queries/appSettings";
import { useQueryClient } from "@tanstack/react-query";
import { APP_SETTINGS_KEY } from "@/hooks/useAppSettings";

const qc = useQueryClient();

async function handleImport() {
  const path = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  }) as string | null;
  if (!path) return;

  let payload: unknown;
  try {
    const raw = await readTextFile(path);
    payload = JSON.parse(raw);
  } catch {
    toast.error("Could not read file — is it a valid JSON file?");
    return;
  }

  // Validate entire structure before writing anything
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as { version?: unknown }).version !== 1 ||
    typeof (payload as { settings?: unknown }).settings !== "object"
  ) {
    toast.error("Invalid preferences file — missing version or settings");
    return;
  }

  const entries = Object.entries((payload as { settings: Record<string, unknown> }).settings);
  for (const [key, value] of entries) {
    if (typeof value === "string") {
      await upsertAppSetting(key, value);
    }
  }
  await qc.invalidateQueries({ queryKey: APP_SETTINGS_KEY });
  toast.success(`Imported ${entries.length} setting(s)`);
}
```

### Pattern 6: Rust `factory_reset` command

**What:** Tauri command that creates a safety backup, deletes hobbyforge.db (and sidecars + flat UUID photo files), then returns. The JS caller handles `localStorage.clear()` + `relaunch()`.
**Key insight:** The safety backup is best handled inside the Rust command rather than called separately from JS — this mirrors how `restore_from_backup` calls `create_safety_backup` internally. Simpler JS caller, atomic guarantee.

> **CORRECTION (post-research):** Photos are stored as flat UUID-named files (e.g. `a3f8c1d2-xxxx.jpg`) directly in `appDataDir()`, NOT in subdirectories like `unit-photos/` or `step-photos/`. The Rust command must enumerate the directory and delete files matching image extensions, not call `remove_dir_all` on subdirectories.

```rust
// Source: restore_from_backup + create_safety_backup patterns in lib.rs
#[tauri::command]
async fn factory_reset(app: tauri::AppHandle) -> Result<(), String> {
    // 1. Safety backup (abort if this fails — DB still intact)
    create_safety_backup(app.clone()).await?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;

    // 2. Delete hobbyforge.db and WAL sidecars
    for suffix in ["", "-wal", "-shm", "-journal"] {
        let p = app_data_dir.join(format!("hobbyforge.db{suffix}"));
        if let Err(e) = std::fs::remove_file(&p) {
            if e.kind() != std::io::ErrorKind::NotFound {
                return Err(format!("delete hobbyforge.db{suffix}: {e}"));
            }
        }
    }

    // 3. Delete flat UUID photo files by extension (NOT subdirectories)
    let image_extensions = ["jpg", "jpeg", "png", "webp", "gif"];
    if let Ok(entries) = std::fs::read_dir(&app_data_dir) {
        for entry in entries.flatten() {
            if let Some(ext) = entry.path().extension() {
                if image_extensions.contains(&ext.to_string_lossy().to_lowercase().as_str()) {
                    let _ = std::fs::remove_file(entry.path()); // best-effort
                }
            }
        }
    }

    Ok(())
    // JS caller then calls localStorage.clear() + relaunch()
    // Migration plugin recreates hobbyforge.db on startup
}
```

**Registration** — add to `invoke_handler`:
```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    factory_reset,  // add this
])
```

### Anti-Patterns to Avoid

- **Calling `relaunch()` inside the Rust command:** The Rust command cannot call `relaunch()` — it has no JS bridge access. Always call `relaunch()` from the JS side after `invoke("factory_reset")` resolves.
- **Partial imports:** Never write any settings to DB if validation fails. Validate the complete payload first, then write all keys in a loop.
- **Skipping the safety backup:** The factory reset is irreversible. Safety backup must succeed before deleting — if `create_safety_backup` throws, abort the reset entirely.
- **Using `readFile` (bytes) instead of `readTextFile` (string) for JSON:** The codebase uses `readFile` for binary (photos), `readTextFile` for text. JSON import uses `readTextFile`.
- **Resetting the AlertDialog phrase input state on open:** If the dialog is opened, then cancelled, then reopened, the phrase input must be cleared. Reset `phrase` state `onOpenChange` when dialog closes.
- **Using `remove_dir_all` for photo cleanup:** Photos are NOT in subdirectories. They are flat UUID files in appDataDir root. Use `read_dir` + extension filter + `remove_file` instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Native file picker | Custom file input or HTML `<input type="file">` | `save()` / `open()` from `@tauri-apps/plugin-dialog` | Native OS dialog, no web security restrictions, same pattern used in 4+ existing features |
| File write to arbitrary path | `fetch` or base64 tricks | `writeTextFile()` from `@tauri-apps/plugin-fs` | Established pattern; handles platform path differences |
| File read from arbitrary path | `fetch` | `readTextFile()` from `@tauri-apps/plugin-fs` | Same reason; proven in JournalTab/RecipeFormSheet |
| App restart | `window.location.reload()` | `relaunch()` from `@tauri-apps/plugin-process` | Full native process restart; used in BackupCard and UpdateBanner |
| DB deletion via SQL | `DELETE FROM` all tables loop | Delete the .db file in Rust | 44 migrations = 44+ tables; file delete is simpler and guarantees clean state including the `_sqlx_migrations` table |
| Confirmation dialog from scratch | Custom modal | shadcn `AlertDialog` | Project standard, accessible, matches existing destructive patterns |

---

## Common Pitfalls

### Pitfall 1: `open()` returns `string | string[] | null` — must cast to `string | null`
**What goes wrong:** TypeScript type of `open()` result is `string | string[] | null`. If `multiple: false`, it's always `string | null`, but TypeScript doesn't narrow this automatically.
**Why it happens:** The plugin API is typed for both single and multiple selections.
**How to avoid:** Cast: `const path = await open({ multiple: false, ... }) as string | null;`
**Warning signs:** TypeScript error "string[] is not assignable to string".

### Pitfall 2: AlertDialog phrase input not reset when dialog re-opens
**What goes wrong:** User opens dialog, types partial phrase, cancels, reopens — input still shows previous text.
**Why it happens:** React state is preserved when a controlled component re-renders without unmounting.
**How to avoid:** Reset `phrase` to `""` inside the `onOpenChange` handler when `open` becomes `false`.

### Pitfall 3: `factory_reset` Tauri command not registered in `invoke_handler`
**What goes wrong:** `invoke("factory_reset")` throws "command not found" at runtime with no compile error.
**Why it happens:** Rust function exists but isn't wired into the Tauri handler macro.
**How to avoid:** Add `factory_reset` to the `tauri::generate_handler![]` macro call in `lib.rs`. Compile with `pnpm tauri dev` to catch this immediately.

### Pitfall 4: `_sqlx_migrations` table survives if DB is not actually deleted
**What goes wrong:** If the delete operation is skipped (e.g., path resolution failure), `relaunch()` is called on an intact DB — no reset occurs, but the app behaves as if reset succeeded.
**Why it happens:** `std::fs::remove_file` with NotFound tolerance can mask path mismatches.
**How to avoid:** After deleting, do NOT tolerate errors other than `NotFound` for the main `hobbyforge.db` file (only sidecars can be NotFound-tolerated). Return an error to JS if the main file deletion fails.

### Pitfall 5: Photo files are flat UUID files, not in subdirectories
**What goes wrong:** Using `remove_dir_all("unit-photos")` or `remove_dir_all("step-photos")` finds no such directories — photos are never cleaned up.
**Why it happens:** The initial assumption (A1) was wrong. Photos are stored as flat UUID-named files (e.g. `a3f8c1d2-xxxx.jpg`) directly in `appDataDir()` root, not in subdirectories.
**How to avoid:** Enumerate `appDataDir()` with `std::fs::read_dir`, filter by image extensions (`jpg`, `jpeg`, `png`, `webp`, `gif`), delete each file individually (best-effort).

### Pitfall 6: Import validation allows wrong types for setting values
**What goes wrong:** A preferences JSON from a future version might have numeric or boolean values. Importing these as-is breaks `app_settings` (which is string-typed).
**Why it happens:** `JSON.parse` returns `unknown` but entries could be non-strings.
**How to avoid:** In the import loop, only upsert entries where `typeof value === "string"`. Skip other types silently (or count them as skipped in the toast message).

---

## Code Examples

### Verified: `save()` dialog + `writeTextFile` (from ArmyListDetailSheet.tsx)
```typescript
// Source: src/features/army-lists/ArmyListDetailSheet.tsx lines 243-249
const destination = await save({
  title: "Save Army List as JSON",
  defaultPath: `${slugify(list.name)}-${dateStamp()}.json`,
  filters: [{ name: "JSON", extensions: ["json"] }],
});
if (!destination) return;
await writeTextFile(destination, jsonString);
```

### Verified: `open()` dialog (from JournalTab.tsx / BackupCard.tsx)
```typescript
// Source: src/features/data-health/BackupCard.tsx lines 96-103
const result = await openDialog({
  multiple: false,
  directory: false,
  filters: [{ name: "Backup Archive", extensions: ["zip"] }],
}) as string | null;
if (result === null) return;
```

### Verified: `relaunch()` after destructive operation (from BackupCard.tsx)
```typescript
// Source: src/features/data-health/BackupCard.tsx line 133
await invoke("restore_from_backup", { path: selectedPath });
await relaunch();
```

### Verified: `readTextFile` export from plugin-fs
```
// Source: node_modules/@tauri-apps/plugin-fs/dist-js/index.js (confirmed via node -e)
// Exports: readDir, readFile, readTextFile, readTextFileLines, writeTextFile
import { readTextFile } from "@tauri-apps/plugin-fs";
```

### Verified: React Query cache invalidation after mutation
```typescript
// Source: src/hooks/useAppSettings.ts lines 17-25
export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }) => upsertAppSetting(key, value),
    onSuccess: () => { qc.invalidateQueries({ queryKey: APP_SETTINGS_KEY }); },
  });
}
// For bulk import: call qc.invalidateQueries({ queryKey: APP_SETTINGS_KEY }) after all upserts
```

---

## Runtime State Inventory

> This is not a rename/refactor phase. Factory reset deliberately clears runtime state — the inventory below describes what the reset operation must address, not what needs to be preserved.

| Category | Items to clear on factory reset | Action Required |
|----------|---------------------------------|-----------------|
| Stored data | `hobbyforge.db` — all user tables (collection, paints, army lists, recipes, etc.) | Delete file; migration plugin recreates on relaunch |
| Stored data | `_sqlx_migrations` tracking table | Deleted with the DB file — recreated on relaunch |
| OS-registered state | None — no OS-level registrations | None |
| Secrets/env vars | None — no user secrets stored | None |
| Photos | Unit photos, step photos, recipe cover images — flat UUID files in `appDataDir()` root | Enumerate by extension + `remove_file` in Rust command |
| localStorage | `lastBackup`, sidebar state, view modes | `localStorage.clear()` in JS caller after invoke succeeds, before `relaunch()` |

---

## Environment Availability

> Step 2.6: No new external dependencies for this phase. All Tauri plugins and shadcn components are already installed.

All required APIs (`@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-process`, `@tauri-apps/api/core`) are registered in `src-tauri/src/lib.rs` in the plugin chain. The only new thing is a Rust function — no new Cargo dependencies needed (uses `std::fs` only).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + React Testing Library 16.3.2 |
| Config file | `vitest.config.ts` (inferred from project) |
| Quick run command | `pnpm test -- tests/settings/` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DAT-01 | Data tab renders Data Health link section with button | unit | `pnpm test -- tests/settings/DataManagementTab.test.tsx` | No (Wave 0) |
| DAT-01 | Clicking "Open Data Health" calls `useNavigate` with `{ to: "/data-health" }` | unit | same file | No (Wave 0) |
| DAT-02 | Factory Reset button is present and styled destructive | unit | same file | No (Wave 0) |
| DAT-02 | Confirmation dialog opens on click; Reset button disabled until phrase typed | unit | same file | No (Wave 0) |
| DAT-02 | Correct phrase enables button; invoke("factory_reset") + relaunch() called on confirm | unit | same file | No (Wave 0) |
| DAT-02 | Error toast shown and dialog not relaunched if invoke throws | unit | same file | No (Wave 0) |
| DAT-03 | Export calls `save()` dialog with JSON filter and `writeTextFile` | unit | same file | No (Wave 0) |
| DAT-03 | Export cancelled if save dialog returns null | unit | same file | No (Wave 0) |
| DAT-04 | Import calls `open()` dialog, reads file, calls upsertAppSetting per key | unit | same file | No (Wave 0) |
| DAT-04 | Import shows error toast if JSON is malformed | unit | same file | No (Wave 0) |
| DAT-04 | Import shows error toast if version field missing | unit | same file | No (Wave 0) |
| DAT-04 | Import invalidates APP_SETTINGS_KEY cache on success | unit | same file | No (Wave 0) |

### Mock Strategy (mirrors BackupCard test pattern)

```typescript
// All Tauri plugin APIs must be mocked — established pattern from backupCard.test.tsx
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: mockSave, open: mockOpen }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeTextFile: mockWriteTextFile, readTextFile: mockReadTextFile }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: mockRelaunch }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));
```

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/settings/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/settings/DataManagementTab.test.tsx` — covers all DAT-01 through DAT-04 behaviors

*(Existing `tests/settings/SettingsPage.test.tsx` covers the tab shell; new test file covers the new tab content component.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | JSON structure validation before any DB write (version field check + type guard on values) |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed import JSON causing partial DB corruption | Tampering | Validate entire payload before writing any key (D-11 decision) |
| Path traversal via `save()` destination | Tampering | Tauri plugin-dialog handles path selection; user explicitly chooses location |
| Factory reset triggered without confirmation | Elevation of privilege | Three-step flow: button -> dialog -> typed phrase -> action |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `readFile` (bytes) for text files | `readTextFile` (string) for JSON | `readTextFile` is the idiomatic choice; `readFile` returns `Uint8Array` requiring manual decode |
| Separate JS safety-backup call before destructive action | Rust command handles safety backup internally | Simpler JS caller; backup+delete is atomic from JS perspective |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong | Status |
|---|-------|---------|---------------|--------|
| A1 | ~~Photo files are stored in subdirectories named `unit-photos` and `step-photos` under `appDataDir()`~~ | Pitfall 5 / factory_reset pattern | N/A | **RESOLVED — WRONG.** Photos are flat UUID files directly in `appDataDir()` root. Plan 01 and Pattern 6 updated to enumerate by extension. |

---

## Open Questions (RESOLVED)

1. **Exact photo directory names under `appDataDir()`** (RESOLVED)
   - **Resolution:** Photos are stored as flat UUID-named files (e.g. `a3f8c1d2-xxxx.jpg`) directly in `appDataDir()` root, NOT in subdirectories. Confirmed by PATTERNS.md investigation. The Rust `factory_reset` command enumerates the directory and deletes files matching image extensions (`jpg`, `jpeg`, `png`, `webp`, `gif`). Plan 01 Task 1 and Pattern 6 updated accordingly.

2. **localStorage clearing on factory reset** (RESOLVED)
   - **Resolution:** Factory reset WILL clear localStorage via `localStorage.clear()` in the JS caller, after `invoke("factory_reset")` succeeds but before `relaunch()`. Rationale: sidebar collapsed state, backup status timestamps, view mode preferences, etc. all reference data from the now-deleted DB — leaving them creates stale state. This falls under Claude's Discretion per CONTEXT.md. Plan 02 Task 1 handleFactoryReset updated to include `localStorage.clear()`.

---

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/lib.rs` — `create_safety_backup`, `restore_from_backup`, `export_backup` commands; exact Rust patterns verified by direct read
- `src/features/data-health/BackupCard.tsx` — `save()` dialog, `invoke`, `relaunch()`, toast patterns; verified by direct read
- `src/features/army-lists/ArmyListDetailSheet.tsx` — `save()` + `writeTextFile` pattern; verified by direct read
- `src/features/units/JournalTab.tsx` — `open()` + `readFile` pattern; verified by direct read
- `src/hooks/useAppSettings.ts` — `APP_SETTINGS_KEY`, `useAppSettings`, `useUpdateSetting`; verified by direct read
- `src/db/queries/appSettings.ts` — `getAppSettings()`, `upsertAppSetting()`; verified by direct read
- `src/app/router.tsx` — `dataHealthRoute` at `/data-health` confirmed; verified by direct read
- `node_modules/@tauri-apps/plugin-fs` — `readTextFile` export confirmed; verified via node -e check
- `package.json` — all plugin versions confirmed

### Secondary (MEDIUM confidence)
- `tests/data-health/backupCard.test.tsx` — Tauri API mock patterns (`vi.mock` for plugin-dialog, plugin-process, api/core); verified by direct read

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json and node_modules
- Architecture: HIGH — every pattern has a direct codebase precedent
- Pitfalls: HIGH — derived from actual code paths and TypeScript types
- Rust command design: HIGH — mirrors existing `restore_from_backup` structure exactly

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (stable Tauri 2 + project conventions)
