# Phase 84: Data Layer + Early Tests - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 84-Data Layer + Early Tests
**Areas discussed:** Transaction scope, Navigation hook design, Cache invalidation strategy, Test organization
**Mode:** --auto (all decisions auto-selected)

---

## Transaction Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Step progress upsert + session insert (two writes) | Matches DL-01 exactly, follows saveRecipeGraph pattern | [auto] |
| Step progress only, session separate | Simpler but violates atomicity requirement | |

**Auto-selected:** Step progress upsert + session insert (recommended default)
**Notes:** DL-01 explicitly requires atomic step+session. The `bulkCreateAssignments` pattern provides the BEGIN/COMMIT template.

---

## Navigation Hook Design

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone hook composing existing hooks | Clean single-hook API, mirrors hook-per-concern pattern | [auto] |
| Extend useRecipeAssignments with navigation | Keeps file count down but bloats existing hook | |
| Inline in UI component | No reuse across phases | |

**Auto-selected:** Standalone hook in `src/hooks/usePaintingModeState.ts` (recommended default)
**Notes:** Phase 85-88 all consume this hook. Standalone keeps the API surface clean.

---

## Cache Invalidation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Specific key invalidation per surface | Precise, matches codebase pattern, avoids over-invalidation | [auto] |
| Broad prefix invalidation | Simpler but invalidates unrelated queries | |

**Auto-selected:** Specific key invalidation (recommended default)
**Notes:** Codebase uses explicit invalidation everywhere except `useBulkCreateAssignments`. Six specific keys identified from STATE.md architecture decisions.

---

## Test Organization

| Option | Description | Selected |
|--------|-------------|----------|
| New `tests/painting-mode/` directory | Mirrors planned `src/features/painting-mode/` | [auto] |
| Existing `tests/painting/` directory | Keeps painting-related tests together | |

**Auto-selected:** New `tests/painting-mode/` directory (recommended default)
**Notes:** Painting Mode is a distinct feature module; test directory should mirror source directory structure.

---

## Claude's Discretion

- Navigation state computation internals (prev/next/jumpTo pure-function approach)
- React performance patterns for derived state (useMemo/useCallback)

## Deferred Ideas

None — discussion stayed within phase scope.
