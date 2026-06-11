# Phase 127: Visual Consistency & PageHeader Unification - Research

**Researched:** 2026-06-11
**Domain:** React component styling, Tailwind CSS class standardization, design token consistency
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Rules Hub and Unit Database pages must adopt the existing `PageHeader` component with `title`, `subtitle`, and `border-b border-border/40` — matching all other pages. These are the only 2 pages not yet using it.
- **D-02:** Factions page already uses `PageHeader` but without a subtitle. Add a subtitle prop (e.g., "Manage your army factions") to match the pattern on other pages.
- **D-03:** Dashboard already uses `text-sm font-semibold uppercase tracking-widest text-muted-foreground` for section headings. Audit Goals, Spending, and Data Health pages for deviations and align them to this same pattern. Standardize inline — do not extract a SectionHeading component.
- **D-04:** Spending page uses `p-8 gap-12` while the standard layout is `p-6 gap-6`. Change to `p-6 gap-6` to match other pages.
- **D-05:** Data Health and Settings pages use `space-y-6` while newer pages use `flex flex-col gap-6`. Migrate both to `flex flex-col gap-6` for consistency.
- **D-06:** Paints filtered empty state must use the icon-pill pattern: `rounded-xl bg-muted/40 p-4` wrapper around the icon, matching FactionsEmptyState and other empty states. Match the pattern verbatim inline — do not extract a shared component.
- **D-07:** FactionsEmptyState body text needs a `max-w-xs` constraint on the description paragraph to prevent overly wide text on large screens, matching the visual rhythm of other empty states.
- **D-08:** RecipeCard and SectionedTimeline have 8 hardcoded hex colors for status dots (`#22c55e` = green, `#f59e0b` = amber, `#ef4444` = red). Replace all `style={{ backgroundColor: "#..." }}` with Tailwind utility classes: `bg-green-500`, `bg-amber-500`, `bg-red-500`.
- **D-09:** Dashboard action buttons use `size={14} className="mr-1.5"` for icons. The standard pattern is `className="h-4 w-4 mr-2"`. Align Dashboard buttons to the standard pattern.

### Claude's Discretion
- Exact subtitle text for Rules Hub, Unit Database, and Factions PageHeaders — keep concise and descriptive
- Whether additional pages beyond Dashboard have button icon sizing inconsistencies — fix any found during implementation
- Order of commits — group by logical area (headers, spacing, tokens, etc.) for clean review

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIS-01 | Rules Hub and Unit Database use PageHeader with border-b separator and subtitle | Both pages confirmed using bare `<h1>` — PageHeader import + subtitle needed |
| VIS-02 | Factions page PageHeader includes subtitle prop | Confirmed: PageHeader present but no subtitle prop passed |
| VIS-03 | Section heading hierarchy standardized (one pattern for h2 across Dashboard, Goals, Spending, Data Health) | Dashboard uses `text-sm font-semibold uppercase tracking-widest text-muted-foreground`; Goals/Spending/DataHealth use `text-base font-semibold` — deviation confirmed |
| VIS-04 | Spending page uses standard p-6 gap-6 (not p-8 gap-12) | Confirmed: `max-w-3xl mx-auto p-8 flex flex-col gap-12` on the data branch |
| VIS-05 | Paints filtered empty state uses icon-pill pattern (consistent with other empty states) | Confirmed: filtered empty state is plain `<p>` text + ghost button, no icon-pill |
| VIS-06 | RecipeCard and SectionedTimeline status dots use theme tokens (not hardcoded hex) | Confirmed: 6 hex instances in RecipeCard (lines 36–89), 2 in SectionedTimeline (lines 126–134) |
| VIS-07 | Dashboard button icons use consistent h-4 w-4 + mr-2 pattern | Confirmed: 3 instances of `size={14} className="mr-1.5"` at lines 256, 324, 332 |
| VIS-08 | FactionsEmptyState body text includes max-w-xs constraint | Confirmed: description `<p>` has no max-w constraint |
| VIS-09 | Data Health and Settings use flex flex-col gap-6 (not space-y-6) for consistency | Confirmed: both root divs use `p-6 space-y-6` |
</phase_requirements>

---

## Summary

