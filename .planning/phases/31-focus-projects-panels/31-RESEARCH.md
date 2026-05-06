# Phase 31: Focus & Projects Panels - Research

**Researched:** 2026-05-06
**Domain:** React component composition, photo thumbnail rendering, conditional prop wiring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Photo Thumbnail in CurrentFocusCard (PANEL-01, PHOTO-01)**
- Left-side square thumbnail (1:1 aspect ratio) at ~80-96px, with metadata stacked vertically to the right
- Photo sourced from `useLatestUnitPhotos()` — same hook already used in UnitGallery
- Metadata layout right of photo: unit name (bold), faction name (muted), model count + points value (tabular-nums), painting progress bar
- Progress bar retains existing `bg-faction-accent` styling and percentage display
- Card retains faction-accent left border (existing `border-l-4` pattern)

**Action Buttons (PANEL-02)**
- Two action buttons on CurrentFocusCard: "Open Unit" and "Log Progress"
- "Open Unit" calls `setSelectedUnitId(unit.id)` — reuses existing DashboardPage pattern
- "Log Progress" opens LogSessionSheet with unit pre-selected via `defaultUnitId` prop
- Add a `defaultUnitId` prop to LogSessionSheet — it already exists (already in the codebase, confirmed)
- Button style: ghost variant, icon + short label — "Open" with ExternalLink icon, "Log" with Paintbrush icon

**ActiveProjectsPanel (PANEL-03)**
- New component: compact rows (not full cards), up to 5 active projects
- Each row: photo thumbnail (~40-48px square), unit name, painting progress percentage, last-updated relative date, two action buttons (Open, Log Session)
- Section header: `text-sm font-semibold uppercase tracking-widest text-muted-foreground` label "Active Projects"
- Data source: `stats.activeProjects` from computeStats (already computed, sorted by updated_at DESC, sliced to 5)
- Panel placement in grid: Claude's discretion based on Phase 30 bento grid structure
- Empty state: muted text with Target icon — "No active projects — mark one in Projects to see it here."

**Photo Fallback Component (PHOTO-02)**
- Extract a shared `UnitThumbnail` component
- Props: `photo: UnitPhotoWithUrl | undefined`, `unit: Unit`, `faction: Faction | undefined`, `size: "sm" | "md"` (sm=40-48px, md=80-96px)
- When photo exists: `<img>` with `object-cover`, `rounded-lg`, `onError` fallback
- When no photo (or error): faction-colored background (`faction.color_theme`) with a Swords icon from lucide-react — `rounded-lg` corners

### Claude's Discretion
- Exact px values for thumbnail sizes within the sm/md ranges
- Gap and spacing within the upgraded CurrentFocusCard layout
- Whether action buttons are inline-right or below the metadata block (responsive breakpoint dependent)
- ActiveProjectsPanel row hover treatment
- Loading skeleton design for the new photo-bearing components
- Whether to show "next action hint" (getNextActionHint) on CurrentFocusCard v2 or drop it in favor of the richer metadata
- Exact relative date format for "last updated" in ActiveProjectsPanel rows

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PANEL-01 | CurrentFocusCard displays unit photo thumbnail (or faction-colored fallback), unit name, faction, model count, and points value | Covered by UnitThumbnail extraction from GalleryCardPhoto + existing card layout patterns |
| PANEL-02 | CurrentFocusCard provides action buttons: Open Unit and Log Progress (opens LogSessionSheet with unit preselected) | `setSelectedUnitId` and `setLogSessionOpen` handlers already exist in DashboardPage; `defaultUnitId` prop already exists in LogSessionSheet |
| PANEL-03 | ActiveProjectsPanel shows up to 5 active painting projects with photo thumbnail, name, progress percentage, last updated, and quick actions | `stats.activeProjects` already sliced to 5, sorted DESC; only new component needed is ActiveProjectsPanel |
| PHOTO-01 | CurrentFocusCard, ActiveProjectsPanel, and RecentActivityFeed display unit photo thumbnails from existing journal photos | `useLatestUnitPhotos()` hook returns `Map<number, UnitPhotoWithUrl>` — wire at DashboardPage level, pass down |
| PHOTO-02 | All photo-bearing dashboard components use a consistent fallback (faction-colored placeholder with icon) when no photo exists | Extract GalleryCardPhoto logic into shared `UnitThumbnail` component in `src/components/common/` |
</phase_requirements>

