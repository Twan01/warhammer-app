# Phase 92: Leader Attachment - Research

**Researched:** 2026-05-21
**Domain:** Army list UI — leader-to-target pairing and visual grouping
**Confidence:** HIGH

## Summary

Phase 92 builds the UI for attaching character leaders to valid target units in army lists and visually grouping attached pairs. The entire data layer (column `leader_attached_to_id`, `setLeaderAttachment`, `clearLeaderAttachment` functions, mutation hooks with cache invalidation) was fully delivered in Phase 89. Valid leader-target pairings come from `synced_leader_targets` (queryable via `getLeaderTargetsByFaction`). This phase is purely frontend: a new `LeaderAttachmentSheet` component, a trigger button on unit rows, and client-side reordering logic for visual grouping.

The implementation follows the exact same sibling portal pattern used by `LoadoutBuilderSheet` (Phase 90) and `EnhancementPickerSheet` (Phase 91). All three share identical architecture: state managed at `ArmyListsPage` level, opened via callback from `ArmyListUnitRow`, rendered as a sibling portal at the page root. No new packages are needed.

**Primary recommendation:** Clone the `EnhancementPickerSheet` pattern for `LeaderAttachmentSheet`, add a `groupUnitsWithLeaders()` pure function for client-side reordering, and extend `ArmyListUnitRow` with a leader attach trigger button using the same keyword-based eligibility pattern from Phase 91.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** LeaderAttachmentSheet is a dedicated Sheet component opened from ArmyListUnitRow, following the same sibling portal pattern as LoadoutBuilderSheet and EnhancementPickerSheet (state managed at ArmyListsPage level, opened via callback from the row). Only character units (non-Epic-Hero) that appear in `synced_leader_targets` as a `leader_name` show the attach trigger.
- **D-02:** The sheet lists valid target units currently in the army list, filtered by `synced_leader_targets` for the leader's name and faction. Each row shows the target unit name, its points, and an "Attach" button. Already-attached targets (where another leader is linked) have their Attach button disabled with a tooltip explaining the conflict.
- **D-03:** A "Detach" action is shown when the leader already has an attachment. Detaching calls `clearLeaderAttachment` and returns both units to independent display immediately.
- **D-04:** The trigger button uses a link/chain icon (Link2 from lucide-react) and only appears on rows where the unit's name matches a `leader_name` in `synced_leader_targets` for the list's faction.
- **D-05:** When a leader is attached to a target, the leader row renders indented below the target row with a subtle left border accent (2px solid, using the faction accent color or muted foreground). The target row gets a small "Leader: [name]" badge showing which character leads it.
- **D-06:** The sort order groups attached pairs together: the target unit appears at its normal insertion-order position, and the attached leader row appears immediately after it. Unattached units keep their normal position.
- **D-07:** The grouping is purely visual — the leader and target remain separate rows in the database. The grouping is computed client-side by reordering the flat unit list based on `leader_attached_to_id` relationships.
- **D-08:** Validation is preventive — only valid targets are shown in the LeaderAttachmentSheet.
- **D-09:** A target unit can have at most one leader attached. Disabled with tooltip "Already led by [other leader name]".
- **D-10:** Removing a unit from the army list that is part of an attachment pair triggers FK ON DELETE SET NULL — no extra UI handling needed beyond cache invalidation.
- **D-11:** Ghost/planned units can participate in leader attachment using `ghost_unit_name` for name matching.

### Claude's Discretion
- LeaderAttachmentSheet internal layout, spacing, and list presentation
- Whether to precompute "is_leader" status in the army list query (JOIN to synced_leader_targets) or resolve client-side via a separate hook
- Exact indent depth and border styling for the visual grouping
- Icon choice details and button placement within ArmyListUnitRow
- Whether the "Leader: [name]" badge on the target row is clickable or static

