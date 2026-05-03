# Phase 12: Collection Gallery View - Research

**Researched:** 2026-05-03
**Domain:** React component composition, SVG circular progress, localStorage persistence hooks
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**View Toggle Placement**
- Icon-pair button group in the top-right of the Collection page header row, between the page title and the "Add Unit" button
- Two adjacent icon buttons: table-rows icon (Table) and grid icon (Gallery) — the active view gets a `bg-muted` background fill
- Layout: `Collection  [■ Table] [⊞ Gallery]  [+ Add Unit]`

**View Toggle Persistence**
- Persists via localStorage, key: `collection-view-mode`, values: `'table' | 'gallery'`, default: `'table'`
- Same pattern as `useSidebarCollapsed.ts` — synchronous read in `useState` initializer, `useEffect` to sync on change
- New hook: `useCollectionViewMode` in `src/hooks/useCollectionViewMode.ts`

**Card Click & Interactions**
- Clicking a gallery card opens the existing `UnitDetailSheet` — same behavior as clicking a table row
- Uses the same `selectedUnitId` / `selectedUnit` pattern already in `CollectionPage.tsx`
- No action buttons on gallery cards — Edit and Delete are accessible from inside the detail sheet
- No hover overlay with actions

**Empty States**
- Reuse the existing `CollectionEmptyState` component for both "no units" and "no results for filters" states
- No gallery-specific empty state needed

**Painting Ring — Appearance**
- Large ring centered at the top of each card (~96px diameter)
- Percentage text rendered inside the ring center (e.g. "72%")
- Ring track: zinc-600 (`#52525b`) neutral background arc
- Ring fill arc: app primary color (same as `bg-primary` linear progress bar in the table)
- Phase 10 decision carries forward: rings encode painting state, NOT faction identity — no `bg-faction-accent` on rings

**Painting Ring — Implementation**
- SVG `<circle>` with `stroke-dasharray` / `stroke-dashoffset` technique (not CSS conic-gradient)
- Two circles: background track circle + foreground progress arc
- `stroke-linecap="round"` on the progress arc
- Component: `PaintingRing` — `src/components/common/PaintingRing.tsx`
- Input: `percentage: number` (0–100), derived from `unit.painting_percentage`

**Gallery Card Layout**
- Responsive grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Card content (top to bottom): large painting ring (with % inside), unit name, faction badge, status text label, model count, points, active project flame indicator (if `is_active_project === 1`)
- Fixed sort order: alphabetical by name (no sort control in gallery mode)
- Component: `UnitGallery` in `src/features/units/UnitGallery.tsx`, receives same props as `UnitTable` minus sorting/pagination

### Claude's Discretion
- Exact card dimensions (min-width, padding, gap) and typography sizes
- Whether `PaintingRing` is a standalone file or co-located in the units feature folder
- Loading skeleton design for gallery mode
- Exact SVG viewBox dimensions and stroke-width for the ring
- Whether active project flame icon is positioned as an overlay badge on the ring or in a separate row below

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-04 | User can switch the Collection page between table view and gallery view using a view toggle | `useCollectionViewMode` hook + conditional render in `CollectionPage`; toggle buttons with `LayoutList`/`LayoutGrid` lucide icons; `bg-muted` active state |
| UI-05 | Gallery view displays unit cards with unit name, faction badge, painting-status ring, and painted percentage | `UnitGallery` component + `PaintingRing` SVG component; faction badge pattern from `UnitTableColumns.tsx`; `unit.painting_percentage` field already on Unit type |
| UI-06 | Switching between table and gallery view preserves all active filters (no filter reset on toggle) | Free by design: `collectionFilters` Zustand store is orthogonal to view mode; `filteredUnits` already computed before the conditional render split |
</phase_requirements>

---

## Summary

Phase 12 adds a gallery card grid as an alternate view to the existing Collection table. The implementation is purely additive — no existing code is modified except `CollectionPage.tsx`, which gains a view toggle in its header row and a conditional render branch replacing `<UnitTable>` with `<UnitGallery>`. All filter state lives in Zustand (collectionFilters store), so UI-06 filter preservation is already solved: the gallery simply reads the same `filteredUnits` array the table already uses.

