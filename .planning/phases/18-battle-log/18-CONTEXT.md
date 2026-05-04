# Phase 18: Battle Log - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

A dedicated Battle Log page where users can record every game they play — opponent name, opponent faction, mission, result (Win/Loss/Draw), army list used, optional scores, and structured post-game notes — and view their complete game history in a chronological list with a win/loss record summary. No new migrations needed: the `battle_logs` table already exists in `001_core_schema.sql` with all required columns.

</domain>

<decisions>
## Implementation Decisions

### Page structure
- New `/battle-log` route — dedicated first-class page, new sidebar nav entry
- Page header: "Battle Log" title + "Log Game" button (top-right)
- Summary bar below the header: "N games · XW YL ZD · WW% win rate" — overall totals only, no per-faction breakdown
- Chronological list below the summary bar, sorted newest first

### List entry display
- Compact two-line row:
  - Line 1: color-coded result badge (green=WIN, red=LOSS, yellow/grey=DRAW) + opponent faction + mission + points played
  - Line 2: army list name + date
- Clicking a row expands notes inline (no separate Sheet or dialog for viewing)
- Expanded section shows: opponent name, scores (my VP / opponent VP), MVP unit, underperforming unit, lessons learned, changes next time
- If the linked army list has been deleted: show "(Army list deleted)" in muted text where the army name would be

### Edit / delete actions
- Hover over a row to reveal Edit (✎) and Delete (🗑) icon buttons at the right
- Delete triggers a confirmation dialog (sibling portal — never nested inside the row or list)
- Edit opens the same Sheet form pre-filled — standard create/edit sheet pattern

### Log creation and editing UX
- "Log Game" button (top-right) opens a Sheet/drawer form
- Same Sheet used for create and edit (editingLog = null → create; editingLog = log → edit)
- Page owns all portal state (sheetOpen, editingLog, deleteDialogOpen, deletingLog) — mirrors ArmyListsPage architecture

### Form fields — all schema columns exposed
- **Required fields**: battle_date (date picker, defaults to today), opponent_faction (text), mission (text), result (Win/Loss/Draw select)
- **Optional identifiers**: opponent (text — player name, separate from faction)
- **Optional army linkage**: army_list_id (select from existing army lists; nullable)
- **Optional scores**: points_played (number), my_score (number), opponent_score (number)
- **Optional unit linkage**: mvp_unit_id (unit dropdown — select from owned units), underperforming_unit_id (unit dropdown — select from owned units); both use ON DELETE SET NULL
- **Optional structured notes**: lessons_learned (textarea), changes_next_time (textarea)
- General `notes` column: Claude's discretion whether to expose as a fourth freeform field

### Win/Loss/Draw styling
- Color-coded pill badge: green for WIN, red for LOSS, yellow/muted for DRAW
- Mirrors the painting status ring pattern — immediately scannable

### Claude's Discretion
- Exact form field layout and grouping within the Sheet (e.g. scores on one row, unit dropdowns on another)
- Whether to expose the general `notes` column as a fourth notes field alongside the three structured ones
- Loading skeleton design for the page
- Icon choice for the Battle Log sidebar nav entry
- Error state handling
- Whether the expanded inline notes section is animated (accordion vs. instant)
- Exact muted text wording for the "(Army list deleted)" case

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §BATTLE-01..05 — Full battle log acceptance criteria

### Database schema
- `src-tauri/migrations/001_core_schema.sql` — `battle_logs` table definition (all 15 columns; army_list_id and mvp/underperforming unit FKs use ON DELETE SET NULL)

### Architecture patterns to follow
- `.planning/phases/08-army-list-builder/08-CONTEXT.md` — ArmyListsPage sibling portal architecture (page owns all Sheet/Dialog state, selectedListId pattern, create/edit Sheet)
- `.planning/phases/14-spending-tracker/14-CONTEXT.md` — SpendingPage layout pattern (max-w-3xl, hero card, breakdown table)

No external plugin specs — all patterns are already established in the codebase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/army-lists/ArmyListsPage.tsx` — Direct architecture template: page owns portal state (sheetOpen, editingList, deleteDialogOpen, deletingList, selectedListId); BattleLogPage follows this exactly
- `src/features/army-lists/ArmyListSheet.tsx` — Create/edit Sheet form pattern with react-hook-form + zod to follow for BattleLogSheet
- `src/features/army-lists/ArmyListDeleteDialog.tsx` — Delete confirmation dialog pattern
- `src/features/spending/SpendingPage.tsx` — Page layout pattern (max-w-3xl, loading skeleton, error state, hero card)
- `src/hooks/useArmyLists.ts` — Hook pattern; `useBattleLogs` hook follows same shape
- `src/db/queries/armyLists.ts` — Query module pattern; new `src/db/queries/battleLogs.ts` follows same structure

### Established Patterns
- All queries via `tauri-plugin-sql` directly — no ORM
- 0|1 integer booleans in SQLite
- Query modules in `src/db/queries/`, hook modules in `src/hooks/`
- Sibling Sheet/Dialog portal pattern — BattleLogDeleteDialog must be a sibling to BattleLogSheet, not nested
- selectedLogId pattern: store ID, derive log object from cache (same as selectedListId in ArmyListsPage)
- TanStack Query cache key convention: `["battle-logs"]`
- Mutations must call `queryClient.invalidateQueries({ queryKey: ["battle-logs"] })`

### Integration Points
- `src/app/AppSidebar.tsx` (or `src/app/Layout.tsx`) — Add "Battle Log" sidebar nav entry
- `src/routes/` — New route file for `/battle-log` (follows existing route file pattern)
- `src/hooks/useArmyLists.ts` — BattleLogSheet needs the army lists query to populate the army list selector
- `src/hooks/useUnits.ts` — BattleLogSheet needs units query to populate MVP/underperforming unit dropdowns
- Summary bar query: `SELECT result, COUNT(*) FROM battle_logs GROUP BY result` — returns counts to compute W/L/D totals and win rate in JS

</code_context>

<specifics>
## Specific Ideas

- Confirmed compact row layout (from mockup):
  ```
  ┌──────────────────────────────────────────────┐
  │ [WIN]  Tau Empire · Control · 2000pts        │
  │        Army: Fast Strike Force  · 2026-05-01 │
  └──────────────────────────────────────────────┘
  ```
- Confirmed summary bar layout (from mockup):
  ```
  15 games · 10W 3L 2D · 67%
  ```

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 18-battle-log*
*Context gathered: 2026-05-04*
