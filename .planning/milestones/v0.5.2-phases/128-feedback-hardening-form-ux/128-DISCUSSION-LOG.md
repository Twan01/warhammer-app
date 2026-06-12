# Phase 128: Feedback Hardening & Form UX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 128-Feedback Hardening & Form UX
**Areas discussed:** Delete dialog pending text, GameDay error state, Sheet autoFocus scope, RuleNoteEditor save indicator, PlaybookTab disabled tooltip, staleTime/gcTime alignment
**Mode:** --auto (all decisions auto-selected)

---

## Delete Dialog Pending Text (FBK-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Replace button text | `{isPending ? "Deleting..." : "Delete"}` matching GoalDeleteDialog | ✓ |
| Add spinner icon | Show loading spinner alongside text | |

**Auto-selected:** Replace button text (recommended — matches existing GoalDeleteDialog pattern)

---

## GameDay Error State (FBK-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Centered error block | AlertCircle + heading + "Try again" button | ✓ |
| Inline banner | Alert banner at top of page | |

**Auto-selected:** Centered error block (recommended — matches RecipesPage error pattern from Phase 126)

---

## Sheet Form autoFocus Scope (FBK-04)

| Option | Description | Selected |
|--------|-------------|----------|
| All Sheet forms | autoFocus on first text input in every Sheet | ✓ |
| Only create forms | Only add autoFocus when creating, not editing | |

**Auto-selected:** All Sheet forms (recommended — consistent behavior regardless of create/edit)

---

## RuleNoteEditor Save Indicator (FBK-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Inline "Saved" text | Subtle text-xs indicator that fades after ~2s | ✓ |
| Toast notification | toast.success() after each save | |

**Auto-selected:** Inline "Saved" text (recommended — toast too noisy for auto-save on every keystroke)

---

## PlaybookTab Disabled Save Tooltip (FBK-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Context-aware tooltip | "No changes to save" / "Loading..." depending on state | ✓ |
| Generic tooltip | "Save is disabled" regardless of reason | |

**Auto-selected:** Context-aware tooltip (recommended — explains why vs generic message)

---

## staleTime/gcTime Alignment Scope (FBK-10)

| Option | Description | Selected |
|--------|-------------|----------|
| All staleTime: Infinity hooks | Mechanical grep-and-add gcTime: Infinity | ✓ |
| Only data-heavy hooks | Only add to hooks with large payloads | |

**Auto-selected:** All staleTime: Infinity hooks (recommended — consistent behavior, prevents silent cache eviction)

---

## Claude's Discretion

- Exact autoFocus target in each Sheet (first text input)
- RuleNoteEditor fade implementation (CSS transition vs setTimeout)
- Plan grouping strategy
- Discovery of additional Sheet forms needing autoFocus

## Deferred Ideas

None — all discussion stayed within phase scope.
