# Phase 127: Visual Consistency & PageHeader Unification - Pattern Map

**Mapped:** 2026-06-11
**Files analyzed:** 10 modified files
**Analogs found:** 10 / 10

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `src/features/rules-hub/RulesHubPage.tsx` | component (page) | request-response | `src/features/goals/GoalsPage.tsx` | exact |
| `src/features/unit-database/DatabaseBrowserPage.tsx` | component (page) | request-response | `src/features/goals/GoalsPage.tsx` | exact |
| `src/features/factions/FactionsPage.tsx` | component (page) | CRUD | `src/features/goals/GoalsPage.tsx` | exact |
| `src/features/goals/GoalsPage.tsx` | component (page) | CRUD | `src/features/dashboard/DashboardPage.tsx` | role-match |
| `src/features/spending/SpendingPage.tsx` | component (page) | request-response | `src/features/goals/GoalsPage.tsx` | exact |
| `src/features/data-health/DataHealthPage.tsx` | component (page) | request-response | `src/features/goals/GoalsPage.tsx` | exact |
| `src/app/settings/page.tsx` | component (page) | request-response | `src/features/data-health/DataHealthPage.tsx` | exact |
| `src/features/paints/PaintsPage.tsx` | component (page) | CRUD | `src/features/factions/FactionsEmptyState.tsx` | role-match |
| `src/features/factions/FactionsEmptyState.tsx` | component (presentational) | — | self (reference) | exact |
| `src/features/recipes/RecipeCard.tsx` | component (card) | — | `src/features/recipes/SectionedTimeline.tsx` | role-match |
| `src/features/recipes/SectionedTimeline.tsx` | component (timeline) | — | `src/features/recipes/RecipeCard.tsx` | role-match |
| `src/features/dashboard/DashboardPage.tsx` | component (page) | request-response | self (reference) | exact |

---

## Pattern Assignments

### `src/features/rules-hub/RulesHubPage.tsx` (VIS-01 — PageHeader adoption)

**Analog:** `src/features/goals/GoalsPage.tsx`

**Current state** (line 107 — bare h1 to replace):
```tsx
<h1 className="text-3xl font-semibold tracking-tight">Rules Hub</h1>
```

**Import to add** (after existing imports, lines 1–N):
```tsx
import { PageHeader } from "@/components/common/PageHeader";
```

**Target pattern** — replace bare `<h1>` with:
```tsx
<PageHeader
  title="Rules Hub"
  subtitle="Browse army rules, stratagems, and detachments"
/>
```

**Reference — how GoalsPage does it** (`src/features/goals/GoalsPage.tsx` lines 84–93):
```tsx
<PageHeader
  title="Goals"
  subtitle="Track your painting targets"
  actions={
    <Button onClick={handleCreate}>
      <Target className="mr-2 h-4 w-4" />
      New Goal
    </Button>
  }
/>
```

---

### `src/features/unit-database/DatabaseBrowserPage.tsx` (VIS-01 — PageHeader adoption)

**Analog:** `src/features/goals/GoalsPage.tsx`

**Current state** (line 191 — bare h1 to replace):
```tsx
<h1 className="text-3xl font-semibold tracking-tight">Unit Database</h1>
```

**Import to add** (after existing imports, lines 1–15):
```tsx
import { PageHeader } from "@/components/common/PageHeader";
```

**Target pattern** — replace bare `<h1>` with:
```tsx
<PageHeader
  title="Unit Database"
  subtitle="Browse canonical Warhammer 40,000 unit datasheets"
/>
```

---

### `src/features/factions/FactionsPage.tsx` (VIS-02 — Add subtitle to existing PageHeader)

**Analog:** `src/features/goals/GoalsPage.tsx`

**Current state** (lines 73–80 — PageHeader without subtitle):
```tsx
<PageHeader
  title="Factions"
  actions={
    <Button onClick={openCreate}>
      <Plus className="mr-2 h-4 w-4" /> Add Faction
    </Button>
  }
/>
```

**Target pattern** — add `subtitle` prop:
```tsx
<PageHeader
  title="Factions"
  subtitle="Manage your army factions"
  actions={
    <Button onClick={openCreate}>
      <Plus className="mr-2 h-4 w-4" /> Add Faction
    </Button>
  }
/>
```

