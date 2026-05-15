---
phase: 78
plan: 03
status: complete
commit: 1919217
---

# Plan 78-03 Summary — Game Day After-Action Flow

## What was done

### Task 1: Extended BattleLogSheet with prefill and After-Action section
- Added optional `prefill?: Partial<BattleLogFormValues>` prop
- Title shows "End Game" when prefilled, "Edit Game" when editing, "Log Game" otherwise
- Added collapsible "After-Action" section containing:
  - `forgotten_rules` textarea (serialized to/from JSON array)
  - `mvp_unit_id` and `underperforming_unit_id` selects (moved from Group 3)
  - `mvp_notes` and `underperformer_notes` textareas
  - `lessons_learned` and `changes_next_time` textareas (moved from Group 4)
- `buildDefaultValues` merges prefill over defaults for create mode

### Task 2: End Game button in GameDayHeader + wiring
- Added `onEndGame` prop to `GameDayHeaderProps`
- Rendered "End Game" button with Flag icon and battle-gold styling
- Added `endGameOpen` state to GameDayPage
- Rendered BattleLogSheet as sibling portal with prefill `{ army_list_id, battle_date }`

### Task 3: Forgotten rules reminders in ChecklistTab
- Calls `useForgottenRules(listId)` for last 3 battle logs
- Renders amber reminder items above checklist when rules exist
- Each item has BookOpen icon, rule text, and "Reminder" tag

## Deviations
- None

## Verification
- `npx tsc --noEmit` exits 0
- `pnpm build` exits 0
- All tests pass (1 pre-existing timing flake in recentActivityQuery unrelated)