### Deferred Ideas (OUT OF SCOPE)
- Leader attachment persistence across list versions/snapshots — Phase 95
- Leader attachment in export format (showing grouped pairs) — Phase 94
- Leader attachment validation in Game Day mode — future milestone

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LDR-01 | User can attach a character unit as leader to a valid target unit, with valid pairings shown from synced_leader_targets | LeaderAttachmentSheet component + useLeaderTargets hook + existing setLeaderAttachment/clearLeaderAttachment mutations |
| LDR-02 | Attached leader shown visually grouped with their target unit in the list | groupUnitsWithLeaders() pure function + ArmyListDetailSheet reorder + ArmyListUnitRow indent styling |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Leader eligibility detection | Frontend (client) | Database (rules.db) | Name matching against synced_leader_targets is a client-side lookup using data fetched from hobbyforge.db |
| Attachment mutation | Database (hobbyforge.db) | -- | setLeaderAttachment/clearLeaderAttachment already write to army_list_units.leader_attached_to_id |
| Valid target filtering | Frontend (client) | -- | Cross-reference synced_leader_targets with current army list units client-side |
| Visual grouping/reorder | Frontend (client) | -- | Pure function reorders flat unit array before rendering; no DB change |
| Attachment sheet UI | Frontend (client) | -- | New Sheet component following sibling portal pattern |

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Project standard |
| @tanstack/react-query | 5.x | Server state + cache invalidation | Project standard |
| lucide-react | latest | Icons (Link2 for attach trigger) | Project standard |
| shadcn/ui | n/a | Sheet, Button, Badge, Tooltip components | Project standard |
| sonner | latest | Toast notifications | Project standard |

### Supporting (Already in Project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | latest | Filter state (if needed) | Not needed for this phase |
| zod | latest | Schema validation | Not needed — no form input |

**No new packages required.** This phase uses only existing project dependencies.

## Package Legitimacy Audit

No new packages to install. All dependencies are already in the project.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
ArmyListsPage (state owner)
  |
  |-- [selectedListId, leaderUnitId state]
  |
  +-- ArmyListDetailSheet
  |     |
  |     +-- groupUnitsWithLeaders(units)  <-- pure reorder function
  |     |     |
  |     |     +-- Returns reordered array: target, indented-leader, ...
  |     |
  |     +-- ArmyListUnitRow (per unit)
  |           |
  |           +-- [if isLeader] Link2 button --> onAttachLeader(aluId)
  |           +-- [if hasLeaderAttached] "Leader: X" badge
  |           +-- [if isAttachedLeader] indent + left border
  |
  +-- LeaderAttachmentSheet (sibling portal)
        |
        +-- useLeaderTargets(factionId) --> synced_leader_targets
        +-- Filter to valid targets in current list
        +-- Attach button --> useSetLeaderAttachment
        +-- Detach button --> useClearLeaderAttachment
```

### Recommended Project Structure

```
src/features/army-lists/
  LeaderAttachmentSheet.tsx   # NEW — Sheet for browsing and attaching leaders
  ArmyListUnitRow.tsx         # MODIFY — add leader trigger + indent styling
  ArmyListDetailSheet.tsx     # MODIFY — add onAttachLeader callback + grouping logic
  ArmyListsPage.tsx           # MODIFY — add leaderUnitId state + LeaderAttachmentSheet portal

src/hooks/
  useLeaderTargets.ts         # NEW — React Query hook for getLeaderTargetsByFaction

src/lib/
  groupUnitsWithLeaders.ts    # NEW — pure function for reordering units with leader grouping

tests/army-lists/
  LeaderAttachmentSheet.test.tsx    # NEW — sheet behavior tests
  groupUnitsWithLeaders.test.tsx    # NEW — pure function unit tests
```

### Pattern 1: Sibling Portal Sheet (Established)

**What:** Sheet state lives at ArmyListsPage level; child components call callbacks to open sheets
**When to use:** Always for Sheets/Dialogs in this app (Pitfall 1 from project conventions)
**Example:**
```typescript
// ArmyListsPage.tsx — state + portal
const [leaderUnitId, setLeaderUnitId] = useState<number | null>(null);
const openLeaderAttach = (armyListUnitId: number) => setLeaderUnitId(armyListUnitId);
const closeLeaderAttach = () => setLeaderUnitId(null);

