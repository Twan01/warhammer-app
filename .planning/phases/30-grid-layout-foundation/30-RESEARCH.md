# Phase 30: Grid Layout Foundation - Research

**Researched:** 2026-05-06
**Domain:** CSS Grid layout migration, TanStack Router navigation, React component prop extension
**Confidence:** HIGH

## Summary

Phase 30 is a pure UI refactor — no database changes, no new queries, no new hooks. Three existing dashboard components are modified: `DashboardPage.tsx` (layout container), `StatCard.tsx` (navigation prop), and `HobbyPipeline.tsx` (bucket grouping). Every piece of infrastructure needed (routing, tier color maps, accessibility patterns) already exists in the codebase and can be copy-adapted rather than invented.

The CSS grid migration is the highest-risk change because all three render branches (loading/error/populated) must be updated atomically in a single commit — a half-migrated grid creates layout breakage in production. The clickable StatCard pattern is low-risk because `FactionSummaryCard` already demonstrates the exact same `useNavigate` + `role="button"` + `onKeyDown` pattern. The 5-bucket pipeline is entirely internal to `HobbyPipeline.tsx` with no callers to update.

**Primary recommendation:** Migrate all three render branches in Wave 1, implement StatCard navigation in Wave 2, implement the 5-bucket pipeline grouping in Wave 3. Each wave is independently testable and results in a shippable state.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Grid Layout Structure (LAYOUT-01)**
- Replace `flex flex-col gap-12` with CSS grid using `grid-template-columns` and `grid-template-rows`
- Asymmetric 2-column layout on desktop (1280px): left ~60%, right ~40% (e.g. `3fr 2fr`)
- Full-width spanning sections in order: PageHeader, CurrentFocusCard, StatCards row, HobbyPipeline (5-bucket)
- Two-column sections: Left (wider) = Hobby Health + By Faction stacked; Right (narrower) = Recent Activity (full height of row)
- At 900px or below: all sections stack into single column
- Grid replaces outermost layout container only — section internals unchanged