---

## Summary

Phase 31 is a pure UI composition phase — no new database queries, no new hooks, no migrations. All data needed for both upgraded CurrentFocusCard and new ActiveProjectsPanel already flows through `useDashboardStats()` and `useLatestUnitPhotos()`. The entire implementation is about wiring existing data into new component layouts.

The key architectural work is extracting `GalleryCardPhoto` from `UnitGallery.tsx` into a shared, size-aware `UnitThumbnail` component that both dashboard panels consume. This creates the "consistent photo language" across the dashboard. The `GalleryCardPhoto` logic is already 100% correct — it handles `<img>` render, `onError` fallback, and a styled placeholder div. The only generalization needed is replacing the text-initials fallback with a Swords icon, supporting a `size` prop, and placing the component in `src/components/common/` for cross-feature reuse.

The `LogSessionSheet` already has the `defaultUnitId` prop and matching `useEffect` reset — confirmed by reading the source. No changes needed there. `DashboardPage` already owns the `setLogSessionOpen` and `setSelectedUnitId` handlers — CurrentFocusCard and ActiveProjectsPanel just need to receive them as callbacks.

**Primary recommendation:** Build in this order: (1) UnitThumbnail component, (2) upgrade CurrentFocusCard v2, (3) new ActiveProjectsPanel, (4) wire everything in DashboardPage, (5) update loading skeletons.

---

## Standard Stack

### Core (all already in project — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.x | Component composition | Project stack |
| Lucide React | latest | Icons (ExternalLink, Paintbrush, Swords, Target) | Project icon library |
| TailwindCSS 4 | 4.x | Layout, sizing, responsive classes | Project CSS framework |
| shadcn/ui Card | project | Card surface | Existing card primitive |
| shadcn/ui Button | project | Ghost action buttons | Existing button primitive |
| shadcn/ui Skeleton | project | Loading placeholders | Existing skeleton primitive |

### No new packages needed

All dependencies are already installed. No `npm install` step for Phase 31.

---

## Architecture Patterns

### Recommended File Structure for Phase 31
```
src/
  components/
    common/
      UnitThumbnail.tsx       # NEW — extracted + generalized from GalleryCardPhoto
  features/
    dashboard/
      CurrentFocusCard.tsx    # MODIFY — v2 with photo + metadata + actions
      ActiveProjectsPanel.tsx # NEW — compact project list panel
      DashboardPage.tsx       # MODIFY — wire useLatestUnitPhotos, new panel, callbacks
```

### Pattern 1: UnitThumbnail Component

**What:** Shared photo-or-fallback component with controlled size variant.

**When to use:** Anywhere a unit needs a square thumbnail with guaranteed display.

**Key decisions:**
- `size="sm"` renders at 40-48px (for ActiveProjectsPanel rows)
- `size="md"` renders at 80-96px (for CurrentFocusCard)
- `onError` state flips to fallback — same as GalleryCardPhoto
- Fallback background color: `faction?.color_theme ?? "hsl(var(--muted))"` as inline style
- Fallback icon: `<Swords>` from lucide-react — hobby-thematic, replaces text initials

**Source to extract from:** `src/features/units/UnitGallery.tsx` lines 26-59

