# Phase 136: Code Honesty & Decomposition - Research

**Researched:** 2026-06-17
**Domain:** React component deduplication, large-component decomposition, React Query hook-layer hygiene, SQLite DDL migration
**Confidence:** HIGH (all findings from direct file reads of the current codebase on master)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**HON-08 — Shared WeaponTable**
- D-01: `src/features/units/WeaponTable.tsx` is the canonical component (keep name/location). Merge `UdbWeaponsTable`'s behavior into it as a union-prop component, then delete `src/features/unit-database/UdbWeaponsTable.tsx`. Do not relocate to `components/common`.
- D-02: Migrate consumers one caller at a time, verifying EN and FR identical rendering before moving on.
- D-03: HON-08 is a pure mechanical dedup. The semantic-`<table>` accessibility fix (IN-010) is deferred.

**HON-09 — ArmyListDetailPage decomposition**
- D-04: Follow ARCHITECTURE.md Q5 extraction boundaries exactly: `ArmyListUnitTable.tsx`, `useArmyListExport` hook, `ArmyListQuickAdd.tsx`, `ArmyListPortals.tsx`, `ArmyListDetailHeader.tsx`. Orchestrator keeps reducer, data hooks, shared derived memos.
- D-05: Orchestrator < ~250 lines, each child < ~200 lines.
- D-06: Mechanical block-moves only. Each extraction in a separate revertable commit. Theme A is merged; file is clean.

**HON-10 — Route hook-layer bypasses through hooks**
- D-07: One named React Query hook per bypass, each with `*_KEY` factory. Enforce symmetry rule on mutations.
- D-08: No hook inside a `.map()`/loop. Per-row data via page-level `useMemo` Map.
- D-09: Scope to genuine render-path data reads. Justify any exclusion (imperative one-shot calls in event handlers may legitimately stay as direct calls).

**HON-11 — Vestigial `promoted_to_reminder` column**
- D-10: Remove it via new migration.
- D-11: `ALTER TABLE battle_logs DROP COLUMN promoted_to_reminder`. Never edit migration 027. Delete field from `src/types/battleLog.ts` and adjust `CreateBattleLogInput` Omit.
- D-12: New migration bumps count — update `tests/data-layer/db-helpers.ts`, `lib.rs`, and `check-version.mjs` together in one move. Author migration with LF line endings.

### Claude's Discretion
- Exact filenames/prop names for extracted ArmyListDetailPage children (follow existing conventions).
- Precise union-prop shape for the merged WeaponTable.
- Naming of any new hooks created for HON-10 bypasses.

### Deferred Ideas (OUT OF SCOPE)
- WeaponTable semantic-table accessibility (CODEBASE-REVIEW IN-010) — convert div-grid to `<table>`.
- Army-list correctness/quality findings (IN-011 ghost-unit filter, IN-013 duplicated readiness logic, IN-014 dead StaleDataBanner, IN-015 O(n²) snapshot pairing).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HON-08 | WeaponTable is a single shared component; duplicate UdbWeaponsTable eliminated | Section: HON-08 Dedup Surface — exact prop diff, 4 consumers identified (including a 3rd hidden implementation), migration order defined |
| HON-09 | ArmyListDetailPage decomposed into focused sub-components/hooks within file-size conventions, no behavior regression | Section: HON-09 Decomposition — confirmed file at 786 lines on master (clean), all 5 extraction blocks with exact line ranges and contracts |
| HON-10 | 7 components that call query functions directly are routed through React Query hooks | Section: HON-10 Hook Bypasses — exact 5 genuine bypasses pinned; 5 exclusions justified |
| HON-11 | Vestigial `promoted_to_reminder` column removed | Section: HON-11 Column Removal — migration number confirmed (049), parity-gate surface mapped, LF requirement documented |
</phase_requirements>

---

## Summary

Phase 136 is four mechanical, behavior-preserving cleanups with no user-facing changes. Every finding below is grounded in direct reads of the current master codebase.

**HON-08** surfaces a more complex dedup than the 2-file framing suggests: there are **three** separate WeaponTable implementations — `units/WeaponTable.tsx` (canonical, 43 lines), `unit-database/UdbWeaponsTable.tsx` (59 lines, to delete), and an **inline local `WeaponTable` function inside `DatasheetPointsTab.tsx`** (lines 306–361, 55 lines). All three must be consolidated. The prop differences are minor and a clean union-prop shape is straightforward.

**HON-09** confirms ArmyListDetailPage is 786 lines on master (clean — Theme A merged, no freshness props remain). The ARCHITECTURE.md Q5 extraction boundaries hold exactly against the current file. The five extractions map to concrete line ranges with identified coupling points. The most nuanced is `ArmyListPortals.tsx` (the sibling Sheet/Dialog block, lines 712–784) because all portals consume `state` destructured from the reducer; extraction requires passing the full destructured state or a props bundle — no hidden logic surprises.

**HON-10** pins **5 genuine render-path bypasses** (down from the 10-candidate list). Five candidates are justified exclusions (imperative event-handler calls, or already routed through `useQuery` inline). The 5 genuine bypasses are: `EnhancementsList` (inline `useQuery` wrapping `getEnhancementsByFaction` — no named hook exists), `DatasheetPointsTab` (three inline `useQuery` calls for `getModelCountsByFaction`, `getLoadoutOptionsByFaction`, `getLeaderTargetsByFaction`), `DashboardPage` (two inline `useQuery` calls for `getRecipeNamesByUnitIds` and `getRecipeById`), `SnapshotCompareDialog` (two inline `useQuery` calls using the `"snapshot-data"` key but no exported named hook), and `UnitDeleteDialog` (inline `useQuery` wrapping `getArmyListsByUnitId` — no named hook exists). These are all true render-path reads where React Query caching is valuable.

