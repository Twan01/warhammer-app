# Feature Research

**Domain:** Warhammer hobby management — applied recipes, points import, list validation
**Researched:** 2026-05-12
**Milestone:** v0.2.10 Applied Recipes, Points Import & List Validation
**Confidence:** MEDIUM-HIGH (ecosystem research verified via multiple community tools; some UX patterns inferred from analogous domains due to niche specificity)

---

## Context: What Is Already Built (v0.2.9)

| Component | Current State |
|-----------|--------------|
| Recipe sections | `recipe_sections` with section_type, technique, execution_mode, applies_to (shipped v0.2.9) |
| Recipe steps | `recipe_steps` with painting_phase, tool, technique, dilution, time_estimate, step_photo_path, alt_paint_id, section_id FK |
| SectionedTimeline | Section headers with metadata badges, per-section step timelines |
| LogSessionSheet | Recipe → Section → Step cascade (section-aware, shipped v0.2.9) |
| KanbanCard | Section-aware next step via computeWorkflowPosition (shipped v0.2.9) |
| CurrentFocusCard | Section-aware next action guidance (shipped v0.2.9) |
| Army lists | Detachment selection, COALESCE points chain, inline rules context |
| Rules Hub | Stratagems/detachments/shared abilities browser, annotations |
| Game Day | CP tracker, phase-grouped stratagems, pre-game checklist |
| Points import design | Schema, versioning, deltas, COALESCE precedence documented (v0.2.8 Phase 52) |

The v0.2.9 anti-feature "Section progress tracking table — high complexity, defer to v0.3.0+" is now the primary AR feature for v0.2.10. It was explicitly deferred here, not an unknown scope.

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Per-unit recipe assignment | Painters ask "which recipe am I using for these marines?" immediately when viewing a unit. Pile of Potential, Figure Case, and PaintGolf all track per-unit status; recipe assignment is the next logical step | Low | Data model: `unit_recipe_assignments`. One active recipe per unit. Template steps never mutated by assignment |
| Per-unit step completion tracking | Recipe as checklist: tick each step as done. Community users already do this manually in Notion templates and Google Sheets. The hierarchy (section → step) makes this more granular than any competitor | Medium | Progress stored in `unit_recipe_step_progress`, keyed per assignment. Section-level rollup = completed_steps / total_steps. Template recipe is immutable |
| Progress visible on unit cards | "How far along is this unit?" expected on Collection cards, Kanban cards. Pile of Potential shows per-unit % complete; Figure Case shows stage progress. Users will feel progress is "missing" without this | Low-Med | Percentage bar (completed_steps / total_steps). Already have KanbanCard and UnitThumbnail components to extend |
| Applied recipe display in unit detail | When opening a unit's Sheet, the applied recipe and its checklist should be the primary painting view. Currently shows recipe name only (bidirectional nav shipped v0.2.4) | Medium | Checklist-like section/step view with tick boxes. Reuses SectionedTimeline as the base component |
| Points import with source attribution | Users need to record where points came from (Wahapedia CSV, manual entry) to know if the value is trustworthy. A number without provenance is meaningless | Low | `imported_unit_points` table: unit_id, points_value, source_name, source_version, imported_at. Already designed in v0.2.8 Phase 52 |
| Freshness indicator on points | Wahapedia updates within 15 minutes of GW changes; community tools (New Recruit) update within hours. A stale points value is worse than no value — it gives false confidence | Low | Badge: "Fresh (7d)" / "Stale (45d)". Threshold: 14–30 days appropriate for quarterly GW FAQ cadence. Inline icon + tooltip for rows; banner for high-stakes contexts |
| Points resolution chain (5-level COALESCE) | Users need to override individual loadout, unit cost, or imported value without losing the baseline. COALESCE hierarchy is the established pattern in the existing army list SQL | Medium | Chain: list override > loadout override > imported > unit default > NULL/unknown. Already designed v0.2.8 Phase 52, PI-05 requirement |
| Hard validation: points exceeded | "Am I over the limit?" is the most fundamental check. All army list tools (New Recruit, BattleScribe, 40kList) show this prominently | Low | Already surfaced in ArmyListSummaryBar; must now account for unknown points as a distinct state from 0 |
| Hard validation: unknown points | Units with no points value make the total meaningless. Silently treating null as 0 is a correctness bug. Must call this out | Low | Flag units where effective_points resolves to NULL with no known source. Show count of "unknown points" units in validation panel |
| Hard validation: stale points | If any unit's imported points exceed the staleness threshold, the list total is suspect. Surfacing this at the list level, not just the unit level | Low | Inline banner on ArmyListPage (pattern: existing StaleDataBanner from v0.2.8). Propagate to Game Day pre-game check |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Log Session completion of applied recipe steps | While logging a hobby session, mark which applied recipe steps were completed — no context switching. No competitor combines session logging + recipe step completion in one action. Brushrage gets close (per-step notes) but lacks the recipe template model | Medium | Extends existing LogSessionSheet. When session has recipe + section + step selected, show "Mark step complete on [unit]?" checkbox. Requires AR-03 data model |
| Bulk apply recipe to multiple units | Applying a recipe one-by-one to 30 marines is tedious. Bulk apply with independent per-unit progress is highly valued for army batch painters | Medium | Selection modal on Collection page. Creates N independent `unit_recipe_assignments` rows. Each gets its own progress tracking. First seen in community spreadsheets |
| Points delta detection post-import | After importing a new points file, show which units changed and by how much. Critical for players updating after GW FAQs (quarterly). No other personal hobby tool does this — New Recruit just shows current values | High | Requires prior snapshot. Delta: new_points - previous_points per unit. First import has no delta — expected and acceptable. Show delta as +3 / -5 badges next to freshness |
| Applied recipe preview before apply | Show the recipe's full section/step structure before committing the assignment. Reduces "I applied the wrong recipe" regret — important when bulk applying | Low | Read-only modal using existing SectionedTimeline. Confirmation step in the apply flow |
| Tactical role tags on units | User-defined tags (anti_tank, screening, objective_holder, character, fast_attack, etc.) that aggregate to list-level coverage gaps. HobbyForge is unique in tying this to painted/owned status — "you have 2 anti-tank units but neither is painted" | Medium | Tags stored in `unit_tactical_tags` or as a column. List-level aggregation is pure SQL COUNT GROUP BY tag. Vocabulary sourced from 10th edition community guides |
| Tactical role coverage panel | "My list has no anti-tank coverage" — list-level view showing role distribution, with painted/owned context. No competitor does this without requiring rules data | Medium | Summary: role → tagged unit count → painted count. Weakness: roles with 0 coverage. Descriptive only — never "rate" a list |
| Game Day pre-game health gate | Before playing, surface all pending warnings as a blocking checklist: stale points, unknown points, points exceeded, unbuilt units, unpainted units. No competitor integrates collection readiness with game-day launch | Medium | Extends existing GameDayPage pre-game checklist. Reads from validation summary. Non-blocking (user can dismiss and play) |