// In JSX — sibling portal at page root
<LeaderAttachmentSheet
  open={leaderUnitId !== null}
  unit={leaderUnit}
  list={selectedList}
  units={selectedListUnits ?? []}
  onClose={closeLeaderAttach}
/>
```
[VERIFIED: src/features/army-lists/ArmyListsPage.tsx — existing pattern for LoadoutBuilderSheet, EnhancementPickerSheet]

### Pattern 2: Client-Side Unit Reordering (New for Phase 92)

**What:** Pure function that takes a flat array of ArmyListUnitRow and returns a reordered array where attached leaders appear immediately after their target units
**When to use:** Before rendering the unit table in ArmyListDetailSheet
**Example:**
```typescript
// src/lib/groupUnitsWithLeaders.ts
export interface GroupedUnit {
  unit: ArmyListUnitRow;
  isIndentedLeader: boolean;
}

export function groupUnitsWithLeaders(units: ArmyListUnitRow[]): GroupedUnit[] {
  // 1. Build a Set of unit IDs that are attached leaders (have leader_attached_to_id)
  // 2. Iterate units in original order
  // 3. For each unit, emit it, then emit any leaders attached to it (marked isIndentedLeader)
  // 4. Skip leaders when encountered in their original position (they were already emitted)
  const leadersByTarget = new Map<number, ArmyListUnitRow[]>();
  const attachedLeaderIds = new Set<number>();

  for (const u of units) {
    if (u.leader_attached_to_id != null) {
      const list = leadersByTarget.get(u.leader_attached_to_id) ?? [];
      list.push(u);
      leadersByTarget.set(u.leader_attached_to_id, list);
      attachedLeaderIds.add(u.id);
    }
  }

  const result: GroupedUnit[] = [];
  for (const u of units) {
    if (attachedLeaderIds.has(u.id)) continue; // skip — will be emitted after target
    result.push({ unit: u, isIndentedLeader: false });
    const leaders = leadersByTarget.get(u.id);
    if (leaders) {
      for (const leader of leaders) {
        result.push({ unit: leader, isIndentedLeader: true });
      }
    }
  }
  return result;
}
```
[ASSUMED — logic derived from D-06/D-07 decisions]

### Pattern 3: Leader Eligibility Detection

**What:** Determine if a unit is a "leader" (its name appears in synced_leader_targets as leader_name for the list's faction)
**When to use:** To show/hide the Link2 trigger button on ArmyListUnitRow
**Approach recommendation:** Client-side resolution via a `useLeaderTargets` hook that fetches all leader targets for the faction, then check membership in the row component. This is simpler than a SQL JOIN and consistent with how enhancement eligibility works.
```typescript
// In ArmyListUnitRow or parent:
const leaderTargets = useLeaderTargets(factionIdStr);
const isLeader = (leaderTargets ?? []).some(
  (lt) => lt.leader_name.toLowerCase() === unit.unit_name.toLowerCase()
);
```
[ASSUMED — discretion area; client-side approach recommended for simplicity]

### Pattern 4: Disabled Button with Tooltip (Established)

**What:** Wrap disabled button in `<span>` for tooltip to work (Radix tooltip doesn't fire on disabled elements)
**When to use:** For "Already led by [name]" disabled state
**Example:**
```typescript
<Tooltip>
  <TooltipTrigger asChild>
    <span className="inline-flex">
      <Button disabled>Attach</Button>
    </span>
  </TooltipTrigger>
  <TooltipContent>Already led by {existingLeaderName}</TooltipContent>
