# Phase 53: Rules Data Hub UI - Research

**Researched:** 2026-05-10
**Domain:** React UI — dedicated rules browser page with shadcn Tabs, faction filtering, card-based rules display, sync status header, error history, diff summary, and Wahapedia disclaimer
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Tab-based organization: Stratagems, Detachments, Shared Abilities as separate tabs (shadcn Tabs)
- Single faction selector at the top of the page, above tabs — one faction context applies to all tabs
- Page accessible via sidebar nav and route `/rules-hub`
- Header card at top of page showing: last sync date, row counts per table, source version, freshness badge (reuse syncFreshness utility), and a trigger-sync button
- Error history displayed in a collapsible section below the sync header — visible toggle but collapsed by default
- Diff summary (added/removed/modified/renamed counts) shown inline in sync header after a sync completes — uses existing computeSyncDiff utility
- Cards with key metadata visible at a glance, expandable for full description text
- Stratagems: show name + game phase badge + CP cost badge inline on each card
- Detachments: show name + abilities count; expanding reveals detachment abilities list
- Shared abilities: show name + type; expanding reveals full description
- Consistent card styling across all three tabs
- Global search bar at top of the tab content area — filters across the active tab only
- Stratagem-specific filters: game phase filter chips (Command/Movement/Shooting/Charge/Fight) + CP cost filter
- Text search matches on name and keyword fields
- Page footer with subtle but always-visible disclaimer: community-sourced Wahapedia data, not official Games Workshop material

### Claude's Discretion
- Exact card layout and spacing
- Empty state design when no faction is selected or no rules data is synced
- Loading skeleton approach
- Whether to use a Combobox or Select for faction picker
- Exact badge colors for game phases

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RULES-01 | User can view sync status (last sync date, row counts per table, source version, freshness badge) | useRulesSyncMeta() + getSyncFreshness() + FRESHNESS_DOT_CLASS utilities all ready; RulesSyncMeta type has all needed fields |
| RULES-02 | User can view and trigger sync from the Rules Data Hub page | useRulesSync() mutation already wired with full invalidation contract; pattern copied directly from PlaybookTab handleSyncClick |
| RULES-03 | User can view sync error history with timestamps and error details | useRulesSyncErrors() ready; existing Collapsible pattern in PlaybookTab is the reference implementation |
| RULES-04 | User can view sync diff summary (datasheets added/removed/modified/renamed since last sync) | SyncDiff state lifted to page level; computeSyncDiff is pure and already used in useRulesSync.onSuccess |
| RULES-05 | User can browse stratagems by faction with filters (phase, CP cost, keyword) | useStratagemsByFaction(factionId) ready; client-side filter by RwStratagem.phase + RwStratagem.cp_cost |
| RULES-06 | User can browse detachments and detachment abilities by faction | useDetachmentsByFaction() + useDetachmentAbilitiesByDetachment() ready; DetachmentSection pattern proven in PlaybookTab |
| RULES-07 | User can browse shared abilities by faction | useSharedAbilitiesByFaction() ready |
| RULES-08 | User can search rules data by name/keyword across all rule types | Client-side text filter on active tab's data array; search term stored in Zustand or local state |
| RULES-09 | Rules Hub displays clear disclaimer that data is user-provided external data (not official) | Static footer element; no data dependency |
</phase_requirements>

---

## Summary

Phase 53 is a pure UI composition phase. Every data layer hook, query function, utility function, and TypeScript type required by the page already exists and was shipped in Phases 43–47 and 52. The work is assembling those pieces into a new standalone page: wiring faction selection to hooks, applying client-side filters, and rendering three tabs of rule cards with sync status above and a disclaimer below.

The reference implementation for the sync section (header card, freshness badge, collapsible error history, diff view, trigger button) lives in `PlaybookTab.tsx` lines 600–805. The entire sync UI block can be extracted or mirrored verbatim. The reference implementation for card rendering (StratagemEntry, DetachmentSection, ExtendedAbilityEntry) is also in PlaybookTab and should be moved to shared sub-components or reproduced in the new feature directory.