**Extraction pattern:**
```typescript
// src/components/common/UnitThumbnail.tsx
import { useState } from "react";
import { Swords } from "lucide-react";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

const SIZE_MAP = {
  sm: { px: "w-11 h-11", icon: 16 },   // 44px — midpoint of 40-48
  md: { px: "w-20 h-20", icon: 24 },   // 80px — bottom of 80-96 range
} as const;

export function UnitThumbnail({
  photo,
  unit,
  faction,
  size,
}: {
  photo: UnitPhotoWithUrl | undefined;
  unit: Unit;
  faction: Faction | undefined;
  size: "sm" | "md";
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const { px, icon } = SIZE_MAP[size];

  if (photo && !imgFailed) {
    return (
      <img
        src={photo.assetUrl}
        alt={`${unit.name} photo`}
        className={`${px} object-cover rounded-lg shrink-0`}
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${px} rounded-lg shrink-0 flex items-center justify-center`}
      style={{ backgroundColor: faction?.color_theme ?? "hsl(var(--muted))" }}
      aria-hidden="true"
    >
      <Swords size={icon} className="text-white/80" />
    </div>
  );
}
```

### Pattern 2: CurrentFocusCard v2

**What:** Upgrade from text-only card to hero card with thumbnail + metadata + action buttons.

**Layout structure:**
```
[border-l-4 faction accent] Card
  Row: [UnitThumbnail md] [metadata block flex-1] [action buttons]
  
  metadata block:
    "Current Focus" label (existing uppercase tracking label)
    unit.name (bold)
    faction.name (muted) + painting progress bar
    model_count · points (tabular-nums muted)

  action buttons (ghost, small):
    ExternalLink "Open"  → onOpen()
    Paintbrush  "Log"   → onLog()
```

**New props to add:**
```typescript
export interface CurrentFocusCardProps {
  unit: Unit | null;
  faction: Faction | undefined;
  photo: UnitPhotoWithUrl | undefined;  // NEW
  onOpen: () => void;                   // NEW — calls setSelectedUnitId(unit.id)
  onLog: () => void;                    // NEW — calls setLogSessionOpen(true) + setLogDefaultUnitId
}
```

**DashboardPage wiring:**
```typescript
// In DashboardPage populated state:
const [logDefaultUnitId, setLogDefaultUnitId] = useState<number | undefined>(undefined);

// Pass to CurrentFocusCard:
<CurrentFocusCard
  unit={focusUnit}
  faction={focusFaction}
  photo={latestPhotos?.get(focusUnit?.id ?? -1)}
  onOpen={() => focusUnit && setSelectedUnitId(focusUnit.id)}
  onLog={() => {
    if (focusUnit) {
      setLogDefaultUnitId(focusUnit.id);
      setLogSessionOpen(true);
    }
  }}
/>

// LogSessionSheet gets defaultUnitId from state:
<LogSessionSheet
  open={logSessionOpen}
  onClose={() => setLogSessionOpen(false)}
  defaultUnitId={logDefaultUnitId}
