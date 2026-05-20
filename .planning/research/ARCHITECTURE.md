# Architecture: Smart Army List Builder Integration

**Project:** HobbyForge v0.2.18 — Army Lists 3.0
**Researched:** 2026-05-20
**Focus:** Integration of loadout builder, enhancement assignment, rules browsing, version snapshots, and export into existing architecture

---

## Existing Architecture Constraints That Drive Every Decision

### 1. Cross-DB Pattern (immovable)
`ATTACH DATABASE` is impossible with tauri-plugin-sql. The dual-query merge pattern is the only option:
- `rules.db` is read for datasheet browsing (via `getRulesDb()`)
- Data that must survive rules sync lives in `hobbyforge.db` as TEXT copies or synced_* cache tables
- Cross-DB references are TEXT denormalization (weapon_name, detachment_name, detachment_id, rules_datasheet_id)

### 2. Points COALESCE Chain (must be extended, not replaced)
Current 5-level chain in SQL:
```sql
COALESCE(alu.points_override, sup.points, uo.points, u.points, 0)
```
Where `sup.points` comes from `synced_unit_points` (joined by unit_name + faction_id TEXT match).

New loadout and enhancement points must slot into this chain without breaking existing consumers. The resolution order for v0.2.18 needs to become:
```sql
COALESCE(
  alu.points_override,           -- army-list-level manual override (highest)
  alul.loadout_points,           -- computed from selected model count tier
  sup.points,                    -- synced base points
  uo.points,                     -- unit_overrides manual override
  u.points,                      -- units.points field
  0                              -- fallback
)
```
`alul.loadout_points` would be a stored INTEGER on `army_list_unit_loadout` updated when the user selects a model count. This avoids a complex subquery in `getArmyListWithUnits`.

### 3. NULL-Passthrough Pattern (mandatory)
`updateArmyListUnit` uses full-replacement UPDATE (never COALESCE) so `points_override` can be cleared back to NULL. Any new columns on `army_list_units` (loadout selection, enhancement) follow the same rule.

### 4. Sheet/Dialog Sibling Portal (established)
`ArmyListDetailSheet` + `UnitPickerDialog` are siblings at `ArmyListsPage` level. New dialogs (LoadoutBuilderSheet, EnhancementPickerSheet, DatasheetBrowserDialog) must follow this same sibling-portal pattern. Never nest inside `ArmyListDetailSheet`.

### 5. staleTime: Infinity for rules.db hooks
Rules data only changes on manual sync. All new hooks reading from `synced_*` tables in hobbyforge.db or `rw_*` tables in rules.db should use `staleTime: Infinity` and rely on targeted invalidation after sync.

---

## New Tables Required (hobbyforge.db migrations)

### Migration 031: army_list_unit_loadout
Stores per-army-list-unit loadout selections (not per-collection-unit — each list slot can have a different loadout):

