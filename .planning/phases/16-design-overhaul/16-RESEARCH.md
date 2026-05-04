# Phase 16: Design Overhaul - Research

**Researched:** 2026-05-04
**Domain:** UI polish — typography, spacing, empty states, sidebar, custom font (Tailwind v4 + shadcn/ui)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Design Direction**
- Target aesthetic: Linear-inspired polished tooling — clean, precise, professional
- Visual reference: Linear specifically (not gaming HUD, not editorial)
- Completion criterion: every page reviewed and polished systematically; done when all pages pass visual review

**Execution Order**
- Shared foundations first — typography system, spacing standards, page header pattern, sidebar polish
- Then pages in sequence
- No pages excluded — full overhaul: Dashboard, Collection, Painting Projects, Paint Inventory, Army Lists, Recipes, Spending, and all empty states
- Sheets and dialogs (UnitDetailSheet, ArmyListDetailSheet, etc.) are included

**Typography**
- Custom font: Geist Sans is the recommended choice — available via `@fontsource-variable/geist`, applied as `'Geist Variable'` variable font
- Page heading upgrade: `text-xl font-semibold` → `text-3xl font-semibold tracking-tight` on every `*Page.tsx` h1
- Tabular nums on all numeric values (percentages, points, stat numbers, spend amounts)
- Only two weights: 400 (font-normal) for body, 600 (font-semibold) for labels/headings
- Only three sizes: 14px (body), 16px (card title), 28px (page heading)

**Sidebar Polish**
- Keep structure, routing, and collapse mechanics from Phase 10 — polish only
- Add app wordmark at top: `"HobbyForge"` with `Sword` icon (16×16, `text-faction-accent`)
- Nav section grouping: Manage / Inventory / Tracking
- Icon-to-label gap: `gap-2` → `gap-4`
- Active nav item padding: `py-1.5` → `py-2`

**Empty States**
- Pattern: `[Icon container]` / `[Strong headline]` / `[Specific helper text]` / `[Primary CTA]`
- Icons: page-specific lucide icons in `bg-muted/40 rounded-xl p-4` container at `h-8 w-8`
- All copy per UI-SPEC §Empty State Contract (verbatim)
- Dashboard: welcome screen (first-run) when `stats.hasUnits === false`

**Page Header Contract**
- Every page: `<div className="flex items-center justify-between pb-6 border-b border-border/40">`
- h1 → `text-3xl font-semibold tracking-tight`
- Subtitle line: `<p className="text-sm text-muted-foreground mt-1">{subtitle}</p>`
- Subtitles per UI-SPEC §Page Header Contract (verbatim)

**Card Elevation**
- Replace flat `border border-border` with `bg-card border border-border/60 shadow-sm`

### Claude's Discretion
- Exact font choice confirmed: Geist Sans via `@fontsource-variable/geist`
- Tailwind v4 font integration: `--font-sans` in `@theme inline {}` block
- Loading skeleton visual polish dimensions
- Specific lucide icon choices for empty states (confirmed in UI-SPEC)
- Whether to add page-level `<header>` structural element (UI-SPEC uses `<div>` — keep div)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 16 is a pure visual-polish phase across all 7 pages and shared components. No new routes, no DB migrations, no new data hooks. Every change is a CSS class update, a copy change, or a component restructuring within existing files.

The primary foundation change is custom font integration (`@fontsource-variable/geist`) combined with the typography hierarchy upgrade (page headings from `text-xl` to `text-3xl`). These two changes alone produce the most visible improvement across the entire app. The UI-SPEC has been fully checker-signed — all dimensions (copywriting, visuals, color, typography, spacing, registry safety) are specified to the class level.

The phase is systematically decomposable: Wave 0 (font + global tokens), Wave 1 (sidebar), Wave 2 (page headers), Wave 3 (empty states), Wave 4 (numeric tabular-nums + card elevation). Each wave builds on the previous and is safe to commit independently.

**Primary recommendation:** Implement in wave order — global CSS foundations first, then sidebar, then pages in sequence. Every task should be a targeted diff of a small set of files with zero logic changes.

---

## Standard Stack

