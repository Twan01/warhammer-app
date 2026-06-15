---
quick_id: 260615-bfw
slug: recipe-checklist-step-details
date: 2026-06-15
type: quick
---

# Quick Task: Show full step detail in the recipe tick-off checklist

## Problem

From collection → open a unit → Recipes → apply a recipe, the tick-off checklist
(`AssignmentChecklist.tsx`) renders **only `step.step_name`** (e.g. "Dry brush"),
so the user can't actually paint from it — no colour, technique, tool, etc.

## Root cause (investigated)

The data is NOT missing. Each `recipe_steps` row already stores `paint_id`,
`alt_paint_id`, `technique`, `tool`, `dilution`, `time_estimate_minutes`,
`painting_phase`, and `notes`. The recipe editor captures them and Painting Mode
(`StepFocalView`) displays them. Only the inline `AssignmentChecklist` ignores
everything except the step name. This is a pure display gap — no schema or query
change required.

## Decisions (from user)

- **Detail level:** Full detail — paint swatch + name/brand, technique, tool,
  dilution, time estimate, notes (no reference photo).
- **Layout:** Expandable per step — each row stays compact (name only) and
  expands on tap to reveal detail.

## Approach

1. New component `src/features/recipes/ChecklistStepRow.tsx`
   - Wraps checkbox + name + expand chevron in a shadcn `Collapsible`.
   - Collapsible content shows: primary paint swatch + name/brand/type + owned
     dot, optional alt paint, `StepMetadataRow` (reused from painting-mode for
     technique/tool/dilution/time/phase), and notes.
   - Only shows the chevron / collapsible when the step actually has extra detail
     (otherwise renders a plain name row, unchanged behaviour).
2. `AssignmentChecklist.tsx`
   - Pull paints via `usePaints()` and build a `Map<id, Paint>` for swatch/name
     lookup (steps store only `paint_id`).
   - Replace the three duplicated name-only render blocks (orphan steps,
     sectioned steps, flat list) with `<ChecklistStepRow />`.

## Verification

- `pnpm build` (tsc) passes.
- Checklist rows expand to reveal paint + technique + tool + dilution + time +
  notes; rows with no detail stay name-only.

## Out of scope

- Schema/query changes (none needed).
- Painting Mode changes (already complete).
- Reference photo in the checklist (user chose detail without photo).
