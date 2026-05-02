# Pitfalls Research

**Domain:** HobbyForge v2.1 — Faction Dynamic Theming, Dashboard Redesign, Collapsible Sidebar, Collection Gallery, Hobby Journal (file system), Spending Tracker — added to existing Tauri 2 + React 19 + Tailwind v4 + shadcn/ui + SQLite app
**Researched:** 2026-05-02
**Confidence:** HIGH — derived from codebase audit (globals.css, tauri.conf.json, 001_core_schema.sql), confirmed Tailwind v4 GitHub issues, Tauri bug tracker, SQLite official documentation. Confidence levels noted per finding.

---

## Critical Pitfalls

### Pitfall 1: Tailwind v4 `@theme inline` Breaks Runtime CSS Variable Overrides

**What goes wrong:**
The current `globals.css` uses `@theme inline { --color-accent: hsl(var(--accent)); ... }`. With `@theme inline`, Tailwind bakes the value directly into each generated utility class at build time — no intermediate CSS variable is emitted. This means that when you do `document.documentElement.style.setProperty('--accent', '...')` at runtime to swap faction colors, the Tailwind utilities like `bg-accent` and `text-accent` do NOT update. The `inline` keyword tells Tailwind "resolve this to a static value now," so there is no live CSS variable chain to override.

**Why it happens:**
`@theme inline` is the shadcn/ui default setup — it makes dark mode theming work by resolving tokens at build time. Faction dynamic theming requires the opposite approach: tokens must stay as live CSS variables that can be overridden at runtime. The two requirements are in fundamental tension in Tailwind v4's architecture.

**How to avoid:**
Use `@theme` (without `inline`) for any token that must be swappable at runtime. The current globals.css already uses `@theme inline` for the full design system. For faction-specific accent tokens, do NOT put them in `@theme inline`. Instead:

1. Define faction accent tokens as plain CSS custom properties in `:root` (not inside `@theme`):
   ```css
   :root {
     --faction-accent: #4A90D9;         /* default / Space Marines blue */
     --faction-accent-foreground: #ffffff;
   }
   [data-faction="chaos"] {
     --faction-accent: #8B0000;
     --faction-accent-foreground: #ffffff;
   }
   [data-faction="necrons"] {
     --faction-accent: #00FF41;
     --faction-accent-foreground: #000000;
   }
   ```
2. Register these as Tailwind utilities via `@theme` (not `@theme inline`):
   ```css
   @theme {
     --color-faction-accent: var(--faction-accent);
     --color-faction-accent-foreground: var(--faction-accent-foreground);
   }
   ```
3. Apply `data-faction="..."` to the `<html>` or root wrapper in React when faction selection changes.

Do NOT use JavaScript's `setProperty` to override tokens defined in `@theme inline` — it will not work because those tokens have no live CSS variable at runtime.

**Warning signs:**
- `document.documentElement.style.setProperty('--accent', newColor)` is called but `bg-accent` does not update
- Faction color changes work in DevTools' Elements panel variable override but not via JavaScript
- `@theme inline` wraps the faction accent tokens

**Phase to address:** Faction Dynamic Theming phase — CSS architecture decision before any theming code is written. The `globals.css` refactor (splitting `@theme inline` tokens from runtime-swappable `@theme` tokens) must be the first deliverable of this phase.

---

### Pitfall 2: Tailwind v4 Dynamic Faction Utility Classes Get Purged at Build Time

**What goes wrong:**
If faction-conditional classes are constructed dynamically in JSX — e.g., `` className={`bg-${faction.slug}-accent`} `` or `` className={`border-${factionColor}`} `` — Tailwind v4's scanner cannot detect them at build time. Those classes will not be emitted in the production CSS bundle. The app works in dev (Vite/Tailwind scans on demand) but the production build silently drops the faction utility classes, breaking theming in the packaged Tauri app.

**Why it happens:**
Tailwind v4 (like all Tailwind versions) scans source files for complete class strings. Partial string construction at runtime (template literals, array joins) defeats the scanner. The JIT engine cannot predict what the runtime values will be.

**How to avoid:**
Never construct Tailwind class names by concatenating partial strings. Two safe patterns:

**Pattern A — data attribute + CSS (preferred):**
Put faction color logic entirely in CSS using `[data-faction="x"]` selectors (see Pitfall 1). The JSX only sets `data-faction={factionSlug}` on the root element — no dynamic class names.

**Pattern B — Lookup table:**
If faction-specific Tailwind classes are needed in JSX, use a complete static lookup table:
```typescript
const FACTION_CLASSES: Record<string, string> = {
  space_marines: "bg-blue-700 border-blue-500 text-blue-100",
  chaos: "bg-red-900 border-red-700 text-red-100",
  necrons: "bg-green-400 border-green-300 text-black",
};
// Safe: Tailwind scanner sees all complete strings in this file
className={FACTION_CLASSES[faction.slug]}
```

Do NOT use: `` className={`bg-${faction.slug}-accent`} ``

**Warning signs:**
- Faction theming works in `pnpm dev` but breaks in `pnpm build` + Tauri production
- Tailwind utilities with faction-derived suffixes appear in dev DevTools but not in the production CSS file
- `grep -r "bg-\${faction" src/` finds template literal class construction

**Phase to address:** Faction Dynamic Theming phase — this pattern must be established before any faction-conditional JSX styling is written.

---

