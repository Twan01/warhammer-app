# Pitfalls Research

**Domain:** HobbyForge v0.2.8 — Adding Rules Data Hub UI, Army Lists 2.0, Game Day Mode, and Playbook enhancements to existing dual-DB Tauri 2 + React 19 + SQLite system
**Researched:** 2026-05-10
**Confidence:** HIGH (all findings derived from direct codebase inspection, shipped code decisions in PROJECT.md, and established patterns in the existing query/hook/component stack)

---

## Critical Pitfalls

### Pitfall 1: Writing User Annotations into rules.db

**What goes wrong:**
A new feature — favorites, user notes on rules, game day reminders, detachment selection — stores its data in rules.db by calling `getRulesDb()` for writes. Every sync calls `bulk_sync_rules` in Rust, which begins with a full `DELETE FROM rw_*` pass before re-inserting. All user data written to rules.db is silently destroyed at the next sync.

**Why it happens:**
The new feature reads from rules.db tables and the developer naturally co-locates the write alongside the reads in the same `rulesExtended.ts` query file. The DELETE-before-INSERT sync pattern is not obvious from the query layer alone — it is only visible in the Rust `lib.rs` command and the Phase 44 sync hardening code. The `syncErrors.ts` file explicitly warns about this with a CRITICAL comment, but developers reading only `rulesExtended.ts` will not see it.

**How to avoid:**
Every table that holds user-generated content — favorites, personal notes, reminder flags, detachment_id selections, game day checklist state — MUST live in hobbyforge.db via `getDb()`. Use the pattern established in `unit_overrides` (017_unit_overrides.sql): a separate hobbyforge.db table with a `TEXT` column storing the Wahapedia ID as a copy, not a cross-DB reference. The sync-survival rule is stated in PROJECT.md Key Decisions: "Overrides in hobbyforge.db, not rules.db — rules.db is fully DELETEd on every sync."

**Warning signs:**
- Any `INSERT` or `UPDATE` that uses `getRulesDb()` instead of `getDb()`
- A new table added via a `rules_00N_*.sql` migration file that stores anything user-editable
- A query function in `rulesExtended.ts` that calls `db.execute()` rather than `db.select()`

**Phase to address:**
Schema design phase (first phase of v0.2.8). Every new hobbyforge.db table must be designed and justified before a single query function is written. Each migration file for user data must use `getDb()`.

---

### Pitfall 2: Attempting Cross-DB JOINs via ATTACH DATABASE

**What goes wrong:**
Army Lists 2.0 needs to show the selected detachment name alongside the list. The detachment name lives in `rw_detachments` (rules.db) and the selection lives in `army_lists` (hobbyforge.db). A developer writes a SQL JOIN across both databases using SQLite `ATTACH DATABASE` syntax. This compiles correctly in a standalone SQLite shell but tauri-plugin-sql opens each database as a separate isolated connection — `ATTACH` is not available between those connections and the query throws a runtime error with no compile-time warning.

**Why it happens:**
SQLite's `ATTACH DATABASE` is a well-known multi-file SQL pattern and works in most SQLite clients and ORMs. The constraint is specific to tauri-plugin-sql's connection model and is only documented in PROJECT.md's "Out of Scope" section. New contributors and AI-assisted code will naturally reach for ATTACH.

**How to avoid:**
Continue the dual-query merge pattern used throughout the existing codebase. Read from each DB separately and merge in TypeScript. For Army Lists 2.0 detachment display: store `detachment_id TEXT` in `army_lists` (hobbyforge.db), fetch the detachment name from `rw_detachments` via a separate `getRulesDb()` select, then merge by ID in the hook before returning. The `weapon_name as TEXT copy in unit_loadout_wargear` precedent in PROJECT.md Key Decisions is the canonical example of this pattern.

**Warning signs:**
- Any SQL string containing `ATTACH`, `DETACH`, or referencing two different database filenames
- A query function that calls both `getDb()` and `getRulesDb()` and passes data from one as a parameter to the other within the same SQL string
- A JOIN that references an `rw_` prefixed table inside a `getDb()` context