**StatCard Navigation (LAYOUT-02)**
- Each StatCard becomes clickable via `useNavigate` from TanStack Router
- Route mapping: "Total Models" → `/collection`, "Fully Painted" → `/collection`, "Battle-Ready Points" → `/army-lists`, "Active Projects" → `/projects`
- StatCard gains optional `to` prop (string) — when absent, card stays non-interactive (backward compatible)
- Keyboard accessible: `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space
- Hover: `cursor-pointer` + `hover:bg-muted/50` transition

**5-Bucket Pipeline Grouping (LAYOUT-03)**
- Replace 11-stage HobbyPipeline with 5-bucket grouped view
- Bucket mapping: Not Started=[Not Started], Assembly=[Built, Primed], Painting=[Basecoated, Shaded, Layered, Highlighted, Details Done], Finishing=[Based, Varnished], Done=[Completed]
- Each bucket: label + summed model count across all statuses in that bucket
- Bucket colors from PAINTING_STATUS_TIER palette: Not Started=muted-foreground/30, Assembly=slate-400/30, Painting=violet-400/30, Finishing=emerald-400/30, Done=battle-gold/30
- Bucket mapping const defined inside `HobbyPipeline.tsx`

### Claude's Discretion
- Exact `grid-template-columns` values and gap sizing
- Whether to use Tailwind grid classes or inline CSS grid properties
- Responsive breakpoint choice (Tailwind `md:` at 768px vs custom breakpoint matching 900px min-width)
- Hover/focus visual treatment for clickable StatCards (shadow increase, border highlight, or background change)
- Whether Finishing bucket uses emerald-400 (matching "done" tier) or a distinct intermediate color like amber-400
- Loading skeleton layout adjustments for the new grid structure

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAYOUT-01 | Dashboard uses asymmetric CSS grid with 2-column bento layout on desktop, stacking cleanly on narrow windows (min 900px) | CSS grid patterns below; Tailwind responsive prefix choice; all three render branches must be updated atomically |
| LAYOUT-02 | StatCards navigate to their relevant page when clicked (Collection, Projects, Army Lists, Spending) | FactionSummaryCard accessibility pattern documented below; TanStack Router `useNavigate` already in codebase; route paths verified against router.tsx |
| LAYOUT-03 | Dashboard pipeline displays 5 grouped buckets (Not Started / Assembly / Painting / Finishing / Done) with counts, mapped from 11 painting statuses | Full bucket-to-status mapping documented; existing PAINTING_STATUS_TIER color map can be reused directly |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version in use | Purpose | Note |
|---------|---------------|---------|------|
| Tailwind CSS v4 | 4.x | CSS grid utilities, responsive prefixes | CSS-first config via `@theme inline {}` in globals.css |
| @tanstack/react-router | current | `useNavigate` for StatCard click handler | Already used by `FactionSummaryCard` |
| React | 19 | Component prop extension | Optional `to` prop pattern already established in StatCard |

**No new packages required.** This phase is pure layout/interaction rework of existing components.

### Tailwind v4 Grid Approach Decision (Claude's Discretion)

Use **Tailwind utility classes** (not inline CSS `style` props) for the grid. Rationale:
- The project uses Tailwind v4 CSS-first config — all existing layout uses Tailwind classes
- Responsive variants work cleanly: `grid-cols-1 lg:grid-cols-[3fr_2fr]`
- Tailwind v4 supports arbitrary grid column values directly in class names

**Recommended grid classes:**
```
grid grid-cols-1 gap-6 p-6 lg:grid-cols-[3fr_2fr]
```

**Recommended breakpoint:** Use `lg:` (1024px) rather than a custom 900px breakpoint. Rationale: Tailwind's `lg:` breakpoint is 1024px — close enough to the 900px stacking requirement, avoids custom breakpoint boilerplate in a CSS-first Tailwind v4 setup, and the app's minimum window width is 900px so the single-column view covers the 900–1023px range correctly.

If the exact 900px stacking point is required, use Tailwind v4's arbitrary breakpoint syntax: `min-[900px]:grid-cols-[3fr_2fr]`.

---

## Architecture Patterns

### Current Dashboard Layout (what changes)

```
// BEFORE — outermost container in all three render branches
<div className="flex flex-col gap-12 p-6">
  ...sections stacked vertically...
</div>
```

```
// AFTER — populated state
<div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[3fr_2fr]">
  {/* Full-width spanning items */}
  <div className="lg:col-span-2"> <PageHeader /> </div>
  <div className="lg:col-span-2"> <CurrentFocusCard /> </div>
  <div className="lg:col-span-2"> <div className="grid grid-cols-4 gap-6"> {StatCards} </div> </div>
  <div className="lg:col-span-2"> <HobbyPipeline /> </div>

  {/* Two-column section — left: Hobby Health + By Faction stacked */}
  <div className="flex flex-col gap-6">
    <section> {/* Hobby Health */} </section>
    <section> {/* By Faction */} </section>
  </div>

  {/* Two-column section — right: Recent Activity */}
  <RecentActivityFeed />
</div>
```

### Grid Column Spanning Pattern

In Tailwind v4, use `col-span-full` (equivalent to `col-span-2` when grid has 2 columns) for full-width sections. `col-span-full` is safer because it works regardless of the exact column count.

```tsx
// Full-width wrapper
<div className="col-span-full">
  <PageHeader ... />
</div>

// Single-column items (no class needed — they naturally fill one column)
<div className="flex flex-col gap-6">
  ...left column content...
</div>
<RecentActivityFeed ... />
```

### All Three Render Branches Must Use Grid

The loading and error branches currently use `flex flex-col gap-12 p-6`. These must also adopt the grid container class to prevent layout shift when data loads. The loading branch's skeleton structure must be reorganized to match the grid layout.

**Loading branch grid structure:**
- `col-span-full`: PageHeader skeleton, CurrentFocusCard skeleton, StatCards skeleton (4-col inner grid), Pipeline skeleton
- Left column: Hobby Health skeletons + Faction card skeletons (stacked)
- Right column: Recent Activity skeleton (tall)

### StatCard Navigation Pattern

Copy directly from `FactionSummaryCard.tsx` (already in codebase, HIGH confidence):

```tsx
// Source: src/features/dashboard/FactionSummaryCard.tsx
import { useNavigate } from "@tanstack/react-router";

