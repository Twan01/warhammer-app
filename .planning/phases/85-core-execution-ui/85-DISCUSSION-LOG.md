# Phase 85: Core Execution UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 85-Core Execution UI
**Areas discussed:** Layout Architecture, Step Detail Presentation, Section Navigator Design, Paint Readiness Warning UX, Step Completion + Transition
**Mode:** --auto (all decisions auto-selected)

---

## Layout Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Split-panel | Persistent left sidebar for section nav, right main for step focal view | ✓ |
| Single-panel + collapsible | One column with collapsible section navigator | |
| Tabbed sections | Tabs for sections, step list below | |

**User's choice:** [auto] Split-panel (recommended default)
**Notes:** Mirrors Game Day's structured layout. Section list always visible satisfies SP-01/SP-02/SP-03 without extra interaction.

---

## Step Detail Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Hero card | Large paint swatch + metadata row + photo below, scaled for desk | ✓ |
| Compact card | Smaller card with inline photo thumbnail | |
| Timeline node | Reuse RecipeStepTimeline node style at larger scale | |

**User's choice:** [auto] Hero card layout (recommended default)
**Notes:** Follows RecipeStepTimeline metadata pattern scaled up for PX-01 desk-distance readability.

---

## Section Navigator Design

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent sidebar list | Always visible, section names + counts, expandable step sub-items | ✓ |
| Accordion | Collapsible sections, one open at a time | |
| Horizontal tabs | Tab per section along the top | |

**User's choice:** [auto] Persistent sidebar list (recommended default)
**Notes:** SP-01 needs counts always visible, SP-02 needs highlight, SP-03 needs jump-to. Persistent list satisfies all three.

---

## Paint Readiness Warning UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dismissible banner | Non-blocking banner at top, lists missing paints, dismiss button | ✓ |
| Entry dialog | Modal at mode entry showing readiness summary | |
| Inline per-step | Warning icon on each step that uses a missing paint | |

**User's choice:** [auto] Dismissible banner (recommended default)
**Notes:** PR-01 says "at entry", PR-02 says "non-blocking". Banner satisfies both without interrupting flow.

---

## Step Completion + Transition

| Option | Description | Selected |
|--------|-------------|----------|
| Instant swap | Immediate swap to next step, checkmark flash in section nav | ✓ |
| Slide animation | Slide-left transition to next step | |
| Fade + delay | Brief fade with completion celebration | |

**User's choice:** [auto] Instant swap (recommended default)
**Notes:** At the painting desk, speed matters more than animation. Section nav badge update provides sufficient feedback.

---

## Claude's Discretion

- Exact spacing/font sizes for larger typography
- Collapsible vs always-expanded section navigator
- Paint swatch rendering (CSS vs SVG)
- Loading state presentation

## Deferred Ideas

None — discussion stayed within phase scope.
