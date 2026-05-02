# Feature Research

**Domain:** Warhammer 40K hobby management desktop app (personal, local-first)
**Milestone:** v2.1 Visual Command
**Researched:** 2026-05-02
**Confidence:** HIGH (grounded in existing codebase + verified ecosystem patterns)

---

## Scope

This file covers the six new features in v2.1. Existing features (Collection, Kanban,
Recipes, Dashboard, Paint Inventory, Army List Builder, Unit Playbook) are already
shipped or in-flight and are referenced only as dependencies, not re-researched.

---

## Feature 1: Faction Dynamic Theming

### What it is

When a faction is set as "active" (user selects it from the Dashboard faction cards or
a global picker), the UI accent colors shift to match that faction's `color_theme` hex
value. The change cascades across the entire app: sidebar active-item highlight, stat
card accents, progress bar fill, gallery card status rings, and any component that
uses the `--color-accent` CSS custom property.

### How it works — implementation pattern

**Pattern: CSS custom property injection on `document.documentElement`**

`document.documentElement.style.setProperty('--faction-accent', hexColor)` fires
whenever the active faction changes. Tailwind v4 supports this cleanly via the
`@theme inline` directive:

```css
@theme inline {
  --color-accent: var(--faction-accent, hsl(var(--accent)));
}
```

The fallback `hsl(var(--accent))` (zinc) applies when no faction is active. Components
that already use `bg-accent` or `text-accent-foreground` pick up the faction color
automatically — no component changes needed for most of the UI.

A `useFactionTheme()` hook reads a Zustand store entry (`activeFactionId`) and calls
`setProperty` on mount and on change. This hook runs in AppLayout (or a thin wrapper),
so every page sees the update. No re-render cascade — one DOM mutation, CSS does the rest.

(Source: Tailwind v4 CSS variable discussion #15600, Josh W. Comeau CSS Variables for
React Devs. Inline `@theme` confirmed as the Tailwind v4 mechanism for referencing
runtime CSS variables.)

### What triggers the color change

The faction cards on the Dashboard are already the primary faction-context UI element.
Clicking a `FactionSummaryCard` currently navigates to Collection filtered by that
faction. In v2.1 it also sets `activeFactionId` in Zustand. A "clear faction" action
(click the active card again, or an X button) returns to the zinc default.

No global faction selector needed in the sidebar. The Dashboard remains the natural
faction-selection surface.

### UI elements that shift with faction theming

| Element | Current | After Theming |
|---------|---------|---------------|
| Sidebar active-item background | `bg-accent` (zinc) | Faction color at ~15% opacity via CSS var |
| Sidebar active-item left border | none | 3px solid faction color |
| Stat card value text | `text-foreground` | Faction accent (optional — may reduce readability) |
| Progress bar fill | `bg-primary` (zinc) | Faction color |
| Gallery card "Completed" ring | zinc | Full faction color ring |
| Dashboard hero stat cards | zinc border | Faction color top accent stripe |
| FactionSummaryCard left border | inline `borderLeftColor` | Already works — no change |
| Faction badge in collection table | inline `backgroundColor` | Already works — no change |

**Critical note:** Faction badges already use inline `style={{ backgroundColor: faction.color_theme }}`
and are NOT affected by the CSS variable. This is correct — they should always show their
own faction color regardless of which faction is active.

### Complexity

MEDIUM. CSS variable injection is 5 lines. Non-trivial parts:

- Luminance check: some user-set hex values may have poor contrast against the dark
  card background. Use a simple luminance formula to detect and apply a minimum opacity
  or brightness adjustment. Do not enforce this automatically — just compute it.
- "No active faction" state: when no faction is active, the default zinc theme must
  cleanly reassert. The CSS fallback handles it, but Zustand state must clear the
  `setProperty` call (set to empty string or the zinc value).