</Tooltip>
```
[VERIFIED: src/features/army-lists/EnhancementPickerSheet.tsx line 196-209]

### Anti-Patterns to Avoid
- **Nested Sheet/Dialog:** Never render LeaderAttachmentSheet inside ArmyListDetailSheet. Always use sibling portal at ArmyListsPage level.
- **Database-side grouping:** Do not modify the SQL ORDER BY in getArmyListWithUnits. Grouping is client-side only (D-07).
- **Mutating the unit array:** The groupUnitsWithLeaders function must return a NEW array, not mutate the React Query cache data.
- **Integer faction_id in synced queries:** synced_leader_targets.faction_id is TEXT. Always convert with `String(faction_id)` before querying (Pitfall from Phase 91).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Leader attachment mutations | Custom SQL + cache invalidation | `useSetLeaderAttachment` / `useClearLeaderAttachment` (Phase 89) | Already implemented with correct FK handling and cache invalidation |
| Character keyword detection | Custom rules.db query | `useUnitKeywords` hook (Phase 91) | Already handles cross-DB lookup with safe defaults |
| Sheet component primitives | Custom overlay/animation | shadcn/ui `Sheet` | Project standard, handles focus trapping, scroll lock |
| Toast notifications | Custom notification system | `sonner` toast | Project standard |

**Key insight:** The entire data layer for leader attachment is complete. This phase is purely UI work — one new Sheet, modifications to two existing components, and one pure utility function.

## Common Pitfalls

### Pitfall 1: TEXT vs INTEGER faction_id Mismatch
**What goes wrong:** Querying synced_leader_targets with an integer faction_id returns zero rows because the column is TEXT.
**Why it happens:** `ArmyListUnitRow.faction_id` is an integer (from units table), but `synced_leader_targets.faction_id` is TEXT (from BSData sync).
**How to avoid:** Always convert with `String(faction_id)` before passing to `getLeaderTargetsByFaction`. EnhancementPickerSheet already demonstrates this pattern (line 46-49).
**Warning signs:** Leader trigger button never appears on any unit.

### Pitfall 2: Ghost Unit Name Matching
**What goes wrong:** Ghost units can't participate in leader attachment because their name doesn't match.
**Why it happens:** Ghost units have `unit_name` derived from `COALESCE(u.name, alu.ghost_unit_name)` — this should work, but the comparison must be case-insensitive.
**How to avoid:** Use `.toLowerCase()` comparison when matching `unit_name` against `synced_leader_targets.leader_name` or `target_name` (D-11).
**Warning signs:** Ghost units never show the leader trigger or appear as valid targets.

### Pitfall 3: Stale Leader Name After Target Removal
**What goes wrong:** The "Leader: [name]" badge on a target row shows a stale leader name after the leader is removed from the list.
**Why it happens:** ON DELETE SET NULL clears `leader_attached_to_id` on the leader row, but React Query cache might be stale.
**How to avoid:** `useRemoveUnitFromList` already invalidates `ARMY_LIST_UNITS_KEY(list_id)` — the cache refresh will clear the stale grouping. No extra work needed, but verify the invalidation fires.
**Warning signs:** Orphaned leader badges persist after unit removal.

### Pitfall 4: Multiple Leaders to Same Target
**What goes wrong:** Two leaders get attached to the same target unit.
**Why it happens:** No database UNIQUE constraint on `leader_attached_to_id` (it's a regular FK).
**How to avoid:** Preventive validation in LeaderAttachmentSheet (D-09): check if any other unit in the list has `leader_attached_to_id === targetId` and disable the Attach button if so.
**Warning signs:** Two leaders appear indented under the same target.

### Pitfall 5: Disabled Button Tooltip (Radix)
**What goes wrong:** Tooltip doesn't appear on disabled Attach button.
**Why it happens:** Radix UI tooltips don't fire pointer events on disabled elements.
**How to avoid:** Wrap disabled `<Button>` in a `<span className="inline-flex">` (established pattern from EnhancementPickerSheet).
**Warning signs:** Users can't see why the Attach button is disabled.

### Pitfall 6: Circular Leader Attachment
**What goes wrong:** Unit A attaches to Unit B, then Unit B tries to attach to Unit A.
**Why it happens:** No database constraint preventing a unit from being both a leader and a target.
**How to avoid:** In LeaderAttachmentSheet, only show units that are NOT already attached leaders (where `leader_attached_to_id IS NULL` or the current leader is re-attaching). Also, the leader eligibility check (unit name in synced_leader_targets as leader_name) naturally prevents non-characters from being listed as leaders.
**Warning signs:** Infinite loop in groupUnitsWithLeaders or visual nesting.

## Code Examples

### LeaderAttachmentSheet Props Interface
```typescript
// Source: derived from EnhancementPickerSheet pattern
interface LeaderAttachmentSheetProps {
  open: boolean;
  unit: ArmyListUnitRowType | null;   // The leader unit
  list: ArmyList | null;              // The army list (for faction_id)
  units: ArmyListUnitRowType[];       // All units in the list (for target filtering)
  onClose: () => void;
}
```
[ASSUMED — derived from established pattern]

### useLeaderTargets Hook
```typescript
// src/hooks/useLeaderTargets.ts
import { useQuery } from "@tanstack/react-query";
import { getLeaderTargetsByFaction } from "@/db/queries/bsdataExtended";
import type { SyncedLeaderTargetRow } from "@/db/queries/bsdataExtended";

