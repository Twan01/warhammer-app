---
phase: 43-extended-rules-read-layer
plan: "02"
subsystem: rules-ui
tags: [playbooktab, stratagems, detachments, abilities, react-query, tdd]
dependency_graph:
  requires: ["43-01"]
  provides: ["SCHEMA-01", "SCHEMA-02", "SCHEMA-03", "SCHEMA-04"]
  affects: ["src/features/units/PlaybookTab.tsx"]
tech_stack:
  added: []
  patterns:
    - "DetachmentSection sub-component pattern to resolve hooks-in-loop (React hook rule)"
    - "stratagemsByPhase useMemo with Map for grouping by phase field"
    - "ExtendedAbilityEntry structural-typed sub-component (avoids widening existing AbilityEntry)"
key_files:
  created: []
  modified:
    - src/features/units/PlaybookTab.tsx
    - tests/collection/PlaybookTab.test.tsx
decisions:
  - "DetachmentSection as proper React component so useDetachmentAbilitiesByDetachment is called unconditionally — no hooks-in-loop violation"
  - "ExtendedAbilityEntry typed structurally { name, description } rather than widening RwDatasheetAbility — avoids coupling two unrelated data types"
  - "Mock declarations use vi.fn() with explicit typed parameters to avoid TypeScript spread type errors"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_modified: 2
requirements_completed: [SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04]
---

# Phase 43 Plan 02: Extended Rules UI Integration Summary

**One-liner:** PlaybookTab gains three collapsible sections (Stratagems grouped by phase, Detachments with nested abilities, Shared Faction Abilities) wired to useRulesExtended hooks from Plan 01.

## What Was Built

Extended PlaybookTab.tsx with four new data display sections covering SCHEMA-01 through SCHEMA-04. Each section is collapsible (defaultOpen), conditionally rendered when data exists, and hidden when the faction has no matching rules data or wahapediaFactionId is null.

### New Sections (insertion point: after Datasheet Abilities/Sources, before TierManager)

1. **Stratagems** (SCHEMA-01) — grouped by `phase` field using `stratagemsByPhase` useMemo (Map). Each stratagem shows name, CP cost badge, type, turn restriction, and description via `StratagemEntry` sub-component.

2. **Detachments** (SCHEMA-02 + SCHEMA-03) — flat list via `DetachmentSection` sub-component. Each `DetachmentSection` calls `useDetachmentAbilitiesByDetachment(detachment.id)` unconditionally (proper component, no hooks-in-loop violation). Abilities nested under their parent detachment via `ExtendedAbilityEntry`.

3. **Shared Faction Abilities** (SCHEMA-04) — flat list rendered via `ExtendedAbilityEntry`.

### New Sub-components

- `StratagemEntry` — stratagem card with CP cost + type inline badges
- `DetachmentSection` — per-detachment component; resolves hooks-in-loop architectural constraint
- `ExtendedAbilityEntry` — generic name/description entry with left-border styling

### Test Coverage Added

9 new test cases in PlaybookTab.test.tsx covering:
- SCHEMA-01: renders heading, name, CP cost, phase group header, description; hides when empty
- SCHEMA-02: renders heading, name, legend; hides when empty
- SCHEMA-03: nested ability rendered under parent detachment
- SCHEMA-04: renders heading, name, description; hides when empty
- Combined absence: none of the 3 headings appear when all hooks return empty arrays

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed TypeScript spread type error in mock declarations**
- **Found during:** pnpm build type check after GREEN phase
- **Issue:** `vi.fn(() => ({ data: [] }))` infers `never[]`; spread `...args: unknown[]` not allowed by TypeScript strict mode
- **Fix:** Changed mock declarations to `vi.fn()` with typed parameters `(factionId: string | undefined)` in the vi.mock factory
- **Files modified:** tests/collection/PlaybookTab.test.tsx
- **Commit:** 8d74202 (included in same task commit)

## Self-Check: PASSED

- `src/features/units/PlaybookTab.tsx` — file exists and contains `StratagemEntry`, `DetachmentSection`, `ExtendedAbilityEntry`, `useRulesExtended` imports
- `tests/collection/PlaybookTab.test.tsx` — file exists and contains `vi.mock("@/hooks/useRulesExtended"`, SCHEMA-01..04 describe blocks
- Commit `8d74202` — confirmed in git log
- pnpm test: 971 passed
- pnpm build: success (no type errors)
