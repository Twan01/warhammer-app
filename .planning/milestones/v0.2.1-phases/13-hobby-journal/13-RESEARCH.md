# Phase 13: Hobby Journal - Research

**Researched:** 2026-05-03
**Domain:** Tauri v2 file-system plugin, SQL migrations, TanStack Query optimistic mutations, local photo storage
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- One "Journal" tab added as a third tab alongside Details + Playbook in UnitDetailSheet
- Sessions list at top, photo timeline below — single combined tab
- Inline form always visible at top (Date / Duration / Notes + "Log Session" button)
- Date defaults to today on mount and after each submit; form resets and stays open
- Sessions sorted newest first (ORDER BY session_date DESC, id DESC)
- Photos saved to Tauri's `appDataDir()` — same directory as `hobbyforge.db`
- UUID-based filenames (e.g. `a3f8c1d2-unit-42.jpg`) — collision-proof
- JOUR-06 photo cleanup is silent — no second dialog, existing UnitDeleteDialog is sufficient
- Fixed presets + free-text fallback: "Primed", "Base coat", "Washed", "Layer", "Highlighted", "Finished", "Other"
  — selecting "Other" reveals a text input for a custom label
- `image_assets` table lacks `stage_label` — new migration adds `stage_label TEXT`
- Photo file selection uses native file picker dialog — no drag-and-drop
- 3-column thumbnail grid; click → full-size sibling Dialog (mounted at CollectionPage level, not nested in Sheet)
- Full-size viewer shows stage label + caption

### Claude's Discretion
- Exact thumbnail dimensions (UI-SPEC chose 96px / h-24)
- Caption display in grid (UI-SPEC chose hover tooltip)
- Photo deletion UX (UI-SPEC chose immediate + 4-second undo toast)
- Exact `tauri-plugin-fs` capability grant configuration in `tauri.conf.json`
- Which Rust crate version of `tauri-plugin-fs` to pin

### Deferred Ideas (OUT OF SCOPE)
- JOUR-07: Export unit journal as PDF/image
- JOUR-08: Photo before/after comparison slider
- Drag-and-drop photo attach
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| JOUR-01 | User can log a painting session per unit with date, duration in minutes, and optional notes | New `painting_sessions` table (migration 005); `paintingSessions.ts` query module; `useJournalSessions` hook; inline form in JournalTab |
| JOUR-02 | View all painting sessions for a unit in the unit detail sheet, sorted newest first | `ORDER BY session_date DESC, id DESC` in SELECT query; JournalTab session list component |
| JOUR-03 | User can delete a painting session entry | Optimistic delete via `useMutation` onMutate/onError rollback pattern; immediate removal with error-toast rollback |
| JOUR-04 | User can attach a photo to a unit with stage label and optional caption | tauri-plugin-dialog open() for native file picker; tauri-plugin-fs readFile+writeFile to copy to appDataDir with UUID filename; INSERT into `image_assets` with stage_label |
| JOUR-05 | User can view photo timeline as chronological thumbnail gallery with stage labels | `useUnitPhotos` hook; convertFileSrc for asset:// URL; 3-column grid with Skeleton loading state |
| JOUR-06 | Deleting a unit removes its associated photo files from disk | Hook into UnitDeleteDialog.handleConfirm — query image_assets for unit before DELETE, then remove files via tauri-plugin-fs remove(); SQL CASCADE handles DB rows |
</phase_requirements>

---

## Summary

Phase 13 introduces two cross-cutting concerns: a pure-SQL session log (familiar pattern) and a file-system-backed photo timeline (new territory for this codebase). The SQL work follows the exact same pattern as prior phases — a new migration, a query module in `src/db/queries/`, and a hook in `src/hooks/`. The photo work requires two new Tauri plugins (`tauri-plugin-fs` and `tauri-plugin-dialog`) added to both Cargo.toml and the capabilities file, plus the asset protocol enabled in `tauri.conf.json` so that `convertFileSrc()` URLs resolve in `<img>` tags.

