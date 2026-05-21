# Phase 93: Datasheet Browser + Ghost Units - Research

**Researched:** 2026-05-21
**Domain:** React UI (Dialog + Command palette), SQLite cross-DB reads, ghost unit visual treatment
**Confidence:** HIGH

## Summary

Phase 93 is a UI-focused phase building on an already-complete data layer. The ghost unit mutation (`addGhostUnitToList`), the hook (`useAddGhostUnitToList`), and the datasheet query (`getDatasheetsByFactionWithPoints`) are all implemented and tested. The Wahapedia faction resolution (`useWahapediaFactionId`) is also in place and used by `ArmyListDetailSheet`. The phase scope is: (1) build a new `DatasheetBrowserDialog` mirroring the existing `UnitPickerDialog` pattern, (2) wire it into the sibling portal architecture at `ArmyListsPage`, (3) add a "Browse Datasheets" trigger to `ArmyListDetailSheet`, and (4) apply ghost unit visual treatment to `ArmyListUnitRow`.

No new packages are needed. No database migrations required. No Rust changes. This is pure React component work using existing queries, hooks, and shadcn/ui primitives already in the project.

**Primary recommendation:** Clone UnitPickerDialog's architecture for DatasheetBrowserDialog, group results by `role` field using multiple CommandGroup elements, and detect ghost units in ArmyListUnitRow via `unit.unit_id === null`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** DatasheetBrowserDialog is a Dialog component (not a Sheet), following the same pattern as UnitPickerDialog — modal browse-and-select with Command palette search. It is rendered as a sibling portal at ArmyListsPage level (Pitfall 1 — never nest inside another portal).
- **D-02:** The dialog uses `getDatasheetsByFactionWithPoints(factionId)` from `datasheets.ts` to show all faction datasheets with their points. Results are displayed grouped by `role` (e.g., Character, Battleline, Other) with the datasheet name, role badge, and points. Client-side substring search filters the list.
- **D-03:** The faction_id used for the datasheet query comes from the army list's Wahapedia faction mapping (`useWahapediaFactionId` hook, same as used by ArmyListDetailSheet). If no faction mapping exists, the dialog shows a message prompting the user to set a faction on the list first.
- **D-04:** DatasheetBrowserDialog stays open after each add (multi-add UX), matching UnitPickerDialog's behavior. Each selection calls `useAddGhostUnitToList` with the datasheet name as `ghost_unit_name`. A toast confirms each addition.
- **D-05:** Ghost/planned units in ArmyListUnitRow display a "Planned" Badge (muted/outline variant) next to the unit name. The row text uses a slightly muted color (e.g., `text-muted-foreground`) to visually distinguish from owned units.
- **D-06:** Ghost units do NOT show painting status indicators, photo thumbnails, or collection-specific actions (these are meaningless for unowned units). The row shows: unit name + "Planned" badge + effective points (resolved via ghost_unit_name through the COALESCE chain).
- **D-07:** Ghost units CAN access the LoadoutBuilderSheet (tier selection + wargear display) — this was explicitly designed to support ghost units in Phase 90 (D-10, D-11). The LoadoutBuilderSheet shows a "Planned" badge for ghost units.
- **D-08:** Ghost units CAN be assigned enhancements (if they are characters) — the Phase 91 enhancement flow uses unit_name which resolves via COALESCE(u.name, alu.ghost_unit_name).
- **D-09:** The "Add Unit" flow in ArmyListDetailSheet gets a second trigger alongside the existing "Add from Collection" button: "Browse Datasheets" (or similar) that opens the DatasheetBrowserDialog. This gives users two paths: add an owned unit (UnitPickerDialog) or add any datasheet (DatasheetBrowserDialog, creating a ghost unit).
- **D-10:** When adding a ghost unit, `ghost_unit_name` MUST match the canonical datasheet name from `rw_datasheets.name` exactly — this is critical for the COALESCE chain's name-based joins to resolve points, tiers, and wargear. The dialog passes the exact `name` field from the query result.
- **D-11:** If the user adds a ghost unit for a datasheet they already own in their collection, it still creates a ghost entry (not linking to the collection unit). No duplicate detection between ghost and owned entries.
- **D-12:** Ghost units are already isolated from Collection, Dashboard, and Kanban by design (D-07 from Phase 89) — those features query from the `units` table directly, not through `army_list_units`. No additional filtering needed.
- **D-13:** Ghost units appear in army list exports (Phase 94) and snapshots (Phase 95) — they are real list entries with points. Downstream phases must include them.