Phase 127 is a pure visual alignment phase — no new features, no schema changes, no new libraries. It corrects 9 specific styling inconsistencies discovered during the v0.5.2 design audit. All 9 changes are surgical: find the deviation in a known file, apply the standard pattern, done.

The work splits cleanly into five logical groups: (1) PageHeader adoption on 2 pages + subtitle on 1 page, (2) section heading class standardization on 3 pages, (3) layout spacing normalization on 3 pages, (4) empty state pattern fixes on 2 components, and (5) design token replacement on 2 components + button icon sizing on 1 page.

Every change is self-contained within a single file. No new imports except `PageHeader` for Rules Hub and Unit Database. No cross-component dependencies. The risk surface is essentially zero — these are class attribute changes verified against the existing codebase.

**Primary recommendation:** Work file-by-file in logical groups. Each group is a natural commit boundary. The PageHeader group first (most visible), then spacing/headings, then tokens last.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PageHeader adoption | Frontend (React component) | — | Drop-in component replacement in page roots |
| Section heading standardization | Frontend (React component) | — | Inline class change in page components |
| Spacing normalization | Frontend (React component) | — | Container div class change in page roots |
| Empty state patterns | Frontend (React component) | — | Markup restructure within page branches |
| Status dot tokens | Frontend (React component) | — | Inline style → Tailwind class replacement |
| Button icon sizing | Frontend (React component) | — | Prop → className replacement on Lucide icons |

---

## Standard Stack

No new packages required. All changes use existing project infrastructure.

### Existing Infrastructure Used

| Asset | Location | Used For |
|-------|----------|----------|
| `PageHeader` component | `src/components/common/PageHeader.tsx` | VIS-01, VIS-02 adoption; VIS-02 subtitle |
| Tailwind status classes | Built-in | VIS-06 token replacement |
| `rounded-xl bg-muted/40 p-4` pattern | Established in FactionsEmptyState | VIS-05 reference |
| `text-sm font-semibold uppercase tracking-widest text-muted-foreground` | DashboardPage pattern | VIS-03 target pattern |
| `flex flex-col gap-6 p-6` | Standard page layout | VIS-04, VIS-09 target pattern |

### Package Legitimacy Audit

No packages are installed in this phase.

---

## Architecture Patterns

### Canonical Page Layout (Standard)

```tsx
// Standard page root — ALL pages should use this
<div className="flex flex-col gap-6 p-6">
  <PageHeader title="..." subtitle="..." actions={...} />
  {/* content */}
</div>
```

### Confirmed Deviations (what to fix)

**RulesHubPage.tsx** (line 106):
```tsx
// BEFORE — bare h1, no PageHeader
<div className="flex flex-col gap-6 p-6">
  <h1 className="text-3xl font-semibold tracking-tight">Rules Hub</h1>
```
```tsx
// AFTER
<div className="flex flex-col gap-6 p-6">
  <PageHeader title="Rules Hub" subtitle="Browse army rules, stratagems, and detachments" />
```

**DatabaseBrowserPage.tsx** (line 190):
```tsx
// BEFORE — bare h1
<div className="flex flex-col gap-6 p-6">
  <h1 className="text-3xl font-semibold tracking-tight">Unit Database</h1>
```
```tsx
// AFTER
<div className="flex flex-col gap-6 p-6">
  <PageHeader title="Unit Database" subtitle="Browse canonical Warhammer 40,000 unit datasheets" />
```

**FactionsPage.tsx** (line 73):
```tsx
// BEFORE — no subtitle
<PageHeader
  title="Factions"
  actions={...}
/>
```
```tsx
// AFTER
<PageHeader
  title="Factions"
  subtitle="Manage your army factions"
  actions={...}
/>
```

### Section Heading Standard

**DashboardPage.tsx** (reference — already correct):
```tsx
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
  Section Name
</p>
```

**GoalsPage.tsx** — deviations found:
- Line 115: `<h2 className="text-base font-semibold mb-3">Active Goals</h2>` — change to `<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Active Goals</p>` (remove `mb-3`, use standard gap from parent)
- Line 132: `<h2 className="text-base font-semibold mb-3 mt-6 text-battle-gold">Completed</h2>` — same pattern, remove hardcoded token color (`text-battle-gold` is a dark-only CSS custom property)
- Line 151: `<h2 className="text-base font-semibold mb-3 mt-6 text-muted-foreground">Missed</h2>` — same pattern