The three new integration points are minimal: one `createRoute` entry in `router.tsx`, one nav item object in the `PLAY_NAV` array in `AppSidebar.tsx`, and one new page file at `src/app/rules-hub/page.tsx`.

**Primary recommendation:** Build `src/features/rules-hub/RulesHubPage.tsx` as the root component. Extract sync-section sub-components from PlaybookTab into `src/features/rules-hub/` (do not create shared components — rules hub is the only consumer). Use Zustand for filter state (`rulesHubFilters.ts`). Use a `Select` for faction picker (simpler than Combobox when options are faction names — no fuzzy search needed). Keep diff state in React local state (`useState<SyncDiff | null>`) lifted to the page component, matching PlaybookTab's pattern.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Tabs | installed | Tab organization for three rules categories | Locked decision; already in project |
| shadcn/ui Card | installed | Sync status header card container | Consistent with app card pattern |
| shadcn/ui Collapsible | installed | Error history + card expansion | Already used in PlaybookTab for same purpose |
| shadcn/ui Badge | installed | Phase badge + CP cost badge on stratagem cards | Used throughout app |
| shadcn/ui Select | installed | Faction picker | Simpler than Combobox for a closed faction list |
| shadcn/ui Input | installed | Search bar | Standard text filter pattern |
| shadcn/ui Button | installed | Trigger-sync button | Standard |
| shadcn/ui Skeleton | installed | Loading states | Used in ArmyListsPage |
| Zustand | installed | Filter state store | Project standard for UI/filter state |
| React Query | installed | Data fetching via hooks | All hooks already exist |
| Lucide React | installed | Icons (RefreshCw, AlertCircle, ChevronDown) | Project standard |

### No new packages required
This phase adds zero new dependencies. All components, hooks, utilities, and types are already in the codebase.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    rules-hub/
      page.tsx              # Thin shell: imports RulesHubPage, exports RulesHubPage wrapper
  features/
    rules-hub/
      RulesHubPage.tsx      # Root page component — owns all state
      SyncStatusCard.tsx    # Sync header card sub-component (extracted from PlaybookTab pattern)
      StratagemCard.tsx     # Expandable stratagem card
      DetachmentCard.tsx    # Expandable detachment card with nested abilities
      SharedAbilityCard.tsx # Expandable shared ability card
      rulesHubFilters.ts    # Zustand store: selectedFactionId, searchText, phaseFilter, cpFilter
```

### Pattern 1: Page Shell (router integration)
`src/app/rules-hub/page.tsx` is a one-liner shell following the pattern established by `src/app/army-lists/page.tsx`:

```typescript
// Source: src/app/army-lists/page.tsx (existing pattern)
import { RulesHubPage } from "@/features/rules-hub/RulesHubPage";
export function RulesHubPage() {
  return <RulesHubPageContent />;
}
```

### Pattern 2: Route Registration
Add to `src/app/router.tsx` following the flat pattern (no search params needed for phase 53):

```typescript
// Source: src/app/router.tsx (existing pattern)
const rulesHubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rules-hub",
  component: RulesHubPageShell,
});
// Add to routeTree.addChildren([...]) array
```

### Pattern 3: Sidebar Nav Entry
Add to the `PLAY_NAV` array in `src/components/common/AppSidebar.tsx`:

```typescript
// Source: src/components/common/AppSidebar.tsx lines 45-48 (existing PLAY_NAV pattern)
const PLAY_NAV = [
  { to: "/army-lists", label: "Army Lists", icon: ClipboardList },
  { to: "/battle-log", label: "Battle Log", icon: Swords },
  { to: "/rules-hub", label: "Rules Hub", icon: BookMarked }, // new entry
] as const;
```

Icon recommendation: `BookMarked` from Lucide (data/rules connotation), or `Database` — either is available.

### Pattern 4: Faction → Wahapedia ID Translation Chain
This chain is required for ALL rules-facing hooks. The existing pattern in PlaybookTab is the reference:

```typescript
// Source: src/features/units/PlaybookTab.tsx lines 337-344 (existing pattern)
const { data: factions } = useFactions();
// selectedFactionId is integer from app DB (factions.id)
const selectedFaction = factions?.find(f => f.id === selectedFactionId) ?? null;
const { data: wahapediaFactionId } = useWahapediaFactionId(selectedFaction?.name);
// wahapediaFactionId is a Wahapedia TEXT key (e.g. "SM") — pass this to rules hooks
const { data: stratagems = [] } = useStratagemsByFaction(wahapediaFactionId ?? undefined);
```

**CRITICAL:** Never pass an integer `factions.id` directly to rules hooks. Always go through `useWahapediaFactionId(faction.name)`. Passing an integer returns an empty array silently (carried decision from Phase 52, STATE.md line 58).

### Pattern 5: Zustand Filter Store
Follow the established pattern from `src/features/paints/paintInventoryFilters.ts`:

```typescript
// Source: src/features/paints/paintInventoryFilters.ts (existing pattern)
import { create } from "zustand";