### Core (all already installed — no new deps except font)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@fontsource-variable/geist` | 5.2.8 (latest, NOT yet installed) | Geist Sans variable weight font | Used by Linear + Vercel; clean modern sans-serif, variable weight avoids FOUT; self-hosted via fontsource (no CDN) |
| `tailwindcss` | 4.2.4 (installed) | Utility classes for all styling | Project standard — Tailwind v4 CSS-first config |
| `lucide-react` | 0.460.0 (installed) | Icons for empty states + wordmark | Project standard — all icons are lucide |
| shadcn/ui components | installed | `Card`, `Button`, `Skeleton`, etc. | All 20 shadcn components already installed |

### Supporting (all already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tailwind-merge` | 2.5.4 | Merge conflicting Tailwind classes | Used in all `cn()` calls — needed for card elevation class overrides |
| `clsx` | 2.1.1 | Conditional class composition | Used alongside tailwind-merge in `cn()` |

### No Alternatives Needed
This phase has no library decisions — the stack is fully established. The only new dependency is the font package.

**Installation (one new package only):**
```bash
npm install @fontsource-variable/geist
```

**Version verified:** `@fontsource-variable/geist@5.2.8` — confirmed current via `npm view` on 2026-05-04.

---

## Architecture Patterns

### File Touch Map

This phase modifies existing files only — no new files created.

```
src/
├── styles/
│   └── globals.css                    # Wave 0: @import font + --font-sans in @theme + body font-family
├── components/common/
│   ├── AppSidebar.tsx                 # Wave 1: wordmark area + nav section groups
│   └── NavItem.tsx                    # Wave 1: gap-2→gap-4, py-1.5→py-2
├── features/dashboard/
│   ├── DashboardPage.tsx              # Wave 2: page header; Wave 4: tabular-nums on stat %
│   ├── DashboardEmptyState.tsx        # Wave 3: full welcome-screen replacement
│   └── StatCard.tsx                   # Wave 4: tabular-nums on stat numbers
├── features/units/
│   ├── CollectionPage.tsx             # Wave 2: page header
│   ├── CollectionEmptyState.tsx       # Wave 3: icon container + new copy
│   ├── UnitGallery.tsx                # Wave 4: tabular-nums on painting %
│   └── UnitDetailSheet.tsx            # Wave 4: tabular-nums on spend display
├── features/painting-projects/
│   ├── PaintingProjectsPage.tsx       # Wave 2: page header
│   └── KanbanEmptyState.tsx           # Wave 3: icon container + new copy
├── features/paints/
│   ├── PaintsPage.tsx                 # Wave 2: page header
│   └── PaintsEmptyState.tsx           # Wave 3: icon container + new copy
├── features/army-lists/
│   ├── ArmyListsPage.tsx              # Wave 2: page header
│   ├── ArmyListsEmptyState.tsx        # Wave 3: icon container + new copy
│   └── ArmyListCard.tsx               # Wave 4: tabular-nums on points, hover:shadow-md
├── features/recipes/
│   ├── RecipesPage.tsx                # Wave 2: page header
│   └── RecipeEmptyState.tsx           # Wave 3: icon container + new copy
└── features/spending/
    └── SpendingPage.tsx               # Wave 2: page header; Wave 4: tabular-nums on currency
```

### Pattern 1: Font Integration (Tailwind v4 CSS-first)

**What:** Geist Sans is a variable font. Import once at top of `globals.css`, declare as `--font-sans` CSS custom property inside the existing `@theme inline {}` block, apply on `body`. No Tailwind config file needed (v4 is CSS-first).

**When to use:** Wave 0 — must land before any other task so downstream snapshots reflect the new font.

```css
/* src/styles/globals.css — at top, after existing @import lines */
@import "@fontsource-variable/geist";

/* Inside existing @theme inline {} block — add alongside --color-faction-accent */
--font-sans: 'Geist Variable', ui-sans-serif, system-ui, sans-serif;

/* On body rule — replace existing font-family */
body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: var(--font-sans);
}
```

**Source:** UI-SPEC §Design System. Tailwind v4 font-family via CSS custom property is the correct pattern — no `tailwind.config.js` exists in this project.

### Pattern 2: Page Header Upgrade

**What:** Every `*Page.tsx` has `<div className="flex items-center justify-between">` with `<h1 className="text-xl font-semibold">`. Replace the wrapper div and h1 verbatim.

