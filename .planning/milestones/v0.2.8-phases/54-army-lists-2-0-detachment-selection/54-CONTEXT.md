# Phase 54: Army Lists 2.0 — Detachment Selection - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can select a detachment for each army list and immediately see the detachment's ability and its filtered stratagems in the army list detail — closing the most-requested gap in the current army list builder. Includes stale-data warning and favorites/reminders summary. Does NOT include favorites/notes editing (Phase 55) or Game Day mode (Phase 56).

</domain>

<decisions>
## Implementation Decisions

### DetachmentPicker UX
- Combobox (not plain Select) scoped to the list's faction — supports search when factions have many detachments
- Positioned below SheetHeader and faction badge, above the units table — logical top-of-detail placement
- Picker disabled with helper text ("Select a faction first") when army list has no faction set
- Clear button alongside picker uses `clearArmyListDetachment` (separate from updateArmyList because COALESCE blocks NULL passthrough)
- On selection: persist both `detachment_id` and `detachment_name` (denormalized TEXT copy survives rules.db re-sync)
- Uses `useDetachmentsByFaction(wahapediaFactionId)` to populate options — requires `useWahapediaFactionId(faction.name)` translation

### Rules display layout
- Stacked sections with section headers below the detachment picker, above the units table:
  1. **Detachment Ability** — displayed inline (not collapsible) showing the ability name and description
  2. **Stratagems** — list of StratagemCard components (reused from RulesHub Phase 53) for the selected detachment
- No tabs within the sheet — vertical scroll is fine for a detail sheet
- Empty state when no detachment selected: subtle text prompt ("Select a detachment to see its rules")
- Empty state when detachment selected but no data found: "No rules data available — sync rules from the Rules Hub"

### Stale-data warning
- Yellow/amber info banner below detachment picker, above rules sections
- Shown when last sync occurred more than 30 days ago (reuse `getSyncFreshness` utility from `syncFreshness.ts`)
- Not dismissible — always visible when stale (persistent signal per ARMY-04)
- Not a blocking error — informational only, does not prevent detachment selection or display
- Text: "Rules data is over 30 days old. Sync from the Rules Hub for the latest."

### Reminders section
- Positioned below stratagems section, visually distinct with star icon header
- Shows user-marked favorites with `is_reminder = 1` from `rules_favorites` table (ARMY-05)
- Each reminder displays: rule name + rule type badge (stratagem/ability/detachment ability)
- Uses `useRulesFavorites()` hook filtered to `is_reminder === 1` entries
- If no reminders exist: section hidden entirely (not an empty state)

### Claude's Discretion
- Exact spacing between sections
- Loading skeleton design for rules sections
- Whether detachment ability description needs Collapsible or is always expanded
- Combobox styling details (width, placeholder text)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Army list data layer (Phase 52)
- `src/types/armyList.ts` — ArmyList interface with detachment_id and detachment_name fields
- `src/db/queries/armyLists.ts` — updateArmyList (COALESCE), clearArmyListDetachment (explicit NULL)
- `src/hooks/useArmyLists.ts` — useArmyListWithUnits, useUpdateArmyList, useClearArmyListDetachment hooks
- `.planning/phases/52-schema-data-layer-foundation/52-CONTEXT.md` — Detachment linkage decisions, rule identification pattern

### Rules data hooks (Phase 52)
- `src/hooks/useRulesExtended.ts` — useDetachmentById, useStratagemsByDetachment, useDetachmentsByFaction hooks
- `src/db/queries/rulesExtended.ts` — getDetachmentById, getStratagemsByDetachment, getDetachmentsByFaction queries

### Favorites data layer (Phase 52)
- `src/hooks/useRulesFavorites.ts` — useRulesFavorites hook (read favorites from hobbyforge.db)
- `src/types/rulesFavorite.ts` — RulesFavorite type (rule_id, rule_type, rule_name, is_reminder)

### Reusable UI components (Phase 53)
- `src/features/rules-hub/StratagemCard.tsx` — Collapsible stratagem card with phase/CP badges
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Current sheet to extend with detachment picker and rules sections

### Sync freshness utilities
- `src/lib/syncFreshness.ts` — getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS
- `src/hooks/useDatasheet.ts` — useRulesSyncMeta (last sync date), useWahapediaFactionId translation

### Type definitions
- `src/types/datasheet.ts` — RwStratagem, RwDetachment, RwDetachmentAbility type interfaces

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StratagemCard`: Phase 53 component — collapsible card with phase badge + CP cost, ready for direct reuse
- `DetachmentCard`: Phase 53 component — expandable card showing detachment abilities; may reference for display patterns
- `useDetachmentsByFaction(factionId)`: Returns all detachments for Combobox population
- `useDetachmentById(detachmentId)`: Returns single detachment for ability display
- `useStratagemsByDetachment(detachmentId)`: Returns filtered stratagems for the selected detachment
- `useRulesFavorites()`: Returns all favorites — filter client-side for `is_reminder === 1`
- `useWahapediaFactionId(factionName)`: Required translation for all rules.db queries
- `getSyncFreshness(lastSyncDate)`: Returns freshness status for stale-data check
- `useRulesSyncMeta()`: Provides last sync date for freshness check
- `ArmyListSummaryBar`: Existing summary component in the sheet
- shadcn Combobox (Popover + Command pattern), Badge, Alert components

### Established Patterns
- Sibling Sheet/Dialog portal pattern — DetachmentPicker should NOT open a nested dialog; use Combobox inline
- `useWahapediaFactionId(faction.name)` required for all rules-facing queries (integer faction.id returns empty)
- staleTime: Infinity for rules.db hooks + sync invalidation registration
- clearArmyListDetachment is separate from updateArmyList due to COALESCE NULL passthrough issue

### Integration Points
- `ArmyListDetailSheet.tsx`: Main file to extend — add DetachmentPicker, rules sections, stale-data warning, reminders
- `useArmyLists.ts`: Already has useClearArmyListDetachment and useUpdateArmyList
- `useRulesSync.ts`: Already invalidates detachment-by-id and stratagems-by-detachment cache keys

</code_context>

<specifics>
## Specific Ideas

No specific requirements — auto-mode selected recommended defaults aligned with existing app patterns (Combobox for picker, StratagemCard reuse, stacked sections layout).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 54-army-lists-2-0-detachment-selection*
*Context gathered: 2026-05-11*