No import change needed — `PageHeader` is already imported at line 15.

---

### `src/features/goals/GoalsPage.tsx` (VIS-03 — Section heading standardization)

**Analog:** `src/features/dashboard/DashboardPage.tsx`

**Reference — standard section heading pattern** (DashboardPage lines 203–205):
```tsx
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
  Active Projects
</p>
```

**Current deviations in GoalsPage:**

Line 115 (Active Goals heading):
```tsx
// BEFORE
<h2 className="text-base font-semibold mb-3">Active Goals</h2>
// AFTER
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Active Goals</p>
```

Line 132 (Completed heading — also removes `text-battle-gold`):
```tsx
// BEFORE
<h2 className="text-base font-semibold mb-3 mt-6 text-battle-gold">Completed</h2>
// AFTER
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Completed</p>
```

Line 151 (Missed heading):
```tsx
// BEFORE
<h2 className="text-base font-semibold mb-3 mt-6 text-muted-foreground">Missed</h2>
// AFTER
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Missed</p>
```

**Note:** Remove `mb-3` and `mt-6` — spacing is governed by parent `flex flex-col gap-0` and section wrapper; explicit margin classes conflict with gap-based rhythm.

---

### `src/features/spending/SpendingPage.tsx` (VIS-03 + VIS-04 — Headings + Spacing)

**Analog:** `src/features/goals/GoalsPage.tsx`

**VIS-04 — Spacing fix (3 branches, all must change):**

Loading branch (line 39):
```tsx
// BEFORE
<div className="max-w-3xl mx-auto p-8 flex flex-col gap-12" aria-label="Loading spending data">
// AFTER
<div className="flex flex-col gap-6 p-6" aria-label="Loading spending data">
```

Error branch (line 57):
```tsx
// BEFORE
<div className="max-w-3xl mx-auto p-8">
// AFTER
<div className="p-6">
```

Data branch (line 68):
```tsx
// BEFORE
<div className="max-w-3xl mx-auto p-8 flex flex-col gap-12">
// AFTER
<div className="flex flex-col gap-6 p-6">
```

**VIS-03 — Section heading fixes:**

Line 124 (Monthly Trend):
```tsx
// BEFORE
<h2 className="text-base font-semibold">Monthly Trend</h2>
// AFTER
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Monthly Trend</p>
```

Line 133 (Breakdown):
```tsx
// BEFORE
<h2 className="text-base font-semibold">Breakdown</h2>
// AFTER
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Breakdown</p>
```

---

### `src/features/data-health/DataHealthPage.tsx` (VIS-03 + VIS-09 — Headings + Spacing)

**Analog:** `src/features/goals/GoalsPage.tsx`

**VIS-09 — Spacing fix** (line 23):
```tsx
// BEFORE
<div className="p-6 space-y-6">
// AFTER
<div className="flex flex-col gap-6 p-6">
```

**VIS-03 — Section heading fixes:**

Line 29 (Table Counts):
```tsx
// BEFORE
<h2 className="text-lg font-semibold">Table Counts</h2>
// AFTER
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Table Counts</p>
```

Line 40 (Safety Backups):
```tsx
// BEFORE
<h2 className="text-lg font-semibold">Safety Backups</h2>
// AFTER
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Safety Backups</p>
```

**Note:** Inner `space-y-4` wrappers (lines 28, 39) are out of scope per VIS-09 — only the root container changes.

---

### `src/app/settings/page.tsx` (VIS-09 — Spacing)

**Analog:** `src/features/data-health/DataHealthPage.tsx`

**VIS-09 — Spacing fix** (line 14):
```tsx
// BEFORE
<div className="p-6 space-y-6">
// AFTER
<div className="flex flex-col gap-6 p-6">
```

No functional change — `<Tabs>` is the single direct child and behaves identically under either layout mode.

---

### `src/features/paints/PaintsPage.tsx` (VIS-05 — Filtered empty state icon-pill pattern)

**Analog:** `src/features/factions/FactionsEmptyState.tsx`