**Phase to address:**
Army Lists 2.0 schema design phase. Establish `detachment_id TEXT` on `army_lists` and document the dual-query merge contract in the query file comment before any UI work.

---

### Pitfall 3: Breaking the 3-Level COALESCE Points Chain

**What goes wrong:**
Army Lists 2.0 adds detachment selection and the developer, believing detachments could affect unit costs, adds a fourth level to the COALESCE chain in `getArmyListWithUnits` but forgets to update `getArmyListReadiness`. The two query functions now disagree on what `effective_points` means. The ArmyListSummaryBar and ArmyReadinessCard show different totals for the same list. The bug is silent — both functions succeed, the values just differ.

**Why it happens:**
The COALESCE chain (`alu.points_override → uo.points → u.points → 0`) is duplicated verbatim in two separate query functions in `armyLists.ts`. There is no shared SQL constant for the expression. Modifying one without the other is a straightforward oversight since nothing enforces consistency between them.

**How to avoid:**
In 40K 10th edition, detachments do not modify individual unit point costs — they unlock stratagems and abilities. Do not add a fourth COALESCE level for detachment cost adjustments. If future rules require it, extract the COALESCE expression into a named SQL fragment or a SQL view, then reference it from both query functions. Update both sites atomically in a single commit and add a code comment at each site: "If you add a COALESCE level here, update the matching expression in [other function name]."

**Warning signs:**
- `getArmyListWithUnits` and `getArmyListReadiness` showing different total points for the same army list
- A COALESCE chain that differs between the two functions
- Tests for army list total points that cover only one of the two functions

**Phase to address:**
Army Lists 2.0 — any phase that modifies `armyLists.ts`. Code review checklist: both COALESCE expressions must match.

---

### Pitfall 4: Missing staleTime: Infinity or Sync Invalidation for New Rules Hooks

**What goes wrong:**
Two failure modes occur in combination. First, a new rules hook for the Rules Browser or Game Day Mode is written without `staleTime: Infinity` — the default 5-minute staleTime from QueryProvider triggers a background refetch during a game session, causing a jarring rerender. Second, the new hook's query key is not added to `useRulesSync`'s `onSuccess` invalidation block — after the user syncs, the browser or game day panel continues showing pre-sync data until the app is restarted.

**Why it happens:**
`staleTime: Infinity` is the correct setting for rules data (static until explicit sync) but it is not the QueryProvider default. Each new hook must opt in. The sync invalidation block in `useRulesSync` is a manual list that must be updated every time a new rules hook is introduced — there is no automated mechanism to enforce this.

**How to avoid:**
Every hook that reads from rules.db must set `staleTime: Infinity`. New query keys must be added to the `useRulesSync` `onSuccess` invalidation list at the same time the hook is created (same PR, same commit). Treat the invalidation list as a required checklist item in every phase's success criteria.

**Warning signs:**
- A `useQuery` against `getRulesDb()` without `staleTime: Infinity` in its options
- A new query key constant for rules data that does not appear in `useRulesSync`'s invalidation block
- The Rules Browser or Game Day panel showing old data immediately after a successful sync

**Phase to address:**
Rules Data Hub UI phase (first to introduce new rules hooks) and every subsequent phase that adds a rules-reading hook.

---

### Pitfall 5: Bypassing the Wahapedia Faction ID Translation

**What goes wrong:**
The Rules Browser or Game Day Mode filters stratagems and detachments by the user's active faction. The developer passes `faction.id` (HobbyForge integer PK from hobbyforge.db) or `faction.name` directly to `getStratagemsByFaction`. Wahapedia faction IDs are opaque TEXT strings (e.g., `"SM"` for Space Marines) that do not match either. The query returns an empty array with no error — the empty list looks like "no data synced."

**Why it happens:**
The `useWahapediaFactionId(faction.name)` lookup hook is only called in `PlaybookTab` and is easy to overlook when building independent pages. There is no type-level enforcement preventing an integer from being passed as the `factionId: string` parameter — TypeScript accepts `String(faction.id)` which produces `"1"` rather than `"SM"`.

