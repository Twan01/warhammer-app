---
quick_id: 260615-bfw
slug: recipe-checklist-step-details
date: 2026-06-15
status: complete
commit: 90889d1a
---

# Summary: Show full step detail in the recipe tick-off checklist

## What changed

The applied-recipe checklist (collection → unit → Recipes → apply → tick boxes)
now shows full painting detail per step, not just the step name.

- **New** `src/features/recipes/ChecklistStepRow.tsx` — a compact, expandable
  step row. Collapsed it shows the checkbox + name (+ a chevron). Expanded it
  reveals the primary paint swatch + name/brand/type + owned dot, an optional
  alternate paint, technique/tool/dilution/time/phase (via the reused
  painting-mode `StepMetadataRow`), and notes. Steps with no extra detail render
  as a plain name row (no chevron) — unchanged behaviour.
- **Modified** `src/features/recipes/AssignmentChecklist.tsx` — added
  `usePaints()` + a `paintsById` map to resolve `paint_id`/`alt_paint_id` to
  swatch/name, and replaced the three duplicated name-only render blocks (orphan
  steps, sectioned steps, flat list) with `<ChecklistStepRow />`.

## Decisions

- Full detail (no reference photo), expandable per step — per user.

## Root cause

Pure display gap. The data was always there — `recipe_steps` stores paint,
technique, tool, dilution, time, phase and notes; the editor captures them and
Painting Mode shows them. Only this checklist ignored everything but the name.
No schema or query changes were needed.

## Verification

- `npx tsc --noEmit` — passes.
- No existing tests for the component (display-only change).

## Notes / follow-ups

- The richer **Painting Mode** ("Start Painting") already shows all of this plus
  the reference photo, one focused step at a time — worth using for an actual
  painting session.
