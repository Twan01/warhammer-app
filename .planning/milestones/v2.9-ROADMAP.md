# v2.9 — Battle Intelligence 2.0

**Phases:** 54–57
**Status:** Planned
**Pre-requisite:** v2.8 complete (Game Day feeds battle log creation)

## Goal

Turn Battle Log into a learning and improvement system with per-unit performance tracking, analytics, and feedback loops.

## Phases

- [ ] Phase 54: Battle Report Enrichment — Add optional fields: deployment type, first turn (yes/no), primary/secondary scores, battle size, opponent archetype, key turning point, biggest mistake, best decision, rule forgotten, confidence/emotional rating (1–5), battle photo
- [ ] Phase 55: Unit Performance Tracking — Per-unit post-game evaluation for each unit in the army list: performance rating (1–5), role fulfilled (yes/partial/no), damage output, survivability, objective contribution, free-text notes, keep/change/drop recommendation
- [ ] Phase 56: Battle Analytics Dashboard — Win/loss/draw by own faction and opponent faction, win rate by army list, average score trends, most common MVP and underperformer units, recurring lessons and mistakes, best performing list archetypes
- [ ] Phase 57: Feedback Loop Integration — Battle log insights feed into: playbook notes (auto-suggest adding recurring lessons), game day reminders (surface forgotten rules/stratagems), list analysis (flag consistently underperforming units)

## Requirements

### Battle report upgrade

Optional fields: deployment type, first turn, primary/secondary score, battle size, opponent archetype, key turning point, biggest mistake, best decision, rule forgotten, photo, confidence/emotional rating.

### Unit performance

Per-unit post-game evaluation: performance rating, role fulfilled, damage output, survivability, objective contribution, notes, keep/change/drop.

### Analytics

Win/loss/draw by faction, win rate by list, win rate by opponent faction, average score, common MVP/underperformer units, recurring lessons/mistakes, best performing list archetypes.

### Feedback loop

Battle logs feed into: unit playbook, list analysis, game day reminders, future list suggestions. Example: if user repeatedly logs "forgot stratagem X", Game Day Mode surfaces it as a reminder.

## Key risks

- Per-unit evaluation adds friction to post-game logging — must be optional and fast
- Analytics need sufficient data to be meaningful — show useful output even with few games
- Feedback loop must suggest, never auto-modify playbook/list data

## Acceptance criteria

- Existing battle logs remain valid
- User can record richer battle reports
- Unit performance tracked over time
- Battle analytics visible
- Lessons can feed back into Playbook/Game Day reminders