/>
```

**IMPORTANT:** `LogSessionSheet` already has `defaultUnitId` prop and the `useEffect(() => { if (open) form.reset(buildDefaultValues(defaultUnitId)); }, [open, form, defaultUnitId])` reset pattern. No changes needed to LogSessionSheet itself.

### Pattern 3: ActiveProjectsPanel

**What:** New panel component rendering up to 5 active-project rows.

**Data source:** `stats.activeProjects` — already in `ComputedDashboardStats`, already sorted DESC by `updated_at`, already sliced to 5. No new hook or query needed.

**Row layout:**
```
[UnitThumbnail sm] [name + progress + date flex-1] [Open btn] [Log btn]
```

**Relative date formatting:** `updated_at` is stored as ISO string (`"2026-05-06 00:00:00"`). Use a simple pure function to format as "X days ago" / "today" / "Xh ago". Do NOT import a date library — the project already has `src/lib/dates.ts` and the pattern is to add pure utility functions there.

**Recommended relative date function:**
```typescript
// In ActiveProjectsPanel.tsx (co-located, or add to src/lib/dates.ts)
function relativeDate(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString.replace(" ", "T")); // SQLite format fix
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}
```

**Note on SQLite date format:** `updated_at` is stored as `"2026-05-06 00:00:00"` (space separator, not `T`). `new Date("2026-05-06 00:00:00")` parses correctly in V8/Chrome but the safest approach is to replace the space with `T` before parsing.

**Props:**
```typescript
interface ActiveProjectsPanelProps {
  projects: Unit[];
  factions: Faction[];
  latestPhotos: Map<number, UnitPhotoWithUrl> | undefined;
  onOpen: (unitId: number) => void;
  onLog: (unitId: number) => void;
}
```

**Placement in grid:** Phase 30 bento grid has a left column (wider, 3fr) and right column (narrower, 2fr). CurrentFocusCard spans full width (col-span-full). ActiveProjectsPanel should go in the right column below the Recent Activity Feed or as a replacement section in the right column — Claude's discretion based on what Phase 30 implements. The safe default is to place it in the right column as a new section.

### Pattern 4: DashboardPage wiring

**New state to add:**
```typescript
const [logDefaultUnitId, setLogDefaultUnitId] = useState<number | undefined>(undefined);
```

**New hook to call:**
```typescript
// Already typed and exported — just needs to be called in DashboardPage
import { useLatestUnitPhotos } from "@/hooks/useUnitPhotos";
const { data: latestPhotos } = useLatestUnitPhotos();
```

**Skeleton updates:** Loading and error branches use hardcoded skeletons — add a skeleton for the new panel area. For CurrentFocusCard, the existing `Skeleton className="col-span-full h-28"` can grow to `h-36` to account for the taller photo layout.

### Anti-Patterns to Avoid

- **Nesting LogSessionSheet inside CurrentFocusCard or ActiveProjectsPanel:** Violates the sibling portal contract. Sheets MUST be top-level siblings in DashboardPage. Pass `onLog` callbacks down — never mount sheets inside panels.
- **Calling `useLatestUnitPhotos()` inside CurrentFocusCard or ActiveProjectsPanel:** This would create duplicate React Query fetches. Call the hook once in DashboardPage, pass the Map as a prop.
- **Using `setImgFailed` across renders by re-using the same `UnitThumbnail` instance:** Each UnitThumbnail instance has its own `imgFailed` state — this is correct. Do not hoist the error state.
- **Parsing SQLite date string without the `replace(" ", "T")` fix:** `new Date("2026-05-06 00:00:00")` may parse as UTC or local depending on environment. Use the replace before constructing the Date.
- **Deriving focusFaction inside CurrentFocusCard:** The existing pattern is `factionById(focusUnit.faction_id)` in DashboardPage and pass it down. Do not look up factions inside the card.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Photo + fallback display | Custom one-off inline fallback in each panel | `UnitThumbnail` shared component | DRY, consistent visual language, PHOTO-02 requires it |
| Relative time formatting | Full date-fns or dayjs import | Simple pure function (< 10 lines) | No library needed; project avoids unnecessary deps; date-fns would add ~20KB |
| Unit picker pre-selection in LogSessionSheet | Re-engineer picker | `defaultUnitId` prop + existing `useEffect` reset | Already implemented and confirmed in source |
| Loading state for photos | Custom loading spinner | Skeleton from shadcn/ui | Consistent with project skeleton pattern |

**Key insight:** Everything needed for Phase 31 is already in the codebase. The risk is over-engineering — this phase is about composing existing pieces, not building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Sibling portal violation
**What goes wrong:** Mounting LogSessionSheet inside CurrentFocusCard or ActiveProjectsPanel causes Radix `Portal` nesting issues — the sheet may not overlay correctly or may fail to unmount.
**Why it happens:** It feels natural to co-locate the trigger and the sheet.
**How to avoid:** All Sheets live at DashboardPage level as siblings. Pass `onOpen` / `onLog` callbacks from DashboardPage down to panels. This is the established pattern (see DashboardPage.tsx comments "Pitfall 1").
**Warning signs:** Sheet renders inside a grid cell rather than full-screen.

### Pitfall 2: Duplicate `useLatestUnitPhotos()` calls
**What goes wrong:** Calling `useLatestUnitPhotos()` in CurrentFocusCard AND ActiveProjectsPanel results in two separate React Query instances, each with their own appDataDir() resolution, doubling async file path work.
**Why it happens:** Encapsulating data fetching inside components feels right.
**How to avoid:** Call `useLatestUnitPhotos()` once in DashboardPage. Pass `latestPhotos: Map<number, UnitPhotoWithUrl> | undefined` as a prop to both panels.
**Warning signs:** Network/file requests firing multiple times for the same LATEST_UNIT_PHOTOS_KEY query.

### Pitfall 3: `logDefaultUnitId` stale across opens
**What goes wrong:** If `logDefaultUnitId` state is not reset between opens, opening "Log" from the header button (no pre-selected unit) may still show a stale unit pre-selected.
**Why it happens:** React state persists between renders; if the user clicks the header "Log Session" button after clicking "Log" on a unit, the old `defaultUnitId` is still in state.
**How to avoid:** The existing `useEffect` in LogSessionSheet resets form defaults on every `open` change using `defaultUnitId`. The key is that closing and reopening the sheet via the header button should pass `defaultUnitId={undefined}`, not the last unit's id. Set `logDefaultUnitId` back to `undefined` in the header's `onClose` handler or in the panel's onClose.
**Warning signs:** Opening Log Session from the header always shows the last-clicked unit pre-selected.

### Pitfall 4: SQLite date string parsing
**What goes wrong:** `updated_at` is `"2026-05-06 00:00:00"` (space separator). In some JS environments `new Date("2026-05-06 00:00:00")` returns `Invalid Date`.
**Why it happens:** ISO 8601 requires `T` as the datetime separator. SQLite uses a space.
**How to avoid:** `.replace(" ", "T")` before constructing `new Date(...)`.
**Warning signs:** "NaN days ago" in relative date display.

### Pitfall 5: `unit.model_count` and `unit.points` are nullable
**What goes wrong:** Displaying `unit.model_count` and `unit.points` directly throws when they are `null`. TypeScript marks both as `number | null`.
**Why it happens:** The schema allows null for optional fields.
**How to avoid:** Use nullish coalescing — `unit.model_count ?? "—"` and `unit.points ?? "—"`. This pattern is already used in UnitGallery.tsx line 157.
**Warning signs:** "null pts" or "null models" displayed in the card.

### Pitfall 6: UnitThumbnail size mismatch between sm and md
**What goes wrong:** Using the same CSS classes for both sm and md sizes looks wrong in context — md thumbnail needs more visual weight, sm needs to not dominate a compact row.
**Why it happens:** Forgetting to apply the SIZE_MAP correctly.
**How to avoid:** Encapsulate size classes in the SIZE_MAP const inside UnitThumbnail — do not derive them at call sites.

---

## Code Examples

Verified patterns from existing codebase:

### Faction-colored placeholder (from GalleryCardPhoto, lines 49-58)
```typescript
// Source: src/features/units/UnitGallery.tsx:49-58
<div
  className="w-full aspect-square bg-panel-surface flex items-center justify-center"
  style={factionColor ? { borderTop: `4px solid ${factionColor}` } : undefined}
