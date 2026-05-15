# Phase 78: Dashboard Command Center + Game Day After-Action - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase transforms the dashboard from a passive summary into an actionable command center and closes the Game Day loop with after-action capture that feeds back into future sessions.

Two deliverables:
1. **Dashboard Command Center** — three new cards: "Next Painting Action" (driven by applied recipe progress), "Ready to Play" summary (driven by army list validation), and "Data Health" summary (sync age, warnings, backup status)
2. **Game Day After-Action** — "End Game" button that pre-fills a battle log entry, extended after-action fields (MVP, underperformer, lessons, forgotten rules), and forgotten-rules-to-reminders pipeline

</domain>

<decisions>
## Implementation Decisions

### Next Painting Action Card
- **D-01:** The card shows the first incomplete step of the most-recently-updated recipe assignment. Sort assignments by `updated_at DESC`, find the first with incomplete steps, display step description, time estimate, and paint availability.
- **D-02:** Paint availability check reuses `useRecipePaints` hook — show owned/missing/running-low indicator per paint needed for the current step.
- **D-03:** If no assignments exist or all are complete, show an empty state prompting the user to assign a recipe to a unit.
- **D-04:** New hook `useNextPaintingAction()` in `src/hooks/` that composes `useRecipeAssignments`, `useStepProgress`, and `useRecipePaints` to return a single `NextPaintingAction` result.

### Ready to Play Summary Card
- **D-05:** Shows the most-recently-edited army list. `getArmyLists()` returns `updated_at` — sort DESC, pick first.
- **D-06:** Display: list name, total points (from resolver), unpainted unit count, sync freshness from `getSyncFreshness()`.
- **D-07:** If no army lists exist, show empty state prompting list creation.

### Data Health Summary Card
- **D-08:** Compact card showing three metrics: sync age (from `useRulesSyncMeta` + `getSyncFreshness`), total warning count (from `useDiagnosticFlags` built in Phase 77), and last backup date/status (from localStorage, per Phase 77 D-06).
- **D-09:** Link to `/data-health` page for full details. The card is a summary, not a duplicate of the Data Health page.

### End Game Flow
- **D-10:** "End Game" button in `GameDayHeader` opens `BattleLogSheet` pre-filled with: `army_list_id` from active Game Day list, `battle_date` as today, `opponent_faction` if set during Game Day setup.
- **D-11:** The pre-fill is passed as `defaultValues` to the BattleLogSheet — same pattern as existing edit mode but with partial data.

### After-Action Capture
- **D-12:** Extend `BattleLogSheet` with a collapsible "After-Action" section below the core fields. Contains: MVP unit selector (dropdown from army list units), underperformer selector, lessons learned (textarea), forgotten rules (multi-line textarea, one rule per line).
- **D-13:** MVP and underperformer use the existing `mvp_unit_id` and `underperforming_unit_id` columns on `battle_log`. `lessons_learned` and `changes_next_time` columns also already exist.
- **D-14:** `forgotten_rules` stored as a JSON array string in a new TEXT column on `battle_log` (migration 029). Format: `["Rule text 1", "Rule text 2"]`. Parsed on read, serialized on write.

### Forgotten Rules → Game Day Reminders
- **D-15:** When entering Game Day, query the most recent 3 battle logs for the same faction and extract `forgotten_rules` arrays. Deduplicate and display as reminder items in the pre-game checklist section.
- **D-16:** No separate reminders table — the battle log IS the source of truth. This keeps the schema simple and the data naturally scoped to faction/army context.

### Unit/List Notes from After-Action
- **D-17:** The after-action `changes_next_time` field serves as list-level notes. For unit-specific notes, the MVP/underperformer selectors already associate units with the battle log entry. No inline unit note editing from after-action — the user can navigate to the unit detail for that.

### Claude's Discretion
- Dashboard card ordering and layout (existing CSS grid system)
- Card styling and visual hierarchy for the three new cards
- Empty state copy and design for each card
- Collapsible section styling for after-action fields in BattleLogSheet
- Forgotten rules display format in Game Day checklist (badge, list item, etc.)
- Whether "Next Painting Action" card links/navigates to the recipe or unit

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dashboard (existing cards and layout)
- `src/features/dashboard/DashboardPage.tsx` — Current dashboard layout with CSS grid, existing cards (CurrentFocusCard, HobbyPipeline, StatCards, FactionSummaryCard, ArmyReadinessCard)
- `src/features/dashboard/CurrentFocusCard.tsx` — Already receives `appliedProgress` prop; reference for card styling
- `src/features/dashboard/ArmyReadinessCard.tsx` — Existing readiness display per faction

