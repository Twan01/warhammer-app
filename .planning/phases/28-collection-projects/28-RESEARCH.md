# Phase 28: Collection + Projects - Research

**Researched:** 2026-05-05
**Domain:** React component enrichment — photo thumbnails, status badge unification, kanban card metadata, Log Session shortcut
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Batch query, not N+1: `getLatestPhotoByUnit()` uses a MAX(id) subquery in `src/db/queries/unitPhotos.ts`; returns `UnitPhoto[]`; caller builds `Map<number, UnitPhoto>`
- `useLatestUnitPhotos()` hook in `src/hooks/useUnitPhotos.ts`, query key `['unit-photos', 'latest']`, returns `Map<number, UnitPhotoWithUrl>`
- `CollectionPage` fetches and passes the Map to `UnitGallery`; `UnitTable` does not receive it
- Cache invalidation: invalidate `['unit-photos', 'latest']` on `useCreateUnitPhoto` and `useDeleteUnitPhoto` settled
- Gallery card top area becomes a 1:1 square photo thumbnail (`object-cover`, `loading="lazy"`)
- No-photo placeholder: `bg-panel-surface` square, `border-top-4` accent in faction color, unit initials centered
- `PaintingRing` SVG removed from gallery cards; replaced by `StatusBadge` + 2px progress bar
- Gallery card body: unit name, faction badge, `StatusBadge`, painting_percentage text (tabular-nums)
- Sort order unchanged: alphabetical by name (Phase 12 locked)
- Grid responsive columns unchanged: 2–4 columns
- `StatusPopover` display replaced by `StatusBadge` in `UnitTableColumns.tsx`; edit interaction (Popover with status list) preserved
- Batch recipe lookup: `getRecipeNamesByUnitIds(unitIds: number[])` in `src/db/queries/recipes.ts`
- Batch photo count: `getPhotoCountsByUnitIds(unitIds: number[])` in `src/db/queries/unitPhotos.ts`
- `useKanbanEnrichment(unitIds: number[])` in `src/hooks/useKanbanEnrichment.ts`; query key `['kanban-enrichment', ...unitIds.sort()]`
- Last-updated: derived from `unit.updated_at` via `formatRelativeTime()` — no extra query
- Kanban metadata row: last-updated ("2d ago"), recipe name (only when linked, truncated ~20 chars), photo count (Camera icon + count, only when count > 0)
- Next-action hint: `getNextActionHint(unit.status_painting)` from `src/features/dashboard/getNextActionHint.ts`; hidden when status is "Completed"
- Log Session shortcut: `Paintbrush` icon button (`size={14}`) in card top-right, always visible; opens `LogSessionSheet` pre-populated with `defaultUnitId`
- `LogSessionSheet` extended with optional `defaultUnitId?: number` prop; `buildDefaultValues(defaultUnitId)` pattern
- `LogSessionSheet` mounted as sibling in `PaintingProjectsPage`; state: `logSessionUnitId: number | null`
- `MAX(id)` not `MAX(taken_at)` for latest photo (taken_at is nullable)
- Recipe name only shown when `painting_recipes.unit_id` matches the kanban unit — faction-wide recipes (unit_id IS NULL) excluded
- Gallery card photo fallback chain: real photo → faction-colored placeholder with initials → generic muted placeholder

### Claude's Discretion
- Exact SQL for batch queries (IN-clause vs subquery; whether to use a CTE)
- Whether StatusPopover is refactored internally or replaced with a new StatusBadge+Popover wrapper
- Gallery card exact spacing/padding between photo area and info section
- Whether `useKanbanEnrichment` uses `Promise.all` inside queryFn or two separate queries merged
- Photo thumbnail fallback behavior if the file is missing on disk (broken image vs placeholder)
- Whether to show recipe "area" alongside recipe name on kanban card or just the name
- KanbanCard metadata row exact layout (single row flex-wrap vs two rows)