Three new files are required: `useCollectionViewMode.ts` (localStorage hook, mirrors `useSidebarCollapsed.ts` exactly), `PaintingRing.tsx` (focused SVG component, no dependencies), and `UnitGallery.tsx` (responsive card grid). The UI-SPEC has fully resolved Claude's discretion items — exact SVG dimensions, spacing, skeleton design, and icon choices are all specified.

The most technically precise work is the SVG painting ring. The `stroke-dasharray` / `stroke-dashoffset` technique has a single non-obvious math: circumference = `2 * Math.PI * r` where `r = 38` gives `≈238.76`. Progress is encoded as `dashoffset = circumference * (1 - percentage/100)`. The ring starts at 12 o'clock via `transform="rotate(-90 48 48)"`. This technique is well-understood and has no library dependencies.

**Primary recommendation:** Build in three focused plans — Wave 0 stubs, then implementation in two waves (hook + ring first, gallery component + CollectionPage wiring second).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.0.0 | Component rendering | Already in project |
| lucide-react | 0.460.0 | `LayoutList` + `LayoutGrid` toggle icons, `Flame` active indicator | Already in project; confirmed both icons present at this version |
| Tailwind CSS | 4.2.4 | Responsive grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`), spacing, colors | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | ^5.0.12 | `collectionFilters` store (read-only in this phase) | Already wired; gallery just reads the same store |
| shadcn Card | installed | Gallery card wrapper | `bg-card rounded-xl border shadow-sm` baseline |
| shadcn Skeleton | installed | Loading state skeleton cards | `animate-pulse rounded-md bg-accent` |
| shadcn Badge | installed | Faction badge on cards | Same `style={{ backgroundColor: color_theme }}` pattern as table |
| shadcn Button | installed | View toggle icon buttons (`variant="ghost" size="icon"`) | Active state: add `className="bg-muted"` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SVG stroke-dasharray ring | CSS conic-gradient ring | Locked decision: SVG chosen for precise `round` linecap and broader browser compat in Tauri WebView |
| SVG stroke-dasharray ring | Third-party progress ring library | Don't hand-roll — but the SVG technique IS the standard here; no library adds value |
| localStorage hook (custom) | Zustand with persist middleware | localStorage hook matches the exact existing pattern (`useSidebarCollapsed`); adding Zustand persist would be inconsistent |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── hooks/
│   └── useCollectionViewMode.ts     # NEW — mirrors useSidebarCollapsed.ts
├── components/common/
│   └── PaintingRing.tsx             # NEW — focused SVG ring
└── features/units/
    ├── CollectionPage.tsx           # MODIFIED — toggle buttons + conditional render
    └── UnitGallery.tsx              # NEW — responsive card grid
```

### Pattern 1: localStorage Persistence Hook (mirrors useSidebarCollapsed.ts)

**What:** Synchronous `useState` initializer reads localStorage to avoid flash; `useEffect` syncs writes on change.

**When to use:** Any boolean or string UI preference that must survive app restart.

**Example:**
```typescript
// Source: src/components/common/useSidebarCollapsed.ts (existing, verified)
export function useSidebarCollapsed(): readonly [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false");
    } catch {
      /* storage may be blocked — degrade silently */
    }
  }, [collapsed]);

  return [collapsed, setCollapsedState] as const;
}
```

`useCollectionViewMode` copies this pattern with `STORAGE_KEY = "collection-view-mode"`, return type `readonly ['table' | 'gallery', (next: 'table' | 'gallery') => void]`, and default `'table'` when key is absent.

### Pattern 2: SVG stroke-dasharray Painting Ring

**What:** Two `<circle>` elements sharing the same cx/cy/r. The background circle is a full ring (track). The foreground circle uses `stroke-dasharray` + `stroke-dashoffset` to show partial fill.

**When to use:** Circular progress indicators where CSS conic-gradient linecap control is insufficient.

