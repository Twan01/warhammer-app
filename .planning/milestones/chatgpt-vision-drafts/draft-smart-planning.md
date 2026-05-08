# v2.10 — Smart Planning / Next Best Action

**Phases:** 58–59
**Status:** Planned
**Pre-requisite:** v2.9 complete (needs battle intelligence data for recommendations)

## Goal

Make HobbyForge actively guide the user with explainable, rule-based recommendations.

## Phases

- [ ] Phase 58: Recommendation Engine — Rule-based engine combining: active projects, next planned game, army list readiness, missing units, painting progress, recipe paint availability, wishlist, spending, rules data freshness — produces prioritized action list
- [ ] Phase 59: Dashboard Integration — Top-3 recommended actions displayed on dashboard with explainable reasoning, click-through navigation to relevant object

## Requirements

### Recommendation engine

Combine: active projects, next planned game, army list readiness, missing units, painting progress, recipes, paint inventory, wishlist, spending, rules data freshness.

Example recommendations:
1. Paint Tau Fire Warriors to complete your 500pt list.
2. Buy White Scar — needed for 3 active recipes.
3. Update points for Crisis Battlesuits — last verified 3 months ago.
4. Log rules notes for your Commander before your first game.

### Prioritization logic

Prioritize actions that: unlock a playable list, prepare an upcoming game, reduce unpainted backlog, complete a current project, fix outdated rules/points, fill a tactical list gap.

## Key risks

- Recommendations must be explainable — no opaque scoring
- Engine must degrade gracefully when data is sparse (new user with few entries)
- Must not feel pushy — suggestions, not obligations

## Acceptance criteria

- Dashboard shows top 3 recommended actions
- Recommendations are explainable
- User can click into the relevant object
- Initial version is rule-based; no AI required