const navigate = useNavigate();

<Card
  onClick={() => navigate({ to })}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate({ to });
    }
  }}
  className="cursor-pointer hover:bg-muted/50"
>
```

**StatCard `to` prop — when absent, card must NOT receive `role="button"`, `tabIndex`, or `onClick`.** This preserves full backward compatibility for the Hobby Health StatCards (velocity, streak) which must remain non-interactive.

```tsx
// Conditional interactivity
export interface StatCardProps {
  value: number | string;
  label: string;
  animate?: boolean;
  icon?: ComponentType<{ size?: number; className?: string }>;
  trend?: { value: number; label: string };
  progress?: number;
  /** Phase 30 — optional navigation target. When set, card becomes clickable. */
  to?: string;
}

export function StatCard({ value, label, animate = false, icon: Icon, trend, progress, to }: StatCardProps) {
  const navigate = useNavigate();

  const interactiveProps = to
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick: () => navigate({ to }),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate({ to });
          }
        },
        className: "px-6 bg-card border border-border/60 shadow-sm cursor-pointer hover:bg-muted/50 transition-colors",
      }
    : {
        className: "px-6 bg-card border border-border/60 shadow-sm",
      };

  return (
    <Card {...interactiveProps}>
      ...
    </Card>
  );
}
```

### Route Path Verification (from router.tsx)

| StatCard label | Locked `to` value | Registered route |
|---|---|---|
| Total Models | `/collection` | `collectionRoute` path="/collection" ✅ |
| Fully Painted | `/collection` | `collectionRoute` path="/collection" ✅ |
| Battle-Ready Points | `/army-lists` | `armyListsRoute` path="/army-lists" ✅ |
| Active Projects | `/projects` | **NOT REGISTERED** — see pitfall below |

**Critical finding:** The CONTEXT.md says "Active Projects" → `/projects` but the router has no `/projects` route. The painting projects route is registered as `/painting-projects`. The planner must decide: use `/painting-projects` (the correct existing route) or defer this link.

### 5-Bucket Pipeline Pattern

```tsx
// Source: derived from existing HobbyPipeline.tsx + CONTEXT.md bucket spec

type Bucket = "Not Started" | "Assembly" | "Painting" | "Finishing" | "Done";

const BUCKET_GROUPS: Record<Bucket, PaintingStatus[]> = {
  "Not Started": ["Not Started"],
  "Assembly":    ["Built", "Primed"],
  "Painting":    ["Basecoated", "Shaded", "Layered", "Highlighted", "Details Done"],
  "Finishing":   ["Based", "Varnished"],
  "Done":        ["Completed"],
};

const BUCKET_ORDER: Bucket[] = ["Not Started", "Assembly", "Painting", "Finishing", "Done"];

const BUCKET_BUBBLE_CLASS: Record<Bucket, string> = {
  "Not Started": "bg-muted-foreground/30 text-foreground",
  "Assembly":    "bg-slate-400/30 text-foreground",
  "Painting":    "bg-violet-400/30 text-foreground",
  "Finishing":   "bg-emerald-400/30 text-foreground",  // Claude's discretion — matches "done" tier
  "Done":        "bg-battle-gold/30 text-foreground",
};

// Bucket count computation
const bucketCount = (bucket: Bucket) =>
  BUCKET_GROUPS[bucket].reduce(
    (sum, status) => sum + units.filter((u) => u.status_painting === status).length,
    0
  );
