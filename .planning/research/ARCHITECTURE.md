# Architecture Research

**Domain:** HobbyForge v2.1 — Visual Command (Faction Theming, Dashboard Redesign, Collapsible Sidebar, Gallery View, Hobby Journal, Spending Tracker)
**Researched:** 2026-05-02
**Confidence:** HIGH — based on direct codebase audit + Tailwind v4 and Tauri 2 documentation

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React UI Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Dashboard │  │Collection│  │HobbyJnl  │  │Spending  │        │
│  │Command   │  │Gallery   │  │PhotoView │  │Tracker   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
├───────┴─────────────┴─────────────┴──────────────┴─────────────┤
│                    Zustand Store Layer                            │
│  ┌──────────────────┐   ┌───────────────┐   ┌──────────────┐    │
│  │ useFactionTheme  │   │ useSidebarCol │   │ filter stores│    │
│  │ (persist to LS)  │   │ (persist to LS│   │ (ephemeral)  │    │
│  └────────┬─────────┘   └───────┬───────┘   └──────────────┘    │
│           │ effect: setProperty │                                 │
├───────────┴─────────────────────┴───────────────────────────────┤
│                  TanStack Query Hooks Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │useFaction│  │useUnits  │  │useHobbyJrnl │  │useSpending  │   │
│  │Stats     │  │(gallery) │  │(new)        │  │(new)        │   │
│  └────┬─────┘  └────┬─────┘  └──────┬──────┘  └──────┬──────┘   │
├───────┴─────────────┴──────────────┴───────────────────┴────────┤
│                   src/db/queries/* Layer                          │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────────────┐   │
│  │dashboard │  │hobbyJournal   │  │spending.ts               │   │
│  │.ts       │  │.ts (new)      │  │(new)                     │   │
│  └────┬─────┘  └───────┬───────┘  └───────────┬──────────────┘   │
├───────┴─────────────────┴────────────────────────┴──────────────┤
│                   SQLite (tauri-plugin-sql)                       │
│  hobby_sessions  unit_photos  unit_purchases  paint_purchases     │
│  (4 new tables via migration 005)                                 │
├─────────────────────────────────────────────────────────────────┤
│              Tauri fs Plugin (NEW — photo storage only)           │
│  BaseDirectory.AppData → %APPDATA%\com.hobbyforge.app\           │
│  photos/{unit_id}/{uuid}.webp                                     │
│  photos/{unit_id}/thumbs/{uuid}_thumb.webp                       │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location | Status |
|-----------|----------------|----------|--------|
| `useFactionThemeStore` | Holds `activeFactionId`, persists to localStorage, fires `setProperty` effect on change | `src/stores/useFactionThemeStore.ts` | NEW |
| `useSidebarCollapsed` | Already exists, already persists to localStorage | `src/components/common/useSidebarCollapsed.ts` | EXISTS — no change needed |
| `FactionThemeProvider` | Thin wrapper component at app root that subscribes to theme store and calls effect | `src/components/common/FactionThemeProvider.tsx` | NEW |
| `AppSidebar` | Gains tooltip labels in collapsed state | `src/components/common/AppSidebar.tsx` | MODIFY |
| `DashboardPage` | Full visual redesign — hero band, animated counters, faction banners | `src/features/dashboard/DashboardPage.tsx` | MODIFY (major) |
| `CollectionPage` | Gains `viewMode` toggle between table and gallery | `src/features/units/CollectionPage.tsx` | MODIFY |
| `UnitGalleryView` | New card-grid component with SVG painting-status ring | `src/features/units/UnitGalleryView.tsx` | NEW |
| `UnitGalleryCard` | Single card in gallery — painting ring, unit name, faction badge | `src/features/units/UnitGalleryCard.tsx` | NEW |
| `HobbyJournalPage` | Photo timeline per unit + session log with time tracking | `src/features/hobby-journal/HobbyJournalPage.tsx` | NEW |
| `SpendingTrackerPage` | Cost per unit + paint, per-faction and total views | `src/features/spending/SpendingTrackerPage.tsx` | NEW |

---

## Feature 1: Faction Dynamic Theming

### Where Theme State Lives

**Recommendation: Zustand store with `persist` middleware writing to localStorage.**

Rationale:
- The sidebar collapse state already uses a raw `useSidebarCollapsed` hook writing to localStorage directly. Faction theme is analogous — persistent across app restarts, no server needed.
- Zustand `persist` middleware provides synchronous read on first render (avoids flash) when using `localStorage` as the storage engine.
- Using a Zustand store (rather than React Context) avoids re-rendering the full component tree on theme changes — only the components that subscribe to the store re-render. The CSS property swap itself is a side effect, not a state value consumed by JSX.
- React Context is the wrong tool here: theme state is not "a value components render from" — it's a global side effect (property mutation on `document.documentElement`). Context would cause cascading re-renders unnecessarily.

**Do NOT use `next-themes`** even though it is installed. `next-themes` manages light/dark toggle, which the app has already solved with a `.dark` class on the root. Faction theming is an independent accent color system.

### How CSS Custom Properties Are Swapped in Tailwind v4

Tailwind v4 uses a CSS-first approach. The `@theme inline` block in `src/styles/globals.css` maps `--color-accent` → `hsl(var(--accent))`. This means:

1. Define faction accent tokens as CSS custom properties on `:root`:
```css
/* src/styles/globals.css — add to .dark block */
:root {
  --faction-accent: 210 70% 55%;       /* default: neutral blue */
  --faction-accent-fg: 0 0% 98%;
  --faction-glow: 210 70% 55%;
}
```

2. Register them in the `@theme inline` block so Tailwind utility classes reference them:
```css
@theme inline {
  /* existing tokens ... */
  --color-faction-accent: hsl(var(--faction-accent));
  --color-faction-accent-fg: hsl(var(--faction-accent-fg));
  --color-faction-glow: hsl(var(--faction-glow));
}
```

3. At runtime, swap via `document.documentElement.style.setProperty()`:
```typescript
// Inside useFactionThemeStore or FactionThemeProvider effect
document.documentElement.style.setProperty('--faction-accent', '14 80% 45%'); // Space Marines
document.documentElement.style.setProperty('--faction-accent-fg', '0 0% 98%');
document.documentElement.style.setProperty('--faction-glow', '14 80% 45%');
```

4. In JSX, use utility classes: `bg-faction-accent`, `text-faction-accent-fg`, `ring-faction-accent`, `border-faction-accent`. These reference the live custom property — Tailwind generates them at build time, the browser resolves the value at runtime.

**Why this avoids class purging:** Tailwind v4 scans source files and generates classes from utility names in JSX/TSX. As long as `bg-faction-accent`, `text-faction-accent`, etc. appear literally in source files, they will be included in the build. The runtime value is a CSS property — Tailwind never sees or cares about it. No purging risk.

**What would cause purging problems (avoid):** Dynamically constructing class names like `` `bg-${factionColor}-500` `` — Tailwind cannot statically analyze string interpolation and will not generate those classes.

### Faction Color Map

The `factions` table already has `color_theme TEXT NOT NULL DEFAULT '#4A90D9'`. Store HSL channel values in the table or derive them from the stored hex at theme application time.

**Recommended approach:** Add a `color_theme_hsl TEXT` column to `factions` via migration (or compute HSL from hex at query time using a utility function). HSL is required because the CSS custom property pattern uses `hsl(var(--faction-accent))` so only the HSL channel tuple should be stored (`"14 80% 45%"` not `"hsl(14, 80%, 45%)"`).

**Faction color table (seed values):**

| Faction | Hex | HSL channels |
|---------|-----|--------------|
| Space Marines | `#8B3A2F` (bolt-red) | `14 52% 37%` |
| Chaos | `#4A1A8C` (chaos purple) | `265 68% 33%` |
| Necrons | `#1A6B3C` (necron green) | `150 60% 26%` |
| Tyranids | `#8B1A4A` (hive-magenta) | `335 68% 33%` |

These are suggestions — the user should customize per faction via the Factions CRUD page (existing `FactionSheet`). Add a color picker or hex input to `FactionSheet`.

### Theme Application Architecture

```
App cold start
    ↓
useFactionThemeStore (Zustand persist) reads localStorage
    ↓
FactionThemeProvider mounts, effect fires immediately:
  document.documentElement.style.setProperty(--faction-accent, ...)
    ↓
All bg-faction-accent / text-faction-accent utilities resolve correctly

User selects faction on Dashboard or Factions page
    ↓
setActiveFaction(id) called on store
    ↓
useFaction(id) query returns faction.color_theme_hsl
    ↓
effect re-fires: setProperty updates all three tokens
    ↓
UI re-renders only components subscribed to store (the faction badge/indicator)
    CSS cascade handles everything else
```

### New Store File

**`src/stores/useFactionThemeStore.ts`** (NEW)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FactionThemeState {
  activeFactionId: number | null;
  setActiveFaction: (id: number | null) => void;
}

export const useFactionThemeStore = create<FactionThemeState>()(
  persist(
    (set) => ({
      activeFactionId: null,
      setActiveFaction: (id) => set({ activeFactionId: id }),
    }),
    { name: 'faction-theme' }
  )
);
```

**`src/components/common/FactionThemeProvider.tsx`** (NEW) — mounts at app root in `AppLayout`, queries the active faction, applies CSS properties on change.

**`src/app/router.tsx`** — no change needed for theming. `AppLayout` wraps `Outlet`, so wrapping `FactionThemeProvider` inside `AppLayout` covers the entire app.

---

## Feature 2: Dashboard as Command Center

### What Changes

`src/features/dashboard/DashboardPage.tsx` receives a major visual overhaul. The data queries and hooks (`useDashboardStats`) do not change — only the rendering layer.

**New sub-components to create in `src/features/dashboard/`:**

| Component | Purpose |
|-----------|---------|
| `HeroBand.tsx` | Full-width faction banner — faction name, animated stat counters, faction-accent gradient |
| `AnimatedCounter.tsx` | Single animated number — uses CSS `counter` animation or requestAnimationFrame ramp |
| `FactionBanner.tsx` | Per-faction summary card (replaces `FactionSummaryCard`) with accent ring color |
| `WarRoomGrid.tsx` | Redesigned stat grid with larger cards, icons, faction-accent borders |

**Components to retire:** `StatCard.tsx` is replaced by `WarRoomGrid.tsx` children. `FactionSummaryCard.tsx` is replaced by `FactionBanner.tsx`. Both old files can be deleted once new components are proven.

**`DashboardListRow.tsx` and `DashboardEmptyState.tsx`** — kept, minor style updates only.

### Dashboard Faction Selection Integration

The Dashboard is the natural place for the user to select the "active faction" for theming. A faction selector (dropdown or clickable cards) on the Dashboard calls `useFactionThemeStore().setActiveFaction(id)`. The selected faction persists across app restarts via the Zustand persist middleware.

---

## Feature 3: Collapsible Icon Sidebar

### Current State

`useSidebarCollapsed` already exists at `src/components/common/useSidebarCollapsed.ts` and already persists to localStorage. `AppSidebar` already toggles between `width: 48` (collapsed) and `width: 240` (expanded).

**The core sidebar collapse feature is already shipped.** v2.1 work is cosmetic polish only:

1. Add Tooltip wrappers to `NavItem` so collapsed icon buttons show label tooltips on hover. `TooltipProvider` is already in `AppLayout`. Import `Tooltip, TooltipTrigger, TooltipContent` from `@/components/ui/tooltip` inside `NavItem`.
2. Ensure icon alignment is pixel-perfect at `width: 48` (icons centered, no text overflow).
3. Add nav entries for new v2.1 routes (Hobby Journal, Spending Tracker) to `MAIN_NAV` in `AppSidebar`.

**Files modified:** `src/components/common/NavItem.tsx` (tooltip), `src/components/common/AppSidebar.tsx` (new nav entries).

---

## Feature 4: Collection Gallery View

### View Mode Toggle

`CollectionPage` (`src/features/units/CollectionPage.tsx`) gains a `viewMode` local state: `'table' | 'gallery'`. A toggle button (likely `LayoutGrid` / `LayoutList` Lucide icons) in the page header switches modes.

**`viewMode` should NOT be persisted** — it resets on navigation, consistent with the existing ephemeral filter state pattern. Local `useState` inside `CollectionPage` is correct.

### Gallery Components

**`UnitGalleryView.tsx`** (NEW in `src/features/units/`) — receives the filtered `Unit[]` array. Renders a `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` of `UnitGalleryCard` components.

**`UnitGalleryCard.tsx`** (NEW in `src/features/units/`) — single card:
- Unit name, faction badge (colored dot or text)
- SVG circular ring showing `painting_percentage` (a `<circle>` with `stroke-dashoffset` computed from percentage)
- Status badges: assembled, based, varnished
- Click → same `handleRowClick` callback as the table rows (opens `UnitDetailSheet`)

**SVG painting ring:** Pure SVG, no library needed. Pattern:
```tsx
const circumference = 2 * Math.PI * 18; // radius=18
const offset = circumference - (pct / 100) * circumference;
<circle r={18} cx={20} cy={20}
  stroke="hsl(var(--faction-accent))"
  strokeDasharray={circumference}
  strokeDashoffset={offset}
  strokeLinecap="round"
  transform="rotate(-90 20 20)"
/>
```

**No new data fetching needed.** `CollectionPage` already calls `useUnits()` which returns all units. Gallery view uses the same data, just renders differently.

---

## Feature 5: Hobby Journal

### New DB Tables (Migration 005)

Two new tables. Use `ON DELETE CASCADE` on `unit_id` so deleting a unit removes all its journal data.

**`hobby_sessions`** — painting session log per unit

```sql
CREATE TABLE IF NOT EXISTS hobby_sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id      INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    session_date TEXT    NOT NULL DEFAULT (date('now')),
    duration_min INTEGER,                    -- session length in minutes
    notes        TEXT,                       -- what was done
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**`unit_photos`** — photo timeline per unit, references a file path on disk

```sql
CREATE TABLE IF NOT EXISTS unit_photos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id     INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    session_id  INTEGER REFERENCES hobby_sessions(id) ON DELETE SET NULL,
    file_path   TEXT    NOT NULL,        -- relative path under appDataDir
    thumb_path  TEXT,                   -- relative path to thumbnail, nullable
    caption     TEXT,
    taken_at    TEXT,                   -- user-specified date, nullable
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**Note on `image_assets`:** Migration 001 already defines an `image_assets` table (polymorphic store). For Hobby Journal, use the dedicated `unit_photos` table instead. Reasons: (1) `image_assets` lacks `session_id` linkage; (2) `image_assets` lacks `thumb_path`; (3) separation of concerns — hobby journal photos are a distinct domain from hypothetical future unit/army thumbnails. The `image_assets` table can be left unused or repurposed later.

### Tauri fs Plugin — File Storage

**Capability setup** (`src-tauri/capabilities/default.json`) — add fs permissions:
```json
"fs:default",
"fs:allow-read-data-files",
"fs:allow-write-data-files",
"fs:allow-mkdir"
```

**Cargo.toml** — add dependency:
```toml
tauri-plugin-fs = "2"
```

**`lib.rs`** — register plugin:
```rust
.plugin(tauri_plugin_fs::init())
```

**JavaScript API pattern:**

```typescript
import { writeFile, readFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';

// Write photo (Uint8Array from file input or canvas)
await mkdir(`photos/${unitId}`, { baseDir: BaseDirectory.AppData, recursive: true });
await writeFile(
  `photos/${unitId}/${uuid}.webp`,
  imageBytes,
  { baseDir: BaseDirectory.AppData }
);

// Write thumbnail
await mkdir(`photos/${unitId}/thumbs`, { baseDir: BaseDirectory.AppData, recursive: true });
await writeFile(
  `photos/${unitId}/thumbs/${uuid}_thumb.webp`,
  thumbBytes,
  { baseDir: BaseDirectory.AppData }
);

// Resolve to absolute path for DB storage and <img> src
// %APPDATA%\com.hobbyforge.app\photos\{unitId}\{uuid}.webp
```

**File path convention:**
- Store relative paths in DB: `photos/{unit_id}/{uuid}.webp` and `photos/{unit_id}/thumbs/{uuid}_thumb.webp`
- `appDataDir` resolves to `%APPDATA%\com.hobbyforge.app\` on Windows (already confirmed in `lib.rs` setup comment)
- To display in `<img>`, resolve to absolute path using `@tauri-apps/api/path`:
```typescript
import { appDataDir, join } from '@tauri-apps/api/path';
const base = await appDataDir();
const absolutePath = await join(base, relativePath);
// Use as: <img src={`asset://localhost/${absolutePath.replace(/\\/g, '/')}`} />
```

**Important:** Tauri's WebView uses the `asset://` protocol to serve local files. The path must be URL-encoded and use forward slashes. Alternatively, convert the bytes to a base64 data URL for display — simpler for small thumbnails.

### Thumbnail Strategy: Generate at Write Time

**Recommendation: Generate thumbnail at write time (not lazily).**

Rationale:
- Gallery view will display thumbnails for all units with photos — lazy generation would cause a waterfall of file reads and canvas operations on first render
- The canvas resize operation is O(1) and takes <50ms on modern hardware for a 256px thumbnail
- `BaseDirectory.AppData` writes are synchronous from the user's perspective (they just picked a file)

**Thumbnail generation pattern (browser-side canvas):**

```typescript
async function generateThumbnail(file: File, maxDim = 256): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1);
  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale)
  );
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
  return new Uint8Array(await blob.arrayBuffer());
}
```

`OffscreenCanvas` is available in the Chromium WebView that Tauri uses. No library dependency needed.

### Hobby Journal Feature Location

**`src/features/hobby-journal/`** (NEW folder):
- `HobbyJournalPage.tsx` — unit selector + photo timeline + session list
- `PhotoUploadButton.tsx` — file input trigger + thumbnail generation + write flow
- `PhotoTimeline.tsx` — chronological photo grid
- `SessionLogEntry.tsx` — single session row with duration + notes
- `AddSessionSheet.tsx` — date, duration, notes form

**Route:** `/journal` — add to router and sidebar nav (Lucide `BookImage` icon).

### New Hooks and Queries

**`src/db/queries/hobbyJournal.ts`** (NEW):
- `getPhotosByUnit(unitId)` → `UnitPhoto[]`
- `getSessionsByUnit(unitId)` → `HobbySession[]`
- `createSession(input)` → `number` (id)
- `updateSession(input)` → `void`
- `deleteSession(id)` → `void`
- `createPhoto(input)` → `number` (id)
- `deletePhoto(id)` → `void` (caller also deletes files from disk)

**`src/hooks/useHobbyJournal.ts`** (NEW) — TanStack Query wrappers following existing pattern.

---

## Feature 6: Spending Tracker

### New DB Tables (Migration 005, continued)

**`unit_purchases`** — one row per purchase event for a unit

```sql
CREATE TABLE IF NOT EXISTS unit_purchases (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id       INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    purchase_date TEXT,
    price_paid    REAL    NOT NULL DEFAULT 0,
    currency      TEXT    NOT NULL DEFAULT 'EUR',
    vendor        TEXT,
    notes         TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**Note on `units.purchase_price`:** The existing `units` table already has `purchase_price REAL` and `purchase_date TEXT`. The new `unit_purchases` table enables multiple purchase events per unit (e.g., bought half the squad, then the other half). The old `units.purchase_price` field can remain as a convenience field for the unit sheet, but the Spending Tracker queries from `unit_purchases`.

**`paint_purchases`** — one row per paint purchase event

```sql
CREATE TABLE IF NOT EXISTS paint_purchases (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    paint_id      INTEGER NOT NULL REFERENCES paints(id) ON DELETE CASCADE,
    purchase_date TEXT,
    price_paid    REAL    NOT NULL DEFAULT 0,
    currency      TEXT    NOT NULL DEFAULT 'EUR',
    vendor        TEXT,
    notes         TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### Spending Tracker Feature Location

**`src/features/spending/`** (NEW folder):
- `SpendingTrackerPage.tsx` — total spend overview + per-faction breakdown + per-category tabs
- `SpendingSummaryCard.tsx` — total / units / paints summary figures
- `PurchaseLogSheet.tsx` — add/edit purchase entry (shared for unit and paint purchases)
- `FactionSpendRow.tsx` — one row in the per-faction breakdown table

**Route:** `/spending` — add to router and sidebar nav (Lucide `Wallet` icon).

**New Queries `src/db/queries/spending.ts`** (NEW):
- `getUnitPurchases(unitId?)` → `UnitPurchase[]` (optional filter by unit)
- `getTotalUnitSpend()` → `number`
- `getTotalPaintSpend()` → `number`
- `getSpendByFaction()` → `{ faction_id, faction_name, total_spend }[]`
- `createUnitPurchase(input)` → `number`
- `createPaintPurchase(input)` → `number`
- `deletePurchase(table, id)` — or split into two functions

---

## DB Migration 005 — Full Schema

**File:** `src-tauri/migrations/005_v21_journal_spending.sql`

```sql
-- 005_v21_journal_spending.sql — HobbyForge v2.1 new tables
-- hobby_sessions: per-unit painting session log
CREATE TABLE IF NOT EXISTS hobby_sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id      INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    session_date TEXT    NOT NULL DEFAULT (date('now')),
    duration_min INTEGER,
    notes        TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- unit_photos: per-unit photo timeline (files on disk, paths stored here)
CREATE TABLE IF NOT EXISTS unit_photos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id     INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    session_id  INTEGER REFERENCES hobby_sessions(id) ON DELETE SET NULL,
    file_path   TEXT    NOT NULL,
    thumb_path  TEXT,
    caption     TEXT,
    taken_at    TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- unit_purchases: spending log for unit purchases (multiple events per unit)
CREATE TABLE IF NOT EXISTS unit_purchases (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id       INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    purchase_date TEXT,
    price_paid    REAL    NOT NULL DEFAULT 0,
    currency      TEXT    NOT NULL DEFAULT 'EUR',
    vendor        TEXT,
    notes         TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- paint_purchases: spending log for paint purchases
CREATE TABLE IF NOT EXISTS paint_purchases (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    paint_id      INTEGER NOT NULL REFERENCES paints(id) ON DELETE CASCADE,
    purchase_date TEXT,
    price_paid    REAL    NOT NULL DEFAULT 0,
    currency      TEXT    NOT NULL DEFAULT 'EUR',
    vendor        TEXT,
    notes         TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

Register as version 5 in `src-tauri/src/lib.rs` `get_migrations()` vec.

---

## Recommended Project Structure

### New Files to Create

```
src-tauri/migrations/
└── 005_v21_journal_spending.sql          # NEW — 4 new tables

src/
├── stores/
│   └── useFactionThemeStore.ts           # NEW — Zustand persist store for active faction

├── components/common/
│   └── FactionThemeProvider.tsx          # NEW — effect-only component, mounts at AppLayout root

├── features/
│   ├── dashboard/
│   │   ├── HeroBand.tsx                  # NEW — full-width faction header
│   │   ├── AnimatedCounter.tsx           # NEW — ramp animation for stat numbers
│   │   ├── FactionBanner.tsx             # NEW — per-faction summary card (replaces FactionSummaryCard)
│   │   └── WarRoomGrid.tsx               # NEW — redesigned stat card grid
│   │
│   ├── units/
│   │   ├── UnitGalleryView.tsx           # NEW — grid layout wrapper
│   │   └── UnitGalleryCard.tsx           # NEW — single gallery card with SVG ring
│   │
│   ├── hobby-journal/                    # NEW folder
│   │   ├── HobbyJournalPage.tsx
│   │   ├── PhotoUploadButton.tsx
│   │   ├── PhotoTimeline.tsx
│   │   ├── SessionLogEntry.tsx
│   │   └── AddSessionSheet.tsx
│   │
│   └── spending/                         # NEW folder
│       ├── SpendingTrackerPage.tsx
│       ├── SpendingSummaryCard.tsx
│       ├── PurchaseLogSheet.tsx
│       └── FactionSpendRow.tsx

├── db/queries/
│   ├── hobbyJournal.ts                   # NEW — photos + sessions CRUD
│   └── spending.ts                       # NEW — purchase CRUD + aggregates

├── hooks/
│   ├── useHobbyJournal.ts                # NEW — TanStack Query wrappers
│   └── useSpending.ts                    # NEW — TanStack Query wrappers

└── types/
    ├── hobbyJournal.ts                   # NEW — HobbySession, UnitPhoto interfaces
    └── spending.ts                       # NEW — UnitPurchase, PaintPurchase interfaces
```

### Files to Modify

```
src-tauri/
├── Cargo.toml                            # MODIFY — add tauri-plugin-fs = "2"
├── src/lib.rs                            # MODIFY — register fs plugin + migration 005
└── capabilities/default.json            # MODIFY — add fs:default + fs read/write/mkdir permissions

src/styles/globals.css                    # MODIFY — add --faction-accent tokens + @theme inline entries

src/
├── app/router.tsx                        # MODIFY — add /journal + /spending routes
│
├── components/common/
│   ├── AppLayout.tsx                     # MODIFY — wrap children with <FactionThemeProvider>
│   ├── AppSidebar.tsx                    # MODIFY — add Journal + Spending to MAIN_NAV
│   └── NavItem.tsx                       # MODIFY — add Tooltip wrapper for collapsed state
│
└── features/
    ├── dashboard/
    │   └── DashboardPage.tsx             # MODIFY (major) — visual overhaul using new sub-components
    └── units/
        └── CollectionPage.tsx            # MODIFY — add viewMode toggle + conditional render
```

---

## Build Order for v2.1 Phases

Dependencies determine order. The theming foundation must land first because Dashboard redesign and gallery view both reference `bg-faction-accent` utilities. New DB features (Journal, Spending) are independent and can be built after UI features.

### Phase A: Theming Foundation (build first — all other UI depends on it)

1. Add `--faction-accent` / `--faction-accent-fg` / `--faction-glow` tokens to `src/styles/globals.css` `:root` and `@theme inline` block
2. Write `src/stores/useFactionThemeStore.ts` — Zustand persist store
3. Write `src/components/common/FactionThemeProvider.tsx` — effect-only, calls `setProperty`
4. Modify `src/components/common/AppLayout.tsx` — mount `<FactionThemeProvider />` inside the layout wrapper
5. Verify: run the app, check that `--faction-accent` exists on `:root` via DevTools, change it manually and confirm `bg-faction-accent` elements repaint

**Why first:** Dashboard redesign and gallery cards use `bg-faction-accent` / `border-faction-accent`. These utilities must exist in the Tailwind build before any component can reference them. Building theming first also de-risks the CSS setup before writing any feature components.

### Phase B: Dashboard Command Center (depends on Phase A CSS tokens)

6. Write `AnimatedCounter.tsx`
7. Write `HeroBand.tsx` (uses `bg-faction-accent`, `text-faction-accent-fg`)
8. Write `FactionBanner.tsx` (replaces `FactionSummaryCard`)
9. Write `WarRoomGrid.tsx` (replaces `StatCard` grid)
10. Rewrite `DashboardPage.tsx` to use new sub-components; add faction selector that calls `useFactionThemeStore().setActiveFaction(id)`
11. Delete retired `StatCard.tsx` and `FactionSummaryCard.tsx` once `DashboardPage` no longer imports them

**Why before gallery:** Dashboard is the landing page — it validates the faction theme visually before gallery or sidebar polish work begins.

### Phase C: Sidebar and Gallery Polish (light modification, low risk)

12. Modify `NavItem.tsx` — add Tooltip wrapper for collapsed icon labels
13. Write `UnitGalleryCard.tsx` (SVG ring, faction badge, unit name)
14. Write `UnitGalleryView.tsx` (grid layout, receives filtered units)
15. Modify `CollectionPage.tsx` — add `viewMode` state, toggle button, conditional render of table vs gallery

**Why after Dashboard:** C is low-risk UI polish. Doing it after Dashboard means the faction accent color is proven to work before being referenced in gallery cards.

### Phase D: DB Migration + Hobby Journal (independent of A/B/C)

16. Write `src-tauri/migrations/005_v21_journal_spending.sql` — all 4 tables
17. Register migration 005 in `lib.rs`
18. Add `tauri-plugin-fs` to `Cargo.toml` and `lib.rs`
19. Add fs permissions to `capabilities/default.json`
20. Write `src/types/hobbyJournal.ts` and `src/types/spending.ts`
21. Write `src/db/queries/hobbyJournal.ts`
22. Write `src/hooks/useHobbyJournal.ts`
23. Write `PhotoUploadButton.tsx` — file input + canvas thumbnail generation + `writeFile` calls
24. Write `PhotoTimeline.tsx`, `SessionLogEntry.tsx`, `AddSessionSheet.tsx`
25. Write `HobbyJournalPage.tsx`
26. Add `/journal` route and sidebar nav entry

**Why after C:** DB schema and file system work are independent of theming/UI changes. But doing UI first (A, B, C) means the app looks polished before adding complex features. Also, if migration 005 has issues, the rest of the app is already in good shape.

### Phase E: Spending Tracker (depends on migration 005 from Phase D)

27. Write `src/db/queries/spending.ts`
28. Write `src/hooks/useSpending.ts`
29. Write `SpendingSummaryCard.tsx`, `FactionSpendRow.tsx`, `PurchaseLogSheet.tsx`
30. Write `SpendingTrackerPage.tsx`
31. Add `/spending` route and sidebar nav entry

**Why last:** Spending Tracker shares the migration with Hobby Journal (step 16). Phase E can begin as soon as migration 005 is registered (step 17) — it does not need the fs plugin. It is the most straightforward data feature and is safest to build last.

---

## Architectural Patterns

### Pattern 1: CSS Custom Property Faction Theming

**What:** Tailwind `@theme inline` tokens reference CSS custom properties (`--faction-accent`). At runtime, a Zustand store effect calls `document.documentElement.style.setProperty('--faction-accent', hslChannels)`. All components using `bg-faction-accent` update via browser CSS cascade.

**When to use:** Any UI element that should change color based on faction — stat rings, hero bands, border accents, glow effects.

**Trade-offs:**
- Pro: Zero re-renders for most UI elements — the browser handles cascade
- Pro: No class purging risk — class names are static, only values change
- Con: Requires discipline to use `bg-faction-accent` not hardcoded faction colors in new components
- Con: HSL channel format (`"14 80% 45%"`) must be stored in DB, not hex; requires data migration or conversion utility

### Pattern 2: Write-Time Thumbnail Generation

**What:** When a user uploads a photo, the browser-side canvas generates a 256px WebP thumbnail synchronously before writing either file via `tauri-plugin-fs`. Both full-size and thumbnail are written together. DB row is inserted after both writes succeed.

**When to use:** Any feature involving user-uploaded images. This app has no server to do server-side processing.

**Trade-offs:**
- Pro: Thumbnails are always available, no lazy generation waterfall
- Pro: `OffscreenCanvas.convertToBlob()` is non-blocking (returns a Promise)
- Con: Slightly longer user-perceived wait on upload (negligible — <100ms for a 4MP phone photo)
- Con: If the app crashes between writing the file and inserting the DB row, you get an orphaned file. Acceptable for a personal tool; add a startup cleanup routine only if this becomes a real problem.

### Pattern 3: Relative Path Storage for Photos

**What:** DB stores `photos/{unit_id}/{uuid}.webp` (relative). Absolute path is resolved at read time by prepending `appDataDir()` and converting to `asset://` protocol URL.

**When to use:** All file path storage in this app.

**Trade-offs:**
- Pro: Portable — if Tauri changes appDataDir location across versions, relative paths still work
- Pro: DB can be inspected without knowing the machine's username or AppData location
- Con: Every image display requires an async `appDataDir()` call (or cache the resolved base path once on app start)

**Recommendation:** Cache `appDataDir()` result once in a module-level variable (similar to how `getDb()` caches the DB connection). Export `getAppDataDir()` from a new `src/lib/paths.ts` file.

### Pattern 4: viewMode as Local State (Not Persisted)

**What:** `CollectionPage` holds `const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table')`. Navigating away and back resets to table.

**When to use:** UI state that is "how you're looking at data right now" not "a preference the user has set."

**Trade-offs:**
- Pro: Consistent with filter state — ephemeral, simple
- Pro: Table is the safe default; most interactions (status popover, detail sheet) are designed for table context
- Con: Power users who prefer gallery must toggle every session (acceptable for v2.1; can persist later)

---

## Data Flow

### Faction Theme Application Flow

```
App start
    ↓
useFactionThemeStore hydrates from localStorage (synchronous — no flash)
    ↓
FactionThemeProvider effect fires (activeFactionId from store)
    ↓
if activeFactionId !== null: useQuery fetches faction.color_theme_hsl
    ↓
document.documentElement.style.setProperty('--faction-accent', hsl)
    ↓
CSS cascade propagates to all bg-faction-accent / text-faction-accent elements
```

### Photo Write Flow

```
User picks file via <input type="file">
    ↓
PhotoUploadButton reads File as ArrayBuffer
    ↓
generateThumbnail(file, 256) → Uint8Array (OffscreenCanvas + convertToBlob)
    ↓
mkdir photos/{unitId}/ + photos/{unitId}/thumbs/ (recursive, idempotent)
    ↓
writeFile(full-size) → writeFile(thumbnail) [both BaseDirectory.AppData]
    ↓
createPhoto({ unit_id, file_path, thumb_path, ... }) → DB insert
    ↓
invalidate ['hobby-journal', unitId, 'photos']
    ↓
PhotoTimeline re-renders with new photo
```

### Spending Aggregation Flow

```
SpendingTrackerPage mounts
    ↓
useSpendingByFaction() → SQL GROUP BY faction_id JOIN unit_purchases JOIN units JOIN factions
    ↓
FactionSpendRow[] rendered
    ↓
User adds purchase via PurchaseLogSheet
    ↓
useCreateUnitPurchase() mutation
    ↓
onSuccess: invalidate ['spending'] (all spending queries)
    ↓
SpendingTrackerPage re-renders with updated totals
```

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `FactionThemeProvider` ↔ Zustand store | Store subscription → `setProperty` effect | Provider does NOT render any JSX children — it is effect-only, mounts inside AppLayout |
| `DashboardPage` ↔ `useFactionThemeStore` | Dashboard calls `setActiveFaction(id)` on faction card/selector click | This is the primary way the user sets the active faction |
| `CollectionPage` ↔ `UnitGalleryView` | Props: filtered `Unit[]`, `onUnitClick` callback | Gallery uses the same callback as table rows — opens `UnitDetailSheet` |
| `HobbyJournalPage` ↔ Tauri fs | Via `PhotoUploadButton` — all fs calls isolated in one component | Never call fs APIs directly from page-level components |
| `hobbyJournal.ts` queries ↔ file system | Queries only store/read paths, not bytes | File read/write is in the React layer (`PhotoUploadButton`, photo display) |

### Cross-Feature Invalidation

| Mutation | Invalidates | Reason |
|----------|-------------|--------|
| `useCreateUnitPurchase.onSuccess` | `['spending']` | All spending views refresh |
| `useCreatePaintPurchase.onSuccess` | `['spending']` | All spending views refresh |
| `useDeleteUnit.onSuccess` (existing) | `['units']`, `['dashboard-stats']` | Cascade in DB deletes photos/sessions/purchases — no additional invalidation needed |
| `useDeletePaint.onSuccess` (existing) | `['paints']` | Cascade deletes paint_purchases |
| `useCreatePhoto.onSuccess` | `['hobby-journal', unitId, 'photos']` | Photo timeline refreshes for that unit |
| `useCreateSession.onSuccess` | `['hobby-journal', unitId, 'sessions']` | Session list refreshes |
| `useUpdateFaction.onSuccess` (existing) | `['factions']`, `['factions', id]` | If `color_theme_hsl` added to factions table, also invalidate and re-apply theme |

---

## Anti-Patterns

### Anti-Pattern 1: Storing Faction Accent Color as Hex in the Theme Store

**What people do:** Store `activeFactionColor: '#8B3A2F'` in Zustand and build inline styles with it.

**Why it's wrong:** `setProperty('--faction-accent', '#8B3A2F')` works for direct color usage, but the CSS pattern `hsl(var(--faction-accent))` (which Tailwind v4 uses via `@theme inline`) expects channel-only values (`"14 52% 37%"`), not full `hsl()` or hex. Mixing formats causes the token to resolve to `hsl(#8B3A2F)` which is invalid CSS.

**Do this instead:** Store HSL channel values (`"14 52% 37%"`) in the `factions.color_theme_hsl` column and in the Zustand store. Add a hex → HSL converter utility if the Faction CRUD sheet uses a hex color picker.

### Anti-Pattern 2: Dynamically Constructing Tailwind Class Names

**What people do:** `` className={`bg-${factionSlug}-500 text-${factionSlug}-50`} `` or similar runtime class name construction.

**Why it's wrong:** Tailwind v4 statically scans source files. String interpolations are invisible to the scanner — the generated utility classes will be absent from the production CSS bundle. Components silently lose styling.

**Do this instead:** Always use `bg-faction-accent`, `border-faction-accent`, etc. (the CSS property-backed utilities). The static class name is always present; the runtime value changes via `setProperty`.

### Anti-Pattern 3: Storing Absolute File Paths in unit_photos

**What people do:** `file_path = 'C:\\Users\\Antoine\\AppData\\Roaming\\com.hobbyforge.app\\photos\\5\\abc.webp'`

**Why it's wrong:** The absolute path embeds the Windows username and AppData location. If the user ever moves the app data dir, renames their Windows account, or the path structure changes, all photo links break silently.

**Do this instead:** Store relative paths (`photos/5/abc.webp`). Resolve to absolute via `appDataDir()` at display time. Cache the base dir once via `getAppDataDir()` in `src/lib/paths.ts`.

### Anti-Pattern 4: Generating Thumbnails Lazily on Gallery First Render

**What people do:** Skip thumbnail generation at upload time, generate from the full-size image in a `useEffect` when the gallery view renders.

**Why it's wrong:** If a unit has 20 photos and the user opens the gallery, 20 simultaneous canvas operations fire. The gallery render stalls, the UI jitters, and the thumbnail write calls collide. The user sees a broken gallery on first visit.

**Do this instead:** Generate and write the thumbnail immediately at upload time before inserting the DB row. By the time the gallery renders, all thumbnails already exist on disk.

### Anti-Pattern 5: Mounting FactionThemeProvider Below QueryProvider

**What people do:** Nest `FactionThemeProvider` inside a page component or feature folder.

**Why it's wrong:** The theme effect must survive navigation between pages. If the provider unmounts on route change, the CSS properties reset on every navigation.

**Do this instead:** Mount `FactionThemeProvider` inside `AppLayout`, which is the root component wrapper for the entire `<Outlet />` tree (see `router.tsx` line 20). This ensures the provider is always mounted for the app lifetime.

---

## Sources

- Direct audit: `src/styles/globals.css` — existing `@theme inline` pattern and dark mode token structure (HIGH confidence)
- Direct audit: `src/components/common/useSidebarCollapsed.ts` — confirms localStorage-first pattern for persistent UI state (HIGH confidence)
- Direct audit: `src-tauri/migrations/001_core_schema.sql` — existing table structures, confirms `image_assets` exists but is unpopulated (HIGH confidence)
- Direct audit: `src-tauri/src/lib.rs` — confirms app_data_dir setup, migration version numbering (HIGH confidence)
- Direct audit: `src-tauri/capabilities/default.json` — current permissions, confirms fs plugin not yet registered (HIGH confidence)
- Direct audit: `src/main.tsx` and `src/app/router.tsx` — confirms app root structure, `QueryProvider` wraps `RouterProvider` (HIGH confidence)
- Tailwind v4 theme docs: `tailwindcss.com/docs/theme` — `@theme inline` behavior, CSS variable generation (MEDIUM confidence — via WebSearch summary)
- Tailwind v4 GitHub Discussion #18560: `@theme vs @theme inline` — confirms inline variables are not globally emitted, must be referenced via the token name (MEDIUM confidence)
- Tauri v2 fs plugin docs: `v2.tauri.app/plugin/file-system/` — `BaseDirectory.AppData`, `writeFile`, `mkdir`, permission names (MEDIUM confidence — via WebSearch summary)
- Tauri v2 GitHub Discussion #9306: `writeFile` API in v2 — `Uint8Array` + `baseDir` pattern (MEDIUM confidence)
- MDN `OffscreenCanvas.convertToBlob()` — thumbnail generation approach (HIGH confidence — standard web API)
- Zustand `persist` docs: `zustand.docs.pmnd.rs/reference/integrations/persisting-store-data` — synchronous localStorage hydration behavior (HIGH confidence)

---
*Architecture research for: HobbyForge v2.1 — Visual Command*
*Researched: 2026-05-02*
