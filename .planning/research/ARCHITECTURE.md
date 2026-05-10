# Architecture Research

**Domain:** HobbyForge v0.2.8 — Rules Data Hub UI, Army Lists 2.0, Game Day Mode
**Researched:** 2026-05-10
**Confidence:** HIGH (based on full codebase reads of all directly affected source files)

---

## Existing Architecture Baseline

The four-layer stack is established and will not change:

```
UI (src/features/**/*)
      |
React Query hooks (src/hooks/use*.ts)
      |
Query modules (src/db/queries/*.ts)
      |
getDb() → hobbyforge.db     /     getRulesDb() → rules.db
```

### Dual-DB Constraint (Non-Negotiable)

`tauri-plugin-sql` does not support `ATTACH DATABASE`. Cross-DB joins are impossible in SQL. The established pattern is:

1. Query both databases independently in the same async function or parallel hooks
2. Merge results in TypeScript (JavaScript Map lookups, array joins, etc.)
3. Never attempt SQL-level joins across the two databases

This constraint directly shapes how army list detachment selection works: the selected `detachment_id` is stored as a TEXT column in `hobbyforge.db`, and detachment data is loaded from `rules.db` in a parallel hook. The two rows are joined in the component via a Map lookup.

### Rules.db Is Destructive on Sync

Every sync performs a full DELETE + re-INSERT on all `rw_*` tables in `rules.db`. Therefore:

- Any user data that must survive re-syncs MUST live in `hobbyforge.db` (unit overrides do this correctly)
- Army list detachment selection, playbook favorites, and user notes on rules MUST all be stored in `hobbyforge.db` columns or tables, never in `rules.db`

---

## New Feature Integration Points

### 1. Rules Data Hub UI

**What it does:** A dedicated page (or settings-adjacent panel) showing sync status, a browsable rules index (factions → datasheets → abilities, stratagems, detachments), and diff summary after sync.

**Integration approach:**

- New route `/rules-hub` added to `router.tsx` — new `RulesHubPage` component
- Reuses all existing hooks: `useRulesSyncMeta`, `useRulesSyncErrors`, `useStratagemsByFaction`, `useDetachmentsByFaction`, `useSharedAbilitiesByFaction`, `useDatasheet`
- Reuses `useRulesSync` mutation for the sync trigger
- No new query functions needed for basic browsing — all read paths already exist in `rulesExtended.ts` and `datasheets.ts`
- New query needed: `getAllFactions()` — reads `rw_factions` from `rules.db` to power the faction picker in the hub (distinct from `getFactions()` which reads `hobbyforge.db`)
- The sync diff data (last post-sync diff) currently lives only in transient component state in `PlaybookTab`. For the hub to show a persistent diff summary, it needs to be stored. Two options: (a) persist the last diff JSON in a new `hobbyforge.db` column on `rules_sync_meta`, or (b) re-derive from the latest snapshot on page load. Option (a) is simpler — add a `last_diff_json TEXT` column to `rules_sync_meta` in a new migration, write it in `useRulesSync.onSuccess`

**Sync status panel already built:** `PlaybookTab` already renders sync freshness dot, last sync date, row counts, error history, and post-sync diff. These sub-components should be extracted into shared components (`SyncStatusPanel`, `SyncDiffView`) in `src/components/common/` or `src/features/rules-hub/` so both `PlaybookTab` and `RulesHubPage` can render them without duplication.

**Component extraction from PlaybookTab:**

| Extract From PlaybookTab | To Location | Reason |
|--------------------------|-------------|--------|
| Sync status row (freshness dot + date + row counts) | `src/features/rules-hub/SyncStatusPanel.tsx` | Reused in RulesHubPage header |
| Sync error collapsible | `src/features/rules-hub/SyncErrorList.tsx` | Reused in RulesHubPage |
| Post-sync diff collapsible | `src/features/rules-hub/SyncDiffView.tsx` | Reused in RulesHubPage |
| Stratagem entry display | `src/features/rules-hub/StratagemCard.tsx` | Reused in hub browser and Game Day |
| Detachment section display | `src/features/rules-hub/DetachmentPanel.tsx` | Reused in hub browser and Army Lists 2.0 |