### Deferred Ideas (OUT OF SCOPE)
None — all decisions stay within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COLL-01 | Collection gallery cards display a photo thumbnail sourced from the unit's most recent journal photo when one exists, or a faction-colored placeholder | Batch query pattern confirmed; `image_assets` schema verified; `convertFileSrc` + `appDataDir` pattern established in `useUnitPhotos.ts` |
| COLL-02 | Collection gallery cards and table rows use the unified `StatusBadge` for painting status display | `StatusBadge` component confirmed at `src/components/ui/status-badge.tsx`; `StatusPopover` internals verified — wrapping is straightforward |
| PROJ-01 | Painting project kanban cards show last-updated date, linked recipe name (if linked), and journal photo count | Batch query patterns confirmed; `recipes.ts` schema verified (`unit_id` nullable FK); `image_assets` grouping pattern established |
| PROJ-02 | Each kanban card shows a next-action hint derived from current painting stage | `getNextActionHint()` confirmed at `src/features/dashboard/getNextActionHint.ts`; all 11 statuses covered; "Completed" hint identified for suppression |
| PROJ-03 | User can open a Log Session sheet directly from a kanban card shortcut | `LogSessionSheet` internals verified; `buildDefaultValues()` pattern confirmed; sibling portal pattern established |
</phase_requirements>

---

## Summary

Phase 28 is purely additive UI enrichment — no new database tables, no new routes. Every piece of data needed already exists; the work is writing efficient batch queries to fetch it without N+1 problems, threading the data through the component hierarchy, and updating card layouts.

The three work streams are independent and can be planned as separate waves. The gallery photo stream (COLL-01) and the table StatusBadge stream (COLL-02) both affect `CollectionPage` and its children. The kanban enrichment streams (PROJ-01, PROJ-02, PROJ-03) affect `PaintingProjectsPage` and `KanbanCard`. There is no cross-stream data dependency.

All reusable assets are confirmed present: `StatusBadge` (Phase 25), `getNextActionHint()` (Phase 26), `formatRelativeTime()` (Phase 26), `LogSessionSheet` (Phase 26). The only new query code is three batch functions and two new hooks.

**Primary recommendation:** Plan in two waves — Wave 1 builds query functions and hooks (pure, testable, no UI); Wave 2 wires them into components and updates layouts. This keeps each wave reviewable in isolation.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/api` | installed | `convertFileSrc`, `appDataDir`, `join` for photo URL resolution | Already used in `useUnitPhotos.ts` — same pattern |
| `@tanstack/react-query` | installed | `useQuery` for batch hooks | All data hooks follow this pattern |
| `lucide-react` | installed | `Camera`, `Paintbrush` icons | Project icon library |
| `@dnd-kit/sortable` | installed | `useSortable` in KanbanCard — must not break | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tauri-plugin-sql` | installed | Parameterized `$1, $2` queries | All DB access |

### Alternatives Considered
None — the stack is locked. All new code follows existing patterns.

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
src/
  db/queries/
    unitPhotos.ts        # + getLatestPhotoByUnit(), getPhotoCountsByUnitIds()
    recipes.ts           # + getRecipeNamesByUnitIds()
  hooks/
    useUnitPhotos.ts     # + useLatestUnitPhotos()
    useKanbanEnrichment.ts  # new file
  features/
    units/
      UnitGallery.tsx    # photo hero + StatusBadge + remove PaintingRing
      UnitTableColumns.tsx # StatusPopover → StatusBadge trigger
      CollectionPage.tsx # + useLatestUnitPhotos call
    painting-projects/
      KanbanCard.tsx     # metadata row + next-action hint + Log Session button
      KanbanBoard.tsx    # pass enrichment Map to KanbanColumn/KanbanCard
      KanbanColumn.tsx   # pass per-card enrichment props through
      PaintingProjectsPage.tsx # + useKanbanEnrichment + LogSessionSheet sibling
    dashboard/
      LogSessionSheet.tsx # + defaultUnitId prop