### Claude's Discretion
- DatasheetBrowserDialog internal layout, spacing, role grouping presentation
- Icon choice for "Browse Datasheets" trigger button
- Whether to add a visual separator between owned and ghost units in the army list, or mix them in insertion order
- Whether the datasheet browser shows additional info per entry (keywords, model count) or just name + role + points
- Hook naming for the datasheet browser query (extend useDatasheet.ts or add useDatasheetBrowser.ts)
- Whether to grey out datasheets that are already in the list (owned or ghost) or allow duplicate additions

### Deferred Ideas (OUT OF SCOPE)
- List export including ghost units — Phase 94
- Snapshot versioning with ghost unit support — Phase 95
- Ghost-to-owned conversion (when user buys the unit, link ghost entry to collection) — future milestone
- Datasheet detail preview from the browser (showing stats/abilities before adding) — future milestone
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRW-01 | User can browse all faction datasheets from army list context (not just owned collection) | DatasheetBrowserDialog using `getDatasheetsByFactionWithPoints` + `useWahapediaFactionId` — both already implemented |
| BRW-02 | User can add unowned datasheets as "planned" units in the list, clearly marked vs owned | `useAddGhostUnitToList` hook already implemented; ghost unit visual treatment (Planned badge + muted text) in ArmyListUnitRow |
| BRW-03 | Ghost/planned units do not appear in Collection, Dashboard stats, or Kanban | Already isolated by design — Collection/Dashboard/Kanban query `units` table directly, not `army_list_units`. Verified in CONTEXT.md D-12 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Datasheet browsing | Frontend (React) | Database (SQLite/rules.db) | UI component reads from existing rules.db query |
| Ghost unit creation | Frontend (React) | Database (SQLite/hobbyforge.db) | Calls existing `addGhostUnitToList` mutation |
| Ghost unit visual treatment | Frontend (React) | -- | Pure conditional rendering based on `unit_id === null` |
| Ghost unit isolation | Database (SQLite) | -- | Isolation is inherent in schema design (separate tables), no code needed |
| Faction resolution | Frontend (React) | Database (SQLite/rules.db) | Uses existing `useWahapediaFactionId` cross-DB hook |

## Standard Stack

### Core (already in project -- no new packages)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| shadcn/ui Dialog | -- | DatasheetBrowserDialog container | Already installed [VERIFIED: codebase] |
| shadcn/ui Command (cmdk) | -- | Search + selection palette inside dialog | Already installed [VERIFIED: codebase] |
| shadcn/ui Badge | -- | "Planned" badge for ghost units, role badges in browser | Already installed [VERIFIED: codebase] |
| @tanstack/react-query | -- | Data hooks for datasheets + ghost unit mutation | Already installed [VERIFIED: codebase] |
| sonner | -- | Toast notifications for add confirmations | Already installed [VERIFIED: codebase] |

**Installation:** None needed. All dependencies are already in the project.

## Package Legitimacy Audit

No new packages are introduced in this phase. All UI components and data hooks are already installed.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
ArmyListsPage (portal host)
  |
  |-- ArmyListDetailSheet (onAddUnit, onBrowseDatasheets callbacks)
  |     |-- "Add Unit" button --> triggers openUnitPicker()
  |     |-- "Browse Datasheets" button --> triggers openDatasheetBrowser()
  |     |-- ArmyListUnitRow (ghost detection: unit_id === null)
  |           |-- Owned unit: full row (status, painting, configure)
  |           |-- Ghost unit: muted row (Planned badge, points, configure)
  |
  |-- UnitPickerDialog (existing -- adds owned units)
  |-- DatasheetBrowserDialog (NEW -- adds ghost units)
  |     |-- useWahapediaFactionId(factionName) --> wahapedia faction_id
  |     |-- useDatasheetsByFactionWithPoints(wahapediaFactionId) --> DatasheetWithPoints[]
  |     |-- CommandGroup per role (Character, Battleline, Other)
  |     |-- onSelect --> useAddGhostUnitToList({ list_id, ghost_unit_name: ds.name })
  |
  |-- LoadoutBuilderSheet (existing -- already supports ghost units)