**HON-11** is straightforward. The current migration count on disk is 49 files (001–048 in sequence plus the faction-consolidation 048). The new column-drop migration will be `049_drop_promoted_to_reminder.sql`. The `db-helpers.ts` is already auto-derived from disk (`readdirSync`) — no manual update needed. `lib.rs` currently has 48 `Migration {}` blocks (confirmed by grep); it needs a 49th. `check-version.mjs` compares disk count vs lib.rs count — adding the file and the lib.rs entry together keeps it green.

**Primary recommendation:** Work in HON-08 → HON-11 → HON-09 → HON-10 order. HON-08 first because `ArmyListUnitRow` (a HON-09 extraction surface) already imports `WeaponTable` — getting the canonical component right before decomposing prevents touching that import twice. HON-11 first among schema changes because it is a simple, isolated DDL drop. HON-09 and HON-10 are independent of each other.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| WeaponTable rendering (HON-08) | Frontend component | — | Pure presentational; data is passed as props from parent hooks |
| ArmyListDetailPage state (HON-09) | Frontend component (orchestrator) | — | Reducer and data hooks stay in orchestrator; children are render-only consumers |
| React Query cache (HON-10) | Hooks layer (`src/hooks/`) | — | Components must call hooks, never query functions directly (PROJECT.md rule) |
| `promoted_to_reminder` DDL drop (HON-11) | Database / migrations | TypeScript types | Migration executes DDL; type files updated to match |

---

## HON-08: WeaponTable Dedup Surface (Complete File-Level Findings)

### The Three Implementations

There are **three** WeaponTable implementations to consolidate, not two:

| File | Lines | Status | Notes |
|------|-------|--------|-------|
| `src/features/units/WeaponTable.tsx` | 43 | **Canonical — keep** | Props: `weapons: UdbWeapon[], statLabel: "BS"\|"WS"` |
| `src/features/unit-database/UdbWeaponsTable.tsx` | 59 | **Delete** | Props: identical shape. Differences below. |
| `src/features/rules-hub/DatasheetPointsTab.tsx` lines 306–361 | ~55 | **Extract and replace** | Local function, same prop shape, slightly different rendering |

The `DatasheetPointsTab` local function is shadowed by the file's own import of `WeaponTable` name — the file defines a LOCAL `function WeaponTable` (line 306) rather than importing the shared one. This is the third copy and is equally a violation of HON-08.

### Prop Shape Differences

All three implementations take `weapons: UdbWeapon[]` and `statLabel: "BS" | "WS"`. The differences are rendering details:

| Difference | `units/WeaponTable` (canonical) | `UdbWeaponsTable` | `DatasheetPointsTab` local |
|---|---|---|---|
| Header "Rng" label | `"Rng"` | `"Range"` | `"Rng"` |
| Range formatting | `w.range && /^\d+$/.test(w.range) ? "${w.range}"` : (w.range ?? "—")` | `w.range ?? "—"` (raw, no `"` suffix) | Same as canonical |
| Skill formatting | `w.skill.endsWith("+") ? w.skill : "${w.skill}+"` (guard for already-suffixed) | `w.skill ?? "—"` (raw) | `w.skill ? "${w.skill}+" : "—"` (no guard) |
| Weapon row key | `${w.unit_id}-${w.weapon_group}-${w.line_order}-${i}` (composite) | `w.id` (scalar) | `${w.unit_id}-${w.weapon_group}-${w.line_order}-${i}` |
| Header bg | none (`border-b border-border`) | none | `bg-muted/50 border-b` |
| Keywords style | `text-muted-foreground leading-relaxed` | `text-muted-foreground italic` | `text-muted-foreground leading-relaxed` |
| HEADER_CLASS | inline per span | extracted constant | inline per span |

**Union-prop shape needed:** No additional props are required — the prop shape is already identical across all three. The canonical component just needs the `Range` header label to be standardized (canonical uses `"Rng"`, which is correct for the column width grid). The `bg-muted/50` header background from `DatasheetPointsTab` is a cosmetic difference; the canonical no-background style is the right default for reuse.

**Recommended merged behavior:**
- Range formatting: use canonical's `"` suffix logic (correct for inches display)
- Skill formatting: use canonical's guard (`endsWith("+")` check) — most defensive
- Keywords: `leading-relaxed` (not `italic`) — canonical wins
- Row key: composite `${w.unit_id}-${w.weapon_group}-${w.line_order}-${i}` — most stable

### Full Consumer List

| Consumer | File | Currently uses | Action |
|---|---|---|---|
| `ArmyListUnitRow` | `src/features/army-lists/ArmyListUnitRow.tsx` lines 513–514 | `units/WeaponTable` (already canonical) | No change needed (already correct import) |
| `PlaybookDatasheet` | `src/features/units/PlaybookDatasheet.tsx` lines 42–48 | `units/WeaponTable` (already canonical) | No change needed |
| `UnitAbilityCard` | `src/features/game-day/UnitAbilityCard.tsx` lines 143–149 | `units/WeaponTable` (already canonical) | No change needed |
| `UdbDatasheetSheet` | `src/features/unit-database/UdbDatasheetSheet.tsx` lines 154, 164 | `UdbWeaponsTable` — **re-point** | Change import to `units/WeaponTable`; delete `UdbWeaponsTable` usage |
| `DatasheetPointsTab` | `src/features/rules-hub/DatasheetPointsTab.tsx` lines 190, 202, 306–361 | Local `WeaponTable` function — **replace** | Delete local function (lines 306–361); add import from `units/WeaponTable`; change lines 190/202 to use imported version |

**Summary:** 3 callers already use the canonical component. 2 callers need migration (`UdbDatasheetSheet` and `DatasheetPointsTab`). The `DatasheetPointsTab` migration also requires removing the shadow local function.

### EN/FR Rendering Path

