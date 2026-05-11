---
phase: 55-playbook-enhancements-favorites-and-notes
plan: "01"
subsystem: rules-hub
tags: [annotations, favorites, notes, rules-hub, components]
dependency_graph:
  requires: [52-03]
  provides: [RuleAnnotationControls, RuleNoteEditor, annotated-stratagem-card, annotated-shared-ability-card, annotated-detachment-card]
  affects: [rules-hub, army-lists]
tech_stack:
  added: []
  patterns: [debounced-auto-save, Map-lookup-over-N+1-hooks, sub-component-to-avoid-hooks-in-loop, annotation-styling-with-border-l-primary]
key_files:
  created:
    - src/features/rules-hub/RuleAnnotationControls.tsx
    - src/features/rules-hub/RuleNoteEditor.tsx
    - tests/rules-hub/RuleAnnotationControls.test.tsx
    - tests/rules-hub/RuleNoteEditor.test.tsx
    - tests/rules-hub/StratagemCard.test.tsx
  modified:
    - src/features/rules-hub/StratagemCard.tsx
    - src/features/rules-hub/DetachmentCard.tsx
    - src/features/rules-hub/SharedAbilityCard.tsx
    - src/features/rules-hub/RulesHubPage.tsx
    - src/features/army-lists/DetachmentRulesSection.tsx
    - tests/rules-hub/SharedAbilityCard.test.tsx
    - tests/rules-hub/DetachmentCard.test.tsx
    - tests/rules-hub/RulesHubPage.test.tsx
decisions:
  - DetachmentAbilityRow sub-component used inside DetachmentCard.map() to satisfy Rules of Hooks (same pattern as 53-03 DetachmentCard)
  - DetachmentRulesSection passes favorite=null note=null — no annotation context in the army list detail sheet (out of scope for this plan)
  - RuleNoteEditor debounce tests use fireEvent.change + vi.advanceTimersByTime(500) instead of userEvent (avoids async timing issues with fake timers)
metrics:
  duration_minutes: 24
  completed_date: "2026-05-11"
  tasks_completed: 2
  files_changed: 13
---

# Phase 55 Plan 01: RuleAnnotationControls, RuleNoteEditor, and Card Wiring Summary

Shared star/flag/note annotation components built and wired into all three RulesHubPage card types with page-level Map lookup pattern.

## What Was Built

**RuleAnnotationControls** — Pure presentational component with star (favorite), flag (reminder), and StickyNote (note indicator) icons. Each button uses `e.stopPropagation()` inside the component as defense-in-depth. Star fills yellow when favorited, flag fills blue when is_reminder=1.

**RuleNoteEditor** — Debounced (500ms) auto-save textarea wired to `useUpsertRulesNote`. Uses `useRef` for timer tracking and `useEffect` cleanup to prevent memory leaks. Renders "Your Notes" label with Separator.

**Card integration:**
- `StratagemCard` — new `favorite: RulesFavorite | null` and `note: RulesNote | null` props; annotation styling (`border-l-2 border-l-primary bg-primary/5`) when annotated; RuleAnnotationControls in trigger row; RuleNoteEditor in CollapsibleContent.
- `SharedAbilityCard` — same pattern with `rule_type = 'shared_ability'`.
- `DetachmentCard` — per-ability `DetachmentAbilityRow` sub-component (avoids hooks-in-loop); `favoritesMap`/`notesMap` Map props propagate annotation state; `hasAnyAnnotation` drives card-level border styling.
- `RulesHubPage` — single `useRulesFavorites()` + `useRulesNotes()` call at page level; two `useMemo` Maps built once and passed down as props (no N+1 hooks pattern).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DetachmentRulesSection used old StratagemCard signature**
- Found during: Task 2 (pnpm build)
- Issue: `DetachmentRulesSection.tsx` rendered `<StratagemCard stratagem={s} />` without the new required `favorite` and `note` props
- Fix: Added `favorite={null} note={null}` — no annotation data context in the army list sheet
- Files modified: `src/features/army-lists/DetachmentRulesSection.tsx`
- Commit: 9d8e4a5

**2. [Rule 2 - Missing] RulesHubPage test lacked hooks mocks**
- Found during: Task 2 (test run)
- Issue: Existing RulesHubPage test would fail because `useRulesFavorites` and `useRulesNotes` were now called inside the component
- Fix: Added `vi.mock` for both hooks in the test file
- Files modified: `tests/rules-hub/RulesHubPage.test.tsx`
- Commit: 9d8e4a5

**3. [Rule 1 - Bug] RwStratagem mock object missing required fields**
- Found during: Task 2 (pnpm build TypeScript check)
- Issue: StratagemCard test used a mock missing `legend`, `detachment`, `detachment_id` fields on `RwStratagem`
- Fix: Added the three missing nullable fields to the mock object
- Files modified: `tests/rules-hub/StratagemCard.test.tsx`
- Commit: 9d8e4a5

## Self-Check: PASSED

Files created:
- src/features/rules-hub/RuleAnnotationControls.tsx: FOUND
- src/features/rules-hub/RuleNoteEditor.tsx: FOUND
- tests/rules-hub/StratagemCard.test.tsx: FOUND

Commits:
- 6ad9c4b: feat(55-01): add RuleAnnotationControls and RuleNoteEditor shared components
- 9d8e4a5: feat(55-01): wire annotation controls into all RulesHubPage card types
