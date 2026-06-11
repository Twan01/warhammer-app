# Visual Consistency Audit — HobbyForge

**Audited:** 2026-06-11
**Scope:** All 16 page components across all feature directories
**Method:** Static code review — READ-ONLY, no source files modified

---

## 1. Design Token Usage Summary

The CSS token system is well-structured. `globals.css` defines:

- **Standard shadcn/ui tokens** — `--background`, `--foreground`, `--card`, `--muted`, `--border`, `--primary`, etc. (light + dark)
- **Semantic surface aliases** (Phase 25) — `--forge-black`, `--panel-elevated`, `--panel-surface` (dark-mode only)
- **Battle Gold** (Phase 25) — `--battle-gold: oklch(0.78 0.17 85)` (dark-mode only; not defined in `:root`)
- **Faction Accent** — `--faction-accent` runtime-mutable CSS variable (defined in both `:root` and `.dark`)
- **Font** — `--font-sans: 'Geist Variable'`

**Critical gap:** `--battle-gold` and the semantic surface aliases (`--forge-black`, `--panel-elevated`, `--panel-surface`) are only defined inside `.dark {}`. They have no `:root` (light-mode) equivalents. Any component using `text-battle-gold` or `bg-forge-black` in light mode will silently fall back to `transparent`/`inherit`. This affects `GoalsPage` (lines 132, 133) and `GoalCard` (line 25) and `DashboardPage` section headers.

**Scrollbar styling:** No custom scrollbar rules exist in `globals.css`. The app relies entirely on OS-default scrollbars. No inconsistency — but a known gap if polish is desired.

---

## 2. Page Header Inconsistencies

The `PageHeader` component (`src/components/common/PageHeader.tsx`) outputs:
- `h1` at `text-3xl font-semibold tracking-tight`
- Optional `subtitle` at `text-sm text-muted-foreground mt-1`
- Optional `actions` slot right-aligned
- Container: `flex items-center justify-between pb-6 border-b border-border/40`

### Pages using PageHeader correctly

| Page | File | Notes |
|------|------|-------|
| Dashboard | `DashboardPage.tsx:169,248,311` | Correct. Uses it in all 3 branches. |
| Collection | `CollectionPage.tsx:172` | Correct. |
| Painting Projects | `PaintingProjectsPage.tsx:26` | Correct. |
| Recipes | `RecipesPage.tsx:151` | Correct. |
| Paints | `PaintsPage.tsx:98` | Correct. |
| Army Lists | `ArmyListsPage.tsx:45` | Correct. |
| Army List Detail | `ArmyListDetailPage.tsx:556` | Correct. Also has a Back button above the header. |
| Battle Log | `BattleLogPage.tsx:69` | Correct. |
| Goals | `GoalsPage.tsx:83` | Correct. |
| Wishlist | `WishlistPage.tsx:56` | Correct. |
| Factions | `FactionsPage.tsx:73` | Correct — but **missing `subtitle` prop** (all other pages have one). |
| Spending | `SpendingPage.tsx:69` | Correct — but uses `max-w-3xl mx-auto p-8` container vs. `p-6` on all others. |

### Pages NOT using PageHeader — INCONSISTENCIES

| Page | File | Line | What it uses instead |
|------|------|------|---------------------|
| **Rules Hub** | `RulesHubPage.tsx` | 107 | Raw `<h1 className="text-3xl font-semibold tracking-tight">Rules Hub</h1>` — no subtitle, no border-b, no actions slot |
| **Unit Database (DB Browser)** | `DatabaseBrowserPage.tsx` | 191 | Raw `<h1 className="text-3xl font-semibold tracking-tight">Unit Database</h1>` — no subtitle, no border-b |
| **Data Health** | `DataHealthPage.tsx` | 23 | `<h1 className="text-xl font-semibold">Data Health</h1>` — **wrong font size** (`text-xl` not `text-3xl`), no subtitle, no border-b |
| **Settings** | `src/app/settings/page.tsx` | 13 | `<h1 className="text-xl font-semibold">Settings</h1>` — **wrong font size** (`text-xl` not `text-3xl`), no subtitle, no border-b |
| **Game Day** | `GameDayPage.tsx` | 87 | Uses `GameDayHeader` component — intentionally different (full-bleed app-bar pattern, not a content page) |
| **Painting Mode** | `PaintingModeView.tsx` | — | No page header at all — intentionally different (immersive mode, full screen) |

