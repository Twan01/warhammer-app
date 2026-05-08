# v2.8 — Game Day Mode

**Phases:** 51–53
**Status:** Planned
**Pre-requisite:** v2.7 complete (needs ruleset-aware lists for readiness and unit data)

## Goal

Help the user prepare and play actual games, especially as a beginner — from packing to phase-by-phase reminders to post-game reflection.

## Phases

- [ ] Phase 51: Game Day Foundation — Game day data model and dedicated page/sheet, linked to army list, overview section with opponent, mission, points, date, and readiness summary
- [ ] Phase 52: Checklists & Reminders — Packing checklist (models, dice, tape measure, tokens, rules source, transport case), phase-by-phase game reminders (command / movement / shooting / charge / fight / scoring), per-unit ability and weapon reminders surfaced from playbook
- [ ] Phase 53: Stratagem & Beginner Mode — Stratagem and detachment ability reminders grouped by game phase with CP cost and personal notes; beginner mode with simplified reminders, "what to check before turn 1", per-round checklist, and post-game reflection questions

## Requirements

### Game Day sections

1. **Overview** — Selected list, opponent, mission, points, date, readiness
2. **Packing checklist** — Models, dice, tape measure, objective markers, tokens, rules source, printed list, glue/repair kit, transport case
3. **Phase reminders** — Command, movement, shooting, charge, fight, scoring/end phase
4. **Unit reminders** — Key abilities, weapons to remember, once-per-game rules, synergies, mistakes to avoid
5. **Stratagem & detachment reminders** — Grouped by phase, CP cost, personal notes
6. **Beginner mode** — Simplified reminders, pre-turn-1 checklist, per-round checklist, post-game questions

## Key risks

- Stratagem/detachment data depends on v0.2.6 sync extension completeness
- Beginner mode must be genuinely helpful, not overwhelming — UX critical
- Printable/exportable format needed for offline use at game table

## Acceptance criteria

- User can create a Game Day prep sheet from an existing army list
- Game Day Mode shows readiness warnings
- Surfaces user notes and imported reminders
- Includes a packing checklist
- Beginner-friendly and not overwhelming
- Can be printed/exported later