- Zustand persistence: `activeFactionId` should persist across navigation but reset
  on app restart (session-only, no localStorage). Stale faction colors on cold start
  are confusing.

### Schema/dependencies

- `Faction.color_theme: string` — already exists in schema and TypeScript type
- No schema changes needed
- New: Zustand store entry `activeFactionId: number | null`
- New: `useFactionTheme()` hook (wires store to `setProperty`)

---

## Feature 2: Dashboard as Command Center

### What it is

Redesign the Dashboard with a war-room aesthetic: animated count-up on stat values,
faction-colored accent stripes on hero stat cards, and a more visually dominant hierarchy
that communicates "state of the army at a glance."

### Animated counters

Numbers count from 0 to their final value on first render. The `motion/react` library
(Framer Motion's current package name) provides `AnimateNumber` with spring-based
animation — ideal for count-up effects. Alternatively, `react-bits` Count Up component
is dependency-free and trivially embeddable (~30 lines).

Animation parameters: 600–800ms duration, ease-out curve. Numbers should NOT re-animate
on every navigation — only when the Dashboard mounts fresh or when the value changes by
more than a threshold (e.g., 5%). Format: integers for counts, percentage strings for
pct fields (run the animation on the underlying number, apply the `%` suffix after).

The 4 hero stat cards (Total Models, Fully Painted, Battle-Ready Points, Active Projects)
and the 3 progress stat cards animate. The faction summary cards and the "Recently
Updated" / "Active Projects" lists do NOT animate — list animation causes layout jank.

### Hero stat cards visual upgrade

Current `StatCard` renders: `text-3xl font-semibold` value + `text-sm text-muted-foreground` label.

Changes:
- Add a 3px top border in the faction accent color (or a subtle colored glow/shadow)
  when a faction is active
- Slightly increase card padding for visual weight
- The value itself may optionally take the faction accent color for the "active" stat
  matching the current faction (e.g., if Space Marines are active and the card is
  "Space Marines: 24 models", color that value)

The current StatCard does not receive unit/faction context — the Dashboard page can pass
an `accentColor?: string` prop to StatCard when the active faction is set, or the CSS
variable approach handles it globally without prop drilling.

### Faction banners / summary cards

`FactionSummaryCard` currently uses `border-l-4` with inline `borderLeftColor`. In
Command Center mode, expand this to a low-opacity faction color background tint
(`backgroundColor: faction.color_theme + '20'` for 12% opacity hex alpha). The left
border remains. No structural change to the card's data.

### Complexity

LOW-MEDIUM. All data is already in `useDashboardStats`. Changes are:

- Wrap stat values in animated counter component
- Apply CSS faction theme variable (see Feature 1)
- Minor visual upgrades to StatCard and FactionSummaryCard
- No new queries, no schema changes

### Dependencies

- Feature 1 (Faction Dynamic Theming) — determines accent colors applied to hero cards
- Existing `useDashboardStats` hook — provides all data
- No schema changes

---

## Feature 3: Collapsible Icon Sidebar

### What it is and current state

The sidebar is already 80% built. As shipped:

- Width transition: 240 → 48px, 200ms ease-in-out (CSS `transition-[width]`)
- Icons visible in both modes; labels `sr-only` in collapsed mode
- Radix Tooltip on hover for collapsed labels
- `useSidebarCollapsed` hook: reads/writes `localStorage` key `sidebar:collapsed`
- Toggle button: `ChevronsLeft` / `ChevronsRight`

**v2.1 refinement scope:**

1. Active-item styling in collapsed mode: the current active state uses `bg-accent` and
   `text-accent-foreground`. With faction theming, `--color-accent` updates globally, so
   the icon background automatically reflects the faction color. No changes needed here —
   it works by design.

2. Add a left border indicator (3px solid) on the active item that is visible in BOTH
   expanded and collapsed modes. In collapsed mode (48px width), the icon is centered —
   the left border provides a clear "you are here" cue even when no label is visible.

3. Verify tooltip rendering after faction theme CSS variable change: Radix
   `TooltipContent` renders in a portal — it inherits from `:root`, not the sidebar
   element. Should work correctly.

### Complexity

LOW. The implementation is complete. This is 1-2 CSS class additions on `NavItem` and
integration testing with the theming hook. No new state, no new queries.

### Dependencies

- Feature 1 (Faction Dynamic Theming) — active item color inherits from CSS variable
  automatically

---

## Feature 4: Collection Gallery View

### What it is

A card grid view alongside the existing table view on the Collection page. A toggle
button (LayoutList vs LayoutGrid icon in the header) switches between views. Both views
share the same `filteredUnits` array and Zustand filter state.

### Card layout

3-column grid (CSS grid), 4 columns at wider viewports. Each card:

**Image area (top, fixed aspect ratio ~4:3):**
- If `unit.main_image_path` is set: display the image
- Else: a placeholder with faction color background at ~15% opacity + unit initials or
  a Shield/Swords icon centered

**Status ring (overlaid on image, bottom-right corner):**
An inline SVG circle ring showing `painting_percentage` (0–100). The track is muted
(`stroke: hsl(var(--muted))`), the progress arc color varies by status tier (see table
below). Ring size: 36×36px, stroke-width 4. No external library needed — SVG
`stroke-dasharray` + `stroke-dashoffset` is 15-20 lines of code.

**Card body (below image):**
- Unit name (text-sm font-medium, truncated with ellipsis)
- Faction badge (same colored pill as table view, reuse the same Badge component)
- Status label (text-xs text-muted-foreground, e.g. "Highlighted")
- Secondary: model count + points (text-xs text-muted-foreground)

**Actions (hover reveal or static):**
- Edit icon (opens UnitSheet — existing handler)
- Three-dot menu or direct Delete icon (opens UnitDeleteDialog)
- Clicking the card body (outside action area) opens UnitDetailSheet — same as
  table row click

### Status ring color encoding

| Status | Ring fill % | Ring color |
|--------|-------------|------------|
| Not Started | 0 | gray (muted) |
| Built | 9 | gray |
| Primed | 18 | gray |
| Basecoated | 30 | amber |
| Shaded | 40 | amber |
| Layered | 50 | amber |
| Highlighted | 65 | yellow-green |
| Details Done | 75 | green |
| Based | 85 | green |
| Varnished | 94 | green |
| Completed | 100 | faction accent (or primary green) + optional checkmark badge |

Use `unit.painting_percentage` directly as the ring fill value. The color tier derives
from `unit.status_painting` via a small lookup map — same `PAINTING_STATUS_ORDER` that
already exists in `src/types/unit.ts`.

### View state persistence

A `viewMode: 'table' | 'gallery'` entry in the existing `collectionFilters` Zustand
store (or a separate `collectionViewStore`). Persist to localStorage using the same
pattern as `useSidebarCollapsed`. Default: `'table'` (table view on first open).

### Complexity

MEDIUM. The collection data infrastructure is fully reused. New work:

- SVG ring component (inline, no library)
- Unit gallery card component
- View toggle button in CollectionPage header
- Zustand store: add `viewMode` entry
- localStorage persistence (same pattern as useSidebarCollapsed — ~30 lines)
- Responsive grid CSS

### Dependencies

- Existing `CollectionPage` and `filteredUnits` — gallery shares all filter logic
- Existing `UnitDetailSheet`, `UnitSheet`, `UnitDeleteDialog` — same handlers, no change
- Feature 1 (Faction Dynamic Theming) — ring color for "Completed" uses faction accent
- Existing `Unit.main_image_path` — already in schema and TypeScript type (currently
  populated via UnitSheet form; may be null for most units initially)
- `PAINTING_STATUS_ORDER` — already exported from `src/types/unit.ts`

---

## Feature 5: Hobby Journal

Two sub-features per unit, both accessible from a new "Journal" tab inside
`UnitDetailSheet`.

### 5a. Photo Timeline

**What it does:** Attach photos to a unit at different painting stages. Renders as a
chronological timeline showing the unit's visual transformation from sprue to completed.

**Data model:** The `image_assets` table already exists:

```sql
image_assets (id, entity_type TEXT, entity_id INTEGER, file_path TEXT,
              caption TEXT, taken_at TEXT, created_at TEXT)
```

Add `stage_label TEXT` in a v2.1 migration (additive, existing rows get NULL).
Use `entity_type = 'unit'`, `entity_id = unit.id`.

**File storage (Tauri 2 pattern, confirmed from docs):**

1. User clicks "Add Photo"
2. `tauri-plugin-dialog` opens a native file picker (images only)
3. A Tauri Rust command copies the selected file to
   `{app_data_dir}/images/units/{unitId}/{timestamp}_{filename}`
4. The DB stores the relative path (e.g. `images/units/3/1746134400000_banner.jpg`)
5. On display, prefix with the resolved `app_data_dir` for the `<img src>`

This requires adding `tauri-plugin-fs` to Cargo.toml — currently absent. The Rust
command is ~15 lines using `std::fs::copy`. The `tauri.conf.json` capability block
must allow `fs:read` and `fs:write` on the app data directory scope.

**UI pattern (researched from Diarly, Day One, Timeline Journal app):**

- Vertical timeline, newest entry at top (most recent work visible without scrolling)
- Each entry: image thumbnail (click to open full-size in a Radix Dialog), stage label
  badge, date (relative or absolute), caption text
- "Add Photo" button at top of timeline section
- Delete photo via a small X button on the thumbnail (with confirmation)

**Metadata per photo:**

| Field | Input | Notes |
|-------|-------|-------|
| `stage_label` | Dropdown: `PAINTING_STATUS_ORDER` values + "Custom" | Pre-populated from unit's current `status_painting` |
| `taken_at` | Date picker (shadcn/ui date input) | Defaults to today |
| `caption` | Textarea | Optional notes |
| `file_path` | Set by Rust command, not user-editable | |

**Complexity: HIGH.** This is the highest-complexity feature in v2.1:

- New Tauri Rust command (file copy + path resolution) — first Rust code beyond the
  plugin setup in `lib.rs`
- `tauri-plugin-fs` must be added to `Cargo.toml` + `tauri.conf.json` capability
- New migration: `stage_label` column on `image_assets`
- New queries: `getUnitPhotos`, `insertUnitPhoto`, `deleteUnitPhoto`
- New hooks: `useUnitPhotos`
- New UI: timeline component, photo picker dialog, full-size viewer dialog

### 5b. Session Log

**What it does:** Log painting sessions for a unit: date, duration, optional notes.
Show total time invested per unit.

**Data model (new table, v2.1 migration):**

```sql
CREATE TABLE IF NOT EXISTS painting_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id         INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  session_date    TEXT    NOT NULL,
  duration_minutes INTEGER NOT NULL,
  notes           TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**Entry UX (researched from Brushrage time tracking pattern):**

Manual entry wins over a live timer for a desktop app. A live stopwatch requires the
app to stay open during painting — not realistic. The flow is:

1. Click "Log Session"
2. A small dialog (or inline form): Date (default today) | Duration in minutes (integer
   input) | Notes (textarea, optional)
3. Save → appears in the session list

Duration display: stored as integer minutes, displayed as "1h 30m" format.
Input: a plain number field (type="number", min=1) — faster than a time picker for this
use case. "45" is quicker to type than operating a clock widget.

**Session log UI (inside the Journal tab):**

- Session list: newest first, columns: Date | Duration | Notes (truncated)
- Total at the bottom: "Total time painted: 4h 15m" — this is the headline metric
- "Log Session" button at top
- Delete per row (X icon, no confirmation needed for a log entry)

**Complexity: MEDIUM.** Pure SQL + standard form pattern. No new Tauri plugins needed.
Similar complexity to adding a new CRUD page, but scoped inside a detail sheet tab.

### Journal tab in UnitDetailSheet

Both sub-features (Photo Timeline + Session Log) live in a "Journal" tab added to
`UnitDetailSheet`. The tabs pattern is not currently used in UnitDetailSheet — this adds
tabs to the sheet (shadcn/ui `<Tabs>` component, already installed). Two tabs: "Photos"
and "Sessions". The existing detail content (unit stats, notes) moves to a "Details"
tab or remains as the sheet header above the tabs.

### Dependencies

- Existing `Unit` type and `units` table
- Existing `image_assets` table (schema exists; not yet queried from frontend)
- New: `tauri-plugin-fs` (must add to Cargo.toml + capabilities)
- New: Rust command for file copy
- New migration: v2.1 (adds `stage_label` to `image_assets`; adds `painting_sessions` table)
- `PAINTING_STATUS_ORDER` — stage label dropdown options
- UnitDetailSheet — add Journal tab panel

---

## Feature 6: Spending Tracker

### What it is

Surface and aggregate the cost data that already exists (units) and add cost tracking
where it is missing (paints). A new `/spending` page with three sections: grand total,
by-faction breakdown, and recent purchases.

### Data that already exists

The `units` table already has:
- `purchase_price REAL` — cost of the unit
- `purchase_date TEXT` — when it was bought

The `UnitSheet` form already has fields for these. The only gap is that the data is not
surfaced anywhere visible — no summary, no totals.

### Data that is missing

`paints` table has no cost column. A v2.1 migration adds:

```sql
ALTER TABLE paints ADD COLUMN purchase_price REAL;
```

No `purchase_date` on paints — not needed for the MVP aggregation.

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Grand total spend (all units) | "How much have I spent on this army?" is the #1 collector question | LOW | `SELECT SUM(purchase_price) FROM units` — one query |
| Per-faction total spend | "How much did my Space Marines cost vs my Tau?" | LOW | `SELECT faction_id, SUM(purchase_price) FROM units GROUP BY faction_id` |
| Currency formatted display | Numbers displayed as "€42.50" not "42.5" | LOW | `Intl.NumberFormat` with currency option |
| Per-unit cost visible | purchase_price not surfaced beyond the form | LOW | Already in schema; add a "Cost" column to the spending page table |
| Recent purchases list | "What did I buy last?" | LOW | `SELECT * FROM units WHERE purchase_price IS NOT NULL ORDER BY purchase_date DESC LIMIT 20` |

### Differentiators (Beyond Table Stakes)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Paint pot cost tracking | "Total hobby spend including consumables" is more honest than models only | MEDIUM | One ALTER TABLE + new UX for entering paint costs |
| Paint spend vs unit spend split | Shows "I spent €400 on models, €150 on paints" — useful proportion insight | LOW | Two SELECTs, displayed as two line items in the summary |
| Spending stat card on Dashboard | Quick spend overview without navigating to Spending page | LOW | Add to `computeStats` or a separate `useSpendStats` hook; one new StatCard |

### Anti-Features (Explicitly Out of Scope)

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| Budget caps / spending alerts | Guilt-trip UX — wrong tone for a hobby app | Show totals; user interprets |
| External bank/card sync | Violates local-first design philosophy | Manual entry only |
| Receipt photo scanning / OCR | Cloud dependency, disproportionate complexity | Manual price field |
| Currency conversion / FX rates | Requires internet; scope explosion | Single currency; EUR default; make it user-settable in a future Settings page |
| Charts / graphs / trend visualization | Adds a charting library dependency; overkill for a personal tracker at v2.1 | Text-based monthly list: "Jan 2026: €120, Feb 2026: €45" — a simple `GROUP BY strftime('%Y-%m', purchase_date)` |
| Monthly spend trend in v2.1 | Nice but not the core question; adds GROUP BY date complexity | Defer to v2.2; note as a follow-up |

### Spending page structure

**New page:** `/spending` (new nav item in AppSidebar with a Banknote or Wallet icon).

**Section 1 — Summary strip:**
- Grand total: all units + all paints combined
- Unit spend: subtotal for units
- Paint spend: subtotal for paints (may be €0 until user enters paint costs)
- Currency: `Intl.NumberFormat(navigator.language, { style: 'currency', currency: 'EUR' })`
  Hard-code EUR for now; make configurable in a future Settings page.

**Section 2 — By Faction table:**
Columns: Faction | Units | Unit spend | % of total unit spend
Sorted by spend descending. Faction color badge in the first column.

**Section 3 — Recent purchases:**
A table of units with `purchase_price IS NOT NULL`, sorted by `purchase_date DESC`.
Columns: Unit name | Faction badge | Price | Date

### Complexity

LOW-MEDIUM overall. All unit data exists. The work is:
- One ALTER TABLE migration (paints.purchase_price)
- 3-4 new SQL aggregation queries
- New SpendingPage component
- One new nav item
- Optional: one new StatCard on Dashboard

### Dependencies

- Existing `units.purchase_price` and `units.purchase_date` — already in schema
- Existing `factions` table — for per-faction breakdown display
- New migration: `ALTER TABLE paints ADD COLUMN purchase_price REAL`
- AppSidebar: add new nav item
- Optional: Dashboard `computeStats` or new `useSpendStats` hook

---

## Table Stakes vs Differentiators — Consolidated View

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Existing Support |
|---------|--------------|------------|-----------------|
| Faction theming — color shifts on faction select | Gaming apps universally use faction colors; `color_theme` already in schema | MEDIUM | `Faction.color_theme` exists; CSS variable hook is new |
| Gallery card view with status ring | Hobby trackers in 2025 have card views; table-only feels outdated | MEDIUM | Shares `filteredUnits` from CollectionPage |
| Per-unit cost entry and total | Field exists; not surfaced anywhere | LOW | `units.purchase_price` already in schema |
| Per-faction spend total | Collectors always ask "how much did this faction cost?" | LOW | New aggregation query on existing data |
| Photo attachment per unit | Figure Case, Brushrage, PaintGolf all support photos; expected feature | HIGH | `image_assets` table exists; Tauri plugin is new |
| Session date + duration log | Brushrage popularized time tracking; hobbyists track "hours painted" as a pride metric | MEDIUM | New table + new queries |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity |
|---------|-------------------|------------|
| Animated dashboard counters | War-room feel; makes progress tangible; not standard in hobby trackers | LOW-MEDIUM |
| Photo timeline stage-by-stage | Seeing transformation from grey plastic to finished model is uniquely satisfying; no competing local-first desktop app does this well | HIGH |
| Paint pot cost tracking | Most trackers ignore consumables; total hobby spend including paints is more honest | MEDIUM |
| Faction accent cascading to gallery ring color and sidebar | Cohesive visual identity; most apps use static brand colors | MEDIUM |
| Collapsible sidebar with faction-aware active-item color | UX refinement that few personal-tool apps prioritize | LOW |

### Anti-Features (Explicitly Out of Scope)

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| AI photo analysis ("what stage is this model?") | Cloud API dependency; PROJECT.md explicitly defers AI | Manual stage label selection |
| Cloud photo sync | Violates local-first architecture | Local file copy to app data dir |
| Live painting timer (stopwatch) | Requires app to stay open while painting; wrong UX | Manual duration entry after session |
| Multi-currency support with FX rates | Internet dependency + scope explosion | Single currency (EUR), user-settable later |
| Budget caps / spending alerts | Wrong tone for a hobby app | Show totals; let user interpret |
| Automatic receipt OCR | Cloud + complexity | Manual price field |
| Drag-to-reorder photo timeline | Photos are chronological facts | Date-sorted, immutable order |
| Social sharing / export to Instagram | Out of scope; private personal tool | Not in roadmap |
| Barcode scanning for paints | Desktop has no camera; `tauri-plugin-camera` is mobile-only | Manual entry |

---

## Feature Dependencies

```
[Faction Dynamic Theming]
    required by──> [Dashboard Command Center] (hero stat accent colors)
    required by──> [Gallery View] (Completed ring color)
    required by──> [Sidebar Polish] (active item color in collapsed mode)
    new──> Zustand activeFactionId entry
    new──> useFactionTheme() hook

[Dashboard Command Center]
    requires──> [Faction Dynamic Theming]
    reuses──> useDashboardStats (no change)
    new──> animated counter component

[Collapsible Sidebar Polish]
    requires──> [Faction Dynamic Theming] (CSS variable covers it automatically)
    reuses──> AppSidebar, NavItem, useSidebarCollapsed (minor additions only)

[Gallery View]
    requires──> CollectionPage + filteredUnits (all filter state shared)
    requires──> UnitDetailSheet, UnitSheet, UnitDeleteDialog (same handlers)
    requires──> Unit.main_image_path (in schema, may be null)
    requires──> PAINTING_STATUS_ORDER (already exported)
    enhances──> [Faction Dynamic Theming] (Completed ring color)

[Hobby Journal — Session Log]
    requires──> units table (ON DELETE CASCADE for painting_sessions)
    requires──> NEW migration: painting_sessions table
    enhances──> UnitDetailSheet (new Journal tab)

[Hobby Journal — Photo Timeline]
    requires──> image_assets table (already in schema; needs stage_label column)
    requires──> tauri-plugin-fs (NOT currently in Cargo.toml — must add)
    requires──> NEW Rust command (file copy + path resolution)
    requires──> NEW migration: stage_label on image_assets
    enhances──> UnitDetailSheet (Journal tab, Photos panel)

[Spending Tracker]
    requires──> units.purchase_price (already exists)
    requires──> paints.purchase_price (NEW — ALTER TABLE migration)
    enhances──> Dashboard (optional spend stat card — P2)
    requires──> AppSidebar (new nav item)
```

### Dependency and sequencing notes

- **Faction Theming must come first** (or in parallel with Dashboard). Both Dashboard
  Command Center and Gallery View consume the faction accent color. Building them without
  the theming hook means hardcoding zinc colors that get replaced later.

- **tauri-plugin-fs is the highest-friction dependency.** Adding a new Tauri plugin
  requires Cargo.toml edit, Rust command code, and a `tauri.conf.json` capability entry.
  The Hobby Journal phase must begin by confirming this plugin is wired before writing
  any frontend photo code.

- **The Sidebar is already 80% built.** Its v2.1 work is integration with Faction
  Theming (covered automatically via CSS variables) + one CSS addition (left border).
  Plan it in the same phase as Faction Theming to avoid a standalone trivial phase.

- **Spending Tracker has no hard dependencies on any other v2.1 feature.** The data
  exists or needs one ALTER TABLE. It can be built in any order — good candidate for
  an early phase to get a quick win while higher-complexity features are planned.

- **Session Log can be built independently of Photo Timeline.** Session Log is pure
  SQL + standard CRUD form. Photo Timeline needs the new Tauri plugin. Build Session
  Log first within the Hobby Journal phase.

---

## MVP Definition for v2.1

### Ship in v2.1 (all six features)

- [x] Faction Dynamic Theming — CSS variable injection + Zustand activeFactionId
- [x] Dashboard Command Center — animated counters + faction accent on hero stats
- [x] Collapsible Sidebar polish — left border on active item (integrates with theming)
- [x] Gallery View — card grid + SVG ring + view toggle
- [x] Hobby Journal — Session Log — new table, log UI, total time display
- [x] Hobby Journal — Photo Timeline — file picker, Tauri file copy, timeline UI
- [x] Spending Tracker — per-faction totals, grand total, spending page

### Defer to v2.2 or later

- [ ] Monthly spend trend (GROUP BY purchase_date month) — useful but not the core
  "how much have I spent?" question
- [ ] Spending stat card on Dashboard — Dashboard already information-dense; avoid
  overloading it in v2.1
- [ ] Hobby Journal "Log Session" action from Gallery Card — contextual shortcut; the
  detail sheet covers the same action
- [ ] Currency selector in Settings — hard-code EUR in v2.1; add to Settings page when
  that page is built

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Faction Dynamic Theming | HIGH | MEDIUM | P1 — enables other features |
| Gallery View | HIGH | MEDIUM | P1 — visual flagship of v2.1 |
| Dashboard Command Center | MEDIUM | LOW | P1 — quick win, high visual impact |
| Hobby Journal — Photo Timeline | HIGH | HIGH | P1 — strongest differentiator; plan plugin early |
| Hobby Journal — Session Log | MEDIUM | MEDIUM | P1 — quick confidence win within Journal phase |
| Spending Tracker | MEDIUM | LOW-MEDIUM | P1 — data exists; quick to surface |
| Collapsible Sidebar Polish | LOW | LOW | P2 — already built; integrates with theming |

---

## Competitor Feature Comparison

| Feature | Figure Case | Brushrage | Pile of Potential | HobbyForge v2.1 Approach |
|---------|-------------|-----------|-------------------|--------------------------|
| Faction theming | No — static UI | No | No | CSS variable injection on faction select |
| Gallery card view | Yes — grid view with progress | No | No | Card grid with SVG ring, shares filter state |
| Photo timeline per unit | Yes — photos per miniature | Yes — with reference support | No | Stage-labeled timeline, local file storage |
| Session log / time tracking | Effort factor (not sessions) | Yes — precise timers | No | Manual duration entry; total time per unit |
| Spending / cost tracking | No | No | Shows model count only | Per-unit + per-paint cost; faction aggregation |
| Animated counters on dashboard | No | No | No | Count-up on mount; spring animation |
| Collapsible sidebar | N/A (mobile) | N/A (mobile) | N/A (web) | Already shipped; accent color integration in v2.1 |

---

## Sources

- Codebase: `src/features/**`, `src/db/queries/**`, `src-tauri/src/lib.rs`,
  `src-tauri/Cargo.toml`, `src-tauri/migrations/001_core_schema.sql`,
  `src/styles/globals.css`, `src/types/unit.ts`, `src/types/faction.ts`
- Figure Case hobby progress app — faction/stage tracking + photo features
- Brushrage miniature painting app — session timer + photo/reference features
- PaintGolf, Pile of Potential — painting tracker conventions
- Tailwind v4 dynamic theming: https://github.com/tailwindlabs/tailwindcss/discussions/15600
- Josh W. Comeau CSS Variables for React: https://www.joshwcomeau.com/css/css-variables-for-react-devs/
- Tailwind v4 runtime CSS variable discussion: https://github.com/tailwindlabs/tailwindcss/discussions/17613
- Motion.dev AnimateNumber: https://motion.dev/docs/react-animate-number
- React Bits Count Up: https://www.reactbits.dev/text-animations/count-up
- react-circular-progressbar: https://github.com/kevinsqi/react-circular-progressbar
- Tauri v2 File System plugin: https://v2.tauri.app/plugin/file-system/
- Tauri v2 Dialog plugin: https://v2.tauri.app/plugin/dialog/
- Tauri file handling discussion: https://github.com/tauri-apps/tauri/discussions/1579

---

*Feature research for: HobbyForge v2.1 — Visual Command*
*Researched: 2026-05-02*