**Reference — icon-pill empty state pattern** (`src/features/factions/FactionsEmptyState.tsx` lines 10–21):
```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <div className="rounded-xl bg-muted/40 p-4">
    <Shield className="h-8 w-8 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <p className="text-base font-semibold">No factions yet</p>
    <p className="text-sm text-muted-foreground max-w-xs">
      Add your first faction to start organizing your collection.
    </p>
  </div>
  <Button className="mt-2" onClick={onAdd}>Add Faction</Button>
</div>
```

**Current state** (lines 128–133 — plain text, no icon-pill):
```tsx
<div className="flex flex-col items-start gap-2">
  <p className="text-sm text-muted-foreground">No paints match your filters.</p>
  <Button variant="ghost" size="sm" onClick={clearAll}>Clear filters</Button>
</div>
```

**Target pattern** — apply icon-pill to filtered empty state:
```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <div className="rounded-xl bg-muted/40 p-4">
    <Palette className="h-8 w-8 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <p className="text-base font-semibold">No paints match your filters</p>
    <p className="text-sm text-muted-foreground max-w-xs">
      Try adjusting or clearing your filters to see more results.
    </p>
  </div>
  <Button variant="ghost" size="sm" className="mt-2" onClick={clearAll}>Clear filters</Button>
</div>
```

**Import to add** — `Palette` from existing lucide-react import line (already has `Plus`):
```tsx
import { Plus, Palette } from "lucide-react";
```

---

### `src/features/factions/FactionsEmptyState.tsx` (VIS-08 — Add max-w-xs to description)

**No analog needed** — single character change on line 16.

**Current state** (line 16):
```tsx
<p className="text-sm text-muted-foreground">
  Add your first faction to start organizing your collection.
</p>
```

**Target pattern:**
```tsx
<p className="text-sm text-muted-foreground max-w-xs">
  Add your first faction to start organizing your collection.
</p>
```

---

### `src/features/recipes/RecipeCard.tsx` (VIS-06 — Replace hardcoded hex status dots)

**Pattern:** Remove `style={{ backgroundColor: "#..." }}` and add Tailwind class to `className`.

**Span base class** (all 6 occurrences):
```tsx
// base element pattern
<span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#XXXXXX" }} />
```

**6 replacements by hex:**

Lines 35–37 and 86–88 (`#22c55e` → `bg-green-500`):
```tsx
// BEFORE
<span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#22c55e" }} />
// AFTER
<span className="inline-block h-2 w-2 rounded-full shrink-0 bg-green-500" />
```

Lines 42–44 and 76–78 (`#f59e0b` → `bg-amber-500`):
```tsx
// BEFORE
<span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#f59e0b" }} />
// AFTER
<span className="inline-block h-2 w-2 rounded-full shrink-0 bg-amber-500" />
```

Lines 47–49, 60–62, 64–66 (`#ef4444` → `bg-red-500`):
```tsx
// BEFORE
<span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#ef4444" }} />
// AFTER
<span className="inline-block h-2 w-2 rounded-full shrink-0 bg-red-500" />
```

**Verification:** After changes, `grep` for `backgroundColor` in `RecipeCard.tsx` must return no results.

---

### `src/features/recipes/SectionedTimeline.tsx` (VIS-06 — Replace hardcoded hex status dots)

**Same pattern as RecipeCard.** 2 occurrences at lines 125–127 and 133–135.

Line 125–127 (`#22c55e` → `bg-green-500`):
```tsx
// BEFORE
<span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#22c55e" }} />
// AFTER
<span className="inline-block h-2 w-2 rounded-full shrink-0 bg-green-500" />
```

Line 133–135 (`#ef4444` → `bg-red-500`):
```tsx
// BEFORE
<span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#ef4444" }} />
// AFTER
<span className="inline-block h-2 w-2 rounded-full shrink-0 bg-red-500" />
```

---

### `src/features/dashboard/DashboardPage.tsx` (VIS-07 — Button icon sizing)

**Reference — standard button icon pattern** (FactionsPage line 77):
```tsx
<Plus className="mr-2 h-4 w-4" />
```

**3 deviations to fix:**

Line 256:
```tsx
// BEFORE
<Plus size={14} className="mr-1.5" aria-hidden={true} />
// AFTER
<Plus className="h-4 w-4 mr-2" aria-hidden={true} />
```