interface RulesHubFiltersState {
  selectedFactionId: number | null;     // integer app faction ID
  searchText: string;
  phaseFilter: string | null;           // "Command" | "Movement" | "Shooting" | "Charge" | "Fight" | null
  cpFilter: string | null;              // "1" | "2" | "3" | null (cp_cost is TEXT in RwStratagem)
  setSelectedFactionId: (id: number | null) => void;
  setSearchText: (text: string) => void;
  setPhaseFilter: (phase: string | null) => void;
  setCpFilter: (cp: string | null) => void;
  clearFilters: () => void;
}

export const useRulesHubFilters = create<RulesHubFiltersState>((set) => ({
  selectedFactionId: null,
  searchText: "",
  phaseFilter: null,
  cpFilter: null,
  setSelectedFactionId: (id) => set({ selectedFactionId: id }),
  setSearchText: (text) => set({ searchText: text }),
  setPhaseFilter: (phase) => set({ phaseFilter: phase }),
  setCpFilter: (cp) => set({ cpFilter: cp }),
  clearFilters: () => set({ searchText: "", phaseFilter: null, cpFilter: null }),
}));
```

### Pattern 6: Sync Status Card (extracted from PlaybookTab)
The sync section in PlaybookTab (lines 684–805) shows exactly what the sync header card needs. Key elements:
- Freshness dot: `<span className={FRESHNESS_DOT_CLASS[freshness]} />` from `syncFreshness.ts`
- Age label: `getSyncAgeLabel(syncMeta.last_sync_at)` in a Tooltip
- Row counts: `syncMeta.datasheets_count`, `syncMeta.stratagems_count`, etc. from `RulesSyncMeta`
- Trigger button: calls `rulesSync.mutate()` — disabled when `rulesSync.isPending`
- Error history: `useRulesSyncErrors()` data in a Collapsible (collapsed by default)
- Diff state: React `useState<SyncDiff | null>` — set in `rulesSync.mutate`'s onSuccess callback

### Pattern 7: Diff State Lifecycle
The `SyncDiff` is not persisted — it lives in React state and is set only when a sync completes during the current page session. This matches PlaybookTab's `lastSyncDiff` state pattern exactly:

```typescript
// Source: src/features/units/PlaybookTab.tsx lines 356, 544-550 (existing pattern)
const [lastSyncDiff, setLastSyncDiff] = useState<SyncDiff | null>(null);