The `UdbWeapon` type (from `src/db/queries/unitDatabase.ts`) is the data shape for all three implementations. The bilingual EN/FR rendering is handled at the **query layer** (`COALESCE(col_fr, col)` in the SQL) — the component itself receives pre-resolved weapon names and descriptions. This means:
- There is **no component-level bilingual logic to preserve** in WeaponTable itself
- FR parity is confirmed by testing that `UdbDatasheetSheet` and `DatasheetPointsTab` render the same weapon names in both locales after re-pointing
- The snapshot parity test should render one known weapon row in both EN and FR mode and assert identical HTML output

### Migration Order (D-02)

1. Enhance `units/WeaponTable.tsx` if any rendering unification is needed (range/skill/keywords normalization)
2. Replace `DatasheetPointsTab`'s local function — delete lines 306–361, add import, update call sites at lines 190/202
3. Re-point `UdbDatasheetSheet` — change import from `UdbWeaponsTable` to `WeaponTable`
4. Delete `src/features/unit-database/UdbWeaponsTable.tsx`
5. `pnpm build` between each step (TypeScript strict mode surfaces dangling imports immediately)

---

## HON-09: ArmyListDetailPage Decomposition (Current File State)

### File State Confirmed

`ArmyListDetailPage.tsx` is **786 lines** on master. Theme A is merged. No `freshness` prop or memo exists in the file. The dirty-branch caveat from ARCHITECTURE.md Q5 is **resolved**. Extraction proceeds on a clean file.

### Extraction Boundaries Against Current File

| Child | Line Range | Approx Lines | Props/Contract | Coupling Notes |
|---|---|---|---|---|
| `ArmyListDetailHeader.tsx` | ~472–516 (the `<div>` back-link + `<PageHeader>` with faction badge + Edit/GameDay/Delete actions) | ~45 lines | `list`, `faction`, `onEdit: () => void`, `onGameDay: () => void`, `onDelete: () => void` | Calls `dispatch` for OPEN_EDIT/OPEN_DELETE — replace with callbacks |
| `ArmyListQuickAdd.tsx` | ~520–558 (search input + dropdown results list) | ~40 lines | `quickAddSearch`, `setQuickAddSearch`, `quickAddResults`, `onAdd: (unitId: number) => void`, two toolbar buttons | `quickAddResults` is a memo derived from `collectionUnits` and `list.faction_id`; can move with the state or be passed as a prop |
| `useArmyListExport` hook | ~355–424 (three `useCallback` export handlers) | ~70 lines (pure logic) | Needs `list`, `units`, `listEnhancements`, `faction`, `listWargear`, `locale` | Three `useCallback` functions + their Tauri plugin imports; returns `{ handleCopyToClipboard, handleSaveJson, handleSavePdf }` |
| `ArmyListUnitTable.tsx` | ~575–653 (DndContext + Table + unit rows iteration) | ~80 lines | `units` (grouped), `unitsByCategory`, `leaderTargets`, `collapsedCategories`, `onToggleCategory`, handlers, `listEnhancements`, `listId`, `leaderNameMap` | Contains `SortableUnitRow` wrapper (lines 91–133, ~43 lines) — extract with it or move `SortableUnitRow` into the new file |
| `ArmyListPortals.tsx` | ~712–784 (all 9 sibling Sheet/Dialog components) | ~73 lines | Needs ALL of: `state` (destructured), `dispatch`, `list`, `listId`, `totalPoints`, `units`, `listEnhancements`, `factionName`, `loadoutUnit`, `enhancementUnit`, `leaderUnit`, `handleDeleteClose`, `handleDeleted` | Most coupling — consider passing state + dispatch as a props bundle OR just the needed slice |

**Orchestrator remainder after all extractions:** imports + hook calls + derived memos (`groupedUnits`, `unitsByCategory`, `leaderNameMap`, `totalPoints`) + effects + non-extracted handlers (`handleToggleWarlord`, `handleDragEnd`, `toggleCategory`, `handleRemoveUnit`, `handleSaveListNotes`, `handleDetachmentSelect`, `handleDetachmentClear`, `handleDeleteClose`, `handleDeleted`) + loading/empty states + Detachment/RemindersSection/export-button section + notes textarea. Target ~220–240 lines — within the < ~250 target.

### SortableUnitRow Placement

`SortableUnitRow` (lines 91–133, ~43 lines) is a small DnD wrapper around `ArmyListUnitRow`. It uses `useSortable` from `@dnd-kit/sortable` and accepts `leaderTargets: SyncedLeaderTargetRow[]`. It belongs in `ArmyListUnitTable.tsx` since it is used exclusively there.

### Reducer-Dispatch Coupling

`ArmyListPortals.tsx` is the trickiest extraction. The portals each call `dispatch({ type: "..." })` directly. Three options:
1. Pass `dispatch` as a prop (simple, but leaks reducer shape)
2. Pass pre-bound callback functions for each portal action (verbose but encapsulated)
3. Pass the full `state` and `dispatch` — matches the established reducer pattern

Option 3 is recommended for the portals block: pass `state` (already destructured in orchestrator) + `dispatch` + the other data props. This keeps the extraction mechanical and the portal block's `dispatch` calls unchanged.

### `useArmyListExport` Hook Pattern

The three export handlers (`handleCopyToClipboard`, `handleSaveJson`, `handleSavePdf`) are `useCallback`s that close over `list, units, listEnhancements, faction, listWargear, locale`. They use Tauri plugin imports (`writeText`, `save`, `writeTextFile`, `invoke`). Extract as:

```typescript
// src/features/army-lists/useArmyListExport.ts
export function useArmyListExport({ list, units, listEnhancements, faction, listWargear, locale }) {
  const handleCopyToClipboard = useCallback(async () => { ... }, [...]);
  const handleSaveJson = useCallback(async () => { ... }, [...]);
  const handleSavePdf = useCallback(async () => { ... }, [...]);
  return { handleCopyToClipboard, handleSaveJson, handleSavePdf };
}
```