**Summary of actionable inconsistencies:**
- Rules Hub and Unit Database (DB Browser): use inline `h1` matching the size but missing the `border-b` separator, subtitle, and the PageHeader flex layout.
- Data Health and Settings: use `text-xl` instead of `text-3xl`. This makes them visually lighter and inconsistent with the rest of the app.
- Factions: uses PageHeader but omits `subtitle`. Every other PageHeader-using page provides one.

**Recommended fix:** Migrate Rules Hub, DB Browser, Data Health, and Settings to `PageHeader`. Add a subtitle to Factions.

---

## 3. Spacing & Layout Patterns

### Page container pattern

The standard page container is:

```tsx
<div className="flex flex-col gap-6 p-6">
```

This is used by: Collection, Painting Projects, Recipes, Paints, Army Lists, Army List Detail, Battle Log, Goals, Wishlist, Factions, Rules Hub, DB Browser, Game Day.

**Deviations:**

| Page | File | Container class | Issue |
|------|------|----------------|-------|
| **Spending** | `SpendingPage.tsx:68` | `max-w-3xl mx-auto p-8 flex flex-col gap-12` | Uses `p-8` (not `p-6`), `gap-12` (not `gap-6`), and max-width constraint. Intentional narrow layout, but `p-8` vs `p-6` is inconsistent. |
| **Data Health** | `DataHealthPage.tsx:22` | `p-6 space-y-6` | Uses `space-y-6` not `flex flex-col gap-6`. Functionally equivalent but different utility pattern. |
| **Settings** | `src/app/settings/page.tsx:13` | `p-6 space-y-6` | Same deviation as Data Health. |
| **Dashboard** | `DashboardPage.tsx:302` | `grid grid-cols-1 gap-6 p-6 lg:grid-cols-[3fr_2fr]` | Intentionally different — complex grid layout for the dashboard. Acceptable. |

The `space-y-6` vs `flex flex-col gap-6` difference is minor (identical computed layout) but signals these pages were written with a different pattern in mind. Standardising on `flex flex-col gap-6 p-6` everywhere except Dashboard would be cosmetic housekeeping.

### Section heading pattern (inside pages)

There are two competing patterns for in-page section headings:

**Pattern A — uppercase label (Dashboard, used consistently there):**
```tsx
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
  Section Name
</p>
```

**Pattern B — regular heading (Goals, Spending):**
```tsx
<h2 className="text-base font-semibold">Section Name</h2>
```

**Pattern C — Settings sub-sections:**
```tsx
<h3 className="text-base font-semibold">Section Name</h3>
```
Used in `GeneralPreferencesSection.tsx:14` and `HobbyDefaultsSection.tsx:14`.

No page outside Dashboard uses Pattern A. Goals uses Pattern B (lines 115, 131, 150). Spending uses Pattern B (lines 124, 133). Settings uses Pattern C. These are inconsistent with each other and with Dashboard's Pattern A. There is no documented standard — each page picked its own approach.

---

## 4. Card & Container Styling Differences

### Standard card pattern (correct)

```tsx
<Card className="bg-card border border-border/60 shadow-sm">
```

Used consistently by: `GoalCard.tsx:29`, `ArmyListCard.tsx:50`, `StatCard.tsx:71`, `DataManagementTab.tsx` (multiple cards).

### Hover shadow on interactive cards

Interactive cards that are clickable add `hover:shadow-md transition-shadow duration-150`:

```tsx
"bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-150"
```

Used by: `ArmyListCard.tsx:50`, `StatCard.tsx:71` (when `to` prop is set).

### Deviations

