---
slug: collection-delete-freeze
status: resolved
trigger: user-reported
created: 2026-06-10
resolved: 2026-06-10
---

# Debug: Collection page freezes after deleting a unit

## Symptoms
- User deletes a unit from the collection page
- The UnitDetailSheet (side panel) cannot be closed — clicking X does nothing
- App appears frozen / unresponsive in that area

## Root Cause

**Race condition in `handleCloseDelete` (CollectionPage.tsx lines 165-172)**

The handler checked `selectedUnit` (a derived/memoized value from React Query data) to decide whether to close the detail sheet. However, by the time `handleCloseDelete` runs:

1. `deleteUnit.mutateAsync()` has already completed
2. React Query `onSuccess` has invalidated and refetched the units list
3. The deleted unit is gone from the cache
4. `selectedUnit` (derived via `useMemo` from `units.find(...)`) is already `null`
5. The condition `if (selectedUnit && deletingUnit && ...)` evaluates to FALSE
6. `setSelectedUnitId(null)` is never called
7. The detail sheet stays open (`open={selectedUnitId !== null}` remains true) with `unit={null}`
8. The `key` prop changes to `"none-detail"` causing a remount of an open-but-empty sheet

The empty sheet with no content renders without proper interactive elements, making it appear frozen.

## Evidence
- timestamp: 2026-06-10 — Code analysis confirms `selectedUnit` depends on `units` array from React Query
- timestamp: 2026-06-10 — `useDeleteUnit` onSuccess invalidates `UNITS_ENRICHED_KEY` before dialog's `onClose` fires
- timestamp: 2026-06-10 — TypeScript check passes after fix

## Resolution

**Fix:** Changed `handleCloseDelete` to compare `selectedUnitId` (stable state value) against `deletingUnit.id` instead of relying on the derived `selectedUnit` which becomes stale after cache invalidation.

**File:** `src/features/units/CollectionPage.tsx`

Before:
```typescript
if (selectedUnit && deletingUnit && selectedUnit.id === deletingUnit.id) {
  setSelectedUnitId(null);
}
```

After:
```typescript
if (deletingUnit && selectedUnitId === deletingUnit.id) {
  setSelectedUnitId(null);
}
```

Also moved `setDeletingUnit(null)` after the check to avoid nullifying the reference before it's used.