### 2. Army Lists 2.0 — Detachment Selection

**What it does:** An army list can have one selected detachment. Once selected, the list shows the detachment's stratagems and abilities alongside units.

**Schema change required (hobbyforge.db):**

```sql
-- Migration 019
ALTER TABLE army_lists ADD COLUMN detachment_id TEXT;
-- TEXT matches rules.db rw_detachments.id (Wahapedia 9-digit string)
-- NULL = no detachment selected
-- No FK to rules.db possible — stored as plain TEXT
```

**Type change required:**

```typescript
// src/types/armyList.ts
export interface ArmyList {
  // ... existing fields ...
  detachment_id: string | null;  // add this
}
```

**Query change required:**

```typescript
// src/db/queries/armyLists.ts — update updateArmyList
// Include detachment_id in the UPDATE SET clause
// Full-replacement pattern (not COALESCE) so detachment can be cleared back to NULL
```

**New hook functions in useArmyLists.ts:**

```typescript
export function useArmyListDetachment(detachmentId: string | undefined) {
  // Thin wrapper around useDetachmentsByFaction — but needs a by-ID query
  // Problem: existing query is getDetachmentsByFaction(factionId), not getDetachmentById(id)
  // New query needed: getDetachmentById(id) in rulesExtended.ts
}
```

**New query needed in rulesExtended.ts:**

```typescript
export async function getDetachmentById(id: string): Promise<RwDetachment | null>
export async function getStratagemsByDetachment(detachmentId: string): Promise<RwStratagem[]>
```

`getStratagemsByDetachment` is needed because `rw_stratagems.detachment_id` already exists — stratagems can be filtered to just those belonging to the active detachment.

**Stale data warning:** When the army list has a `detachment_id` but the rules.db no longer contains that ID (after a sync), the UI must show a warning. The detachment hook returning `null` for a non-null `detachment_id` is the detection signal. No new infrastructure needed — the component checks `detachment_id !== null && detachmentData === null`.

**ArmyListDetailSheet changes:**

- Add detachment picker (a `Select` or `Command` popover) in the sheet header area
- When a detachment is selected, load and render its abilities and filtered stratagems below the unit list
- Picker uses `useDetachmentsByFaction(wahapediaFactionId)` — requires the army list's faction name to be resolved to a Wahapedia faction ID (same `useWahapediaFactionId(factionName)` call already used in PlaybookTab)
- Sheet adds `useWahapediaFactionId` + `useDetachmentsByFaction` + `useDetachmentAbilitiesByDetachment` + `useStratagemsByDetachment` hooks — all with `staleTime: Infinity`

**Cross-DB data flow for detachment selection:**

```
ArmyListDetailSheet
  ├── useArmyListWithUnits(listId)        → hobbyforge.db: army_list_units + units
  ├── useFactions()                       → hobbyforge.db: factions
  ├── useWahapediaFactionId(factionName)  → rules.db: rw_factions (name lookup)
  ├── useDetachmentsByFaction(rwFactionId)→ rules.db: rw_detachments
  ├── [user picks a detachment]
  ├── updateArmyList({detachment_id})     → hobbyforge.db: army_lists
  └── useDetachmentAbilitiesByDetachment  → rules.db: rw_detachment_abilities
      useStratagemsByDetachment           → rules.db: rw_stratagems (filtered)
```

### 3. Playbook Enhancements — Favorites and User Notes on Rules

**What it does:** Users can star/favorite stratagems and detachments. Users can add personal notes to individual rules entries.

**Schema change required (hobbyforge.db):**

```sql
-- Migration 019 or 020
CREATE TABLE IF NOT EXISTS rules_favorites (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type  TEXT NOT NULL,  -- 'stratagem' | 'detachment' | 'ability'
  entity_id    TEXT NOT NULL,  -- Wahapedia TEXT id
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS rules_notes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  note_text    TEXT NOT NULL DEFAULT '',
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (entity_type, entity_id)
);
```

**Why a polymorphic table:** Stratagems, detachments, shared abilities, and detachment abilities all have TEXT IDs from Wahapedia. A single polymorphic table avoids four separate FK-less tables. The UNIQUE constraint on `(entity_type, entity_id)` enforces one note/favorite per entity.

