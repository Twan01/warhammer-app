# Phase 127: Visual Consistency & PageHeader Unification - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Standardize the visual language across all pages so every screen looks like it belongs to the same app. Covers: PageHeader adoption on remaining pages, section heading hierarchy, page spacing normalization, empty state patterns, status dot tokens, button icon sizing, and layout container consistency. 9 requirements: VIS-01 through VIS-09. No new features — visual alignment only.

</domain>

<decisions>
## Implementation Decisions

### PageHeader Adoption (VIS-01, VIS-02)
- **D-01:** Rules Hub and Unit Database pages must adopt the existing `PageHeader` component with `title`, `subtitle`, and `border-b border-border/40` — matching all other pages. These are the only 2 pages not yet using it.
- **D-02:** Factions page already uses `PageHeader` but without a subtitle. Add a subtitle prop (e.g., "Manage your army factions") to match the pattern on other pages.

### Section Heading Standardization (VIS-03)
- **D-03:** Dashboard already uses `text-sm font-semibold uppercase tracking-widest text-muted-foreground` for section headings. Audit Goals, Spending, and Data Health pages for deviations and align them to this same pattern. Standardize inline — do not extract a SectionHeading component.

### Spacing Normalization (VIS-04, VIS-09)
- **D-04:** Spending page uses `p-8 gap-12` while the standard layout is `p-6 gap-6`. Change to `p-6 gap-6` to match other pages.
- **D-05:** Data Health and Settings pages use `space-y-6` while newer pages use `flex flex-col gap-6`. Migrate both to `flex flex-col gap-6` for consistency. The functional difference is negligible but the class pattern should be uniform.

### Empty State Pattern (VIS-05, VIS-08)
- **D-06:** Paints filtered empty state must use the icon-pill pattern: `rounded-xl bg-muted/40 p-4` wrapper around the icon, matching FactionsEmptyState and other empty states. Match the pattern verbatim inline — do not extract a shared component.
- **D-07:** FactionsEmptyState body text needs a `max-w-xs` constraint on the description paragraph to prevent overly wide text on large screens, matching the visual rhythm of other empty states.

### Status Dot Tokens (VIS-06)
- **D-08:** RecipeCard and SectionedTimeline have 8 hardcoded hex colors for status dots (`#22c55e` = green, `#f59e0b` = amber, `#ef4444` = red). Replace all `style={{ backgroundColor: "#..." }}` with Tailwind utility classes: `bg-green-500`, `bg-amber-500`, `bg-red-500`. These are standard status colors that work in dark mode without custom CSS variables.

### Button Icon Sizing (VIS-07)
- **D-09:** Dashboard action buttons use `size={14} className="mr-1.5"` for icons. The standard pattern is `className="h-4 w-4 mr-2"`. Align Dashboard buttons to the standard pattern. Audit other pages for the same deviation if time permits.

### Claude's Discretion
- Exact subtitle text for Rules Hub, Unit Database, and Factions PageHeaders — keep concise and descriptive
- Whether additional pages beyond Dashboard have button icon sizing inconsistencies — fix any found during implementation
- Order of commits — group by logical area (headers, spacing, tokens, etc.) for clean review

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI Patterns
- `src/components/common/PageHeader.tsx` — Canonical page header (text-3xl, border-b, subtitle prop). All pages must use this.
- `src/styles/globals.css` — Theme tokens, dark mode definitions, CSS custom properties

### Pages Needing PageHeader
- `src/features/rules-hub/` — Rules Hub page (find main page component — no PageHeader import yet)
- `src/features/unit-database/DatabaseBrowserPage.tsx` — Unit Database page (no PageHeader import yet)
- `src/features/factions/FactionsPage.tsx` — Already uses PageHeader, needs subtitle added

### Status Dot Fixes
- `src/features/recipes/RecipeCard.tsx` — 6 hardcoded hex status dot colors (lines 36–89)
- `src/features/recipes/SectionedTimeline.tsx` — 2 hardcoded hex status dot colors (lines 126–134)

### Spacing Fixes
- `src/features/spending/SpendingPage.tsx` — Uses p-8 gap-12 (needs p-6 gap-6)
- `src/features/data-health/DataHealthPage.tsx` — Uses space-y-6 (needs flex flex-col gap-6)
- `src/app/settings/page.tsx` — Uses space-y-6 (needs flex flex-col gap-6)

### Empty State Pattern Reference
- `src/features/factions/FactionsEmptyState.tsx` — Icon-pill pattern to match (rounded-xl bg-muted/40 p-4)
- `src/features/paints/PaintsPage.tsx` — Filtered empty state to fix (VIS-05)

### Section Headings
- `src/features/dashboard/DashboardPage.tsx` — Reference pattern: text-sm font-semibold uppercase tracking-widest text-muted-foreground
- `src/features/goals/GoalsPage.tsx` — Audit for heading deviations
- `src/features/spending/SpendingPage.tsx` — Audit for heading deviations
- `src/features/data-health/DataHealthPage.tsx` — Audit for heading deviations

### Button Icons
- `src/features/dashboard/DashboardPage.tsx` — Button icons use size={14} mr-1.5 (needs h-4 w-4 mr-2)

### Requirements
- `.planning/REQUIREMENTS.md` §v0.5.2 — VIS-01 through VIS-09 requirement definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PageHeader` component: already supports title, subtitle, actions — drop-in for VIS-01/VIS-02
- Tailwind status color classes: `bg-green-500`, `bg-amber-500`, `bg-red-500` — direct replacement for hardcoded hex
- FactionsEmptyState icon-pill pattern: `rounded-xl bg-muted/40 p-4` — reference for VIS-05

### Established Patterns
- Page layout: `p-6 flex flex-col gap-6` is the standard container pattern
- Section headings: `text-sm font-semibold uppercase tracking-widest text-muted-foreground` (Dashboard)
- Empty states: centered flex column with icon-pill, heading, description, optional CTA button
- Button icons: `h-4 w-4 mr-2` className pattern (standard) vs `size={14} mr-1.5` (Dashboard deviation)

### Integration Points
- Rules Hub and Unit Database page components need PageHeader import added
- RecipeCard status dots are used in card grid views — visual change only, no logic impact
- SectionedTimeline status dots appear in recipe detail — same visual-only change
- Spending page layout change from p-8/gap-12 to p-6/gap-6 will tighten the layout slightly

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond what's defined in REQUIREMENTS.md. All 9 changes are well-scoped visual alignment tasks with clear before/after states.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 127-Visual Consistency & PageHeader Unification*
*Context gathered: 2026-06-11*
