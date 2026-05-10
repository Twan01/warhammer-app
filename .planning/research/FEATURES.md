# Feature Research

**Domain:** Wargaming companion app — Rules Data Hub UI, Army Lists 2.0, Game Day Mode
**Researched:** 2026-05-10
**Confidence:** HIGH (grounded in codebase audit of v0.2.7 + competitor analysis of New Recruit, Warscribe, BattleBase, Quartermaster)

---

## Context: What Already Exists

The existing app (v0.2.7) already ships:

- `PlaybookTab` with stratagems grouped by phase, detachments with nested abilities, shared faction abilities, weapons table — all read from `rules.db` via `useRulesExtended` hooks
- `RwStratagem` includes `phase`, `cp_cost`, `turn`, `detachment_id`, `description` fields
- `RwDetachment` includes `id`, `faction_id`, `name`, `legend`, `type` fields
- `army_lists` schema has `faction_id`, `name`, `points_limit`, `list_type`, `notes` — but NO `detachment_id` column
- `army_list_units` has per-unit `points_override` and `notes` — no stale-data tracking
- No standalone rules browser page — rules accessible only per-unit inside `PlaybookTab`
- No game day mode, no CP tracker, no phase-by-phase workflow

This research covers only what is **not yet built**.

---

## Feature Area 1: Rules Data Hub UI

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Searchable datasheets list filtered by faction | Any rules tool (Wahapedia, New Recruit) filters by faction first | LOW | `rw_datasheets` + `rw_factions` already in DB; `DatasheetPicker` pattern is the template |
| Full-text name search across datasheets | Wahapedia's search is the baseline; users expect to type a unit name and find it instantly | LOW | SQLite `LIKE` on `rw_datasheets.name`; fast for local DB |
| Display datasheets with stats, abilities, keywords, wargear | PlaybookTab already renders this per-unit; users expect the same standalone | MEDIUM | Reuse `WargearTable`, `AbilityEntry`, `StratagemEntry` sub-components from PlaybookTab |
| Filter by battlefield role (Infantry, Vehicle, Monster, etc.) | Wahapedia and GW app both group by battlefield role | LOW | `rw_datasheets.role` column exists |
| Sync status prominently shown on hub page | Users need to know if data is fresh — stale data means wrong rules | LOW | `RulesSyncMeta` + freshness badge already in PlaybookTab; promote to hub page header |
| Empty state when no sync has been run | Datasheets page with no data needs actionable prompt | LOW | Pattern exists in 5 other features; consistent with CollectionEmptyState approach |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Owned units only" filter on datasheets browser | Shows only datasheets linked to units in the user's collection — unique to a hobby management app | MEDIUM | Requires JOIN between `hobbyforge.db` `unit_datasheet_links` and `rules.db` datasheets; dual-DB merge pattern already established in codebase |
| Per-field override indicators in rules view | Shows when a displayed value is a manual override vs. imported value | LOW | `unit_overrides` already tracked; surface the pencil icon pattern from PlaybookTab |
| Sync diff summary view (what changed last sync) | Post-sync diff already computed in `computeSyncDiff`; a dedicated persistent view adds value without extra computation | MEDIUM | `lastSyncDiff` state already in PlaybookTab; promote to a persistent collapsible in the hub |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full offline Wahapedia mirror with lore text and images | "All the rules in one place" | Copyright risk — reproducing GW rules text verbatim. App already navigates this via user-triggered sync of community CSV data only | Surface only data already imported via the user's own manual sync; never auto-scrape |
| Rules legality validation ("your list is illegal") | Competitive builders do this | Requires authoritative GW points/restrictions data not in Wahapedia CSVs; legally fraught | Surface informational warnings only on data the user explicitly imported; never block saves |
| Cross-faction comparison tables | Useful for research and meta analysis | Scope creep; adds UI complexity for marginal personal use | One faction at a time; defer cross-faction features |

---