```

### Anti-Patterns to Avoid

- **Updating only the populated render branch:** All three branches (isError, isLoading, populated) have `flex flex-col gap-12 p-6` — the error and loading branches must also adopt the grid class.
- **Using `col-span-2` hardcoded:** Use `col-span-full` so the span adapts if the column count ever changes.
- **Nesting `useNavigate` conditionally:** `useNavigate()` must always be called at the top of the component body, never inside an `if` block — it's a hook. Conditional behavior comes from gating the `interactiveProps` object.
- **Adding `role="button"` without keyboard handler:** Accessibility requires both `onClick` and `onKeyDown` (Enter/Space) together, matching the FactionSummaryCard pattern.
- **Keeping the STAGE_LABEL_SHORT map in HobbyPipeline.tsx after bucket refactor:** The map is only needed for 11-stage rendering. After the bucket refactor it can be removed entirely — bucket labels are just the bucket name strings.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive grid breakpoints | Custom CSS media queries in a `<style>` tag | Tailwind responsive prefixes (`lg:`, `min-[900px]:`) | Already the project convention; Tailwind v4 supports arbitrary breakpoints |
| Clickable card accessibility | Custom event handling | FactionSummaryCard pattern verbatim | Exact same pattern already battle-tested in codebase |
| Status bucket color derivation | New color mapping | Existing `TIER_BUBBLE_CLASS` from HobbyPipeline.tsx (renamed/extended for buckets) | The tier colors are already locked — the "Finishing" bucket is emerald-400/30 (matching the existing "done" tier bubble) |

---

## Common Pitfalls

### Pitfall 1: `/projects` Route Does Not Exist
**What goes wrong:** CONTEXT.md specifies "Active Projects" StatCard → `/projects`. This route is not registered in router.tsx. The registered painting projects route is `/painting-projects`.
**Why it happens:** The CONTEXT.md was written before verifying router.tsx.
**How to avoid:** Use `/painting-projects` for the Active Projects StatCard, or if the intent is different, confirm with the user before implementation.
**Warning signs:** TanStack Router will not throw at navigation time for unregistered routes — it silently navigates to a 404/not-found state. Always verify route paths against router.tsx.

### Pitfall 2: Half-Migrated Grid (Atomicity Requirement)
**What goes wrong:** Updating the populated branch grid without updating loading/error branches leaves inconsistent layout. The v2.4 accumulated context explicitly states: "CSS grid migration must be atomic — all 7 existing dashboard sections get col-span in the same commit; never leave a half-migrated grid."
**Why it happens:** Developer updates only the populated branch (the most visible one) and misses the other two.
**How to avoid:** The plan must treat all three render branches as a single atomic unit in one wave/task. The test verifier should render all three states and check for grid container class in each.

### Pitfall 3: StatCard Hook Called Conditionally
**What goes wrong:** Placing `useNavigate()` inside an `if (to)` block causes a React Rules of Hooks violation.
**Why it happens:** Natural instinct to "only use the hook when needed."
**How to avoid:** Always call `const navigate = useNavigate()` at the top of the component. Gate the `onClick` and `role` props in a conditional expression on `to`, not the hook call itself.

### Pitfall 4: Hobby Health StatCards Become Clickable
**What goes wrong:** The Hobby Health StatCards (velocity, streak) do not have `to` props in the CONTEXT.md but if the `to` prop defaults to `""` or `undefined` is checked wrong, they may gain `role="button"` and become confusingly clickable.
**Why it happens:** Falsy `""` empty string passes `if (to)` — but an explicit `to=""` should never be passed.
**How to avoid:** The `to` prop is optional (`to?: string`). When absent (undefined), the card is non-interactive. DashboardPage must not pass `to=""` to any StatCard.

### Pitfall 5: Grid Gap Creates Unexpected Height Difference Between Left and Right Columns
**What goes wrong:** The left column (Hobby Health stacked above By Faction) may not match the height of the right column (Recent Activity). CSS grid row alignment means mismatched content heights create visible gaps.
**Why it happens:** Grid rows auto-size to tallest cell — the left column's stacked sections may be shorter or taller than RecentActivityFeed.
**How to avoid:** Use `items-start` on the grid container so cells don't stretch. Let each column be its natural height. The asymmetric "bento" aesthetic actually looks better with columns at their natural heights rather than forced-equal heights.

### Pitfall 6: Loading Skeleton Branch Doesn't Mirror Grid Structure
**What goes wrong:** After grid migration, the populated and loading states have different DOM structures, causing layout shift when data loads.
**Why it happens:** Loading skeleton is often updated as an afterthought.
**How to avoid:** Redesign the loading skeleton to mirror the 2-column grid: full-width skeletons for top sections, two-column skeletons for the health/activity row.

---

## Code Examples

### Grid Container (all three branches)
```tsx
// Source: DashboardPage.tsx — replace all three "flex flex-col gap-12 p-6" containers
<div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[3fr_2fr] items-start">
```

### Full-width Section Wrapper
```tsx
// Use col-span-full for sections spanning both columns
<div className="col-span-full">
  <PageHeader title="Hobby Command Center" subtitle={subtitle} actions={...} />