**How to avoid:**
`useWahapediaFactionId` must be the single source of truth for the HobbyForge-name → Wahapedia-ID translation. For every new context that needs rules.db faction-filtered data (Rules Browser page, Game Day header, any future rules feature), call `useWahapediaFactionId(faction.name)` and pass the resulting string to rules hooks. Document this requirement at the top of `rulesExtended.ts`.

**Warning signs:**
- Stratagems or detachments sections rendering empty even after a sync that reports non-zero stratagem/detachment row counts
- A query function receiving a numeric faction ID (integer) rather than a Wahapedia string ID
- A new hook typed as `factionId: number` rather than `factionId: string`

**Phase to address:**
Rules Data Hub UI phase (first phase to surface a standalone rules browser). Establish `useWahapediaFactionId` as a documented shared lookup, not a PlaybookTab-internal detail.

---

### Pitfall 6: User Notes on Rules with No Orphan Handling After Sync

**What goes wrong:**
The user saves a personal note on a stratagem (`stratagem_id = "SM-STR-001"`). Wahapedia re-releases data and that stratagem is renamed or removed. At the next sync, `rw_stratagems` no longer has that ID. The user note in hobbyforge.db has a `stratagem_id TEXT NOT NULL` column pointing at a now-absent ID. The UI joins to rules.db to get the stratagem name and gets NULL. The note silently disappears from view or triggers a display error.

**Why it happens:**
Cross-DB orphan detection is impossible via SQLite FK constraints — the TEXT ID in hobbyforge.db references a row in rules.db, but SQLite can only enforce FKs within the same database. This is the same structural problem that motivated storing `weapon_name TEXT` as a copy in `unit_loadout_wargear`. Without the copy, the UI has no display data when the rules.db row vanishes.

**How to avoid:**
For all rules-linked user data (notes, favorites, reminders), store both the `rule_id TEXT` (for re-association after sync) and a `rule_name TEXT` copy (for display even when the rule no longer exists in rules.db). In the UI, detect orphan state by checking whether the rules.db row still exists and show a "This rule was removed in the last sync" indicator rather than hiding the note silently.

**Warning signs:**
- A user-note or favorite table schema with `stratagem_id TEXT NOT NULL` but no `stratagem_name TEXT` copy column
- A component that JOINs to rules.db for the name display without a fallback when the join returns NULL
- User notes or favorites silently disappearing from the UI after a sync that removes a stratagem or detachment

**Phase to address:**
Playbook enhancements phase (user notes on rules). The schema must include `rule_name TEXT` as a denormalized copy from the start — retrofitting this requires a migration and data backfill.

---

### Pitfall 7: Game Day Checklist State Treated as Component State

**What goes wrong:**
Game Day Mode has per-unit or per-phase checklists (mark stratagem as used, check reminder, confirm unit deployed). The developer stores checklist state in React `useState`. The user opens Game Day, ticks several boxes, switches to Army Lists to verify points, navigates back to Game Day — all state is gone because the Sheet or page component unmounted. The user must manually re-check completed items mid-game.

**Why it happens:**
Game Day checklists feel "temporary for a game session" so the developer reaches for `useState`. The Sheets-based navigation throughout the app means components unmount freely when the user switches context. For all prior features the project correctly uses React Query for persisted state and Zustand for ephemeral-but-navigation-stable state — but Game Day is new enough that the pattern choice is not obvious.

**How to avoid:**
Game Day checklist state that must survive navigation must live in a Zustand store (persisted for the session, reset on app close) or in a `game_day_sessions` table in hobbyforge.db (persisted across restarts). The choice depends on whether the user would want to resume a game session after closing the app. Define this contract before writing any UI. If Zustand: document explicitly that state resets on app restart. If SQLite: add a migration in the schema phase.

**Warning signs:**
- Checklist tick state stored in `useState` within a Sheet or page component
- A large `useState` object tracking N per-unit ability checkboxes
- No Zustand store or migration added for game session state despite any requirement that the session should survive navigation