**When to use:** Wave 2 — after sidebar, applied to all 7 pages identically.

```tsx
// Before (every page):
<div className="flex items-center justify-between">
  <h1 className="text-xl font-semibold">Page Title</h1>
  <Button>CTA</Button>
</div>

// After (every page):
<div className="flex items-center justify-between pb-6 border-b border-border/40">
  <div>
    <h1 className="text-3xl font-semibold tracking-tight">Page Title</h1>
    <p className="text-sm text-muted-foreground mt-1">Page subtitle</p>
  </div>
  <div className="flex items-center gap-2">
    <Button>CTA</Button>
  </div>
</div>
```

**Note for SpendingPage:** SpendingPage uses `max-w-3xl mx-auto p-8` wrapper (not `flex flex-col gap-6 p-6`). The page header div must be added inside that wrapper. SpendingPage also has no existing `h1` — one must be added.

### Pattern 3: Empty State Upgrade

**What:** Replace bare icon + text with icon-in-container pattern. The container is `rounded-xl bg-muted/40 p-4` wrapping the icon. All current components use `h-12 w-12` bare icons — reduce to `h-8 w-8` inside the container.

**When to use:** Wave 3 — after page headers.

```tsx
// Before:
<PackageSearch className="h-12 w-12 text-muted-foreground" />

// After:
<div className="rounded-xl bg-muted/40 p-4">
  <ShieldOff className="h-8 w-8 text-muted-foreground" />
</div>
```

**Note:** `gap-4` in the outer flex column changes to `gap-3` for the new empty state pattern (this is an approved layout exception for this self-contained component per UI-SPEC §Empty State Contract).

### Pattern 4: Tabular Nums Addition

**What:** Add `tabular-nums` Tailwind class at the render site of any numeric display. This is a single-class addition that does not change component structure.

**When to use:** Wave 4 — after structural changes, before visual review.

```tsx
// StatCard.tsx — stat number span:
<span className="text-3xl font-semibold tabular-nums">{displayValue}</span>

// UnitGallery.tsx — painting percentage:
<span className="text-sm text-muted-foreground tabular-nums">
  {unit.model_count ?? "—"} models · {unit.points ?? "—"} pts
</span>

// SpendingPage.tsx — currency:
<span className="text-3xl font-semibold tabular-nums">
  {formatCurrency(data.totalPence)}
</span>
```

**Note for PlaybookTab.tsx:** Stat values (M/T/Sv/W/Ld/OC) are rendered via `formatStatValue()` which returns `React.ReactNode`. The wrapping `<span>` or `<td>` at the render site should receive `tabular-nums`.

### Pattern 5: Card Elevation

**What:** Upgrade `<Card>` components on content pages from implicit flat border to `bg-card border border-border/60 shadow-sm`. Applied via `className` prop alongside existing classes using `cn()`.

**When to use:** Wave 4 — applies to ArmyListCard, FactionSummaryCard, UnitGallery cards, StatCard.

```tsx
// ArmyListCard.tsx — before:
<Card className="cursor-pointer border hover:bg-muted/50 transition-colors" ...>

// ArmyListCard.tsx — after:
<Card className="cursor-pointer bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-150" ...>
```

**Note:** `hover:bg-muted/50` on the interactive cards (ArmyListCard, UnitGallery card) is replaced by `hover:shadow-md transition-shadow duration-150` per UI-SPEC §Interaction Contract. Static display cards (StatCard) get `shadow-sm` but no hover treatment.

### Pattern 6: Sidebar Wordmark + Section Groups

**What:** AppSidebar.tsx already has a wordmark area (`Swords` icon + `HobbyForge` text) but in a plain `<div className="flex items-center gap-2 p-4">`. Upgrade to the new pattern with border-b and correct sizing. Add nav section group labels.

**When to use:** Wave 1 — immediately after font foundation.

```tsx
// Wordmark area — replace existing div:
<div className="flex items-center gap-2 px-3 py-4 border-b border-border/40">
  <Sword className="h-4 w-4 shrink-0 text-faction-accent" />
  {!collapsed && (
    <span className="text-base font-semibold tracking-tight">HobbyForge</span>
  )}
</div>

// Nav section group label (collapsed: hide with sr-only or conditional render):
{!collapsed && (
  <p className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
    Manage
  </p>
)}
```

