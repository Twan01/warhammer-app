# Phase 92: Leader Attachment - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the UI for attaching character leaders to valid target units in army lists, and the visual grouping of leader+target pairs in the unit list. The data layer (column `leader_attached_to_id`, `setLeaderAttachment`, `clearLeaderAttachment` functions, hooks) was fully delivered in Phase 89. Valid pairings come from `synced_leader_targets` (already queryable via `getLeaderTargetsByFaction`). This phase builds the attachment UX and visual grouping on top.

</domain>

<decisions>
## Implementation Decisions

### Attachment UX
- **D-01:** LeaderAttachmentSheet is a dedicated Sheet component opened from ArmyListUnitRow, following the same sibling portal pattern as LoadoutBuilderSheet and EnhancementPickerSheet (state managed at ArmyListsPage level, opened via callback from the row). Only character units (non-Epic-Hero) that appear in `synced_leader_targets` as a `leader_name` show the attach trigger.
- **D-02:** The sheet lists valid target units currently in the army list, filtered by `synced_leader_targets` for the leader's name and faction. Each row shows the target unit name, its points, and an "Attach" button. Already-attached targets (where another leader is linked) have their Attach button disabled with a tooltip explaining the conflict.
- **D-03:** A "Detach" action is shown when the leader already has an attachment. Detaching calls `clearLeaderAttachment` and returns both units to independent display immediately.
- **D-04:** The trigger button uses a link/chain icon (Link2 from lucide-react) and only appears on rows where the unit's name matches a `leader_name` in `synced_leader_targets` for the list's faction. This requires a lookup similar to the character/keyword detection in Phase 91.