**Query modules needed:**

- `src/db/queries/rulesFavorites.ts` — toggle (UPSERT/DELETE), getAll, getByType
- `src/db/queries/rulesNotes.ts` — upsert, getByEntity

**Hook modules needed:**

- `src/hooks/useRulesFavorites.ts`
- `src/hooks/useRulesNotes.ts`

**PlaybookTab changes:** Minimal — add star icon button on each `StratagemEntry` and `ExtendedAbilityEntry` sub-component (after extraction to shared location). Favorites state comes from a single `useRulesFavorites('stratagem')` call that returns a Set of IDs.

### 4. Game Day Mode

**What it does:** A focused, distraction-free view for an active game: shows the selected army list's detachment stratagems grouped by phase, quick-reference abilities for units in the list, and a reminder checklist.

**New route:** `/game-day` — new `GameDayPage` component

**Data requirements:**

```
GameDayPage
  ├── useArmyLists()                            → pick active list
  ├── useArmyListWithUnits(selectedListId)      → units in list
  ├── useWahapediaFactionId(factionName)        → rw faction lookup
  ├── useDetachmentsByFaction(rwFactionId)      → if list.detachment_id set, filter to selected
  ├── useDetachmentAbilitiesByDetachment(id)    → detachment abilities
  ├── useStratagemsByDetachment(detachmentId)   → filtered stratagems for active detachment
  ├── useStratagemsByFaction(rwFactionId)       → all stratagems (if no detachment selected)
  └── useDatasheet(unitId) × N                 → per-unit quick stats (N+1, acceptable at personal scale)
```

**Reminder checklist:** A transient UI state (checkboxes for "Placed objectives?", "Checked strategic reserve?", etc.). These are session-state only, not persisted — `useState` at the `GameDayPage` level. No DB schema needed.

**Phase-grouped stratagem view:** `stratagemsByPhase` grouping already implemented as `useMemo` in `PlaybookTab`. Extract this pure function to `src/lib/groupStratagemsByPhase.ts` for reuse in `GameDayPage` and any refactored `PlaybookTab`.

---

## System Overview: New Components in Context

```
┌──────────────────────────────────────────────────────────────────────┐
│                         UI Layer (React)                              │
│                                                                        │
│  RulesHubPage    ArmyListsPage    GameDayPage    PlaybookTab          │
│      │               │                │              │                │
│  [NEW]         [MODIFIED]          [NEW]         [MODIFIED]           │
│                                                                        │
│  SyncStatusPanel  DetachmentPicker  StratagemCard  SyncDiffView       │
│  [EXTRACTED]     [NEW]             [EXTRACTED]    [EXTRACTED]         │
├──────────────────────────────────────────────────────────────────────┤
│                       React Query Hooks                                │
│                                                                        │
│  useRulesExtended (existing + 2 new fns)   useRulesFavorites [NEW]   │
│  useArmyLists (extended)                   useRulesNotes [NEW]        │
│  useRulesSync (extended for diff persist)                              │
├──────────────────────────────────────────────────────────────────────┤
│                        Query Modules                                   │
│                                                                        │
│  rulesExtended.ts (+ getDetachmentById, getStratagemsByDetachment)    │
│  armyLists.ts (+ detachment_id column)                                │
│  rulesFavorites.ts [NEW]    rulesNotes.ts [NEW]                       │
├─────────────────────────────────┬────────────────────────────────────┤
│         hobbyforge.db           │           rules.db                  │
│                                 │                                      │
│  army_lists.detachment_id [ADD] │  rw_detachments (existing)          │
│  rules_favorites [NEW TABLE]    │  rw_stratagems (existing)           │
│  rules_notes [NEW TABLE]        │  rw_detachment_abilities (existing) │
│  rules_sync_meta.last_diff_json │  rw_abilities (existing)            │
│    [NEW COLUMN, optional]       │                                      │
└─────────────────────────────────┴────────────────────────────────────┘
```

---