### Anti-Features (Commonly Requested, Often Problematic)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto-advancing painting status when all steps complete | Painting status (Not Started → Painted) is authoritative user state. Auto-advancing creates ghost updates users didn't intend — they may finish all recipe steps but still consider the model "in progress" for basing | Show a "Mark unit as Painted?" prompt when 100% recipe progress is reached. User decides |
| Shared step progress across units with the same recipe | "Tick once for all 10 marines" sounds useful but breaks individual tracking. Unit 3 may be at Step 7 while Unit 7 is at Step 2 | Always store progress per assignment row, never per template step |
| Points auto-sync / scheduled Wahapedia fetch | Would require network access, background jobs, and assumes Wahapedia is always reachable. Violates local-first constraint. Also: Wahapedia CSV has no unit name → unit_id mapping — manual mapping required | Manual import triggered by user. Freshness badge communicates when action is needed |
| Competitive optimization scoring | "Rate my list" or "this list is X% optimized" requires current meta knowledge that changes weekly and cannot be derived from user data alone. HobbyForge explicitly avoids competitive optimization | Tactical role coverage is descriptive: "0 units tagged anti_tank." Never prescriptive: "you need more anti-tank" |
| Rules-legal validation (slot limits, enhancement rules) | Requires current detachment rules that HobbyForge cannot legally distribute. New Recruit and BattleScribe own this space. HobbyForge's legal constraint is non-negotiable | Surface data-driven warnings only (points, ownership, freshness, readiness). Link to Rules Hub for detachment context. This boundary is explicit and shipped |
| Global "sync all unit points from Wahapedia" one-click | Wahapedia CSV has no stable unit_id column mapping directly to hobbyforge.db unit IDs. Auto-mapping is brittle, will misfire on renamed units | User-driven import with explicit field mapping per row. Same pattern as existing CSV import for rules sync |
| Points history timeline / full audit log | Interesting but high complexity. Users don't need a full changelog of every points change since app install | Points delta per import (last snapshot vs current) is sufficient. No full history |
| Prevent playing in Game Day if validation fails | A hobby app should never block its user from doing the hobby. Pre-game warnings are advisory | Non-blocking warning panel. User can acknowledge and proceed |