**Example:**
```typescript
// Source: 12-UI-SPEC.md §PaintingRing Specification (verified against CONTEXT.md)
const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 238.76

export function PaintingRing({ percentage }: { percentage: number }) {
  const offset = CIRCUMFERENCE * (1 - percentage / 100);
  return (
    <svg
      width={96}
      height={96}
      viewBox="0 0 96 96"
      role="img"
      aria-label={`${percentage}% painted`}
    >
      {/* Track */}
      <circle
        cx={48}
        cy={48}
        r={RADIUS}
        fill="none"
        stroke="#52525b"
        strokeWidth={8}
      />
      {/* Progress arc — starts at 12 o'clock */}
      <circle
        cx={48}
        cy={48}
        r={RADIUS}
        fill="none"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
        className="text-primary"
        stroke="currentColor"
      />
      {/* Percentage label */}
      <text
        x={48}
        y={48}
        dominantBaseline="middle"
        textAnchor="middle"
        className="text-base font-semibold fill-foreground"
        fontSize="16"
        fontWeight="600"
      >
        {percentage}%
      </text>
    </svg>
  );
}
```

**Key math:** radius `38` chosen so `38 + strokeWidth/2 = 42 < 48 (viewBox center)` — the stroke never clips the viewBox edge.

### Pattern 3: Conditional View Render in CollectionPage

**What:** Add `useCollectionViewMode` hook call; replace `<UnitTable>` conditional branch with a switch on `viewMode`.

**When to use:** Alternate views sharing the same filtered data source, no navigation change.

**Example:**
```typescript
// CollectionPage.tsx — modified header row and conditional render
const [viewMode, setViewMode] = useCollectionViewMode();

// Header row change:
<div className="flex items-center justify-between">
  <h1 className="text-xl font-semibold">Collection</h1>
  <div className="flex items-center gap-1">
    <Button
      variant="ghost"
      size="icon"
      aria-label="Table view"
      className={viewMode === 'table' ? 'bg-muted' : ''}
      onClick={() => setViewMode('table')}
    >
      <LayoutList className="h-4 w-4" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      aria-label="Gallery view"
      className={viewMode === 'gallery' ? 'bg-muted' : ''}
      onClick={() => setViewMode('gallery')}
    >
      <LayoutGrid className="h-4 w-4" />
    </Button>
  </div>
  <Button onClick={handleAdd}>
    <Plus className="mr-2 h-4 w-4" /> Add Unit
  </Button>
</div>

// Conditional render (replaces <UnitTable ...>):
{viewMode === 'gallery' ? (
  <UnitGallery
    data={filteredUnits}
    factions={factions ?? []}
    isLoading={unitsLoading}
    hasActiveFilters={hasActiveFilters}
    onRowClick={handleRowClick}
    onAdd={handleAdd}
    onClearFilters={clearAll}
  />
) : (
  <UnitTable ... />
)}
```

### Pattern 4: Gallery Card as Role-Button (mirrors FactionSummaryCard.tsx)

**What:** A `<Card>` with `role="button" tabIndex={0}` and an `onKeyDown` handler for Enter/Space.

**When to use:** Any non-`<button>` element that must be keyboard-accessible as a click target.

**Example:**
```typescript
// Source: src/features/dashboard/FactionSummaryCard.tsx (existing, verified)
<Card
  onClick={handleCardClick}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  }}
  aria-label={unit.name}
  className="cursor-pointer hover:bg-muted/50 flex flex-col items-center px-4 pt-4 pb-4 gap-2"
>
```

### Anti-Patterns to Avoid