**Phase to address:**
Game Day Mode architecture phase. The checklist persistence contract (Zustand vs SQLite) must be decided and documented before any UI work begins.

---

### Pitfall 8: Army List Detachment Selection Not Validated After Sync

**What goes wrong:**
An army list stores `detachment_id TEXT` referencing a row in `rw_detachments`. After the next sync, Wahapedia renames or removes that detachment. The `army_lists.detachment_id` still holds the old ID. No stale-data warning is shown. The user opens Game Day Mode and receives stratagems filtered to a detachment that no longer exists — or receives all faction stratagems because the filter returns no match.

**Why it happens:**
The existing stale-data warning system (sync diff, freshness badge, PlaybookTab "last synced") operates at the unit-datasheet level and has no concept of army list detachment references. The sync pipeline does not know to check `army_lists.detachment_id` values against the current `rw_detachments` table. This is a new dependency surface with no prior analog in the codebase.

**How to avoid:**
Post-sync validation: after each successful sync, run a dual-query comparison (fetch `army_lists.detachment_id` values from hobbyforge.db, fetch current `rw_detachments.id` values from rules.db, compare in TypeScript). Surface any non-matching IDs as warnings in the Army Lists page detail sheet. Store `detachment_name TEXT` alongside `detachment_id` so the old name can be shown in the warning even after the row is gone from rules.db.

**Warning signs:**
- `army_lists.detachment_id` contains a value but no matching row exists in `rw_detachments`
- Game Day stratagem filter produces an empty list for a list that has a detachment selected
- No validation step runs after `useRulesSync` completes

**Phase to address:**
Army Lists 2.0 detachment selection phase (store the name copy) and the Rules Data Hub UI or sync hardening phase (add post-sync validation).

---

### Pitfall 9: Rules Browser Framing Implies Official GW Content

**What goes wrong:**
The Rules Data Hub UI presents a page titled "Warhammer 40K Rules" or renders detachments and stratagems under a "Rules" heading without attribution. The framing implies the app bundles or distributes official GW content. GW's IP policy prohibits reproducing codex data. Even though data is fetched from Wahapedia by the user's own manual action, presenting it as authoritative rules without clear attribution creates copyright and trademark risk.

**Why it happens:**
The UX instinct is to name things clearly. "Rules Browser" and "Warhammer 40K Rules" are the most descriptive names. The legal constraint is explicit in PROJECT.md but does not surface during day-to-day component development.

**How to avoid:**
Frame all content as "community-sourced data synced from Wahapedia" with a persistent attribution note visible in the UI. Use neutral labels ("Faction Rules," "Detachments," "Stratagems") rather than GW trademark names as section headers for rules content. Keep the sync trigger entirely user-initiated — no auto-fetch on startup, on a timer, or on Game Day open. Never display point values presented as GW-authoritative (points are user-entered or override-based).

**Warning signs:**
- A page or section header saying "Warhammer 40K Rules," "Official Datasheets," or "GW Rules"
- An auto-sync call in `useEffect` on app start or Game Day mount
- No Wahapedia attribution visible in the Rules Browser UI
- Points values displayed as "from codex" or "official"

**Phase to address:**
Rules Data Hub UI phase. Copyright framing review must be a named success criterion in that phase's checklist.

---

### Pitfall 10: N+1 Queries in Rules Browser or Game Day Ability Display

**What goes wrong:**
The Rules Browser renders all stratagems for a faction and for each stratagem fetches its detachment name to display a detachment badge. Game Day ability panel renders all units in the army list and for each unit calls a separate `useQuery` to fetch that unit's abilities. With 80 stratagems or 15 units, the app executes 80 or 15 sequential DB queries on page open. The UI renders noticeably slowly, React Query Devtools shows dozens of simultaneous queries.

**Why it happens:**
The existing per-entity hook pattern (`useDetachmentAbilitiesByDetachment` called inside `DetachmentSection`) is correct for PlaybookTab's narrow context (one unit, one detachment at a time). Applied to a full list context — all stratagems, all units — the same pattern generates N queries. The N+1 pattern is not visible from the hook signature and existing components do not demonstrate the list-context version.