Line 324:
```tsx
// BEFORE
<Paintbrush size={14} className="mr-1.5" aria-hidden={true} />
// AFTER
<Paintbrush className="h-4 w-4 mr-2" aria-hidden={true} />
```

Line 332:
```tsx
// BEFORE
<Plus size={14} className="mr-1.5" aria-hidden={true} />
// AFTER
<Plus className="h-4 w-4 mr-2" aria-hidden={true} />
```

---

## Shared Patterns

### PageHeader import and usage
**Source:** `src/components/common/PageHeader.tsx`
**Apply to:** `RulesHubPage.tsx`, `DatabaseBrowserPage.tsx` (new import); `FactionsPage.tsx` (existing import, add subtitle prop)

```tsx
// Import (lines 1–N of target file, alongside other @/components/common imports)
import { PageHeader } from "@/components/common/PageHeader";

// Usage — title required, subtitle optional, actions optional
<PageHeader
  title="Page Title"
  subtitle="Concise descriptive subtitle"
  actions={<Button>...</Button>}
/>
```

PageHeader contract (`src/components/common/PageHeader.tsx` lines 14–34):
- Renders `<div className="flex items-center justify-between pb-6 border-b border-border/40">`
- `title` → `<h1 className="text-3xl font-semibold tracking-tight">`
- `subtitle` → `<p className="text-sm text-muted-foreground mt-1">` (only rendered when truthy)
- `actions` → `<div className="flex items-center gap-2">` (only rendered when truthy)

### Standard page root container
**Source:** `src/features/goals/GoalsPage.tsx` line 83
**Apply to:** All page-level components

```tsx
<div className="flex flex-col gap-6 p-6">
  <PageHeader ... />
  {/* content sections */}
</div>
```

### Standard section heading
**Source:** `src/features/dashboard/DashboardPage.tsx` lines 203–205
**Apply to:** `GoalsPage.tsx`, `SpendingPage.tsx`, `DataHealthPage.tsx`

```tsx
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
  Section Name
</p>
```

- Use `<p>` not `<h2>`
- No `mb-*` or `mt-*` — spacing comes from parent `flex flex-col gap-*`
- No color tokens beyond `text-muted-foreground`

### Icon-pill empty state
**Source:** `src/features/factions/FactionsEmptyState.tsx` lines 10–21
**Apply to:** `PaintsPage.tsx` filtered empty state

```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <div className="rounded-xl bg-muted/40 p-4">
    <IconName className="h-8 w-8 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <p className="text-base font-semibold">Heading text</p>
    <p className="text-sm text-muted-foreground max-w-xs">
      Description text.
    </p>
  </div>
  <Button className="mt-2" onClick={handler}>CTA label</Button>
</div>
```

### Button icon sizing (standard)
**Source:** `src/features/factions/FactionsPage.tsx` line 77; `src/features/goals/GoalsPage.tsx` line 89
**Apply to:** `DashboardPage.tsx` (3 icons); audit other pages opportunistically

```tsx
// className approach — standard
<Plus className="mr-2 h-4 w-4" />
<Paintbrush className="h-4 w-4 mr-2" />

// size prop — deviation to fix
<Plus size={14} className="mr-1.5" />  // wrong — replace
```

---

## No Analog Found

All files in this phase have direct analogs. No new patterns are needed from RESEARCH.md.

---

## Metadata

**Analog search scope:** `src/features/`, `src/app/`, `src/components/common/`
**Files read:** 14
**Pattern extraction date:** 2026-06-11

### Pitfall reminders for planner

1. **SpendingPage has 3 layout branches** — loading (line 39), error (line 57), data (line 68). All three `max-w-3xl mx-auto p-8` occurrences must be changed. Remove `max-w-3xl mx-auto` entirely per D-04 intent.
2. **GoalsPage "Completed" heading uses `text-battle-gold`** — remove that class entirely when standardizing; it is not part of the standard heading pattern.
3. **RecipeCard has 6 hex values across 4 branches** — grep for `backgroundColor` after changes to verify zero remaining occurrences.
4. **DataHealthPage inner `space-y-4` wrappers** — out of scope; only the root `space-y-6` → `flex flex-col gap-6` is required by VIS-09.
5. **PageHeader import missing** in RulesHubPage and DatabaseBrowserPage — must be added alongside the h1 replacement.