## Component Inventory

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `RulesHubPage` | `src/features/rules-hub/RulesHubPage.tsx` | New page: sync status, faction browser, diff summary |
| `SyncStatusPanel` | `src/features/rules-hub/SyncStatusPanel.tsx` | Extracted from PlaybookTab — sync freshness + row counts |
| `SyncErrorList` | `src/features/rules-hub/SyncErrorList.tsx` | Extracted from PlaybookTab — error history collapsible |
| `SyncDiffView` | `src/features/rules-hub/SyncDiffView.tsx` | Extracted from PlaybookTab — post-sync diff collapsible |
| `StratagemCard` | `src/features/rules-hub/StratagemCard.tsx` | Extracted from PlaybookTab — single stratagem display |
| `DetachmentPanel` | `src/features/rules-hub/DetachmentPanel.tsx` | Extracted from PlaybookTab — detachment + abilities display |
| `DetachmentPicker` | `src/features/army-lists/DetachmentPicker.tsx` | Select component for choosing active detachment on a list |
| `GameDayPage` | `src/features/game-day/GameDayPage.tsx` | New page: game-focused view with phase-grouped stratagems |
| `GameDayStratagemView` | `src/features/game-day/GameDayStratagemView.tsx` | Phase-grouped stratagem list with CP cost emphasis |
| `GameDayChecklist` | `src/features/game-day/GameDayChecklist.tsx` | Transient reminder checklist (useState only, no DB) |
| `GameDayUnitPanel` | `src/features/game-day/GameDayUnitPanel.tsx` | Per-unit quick stats + abilities for in-game reference |

### Modified Components

| Component | Change Type | What Changes |
|-----------|-------------|--------------|
| `PlaybookTab.tsx` | Moderate | Extract sub-components to shared location; add favorites star buttons |
| `ArmyListDetailSheet.tsx` | Moderate | Add detachment picker, detachment abilities display, stratagem preview |
| `ArmyListSheet.tsx` | Minor | Detachment field not in create form (set post-creation in detail sheet) |
| `router.tsx` | Minor | Add `/rules-hub` and `/game-day` routes |
| `AppSidebar` | Minor | Add nav items for Rules Hub and Game Day under Play group |
| `useRulesSync.ts` | Minor | Persist last diff JSON to hobbyforge.db on success (if hub diff feature built) |
| `src/types/armyList.ts` | Minor | Add `detachment_id: string \| null` to `ArmyList` interface |

### Existing Components — Unchanged

| Component | Why Unchanged |
|-----------|---------------|
| `ArmyListSummaryBar.tsx` | Points math unchanged; no detachment data involved |
| `ArmyListUnitRow.tsx` | Unit display unchanged |
| `UnitPickerDialog.tsx` | Unit selection unchanged |
| `ArmyListCard.tsx` | Card display — could optionally show selected detachment name, but not required |
| All recipe components | No recipe involvement in this milestone |
| All dashboard components | Dashboard reads from existing hooks; no new queries exposed to dashboard |

---

## Schema Changes

### Migration 019 (hobbyforge.db)

```sql
-- Army Lists 2.0: detachment selection
ALTER TABLE army_lists ADD COLUMN detachment_id TEXT;
-- NULL = no detachment selected
-- TEXT matches rw_detachments.id (Wahapedia 9-digit string IDs)
-- No FK possible — cross-DB reference stored as plain TEXT

-- Playbook: rules favorites (starred stratagems, abilities, detachments)
CREATE TABLE IF NOT EXISTS rules_favorites (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('stratagem', 'detachment', 'ability', 'detachment_ability')),
  entity_id    TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (entity_type, entity_id)
);

-- Playbook: user notes on individual rules entries
CREATE TABLE IF NOT EXISTS rules_notes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('stratagem', 'detachment', 'ability', 'detachment_ability')),
  entity_id    TEXT NOT NULL,
  note_text    TEXT NOT NULL DEFAULT '',
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (entity_type, entity_id)
);
```

**Notes:**
- `detachment_id` is TEXT, not INTEGER — Wahapedia IDs are 9-digit zero-padded strings, consistent with all other cross-DB references in the codebase (`weapon_name as TEXT copy` decision in PROJECT.md)
- Polymorphic tables avoid four separate tables with no FK enforcement
- `UNIQUE` constraint enables simple UPSERT semantics for note saves

### No changes to rules.db schema