### Visual Grouping
- **D-05:** When a leader is attached to a target, the leader row renders indented below the target row with a subtle left border accent (2px solid, using the faction accent color or muted foreground). The target row gets a small "Leader: [name]" badge showing which character leads it.
- **D-06:** The sort order groups attached pairs together: the target unit appears at its normal insertion-order position, and the attached leader row appears immediately after it (regardless of the leader's own insertion order). Unattached units keep their normal `ORDER BY alu.id ASC` position.
- **D-07:** The grouping is purely visual — the leader and target remain separate rows in the database and in the unit list data. The grouping is computed client-side by reordering the flat unit list based on `leader_attached_to_id` relationships.

### Validation & Constraints
- **D-08:** Validation is preventive — only valid targets are shown in the LeaderAttachmentSheet. A unit is a valid target if: (a) it exists in the army list, (b) it matches a `target_name` in `synced_leader_targets` for the leader, and (c) it doesn't already have a different leader attached.
- **D-09:** A target unit can have at most one leader attached. If a leader tries to attach to a target that already has a leader, the option is disabled with a tooltip "Already led by [other leader name]".
- **D-10:** Removing a unit from the army list that is part of an attachment pair triggers the FK's ON DELETE SET NULL behavior — the remaining unit's `leader_attached_to_id` becomes NULL and it returns to independent display. No extra UI handling needed beyond cache invalidation.

### Ghost Unit Handling
- **D-11:** Ghost/planned units can participate in leader attachment. For ghost units, use `ghost_unit_name` to match against `synced_leader_targets.leader_name` or `target_name`. This follows the established name-based lookup pattern for ghost units.

### Claude's Discretion
- LeaderAttachmentSheet internal layout, spacing, and list presentation
- Whether to precompute "is_leader" status in the army list query (JOIN to synced_leader_targets) or resolve client-side via a separate hook
- Exact indent depth and border styling for the visual grouping
- Icon choice details and button placement within ArmyListUnitRow
- Whether the "Leader: [name]" badge on the target row is clickable (to open the leader's sheet) or static

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 89 Context (Data Layer Foundation)
- `.planning/phases/89-schema-data-layer/89-CONTEXT.md` — D-03 (leader_attached_to_id column design), D-13 (clear functions pattern)

### Phase 91 Context (Enhancement Assignment — Pattern Reference)
- `.planning/phases/91-enhancement-assignment/91-CONTEXT.md` — D-01 to D-06 (EnhancementPickerSheet pattern, character detection, sibling portal), D-10 to D-12 (preventive validation pattern)

### Leader Target Data
- `src/db/queries/bsdataExtended.ts` — `getLeaderTargetsByFaction(factionId)` returns `SyncedLeaderTargetRow[]` with leader_name, faction_id, target_name
- `src-tauri/migrations/030_bsdata_extended.sql` — `synced_leader_targets` table schema (leader_name, faction_id, target_name, synced_at)

### Army List Data Layer
- `src/db/queries/armyLists.ts` — `setLeaderAttachment`, `clearLeaderAttachment` (already implemented, Phase 89); `getArmyListWithUnits` returns `leader_attached_to_id` per row
- `src/hooks/useArmyLists.ts` — `useSetLeaderAttachment`, `useClearLeaderAttachment` hooks (already implemented, Phase 89)
- `src/types/armyList.ts` — `ArmyListUnitRow` includes `leader_attached_to_id: number | null`

### Character/Keyword Detection (Phase 91 Pattern)
- `src/hooks/useUnitKeywords.ts` — Hook for resolving character/epic-hero status from rw_datasheet_keywords
- `src/db/queries/datasheets.ts` — Datasheet keyword query patterns for rules.db

### UI Components to Extend
- `src/features/army-lists/ArmyListUnitRow.tsx` — Add leader attach trigger for character-leader units
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Sibling portal host for LeaderAttachmentSheet (alongside LoadoutBuilderSheet, EnhancementPickerSheet)
- `src/features/army-lists/LoadoutBuilderSheet.tsx` — Reference pattern for the new sheet
- `src/features/army-lists/EnhancementPickerSheet.tsx` — Reference pattern for character-filtered sheet

### Requirements
- `.planning/REQUIREMENTS.md` — LDR-01, LDR-02
- `.planning/ROADMAP.md` — Phase 92 success criteria (3 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LoadoutBuilderSheet` / `EnhancementPickerSheet`: Direct templates for LeaderAttachmentSheet — same sibling portal pattern, same Sheet-from-row trigger
- `useSetLeaderAttachment` / `useClearLeaderAttachment`: Mutation hooks already implemented with full cache invalidation
- `getLeaderTargetsByFaction`: Fetches all valid leader→target pairings for a faction — use to determine which units are leaders and which are valid targets
- `useUnitKeywords`: Character detection hook from Phase 91 — reuse for identifying character units

### Established Patterns
- Sibling portal: Sheet state managed at ArmyListsPage level, opened via callback from child row
- TEXT denormalization: leader_attached_to_id is an integer FK within the same table (army_list_units → army_list_units), not cross-DB
- Preventive validation: Disable buttons with tooltip explaining violation (used in EnhancementPickerSheet, LoadoutBuilderSheet)
- ON DELETE SET NULL: Removing a target unit auto-clears the leader's attachment — no manual cleanup needed

### Integration Points
- `ArmyListUnitRow`: Add leader attach trigger button (only for units that are leaders in synced_leader_targets)
- `ArmyListsPage`: Host LeaderAttachmentSheet state as sibling portal (alongside LoadoutBuilderSheet, EnhancementPickerSheet)
- `ArmyListDetailSheet`: Visual grouping logic — reorder flat unit list to group attached pairs
- Unit list rendering: Client-side sort that places leader rows immediately after their target rows

</code_context>

<specifics>
## Specific Ideas

- Leader detection: A unit is a "leader" if its name appears as `leader_name` in `synced_leader_targets` for the list's faction. This is distinct from the Character keyword — not all Characters are leaders (some have no valid targets in the data).
- Bidirectional visibility: When viewing a target unit's row, show which leader is attached to it. When viewing a leader's row, show which target it's attached to. Both should have quick-action to detach.
- Empty state: If a leader has no valid targets currently in the army list, the LeaderAttachmentSheet shows a message like "Add [target names] to your list to attach this leader" — listing the valid targets from synced_leader_targets that aren't in the list yet.

</specifics>

<deferred>
## Deferred Ideas

- Leader attachment persistence across list versions/snapshots — Phase 95
- Leader attachment in export format (showing grouped pairs) — Phase 94
- Leader attachment validation in Game Day mode — future milestone

None — discussion stayed within phase scope

</deferred>

---

*Phase: 92-Leader Attachment*
*Context gathered: 2026-05-21*
