# Phase 34: Visual Polish - Research

**Researched:** 2026-05-06
**Domain:** CSS visual polish — Tailwind v4, shadcn/ui Card, faction-accent CSS variable, radial gradients, shadow transitions
**Confidence:** HIGH

## Summary

Phase 34 is a CSS-only visual upgrade to the dashboard. No new hooks, no database changes, no new query modules. All changes are className additions and one inline style change per component. The entire surface area is six existing React components plus `DashboardPage.tsx` for the hero gradient wrapper.

The project uses Tailwind v4 CSS-first mode (`@theme inline {}` in `globals.css`). The `--faction-accent` CSS variable is already a runtime-mutable property updated by `ActiveFactionContext` via `document.documentElement.style.setProperty`. Every Tailwind utility that references `--color-faction-accent` (e.g. `bg-faction-accent`, `ring-faction-accent`) will automatically reflect the active faction's hex color without any React re-renders.

The Card primitive (`src/components/ui/card.tsx`) must NOT be modified — it applies `shadow-sm` as a base class and all hover depth is added via `className` overrides at the consuming-component level. This is the established pattern confirmed by reading existing Card consumers.

**Primary recommendation:** Implement in a single wave — all six components plus DashboardPage in one commit — since each change is a className string addition. No logic, no hooks, no database involvement.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### FactionCard Accent Band & Size (VIS-01)
- Replace current `border-l-4` with a full-width top color band — a solid bar across the top of the card using the faction's `color_theme`
- Band height: ~8px (`border-t-[8px]` or equivalent) — visually dominant, clearly the primary decorative element
- Card size increase: `min-w-[220px]` (up from 180px), increased vertical padding (`py-5` → `py-6`), slightly more internal gap between info rows
- Keep the existing content layout (name, model count, painted %, battle-ready points) but allow more breathing room with the increased card size
- Remove `border-l-4` entirely — the top band replaces it as the faction color carrier

#### Active/Focus Indicator (VIS-01)
- Remove the small Star icon button in the top-right corner — replace with a full-card glow treatment
- Active state: `bg-faction-accent/10` background fill + `ring-2 ring-faction-accent` + slightly elevated shadow (`shadow-md`)
- Inactive state: default `bg-card` background + no ring + base shadow (`shadow-sm`)
- The entire card surface signals active/focus state — unmistakably distinct without relying on a small icon
- Click-to-activate behavior moves to the entire card (existing pattern: card already has onClick)
- Two actions on one card must be separated:
  - Card click → navigate to collection (existing behavior)
  - Accent band area or dedicated icon → toggle faction theme (existing onActivate behavior)
  - If separating is too complex, keep the Star but make it a subtle glow dot instead of a star icon, AND apply the background fill — both signals together

#### Radial Gradient Hero (VIS-02)
- Apply a radial gradient background behind the PageHeader + top StatCards row area (the "hero" area as defined by VIS-02: "title + top stat row")
- Gradient: radial from center, `faction-accent` at very low opacity (~5-8%) fading to transparent — ties hero to active faction without obscuring text
- Implementation: a wrapper div around the PageHeader and StatCards grid cells with the gradient as a CSS background
- When no faction is active, fall back to a neutral gradient (e.g., from `muted/5` center to transparent)
- Gradient should be subtle — premium depth, not flashy; must not affect text readability

#### Card Hover Depth Hierarchy (VIS-03)
- Dashboard-scoped only — apply hover shadow transitions to dashboard card surfaces, not the global Card primitive
- Resting state: `shadow-sm` (already present on most dashboard cards)
- Hover state: `shadow-md` with `transition-shadow duration-150`
- Apply to: FactionSummaryCard, CurrentFocusCard, HobbyPipeline card, RecentActivityFeed card, ArmyReadinessCard, StatCard (all Card-based dashboard surfaces)
- Implementation: add `transition-shadow duration-150 hover:shadow-md` to each dashboard Card's className — lightweight, no wrapper component needed