**Critical:** `useSidebarCollapsed` hook must not be touched. The `collapsed` boolean already flows to all NavItem instances — use the same boolean for wordmark text and section labels.

**Nav group assignments:**
- Manage: Dashboard, Collection, Painting Projects
- Inventory: Paints, Recipes
- Tracking: Army Lists, Spending
- (Settings remains pinned to bottom, outside groups)

**Icon note:** Current AppSidebar imports `Swords` (plural). UI-SPEC specifies `Sword` (singular) for the wordmark area at 16×16. These are different lucide icons. The import must be updated.

### Anti-Patterns to Avoid

- **Changing `useSidebarCollapsed` or sidebar collapse mechanics:** Phase 10 mechanics are locked. The sidebar `data-collapsed` attribute, `width` style, and localStorage key must not change.
- **Nesting Radix portals:** Established pattern from Phase 8 — no Sheet/Dialog inside another Sheet/Dialog. Phase 16 does not add any new portals.
- **Using `font-medium` (500) or `font-bold` (700):** Only `font-normal` (400) and `font-semibold` (600) are used in Phase 16.
- **Introducing `text-xl` or `text-2xl`:** Only three sizes allowed: `text-sm` (14px), `text-base` (16px), `text-3xl` (28px).
- **Adding `gap-3` at page level:** 12px is not in the spacing scale. The `gap-3` exception applies only inside the self-contained empty state component.
- **Applying hover:shadow-md to StatCard:** StatCard is a static display card — no hover treatment.
- **Adding animations beyond existing `animate-pulse` on Skeleton:** Phase 11's `useCountUp` already gates animation behind `prefers-reduced-motion`. No new animation in Phase 16.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Variable font loading | Custom font-face declarations | `@fontsource-variable/geist` npm package | Fontsource handles WOFF2 bundling, subsetting, and Vite import correctly |
| Tabular numbers | Custom number formatter | `tabular-nums` Tailwind class | Browser-native `font-variant-numeric: tabular-nums` — zero JS, correct rendering in all browsers |
| Shadow/elevation | Custom box-shadow CSS | `shadow-sm` / `shadow-md` Tailwind utilities | Already in the Tailwind v4 default scale; consistent with design system |
| Border opacity | `border-[rgba(...)]` inline style | `border-border/60` Tailwind opacity modifier | Tailwind v4 `/opacity` syntax works on custom properties — no custom values needed |

**Key insight:** Phase 16 is entirely class-level changes. Every visual improvement maps to an existing Tailwind utility or an established shadcn pattern. The only custom code in this phase is component restructuring (empty states, page headers).

---

## Common Pitfalls

### Pitfall 1: SpendingPage outer wrapper is different from all other pages
**What goes wrong:** All other pages use `flex flex-col gap-6 p-6`. SpendingPage uses `max-w-3xl mx-auto p-8 flex flex-col gap-12`. Adding a page header div to SpendingPage without accounting for the different wrapper breaks the layout.
**Why it happens:** SpendingPage was built in Phase 14 with a narrow-column layout for the hero card — it was intentionally different.
**How to avoid:** Read SpendingPage.tsx before editing. The page header div adds inside the existing wrapper div. The h2 "Breakdown" heading (`text-xl font-semibold`) also needs to become a section header but is NOT a page h1 — leave it as `text-base font-semibold` (card-title level) or upgrade to page sub-section treatment.
**Warning signs:** If the page header stretches full-width outside `max-w-3xl`, the wrapper div is wrong.

### Pitfall 2: Sword vs Swords icon name
**What goes wrong:** AppSidebar currently imports `Swords` (plural) from lucide-react. The UI-SPEC wordmark uses `Sword` (singular). These are different icons with different glyphs.
**Why it happens:** Copy error between phases — the existing wordmark used `Swords` as a placeholder.
**How to avoid:** Add `Sword` to the lucide-react import destructure in AppSidebar.tsx. Remove `Swords` from the import if it's no longer used elsewhere in the file.
**Warning signs:** TypeScript will error if `Sword` is used without importing it.

