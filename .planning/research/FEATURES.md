# Feature Research

**Domain:** Local-first hobby management desktop app (Warhammer 40K) — data integrity, diagnostics, backup, next-action dashboard, post-game review
**Researched:** 2026-05-14
**Milestone:** v0.2.13 Data Integrity, Diagnostics & Product Coherence
**Confidence:** HIGH (grounded in existing codebase inspection + competitor app research)

---

## Context: What Is Already Built

This is a subsequent milestone. The following are already shipped and must not be re-scoped here:

- Battle log with fields: date, opponent faction, mission, result, VP scores, army list link, MVP unit, underperforming unit, lessons learned, changes next time, notes
- BattleLogSummaryBar: total games, W/L/D counts, win rate
- Game Day mode: CP tracker, phase-grouped stratagems, OPG toggles, pre-game checklist (Zustand/localStorage), pre-game readiness panel (points, freshness, warnings, role coverage)
- Dashboard: CurrentFocusCard with workflow position and step index, ActiveProjectsPanel, ArmyReadinessCard, KanbanCards, FactionSummaryCards, HobbyPipeline, RecentActivityFeed
- Army list validation: health summary panel with hard warnings, points freshness badges, ownership %, readiness %, tactical role coverage
- Points system: 5-level COALESCE chain (army-list override > unit override > synced > manual > 0), PointsFreshnessBadge, per-unit delta previews
- Applied recipe progress: per-unit step-by-step checklist, recipe assignment system, AppliedRecipesTab
- Data-layer tests: 14 tests via better-sqlite3

The features below are NEW for v0.2.13.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a personal data app at this maturity. Missing these makes the app feel fragile or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Manual backup — export DB to user-chosen path | Personal data apps must not trap your data. A single "Export Backup" action is the minimum expectation for any app that stores irreplaceable personal data locally. | LOW | Tauri `dialog.save()` + Rust `fs::copy` for hobbyforge.db. No schema change. SQLite WAL mode makes a concurrent file copy safe. |
| Post-game logging from Game Day context | Any tabletop game tracker (Tabletop Battles, BattleBase) lets you log a result immediately after a game. HobbyForge's Game Day mode has no "End Game" exit that carries context to the battle log. The gap makes Game Day a dead end rather than a loop. | MEDIUM | Pre-fill BattleLogSheet from Game Day context: army list ID from gameDayStore, date = todayISO(). BattleLogSheet already exists and accepts all fields. New work: an "End Game" button in GameDayHeader + Sheet portal from GameDayPage. |
| Data health summary — category-level counts of broken or incomplete records | Power users and anyone who has done multiple syncs expect to audit data coherence. Personal finance apps (Quicken, Lunch Money) surface import errors and orphaned references as table stakes for data-heavy tools. | MEDIUM | Pure SQL read queries, no new schema. New read-only Diagnostics page surfacing issue categories with counts. |
| Points source labeling — which source is active per unit | The existing 5-level COALESCE chain and freshness badge system implies this level of transparency. Showing `450 pts` with no attribution is incomplete once a freshness/stale system already exists. | LOW | Source classification is fully derivable from existing tables (unit_overrides, synced_unit_points, army_list_units). Display-only PointsSourceChip component. No new queries beyond reading existing columns. |
| Split list-level vs unit-level warnings | Army list validation currently mixes structural list issues (no detachment, over limit) with per-unit issues (unit stale, not owned). These are distinct concern levels. Mixing them produces noise and makes the warnings panel hard to act on. | LOW | UI refactor of the existing health panel. No data changes. No query changes. |
| Applied recipe progress identity hardening (order_index → recipe_step_id) | Applied recipe progress is keyed on order_index, which is unstable when steps are reordered or re-inserted. As soon as the non-destructive save (REC-02 from v0.2.11) allows in-place step updates, the keying must be stable or progress records silently mistrack. | MEDIUM | Migration: add recipe_step_id FK column to applied_recipe_progress, backfill from order_index join, drop order_index key column. Query updates to use step ID as identity. |
| Transactional recipe graph save (atomic sections + steps) | With non-destructive save (REC-02) now shipped, the delete-phase/insert-phase sequence can fail halfway, leaving a partially saved recipe. A transaction wrapper prevents partial writes. | LOW | Wrap the existing five-phase diff save in a single SQLite transaction. Tauri plugin-sql supports `BEGIN`/`COMMIT` via raw queries. No schema change. |

