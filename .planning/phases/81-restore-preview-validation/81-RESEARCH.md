# Phase 81: Restore Preview + Validation - Research

**Researched:** 2026-05-18
**Domain:** Tauri file dialog + backup validation + AlertDialog confirmation gate
**Confidence:** HIGH

## Summary

Phase 81 adds a non-destructive restore preview flow to the Data Health page. Users click "Restore from Backup" on the existing BackupCard, select a `.zip` file through the native file picker, and see a preview dialog showing the backup's manifest details (date, app version, schema version, platform, database size). Schema compatibility rules gate the confirmation button: newer-than-current backups block the restore; older backups warn but allow it; matching versions proceed cleanly.

All Rust backend work is complete from Phase 79 -- the `validate_backup` command already parses a `.zip` file and returns a `BackupManifest` struct without modifying any files. The frontend work is: (1) add a restore button to BackupCard, (2) wire the file picker to invoke `validate_backup`, (3) build a RestorePreviewDialog with schema compatibility logic, and (4) add a `get_schema_version` Tauri command so the frontend can compare versions.

**Primary recommendation:** Extend BackupCard with a second button, create a self-contained RestorePreviewDialog component using AlertDialog, and add one small Rust command (`get_schema_version`) to expose the migration count to the frontend.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** "Restore from backup" button lives on the existing BackupCard alongside the export button
- **D-02:** Button uses `open` from `@tauri-apps/plugin-dialog` filtered to `.zip` files. The `dialog:allow-open` capability is already granted
- **D-03:** After file selection, AlertDialog-based dialog opens showing parsed BackupManifest: backup date, app version, schema version, platform, database size
- **D-04:** Dialog calls `invoke("validate_backup", { path })` -- the Rust command from Phase 79 that returns BackupManifest without modifying files
- **D-05:** If validation fails (corrupt zip, missing metadata.json, missing hobbyforge.db), show error toast and do not open preview dialog
- **D-06:** Schema version comparison uses app's current migration count vs manifest.schema_version. Must be dynamic
- **D-07:** Newer backup: Red error banner, "Continue" button disabled. Message: "This backup was created with a newer version of HobbyForge. Update the app before restoring."
- **D-08:** Older backup: Amber warning banner, "Continue" button enabled. Message: "This backup was created with an older version. Some data may need migration after restore."
- **D-09:** Same version: No banner, clean preview with enabled "Continue" button
- **D-10:** Action button reads "Replace current database" (names the destructive action)
- **D-11:** Dialog description explains current database replacement and automatic safety backup creation
- **D-12:** Action button disabled while preview is loading and when schema version is newer-than-current
- **D-13:** Clicking "Replace current database" does NOT perform restore -- saves validated path/manifest to state, shows placeholder toast
- **D-14:** Frontend needs current app schema version (migration count). Add `get_schema_version() -> u32` Tauri command or reuse existing data

### Claude's Discretion
- Component decomposition (inline vs extracted RestorePreviewDialog)
- Whether to create a dedicated React Query hook for validate_backup or use raw invoke
- Loading state UX during validation (spinner placement, skeleton vs loader)
- Exact wording of warning/error messages (spirit of D-07/D-08 must be preserved)
- Whether the "coming soon" placeholder (D-13) is a toast or inline message

### Deferred Ideas (OUT OF SCOPE)
- Actual restore execution (file swap, sidecar cleanup, app restart) -- Phase 82
- Automatic safety backup before restore -- Phase 82 (RST-06)
- Safety backup listing on Data Health -- Phase 82 (SAF-04)
- Backup diagnostics (never-backed-up flag, staleness threshold) -- Phase 83
- Selective restore (choose which tables) -- Future requirement RST-F01
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RST-01 | User can select a backup .zip file to restore from Data Health page | File picker pattern verified in 3 components; `dialog:allow-open` already in capabilities |
| RST-02 | App validates backup manifest and metadata before restore | `validate_backup` Rust command exists (lib.rs line 768), returns BackupManifest or error |
| RST-03 | User sees preview of what will be restored (app version, schema version, date, size) | BackupManifest struct has all fields; AlertDialog pattern established in codebase |
| RST-04 | App rejects backups with schema version newer than current app | Requires `get_schema_version` command (new); comparison logic is frontend |
| RST-05 | App warns if backup schema is older (but allows restore) | Same comparison mechanism as RST-04; amber warning banner in dialog |
| RST-09 | Restore does not proceed without explicit user confirmation | AlertDialog with "Replace current database" button; placeholder toast until Phase 82 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| File picker (.zip selection) | Browser / Client | -- | Tauri dialog plugin bridges native OS picker from the frontend |
| Backup validation | API / Backend (Rust) | -- | Rust `validate_backup` command reads and parses zip; already implemented |
| Schema version retrieval | API / Backend (Rust) | -- | Migration count is a Rust-side value (`get_migrations().len()`) |
| Preview display | Browser / Client | -- | Pure React UI rendering manifest data |
| Schema compatibility logic | Browser / Client | -- | Simple integer comparison after both values are available |
| Confirmation gate | Browser / Client | -- | AlertDialog UX pattern, entirely frontend |

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/plugin-dialog` | 2.x | Native file picker for .zip selection | Already used in 3 components for image picking |
| `@tauri-apps/api/core` | 2.x | `invoke()` to call Rust commands | Standard Tauri invoke pattern used throughout |
| `radix-ui` (via shadcn) | latest | AlertDialog primitive | Already wrapped in `src/components/ui/alert-dialog.tsx` |
| `sonner` | latest | Toast notifications for errors/placeholder | Already used for all feedback throughout app |
| `lucide-react` | latest | Icons (Upload, Loader2, AlertTriangle, ShieldAlert) | Standard icon library per CLAUDE.md |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | 5.x | Optional: wrap `validate_backup` + `get_schema_version` in hooks | If creating reusable hooks; raw invoke is also acceptable |

**Installation:** No new packages required. All dependencies are already installed.

## Package Legitimacy Audit

No new packages to install. All libraries referenced are already in the project's dependency tree. Audit not required.

## Architecture Patterns

### System Architecture Diagram

```
BackupCard "Restore from Backup" button
    |
    v