## Feature Area 2: Playbook Enhancements

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Favorite/bookmark a stratagem | Power users memorize 5-6 key stratagems; quick access is expected in any modern rules reference | LOW | New `stratagem_annotations` table in `hobbyforge.db` keyed on `wahapedia_stratagem_id TEXT`; survives re-syncs because it's not in rules.db |
| Per-stratagem user note ("only in Fight phase — don't forget") | Users annotate rules they frequently misremember | LOW | `user_note TEXT` column on the same `stratagem_annotations` table |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Reminder" flag that surfaces a stratagem in Game Day | Marks stratagems the user explicitly wants reminded of during games | MEDIUM | Requires Game Day Mode to read `is_reminder` flag from `stratagem_annotations`; low-risk dependency |
| Stratagem filter by chosen detachment in PlaybookTab | Currently shows ALL faction stratagems; filtering to the chosen detachment reduces noise significantly | MEDIUM | `RwStratagem.detachment_id` already in schema; requires detachment selection stored on army list |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Editable stratagem text ("house rules variants") | Players modify rules for casual play | Overwrites sync data; confusing after re-sync; diverges from source of truth | Use the user note field alongside the imported text; never mutate source data in rules.db |

---

## Feature Area 3: Army Lists 2.0 — Detachment Integration

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Detachment selection on an army list | Every 40K army has exactly one detachment in 10th edition; every builder (New Recruit, 40kList, Quartermaster) requires it | LOW | New `detachment_id TEXT` column on `army_lists` table; store as TEXT copy per the existing `weapon_name` decision (cross-DB FK enforcement unsupported by tauri-plugin-sql); new migration required |
| Show chosen detachment's stratagems in army list detail | Users prep with their detachment's stratagems; this is the primary use case for detachment selection | MEDIUM | Filter `rw_stratagems` by `detachment_id`; reuse `StratagemEntry` component |
| Show chosen detachment's abilities in army list detail | The detachment rule (army-wide special rule) is the most important rules card for any game | LOW | `getDetachmentAbilitiesByDetachment()` already exists; call it with selected `detachment_id` |
| Visual indicator when no detachment is selected | Clear affordance that a detachment is expected for a complete army | LOW | Badge or placeholder in army list header; "Select detachment" prompt |
| Stale data warning on army list units | If a unit's linked datasheet was modified since last sync, surface a warning so user knows to re-check | MEDIUM | New query joining `unit_datasheet_links` to last-sync diff snapshot in hobbyforge.db; flag modified units with amber indicator |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Detachment stratagems auto-populate Game Day mode | Chosen detachment's stratagems become the Game Day stratagem list — no manual setup | MEDIUM | Straightforward once detachment selection and Game Day Mode both exist |
| Stratagem quick-filter: only stratagems relevant to units in this list | New Recruit's supporters-only feature — filter by unit keywords | HIGH | Requires keyword matching between stratagem trigger text and unit keywords; fragile text parsing on CSV data; defer |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automatic list legality validation (unit slot restrictions, detachment requirements) | Competitive builders like New Recruit enforce this | Requires authoritative GW restriction data not available in Wahapedia community CSVs; high maintenance burden with every GW FAQ | Surface informational points budget only; never block saves |
| Multiple detachments per list (11th edition style) | 11th edition will support multi-detachment armies | 10th edition uses single detachment; multi-detachment adds schema complexity for zero current value | Schema `detachment_id` as single nullable TEXT column; multi-detachment can become a join table in a future milestone |
| Enhancement tracking per army list | Part of competitive list building | Enhancement data not currently imported in sync pipeline; new Wahapedia CSV required | Defer to a future sync extension milestone |

---