The key architectural constraint is the **sibling Dialog pattern** — the photo lightbox Dialog must be mounted at CollectionPage level alongside `UnitDetailSheet`, never nested inside it. This pattern is already established and documented in `CollectionPage.tsx`. The JOUR-06 photo cleanup must happen inside `UnitDeleteDialog.handleConfirm()` before or after the SQL DELETE — the simplest approach is to query `image_assets` for the unit's photos first, delete the DB row (cascade handles it), then remove each file from disk silently.

**Primary recommendation:** Add both `tauri-plugin-fs = "2"` and `tauri-plugin-dialog = "2"` to Cargo.toml, register both plugins in `lib.rs`, add `fs:allow-appdata-read-recursive` + `fs:allow-appdata-write-recursive` + `dialog:allow-open` to `capabilities/default.json`, enable `assetProtocol` in `tauri.conf.json`, then build in the established query/hook/component layering.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tauri-plugin-fs` | `"2"` (resolves to 2.5.1 on crates.io) | Read/write files in appDataDir; remove files for cleanup | Required — no alternative for native FS access in Tauri v2 |
| `tauri-plugin-dialog` | `"2"` (resolves to 2.7.1 on crates.io) | Native file picker dialog for image selection | Required — open() dialog with image filters |
| `@tauri-apps/plugin-fs` | `^2` npm package | JS side of tauri-plugin-fs | Must match Rust plugin version |
| `@tauri-apps/plugin-dialog` | `^2` npm package | JS side of tauri-plugin-dialog | Must match Rust plugin version |
| `@tauri-apps/api/core` | already installed (`^2.0.0`) | `convertFileSrc()` for asset:// URLs | Already in project as `@tauri-apps/api` |
| `@tauri-apps/api/path` | already installed | `appDataDir()`, `join()` for path construction | Already in project |
| TanStack Query v5 | `^5.100.6` (already installed) | Optimistic mutations for session/photo delete | Already in project |
| `crypto.randomUUID()` | Web API (no package needed) | Generate UUID filenames for photos | Built into modern browsers and Tauri webview |
| `sonner` | `^2.0.7` (already installed) | Toast notifications (success, error, undo) | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn `Dialog` | already installed | Full-size photo lightbox | Sibling portal to Sheet |
| shadcn `Select` | already installed | Stage label dropdown | Photo attach form |
| shadcn `Skeleton` | already installed | Loading states for sessions list + photo grid | While queries load |
| shadcn `Tooltip` | already installed | Caption on thumbnail hover | Grid captions |

### Installation

Rust side — add to `src-tauri/Cargo.toml`:
```toml
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
```

JS side — add npm packages:
```bash
pnpm add @tauri-apps/plugin-fs @tauri-apps/plugin-dialog
```

**Version verification (confirmed 2026-05-03 via `cargo search`):**
- `tauri-plugin-fs`: latest = 2.5.1
- `tauri-plugin-dialog`: latest = 2.7.1

---

## Architecture Patterns

### New File Structure
```
src/
├── db/queries/
│   ├── paintingSessions.ts     # NEW — CRUD for painting_sessions table
│   └── unitPhotos.ts           # NEW — CRUD for image_assets (unit photos)
├── hooks/
│   ├── useJournalSessions.ts   # NEW — TanStack Query wrapper for paintingSessions
│   └── useUnitPhotos.ts        # NEW — TanStack Query wrapper for unitPhotos
├── features/units/
│   ├── JournalTab.tsx          # NEW — tab component (accepts unitId: number)
│   ├── SessionRow.tsx          # NEW — single session row with delete button (optional sub-component)
│   ├── ThumbnailCell.tsx       # NEW — single photo cell with hover overlay (optional sub-component)
│   ├── UnitDetailSheet.tsx     # MODIFIED — add Journal TabsTrigger + TabsContent
│   ├── UnitDeleteDialog.tsx    # MODIFIED — add photo file cleanup in handleConfirm
│   └── CollectionPage.tsx      # MODIFIED — add lightbox Dialog state + sibling Dialog
src-tauri/
├── migrations/
│   └── 005_hobby_journal.sql   # NEW — painting_sessions table + stage_label column
├── Cargo.toml                  # MODIFIED — add tauri-plugin-fs + tauri-plugin-dialog
├── src/lib.rs                  # MODIFIED — register both plugins
├── capabilities/default.json   # MODIFIED — add fs + dialog permissions
└── tauri.conf.json             # MODIFIED — enable assetProtocol
```

### Pattern 1: Tauri Plugin Registration (lib.rs)
**What:** Both new plugins must be registered in the builder chain before `.invoke_handler`.
**When to use:** Required for any new Tauri plugin.

```rust
// Source: https://v2.tauri.app/plugin/file-system/
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()
                .expect("failed to resolve app_data_dir");
            std::fs::create_dir_all(&app_data_dir)
                .expect("failed to create app_data_dir");
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())        // ADD
        .plugin(tauri_plugin_dialog::init())    // ADD
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:hobbyforge.db", get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Pattern 2: Capability Grants (capabilities/default.json)
**What:** Permissions must be declared for the fs and dialog plugins.
**When to use:** Required — Tauri v2 denies all plugin calls without explicit capability grants.

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    "sql:allow-load",
    "sql:allow-select",
    "sql:allow-execute",
    "sql:allow-close",
    "fs:default",
    "fs:allow-appdata-read-recursive",
    "fs:allow-appdata-write-recursive",
    "dialog:default",
    "dialog:allow-open"
  ]
}
```

Note: `fs:default` enables the default permission set which covers AppData subdirectory access. The `fs:allow-appdata-read-recursive` and `fs:allow-appdata-write-recursive` grants explicit recursive access needed for reading and writing photo files. `dialog:allow-open` enables the file picker.

### Pattern 3: Asset Protocol (tauri.conf.json)
**What:** Enable `assetProtocol` so `convertFileSrc()` URLs resolve in `<img>` tags.
**When to use:** Required for displaying local files from appDataDir in the webview.

Add to `tauri.conf.json` under `"app"."security"`:
```json
{
  "app": {
    "windows": [...],
    "security": {
      "csp": null,
      "assetProtocol": {
        "enable": true,
        "scope": ["$APPDATA/**"]
      }
    }
  }
}
```

The `$APPDATA/**` scope variable resolves to the platform app data directory. This is the correct approach for Windows (`%APPDATA%\com.hobbyforge.app\`). On Linux, hidden directories starting with `.` need explicit path inclusion, but since this app targets Windows, `$APPDATA/**` is sufficient.

### Pattern 4: Photo Save Flow (JS)
**What:** The complete sequence to save a user-selected photo to disk.

```typescript
// Source: https://v2.tauri.app/reference/javascript/fs/ + https://v2.tauri.app/plugin/dialog/
import { open } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { convertFileSrc } from '@tauri-apps/api/core';

// Step 1: Open native file picker
const selectedPath = await open({
  multiple: false,
  directory: false,
  filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
});
// selectedPath is a string (file path) or null

// Step 2: Read the selected file as binary
const fileData = await readFile(selectedPath as string);
// fileData is Uint8Array

// Step 3: Generate UUID filename
const ext = (selectedPath as string).split('.').pop() ?? 'jpg';
const filename = `${crypto.randomUUID()}.${ext}`;

// Step 4: Write to appDataDir
await writeFile(filename, fileData, { baseDir: BaseDirectory.AppData });

// Step 5: Store the filename (NOT the absolute path) in the DB
// file_path column stores: "a3f8c1d2-....jpg" (relative to appDataDir)
await insertUnitPhoto({ entity_type: 'unit', entity_id: unitId, file_path: filename, ... });

// Step 6: Display — convert stored filename to asset URL at render time
import { appDataDir, join } from '@tauri-apps/api/path';
const dirPath = await appDataDir();
const absolutePath = await join(dirPath, filename);
const assetUrl = convertFileSrc(absolutePath);
// assetUrl = "asset://localhost/%APPDATA%/com.hobbyforge.app/a3f8c1d2-....jpg"
// Use as <img src={assetUrl} />
```

**Critical:** Store only the UUID filename in the DB, not the absolute path. Absolute paths are platform-specific and break cross-machine portability. Reconstruct the absolute path at display time using `appDataDir()`.

### Pattern 5: Optimistic Delete (TanStack Query v5)
**What:** Remove a session or photo from UI immediately, roll back on error.
**When to use:** JOUR-02 session delete; JOUR-03 photo delete.

```typescript
// Source: https://tanstack.com/query/v5/docs/react/guides/optimistic-updates
// Mirrors the toggleActiveProject pattern already in UnitDetailSheet.tsx

export function useDeletePaintingSession() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deletePaintingSession,
    onMutate: async (sessionId) => {
      // Cancel in-flight refetches to prevent overwriting optimistic update
      await qc.cancelQueries({ queryKey: PAINTING_SESSIONS_KEY(unitId) });
      // Snapshot current cache
      const previous = qc.getQueryData(PAINTING_SESSIONS_KEY(unitId));
      // Optimistically remove from cache
      qc.setQueryData(PAINTING_SESSIONS_KEY(unitId), (old: PaintingSession[]) =>
        old?.filter(s => s.id !== sessionId) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      // Roll back to snapshot
      qc.setQueryData(PAINTING_SESSIONS_KEY(unitId), context?.previous);
      toast.error("Failed to delete session — changes were not saved.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: PAINTING_SESSIONS_KEY(unitId) });
    },
  });
}
```

Note: The existing codebase uses a simpler optimistic pattern (snapshot → setQueryData → onError rollback) without `cancelQueries`. Either works. The `onMutate`/`onError`/`onSettled` three-hook pattern is the canonical TanStack Query v5 approach for list mutations.

### Pattern 6: Query Module Pattern (paintingSessions.ts)
**What:** Follows `strategyNotes.ts` exactly — `getDb()` + raw SQL, no ORM.

```typescript
// Follows src/db/queries/strategyNotes.ts pattern
import { getDb } from "@/db/client";
import type { PaintingSession, CreateSessionInput } from "@/types/paintingSession";

export async function getSessionsByUnit(unitId: number): Promise<PaintingSession[]> {
  const db = await getDb();
  return db.select<PaintingSession[]>(
    "SELECT * FROM painting_sessions WHERE unit_id = $1 ORDER BY session_date DESC, id DESC",
    [unitId]
  );
}

export async function createSession(input: CreateSessionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO painting_sessions (unit_id, session_date, duration_minutes, notes)
     VALUES ($1, $2, $3, $4)`,
    [input.unit_id, input.session_date, input.duration_minutes, input.notes ?? null]
  );
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM painting_sessions WHERE id = $1", [id]);
}
```

### Pattern 7: JOUR-06 Photo Cleanup in UnitDeleteDialog
**What:** Before or after the SQL DELETE, fetch the unit's photos, delete files from disk, then let SQL CASCADE clean up the DB rows.

```typescript
// In UnitDeleteDialog.handleConfirm():
async function handleConfirm() {
  if (!unit) return;
  try {
    // 1. Fetch photo file paths for this unit before deleting
    const photos = await getPhotosByUnit(unit.id);  // queries image_assets

    // 2. Delete the unit (SQL CASCADE on image_assets via ON DELETE CASCADE)
    await deleteUnit.mutateAsync(unit.id);

    // 3. Silently delete each photo file from disk
    // Failures are swallowed — orphaned files are preferable to blocking unit delete
    for (const photo of photos) {
      try {
        await remove(photo.file_path, { baseDir: BaseDirectory.AppData });
      } catch {
        // silent — file may already be missing
      }
    }

    toast.success("Unit deleted.");
    onClose();
  } catch {
    toast.error("Something went wrong. Please try again.");
    onClose();
  }
}
```

**Prerequisite:** `image_assets` must have `ON DELETE CASCADE` for the unit foreign key. Check migration 001 — it currently does NOT have a unit_id FK (it's polymorphic: entity_type + entity_id). This means SQL CASCADE is NOT automatic. The photo rows must be deleted explicitly OR the migration 005 approach adds a unit_id FK with CASCADE. **Decision for planner:** Since the table is polymorphic, the safest approach is to explicitly `DELETE FROM image_assets WHERE entity_type='unit' AND entity_id=$1` as part of the deleteUnit flow, then delete files. Alternatively, migration 005 can keep the polymorphic design and rely on the explicit cleanup in handleConfirm.

### Anti-Patterns to Avoid
- **Storing absolute paths in the DB:** Breaks on machine migration and path changes. Store UUID filename only.
- **Nesting the lightbox Dialog inside SheetContent:** Radix portal nesting causes focus trap and z-index conflicts. Confirmed pitfall from Phase 8 STATE.md.
- **Using `open()` from `@tauri-apps/plugin-dialog` without the `dialog:allow-open` capability:** Returns undefined/throws with no clear error message.
- **Using `convertFileSrc` without enabling `assetProtocol`:** Returns an asset:// URL that the webview cannot serve — silent 500 error.
- **Calling `remove()` from plugin-fs without `fs:allow-appdata-write-recursive`:** Fails silently or throws permission error.
- **Reading binary files with `readTextFile`:** Image binary data is corrupted by text encoding. Use `readFile()` which returns `Uint8Array`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Native file picker | Custom HTML `<input type="file">` | `open()` from `@tauri-apps/plugin-dialog` | HTML file input is sandboxed; native dialog gives real filesystem path needed by Tauri FS plugin |
| UUID filename generation | Custom timestamp hash | `crypto.randomUUID()` | Web Crypto API is available in Tauri webview; zero deps, cryptographically random |
| File copy to appDataDir | Manual Rust command | `readFile` + `writeFile` from `@tauri-apps/plugin-fs` | Plugin handles paths, permissions, and error propagation correctly |
| Asset URL for `<img>` | Custom URL string builder | `convertFileSrc()` from `@tauri-apps/api/core` | Handles platform-specific path encoding and protocol routing |

**Key insight:** The native dialog path (`tauri-plugin-dialog`) and file write path (`tauri-plugin-fs`) must be kept separate. The dialog gives you a raw filesystem path string; the fs plugin then reads that path and writes it to appDataDir. Do not try to `copyFile` from an arbitrary user path to appDataDir using plugin-fs `copyFile` with `fromPathBaseDir` — the source is not inside a BaseDirectory, so you must use `readFile` (with absolute path, no baseDir) then `writeFile` (with BaseDirectory.AppData).

---

## Common Pitfalls

### Pitfall 1: readFile with BaseDirectory on a user-selected path
**What goes wrong:** `readFile(selectedPath, { baseDir: BaseDirectory.AppData })` fails because the user-selected path is an absolute path outside AppData, not relative to it.
**Why it happens:** BaseDirectory is a prefix that gets prepended. Combining it with an absolute path produces a nonsensical path.
**How to avoid:** Call `readFile(selectedPath)` with NO baseDir option when the path is absolute (from the dialog). Only use `baseDir` for relative paths within app directories.
**Warning signs:** Error "path not found" or "permission denied" on `readFile` even though the file exists.

### Pitfall 2: assetProtocol not enabled — img src shows broken image
**What goes wrong:** `convertFileSrc()` returns `asset://localhost/...` but the webview cannot serve it, showing a broken image with no error in the console.
**Why it happens:** `assetProtocol` is disabled by default in `tauri.conf.json`.
**How to avoid:** Add `"assetProtocol": { "enable": true, "scope": ["$APPDATA/**"] }` to `tauri.conf.json` under `app.security`. Rebuild is required.
**Warning signs:** `<img>` shows broken image; checking network tab in webview devtools shows 500 or blocked for `asset://` URLs.

### Pitfall 3: painting_sessions migration must be version 5
**What goes wrong:** Registering the migration with version != 5 causes `tauri-plugin-sql` to skip it (already-applied check) or run it out of order.
**Why it happens:** Migrations are tracked by integer version in `_sqlx_migrations`.
**How to avoid:** Add migration to `lib.rs` as `version: 5` and name the file `005_hobby_journal.sql`. Register it as the 5th element in the `get_migrations()` vec.

### Pitfall 4: image_assets polymorphic table has no unit FK cascade
**What goes wrong:** Deleting a unit via SQL does NOT cascade-delete its image_assets rows because there is no FK constraint — only the polymorphic `entity_id` integer column.
**Why it happens:** The polymorphic design (entity_type TEXT, entity_id INTEGER) intentionally avoids FK constraints to support multiple entity types.
**How to avoid:** JOUR-06 cleanup must explicitly DELETE image_assets rows AND remove files in application code (UnitDeleteDialog.handleConfirm), not rely on SQL CASCADE.

### Pitfall 5: Undo toast for photo delete requires temp file preservation
**What goes wrong:** If you delete the file immediately on click, the undo action cannot restore it.
**Why it happens:** Undo needs to re-display the file but it's already gone.
**How to avoid:** Two implementation options — (a) move the file to a temp location and restore on undo, or (b) keep the DB row as soft-delete and only hard-delete on toast expiry. Option (b) is simpler for this codebase. Mark the row as `deleted=1` in DB, filter it from the display query, then hard-delete the file when the 4-second window expires. If undo is clicked, mark `deleted=0`. See UI-SPEC for the exact undo toast pattern.
**Alternative:** The simplest approach that avoids this complexity is to NOT implement undo for the photo delete — use optimistic rollback (same as session delete) instead of an undo toast. The UI-SPEC specifies undo toast; implement it correctly or simplify with planner input.

### Pitfall 6: tauri-plugin-dialog open() return type change between v2 versions
**What goes wrong:** `open()` returns `string | string[] | null` — destructuring as an array when `multiple: false` returns a single string causes a runtime error.
**Why it happens:** The return type is conditional on the `multiple` option, but TypeScript cannot narrow this statically in all plugin versions.
**How to avoid:** When `multiple: false`, cast directly: `const path = result as string | null`. Do not use `result[0]`.

---

## Code Examples

### Migration 005: painting_sessions + stage_label
```sql
-- 005_hobby_journal.sql — HobbyForge v2.1 Phase 13 (JOUR-01..06)
-- Adds painting_sessions table and stage_label column to image_assets.
-- Additive only — no destructive statements.

CREATE TABLE IF NOT EXISTS painting_sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id          INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    session_date     TEXT    NOT NULL,           -- ISO date string 'YYYY-MM-DD'
    duration_minutes INTEGER NOT NULL,
    notes            TEXT,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE image_assets ADD COLUMN stage_label TEXT;
```

Notes:
- `painting_sessions.unit_id` uses `ON DELETE CASCADE` — deleting a unit auto-removes its sessions.
- `image_assets.stage_label` is nullable for backward compatibility with existing rows (no existing rows use photos in production, but the column must be safe to add).
- `session_date` is stored as TEXT ISO 8601 (`YYYY-MM-DD`) — consistent with `purchase_date` and `target_completion_date` in the units table.
- `duration_minutes` is INTEGER — UI displays "45 min" suffix at render time, never stored.

### Hook Key Pattern
```typescript
// Source: mirrors useStrategyNote.ts
export const PAINTING_SESSIONS_KEY = (unitId: number) =>
  ["painting-sessions", unitId] as const;

export const UNIT_PHOTOS_KEY = (unitId: number) =>
  ["unit-photos", unitId] as const;
```

### JournalTab Component Skeleton
```typescript
// Follows PlaybookTab.tsx pattern exactly — accepts unitId: number
interface JournalTabProps {
  unitId: number;
}

export function JournalTab({ unitId }: JournalTabProps) {
  const { data: sessions = [], isLoading: sessionsLoading } = useJournalSessions(unitId);
  const { data: photos = [], isLoading: photosLoading } = useUnitPhotos(unitId);
  // ...
}
```

### UnitDetailSheet — Adding Journal Tab
```typescript
// In UnitDetailSheet.tsx — extend the existing Tabs
<Tabs defaultValue="details" className="px-4">
  <TabsList className="mt-2">
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="playbook">Playbook</TabsTrigger>
    <TabsTrigger value="journal">Journal</TabsTrigger>   {/* ADD */}
  </TabsList>
  {/* existing TabsContent blocks ... */}
  <TabsContent value="journal">                           {/* ADD */}
    <JournalTab unitId={unit.id} />
  </TabsContent>