All `rw_*` tables remain unchanged. The sync pipeline already handles all rules data.

---

## New Query Modules

### `src/db/queries/rulesExtended.ts` — Additions Only

```typescript
// Get a single detachment by its Wahapedia ID
export async function getDetachmentById(id: string): Promise<RwDetachment | null>

// Get stratagems filtered to a specific detachment (uses rw_stratagems.detachment_id)
export async function getStratagemsByDetachment(detachmentId: string): Promise<RwStratagem[]>

// Get all factions from rules.db (for hub faction browser)
export async function getRulesFactions(): Promise<RwFaction[]>
```

### `src/db/queries/rulesFavorites.ts` — New

```typescript
export async function getRulesFavoriteIds(entityType: string): Promise<string[]>
export async function toggleRulesFavorite(entityType: string, entityId: string): Promise<void>
// Returns all IDs for a type as a string[] — component builds a Set for O(1) lookup
```

### `src/db/queries/rulesNotes.ts` — New

```typescript
export async function getRulesNote(entityType: string, entityId: string): Promise<string | null>
export async function upsertRulesNote(entityType: string, entityId: string, noteText: string): Promise<void>
```

### `src/db/queries/armyLists.ts` — Modifications

- `updateArmyList`: include `detachment_id` in SET clause with full-replacement semantics (not COALESCE — must be clearable to NULL)
- `getArmyLists`: no change needed (SELECT * picks up new column automatically)

---

## New Hooks

| Hook File | Exports | Cache Keys |
|-----------|---------|------------|
| `useRulesFavorites.ts` | `useRulesFavoriteIds`, `useToggleRulesFavorite` | `["rules-favorites", entityType]` |
| `useRulesNotes.ts` | `useRulesNote`, `useUpsertRulesNote` | `["rules-notes", entityType, entityId]` |

**Cache invalidation for favorites toggle:** `useToggleRulesFavorite` invalidates `["rules-favorites", entityType]` — fetches the full ID list for that type, component rebuilds Set. No per-entity key needed.

**staleTime for favorites/notes:** `0` (default). These are user-written data, not rules content. Should be fresh on every mount.

### Additions to `useRulesExtended.ts`

```typescript
export function useDetachmentById(id: string | undefined): UseQueryResult<RwDetachment | null>
// staleTime: Infinity — rules data static until sync

export function useStratagemsByDetachment(detachmentId: string | undefined): UseQueryResult<RwStratagem[]>
// staleTime: Infinity
```

### Additions to `useArmyLists.ts`

No new hook functions needed — `useUpdateArmyList` already accepts `UpdateArmyListInput`. Once `detachment_id` is added to `ArmyList` and `UpdateArmyListInput`, callers can pass it through the existing mutation.

---

## Data Flow: Cross-DB Army List with Detachment

The critical cross-DB flow for the detachment feature:

```
1. User opens army list detail:
   useArmyListWithUnits(listId) → hobbyforge.db
   → ArmyList includes detachment_id (TEXT | null)

2. Resolve faction name → Wahapedia faction ID:
   factions = useFactions() → hobbyforge.db
   faction = factions.find(f => f.id === list.faction_id)
   useWahapediaFactionId(faction.name) → rules.db (rw_factions name match)

3. Load detachment options:
   useDetachmentsByFaction(rwFactionId) → rules.db (rw_detachments)

4. Load currently selected detachment's data:
   if (list.detachment_id):
     useDetachmentAbilitiesByDetachment(list.detachment_id) → rules.db
     useStratagemsByDetachment(list.detachment_id) → rules.db

5. User selects detachment:
   useUpdateArmyList({id: listId, detachment_id: rwDetachmentId})
   → hobbyforge.db UPDATE army_lists SET detachment_id = ?
   → invalidate ["army-lists"] and ["army-list-with-units", listId]

6. Stale detection:
   if (list.detachment_id !== null && detachmentData === null):
     → show "Detachment data missing — re-sync rules" warning
```

---

## Build Order

### Phase A — Schema + Data Layer (foundation, no UI)