### Pitfall 3: DashboardEmptyState is a full replacement, not an upgrade
**What goes wrong:** The other empty states need their icon and copy upgraded within the existing component structure. DashboardEmptyState is a complete replacement — the welcome screen has a fundamentally different layout (wordmark block + description + CTA, not the standard icon-in-container pattern).
**Why it happens:** The current DashboardEmptyState renders a plain `PackageSearch` icon with generic copy. The welcome screen is the first-run experience and must use the app wordmark.
**How to avoid:** Rewrite DashboardEmptyState entirely per UI-SPEC §Dashboard welcome screen. Do NOT apply the standard empty state pattern here. The welcome screen uses `Sword` icon + `"HobbyForge"` text side-by-side as a wordmark block.
**Warning signs:** If the DashboardEmptyState looks like the other empty states after the change, something is wrong.

### Pitfall 4: `font-medium` exists in active NavItem
**What goes wrong:** Current NavItem uses `font-medium` on the active state (`bg-faction-accent font-medium text-white`). UI-SPEC removes `font-medium` — only `font-normal` and `font-semibold` are permitted.
**Why it happens:** Phase 10 used `font-medium` for active nav items as a visual differentiator. Phase 16 collapses to two weights.
**How to avoid:** Change active NavItem class from `font-medium` to `font-semibold` when updating NavItem for Phase 16.
**Warning signs:** `font-medium` anywhere in Phase 16 output files is a spec violation.

### Pitfall 5: NavItem tests assert existing class names
**What goes wrong:** `tests/theming/NavItem.test.tsx` asserts `link.className` contains `bg-faction-accent`. If the NavItem class string is restructured during the gap/padding upgrade, tests may fail if the assertion is fragile.
**Why it happens:** Tests use `toContain("bg-faction-accent")` — this is class-name string matching. Restructuring classes as template literals vs cn() can change whitespace.
**How to avoid:** Keep `bg-faction-accent` in the active class string. The assertion checks `contains`, not exact match. When changing `gap-2` to `gap-4` and `py-1.5` to `py-2`, verify that the existing test still finds `bg-faction-accent`.
**Warning signs:** NavItem.test.tsx fails with "expected string to contain 'bg-faction-accent'".

### Pitfall 6: AppSidebar tests assert nav label text
**What goes wrong:** `tests/theming/AppSidebar.test.tsx` checks `screen.getByText("Spending")`. Adding nav section group labels that contain section titles could interfere with text queries. Also, `tests/app-shell/AppSidebar.test.tsx` (second file) may have overlapping coverage.
**Why it happens:** Two test files cover AppSidebar (`tests/app-shell/` and `tests/theming/`). When section labels like "Manage", "Inventory", "Tracking" are added, any test that queries by label text must account for these new text nodes.
**How to avoid:** Section labels use distinctive uppercase tracking text that does not collide with nav labels. Existing `getByText("Spending")` tests query the nav link text — section labels say "Tracking", not "Spending". Should be safe. Verify after implementation.
**Warning signs:** AppSidebar tests fail with "Found multiple elements with text".

### Pitfall 7: CollectionEmptyState has two modes
**What goes wrong:** `CollectionEmptyState` has `mode: "no-data" | "filtered"`. Both modes need upgrading. The "filtered" mode uses `FilterX` icon per UI-SPEC, the "no-data" mode uses `ShieldOff`. Different icons, different copy.
**Why it happens:** The empty state has conditional rendering for two states. Easy to upgrade one and forget the other.
**How to avoid:** Both `if (mode === "filtered")` branch and the default branch need the new icon-in-container treatment. Apply separately to each branch.
**Warning signs:** One empty state mode looks polished; the other still has the 48×48 bare icon.

---

## Code Examples

Verified patterns from reading source files:

### Current globals.css structure (integration point)
```css
/* src/styles/globals.css — current bottom of file */
@theme inline {
  /* ... existing tokens ... */
  --color-faction-accent: var(--faction-accent);   /* ← add --font-sans here */
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: ui-sans-serif, system-ui, sans-serif;  /* ← replace this */
}
```