</Tabs>
```

### CollectionPage — Sibling Lightbox Dialog
```typescript
// ADD lightbox state at CollectionPage level
const [lightboxPhoto, setLightboxPhoto] = useState<UnitPhoto | null>(null);

// MODIFY UnitDetailSheet prop:
<UnitDetailSheet
  ...
  onPhotoClick={(photo) => setLightboxPhoto(photo)}
/>

// ADD sibling Dialog (after UnitDeleteDialog in JSX):
<Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>{lightboxPhoto?.stage_label ?? ""}</DialogTitle>
      <DialogDescription>{lightboxPhoto?.caption ?? ""}</DialogDescription>
    </DialogHeader>
    <img
      src={lightboxPhoto?.assetUrl}
      className="max-h-[70vh] w-auto mx-auto object-contain"
    />
  </DialogContent>
</Dialog>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri v1 `fs` module (`@tauri-apps/api/fs`) | `@tauri-apps/plugin-fs` separate package | Tauri v2.0 (2024) | Import path changed; BaseDirectory enum values changed |
| `appDataDir()` from `@tauri-apps/api/path` | Still `@tauri-apps/api/path` | unchanged | No change |
| `convertFileSrc` from `@tauri-apps/api/tauri` | `convertFileSrc` from `@tauri-apps/api/core` | Tauri v2.0 | Import path updated |
| Tauri v1 `dialog` module | `@tauri-apps/plugin-dialog` separate package | Tauri v2.0 | Import path changed |
| TanStack Query v4 optimistic updates | TanStack Query v5 — same pattern, minor type changes | 2024 | `onMutate` context typing slightly stricter |