**How to avoid:**
For list-level displays, write batch queries (single SELECT with `WHERE id IN (...)` or `GROUP BY`) that return all needed data in one round trip. The existing precedents are `getArmyListReadiness` (batch readiness for multiple lists in one query) and the batch `getBatchStepCounts` pattern for recipe sections. For the Rules Browser: a single `getAllStratagemsByFaction` query. For Game Day units: either a batch abilities query or `Promise.all` for parallel (not sequential) fetches.

**Warning signs:**
- A `useQuery` hook called inside a `.map()` over a list (also violates Rules of Hooks if not wrapped in a proper component boundary)
- React Query Devtools showing N queries loading simultaneously when the Rules Browser or Game Day panel mounts
- UI noticeably slow to populate when the army list has more than 10 units or a faction has more than 20 stratagems

**Phase to address:**
Rules Data Hub UI phase (stratagems/detachment browser) and Game Day Mode phase (unit ability display). Query count must be part of each phase's success criteria.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store `detachment_id` only, no name copy | Simpler schema (one column) | Orphan display breaks silently after sync removes detachment | Never — always store name copy alongside the TEXT ID |
| useState for game day checklist | No migration needed | State lost on Sheet close or app restart | Only if checklist is explicitly documented as single-screen ephemeral with no resume requirement |
| Show all faction stratagems without detachment filter | Faster to build the list | Unusable at the table — 80+ stratagems with no context for the selected detachment | Never for Game Day mode; acceptable for a "browse all" reference view |
| Filter stratagems by detachment in JavaScript | No additional query | Re-runs on every render; wastes bandwidth for large stratagem sets | Never — filter with `WHERE detachment_id = $1` in SQL |
| Hardcode Wahapedia faction IDs ("SM", "CSM") | Quick fix for Space Marines | Breaks for any faction not in the hardcoded list; not maintainable | Never — use `useWahapediaFactionId` for all faction lookups |
| Invalidate all React Query keys after sync | Simplest invalidation logic | Forces refetch of all hobby data (collections, recipes, army lists) that did not change | Acceptable as a temporary shortcut; refine to rules-only keys in the same phase |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Detachment → Army List | Store `detachment_id` as a FK-referencing rules.db | Store `detachment_id TEXT` + `detachment_name TEXT` copy in `army_lists` (hobbyforge.db) |
| Stratagem favorites / user notes | Write to `rw_stratagems` or a new table in rules.db | New hobbyforge.db table with `stratagem_id TEXT` + `stratagem_name TEXT` copy columns |
| Game Day stratagems by phase | Derive grouping in JSX inline | Reuse the `stratagemsByPhase` Map memo pattern from PlaybookTab; do not duplicate the grouping logic |
| Post-sync cache invalidation | Omit new hook key from `useRulesSync` invalidation list | Audit every new `useQuery` against rules.db and add its key to the sync invalidation block in the same commit |
| Points in Game Day or Army Lists 2.0 | Show raw `u.points` from rules import as authoritative | Only show `effective_points` (3-level COALESCE result) — never raw Wahapedia-sourced points |
| Rules Browser faction filter | Pass HobbyForge `faction.id` integer to rules queries | Always translate via `useWahapediaFactionId(faction.name)` first to get the Wahapedia string ID |
| Sync trigger from Game Day | Auto-sync on Game Day open to guarantee fresh data | Never auto-sync — user-triggered only; show freshness badge + manual sync button |
| Detachment stratagems | Show all faction stratagems in Game Day | Filter by `RwStratagem.detachment_id` when a detachment is selected on the army list |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 detachment ability fetches | Game Day slow to open; React Query Devtools shows 10–40 sequential queries | Batch queries with `IN (...)` or `GROUP BY`; parallel `Promise.all` as fallback | Any army list with more than 5 units or 3 detachments |
| Rendering all faction stratagems unfiltered | Rules Browser laggy scroll; 80+ React nodes visible at once | Filter by `detachment_id` or `phase` in SQL; virtualize long lists | Factions with more than 30 stratagems (Space Marines, Chaos Space Marines) |
| Missing `staleTime: Infinity` on rules hooks | Background refetch triggers mid-game rerender | Set `staleTime: Infinity` on every `useQuery` against `getRulesDb()` | Immediately visible after the default 5-minute staleTime expires |
| Snapshot capture adding latency to sync | Extra 200–500ms per sync as 11 tables are read sequentially before bulk insert | Do not add more sequential reads to the snapshot path; keep snapshot table count stable | Only noticeable if snapshot tables increase beyond current 11 |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Rules Browser with no "sync required" empty state | User opens rules browser before first sync, sees a blank list with no explanation | Show "Sync community data to see rules" empty state with a sync button — same pattern as PlaybookTab `!syncMeta` banner |
| Game Day showing all faction stratagems instead of detachment-filtered | User must scroll through 80+ stratagems to find the 10–15 relevant to their detachment | Filter stratagems by `detachment_id` when a detachment is selected; show all only in a "browse" mode |
| Stale detachment warning with no acknowledgement | Warning badge persists after user intentionally keeps old detachment selection | Allow user to dismiss/acknowledge the stale warning; persist the acknowledgement in hobbyforge.db |
| Favorites or notes gated behind unit-datasheet linkage | User wants to favorite a stratagem from the Rules Browser but has not linked any unit | Favorites must be accessible from the Rules Browser directly, not gated by unit datasheet state |
| Game Day checklist resetting on Sheet close | User navigating away to check a unit's stats loses all in-game checklist progress | Persist game session state in Zustand store (not component state) so it survives Sheet unmount |