### Differentiators (Competitive Advantage)

Features that go beyond the minimum and give HobbyForge its "command center" identity.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dashboard next-action card — current step description on CurrentFocusCard | GTD research identifies the most effective productivity UX as giving one concrete physical action, not a category. CurrentFocusCard already shows step index and section name but not step text. Adding the actual step description ("Apply Agrax Earthshade to recesses") transforms the card from status display to directive instruction. | LOW | One JOIN added to the workflow position query to fetch current step name from recipe_steps. One text line added to CurrentFocusCard. Existing workflowPosition type extended with optional stepName field. |
| Data Health page — actionable issue list with inline fix shortcuts | CMS health dashboards (Umbraco Health Check, Vincere Data Integrity Dashboard) show category grouping, severity levels, and an inline "Fix" action per issue. For HobbyForge: fix shortcuts for safe automated repairs (delete orphaned progress rows, unlink cleared session FKs) differentiate from a purely read-only diagnostic list. | HIGH | Most complex feature in the milestone. Requires identifying all broken FK references, stale progress records, and orphaned assignments. Fix actions call existing mutations. Must not auto-fix on load. |
| After-action review analytics — per-mission and per-faction win rates on the battle log page | Tabletop Battles (Goonhammer) exposes stats filterable by mission and faction. This is the competitive baseline for any 40K battle tracker. HobbyForge's existing summary bar shows aggregate W/L/D only. Adding per-mission and per-opponent-faction breakdowns closes the analytics gap and surfaces patterns a hobbyist can act on (e.g. consistently losing on specific missions). | MEDIUM | New SQL aggregation queries on battle_logs. No schema change. Renders as a collapsible "Performance breakdown" panel below the existing BattleLogSummaryBar. |
| Centralized points resolver — extracted pure function with source classification | The 5-level COALESCE logic currently lives inside SQL strings scattered across three query sites. Extracting it to a typed TypeScript function makes it testable, ensures consistent behavior across army lists, diagnostics, and game day, and enables source labeling without duplicating classification logic. | MEDIUM | New `resolvePoints(unit, overrides, syncedPoints)` pure function in src/lib/. Returns `{ value: number, source: PointsSource }`. All three query sites use the same function. Enables PointsSourceChip as a downstream display consumer. |
| Unit-to-rules mapping confirmation layer — surface units with no Wahapedia match | Units created manually may have names that don't match Wahapedia's exact unit names, causing the rules sync to never populate their stats/abilities. There is currently no way to discover which units are orphaned from rules data. A confirmation layer surfaces unmapped units and lets the user accept the mapping via the existing datasheet import flow. | MEDIUM | New query: JOIN units against synced rules data to identify units with no matched stats. List displayed on Diagnostics page or Unit collection page as a filter preset. Leverages existing DatasheetPicker and DatasheetImportDialog. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-backup on schedule | Users worry about data loss | Tauri has no background daemon API. Scheduled backups on Windows require OS-level Task Scheduler integration — out of scope and introduces silent failure modes with no feedback surface. | Manual "Export Backup" button on the Diagnostics/Settings page. Clear guidance to back up before syncs. |
| Cloud backup / sync to Dropbox or OneDrive via API | Users want off-site safety | Contradicts local-first, no-accounts design. Adds auth surface, network dependency, and privacy exposure for a personal tool containing purchase data and game history. | Export to any local folder. Users whose local folder is inside OneDrive/Dropbox get cloud backup automatically — HobbyForge does nothing extra. |
| Automatic data integrity repair on startup | Self-healing sounds robust | Silently modifying user data without consent is a trust violation. Auto-fixes can cascade (deleting "orphaned" progress that the user simply hasn't acted on yet). | Show issues on the Diagnostics page. User initiates each fix explicitly. Startup is read-only. |
| Per-round VP tracking in Game Day (turn-by-turn score) | Competitive players want granular reconstruction | Requires in-game manual entry per turn — disruptive to play. Tabletop Battles' CP-per-round feature is the ceiling for casual tools. This is out of scope for a hobby management app. | Final VP scores in the existing BattleLogSheet my_score / opponent_score fields are sufficient for the target user (hobbyist, not competitive). |
| Army list snapshot versioning for per-list-version analysis | Users want to compare "list A from March" vs "list B from April" performance | Requires versioning army lists (immutable snapshots at game time). The current schema links battle_log to a mutable army_list_id. Adding versioning is a major schema change. | Use the existing "notes" field in BattleLogSheet to note list version or key changes. Versioning is a v0.3+ concern. |
| AI-generated next-action or coaching suggestions | Seems natural for a "what to do next" card | Requires LLM API calls (network, API keys, cost), contradicts local-first design, and LLM training data on Warhammer hobby workflows is thin. | Deterministic rule-based next-action derivation from workflow position + step description. Already sufficient, zero latency, zero cost. |
| Restore from backup (v0.2.13 scope) | Natural complement to export | Restore requires closing the DB connection, replacing the file, and restarting the app. Tauri plugin-sql does not expose a disconnect API from the frontend — the Rust command must manage the connection lifecycle. This is non-trivial and carries data loss risk if done wrong. | Ship export in v0.2.13. Flag restore as v0.2.14 follow-up once the export format and file path conventions are proven. |

---

## Feature Dependencies

```
Applied recipe identity hardening (order_index → recipe_step_id)
    └──required-before──> Transactional recipe graph save
          (transaction must write to stable identity columns)
    └──required-before──> Data Health diagnostics page
          (diagnostics audits progress records; unstable keys produce false positives)
    └──required-before──> any future recipe analytics

Transactional recipe graph save
    └──required-before──> Data Health diagnostics page
          (partial saves would produce spurious orphan counts)
    └──independent-of──> all user-facing feature changes

Centralized points resolver (pure TypeScript function)
    └──required-before──> Points source labeling (PointsSourceChip)
          (chip is a display consumer of the resolver's source output)
    └──enhances──> Army list health panel, diagnostics page, game day readiness panel
    └──independent-of──> backup, next-action card, after-action analytics

Points source labeling (PointsSourceChip)
    └──requires──> Centralized points resolver
    └──enhances──> ArmyListSheet unit rows, army list health summary panel
    └──independent-of──> all other v0.2.13 features

Split warnings (list-level vs unit-level)
    └──refactors──> Existing ArmyListHealthPanel rendering
    └──independent-of──> all data changes
    └──dependency-of──> Game Day readiness panel (GD-01 already reads warnings)

Dashboard next-action card (step description on CurrentFocusCard)
    └──requires──> Recipe step query returning step name for current step index
    └──enhances──> CurrentFocusCard (existing component)
    └──independent-of──> all other v0.2.13 features

Game Day End Game flow
    └──requires──> BattleLogSheet (existing — accepts army_list_id pre-fill)
    └──requires──> New GameDayHeader action button
    └──enhances──> Post-game review loop (closes Game Day → Battle Log gap)
    └──independent-of──> Data Health, Backup, points resolver

Data Health / Diagnostics page
    └──requires──> Applied recipe identity hardening (stable progress records)
    └──requires──> Transactional recipe save (no partial write artifacts)
    └──reads──> All tables: units, army_list_units, recipe_steps, applied_recipe_progress,
                painting_sessions, synced_unit_points, unit_overrides
    └──calls──> Existing mutations for fix shortcuts (useDeleteAppliedProgress, etc.)
    └──independent-of──> Backup / restore

Unit-to-rules mapping confirmation
    └──reads──> units table + synced rules data (rules.db or synced_unit_points)
    └──leverages──> Existing DatasheetPicker and DatasheetImportDialog
    └──can-surface-on──> Diagnostics page OR Collection page filter preset
    └──independent-of──> all other v0.2.13 features

After-action review analytics
    └──reads──> battle_logs table (existing)
    └──enhances──> BattleLogPage (collapsible panel below summary bar)
    └──independent-of──> all other v0.2.13 features

Manual backup / export
    └──requires──> New Rust Tauri command: copy hobbyforge.db to user path
    └──requires──> Tauri Dialog plugin save() (already available)
    └──independent-of──> all feature changes (pure infrastructure)
    └──dependency-of──> Restore (restore requires a backup to exist, ships later)
```

### Dependency Notes

- **Identity hardening before diagnostics:** The diagnostics page audits `applied_recipe_progress` for orphaned step references. If progress is still keyed on unstable order_index values, many records will appear broken when they are merely miskeyed. Fix the identity first so diagnostics results are trustworthy.
- **Transactional save before diagnostics:** A partial recipe save leaves the DB in a state where orphan counts are inflated. The transaction wrapper is a prerequisite for the diagnostics page to report meaningful numbers.
- **Centralized resolver before source chip:** The PointsSourceChip is a display consumer. The resolver must exist as a typed function before the chip can render its output. This is a clean dependency: resolver ships in a query/lib phase, chip ships in a UI phase.
- **Game Day End Game is self-contained:** BattleLogSheet already accepts all fields including army_list_id. The only work is a new button in GameDayHeader and the Sheet portal plumbing. This can ship in any phase after the overall app structure is stable.
- **Backup is infrastructure, not a feature dependency:** The export Rust command does not depend on any schema or query changes. It can ship in any phase.

---

## MVP Definition for v0.2.13

### Ship in v0.2.13 Core (P1)

- [ ] Applied recipe progress identity hardening (order_index → recipe_step_id) — data correctness prerequisite for diagnostics
- [ ] Transactional recipe graph save — prevents partial-write artifacts in diagnostics
- [ ] Centralized points resolver extracted as pure TypeScript function — enables source labeling and consistent behavior
- [ ] Points source labeling (PointsSourceChip on army list unit rows) — transparency for daily-use feature
- [ ] Split list-level vs unit-level warnings — low cost, high signal clarity improvement
- [ ] Dashboard next-action step text on CurrentFocusCard — single highest-impact UX improvement
- [ ] Game Day End Game flow → BattleLogSheet pre-fill — closes the play loop
- [ ] Data Health / Diagnostics page (read-only tier + fix shortcuts for common issues) — trust and power-user feature
- [ ] Manual backup / export (hobbyforge.db to user-chosen path) — baseline data safety

### Add After Core is Stable (P2)

- [ ] After-action review analytics (per-mission / per-faction win rates) — no data changes, can ship any time
- [ ] Unit-to-rules mapping confirmation layer — surfaces unmapped units for re-linking
- [ ] Version parity check script — developer quality-of-life

### Future Consideration (v0.3+)

- [ ] Restore from backup — requires safe DB connection lifecycle management in Rust
- [ ] Auto-backup on schedule — requires OS-level scheduler integration
- [ ] Army list snapshot versioning — major schema change for per-version performance analysis
- [ ] Per-round VP tracking in Game Day — out of scope for hobbyist target user

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Applied recipe identity hardening | HIGH (data correctness prerequisite) | MEDIUM | P1 |
| Transactional recipe save | HIGH (data loss prevention) | LOW | P1 |
| Centralized points resolver | HIGH (enables multiple downstream features) | MEDIUM | P1 |
| Points source labeling | HIGH (transparency, daily use on army lists) | LOW | P1 |
| Split list/unit warnings | HIGH (signal clarity, daily use) | LOW | P1 |
| Dashboard next-action step text | HIGH (command center UX payoff) | LOW | P1 |
| Game Day End Game flow | HIGH (closes play loop, zero new schema) | MEDIUM | P1 |
| Data Health / Diagnostics page | HIGH (trust, power-user feature) | HIGH | P1 |
| Manual backup / export | HIGH (data safety expectation) | LOW-MEDIUM | P1 |
| After-action review analytics | MEDIUM (pattern analysis for hobbyist) | MEDIUM | P2 |
| Unit-to-rules mapping confirmation | MEDIUM (sync accuracy surface) | MEDIUM | P2 |
| Version parity check script | LOW (developer tool) | LOW | P2 |
| Restore from backup | MEDIUM (complement to export) | MEDIUM | P2/v0.3 |

---

## Competitor Feature Analysis

| Feature Area | Tabletop Battles (Goonhammer) | BattleBase | HobbyForge v0.2.13 target |
|---|---|---|---|
| Post-game logging | In-game VP tracking + after-game stats entry; Greg-Bot prompts photos | Real-time dual-player score + post-game stats | BattleLogSheet pre-filled from Game Day End Game action; existing MVP/underperforming/lessons fields |
| Game stats / analytics | Win rate, avg VP, streaks, filter by mission/faction | Win/loss ratio, avg scores, livestream overlay | Per-mission and per-faction win rates added to BattleLogPage |
| Data backup | Cloud sync (requires account, network) | Cloud sync (requires account) | Manual export to local file (local-first constraint); no cloud |
| Data health | No diagnostics page | No diagnostics page | New Diagnostics page: category-grouped issues, severity levels, inline fix shortcuts |
| Points attribution | No source labeling | No source labeling | PointsSourceChip: synced/override/manual/fallback label inline on army list rows |
| Next action | No workflow guidance | No workflow guidance | CurrentFocusCard shows current recipe step description as concrete action |

---

## Implementation Notes by Feature Area

### Applied Recipe Identity Hardening

The `applied_recipe_progress` table is currently keyed on `(recipe_assignment_id, order_index)`. When steps are reordered or re-inserted, the order_index values change, causing progress records to track the wrong steps silently.

**Migration approach:** Add `recipe_step_id INTEGER REFERENCES recipe_steps(id) ON DELETE CASCADE` to `applied_recipe_progress`. Backfill by joining against `recipe_steps.order_index` for existing records. Drop the order_index key column (requires SQLite table-recreation workaround). Update query functions to write and read by step ID.

**Downstream benefit:** Diagnostics page can now reliably detect truly orphaned progress (step was deleted) vs miskeyed progress (step was reordered but still exists).

### Data Health / Diagnostics Page

**Issue categories and queries (all pure SQL on existing tables):**

*Errors (data is broken):*
- Orphaned applied_recipe_progress: steps whose recipe_step_id no longer exists in recipe_steps
- Orphaned painting_sessions: sessions whose recipe_id no longer exists in painting_recipes
- Army list units referencing units not in the collection

*Warnings (data is incomplete or stale):*
- Units with no faction assigned (faction_id IS NULL)
- Units in army lists with effective_points = 0 and no override set (invisible zero-point entries)
- Units with stale synced points (is_fresh = 0) and no manual override

*Info (suggestions):*
- Recipe steps with a paint_id referencing a paint that no longer exists
- Units with no Wahapedia rules mapping (no entry in synced stats tables)

**UI pattern:** Category grouping with severity color coding. Each issue type shows count. Expandable list of affected records. Inline "Fix" button for safe automated repairs only (e.g. delete orphaned progress rows). No auto-fix on page load.

**Complexity: HIGH** — Multiple aggregation queries across all tables, fix actions touching multiple React Query cache keys. This is the most complex feature in the milestone.

### Dashboard Next-Action Step Text

CurrentFocusCard already receives `workflowPosition` which includes `stepIndex` and `sectionName` but not the step text. The workflow position hook queries the recipe steps by index. Adding a `stepName?: string` field to the `WorkflowPosition` type requires one JOIN in the position computation query: `LEFT JOIN recipe_steps rs ON rs.section_id = ... AND rs.order_index = stepIndex`.

The card renders: `"Next: [stepName]"` as a single line below the workflow section/step count display. This turns the card from "you are at step 3 of 7 in Shading" to "Next: Apply Agrax Earthshade to recesses."

**Complexity: LOW** — One query JOIN, one type field, one text line in the card.

### Game Day End Game Flow

The `gameDayStore` already holds `listId` (the army list in use for the current Game Day session). The new "End Game" button in `GameDayHeader` triggers opening `BattleLogSheet` with:
- `army_list_id = gameDayStore.listId`
- `battle_date = todayISO()`
- All other fields blank (user fills in VP, opponent, result)

After saving, optionally prompt to reset Game Day CP and checklist state (the existing `resetGameDay` action in the store).

The BattleLogSheet sibling portal pattern (Sheet owned by the parent page, not a nested child) is already established across the codebase. GameDayPage or its containing route component needs to own the Sheet open state.

**Complexity: MEDIUM** — New button + routing state plumbing. No new schema or queries.

### Manual Backup / Export

**Rust Tauri command implementation:**
```rust
#[tauri::command]
async fn export_backup(app: tauri::AppHandle, destination: String) -> Result<(), String> {
    let db_path = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("hobbyforge.db");
    std::fs::copy(&db_path, &destination)
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

**Frontend flow:** "Export Backup" button → `dialog.save({ defaultPath: "hobbyforge_backup_YYYY-MM-DD.db", filters: [{ name: "SQLite", extensions: ["db"] }] })` → call Rust command with selected path → toast success with file path.

**SQLite WAL safety:** In WAL mode (already set on rules.db; hobbyforge.db uses default journal mode), a file copy captures a consistent snapshot. If hobbyforge.db is using the default rollback journal mode, the copy is still safe during normal operation (no concurrent writers in a single-user desktop app), but a WAL checkpoint would be cleaner. The Rust command can run `PRAGMA wal_checkpoint(FULL)` via sqlx before copying if needed.

**Complexity: LOW-MEDIUM** — Mostly Rust plumbing. The Tauri Dialog plugin is already in use.

### After-Action Review Analytics

New SQL aggregation on `battle_logs`:

```sql
-- Per-mission win rates
SELECT mission,
       COUNT(*) as games,
       SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) as wins