**SpendingPage.tsx** — deviations:
- Line 124: `<h2 className="text-base font-semibold">Monthly Trend</h2>` — standardize
- Line 133: `<h2 className="text-base font-semibold">Breakdown</h2>` — standardize

**DataHealthPage.tsx** — deviations:
- Line 29: `<h2 className="text-lg font-semibold">Table Counts</h2>` — standardize
- Line 40: `<h2 className="text-lg font-semibold">Safety Backups</h2>` — standardize

### Spacing / Layout Container Standard

**SpendingPage.tsx** — three branches all use `max-w-3xl mx-auto p-8`:
- Loading branch (line 39): `<div className="max-w-3xl mx-auto p-8 flex flex-col gap-12">`
- Error branch (line 57): `<div className="max-w-3xl mx-auto p-8">`
- Data branch (line 68): `<div className="max-w-3xl mx-auto p-8 flex flex-col gap-12">`

All three must change. The `max-w-3xl mx-auto` centering constraint is specific to SpendingPage and should be evaluated — the decision D-04 says `p-6 gap-6` but does not explicitly address `max-w-3xl`. Based on D-04's intent (match other pages), `max-w-3xl` should be removed too. Other pages do not use a max-width constraint on the outer container.

**DataHealthPage.tsx** (line 23):
```tsx
// BEFORE
<div className="p-6 space-y-6">
// AFTER
<div className="flex flex-col gap-6 p-6">
```

**SettingsPage.tsx** (line 14):
```tsx
// BEFORE
<div className="p-6 space-y-6">
// AFTER
<div className="flex flex-col gap-6 p-6">
```

Note: Settings has `<Tabs>` as direct child — `space-y-6` vs `flex flex-col gap-6` behaves identically for a single non-flex child. The change is still correct for convention consistency.

### Empty State Icon-Pill Pattern

**Reference (FactionsEmptyState.tsx)**:
```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <div className="rounded-xl bg-muted/40 p-4">
    <Shield className="h-8 w-8 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <p className="text-base font-semibold">No factions yet</p>
    <p className="text-sm text-muted-foreground">
      Add your first faction to start organizing your collection.
    </p>
  </div>
  <Button className="mt-2" onClick={onAdd}>Add Faction</Button>
</div>
```

**PaintsPage.tsx filtered empty state** (lines 128–133) — needs to change from:
```tsx
<div className="flex flex-col items-start gap-2">
  <p className="text-sm text-muted-foreground">No paints match your filters.</p>
  <Button variant="ghost" size="sm" onClick={clearAll}>Clear filters</Button>
</div>
```
To icon-pill pattern with appropriate icon (e.g. `Beaker` or `Palette` from lucide-react), a heading, description, and the "Clear filters" button retained as the CTA.

**FactionsEmptyState.tsx** description `<p>` (line 18) — needs `max-w-xs` added:
```tsx
// BEFORE
<p className="text-sm text-muted-foreground">
  Add your first faction to start organizing your collection.
</p>
// AFTER
<p className="text-sm text-muted-foreground max-w-xs">
  Add your first faction to start organizing your collection.
</p>
```

### Status Dot Token Replacement

All 8 occurrences follow the same `style={{ backgroundColor: "#..." }}` pattern on `<span className="inline-block h-2 w-2 rounded-full shrink-0">`.

| File | Hex | Tailwind class |
|------|-----|---------------|
| RecipeCard.tsx (lines 36, 88) | `#22c55e` | `bg-green-500` |
| RecipeCard.tsx (lines 43, 77) | `#f59e0b` | `bg-amber-500` |
| RecipeCard.tsx (lines 48, 61, 65) | `#ef4444` | `bg-red-500` |
| SectionedTimeline.tsx (lines 126, 133) | `#22c55e`, `#ef4444` | `bg-green-500`, `bg-red-500` |