### Dashboard welcome screen (full replacement for DashboardEmptyState)
```tsx
import { Sword } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function DashboardEmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="flex items-center gap-3">
        <Sword className="h-8 w-8 text-faction-accent" />
        <span className="text-3xl font-semibold tracking-tight">HobbyForge</span>
      </div>
      <div className="space-y-2 max-w-sm">
        <p className="text-base font-semibold">Your collection is empty</p>
        <p className="text-sm text-muted-foreground">
          HobbyForge tracks what you own, what's painted, and what's ready to play.
          Add your first unit to get started.
        </p>
      </div>
      <Button size="lg" onClick={() => navigate({ to: "/collection" })}>
        Add your first unit
      </Button>
    </div>
  );
}
```

### Standard empty state pattern (all other pages)
```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <div className="rounded-xl bg-muted/40 p-4">
    <ShieldOff className="h-8 w-8 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <p className="text-base font-semibold">No units yet</p>
    <p className="text-sm text-muted-foreground max-w-xs">
      Add your first unit to start tracking what you own and how far along it is.
    </p>
  </div>
  <Button className="mt-2">Add unit</Button>
</div>
```

### NavItem changes (gap + padding only)
```tsx
// Before:
className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ... ${
  isActive ? "bg-faction-accent font-medium text-white" : "text-muted-foreground"
}`}

// After:
className={`flex w-full items-center gap-4 rounded-md px-2 py-2 text-sm ... ${
  isActive ? "bg-faction-accent font-semibold text-white" : "text-muted-foreground"
}`}
```

### Skeleton dimensions for upgraded headings
```tsx
// Loading state heading skeleton — matches text-3xl height:
<Skeleton className="h-9 w-48" />
// Subtitle skeleton:
<Skeleton className="h-4 w-64 mt-1" />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| System font stack | Geist Variable (custom font) | Phase 16 | Consistent, modern sans-serif matching Linear aesthetic |
| `text-xl font-semibold` page headings | `text-3xl font-semibold tracking-tight` | Phase 16 | Page headings clearly dominate card titles |
| Bare icon (48×48) in empty states | Icon in `bg-muted/40 rounded-xl p-4` container (32×32) | Phase 16 | More refined treatment; icon elevated above background |
| Generic copy ("nothing here") | Page-specific headlines + helper text | Phase 16 | Clear actionable guidance per page |
| No font-weight hierarchy enforcement | Two weights only (400/600) | Phase 16 | Consistent visual rhythm; eliminates 500/700 inconsistency |
| Flat `border border-border` cards | `bg-card border border-border/60 shadow-sm` | Phase 16 | Subtle depth separates cards from page background |
| `gap-2` nav icon-to-label | `gap-4` | Phase 16 | Matches Linear's nav density |

**Deprecated/outdated in Phase 16:**
- `font-medium` (500): replaced by `font-semibold` (600) in active NavItem
- `text-xl font-semibold` h1: replaced by `text-3xl font-semibold tracking-tight` everywhere
- `PackageSearch` as generic empty state icon: replaced by page-specific icons
- `h-12 w-12` bare icon in empty states: replaced by `h-8 w-8` in container

---

## Open Questions

1. **SpendingPage `h2 "Breakdown"` heading level**
   - What we know: It's currently `text-xl font-semibold` — same as the old page h1 size
   - What's unclear: Should it become `text-base font-semibold` (card title level) now that the page h1 is `text-3xl`? Or remain `text-xl` as a section heading between the two sizes?
   - Recommendation: Downgrade to `text-base font-semibold` to stay within the 3-size scale. `text-xl` is not in the approved size set for Phase 16.

2. **Spending page `h1` — does it exist?**
   - What we know: SpendingPage has no `h1` currently — it uses a hero Card for the total spend amount. The page header contract requires an h1.
   - What's unclear: Where does the h1 "Spending" go relative to the hero card?
   - Recommendation: Add the standard page header div (with `border-b`) before the hero Card, containing `<h1>Spending</h1>` and the subtitle. The hero Card remains immediately below.

3. **Factions nav item — which group?**
   - What we know: AppSidebar MAIN_NAV includes `{ to: "/factions", label: "Factions", icon: Shield }`. UI-SPEC §Sidebar lists three groups: Manage (Dashboard, Collection, Painting Projects), Inventory (Paints, Recipes), Tracking (Army Lists, Spending).
   - What's unclear: Factions is not assigned to any group in the UI-SPEC.
   - Recommendation: Place Factions in the Manage group alongside Dashboard and Collection. It's a collection-management concern.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vite.config.ts` (vitest config inline) |