</div>
```

### StatCard Row (preserved inner grid, wrapped in col-span-full)
```tsx
<div className="col-span-full grid grid-cols-4 gap-6">
  <StatCard value={stats.totalModels} label="Total Models" animate to="/collection" />
  <StatCard value={stats.fullyPainted} label="Fully Painted" animate to="/collection" />
  <StatCard value={stats.battleReadyPoints} label="Battle-Ready Points" animate to="/army-lists" />
  <StatCard value={stats.activeProjectsCount} label="Active Projects" animate to="/painting-projects" />
</div>
```

### Left Column (Hobby Health + By Faction)
```tsx
// No col-span class needed — occupies left column naturally
<div className="flex flex-col gap-6">
  <section className="flex flex-col gap-4">
    <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Hobby Health</p>
    <div className="grid grid-cols-2 gap-6">
      <StatCard value={analytics?.velocityString ?? "0.0"} label="Hobby Velocity · units/month" />
      <StatCard value={analytics?.streakString ?? "0 days"} label="Painting Streak" />
    </div>
  </section>
  <section className="flex flex-col gap-4">
    <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">By Faction</p>
    <div className="flex flex-wrap gap-4">
      {stats.factionStats.map(...)}
    </div>
  </section>
</div>
```

### Right Column (Recent Activity)
```tsx
// No col-span class needed — occupies right column naturally
<RecentActivityFeed events={activityEvents ?? []} onUnitClick={handleUnitIdClick} />
```

### 5-Bucket Pipeline
```tsx
// Source: HobbyPipeline.tsx — replace the STAGE_LABEL_SHORT + PAINTING_STATUS_ORDER render loop

type Bucket = "Not Started" | "Assembly" | "Painting" | "Finishing" | "Done";

const BUCKET_ORDER: Bucket[] = ["Not Started", "Assembly", "Painting", "Finishing", "Done"];

const BUCKET_GROUPS: Record<Bucket, PaintingStatus[]> = {
  "Not Started": ["Not Started"],
  "Assembly":    ["Built", "Primed"],
  "Painting":    ["Basecoated", "Shaded", "Layered", "Highlighted", "Details Done"],
  "Finishing":   ["Based", "Varnished"],
  "Done":        ["Completed"],
};

const BUCKET_BUBBLE_CLASS: Record<Bucket, string> = {
  "Not Started": "bg-muted-foreground/30 text-foreground",
  "Assembly":    "bg-slate-400/30 text-foreground",
  "Painting":    "bg-violet-400/30 text-foreground",
  "Finishing":   "bg-emerald-400/30 text-foreground",
  "Done":        "bg-battle-gold/30 text-foreground",
};

// In render:
<ol className="flex items-end gap-4" role="list">
  {BUCKET_ORDER.map((bucket) => {
    const count = BUCKET_GROUPS[bucket].reduce(
      (sum, status) => sum + units.filter((u) => u.status_painting === status).length,
      0
    );
    return (
      <li key={bucket} className="flex flex-1 flex-col items-center gap-1" aria-label={`${bucket}: ${count} units`}>
        <span className="text-xs text-muted-foreground text-center">{bucket}</span>
        <span className={`inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-full text-sm font-semibold tabular-nums ${BUCKET_BUBBLE_CLASS[bucket]}`}>
          {count}
        </span>
      </li>
    );
  })}