This hook is called in the orchestrator and its return values passed down to the export-button row and `ArmyListPortals` (PrintPreviewDialog is in portals but uses `list/units/enhancements/factionName`, not the export handlers).

---

## HON-10: Hook-Layer Bypasses — Pinned Findings

### The 10 Candidates: Verdict for Each

| Component | File | Direct query call | Render path? | Verdict |
|---|---|---|---|---|
| `EnhancementsList` | `src/features/rules-hub/EnhancementsList.tsx` | `useQuery({ queryFn: () => getEnhancementsByFaction(factionId) })` inline | YES — renders enhancment list | **GENUINE BYPASS** — has a named key `["enhancements-by-faction", factionId]` but no exported hook in `src/hooks/` |
| `DatasheetPointsTab` | `src/features/rules-hub/DatasheetPointsTab.tsx` | 3 `useQuery` calls for `getModelCountsByFaction`, `getLoadoutOptionsByFaction`, `getLeaderTargetsByFaction` | YES — drives the faction datasheet content | **GENUINE BYPASS** — inline `useQuery` with local keys, no exported hooks |
| `DashboardPage` | `src/features/dashboard/DashboardPage.tsx` | 2 `useQuery` calls for `getRecipeNamesByUnitIds` and `getRecipeById` | YES — drives focus-unit recipe display | **GENUINE BYPASS** — `useRecipe(id)` exists in `useRecipes.ts` but is NOT used; `getRecipeNamesByUnitIds` has no hook |
| `SnapshotCompareDialog` | `src/features/army-lists/SnapshotCompareDialog.tsx` | 2 `useQuery` calls wrapping `getSnapshotData` | YES — renders snapshot diff on open | **GENUINE BYPASS** — uses key `["snapshot-data", id]` inline; `useSnapshotsByList` exists but not `useSnapshotData` |
| `UnitDeleteDialog` | `src/features/units/UnitDeleteDialog.tsx` | `useQuery({ queryFn: () => getArmyListsByUnitId(unit.id) })` | YES — drives the warning state | **GENUINE BYPASS** — key `["unit-army-lists", unit.id]`; no exported `useUnitArmyLists` hook |
| `SnapshotHistorySheet` | `src/features/army-lists/SnapshotHistorySheet.tsx` | `getSnapshotData` in `handleExportJson` callback | NO — inside an async event handler (button click, export JSON) | **JUSTIFIED EXCLUSION** — on-demand, not a render-path read; caching adds no value |
| `RecipeFormSheet` | `src/features/recipes/RecipeFormSheet.tsx` | `saveRecipeGraph` in form submit handler | NO — `saveRecipeGraph` is a WRITE (mutation), not a read | **JUSTIFIED EXCLUSION** — mutation, not a query; belongs as direct call in handler |
| `DataManagementTab` | `src/features/settings/DataManagementTab.tsx` | `getAppSettings`, `upsertAppSetting` | NO — inside import/export event handlers | **JUSTIFIED EXCLUSION** — settings I/O is imperative one-shot in handlers |
| `PlaybookTab` | `src/features/units/PlaybookTab.tsx` | `getUdbUnitDetail`, `linkUdbUnit` | NO — called inside `handlePickerSelect` (event handler, runs once on user action) | **JUSTIFIED EXCLUSION** — both calls are imperative one-shots after user confirms a datasheet link; caching `getUdbUnitDetail` provides no value here |
| `UnitDeleteDialog` (photos) | same file | `getPhotoFilenamesByUnit`, `getPhotosByUnit`, `deleteUnitPhoto` | NO — inside `handleConfirm` (event handler) | **JUSTIFIED EXCLUSION** — imperative cleanup in delete handler |

### The 5 Genuine Bypasses

**Bypass 1: `EnhancementsList`**
- Current: `useQuery({ queryKey: ["enhancements-by-faction", factionId], queryFn: () => getEnhancementsByFaction(factionId), staleTime: Infinity, gcTime: Infinity })`
- New hook: `useEnhancementsByFaction(factionId: string)` in `src/hooks/useEnhancements.ts`
- Key: `ENHANCEMENTS_BY_FACTION_KEY = (factionId: string) => ["enhancements-by-faction", factionId] as const`
- Symmetry check: `getEnhancementsByFaction` reads from `bsdata_enhancements` — a canonical BSData table, not user-mutable. No mutations touch it; `staleTime: Infinity` is correct. No invalidation symmetry concern.

**Bypass 2: `DatasheetPointsTab` (3 queries)**
- Currently 3 separate inline `useQuery` calls for BSData tables (`synced_model_counts`, `synced_loadout_options`, `synced_leader_targets`)
- New hooks: `useModelCountsByFaction(factionId)`, `useLoadoutOptionsByFaction(factionId)`, `useLeaderTargetsByFaction(factionId)` — or combined as `useBsdataFactionData(factionId)` returning all three
- Keys: `MODEL_COUNTS_KEY`, `LOADOUT_OPTIONS_KEY`, `LEADER_TARGETS_KEY` (all parameterized by factionId)
- These are canonical BSData read-only tables; `staleTime: Infinity` correct; no mutation symmetry concern
- File also contains the local `usePointTiers` function (line 39–53) — this is also an inline hook function, but it is ALREADY properly structured as a local hook with a proper key. It can be extracted to `src/hooks/` as well if desired, but it is not a rule violation per se.

