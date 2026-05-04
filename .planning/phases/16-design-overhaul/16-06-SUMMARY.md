---
phase: 16-design-overhaul
plan: "06"
subsystem: empty-states
tags: [ui, empty-states, lucide, phase-16]
dependency_graph:
  requires: [16-01]
  provides: [empty-state-welcome-screen, empty-state-collection-two-mode, empty-state-kanban, empty-state-paints]
  affects: [DashboardPage, CollectionPage, PaintingProjectsPage, PaintsPage]
tech_stack:
  added: []
  patterns: [icon-in-container (rounded-xl bg-muted/40 p-4), welcome-screen (Sword + wordmark side-by-side)]
key_files:
  created: []
  modified:
    - src/features/dashboard/DashboardEmptyState.tsx
    - src/features/units/CollectionEmptyState.tsx
    - src/features/painting-projects/KanbanEmptyState.tsx
    - src/features/paints/PaintsEmptyState.tsx
    - tests/dashboard/DashboardPage.test.tsx
    - tests/collection/UnitTable.test.tsx
    - tests/painting/KanbanBoard.test.tsx
decisions:
  - "DashboardEmptyState is a full replacement (Pitfall 3): Sword + HobbyForge wordmark side-by-side, gap-6, text-faction-accent — NOT the standard icon-pill pattern"
  - "KanbanEmptyState keeps onAddProject prop wiring (fragile DOM query from PaintingProjectsPage) — only button text changed to 'Go to Collection' per UI-SPEC"
  - "CollectionEmptyState prop interface preserved byte-for-byte: onAdd (not onAddUnit) + onClearFilters — callers require no changes"
  - "Three test files updated to match new verbatim UI-SPEC copy (auto-fix Rule 1 — tests checking old strings)"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-04"
  tasks_completed: 3
  files_modified: 7
---

# Phase 16 Plan 06: Empty State Upgrades Summary

Four empty-state components upgraded to Phase 16 visual contract: DashboardEmptyState full welcome-screen replacement (Sword + HobbyForge wordmark) and three standard icon-in-container upgrades (CollectionEmptyState two-mode, KanbanEmptyState, PaintsEmptyState).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DashboardEmptyState welcome screen (Pitfall 3) | dcf9ea7 | DashboardEmptyState.tsx, DashboardPage.test.tsx |
| 2 | CollectionEmptyState two-mode upgrade (Pitfall 7) | 3f77c93 | CollectionEmptyState.tsx, UnitTable.test.tsx |
| 3 | KanbanEmptyState + PaintsEmptyState icon-in-container | 0917dbe | KanbanEmptyState.tsx, PaintsEmptyState.tsx, KanbanBoard.test.tsx |

## DashboardEmptyState — Full Replacement (Pitfall 3 Confirmation)

**Before:** PackageSearch h-12 w-12 bare icon, generic "Add units to your collection..." copy, "Go to Collection" button (no size).

**After:** Sword h-8 w-8 text-faction-accent + HobbyForge span text-3xl font-semibold tracking-tight side-by-side (flex items-center gap-3), "Your collection is empty" sub-headline, two-sentence helper verbatim from UI-SPEC, Button size="lg" "Add your first unit" navigating to /collection. Outer gap-6 py-16 — deliberately NOT the standard gap-3 icon-pill pattern.

**Pitfall 3 confirmed:** No bg-muted/40, no rounded-xl icon container. Structurally distinct from all other empty states.

## CollectionEmptyState — Both Modes (Pitfall 7 Confirmation)

**Before:** PackageSearch h-12 w-12 in both branches, generic copy ("Add your first unit" headline no-data, "No units found" filtered).

**After:**
- No-data: ShieldOff h-8 w-8 in rounded-xl bg-muted/40 p-4, "No units yet", "Add your first unit to start tracking what you own and how far along it is.", "Add unit" button (onClick={onAdd})
- Filtered: FilterX h-8 w-8 in rounded-xl bg-muted/40 p-4, "No units match", "Your current filters returned nothing. Clear a filter to see more units.", "Clear filters" button (onClick={onClearFilters})

**Pitfall 7 confirmed:** BOTH modes upgraded. Props interface preserved byte-for-byte (onAdd not onAddUnit, onClearFilters).

## KanbanEmptyState — Before/After

**Before:** Kanban h-12 w-12 bare icon, "No active projects", "Mark a unit as active project to see it here.", "Add project" button.

**After:** Layers h-8 w-8 in rounded-xl bg-muted/40 p-4, "No active projects" (unchanged), "Mark a unit as an active project from Collection to see it here." (verbatim UI-SPEC), "Go to Collection" button (onClick={onAddProject} — existing CTA wiring preserved per CONTEXT §Tech Debt).

**Props interface unchanged:** `export interface KanbanEmptyStateProps { onAddProject: () => void }` byte-for-byte identical.

## PaintsEmptyState — Before/After

**Before:** Droplets h-12 w-12 bare icon, "No paints yet", "Add paints to track your collection and link them to recipes.", "Add Paint" button.

**After:** Palette h-8 w-8 in rounded-xl bg-muted/40 p-4, "No paints yet" (unchanged), "Add the paints you own to link them to recipes and track what you're running low on." (verbatim UI-SPEC — "running low on" exact phrasing), "Add paint" button (onClick={onAdd}).

**Props interface unchanged:** `interface PaintsEmptyStateProps { onAdd: () => void }` byte-for-byte identical.

## Removals Confirmed

| File | PackageSearch | h-12 w-12 | Old icon |
|------|--------------|-----------|----------|
| DashboardEmptyState.tsx | Gone | Gone | PackageSearch gone |
| CollectionEmptyState.tsx | Gone | Gone | PackageSearch gone |
| KanbanEmptyState.tsx | N/A | Gone | Kanban gone |
| PaintsEmptyState.tsx | N/A | Gone | Droplets gone |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Three test files checked old empty-state copy**
- **Found during:** Tasks 1, 2, 3 — each task broke tests checking old strings
- **Files modified:** tests/dashboard/DashboardPage.test.tsx, tests/collection/UnitTable.test.tsx, tests/painting/KanbanBoard.test.tsx
- **Fix:** Updated all three test assertion strings to match new verbatim UI-SPEC copy
- **Commits:** dcf9ea7 (task 1), 3f77c93 (task 2), 0917dbe (task 3)

## Vitest Results

- Before: 299 passing (54 files), after task 1 regression: 297 passing / 2 failing, after all fixes: **299 passing / 0 failing (54 files)**
- TypeScript: `npx tsc --noEmit` exits 0 — no errors

## Self-Check: PASSED

Files exist:
- src/features/dashboard/DashboardEmptyState.tsx — FOUND
- src/features/units/CollectionEmptyState.tsx — FOUND
- src/features/painting-projects/KanbanEmptyState.tsx — FOUND
- src/features/paints/PaintsEmptyState.tsx — FOUND

Commits exist:
- dcf9ea7 — FOUND (DashboardEmptyState welcome screen)
- 3f77c93 — FOUND (CollectionEmptyState two-mode)
- 0917dbe — FOUND (KanbanEmptyState + PaintsEmptyState)