### Applied recipe progress (for Next Painting Action)
- `src/hooks/useRecipeAssignments.ts` — `useRecipeAssignments()`, `useAssignmentsByUnit()`, `useStepProgress()`
- `src/hooks/useRecipePaints.ts` — `useRecipePaints()`, `useRecipePaintAvailability()`
- `src/types/recipeAssignment.ts` — `AppliedRecipeProgress`, `AssignmentProgress` types
- `src/lib/computeAssignmentProgress.ts` — Pure function for step completion computation

### Army list validation (for Ready to Play)
- `src/db/queries/armyLists.ts` — `getArmyListWithUnits` (5-level COALESCE), `getArmyListReadiness`
- `src/lib/computeUnitWarnings.ts` — `computeListHealthStats()`, `computeUnitWarnings()`
- `src/lib/syncFreshness.ts` — `getSyncFreshness()`, `getSyncAgeLabel()`

### Data Health (for summary card)
- `src/db/queries/diagnostics.ts` — Diagnostic detection functions (Phase 77)
- `src/hooks/useDatasheet.ts` — `useRulesSyncMeta()` for sync age

### Game Day (for End Game flow)
- `src/features/game-day/GameDayPage.tsx` — Page structure, list selection, readiness panel
- `src/features/game-day/GameDayHeader.tsx` — Header component (add End Game button)
- `src/features/game-day/GameDayReadinessPanel.tsx` — Pre-game readiness display
- `src/features/game-day/GameDayChecklist.tsx` — Pre-game checklist (add forgotten rules reminders)

### Battle log (for after-action)
- `src/types/battleLog.ts` — `BattleLog` type with mvp_unit_id, underperforming_unit_id, lessons_learned, changes_next_time
- `src/db/queries/battleLogs.ts` — CRUD operations
- `src/features/battle-log/BattleLogSheet.tsx` — Create/edit form (extend with after-action section)

### Schema
- `src-tauri/migrations/027_game_day_after_action.sql` — After-action columns on battle_log (Phase 73)

### Requirements
- `.planning/REQUIREMENTS.md` — DB-01 through DB-03, GD-01 through GD-04

### Accumulated decisions
- `.planning/STATE.md` §Accumulated Context — Transaction rules, VACUUM INTO constraint
- `.planning/phases/77-data-health-page-backup-export/77-CONTEXT.md` — Data Health page decisions (D-06 localStorage backup, D-07 diagnostics queries)
- `.planning/phases/76-points-resolver-unit-rules-mapping-split-warnings/76-CONTEXT.md` — Points resolver decisions (D-01..D-05), warning split (D-11..D-13)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CurrentFocusCard` — already wired to appliedProgress; extend or create sibling "NextPaintingActionCard"
- `ArmyReadinessCard` — per-faction readiness display; "Ready to Play" card is similar but for a single list
- `computeListHealthStats()` — returns totalPoints, battleReadyPct, warning counts — reuse for Ready to Play card
- `getSyncFreshness()` / `getSyncAgeLabel()` — sync age display for Data Health summary
- `BattleLogSheet` — existing form for battle log CRUD; extend with after-action fields
- `GameDayChecklist` — pre-game checklist component; add forgotten rules as reminder items
- `useRecipePaintAvailability()` — paint ownership check for Next Painting Action

### Established Patterns
- Dashboard CSS grid layout with responsive card sizing
- React Query hooks with KEY + useQuery + useMutation pattern
- Sheet-based forms for entity editing (reuse for End Game → BattleLogSheet)
- `PRAGMA foreign_keys = ON` on every connection; FK enforcement is automatic
- Positional `$1, $2` SQL params in all query files

### Integration Points
- `DashboardPage.tsx` — add three new cards to the CSS grid
- `GameDayHeader.tsx` — add "End Game" button
- `BattleLogSheet.tsx` — add after-action section, accept pre-fill defaultValues
- `GameDayChecklist.tsx` — render forgotten rules from recent battle logs
- `battleLogs.ts` queries — handle `forgotten_rules` JSON serialization
- New migration 029 for `forgotten_rules` column on `battle_log`

</code_context>

<specifics>
## Specific Ideas

- Next Painting Action card should show: step description, section name, paint swatch with owned/missing indicator, estimated time if available
- Ready to Play card format: "Black Legion · 1,500 pts · 3 unpainted · Synced 2 days ago"
- Data Health summary as three compact metrics in one card: sync dot (green/yellow/red), warning count badge, backup age
- End Game button should be visually distinct (e.g., accent-colored or outlined) to stand out in GameDayHeader
- Forgotten rules in checklist should be visually distinguished from regular checklist items (e.g., amber background or "Reminder" tag)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 78-Dashboard Command Center + Game Day After-Action*
*Context gathered: 2026-05-15*
