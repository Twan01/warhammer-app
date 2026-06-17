# Phase 134: No Dead Ends - Research

**Researched:** 2026-06-17
**Domain:** React + React Query hooks, SQLite canonical data, TypeScript prop-type compatibility
**Confidence:** HIGH

---

## Summary

Phase 134 removes two permanent dead ends in the datasheet/rules surfaces. Both fixes are
shallow wiring changes — no new data migration and no new pipeline import. All the necessary
data, components, and query plumbing already exist.

**HON-03 (Shared Abilities tab):** The `useSharedAbilitiesByFaction` stub in `RulesHubPage.tsx`
must be replaced with a real React Query hook. The correct data source is **`udb_detachment_abilities`
via `getDetachmentAbilitiesByFaction`**, which already exists and is already wired into `useGameData.ts`
as `useDetachmentAbilities`. There is **no standalone faction army-rule CSV** in the bundled dataset
(`Abilities.csv` does not exist in `scripts/data/`), so `udb_unit_abilities` rows with
`ability_type = "Faction"` are pure Wahapedia reference IDs with empty `name`/`description`
columns — they cannot serve as the data source for this tab. The detachment-abilities source
(284 rows across 26 factions, already imported) is the correct and only available canonical source.

**CRITICAL BLOCKER CHECK FOR D-02:** The bundled data does NOT expose a richer "faction shared
ability / army rule" source than `udb_detachment_abilities`. The `Datasheets_abilities.csv`
rows with `type="Faction"` (1,481 rows) contain ability_id references but have empty `name`
and `description` columns — they are cross-references to a separate `Abilities.csv` that
**does not exist** in `scripts/data/`. Using `udb_unit_abilities WHERE ability_type='Faction'`
would produce rows with empty names and descriptions — worse than the current stub. The decision
to use `getDetachmentAbilitiesByFaction` (D-01) stands as the correct and only viable choice.
HON-03 is NOT blocked.

**HON-04 (Link unit dead end):** The `disabled={!wahapediaFactionId}` gate in `PlaybookStats`
must be removed. When a collection faction has `wahapedia_faction_id = NULL`, the correct flow
is: (1) show a dialog letting the user pick the canonical faction and persist it via
`updateFaction({ id, wahapedia_faction_id })`, then (2) open `DatasheetPicker`. The existing
`FactionLinkDialog` is oriented in the **opposite direction** (UDB faction → pick a collection
faction), so HON-04 needs either a new small dialog or a carefully adapted variant. The
`DatasheetPicker` also needs an all-factions browse path for the `factionId = undefined` case,
using the existing FTS5 `searchUdbUnits` function rather than a full table scan.

**Primary recommendation:** Two targeted wiring changes. HON-03: replace the stub with a
`useDetachmentAbilitiesByFaction` hook call + adapter (strip `detachment_name`, add
`legend: null`). HON-04: remove the disabled gate, add a small "pick canonical faction" step
using the existing `useWahapediaFactions` + `useUpdateFaction`, and enable the browse-all
path in `DatasheetPicker` via `useUdbSearch` when `factionId` is undefined.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Replace `useSharedAbilitiesByFaction` stub with a real hook backed by `udb_detachment_abilities` via `getDetachmentAbilitiesByFaction(factionId)`. Render with the existing `SharedAbilityCard`.
- **D-02:** No new DB migration and no new pipeline import in this phase. Research question resolved: `udb_unit_abilities.ability_type='Faction'` rows have empty names/descriptions — not a viable alternative source. `udb_detachment_abilities` (faction-scoped) is the only correct source.
- **D-03:** Honest empty state — if a faction has zero abilities, show explicit "No shared abilities for this faction" message, never a silent blank panel.
- **D-04:** The "Link unit" / "Re-link" button must never be permanently disabled due to `wahapediaFactionId` being null. Remove `disabled={!wahapediaFactionId}`.
- **D-05:** Root-cause fix — when faction is unmapped, let the user map it first (persist `wahapedia_faction_id` via `updateFaction`), then open `DatasheetPicker`.
- **D-06:** Always-available fallback — `DatasheetPicker` in browse-all mode when `factionId` is undefined, not "No datasheets found". Research question resolved: see D-06 findings below.
- **D-07:** Reuse existing components — `SharedAbilityCard`, `FactionLinkDialog` pattern, `DatasheetPicker`, `updateFaction`. Offline, single-database, `$1/$2` parameterized queries.

### Claude's Discretion
- Exact UX of the unmapped-faction Link flow (one combined dialog vs. faction-link step → picker step; whether to reuse `FactionLinkDialog` verbatim or a small variant).
- Precise empty-state copy.
- Whether the Shared Abilities tab groups abilities by detachment or shows a flat list.
- Exact shape of the all-factions browse query.