open() -- native file picker (filtered: .zip)
    |
    v  (path: string | null)
[null? -> abort]
    |
    v
invoke("validate_backup", { path })  -- Rust reads zip, parses metadata.json
    |
    +-- ERROR --> toast.error("Invalid backup file: {reason}")
    |
    +-- OK (BackupManifest) --> invoke("get_schema_version") -- Rust returns migration count
                                      |
                                      v
                              RestorePreviewDialog opens
                              (manifest data + schema comparison)
                                      |
                              +-- NEWER: action button disabled, red error banner
                              +-- OLDER: action button enabled, amber warning banner
                              +-- MATCH: action button enabled, green badge
                                      |
                              User clicks "Replace current database"
                                      |
                                      v
                              toast.info("Restore execution coming in a future update")
                              [D-13 placeholder until Phase 82]
```

### Recommended Project Structure

```
src/
  features/
    data-health/
      BackupCard.tsx          # MODIFY: add restore button + dialog trigger logic
      RestorePreviewDialog.tsx # NEW: AlertDialog-based preview + confirmation
      DataHealthPage.tsx       # NO CHANGE
  types/
    backup.ts                  # NEW: BackupManifest TypeScript interface
  lib/
    formatBytes.ts             # NEW: human-readable byte formatting utility

src-tauri/
  src/lib.rs                   # MODIFY: add get_schema_version command + register it
```

### Pattern 1: File Picker for .zip Selection

**What:** Open native file picker filtered to `.zip` files using the established pattern.
**When to use:** When user clicks "Restore from Backup".
**Example:**
```typescript
// Source: Existing pattern in JournalTab.tsx (line 100), RecipeFormSheet.tsx (line 186)
import { open as openDialog } from "@tauri-apps/plugin-dialog";

const result = (await openDialog({
  multiple: false,
  directory: false,
  filters: [{ name: "Backup Archive", extensions: ["zip"] }],
})) as string | null;
if (result === null) return; // user cancelled
```
[VERIFIED: codebase grep -- 3 existing usages of `open` with identical pattern]

### Pattern 2: Tauri Invoke with Typed Response

**What:** Call Rust commands with typed generics for the return value.
**When to use:** For `validate_backup` and `get_schema_version` calls.
**Example:**
```typescript
// Source: Existing pattern in BackupCard.tsx (line 54)
import { invoke } from "@tauri-apps/api/core";

interface BackupManifest {
  app_version: string;
  schema_version: number;
  created_at: string;
  platform: string;
  db_size_bytes: number;
}