### Claude's Discretion
- Exact radial gradient CSS syntax and opacity values (within the 5-8% range for faction-accent)
- Whether to use `border-t-[8px]` or a pseudo-element/inner div for the top color band
- Transition timing and easing for hover shadow (150ms suggested but flexible)
- How to separate the "activate theme" click target from the "navigate" click target on FactionCards (star replacement vs band click vs other pattern)
- Loading skeleton visual adjustments for the larger FactionCards
- Exact shadow-md values that look premium on dark zinc background

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIS-01 | FactionSummaryCard upgraded to larger cards with dominant faction accent color band and clear active/focus indicator (not just a star) | Top color band via `borderTopColor` inline style + `border-t-[8px]`; active glow via `bg-faction-accent/10 ring-2 ring-faction-accent shadow-md`; card enlarged to `min-w-[220px]`; Star import removed |
| VIS-02 | Dashboard hero area has premium visual depth with subtle radial gradient background | Wrapper `div` with `relative` overflow containing a `col-span-full` children group; inline `style` with `background: radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--faction-accent) 7%, transparent) 0%, transparent 70%)` |
| VIS-03 | Card surfaces use elevated/hover hierarchy (panel-elevated token, shadow transitions) | `transition-shadow duration-150 hover:shadow-md` added to every Card's `className` on all 6 dashboard Card consumers; Card primitive in `card.tsx` is NOT modified |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 | 4.x | Utility classes — `border-t-[8px]`, `ring-2`, `shadow-md`, `transition-shadow` | Already in project; v4 uses `@theme inline` CSS-first approach |
| shadcn/ui Card | current | Base card surface — `rounded-xl border bg-card py-6 shadow-sm` | Already in project; NOT modified |
| CSS Custom Properties | native | `--faction-accent` runtime-mutable per active faction | Already wired in `ActiveFactionContext`; `document.documentElement.style.setProperty` on every faction change |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | current | Icon — optional glow-dot replacement for Star if kept | Use `Dot` or `Circle` at `size={8}` for subtle active indicator if star replacement needed |

**No new npm installs required.** All visual effects are achievable with existing Tailwind v4 utilities and CSS custom properties.

---

## Architecture Patterns

### Recommended Project Structure

No new files are created in this phase. All changes are in-place className edits:

```
src/features/dashboard/
  FactionSummaryCard.tsx    — VIS-01: top band, active glow, card resize, activate CTA
  DashboardPage.tsx         — VIS-02: hero wrapper div; VIS-03: skeleton FactionCard size update
  CurrentFocusCard.tsx      — VIS-03: add transition-shadow hover:shadow-md
  HobbyPipeline.tsx         — VIS-03: add transition-shadow hover:shadow-md
  RecentActivityFeed.tsx    — VIS-03: add transition-shadow hover:shadow-md
  ArmyReadinessCard.tsx     — VIS-03: add transition-shadow hover:shadow-md
  StatCard.tsx              — VIS-03: add transition-shadow hover:shadow-md
```

### Pattern 1: Top Color Band (Border-T approach)

**What:** Replace `border-l-4` + `style={{ borderLeftColor }}` with `border-t-[8px]` + `style={{ borderTopColor }}` on the Card element.

**When to use:** When the faction color must appear as an inline dynamic value (hex from faction.color_theme), not a Tailwind token. The `border-t-[8px]` arbitrary value sets the width; `style` sets the color.

**Confirmed from codebase:** The existing `style={{ borderLeftColor: stat.faction.color_theme }}` pattern is the direct precedent. Changing the axis from left to top and width from 4px to 8px is a one-line change.

```tsx
// Current (FactionSummaryCard.tsx line 48-49):
style={{ borderLeftColor: stat.faction.color_theme }}
className={`relative min-w-[180px] cursor-pointer border-l-4 px-4 py-4 ...`}

// Replacement (VIS-01):
style={{ borderTopColor: stat.faction.color_theme }}
className={`relative min-w-[220px] cursor-pointer border-t-[8px] px-4 py-6 ...`}
```