| Component | File | Class used | Issue |
|-----------|------|-----------|-------|
| Spending hero card | `SpendingPage.tsx:88` | `ring-2 ring-faction-accent rounded-lg px-6 py-6` | Uses `ring-2` accent ring instead of `border border-border/60 shadow-sm`. Intentional per the file's own comment ("ONLY faction-themed element"), but it breaks from the card taxonomy used everywhere else. |
| Spending metric cards | `SpendingPage.tsx:97, 105` | `bg-card border border-border/60 shadow-sm rounded-lg px-6 py-6` | Duplicate padding: `px-6 py-6` is inline on the Card instead of on CardContent. The `Card` component from shadcn already sets `rounded-lg`. Adding `rounded-lg` is redundant. |
| Data Health cards | `DataHealthPage.tsx` (via `BackupCard`, `DiagnosticsCard`, etc.) | Uses `CardContent className="p-6"` | Consistent with `DataManagementTab` — `p-6` on `CardContent` to override shadcn default padding. This matches the settings pattern. |
| DataManagementTab | `DataManagementTab.tsx:157,178,209,239` | `<Card><CardContent className="p-6">` | Correct — uses the Card primitive properly. |

The main inconsistency is Spending using inline `px-6 py-6` on `<Card>` directly instead of via `CardContent`.

---

## 5. Empty State Patterns

### Standard empty-state pattern (established in Phase 16)

```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <div className="rounded-xl bg-muted/40 p-4">
    <Icon className="h-8 w-8 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <p className="text-base font-semibold">Heading</p>
    <p className="text-sm text-muted-foreground max-w-xs">Body text.</p>
  </div>
  <Button className="mt-2" onClick={onAdd}>CTA</Button>
</div>
```

### Conforming empty states

| Component | File | Status |
|-----------|------|--------|
| CollectionEmptyState (no-data mode) | `CollectionEmptyState.tsx:31` | Conforms |
| CollectionEmptyState (filtered mode) | `CollectionEmptyState.tsx:16` | Conforms |
| PaintsEmptyState | `PaintsEmptyState.tsx` | Conforms |
| BattleLogEmptyState | `BattleLogEmptyState.tsx` | Conforms |
| ArmyListsEmptyState | `ArmyListsEmptyState.tsx` | Conforms |
| GoalEmptyState | `GoalEmptyState.tsx` | Conforms |
| WishlistEmptyState | `WishlistEmptyState.tsx` | Conforms |
| RecipeEmptyState | `RecipeEmptyState.tsx` | Conforms |
| KanbanEmptyState | `KanbanEmptyState.tsx` | Conforms |
| FactionsEmptyState | `FactionsEmptyState.tsx` | Conforms — but **missing `max-w-xs`** on body `<p>` tag (line 13 uses `text-sm text-muted-foreground` without `max-w-xs`). All other empty states cap body width. |

### Deviating empty states

| Page | File | Line | Pattern used | Issue |
|------|------|------|-------------|-------|
| **Dashboard empty state** | `DashboardEmptyState.tsx:14` | 14 | Custom layout (Sword icon + wordmark, no muted-pill) | Intentionally distinct per Phase 16 — documented deviation ("NOT the standard icon-in-container pattern"). Acceptable. |
| **Spending empty state** | `SpendingPage.tsx:75–84` | 75 | Inline empty state in page (no dedicated component) | Uses the `rounded-xl bg-muted/40 p-4` pill correctly, but `gap-3` is the correct standard value. Body has `max-w-xs`. **The issue**: CTA is absent — spending empty state gives info text but no actionable button. This is by design (data comes from unit/paint sheets), but the visual is noticeably different from all others. |
| **Rules Hub no-data** | `RulesHubPage.tsx:109–112` | 109 | Plain `<p className="text-sm text-muted-foreground">` | No icon, no structure, just inline text. Not an empty state component. |
| **Rules Hub no-faction** | `RulesHubPage.tsx:143–145` | 143 | Plain `<p className="text-sm text-muted-foreground">` | Same as above. Instructional text, not technically an "empty state", but visually jarring compared to other pages' empty states. |
| **DB Browser no-faction** | `DatabaseBrowserPage.tsx:232` | 232 | `<p className="text-sm text-muted-foreground px-4 py-6">` | Plain text in a specific panel, not a full empty state. Acceptable given the split-panel layout. |
| **Paints filtered empty** | `PaintsPage.tsx:129–132` | 129 | Inline `<p>` + ghost button, no icon pill | No icon container, no centered layout. Inconsistent with `CollectionEmptyState`'s filtered mode which uses the full pattern. |