Pattern: remove `style={{ backgroundColor: "..." }}` and add the Tailwind class directly to the existing `className`:
```tsx
// BEFORE
<span
  className="inline-block h-2 w-2 rounded-full shrink-0"
  style={{ backgroundColor: "#22c55e" }}
/>
// AFTER
<span className="inline-block h-2 w-2 rounded-full shrink-0 bg-green-500" />
```

### Button Icon Sizing Fix

**DashboardPage.tsx** — 3 occurrences at lines 256, 324, 332:
```tsx
// BEFORE
<Plus size={14} className="mr-1.5" aria-hidden={true} />
<Paintbrush size={14} className="mr-1.5" aria-hidden={true} />
<Plus size={14} className="mr-1.5" aria-hidden={true} />

// AFTER
<Plus className="h-4 w-4 mr-2" aria-hidden={true} />
<Paintbrush className="h-4 w-4 mr-2" aria-hidden={true} />
<Plus className="h-4 w-4 mr-2" aria-hidden={true} />
```

### Anti-Patterns to Avoid

- **Extracting a SectionHeading component:** D-03 explicitly forbids this — inline the class change.
- **Extracting an EmptyState component:** D-06 explicitly forbids this — match pattern inline.
- **Changing `max-w-3xl mx-auto` without decision coverage:** D-04 implies removal, verify intent. The loading and error branches must be consistent with the data branch.
- **Using `size` prop on Lucide icons for standard sizes:** h-4 w-4 className is the project standard; `size` prop is a deviation.
- **Leaving `style={{ backgroundColor }}` for semantic status colors:** These are standard Tailwind semantic colors with correct dark-mode behavior.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark-mode-safe status colors | Custom CSS variables | `bg-green-500`, `bg-amber-500`, `bg-red-500` | Tailwind palette handles dark mode correctly; no custom variable needed for standard status semantics |
| Consistent empty states | Shared `EmptyState` component | Inline pattern copy | Decision D-06 is explicit: match verbatim inline |
| Section heading component | `<SectionHeading>` component | Inline `<p className="...">` | Decision D-03 is explicit: standardize inline |

---

## Common Pitfalls

### Pitfall 1: Spending Page Has Three Layout Branches
**What goes wrong:** Changing only the data branch leaves loading and error branches at `p-8`.
**Why it happens:** Loading/error branches are early returns that duplicate the container div.
**How to avoid:** Search for all three `max-w-3xl mx-auto p-8` occurrences in SpendingPage.tsx and fix all three.
**Warning signs:** After change, loading state shows `p-8` gap while data state shows `p-6`.

### Pitfall 2: Goals Section Headings Use Semantic Color Tokens
**What goes wrong:** The "Completed" h2 uses `text-battle-gold` which is a CSS custom property. Changing only the font size without removing this color token leaves a non-standard class on the new element.
**Why it happens:** `text-battle-gold` was added for visual distinction, but the standard pattern uses only `text-muted-foreground`.
**How to avoid:** When standardizing GoalsPage headings, confirm `text-battle-gold` is also removed from the Completed heading.
**Warning signs:** Visual parity test shows "Completed" heading still in gold color.

### Pitfall 3: SectionedTimeline Status Dot Context
**What goes wrong:** The SectionedTimeline context shows only 2 hardcoded hex values but RecipeCard has 6 — they're in different rendering branches.
**Why it happens:** RecipeCard has 4 separate status display branches (both, missing only, low only, all owned) each repeating the hex colors.
**How to avoid:** Replace all occurrences in both files — verify by searching for `#22c55e`, `#f59e0b`, `#ef4444` after changes.
**Warning signs:** `grep` for `backgroundColor:` still returns results in these files.

### Pitfall 4: DataHealthPage `space-y-4` Inner Sections
**What goes wrong:** DataHealthPage has both a root `space-y-6` AND inner `space-y-4` wrappers for sub-sections. Changing only the root div may leave inner wrappers inconsistent.
**Why it happens:** The inner sections pre-date the `flex flex-col gap-N` convention.
**How to avoid:** VIS-09 scope is only the root container. Inner `space-y-4` wrappers inside DataHealthPage are separate from the root layout class. Do not change them without a requirement.
**Warning signs:** Over-changing inner section wrappers and breaking card spacing.