rulesSync.mutate(undefined, {
  onSuccess: (data) => {
    setLastSyncDiff(data.diff);
    // ... toast
  },
});
```

### Pattern 8: DetachmentCard with nested abilities
DetachmentSection in PlaybookTab calls `useDetachmentAbilitiesByDetachment(detachment.id)` inside the component — this avoids the hooks-in-loop problem (each detachment is its own component, calling the hook unconditionally):

```typescript
// Source: src/features/units/PlaybookTab.tsx lines 1265-1286 (existing pattern)
function DetachmentSection({ detachment }: { detachment: RwDetachment }) {
  const { data: abilities = [] } = useDetachmentAbilitiesByDetachment(detachment.id);
  // ... render
}
```

The `DetachmentCard.tsx` component in rules-hub should follow this exact pattern.

### Pattern 9: Client-side filtering
All filtering happens in-memory on the hook data, using `useMemo`:

```typescript
const filtered = useMemo(() => {
  let result = stratagems;
  if (phaseFilter) result = result.filter(s => s.phase === phaseFilter);
  if (cpFilter) result = result.filter(s => s.cp_cost === cpFilter);
  if (searchText) {
    const lower = searchText.toLowerCase();
    result = result.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      (s.legend ?? "").toLowerCase().includes(lower)
    );
  }
  return result;
}, [stratagems, phaseFilter, cpFilter, searchText]);
```

The `keyword` field mentioned in RULES-05 maps to `RwStratagem.legend` (Wahapedia's description/keyword field on stratagems).

### Anti-Patterns to Avoid
- **Passing integer faction IDs to rules hooks:** Always use `useWahapediaFactionId(faction.name)` — the rules.db uses Wahapedia TEXT keys, not integer PKs.
- **Calling hooks conditionally inside map/array iteration:** DetachmentCard must be its own component so `useDetachmentAbilitiesByDetachment` is called unconditionally.
- **Nesting Radix portals:** All Sheet/Dialog components must be siblings at the page root, not nested inside each other. (No portal nesting risk in this phase — no Sheets needed.)
- **Skipping staleTime: Infinity:** Any new rules.db query hook added in this phase must set `staleTime: Infinity` and be registered with `useRulesSync` for cache invalidation.
- **Importing DB functions directly in UI components:** Use hooks only in components; DB queries only in hook files.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Freshness badge color logic | Custom tier calculator | `getSyncFreshness()` + `FRESHNESS_DOT_CLASS` from `src/lib/syncFreshness.ts` | Already handles fresh/aging/stale/never tiers |
| Age label text | Date arithmetic | `getSyncAgeLabel()` from `src/lib/syncFreshness.ts` | Handles "today / yesterday / N days ago" |
| Sync diff computation | Custom snapshot comparison | `computeSyncDiff()` from `src/lib/computeSyncDiff.ts` | Pure function, fully tested, handles added/removed/renamed/modified |
| Faction → Wahapedia ID translation | Lookup table or direct join | `useWahapediaFactionId(faction.name)` from `useDatasheet.ts` | Cached, handles null gracefully |
| Error history data | Custom query | `useRulesSyncErrors()` from `useSyncErrors.ts` | Returns typed array with id, error_type, message, occurred_at |
| Sync meta (last date, row counts) | Raw query | `useRulesSyncMeta()` from `useDatasheet.ts` | Returns `RulesSyncMeta` with all needed fields |
| Rules data queries | New DB functions | All four hooks in `useRulesExtended.ts` | Already exist, already wired for invalidation |

**Key insight:** This phase has zero new data infrastructure to build. Every query, hook, utility, and type is already implemented. The entire implementation budget is for UI composition.

---

## Common Pitfalls

### Pitfall 1: Integer vs. String Faction ID for Rules Hooks
**What goes wrong:** Passing `factions.id` (integer) directly to `useStratagemsByFaction()` returns an empty array with no error. Very easy to miss during development.
**Why it happens:** `hobbyforge.db` factions table uses integer PKs; `rules.db` uses Wahapedia text keys (e.g. `"SM"`, `"CSM"`). The two are resolved via `resolveWahapediaFactionIdByName()`.
**How to avoid:** Always chain: `useFactions()` → find faction by integer ID → extract `faction.name` → pass to `useWahapediaFactionId(faction.name)` → pass result to rules hooks.
**Warning signs:** Rules tabs show empty state even after sync, with no error in console.

### Pitfall 2: Faction Selector Shows Empty State Before Rules DB is Populated
**What goes wrong:** User selects a faction but no data appears because rules.db has never been synced.
**Why it happens:** `useStratagemsByFaction` is enabled only when `factionId !== undefined`, but returns `[]` if the table is empty.
**How to avoid:** Show an explicit "Sync rules data first" empty state when `syncMeta` is null (same pattern as PlaybookTab's `!syncMeta` banner on line 808–820).
**Warning signs:** Empty lists with no explanation when rules.db is uninitialized.

### Pitfall 3: Tabs Reset Filter State on Tab Switch
**What goes wrong:** User types a search term in Stratagems tab, switches to Detachments — the search bar clears because it's stored in local component state that unmounts.
**Why it happens:** shadcn Tabs unmounts inactive tab content by default.
**How to avoid:** Store `searchText` in Zustand (`rulesHubFilters.ts`), not in React local state. The search bar reads from and writes to the store, persisting across tab switches.

### Pitfall 4: Diff Summary Disappears on Page Navigation
**What goes wrong:** User syncs, sees diff, navigates away, returns — diff is gone.
**Why it happens:** `lastSyncDiff` is React local state on the page component, cleared on unmount.
**How to avoid:** This is expected behavior (matches PlaybookTab). Do not persist diff to localStorage — it reflects the most recent sync session only. Document this in code comments.

### Pitfall 5: `cp_cost` is TEXT in RwStratagem
**What goes wrong:** Filtering by CP cost with `===` comparison against number `1` returns nothing.
**Why it happens:** `RwStratagem.cp_cost` is typed `string | null` (Wahapedia stores "1", "2", "3" as text).
**How to avoid:** Compare `s.cp_cost === "1"` (string), not `s.cp_cost === 1` (number). The CP cost filter chips should emit string values.

### Pitfall 6: Detachment abilities count badge
**What goes wrong:** Showing abilities count on the closed DetachmentCard requires a second query that fires before the card is expanded.
**Why it happens:** `useDetachmentAbilitiesByDetachment` is only called inside `DetachmentCard` when the component mounts.
**How to avoid:** Either (a) omit the count badge and rely on expand-to-reveal, or (b) call the abilities hook unconditionally inside `DetachmentCard` (it fires on mount and caches at `staleTime: Infinity`, so cost is low). The CONTEXT.md says "show name + abilities count" so option (b) is required — unconditional hook call, count from `data.length`.

---

## Code Examples

### Faction Picker + Rules Hook Chain
```typescript
// Pattern verified from: src/features/units/PlaybookTab.tsx lines 337-371
// and src/hooks/useDatasheet.ts, src/hooks/useRulesExtended.ts