| Quick run command | `npx vitest run --reporter=verbose 2>&1 \| tail -20` |
| Full suite command | `npx vitest run` |

**Current baseline:** 279 tests passing, 0 failing, 0 skipped (confirmed 2026-05-04).

### Phase Requirements → Test Map

Phase 16 has no formal requirement IDs — the goal is "significantly improved visual design across all pages." Validation is via manual visual review at the end of the phase. However, existing tests guard against regressions.

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| NavItem active state still uses `bg-faction-accent` | unit | `npx vitest run tests/theming/NavItem.test.tsx` | ✅ |
| AppSidebar collapse toggle still works | unit | `npx vitest run tests/theming/AppSidebar.test.tsx` | ✅ |
| AppSidebar Spending nav entry renders | unit | `npx vitest run tests/app-shell/AppSidebar.test.tsx` | ✅ |
| DashboardPage renders without error | integration | `npx vitest run tests/dashboard/DashboardPage.test.tsx` | ✅ |
| UnitGallery renders card grid | unit | `npx vitest run tests/collection/UnitGallery.test.tsx` | ✅ |
| SpendingPage renders with stats | unit | `npx vitest run tests/spending/SpendingPage.test.tsx` | ✅ |
| Full regression suite | integration | `npx vitest run` | ✅ |

### Sampling Rate

- **Per task commit:** `npx vitest run` — full suite runs in ~20s; no subset needed
- **Per wave merge:** `npx vitest run` — baseline must remain 279 passing
- **Phase gate:** Full suite green + manual visual review of all 7 pages before `/gsd:verify-work`

### Wave 0 Gaps

None — Phase 16 is purely visual. Existing test infrastructure covers all regressions. No new test stubs required for Wave 0.

**Note:** No new test files are needed for Phase 16. The phase does not introduce new logic, hooks, or data flows. All changes are CSS class updates and copy changes. Manual visual review is the primary quality gate. The existing 279 tests serve as regression guards.

---

## Sources

### Primary (HIGH confidence)
- `src/styles/globals.css` — full file read; confirmed `@theme inline {}` structure, `--color-faction-accent` token location, current `body` font-family
- `src/components/common/AppSidebar.tsx` — full file read; confirmed existing wordmark area, `Swords` import, MAIN_NAV array, collapse mechanics
- `src/components/common/NavItem.tsx` — full file read; confirmed `gap-2`, `py-1.5`, `font-medium` active class
- All `*Page.tsx` files — full reads; confirmed universal `flex flex-col gap-6 p-6` wrapper + `text-xl font-semibold` h1 pattern (except SpendingPage)
- All `*EmptyState.tsx` files — full reads; confirmed `PackageSearch` everywhere, `h-12 w-12`, generic copy
- `src/features/dashboard/StatCard.tsx` — confirmed `text-3xl font-semibold` stat number (already large — just needs `tabular-nums`)
- `src/features/army-lists/ArmyListCard.tsx` — confirmed hover pattern, points display sites
- `src/features/units/UnitGallery.tsx` — confirmed painting % and model_count/points display sites
- `.planning/phases/16-design-overhaul/16-CONTEXT.md` — locked decisions, UI-SPEC references
- `.planning/phases/16-design-overhaul/16-UI-SPEC.md` — full checker-approved spec
- `npm view @fontsource-variable/geist version` → `5.2.8` (2026-05-04)
- `npx vitest run` → 279 passing (2026-05-04 baseline)

### Secondary (MEDIUM confidence)
- `.planning/phases/10-theming-foundation/10-CONTEXT.md` — Phase 10 constraints on sidebar collapse mechanics and `bg-faction-accent` utilities

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed and verified; only new dep is the font
- Architecture: HIGH — all source files read; patterns derived from actual code, not assumptions
- Pitfalls: HIGH — each pitfall identified from a specific code observation in the actual files
- Test baseline: HIGH — vitest run confirmed 279 passing on 2026-05-04

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (font package version; all other findings are source-code derived)