---

## Open Questions

1. **Undo toast vs. optimistic rollback for photo delete**
   - What we know: UI-SPEC specifies undo toast with 4-second window for photo deletion (CONTEXT.md §Claude's Discretion)
   - What's unclear: Implementing true undo requires preserving the file temporarily (soft-delete or temp copy), which adds meaningful complexity
   - Recommendation: Planner should decide — implement soft-delete pattern (simpler: `deleted INTEGER DEFAULT 0` column added to image_assets in migration 005, hard-delete deferred), OR simplify to optimistic rollback without undo. The soft-delete approach requires one additional column and a `setTimeout` for the hard-delete.

2. **tauri-plugin-dialog dependency already in project?**
   - What we know: It is NOT in current `Cargo.toml` or `package.json`
   - What's unclear: Whether `@tauri-apps/plugin-dialog` JS package needs explicit npm install or ships with the Rust plugin
   - Recommendation: Explicitly add both `tauri-plugin-dialog = "2"` to Cargo.toml AND `pnpm add @tauri-apps/plugin-dialog` to be safe. The Tauri plugin architecture requires both sides.

3. **Photo display performance with many photos**
   - What we know: Each photo URL requires `appDataDir()` async call + `join()` + `convertFileSrc()` — this is per-photo
   - What's unclear: Whether caching `appDataDir()` result at hook level is needed for smooth grid rendering
   - Recommendation: Cache `appDataDir()` once at the `useUnitPhotos` hook level via a `useEffect` or memoize it, not per-render per-thumbnail.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 (inferred from Phase 11 notes) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm vitest run tests/hobby-journal/` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JOUR-01 | `createSession()` inserts row with correct SQL | unit | `pnpm vitest run tests/hobby-journal/paintingSessionQueries.test.ts` | ❌ Wave 0 |
| JOUR-02 | `getSessionsByUnit()` returns rows ORDER BY session_date DESC, id DESC | unit | `pnpm vitest run tests/hobby-journal/paintingSessionQueries.test.ts` | ❌ Wave 0 |
| JOUR-03 | `useDeletePaintingSession` optimistic update removes from cache; onError rolls back | unit | `pnpm vitest run tests/hobby-journal/useJournalSessions.test.ts` | ❌ Wave 0 |
| JOUR-04 | `createUnitPhoto()` inserts row with stage_label column; SQL verified | unit | `pnpm vitest run tests/hobby-journal/unitPhotoQueries.test.ts` | ❌ Wave 0 |
| JOUR-05 | JournalTab renders skeleton while loading, renders photo grid when data arrives | integration | `pnpm vitest run tests/hobby-journal/JournalTab.test.tsx` | ❌ Wave 0 |
| JOUR-06 | `getPhotosByUnit(id)` returns file_path list for cleanup; deleteSession cascades | unit | `pnpm vitest run tests/hobby-journal/unitPhotoQueries.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run tests/hobby-journal/`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/hobby-journal/paintingSessionQueries.test.ts` — covers JOUR-01, JOUR-02
- [ ] `tests/hobby-journal/useJournalSessions.test.ts` — covers JOUR-03 optimistic delete
- [ ] `tests/hobby-journal/unitPhotoQueries.test.ts` — covers JOUR-04, JOUR-06
- [ ] `tests/hobby-journal/JournalTab.test.tsx` — covers JOUR-05 render states
- [ ] `tests/hobby-journal/migration005.test.ts` — verifies SQL in 005_hobby_journal.sql is well-formed

Test pattern: mock `getDb()` via `vi.mock("@/db/client", ...)` — same as `strategyNoteQueries.test.ts`. No real DB connection needed. Tauri plugin calls (`readFile`, `writeFile`, `open()`, `convertFileSrc`) are mocked at the hook/component boundary.

---

## Sources

### Primary (HIGH confidence)
- [Tauri File System Plugin docs](https://v2.tauri.app/plugin/file-system/) — permissions, BaseDirectory, copyFile/writeFile/readFile/remove APIs
- [Tauri FS JS Reference](https://v2.tauri.app/reference/javascript/fs/) — TypeScript signatures for all fs functions
- [Tauri Dialog Plugin docs](https://v2.tauri.app/plugin/dialog/) — `open()` API, image filters, `dialog:allow-open` capability
- [Tauri Core JS Reference](https://v2.tauri.app/reference/javascript/api/namespacecore/) — `convertFileSrc()` signature and usage
- `cargo search tauri-plugin-fs` — version 2.5.1 confirmed 2026-05-03
- `cargo search tauri-plugin-dialog` — version 2.7.1 confirmed 2026-05-03
- Existing `src-tauri/capabilities/default.json` — current permission structure to extend
- Existing `src-tauri/src/lib.rs` — plugin registration pattern to follow
- Existing `src/db/queries/strategyNotes.ts` — query module pattern
- Existing `src/hooks/useStrategyNote.ts` — hook pattern with staleTime: Infinity
- Existing `src/features/units/UnitDetailSheet.tsx` — Tabs structure to extend
- Existing `src/features/units/CollectionPage.tsx` — sibling portal pattern to follow
- Existing `src/features/units/UnitDeleteDialog.tsx` — handleConfirm to extend for JOUR-06
- Existing `src-tauri/migrations/001_core_schema.sql` — image_assets table definition (polymorphic, no unit FK)

### Secondary (MEDIUM confidence)
- [Tauri Discussion #11498](https://github.com/orgs/tauri-apps/discussions/11498) — asset protocol scope configuration, confirmed working with `$APPDATA/**`
- [TanStack Query v5 Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates) — onMutate/onError/onSettled pattern

### Tertiary (LOW confidence)
- Tauri Discussion #9306 — writeFile binary data (partially resolved; baseDir behavior confirmed via official docs)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via cargo search (exact versions) and official Tauri v2 docs
- Architecture: HIGH — directly extrapolated from existing codebase patterns (strategyNotes, PlaybookTab, CollectionPage)
- Pitfalls: HIGH for Pitfalls 1-4 (verified against official docs and existing schema); MEDIUM for Pitfalls 5-6 (inferred from plugin version behavior)
- Migration: HIGH — follows established 004_unit_playbook_stats.sql pattern
- Validation architecture: HIGH — mirrors existing test file structure and mock patterns

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (30 days — Tauri plugin APIs are stable; version numbers may drift)