```sql
CREATE TABLE IF NOT EXISTS army_list_unit_loadout (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  army_list_unit_id      INTEGER NOT NULL UNIQUE REFERENCES army_list_units(id) ON DELETE CASCADE,
  model_count            INTEGER,                  -- selected count (from synced_model_counts range)
  loadout_points         INTEGER,                  -- base points for selected model count tier
  options_json           TEXT,                     -- JSON: [{group_name, option_name}] TEXT copy, no FK
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Rationale: UNIQUE on army_list_unit_id (one loadout config per slot). `options_json` stores selected wargear as a TEXT blob — no FK to synced_loadout_options because synced_loadout_options is wiped on re-sync. The group_name+option_name pair is sufficient to re-resolve display names after sync. `loadout_points` is pre-computed and stored so the COALESCE chain can include it without a subquery.

### Migration 032: army_list_unit_enhancement
Stores enhancement assignment per army-list-unit slot:

```sql
CREATE TABLE IF NOT EXISTS army_list_unit_enhancement (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  army_list_unit_id      INTEGER NOT NULL UNIQUE REFERENCES army_list_units(id) ON DELETE CASCADE,
  enhancement_name       TEXT NOT NULL,            -- TEXT copy (survives re-sync)
  enhancement_points     INTEGER NOT NULL DEFAULT 0,
  detachment_name        TEXT,                     -- TEXT copy for display
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Rationale: Enhancement name is a TEXT copy from `synced_enhancements`. Points stored at assignment time — avoids a re-join at read time. UNIQUE on army_list_unit_id (one enhancement per character slot).

### Migration 033: army_list_snapshots
Named version snapshots for an army list:

```sql
CREATE TABLE IF NOT EXISTS army_list_snapshots (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id                INTEGER NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,            -- user-supplied label, e.g. "Tournament v1"
  snapshot_json          TEXT NOT NULL,            -- full serialized list state
  total_points           INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
-- No updated_at: snapshots are immutable once created.
```

Rationale: Snapshots are immutable blobs. `snapshot_json` contains a complete denormalized representation: list metadata, all units with their effective_points, loadout selections, enhancements, tactical roles, and notes. This avoids any re-join on restore and makes the JSON self-describing for export. `total_points` is stored for quick list display without deserializing the blob.

### Migration 034: ghost columns on army_list_units (if unowned units are in scope)
Makes `unit_id` nullable and adds ghost columns:

```sql
ALTER TABLE army_list_units ADD COLUMN ghost_unit_name TEXT;
ALTER TABLE army_list_units ADD COLUMN ghost_datasheet_id TEXT;
```

The FK `REFERENCES units(id)` on the existing `unit_id` column is preserved — ghost slots are inserted with `unit_id = NULL` via a separate insert path. The LEFT JOIN in `getArmyListWithUnits` handles both cases.

---

## New Query Modules

### `src/db/queries/armyListLoadout.ts` (NEW)
```
getLoadoutForArmyListUnit(aluId)    → SELECT from army_list_unit_loadout WHERE army_list_unit_id
upsertArmyListUnitLoadout(input)    → INSERT OR REPLACE (single row per army_list_unit_id)
clearArmyListUnitLoadout(aluId)     → DELETE FROM army_list_unit_loadout WHERE army_list_unit_id
```

### `src/db/queries/armyListEnhancement.ts` (NEW)
```
getEnhancementForArmyListUnit(aluId)    → SELECT from army_list_unit_enhancement
upsertArmyListUnitEnhancement(input)    → INSERT OR REPLACE
clearArmyListUnitEnhancement(aluId)     → DELETE
```

### `src/db/queries/armyListSnapshots.ts` (NEW)
```
getSnapshotsForList(listId)         → SELECT ORDER BY created_at DESC
getSnapshotById(id)                 → SELECT WHERE id
createSnapshot(input)               → INSERT (with serialized JSON)
deleteSnapshot(id)                  → DELETE
```

### `src/db/queries/armyLists.ts` (MODIFIED)
- `getArmyListWithUnits`: extend SELECT to LEFT JOIN `army_list_unit_loadout` and `army_list_unit_enhancement`, add `loadout_points`, `enhancement_points`, `enhancement_name`, `model_count` to the ArmyListUnitRow projection
- Update `effective_points` COALESCE to include `alul.loadout_points` between `alu.points_override` and `sup.points`

### `src/db/queries/bsdataExtended.ts` (MODIFIED)
- Add `getLoadoutOptionsForUnit(unitName, factionId)` — filtered by unit_name (currently only `getLoadoutOptionsByFaction` exists)
- Add `getModelCountForUnit(unitName, factionId)` — filtered by unit_name
- These per-unit queries are needed by the LoadoutBuilderSheet (opened from a specific unit row)

### `src/db/queries/datasheets.ts` (MODIFIED — optional)
- Consider adding a search param to `getDatasheetsByFaction` for large factions; current full-select + client filter is acceptable for typical faction sizes (<200 datasheets)

---

## New Hook Modules

### `src/hooks/useArmyListLoadout.ts` (NEW)
```
ARMY_LIST_UNIT_LOADOUT_KEY = (aluId) => ["army-list-unit-loadout", aluId]
useArmyListUnitLoadout(aluId)     → useQuery
useUpsertArmyListUnitLoadout()    → useMutation + invalidate ARMY_LIST_UNIT_LOADOUT_KEY + ARMY_LIST_UNITS_KEY(listId)
useClearArmyListUnitLoadout()     → useMutation
```

Invalidation contract: after upsert/clear, invalidate both `ARMY_LIST_UNIT_LOADOUT_KEY(aluId)` AND `ARMY_LIST_UNITS_KEY(listId)` — the latter forces the unit row to re-read `effective_points` from the updated `loadout_points`.

### `src/hooks/useArmyListEnhancement.ts` (NEW)
```
ARMY_LIST_UNIT_ENHANCEMENT_KEY = (aluId) => ["army-list-unit-enhancement", aluId]
useArmyListUnitEnhancement(aluId)     → useQuery
useUpsertArmyListUnitEnhancement()    → useMutation + invalidate + ARMY_LIST_UNITS_KEY(listId)
useClearArmyListUnitEnhancement()     → useMutation
```

### `src/hooks/useArmyListSnapshots.ts` (NEW)
```
ARMY_LIST_SNAPSHOTS_KEY = (listId) => ["army-list-snapshots", listId]
useArmyListSnapshots(listId)     → useQuery
useCreateSnapshot()              → useMutation + invalidate ARMY_LIST_SNAPSHOTS_KEY
useDeleteSnapshot()              → useMutation + invalidate ARMY_LIST_SNAPSHOTS_KEY
```

### `src/hooks/useBsdataPerUnit.ts` (NEW)
Currently `bsdataExtended.ts` has read functions for faction-level queries. Per-unit queries for the LoadoutBuilderSheet need:
```
useLoadoutOptionsForUnit(unitName, factionId)   → staleTime: Infinity
useModelCountForUnit(unitName, factionId)        → staleTime: Infinity
```

### `src/hooks/useArmyLists.ts` (MODIFIED — minor)
- No structural changes required
- `useAddUnitToList` may need a ghost variant if unowned units are in scope

---

## New Components

### `LoadoutBuilderSheet.tsx` (NEW in `src/features/army-lists/`)
A Sheet for configuring a single army_list_unit's loadout.

Props: `{ open, aluId, unitName, factionWahapediaId, listId, currentLoadout, onClose }`

Displays:
- Model count select (from `synced_model_counts` range, min/max bounds)
- Wargear option groups (from `synced_loadout_options` grouped by `group_name`)
- is_exclusive enforcement (radio within group when is_exclusive = 1, checkboxes when 0)
- Points preview: selected model count tier points (from `synced_unit_point_tiers`)
- Save calls `useUpsertArmyListUnitLoadout`

Opening pattern: follows the existing `RulesMappingSheet` pattern (rendered via sibling portal in `ArmyListsPage`, NOT nested in ArmyListDetailSheet).

### `EnhancementPickerSheet.tsx` (NEW in `src/features/army-lists/`)
A Sheet for assigning an enhancement from the faction/detachment's `synced_enhancements`.

Props: `{ open, aluId, listId, detachmentName, factionWahapediaId, currentEnhancement, onClose }`

Displays: enhancements grouped by detachment, filtered to current list detachment by default with option to show all. Each row shows name + points. Selecting calls `useUpsertArmyListUnitEnhancement`.

Character eligibility: check `rulesMapping?.match_status` and datasheet keywords if available; otherwise show for all units with a soft note. Do not block non-characters — GW data is inconsistent.

### `DatasheetBrowserDialog.tsx` (NEW in `src/features/army-lists/`)
Replaces `UnitPickerDialog` as the primary unit-addition entry point.

Props: `{ open, listId, factionId, factionWahapediaId, onClose }`

Two sections using dual-query merge:
- "Your Collection": owned units filtered by faction, with painting status badges
- "Available Datasheets": rules.db datasheets NOT in collection (cross-DB client merge)
- Search box filters both sections client-side
- Click owned unit: calls `useAddUnitToList` (existing behavior)
- Click unowned datasheet: calls `useAddGhostUnitToList` (new, if ghost units in scope) or shows "Add to Collection first" prompt (simpler fallback)

Keep `UnitPickerDialog.tsx` as a simplified alias or redirect until `DatasheetBrowserDialog` is confirmed stable.

### `SnapshotPanel.tsx` (NEW in `src/features/army-lists/`)
Collapsible section inside `ArmyListDetailSheet` (below units table, above notes).

Displays: list of named snapshots with created_at, total_points, delete button. "Save Snapshot" triggers a small inline name-input prompt. Snapshot comparison is out of scope for v0.2.18 — display is read-only list.

### `ArmyListExportSheet.tsx` (NEW in `src/features/army-lists/`)
A Sheet accessed from `ArmyListDetailSheet` footer (new "Export" button alongside "Game Day").

Export formats:
- Text/Clipboard: formatted text block via `navigator.clipboard.writeText`
- JSON: structured JSON via download (uses `@tauri-apps/plugin-fs` dialog) or clipboard fallback
- No PDF in v0.2.18

Text export serializes data already loaded in the parent via `useArmyListWithUnits`. No new queries needed.

### `ArmyListUnitRow.tsx` (MODIFIED)
Add:
- Loadout summary display below unit name (model count + key options, via `useArmyListUnitLoadout`)
- "Configure Loadout" icon button (opens `LoadoutBuilderSheet` via sibling portal state)
- Enhancement badge if assigned (via `useArmyListUnitEnhancement`)
- "Assign Enhancement" icon button
- Points display updated to show `loadout_points` as source when active

Controls should be in a collapsible advanced section to preserve row compactness. The row already carries 5+ controls; loadout and enhancement should not add to the default collapsed height.

### `ArmyListSummaryBar.tsx` (MODIFIED)
- Enhancement points total added as a separate line (not folded into per-unit effective_points)
- Total = sum(effective_points) + sum(enhancement_points across all units)

### `ArmyListDetailSheet.tsx` (MODIFIED)
- Add `SnapshotPanel` above list notes section
- Add "Export" button to footer alongside "Game Day"
- Sibling portal state management for `LoadoutBuilderSheet` and `EnhancementPickerSheet`
- Replace "Add Unit" trigger to open `DatasheetBrowserDialog` instead of `UnitPickerDialog`

---

## Data Flow: Loadout Selection

```
User opens LoadoutBuilderSheet for army_list_units.id=42
  → useLoadoutOptionsForUnit(unitName, factionId) → synced_loadout_options (hobbyforge.db)
  → useModelCountForUnit(unitName, factionId) → synced_model_counts (hobbyforge.db)
  → useUnitPointTiers(unit.unit_id) → unit_point_tiers (existing hook, hobbyforge.db)
  → useArmyListUnitLoadout(42) → army_list_unit_loadout (existing config if any)

User selects model count = 10:
  → Look up points from synced_unit_point_tiers WHERE model_count = 10
  → loadout_points = tier.points

User selects wargear options (no point impact in 10th edition):
  → Local state: Map<groupName, optionName[]>
  → Stored as options_json TEXT blob

User clicks Save:
  → useUpsertArmyListUnitLoadout({
      army_list_unit_id: 42,
      model_count: 10,
      loadout_points: 200,
      options_json: JSON.stringify(selectedOptions)
    })
  → Invalidates ARMY_LIST_UNIT_LOADOUT_KEY(42) + ARMY_LIST_UNITS_KEY(listId)
  → ArmyListDetailSheet re-renders with updated effective_points from COALESCE chain
```

**Key BSData insight**: `synced_loadout_options` stores wargear choices but NOT per-option point costs. In 40K 10th edition, wargear swaps are free — points are determined by model count tiers only. Therefore `loadout_points` = the tier-appropriate base points. Wargear selection is for display and list documentation purposes, not point calculation.

---

## Data Flow: Enhancement Assignment

```
User opens EnhancementPickerSheet for army_list_units.id=42 (character unit)
  → getEnhancementsByFaction(wahapediaFactionId) → synced_enhancements (hobbyforge.db)
    (client-side filter by list.detachment_name if set)

User selects "Iron Resolve" (25pts):
  → useUpsertArmyListUnitEnhancement({
      army_list_unit_id: 42,
      enhancement_name: "Iron Resolve",
      enhancement_points: 25,
      detachment_name: "Gladius Task Force"
    })
  → Invalidates ARMY_LIST_UNIT_ENHANCEMENT_KEY(42) + ARMY_LIST_UNITS_KEY(listId)

ArmyListDetailSheet re-renders:
  → getArmyListWithUnits JOIN army_list_unit_enhancement returns enhancement_points
  → ArmyListSummaryBar adds enhancement totals separately from unit effective_points
```

Enhancement points are tracked separately from the per-unit COALESCE chain because an enhancement belongs to the list composition, not the unit's base cost. GW adds enhancement points on top of the unit's points in list validation.

---

## Data Flow: Version Snapshots

```
User clicks "Save Snapshot" → enters name "Tournament Draft 1":
  → Serialize from already-loaded React Query cache:
      {
        schema_version: 1,
        name: list.name,
        total_points: computed,
        units: units.map(u => ({
          unit_name: u.unit_name, effective_points: u.effective_points,
          model_count: u.model_count, options_json: u.options_json,
          enhancement_name: u.enhancement_name, enhancement_points: u.enhancement_points,
          tactical_role: u.tactical_role, notes: u.notes
        })),
        detachment_name: list.detachment_name,
        saved_at: ISO timestamp
      }
  → useCreateSnapshot({ list_id, name, snapshot_json: JSON.stringify(state), total_points })
  → Invalidates ARMY_LIST_SNAPSHOTS_KEY(listId)

Snapshot panel:
  → useArmyListSnapshots(listId) → [{id, name, total_points, created_at}]
  → Click expand: deserialize snapshot_json → read-only detail view
  → Delete: useDeleteSnapshot(id) + invalidate ARMY_LIST_SNAPSHOTS_KEY
```

Snapshots are immutable write-once. No update path exists. The `schema_version` field in `snapshot_json` enables future migration of old snapshot data if the shape needs to change.

---

## Data Flow: Export

```
User opens ArmyListExportSheet:
  → Units loaded via existing useArmyListWithUnits (already present in parent)
  → Enhancement data already in ArmyListUnitRow projection (from getArmyListWithUnits JOIN)
  → No new queries needed

Text clipboard format:
  [List Name] — [Total Points]pts
  Detachment: [detachment_name]

  UNITS:
  - [unit_name] ([model_count] models) — [effective_points]pts
    Wargear: [options from options_json]
    Enhancement: [enhancement_name] ([enhancement_points]pts)
    Role: [tactical_role]

  Total: [X]pts (includes [Y]pts enhancements)

JSON: serialize snapshot_json directly (reuses snapshot serialization logic)
```

---

## Data Flow: Datasheet Browser (cross-DB merge)

```typescript
// DatasheetBrowserDialog internal logic:
const { data: ownedUnits } = useUnits();
const { data: datasheets } = useDatasheetsByFaction(wahapediaFactionId);  // rules.db

const ownedNames = useMemo(
  () => new Set(ownedUnits?.map(u => u.name.toLowerCase())),
  [ownedUnits]
);

const unownedDatasheets = useMemo(
  () => datasheets?.filter(ds => !ownedNames.has(ds.name.toLowerCase())),
  [datasheets, ownedNames]
);
```

This is the established dual-query pattern from `DatasheetPicker` and `DetachmentPicker`.

---

## Build Order (dependency-constrained)

### Phase A: Schema + Data Layer (blocks all UI)
1. Migrations 031 (loadout), 032 (enhancement), 033 (snapshots)
2. Extend `getArmyListWithUnits` — LEFT JOIN both new tables, updated COALESCE
3. New query modules: armyListLoadout.ts, armyListEnhancement.ts, armyListSnapshots.ts
4. Add per-unit queries to bsdataExtended.ts
5. New hooks: useArmyListLoadout.ts, useArmyListEnhancement.ts, useArmyListSnapshots.ts, useBsdataPerUnit.ts
6. Extend ArmyListUnitRow type in src/types/armyList.ts
7. Register migrations in lib.rs

### Phase B: Unit Order Bug Fix + Export (lowest risk, validates Phase A)
1. Fix ORDER BY in getArmyListWithUnits (use `alu.id ASC` for stable ordering)
2. ArmyListExportSheet.tsx — text/clipboard export
3. SnapshotPanel.tsx + useArmyListSnapshots integration

**Dependency**: Phase A. Independent of C, D, E.

### Phase C: Loadout Builder
1. useBsdataPerUnit.ts hooks
2. LoadoutBuilderSheet.tsx
3. ArmyListUnitRow.tsx — add loadout trigger + summary display
4. Sibling portal wiring in ArmyListsPage

**Dependency**: Phase A. Independent of D, E.

### Phase D: Enhancement Assignment
1. EnhancementPickerSheet.tsx
2. ArmyListUnitRow.tsx — add enhancement badge + trigger
3. ArmyListSummaryBar.tsx — enhancement total line
4. Sibling portal wiring in ArmyListsPage

**Dependency**: Phase A. Independent of C (can run in parallel).

### Phase E: Datasheet Browser (highest complexity)
1. DatasheetBrowserDialog.tsx — two-section owned/unowned browser
2. Migration 034 (ghost columns) if unowned units are in scope, else omit
3. addGhostUnitToList query + hook if ghost units are in scope
4. Replace UnitPickerDialog trigger in ArmyListDetailSheet

**Dependency**: Phase A. Ghost units add significant complexity — recommend deciding scope before starting this phase.

### Recommended execution order:
1. Phase A — schema + data layer
2. Phase B — bug fix + export (low risk, validates data layer)
3. Phase C + D in sequence (loadout then enhancement, or reverse — no dependency between them)
4. Phase E last — most complex, ghost units may slip to next milestone

---

## Modified vs New: Explicit Inventory

### Modified Files

| File | Nature of Change |
|------|-----------------|
| `src/db/queries/armyLists.ts` | Extend `getArmyListWithUnits` — LEFT JOINs + COALESCE update |
| `src/db/queries/bsdataExtended.ts` | Add per-unit `getLoadoutOptionsForUnit` and `getModelCountForUnit` |
| `src/hooks/useArmyLists.ts` | Possibly add ghost unit variant; otherwise no changes |
| `src/features/army-lists/ArmyListUnitRow.tsx` | Add loadout summary, enhancement badge, new sheet triggers |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | Add SnapshotPanel, Export button, sibling portal state |
| `src/features/army-lists/ArmyListSummaryBar.tsx` | Add enhancement points total line |
| `src/features/army-lists/UnitPickerDialog.tsx` | Replace/supplement with DatasheetBrowserDialog trigger |
| `src/features/army-lists/ArmyListsPage.tsx` | Add sibling portal state + components for new sheets/dialogs |
| `src/types/armyList.ts` | Extend ArmyListUnitRow with loadout/enhancement/ghost fields |
| `src-tauri/src/lib.rs` | Register migrations 031-034 |

### New Files

| File | Purpose |
|------|---------|
| `src-tauri/migrations/031_army_list_unit_loadout.sql` | Loadout config per army_list_unit slot |
| `src-tauri/migrations/032_army_list_unit_enhancement.sql` | Enhancement assignment per slot |
| `src-tauri/migrations/033_army_list_snapshots.sql` | Version snapshots (immutable blobs) |
| `src-tauri/migrations/034_army_list_ghost_units.sql` | Ghost unit columns (if unowned units in scope) |
| `src/db/queries/armyListLoadout.ts` | CRUD for army_list_unit_loadout |
| `src/db/queries/armyListEnhancement.ts` | CRUD for army_list_unit_enhancement |
| `src/db/queries/armyListSnapshots.ts` | CRUD for army_list_snapshots |
| `src/hooks/useArmyListLoadout.ts` | React Query hooks for loadout |
| `src/hooks/useArmyListEnhancement.ts` | React Query hooks for enhancement |
| `src/hooks/useArmyListSnapshots.ts` | React Query hooks for snapshots |
| `src/hooks/useBsdataPerUnit.ts` | Per-unit loadout options + model count hooks |
| `src/features/army-lists/LoadoutBuilderSheet.tsx` | Loadout configuration UI |
| `src/features/army-lists/EnhancementPickerSheet.tsx` | Enhancement selection UI |
| `src/features/army-lists/DatasheetBrowserDialog.tsx` | Expanded unit/datasheet picker |
| `src/features/army-lists/SnapshotPanel.tsx` | Snapshot list + save UI |
| `src/features/army-lists/ArmyListExportSheet.tsx` | Export to clipboard/JSON |

---

## Architectural Risks

1. **`getArmyListWithUnits` query complexity**: Adding two more LEFT JOINs to an already 5-join query. Test with lists of >20 units. React Query 5-minute staleTime means the cost is paid at load time only, but the query should be verified for correctness with all combinations of NULL loadout / NULL enhancement.

2. **`options_json` stale after re-sync**: If BSData loadout options change (group or option names renamed upstream), stored `options_json` references stale names. Mitigation: compare `synced_loadout_options.synced_at` vs `army_list_unit_loadout.updated_at` and show a "loadout may be outdated" badge if stale.

3. **Enhancement uniqueness per list**: The schema allows multiple units in the same list to have the same enhancement. GW rules prohibit this (one enhancement per list, unique). Enforce in the `EnhancementPickerSheet` UI by greying out enhancements already assigned in the same list — no DB-level UNIQUE needed (would break multi-list scenarios where the same enhancement is valid in different lists).

4. **Ghost units and LEFT JOIN**: Making `army_list_units.unit_id` nullable changes the behavior of the existing INNER JOIN to units in `getArmyListWithUnits`. The migration must change JOIN to LEFT JOIN and the SELECT must use `COALESCE(u.name, alu.ghost_unit_name)` for unit_name. All existing behavior (owned units) is unaffected by LEFT JOIN when `unit_id IS NOT NULL`.

5. **Snapshot JSON schema evolution**: Old snapshots remain as immutable blobs after schema changes. The `schema_version` key in `snapshot_json` enables future detection. For v0.2.18, treat snapshots as display-only (no restore from snapshot — export is the use case).

6. **`ArmyListUnitRow` component complexity**: The row already has 5+ interactive controls. Adding loadout + enhancement triggers risks making the row unusable. Gate advanced controls behind a collapsed "Advanced" section or an expand toggle, following the existing notes expand/collapse pattern.

---

## Sources

- Direct codebase analysis (HIGH confidence):
  - `src/db/queries/armyLists.ts` — existing COALESCE chain, join pattern, NULL-passthrough requirement
  - `src-tauri/migrations/030_bsdata_extended.sql` — synced_loadout_options schema (no points column confirmed)
  - `src-tauri/migrations/029_synced_point_tiers.sql` — model count tier schema
  - `src/features/army-lists/ArmyListDetailSheet.tsx` — sibling portal pattern, component structure
  - `src/features/army-lists/ArmyListUnitRow.tsx` — existing interactive controls, complexity baseline
  - `src/hooks/useArmyLists.ts` — cache key patterns, invalidation contracts
  - `src/lib/resolveUnitPoints.ts` — COALESCE resolution order
  - `src/db/queries/bsdataExtended.ts` — synced data read patterns, faction-level vs unit-level gap
  - `src/app/router.tsx` — route structure, bare vs layout route distinction

- Domain knowledge (MEDIUM confidence):
  - 40K 10th edition wargear is free (no per-option point costs): consistent with synced_loadout_options having no points column
  - Enhancement uniqueness rule per list: standard GW rule, no DB enforcement needed