- **Zustand for view mode:** The toggle is a UI preference persisted in localStorage, not ephemeral application state. Putting it in Zustand would be inconsistent with how `useSidebarCollapsed` works. Use the localStorage hook pattern.
- **Faction accent on painting ring:** The locked decision prohibits `bg-faction-accent` / `text-faction-accent` on the ring. Ring fill must use `text-primary` / `stroke="currentColor"`.
- **Resetting filters on toggle:** Never call `clearAll()` or reset Zustand state when switching view mode. The filter store is orthogonal to the view mode.
- **SVG font classes not rendering in jsdom:** Tailwind class-based font sizes (`text-base`) on SVG `<text>` elements are not computed in jsdom tests. Test the percentage value content, not the visual font size.
- **Nesting portals:** Do not add new `UnitDetailSheet` inside `UnitGallery`. The existing sibling portal in `CollectionPage` already handles all sheet opens.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circular progress ring | Custom CSS conic-gradient with clip-path | SVG stroke-dasharray (locked decision) | Linecap `round` requires SVG; conic-gradient has no linecap control |
| View mode persistence | Complex state management | `useCollectionViewMode` mirroring `useSidebarCollapsed.ts` | 30-line hook handles SSR guard, try/catch, and sync write |
| Faction color on cards | Recalculate color from faction data | `factionMap` already built in `CollectionPage` and passed to `UnitGallery` | Map is already available; don't recompute |
| Filter logic | Re-filter in UnitGallery | Read `filteredUnits` from CollectionPage | `applyUnitFilters` already produces the final array; gallery receives it as `data` prop |
| Empty state | Build gallery-specific empty state | Pass `CollectionEmptyState` through (locked decision) | Reuse saves work and keeps copy consistent |

---

## Common Pitfalls

### Pitfall 1: SVG className on circle element not applying Tailwind stroke
**What goes wrong:** Adding `className="stroke-primary"` to the progress `<circle>` doesn't produce a visible stroke in all Tailwind v4 configurations.
**Why it happens:** SVG `stroke` is not the same CSS property as `color`. Tailwind's `stroke-*` utilities require the SVG `stroke` attribute to be set via CSS `stroke: currentColor` pattern OR use the direct `stroke` attribute.
**How to avoid:** Use `stroke="currentColor"` as an SVG attribute AND set `className="text-primary"` on the circle. This leverages the CSS `color` → `currentColor` inheritance chain, which works reliably.
**Warning signs:** Ring shows gray/no color in the app but the track shows correctly.

### Pitfall 2: SVG `<text>` className font utilities not computing in jsdom tests
**What goes wrong:** Tests asserting `text.classList.contains('text-base')` pass, but asserting computed font-size via `getComputedStyle` fails — jsdom doesn't process Tailwind CSS.
**Why it happens:** jsdom has no CSS engine; Tailwind classes are names only.
**How to avoid:** Test the text content (`expect(el.textContent).toBe('72%')`) and the aria-label, not visual font properties.
**Warning signs:** Test passes for class name but fails for `getComputedStyle(el).fontSize`.

### Pitfall 3: Card `flex flex-col gap-6` default fighting custom gap
**What goes wrong:** Using the default `<Card>` component (which has `flex flex-col gap-6 py-6`) produces unwanted gap and padding on gallery cards.
**Why it happens:** `Card` in this project (`src/components/ui/card.tsx`) has baked-in default classes including `gap-6` and `py-6`.
**How to avoid:** Override by passing explicit className: `<Card className="flex flex-col items-center px-4 pt-4 pb-4 gap-2 cursor-pointer hover:bg-muted/50">`. Tailwind merging via `cn()` is NOT used here — Card accepts `className` and appends via `cn()` internally, so explicit gap/padding values override defaults.

Actually: Card uses `cn("flex flex-col gap-6 rounded-xl border bg-card py-6 ...", className)` — the `className` is passed at end so later classes in `cn()` should win. Verify this works; if not, pass `gap-2 py-0` explicitly to override.

### Pitfall 4: Keyboard handler missing `e.preventDefault()` on Space
**What goes wrong:** Pressing Space on a `role="button"` card scrolls the page instead of activating the card.
**Why it happens:** Space is the browser's default scroll-down key; it must be prevented.
**How to avoid:** Always include `e.preventDefault()` in the `onKeyDown` handler for both Enter and Space, matching the `FactionSummaryCard.tsx` pattern exactly.
**Warning signs:** Keyboard-only users report that Space scrolls instead of opening the detail sheet.