>
  <span className="text-lg font-semibold text-muted-foreground" aria-hidden="true">
    {unit.name.slice(0, 2).toUpperCase()}
  </span>
</div>
// Phase 31: replace text with Swords icon, change to full background color, add size variant
```

### LogSessionSheet defaultUnitId (already implemented)
```typescript
// Source: src/features/dashboard/LogSessionSheet.tsx:75-88
export function LogSessionSheet({ open, onClose, defaultUnitId }: LogSessionSheetProps) {
  // ...
  useEffect(() => {
    if (open) form.reset(buildDefaultValues(defaultUnitId));
  }, [open, form, defaultUnitId]);
  // ...
}
// No changes needed — already accepts defaultUnitId
```

### setSelectedUnitId pattern (from DashboardPage)
```typescript
// Source: src/features/dashboard/DashboardPage.tsx:61,92
const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
const handleUnitIdClick = (unitId: number) => setSelectedUnitId(unitId);
// Phase 31: pass setSelectedUnitId directly or via handleUnitIdClick as onOpen prop
```

### Dashboard section header pattern
```typescript
// Source: src/features/dashboard/DashboardPage.tsx:290,319
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
  Active Projects
</p>
```

### Ghost button with icon pattern
```typescript
// From PageHeader and FactionSummaryCard patterns
<Button variant="ghost" size="sm" onClick={onOpen}>
  <ExternalLink size={14} className="mr-1.5" aria-hidden />
  Open
