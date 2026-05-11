# Phase 56: Game Day Mode - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Focused in-game reference view launched from any army list — with a CP tracker, phase-grouped stratagems for the selected detachment, a persistent pre-game checklist, per-unit ability cards, once-per-game toggles, and painting status visible at a glance. Does NOT include persistent game state in SQLite (deferred), victory point tracking, or turn counters.

</domain>

<decisions>
## Implementation Decisions

### Page layout & navigation
- New route `/game-day/$listId` in TanStack Router — full page, not a Sheet
- "Game Day" button on ArmyListDetailSheet navigates to `/game-day/{list.id}`
- Header shows list name, faction badge, detachment name, and a back arrow to `/army-lists`
- Tabbed layout with 3 tabs: **Stratagems** / **Units** / **Checklist**
- User-marked reminders (is_reminder=1) pinned at the top of the Stratagems tab for maximum visibility during gameplay

### CP tracker
- CP display in the page header area, always visible across all tabs
- Starting CP is user-configurable (default 0 — 10th edition starts at 0, gains 1 per command phase)
- Tapping a stratagem card in the Stratagems tab decrements CP by that stratagem's cp_cost
- +1 button for gaining CP each command phase
- Single undo for last CP spend (stores previous CP value)
- CP state persists via Zustand persist (localStorage), keyed by army list ID

### Stratagems tab
- Stratagems grouped by game phase: Command, Movement, Shooting, Charge, Fight (reuse `PHASE_STYLES` from StratagemCard)
- Each group has a collapsible header with phase badge styling
- Stratagem cards reuse `StratagemCard` component from Phase 53 (or a simplified variant without annotation controls)
- Tapping a stratagem spends CP (decrements tracker); cards show cp_cost prominently
- Reminders section pinned at top before phase groups

### Pre-game checklist
- Dedicated Checklist tab with hardcoded default steps plus user-addable custom items
- Default steps: "Verify army list points", "Check detachment rules", "Review stratagems", "Confirm faction rules", "Set up terrain"
- User can add custom checklist items via an inline text input + add button
- Checked items persist; manual "Reset All" button to uncheck everything
- State persists via Zustand persist (localStorage) keyed by army list ID
- Each checklist item is a checkbox with text label

### Unit ability cards
- Units tab shows all units from the army list as collapsible cards (collapsed by default)
- Each card header: unit name + painting status badge (reuse existing StatusBadge pattern)
- Expanded card shows: strategy notes (from hobbyforge.db), datasheet abilities (from rules.db if linked)
- Once-per-game abilities show a used/unused toggle button; toggle state persists via Zustand persist
- Painting status badge uses the same color-coded `status_painting` field from ArmyListUnitRow

### Claude's Discretion
- Exact tab styling and icon choices for the 3 tabs
- Loading skeleton layout for the page
- Whether stratagem cards in Game Day mode are interactive (collapsible) or always-expanded
- Spacing and density of unit ability cards
- Empty states for tabs when no data available
- Whether to show detachment ability in a dedicated header card or within Stratagems tab

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Army list data layer
- `src/types/armyList.ts` — ArmyList, ArmyListUnitRow interfaces (status_painting, effective_points, unit_id fields)
- `src/hooks/useArmyLists.ts` — useArmyListWithUnits hook for loading list + units
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Launch point for Game Day button; shows existing DetachmentPicker, DetachmentRulesSection, RemindersSection

### Rules data hooks
- `src/hooks/useRulesExtended.ts` — useStratagemsByDetachment, useDetachmentAbilitiesByDetachment, useSharedAbilitiesByFaction
- `src/hooks/useDatasheet.ts` — useDatasheet (unit abilities), useWahapediaFactionId (faction ID translation), useRulesSyncMeta
- `src/db/queries/datasheets.ts` — getFullDatasheet (returns abilities, keywords for a unit)

### Stratagem display components
- `src/features/rules-hub/StratagemCard.tsx` — Collapsible card with PHASE_STYLES color-coded badges, cp_cost display; accepts favorite/note props
- `src/features/army-lists/DetachmentRulesSection.tsx` — Existing detachment abilities + stratagems display in army list detail
- `src/features/army-lists/RemindersSection.tsx` — Reads is_reminder=1 favorites, displays with type badges

### Favorites data layer
- `src/hooks/useRulesFavorites.ts` — useRulesFavorites hook (GAME-07 source for reminders)
- `src/types/rulesFavorite.ts` — RulesFavorite type (rule_id, rule_type, rule_name, is_reminder)

### Router
- `src/app/router.tsx` — TanStack Router route tree; new /game-day/$listId route to be added here

### Unit strategy notes
- `src/db/queries/strategyNotes.ts` — Per-unit strategy notes (user-entered ability reminders)
- `src/hooks/useDatasheet.ts` — useDatasheet for synced datasheet abilities

### Phase 52 context (data layer decisions)
- `.planning/phases/52-schema-data-layer-foundation/52-CONTEXT.md` — Detachment linkage, rule identification, Zustand persist decision

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StratagemCard`: Phase 53 collapsible card with phase badge + CP cost — direct reuse for stratagem display
- `RemindersSection`: Phase 54 component reading is_reminder=1 favorites — reusable or pattern-reference for reminders in Game Day
- `DetachmentRulesSection`: Phase 54 component showing detachment abilities + stratagems — reference for data loading pattern
- `ArmyListSummaryBar`: Existing summary component in army list detail — may reuse for Game Day header
- `StatusBadge` / Badge variant: Existing painting status display in ArmyListUnitRow — reuse for unit card headers
- `PHASE_STYLES`: StratagemCard already has color-coded phase badges for Command/Movement/Shooting/Charge/Fight
- `useArmyListWithUnits(listId)`: Returns army list + all units with painting_status, effective_points
- `useStratagemsByDetachment(detachmentId)`: Returns stratagems for the selected detachment
- `useDatasheet(unitId)`: Returns full datasheet (abilities, keywords) for a unit
- shadcn Tabs, Collapsible, Badge, Checkbox, Button components

### Established Patterns
- Zustand persist for ephemeral game state (STATE.md decision — localStorage, not SQLite)
- `useWahapediaFactionId(faction.name)` required for all rules.db queries
- `staleTime: Infinity` for rules.db hooks + sync invalidation registration
- Sibling Sheet/Dialog portal pattern — Game Day is a full page, no nested portal issues
- Page-level data loading with Map<key, T> for O(1) lookup (Phase 55 pattern)

### Integration Points
- `ArmyListDetailSheet.tsx`: Add "Game Day" button navigating to `/game-day/${list.id}`
- `router.tsx`: Register new `/game-day/$listId` route with GameDayPage component
- `AppSidebar`: No sidebar entry needed — Game Day is accessed from army list detail only
- New Zustand store: `src/features/game-day/gameDayStore.ts` for CP, checklist, once-per-game toggles

</code_context>

<specifics>
## Specific Ideas

No specific requirements — auto-mode selected recommended defaults aligned with existing app patterns (tabbed layout, Zustand persist, StratagemCard reuse, collapsible unit cards).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 56-game-day-mode*
*Context gathered: 2026-05-11*