### Pitfall 3: shadcn Sidebar's `group-data-[collapsible=icon]` Classes Must Exist as Literal Strings

**What goes wrong:**
The shadcn/ui sidebar component uses classes like `group-data-[collapsible=icon]:hidden` and `group-data-[collapsible=icon]:w-[--sidebar-width-icon]` extensively. These are data-attribute variant selectors. In Tailwind v4, these are detected by the scanner IF AND ONLY IF they appear as complete literal strings somewhere in the scanned source files. If the sidebar component is copy-pasted from shadcn but the class strings are split across template expressions or refactored into variables, the scanner misses them.

A known bug was reported (shadcn-ui/ui #8975, December 2025): `SidebarMenuButton size="lg"` does not collapse properly to icon-only mode with Tailwind v4 — specifically the `size="lg"` variant lacks the `group-data-[collapsible=icon]` overrides needed to shrink correctly.

**Why it happens:**
The shadcn sidebar component was written for Tailwind v3's JIT. In v4, the scanning works the same way for content detection, but the `@source` directive and automatic content detection may not pick up all the sidebar component's internal paths if the component lives outside the default scan boundary.

**How to avoid:**
- Copy the full shadcn sidebar component verbatim via `npx shadcn@latest add sidebar` — do not hand-write the component.
- After adding, verify the sidebar component file is within Tailwind's automatic scan boundary (Tailwind v4 scans all files in the project by default, but confirm with a test build).
- If collapsing to icon mode is broken, do NOT use `size="lg"` on `SidebarMenuButton`. Use the default size until the upstream bug is resolved.
- For the collapsible icon sidebar feature, prefer `collapsible="icon"` mode (Tauri desktop doesn't need "offcanvas" for mobile).
- Add a Tailwind `@source` safelist for the sidebar data-attribute variants if scanning misses them:
  ```css
  /* globals.css — force-include sidebar collapse classes */
  @source inline("group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-8");
  ```

**Warning signs:**
- Sidebar collapses but nav item labels don't hide (text overflows the icon-width sidebar)
- Sidebar width doesn't change on collapse (the width utility was purged)
- Sidebar tooltips don't appear in icon mode
- Size="lg" buttons don't shrink when sidebar is collapsed

**Phase to address:** Collapsible Icon Sidebar phase — verify icon collapse mode works end-to-end in a production build before integrating faction theming on top of it.

---

### Pitfall 4: `convertFileSrc` Returns 400 on Windows When Path Contains Backslashes

**What goes wrong:**
In the Hobby Journal feature, photos are stored on disk and their paths saved in SQLite. To display a photo in the Tauri WebView, you call `convertFileSrc(absolutePath)` to get an `asset://` URL. On Windows, native paths use backslashes (`C:\Users\antoi\AppData\Local\HobbyForge\photos\unit_42\photo.jpg`). The Tauri `convertFileSrc` function does NOT auto-convert backslashes to forward slashes — it returns a 400 Bad Request when the path contains backslashes (confirmed Tauri bug #7970, #8244).

**Why it happens:**
`convertFileSrc` encodes the path into a URL, but Windows backslashes (`\`) are percent-encoded incorrectly or not handled by the asset protocol's path resolution. The Tauri Rust backend expects URL-style forward-slash paths even on Windows.

**How to avoid:**
Always normalize the path to forward slashes before calling `convertFileSrc`:
```typescript
function toAssetUrl(windowsPath: string): string {
  const normalized = windowsPath.replace(/\\/g, '/');
  return convertFileSrc(normalized);
}
```

Use this wrapper everywhere — never call `convertFileSrc` directly in component code. Apply it at the point of reading the path from SQLite before rendering `<img src={...} />`.

Also configure the asset protocol scope in `tauri.conf.json` to allow the photos directory:
```json
"app": {
  "security": {
    "csp": "default-src 'self' ipc: http://ipc.localhost; img-src 'self' asset: http://asset.localhost",
    "assetProtocol": {
      "enable": true,
      "scope": { "allow": ["$APPLOCALDATA/**"] }
    }
  }
}
```

Without the asset protocol scope, even correct forward-slash paths return 403 Forbidden.

**Warning signs:**
- `<img src={convertFileSrc(path)} />` renders a broken image icon on Windows
- Network tab in Tauri DevTools shows 400 for asset:// URLs
- Photos display in dev but not in the production Tauri bundle

**Phase to address:** Hobby Journal phase — establish the `toAssetUrl()` wrapper and asset protocol config before writing any photo display component. This is a Windows-only app (per PROJECT.md), making this a guaranteed issue, not an edge case.

---

### Pitfall 5: Photos Stored as Absolute Paths in SQLite Break on App Reinstall

**What goes wrong:**
The existing `image_assets` table stores `file_path TEXT NOT NULL` (see `001_core_schema.sql` line 171). If photo paths are stored as absolute Windows paths — e.g., `C:\Users\antoi\AppData\Local\HobbyForge\photos\unit_42\photo.jpg` — they will break if:
- The user uninstalls and reinstalls the app (Tauri clears `AppLocalData` on uninstall depending on the Windows installer settings)
- The user moves the data directory
- The username or drive letter changes (e.g., new PC migration)
- The app's identifier (`com.hobbyforge.app`) changes in a future version

All stored paths become dangling references pointing to non-existent files. The app shows broken images with no actionable error.

**Why it happens:**
Storing absolute paths is the path of least resistance — `appLocalDataDir()` returns a full path, and saving that full path to SQLite "just works" until the base directory changes.

**How to avoid:**
Store **relative paths** anchored to the `appLocalDataDir`. The SQLite row saves `photos/unit_42/2026-05-02_photo.jpg`. At display time, prepend `appLocalDataDir()` dynamically:
```typescript
async function resolvePhotoPath(relativePath: string): Promise<string> {
  const base = await appLocalDataDir();
  const full = await join(base, relativePath);
  return toAssetUrl(full); // applies backslash normalization
}
```

On load, if a relative path produces a non-existent file (check with `exists()` from `tauri-plugin-fs`), display a "photo missing" placeholder rather than a broken image tag.

Also: create a dedicated photos subdirectory per unit — `photos/unit_{id}/` — so photos are grouped and can be cleaned up per unit. Do NOT dump all photos into a flat `photos/` directory.

**Warning signs:**
- `image_assets.file_path` starts with `C:\` or contains the username in the path
- Photo display breaks after any app data migration
- No "photo missing" fallback UI exists

**Phase to address:** Hobby Journal phase — path storage strategy must be decided before the first photo upload is implemented. Retrofitting relative paths after data exists requires a data migration.

---

### Pitfall 6: `image_assets` Orphan Rows When Parent Unit Is Deleted (Polymorphic FK Gap)

**What goes wrong:**
The `image_assets` table uses a polymorphic pattern: `entity_type TEXT, entity_id INTEGER`. There is no foreign key constraint from `image_assets` to any specific parent table (FK constraints cannot reference a polymorphic entity_id across multiple tables). When a unit is deleted (via `ON DELETE CASCADE` or `ON DELETE RESTRICT` depending on the relationship), the corresponding `image_assets` rows where `entity_type = 'unit'` are NOT automatically deleted — SQLite has no mechanism to enforce polymorphic FK cascades. This leaves orphan rows in `image_assets` pointing to deleted units, and more importantly, the physical photo files on disk remain forever.

**Why it happens:**
The polymorphic table design (entity_type + entity_id) is flexible but sacrifices referential integrity. SQLite cannot define `REFERENCES units(id)` when entity_type might also be `'recipe'` or `'project'` in future use.

**How to avoid:**
Two-part solution:

1. **Application-level cascade:** In the `deleteUnit` query function (`src/db/queries/units.ts`), before calling the DELETE on `units`, delete associated `image_assets` rows AND delete the physical files:
   ```typescript
   // 1. Fetch all file paths for this unit's images
   const photos = await db.select<{file_path: string}[]>(
     "SELECT file_path FROM image_assets WHERE entity_type = 'unit' AND entity_id = $1",
     [unitId]
   );
   // 2. Delete each physical file
   for (const { file_path } of photos) {
     const full = await join(await appLocalDataDir(), file_path);
     await remove(full);
   }
   // 3. Delete the image_assets rows
   await db.execute(
     "DELETE FROM image_assets WHERE entity_type = 'unit' AND entity_id = $1",
     [unitId]
   );
   // 4. Now delete the unit (FK RESTRICT on army_list_units is still checked)
   await db.execute("DELETE FROM units WHERE id = $1", [unitId]);
   ```

2. **Periodic orphan sweep (future safety net):** On app startup, scan for `image_assets` rows whose files don't exist and delete them. This catches any gaps from crashes during deletion.

**Warning signs:**
- Deleting a unit does not decrease disk usage (photo files remain)
- `SELECT COUNT(*) FROM image_assets` grows unboundedly over time even as units are deleted
- No file deletion logic exists in `deleteUnit` query function

**Phase to address:** Hobby Journal phase — the photo deletion flow must be built into the unit deletion path before any photos can be added. Add a migration for a new cleanup helper if needed.

---

### Pitfall 7: SQLite `REAL` for Purchase Price Already in Schema — Must Not Be Used for Spending Tracker Totals

**What goes wrong:**
The `units` table already has `purchase_price REAL` (see `001_core_schema.sql` line 38). SQLite's REAL type is IEEE 754 double-precision floating-point. Storing `£12.99` as `REAL` introduces a classic binary floating-point representation error: `12.99` cannot be represented exactly in binary. Summing hundreds of REAL purchase prices accumulates floating-point drift. For example, summing 100 prices of `£0.99` gives `98.99999999999999` rather than `99.00`.

For the Spending Tracker, if totals are computed with `SUM(purchase_price)` on REAL columns, the per-faction spend and total spend figures will have penny-level errors that display as `£1,247.9999999997` instead of `£1,248.00`.

**Why it happens:**
`purchase_price REAL` was the path of least resistance in the v1 schema — it's the natural SQL type for a decimal number. The error is not visible for single values displayed in the units table (rounding hides it) but becomes visible in aggregation.

**How to avoid:**
For the Spending Tracker's new tables (unit costs, paint costs), store all monetary values as **INTEGER pence** (or cents for non-GBP):
```sql
CREATE TABLE spending_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  amount_pence INTEGER NOT NULL,  -- £12.99 stored as 1299
  currency TEXT NOT NULL DEFAULT 'GBP',
  ...
);
```

At display time, divide by 100 with `toFixed(2)` formatting. Never use `parseFloat` on currency strings.

For the existing `purchase_price REAL` on `units`: add a migration that adds `purchase_price_pence INTEGER` and backfills it via `ROUND(purchase_price * 100)` for existing rows. The Spending Tracker should read from `purchase_price_pence`, not `purchase_price`. Do not drop the old REAL column (additive migration rule).

**Warning signs:**
- `SUM(purchase_price)` used directly in SQL for spending totals without rounding
- Currency amounts stored as `REAL` in any new Spending Tracker table
- `toFixed(2)` applied to a number that was previously a SQLite REAL (rounding hides the error but doesn't eliminate it)
- Per-faction spend shows `£1,247.9999999998` in any display

**Phase to address:** Spending Tracker phase — schema design is the first deliverable. Also add `purchase_price_pence INTEGER` to the units table migration at this phase.

---

## High-Severity Pitfalls

### Pitfall 8: Gallery and Table Views Have Diverging Filter State (Dual-View State Sync)

**What goes wrong:**
The Collection Gallery View adds a second way to browse units alongside the existing table. If both views have their own filter/sort state (e.g., the table shows units filtered by "Chaos" faction and sorted by status, but switching to gallery view resets to "all factions, no sort"), the user experiences context loss on every view switch. Conversely, if filter state is stored in component-local state, the state is destroyed when the component unmounts during view toggling.

A subtler version: the table uses TanStack Table's internal column filter state while the gallery reads from Zustand. These stay in sync initially but diverge when one is updated without updating the other.

**Why it happens:**
The natural implementation puts each view in a separate component, each managing its own filtering. The refactor to share state across two views is non-trivial and is frequently deferred until after both views are "working" — at which point the coupling is painful to add.

**How to avoid:**
Design the filter state as a single shared source before building either view:

1. The existing `collectionFilters.ts` Zustand store (`src/features/units/collectionFilters.ts`) already holds faction filter, search query, status filter, and sort state for the table view. **Extend this store** to serve both views — do not create a second store for the gallery.
2. Add a `viewMode: 'table' | 'gallery'` field to the existing `collectionFilters` store so view selection persists across navigation.
3. Both the table component and the gallery component read from the same Zustand store. The Zustand store is the single source of truth for which units are visible and in what order.
4. The `viewMode` toggle button lives at the page level (not inside either view component), reading and writing `collectionFilters.viewMode`.

Do NOT use TanStack Table's internal column filter state for the shared faction/status filters — keep those in Zustand. TanStack Table's internal state is fine for column ordering and column visibility (gallery doesn't have those concepts).

**Warning signs:**
- Switching from table to gallery resets the faction filter to "all"
- The gallery has its own filter bar that duplicates the table's filter bar
- `collectionFilters.ts` has a separate `galleryFilters.ts` sibling store
- Sort order applied in the table doesn't apply in the gallery

**Phase to address:** Collection Gallery View phase — the shared filter store extension must be planned before any gallery component is written.

---

### Pitfall 9: Painting Status Ring in Gallery View Not Defined as Reusable at the Right Abstraction Level

**What goes wrong:**
The gallery view's signature visual element is a "painting status ring" (circular progress / colored ring around the unit card image). If this component is built as a one-off inside the gallery card, the Collection table's status column, the Dashboard faction summaries, and any future Army List Builder references cannot reuse it. The ring gets reimplemented 3 times with slight inconsistencies.

**Why it happens:**
The gallery card is built first in isolation. The status ring is a detail that "belongs" to the card. The reusability need only becomes apparent later.

**How to avoid:**
Build `PaintingStatusRing` as a standalone component in `src/components/common/` from the start, accepting `paintingPercentage: number` and `status: PaintingStatus` as props. The gallery card uses it; the table's status cell can optionally use a compact variant; the Dashboard can use a larger variant. Define the size and color scale once in the shared component.

**Warning signs:**
- The status ring SVG or CSS is defined inside `GalleryCard.tsx` and is not importable elsewhere
- The dashboard faction progress bar uses different color thresholds than the gallery ring
- The table status column and gallery status ring show different colors for the same painting_percentage value

**Phase to address:** Collection Gallery View phase — define the shared component first, then build GalleryCard using it.

---

### Pitfall 10: `appLocalDataDir` vs `appDataDir` Are Different Directories on Windows

**What goes wrong:**
Windows has two "AppData" directories:
- `%APPDATA%` = `C:\Users\{user}\AppData\Roaming` — syncs to domain networks, roaming profiles
- `%LOCALAPPDATA%` = `C:\Users\{user}\AppData\Local` — stays on local machine

Tauri's `appDataDir()` returns the **Roaming** AppData path. Tauri's `appLocalDataDir()` returns the **Local** AppData path.

For a single-user local-first app like HobbyForge, photos should be stored in `appLocalDataDir()` (Local). If code accidentally uses `appDataDir()` (Roaming), photos are stored in the Roaming directory. In enterprise environments or domain-joined PCs, Roaming AppData can fill up the network share quota or be redirected, causing I/O failures. For the developer's personal machine (non-domain), both paths appear to work — making the bug invisible in development.

The existing `tauri-plugin-sql` configuration stores the SQLite DB at `sqlite:hobbyforge.db` without a path prefix, which Tauri resolves to `appLocalDataDir()` by default for plugin-sql. Photos stored in `appDataDir()` would be in a **different directory** than the DB, creating a split between metadata and files.

**How to avoid:**
Always use `appLocalDataDir()` for HobbyForge's file storage. Explicitly document this choice in the query file. Never use `appDataDir()` for photos or any user-generated content. Create the photos directory on first use:
```typescript
import { appLocalDataDir, join } from '@tauri-apps/api/path';
import { mkdir } from '@tauri-apps/plugin-fs';

export async function ensurePhotosDir(unitId: number): Promise<string> {
  const base = await appLocalDataDir();
  const dir = await join(base, 'photos', `unit_${unitId}`);
  await mkdir(dir, { recursive: true });
  return dir;
}
```

**Warning signs:**
- Code uses `appDataDir()` for photo storage
- Photos directory is under `AppData\Roaming\HobbyForge` instead of `AppData\Local\HobbyForge`
- Photo file writes fail silently on domain-joined machines

**Phase to address:** Hobby Journal phase — establish the path utility functions before any file write occurs.

---

### Pitfall 11: Tauri `plugin-fs` Requires Explicit Capability Declaration in v2

**What goes wrong:**
Tauri v2 uses a capabilities-based permission system. `@tauri-apps/plugin-fs` operations (read, write, mkdir, remove) require capabilities declared in `src-tauri/capabilities/*.json`. Without the correct capability declarations, every `fs` call silently fails or returns a permission error at runtime. The current `tauri.conf.json` has `"security": { "csp": null }` which disables the web-side CSP but does NOT grant file system capabilities.

**Why it happens:**
The app currently uses `tauri-plugin-sql` which has its own capability model (the preload config in tauri.conf.json). Adding `plugin-fs` requires a separate capability file. Developers who have only used plugin-sql are not aware of this requirement.

**How to avoid:**
Create `src-tauri/capabilities/fs.json` before writing any file system code:
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "hobbyforge-fs",
  "description": "File system access for Hobby Journal photos",
  "windows": ["main"],
  "permissions": [
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-read-file",
    "fs:allow-write-file",
    "fs:allow-mkdir",
    "fs:allow-remove",
    "fs:allow-exists",
    "fs:read-dirs",
    "core:path:default"
  ]
}
```

Also add `"tauri-plugin-fs"` to `Cargo.toml` and register the plugin in `src-tauri/src/lib.rs` with `.plugin(tauri_plugin_fs::init())`.

**Warning signs:**
- `writeFile()` from `@tauri-apps/plugin-fs` throws "plugin not registered" or silent permission error
- Photos upload succeeds in UI but no file appears on disk
- No `capabilities/*.json` file references `fs:allow-write-file`

**Phase to address:** Hobby Journal phase — this must be the first step before any file system code is written. A failed capability registration produces a confusing runtime error, not a build-time error.

---

## Moderate Pitfalls

### Pitfall 12: Faction Theming via `data-faction` on `<html>` Conflicts With `dark` Class on `<html>`

**What goes wrong:**
The current dark mode implementation adds a `dark` class to the `<html>` element (per `@custom-variant dark (&:is(.dark *))` in globals.css). Faction theming via `data-faction` also targets the `<html>` element. Both must coexist. If the faction theming code writes to `document.documentElement.setAttribute('data-faction', slug)` but also reads `className` for dark mode, there is a risk of accidentally stripping the `dark` class. This is especially easy in a `useEffect` that sets `className` directly.

**How to avoid:**
Use `setAttribute('data-faction', slug)` — never set `className` in the theming effect. The `dark` class is managed by its own effect (or by the initial HTML server rendering). These are separate attributes and must be managed independently. A safe React pattern:
```typescript
useEffect(() => {
  document.documentElement.setAttribute('data-faction', faction?.slug ?? 'default');
}, [faction?.slug]);
// Dark mode effect in a separate useEffect that only touches classList
```

**Warning signs:**
- Dark mode stops working after faction selection
- `document.documentElement.className = "dark faction-chaos"` — class string manipulation instead of attribute manipulation

**Phase to address:** Faction Dynamic Theming phase — theming effect design.

---

### Pitfall 13: Animated Dashboard Counters Re-Animate on Every TanStack Query Background Refetch

**What goes wrong:**
The Dashboard Command Center will feature animated counters (numbers counting up to their value on load). TanStack Query performs background refetches on window focus and stale interval. Each background refetch updates the query data, which re-triggers the animation because the component detects a "new" value. The result is counters that randomly re-animate whenever the window regains focus — a jarring experience.

**Why it happens:**
The animation is tied to the data value changing, but TanStack Query updates the data reference even when the underlying value has not changed (if the refetch returns the same data, a new object reference is still created).

**How to avoid:**
Two options:
1. Set `staleTime: Infinity` on the dashboard stats query and refetch only on explicit user action (e.g., a refresh button) — appropriate for a single-user local app where data only changes due to user actions within the same session.
2. Animate only on first mount using a ref: `const hasAnimated = useRef(false)`. Set it to true after the first animation; subsequent data updates skip the animation. Re-arm on page navigation.

Option 1 is simpler and correct for HobbyForge's single-user, local-only model.

**Warning signs:**
- Dashboard numbers re-animate when switching app windows
- Counter animation fires 3-4 times per minute when the app is left open

**Phase to address:** Dashboard as Command Center phase — animation strategy decision before building any counter component.

---

### Pitfall 14: Collapsible Sidebar Width Transition Breaks Layout if Flex Children Use Fixed Widths

**What goes wrong:**
The sidebar collapse animation (transitioning from expanded width to icon width, e.g., 240px → 48px) works via CSS `transition: width`. If the main content area uses `margin-left: 240px` (fixed) instead of flex layout, the content does not reflow during the collapse — it stays at the expanded position, creating a white gap. Alternatively, if `width: calc(100vw - 240px)` is hardcoded in the main content, it won't adjust either.

Also: animating `width` triggers browser layout (reflow) on every frame, which can cause jank. `transform: translateX` would be more performant but requires a different approach (overlay sidebar vs. side-by-side layout).

**Why it happens:**
The current sidebar uses shadcn's built-in `SidebarProvider` which manages the width via CSS variables (`--sidebar-width` and `--sidebar-width-icon`). If the main content layout is not structured to respond to these variables, the collapse doesn't work.

**How to avoid:**
Use shadcn's `SidebarProvider` + `SidebarInset` pattern exactly as documented — `SidebarInset` automatically responds to the sidebar's CSS variable width. Do not hardcode sidebar-dependent widths anywhere in the main content area. The current `AppSidebar.tsx` likely already uses this pattern; verify before adding collapse logic.

For a desktop-only app (no mobile), use `collapsible="icon"` mode (not "offcanvas") — icon mode keeps the sidebar in the document flow (no overlay), which is the correct behavior for a side-by-side desktop layout.

**Warning signs:**
- Main content area has `margin-left: 240px` hardcoded in CSS
- Sidebar collapse animation leaves a gap between sidebar and content
- Collapse is instant (no transition) because width is not being transitioned

**Phase to address:** Collapsible Icon Sidebar phase — layout structure review before adding the collapse toggle.

---

### Pitfall 15: Spending Tracker Currency Formatting Diverges Between Display Sites

**What goes wrong:**
The Spending Tracker will display monetary amounts in multiple places: the unit detail sheet (purchase price), the per-faction spend summary, and the total spend view. If each site formats currency independently using different logic (some using `toFixed(2)`, some using `Intl.NumberFormat`, some rounding differently), the same value (e.g., 1299 pence) displays as "12.99", "£12.99", "£12.990", or "12.9" in different places.

**How to avoid:**
Create a single `formatCurrency(pence: number, currency?: string): string` utility function in `src/utils/currency.ts` before writing any Spending Tracker UI:
```typescript
export function formatCurrency(pence: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(pence / 100);
}
```

All display sites import and use this function. All SQLite-to-display conversions go through this function. Never use `(amount / 100).toFixed(2)` directly in JSX.

**Warning signs:**
- Currency amounts formatted differently on the unit card vs. the spending summary
- `toFixed(2)` called directly in JSX template literals
- `£` symbol hardcoded in multiple component files

**Phase to address:** Spending Tracker phase — create `currency.ts` utility as step 0 of the schema/types layer.

---

### Pitfall 16: Hobby Journal Session Log Time Tracking Has No Clock — Duration Must Be User-Entered

**What goes wrong:**
The Hobby Journal spec includes "painting session log with time tracking." If this is interpreted as automatic time tracking (start/stop timer within the app), it requires app-level timer state that persists across navigation and potentially across app restarts. This is significantly more complex than it sounds: the timer must survive route changes (user navigates away while timing), Tauri window close/reopen events, and concurrent sessions.

**Why it happens:**
"Time tracking" is commonly assumed to mean "click start, click stop, duration recorded." The hidden complexity is that the timer state must be application-global, persisted to disk (to survive app restarts), and handle edge cases (user closes the app mid-session).

**How to avoid:**
For v2.1, implement **manual duration entry only**: the user types how many minutes they spent. No start/stop timer. Display the total time per unit as a sum of session durations. The schema for `hobby_sessions` should store `duration_minutes INTEGER NOT NULL` entered by the user, not `start_time` / `end_time` timestamps computed by the app.

If a timer is desired in a future version, it is a separate feature requiring Tauri's `app::App` global state or a persisted Zustand store with file-system backup.

**Warning signs:**
- `hobby_sessions` table has `start_time TEXT` and `end_time TEXT` columns intended for auto-timer
- Timer state stored in React `useState` that resets on navigation
- "Session in progress" state not persisted across app restarts

**Phase to address:** Hobby Journal phase — scope definition before schema design.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store photo paths as absolute Windows paths | Simpler code | All paths break on reinstall, PC migration, or username change | Never — always store relative to appLocalDataDir |
| Use `REAL` for spending amounts in new tables | Natural SQL type | Penny-level floating-point drift in aggregations; `£1,247.9999999997` | Never for new tables — use INTEGER pence |
| Build gallery filter state separate from table filter state | Faster initial development | Filter context lost on view switch; two filter bars visible at once | Never — extend existing Zustand store |
| Construct Tailwind class names via template literals | Convenient for dynamic faction colors | Classes purged in production build; theming works in dev, breaks in prod | Never — use data-attribute CSS or complete static lookup table |
| Use `appDataDir()` instead of `appLocalDataDir()` for photos | One fewer API call to remember | Photos in Roaming AppData; fails on domain PCs; inconsistent with DB location | Never — always Local AppData |
| Auto-timer for hobby session tracking | More impressive feature | Complex global state surviving navigation + app restarts | Not in v2.1 — manual entry only |
| `@theme inline` for faction accent tokens | Simpler CSS | Runtime JS calls to `setProperty` have no effect; faction colors can't switch | Never for runtime-swappable tokens |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `convertFileSrc` + Windows paths | Pass Windows backslash path directly | Normalize: `path.replace(/\\/g, '/')` before calling `convertFileSrc` |
| Tailwind v4 `@theme inline` + runtime theming | Override `--color-accent` via JS setProperty | Use `@theme` (not inline) for swappable tokens; set `data-faction` attribute instead |
| `plugin-fs` + Tauri v2 capabilities | Skip capability declaration, rely on CSP null | Create `capabilities/fs.json` with explicit fs permissions before any file write |
| Gallery + Table dual view | Two separate filter stores | Single Zustand store with `viewMode` field; both views read same filter state |
| `image_assets` + unit deletion | Only delete DB row, not physical file | Delete file first, then DB row; wrap in application-level cascade in `deleteUnit` |
| SQLite REAL + spending totals | `SUM(purchase_price)` directly | Store as INTEGER pence; sum integers; format at display time only |
| shadcn Sidebar + collapsible icon mode | Use `size="lg"` on SidebarMenuButton | Use default size until upstream bug #8975 is resolved |
| `appLocalDataDir` + `appDataDir` | Use `appDataDir()` for user files | Always use `appLocalDataDir()` for any user-generated content |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Dashboard animated counters on every TQ refetch | Counters re-animate on window focus | Set `staleTime: Infinity` on dashboard-stats query | On first background refetch (immediate) |
| Gallery renders all unit cards without virtualization | Gallery scroll stutters at 50+ units | Use React virtualization (e.g., `@tanstack/react-virtual`) if >50 cards; for personal collection (<200 units), standard rendering is acceptable | ~100+ units in gallery |
| CSS `width` transition on sidebar collapse | Layout reflow on every animation frame | Use shadcn SidebarProvider CSS variable approach; avoid manual width animation | Any animated collapse implementation |
| `resolvePhotoPath` called synchronously per gallery card | Gallery initial render blocks on 20+ async path resolutions | Resolve all photo URLs in a single `useEffect` before rendering, or lazy-load images with `IntersectionObserver` | 20+ photos in gallery simultaneously |
| Gallery re-fetches units on every view switch | Visible loading flash switching between table and gallery | Both views use the same `useUnits()` hook; TanStack Query cache serves both | Immediate — if cache key differs |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Asset protocol scope `"allow": ["**/*"]` (all files) | Any file on the user's machine is servable via `asset://` | Scope to `"$APPLOCALDATA/HobbyForge/**"` specifically |
| Storing user photo paths in URL query params | Path exposed in Tauri's IPC logs | Use DB row IDs in URLs; resolve paths server-side in queries |
| No file type validation on photo upload | User could store any file in the photos directory | Validate MIME type (accept `image/*` only) before calling `writeFile` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Faction theme changes are global but the user doesn't realize | Switching faction changes accent colors across ALL pages, confusing if the user is viewing a different faction's units | Show a persistent faction indicator in the sidebar header; make the theme-change affordance explicit ("theme: Chaos") |
| Gallery view has no empty state | Empty gallery shows a blank white box | Show a "No units match your filters" card with a clear-filters action, same as table's empty state |
| Sidebar icon mode has no tooltips | User forgets which icon is which after a week | Shadcn sidebar built-in tooltip support activates automatically in icon mode — verify it works and don't disable it |
| Photo upload with no progress indicator | Large photo uploads appear frozen | Show a loading spinner on the photo slot during upload; file writes via plugin-fs are fast (<100ms for typical images) but should still have feedback |
| Spending total displays as `£0.00` before any data is entered | Looks like a bug | Show a "No spending logged yet" empty state instead of a zero total |

---

## "Looks Done But Isn't" Checklist

- [ ] **Faction theming:** Changing faction in the UI actually updates `bg-faction-accent` utilities — verify in a production build, not just dev mode
- [ ] **Faction theming:** `dark` class is still present on `<html>` after faction change — dark mode still works
- [ ] **Gallery/Table sync:** Setting a faction filter in table view, switching to gallery, switching back — faction filter is preserved in all transitions
- [ ] **Gallery/Table sync:** Sort order from the table view applies to the gallery card order
- [ ] **Sidebar collapse:** Labels hide correctly in icon mode; no text overflow; sidebar takes icon width, not full width
- [ ] **Sidebar collapse:** Tooltips appear on hover in icon mode for all nav items
- [ ] **Photo upload:** Photo appears immediately after upload (optimistic or refetch after write)
- [ ] **Photo paths:** After app reinstall (simulate by deleting and recreating AppData/Local/HobbyForge), stored photos still resolve correctly (relative paths survived)
- [ ] **Photo deletion:** Deleting a unit with photos removes the physical files from disk; disk usage decreases
- [ ] **convertFileSrc:** Photo `<img>` elements render correctly in the production Tauri bundle (not just `pnpm dev`)
- [ ] **Spending totals:** Sum of 100 × £0.99 = £99.00 exactly (not £98.999...)
- [ ] **Spending totals:** Per-faction total and grand total agree when manually summed
- [ ] **Dashboard counters:** Numbers do NOT re-animate when switching windows or after a background refetch
- [ ] **Tauri capabilities:** `plugin-fs` operations work in the production build with the capabilities file in place

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| `@theme inline` faction tokens (runtime swap broken) | MEDIUM | Refactor globals.css to split inline vs. runtime tokens; no data loss; requires CSS rewrite and faction style audit |
| Dynamic class names purged in production | LOW-MEDIUM | Replace template literal class construction with static lookup table; CSS-first approach with data-faction is lower risk |
| Absolute photo paths in SQLite | HIGH | Write a one-time migration script that strips the appLocalDataDir prefix from all file_path values; requires knowing the exact base path used at time of storage |
| Orphan photo files after unit deletion | MEDIUM | Write a cleanup script: scan `image_assets` for `entity_type='unit'`, check if `entity_id` exists in `units`; delete files and rows for orphans |
| REAL purchase prices in spending totals | LOW | Add `purchase_price_pence INTEGER` column via migration; backfill with `ROUND(purchase_price * 100)`; update all queries to use the new column |
| Missing fs capability declaration | LOW | Create `capabilities/fs.json`; rebuild Tauri binary; no data loss |
| Gallery and table filter state diverged | MEDIUM | Consolidate into existing Zustand store; add `viewMode` field; re-test all filter combinations |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| `@theme inline` blocks runtime faction swap | Faction Dynamic Theming — CSS architecture step 0 | Runtime JS: change `data-faction` attribute; confirm `bg-faction-accent` updates in production build |
| Dynamic Tailwind class purge | Faction Dynamic Theming — before any faction-conditional JSX | Grep: `bg-\${` must not appear in src/; production build CSS contains all faction color utilities |
| `group-data-[collapsible=icon]` missing in prod | Collapsible Icon Sidebar — post-build verification | Production binary: collapse sidebar; confirm icon widths and text hiding work |
| `convertFileSrc` backslash 400 on Windows | Hobby Journal — `toAssetUrl` wrapper (step 0) | Unit test `toAssetUrl` with a backslash path; end-to-end: photo renders in prod Tauri binary |
| Absolute photo paths break on reinstall | Hobby Journal — path storage strategy (step 0) | After storing a photo, verify DB stores a relative path; simulate reinstall by moving AppData folder |
| `image_assets` orphan rows and files | Hobby Journal — unit deletion integration | Delete a unit with photos; verify `image_assets` row count decreases and file is gone from disk |
| REAL money precision in spending | Spending Tracker — schema design (step 0) | Sum 100 × 99 pence; result must be 9900 exactly; display as `£99.00` |
| Gallery/table filter state divergence | Collection Gallery View — Zustand store extension | Set faction filter; toggle view mode 3 times; faction filter unchanged throughout |
| Animated counter re-animation on refetch | Dashboard Command Center — staleTime config | Leave dashboard open for 60 seconds; confirm counters animate exactly once |
| `plugin-fs` capability missing | Hobby Journal — capabilities file (step 0) | Run production build; verify `writeFile` succeeds without permission errors |
| `appDataDir` vs `appLocalDataDir` confusion | Hobby Journal — path utility functions | Check physical path of first saved photo; must be under `AppData\Local\`, not `AppData\Roaming\` |
| Spending currency formatting inconsistency | Spending Tracker — `currency.ts` utility (step 0) | Global grep: no `toFixed(2)` on currency values outside `currency.ts` |

---

## Sources

- `src/styles/globals.css` — confirmed `@theme inline` usage for all current design tokens (HIGH confidence — direct audit)
- `src-tauri/migrations/001_core_schema.sql` — confirmed `purchase_price REAL` on `units`; `image_assets` polymorphic pattern; no FK from `image_assets` to `units` (HIGH confidence — direct audit)
- `src-tauri/tauri.conf.json` — confirmed no asset protocol config, no `plugin-fs` in plugins (HIGH confidence — direct audit)
- `.planning/PROJECT.md` — Windows-only platform constraint; local-first architecture (HIGH confidence)
- Tailwind v4 official blog: tailwindcss.com/blog/tailwindcss-v4 — `@theme` vs `@theme inline` behavior (HIGH confidence)
- GitHub tailwindlabs/tailwindcss Discussion #15600 — multiple themes via CSS variables in v4 (MEDIUM confidence)
- GitHub tailwindlabs/tailwindcss Issue #15874 — CSS variables in @theme not inherited from inline styles (MEDIUM confidence)
- GitHub tailwindlabs/tailwindcss Discussion #18560 — `@theme` vs `@theme inline` tradeoffs (MEDIUM confidence)
- GitHub tauri-apps/tauri Issue #7970 — `convertFileSrc` 400 on Windows with backslashes (HIGH confidence — confirmed bug)
- GitHub tauri-apps/tauri Issue #8244 — `convertFileSrc` cannot load local files on Windows (HIGH confidence — confirmed bug)
- GitHub tauri-apps/tauri Discussion #11498 — displaying images via asset protocol in v2 (MEDIUM confidence)
- GitHub shadcn-ui/ui Issue #8975 — SidebarMenuButton size="lg" doesn't collapse in icon mode with Tailwind v4 (MEDIUM confidence)
- SQLite official docs: sqlite.org/floatingpoint.html — floating-point precision issues with REAL type (HIGH confidence)
- SQLite forum — INTEGER pence storage recommendation for currency (HIGH confidence)
- Tauri v2 docs: v2.tauri.app/plugin/file-system — capabilities and permissions for plugin-fs (HIGH confidence)

---
*Pitfalls research for: HobbyForge v2.1 — Faction Dynamic Theming, Dashboard Command Center, Collapsible Sidebar, Collection Gallery, Hobby Journal, Spending Tracker*
*Researched: 2026-05-02*