// In RulesHubPage.tsx:
const { selectedFactionId, setSelectedFactionId } = useRulesHubFilters();
const { data: factions = [] } = useFactions();

const selectedFaction = factions.find(f => f.id === selectedFactionId) ?? null;
const { data: wahapediaFactionId } = useWahapediaFactionId(selectedFaction?.name);

const { data: stratagems = [], isLoading: strLoading } =
  useStratagemsByFaction(wahapediaFactionId ?? undefined);
const { data: detachments = [], isLoading: detLoading } =
  useDetachmentsByFaction(wahapediaFactionId ?? undefined);
const { data: sharedAbilities = [], isLoading: sharedLoading } =
  useSharedAbilitiesByFaction(wahapediaFactionId ?? undefined);
```

### Sync Trigger with Diff Capture
```typescript
// Pattern verified from: src/features/units/PlaybookTab.tsx lines 529-561
// and src/hooks/useRulesSync.ts

const [lastSyncDiff, setLastSyncDiff] = useState<SyncDiff | null>(null);
const rulesSync = useRulesSync();

function handleSyncClick() {
  rulesSync.mutate(undefined, {
    onSuccess: (data) => {
      setLastSyncDiff(data.diff);
      toast.success(`Synced: ${data.rowCounts.datasheets} datasheets, ${data.rowCounts.stratagems} stratagems`);
    },
    onError: (err) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });
}
```

### Sync Status Header Fields
```typescript
// Pattern verified from: src/features/units/PlaybookTab.tsx lines 600-620
// and src/lib/syncFreshness.ts, src/types/datasheet.ts (RulesSyncMeta)