1. Migration 019: `ALTER TABLE army_lists ADD COLUMN detachment_id TEXT`; create `rules_favorites`; create `rules_notes`
2. Update `src/types/armyList.ts` — add `detachment_id: string | null`
3. Update `UpdateArmyListInput` to include `detachment_id`
4. Update `updateArmyList` query to handle `detachment_id` (full-replacement, not COALESCE)
5. New query functions in `rulesExtended.ts`: `getDetachmentById`, `getStratagemsByDetachment`, `getRulesFactions`
6. New hooks: `useDetachmentById`, `useStratagemsByDetachment` in `useRulesExtended.ts`
7. New files: `rulesFavorites.ts`, `rulesNotes.ts` query modules
8. New files: `useRulesFavorites.ts`, `useRulesNotes.ts` hooks
9. Tests: migration round-trip, detachment_id update/clear, favorites toggle, notes upsert

**Rationale:** Data layer first is the established project pattern. Schemas and queries are cheap to test and validate before any UI investment.

### Phase B — Rules Data Hub UI

1. Extract sub-components from `PlaybookTab`: `SyncStatusPanel`, `SyncErrorList`, `SyncDiffView`, `StratagemCard`, `DetachmentPanel`
2. Update `PlaybookTab` to import from extracted locations (behavior unchanged)
3. New `src/features/rules-hub/` folder and `RulesHubPage.tsx`
4. Add `/rules-hub` route to `router.tsx`
5. Add Rules Hub nav item to sidebar (Play group)
6. Tests: hub renders sync status; faction picker loads factions; stratagem browser filters correctly

**Rationale:** Extraction before hub creation avoids duplication. PlaybookTab behavior is verified unchanged before building the new page.

**Dependency:** Requires Phase A (needs `getRulesFactions` for faction browser).

### Phase C — Army Lists 2.0 (detachment selection)

1. `DetachmentPicker` component in `src/features/army-lists/`
2. Update `ArmyListDetailSheet` to add picker + detachment abilities/stratagems display
3. Use `useWahapediaFactionId` (already exists in PlaybookTab — copy pattern)
4. Show stale-data warning when `list.detachment_id` resolves to null detachment
5. Tests: picker shows detachments for faction; selecting persists; clearing works; stale warning renders

**Dependency:** Requires Phase A (migration + type changes + new query hooks).

### Phase D — Playbook Enhancements (favorites + user notes)

1. Add star button to `StratagemCard` (after Phase B extraction)
2. Add star button to `DetachmentPanel`
3. Add inline note textarea to both (collapsed by default, expand on focus)
4. Wire `useRulesFavorites` and `useRulesNotes` hooks
5. Tests: toggle favorite persists; note saves; favorites render correctly in PlaybookTab and hub

**Dependency:** Requires Phase A (schema) and Phase B (extracted components exist before adding star buttons to them).

### Phase E — Game Day Mode

1. New `src/features/game-day/` folder
2. `GameDayPage`, `GameDayStratagemView`, `GameDayUnitPanel`, `GameDayChecklist`
3. Add `/game-day` route
4. Add Game Day nav item to sidebar
5. Tests: page loads with army list; stratagems grouped by phase; checklist items render; unit panel shows stats

**Dependency:** Requires Phase C (army list detachment selection is the primary data source for Game Day). Requires Phase B (extracted `StratagemCard` reused in `GameDayStratagemView`).

### Phase F — Points Import Design Documentation (out-of-scope implementation)

- Write `.planning/research/POINTS_IMPORT.md` documenting the legal constraint (no GW points scraping) and the manual flow design (user enters points per unit per tier — already partially implemented via `unitPointTiers` table)
- No code changes

---

## Anti-Patterns to Avoid

### Storing Rules Data in hobbyforge.db

**What goes wrong:** Copying detachment names, stratagem descriptions, or any `rw_*` content into `hobbyforge.db` tables to avoid the dual-query pattern.
**Why it's wrong:** rules.db is deleted and rebuilt on every sync. Any `rw_*` data copied to `hobbyforge.db` immediately becomes stale and the app has two conflicting versions of the same fact.
**Do this instead:** Store only the TEXT ID reference (e.g., `detachment_id TEXT`). Load the actual display data from rules.db via hooks. Accept the dual-query pattern — it's the established and working approach.

### Nesting Portals in ArmyListDetailSheet