const manifest = await invoke<BackupManifest>("validate_backup", { path });
const currentSchema = await invoke<number>("get_schema_version");
```
[VERIFIED: codebase grep -- invoke pattern used in BackupCard and bulk_sync_rules]

### Pattern 3: AlertDialog for Destructive Confirmation

**What:** Controlled AlertDialog with programmatic open state.
**When to use:** For the restore preview dialog.
**Example:**
```typescript
// Source: RecipeSectionCard.tsx (line 259) -- existing AlertDialog usage
<AlertDialog open={previewOpen} onOpenChange={setPreviewOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Restore Backup</AlertDialogTitle>
      <AlertDialogDescription>
        Review the backup details below. Restoring will replace your
        current database. A safety backup will be created automatically.
      </AlertDialogDescription>
    </AlertDialogHeader>
    {/* manifest details + schema banner */}
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        disabled={schemaState === "newer"}
        className={buttonVariants({ variant: "destructive" })}
        onClick={handleRestore}
      >
        Replace current database
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```
[VERIFIED: codebase grep -- AlertDialog used in RecipeSectionCard with controlled `open` prop]

### Anti-Patterns to Avoid
- **Using Dialog instead of AlertDialog for destructive actions:** AlertDialog requires explicit action (not dismissable by clicking overlay), which is correct for a database replacement confirmation.
- **Calling validate_backup and get_schema_version sequentially in waterfall:** Both can be called in parallel after file selection to minimize perceived latency. However, `get_schema_version` is very fast, so sequential is also acceptable.
- **Storing restore state globally (Zustand/Context):** D-13 says component state is sufficient for the placeholder. Phase 82 can promote to a store if needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File picker | Custom file input element | `open` from `@tauri-apps/plugin-dialog` | Native OS dialog with proper security scoping |
| Backup validation | Frontend zip parsing | `validate_backup` Rust command | Rust already validates zip structure, metadata presence, and JSON parsing |
| Destructive confirmation UX | Custom modal with backdrop click dismiss | AlertDialog (Radix) | Prevents accidental dismissal; accessibility built-in |
| Byte formatting | Inline math | Dedicated `formatBytes` utility | Reusable, handles KB/MB/GB edge cases correctly |

## Common Pitfalls

### Pitfall 1: Schema Version Source Confusion
**What goes wrong:** Frontend uses `PRAGMA user_version` (database's recorded version) instead of the app's expected migration count for comparison.
**Why it happens:** `useSchemaVersions()` already exists and returns `PRAGMA user_version`. But the correct comparison is manifest.schema_version vs `get_migrations().len()` (the app's code version).
**How to avoid:** Add a dedicated `get_schema_version` Rust command that returns `get_migrations().len() as u32`. Do NOT use the existing `useSchemaVersions()` hook -- it returns the DB's version, not the app's version. In a healthy state these are equal, but after a failed migration they could diverge.
**Warning signs:** Tests pass locally but comparison logic is wrong when DB version differs from code version.

### Pitfall 2: File Picker Return Type
**What goes wrong:** TypeScript infers `string | string[] | null` from `open()`.
**Why it happens:** The `open` function return type varies based on `multiple` option.
**How to avoid:** Cast explicitly: `(await openDialog({ multiple: false, ... })) as string | null`. This is the established codebase pattern (JournalTab.tsx line 100).
**Warning signs:** TypeScript error on `result` usage without cast.

### Pitfall 3: AlertDialogAction Default Behavior
**What goes wrong:** AlertDialogAction closes the dialog automatically on click (Radix behavior). If you need to prevent close on certain conditions, you must handle it.
**Why it happens:** Radix AlertDialogAction has built-in close-on-click.
**How to avoid:** For the placeholder implementation (D-13), this is actually fine -- the dialog should close and show the toast. For Phase 82, the action handler will need to manage async state before closing.
**Warning signs:** Dialog closes before async operation completes.

### Pitfall 4: Destructive Button Styling on AlertDialogAction
**What goes wrong:** AlertDialogAction uses the default button variant (primary), not destructive.
**Why it happens:** shadcn AlertDialogAction applies `buttonVariants()` with no variant override.
**How to avoid:** Add `className={buttonVariants({ variant: "destructive" })}` to the AlertDialogAction, or override with Tailwind classes directly. The UI spec (Section 4) specifies destructive variant.
**Warning signs:** "Replace current database" button appears in primary blue instead of destructive red.

### Pitfall 5: Race Condition on Dialog Open
**What goes wrong:** Dialog opens before validation completes, showing stale or empty data.
**Why it happens:** Setting `open=true` before the invoke resolves.
**How to avoid:** Only set `previewOpen` to `true` after `validate_backup` returns successfully. Store the manifest in state first, then open the dialog.
**Warning signs:** Flash of empty dialog or loading skeleton inside the preview.

## Code Examples

### BackupManifest TypeScript Interface
```typescript
// Source: mirrors Rust struct at src-tauri/src/lib.rs line 621
// File: src/types/backup.ts
export interface BackupManifest {
  app_version: string;
  schema_version: number;
  created_at: string;
  platform: string;
  db_size_bytes: number;
}
```
[VERIFIED: matches Rust `BackupManifest` struct in lib.rs]

### get_schema_version Rust Command
```rust
// Source: follows pattern of existing commands in lib.rs
// Add to src-tauri/src/lib.rs
#[tauri::command]
fn get_schema_version() -> u32 {
    get_migrations().len() as u32
}
// Register in invoke_handler: add `get_schema_version` to generate_handler![]
```
[VERIFIED: `get_migrations()` is the same function used by `export_backup` and `create_safety_backup` for schema_version]

### Format Bytes Utility
```typescript
// File: src/lib/formatBytes.ts
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${sizes[i]}`;
}
```
[ASSUMED -- standard byte formatting implementation]

### Schema Comparison Logic
```typescript
// Inline in RestorePreviewDialog
type SchemaState = "match" | "older" | "newer";

function getSchemaState(manifestVersion: number, currentVersion: number): SchemaState {
  if (manifestVersion > currentVersion) return "newer";
  if (manifestVersion < currentVersion) return "older";
  return "match";
}
```
[VERIFIED: logic matches D-07/D-08/D-09 from CONTEXT.md]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `backup_database` (raw .db copy) | `export_backup` (structured .zip) | Phase 79 (v0.2.14) | Backups now include metadata.json for validation |
| No restore preview | `validate_backup` + preview dialog | Phase 81 (this phase) | Users see what they're restoring before committing |

**Deprecated/outdated:**
- `backup_database` command still exists for backward compatibility but `export_backup` is the preferred path going forward

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/data-health/` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RST-01 | File picker opens filtered to .zip; null cancels gracefully | unit | `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx -x` | Wave 0 |
| RST-02 | validate_backup invoke called with selected path | unit | `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx -x` | Wave 0 |
| RST-03 | Preview dialog renders all manifest fields | unit | `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx -x` | Wave 0 |
| RST-04 | Newer schema disables action button + shows error banner | unit | `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx -x` | Wave 0 |
| RST-05 | Older schema shows warning banner but keeps button enabled | unit | `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx -x` | Wave 0 |
| RST-09 | Action button text is "Replace current database"; clicking shows placeholder toast | unit | `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/data-health/ -x`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/data-health/RestorePreviewDialog.test.tsx` -- covers RST-01 through RST-05, RST-09
- [ ] `tests/data-health/formatBytes.test.ts` -- covers byte formatting utility
- [ ] `tests/data-health/schemaComparison.test.ts` -- covers schema state logic (match/older/newer)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | yes | Rust `validate_backup` validates zip structure, metadata.json presence and schema; frontend does not parse zip |
| V6 Cryptography | no | -- |

### Known Threat Patterns for Tauri File Dialog

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via zip entries | Tampering | Rust `validate_backup` reads by exact name ("hobbyforge.db", "metadata.json") -- no path traversal possible |
| Malformed metadata.json | Tampering | `serde_json::from_str` rejects invalid JSON; typed deserialization rejects wrong schema |
| Oversized zip file | Denial of Service | Not mitigated in Phase 81 (read-only preview); actual extraction is Phase 82's concern |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `formatBytes` implementation is standard and correct | Code Examples | Incorrect display of database size; low risk, easily tested |
| A2 | `get_schema_version` can be a sync (non-async) Tauri command since `get_migrations()` is a pure function with no I/O | Code Examples | If Tauri requires async, simply add `async` keyword; trivial fix |

## Open Questions

1. **D-14 Resolution: Reuse vs New Command**
   - What we know: `useSchemaVersions()` returns `PRAGMA user_version` from the DB. `get_migrations().len()` is the app code's migration count. In a healthy state these are equal.
   - What's unclear: Whether to reuse `useSchemaVersions().hobbyforge` or add a new `get_schema_version` command.
   - Recommendation: Add the new Rust command. It returns the definitive "app expects this schema version" value, which is the correct comparand. The DB's `user_version` could theoretically diverge after a failed migration. Cost is ~5 lines of Rust.

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/lib.rs` lines 620-795 -- BackupManifest struct, validate_backup command, export_backup command
- `src/features/data-health/BackupCard.tsx` -- existing backup card with export flow
- `src/components/ui/alert-dialog.tsx` -- AlertDialog component wrapper
- `src/features/recipes/RecipeSectionCard.tsx` -- AlertDialog usage pattern for destructive confirmation
- `src/features/units/JournalTab.tsx` -- `open` dialog pattern for file picker
- `src/hooks/useDiagnostics.ts` -- existing diagnostics hooks and BackupStatus pattern
- `src/db/queries/diagnostics.ts` -- getSchemaVersions using PRAGMA user_version
- `src-tauri/capabilities/default.json` -- `dialog:allow-open` confirmed present
- `.planning/phases/81-restore-preview-validation/81-UI-SPEC.md` -- UI design contract
- `.planning/phases/81-restore-preview-validation/81-CONTEXT.md` -- locked decisions D-01 through D-14

### Secondary (MEDIUM confidence)
- `src-tauri/migrations/*.sql` -- 28 hobbyforge migrations counted (confirms migration count is the schema version)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new deps
- Architecture: HIGH - all patterns verified in existing codebase, Rust command exists
- Pitfalls: HIGH - identified from codebase inspection and Tauri/Radix behavior

**Research date:** 2026-05-18
**Valid until:** 2026-06-18 (stable -- no external dependencies or fast-moving APIs)