const { data: syncMeta } = useRulesSyncMeta();

// All these fields available on syncMeta when non-null:
// syncMeta.last_sync_at       — ISO string | null
// syncMeta.wahapedia_version  — string | null  (source version)
// syncMeta.datasheets_count   — number | null
// syncMeta.stratagems_count   — number | null
// syncMeta.detachments_count  — number | null
// syncMeta.detachment_abilities_count — number | null
// syncMeta.shared_abilities_count     — number | null

const freshness = getSyncFreshness(syncMeta?.last_sync_at ?? null);
const ageLabel = getSyncAgeLabel(syncMeta?.last_sync_at ?? null);
const dotClass = FRESHNESS_DOT_CLASS[freshness]; // e.g. "bg-green-500"
```

### Error History Collapsible
```typescript
// Pattern verified from: src/features/units/PlaybookTab.tsx lines 718-737
// and src/hooks/useSyncErrors.ts

const { data: syncErrors = [] } = useRulesSyncErrors();

// Render in Collapsible (defaultOpen={false} per locked decision):
{syncErrors.length > 0 && (
  <Collapsible defaultOpen={false}>
    <CollapsibleTrigger>
      <AlertCircle className="h-3 w-3" />
      Sync errors ({syncErrors.length})
    </CollapsibleTrigger>
    <CollapsibleContent>
      {syncErrors.slice(0, 10).map(err => (
        <div key={err.id}>
          <Badge variant="outline">{err.error_type.replace("_", " ")}</Badge>
          <span>{err.message}</span>
          <span>{relativeDate(err.occurred_at)}</span>
        </div>
      ))}
    </CollapsibleContent>
  </Collapsible>
)}
```

### Stratagem Phase Filter Chips
```typescript
// Stratagem phases from Wahapedia data — verified against RwStratagem.phase field
// PlaybookTab groups by stratagem.phase ?? "Other"
const STRATAGEM_PHASES = ["Command", "Movement", "Shooting", "Charge", "Fight"] as const;