### Pitfall 5: `percentage` prop passed as `null` to PaintingRing
**What goes wrong:** `unit.painting_percentage` is typed `number` in the Unit interface but SQLite could theoretically return null if the column has no DEFAULT — resulting in `NaN%` in the ring.
**Why it happens:** The Unit type declares `painting_percentage: number` (not nullable), but defensive rendering is good practice.
**How to avoid:** Apply a guard: `const pct = percentage ?? 0` inside PaintingRing, or ensure `unit.painting_percentage ?? 0` is applied at the call site in UnitGallery.
**Warning signs:** Ring renders with `NaN%` text or a broken dashoffset.

### Pitfall 6: Object.defineProperty for `window.matchMedia` not needed in this phase
**What goes wrong:** Copying the Phase 11 test setup for `Object.defineProperty(window, 'matchMedia', ...)` into gallery tests unnecessarily.
**Why it happens:** Phase 11 needed this because `StatCard` with `animate={true}` checks `prefers-reduced-motion`. Gallery cards have no animation — no matchMedia dependency.
**How to avoid:** Do not add the matchMedia polyfill to Phase 12 test files unless a component explicitly uses it. Keep tests minimal.

---

## Code Examples

Verified patterns from existing project source:

### Faction Badge (from UnitTableColumns.tsx — exact pattern to replicate)
```typescript
// Source: src/features/units/UnitTableColumns.tsx (verified)
<Badge
  style={{ backgroundColor: faction.color_theme }}
  className="border-transparent text-white"
  data-testid="faction-badge"
>
  {faction.name}
</Badge>
```

### Active Flame Indicator (from UnitTableColumns.tsx — same logic)
```typescript
// Source: src/features/units/UnitTableColumns.tsx (verified)
<Flame
  className={cn(
    "h-4 w-4",
    unit.is_active_project ? "text-primary" : "text-muted-foreground/40",
  )}
  aria-hidden="true"
/>
// In gallery: only render when is_active_project === 1 (omit entirely when 0)
```

### LocalStorage Hook (useSidebarCollapsed.ts — template to copy)
```typescript
// Source: src/components/common/useSidebarCollapsed.ts (verified)
const [collapsed, setCollapsedState] = useState<boolean>(() => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
});

useEffect(() => {
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false");
  } catch {
    /* storage may be blocked — degrade silently */
  }
}, [collapsed]);
```

### UnitGallery Props Interface (inferred from UnitTable minus sort/pagination/edit/delete)
```typescript
// Derived from UnitTable interface (src/features/units/UnitTable.tsx) — verified
interface UnitGalleryProps {
  data: Unit[];
  factions: Faction[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onRowClick: (unit: Unit) => void;
  onAdd: () => void;           // for empty state "no units" CTA
  onClearFilters: () => void;  // for empty state "filtered" CTA
}
// NOTE: onEdit, onDelete, onToggleActive are NOT in gallery — no action buttons
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS conic-gradient rings | SVG stroke-dasharray rings | Locked in CONTEXT.md | More control over linecap; better Tauri WebView compat |
| CSS `stroke-primary` on SVG | `stroke="currentColor" className="text-primary"` | Tailwind v4 convention | Reliable stroke color via CSS color inheritance |
| `bg-accent` for active nav | `bg-faction-accent` for active nav | Phase 10 | Faction theming now drives all accent usage |

**Deprecated/outdated:**
- `bg-accent` on active states: Phase 10 replaced this with `bg-faction-accent` for nav items. For the view toggle active state, the decision is `bg-muted` (neutral, not faction accent) — this is intentional per CONTEXT.md.

---

## Open Questions

1. **Card gap default vs override behavior in Tailwind v4 cn()**
   - What we know: `Card` component uses `cn("flex flex-col gap-6 ... py-6", className)` — className is appended last
   - What's unclear: Whether Tailwind v4's `cn()` (which uses `tailwind-merge`) correctly overrides `gap-6` with `gap-2` when both appear
   - Recommendation: Test empirically during Wave 1 implementation. If override fails, wrap in a plain `<div>` with the `card` visual classes applied manually instead of the shadcn `Card` component.

2. **SVG `<text>` fill in dark mode**
   - What we know: `className="fill-foreground"` should resolve to `hsl(var(--foreground))` which inverts in dark mode
   - What's unclear: Whether Tailwind v4 generates `fill-foreground` utility from the `@theme inline` block's `--color-foreground` token
   - Recommendation: Also set `fill="currentColor"` as a fallback attribute alongside the className; use `className="text-foreground"` + `fill="currentColor"` as the resilient pattern.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + React Testing Library 16.3.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test -- --run tests/collection/` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-04 | View toggle renders two icon buttons (Table/Gallery) | unit | `npm test -- --run tests/collection/UnitGallery.test.tsx` | Wave 0 |