### Pitfall 5: PageHeader Import Not Present in Rules Hub / Unit Database
**What goes wrong:** Adding `<PageHeader>` to `RulesHubPage.tsx` or `DatabaseBrowserPage.tsx` without adding the import.
**Why it happens:** Both files have no existing PageHeader import.
**How to avoid:** Add `import { PageHeader } from "@/components/common/PageHeader";` at the top of each file alongside the change.
**Warning signs:** TypeScript compiler error on `PageHeader` identifier.

---

## Code Examples

### PageHeader Full Usage (reference)
```tsx
// Source: src/features/goals/GoalsPage.tsx (verified pattern)
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

### Icon-Pill Empty State (reference)
```tsx
// Source: src/features/factions/FactionsEmptyState.tsx (verified pattern)
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

### Standard Section Heading (reference)
```tsx
// Source: src/features/dashboard/DashboardPage.tsx (verified pattern, line 203)
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
  Active Projects
</p>
```

---

## State of the Art

No state-of-the-art research needed — this phase exclusively uses existing project patterns. All patterns are already established and verified in the codebase.

| Deviation | Standard | Where Fixed |
|-----------|----------|-------------|
| `<h1 className="text-3xl...">` bare heading | `<PageHeader title="..." subtitle="..." />` | RulesHubPage, DatabaseBrowserPage |
| `<h2 className="text-base font-semibold">` | `<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">` | GoalsPage, SpendingPage, DataHealthPage |
| `p-8 gap-12` | `p-6 gap-6` | SpendingPage (all 3 branches) |
| `space-y-6` | `flex flex-col gap-6` | DataHealthPage, SettingsPage |
| `style={{ backgroundColor: "#..." }}` | `bg-green-500 / bg-amber-500 / bg-red-500` | RecipeCard, SectionedTimeline |
| `size={14} mr-1.5` | `h-4 w-4 mr-2` | DashboardPage (3 icons) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `max-w-3xl mx-auto` on SpendingPage should be removed per D-04 intent | Spacing Normalization | If user intended to keep centering constraint, Spending layout will differ from others |
| A2 | `text-battle-gold` on Goals "Completed" heading should be removed when standardizing heading class | Section Heading | If user wants "Completed" to remain gold, the heading color change is unwanted |
| A3 | Suitable icon for Paints filtered empty state is `Beaker` or `Palette` (Lucide) | Empty State Pattern | Wrong icon choice is purely aesthetic — easy to update |

---

## Open Questions

1. **SpendingPage centering: remove `max-w-3xl mx-auto` or keep it?**
   - What we know: D-04 specifies `p-6 gap-6` explicitly. Other pages do not use max-width centering.
   - What's unclear: Whether the `max-w-3xl` centering was intentional as a Spending-page-only aesthetic decision.
   - Recommendation: Remove `max-w-3xl mx-auto` to fully match standard page container. If user wants to keep it, a follow-up decision is trivial.

2. **Goals headings: remove `text-battle-gold` from "Completed"?**
   - What we know: The standard heading pattern uses `text-muted-foreground`. The `text-battle-gold` custom property is a dark-only CSS var.
   - What's unclear: Whether the gold color on "Completed" was intentional branding vs. accidental inconsistency.
   - Recommendation: Per VIS-03 (standardize to one pattern), remove `text-battle-gold` and use the standard muted foreground pattern.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — code/class changes only, no build tools or services required beyond the project's existing stack).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest inline config) |