</Button>
<Button variant="ghost" size="sm" onClick={onLog}>
  <Paintbrush size={14} className="mr-1.5" aria-hidden />
  Log
</Button>
```

### Tabular-nums metadata display (from UnitGallery line 157)
```typescript
// Source: src/features/units/UnitGallery.tsx:157
<span className="text-xs text-muted-foreground tabular-nums">
  {unit.painting_percentage ?? 0}% · {unit.model_count ?? "—"} models · {unit.points ?? "—"} pts
</span>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline photo fallback per component | Shared UnitThumbnail | Phase 31 | PHOTO-02: consistent visual language |
| CurrentFocusCard text-only | CurrentFocusCard with photo hero | Phase 31 | PANEL-01/02: at-a-glance unit status |
| No dashboard project list | ActiveProjectsPanel (up to 5 rows) | Phase 31 | PANEL-03: surfaces active work |

**Note on `getNextActionHint`:** The CONTEXT.md marks it as Claude's discretion whether to include it in v2. Given the card now has model count, points, progress bar AND action buttons, the "Next:" hint adds redundancy. Recommend dropping it from v2 to reduce cognitive load — the "Log" button implies "take action now". Document this decision in the plan wave.

---

## Open Questions

1. **Phase 30 grid placement for ActiveProjectsPanel**
   - What we know: Phase 30 uses `lg:grid-cols-[3fr_2fr]` with full-width sections (PageHeader, FocusCard, StatCards, Pipeline) and a two-column lower area (left: Hobby Health + By Faction; right: Recent Activity)
   - What's unclear: Phase 30 is not yet planned — the exact grid cell structure is not finalized
   - Recommendation: Place ActiveProjectsPanel in the right column below or replacing the Recent Activity section, or add it as a new full-width section below the pipeline. If Phase 30 leaves the two-column area unchanged, put ActiveProjectsPanel in the right column above RecentActivityFeed.

2. **Whether to show `getNextActionHint` in CurrentFocusCard v2**
   - What we know: The hint is a one-liner computed from `status_painting` (e.g., "Apply primer")
   - What's unclear: Does it add value alongside a full action button row, or is it redundant noise?
   - Recommendation: Drop it in v2. The "Log" button is a stronger CTA. CONTEXT.md marks this as Claude's discretion.

3. **`logDefaultUnitId` state reset timing**
   - What we know: LogSessionSheet resets on `open` change using the `defaultUnitId` prop
   - What's unclear: Should `logDefaultUnitId` be reset to `undefined` when the sheet closes, to prevent accidental pre-selection on the next header-triggered open?
   - Recommendation: Yes — in the `onClose` handler for LogSessionSheet in DashboardPage, reset `logDefaultUnitId` to `undefined`. Simple and prevents the stale state pitfall.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest config inline) |