```

### Recommended Project Structure

```
src/features/army-lists/
  DatasheetBrowserDialog.tsx   # NEW — Dialog + Command palette for browsing datasheets
  ArmyListsPage.tsx            # MODIFIED — add datasheetBrowserOpen state + sibling portal
  ArmyListDetailSheet.tsx      # MODIFIED — add "Browse Datasheets" trigger button
  ArmyListUnitRow.tsx          # MODIFIED — ghost unit visual treatment
tests/army-lists/
  DatasheetBrowserDialog.test.tsx  # NEW — tests for the dialog
  ArmyListUnitRow.test.tsx         # EXTENDED — ghost unit rendering tests
```

### Pattern 1: Sibling Portal Dialog (cloned from UnitPickerDialog)

**What:** A Dialog component rendered as a sibling at ArmyListsPage level, triggered by a callback from ArmyListDetailSheet. Never nested inside the Sheet.
**When to use:** All modal dialogs in the army lists feature.
**Example:**
```typescript
// Source: src/features/army-lists/UnitPickerDialog.tsx (existing pattern)
// ArmyListsPage manages state:
const [datasheetBrowserOpen, setDatasheetBrowserOpen] = useState(false);

// ArmyListDetailSheet triggers via callback:
<Button onClick={onBrowseDatasheets}>
  <BookOpen className="mr-2 h-4 w-4" /> Browse Datasheets
</Button>

// Dialog rendered as sibling portal:
<DatasheetBrowserDialog
  open={datasheetBrowserOpen}
  listId={selectedListId}
  factionId={selectedList?.faction_id ?? null}
  onClose={() => setDatasheetBrowserOpen(false)}
/>
```

### Pattern 2: Role-Grouped Command Palette

**What:** Multiple CommandGroup elements within a Command, one per datasheet role.
**When to use:** When the browsable list has a natural grouping field.
**Example:**
```typescript
// Source: shadcn/ui Command component pattern [ASSUMED]
// Group datasheets by role for browsable categories
const grouped = useMemo(() => {
  const groups: Record<string, DatasheetWithPoints[]> = {};
  for (const ds of datasheets) {
    const key = ds.role ?? "Other";
    (groups[key] ??= []).push(ds);
  }
  return groups;
}, [datasheets]);