```

### Pattern 1: Batch Query + Map (confirmed from Phase 18 battle log)
**What:** Fetch all needed rows in one SQL query, build a `Map<number, T>` in the caller for O(1) lookup per card.
**When to use:** Any time a list-level component needs per-item data from a related table.
**Example:**
```typescript
// src/db/queries/unitPhotos.ts — getLatestPhotoByUnit()
// Returns UnitPhoto[] — one row per unit that has at least one photo
// Caller: const map = new Map(rows.map(r => [r.entity_id, r]))
export async function getLatestPhotoByUnit(): Promise<UnitPhoto[]> {
  const db = await getDb();
  return db.select<UnitPhoto[]>(
    `SELECT ia.* FROM image_assets ia
     INNER JOIN (
       SELECT entity_id, MAX(id) as max_id
       FROM image_assets WHERE entity_type = 'unit'
       GROUP BY entity_id
     ) latest ON ia.id = latest.max_id`
  );
}
```

### Pattern 2: IN-clause Batch Query (for known unit ID list)
**What:** Pass sorted unit IDs as a dynamic IN clause; return flat rows; caller builds Map.
**When to use:** Kanban enrichment — unit IDs are known at query time from the active projects list.
**Critical constraint:** `tauri-plugin-sql` uses `$1, $2` positional syntax. There is no array-binding support. You must build the IN clause dynamically:
```typescript
// src/db/queries/recipes.ts — getRecipeNamesByUnitIds()
export async function getRecipeNamesByUnitIds(
  unitIds: number[]
): Promise<{ unit_id: number; name: string }[]> {
  if (unitIds.length === 0) return [];
  const db = await getDb();
  const placeholders = unitIds.map((_, i) => `$${i + 1}`).join(", ");
  return db.select(
    `SELECT unit_id, name FROM painting_recipes WHERE unit_id IN (${placeholders})`,
    unitIds
  );
}

// src/db/queries/unitPhotos.ts — getPhotoCountsByUnitIds()
export async function getPhotoCountsByUnitIds(
  unitIds: number[]
): Promise<{ entity_id: number; photo_count: number }[]> {
  if (unitIds.length === 0) return [];
  const db = await getDb();
  const placeholders = unitIds.map((_, i) => `$${i + 1}`).join(", ");
  return db.select(
    `SELECT entity_id, COUNT(*) as photo_count
     FROM image_assets
     WHERE entity_type = 'unit' AND entity_id IN (${placeholders})
     GROUP BY entity_id`,
    unitIds
  );
}
```

### Pattern 3: Hook with Parallel Sub-queries
**What:** `useKanbanEnrichment` fetches recipe names and photo counts in parallel via `Promise.all`.
**When to use:** Multiple independent batch queries needed in a single hook.
**Example:**
```typescript
// src/hooks/useKanbanEnrichment.ts
export interface KanbanEnrichment {
  recipeNames: Map<number, string>;
  photoCounts: Map<number, number>;
}

export const KANBAN_ENRICHMENT_KEY = (unitIds: number[]) =>
  ["kanban-enrichment", ...unitIds] as const;