export const LEADER_TARGETS_KEY = (factionId: string) =>
  ["leader-targets", factionId] as const;

export function useLeaderTargets(factionId: string | null) {
  return useQuery<SyncedLeaderTargetRow[]>({
    queryKey: factionId ? LEADER_TARGETS_KEY(factionId) : ["leader-targets"],
    queryFn: () => getLeaderTargetsByFaction(factionId!),
    enabled: !!factionId,
    staleTime: 5 * 60 * 1000,
  });
}
```
[ASSUMED — follows established hook pattern from useEnhancementsByList]

### ArmyListUnitRow Leader Trigger
```typescript
// Added to ArmyListUnitRow — similar to showEnhanceTrigger pattern
const isLeader = (leaderTargets ?? []).some(
  (lt) => lt.leader_name.toLowerCase() === unit.unit_name.toLowerCase()
);
const showLeaderTrigger = isLeader && !unit.leader_attached_to_id;

{showLeaderTrigger && (
  <Button
    type="button"
    variant="outline"
    size="sm"
    className="h-7 text-xs mt-1"
    onClick={onAttachLeader}
    aria-label={`Attach ${unit.unit_name} as leader`}
  >
    <Link2 className="h-3 w-3 mr-1" />Attach
  </Button>
)}
```
[ASSUMED — follows showEnhanceTrigger pattern at line 211-220 of ArmyListUnitRow.tsx]

### Visual Grouping in ArmyListDetailSheet
```typescript
// In ArmyListDetailSheet render, replace direct (units ?? []).map with:
const groupedUnits = useMemo(
  () => groupUnitsWithLeaders(units ?? []),
  [units],
);