return (
  <Command>
    <CommandInput placeholder="Search datasheets..." />
    <CommandList>
      <CommandEmpty>No datasheets found.</CommandEmpty>
      {Object.entries(grouped).map(([role, items]) => (
        <CommandGroup key={role} heading={role}>
          {items.map((ds) => (
            <CommandItem key={ds.id} value={`${ds.name}-${ds.id}`} onSelect={() => handleSelect(ds)}>
              <span className="flex-1">{ds.name}</span>
              {ds.points !== null && (
                <span className="text-xs text-muted-foreground ml-2">{ds.points}pts</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
    </CommandList>
  </Command>
);
```

### Pattern 3: Ghost Unit Detection in ArmyListUnitRow

**What:** Conditional rendering based on `unit.unit_id === null` to show ghost-specific treatment.
**When to use:** Any row-level rendering that differs between owned and ghost units.
**Example:**
```typescript
// Source: codebase analysis of ArmyListUnitRow.tsx + CONTEXT.md D-05/D-06
const isGhost = unit.unit_id === null;

// In the name cell:
<span className={isGhost ? "text-muted-foreground" : ""}>{unit.unit_name}</span>
{isGhost && <Badge variant="outline" className="ml-1.5">Planned</Badge>}

// In the status cell:
{isGhost ? (
  <span className="text-xs text-muted-foreground">--</span>
) : (
  <>
    <Badge variant="secondary">{unit.status_painting}</Badge>
    {unit.status_assembly === 1 && <Badge variant="outline">Assembled</Badge>}
  </>
)}
```

### Anti-Patterns to Avoid

- **Nesting DatasheetBrowserDialog inside ArmyListDetailSheet:** Radix portals stacked inside each other cause z-index and event propagation issues. Always render as a sibling at ArmyListsPage.
- **Reimplementing the COALESCE chain in JavaScript:** Ghost unit points resolve via the SQL COALESCE chain in `getArmyListWithUnits`. Never try to resolve points client-side.
- **Using `ds.id` as `ghost_unit_name`:** The ghost unit name must be the canonical `ds.name` string (not the Wahapedia ID), because the COALESCE chain joins on text name, not ID.
- **Adding Collection/Dashboard/Kanban filters for ghost units:** Ghost isolation is already handled by the schema design. Those features query `units` table, not `army_list_units`. Adding explicit filters would be dead code.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Searchable list UI | Custom search + filter | shadcn/ui Command (cmdk) | Keyboard navigation, accessibility, focus management |
| Modal overlay | Custom modal with z-index | shadcn/ui Dialog | Radix handles portal, focus trap, escape key |
| Ghost unit mutation | New INSERT query | Existing `addGhostUnitToList` + `useAddGhostUnitToList` | Already implemented with correct NULL handling and cache invalidation |
| Faction resolution | Custom cross-DB lookup | Existing `useWahapediaFactionId` hook | Already handles alias map, normalized matching, caching |
| Datasheet with points query | New SQL join | Existing `getDatasheetsByFactionWithPoints` | Already implemented with correct LEFT JOIN to points table |

**Key insight:** This phase is purely assembly work. Every data access function, mutation hook, and query is already built. The implementation is about wiring existing primitives into new UI components.

## Common Pitfalls

### Pitfall 1: Nested Portals
**What goes wrong:** DatasheetBrowserDialog rendered inside ArmyListDetailSheet's Sheet content causes z-index conflicts, click-outside handlers close both portals.
**Why it happens:** Developer places Dialog inside the Sheet JSX for convenience.
**How to avoid:** Always render DatasheetBrowserDialog as a sibling portal at ArmyListsPage root, triggered via callback prop.
**Warning signs:** Dialog appears behind the Sheet overlay, or closing the dialog also closes the Sheet.

### Pitfall 2: Passing datasheet ID instead of name as ghost_unit_name
**What goes wrong:** The COALESCE chain's name-based joins fail to resolve points, tiers, and wargear for the ghost unit. Ghost unit shows 0 points.
**Why it happens:** `DatasheetWithPoints` has both `id` (string) and `name` (string) fields. Developer passes `ds.id` instead of `ds.name`.
**How to avoid:** The `handleSelect` callback must pass `ds.name` as `ghost_unit_name`. Add a comment documenting this contract.
**Warning signs:** Ghost units show 0 effective_points after adding.

### Pitfall 3: Not handling missing Wahapedia faction mapping
**What goes wrong:** Dialog attempts to query datasheets with `undefined` factionId, returning empty results or erroring.
**Why it happens:** The army list has no faction set, or the faction name doesn't match any Wahapedia faction.
**How to avoid:** Check `wahapediaFactionId` availability. Show a friendly message when null: "Set a faction on this list to browse datasheets."
**Warning signs:** Empty dialog with no explanation for why there are no results.

### Pitfall 4: Full-replacement UPDATE pitfall in ArmyListUnitRow
**What goes wrong:** When modifying ghost unit visual treatment, developer adds conditional paths that miss passing all required fields to `updateArmyListUnit`.
**Why it happens:** `updateArmyListUnit` uses full-replacement SQL (NOT COALESCE). Omitting `notes` or `tactical_role` overwrites them with undefined.
**How to avoid:** The ghost unit changes in ArmyListUnitRow are purely rendering changes. No mutation logic needs to change.
**Warning signs:** Editing a ghost unit's notes/role clears the other field.

### Pitfall 5: CommandItem value collision
**What goes wrong:** cmdk's search/selection breaks when two datasheets share a similar name prefix.
**Why it happens:** The `value` prop on CommandItem is used for keyboard navigation and filtering.
**How to avoid:** Use `${ds.name}-${ds.id}` pattern (same as UnitPickerDialog uses `${unit.name}-${unit.id}`).
**Warning signs:** Selecting one datasheet adds a different one.

## Code Examples

### DatasheetBrowserDialog Component Structure

```typescript
// Source: derived from UnitPickerDialog.tsx pattern [VERIFIED: codebase]
interface DatasheetBrowserDialogProps {
  open: boolean;
  listId: number | null;
  factionId: number | null;  // HobbyForge faction_id (not Wahapedia ID)
  onClose: () => void;
}

export function DatasheetBrowserDialog({
  open, listId, factionId, onClose,
}: DatasheetBrowserDialogProps) {
  const { data: factions } = useFactions();
  const faction = factionId !== null
    ? (factions ?? []).find((f) => f.id === factionId) ?? null
    : null;
  const { data: wahapediaFactionId } = useWahapediaFactionId(faction?.name);
  const { data: datasheets = [] } = useDatasheetsByFactionWithPoints(wahapediaFactionId ?? undefined);
  const addGhostUnit = useAddGhostUnitToList();

  // Group by role
  const grouped = useMemo(() => {
    const groups: Record<string, DatasheetWithPoints[]> = {};
    for (const ds of datasheets) {
      const key = ds.role ?? "Other";
      (groups[key] ??= []).push(ds);
    }
    return groups;
  }, [datasheets]);

  function handleSelect(ds: DatasheetWithPoints) {
    if (listId === null) return;
    addGhostUnit.mutate(
      { list_id: listId, ghost_unit_name: ds.name },  // CRITICAL: use ds.name, NOT ds.id
      {
        onSuccess: () => toast.success(`${ds.name} added as planned.`),
        onError: () => toast.error("Failed to add unit."),
      },
    );
    // Dialog stays open for multi-add (D-04)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 sm:max-w-[480px]">
        {/* ... Command palette with grouped items */}
      </DialogContent>
    </Dialog>
  );
}
```

### ArmyListsPage New State + Sibling Portal

```typescript
// Source: derived from existing ArmyListsPage.tsx pattern [VERIFIED: codebase]
// Add alongside existing state:
const [datasheetBrowserOpen, setDatasheetBrowserOpen] = useState(false);
const openDatasheetBrowser = () => setDatasheetBrowserOpen(true);
const closeDatasheetBrowser = () => setDatasheetBrowserOpen(false);

// Pass to ArmyListDetailSheet:
<ArmyListDetailSheet
  onBrowseDatasheets={openDatasheetBrowser}
  // ... existing props
/>

// Render as sibling portal:
<DatasheetBrowserDialog
  open={datasheetBrowserOpen}
  listId={selectedListId}
  factionId={selectedList?.faction_id ?? null}
  onClose={closeDatasheetBrowser}
/>
```

### ArmyListUnitRow Ghost Detection

```typescript
// Source: derived from existing ArmyListUnitRow.tsx [VERIFIED: codebase]
const isGhost = unit.unit_id === null;

// Name cell — add Planned badge and mute text:
{isGhost && (
  <Badge variant="outline" className="ml-1.5 text-xs">Planned</Badge>
)}
<span className={isGhost ? "text-muted-foreground" : ""}>{unit.unit_name}</span>

// Status cell — hide painting status for ghost units:
{!isGhost ? (
  <>
    <Badge variant="secondary">{unit.status_painting}</Badge>
    {unit.status_assembly === 1 && <Badge variant="outline">Assembled</Badge>}
  </>
) : (
  <span className="text-xs text-muted-foreground">--</span>
)}

// MatchStatusIndicator — already guarded: unit.unit_id != null check exists (line 175-176)
// No change needed for this guard.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ghost units as separate table rows | Nullable unit_id on army_list_units | Phase 89 (v0.2.18) | Single table, unified COALESCE chain |
| Integer FK to rules.db | TEXT name-based joins | Phase 89 (v0.2.18) | Survives rules.db re-sync |

**No deprecated/outdated patterns apply** — this phase uses only established project conventions.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Multiple CommandGroup elements within a single Command work correctly for role-based grouping with cmdk search | Architecture Patterns | Low -- fallback is a single flat CommandGroup with role badges per item |

**If this table is empty:** Nearly all claims verified from codebase. Only the CommandGroup multi-group behavior is based on standard shadcn/ui patterns.

## Open Questions

1. **Role values in rw_datasheets**
   - What we know: The `role` field exists on `rw_datasheets` and is typed as `string | null`. The query orders by `role, name ASC`.
   - What's unclear: The exact set of role values (e.g., "Character", "Battleline", "Dedicated Transport", "Fortification"). Wahapedia uses standard 40K battlefield roles.
   - Recommendation: Use the role strings as-is for grouping headings. Null roles go under "Other". No need to enumerate -- the grouping is dynamic.

2. **Duplicate datasheet entries in results**
   - What we know: `getDatasheetsByFactionWithPoints` LEFT JOINs `rw_datasheet_points` on name + faction_id. If a datasheet has multiple point tiers, this could produce duplicate rows.
   - What's unclear: Whether the current query deduplicates or returns all tiers.
   - Recommendation: Test with real data. If duplicates appear, the dialog should use `MIN(dp.points)` or `GROUP BY d.id` to show the base/minimum points. This is a minor refinement, not a blocker.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `pnpm test -- tests/army-lists/DatasheetBrowserDialog.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRW-01 | Dialog renders datasheets grouped by role with points | unit | `pnpm test -- tests/army-lists/DatasheetBrowserDialog.test.tsx` | Wave 0 |
| BRW-01 | Dialog shows empty state when no Wahapedia faction mapping | unit | `pnpm test -- tests/army-lists/DatasheetBrowserDialog.test.tsx` | Wave 0 |
| BRW-02 | Selecting a datasheet calls useAddGhostUnitToList with ds.name | unit | `pnpm test -- tests/army-lists/DatasheetBrowserDialog.test.tsx` | Wave 0 |
| BRW-02 | Ghost units show "Planned" badge in ArmyListUnitRow | unit | `pnpm test -- tests/army-lists/ArmyListUnitRow.test.tsx` | Extend existing |
| BRW-02 | Ghost units hide painting status in ArmyListUnitRow | unit | `pnpm test -- tests/army-lists/ArmyListUnitRow.test.tsx` | Extend existing |
| BRW-03 | Ghost unit isolation (no collection/dashboard leak) | manual-only | N/A -- isolation is schema-level, no code filters to test | N/A |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/army-lists/DatasheetBrowserDialog.test.tsx tests/army-lists/ArmyListUnitRow.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/army-lists/DatasheetBrowserDialog.test.tsx` -- covers BRW-01, BRW-02 (dialog rendering, selection, multi-add)
- [ ] Extend `tests/army-lists/ArmyListUnitRow.test.tsx` -- covers BRW-02 (ghost unit visual treatment)

## Security Domain

Security enforcement is not applicable to this phase. No new external inputs, no authentication, no cryptography, no access control changes. All data reads are from local SQLite databases. Ghost unit creation uses the existing parameterized query pattern.

## Sources

### Primary (HIGH confidence)
- `src/features/army-lists/UnitPickerDialog.tsx` -- direct template for DatasheetBrowserDialog
- `src/features/army-lists/ArmyListsPage.tsx` -- sibling portal architecture
- `src/features/army-lists/ArmyListDetailSheet.tsx` -- trigger integration point
- `src/features/army-lists/ArmyListUnitRow.tsx` -- ghost unit rendering target
- `src/db/queries/datasheets.ts` -- `getDatasheetsByFactionWithPoints` query
- `src/hooks/useDatasheet.ts` -- `useWahapediaFactionId`, `useDatasheetsByFactionWithPoints`
- `src/hooks/useArmyLists.ts` -- `useAddGhostUnitToList` hook
- `src/types/armyList.ts` -- `ArmyListUnitRow` type with nullable unit_id
- `src/db/queries/armyLists.ts` -- `addGhostUnitToList` function

### Secondary (MEDIUM confidence)
- `.planning/phases/93-datasheet-browser-ghost-units/93-CONTEXT.md` -- all 13 locked decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, no new dependencies
- Architecture: HIGH -- exact pattern (UnitPickerDialog) exists in codebase to clone
- Pitfalls: HIGH -- identified from established project patterns and prior phase documentation

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (stable -- no external dependencies, internal codebase only)
