# Phase 87: Session Integration + Entry Points - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 87-Session Integration + Entry Points
**Areas discussed:** Session Logger UX, Button Placement, Entry Point Navigation, Empty/Missing Recipe State
**Mode:** --auto (all decisions auto-selected)

---

## Session Logger UX

| Option | Description | Selected |
|--------|-------------|----------|
| Sheet/drawer sliding up | Reuses existing Sheet pattern, consistent with app conventions | ✓ |
| Inline form in StepFocalView | Embeds fields directly in the step view | |
| Modal dialog | Centered overlay blocking the view | |

**Auto-selected:** Sheet/drawer (recommended default)
**Rationale:** LogSessionSheet.tsx already exists as a reference. Sheet pattern used throughout the app for forms. Prefilled from painting context makes the interaction fast.

---

## Mark Done vs Done + Log Button Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Primary "Mark Done" + secondary "Done + Log" | Fast path for quick completion, session logging as opt-in | ✓ |
| Single "Done" button with toggle for session logging | Simpler but hides the session option | |
| Always log session (no standalone mark done) | Violates SL-03 requirement | |

**Auto-selected:** Primary + secondary buttons (recommended default)
**Rationale:** SL-03 requires standalone mark-done. Most common action should be fastest. Session logging is valuable but optional per-step.

---

## Entry Point Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Each surface passes its known assignment ID | Cards/panels already have the data, just need a link | ✓ |
| Central "find assignment" function | Adds indirection, surfaces already know the ID | |

**Auto-selected:** Direct assignment ID passing (recommended default)
**Rationale:** All six entry points already query data that includes assignment IDs. No need for a lookup layer.

---

## Empty/Missing Recipe State

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly empty state with CTA to apply recipe | Standard pattern, explains what to do | ✓ |
| Redirect to unit detail automatically | Disorienting, user doesn't know why they were redirected | |
| Error page | Too harsh for a normal state | |

**Auto-selected:** Friendly empty state with CTA (recommended default)
**Rationale:** EP-06 requires explaining what to do next. Entry points should hide the link when no recipe exists (D-14), so this is a safety net.

---

## Claude's Discretion

- Button styling, icon choices, micro-copy for entry point CTAs
- Split button vs two separate buttons for mark-done actions
- Session logger sheet field order and hint text

## Deferred Ideas

None — discussion stayed within phase scope