---

## "Looks Done But Isn't" Checklist

- [ ] **Rules Browser empty state:** Rules page renders for a user who has never synced — verify a "sync required" empty state (not a blank page) appears and offers a sync button
- [ ] **Detachment stratagem filter:** Game Day stratagem list is filtered by selected `detachment_id`, not showing all 80+ faction stratagems — verify with a faction that has multiple detachments (Space Marines has 6+)
- [ ] **Post-sync stale detachment detection:** After syncing with a modified dataset, army lists referencing now-absent detachments show a warning — verify by testing with a known detachment ID absent from rules.db
- [ ] **Sync invalidation for new hooks:** After a sync, the Rules Browser and Game Day data refresh without requiring an app restart — verify by checking data updates after triggering sync with the Rules Browser already open
- [ ] **User notes survive sync:** Notes written on a stratagem or detachment survive the next sync — verify by writing a note, syncing, and confirming the note is still visible
- [ ] **Orphan note display:** A note on a stratagem removed by sync shows the stored `stratagem_name` copy and a "removed in last sync" indicator — verify by clearing the relevant rw_stratagems rows manually
- [ ] **Copyright framing:** No UI element says "official rules" or "Warhammer 40K Rules" as an authoritative title — verify all section headings use neutral terminology ("Community Rules," "Stratagems," "Detachments")
- [ ] **No auto-sync:** App does not fetch from Wahapedia on startup, on timer, or on Game Day open — verify by monitoring network calls at app start and Game Day mount
- [ ] **Points display:** Army list total shown in Game Day and Army Lists 2.0 uses `effective_points` (3-level COALESCE), not raw `u.points` — verify with a unit that has a points override active
- [ ] **Wahapedia faction ID translation:** Rules Browser and Game Day faction filter works for all seed factions — verify `useWahapediaFactionId` returns a non-null result for each faction in the DB

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| User data written to rules.db and lost after sync | HIGH | Add hobbyforge.db migration for the affected table; data cannot be automatically recovered — it was deleted by the sync DELETE pass |
| Cross-DB JOIN attempted, runtime error | MEDIUM | Rewrite query as dual-query merge: two separate `db.select()` calls merged in TypeScript; no migration needed |
| staleTime missing on rules hook | LOW | Add `staleTime: Infinity` to the hook options; add the query key to the sync invalidation list |
| COALESCE chain diverged between two query sites | MEDIUM | Identify the correct chain; update both sites atomically in one commit; add comment at each site |
| Orphaned user notes after sync removes rule | MEDIUM | Add `rule_name TEXT` column via migration with a one-time backfill SELECT from rules.db (must run before next sync erases the source names) |
| N+1 queries in rules browser or Game Day | MEDIUM | Rewrite per-entity hooks to batch queries with `IN (...)` or `GROUP BY`; update hook signatures to accept ID arrays |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Writing user data to rules.db | v0.2.8 schema design phase | Zero `db.execute()` calls using `getRulesDb()` — all user writes use `getDb()` |
| Cross-DB JOIN via ATTACH | Army Lists 2.0 detachment phase | No `ATTACH` keyword in any SQL string; detachment name display uses dual-query merge |
| 3-level COALESCE broken | Any phase touching `armyLists.ts` | Both `getArmyListWithUnits` and `getArmyListReadiness` COALESCE expressions are identical |
| Missing staleTime or sync invalidation | Rules Data Hub UI phase + every phase adding rules hooks | Every rules hook has `staleTime: Infinity`; every new key appears in `useRulesSync` invalidation |
| Wahapedia faction ID bypassed | Rules Data Hub UI phase (standalone rules page) | Rules browser calls `useWahapediaFactionId` — never passes an integer `faction.id` |
| User note orphan after sync | Playbook enhancements phase (user notes on rules) | Schema includes `rule_name TEXT` copy; orphan indicator renders when rule ID absent from rules.db |
| Game Day checklist as component state | Game Day Mode architecture phase | Checklist state survives Sheet open/close; persistence contract documented |
| Stale detachment after sync | Army Lists 2.0 phase + post-sync validation | Post-sync validation runs; stale detachment warning appears in Army List detail sheet |
| Copyright framing | Rules Data Hub UI phase | No "official" or "Warhammer 40K Rules" labels in UI; Wahapedia attribution visible; no auto-sync |
| N+1 queries in list views | Rules Data Hub UI + Game Day phases | React Query Devtools shows 1–3 queries on rules browser open; batch queries used for all list views |