| Quick run command | `pnpm test -- tests/design-foundation/PageHeader.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIS-01 | RulesHubPage renders PageHeader with h1 "Rules Hub" and subtitle | smoke | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` | ✅ (extend existing) |
| VIS-01 | DatabaseBrowserPage renders PageHeader with h1 "Unit Database" and subtitle | smoke | `pnpm test -- tests/unit-database/DatabaseBrowserPage.test.tsx` | ❌ Wave 0 |
| VIS-02 | FactionsPage renders PageHeader subtitle | smoke | `pnpm test -- tests/factions/FactionsPage.test.tsx` | ❌ Wave 0 |
| VIS-03 | Section heading classes are standardized (audit only) | manual | visual review | — |
| VIS-04 | SpendingPage root div uses p-6 gap-6 (not p-8 gap-12) | unit | `pnpm test -- tests/spending/SpendingPage.test.tsx` | ❌ Wave 0 |
| VIS-05 | Paints filtered empty state renders icon-pill | unit | `pnpm test -- tests/paints/PaintsPage.test.tsx` | ❌ Wave 0 |
| VIS-06 | RecipeCard status dots use Tailwind classes (no inline style backgroundColor) | unit | `pnpm test -- tests/painting/RecipeCard.test.tsx` | ✅ (extend existing) |
| VIS-07 | Dashboard button icons use h-4 w-4 pattern | unit | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ✅ (extend existing) |
| VIS-08 | FactionsEmptyState description has max-w-xs | unit | `pnpm test -- tests/factions/FactionsEmptyState.test.tsx` | ❌ Wave 0 |
| VIS-09 | DataHealthPage/SettingsPage root uses flex flex-col gap-6 | unit | `pnpm test -- tests/data-health/DataHealthPage.test.tsx` | ❌ Wave 0 |

**Note:** Most visual consistency changes (class attributes) are best validated via visual review at PR time. Tests that check for specific Tailwind class strings are brittle — prefer testing rendered output (heading text, element presence) over exact class lists. The Wave 0 test files listed are optional scaffolding; the priority tests are VIS-01 (RulesHubPage extension) and VIS-06 (RecipeCard extension) since those files already exist.

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/RecipeCard.test.tsx tests/design-foundation/PageHeader.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit-database/DatabaseBrowserPage.test.tsx` — covers VIS-01 (Unit Database PageHeader)
- [ ] `tests/factions/FactionsEmptyState.test.tsx` — covers VIS-08 (max-w-xs on description)
- [ ] `tests/factions/FactionsPage.test.tsx` — covers VIS-02 (subtitle on FactionsPage)

*(Optional — VIS-03/04/05/07/09 are class-level changes best verified visually. Extend existing files for VIS-01 RulesHubPage and VIS-06 RecipeCard.)*

---

## Security Domain

Step skipped — this phase makes no authentication, session, authorization, input validation, or cryptography changes. All changes are Tailwind class modifications and markup restructuring with zero security surface.

---

## Sources

### Primary (HIGH confidence)
- `src/components/common/PageHeader.tsx` — Canonical PageHeader contract verified in codebase
- `src/features/factions/FactionsEmptyState.tsx` — Icon-pill pattern reference verified
- `src/features/dashboard/DashboardPage.tsx` — Section heading pattern verified (lines 203, 212, 226, 383, 395, 423)
- `src/features/recipes/RecipeCard.tsx` — All 6 hex hardcoded status dots verified (lines 36–89)
- `src/features/recipes/SectionedTimeline.tsx` — 2 hex hardcoded status dots verified (lines 126–134)
- `src/features/rules-hub/RulesHubPage.tsx` — Bare `<h1>` confirmed (line 107), no PageHeader import
- `src/features/unit-database/DatabaseBrowserPage.tsx` — Bare `<h1>` confirmed (line 191), no PageHeader import
- `src/features/factions/FactionsPage.tsx` — PageHeader without subtitle confirmed (line 73)
- `src/features/spending/SpendingPage.tsx` — `p-8 gap-12` confirmed (lines 39, 57, 68)
- `src/features/data-health/DataHealthPage.tsx` — `space-y-6` confirmed (line 23), `text-lg font-semibold` headings (lines 29, 40)
- `src/app/settings/page.tsx` — `space-y-6` confirmed (line 14)
- `src/features/goals/GoalsPage.tsx` — `text-base font-semibold` heading deviations confirmed (lines 115, 132, 151)
- `src/features/paints/PaintsPage.tsx` — Filtered empty state confirmed as plain `<p>` (line 130)
- `.planning/phases/127-visual-consistency-pageheader-unification/127-CONTEXT.md` — All decisions (D-01 through D-09)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing code verified directly
- Architecture: HIGH — every file and line number verified in source
- Pitfalls: HIGH — discovered from direct code reading, not inference

**Research date:** 2026-06-11
**Valid until:** N/A (codebase research — valid until files are changed)