## Feature Area 4: Game Day Mode

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Phase-grouped stratagem reference for the active list's detachment | Warscribe and BattleBase both organize stratagems by game phase; users consider this baseline for any 40K companion app | MEDIUM | `RwStratagem.phase` already populated; filter to chosen detachment; group by phase; reuse `StratagemEntry` |
| CP (Command Points) tracker | Every 40K game uses CP; all companion apps track it | LOW | Local React state; no DB persistence needed; increment/decrement with reset; start at configurable value |
| Pre-game checklist (deploy, scout moves, pre-battle abilities) | BattleBase's standout feature — prevents forgetting setup steps before turn 1 | LOW | Static checklist of standard 40K setup steps; checkboxes reset each game; content from 10th edition core rules structure |
| Unit ability quick-reference during game | Users need to look up an ability mid-game without leaving the mode | MEDIUM | Searchable list of units in the chosen army list with their linked datasheet abilities inline; reuse existing hooks |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Favorited stratagems surfaced at top of Game Day view | Personalized from Playbook favorite flags; reduces scroll during tense game moments | MEDIUM | Requires `stratagem_annotations` table from Playbook Enhancements area; dependency is low risk |
| Turn tracker (Turn 1-5 counter) | 40K games run exactly 5 turns; tracking avoids disputes and helps with secondary objective timing | LOW | Simple counter; highlight "final turn" at Turn 5; pair with CP auto-gain reminder |
| Stratagem used-this-turn indicator | Prevents accidentally using a once-per-turn stratagem twice (BattleBase differentiator) | MEDIUM | Per-stratagem toggle that auto-resets on "Next Turn" button; purely local React state |
| VP (Victory Points) tracker | Standard for matched play; Warscribe's core feature | LOW | Simple counter local state; per-player (own side only); no persistence needed |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Persistent game state (save mid-game and resume) | Useful for multi-session games | Adding a transient game session to SQLite schema adds complexity for a rare use case; most games complete in one sitting | Keep game state in React component memory; offer "reset" button; let battle log serve as the persistent record |
| Real-time opponent CP/VP tracking | Multiplayer transparency | Single-user local-first app; opponent data is not meaningful to persist | Track own side only; notes field on battle log for opponent info |
| Phase-by-phase walkthrough with rules text reproduced | BattleBase does this with official rules text | Would require reproducing GW core rules verbatim — copyright constraint that the entire app is built to avoid | Show user's own custom reminders and their imported Wahapedia abilities only; never GW-authored text |
| Dice roller | Requested by hobby enthusiasts | Marginal value; many dedicated dice apps exist; outside hobby management focus | Document as explicitly deferred |

---

## Feature Dependencies

```
Detachment Selection (army_lists migration + new column)
    └──enables──> Detachment Stratagems in Army List Detail View
    └──enables──> Detachment Stratagems in Game Day Mode (auto-populated)
    └──enables──> Stratagem Filter by Detachment in PlaybookTab

Playbook stratagem_annotations table (new hobbyforge.db table)
    └──enables──> Favorite Stratagems surfaced in Game Day Mode
    └──enables──> Per-stratagem user notes in PlaybookTab

Rules Data Hub Browser (new page)
    └──reuses──> WargearTable, AbilityEntry, StratagemEntry from PlaybookTab
    └──reuses──> DatasheetPicker pattern for faction filter
    └──independent of Army Lists and Game Day changes

Game Day Mode (new page or modal)
    └──requires──> Army List with Detachment Selection
    └──enhanced-by──> stratagem_annotations favorites
    └──optionally-links-to──> Battle Log (record result post-game)

Stale Data Warnings on Army List Units
    └──requires──> rulesSnapshot diff data (already captured in v0.2.6)
    └──requires──> unit_datasheet_links correlation (new query)
```

### Dependency Notes

- **Detachment selection requires a migration.** `army_lists` needs a new `detachment_id TEXT` column. Store as TEXT (not a FK to rules.db — cross-DB FK enforcement is unsupported by tauri-plugin-sql). Follows the established `weapon_name as TEXT copy` decision documented in PROJECT.md.
- **Game Day Mode requires detachment selection.** Without a chosen detachment, showing all 50+ faction stratagems is noise. The phase-grouped view only works when scoped to one detachment's stratagems.
- **Playbook favorites require a new hobbyforge.db table.** A `stratagem_annotations` table keyed on `wahapedia_stratagem_id TEXT` with `is_favorite`, `is_reminder`, `user_note` columns. Survives re-syncs because it lives in hobbyforge.db, not rules.db (same reasoning as unit_overrides).
- **Rules Hub browser is largely additive.** It reuses existing data, queries, and sub-components. Can ship independently of army list or game day changes.

---

## MVP Definition

### Launch With (v0.2.8)

Core milestone deliverables — what makes rules data "visible, searchable, and useful for real game preparation."

- [ ] **Detachment selection on army list** — foundation for Game Day integration; requires one migration
- [ ] **Detachment stratagems + abilities shown in army list detail** — immediate payoff once detachment is selected; reuses existing components
- [ ] **Rules Data Hub browser page** — faction filter + name search + datasheets list + sync status header
- [ ] **Game Day Mode: CP tracker + phase-grouped stratagems for chosen detachment** — core game-day utility; both Warscribe and BattleBase validate this as a must-have
- [ ] **Game Day Mode: pre-game checklist** — low complexity, high value, BattleBase-proven pattern