---

## Feature Dependencies

```
Applied Recipes (AR-01 through AR-07):
  AR-01 data model (unit_recipe_assignments + unit_recipe_step_progress)
    → AR-02 assignment UX (apply from collection/unit detail, preview before apply)
    → AR-03 per-unit step completion (tick steps, progress stored per assignment)
    → AR-04 applied recipe display (checklist view on unit, % progress on cards)
    → AR-05 Log Session integration (complete steps while logging — needs AR-03)
    → AR-06 Kanban/CurrentFocus progress (extend existing useWorkflowPositions — needs AR-03)
    → AR-07 bulk apply (UX extension of AR-02, independent progress per unit)

Points Import (PI-01 through PI-05):
  PI-01 data layer (imported_unit_points table)
    → PI-02 import pipeline (CSV/manual, validation, error logging)
    → PI-03 freshness tracking (badges, threshold-based stale detection)
    → PI-04 delta detection (snapshot before import, diff after — first import no delta)
    → PI-05 resolution chain (5-level COALESCE uses imported table as tier 3)

List Validation (LV-01 through LV-04):
  PI-01 (imported_unit_points) → LV-01 hard validation (unknown/stale/exceeded)
  LV-02 tactical tags (independent, can ship before or after PI work)
    → LV-03 role coverage (needs LV-02 data populated)
  LV-01 + LV-03 → LV-04 army list health UI panel

Game Day (GD-01):
  LV-01 + LV-04 → GD-01 pre-game warnings in GameDayPage

Cross-feature dependencies:
  AR-03 step completion data → AR-06 needs useWorkflowPositions hook extension
  PI-04 delta detection → first import gracefully returns no delta (not an error)
  LV-02 tactical tags → independent of all points features
  AR-05 Log Session → needs both AR-03 (data model) and existing LogSessionSheet structure
```

---

## Feature Prioritization Matrix

Ordered by impact vs complexity, with dependency order enforced:

| Priority | Feature | Rationale | Complexity |
|----------|---------|-----------|------------|
| 1 | Recipe workflow hardening (RH-01/02/03) | Unblocks AR features; migration stability and section reference stability | Low |
| 2 | Applied recipe data model (AR-01) | Foundation for all AR features. Schema + typed queries only, no UI | Low |
| 3 | Recipe assignment + preview UX (AR-02) | First user-visible AR feature; validates data model with real interaction | Medium |
| 4 | Per-unit step completion + display (AR-03/04) | Core value: recipe as actual checklist. Checklist UX on unit detail | Medium |
| 5 | Points data layer + import pipeline (PI-01/02) | Foundation for all validation. Mirrors existing bulk_sync_rules pattern | Medium-High |
| 6 | Points freshness + delta badges (PI-03/04) | High value add once data exists; relatively low implementation complexity | Low-Med |
| 7 | Points resolution chain (PI-05) | COALESCE SQL work; already designed in v0.2.8 Phase 52 | Medium |
| 8 | Hard validation warnings (LV-01) | Quick wins from PI-01 data; unknown/stale/exceeded flags | Low |
| 9 | Log Session applied recipe step completion (AR-05) | Differentiator; extends existing LogSessionSheet, needs AR-03 | Medium |
| 10 | Kanban/CurrentFocus applied recipe progress (AR-06) | Extends existing useWorkflowPositions hook; replaces implicit derivation | Medium |
| 11 | Bulk apply recipe (AR-07) | UX convenience; depends on AR-02 working cleanly | Medium |
| 12 | Tactical role tags (LV-02) | Independent; parallelizable with PI work | Low |
| 13 | Tactical role coverage panel (LV-03) | Depends on LV-02 having data; pure aggregation | Low |
| 14 | Army list health UI panel (LV-04) | Aggregates LV-01 + LV-03 into one panel | Medium |
| 15 | Game Day pre-game warnings (GD-01) | Capstone integration; depends on LV-04 | Low |

