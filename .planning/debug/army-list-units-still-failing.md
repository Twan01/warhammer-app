---
slug: army-list-units-still-failing
status: resolved
trigger: user-report
created: 2026-05-20
resolved: 2026-05-27
---

# Debug: Army List — Three Issues (Remove, Points Display, Category Breakdown)

## Symptoms
1. Cannot remove a unit from army list (or remove button doesn't work)
2. Points per unit not shown in the army list detail view
3. Points not split by categories (HQ, Battleline, etc.)

## Investigation

### Evidence
- timestamp: 2026-05-27 — Full code review of remove unit data flow
  - ArmyListDetailSheet.handleRemoveUnit(alu.id) -> removeUnitFromList.mutate
  - useRemoveUnitFromList -> removeUnitFromList(army_list_unit_id) -> DELETE SQL
  - Root cause for issue #1: The removeUnitFromList SQL function only did a bare DELETE
    without first clearing FK references. If the unit had enhancements assigned or
    another unit had leader_attached_to_id pointing to it, the FK constraint could
    cause a silent failure. The deleteArmyList function already handled this pattern
    (explicitly clearing references before deleting) but removeUnitFromList did not.

- timestamp: 2026-05-27 — Points display analysis
  - ArmyListUnitRow showed points via PointsSourceChip (tiny text-xs dot + label)
  - The effective_points value from SQL was only used in the summary bar total
  - No prominent per-unit points display existed in the row
  - Root cause for issue #2: effective_points was computed in SQL but never shown
    prominently in the unit row. Only a small PointsSourceChip was visible.

- timestamp: 2026-05-27 — Category breakdown analysis
  - units.category field exists on the Unit type but was not selected in
    getArmyListWithUnits SQL query
  - ArmyListSummaryBar had role coverage pills but no category-based points grouping

## Resolution
- root_cause: Three separate issues — (1) removeUnitFromList did not clear FK references
  before deleting, (2) effective_points not prominently displayed, (3) unit_category
  not included in query or summary
- fix: Applied fixes for all three issues:
  1. removeUnitFromList now clears leader_attached_to_id and deletes enhancements before
     deleting the unit row (same pattern as deleteArmyList)
  2. ArmyListUnitRow now shows effective_points in bold text above the source chip
  3. Added u.category AS unit_category to SQL, unit_category to ArmyListUnitRow type,
     category badge to unit row, and "Points by Category" breakdown to ArmyListSummaryBar