### Add After Core (v0.2.8.x)

- [ ] **VP tracker and Turn counter in Game Day** — low complexity; add when Game Day Mode is in use
- [ ] **Playbook favorite flags on stratagems** — trigger: user actively uses Game Day and wants personalized view
- [ ] **Stale data warnings on army list units** — trigger: user reports confusion after re-sync modifies a linked datasheet

### Future Consideration (v0.2.9+)

- [ ] **Stratagem used-this-turn indicator** — complex local state with turn lifecycle; validate Game Day Mode first
- [ ] **"Owned units" filter in rules browser** — useful differentiator; requires dual-DB merge query
- [ ] **Link game result to battle log from Game Day** — high value but high complexity cross-feature flow

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Detachment selection on army list | HIGH | LOW | P1 |
| Detachment stratagems shown in army list | HIGH | LOW | P1 |
| Rules Data Hub browser (faction filter + search) | HIGH | MEDIUM | P1 |
| Game Day CP tracker + phase stratagems | HIGH | MEDIUM | P1 |
| Pre-game checklist in Game Day | MEDIUM | LOW | P1 |
| VP tracker in Game Day | MEDIUM | LOW | P2 |
| Turn tracker in Game Day | LOW | LOW | P2 |
| Playbook stratagem favorites | MEDIUM | LOW | P2 |
| Stale data warnings on army list units | MEDIUM | HIGH | P2 |
| Stratagem used-this-turn indicator | MEDIUM | MEDIUM | P3 |
| "Owned units" filter in rules browser | MEDIUM | MEDIUM | P3 |
| Link game result to battle log from Game Day | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for v0.2.8 launch
- P2: Should have; add when P1 stable or driven by validation
- P3: Nice to have; future milestone

---

## Competitor Feature Analysis

| Feature | New Recruit | Warscribe | BattleBase | HobbyForge approach |
|---------|-------------|-----------|------------|---------------------|
| Detachment selection in list builder | Yes — required step | Via imported list | Yes | New `detachment_id TEXT` on `army_lists`; single select |
| Stratagems organized by phase | Partial | Yes (core feature) | Yes | Yes — `RwStratagem.phase` already populated |
| Stratagems filtered by unit (supporters-only) | Yes (limited) | No | No | Deferred — fragile text parsing; low ROI for personal tool |
| CP tracking | Yes | Yes | Yes (automated) | Manual +/- counter; no automation needed |
| VP tracking | No | Yes | Yes | Simple local counter |
| Pre-game checklist | No | No | Yes (guided) | Static checklist; proven high-value by BattleBase |
| Rules browser / datasheets | Full (faction-filtered) | Via imported list | Roster view | Dedicated hub page with faction filter + name search |
| Favorites / personal notes on rules | No | No | No | Differentiator via `stratagem_annotations` table |
| Hobby tracking integrated with game prep | No | No | No | HobbyForge's unique differentiator — knows which units are owned and painted |

**Key differentiation:** No competitor combines hobby tracking (collection, painting progress) with game-day rules reference. Game Day Mode in HobbyForge can surface which units in the army list are unpainted — a contextual signal no list-builder-only app can provide.

---

## Sources

- Competitor analysis: [New Recruit news](https://www.newrecruit.eu/news), [Warscribe 40K](https://40k.warscribe.app/), [BattleBase](https://www.battlebase.app/)
- Army builder patterns: [Quartermaster](https://quartermaster.app/), [40kList](https://40klist.com/)
- Detachment mechanics: [Wargamer detachments guide](https://www.wargamer.com/warhammer-40k/detachments), [Spikeybits army list builder guide](https://spikeybits.com/10th-edition-40k/battlescribe-alternative-warhammer-40k-10th-edition-army-list-builder-apps/)
- Search/filter UX: [Algolia search UX best practices](https://www.algolia.com/blog/ux/how-to-streamline-your-search-ux-design), [NN/g filter categories](https://www.nngroup.com/articles/filter-categories-values/)
- Existing codebase: `PlaybookTab.tsx`, `rulesExtended.ts`, `armyLists.ts`, `datasheet.ts` (v0.2.7 — primary source)

---
*Feature research for: HobbyForge v0.2.8 — Rules Data Hub UI, Army Lists 2.0, Game Day Mode*
*Researched: 2026-05-10*