**MVP boundary:** Items 1–8 form the solid core (hardening + AR data model + assignment UX + checklist + points layer). Items 9–15 are the enrichment layer. GD-01 is a low-complexity capstone that can ship with the enrichment layer.

---

## Ecosystem Observations

### Applied Recipes as Painting Plans

Community tools (Figure Case, PaintGolf, Brushrage, Pile of Potential) track per-unit progress as a percentage or coarse status (Not Started / In Progress / Done). None use a step-level checklist model — they use status buckets. HobbyForge's section/step model is a genuine differentiator: it provides "what is the next concrete step?" rather than just a status.

Pile of Potential is the closest analog: it shows per-unit points value alongside painting status, confirming users expect painting progress and points together in the same view. The v0.2.10 AR + PI combination maps directly to this expectation.

Brushrage captures per-step paint notes and session timing. HobbyForge already does session timing; linking session completion to applied recipe steps is the natural extension and covers ground no competitor has.

The v0.2.9 decision to defer "explicit step-by-step completion checkboxes" was correct at the time — the section metadata and session cascade needed to ship first. v0.2.10's AR features now build on that stable foundation rather than bolting progress tracking onto unstructured sections.

### Points Import Freshness

Wahapedia updates within 15 minutes of any rule correction. New Recruit is updated within hours of GW releases. The "stale" threshold in the Warhammer context is measured in days to weeks, not months — most GW FAQs are quarterly, making 14–30 days a sensible default.

The PatternFly stale data pattern confirms: inline icon + tooltip for compact row-level display; banner/callout for high-stakes contexts (army list summary page, Game Day). HobbyForge already uses StaleDataBanner (shipped v0.2.8) — the same component applies to points freshness.

### Army List Validation

Ecosystem tools (New Recruit, BattleScribe, 40kList) focus entirely on rules-legal validation: slot limits, enhancement restrictions, detachment rules. HobbyForge explicitly cannot do this. The uncovered gap is "is this list playable with what I own and have painted?" — New Recruit partially covers ownership but does not combine freshness, painting readiness, and tactical coverage.

10th edition tactical role vocabulary from the community: anti-tank, anti-infantry, objective holder (tied to OC stat already in unit stats block from v0.2.0), screening, character/support, and mobility. These map well to user-defined tags. OC is already captured; the other roles are player judgment, not algorithmic detection — user-defined tags are the correct model.

---

## Sources

- [Figure Case - App Store](https://apps.apple.com/us/app/figure-case-hobby-progress/id1487460834) — per-unit stage tracking, wishlist/assembled/primed/painted stages (MEDIUM confidence)
- [Pile of Potential - Bolter and Chainsword](https://bolterandchainsword.com/topic/379121-pile-of-potential-the-best-painting-tracker-ive-found/) — per-unit points + painting status in one view (MEDIUM)
- [Brushrage - Google Play](https://play.google.com/store/apps/details?id=de.game_coding.trackmytime&hl=en_US) — per-step paint notes + session time tracking (MEDIUM)
- [PaintGolf](https://paint-golf.com/) — acquisition-to-completion tracking with analytics (MEDIUM)
- [Wahapedia Data Export](https://wahapedia.ru/wh40k10ed/the-rules/data-export/) — CSV export format, 15-minute update cadence (HIGH)
- [New Recruit](https://www.newrecruit.eu/) — owned model validation, painting status, community-maintained points freshness (HIGH)
- [PatternFly Stale Data Warning](https://www.patternfly.org/component-groups/status-and-state-indicators/stale-data-warning/) — inline icon vs banner UX pattern (HIGH)
- [How to Build a Balanced 40k Army List - grimslate](https://grimslate.com/blog/how-to-build-2000-point-army-list) — tactical role vocabulary (MEDIUM)
- [Warhammer 40k Tactica - Analysing Army Lists](https://www.warhammer-community.com/en-gb/articles/kgaibzwo/warhammer-40000-tactica-analysing-your-army-lists/) — official GW community list analysis guidance (HIGH)
- [BSData/wh40k-10e GitHub](https://github.com/BSData/wh40k-10e) — community data maintenance model, CSV/XML update patterns (HIGH)
- Existing codebase and PROJECT.md (HIGH confidence — direct reading of shipped code and design decisions)
