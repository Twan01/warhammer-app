# Phase 134: No Dead Ends - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 134-no-dead-ends
**Mode:** `--auto` (gray areas auto-selected; recommended option auto-chosen per question)
**Areas discussed:** Shared Abilities data source, Link-unit dead-end fix, Component reuse & no-new-migration guardrail

---

## Shared Abilities tab — data source (HON-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Real hook over already-imported faction-scoped `udb_detachment_abilities` (`getDetachmentAbilitiesByFaction`), rendered via existing `SharedAbilityCard` | Real canonical data, zero new schema/import | ✓ |
| Import a dedicated faction army-rule source via a new migration/pipeline | More literal "army rules" but adds a migration (re-fires parity gate, reserved for Phase 137) | |
| Derive faction-shared abilities synthetically from `udb_unit_abilities` | Fuzzy, not a clean canonical source | |

**Auto-selected:** Recommended (first option).
**Notes:** HON-03's bar is "real canonical data, no empty stub." Research should confirm whether a more-correct faction-shared source exists in the bundled data (e.g. `udb_unit_keywords.is_faction`); otherwise detachment abilities are the source. Honest empty state where a faction genuinely has none (D-03).

---

## "Link unit" dead-end fix (HON-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Never disable; when faction unmapped, map collection→canonical faction first (persist `wahapedia_faction_id` via `updateFaction`, reuse `FactionLinkDialog` pattern), then open scoped `DatasheetPicker`; unscoped browse-all fallback | Root-cause fix — unblocks the whole faction; never a dead end | ✓ |
| Just open an unscoped all-factions picker, skip faction mapping | Removes the dead end but leaves the faction permanently unmapped (detachment/shared abilities stay dark) | |
| Leave button disabled but add a tooltip explaining why | Still a dead end — fails HON-04 | |

**Auto-selected:** Recommended (first option).
**Notes:** `disabled={!wahapediaFactionId}` in `PlaybookStats` is the dead end. Mapping the faction also lights up detachment/shared abilities and future auto-links. `useDatasheetsByFaction(undefined)` is disabled today — planner must add an all-factions browse path for the fallback (D-06).

---

## Component reuse & no-new-migration guardrail (cross-cutting)

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing components/queries (`SharedAbilityCard`, `FactionLinkDialog`, `DatasheetPicker`, `updateFaction`); no new DB migration | Consistent with milestone discipline; next migration reserved for Phase 137 | ✓ |
| Build new components / add schema | Unnecessary; pre-fires the parity gate | |

**Auto-selected:** Recommended (first option).

---

## Claude's Discretion

- Exact UX of the unmapped-faction Link flow (combined dialog vs. two steps), empty-state copy, grouped vs. flat Shared Abilities list, and the shape of the all-factions browse query — left to planner/executor within the no-dead-end + no-migration constraints.

## Deferred Ideas

- Full Collection ⇆ Unit Database discovery loop (owned-count badges, add-from-datasheet) — Phase 138 (PLAY-04).
- Faction/Unit-Database consolidation + Data Health demotion — Phase 135 (HON-05/06/07).
- Dedicated faction army-rule import via migration — only if bundled data lacks shared-ability content; avoided here to not pre-fire the parity gate (intended in Phase 137).