---

## 6. Typography Hierarchy Issues

### H1 size: `text-3xl` vs `text-xl`

The app has two different h1 sizes in use:

- `text-3xl font-semibold tracking-tight` — used by PageHeader (12 pages)
- `text-xl font-semibold` — used by Data Health (line 23) and Settings (line 13)

This is the most visible typography inconsistency. Data Health and Settings feel like sub-pages because their headers are visually smaller.

### H2 in pages

No consistent h2 style exists across all pages:

| Usage | Class | Pages |
|-------|-------|-------|
| Section heading in Spending | `text-base font-semibold` | Spending `<h2>` |
| Section heading in Goals | `text-base font-semibold` | Goals `<h2>` (3 instances) |
| Sub-section heading in Settings | `text-base font-semibold` | GeneralPreferencesSection `<h3>`, HobbyDefaultsSection `<h3>` |
| Sub-section heading in AboutTab | `text-lg font-semibold` + `text-sm font-semibold text-muted-foreground uppercase tracking-wider` | Mixed within a single component |
| Section heading in DataHealth | `text-lg font-semibold` | DataHealthPage `<h2>` lines 28, 38 |
| Dashboard section labels | `text-sm font-semibold uppercase tracking-widest text-muted-foreground` | DashboardPage `<p>` (not even h2) |

**Data Health** uses `text-lg font-semibold` for `<h2>` while **Spending and Goals** use `text-base font-semibold`. **About tab** mixes `text-lg` for the app name with the `text-sm uppercase` pattern for sub-section labels.

### Recommendation