export function useKanbanEnrichment(unitIds: number[]) {
  const sortedIds = [...unitIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: KANBAN_ENRICHMENT_KEY(sortedIds),
    queryFn: async (): Promise<KanbanEnrichment> => {
      const [recipeRows, photoRows] = await Promise.all([
        getRecipeNamesByUnitIds(sortedIds),
        getPhotoCountsByUnitIds(sortedIds),
      ]);
      return {
        recipeNames: new Map(recipeRows.map((r) => [r.unit_id, r.name])),
        photoCounts: new Map(photoRows.map((r) => [r.entity_id, r.photo_count])),
      };
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
```

### Pattern 4: Photo URL Resolution (confirmed from `useUnitPhotos.ts`)
**What:** `appDataDir()` resolved once per hook; `convertFileSrc(join(appDir, file_path))` per photo.
**When to use:** Any hook that delivers photo URLs to `<img src>` tags.
**Example:**
```typescript
// useLatestUnitPhotos — same pattern as useUnitPhotos, but for batch Map
const rows = await getLatestPhotoByUnit();
const appDir = await appDataDir();
const withUrls = await Promise.all(
  rows.map(async (row) => {
    const absolute = await join(appDir, row.file_path);
    return { ...row, assetUrl: convertFileSrc(absolute) };
  })
);
return new Map(withUrls.map((r) => [r.entity_id, r]));
```

### Pattern 5: LogSessionSheet defaultUnitId extension
**What:** Add optional `defaultUnitId?: number` prop; update `buildDefaultValues` to accept it; respect in `useEffect([open])` reset.
**Example:**
```typescript
// buildDefaultValues updated signature:
function buildDefaultValues(defaultUnitId?: number): LogSessionFormValues {
  return {
    unit_id: defaultUnitId ?? 0,
    session_date: todayISO(),
    duration_minutes: 30,
    notes: null,
  };
}

// Props extended:
interface LogSessionSheetProps {
  open: boolean;
  onClose: () => void;
  defaultUnitId?: number;  // new
}

// useEffect reset updated:
useEffect(() => {
  if (open) form.reset(buildDefaultValues(defaultUnitId));
}, [open, form, defaultUnitId]);
```

### Pattern 6: StatusBadge as StatusPopover Trigger
**What:** Preserve all edit logic in `StatusPopover`; replace the internal `<Badge variant="outline">` trigger with `<StatusBadge>`.
**When to use:** COLL-02 — upgrades visual display while keeping edit UX identical.
**Example:**
```typescript
// In StatusPopover.tsx — replace trigger child only:
<PopoverTrigger asChild>
  <button type="button" onClick={(e) => e.stopPropagation()} ...>
    <StatusBadge status={unit.status_painting} />  {/* was: <Badge variant="outline">{unit.status_painting}</Badge> */}
  </button>
</PopoverTrigger>
```
This approach requires zero changes to `UnitTableColumns.tsx` — the column already renders `<StatusPopover unit={row.original} />`.

### Pattern 7: Sibling Portal (Log Session in PaintingProjectsPage)
**What:** `LogSessionSheet` mounted as a top-level sibling, never nested inside `KanbanBoard` or `KanbanCard`. State held at page level.
**Example:**
```typescript
// PaintingProjectsPage additions:
const [logSessionUnitId, setLogSessionUnitId] = useState<number | null>(null);

// In JSX:
<LogSessionSheet
  open={logSessionUnitId !== null}
  onClose={() => setLogSessionUnitId(null)}
  defaultUnitId={logSessionUnitId ?? undefined}
/>
```

### Anti-Patterns to Avoid
- **N+1 photo queries inside UnitGallery map:** each card calling `useUnitPhotos(unit.id)` independently — fetches one SQL query per card. Use the batch hook instead.
- **Nesting LogSessionSheet inside KanbanCard or KanbanBoard:** Radix portals must not be nested. The sibling pattern is project law (STATE.md).
- **Truthy check on `enabled` for photo map:** `Map.size === 0` is valid and must not suppress re-renders. Use `enabled: sortedIds.length > 0`.
- **Mutable query key for kanban enrichment:** dnd-kit reorders cards during drag; if the key uses insertion order rather than sorted IDs, React Query treats each reorder as a new key and re-fetches. Sort IDs before building the key.
- **String concatenation for IN clause:** `WHERE entity_id IN (${unitIds.join(',')})` is SQL injection. Use positional parameters: `$1, $2, ...`.
- **Broken image visible to user:** `<img>` with an invalid `asset://` URL shows the browser's broken image icon. Handle `onError` on the `<img>` to swap to the placeholder.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time formatting | Custom "2d ago" logic | `formatRelativeTime()` from `src/features/dashboard/relativeTime.ts` | Already handles SQLite space-separator pitfall (UTC normalization) |
| Next-action hint text | Custom status → hint map | `getNextActionHint()` from `src/features/dashboard/getNextActionHint.ts` | Exhaustive over all 11 statuses, already tested conceptually |
| Photo URL conversion | Custom file:// handling | `convertFileSrc(await join(appDataDir(), file_path))` | Tauri asset:// protocol required; raw file:// blocked by CSP |
| Painting status color tiers | Custom color map | `PAINTING_STATUS_TIER` + `StatusBadge` from `@/components/ui/status-badge` | 4-tier system defined in Phase 25 |
| Status edit interaction | New status picker | Extend existing `StatusPopover` | Existing component has optimistic update + rollback already wired |

**Key insight:** This phase has zero new business logic. Every computation needed already exists. The work is plumbing — new query functions, two hooks, and component prop threading.

---

## Common Pitfalls

### Pitfall 1: taken_at is nullable — use MAX(id) for latest photo
**What goes wrong:** `MAX(taken_at)` returns NULL when taken_at is NULL (user did not set a date on upload), making the subquery join fail to match and returning no photo.
**Why it happens:** `taken_at` is nullable by design (migration 005). `id` is always monotonically increasing and non-null.
**How to avoid:** Use `MAX(id) as max_id` in the subquery. This is explicitly locked in CONTEXT.md §Specifics.
**Warning signs:** Gallery cards showing placeholders even when photos exist; confirmed by testing with a unit where taken_at IS NULL.

### Pitfall 2: Mutable query key causes re-fetch on drag
**What goes wrong:** `['kanban-enrichment', ...unitIds]` built from the order units appear on the board. When dnd-kit reorders cards, the array order changes, creating a new cache key and triggering a new fetch mid-drag.
**Why it happens:** React Query treats array keys by value equality in order.
**How to avoid:** Sort unitIds before building the query key: `[...unitIds].sort((a, b) => a - b)`. The hook already receives the sorted IDs; the key must also be sorted.
**Warning signs:** Network requests firing during drag operations; metadata flickering on drop.

### Pitfall 3: SQLite parameterized IN clause — no array binding
**What goes wrong:** Passing an array directly as a single parameter to `db.select("... IN ($1)", [unitIds])` does not work in tauri-plugin-sql. It produces a type error or empty results.
**Why it happens:** Positional parameters are scalar only in tauri-plugin-sql.
**How to avoid:** Build the placeholder string dynamically: `unitIds.map((_, i) => \`$${i + 1}\`).join(', ')`. Guard with `if (unitIds.length === 0) return []` before constructing the query.
**Warning signs:** Empty Maps returned from enrichment hook even when recipes/photos exist.

### Pitfall 4: LogSessionSheet useEffect dependency array
**What goes wrong:** `useEffect(() => { if (open) form.reset(buildDefaultValues(defaultUnitId)); }, [open, form])` omits `defaultUnitId` from deps. If the user opens the sheet for unit A, closes it, then opens it for unit B without remounting, `defaultUnitId` is stale and unit A is pre-selected.
**Why it happens:** React hooks exhaustive-deps rule; the existing sheet had no `defaultUnitId` so this wasn't an issue before.
**How to avoid:** Add `defaultUnitId` to the `useEffect` dependency array.
**Warning signs:** TypeScript strict mode does not catch this; only observable at runtime when switching between cards quickly.

### Pitfall 5: Broken img src vs placeholder — onerror handling
**What goes wrong:** `<img src={assetUrl}>` with a file that was deleted from disk shows the browser's broken-image icon inside the thumbnail area, breaking the card layout.
**Why it happens:** `convertFileSrc` always returns a URL — it cannot check disk existence. The URL resolves to an asset:// path that 404s if the file is gone.
**How to avoid:** Add `onError` handler to the `<img>`: `onError={(e) => { e.currentTarget.style.display = 'none'; /* show placeholder */ }}` — or track error state in local state and conditionally render placeholder.
**Warning signs:** Card thumbnails showing broken-image icons during testing if test photos were deleted.

### Pitfall 6: DnD interaction broken by new button in KanbanCard
**What goes wrong:** The Log Session `Paintbrush` button added to the card top-right interferes with drag initiation because the card spreads `{...listeners}` from `useSortable`, making the entire card a drag handle.
**Why it happens:** `KanbanCard` applies `{...listeners}` to the outer `<Card>`. Click events on child buttons propagate to the drag listener.
**How to avoid:** The existing `KanbanCardActions` button already uses `e.stopPropagation()` on its `onClick` and the `PopoverContent`. Apply the same pattern to the new Paintbrush button — `onClick={(e) => { e.stopPropagation(); onLogSession(); }}`.
**Warning signs:** Clicking the Log Session button initiates a drag instead of opening the sheet.

### Pitfall 7: buildDefaultValues must not use Zod .default()
**What goes wrong:** Using `zod .default()` in `logSessionSchema` breaks react-hook-form's `zodResolver` type inference.
**Why it happens:** Documented in STATE.md as Pitfall 8 from Phase 26 — zod v4 .default() incompatibility.
**How to avoid:** Keep `buildDefaultValues(defaultUnitId?: number)` as the sole defaults source. Do not touch the schema.

### Pitfall 8: Gallery skeleton cards need height placeholder for photo area
**What goes wrong:** Skeleton cards in `UnitGallery` currently show `<Skeleton className="h-24 w-24 rounded-full" />` (for PaintingRing). After replacing PaintingRing with a square photo area, the skeleton must also become a square to prevent layout shift when real cards load.
**Why it happens:** The skeleton layout must mirror the real card layout.
**How to avoid:** Update skeleton to `<Skeleton className="w-full aspect-square rounded-t-lg" />` to match the new hero photo area.

---

## Code Examples

### Gallery Card: Photo Hero + StatusBadge layout
```typescript
// UnitGallery.tsx — per-card rendering
const photo = latestPhotos?.get(unit.id); // Map<number, UnitPhotoWithUrl>
const faction = factionMap.get(unit.faction_id);

// Photo area:
{photo ? (
  <img
    src={photo.assetUrl}
    alt={`${unit.name} photo`}
    className="w-full aspect-square object-cover rounded-t-lg"
    loading="lazy"
  />
) : (
  <div
    className="w-full aspect-square rounded-t-lg bg-panel-surface flex items-center justify-center"
    style={{ borderTop: `4px solid ${faction?.color_theme ?? 'transparent'}` }}
  >
    <span className="text-lg text-muted-foreground font-semibold">
      {unit.name.slice(0, 2).toUpperCase()}
    </span>
  </div>
)}

// Status below:
<StatusBadge status={unit.status_painting} />
<div className="w-full h-0.5 bg-border/40 rounded-full overflow-hidden">
  <div
    className="h-full bg-faction-accent"
    style={{ width: `${unit.painting_percentage}%` }}
  />
</div>
```

### KanbanCard: Metadata Row
```typescript
// KanbanCard.tsx — metadata row below progress bar
<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
  <span>{formatRelativeTime(unit.updated_at)}</span>
  {recipeName && (
    <span className="truncate max-w-[10rem]" title={recipeName}>
      {recipeName.length > 20 ? recipeName.slice(0, 20) + '…' : recipeName}
    </span>
  )}
  {photoCount > 0 && (
    <span className="inline-flex items-center gap-0.5">
      <Camera className="h-3 w-3" />
      {photoCount}
    </span>
  )}
</div>
{unit.status_painting !== "Completed" && (
  <p className="mt-1 text-xs italic text-muted-foreground/70">
    → {getNextActionHint(unit.status_painting)}
  </p>
)}
```

### KanbanCard: Log Session Button (top-right, stopPropagation)
```typescript
// Inside the top flex row alongside KanbanCardActions:
<button
  type="button"
  onClick={(e) => { e.stopPropagation(); onLogSession(unit.id); }}
  aria-label={`Log session for ${unit.name}`}
  className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
>
  <Paintbrush size={14} />
</button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `PaintingRing` SVG circle as gallery card hero | Square photo thumbnail + `StatusBadge` + thin progress bar | Phase 28 | More informative; removes custom SVG dependency |
| `Badge variant="outline"` as StatusPopover trigger | `StatusBadge` dot+text inside same `Popover` trigger | Phase 28 | Consistent with Phase 25 design system |
| Kanban cards show only name, faction, progress, priority, date | Cards also show last-updated, recipe, photo count, next-action hint | Phase 28 | Actionable context without opening detail sheet |

---

## Open Questions

1. **KanbanCard prop threading depth**
   - What we know: `KanbanBoard` → `KanbanColumn` → `KanbanCard` — three levels of prop passing for enrichment data.
   - What's unclear: Whether to pass the whole `Map` down and let each card do `map.get(unit.id)`, or pre-extract per-card values at the `KanbanColumn` level.
   - Recommendation: Pass the full `Map<number, KanbanEnrichmentData>` from `KanbanBoard` through `KanbanColumn` to `KanbanCard`. Planner should decide whether to define a per-card shape (e.g., `KanbanCardEnrichment`) or destructure at the card level. Both work; a per-card shape is cleaner but adds a type.

2. **`useLatestUnitPhotos` staleTime**
   - What we know: Existing `useUnitPhotos` uses `staleTime: Infinity` (photos only change via its own mutations, which invalidate).
   - What's unclear: The batch hook `useLatestUnitPhotos` should also use `staleTime: Infinity` for the same reason — but it must be invalidated on `useCreateUnitPhoto` and `useDeleteUnitPhoto`.
   - Recommendation: Use `staleTime: Infinity` and add `qc.invalidateQueries({ queryKey: ['unit-photos', 'latest'] })` to both photo mutation `onSettled` handlers.

3. **`onLogSession` callback threading through KanbanColumn**
   - What we know: `KanbanCard` needs an `onLogSession: (unitId: number) => void` prop. `KanbanColumn` currently has no such prop.
   - What's unclear: Whether to add `onLogSession` to `KanbanColumnProps` and pass through, or lift the handler via a different mechanism.
   - Recommendation: Add `onLogSession` to `KanbanColumnProps` — clean, consistent with how `onRemoveFromBoard` and `onEditUnit` are already threaded. Also update `DragOverlay` in `KanbanBoard` (which renders a `KanbanCard`) to pass a no-op.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/collection/ tests/painting/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COLL-01 | `getLatestPhotoByUnit()` SQL returns one row per unit (MAX(id) subquery) | unit | `pnpm test -- tests/collection/unitPhotoLatest.test.ts` | ❌ Wave 0 |
| COLL-01 | `getPhotoCountsByUnitIds()` SQL groups by entity_id | unit | `pnpm test -- tests/collection/unitPhotoLatest.test.ts` | ❌ Wave 0 |
| COLL-01 | `useLatestUnitPhotos()` hook returns `Map<number, UnitPhotoWithUrl>` | unit (hook mock) | `pnpm test -- tests/collection/useLatestUnitPhotos.test.ts` | ❌ Wave 0 |
| COLL-02 | `StatusPopover` renders `StatusBadge` dot inside trigger | unit | `pnpm test -- tests/collection/StatusPopover.test.ts` | ❌ Wave 0 (deleted) |
| PROJ-01 | `getRecipeNamesByUnitIds()` SQL uses IN clause with positional params | unit | `pnpm test -- tests/painting/kanbanEnrichment.test.ts` | ❌ Wave 0 |
| PROJ-01 | `getPhotoCountsByUnitIds()` returns `{ entity_id, photo_count }[]` | unit | `pnpm test -- tests/painting/kanbanEnrichment.test.ts` | ❌ Wave 0 |
| PROJ-01 | `useKanbanEnrichment()` query key is sorted | unit (hook mock) | `pnpm test -- tests/painting/useKanbanEnrichment.test.ts` | ❌ Wave 0 |
| PROJ-02 | `getNextActionHint("Completed")` returns battle-ready string (existing) | unit | `pnpm test -- tests/dashboard/` | ✅ (implicit via computeStats) |
| PROJ-03 | `LogSessionSheet` renders unit pre-selected when `defaultUnitId` provided | unit (RTL) | `pnpm test -- tests/painting/logSessionSheet.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/collection/ tests/painting/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/collection/unitPhotoLatest.test.ts` — covers COLL-01 query functions (`getLatestPhotoByUnit`, `getPhotoCountsByUnitIds`)
- [ ] `tests/collection/useLatestUnitPhotos.test.ts` — covers COLL-01 hook Map return shape
- [ ] `tests/collection/StatusPopover.test.ts` — covers COLL-02 StatusBadge inside trigger (file was deleted per git status; needs recreation)
- [ ] `tests/painting/kanbanEnrichment.test.ts` — covers PROJ-01 query functions (`getRecipeNamesByUnitIds`, `getPhotoCountsByUnitIds`)
- [ ] `tests/painting/useKanbanEnrichment.test.ts` — covers PROJ-01 hook Map shape and sorted query key
- [ ] `tests/painting/logSessionSheet.test.ts` — covers PROJ-03 `defaultUnitId` prop pre-populating the unit picker

**Note:** `tests/collection/StatusPopover.test.ts` appears in git status as deleted (`D tests/collection/StatusPopover.test.ts`). Wave 0 must recreate this file covering the new StatusBadge-inside-trigger behavior.

---

## Sources

### Primary (HIGH confidence)
- Direct file reads from codebase — all claims verified against actual source

### Secondary (MEDIUM confidence)
- `tauri-plugin-sql` IN-clause pattern: positional-param-only constraint confirmed from existing query patterns in `recipes.ts`, `unitPhotos.ts`, `battleLogQueries.ts`
- `convertFileSrc` + `appDataDir` + `join` pattern: confirmed from `useUnitPhotos.ts` lines 41–60
- Sibling portal pattern: confirmed from STATE.md and `CollectionPage.tsx` (three sibling portals: `UnitDetailSheet`, lightbox `Dialog`, `DatasheetImportDialog`)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries verified present
- Architecture: HIGH — all files read directly; patterns confirmed from existing code
- Pitfalls: HIGH — derived from code inspection and established project history (STATE.md)
- Query patterns: HIGH — confirmed from existing `unitPhotos.ts`, `recipes.ts`, `battleLogQueries.ts`
- Validation gaps: HIGH — confirmed by checking `tests/` directory directly

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (stable — no external dependencies)