</ol>
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/dashboard/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAYOUT-01 | Dashboard grid container has `grid` class in populated state | unit | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ✅ (extend existing) |
| LAYOUT-01 | Loading state has grid container (no layout shift) | unit | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ✅ (extend existing) |
| LAYOUT-01 | Error state has grid container | unit | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ✅ (extend existing) |
| LAYOUT-02 | Clicking "Total Models" StatCard triggers navigate to /collection | unit | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ✅ (extend existing) |
| LAYOUT-02 | StatCard with no `to` prop has no role="button" | unit | `pnpm test -- tests/design-foundation/StatCard.test.tsx` | ✅ (extend existing) |
| LAYOUT-02 | StatCard with `to` prop is keyboard accessible (Enter key) | unit | `pnpm test -- tests/design-foundation/StatCard.test.tsx` | ✅ (extend existing) |
| LAYOUT-03 | HobbyPipeline renders exactly 5 buckets (not 11 stages) | unit | `pnpm test -- tests/dashboard/` | ❌ Wave 0: new test in `tests/dashboard/HobbyPipeline.test.tsx` |
| LAYOUT-03 | Bucket counts sum correctly from underlying statuses | unit | `pnpm test -- tests/dashboard/HobbyPipeline.test.tsx` | ❌ Wave 0: new test |
| LAYOUT-03 | "Assembly" bucket shows Built+Primed combined count | unit | `pnpm test -- tests/dashboard/HobbyPipeline.test.tsx` | ❌ Wave 0: new test |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/dashboard/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dashboard/HobbyPipeline.test.tsx` — covers LAYOUT-03 (bucket rendering + count sums)

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `flex flex-col gap-12` stacked layout | `grid grid-cols-[3fr_2fr]` bento layout | Phase 30 migration |
| 11 individual pipeline stages | 5 semantic buckets | Reduces cognitive load |
| StatCards as pure display widgets | StatCards as navigation anchors | Phase 30 adds optional `to` prop |

---

## Open Questions

1. **Active Projects route mismatch**
   - What we know: CONTEXT.md specifies `/projects` as the target route
   - What's unclear: No `/projects` route exists in router.tsx — only `/painting-projects`
   - Recommendation: Planner should use `/painting-projects` (the verified existing route) and note this correction. No user clarification needed — this is clearly an error in the CONTEXT.md that conflicts with the actual codebase.

2. **Finishing bucket color**
   - What we know: CONTEXT.md says emerald-400/30 — same as the existing "done" tier. It notes this as Claude's discretion.
   - What's unclear: Using emerald for both Finishing and Done-tier items in other contexts may be confusing — the Done bucket uses battle-gold/30 which is more visually distinct.
   - Recommendation: Use emerald-400/30 for Finishing (as specified) and battle-gold/30 for Done. The two are visually distinct enough — emerald is green, battle-gold is gold/amber. This matches the locked decision.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase reads — `src/features/dashboard/DashboardPage.tsx`, `StatCard.tsx`, `HobbyPipeline.tsx`, `FactionSummaryCard.tsx`, `src/app/router.tsx`, `src/types/unit.ts`, `src/components/ui/status-badge.tsx`, `src/styles/globals.css`
- Existing tests — `tests/dashboard/DashboardPage.test.tsx`, `tests/design-foundation/StatCard.test.tsx`

### Secondary (MEDIUM confidence)
- Tailwind v4 arbitrary grid column syntax (`grid-cols-[3fr_2fr]`) — consistent with Tailwind v4 CSS-first architecture documented in CLAUDE.md and visible in globals.css `@theme inline` block
- TanStack Router `useNavigate({ to })` call pattern — verified against live FactionSummaryCard usage

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries already in use
- Architecture: HIGH — all patterns verified against live codebase files
- Pitfalls: HIGH — derived from direct code inspection (route mismatch, hook rules, atomicity requirement)
- Route paths: HIGH — verified against router.tsx directly

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (stable — no dependency version churn expected for pure layout work)
