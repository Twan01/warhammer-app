
content = """\
# Project Research Summary

**Project:** HobbyForge v0.2.8 -- Rules Data Hub UI / Army Lists 2.0 / Game Day Mode
**Domain:** Wargaming companion desktop app -- rules reference and game preparation layer
**Researched:** 2026-05-10
**Confidence:** HIGH

## Executive Summary

HobbyForge v0.2.8 adds the game-preparation layer on top of the existing v0.2.7 rules data foundation. The milestone covers three connected feature areas: a standalone Rules Data Hub browser (surfacing the Wahapedia data already synced in v0.2.6), Army Lists 2.0 with detachment selection (closing the most-requested gap versus competitors New Recruit, Warscribe, and BattleBase), and Game Day Mode (a focused in-game view with CP tracker, phase-grouped stratagems, and pre-game checklist). Every capability maps directly onto the installed v0.2.7 stack -- no new npm packages are required. The work is purely architectural: new pages, schema migrations, extracted components, and new query/hook files following established patterns.

The recommended approach is schema-first, sequenced to respect the dual-DB dependency chain. The army_lists.detachment_id migration must land first because it unlocks detachment stratagems in Army Lists 2.0, which Game Day Mode inherits as its primary data source. The Rules Data Hub browser is architecturally independent and can ship in parallel with Army Lists work, but benefits from the PlaybookTab component extraction that happens in Phase B. Playbook favorites and user notes are additive enhancements that bolt onto the extracted components after Phase B.

The single highest-risk area is the dual-DB constraint: tauri-plugin-sql does not support ATTACH DATABASE, rules.db is fully deleted on every sync, and user annotations written to the wrong database are silently destroyed. Every schema decision must route user-generated data (favorites, notes, detachment selection, game day state) to hobbyforge.db, never to rules.db. A secondary risk is copyright framing -- all rules content must be presented as community-sourced Wahapedia data, never as official GW material, with no auto-sync behavior.

## Key Findings

### Recommended Stack

No new dependencies are needed. All v0.2.8 capabilities are served by the validated v0.2.7 stack. Zustand 5 persist middleware (already shipped with the installed package) handles Game Day checklist state. TanStack Table handles the Rules Browser filterable list. shadcn Combobox (cmdk-based) handles the DetachmentPicker. The dual-DB pattern continues unchanged: reads from both databases, merge in TypeScript.

**Core technologies leveraged for v0.2.8:**
- Zustand 5 persist middleware: Game Day checklist state surviving navigation -- zero extra install
- TanStack Table ^8.21.3: Rules Browser sortable/filterable columns -- already used in CollectionPage
- shadcn Combobox (cmdk ^1.1.1): DetachmentPicker search -- already powers existing pickers
- tauri-plugin-sql: Migrations 018-019 for new hobbyforge.db schema additions
- React Query staleTime Infinity: mandatory on all new rules.db hooks to prevent mid-game refetches

**What NOT to add:** Fuse.js, React Window, Immer, Drizzle ORM, or any alternative state/routing library.

### Expected Features

**Must have (table stakes) -- v0.2.8 launch:**
- Detachment selection on army list -- every 40K 10th edition builder requires exactly one detachment; requires Migration 019
- Detachment stratagems and abilities shown in army list detail -- immediate payoff; reuses existing StratagemEntry and AbilityEntry components
- Rules Data Hub browser with faction filter, name search, and sync status header -- replaces rules-only-via-PlaybookTab limitation
- Game Day CP tracker and phase-grouped stratagems for chosen detachment -- Warscribe and BattleBase both validate this as baseline
- Pre-game checklist in Game Day -- BattleBase standout feature; prevents forgetting setup steps before Turn 1

**Should have (competitive) -- add when P1 stable:**
- VP tracker and Turn counter (Turn 1-5) in Game Day -- low complexity; validates secondary objective timing
- Playbook favorite flags on stratagems -- differentiator; no competitor offers favorites plus personal notes
- Stale data warnings on army list units

**Defer (v0.2.9+):**
- Stratagem used-this-turn indicator -- complex local state; validate Game Day Mode first
- Owned units only filter in Rules Browser -- dual-DB merge query; useful but not blocking
- Link game result to Battle Log from Game Day -- high value, high complexity

**Anti-features (explicitly out of scope):**
- Full offline Wahapedia mirror with lore/images -- copyright risk
- Automatic list legality validation -- requires authoritative GW data not available in community CSVs
- Dice roller -- outside hobby management focus

### Architecture Approach

The four-layer architecture (UI -> React Query hooks -> query modules -> DB clients) and dual-DB pattern are unchanged. v0.2.8 adds two new pages (RulesHubPage, GameDayPage), two new routes, four new query modules, four new hook files, and two new hobbyforge.db tables via Migration 019. The central architectural move is extracting sync-display sub-components from PlaybookTab into src/features/rules-hub/ so they can be shared across RulesHubPage, ArmyListDetailSheet, and GameDayPage without duplication.

**Major components:**
1. RulesHubPage -- new page: sync status header, faction browser, datasheets list with search and filter, diff summary
2. ArmyListDetailSheet (modified) -- adds DetachmentPicker, detachment abilities display, and filtered stratagem preview
3. GameDayPage -- new page: army list selector, CP tracker, phase-grouped stratagem view, pre-game checklist, per-unit quick reference
4. SyncStatusPanel / SyncDiffView / StratagemCard / DetachmentPanel -- extracted from PlaybookTab; shared across hub and Game Day
5. Schema additions: army_lists.detachment_id TEXT, rules_favorites table, rules_notes table in hobbyforge.db

**New query functions:** getDetachmentById, getStratagemsByDetachment, getRulesFactions added to rulesExtended.ts; new files rulesFavorites.ts and rulesNotes.ts

**New hooks:** useDetachmentById and useStratagemsByDetachment in useRulesExtended.ts; useRulesFavorites and useRulesNotes as standalone hook files

### Critical Pitfalls

1. **Writing user data to rules.db** -- rules.db is fully DELETEd on every sync; all user-generated content MUST live in hobbyforge.db via getDb(). Canonical pattern: Migration 017 unit_overrides.sql -- hobbyforge.db table with TEXT column storing Wahapedia ID as a copy.

2. **Attempting cross-DB JOINs via ATTACH DATABASE** -- tauri-plugin-sql connection model does not support ATTACH; throws a runtime error with no compile-time warning. Always use the dual-query merge pattern.

3. **Missing staleTime Infinity or sync invalidation on new rules hooks** -- 5-minute default triggers background refetch mid-game; missing key in useRulesSync onSuccess leaves data stale after sync. Both must be addressed in the same commit as the new hook.

4. **Bypassing the Wahapedia faction ID translation** -- every new rules context must call useWahapediaFactionId(faction.name). Passing the integer produces a string like "1" which returns an empty array silently.

5. **User notes with no orphan handling after sync** -- schema must include rule_name TEXT copy alongside rule_id TEXT from the start; retrofitting requires a migration and data backfill.

6. **N+1 queries in list views** -- use component boundaries (N GameDayUnitPanel instances, each calling the hook unconditionally) and batch queries with WHERE id IN for list-level displays.

7. **Game Day checklist as component state** -- ticks are lost on Sheet unmount. State must live in a Zustand persist store. Persistence contract (Zustand vs SQLite) must be decided before UI work begins.

## Implications for Roadmap

Research establishes a clear dependency chain that dictates phase order. Detachment selection is the root dependency; Rules Hub browser is independent; Game Day Mode is terminal (depends on both). Playbook enhancements slot after component extraction.

### Phase A: Schema and Data Layer Foundation

**Rationale:** Data layer first is the established project pattern. Schema mistakes are cheap to fix before UI investment; fixing them after UI is written forces component rewrites.
**Delivers:** Migration 019 (army_lists.detachment_id, rules_favorites, rules_notes); updated ArmyList type; new query functions in rulesExtended.ts, rulesFavorites.ts, rulesNotes.ts; new hooks useRulesFavorites, useRulesNotes, useDetachmentById, useStratagemsByDetachment; migration round-trip tests.
**Addresses:** Detachment selection foundation; favorites and notes foundation.
**Avoids:** Writing user data to rules.db (Pitfall 1); cross-DB JOIN (Pitfall 2); orphan note state (Pitfall 5).
**Research flag:** Standard patterns -- no deeper research needed.

### Phase B: Rules Data Hub UI

**Rationale:** Architecturally independent of Army Lists 2.0. Component extraction from PlaybookTab must happen exactly once before new consumers are built. Must precede Game Day because GameDayStratagemView reuses StratagemCard.
**Delivers:** Extracted components (SyncStatusPanel, SyncErrorList, SyncDiffView, StratagemCard, DetachmentPanel) in src/features/rules-hub/; RulesHubPage with faction browser, name search, sync status, diff summary; /rules-hub route; sidebar nav item.
**Addresses:** Rules Data Hub browser (P1); sync status dashboard; empty state for no-sync users.
**Avoids:** Wahapedia faction ID translation bypass (Pitfall 4); N+1 queries (Pitfall 6); copyright framing (Pitfall 9 -- Wahapedia attribution as named success criterion).
**Depends on:** Phase A.
**Research flag:** Standard patterns -- TanStack Table plus Zustand filter store proven in CollectionPage.

### Phase C: Army Lists 2.0 -- Detachment Selection

**Rationale:** Gating dependency for Game Day Mode. Once migration (Phase A) and component extraction (Phase B) are done, this is primarily UI work.
**Delivers:** DetachmentPicker component; ArmyListDetailSheet with detachment abilities and filtered stratagems; stale-data warning when list.detachment_id resolves to null after sync; detachment_name TEXT copy stored alongside detachment_id.
**Addresses:** Detachment selection (P1); detachment stratagems and abilities in army list (P1); stale detachment warning.
**Avoids:** Cross-DB JOIN (Pitfall 2); COALESCE chain divergence (Pitfall 3 -- no detachment cost adjustments in 10th edition); nested portal in Sheet; stale detachment not validated (Pitfall 8).
**Depends on:** Phase A.
**Research flag:** Standard patterns -- mirrors existing useWahapediaFactionId call in PlaybookTab.

### Phase D: Playbook Enhancements -- Favorites and User Notes

**Rationale:** Requires rules_favorites schema (Phase A) and extracted StratagemCard (Phase B). Favorites feed into Game Day Mode via is_reminder flag -- must be available before Game Day ships.
**Delivers:** Star/favorite toggle on StratagemCard and DetachmentPanel; inline user note textarea; favorites in PlaybookTab and RulesHubPage; is_reminder flag for Game Day consumption.
**Addresses:** Playbook stratagem favorites (P2); per-stratagem user notes (P2); reminder flag for Game Day (P2).
**Avoids:** Writing notes to rules.db (Pitfall 1); orphan note display (Pitfall 5 -- rule_name TEXT copy in schema from Phase A).
**Depends on:** Phase A (schema) and Phase B (extracted components).
**Research flag:** Standard patterns -- identical UPSERT to useUpsertStrategyNote.

### Phase E: Game Day Mode

**Rationale:** Terminal phase -- depends on detachment selection (Phase C) for primary data source, extracted StratagemCard (Phase B) for stratagem view, and favorites (Phase D) for personalized surfacing. All dependencies must be stable before building this complex page.
**Delivers:** GameDayPage with army list selector; CP tracker; phase-grouped stratagem view filtered to chosen detachment; pre-game checklist (Zustand persist store); per-unit ability quick reference via GameDayUnitPanel components; VP tracker; Turn counter.
**Addresses:** Game Day CP tracker and phase stratagems (P1); pre-game checklist (P1); VP tracker (P2); Turn tracker (P2); favorited stratagems surfaced at top (P2).
**Avoids:** Game Day checklist as component state (Pitfall 7 -- Zustand persist store decided before UI); loading all faction stratagems unfiltered; N+1 hooks in unit panel (Pitfall 6 -- GameDayUnitPanel boundary pattern); auto-sync on Game Day open (Pitfall 9).
**Depends on:** Phase B (StratagemCard) and Phase C (detachment selection).
**Research flag:** Standard patterns. stratagemsByPhase grouping from PlaybookTab -- extract to src/lib/groupStratagemsByPhase.ts and reuse.

### Phase Ordering Rationale

- Schema-first (Phase A) because migrations are irreversible and every phase depends on the new columns and tables.
- Rules Hub before Army Lists (Phase B before C) because PlaybookTab component extraction must happen exactly once; deferring forces duplicate components.
- Favorites before Game Day (Phase D before E) because the is_reminder flag feeds directly into Game Day personalized stratagem surfacing.
- Game Day last (Phase E) because it has the most dependencies and highest UI complexity; all sub-patterns proven in earlier phases.

### Research Flags

Phases needing deeper research during planning:
- None identified. All patterns are extensions of proven codebase patterns with HIGH confidence sources.

Phases with standard patterns (skip research-phase):
- **Phase A:** Established migration plus hook pattern from v0.2.6/v0.2.7 schema work.
- **Phase B:** TanStack Table plus Zustand filter store proven in CollectionPage.
- **Phase C:** PlaybookTab data flow pattern is the direct template.
- **Phase D:** UPSERT pattern identical to useUpsertStrategyNote.
- **Phase E:** All sub-patterns proven in earlier phases; combination work only.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against package.json at v0.2.7; all capabilities confirmed present; no new packages needed |
| Features | HIGH | Grounded in v0.2.7 codebase audit and competitor analysis of New Recruit, Warscribe, BattleBase, Quartermaster |
| Architecture | HIGH | All findings based on direct codebase reads of all affected source files; zero training-data assumptions |
| Pitfalls | HIGH | Derived from direct codebase inspection, PROJECT.md Key Decisions, and established patterns |

**Overall confidence:** HIGH

### Gaps to Address

- **last_diff_json for persistent sync diff:** Two options -- persist JSON in rules_sync_meta vs. re-derive on page load. Default to re-derive unless hub page is slow; decide at Phase B kickoff.
- **Game Day checklist persistence contract:** Zustand persist is recommended default (session-scoped, reset on restart); move to SQLite only if multi-session resumption is validated as a user requirement. Decide at Phase E kickoff.
- **Stale detachment post-sync validation:** Candidate implementation location is useRulesSync.onSuccess. Finalize during Phase C or Phase E planning.

## Sources

### Primary (HIGH confidence)
- .planning/PROJECT.md -- ground truth for stack, Key Decisions (ATTACH not supported, overrides in hobbyforge.db, weapon_name TEXT copy, COALESCE chain, cache invalidation symmetry)
- package.json at v0.2.7 -- definitive installed dependency list
- src/features/units/PlaybookTab.tsx -- template for all rules data patterns (faction ID translation, dual-query merge, staleTime Infinity, sync empty state, stratagemsByPhase grouping)
- src/db/queries/armyLists.ts -- COALESCE chain; full-replacement UPDATE contract
- src/db/queries/rulesExtended.ts -- staleTime Infinity pattern; faction ID as string
- src/hooks/useRulesSync.ts -- sync invalidation contract
- src-tauri/migrations/017_unit_overrides.sql -- canonical hobbyforge.db-only user data table with TEXT ID copy pattern

### Secondary (MEDIUM confidence)
- Competitor analysis: New Recruit, Warscribe, BattleBase, Quartermaster -- feature baseline and differentiation
- Wargamer detachments guide and Spikeybits army list builder guide -- 10th edition detachment mechanics

### Tertiary (reference only)
- Zustand persist middleware docs -- confirmed persist ships with Zustand 5, no extra install
- TanStack Router search params guide -- confirms Zustand is correct for ephemeral filters
- Algolia search UX best practices and NN/g filter categories -- Rules Browser filter UX patterns

---
*Research completed: 2026-05-10*
*Ready for roadmap: yes*
"""

path = r"C:\Documents\Claude Apps\Warhammer App\.planning\research\SUMMARY.md"
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print(f"Written {len(content)} bytes to {path}")