### Deferred Ideas (OUT OF SCOPE)
- Full bidirectional Collection ⇆ Unit Database discovery loop (PLAY-04, Phase 138).
- Faction page / Unit Database consolidation (Phase 135).
- Importing a dedicated faction army-rule data source via a new migration or pipeline.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HON-03 | The Rules Hub "Shared Abilities" tab displays real faction shared/army-rule abilities from the canonical database (no empty stub). | `getDetachmentAbilitiesByFaction` + `useDetachmentAbilities` hook already exist and return 284 real abilities for 26 factions. Adapter needed for `SharedAbilityCard` prop shape. |
| HON-04 | A unit's datasheet "Link unit" action is never a permanent dead end — can always link to canonical Unit Database. | Remove `disabled={!wahapediaFactionId}`, add faction-mapping step using `useWahapediaFactions` + `useUpdateFaction`, add browse-all path via `useUdbSearch`. |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Shared Abilities data fetch | DB / Query layer (`udbGameData.ts`) | React Query hook (`useGameData.ts`) | Query already exists; only the hook call in the UI layer is missing |
| Shared Abilities rendering | Frontend component (`RulesHubPage.tsx`) | — | Tab structure + `SharedAbilityCard` already in place; only data source changes |
| "Link unit" button state | Frontend component (`PlaybookStats.tsx`) | — | Dead-end gate is a single `disabled` prop in this component |
| Faction mapping (unmapped case) | Frontend component + DB write | `useFactions.useUpdateFaction` | Persist `wahapedia_faction_id` via existing mutation; invalidation cascades automatically |
| Browse-all datasheets (fallback) | DB / Query layer + Frontend component | `useUnitDatabase.useUdbSearch` | FTS5 search already exists; needs a search-based browse mode in `DatasheetPicker` |

---

## HON-03: Shared Abilities Tab — Full Findings

### D-02 Resolution: What faction-shared-ability data exists in the bundled DB?

**`udb_unit_abilities` with `ability_type = "Faction"`**