**Bypass 3: `DashboardPage` (2 queries)**
- `getRecipeNamesByUnitIds([focusUnitId])` — key `["recipes", "by-unit", focusUnitId ?? 0]`
- `getRecipeById(primaryAssignment.recipe_id)` — key `["recipes", primaryAssignment.recipe_id]`
- `useRecipe(id)` already exists in `useRecipes.ts` and covers `getRecipeById` — use it. Just replace the inline `useQuery` with `useRecipe(primaryAssignment?.recipe_id)`.
- `getRecipeNamesByUnitIds` has no exported hook. `useKanbanEnrichment` and `useWorkflowPositions` both call it internally. New hook needed: `useRecipeNamesByUnitIds(ids: number[])` in `useRecipes.ts` (or extend `useWorkflowPositions`).
- Symmetry: `RECIPES_KEY` is invalidated by `useCreateRecipe`/`useDeleteRecipe`/`useUpdateRecipe`/`useDuplicateRecipe`. The new `["recipes", "by-unit", id]` key is already invalidated by those same mutations (they invalidate `["recipes", "by-unit"]` prefix — confirmed in `useRecipes.ts` lines 40, 63).

**Bypass 4: `SnapshotCompareDialog` (2 queries)**
- Two `useQuery` calls: keys `["snapshot-data", idA]` and `["snapshot-data", idB]`
- `useSnapshotsByList` exists but reads the list, not individual snapshot data. New: `useSnapshotData(snapshotId: number | null)` in `src/hooks/useArmyListSnapshots.ts`
- Symmetry: snapshots are immutable once created (no mutation updates a snapshot's data blob); `useDeleteSnapshot` invalidates `["snapshots", listId]` but NOT `["snapshot-data", id]`. After deletion, the Dialog closes so stale-deleted cache is harmless. No symmetry gap to fix.

**Bypass 5: `UnitDeleteDialog` (1 query)**
- `useQuery({ queryKey: ["unit-army-lists", unit?.id ?? "none"], queryFn: () => getArmyListsByUnitId(unit.id), enabled: open && unit !== null })`
- New hook: `useUnitArmyLists(unitId: number | null, enabled: boolean)` in `src/hooks/useUnits.ts` (or a new `useArmyListsByUnit.ts`)
- Symmetry: `army_list_units.unit_id` is ON DELETE RESTRICT; when units are added/removed from lists, `useAddUnitToList`/`useRemoveUnitFromList` invalidate `["army-list-units", listId]` — but NOT `["unit-army-lists", unitId]`. This is a **symmetry gap**: after removing a unit from a list, the `UnitDeleteDialog`'s membership query could show stale results. Fix: `useRemoveUnitFromList` and `useAddUnitToList` should also invalidate `["unit-army-lists"]` (prefix invalidation).

### Hook Naming Convention

Per CLAUDE.md: one hook file per entity, exporting `ENTITY_KEY` + `useEntity` + mutations. New hooks:
- `src/hooks/useEnhancements.ts` — `ENHANCEMENTS_BY_FACTION_KEY`, `useEnhancementsByFaction`
- Additions to `src/hooks/useArmyListSnapshots.ts` — `SNAPSHOT_DATA_KEY`, `useSnapshotData`
- Addition to `src/hooks/useRecipes.ts` — `RECIPE_NAMES_BY_UNIT_KEY`, `useRecipeNamesByUnitIds`
- `useRecipe` already exists — replace DashboardPage's inline `getRecipeById` with it
- `useUnits.ts` or new file — `UNIT_ARMY_LISTS_KEY`, `useUnitArmyLists` + symmetry fix on add/remove mutations

---

## HON-11: `promoted_to_reminder` Column Removal

### Current State Confirmed

`src/types/battleLog.ts`:
- Line 34: `promoted_to_reminder: number;` field on `BattleLog` interface
- Line 39: `export type CreateBattleLogInput = Omit<BattleLog, "id" | "created_at" | "promoted_to_reminder">`

`src-tauri/migrations/027_battle_log_after_action.sql` line 11:
```sql
ALTER TABLE battle_logs ADD COLUMN promoted_to_reminder INTEGER NOT NULL DEFAULT 0;
```

No source file in `src/` or `src-tauri/` reads or writes `promoted_to_reminder` except `battleLog.ts` itself.

### Migration Number

Current disk count: **49 files** (001–048 with the recently-landed 048 faction-consolidation, plus the glob shows 49 total including 048_consolidate_factions.sql). The new migration is **`049_drop_promoted_to_reminder.sql`**.

`lib.rs` currently has **48 `Migration {}` blocks** (confirmed: grep found 48). After adding 049: lib.rs needs 49 blocks.

**Important:** `db-helpers.ts` is NOW auto-derived from disk (`readdirSync` — confirmed in the file). Adding the `.sql` file to disk automatically updates `HOBBYFORGE_MIGRATIONS` and `HOBBYFORGE_MIGRATION_COUNT`. No manual edit to `db-helpers.ts` needed.

`check-version.mjs` compares disk `.sql` count vs lib.rs `Migration {}` count. Adding both the file and the lib.rs entry together keeps the gate green.

### Migration Content

```sql
-- 049_drop_promoted_to_reminder.sql
-- Phase 136 (HON-11): Remove vestigial promoted_to_reminder column.
-- The "surface forgotten rules as reminders" feature was never built.
-- Zero reads or writes of this column exist in src/ or src-tauri/.
-- SQLite ALTER TABLE DROP COLUMN requires SQLite >= 3.35.0 (supported by
-- tauri-plugin-sql's bundled SQLite). The column is INTEGER NOT NULL DEFAULT 0
-- with no FK references — a straightforward drop.
ALTER TABLE battle_logs DROP COLUMN promoted_to_reminder;
```

SQLite `DROP COLUMN` support: SQLite 3.35.0+ (released 2021-03-12). Tauri's bundled SQLite is well above 3.35; D-11 confirms this is supported.

### Type File Changes

In `src/types/battleLog.ts`:
1. Remove line 34: `promoted_to_reminder: number;`
2. Line 39 changes from `Omit<BattleLog, "id" | "created_at" | "promoted_to_reminder">` to `Omit<BattleLog, "id" | "created_at">`. The column never appeared in `CreateBattleLogInput` (it was already Omitted), so `UpdateBattleLogInput` (which extends `CreateBattleLogInput`) is also clean.

### Parity Gate Surface (Three-Way)

| File | Current count | After 049 | Action required |
|------|--------------|-----------|-----------------|
| `src-tauri/migrations/` disk | 49 files | 49 (no change — file was just added) | Write `049_drop_promoted_to_reminder.sql` |
| `src-tauri/src/lib.rs` `Migration {}` | 48 | 49 | Add one `Migration {}` block for 049 |
| `tests/data-layer/db-helpers.ts` `HOBBYFORGE_MIGRATIONS` | auto-derived from disk | auto-derived (self-updating) | No change needed |
| `scripts/check-version.mjs` | disk count vs lib.rs count | gate passes when both = 49 | No change needed |

**LF line ending requirement:** Author `049_drop_promoted_to_reminder.sql` with LF endings. `check-version.mjs` leg 3 scans for CR bytes and fails the build if found. The migration must pass this check before commit.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WeaponTable rendering variations | Multiple component forks | Union-prop single component | 3 forks already exist; dedup is the point |
| Hook for existing query | New `useQuery` inline in component | Existing hook in `src/hooks/` | `useRecipe(id)` already covers `getRecipeById` |
| Mutation invalidation logic | Rebuild per-component | Symmetry rule on existing mutations | `useRemoveUnitFromList` already invalidates relevant keys — just extend |
| SQLite column removal | DDL in application code | New numbered migration | CLAUDE.md: migrations run in filename order, auto-executed at startup |
| Migration count tracking | `EXPECTED_SCHEMA_VERSION` constant | `readdirSync` auto-derivation (already in place) | `db-helpers.ts` is already auto-derived; lib.rs is the only manual entry |

---

## Common Pitfalls

### Pitfall A: Missing the Third WeaponTable (DatasheetPointsTab local function)
**What goes wrong:** Only `UdbWeaponsTable` is deleted; the local `function WeaponTable` in `DatasheetPointsTab.tsx` (lines 306–361) survives. HON-08 is incomplete — three implementations remain as two.
**Why it happens:** The shadow local function has the same name as the canonical import; easy to miss that it is never imported from `units/`.
**How to avoid:** The HON-08 migration order above explicitly includes `DatasheetPointsTab` as step 2. `pnpm build` will NOT catch this because the local function is valid TypeScript and the import is not referenced by the canonical component.
**Detection:** `grep -rn "function WeaponTable" src/` should return exactly 1 result (the canonical file) after HON-08 is complete.

### Pitfall B: ArmyListPortals dispatch coupling
**What goes wrong:** Extracting `ArmyListPortals.tsx` while the portals call `dispatch` directly. If dispatch is not passed as a prop, the extracted component has no access to it.
**How to avoid:** Pass both `state` (destructured object) and `dispatch` as props to `ArmyListPortals`. The portal block does not define any new state of its own — it is purely a consumer of the orchestrator's reducer.
**Detection:** TypeScript compile error: `dispatch is not defined` in the extracted file.

### Pitfall C: `useUnitArmyLists` invalidation gap
**What goes wrong:** New `useUnitArmyLists` hook registers key `["unit-army-lists", unitId]`. If `useAddUnitToList` / `useRemoveUnitFromList` do not invalidate that prefix, the dialog can show a stale membership count after list changes.
**How to avoid:** Add `qc.invalidateQueries({ queryKey: ["unit-army-lists"] })` to both `useAddUnitToList.onSuccess` and `useRemoveUnitFromList.onSuccess` in `useArmyLists.ts`.
**Detection:** Delete a unit from an army list, open UnitDeleteDialog for that unit — dialog still shows it in the list.

### Pitfall D: lib.rs Migration count drift
**What goes wrong:** `049_drop_promoted_to_reminder.sql` is written to disk but lib.rs is not updated. `check-version.mjs` leg 2 fails: "50 .sql files on disk, 48 Migration{} entries in lib.rs". (Note: disk already has 49 from current master; adding 049 makes 49 on disk vs 48 in lib.rs.)
**How to avoid:** HON-11 must be a single atomic commit: the .sql file + the lib.rs `Migration {}` block + the `battleLog.ts` type changes together.
**Detection:** `pnpm check:version` fails immediately after adding the file.

### Pitfall E: CRLF in migration 049
**What goes wrong:** `check-version.mjs` leg 3 detects CR bytes in migration files and fails. A Windows editor with CRLF defaults can inject `\r\n` into the new migration.
**How to avoid:** Verify with `git ls-files --eol src-tauri/migrations/049_drop_promoted_to_reminder.sql` after writing — output should show `w/lf`. Use the Write tool (which writes LF) rather than a Windows editor. `.gitattributes` has `*.sql eol=lf` — this normalizes on commit but the CI gate catches the file before git smudge runs.
**Detection:** `pnpm check:version` fails with "CR byte (0x0D) found in migration file(s): 049_drop_promoted_to_reminder.sql".

---

## Code Examples

### Union-prop WeaponTable (recommended merged implementation)

```typescript
// src/features/units/WeaponTable.tsx — after HON-08 merge
import type { UdbWeapon } from "@/db/queries/unitDatabase";

interface WeaponTableProps {
  weapons: UdbWeapon[];
  statLabel: "BS" | "WS";
}

export function WeaponTable({ weapons, statLabel }: WeaponTableProps) {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1 border-b border-border">
        {["Name", "Rng", "A", statLabel, "S", "AP", "D"].map((h) => (
          <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center first:text-left">
            {h}
          </span>
        ))}
      </div>
      {weapons.map((w, i) => {
        const range = w.range && /^\d+$/.test(w.range) ? `${w.range}"` : (w.range ?? "—");
        const skill = w.skill ? (w.skill.endsWith("+") ? w.skill : `${w.skill}+`) : "—";
        return (
          <div key={`${w.unit_id}-${w.weapon_group}-${w.line_order}-${i}`} className="border-b border-border last:border-0">
            <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1.5 items-center">
              <span className="text-sm font-medium truncate">{w.name}</span>
              <span className="text-xs text-center tabular-nums">{range}</span>
              <span className="text-xs text-center tabular-nums">{w.attacks ?? "—"}</span>
              <span className="text-xs text-center tabular-nums">{skill}</span>
              <span className="text-xs text-center tabular-nums">{w.strength ?? "—"}</span>
              <span className="text-xs text-center tabular-nums">{w.ap ?? "0"}</span>
              <span className="text-xs text-center tabular-nums">{w.damage ?? "—"}</span>
            </div>
            {w.keywords && (
              <p className="px-2 pb-1.5 text-xs text-muted-foreground leading-relaxed">
                {w.keywords}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

The above is essentially the canonical file unchanged — it already covers all three use cases.

### New hook: useEnhancementsByFaction

```typescript
// src/hooks/useEnhancements.ts
import { useQuery } from "@tanstack/react-query";
import { getEnhancementsByFaction } from "@/db/queries/bsdataExtended";

export const ENHANCEMENTS_BY_FACTION_KEY = (factionId: string) =>
  ["enhancements-by-faction", factionId] as const;

export function useEnhancementsByFaction(factionId: string) {
  return useQuery({
    queryKey: ENHANCEMENTS_BY_FACTION_KEY(factionId),
    queryFn: () => getEnhancementsByFaction(factionId),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
```

### New hook: useSnapshotData

```typescript
// Addition to src/hooks/useArmyListSnapshots.ts
export const SNAPSHOT_DATA_KEY = (id: number | null) =>
  ["snapshot-data", id] as const;

export function useSnapshotData(id: number | null, enabled: boolean) {
  return useQuery({
    queryKey: SNAPSHOT_DATA_KEY(id),
    queryFn: () => getSnapshotData(id!),
    enabled: id !== null && enabled,
  });
}
```

### Migration 049

```sql
-- src-tauri/migrations/049_drop_promoted_to_reminder.sql
-- Phase 136 (HON-11): Remove vestigial promoted_to_reminder column.
-- The "surface forgotten rules as reminders" feature was never built.
-- Zero reads or writes of this column exist in src/ or src-tauri/.
-- SQLite ALTER TABLE DROP COLUMN requires SQLite >= 3.35.0 (tauri-plugin-sql
-- bundled SQLite is >= 3.35; confirmed by D-11).
ALTER TABLE battle_logs DROP COLUMN promoted_to_reminder;
```

---

## Validation Architecture

### HON-08 Acceptance Tests

| Test | Type | Command / Check | Proves |
|------|------|-----------------|--------|
| `grep -rn "function WeaponTable" src/` returns exactly 1 result | Smoke | `grep -rn "function WeaponTable" src/` | No shadow copies remain |
| `grep -rn "UdbWeaponsTable" src/` returns 0 results | Smoke | `grep -rn "UdbWeaponsTable" src/` | File deleted and no stray imports |
| `pnpm build` passes (TypeScript strict) | Type | `pnpm build` | No dangling imports, all callers compile |
| Vitest: render `WeaponTable` with a weapon where range is numeric ("24") → verify "24\"" display | Unit | `pnpm test -- tests/features/units/WeaponTable.test.ts` | Range formatting preserved |
| Vitest: render `UdbDatasheetSheet` with mock weapons → verify same output as before | Component | Same | Consumer regression check |
| Vitest: render `DatasheetPointsTab` with mock weapons in EN and FR locale → assert identical weapon names (FR via COALESCE comes from query layer, not component) | Component | `pnpm test -- tests/features/rules-hub/DatasheetPointsTab.test.ts` | EN/FR parity |

### HON-09 Acceptance Tests

| Test | Type | Command / Check | Proves |
|------|------|-----------------|--------|
| `wc -l src/features/army-lists/ArmyListDetailPage.tsx` < 250 | Line count | `wc -l` | Orchestrator size target met |
| New child files each < 200 lines | Line count | `wc -l` each | Child size targets met |
| `pnpm build` passes | Type | `pnpm build` | No broken imports or missing props |
| Vitest: render `ArmyListDetailPage` with mocked hooks → assert Header, QuickAdd, UnitTable, export buttons, portals all present | Integration | `pnpm test -- tests/features/army-lists/ArmyListDetailPage.test.ts` | Behavior preserved |
| Vitest: `ArmyListPortals` renders all 9 portals when state flags are set | Unit | `pnpm test -- tests/features/army-lists/ArmyListPortals.test.ts` | Portal contract preserved |

### HON-10 Acceptance Tests

| Test | Type | Command / Check | Proves |
|------|------|-----------------|--------|
| `grep -rn "from \"@/db/queries" src/features/` — each result is a type import OR an imperative call in an event handler, not a `queryFn` | Manual audit | grep | No new render-path bypasses |
| `pnpm build` passes | Type | `pnpm build` | New hooks compile, no dangling imports |
| Vitest: `EnhancementsList` with mocked `useEnhancementsByFaction` renders correctly | Unit | new test | Hook used correctly |
| Vitest: `UnitDeleteDialog` with mocked `useUnitArmyLists` shows warning state when lists returned | Unit | existing test pattern | Hook contract correct |
| Manual: remove unit from army list → open UnitDeleteDialog → verify membership count is current (not stale) | Manual | interactive | Symmetry fix works |

### HON-11 Acceptance Tests

| Test | Type | Command / Check | Proves |
|------|------|-----------------|--------|
| `pnpm check:version` passes (leg 2: disk count == lib.rs count) | Gate | `pnpm check:version` | Migration count parity |
| `pnpm check:version` passes (leg 3: no CR bytes) | Gate | `pnpm check:version` | LF line endings |
| `pnpm test -- tests/data-layer/migration-parity.test.ts` passes | Migration | `pnpm test` | lib.rs == disk count |
| `pnpm test -- tests/data-layer/` with in-memory DB — `promoted_to_reminder` column does not exist after migrations | Data layer | `pnpm test -- tests/data-layer/` | Column actually dropped |
| `pnpm build` passes | Type | `pnpm build` | `battleLog.ts` compiles with field removed; no consumer breaks |
| `grep -rn "promoted_to_reminder" src/` returns 0 results | Smoke | grep | No dangling references |

---

## Project Constraints (from CLAUDE.md)

- **Parameterized queries:** `$1, $2` positional syntax for all SQL (Tauri plugin-sql requirement)
- **FK enforcement:** `PRAGMA foreign_keys = ON` in every new connection (client.ts). Not relevant for DDL-only migration 049.
- **Booleans:** stored as `0 | 1` integers — `promoted_to_reminder` was `INTEGER NOT NULL DEFAULT 0`. No impact after drop.
- **Never edit existing migration files:** Migration 027 is untouched; new migration 049 is additive.
- **Migrations run in filename order:** 049 sorts after 048 — correct.
- **Hook convention:** One hook file per entity, exporting `ENTITY_KEY` + `useEntity` + mutations. New hooks must follow this pattern.
- **Testing:** Vitest + RTL, tests in `tests/` mirroring `src/features/`. Tauri APIs must be mocked (`vi.mock`).
- **TypeScript strict:** `noUnusedLocals`, `noUnusedParameters` — removing the `promoted_to_reminder` type field must not leave any consumer dangling (verified: no consumer uses it).
- **No ESLint/Prettier:** TypeScript strict mode is the quality gate.

---

## Assumptions Log

> All findings below are from direct file reads of the current master codebase. No assumed claims.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SQLite bundled in tauri-plugin-sql is >= 3.35.0 (supports `DROP COLUMN`) | HON-11 | Migration 049 would fail at startup. Mitigated: D-11 locked this in CONTEXT.md. |

**All other claims are VERIFIED** by direct file reads in this session (the actual .tsx/.ts/.sql/.rs/.ts files were read verbatim).

---

## Environment Availability

Step 2.6 SKIPPED for HON-08/09/10 (no new external dependencies — pure React/TypeScript component work). HON-11 uses SQLite `ALTER TABLE DROP COLUMN` (confirmed by D-11 in CONTEXT.md that tauri's bundled SQLite supports it).

| Dependency | Required By | Available | Notes |
|---|---|---|---|
| `better-sqlite3` (in-memory test DB) | `tests/data-layer/` HON-11 validation | Confirmed — `db-helpers.ts` uses it | `readdirSync` auto-derives migration list |
| `pnpm check:version` gate | HON-11 parity check | Confirmed — `scripts/check-version.mjs` in place | Checks disk vs lib.rs vs LF |

---

## Sources

### Primary (HIGH — direct file reads, 2026-06-17)
- `src/features/units/WeaponTable.tsx` — canonical prop shape, 43 lines
- `src/features/unit-database/UdbWeaponsTable.tsx` — second impl, 59 lines, differences documented
- `src/features/rules-hub/DatasheetPointsTab.tsx` — third impl (local function lines 306–361) + 3 hook bypasses
- `src/features/army-lists/ArmyListDetailPage.tsx` — 786 lines, full decomposition mapping
- `src/features/rules-hub/EnhancementsList.tsx` — bypass 1 confirmed
- `src/features/dashboard/DashboardPage.tsx` — bypass 3 confirmed (lines 93–115)
- `src/features/army-lists/SnapshotCompareDialog.tsx` — bypass 4 confirmed
- `src/features/units/UnitDeleteDialog.tsx` — bypass 5 confirmed
- `src/features/army-lists/SnapshotHistorySheet.tsx` — exclusion 1 confirmed
- `src/features/recipes/RecipeFormSheet.tsx` — exclusion 2 confirmed
- `src/features/settings/DataManagementTab.tsx` — exclusion 3 confirmed
- `src/features/units/PlaybookTab.tsx` — exclusion 4 confirmed
- `src/hooks/useRecipes.ts` — RECIPES_KEY, useRecipe, invalidation symmetry
- `src/types/battleLog.ts` — `promoted_to_reminder` field at line 34, Omit at line 39
- `src-tauri/migrations/027_battle_log_after_action.sql` — column origin
- `src-tauri/migrations/048_consolidate_factions.sql` — most recent migration (048)
- `src-tauri/migrations/` directory listing — 49 files on disk total
- `src-tauri/src/lib.rs` `Migration {}` count — 48 (grep confirmed)
- `tests/data-layer/db-helpers.ts` — auto-derives from readdirSync (no manual edit needed)
- `scripts/check-version.mjs` — 3 legs: version parity, migration count, CR-byte scan
- `.planning/phases/136-code-honesty-decomposition/136-CONTEXT.md` — all locked decisions D-01..D-12
- `.planning/research/ARCHITECTURE.md` §Q5/Q6/Anti-patterns — extraction boundaries, build order
- `.planning/research/PITFALLS.md` Pitfalls 4/8/9/12/14 — hook-loop, lost invalidation, render-drift

---

## Metadata

**Confidence breakdown:**
- HON-08 dedup surface: HIGH — all three implementations read directly; consumer list complete
- HON-09 decomposition: HIGH — full 786-line file read; ARCHITECTURE.md Q5 boundaries verified against current file
- HON-10 bypass classification: HIGH — all 10 candidates read and classified; 5 genuine / 5 excluded with file-level evidence
- HON-11 migration: HIGH — exact file contents, migration count, type field location all verified directly

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (stable codebase; only invalidated by new migrations or refactors touching these surfaces)
