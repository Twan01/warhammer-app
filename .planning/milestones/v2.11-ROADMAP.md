# v2.11 — Smart Wishlist / Budget Optimizer

**Phases:** 60–61
**Status:** Planned
**Pre-requisite:** v2.10 complete (recommendation engine informs purchase priority)

## Goal

Connect wishlist, list building, recipes, paint inventory, and spending into an actionable purchase planning system.

## Phases

- [ ] Phase 60: Wishlist 2.0 — Extend wishlist items with type (units / paints / tools / basing materials / books / storage), link items to recipes / army lists / units / projects / factions / tactical gaps, transparent priority score based on: needed for current list, needed for upcoming game, needed for active recipe, fills tactical gap, unlocks points target
- [ ] Phase 61: Spending Intelligence — Connect spending data to painting and readiness: cost per completed model, cost per battle-ready point, backlog value (spent but unpainted), painted vs unpainted value split, "next best purchase" recommendation combining priority score with cost

## Requirements

### Wishlist 2.0

Item types: units/models, paints, tools, basing materials, books/rules, storage/transport. Each item can link to: recipe, army list, unit, project, faction, missing paint, tactical gap.

### Priority score

Transparent score based on: needed for current army list, needed for upcoming game, needed for active recipe, fills tactical gap, unlocks points target, low cost, low painting workload, high hobby value.

### Spending intelligence

- Total spent by faction
- Spent but unpainted (backlog value)
- Cost per completed model
- Cost per battle-ready point
- Painted vs unpainted value split
- Next best purchase recommendation

## Key risks

- Priority scoring formula must be transparent and user-adjustable
- Spending intelligence must not feel judgmental — informative, not guilt-inducing

## Acceptance criteria

- Wishlist becomes actionable, not just a list
- User can see why an item is prioritized
- Spending connects to painting and army readiness