The `Datasheets_abilities.csv` source has 1,481 rows where `type = "Faction"`. These rows
reference 37 distinct `ability_id` values (e.g., `000003676`, `000003676` appears on
hundreds of unit rows). The `name` and `description` columns are **empty** in almost all
rows — the Wahapedia CSV format uses these as pure cross-references to a standalone
`Abilities.csv` that is **not present** in `scripts/data/`. Exceptions: 5 rows have a
`name` populated (all are "Shadow In The Warp (Ravener Prime only)" or "Cabal of Sorcerers
(X only)") with still-empty `description`. [VERIFIED: grep of Datasheets_abilities.csv]

Because the build script maps `row["type"]` → `ability_type`, these rows ARE imported into
`udb_unit_abilities` but with empty `name` values (the build sets `name: row["name"]?.trim() ?? ""`).
A query `SELECT * FROM udb_unit_abilities WHERE ability_type = 'Faction'` would return
rows with `name = ""` and `description = ""` — useless for display. Do NOT use this path.

**`udb_unit_keywords` with `is_faction = 1`**

2,376 rows in `Datasheets_keywords.csv` have `is_faction_keyword = "true"`. These are the
faction KEYWORDS (e.g. "Space Marines", "Necrons"), not ability definitions. They carry no
description text. Not usable as a shared-ability source.

**`udb_detachment_abilities`**

285 rows in `Detachment_abilities.csv` (284 data rows), each with `id`, `faction_id`, `name`,
`description`, `detachment`, `detachment_id`. The build parses all of these into
`udb_detachments` + `udb_detachment_abilities`. These have real ability names and descriptions
(full HTML). [VERIFIED: file contents + build pipeline inspection]

The existing query `getDetachmentAbilitiesByFaction(factionId)` returns
`UdbDetachmentAbilityWithDetachment[]` — real abilities with names and descriptions. This is
the only viable canonical source in the bundled data. **HON-03 is achievable; not blocked.**

### Prop-Shape Adapter Needed (D-02 type compatibility)

`SharedAbilityCard` expects `ability: RwAbility`:
```ts
// src/types/datasheet.ts
export interface RwAbility {
  id: string;
  name: string;
  legend: string | null;      // <-- used for badge + description fallback
  faction_id: string | null;
  description: string | null;
}
```

`getDetachmentAbilitiesByFaction` returns `UdbDetachmentAbilityWithDetachment`:
```ts
// src/types/gameData.ts
export interface UdbDetachmentAbilityWithDetachment extends UdbDetachmentAbility {
  // id: string; faction_id: string; name: string; description: string | null;
  detachment_name: string;    // extra field
  // MISSING: legend field
}
```

**Mismatch:** `UdbDetachmentAbilityWithDetachment` lacks `legend: string | null` and carries
an extra `detachment_name: string` field.

**Adapter options (Claude's Discretion):**

Option A — Map at call site in `RulesHubPage.tsx` (inline, zero new files):
```ts
const asRwAbility = (a: UdbDetachmentAbilityWithDetachment): RwAbility => ({
  id: a.id,
  name: a.name,
  description: a.description,
  legend: a.detachment_name,   // use detachment_name as the badge/legend
  faction_id: a.faction_id,
});
```
This repurposes `legend` to display the detachment name as a badge in the card header —
consistent with how the Stratagems tab groups by detachment. No type change needed.

Option B — Add `legend?: string | null` to `UdbDetachmentAbility` type. More type-correct
but requires touching `gameData.ts` and the migration (the column doesn't exist).

**Recommendation:** Option A (inline adapter). It is the minimal change and reuses
`detachment_name` as the badge, which is semantically useful. No type file changes needed.

### Hook to Create: `useDetachmentAbilitiesByFaction` in `useGameData.ts`

The hook `useDetachmentAbilities(factionId: string | null)` already exists in `useGameData.ts`
and calls `getDetachmentAbilitiesByFaction`. It accepts `string | null` (not `string | undefined`).
`RulesHubPage.tsx` passes `selectedFactionId ?? undefined` to the stub. The real hook must
accept `string | undefined` to match the existing stub's signature.

The stub's exact signature:
```ts
function useSharedAbilitiesByFaction(_factionId: string | undefined) {
  return { data: [] as { id: string; name: string; description: string | null; legend: string | null; faction_id: string | null }[], isLoading: false };
}
```

The existing `useDetachmentAbilities(factionId: string | null)` already handles null (disabled).
Two implementation paths:
1. **Rename and reuse**: Just delete the stub and call `useDetachmentAbilities(selectedFactionId ?? null)` directly in `RulesHubPage.tsx`, then adapt the return type at the mapping step.
2. **Add new hook alias** `useDetachmentAbilitiesByFaction(factionId: string | undefined)` that converts undefined→null and delegates.

**Recommendation:** Path 1. Call `useDetachmentAbilities(selectedFactionId ?? null)` directly — it already has the right `enabled` gating and `staleTime: Infinity`. One less hook to maintain.

### Favorites/Notes wiring pattern (how other tabs do it)

From `RulesHubPage.tsx` (line 301):
```tsx
// Stratagems tab:
<StratagemCard key={s.id} stratagem={s} favorite={favoritesMap.get(s.id + ':stratagem') ?? null} note={notesMap.get(s.id + ':stratagem') ?? null} />

// Shared Abilities tab (current stub, will stay the same pattern):
<SharedAbilityCard key={a.id} ability={a} favorite={favoritesMap.get(a.id + ':shared_ability') ?? null} note={notesMap.get(a.id + ':shared_ability') ?? null} />
```

The maps (`favoritesMap`, `notesMap`) are already built in `RulesHubPage` from `useRulesFavorites`
and `useRulesNotes`. The key pattern is `<id>:<rule_type>` where `rule_type = 'shared_ability'`
for the shared abilities tab. This wiring is already in place in the current stub tab — it just
needs the real data to arrive. No change to the favorites/notes system needed.

### Empty state behavior (D-03)

The current tab has:
```tsx
{filteredAbilities.length === 0 ? (
  <p className="text-sm text-muted-foreground italic">
    No shared abilities match your search.
  </p>
) : ...}
```

This empty state fires when `searchText` is non-empty and nothing matches. When the faction
genuinely has no abilities AND `searchText` is empty, it still shows "No shared abilities match
your search" — which is misleading (the user didn't search). D-03 requires distinguishing
between "filtered to zero" vs "faction has zero abilities":

```tsx
{filteredAbilities.length === 0 ? (
  <p className="text-sm text-muted-foreground italic">
    {searchText
      ? "No shared abilities match your search."
      : "No shared abilities for this faction in the canonical database."}
  </p>
) : ...}
```

---

## HON-04: Link Unit Dead End — Full Findings

### Current Dead End Mechanics

In `PlaybookStats.tsx` (line 84-85):
```tsx
<Button ... onClick={onPickerOpen} disabled={!wahapediaFactionId}>
  {hasDatasheetLink ? "Re-link" : "Link unit"}
</Button>
```

In `PlaybookTab.tsx` (line 64):
```ts
const wahapediaFactionId = localFaction?.wahapedia_faction_id ?? null;
```

And at the picker (lines 303-305):
```tsx
<DatasheetPicker open={pickerOpen} factionId={wahapediaFactionId ?? undefined}
  factionName={localFaction?.name ?? "this faction"}
  onSelect={(id) => { void handlePickerSelect(id); }} onClose={() => setPickerOpen(false)} />
```

When `wahapediaFactionId` is null (collection faction has no canonical mapping), the button is
permanently disabled. The picker is not opened.

### D-06 Resolution: `useDatasheetsByFaction(undefined)` behavior

`useDatasheetsByFaction(undefined)` in `useDatasheet.ts`:
```ts
enabled: factionId !== undefined,
```
`factionId !== undefined` evaluates to `false` when `factionId` is `undefined`, so the query
is disabled and `data` stays `[]`. The picker renders "No datasheets found. Try a different
search term." with an empty list.

**Minimum change for all-factions browse:** The `DatasheetPicker` already has a search input.
The FTS5 `searchUdbUnits` function already exists in `unitDatabase.ts` and is wrapped by
`useUdbSearch(query)` in `useUnitDatabase.ts`. When `factionId` is undefined, the picker can
switch from `useDatasheetsByFaction` → `useUdbSearch(search)` for an instant full-text search
across all 500+ datasheets. This avoids loading all datasheets at once and provides a better
UX (search-to-browse).

`UdbSearchResult` shape:
```ts
export interface UdbSearchResult {
  unit_id: string;
  name: string;
  faction_name: string;
  keywords: string;
}
```

The picker currently calls `onSelect(ds.id)` where `ds.id` matches `udb_units.id`. `UdbSearchResult.unit_id` is the same field — just a different key name. Adapter needed (`unit_id` → `id`).

**Proposed `DatasheetPicker` change (D-06):**
```tsx
// When factionId is defined: existing useDatasheetsByFaction(factionId) path (unchanged)
// When factionId is undefined: useUdbSearch(search) path
const { data: factionDatasheets = [] } = useDatasheetsByFaction(factionId);
const { data: searchResults = [] } = useUdbSearch(factionId === undefined ? search : "");

const isBrowseAll = factionId === undefined;
const datasheets = isBrowseAll
  ? searchResults.map((r) => ({ id: r.unit_id, name: r.name, role: r.faction_name }))
  : factionDatasheets;
```

The search box stays the same (existing Input). In browse-all mode, the description becomes
"Search all datasheets..." and results show faction_name instead of role.

`useUdbSearch` is disabled for queries shorter than 2 characters (`enabled: query.trim().length >= 2`),
so it shows an empty list until the user types. This is good UX for the browse-all case — prompt
the user to type a unit name.

### FactionLinkDialog Direction Mismatch

The existing `FactionLinkDialog` in `unit-database/FactionLinkDialog.tsx` is designed for the
**UDB-to-Collection** direction (displayed from `DatabaseBrowserPage`):
- Receives `factions: Faction[]` (collection factions)
- Receives `udbFactionName: string` (the canonical faction name)
- Calls `onConfirm(collectionFactionId: number)` — sets `wahapedia_faction_id` on a collection faction

HON-04 needs the **Collection-to-UDB** direction (displayed from `PlaybookTab`):
- Given a collection faction whose `wahapedia_faction_id` is null
- User picks which UDB faction it maps to
- Calls `updateFaction({ id: collectionFaction.id, wahapedia_faction_id: udbFactionId })`

This is the **reverse mapping**. The `FactionLinkDialog` UI can be adapted or a small inline
dialog created. The key differences:
- The list shown is UDB factions (`useWahapediaFactions()` returns `UdbFaction[]`) NOT
  collection factions
- The `onConfirm` receives a UDB faction id (string like "SM") not a collection faction id (number)

**Reuse strategy (Claude's Discretion):** Either:

Option A — Create a new small `CollectionFactionLinkDialog` in `src/features/units/` that
mirrors `FactionLinkDialog` but takes `udbFactions: UdbFaction[]` and `collectionFactionName: string`,
calling `onConfirm(wahapediaFactionId: string)`. (~50 lines, clean separation)

Option B — Reuse `FactionLinkDialog` by passing `udbFactions` cast as `Faction[]` (works
structurally since both have `id` and `name`, but is semantically dishonest).

**Recommendation:** Option A. The type inversion makes Option B fragile.

### Full Plumbing for `updateFaction` + Invalidation Chain

`updateFaction` in `src/db/queries/factions.ts`:
```sql
UPDATE factions
  SET wahapedia_faction_id = COALESCE($8, wahapedia_faction_id), ...
WHERE id = $1
```
COALESCE semantics: passing `wahapedia_faction_id: "SM"` sets it; passing `null` is a no-op
(preserves existing). The partial-update pattern `updateFaction({ id, wahapedia_faction_id: "SM" })`
works correctly — other columns are passed as `null` and fall through COALESCE.

`useUpdateFaction()` in `useFactions.ts` invalidates:
```ts
qc.invalidateQueries({ queryKey: FACTIONS_KEY });       // ["factions"]
qc.invalidateQueries({ queryKey: FACTION_KEY(id) });    // ["factions", id]
```

Downstream re-resolution after `wahapedia_faction_id` is set:
1. `FACTIONS_KEY` invalidation → `useFactions()` in `PlaybookTab.tsx` re-fetches
2. `localFaction` recomputes → `wahapediaFactionId` is now non-null
3. `useDatasheetsByFaction(wahapediaFactionId)` is now enabled → fetches units for picker
4. `useDetachmentAbilities(wahapediaFactionId)` is now enabled → `PlaybookDetachmentAbilities` shows abilities
5. `useDetachmentAbilities` in `RulesHubPage` (after HON-03) will also resolve correctly

No additional manual invalidation needed. The React Query dependency chain handles it
automatically once `FACTIONS_KEY` is invalidated.

### State management in PlaybookTab

`PlaybookTab.tsx` manages `pickerOpen` as local state. HON-04 adds a "faction unmapped" flow
that intercepts the `onPickerOpen` call (currently from `PlaybookStats`). The flow:

```
User clicks "Link unit"
  → PlaybookStats.onPickerOpen() fires
  → PlaybookTab checks: wahapediaFactionId !== null?
      YES → setPickerOpen(true)  [existing path, unchanged]
      NO  → setFactionLinkOpen(true)  [new dialog]
         → user picks canonical faction
         → updateFaction({ id: localFaction.id, wahapedia_faction_id: chosenId }).mutateAsync()
         → factions invalidated → wahapediaFactionId updates via React Query
         → setPickerOpen(true)  [now has a valid factionId]
```

`PlaybookStats` only needs `disabled` removed — no structural changes. All new state
(`factionLinkOpen`, `handleFactionLinkConfirm`) lives in `PlaybookTab`.

---

## Standard Stack

No new external packages in this phase. All work uses the existing stack.

| Library | Version | Purpose | Why Used |
|---------|---------|---------|----------|
| `@tanstack/react-query` | existing | Hook data fetching + invalidation | Already in use; `useDetachmentAbilities` + `useUpdateFaction` + `useWahapediaFactions` are the building blocks |
| `sonner` | existing | Toast notifications (success/error) | Already used in `PlaybookTab` for link feedback |
| `shadcn/ui Dialog` | existing | `CollectionFactionLinkDialog` wrapper | Same pattern as `FactionLinkDialog` |

## Package Legitimacy Audit

No new packages. Not applicable.

---

## Architecture Patterns

### HON-03 Data Flow (after fix)

```
RulesHubPage
  ├── useDetachmentAbilities(selectedFactionId ?? null)  [existing hook in useGameData.ts]
  │       └── getDetachmentAbilitiesByFaction(factionId)  [existing query in udbGameData.ts]
  │               └── udb_detachment_abilities JOIN udb_detachments  [hobbyforge.db]
  ├── adapter: UdbDetachmentAbilityWithDetachment → RwAbility  [inline map, legend = detachment_name]
  └── SharedAbilityCard  [unchanged]
        ├── favoritesMap.get(a.id + ':shared_ability')  [existing pattern]
        └── notesMap.get(a.id + ':shared_ability')  [existing pattern]
```

### HON-04 Control Flow (after fix)

```
PlaybookStats (disabled gate removed)
  └── onPickerOpen() → PlaybookTab

PlaybookTab
  ├── if (wahapediaFactionId !== null) → setPickerOpen(true)  [existing path]
  └── if (wahapediaFactionId === null) → setFactionLinkOpen(true)
        └── CollectionFactionLinkDialog (new)
              ├── useWahapediaFactions() → list of UDB factions
              └── onConfirm(wahapediaFactionId: string)
                    → useUpdateFaction().mutateAsync({ id: localFaction.id, wahapedia_faction_id })
                    → FACTIONS_KEY invalidated
                    → wahapediaFactionId recomputes in PlaybookTab
                    → setPickerOpen(true)

DatasheetPicker (enhanced)
  ├── if (factionId !== undefined) → useDatasheetsByFaction(factionId)  [existing path]
  └── if (factionId === undefined) → useUdbSearch(search)  [new browse-all path]
```

### Recommended Project Structure Changes

```
src/features/units/
  PlaybookTab.tsx              # Add factionLinkOpen state + CollectionFactionLinkDialog usage
  PlaybookStats.tsx            # Remove disabled={!wahapediaFactionId}
  DatasheetPicker.tsx          # Add browse-all path using useUdbSearch
  CollectionFactionLinkDialog.tsx  # NEW: ~50-line dialog for Collection→UDB mapping

src/features/rules-hub/
  RulesHubPage.tsx             # Replace stub with useDetachmentAbilities call + adapter
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Faction-scoped abilities query | New SQL query | `getDetachmentAbilitiesByFaction` (already exists) | Same query `PlaybookDetachmentAbilities` uses |
| Browse-all search | Full `SELECT * FROM udb_units` | `useUdbSearch(query)` (FTS5 in `useUnitDatabase.ts`) | 500+ rows; FTS5 already sanitized, indexed, rate-limited at 2-char min |
| Persist faction mapping | Custom UPDATE | `updateFaction({ id, wahapedia_faction_id })` + `useUpdateFaction()` | COALESCE guard already in place; invalidation already wired |
| Canonical faction list | Re-query `udb_factions` | `useWahapediaFactions()` (already in `useDatasheet.ts`) | Cached `staleTime: Infinity`; same hook `RulesHubPage` uses |

---

## Common Pitfalls

### Pitfall 1: Wrong data source for Shared Abilities
**What goes wrong:** Querying `udb_unit_abilities WHERE ability_type = 'Faction'` returns rows
with empty `name` and `description` — the Wahapedia CSV cross-references an `Abilities.csv`
that was never imported.
**Why it happens:** The `ability_type` column name suggests faction abilities, but these are
reference IDs, not ability text. The build script faithfully imports the empty strings.
**How to avoid:** Use `getDetachmentAbilitiesByFaction` exclusively. Do not touch `udb_unit_abilities`.
**Warning signs:** Tab renders cards with empty names/descriptions.

### Pitfall 2: `useDetachmentAbilities` accepts `string | null`, not `string | undefined`
**What goes wrong:** The stub has `_factionId: string | undefined`. Calling `useDetachmentAbilities`
with `undefined` would need a `undefined ?? null` conversion; TypeScript strict mode will catch
the mismatch.
**How to avoid:** Pass `selectedFactionId ?? null` to `useDetachmentAbilities`. The hook's
`enabled: !!factionId` handles null correctly (disabled).

### Pitfall 3: Type adapter missing for `legend` field
**What goes wrong:** `SharedAbilityCard` expects `ability: RwAbility` which requires `legend: string | null`.
`UdbDetachmentAbilityWithDetachment` has no `legend` field — TypeScript will error at the
`filteredAbilities.map((a) => <SharedAbilityCard ability={a} ...>)` call site.
**How to avoid:** Add the inline adapter (map `detachment_name` to `legend`). Strict TS will
enforce this at compile time — `pnpm build` catches it.

### Pitfall 4: `COALESCE($8, wahapedia_faction_id)` with `undefined` vs `null`
**What goes wrong:** `updateFaction({ id, wahapedia_faction_id: undefined })` — TypeScript
`Partial<>` allows `undefined`. The query maps `input.wahapedia_faction_id ?? null` to `$8`,
so `undefined` becomes `null` → COALESCE no-ops → the value is NOT set.
**How to avoid:** Always pass the string explicitly: `wahapedia_faction_id: "SM"` not
`wahapedia_faction_id: undefined`. The dialog's confirm handler must have the chosen ID before
calling `updateFaction`.

### Pitfall 5: `DatasheetPicker` browse-all needs search ≥ 2 chars
**What goes wrong:** `useUdbSearch` is `enabled: query.trim().length >= 2`. Empty search box
→ no results → "No datasheets found." — still a dead end.
**How to avoid:** In browse-all mode, show a prompt "Type at least 2 characters to search all
datasheets" when the search box is empty or has 1 character. This is honest and consistent
with the FTS5 query behavior.

### Pitfall 6: `FactionLinkDialog` direction (collection faction IDs are number, UDB IDs are string)
**What goes wrong:** Reusing `FactionLinkDialog` verbatim would make the `Select` map over
`UdbFaction[]` items where `id` is a TEXT string ("SM", "NEC"), but `onConfirm` expects
`Number(selectedId)` → `NaN`. The dialog calls `const id = Number(selectedId)`.
**How to avoid:** Create the new `CollectionFactionLinkDialog` with correct types from the start
— UDB faction ID is `string`, not `number`. Do not reuse `FactionLinkDialog` verbatim.

### Pitfall 7: Auto-open picker fires before faction mapping completes
**What goes wrong:** `PlaybookTab` has an `useEffect` that auto-opens the picker when
`hasDatasheetLink === false` and stats are empty (line 116-119). After faction mapping,
`wahapediaFactionId` changes, but if `pickerOpen` was set to `true` before the faction mutation
resolved, the picker opens with `factionId = undefined` for one render.
**How to avoid:** Only call `setPickerOpen(true)` inside the `onSuccess` of the
`updateFaction.mutateAsync()` — not before. The mutation is awaited, so `wahapediaFactionId`
will have refreshed from the invalidation.

---

## Code Examples

### HON-03: Replacing the stub in RulesHubPage.tsx

```typescript
// REMOVE the stub function (lines 21-24):
// function useSharedAbilitiesByFaction(_factionId: string | undefined) { ... }

// ADD import at top:
import { useDetachmentAbilities } from "@/hooks/useGameData";
import type { UdbDetachmentAbilityWithDetachment } from "@/types/gameData";
import type { RwAbility } from "@/types/datasheet";

// ADD adapter (at module level or inside component):
function toRwAbility(a: UdbDetachmentAbilityWithDetachment): RwAbility {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    legend: a.detachment_name,   // shown as badge; groups by detachment visually
    faction_id: a.faction_id,
  };
}

// REPLACE the hook call (line 58):
const { data: rawAbilities = [], isLoading: sharedAbilitiesLoading } =
  useDetachmentAbilities(selectedFactionId ?? null);

// ADD adapter after hooks:
const sharedAbilities = rawAbilities.map(toRwAbility);
```

### HON-03: Empty state update (D-03)

```tsx
// In the shared-abilities TabsContent (around line 294):
{filteredAbilities.length === 0 ? (
  <p className="text-sm text-muted-foreground italic">
    {searchText
      ? "No shared abilities match your search."
      : "No shared abilities for this faction in the canonical database."}
  </p>
) : (
  <div className="flex flex-col gap-2">
    {filteredAbilities.map((a) => (
      <SharedAbilityCard key={a.id} ability={a}
        favorite={favoritesMap.get(a.id + ':shared_ability') ?? null}
        note={notesMap.get(a.id + ':shared_ability') ?? null} />
    ))}
  </div>
)}
```

### HON-04: Remove disabled gate in PlaybookStats.tsx

```tsx
// CHANGE line 84-85 (remove disabled={!wahapediaFactionId}):
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={onPickerOpen}
  // disabled={!wahapediaFactionId}  <-- REMOVE THIS LINE
>
  {hasDatasheetLink ? "Re-link" : "Link unit"}
</Button>
```

### HON-04: New CollectionFactionLinkDialog (approximate)

```typescript
// src/features/units/CollectionFactionLinkDialog.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { UdbFaction } from "@/db/queries/unitDatabase";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionFactionName: string;
  udbFactions: UdbFaction[];
  onConfirm: (wahapediaFactionId: string) => void;
}

export function CollectionFactionLinkDialog({ open, onOpenChange, collectionFactionName, udbFactions, onConfirm }: Props) {
  const [selectedId, setSelectedId] = useState("");
  function handleConfirm() {
    if (!selectedId) return;
    onConfirm(selectedId);
    setSelectedId("");
  }
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setSelectedId(""); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Match Faction to Database</DialogTitle>
          <DialogDescription>
            "<span className="font-medium">{collectionFactionName}</span>" has no canonical match yet.
            Select the matching army from the Unit Database so datasheets can be linked.
          </DialogDescription>
        </DialogHeader>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select canonical army..." /></SelectTrigger>
          <SelectContent>
            {udbFactions.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel — browse all instead</Button>
          <Button disabled={!selectedId} onClick={handleConfirm}>Link & continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### HON-04: PlaybookTab integration (key logic additions)

```typescript
// ADD in PlaybookTab.tsx:
import { CollectionFactionLinkDialog } from "@/features/units/CollectionFactionLinkDialog";
import { useUpdateFaction } from "@/hooks/useFactions";
import { useWahapediaFactions } from "@/hooks/useDatasheet";

// ADD state:
const [factionLinkOpen, setFactionLinkOpen] = useState(false);
const updateFaction = useUpdateFaction();
const { data: udbFactions = [] } = useWahapediaFactions();

// REPLACE onPickerOpen handler (now called by PlaybookStats):
// Change PlaybookStats prop: onPickerOpen={() => handlePickerOpen()}
function handlePickerOpen() {
  if (wahapediaFactionId) {
    setPickerOpen(true);
  } else {
    setFactionLinkOpen(true);
  }
}

// ADD handler:
async function handleFactionLinkConfirm(wahapediaFactionId: string) {
  if (!localFaction) return;
  try {
    await updateFaction.mutateAsync({ id: localFaction.id, wahapedia_faction_id: wahapediaFactionId });
    setFactionLinkOpen(false);
    setPickerOpen(true);
    toast.success("Faction linked — datasheets now available.");
  } catch {
    toast.error("Failed to link faction. Please try again.");
  }
}

// ADD in JSX (alongside DatasheetPicker):
<CollectionFactionLinkDialog
  open={factionLinkOpen}
  onOpenChange={(open) => {
    setFactionLinkOpen(open);
    if (!open) setPickerOpen(true); // "browse all" path: skip mapping, open picker
  }}
  collectionFactionName={localFaction?.name ?? "this faction"}
  udbFactions={udbFactions}
  onConfirm={handleFactionLinkConfirm}
/>
```

Note on the `onOpenChange` fallback path: when the user clicks "Cancel — browse all instead"
in the dialog, closing it opens `DatasheetPicker` with `factionId = undefined`, triggering the
browse-all search path (D-06). This ensures the action is NEVER a dead end.

### HON-04: DatasheetPicker browse-all enhancement (D-06)

```typescript
// src/features/units/DatasheetPicker.tsx
import { useDatasheetsByFaction } from "@/hooks/useDatasheet";
import { useUdbSearch } from "@/hooks/useUnitDatabase";  // ADD

// REPLACE single hook call:
const isBrowseAll = factionId === undefined;
const { data: factionDatasheets = [] } = useDatasheetsByFaction(factionId);
const { data: searchResults = [] } = useUdbSearch(isBrowseAll ? search : "");

const datasheets = isBrowseAll
  ? searchResults.map((r) => ({ id: r.unit_id, name: r.name, role: r.faction_name }))
  : factionDatasheets;

// CHANGE dialog description:
<DialogDescription>
  {isBrowseAll ? "Search all datasheets" : `Searching ${factionName} datasheets`}
</DialogDescription>

// CHANGE empty state message:
{filtered.length === 0 && (
  <p className="px-3 py-4 text-sm text-muted-foreground text-center">
    {isBrowseAll && search.trim().length < 2
      ? "Type at least 2 characters to search all datasheets."
      : "No datasheets found. Try a different search term."}
  </p>
)}
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest inline) |
| Quick run command | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HON-03 | Shared Abilities tab calls `useDetachmentAbilities` not stub | unit | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` | ✅ (update needed) |
| HON-03 | `SharedAbilityCard` renders with `UdbDetachmentAbilityWithDetachment`-adapted data | unit | `pnpm test -- tests/rules-hub/SharedAbilityCard.test.tsx` | ✅ (already covers `RwAbility`; no change needed) |
| HON-03 | Empty state shows correct message when faction has 0 abilities | unit | `pnpm test -- tests/rules-hub/RulesHubPage.test.tsx` | ✅ (add test case) |
| HON-04 | "Link unit" button enabled when `wahapediaFactionId` is null | unit | `pnpm test -- tests/units/PlaybookStats.test.tsx` | ❌ Wave 0 |
| HON-04 | `CollectionFactionLinkDialog` renders UDB factions list | unit | `pnpm test -- tests/units/CollectionFactionLinkDialog.test.tsx` | ❌ Wave 0 |
| HON-04 | `DatasheetPicker` shows search prompt in browse-all mode | unit | `pnpm test -- tests/units/DatasheetPicker.test.tsx` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `tests/units/PlaybookStats.test.tsx` — covers HON-04 button state (enabled when wahapediaFactionId null)
- [ ] `tests/units/CollectionFactionLinkDialog.test.tsx` — covers new dialog component
- [ ] `tests/units/DatasheetPicker.test.tsx` — covers browse-all mode empty-state prompt

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/rules-hub/ tests/units/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rules data in `rules.db` (separate) | All rules in `hobbyforge.db` via `udb_*` tables | Phase 107 | All queries use `getDb()`; no `getRulesDb()` |
| Faction linking by name match | `wahapedia_faction_id` stored in `factions.wahapedia_faction_id` | Phase 105 (migration 039) | Name matching breaks on sub-factions/punctuation; stored ID is stable |
| `RwAbility` shape from Abilities.csv sync | No `Abilities.csv` in bundled pipeline | Phase 120 | `udb_unit_abilities.ability_type='Faction'` rows are reference stubs only |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `udb_unit_abilities` rows with `ability_type='Faction'` have empty `name`/`description` | D-02 Resolution | If any faction rows have real data, they could supplement the display — LOW risk, confirmed by CSV inspection |
| A2 | `useUdbSearch` result `unit_id` == `udb_units.id` (both are Wahapedia string IDs) | HON-04 DatasheetPicker | If the FTS5 table uses a different ID scheme, picker `onSelect` would pass wrong ID to `linkUdbUnit` |

**A2 verification:** `searchUdbUnits` query: `SELECT unit_id, name, faction_name, keywords FROM udb_search`. `udb_search` is populated from `udb_units.id` (migration 038, FTS5 virtual table). `linkUdbUnit` calls `UPDATE units SET udb_unit_id = $2` where `$2` must be a `udb_units.id`. These are the same field. [VERIFIED: migration 038 + unitDatabase.ts searchUdbUnits query]

---

## Open Questions

1. **Should `CollectionFactionLinkDialog` persist the mapping automatically when there is exactly one canonical faction?**
   - What we know: Some collections may have a single faction (e.g., only Space Marines). Auto-mapping would be a convenience.
   - What's unclear: Could auto-mapping make a wrong choice (e.g., faction named "Marines" could map to several canonical factions).
   - Recommendation: Do not auto-map. Always show the dialog to keep the user in control. Proceed with dialog on first click.

2. **"Cancel — browse all" in `CollectionFactionLinkDialog`: should it open `DatasheetPicker` at all, or just close?**
   - What we know: D-04 says the action must never be a permanent dead end. "Browse all" satisfies that.
   - What's unclear: Whether users actually want to browse-all without a faction context, or prefer to cancel entirely.
   - Recommendation: Implement "browse all" as the fallback (open picker with `factionId = undefined`) as specified in D-06. The user can always close the picker if they don't want it.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely frontend TypeScript/React wiring. No external tools, services, or CLIs required beyond the existing `pnpm`/`node` stack already verified in the repo.

---

## Security Domain

`security_enforcement` not explicitly set to false — including section for completeness.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes (search input) | `searchUdbUnits` already sanitizes FTS5 special chars; no raw SQL injection path |
| V4 Access Control | no | Desktop app, single user, offline |
| V2 Authentication | no | No auth |

The `sanitizeRulesHtml` function in `SharedAbilityCard` already sanitizes the `description`
HTML before `dangerouslySetInnerHTML` — no change needed for HON-03.

---

## Sources

### Primary (HIGH confidence)
- Source code inspection of `RulesHubPage.tsx`, `SharedAbilityCard.tsx`, `udbGameData.ts`, `useGameData.ts`, `useDatasheet.ts`, `PlaybookTab.tsx`, `PlaybookStats.tsx`, `DatasheetPicker.tsx`, `FactionLinkDialog.tsx`, `factions.ts`, `useFactions.ts`, `unitDatabase.ts`, `useUnitDatabase.ts`, `factionAlignmentMap.ts` — all verified by direct file read
- Migration files `038_udb_schema.sql`, `042_udb_detachments.sql` — schema verified
- `scripts/data/Datasheets_abilities.csv` — `ability_type` values verified by grep; Faction rows confirmed empty name/description
- `scripts/data/Detachment_abilities.csv` — 284 data rows confirmed by `wc -l`
- `scripts/build-unit-db.ts` — build pipeline confirmed: no `Abilities.csv` import, `ability_type` mapped from `type` column
- `tests/rules-hub/RulesHubPage.test.tsx`, `tests/rules-hub/SharedAbilityCard.test.tsx` — existing test patterns verified

### Secondary (MEDIUM confidence)
- None required; all claims verified from source.

---

## Metadata

**Confidence breakdown:**
- HON-03 implementation: HIGH — stub location, data source, prop mismatch, and adapter pattern all verified from source
- HON-04 implementation: HIGH — dead-end gate, `updateFaction` COALESCE behavior, invalidation chain, FTS5 browse-all path all verified
- D-02 resolution (no better source): HIGH — `Datasheets_abilities.csv` Faction rows confirmed empty by CSV inspection; no `Abilities.csv` confirmed absent

**Research date:** 2026-06-17
**Valid until:** Phase 134 is self-contained (no external data dependency); findings stable indefinitely for this codebase state.