// Then in TableBody:
{groupedUnits.map(({ unit: alu, isIndentedLeader }) => (
  <ArmyListUnitRow
    key={alu.id}
    unit={alu}
    isIndentedLeader={isIndentedLeader}
    leaderName={/* find leader name for this target */}
    // ... existing props
  />
))}
```
[ASSUMED — derived from D-05/D-06/D-07 decisions]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Character detection via keyword lookup | useUnitKeywords hook (Phase 91) | Phase 91 (2026-05-21) | Reuse for leader eligibility as secondary check |
| No leader attachment | leader_attached_to_id FK column (Phase 89) | Phase 89 (2026-05-20) | Data layer complete, UI pending |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Client-side leader detection via useLeaderTargets is simpler than SQL JOIN approach | Architecture Patterns (Pattern 3) | Low — could switch to JOIN later if performance is an issue, but personal-use scale makes this unlikely |
| A2 | groupUnitsWithLeaders algorithm handles all edge cases (multiple leaders, ghost units, circular) | Architecture Patterns (Pattern 2) | Medium — edge cases need thorough unit tests |
| A3 | LeaderAttachmentSheet needs the full units array passed as prop for target filtering | Code Examples | Low — could alternatively use the useArmyListWithUnits hook internally |

## Open Questions

1. **Leader trigger visibility when already attached**
   - What we know: D-04 says trigger shows when unit name matches leader_name. D-03 says "Detach" action when already attached.
   - What's unclear: Should the trigger button change to "Attached to [target]" when the leader is already attached, or should the attach trigger disappear and a separate detach button appear?
   - Recommendation: Show the Link2 button always for leaders, but change text to "Attached" and clicking opens the sheet showing the current attachment with a Detach option. This is consistent with how the Enhancement button works (always visible, sheet shows current state).

2. **Leader targets data passed to row vs fetched per-row**
   - What we know: We need leader target data to determine if a unit is a leader.
   - What's unclear: Pass from ArmyListDetailSheet (single fetch) or let each row fetch independently?
   - Recommendation: Fetch once in ArmyListDetailSheet or ArmyListsPage and pass down as prop. Avoids N queries for N rows.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test -- tests/army-lists/LeaderAttachmentSheet.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LDR-01 | Sheet shows valid targets from synced_leader_targets, attach/detach works | unit | `pnpm test -- tests/army-lists/LeaderAttachmentSheet.test.tsx -x` | Wave 0 |
| LDR-02 | groupUnitsWithLeaders reorders correctly | unit | `pnpm test -- tests/army-lists/groupUnitsWithLeaders.test.tsx -x` | Wave 0 |
| LDR-02 | ArmyListUnitRow renders indent styling for attached leaders | unit | `pnpm test -- tests/army-lists/ArmyListUnitRow.test.tsx -x` | Exists (extend) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/army-lists/ -x`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `tests/army-lists/LeaderAttachmentSheet.test.tsx` -- covers LDR-01 (sheet render, attach, detach, disabled states)
- [ ] `tests/army-lists/groupUnitsWithLeaders.test.tsx` -- covers LDR-02 (reorder logic, edge cases)
- [ ] Extend `tests/army-lists/ArmyListUnitRow.test.tsx` -- covers LDR-02 (leader trigger, indent rendering)

## Security Domain

This phase handles no authentication, session management, access control, or cryptography. All data is local SQLite with no network calls.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | no | No user text input — only click-to-select from validated options |
| V6 Cryptography | no | n/a |

## Sources

### Primary (HIGH confidence)
- `src/features/army-lists/EnhancementPickerSheet.tsx` — direct template for LeaderAttachmentSheet
- `src/features/army-lists/ArmyListsPage.tsx` — sibling portal state management pattern
- `src/features/army-lists/ArmyListUnitRow.tsx` — trigger button placement pattern
- `src/features/army-lists/ArmyListDetailSheet.tsx` — unit table rendering (modification target)
- `src/hooks/useArmyLists.ts` — existing mutation hooks (useSetLeaderAttachment, useClearLeaderAttachment)
- `src/db/queries/armyLists.ts` — setLeaderAttachment, clearLeaderAttachment implementations
- `src/db/queries/bsdataExtended.ts` — getLeaderTargetsByFaction, SyncedLeaderTargetRow type
- `src/types/armyList.ts` — ArmyListUnitRow.leader_attached_to_id field
- `src-tauri/migrations/030_bsdata_extended.sql` — synced_leader_targets schema

### Secondary (MEDIUM confidence)
- None needed — all patterns are internal to this codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing project dependencies
- Architecture: HIGH — follows established sibling portal pattern with 2 prior implementations to reference
- Pitfalls: HIGH — identified from direct code analysis of existing patterns and Phase 91 experience

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (stable — internal patterns only, no external dependency drift risk)