FROM battle_logs
GROUP BY mission
ORDER BY games DESC

-- Per-opponent-faction win rates
SELECT opponent_faction,
       COUNT(*) as games,
       SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) as wins
FROM battle_logs
GROUP BY opponent_faction
ORDER BY games DESC
```

Displayed as a collapsible "Performance Breakdown" panel below the existing BattleLogSummaryBar. Only shown when there are 3+ games (below that, percentages are misleading).

**Complexity: MEDIUM** — Two new query functions, one new hook, one new collapsible panel component.

---

## Sources

- Codebase: `src/features/battle-log/BattleLogSheet.tsx` — confirms existing post-game fields (MVP unit, underperforming unit, lessons learned, changes next time); battle_date, army_list_id pre-fill points
- Codebase: `src/features/dashboard/CurrentFocusCard.tsx` — confirms workflowPosition has stepIndex but not step text; recipe name display
- Codebase: `src/features/game-day/ChecklistTab.tsx` — confirms Game Day uses Zustand/localStorage; gameDayStore holds listId
- Codebase: `src/features/battle-log/BattleLogSummaryBar.tsx` — confirms existing aggregate summary bar (W/L/D + win rate only, no per-mission breakdown)
- Tabletop Battles (Goonhammer) — post-game stats, per-mission/faction filtering, avg VP, Greg-Bot photo prompts confirmed at https://www.goonhammer.com/the-official-launch-of-tabletop-battles/ (HIGH confidence)
- BattleBase — win/loss ratio, avg scores, real-time dual-player tracking confirmed at https://www.battlebase.app/ (MEDIUM confidence)
- Umbraco Health Check + Vincere Data Integrity Dashboard — category grouping, severity levels, inline fix pattern (MEDIUM confidence — WebSearch)
- Obsidian Local Backup plugin / Notion export — manual export to user path is the standard local-first backup UX (MEDIUM confidence — WebSearch)
- Tauri Dialog plugin `save()` confirmed at https://v2.tauri.app/plugin/dialog/ (HIGH confidence)
- GTD next-action research (Super Productivity, Notion GTD patterns) — one concrete physical action per context, not a list (MEDIUM confidence — multiple sources)
- SQLite backup strategies — WAL-mode file copy is safe for single-writer desktop apps (MEDIUM confidence — Sling Academy, SQLite docs)

---

*Feature research for: HobbyForge v0.2.13 — Data Integrity, Diagnostics & Product Coherence*
*Researched: 2026-05-14*