**Pitfall:** Tailwind v4 uses `border-t-[8px]` as an arbitrary value — this is standard Tailwind arbitrary value syntax and works in v4. Do NOT use `border-t-8` (that's 8 Tailwind units = 32px, too large). The `[8px]` bracket syntax is required for exactly 8px.

**Alternative — inner div color band:**
```tsx
// If border approach has clipping issues on rounded corners:
<Card className="relative overflow-hidden ...">
  <div
    className="absolute inset-x-0 top-0 h-2"
    style={{ backgroundColor: stat.faction.color_theme }}
    aria-hidden="true"
  />
  {/* content with pt-2 to clear the band */}
</Card>
```

The inner div approach avoids any border-radius clipping issues that can occur when `border-t` is large on a `rounded-xl` card. The Card primitive has `rounded-xl` — an 8px `border-t` may show sharp corners on the top edge while the card body has rounded corners. **Recommendation: use the inner div approach** to guarantee visual consistency on `rounded-xl`.

### Pattern 2: Active Glow Treatment

**What:** Replace `hover:bg-muted/50` (inactive hover) and the small Star button with full-card glow signals driven by `isActive` prop.

**Current code (FactionSummaryCard line 49):**
```tsx
className={`relative min-w-[180px] cursor-pointer border-l-4 px-4 py-4 hover:bg-muted/50${isActive ? " ring-2 ring-faction-accent" : ""}`}
```

**Replacement:**
```tsx
className={`relative min-w-[220px] cursor-pointer px-4 py-6 transition-shadow duration-150${
  isActive
    ? " bg-faction-accent/10 ring-2 ring-faction-accent shadow-md"
    : " bg-card shadow-sm hover:shadow-md"
}`}
```

**Key observations from current code:**
- `hover:bg-muted/50` is the current inactive hover — remove entirely (glow replaces it)
- `ring-2 ring-faction-accent` already exists in the active branch — keep it
- The `Star` button import from `lucide-react` can be removed entirely if using glow-dot pattern, or kept as Circle/Dot

**Activate CTA separation — recommended approach (glow dot):**

The CONTEXT.md permits "keep the Star but make it a subtle glow dot instead of a star icon, AND apply the background fill." This is the path of least resistance:

```tsx
import { Circle } from "lucide-react";

// Replace <Star> with:
<button
  onClick={handleActivate}
  aria-label={isActive ? "Deactivate faction theme" : "Set as active faction theme"}
  className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground"
>
  <Circle
    size={8}
    className={isActive ? "fill-faction-accent text-faction-accent" : "fill-muted text-muted-foreground/40"}
  />
</button>
```

This keeps `handleActivate` + `e.stopPropagation()` intact, removes the visually heavy Star, and relies on the card background fill as the primary active signal.

### Pattern 3: Radial Gradient Hero (VIS-02)

**What:** A `div` wrapper around the PageHeader and StatCards columns that provides a CSS radial gradient background tied to `--faction-accent`.

**The challenge:** DashboardPage uses a CSS grid (`grid-cols-1 gap-6 p-6 lg:grid-cols-[3fr_2fr]`). The PageHeader and StatCards are children with `col-span-full`. Wrapping them in a single div would break the grid flow because grid items must be direct children of the grid container.

**Solution — Use CSS `background` on a col-span-full wrapper div:**

The cleanest approach is to add a single `col-span-full` wrapper div that itself contains both the PageHeader and the StatCards row. This wrapper div carries the gradient background and lives inside the outer grid as a full-width item:

```tsx
{/* VIS-02 — Hero gradient wrapper — full width */}
<div
  className="col-span-full rounded-xl"
  style={{
    background: "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--faction-accent) 7%, transparent) 0%, transparent 70%)",
  }}
>
  <div className="pb-6">
    <PageHeader ... />
  </div>
  <div className="grid grid-cols-4 gap-6">
    <StatCard ... /> {/* × 4 */}
  </div>
</div>
```

**CSS `color-mix()` for faction-accent at low opacity:**

`color-mix(in srgb, var(--faction-accent) 7%, transparent)` is valid CSS Color Level 5 syntax supported in all evergreen browsers and Chromium (Tauri's renderer). It produces a 7% opacity faction accent color without needing `faction-accent/7` Tailwind syntax (which requires the color to be defined as an `oklch` or `hsl` — hex values like `#3a4f96` do not support the Tailwind opacity modifier syntax reliably).

**Fallback when no faction is active:** `--faction-accent` defaults to `#71717a` (zinc-500) per `ActiveFactionContext`. The gradient will be visible as a very subtle neutral center glow — this is acceptable and intentional. No conditional logic needed.

**Alternative — inline background-image with CSS variable:**
```tsx
style={{
  backgroundImage: `radial-gradient(ellipse at 50% 0%, ${activeFactionHex}12 0%, transparent 70%)`,
}}
```

This uses `activeFactionHex` from `useActiveFaction()` context (already imported in DashboardPage) + appended `12` as a hex alpha suffix (18/255 ≈ 7% opacity). This is simpler and avoids `color-mix()` dependency. **Recommendation: use the hex alpha approach** since `activeFactionHex` is already available in DashboardPage.

### Pattern 4: Shadow Transition Hover Depth (VIS-03)

**What:** Add `transition-shadow duration-150 hover:shadow-md` to each dashboard Card's className.

**Current baseline:** Card primitive has `shadow-sm` in its base classes. Most dashboard Card consumers already pass `shadow-sm` redundantly in their className. The hover depth upgrade adds `hover:shadow-md` on top.

**Affected files and current Card classNames:**

| Component | Current Card className | Addition |
|-----------|----------------------|----------|
| `StatCard.tsx` | `px-6 bg-card border border-border/60 shadow-sm` | `+ transition-shadow duration-150 hover:shadow-md` |
| `CurrentFocusCard.tsx` (active) | `bg-card border border-border/60 border-l-4 shadow-sm px-6 py-5` | `+ transition-shadow duration-150 hover:shadow-md` |
| `CurrentFocusCard.tsx` (empty) | `bg-card border border-border/60 shadow-sm px-6 py-6` | `+ transition-shadow duration-150 hover:shadow-md` |
| `HobbyPipeline.tsx` | `bg-card border border-border/60 shadow-sm px-6 py-6` | `+ transition-shadow duration-150 hover:shadow-md` |
| `RecentActivityFeed.tsx` | `bg-card border border-border/60 shadow-sm px-6 py-6` (×2 branches) | `+ transition-shadow duration-150 hover:shadow-md` |
| `ArmyReadinessCard.tsx` | `rounded-lg border border-border/60 bg-card p-4 shadow-sm` (×3 branches) | `+ transition-shadow duration-150 hover:shadow-md` |
| `FactionSummaryCard.tsx` | See Pattern 2 above — handled by active/inactive branch className | Shadow-md already in active branch; `hover:shadow-md` in inactive branch |

**Note on `transition-shadow`:** Tailwind v4 provides `transition-shadow` as a named utility (`transition-property: box-shadow`). This is distinct from `transition` (which also includes color, opacity, etc.) and keeps the transition narrow-scoped. Confirmed present in Tailwind v4 utility set.

### Anti-Patterns to Avoid

- **Modifying `src/components/ui/card.tsx`:** Any hover class added here would affect every Card across the entire app (12+ features). CONTEXT.md explicitly requires dashboard-scoped only.
- **Using `bg-faction-accent/10` without verifying Tailwind can parse it:** `--faction-accent` is defined as a raw hex (e.g. `#71717a`), not HSL or OKLCH. Tailwind v4's opacity modifier (`/10`) works by wrapping the color in `oklch(... / 10%)` via the CSS color space engine — this works on hex values in v4. Confirmed by Tailwind v4 CSS-first documentation. **Confidence: MEDIUM** — should be visually verified on first render.
- **Nesting the hero wrapper inside the existing grid without `col-span-full`:** Without `col-span-full`, the wrapper becomes a narrow grid cell. It must span the full width.
- **Adding `overflow-hidden` to the hero wrapper without `rounded-xl`:** If using `overflow-hidden` for the gradient containment, add `rounded-xl` to prevent sharp-cornered clipping at the wrapper boundary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Faction-accent opacity color | Manual RGBA calculation in JS | `bg-faction-accent/10` Tailwind modifier OR `${hex}1a` hex alpha | Tailwind v4 handles opacity modifiers natively; hex alpha is simpler for inline styles |
| Radial gradient with runtime color | Dynamic CSS class generation | Inline `style` with `var(--faction-accent)` in the gradient string | CSS variables in gradient strings are browser-native; no JS needed |
| Smooth shadow transition | CSS animation keyframes or JS | `transition-shadow duration-150 hover:shadow-md` | Tailwind transition utilities are exactly this use case |
| Active card distinction | Custom "active indicator" component | Background + ring combination in className string | The faction-accent system already provides all needed color tokens |

---

## Common Pitfalls

### Pitfall 1: `border-t-8` vs `border-t-[8px]`
**What goes wrong:** Using `border-t-8` applies 32px top border (Tailwind default spacing scale: 8 = 2rem). The correct class for exactly 8 pixels is `border-t-[8px]` (arbitrary value).
**Why it happens:** Mixing Tailwind spacing scale units with pixel expectations.
**How to avoid:** Always use bracket notation for pixel-specific values: `border-t-[8px]`.
**Warning signs:** Card top band is visually massive (32px instead of 8px).

### Pitfall 2: `rounded-xl` clips inline `border-t-[8px]`
**What goes wrong:** On a `rounded-xl` card, a large `border-t` may show as straight/squared on the top corners while the card body is rounded, creating a visual mismatch.
**Why it happens:** CSS `border-radius` applies to the box border, but large border widths on top combined with `rounded-xl` can appear unclipped on the internal corner.
**How to avoid:** Use an absolute-positioned inner div `<div className="absolute inset-x-0 top-0 h-2" style={{ backgroundColor: faction.color_theme }} />` with the Card as `relative overflow-hidden`. The inner div naturally follows the Card's `rounded-xl` shape.
**Warning signs:** Top-left and top-right corners of the color band appear squared while card body is rounded.

### Pitfall 3: `bg-faction-accent/10` on hex-defined custom property
**What goes wrong:** `bg-faction-accent/10` may render incorrectly if Tailwind v4's opacity modifier cannot parse the hex value from `--faction-accent`.
**Why it happens:** Tailwind v4's opacity modifier wraps colors in `oklch(from var(--color-faction-accent) l c h / 0.1)` — this requires the CSS engine to support `oklch(from <color> ...)` (relative color syntax). Chromium 111+ supports this, and Tauri uses a recent Chromium — but it's worth verifying on first render.
**How to avoid:** If visual inspection shows incorrect opacity, use inline style `backgroundColor: \`${stat.faction.color_theme}1a\`` (hex `1a` ≈ 10% opacity) instead of the Tailwind modifier.
**Warning signs:** Card background appears fully opaque or fully transparent when `isActive=true`.

### Pitfall 4: Existing test asserts on `ring-2 ring-faction-accent` class
**What goes wrong:** The test at `DashboardPage.test.tsx` line 279–305 (`"active FactionSummaryCard has ring-2 ring-faction-accent class when faction is active (UI-08)"`) does `expect(factionCard.className).toContain("ring-2")` and `.toContain("ring-faction-accent")`. These assertions must continue to pass after the VIS-01 refactor.
**Why it happens:** Test checks the DOM class string directly. As long as `ring-2 ring-faction-accent` remains in the active branch className, the test passes unchanged.
**How to avoid:** Keep `ring-2 ring-faction-accent` in the active className string. Do NOT rename or replace these tokens with different ring utilities.
**Warning signs:** `pnpm test` fails on `DashboardPage.test.tsx` "UI-08" case after VIS-01 refactor.

### Pitfall 5: Hero gradient wrapper breaks grid layout
**What goes wrong:** If the PageHeader and StatCards are wrapped in a `div` that is NOT a direct child of the outer grid with `col-span-full`, the grid collapses both elements into a single narrow column.
**Why it happens:** CSS grid only applies layout rules to direct children.
**How to avoid:** The wrapper div must have `col-span-full` and must be a direct child of the `<div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[3fr_2fr]">`.
**Warning signs:** PageHeader and/or StatCards appear in a narrow left column instead of spanning full width.

### Pitfall 6: Loading skeleton FactionCard size mismatch
**What goes wrong:** The loading skeleton for FactionCards uses `className="h-28 w-[180px]"` (old card size). After VIS-01 increases the card to `min-w-[220px]` with more vertical padding, skeletons will be visibly smaller than populated cards, creating layout shift.
**How to avoid:** Update the skeleton in DashboardPage loading branch: `className="h-32 w-[220px]"`.
**Warning signs:** Visible layout shift when dashboard data loads (skeletons jump to larger size).

---

## Code Examples

### Top Color Band (inner div approach — recommended)

```tsx
// FactionSummaryCard.tsx — VIS-01
<Card
  onClick={handleCardClick}
  role="button"
  tabIndex={0}
  onKeyDown={...}
  aria-label={stat.faction.name}
  className={`relative overflow-hidden min-w-[220px] cursor-pointer px-4 py-6 transition-shadow duration-150${
    isActive
      ? " bg-faction-accent/10 ring-2 ring-faction-accent shadow-md"
      : " bg-card shadow-sm hover:shadow-md"
  }`}
>
  {/* VIS-01 — top accent band (inner div avoids border-radius clipping on rounded-xl) */}
  <div
    className="absolute inset-x-0 top-0 h-2"
    style={{ backgroundColor: stat.faction.color_theme }}
    aria-hidden="true"
  />

  {/* Glow dot activate button */}
  <button
    onClick={handleActivate}
    onKeyDown={...}
    aria-label={isActive ? "Deactivate faction theme" : "Set as active faction theme"}
    className="absolute right-2 top-3 rounded p-1 text-muted-foreground hover:text-foreground"
  >
    <Circle
      size={8}
      className={isActive ? "fill-faction-accent text-faction-accent" : "fill-muted-foreground/30 text-muted-foreground/30"}
    />
  </button>

  {/* Content — mt-2 to clear the 8px band */}
  <div className="mt-2 flex flex-col gap-2">
    ...
  </div>
</Card>
```

### Radial Gradient Hero (hex alpha approach — recommended)

```tsx
// DashboardPage.tsx — VIS-02
// Import: const { activeFactionHex } = useActiveFaction(); (already destructured)

{/* VIS-02 — Hero gradient wrapper: PageHeader + StatCards in one full-width section */}
<div
  className="col-span-full rounded-xl"
  style={{
    background: `radial-gradient(ellipse at 50% 0%, ${activeFactionHex}12 0%, transparent 70%)`,
  }}
>
  <div className="mb-6">
    <PageHeader ... />
  </div>
  <div className="grid grid-cols-4 gap-6">
    <StatCard ... /> {/* × 4 */}
  </div>
</div>
```

Note: `activeFactionHex` is available from `useActiveFaction()` which is already called on line 61 of DashboardPage. Add `activeFactionHex` to the destructuring: `const { activeFactionId, setActiveFaction, activeFactionHex } = useActiveFaction();`.

### Shadow Transition Addition (VIS-03)

```tsx
// HobbyPipeline.tsx — before:
<Card className="bg-card border border-border/60 shadow-sm px-6 py-6">

// after:
<Card className="bg-card border border-border/60 shadow-sm px-6 py-6 transition-shadow duration-150 hover:shadow-md">
```

Same pattern for `CurrentFocusCard`, `RecentActivityFeed`, `ArmyReadinessCard`, `StatCard`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `border-left-color` for faction accent | `border-top-color` with 8px band | Phase 34 (this phase) | Top band is dominant; left band was a subtle indicator |
| Star icon for active faction | Ring + background fill + glow dot | Phase 34 (this phase) | Whole-card signaling vs small icon |
| Static card shadow | `transition-shadow hover:shadow-md` | Phase 34 (this phase) | Tactile bento grid feel |

**Deprecated/outdated:**
- `border-l-4` on FactionSummaryCard: replaced by top color band
- `Star` import from lucide-react in FactionSummaryCard: replaced by `Circle` (glow dot)
- `hover:bg-muted/50` on FactionSummaryCard: replaced by shadow-based hover depth

---

## Open Questions

1. **`bg-faction-accent/10` opacity modifier reliability on hex CSS variable**
   - What we know: Tailwind v4 uses CSS relative color syntax; Tauri Chromium is recent; hex CSS variables *should* work
   - What's unclear: Exact Chromium version in the user's Tauri build — relative color syntax requires Chromium 111+
   - Recommendation: Implement with `bg-faction-accent/10` first; if visual inspection shows incorrect rendering, fall back to `style={{ backgroundColor: \`${stat.faction.color_theme}1a\` }}`

2. **Hero gradient wrapper and outer grid gap behaviour**
   - What we know: The wrapper div will be a `col-span-full` direct child of the grid; it contains PageHeader and StatCards
   - What's unclear: Whether replacing two separate `col-span-full` divs with one combined wrapper changes spacing inside the hero area (the `gap-6` between them may disappear)
   - Recommendation: Use `mb-6` on the PageHeader inner div or `flex flex-col gap-6` inside the wrapper to preserve vertical spacing

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/dashboard/FactionSummaryCard.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIS-01 | FactionSummaryCard active state has `ring-2 ring-faction-accent` | unit | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ✅ (UI-08 test, line 279) |
| VIS-01 | FactionSummaryCard has `min-w-[220px]` class | unit | `pnpm test -- tests/dashboard/FactionSummaryCard.test.tsx` | ❌ Wave 0 |
| VIS-01 | FactionSummaryCard top band div is present with `aria-hidden` | unit | `pnpm test -- tests/dashboard/FactionSummaryCard.test.tsx` | ❌ Wave 0 |
| VIS-01 | Star icon is absent; activate button has `aria-label` | unit | `pnpm test -- tests/dashboard/FactionSummaryCard.test.tsx` | ❌ Wave 0 |
| VIS-02 | Hero gradient wrapper is `col-span-full` direct child | unit | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ❌ Wave 0 |
| VIS-03 | Dashboard cards have `hover:shadow-md` class | unit (className check) | `pnpm test -- tests/dashboard/DashboardPage.test.tsx` | ❌ Wave 0 (optional — CSS-only, manual verify acceptable) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/dashboard/DashboardPage.test.tsx tests/dashboard/FactionSummaryCard.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dashboard/FactionSummaryCard.test.tsx` — covers VIS-01 (top band presence, card size class, Star removal, active glow treatment)
- [ ] Add VIS-02 assertion to `tests/dashboard/DashboardPage.test.tsx` — hero wrapper `col-span-full` presence in populated state
- [ ] VIS-03 className assertions are CSS-only and primarily visual; manual verification in the running app is sufficient — no automated test gap

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `src/features/dashboard/FactionSummaryCard.tsx` — confirmed current `border-l-4`, Star icon, `ring-2 ring-faction-accent`, `min-w-[180px]` baseline
- Direct codebase read: `src/features/dashboard/DashboardPage.tsx` — confirmed grid structure, `useActiveFaction` destructuring, StatCards arrangement
- Direct codebase read: `src/styles/globals.css` — confirmed `--faction-accent` hex definition, `@theme inline` block, `--panel-elevated` = `--card`, `--battle-gold` token
- Direct codebase read: `src/components/ui/card.tsx` — confirmed base classes `rounded-xl border bg-card py-6 shadow-sm`; Card must NOT be modified
- Direct codebase read: `src/context/ActiveFactionContext.tsx` — confirmed `activeFactionHex` is exposed by context; `document.documentElement.style.setProperty("--faction-accent", hex)` on every change
- Direct codebase read: `tests/dashboard/DashboardPage.test.tsx` — confirmed UI-08 test asserts `ring-2` and `ring-faction-accent` in className; must remain passing
- Direct codebase read: `StatCard.tsx`, `CurrentFocusCard.tsx`, `HobbyPipeline.tsx`, `RecentActivityFeed.tsx`, `ArmyReadinessCard.tsx` — confirmed current Card className strings for VIS-03 additions

### Secondary (MEDIUM confidence)
- Tailwind v4 arbitrary value syntax (`border-t-[8px]`) — standard documented pattern, confirmed valid for pixel-specific border widths
- CSS `color-mix(in srgb, var(--faction-accent) 7%, transparent)` — CSS Color Level 5, supported in Chromium 111+; Tauri uses recent Chromium
- Hex alpha suffix pattern (`#3a4f9612`) — standard CSS hex color with alpha channel, universally supported

### Tertiary (LOW confidence)
- `bg-faction-accent/10` with a hex CSS variable — Tailwind v4 opacity modifier relies on CSS relative color syntax; behavior on hex variables is documented but not validated in this specific project setup

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire phase uses existing libraries already in the project
- Architecture: HIGH — all patterns derived directly from reading current source files
- Pitfalls: HIGH — corner cases identified from direct code analysis (rounded-xl clipping, grid layout, existing test assertions)
- Open questions: MEDIUM — `bg-faction-accent/10` opacity modifier behavior on hex variable needs visual validation

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (stable CSS-only phase; no external dependencies changing)
