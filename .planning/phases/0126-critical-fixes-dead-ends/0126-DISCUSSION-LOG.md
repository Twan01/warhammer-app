# Phase 126: Critical Fixes & Dead Ends - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 126-Critical Fixes & Dead Ends
**Areas discussed:** Painting Mode exit UX, Toast discipline, Error state pattern, Scrollbar approach
**Mode:** --auto (all areas auto-selected and auto-resolved)

---

## Painting Mode Exit UX

| Option | Description | Selected |
|--------|-------------|----------|
| Button + Escape hint | Add exit Button + "Press Escape to exit" text on completion/error screens | auto |
| Escape only | Rely on existing Escape binding, add hint text only | |
| Auto-redirect | Auto-navigate away after 3s delay | |

**Auto-selected:** Button + Escape hint (recommended default)
**Notes:** Matches existing navigation patterns. handleExit already exists in page.tsx — just needs UI surface. Both completion and error screens get the same treatment.

---

## Toast Discipline

| Option | Description | Selected |
|--------|-------------|----------|
| Remove no-op, add success toasts | Remove false-positive toast on unchanged notes; add success toast to all mutations with error toasts | auto |
| Keep no-op as confirmation | Treat unchanged-save toast as user reassurance | |

**Auto-selected:** Remove no-op, add success toasts (recommended default)
**Notes:** Silent no-op is correct UX — toasting success for zero work is misleading. Every mutation that catches errors should also confirm success.

---

## Error State Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Centered icon + message + retry | AlertCircle icon, heading, description, retry Button — matches empty-state layout | auto |
| Inline banner | Alert banner at top of page with retry link | |

**Auto-selected:** Centered icon + message + retry (recommended default)
**Notes:** Consistent with existing centered empty-state patterns. Only used in RecipesPage for now; if 3+ uses emerge, extract to shared component.

---

## Scrollbar Approach

| Option | Description | Selected |
|--------|-------------|----------|
| CSS-only in globals.css | ::-webkit-scrollbar rules scoped under .dark, zinc colors, 6px width | auto |
| Component-level ScrollArea styling | Modify scroll-area.tsx with conditional dark-mode classes | |

**Auto-selected:** CSS-only in globals.css (recommended default)
**Notes:** Global CSS is simpler and covers all scrollable areas including non-ScrollArea elements. No per-component changes needed.

---

## Claude's Discretion

- Exact toast message wording (follow existing "X completed." pattern)
- Whether to inline or extract error state component (inline for now)
- Light-mode token oklch values (reasonable defaults for readability)

## Deferred Ideas

None — discussion stayed within phase scope.