**What goes wrong:** Rendering the `DetachmentPicker` dialog inside `ArmyListDetailSheet`.
**Why it's wrong:** The existing codebase has documented this as Pitfall 1 — nested Radix portals cause z-index and context issues. `ArmyListsPage` already owns all sibling portal state.
**Do this instead:** Add `detachmentPickerOpen` state to `ArmyListsPage`. The `ArmyListDetailSheet` calls `onPickDetachment()` prop. The picker dialog is a sibling portal rendered at page root level.

### Using COALESCE on detachment_id Updates

**What goes wrong:** Following the COALESCE pattern from `updateArmyList`'s other fields for `detachment_id`.
**Why it's wrong:** COALESCE means "preserve existing value if input is NULL" — but the user must be able to clear the detachment selection back to NULL (deselect detachment). COALESCE prevents clearing.
**Do this instead:** Full-replacement UPDATE for `detachment_id`. This is already the established pattern for nullable clearable fields (see `updateArmyListUnit` for precedent).

### Calling N useDatasheet Hooks in a Loop

**What goes wrong:** `GameDayPage` maps over the army list's units and calls `useDatasheet(unit.unit_id)` inside the map — hooks cannot be called conditionally or in loops.
**Why it's wrong:** Rules of Hooks violation. Also, the number of units is runtime-dynamic.
**Do this instead:** Create a `GameDayUnitPanel` component that receives a single `unitId` prop and calls `useDatasheet(unitId)` unconditionally inside the component. Render N instances of `GameDayUnitPanel`. This is the same pattern already used in `DetachmentSection` inside `PlaybookTab` for per-detachment ability loading.

### Querying All Stratagems for Game Day Without Detachment Filter

**What goes wrong:** Loading all stratagems for the faction and showing all of them in Game Day, unfiltered.
**Why it's wrong:** A large faction like Space Marines has 40+ stratagems. Game Day should show only the active detachment's stratagems — a focused subset. Showing all creates cognitive overload during an actual game.
**Do this instead:** If a detachment is selected, use `useStratagemsByDetachment(detachmentId)` which filters `rw_stratagems.detachment_id = ?`. Fall back to `useStratagemsByFaction` only when no detachment is selected. Display the fallback with a note "Select a detachment for filtered stratagems."

---

## Integration Boundaries: Unchanged Consumers

| Component | Why Unchanged |
|-----------|---------------|
| All recipe components | No intersection with rules data |
| `BattleLogPage` / `BattleLogSheet` | Battle log references army list by ID only |
| `DashboardPage` and all dashboard panels | No rules data in dashboard queries |
| `CollectionPage` | Collection doesn't change; PlaybookTab changes are additive |
| `SpendingPage`, `WishlistPage`, `GoalsPage` | No intersection |
| `PaintsPage`, `PaintingProjectsPage` | No intersection |

---

## Sources

- `src/features/units/PlaybookTab.tsx` (read 2026-05-10)
- `src/features/army-lists/ArmyListDetailSheet.tsx` (read 2026-05-10)
- `src/features/army-lists/ArmyListsPage.tsx` (read 2026-05-10)
- `src/db/queries/armyLists.ts` (read 2026-05-10)
- `src/db/queries/rulesExtended.ts` (read 2026-05-10)
- `src/db/queries/rulesSnapshot.ts` (read 2026-05-10)
- `src/hooks/useRulesExtended.ts` (read 2026-05-10)
- `src/hooks/useRulesSync.ts` (read 2026-05-10)
- `src/types/armyList.ts` (read 2026-05-10)
- `src/types/datasheet.ts` (read 2026-05-10)
- `src/app/router.tsx` (read 2026-05-10)
- `src-tauri/migrations/001_core_schema.sql` (read 2026-05-10)
- `src-tauri/migrations/rules_001_schema.sql` (read 2026-05-10)
- `.planning/PROJECT.md` (read 2026-05-10)

---

*Architecture research for: HobbyForge v0.2.8 Rules Data Hub UI / Army Lists 2.0 / Game Day Mode*
*Researched: 2026-05-10*
*Confidence: HIGH — all findings based on direct codebase reads, zero training-data assumptions*