---

## Sources

- `C:\Documents\Claude Apps\Warhammer App\.planning\PROJECT.md` — Key Decisions table (all established patterns: ATTACH not supported, overrides in hobbyforge.db, weapon_name TEXT copy, COALESCE chain, cache invalidation symmetry rule, local-first sync contract)
- `src/db/queries/syncErrors.ts` — CRITICAL comment: "Uses getDb() (hobbyforge.db), NOT getRulesDb() (rules.db). rules.db is fully DELETEd on every sync"
- `src/db/queries/rulesSnapshot.ts` — established dual-DB read/write pattern (reads rules.db, writes to hobbyforge.db)
- `src/db/queries/armyLists.ts` — COALESCE chain duplicated in `getArmyListWithUnits` and `getArmyListReadiness`; full-replacement UPDATE contract for points_override
- `src/db/queries/rulesExtended.ts` — `staleTime: Infinity` pattern for rules hooks; faction ID is string, not integer
- `src/hooks/useRulesExtended.ts` — `staleTime: Infinity` on all four hooks; sync invalidation contract
- `src/features/units/PlaybookTab.tsx` — `useWahapediaFactionId` translation call; dual-query merge pattern; sync-empty banner (`!syncMeta`); orphan-safe post-sync diff display; `stratagemsByPhase` Map grouping memo
- `src-tauri/migrations/017_unit_overrides.sql` — canonical hobbyforge.db-only user data table with TEXT ID copy pattern
- `src/types/datasheet.ts` — Wahapedia IDs are TEXT strings (zero-padded), not integers; stat fields are mixed TEXT/INTEGER types

---
*Pitfalls research for: HobbyForge v0.2.8 — Rules Data Hub UI, Army Lists 2.0, Game Day Mode, Playbook enhancements*
*Researched: 2026-05-10*