// Phase badge color suggestions (Claude's discretion):
const PHASE_BADGE_CLASS: Record<string, string> = {
  Command:  "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  Movement: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  Shooting: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  Charge:   "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  Fight:    "bg-red-500/20 text-red-700 dark:text-red-300",
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rules data only in PlaybookTab (per-unit) | Standalone RulesHubPage with faction-wide browsing | Phase 53 (now) | Users can browse all faction rules without opening a specific unit |
| Sync trigger only in PlaybookTab | Sync trigger also available on RulesHubPage | Phase 53 (now) | Better discoverability for rules sync |
| Diff state only in PlaybookTab session | Diff state also in RulesHubPage session | Phase 53 (now) | User can see changes after syncing from the hub |

**No deprecated patterns in this phase.** All existing patterns remain valid.

---

## Open Questions

1. **Which icon for "Rules Hub" sidebar nav item?**
   - What we know: Lucide icons are the standard; PLAY_NAV currently uses ClipboardList and Swords.
   - What's unclear: Whether `BookMarked`, `Database`, `Scroll`, or `Library` best fits "rules data hub" semantics.
   - Recommendation: Use `Library` (book + structure connotation) or `BookMarked`. Either works — this is Claude's discretion per CONTEXT.md.

2. **Select vs. Combobox for faction picker**
   - What we know: CONTEXT.md defers this to Claude's discretion. shadcn Select is simpler. Combobox adds search within the list (useful if user has 5+ factions).
   - Recommendation: Use `Select`. Most users have 1-3 factions; the faction list is short and known. Combobox overhead not warranted. If faction count grows, upgrade in a later phase.

3. **Should the search bar persist across tab switches?**
   - What we know: Zustand store survives tab switches; local state does not.
   - Recommendation: Store `searchText` in Zustand. This prevents frustrating UX where typing a search term and switching tabs loses the text.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `pnpm test -- tests/rules-hub/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RULES-01 | SyncStatusCard renders last sync date, row counts, source version, freshness badge | unit | `pnpm test -- tests/rules-hub/SyncStatusCard.test.tsx` | Wave 0 |
| RULES-02 | Trigger-sync button fires rulesSync.mutate; button disabled while pending | unit | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` | Wave 0 |
| RULES-03 | Error history collapsible renders errors when data present; hidden when empty | unit | `pnpm test -- tests/rules-hub/SyncStatusCard.test.tsx` | Wave 0 |
| RULES-04 | Diff summary renders after sync; shows added/removed/renamed/modified counts | unit | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` | Wave 0 |
| RULES-05 | Phase filter chips filter stratagems by phase; CP filter filters by cost | unit | `pnpm test -- tests/rules-hub/applyRulesHubFilters.test.ts` | Wave 0 |
| RULES-06 | Detachment cards render with abilities count; expanding reveals ability list | unit | `pnpm test -- tests/rules-hub/DetachmentCard.test.tsx` | Wave 0 |
| RULES-07 | Shared ability cards render name and type | unit | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` | Wave 0 |
| RULES-08 | Search text filters stratagems by name and legend field | unit | `pnpm test -- tests/rules-hub/applyRulesHubFilters.test.ts` | Wave 0 |
| RULES-09 | Disclaimer text is present in rendered page output | unit | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/rules-hub/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/rules-hub/RulesHubPage.test.tsx` — covers RULES-02, RULES-04, RULES-07, RULES-09
- [ ] `tests/rules-hub/SyncStatusCard.test.tsx` — covers RULES-01, RULES-03
- [ ] `tests/rules-hub/applyRulesHubFilters.test.ts` — covers RULES-05, RULES-08 (pure filter function, no mocking needed)
- [ ] `tests/rules-hub/DetachmentCard.test.tsx` — covers RULES-06

---

## Sources

### Primary (HIGH confidence)
- `src/features/units/PlaybookTab.tsx` — Complete reference implementation for sync status card, error history collapsible, diff summary, stratagem listing, detachment section, shared ability rendering
- `src/hooks/useRulesExtended.ts` — All four rules data hooks with exact signatures
- `src/hooks/useRulesSync.ts` — Sync mutation contract; `RustSyncResult` interface; `SyncDiff` return type; cache invalidation keys
- `src/hooks/useSyncErrors.ts` — `useRulesSyncErrors()` hook and `SYNC_ERRORS_KEY`
- `src/hooks/useDatasheet.ts` — `useRulesSyncMeta()`, `useWahapediaFactionId()`, `RULES_SYNC_META_KEY`
- `src/lib/syncFreshness.ts` — `getSyncFreshness()`, `getSyncAgeLabel()`, `FRESHNESS_DOT_CLASS`
- `src/lib/computeSyncDiff.ts` — `computeSyncDiff()`, `SyncDiff` interface
- `src/db/queries/rulesExtended.ts` — All four query functions and their SQL
- `src/types/datasheet.ts` — `RwStratagem`, `RwDetachment`, `RwDetachmentAbility`, `RwAbility`, `RulesSyncMeta`
- `src/app/router.tsx` — Route registration pattern
- `src/components/common/AppSidebar.tsx` — `PLAY_NAV` array, nav entry pattern
- `src/features/paints/paintInventoryFilters.ts` — Zustand filter store pattern
- `.planning/STATE.md` — Carried decisions: integer vs. Wahapedia ID, dual-DB architecture, staleTime: Infinity requirement

### Secondary (MEDIUM confidence)
- N/A — All claims are verified directly against project source code.

### Tertiary (LOW confidence)
- Phase badge color suggestions are convention-based (no official constraint) — exact colors are Claude's discretion per CONTEXT.md.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified as already installed in the project
- Architecture: HIGH — all patterns verified against existing source files
- Pitfalls: HIGH — all pitfalls verified against actual field types and existing code behavior
- Test plan: HIGH — mirrors existing test patterns in `tests/`

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (stable stack; no fast-moving dependencies)