| Quick run command | `pnpm test -- tests/dashboard/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PANEL-01 | CurrentFocusCard renders photo thumbnail when photo exists | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.ts` | ❌ Wave 0 |
| PANEL-01 | CurrentFocusCard renders faction-colored fallback when no photo | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.ts` | ❌ Wave 0 |
| PANEL-01 | CurrentFocusCard shows model_count and points (null-safe) | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.ts` | ❌ Wave 0 |
| PANEL-02 | "Open" button calls onOpen callback | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.ts` | ❌ Wave 0 |
| PANEL-02 | "Log" button calls onLog callback | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.ts` | ❌ Wave 0 |
| PANEL-03 | ActiveProjectsPanel renders up to 5 rows | unit | `pnpm test -- tests/dashboard/ActiveProjectsPanel.test.ts` | ❌ Wave 0 |
| PANEL-03 | ActiveProjectsPanel shows empty state when no projects | unit | `pnpm test -- tests/dashboard/ActiveProjectsPanel.test.ts` | ❌ Wave 0 |
| PANEL-03 | Each row shows progress percentage | unit | `pnpm test -- tests/dashboard/ActiveProjectsPanel.test.ts` | ❌ Wave 0 |
| PHOTO-01 | UnitThumbnail renders img tag when photo provided | unit | `pnpm test -- tests/dashboard/UnitThumbnail.test.ts` | ❌ Wave 0 |
| PHOTO-02 | UnitThumbnail renders fallback div when no photo | unit | `pnpm test -- tests/dashboard/UnitThumbnail.test.ts` | ❌ Wave 0 |
| PHOTO-02 | UnitThumbnail fallback uses faction color_theme | unit | `pnpm test -- tests/dashboard/UnitThumbnail.test.ts` | ❌ Wave 0 |
| PHOTO-02 | UnitThumbnail onError flips to fallback | unit | `pnpm test -- tests/dashboard/UnitThumbnail.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/dashboard/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dashboard/UnitThumbnail.test.ts` — covers PHOTO-01, PHOTO-02
- [ ] `tests/dashboard/CurrentFocusCard.test.ts` — covers PANEL-01, PANEL-02
- [ ] `tests/dashboard/ActiveProjectsPanel.test.ts` — covers PANEL-03

Note: Tauri APIs (`convertFileSrc`, `appDataDir`) must be mocked in tests. Use `vi.mock("@tauri-apps/api/core")` and `vi.mock("@tauri-apps/api/path")`. See `tests/collection/unitPhotoLatest.test.ts` for the established mock pattern (`vi.mock("@/db/client")`). React Query hooks passed as props are easier to test than hooks called directly — the prop-passing architecture of Phase 31 makes component tests straightforward (no QueryClient setup needed for unit-level tests).

---

## Sources

### Primary (HIGH confidence)
- `src/features/dashboard/CurrentFocusCard.tsx` — full source read; existing layout, props, and patterns confirmed
- `src/features/dashboard/DashboardPage.tsx` — full source read; handler names, state variables, sibling portal pattern confirmed
- `src/features/dashboard/LogSessionSheet.tsx` — full source read; `defaultUnitId` prop already exists and is correctly wired
- `src/features/units/UnitGallery.tsx` — full source read; `GalleryCardPhoto` extraction candidate confirmed (lines 26-59)
- `src/hooks/useUnitPhotos.ts` — full source read; `useLatestUnitPhotos()` return type and key confirmed
- `src/features/dashboard/computeStats.ts` — full source read; `activeProjects` already computed, sorted, sliced to 5
- `src/types/unit.ts` — confirmed `model_count: number | null`, `points: number | null`, `updated_at: string`
- `src/types/faction.ts` — confirmed `color_theme: string` (always present, not nullable)
- `.planning/phases/31-focus-projects-panels/31-CONTEXT.md` — all locked decisions
- `.planning/phases/30-grid-layout-foundation/30-CONTEXT.md` — grid structure this phase builds within

### Secondary (MEDIUM confidence)
- `tests/dashboard/computeStats.test.ts` — establishes `u()` builder pattern for unit fixtures
- `tests/collection/unitPhotoLatest.test.ts` — establishes Tauri mock pattern for photo-related tests

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, confirmed by direct file reads
- Architecture: HIGH — implementation patterns fully grounded in existing source code; no guesswork
- Component shapes: HIGH — all props, handlers, and data flow confirmed from live source
- LogSessionSheet defaultUnitId: HIGH — confirmed already implemented in source (no changes needed)
- Pitfalls: HIGH — derived from existing code comments, established patterns in codebase
- Test architecture: HIGH — existing test files confirm mock patterns and file structure

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (stable domain — no external dependencies, all internal)