| UI-04 | Clicking Gallery button switches to gallery view | unit | `npm test -- --run tests/collection/UnitGallery.test.tsx` | Wave 0 |
| UI-04 | Clicking Table button switches back to table view | unit | `npm test -- --run tests/collection/UnitGallery.test.tsx` | Wave 0 |
| UI-04 | Active toggle button has `bg-muted` class | unit | `npm test -- --run tests/collection/UnitGallery.test.tsx` | Wave 0 |
| UI-05 | Gallery card renders unit name | unit | `npm test -- --run tests/collection/UnitGallery.test.tsx` | Wave 0 |
| UI-05 | Gallery card renders faction badge with color_theme | unit | `npm test -- --run tests/collection/UnitGallery.test.tsx` | Wave 0 |
| UI-05 | PaintingRing renders correct percentage text | unit | `npm test -- --run tests/collection/PaintingRing.test.tsx` | Wave 0 |
| UI-05 | PaintingRing has role=img and aria-label | unit | `npm test -- --run tests/collection/PaintingRing.test.tsx` | Wave 0 |
| UI-06 | Switching view mode does not call clearAll | unit | `npm test -- --run tests/collection/UnitGallery.test.tsx` | Wave 0 |
| UI-06 | filteredUnits passed to gallery are the same as those in table | unit | `npm test -- --run tests/collection/UnitGallery.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run tests/collection/`
- **Per wave merge:** `npm test` (full suite — must stay at 219+ passing, 0 failing)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/collection/PaintingRing.test.tsx` — covers UI-05 ring rendering (percentage text, aria-label, role)
- [ ] `tests/collection/UnitGallery.test.tsx` — covers UI-04 (toggle renders, switching, active state) and UI-05 (card content) and UI-06 (filter independence)

*(No new test infrastructure needed — vitest, RTL, jsdom, and setup.ts are all installed and configured.)*

---

## Sources

### Primary (HIGH confidence)
- `src/components/common/useSidebarCollapsed.ts` — localStorage hook template (verified verbatim)
- `src/features/units/CollectionPage.tsx` — integration point; existing handler patterns verified
- `src/features/units/UnitTableColumns.tsx` — faction badge pattern verified
- `src/features/dashboard/FactionSummaryCard.tsx` — role-button keyboard pattern verified
- `src/styles/globals.css` — `--faction-accent`, `--primary`, color tokens verified
- `src/components/ui/card.tsx` — Card default classes verified (gap-6, py-6)
- `src/components/ui/button.tsx` — `variant="ghost" size="icon"` confirmed; `bg-faction-accent` on default variant
- `.planning/phases/12-collection-gallery-view/12-UI-SPEC.md` — full visual contract, PaintingRing spec

### Secondary (MEDIUM confidence)
- `package.json` — lucide-react 0.460.0 confirmed; `LayoutList` and `LayoutGrid` verified present via node runtime check
- `vitest.config.ts` — test environment, include patterns, globals confirmed

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed; versions verified from node_modules
- Architecture: HIGH — all patterns are proven extrapolations of existing code in the project
- Pitfalls: HIGH — all pitfalls derived from actual code behavior observed in earlier phases (Phase 11 matchMedia, Phase 10 cn() class merging)

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (stable stack; no fast-moving dependencies)