Standardise on a two-level hierarchy:
- Page title: `PageHeader` component (text-3xl) — **do not deviate**
- Section heading within a page: `text-sm font-semibold uppercase tracking-wider text-muted-foreground` (align with Dashboard's already-established pattern)

---

## 7. Button & Action Placement

### Primary CTA in PageHeader actions slot

The standard: primary action button sits in the PageHeader `actions` prop, right-aligned, using `<Button>` (default/primary variant) with an icon.

All standard pages conform to this:
- Collection: `<Button onClick={handleAdd}><Plus ...> Add Unit</Button>` — default variant
- Paints: `<Button onClick={openCreate}><Plus ...> Add Paint</Button>` — default variant
- Army Lists: `<Button onClick={openCreate}><Plus ...> New List</Button>` — default variant
- Battle Log: `<Button onClick={openCreate}><Swords ...> Log Game</Button>` — default variant
- Goals: `<Button onClick={handleCreate}><Target ...> New Goal</Button>` — default variant
- Wishlist: `<Button onClick={openCreate}><Heart ...> Add Item</Button>` — default variant
- Factions: `<Button onClick={openCreate}><Plus ...> Add Faction</Button>` — default variant
- Recipes: `<Button onClick={onAddRecipe}><Plus ...> Add Recipe</Button>` — default variant

**Dashboard deviates (correctly):** Uses `variant="outline" size="sm"` for "Log Session" and "Quick Add". This is intentional — the dashboard header contains two secondary actions, not a single primary.

**Collection deviates:** The default Add Unit button is at full size while the view-toggle ghost buttons use `size="icon"`. This is fine — different button roles.

### Icon sizing inconsistency

| Pattern | Classes | Used by |
|---------|---------|---------|
| Full-size button icon | `<Plus className="mr-2 h-4 w-4">` | Collection, Paints, Recipes, Army Lists, Goals, Wishlist, Battle Log |
| Smaller button with size="sm" | `<Plus size={14} className="mr-1.5">` | Dashboard Quick Add, Dashboard Log Session |

Both patterns are valid, but Dashboard's `size={14}` + `mr-1.5` approach does not match the `h-4 w-4` + `mr-2` pattern used by all other pages.

### Recipes page filter bar buttons

`RecipesPage.tsx` line 197 uses `variant={hasMissingFilter ? "default" : "outline"}` for the "Missing paints" filter toggle. This is the only filter toggle using `variant="default"` when active. All other pages with filter chips (Rules Hub) use `variant={active ? "default" : "outline"}` consistently — so Rules Hub matches Recipes here. However, the Recipes page still uses `variant="default"` when active on a non-destructive filter button while Paints uses a full separate component (`PaintInventoryFilters`). Acceptable but worth noting.

### Dangerous actions

The "Delete List" button in `ArmyListDetailPage.tsx:583` uses `variant="ghost"` with `className="text-destructive hover:text-destructive"`. The standard destructive button in `DataManagementTab.tsx:253` uses `variant="destructive"`. Ghost-with-destructive-color is a softer pattern — intentional to avoid a red button in the main header, but differs from the settings page.

---

## 8. Scrollbar Styling Status

`globals.css` contains **no custom scrollbar CSS**. The app relies entirely on OS/browser default scrollbars. This is consistent (no pages define their own scrollbar styles either).

The dark background of the app means OS default scrollbars will appear as the native dark-mode variant on Windows/macOS. No polish work is currently applied.

If scrollbar styling is desired in a future phase, a cross-browser approach would be:

```css
/* WebKit (Tauri uses WebView which is WebKit-based on all platforms) */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
```

Since Tauri uses WKWebView (macOS) and WebView2 (Windows), both of which support `::-webkit-scrollbar`, this approach would work across all target platforms.

---

## Priority Summary

### High impact (visible on every page load)

1. **Data Health and Settings h1 size** — `text-xl` instead of `text-3xl`. Swap to `PageHeader` component.
   - `DataHealthPage.tsx:23` and `src/app/settings/page.tsx:13`

2. **Rules Hub missing PageHeader** — inline `h1` with no `border-b` separator, no subtitle.
   - `RulesHubPage.tsx:107`

3. **Unit Database (DB Browser) missing PageHeader** — same as Rules Hub.
   - `DatabaseBrowserPage.tsx:191`

4. **`--battle-gold` undefined in light mode** — any user not using dark mode sees broken color fallbacks on Goals completed section and GoalCard completed status.
   - `globals.css`: add `--battle-gold` to `:root`

### Medium impact (visible when using specific features)

5. **Factions page missing subtitle** — `FactionsPage.tsx:73` passes no `subtitle` prop; all peers do.

6. **Spending container uses `p-8` / `gap-12`** — breaks the `p-6` / `gap-6` standard.
   - `SpendingPage.tsx:68`

7. **Paints filtered empty state is plain text** — no icon-pill container. `PaintsPage.tsx:129–132`. Compare to `CollectionEmptyState` filtered mode.

8. **FactionsEmptyState body text missing `max-w-xs`** — `FactionsEmptyState.tsx:13`.

9. **Section heading chaos** — no unified `h2` style. DataHealth uses `text-lg`, Spending/Goals use `text-base`, Dashboard uses the uppercase `<p>` pattern.

### Low impact (polish)

10. **Dashboard button icons use `size={14}` + `mr-1.5`** while all other page buttons use `h-4 w-4` + `mr-2` (`DashboardPage.tsx:322,329`).

11. **Spending cards use inline padding on `<Card>`** instead of `<CardContent className="p-6">` (`SpendingPage.tsx:88,97,105`).

12. **`space-y-6` vs `flex flex-col gap-6`** in Data Health and Settings vs all other pages.

13. **`data-health` and settings `h2` sizes** — `text-lg` (Data Health) vs `text-base` (Goals/Spending) within pages.
