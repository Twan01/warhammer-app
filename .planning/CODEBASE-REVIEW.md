---
status: critical
kind: codebase-review
date: 2026-06-12
scope: entire codebase (src/ + src-tauri/)
method: multi-agent (30 review units, adversarial verification of Critical/Warning)
depth: standard
files_reviewed: 405
review_units: 30
findings:
  critical: 4
  critical_real: 1
  critical_false_positive: 3
  warning: 29
  info: 98
  total: 131
note: >
  Critical/Warning findings survived an automated adversarial verification pass.
  Post-review human verification found CR-002/003/004 to be FALSE POSITIVES: the
  verifier reasoned about per-connection PRAGMA but missed that sqlx 0.8 defaults
  foreign_keys=ON and applies it to every pooled connection (sqlx-sqlite
  options/mod.rs:185), so FK enforcement IS reliable pool-wide. The team's own
  debug doc empirically corroborates (an FK constraint fired on a different pool
  connection). Only CR-001 is a real Critical. Info findings are unverified.
---

# Codebase Review — HobbyForge

Full-tree review run as a 30-unit multi-agent sweep (54 agents incl. verification) on 2026-06-12 at commit `1a84d9b4`. Every Critical and Warning below was re-checked by an independent adversarial verifier that defaulted to refutation; confirmed false-positives were removed. Info findings are from the first pass and were not individually verified.

## Summary

| Severity | Count |
|---|---|
| Critical | 4 |
| Warning | 29 |
| Info | 98 |
| **Total** | **131** |

### Headline (CORRECTED after human verification)

The original headline claimed 3 of 4 Criticals shared a broken-FK-enforcement root cause. **This was wrong** — see below.

**CR-002, CR-003, CR-004 are FALSE POSITIVES.** They claimed FK enforcement is OFF on most pooled connections because `PRAGMA foreign_keys = ON` in `client.ts` only covers one connection. But **sqlx 0.8 defaults `foreign_keys = ON` in `SqliteConnectOptions` and applies it to every connection the pool opens** (`sqlx-sqlite-0.8.6/src/options/mod.rs:185`; tauri-plugin-sql calls `Pool::connect` → `SqliteConnectOptions::from_str`, which keeps the default pragmas). The team's own `.planning/debug/recipe-section-save-fails.md` empirically corroborates: an FK constraint *fired* on a different pooled connection (it would have silently succeeded if FK were off). FK enforcement, `ON DELETE CASCADE/SET NULL/RESTRICT`, and the delete-guard pattern are all reliable pool-wide. No code change required; `client.ts`'s comment was corrected to stop this misconception recurring.

**The real, related issue** the original investigation surfaced is cross-connection **atomicity**, not FK enforcement: explicit `BEGIN/COMMIT` across multiple `db.execute()` calls is unsafe over a pool. That manifests as the genuine Warning-level findings on non-atomic multi-statement writes (recipe save, snapshot restore, etc.).

**CR-001 is the only real Critical** — an independent faction data-loss regression (fixed: COALESCE on the three nullable columns).

---

## Critical findings (4)

### CR-001 — Partial faction update silently wipes description, icon_path, and lore_notes

- **Severity:** Critical (verified ✓)
- **Category:** DataIntegrity
- **Unit:** factions
- **Location:** `src/db/queries/factions.ts:30-42`

updateFaction assigns description = $4, icon_path = $6, and lore_notes = $7 with direct (non-COALESCE) values bound from input.description ?? null etc. UpdateFactionInput is Partial<CreateFactionInput>, so any caller that omits these fields nulls them out. DatabaseBrowserPage.tsx handleFactionLinkConfirm (line 180) calls updateFaction.mutateAsync({ id, wahapedia_faction_id }) with no description/icon_path/lore_notes — so linking a database faction to a collection faction silently erases that faction's existing description, icon path, and lore notes. The other columns (name, game_system, color_theme, wahapedia_faction_id) correctly use COALESCE; these three were left as direct assignment. FactionSheet.tsx is unaffected only because it always sends all fields. This matches the regression noted in .planning/debug/faction-creation-fails.md ('updateFaction changed from COALESCE to direct assignment').

**Recommendation:** Use COALESCE for the nullable optional columns too: description = COALESCE($4, description), icon_path = COALESCE($6, icon_path), lore_notes = COALESCE($7, lore_notes). If callers must be able to clear a field, switch to a build-the-SET-clause-from-present-keys approach so omitted fields are untouched while explicitly-null fields are cleared.

> _Verifier (confirmed):_ Verified at factions.ts:30-42. updateFaction uses COALESCE for name/game_system/color_theme/wahapedia_faction_id but DIRECT assignment for description=$4, icon_path=$6, lore_notes=$7, binding input.X ?? null. Since UpdateFactionInput = Partial<CreateFactionInput>, omitted fields bind null. DatabaseBrowserPage.tsx:180-183 handleFactionLinkConfirm calls updateFaction.mutateAsync({ id: collectionFactionId, wahapedia_faction_id: pendingUnit.faction_id }) with no description/icon_path/lore_notes. Schema (001_core_schema.sql:11,13) confirms description and icon_path are nullable TEXT, so the UPDATE will set them to NULL — silently erasing user-entered description, icon path, and lore notes whenever a collection faction is linked to a database faction. This is real, silent, user-data destruction. Critical is justified. The inline COALESCE comment (lines 27-29) even contradicts the actual SQL, confirming this is an unintended regression for these three columns.

### CR-002 — PRAGMA foreign_keys = ON applies to only one connection in the sqlx pool, not the whole app

- **Severity:** Critical (verified ✓)
- **Category:** DataIntegrity
- **Unit:** db-client
- **Location:** `src/db/client.ts:25-28`

tauri-plugin-sql v2.4.0 uses sqlx::Pool<Sqlite> (a connection pool). Database.load() returns a pool handle, and the three PRAGMA execs on lines 26-28 run on whichever single connection happened to service those calls. SQLite's foreign_keys and busy_timeout are PER-CONNECTION settings, so every later db.execute()/db.select() that acquires a different pooled connection runs with foreign_keys defaulting to OFF. The file header (lines 4-8) explicitly claims this prevents 'silent data corruption' from unenforced REFERENCES clauses, and CLAUDE.md/AGENTS.md state FK enforcement is a guarantee. In reality, ON DELETE CASCADE/RESTRICT and FK validation across the 39 ON DELETE clauses in migrations are NOT reliably enforced at runtime. This is confirmed by the team's own debug doc .planning/debug/recipe-section-save-fails.md (line 45: 'PRAGMA foreign_keys = ON set in client.ts only applies to ONE connection in the pool') and was the documented root cause of the recipe-section save failure. Real impact: orphaned child rows, missing cascade deletes, and inconsistent behavior depending on which pool connection serves a query.

**Recommendation:** Do not rely on a single startup PRAGMA. Options: (1) Set the pool's after_connect hook / connection URL to apply PRAGMA foreign_keys=ON and busy_timeout to EVERY connection — for sqlite this can be done via the connection string params or a Rust-side pool configuration in src-tauri (e.g. SqliteConnectOptions::foreign_keys(true)). (2) If staying in JS, constrain the pool to a single connection so the pragma sticks (max_connections=1), accepting reduced concurrency. (3) At minimum, correct the misleading header comment so future developers do not assume FK enforcement is guaranteed. Note journal_mode=WAL is fine here because WAL is a persistent database-level setting, but foreign_keys and busy_timeout are not.

> _Verifier (confirmed):_ Technically correct and corroborated by the team's own RESOLVED debug doc .planning/debug/recipe-section-save-fails.md, which names the exact root cause: tauri-plugin-sql v2.4.0 uses sqlx::Pool<Sqlite> (wrapper.rs line 27 cited), each db.execute() acquires a pooled connection, and 'PRAGMA foreign_keys = ON set in client.ts only applies to ONE connection in the pool.' Independently corroborated by src-tauri/src/lib.rs:574 where the UDB import opens a DIRECT sqlx::Connection (not the pool) specifically to control PRAGMA/transaction state per the line 567 comment. client.ts:26 runs the pragma once on the load() connection only. SQLite foreign_keys IS a per-connection setting, so REFERENCES enforcement and the 39 ON DELETE clauses are not reliably enforced on other pooled connections. The file header (lines 4-8) and CLAUDE.md both assert FK enforcement prevents 'silent data corruption' — a guarantee the pooled architecture does not keep. Critical severity stands: the documented data-integrity guarantee is false and was the confirmed cause of a real save failure. Note the realized impact is intermittent (depends which pooled connection serves the query) and the team mitigated transaction-related symptoms by switching to WAL auto-commit, but unenforced FK/CASCADE on most runtime queries remains.

### CR-003 — FK enforcement (foreign_keys=ON) is per-connection but the pool runs statements on different connections — cascades and delete-blocking become unreliable

- **Severity:** Critical
- **Category:** DataIntegrity
- **Unit:** db-queries-1
- **Location:** `src/db/queries/armyLists.ts:191-205, 226-244`

client.ts (lines 22-36) runs `PRAGMA foreign_keys = ON` exactly once, on whichever pooled connection serviced the first execute. tauri-plugin-sql wraps a sqlx::Pool<Sqlite> — the code itself acknowledges this in armyListSnapshots.ts/bsdataExtended.ts/recipeAssignments.ts ('each db.execute() may run on a different connection from the pool'). SQLite's `PRAGMA foreign_keys` is a PER-CONNECTION setting, so any pooled connection that did NOT receive the pragma has FKs OFF. This breaks two correctness assumptions in the delete paths: (1) deleteArmyList/restoreSnapshot rely on ON DELETE CASCADE / ON DELETE SET NULL to clean up army_list_enhancements and self-referencing leader_attached_to_id; (2) the explicit ordering comments assume FK constraints are active. On a connection without the pragma, deletes that should cascade/SET NULL will instead leave orphaned children or (with FK off) silently succeed where they should have been guarded.

**Recommendation:** Do not rely on per-connection PRAGMA with a pool. Either configure foreign_keys via the sqlx pool's after_connect hook in the Rust layer (src-tauri) so every pooled connection enables it, or pass `PRAGMA foreign_keys=ON;` as part of the connection string options. As written, FK-dependent behavior in these query functions is non-deterministic.

### CR-004 — deleteFaction/deletePaint rely on an FK violation throwing, but FK enforcement is not guaranteed on the executing pooled connection

- **Severity:** Critical
- **Category:** DataIntegrity
- **Unit:** db-queries-1
- **Location:** `src/db/queries/factions.ts:45-49`

deleteFaction (factions.ts L45-49) and deletePaint (paints.ts L64-68) intentionally have no guard query; their comments state the FK violation throws and the caller catches it to warn the user. This safety net only fires if `foreign_keys=ON` is active on the connection that runs the DELETE. Because the pragma is applied once per-pool-connection (see client.ts and the pool note above), a DELETE dispatched on a non-pragma'd pooled connection will succeed even when child rows reference the faction/paint, orphaning units/recipe_steps and bypassing the user warning entirely. This is a silent data-corruption path on the core delete flow.

**Recommendation:** Either guarantee foreign_keys=ON pool-wide (see root finding), or make these deletes safe regardless: pre-check for referencing rows (SELECT COUNT(*) FROM units WHERE faction_id=$1) and throw a typed error when non-zero, instead of depending on engine-level FK enforcement.

---

## Warning findings (29)

### WR-001 — Editing a unit silently wipes its Priority value

- **Severity:** Warning (verified ✓)
- **Category:** DataIntegrity
- **Unit:** units-forms-playbook
- **Location:** `src/features/units/UnitSheet.tsx:56`

buildDefaultValues (edit path) sets priority to String(unit.priority), where unit.priority is a number 1-4 (see src/types/unit.ts:40). This yields "1".."4". The Priority Select in UnitFormOptional.tsx (lines 96-101) only renders SelectItems valued by the label strings "Low"/"Medium"/"High"/"Critical" (PRIORITY_OPTIONS). The numeric string "3" matches no item, so the dropdown shows the "None" placeholder when editing a unit that has a priority. On submit, priorityToNumber("3") hits the default case and returns null (UnitSheet.tsx:240-252), so saving an edited unit silently clears its previously-set priority unless the user manually re-picks it.

**Recommendation:** Map the numeric priority back to its label in buildDefaultValues, e.g. priority: unit.priority != null ? PRIORITY_OPTIONS[unit.priority - 1] ?? null : null, so the form value matches the Select's label-based options and round-trips correctly.

> _Verifier (confirmed):_ Confirmed. Write path priorityToNumber (UnitSheet.tsx:240-253) stores priority as integer 1-4 (Low=1..Critical=4), and unit.priority is typed number|null (types/unit.ts:40). Read path buildDefaultValues line 56 sets priority to String(unit.priority) => '1'..'4'. The Priority Select (UnitFormOptional.tsx:96-101) only renders SelectItems valued by the label strings from PRIORITY_OPTIONS ['Low','Medium','High','Critical'] (unitSchema.ts:4) plus '__none__'. A numeric string '3' matches no item, so the trigger shows the 'None' placeholder when editing a unit that had a priority. On submit priorityToNumber('3') hits the default case and returns null (line 250-251), so saving an edited unit silently clears a previously-set priority unless re-picked. Real data-loss-on-edit; Warning is the right severity (no crash, recoverable by re-selecting).

### WR-002 — Override save writes imported stats, falsely flagging all stats as manual overrides

- **Severity:** Warning (verified ✓)
- **Category:** DataIntegrity
- **Unit:** units-forms-playbook
- **Location:** `src/features/units/PlaybookTab.tsx:202-206`

In handleSave, when a datasheet is linked the override payload op always passes the raw local stat state (move, toughness, save: saveStat, ...). After linking via handlePickerSelect -> applyIncomingStats, those local states are populated with the imported values. The upsert guard on line 204 is effectively always-true once any keywords/abilities text exists, because (keywords || null) !== null is true whenever keywords is non-empty (and keywords are auto-filled from the datasheet on import). So an override row gets written with non-null move/toughness/save/etc. equal to the imported values. Per unitOverrides.ts the convention is NULL = use imported, non-NULL = manual override, so isStatOverridden (PlaybookTab.tsx:139-144) then returns true for every stat and the UI shows the 'Manual override — imported value: …' pencil/tooltip on stats the user never overrode. It also makes 'Clear all overrides' necessary to revert state the user never intentionally set.

**Recommendation:** Only write stat columns into the override when they actually differ from the imported value (reuse the hasStatOvr per-key logic to null out non-overridden stats), and tighten the upsert guard so equal keywords/abilities are stored as null rather than always treated as overrides. Replace the always-true (keywords || null) !== null / (abilities || null) !== null checks with comparisons against the imported keywords/abilities.

> _Verifier (confirmed):_ Confirmed. After linking, applyIncomingStats (lines 170-187) populates the previously-null local stat state with imported values (setMove(coerceStatToNumber(m0.M)) etc.) and auto-fills keywords/abilities from the datasheet. handleSave builds op with the raw local stats (line 202): move,toughness,save:saveStat,... The guard on line 204 includes `(keywords || null) !== null`, which is always true whenever keywords is non-empty — and keywords are auto-filled on link — so the override upsert runs even when the user changed no stat. upsertUnitOverride (unitOverrides.ts:32-69) writes those values literally with no 'equal-to-imported => NULL' coercion. Per unitOverride.ts the convention is NULL=use imported, non-NULL=manual override, so isStatOverridden (lines 139-144) then returns true for every stat and PlaybookStats shows the 'Manual override -- imported value' pencil/tooltip on stats the user never overrode (PlaybookStats.tsx:181-192), and the 'Clear all overrides' control appears. Reachable because applyIncomingStats changes local stats from null, making isDirty true and enabling Save. Cosmetic/semantic data bug (false override flags, no value corruption); Warning, not Critical.

### WR-003 — Battle-ready points and By-Faction cards use raw u.points while Army Readiness uses the effective-points COALESCE cascade

- **Severity:** Warning (verified ✓)
- **Category:** DataIntegrity
- **Unit:** dashboard
- **Location:** `src/features/dashboard/computeStats.ts:64,98-99`

computeStats derives battleReadyPoints, FactionStat.pointsOwned and pointsPainted from the raw `u.points` column only (`u.points ?? 0`). The same dashboard, however, computes Army Readiness via getArmyReadinessByFaction() which sums `COALESCE(udb_tier.points, udb_base.points, uo.points, u.points, 0)` (db query dashboard.ts:93-96), and ReadyToPlayCard uses `effective_points`. There is an established effective-points convention (types/unit.ts:68-69: COALESCE(u.points, udb_base.points, 0), manual > database). For a unit whose points are only known from the canonical udb tables (raw u.points is NULL), the headline 'Battle-Ready Points' StatCard and the 'By Faction' cards count it as 0 pts, while the Army Readiness card on the same screen counts its real points. The two sections can disagree on the same units' totals, understating the headline number.

**Recommendation:** Source units for computeStats through the effective-points cascade (e.g. getUnitsWithPoints / a query that returns effective_points) and aggregate on effective_points so all dashboard sections report consistent point totals. At minimum, document why the headline uses raw points if that is intentional.

> _Verifier (confirmed):_ Confirmed by direct code reading. computeStats.ts:64 sets battleReadyPoints = completedUnits.reduce(sum + (u.points ?? 0)), and lines 98-99 set FactionStat.pointsOwned/pointsPainted from (u.points ?? 0). These feed the 'Battle-Ready Points' StatCard (DashboardPage.tsx:342), the subtitle (line 297) and the 'By Faction' FactionSummaryCards (lines 428-441). On the SAME screen, ArmyReadinessCard (line 462) and ReadyToPlayCard (line 389) consume getArmyReadinessByFaction() which sums COALESCE(udb_tier.points, udb_base.points, uo.points, u.points, 0) (dashboard.ts:93-96). The codebase has an established effective-points convention (getUnitsWithPoints in units.ts:36-40 -> effective_points = row.points ?? udb_base_points ?? 0; EnrichedUnit doc unit.ts:68-69). So for a unit linked to the canonical udb_unit_points with u.points NULL, the headline/By-Faction sections count it as 0 while Army Readiness counts its real canonical points — the two sections disagree, understating the headline. Real and reachable (this is exactly the scenario the udb_unit_id linkage feature creates). Severity stays Warning: it is a display-consistency/correctness issue, not a crash or data corruption, and only diverges for units relying solely on canonical points. Note dashboard.ts even adds the unit_overrides (uo) join that getUnitsWithPoints omits, so there are actually three slightly different points formulas, reinforcing the inconsistency.

### WR-004 — Editing "Start" CP mid-game silently wipes current CP and undo history

- **Severity:** Warning (verified ✓)
- **Category:** DataIntegrity
- **Unit:** game-day
- **Location:** `src/features/game-day/gameDayStore.ts:102-103`

setStartingCp sets `{ startingCp: cp, cp, cpHistory: [] }`, so the Start input's onChange in GameDayHeader.tsx (lines 105-113) resets the live CP counter to the starting value AND clears the entire cpHistory (undo stack) on every keystroke. A player who has been tracking CP during a game and then taps the Start field — e.g. to correct a typo — instantly loses their current CP value and all undo history with no confirmation. During an active game this is effectively session data loss.

**Recommendation:** Decouple the operations: only seed `cp`/`cpHistory` from `startingCp` when CP tracking hasn't begun (e.g. cpHistory is empty and cp === startingCp), or add a confirmation before resetting an in-progress session. At minimum, do not clear cpHistory when merely adjusting the starting value, or expose a separate explicit 'Reset CP to start' action instead of overloading the Start input's onChange.

> _Verifier (confirmed):_ Confirmed by code. gameDayStore.ts:102-103 setStartingCp sets {startingCp: cp, cp, cpHistory: []} — it overwrites the live cp counter with the new starting value AND empties cpHistory (the undo stack). GameDayHeader.tsx:105-113 binds this directly to a controlled type=number Input's onChange (value={listState.startingCp}), so every keystroke fires setStartingCp. A player mid-game who taps Start to correct it loses their tracked cp (line 69 displays listState.cp) and their undo history (line 94/124 undoCp depends on cpHistory) with no confirmation. Real bug. Severity correctly Warning, not Critical: this is ephemeral Zustand/localStorage session state ('game-day-state', persist), not persistent hobbyforge.db data — impact is bounded to the current game session, recoverable by re-entering CP, no DB corruption. The reset-on-change is also partly by-design semantics (Start defines starting CP), but the per-keystroke wipe with no guard is genuinely user-hostile.

### WR-005 — Preference import does not invalidate locale-dependent query caches

- **Severity:** Warning (verified ✓)
- **Category:** DataIntegrity
- **Unit:** settings
- **Location:** `src/features/settings/DataManagementTab.tsx:117-128`

handleImport writes settings via upsertAppSetting and invalidates only APP_SETTINGS_KEY. If the imported file changes 'locale' (en<->fr), all locale-dependent game-data queries stay stale. LanguageSetting.tsx deliberately invalidates LOCALE_QUERY_KEYS on locale change for exactly this reason, but the import path bypasses that. Result: after importing a file with a different language, unit/faction names and other localized data continue to show the old language until a manual reload.

**Recommendation:** After import, if the 'locale' key was applied, also invalidate LOCALE_QUERY_KEYS (import from @/lib/localeQueryKeys) the same way LanguageSetting does. Simplest: always invalidate LOCALE_QUERY_KEYS after a successful import.

> _Verifier (confirmed):_ Confirmed. handleImport (lines 117-128) accepts 'locale' as an allowed import key (ALLOWED_IMPORT_KEYS line 28-35, validated en/fr at line 40), writes it via upsertAppSetting, then invalidates only APP_SETTINGS_KEY (line 127). LanguageSetting.tsx (lines 22-25) and the shared localeQueryKeys.ts deliberately invalidate LOCALE_QUERY_KEYS on locale change because 8 game-data query families (udb-factions, udb-units, datasheets-by-faction, etc.) are locale-dependent and cached (staleTime 5m). The import path bypasses this, so importing a file with a different language leaves localized unit/faction/datasheet names stale until a manual reload. Confirmed Warning.

### WR-006 — groupByStatus will crash if a unit's status_painting is not in PAINTING_STATUS_ORDER (DB/runtime drift)

- **Severity:** Warning (verified ✓)
- **Category:** DataIntegrity
- **Unit:** painting-projects
- **Location:** `src/features/painting-projects/kanbanUtils.ts:7-12`

groupByStatus pre-seeds buckets only for the known PAINTING_STATUS_ORDER values, then does acc[u.status_painting].push(u). status_painting is read straight from SQLite (a free-form TEXT column with no DB-level CHECK/enum). The TypeScript type PaintingStatus is only a compile-time assumption about that column's contents. If any row holds a value not in the order array (legacy data, a future migration, a manual DB edit, or a stale value after the enum changes), acc[u.status_painting] is undefined and .push throws a TypeError, which crashes the whole Kanban board render rather than just dropping that one card.

**Recommendation:** Guard the bucket: `const bucket = acc[u.status_painting]; if (bucket) bucket.push(u);` (optionally collect unknowns into a fallback). This makes the board resilient to status values that drift out of the TS union.

> _Verifier (confirmed):_ Mechanism is real. Migration 001_core_schema.sql defines `status_painting TEXT NOT NULL DEFAULT 'Not Started'` with NO CHECK/enum constraint, so the PaintingStatus type at unit.ts:35 is only a compile-time assumption. In kanbanUtils.ts:9-10, acc is pre-seeded only for PAINTING_STATUS_ORDER values, then `acc[u.status_painting].push(u)` runs. If a row holds a value outside the 11-member order array, acc[...] is undefined and .push throws a TypeError. groupByStatus is called in KanbanBoard.tsx:63 during render, so this crashes the entire board, not just one card — accurately described. However, severity is overstated as a real-world bug: every in-app write path is constrained to enum values — unitSchema.ts:20 uses z.enum(PAINTING_STATUS_ORDER); recipeAssignments.ts percentageToStatus() (lines 208-219) only returns enum members; StatusPopover and KanbanBoard drag (line 121) guard against non-enum values via PAINTING_STATUS_ORDER.includes; seed data (003) sets nothing and relies on the DEFAULT. So a bad value can only arise from manual DB edits or a future enum-changing migration that doesn't migrate data — the finding itself concedes this. It is a legitimate defensive-robustness gap with a trivial fix (fallback bucket / guard), but not triggerable through normal app use, hence Warning (not Critical).

### WR-007 — Faction delete does not invalidate recipes, army-lists, or wishlist caches affected by FK cascade/set-null

- **Severity:** Warning (verified ✓)
- **Category:** DataIntegrity
- **Unit:** factions
- **Location:** `src/hooks/useFactions.ts:47-59`

Deleting a faction triggers ON DELETE SET NULL on painting_recipes.faction_id (001_core_schema.sql:69) and army_lists.faction_id (line 105), and ON DELETE CASCADE on wishlist.faction_id (009_wishlist.sql:5). useDeleteFaction invalidates only ["factions"], ["dashboard-stats"], ["army-readiness"], and ["spending-stats"]. The recipes list, army-lists list, and wishlist views will display stale rows (recipes/lists still showing the now-deleted faction association, or deleted wishlist entries still present) until a manual refresh or staleTime (5m) expires.

**Recommendation:** Add invalidations for the recipes query key (e.g. ["painting-recipes"]), ["army-lists"], and the wishlist key to useDeleteFaction.onSuccess, mirroring the broad invalidation set already used in useUnits mutations.

> _Verifier (confirmed):_ Verified FK relationships: painting_recipes.faction_id ON DELETE SET NULL (001:69), army_lists.faction_id ON DELETE SET NULL (001:105), wishlist.faction_id NOT NULL ON DELETE CASCADE (009_wishlist.sql:5). useDeleteFaction (useFactions.ts:47-59) invalidates only [factions], [dashboard-stats], [army-readiness], [spending-stats] — it does NOT invalidate [recipes], [army-lists], or [wishlist] (confirmed those use RECIPES_KEY/ARMY_LISTS_KEY/wishlist keys not touched here). After deleting a faction, cached recipe/army-list views retain stale faction associations and the wishlist view retains rows the CASCADE actually deleted from the DB, until manual refresh or 5m staleTime. Real stale-UI defect; impact is bounded (cosmetic/eventual-consistency, self-corrects), so Warning is the correct severity. Note: deletion is only reachable for factions with no units (units FK is RESTRICT), but recipes/lists/wishlist do not block deletion, so the stale-cache scenario is genuinely reachable.

### WR-008 — restoreSnapshot drops selected_model_count when re-inserting units

- **Severity:** Warning
- **Category:** DataIntegrity
- **Unit:** db-queries-1
- **Location:** `src/db/queries/armyListSnapshots.ts:168-184`

The parsed snapshot units carry `selected_model_count` (declared at L117 and written by exportArmyList.ts L205), but the re-insert at L173-183 only writes list_id, unit_id, ghost_unit_name, is_warlord, and points_override — selected_model_count is never restored, so it resets to NULL. Per armyLists.ts (L90-99, 327-337) selected_model_count drives tier-based points resolution via udb_unit_points. The snapshot's stored points_override (= unit.points at snapshot time, L182) masks the immediate effective_points impact, but the model-count selection itself is silently lost on restore, so subsequent edits/recomputes start from the wrong tier and the restored list no longer faithfully reflects the saved state.

**Recommendation:** Include selected_model_count in the INSERT column list and bind unit.selected_model_count (already present on the parsed object) so tier selection round-trips through save/restore.

### WR-009 — Multi-statement recipe save is non-atomic; mid-save failure leaves orphaned/partial data

- **Severity:** Warning (verified ✓)
- **Category:** DataIntegrity
- **Unit:** db-queries-2
- **Location:** `src/db/queries/recipes.ts:236-511`

saveRecipeGraph (and duplicateRecipe, 129-208) perform many sequential db.execute() calls with no transaction. The code comment justifies this by noting tauri-plugin-sql uses a connection pool so BEGIN/COMMIT cannot span calls. If any statement throws partway through (e.g., an FK violation while inserting steps, or a crash), the recipe row, some sections, and some steps are already committed in WAL mode, leaving a half-written recipe graph. The function re-throws so the form stays open, but the DB is now inconsistent and a retry may duplicate sections/steps.

**Recommendation:** Run the whole graph write inside a single transaction. Either expose a Rust Tauri command that opens one connection and wraps the operations in BEGIN/COMMIT/ROLLBACK, or use the plugin's transaction support if available. At minimum, on error attempt a compensating cleanup (delete the just-created recipe in the create path) so a failed save does not leave an orphaned recipe row.

> _Verifier (confirmed):_ Confirmed. saveRecipeGraph (236-511) and duplicateRecipe (129-208) issue many sequential db.execute() INSERT/UPDATE/DELETE calls with no transaction wrapping. The code comments at 120-127 and 217-234 explicitly acknowledge this: tauri-plugin-sql uses sqlx::Pool<Sqlite>, so BEGIN/COMMIT cannot reliably span separate db.execute() calls, and the authors state 'The trade-off is loss of atomicity (partial saves possible on mid-operation crash)'. In WAL mode each statement auto-commits, so a mid-save failure (FK violation, crash, disk error) leaves the recipe row plus a subset of sections/steps committed. The error is re-thrown (surfaced via toast, form stays open), so the user is informed and other entities are unaffected. The reviewer's 'retry may duplicate sections/steps' claim is only partly accurate: the EDIT path computes its diff via dbId against existingSections/existingSteps re-fetched on retry, so a retry largely reconciles via UPDATE/DELETE rather than duplicating; on the CREATE path a failed run never returns finalRecipeId, leaving recipeId=null in the form, so a retry INSERTs a SECOND recipe row (duplicate recipe) and orphans the partial first one. Net: a genuine, author-acknowledged atomicity gap that only manifests on rare mid-operation failures after Zod validation, scoped to a single recipe graph. Warning severity is correct — real but low-frequency, no silent corruption of unrelated data, and the failure is surfaced to the user.

### WR-010 — restore_from_backup deletes WAL/SHM sidecars before validating the zip contains a usable DB

- **Severity:** Warning (verified ✓)
- **Category:** DataIntegrity
- **Unit:** rust-backend
- **Location:** `src-tauri/src/lib.rs:1193-1216`

restore_from_backup() deletes the -wal/-shm/-journal sidecars (step 2) BEFORE it opens the zip and locates the hobbyforge.db entry (step 3). If the user passes a zip that opens but is missing/contains a corrupt hobbyforge.db entry, the sidecars (which may hold un-checkpointed committed transactions in WAL mode) have already been deleted, and the function returns an error with the live database now potentially missing its most recent WAL data. The safety backup created in step 1 mitigates total loss, but the live DB is left in a degraded state on a path that should have been a no-op. validate_backup exists but is not called here.

**Recommendation:** Open the zip and successfully extract hobbyforge.db bytes into memory FIRST, then delete sidecars and write — i.e. reorder so no destructive filesystem operation happens until the replacement DB bytes are in hand. Optionally also run a quick `PRAGMA integrity_check`/header check on the extracted bytes before overwriting.

> _Verifier (confirmed):_ Ordering is exactly as claimed: restore_from_backup deletes -wal/-shm/-journal sidecars at lib.rs:1194-1201 BEFORE it opens the zip and locates the hobbyforge.db entry at lib.rs:1204-1211. validate_backup (lib.rs:1090) exists as a separate read-only command but is NOT called inside restore_from_backup. A zip that opens but lacks a hobbyforge.db entry returns 'backup missing hobbyforge.db' (line 1211) only after the sidecars are already gone, and the live main DB is left without its WAL/SHM. So the defect is real and the fix (validate, or at least locate the db entry, before deleting sidecars) is cheap and correct. However the impact is overstated: (1) the live hobbyforge.db main file itself is never modified before line 1218, only the sidecars; (2) step 1 (create_safety_backup at line 1186) runs a VACUUM INTO snapshot that captures all committed data INCLUDING un-checkpointed WAL content moments before the sidecars are deleted, so the 'most recent WAL data' the finding worries about is preserved in the safety backup and recoverable. Total/permanent loss does not occur. Confirmed as a robustness/ordering defect worth fixing, but Warning (not higher) is appropriate given the safety-backup mitigation and intact main DB file.

### WR-011 — Points override cannot be saved (excluded from dirty check)

- **Severity:** Warning (verified ✓)
- **Category:** Correctness
- **Unit:** units-forms-playbook
- **Location:** `src/features/units/PlaybookTab.tsx:118-128, 200, 254`

pointsOverrideValue is editable in PlaybookStats and is only persisted inside handleSave (line 200). However the Save Playbook button is disabled by saveDisabled = !isDirty || ... (line 254), and the isDirty memo (lines 118-128) tracks the strategy-note fields and the six stats but NOT pointsOverrideValue. As a result, when a user changes only the Points override and nothing else, isDirty stays false, the Save button remains disabled, and the new points value can never be persisted.

**Recommendation:** Include a points-override comparison in isDirty, e.g. compare pointsOverrideValue against String(overrideRow?.points ?? ""), and add pointsOverrideValue (and overrideRow?.points) to the memo dependency array.

> _Verifier (confirmed):_ Confirmed. pointsOverrideValue is bound to an editable Input in PlaybookStats (PlaybookStats.tsx:135-143, passed via PlaybookTab.tsx:240) and is only persisted in handleSave (line 200-202). The Save Playbook button is disabled by saveDisabled = !isDirty || isLoading || upsert.isPending (line 254). The isDirty memo (lines 118-128) compares only the six stats and the strategy-note text fields against initialRef; pointsOverrideValue is NOT in the comparison nor in the dependency array (lines 127-128). So if a user edits ONLY the points override, isDirty stays false and Save remains disabled, making the points value unsavable. Note: if any tracked stat/note also changed the save would fire and include points, so it is specifically the points-only edit that is blocked. Warning.

### WR-012 — Points-override input is uncontrolled and goes stale after external data changes

- **Severity:** Warning (verified ✓)
- **Category:** Correctness
- **Unit:** army-lists-mgmt
- **Location:** `src/features/army-lists/ArmyListUnitRow.tsx:315-326`

The points override <Input> uses defaultValue={unit.points_override ?? ""} (uncontrolled). The row is memoized and keyed only by alu.id in the parent (SortableUnitRow key={alu.id}). When unit.points_override changes from outside this component — e.g. after a snapshot restore, a reorder that refetches, or a loadout/tier change — the row does NOT remount, so the uncontrolled input keeps showing the previous value while unit.effective_points / PointsSourceChip above it reflect the new value. The notes textarea correctly uses a controlled draft + useEffect resync (lines 69-70); the points field has no equivalent resync.

**Recommendation:** Make the field controlled with a local draft state synced via useEffect on unit.points_override (mirror the notesDraft pattern), or add a key derived from unit.points_override to force the input to remount when the underlying value changes.

> _Verifier (confirmed):_ Verified. Line 320 uses defaultValue={unit.points_override ?? ""} (uncontrolled <Input>) with no resync useEffect, in contrast to the notes field which has a controlled draft + useEffect resync at lines 69-70. The row is keyed only by alu.id (ArmyListDetailPage line 609) and ArmyListUnitRow is React.memo'd, so an external change to points_override (snapshot restore, loadout/tier change refetch) does not remount the row. The uncontrolled input keeps the old value while effective_points (line 311) and PointsSourceChip (line 313) above it update from the new data — a genuine inconsistency. Impact is moderate, not just cosmetic: handlePointsBlur compares e.currentTarget.value against unit.points_override, so a user who blurs the stale field could re-write an old override. Warning is fair.

### WR-013 — Dead/incorrect navigation branch in handleDeleteClose after delete

- **Severity:** Warning (verified ✓)
- **Category:** Correctness
- **Unit:** army-lists-mgmt
- **Location:** `src/features/army-lists/ArmyListDetailPage.tsx:403-409`

handleDeleteClose reads deletingList and navigates back to /army-lists only when wasDeleting.id === listId. But OPEN_DELETE is always dispatched with the current detail page's list (dispatch({ type: 'OPEN_DELETE', list }) on line 486), so wasDeleting.id is always === listId here. More importantly, ArmyListDeleteDialog.handleConfirm calls onClose() in BOTH the success and error branches (lines 28 and 32). So a FAILED delete also triggers handleDeleteClose → navigates away from a list that still exists, while a success toast vs error toast was shown. The navigation is not gated on the mutation actually succeeding.

**Recommendation:** Gate the back-navigation on delete success. Either have ArmyListDeleteDialog signal success vs failure to its onClose caller (e.g. onClose(success: boolean) or a separate onDeleted callback), or move the navigate into the delete mutation's onSuccess. Do not navigate away on a failed delete.

> _Verifier (confirmed):_ The 'dead branch' part is overstated — the wasDeleting.id === listId guard is harmless defensive code, since OPEN_DELETE is only ever dispatched with the current list (line 486). But the core bug is real and confirmed: ArmyListDeleteDialog.handleConfirm calls onClose() in BOTH the success branch (line 28) and the catch/error branch (line 33). onClose is handleDeleteClose, which unconditionally navigates to /army-lists whenever a list was being deleted. So a FAILED delete shows an error toast AND still navigates the user away from a list that still exists. Navigation is not gated on mutation success. Confirmed at Warning.

### WR-014 — Conditional hook call — early return before useMemo violates Rules of Hooks

- **Severity:** Warning (verified ✓)
- **Category:** Correctness
- **Unit:** recipes-timeline
- **Location:** `src/features/recipes/SectionedTimeline.tsx:23-56`

The component executes `if (sections.length === 0) return null;` at line 23, which is BEFORE the two `useMemo` hooks at lines 26 (stepsBySection/orphanSteps) and 42 (sectionAvailability). React requires hooks to be called unconditionally and in the same order on every render. If `sections` transitions from empty to non-empty (or vice versa) across renders — which is realistic here since sections load asynchronously via React Query and could start empty — React will render a different number of hooks and throw 'Rendered more/fewer hooks than during the previous render', crashing the timeline. ESLint react-hooks would flag this, but the project has no ESLint (strict TS only), so it slipped through.

**Recommendation:** Move the `if (sections.length === 0) return null;` guard to AFTER both useMemo calls, or compute the memos unconditionally and guard only the returned JSX. Hooks must always run before any early return.

> _Verifier (confirmed):_ The pattern is real: `if (sections.length === 0) return null;` (line 23) precedes two `useMemo` hooks (lines 26, 42), a genuine Rules-of-Hooks violation that the no-ESLint setup let slip through. HOWEVER the Critical 'will crash the timeline' claim is overstated. Both call sites — RecipeDetailSheet.tsx:280 (`sections.length > 0 && !sectionsLoading ? <SectionedTimeline/> : <RecipeStepTimeline/>`) and ApplyRecipeDialog.tsx:185 (`sections.length > 0 ? <SectionedTimeline/> : <RecipeStepTimeline/>`) — conditionally MOUNT/UNMOUNT the component based on sections being non-empty. When sections become empty, React unmounts SectionedTimeline rather than re-rendering it with empty sections, so the early-return branch is never executed while mounted and the hook-count mismatch cannot trigger. The early return is effectively dead defensive code. Real latent anti-pattern worth fixing (move the guard after the hooks), but not a reachable crash through current usage — hence downgraded to Warning.

### WR-015 — Role/keyword/points filters are not reset when switching factions

- **Severity:** Warning (verified ✓)
- **Category:** Correctness
- **Unit:** unit-database
- **Location:** `src/features/unit-database/databaseBrowserFilters.ts:30`

setSelectedFactionId resets only subFactionFilter to null. roleFilter, keywordFilter, pointMin and pointMax persist across a faction change. If a user selects e.g. role 'Battleline' in Faction A and then switches to Faction B (which has no 'Battleline' role), applyUdbFilters keeps filtering on the stale role and the unit list silently shows zero units, while the Role Select trigger renders blank because no SelectItem matches the persisted value. This looks like an empty/broken faction.

**Recommendation:** In setSelectedFactionId, clear all faction-scoped filters: set({ selectedFactionId: id, subFactionFilter: null, roleFilter: null, keywordFilter: "", pointMin: null, pointMax: null }). Alternatively reset them in DatabaseBrowserPage when selectedFactionId changes.

> _Verifier (confirmed):_ Line 30: setSelectedFactionId resets ONLY subFactionFilter to null; roleFilter, keywordFilter, pointMin, pointMax persist. applyUdbFilters (applyUdbFilters.ts:39) filters on unit.role !== filters.roleFilter, so a role selected in faction A that doesn't exist in faction B yields zero results. availableRoles (DatabaseBrowserPage.tsx:79-85) is rebuilt from the new faction's units, so the Select trigger has no matching SelectItem and renders blank — exactly the 'empty/broken faction' symptom claimed. Real stale-filter UX bug, recoverable via the Clear button. Warning severity is correct: confusing UX, not data corruption.

### WR-016 — form.reset effect with no open-guard can wipe user input when async settings resolve

- **Severity:** Warning (verified ✓)
- **Category:** Correctness
- **Unit:** battle-log
- **Location:** `src/features/battle-log/BattleLogSheet.tsx:145-147`

The reset effect depends on missionDefault, which derives from useAppSettings() — an async React Query call that returns "" (falsy) on first render and then flips to the loaded default_mission_format value once the query resolves. The effect has no `open` guard and runs whenever missionDefault changes. The Sheet is rendered persistently (open is merely toggled in AppLayout/GameDayPage, the component is not unmounted on close), so if the user opens the create Sheet and starts typing before app settings finish loading, the settings resolution fires form.reset(...) and discards every field the user has entered. This is the same effect lineage flagged in the project's own retro/TECH-AUDIT (BattleLogSheet.tsx:145 timezone reset bug).

**Recommendation:** Guard the reset so it only runs on transitions into the open state (and on log identity change), not on every dependency change. E.g. add `if (!open) return;` plus reset on open edges, or move missionDefault into buildDefaultValues computed once at open time. Alternatively gate the effect on a stable, already-resolved settings value rather than a value that flips post-mount.

> _Verifier (confirmed):_ Verified. useAppSettings (src/hooks/useAppSettings.ts) is a plain async React Query call with no initialData, so settings is undefined on first render. missionDefault (line 133) is therefore "" initially and flips to the loaded default_mission_format once the query resolves. The reset effect (lines 145-147) lists missionDefault in its deps and has no `open`/`isSubmitting` guard, so the settings resolution fires form.reset(...) and discards any in-progress user input. Both render sites (AppLayout.tsx:61 and GameDayPage.tsx:146) keep BattleLogSheet persistently mounted with `open` as a prop (no conditional unmount), so the effect does run while the sheet is visible. This matches the project's own TECH-AUDIT entry (BattleLogSheet.tsx:145). Real but narrow: app-settings is fetched once at startup and is almost always already cached (staleTime 5m default) by the time a user opens the sheet; the race only fires at cold start within the few-ms resolution window AND only when the user has actually configured a non-empty default_mission_format (otherwise missionDefault stays "" and no change fires). Warning is the right severity given the narrow real-world window but the absence of an open-guard makes it a genuine latent bug.

### WR-017 — Checklist item IDs can collide, breaking React keys and drag-and-drop

- **Severity:** Warning (verified ✓)
- **Category:** Correctness
- **Unit:** settings
- **Location:** `src/features/settings/ChecklistDefaultsEditor.tsx:96, 149`

Item ids are derived as `checklist-${index}-${text}` both when parsing existing items (line 96, index = array position) and when adding (line 149, index = items.length). After deletions the array length no longer tracks original indices, so two items can receive the same id. Concrete repro: items [A(idx0), B(idx1)] -> delete A -> remaining B retains id 'checklist-1-B' -> add a new 'B' -> new item gets id `checklist-${items.length=1}-B` = 'checklist-1-B', a duplicate. Duplicate ids cause React key collisions and dnd-kit (which keys SortableContext by id) to mis-map drag targets, corrupting reorder/delete behavior.

**Recommendation:** Generate stable unique ids independent of index/text, e.g. crypto.randomUUID() per item at creation time (consistent with getDefaultChecklist in gameDayStore.ts which already uses crypto.randomUUID()). Do not encode array position or user text into the id.

> _Verifier (confirmed):_ Confirmed the id-derivation logic. Line 96 builds ids as `checklist-${i}-${text}` using array index; line 149 uses `items.length`. saveItems sets savingRef so the useEffect (line 110-116) does NOT re-derive ids from initialItems after a local edit, so stale ids persist in state. Repro holds: [A=checklist-0-A, B=checklist-1-B] -> delete A -> items=[B(checklist-1-B)], length=1 -> add new 'B' -> id = checklist-1-B, colliding with existing B. SortableContext is keyed by id (line 173) and React list keyed by id (line 179), so a duplicate id corrupts drag-target mapping and React reconciliation. Real bug but narrow: requires re-adding an item with text identical to a surviving item under a specific delete/add sequence. Warning severity is correct.

### WR-018 — General section progress badge always shows 0/N and never completes

- **Severity:** Warning (verified ✓)
- **Category:** Correctness
- **Unit:** painting-mode
- **Location:** `src/features/painting-mode/SectionNavigator.tsx:91-98`

The virtual 'General' section is rendered with id = GENERAL_SECTION_ID (-1) for unsectioned steps. The progress lookup does `sectionProgressMap.get(section.id)`, but usePaintingModeState.ts builds sectionProgressMap by skipping steps where `step.section_id === null` (the very steps that land in General). So `sectionProgressMap.get(-1)` is always undefined. As a result, for the General section `progress` is undefined, `progressText` falls back to `0/section.steps.length`, and `isComplete` is always false. Users completing all unsectioned steps still see '0/N' and never get the green completion check on the General group.

**Recommendation:** Either compute progress for the General bucket from `section.steps` + `completedSet` directly in SectionNavigator when `progress` is undefined (count steps in this section whose id is in completedSet), or extend usePaintingModeState's sectionProgressMap to include an entry keyed GENERAL_SECTION_ID for null-section steps.

> _Verifier (confirmed):_ Confirmed against code. usePaintingModeState.ts builds sectionProgressMap and explicitly skips unsectioned steps: `for (const step of orderedSteps) { if (step.section_id === null) continue; ... }` (lines 103-115). It never adds an entry keyed -1 (GENERAL_SECTION_ID). In SectionNavigator (lines 64-72) unsectioned steps are grouped into a virtual section with id = GENERAL_SECTION_ID (-1). At line 91 `sectionProgressMap.get(section.id)` -> get(-1) returns undefined for General, so progressText falls back to `0/section.steps.length` (line 94) and isComplete (lines 95-98) is `progress != null && ...` which is false. Result: the General group always shows a `0/N` badge and never shows the green section-complete check, even when all unsectioned steps are completed. Genuine feedback/consistency defect, but scoped to recipes that mix sectioned and unsectioned steps (cosmetic progress indicator only; step completion itself still works). Warning is appropriate.

### WR-019 — Collapsible section does not auto-expand when navigating into it

- **Severity:** Warning (verified ✓)
- **Category:** Correctness
- **Unit:** painting-mode
- **Location:** `src/features/painting-mode/SectionNavigator.tsx:101-104`

Each section uses `<Collapsible defaultOpen={isCurrentSection}>`. `defaultOpen` is an uncontrolled initial value applied only on mount. When the user advances (goNext) or jumps (goToStep) into a step belonging to a currently-collapsed section, `isCurrentSection` recomputes to true but the Collapsible's open state does not update, so the newly-current section (and its current step indicator) can remain collapsed/hidden. The current-section highlight border appears but the step list stays closed.

**Recommendation:** Make the Collapsible controlled: pass `open={isCurrentSection}` with an `onOpenChange` handler (and local override state if manual toggling should be preserved), or key the Collapsible such that it remounts when currentSectionId changes. At minimum, controlling `open` from isCurrentSection ensures the active section is always expanded.

> _Verifier (confirmed):_ Confirmed. The Collapsible (lines 101-104) receives only `key` and `defaultOpen={isCurrentSection}`, no `open`/`onOpenChange`, so it is uncontrolled. collapsible.tsx is a thin pass-through to Radix Collapsible.Root, where `defaultOpen` is read once on mount and never re-applied. When goNext/goToStep moves currentStepId into a section that defaulted closed (or one the user manually collapsed), isCurrentSection recomputes true (border highlight + data-testid current-section appear, lines 105-113) but the CollapsibleContent (lines 138-173) stays collapsed, hiding the now-current step indicator. On initial mount the first incomplete step's section does open correctly (currentStepId is set to firstIncompleteId before render), so impact is limited to post-mount navigation across section boundaries. Genuine UX defect; Warning is the right severity.

### WR-020 — Multi-statement transactions (BEGIN/COMMIT/ROLLBACK via db.execute) are unsafe over a connection pool

- **Severity:** Warning
- **Category:** Correctness
- **Unit:** db-queries-1
- **Location:** `src/db/queries/armyLists.ts:191-205, 226-244, 465-482`

deleteArmyList, removeUnitFromList, and reorderArmyListUnits issue `BEGIN TRANSACTION`, several statements, then `COMMIT`/`ROLLBACK` as separate db.execute() calls. With sqlx::Pool<Sqlite>, each execute can acquire a different connection from the pool, so BEGIN may run on connection A while the subsequent DELETEs/UPDATEs and COMMIT run on B/C. The transaction's atomicity and rollback guarantees are then void: a failure mid-way may leave partial writes that the ROLLBACK (on a different connection) does not undo, and the COMMIT may target a connection with no open transaction. The same files' other modules explicitly avoid transactions for exactly this reason.

**Recommendation:** Don't span a logical transaction across multiple pooled db.execute() calls. Move the atomic delete/reorder into a single Rust Tauri command that runs inside one sqlx transaction, or restructure to a single SQL statement where possible. At minimum, document that atomicity is not actually guaranteed here.

### WR-021 — user_version drift can fail DbHealthGate on a fresh install

- **Severity:** Warning (verified ✓)
- **Category:** Correctness
- **Unit:** rust-backend
- **Location:** `src-tauri/migrations/039_collection_udb_link.sql:45`

EXPECTED_SCHEMA_VERSION in DbHealthGate.tsx is 44 and the gate throws (blocking the whole app) when PRAGMA user_version < 44. But only migrations 033 and 039 set user_version (to 33 and 39). After the tauri-plugin-sql migrator runs all 44 migrations, the last PRAGMA executed is `PRAGMA user_version = 39` from migration 039 — sqlx tracks via _sqlx_migrations and never updates user_version itself. The Rust sync_user_version() that would correct this to 44 runs in preflight_migration_repair() BEFORE the builder, and on a true first launch it early-returns because the db file does not exist yet (`if !db_path.exists() return Ok`). So on a clean install the migrator leaves user_version=39, then DbHealthGate (mounted in main.tsx) sees 39 < 44 and fails the launch. It only self-heals on the second launch when sync_user_version runs against the now-existing db. This is fragile and an off-by-version waiting to recur every time EXPECTED_SCHEMA_VERSION is bumped without adding a matching `PRAGMA user_version = N` to the newest migration.

**Recommendation:** Make the source of truth single. Either (a) update the final migration (currently 044) to `PRAGMA user_version = 44` and keep it in lockstep on every new migration, or (b) drop the migration-embedded PRAGMAs and have DbHealthGate compare against _sqlx_migrations count / the get_schema_version command rather than user_version. Add a regression test asserting the highest migration sets user_version == migration count == EXPECTED_SCHEMA_VERSION.

> _Verifier (confirmed):_ Verified the full chain. There are 44 migrations (001-044); only 033 and 039 contain `PRAGMA user_version` (33, then 39). 044_app_settings.sql sets nothing. The tauri-plugin-sql/sqlx migrator tracks via _sqlx_migrations and does NOT touch user_version, so after a fresh migration run user_version stays at 39. lib.rs run() calls preflight_migration_repair() at line 1360 BEFORE tauri::Builder; sync_user_version() early-returns at lib.rs:430-432 (`if !db_path.exists() return Ok`) on a true first launch when the db file does not yet exist. The migrator then creates+migrates the DB (triggered by Database.load in client.ts getDb()), leaving user_version=39. DbHealthGate.tsx:10 sets EXPECTED_SCHEMA_VERSION=44 and DbHealthGate.tsx:47 throws when version (39) < 44, blocking the app with DbDiagnosticScreen. The screen's only action is 'Retry Connection' which re-runs the same in-process check (still 39) — it does NOT relaunch, so retry cannot fix it. Recovery requires a manual restart, on which preflight runs against the now-existing db and sets user_version=44 (lib.rs:447). So a fresh install genuinely fails its first launch and self-heals only after a restart. Real bug. Kept at Warning rather than Critical because it auto-recovers on the next launch and the diagnostic screen instructs the user to restart; it is also a recurring footgun every time EXPECTED_SCHEMA_VERSION is bumped without adding a matching `PRAGMA user_version = N` to the newest migration.

### WR-022 — Reorder mutation result not surfaced to the user on failure

- **Severity:** Warning (verified ✓)
- **Category:** ErrorHandling
- **Unit:** army-lists-mgmt
- **Location:** `src/features/army-lists/ArmyListDetailPage.tsx:271-283`

handleDragEnd calls reorderUnits.mutate({ listId, updates }) with no onError handler. Every other mutation in this file (handleQuickAdd, handleRemoveUnit, handleSaveListNotes, warlord toggles via onSuccess) provides user feedback, but a failed reorder is silent — the rows snap back on the next refetch with no toast, leaving the user unsure whether their reorder saved.

**Recommendation:** Add an onError callback to reorderUnits.mutate that shows toast.error("Failed to reorder units. Please try again."), consistent with the other handlers.

> _Verifier (confirmed):_ Verified. handleDragEnd (lines 271-283) calls reorderUnits.mutate({ listId, updates }) with no onError/onSuccess. Every sibling mutation in this file provides feedback: handleQuickAdd (302), handleRemoveUnit (312-314), handleSaveListNotes (328), warlord toggles (261-267), points/notes/role saves in ArmyListUnitRow. A failed reorder is silent — rows revert on next refetch with no toast. Real, consistent with project convention that mutation errors surface via toast. Warning.

### WR-023 — Snapshot delete-undo re-create result is unhandled

- **Severity:** Warning (verified ✓)
- **Category:** ErrorHandling
- **Unit:** army-lists-mgmt
- **Location:** `src/features/army-lists/SnapshotHistorySheet.tsx:186-193`

The Undo action in the delete toast calls createSnapshot.mutate(...) with no onSuccess/onError. If the undo re-create fails, the snapshot is permanently lost and the user gets no feedback — they clicked Undo and nothing happened. Given this is the recovery path for a destructive delete, a silent failure here is data-loss-adjacent.

**Recommendation:** Add onError (and ideally onSuccess) callbacks to the Undo createSnapshot.mutate call to surface failure via toast.

> _Verifier (confirmed):_ Verified at lines 186-193: the Undo toast action calls createSnapshot.mutate({...}) with no onSuccess/onError callbacks. By contrast, the primary handleSave path (lines 110-118) and handleDelete itself (181-201) both wire up success/error toasts. Since this is the recovery path for a destructive snapshot delete, a silent failure means the user clicks Undo, nothing happens, and the snapshot is permanently lost with no feedback. Confirmed Warning (data-loss-adjacent but recoverable only if the re-create succeeds).

### WR-024 — Note save failures are silently swallowed (no error surfaced to user)

- **Severity:** Warning (verified ✓)
- **Category:** ErrorHandling
- **Unit:** rules-hub
- **Location:** `src/hooks/useRulesNotes.ts:20-28`

useUpsertRulesNote defines only onSettled (invalidate) with no onError handler. Unlike useUpsertRulesFavorite which toasts on error, a failed note write (DB locked, FK/constraint error) is silently dropped. RuleNoteEditor.handleChange and its unmount-flush call upsertNote.mutate without any onError, and the only feedback is a 'Saved' label gated on onSuccess. The user can type a note, see no 'Saved', and lose the note with no indication anything went wrong.

**Recommendation:** Add an onError handler to useUpsertRulesNote that calls toast.error("Failed to save note. Please try again."), matching the favorites hooks. Optionally surface a 'Save failed' state in RuleNoteEditor.

> _Verifier (confirmed):_ Verified: useUpsertRulesNote (lines 20-28) defines only mutationFn + onSettled (invalidate) with no onError handler. Contrast with useUpsertRulesFavorite in useRulesFavorites.ts (lines 55-60, 81-86) which calls toast.error on error. In RuleNoteEditor.tsx, handleChange (lines 60-72) passes only an onSuccess callback that sets the transient 'Saved' label; the unmount-flush effect (lines 40-54) calls upsertNote.mutate with no callbacks at all. A failed write (DB locked, constraint error) produces no toast and no 'Saved' indicator — the user can lose a note with no feedback. Warning is the correct severity: silent failure of a user-authored note, not data corruption of core data.

### WR-025 — Strategy-note append failures are silently swallowed

- **Severity:** Warning (verified ✓)
- **Category:** ErrorHandling
- **Unit:** battle-log
- **Location:** `src/features/battle-log/BattleLogSheet.tsx:180-193`

After a successful create, MVP/underperformer strategy notes are written via appendNotes.mutate({...}) (fire-and-forget, not awaited). useAppendStrategyNotes (src/hooks/useStrategyNote.ts:32-40) defines no onError handler, and .mutate() never rejects — so if appendStrategyNotes fails (e.g. FK violation on a since-deleted unit, DB lock), the error is fully swallowed. The user sees the success toast 'Game logged.' while the side-effect note silently did not persist, contradicting the project rule that mutation failures should surface to the user.

**Recommendation:** Either await the appends inside the try block so failures are caught by the existing catch and surfaced via toast, or add an onError handler to useAppendStrategyNotes that shows a non-blocking toast (e.g. 'Game saved, but unit note could not be attached').

> _Verifier (confirmed):_ Verified. At lines 182-191 the MVP/underperformer notes are written via appendNotes.mutate({...}) (fire-and-forget, outside the awaited create path). useAppendStrategyNotes (src/hooks/useStrategyNote.ts:32-40) defines only onSuccess and no onError. Since .mutate() does not return a promise and swallows errors when no onError handler is present, a failing appendStrategyNotes (e.g. FK violation on a since-deleted unit, or DB lock — the query in src/db/queries/strategyNotes.ts:25-45 does an UPDATE/INSERT that can throw) is fully silent. The user still sees the 'Game logged.' success toast (already shown at line 177 after the awaited create) while the strategy note did not persist, contradicting the project convention that mutation failures surface via toast. Impact is modest: the primary battle log persists correctly; only the secondary note append is lost, and only on a relatively rare DB error. Warning is appropriate.

### WR-026 — Successful restore can show a misleading "Restore failed" toast if relaunch() rejects

- **Severity:** Warning (verified ✓)
- **Category:** ErrorHandling
- **Unit:** data-health
- **Location:** `src/features/data-health/BackupCard.tsx:124-143`

handleConfirmRestore awaits restore_from_backup (which replaces the live database) and then awaits relaunch(). Both calls are inside the same try block. If restore_from_backup succeeds but relaunch() rejects (plugin-process unavailable, OS denies relaunch, etc.), the catch fires and shows `Restore failed: ...` and resets the dialog state — even though the destructive database replacement already completed successfully. The user is told the restore failed when in fact the DB was replaced, and the app is left running on the old in-memory connection against the new on-disk DB.

**Recommendation:** Separate the two awaits. Wrap only restore_from_backup in the try/catch that surfaces 'Restore failed'. After it resolves, persist last_restore_date and attempt relaunch in its own try/catch; on relaunch failure show a success-but-please-restart message (e.g. toast.info('Restore complete — please restart the app')) rather than a failure toast.

> _Verifier (confirmed):_ Code at BackupCard.tsx:124-143 matches the claim exactly: handleConfirmRestore awaits invoke('restore_from_backup') then awaits relaunch() inside one try block; the catch shows `Restore failed: ...` and resets dialog state. Verified the Rust command (src-tauri/src/lib.rs:1179-1219): restore_from_backup is fully destructive on disk — it deletes -wal/-shm/-journal sidecars and overwrites hobbyforge.db with the backup bytes (std::fs::write) before returning Ok(()). So if restore_from_backup succeeds but relaunch() rejects, the user is told the restore failed even though the DB file was already replaced, and the app keeps its old in-memory connection against the new on-disk DB. Real, but severity is Warning not higher: (1) relaunch() from plugin-process rarely rejects in a packaged app (it spawns + exits); (2) the on-disk data is the correctly restored backup, so there is no data loss/corruption; (3) a create_safety_backup runs first (lib.rs:1186), and a manual restart fully recovers. Impact is a confusing-but-recoverable error message on a destructive op — a genuine UX correctness bug at Warning level.

### WR-027 — busy_timeout set per-connection at startup does not protect concurrent pool connections

- **Severity:** Warning (verified ✓)
- **Category:** ErrorHandling
- **Unit:** db-client
- **Location:** `src/db/client.ts:28`

Same pooling root cause as the FK issue: busy_timeout is a per-connection PRAGMA. Setting it once on the initializing connection leaves other pooled connections at SQLite's default busy_timeout of 0ms. Under WAL a writer plus concurrent reader/writer can still hit SQLITE_BUSY immediately on those connections, surfacing as intermittent 'database is locked' errors that the 10s timeout was meant to absorb.

**Recommendation:** Apply busy_timeout to every pooled connection (Rust-side pool config or connection-string param), or set it via the SQLite URI so it is honored on each acquire. Tie this fix to the foreign_keys fix above since both stem from per-connection PRAGMA placement.

> _Verifier (confirmed):_ Same verified pooling mechanism as finding 1: busy_timeout is a per-connection SQLite PRAGMA, set once on the load() connection at client.ts:28, leaving other pooled connections at the default 0ms. Confirmed real. Severity held at Warning (not raised): this is a single-user desktop Tauri app with low write concurrency, and WAL mode permits concurrent readers alongside one writer, so SQLITE_BUSY 'database is locked' surfacing is plausible but infrequent in practice. The bug is real but lower realized impact than the FK finding.

### WR-028 — Update install failure hides the banner, leaving the user with no feedback

- **Severity:** Warning (verified ✓)
- **Category:** ErrorHandling
- **Unit:** components-common-forms
- **Location:** `src/components/common/UpdateBanner.tsx:13`

installUpdate (useAppUpdate.ts) catches download/install errors and sets status='error'. UpdateBanner returns null when status==='error', so a failed update simply makes the banner disappear after the user clicked Update — indistinguishable from success being dismissed. The user is never told the update failed or how to retry.

**Recommendation:** Render an error state in the banner (red variant) with the error message and a Retry button instead of returning null on status==='error'. The hook already exposes `error` from useAppUpdate.

> _Verifier (confirmed):_ Confirmed. installUpdate (useAppUpdate.ts:48-51) catches errors and calls setStatus('error'). UpdateBanner.tsx:13 returns null when status==='error', so after the user clicks Update (line 40), a download/install failure makes the banner vanish entirely — indistinguishable from dismissal/success. The hook captures the message in `error` and exposes it (line 69), but the banner never renders it for the error case. Because the user took an explicit action expecting a result and download/install failures are plausible (network/IO during download), the missing failure feedback and lack of a retry path is a genuine Warning-level UX defect.

### WR-029 — Painting-mode step completion failures are silently swallowed

- **Severity:** Warning (verified ✓)
- **Category:** ErrorHandling
- **Unit:** app-pages
- **Location:** `src/app/painting-mode/page.tsx:61-111`

handleMarkDone and handleMarkDoneWithSession call completeMutation.mutate(...) passing only an onSuccess callback. useCompleteStep (src/hooks/useRecipeAssignments.ts) defines no onError, and the global MutationCache.onError in QueryProvider.tsx (lines 35-42) only console.errors. If the underlying DB write fails (e.g. an FK violation or a session-insert error), the user presses Space / clicks Mark Done and nothing happens: no toast, no step advance, no error. This is the core flow of a focused, keyboard-driven mode, so a silent failure is especially confusing.

**Recommendation:** Add an onError handler to the .mutate() options (or to useCompleteStep) that surfaces a toast, e.g. toast.error('Could not save your progress — please try again.'). The bareLayoutRoute already mounts a Toaster, so a sonner toast will render.

> _Verifier (confirmed):_ Confirmed by code. completeStepWithSession (src/db/queries/recipeAssignments.ts:429) performs two real INSERTs (unit_recipe_step_progress and painting_sessions) that can throw on any SQLite/FK error. useCompleteStep (src/hooks/useRecipeAssignments.ts:153-172) defines only onSuccess invalidations, no onError. Both call sites in page.tsx (handleMarkDone lines 63-81, handleMarkDoneWithSession lines 88-111) pass only an onSuccess callback — goNext()/sheet-close happen only on success. The global MutationCache.onError in QueryProvider.tsx (lines 35-43) only console.errors; no toast. The page never reads completeMutation.isError (only completeMutation.isPending is passed as isMutating, lines 167/180), and grep for toast/isError/onError in page.tsx returns no matches. Net effect: on a failed write the user presses Space / Mark Done and nothing visible happens — no toast, no step advance, no error. Real silent-failure gap in the core keyboard-driven flow. Kept at Warning (reviewer's rating) rather than Critical: the failure path requires an actual DB/FK error which is uncommon since the assignment and unit already exist on entry; it is a UX/robustness gap, not data corruption or a crash.

---

## Info findings (98)

_Quality/maintainability observations, grouped by unit. Unverified first pass._

### units-collection

- **IN-001** [Correctness] `src/features/units/CategoryCombobox.tsx:33-41` — **CategoryCombobox internal input state goes stale when editing a different unit**  
  `input` is seeded once via useState(value) and never re-synced to the `value` prop. The form (UnitSheet.tsx) uses form.reset() rather than remounting with a key (UnitSheet.tsx:117-119), so when the user closes the sheet and opens it for a different unit, CategoryCombobox is NOT remounted and its internal `input` retains the previously edited unit's category. The displayed trigger label reads `value` correctly, but the CommandInput search box inside the popover shows the stale category until the user types. The 'Use "..." as category' button in CommandEmpty also commits the stale `input`.  
  _Fix:_ Add `useEffect(() => setInput(value), [value])` to keep the internal search text in sync with the controlled `value` prop, or reset `input` when the popover opens (e.g. in onOpenChange when open becomes true).
- **IN-002** [DataIntegrity] `src/features/units/StatusPopover.tsx:16,32-48` — **StatusPopover performs optimistic update against the wrong query key (UNITS_KEY, not UNITS_ENRICHED_KEY)**  
  StatusPopover snapshots and patches UNITS_KEY (["units"]). The Collection list renders from useUnitsEnriched() / UNITS_ENRICHED_KEY (["units","enriched"]) (CollectionPage.tsx:36, useUnits.ts:13). An optimistic patch to UNITS_KEY would not update the visible enriched list, and the rollback restores the wrong cache. Note: StatusPopover currently has no usages anywhere in src/ (grep confirms zero imports), so this is latent — but if it is wired into the table it will produce stale UI / no optimistic feedback. The useUpdateUnit mutation does invalidate both keys on settle, so eventual consistency holds, but the optimistic path is broken.  
  _Fix:_ Either delete StatusPopover as dead code, or change it to patch UNITS_ENRICHED_KEY (and type it EnrichedUnit[]) so the optimistic update targets the list actually rendered, matching the pattern used in CollectionPage.handleToggleActive.
- **IN-003** [Quality] `src/features/units/StatusPopover.tsx:22` — **StatusPopover is unreferenced dead code**  
  No file imports StatusPopover (verified via repo-wide grep). It is fully implemented but unused, and carries the wrong-query-key bug above. Dead code drifts out of sync with the rest of the feature.  
  _Fix:_ Remove the file, or wire it into UnitTableColumns/UnitDetailSheet if inline status editing is intended (fixing the query-key issue first).
- **IN-004** [ErrorHandling] `src/features/units/UnitDeleteDialog.tsx:76-92` — **Photo file-cleanup and DB-row-cleanup errors are silently swallowed during unit delete**  
  After the unit DELETE succeeds, orphaned image_assets row deletions (deleteUnitPhoto) and on-disk file removals (remove) catch and ignore all errors. The code comments justify this (orphaned rows/files are harmless, must not block the success toast), which is a reasonable product decision. The risk is silent accumulation of orphaned files/rows over time with no diagnostic signal.  
  _Fix:_ Acceptable as-is for UX, but consider logging the swallowed errors (console.warn or a diagnostics counter) so orphan accumulation is observable, rather than fully silent.
- **IN-005** [Quality] `src/features/units/ShowcaseMode.tsx:38-61,118-122` — **ShowcaseMode renders <img> with potentially undefined src and unused `mounted` flag**  
  1) `src={photo?.assetUrl}` can be undefined if a unit lacks a photo; in practice CollectionPage filters showcaseUnits to units with photos (CollectionPage.tsx:94-97), so this is defensive only. 2) The mount effect sets `let mounted = true; ... mounted = false; void mounted;` but never reads `mounted` for any guard — the async enterFullscreen() result is not gated on it, so the flag is pure dead code. 3) Both handleClose and the unmount cleanup call setFullscreen(false); harmless but redundant.  
  _Fix:_ Remove the unused `mounted` flag (or actually use it to guard a post-await state update). Optionally short-circuit rendering the <img> when photo is undefined to avoid an empty/broken image request.
- **IN-006** [Quality] `src/features/units/PaintingPipeline.tsx:18-21` — **PaintingPipeline duplicates PAINTING_STATUS_ORDER as a hardcoded local array**  
  STATUS_ORDER is a hand-copied duplicate of PAINTING_STATUS_ORDER from src/types/unit.ts. It currently matches exactly (indices 0-10), and the stage thresholds (statusIdx >= 8, === 9, === 10) are hardcoded against those positions. If the canonical PAINTING_STATUS_ORDER ever changes order/length, this component silently drifts and mislabels stages.  
  _Fix:_ Import PAINTING_STATUS_ORDER from @/types/unit instead of redefining it, and derive stage boundaries from named statuses (e.g. indexOf('Based')) rather than magic numbers, so the pipeline stays in lockstep with the source of truth.
- **IN-007** [Quality] `src/features/units/JournalTab.tsx:68-70,205-211` — **JournalTab Log Session button disabled-state does not match validation in handleLogSession**  
  handleLogSession requires minutes > 0 and finite, but the button is only disabled when duration === "". Entering '0' or a negative number leaves the button enabled; clicking it silently returns with no toast or feedback, so the user sees nothing happen. Minor UX inconsistency, not data corruption.  
  _Fix:_ Either disable the button when Number(duration) <= 0, or surface a toast.error('Enter a duration greater than 0') in the early-return branch of handleLogSession so the no-op is explained.

### units-forms-playbook

- **IN-008** [ErrorHandling] `src/features/units/PlaybookTab.tsx:205` — **Override save failure is swallowed (logged but not surfaced)**  
  The nested try/catch around upsertOverride.mutateAsync only console.errors on failure. The outer flow still proceeds to toast.success('Playbook saved') on line 208, so a user whose stat/points overrides failed to persist is told the save succeeded. Strategy-note save errors are surfaced correctly, but override-save errors are silently hidden.  
  _Fix:_ Surface override-save failures to the user (e.g. toast.error or a partial-success warning) instead of only logging, so the success toast is not misleading when the override write fails.
- **IN-009** [DataIntegrity] `src/hooks/useUnitOverride.ts:40-47` — **useUpsertUnitOverride success does not invalidate the units/enriched caches**  
  useUpsertUnitOverride invalidates the per-unit override key plus army-lists and army-list-readiness, but not UNITS_KEY / UNITS_ENRICHED_KEY. If override.points feeds the effective points displayed elsewhere in the collection/unit lists (the override comment notes points feed effective_points), those views may show stale points after an override change until another refetch.  
  _Fix:_ Confirm whether enriched unit queries surface override points; if so, also invalidate UNITS_KEY/UNITS_ENRICHED_KEY (and any udb-ownership/dashboard-stats keys that consume effective points) on override upsert and delete.
- **IN-010** [Quality] `src/features/units/WeaponTable.tsx:10-41` — **WeaponTable renders tabular data as div grid (accessibility)**  
  The weapon stat table is built from div/span with a CSS grid instead of a semantic table/thead/tbody/th/td structure. Screen readers cannot associate stat values with their column headers (Rng/A/BS/S/AP/D), and the header row is not announced as headers.  
  _Fix:_ Use a real <table> with <th scope="col"> headers (or appropriate ARIA grid roles) so the weapon profile is navigable and column associations are exposed to assistive tech.

### army-lists-mgmt

- **IN-011** [Correctness] `src/features/army-lists/ArmyListDetailPage.tsx:231-240` — **Quick-add and unit-picker faction filter excludes ghost/no-faction lists**  
  quickAddResults filters collection units by (factionFilter === null || u.faction_id === factionFilter). When the list HAS a faction, only collection units whose faction_id exactly matches are shown. Collection units with a null faction_id (legacy/unassigned) are silently excluded from quick-add even though they may be valid to add. This is a soft UX correctness gap; combined with the 8-result slice it can make units appear 'missing' from search.  
  _Fix:_ Consider including faction-less collection units (u.faction_id === null) when a list faction is set, or surface a hint that results are faction-filtered. At minimum confirm this exclusion is intended.
- **IN-012** [Quality] `src/features/army-lists/armyListDetailReducer.ts:1-133` — **Two near-identical portal reducers duplicated between list and detail pages**  
  armyListDetailReducer.ts and armyListsReducer.ts share ~90% of their state shape and actions (unitPicker, loadout, enhancement, leader, datasheetBrowser, printPreview, snapshotHistory, snapshotCompare). armyListsReducer also still carries detail-only state (loadoutUnitId, enhancementUnitId, unitPickerOpen, CLOSE_DETAIL cascade, etc.) even though the page-level comment says only create/edit/delete remain on the list page (ArmyListsPage destructures only sheetOpen/editingList/deleteDialogOpen/deletingList). The unused half of armyListsReducer is dead surface area that can drift.  
  _Fix:_ Trim armyListsReducer down to the create/edit/delete state it actually uses, or extract the shared portal sub-reducer into one module both pages compose. Reduces drift risk and dead code.
- **IN-013** [Quality] `src/features/army-lists/ArmyListCard.tsx:28-46` — **Intentional duplication of points/readiness math between card and summary bar**  
  ArmyListCard recomputes totalPoints / paintedPoints / battleReadyPct inline (status_painting === 'Completed' summed in JS) while ArmyListSummaryBar delegates to computeListHealthStats/computeListWarnings in src/lib. The card comment acknowledges this is deliberate, but it means the two surfaces can diverge if the canonical readiness rule changes (e.g. enhancementTotal handling, rounding). The card sums effective_points in JS whereas the DB layer documents effective points are computed via COALESCE — consistent here, but the duplicated definition is a maintenance trap.  
  _Fix:_ Extract a shared pure helper (e.g. computeCardStats in src/lib) used by both the card and summary bar so the readiness definition lives in one place.
- **IN-014** [Quality] `src/features/army-lists/StaleDataBanner.tsx:1-25` — **StaleDataBanner is dead code (imported nowhere, scope file already notes removal)**  
  ArmyListDetailPage line 66 comments '// Phase 107: StaleDataBanner removed' and does not import it. A grep of the codebase shows no consumer. The component is orphaned; its 30-day staleness logic also duplicates getSyncFreshness/PointsFreshnessBadge which is what the page now uses.  
  _Fix:_ Delete StaleDataBanner.tsx (and any test) if no longer used, or wire it back in intentionally. Keeping orphaned components invites accidental revival of stale logic.
- **IN-015** [Quality] `src/features/army-lists/SnapshotCompareDialog.tsx:162-176` — **Snapshot compare common-unit pairing is O(n^2) and fragile on duplicate names**  
  For each common unit it filters parsedB.units by name and re-scans diff.unitsCommon[0..i] to compute matchIndex, an O(n^2) pairing built purely on unit.name. With duplicate unit names (common in 40k — multiple identical squads) the index pairing can mis-associate B-side points, and the fallback bUnitsWithName[0] silently masks mismatches. Functionally tolerable at personal scale but the logic is hard to verify and the React keys (key={`common-${i}`}) rely on index ordering.  
  _Fix:_ Have computeSnapshotDiff return already-paired {a, b} tuples for common units so the component renders directly without re-deriving pairing, eliminating the nested loop and the [0] fallback.

### army-lists-builder

- **IN-016** [DataIntegrity] `src/features/army-lists/EnhancementPickerSheet.tsx:125-136, 213-219` — **Enhancement max-3 and duplicate-name limits are enforced only in the UI, not at the DB layer**  
  isMaxed (>=3) and isDuplicate checks are computed purely from the React Query-cached listEnhancements array and only disable the Assign button. addEnhancement() in src/db/queries/armyLists.ts does a plain INSERT with no UNIQUE constraint on (list_id, enhancement_name) and no count check. Because listEnhancements is async/cached, two fast Assign clicks (or an action while data is stale after invalidation) can race the guard, persisting a 4th enhancement or a duplicate name that the UI claims is impossible (ENH-02 invariant violated).  
  _Fix:_ Enforce the cap and uniqueness server-side: add a UNIQUE index on (list_id, enhancement_name) (new migration) and/or perform a SELECT COUNT(*) check inside addEnhancement before insert, returning a typed error that the onError toast surfaces. Keep the UI guards as a fast path.
- **IN-017** [Quality] `src/features/army-lists/DatasheetBrowserDialog.tsx:76-91, 117-121` — **Ghost-unit add button has no pending/disabled guard, allowing rapid duplicate adds**  
  handleSelect fires addGhostUnit.mutate on every CommandItem onSelect with no disabled/isPending gating. The dialog intentionally stays open for multi-add (D-04), so repeated Enter/clicks on the same datasheet will enqueue multiple ghost-unit inserts. Unlike the Enhancement and Leader sheets (which disable buttons via mutation.isPending), there is no debounce here. Not catastrophic since planned units can legitimately repeat, but it makes accidental double-adds easy.  
  _Fix:_ Consider gating with addGhostUnit.isPending or a short optimistic-disable per item, or accept the multi-add behavior explicitly. At minimum confirm duplicate planned units are intended.
- **IN-018** [ErrorHandling] `src/features/army-lists/LeaderAttachmentSheet.tsx:119, 164, 201` — **Non-null assertion on list!.id in mutation handlers despite list typed as nullable**  
  factionIdStr can be derived from unit.faction_id alone (line 45-49), so the targets list and Attach/Detach buttons can render with list === null. The mutation calls then use list!.id, which would throw if list were null. In practice ArmyListDetailPage always passes a loaded list when a unit row exists, so this is currently unreachable, but the non-null assertion hides a real nullable path. EnhancementPickerSheet (list!.id at lines 177, 215) and LoadoutBuilderSheet share the same pattern, though the latter guards with `if (!unit || !listId) return`.  
  _Fix:_ Guard explicitly (early return when list is null, or derive list_id once and bail if null) instead of using `list!`. This keeps strict-TS null-safety meaningful and avoids a latent crash if the parent wiring changes.
- **IN-019** [Quality] `src/features/army-lists/UnitPickerDialog.tsx:82-85` — **Sub-faction reset effect runs on every open/close transition**  
  useEffect resets subFactionFilter to null with deps [factionId, open]. Since `open` toggles both true→false and false→true, the reset also fires on close. This is harmless (the dialog is hidden) but means the filter is cleared a beat earlier than necessary and couples the reset to the close transition. Intent is clearly 'reset on reopen'.  
  _Fix:_ Optionally gate on open becoming true (e.g. `if (open) setSubFactionFilter(null)`), or leave as-is since behavior is correct. No functional bug.

### recipes-core

- **IN-020** [Correctness] `src/features/recipes/RecipeFormSheet.tsx:168-185` — **Inline paint-create detection picks wrong paint when multiple paints exist or were created concurrently**  
  After PaintSheet closes, the new paint is identified via `paints.find((p) => !paintsBeforeCreate.includes(p.id))` — the FIRST paint not present in the pre-create snapshot. usePaints() is not guaranteed to return rows in insertion order, and if more than one paint was added (or another query refetch introduced paints) between snapshot and close, `.find` returns an arbitrary/wrong paint id, which then gets auto-assigned to the pending step. The effect also depends only on `paints.length` (exhaustive-deps disabled), so if the count is unchanged but identity changed the wrong branch runs.  
  _Fix:_ Capture the created paint id explicitly from the PaintSheet create flow (have PaintSheet/onCreate return the new id) instead of diffing the list. If diffing must stay, compute the set difference and only auto-select when exactly one new id exists, and key the comparison on a Set of ids rather than length.
- **IN-021** [ErrorHandling] `src/features/recipes/RecipeDetailSheet.tsx:128-141` — **Wishlist bulk-add can partially apply then report a blanket failure**  
  handleAddMissingToWishlist loops `await createWishlistItem.mutateAsync(...)` sequentially inside one try/catch. If item N fails, items 1..N-1 are already committed to the DB but the user only sees "Failed to add paints to wishlist." with no indication that some succeeded. Re-running is safe (it dedupes by name) but the messaging misrepresents state.  
  _Fix:_ Track succeeded count and surface a partial-success toast (e.g. `Added X of Y; some failed`), or wrap the inserts in a single transactional query. At minimum mention that some paints may have been added.
- **IN-022** [Quality] `src/features/recipes/RecipeFormSheet.tsx:197-216` — **Result photo path saved to form but never invalidated/rendered after save**  
  handleResultPhotoUpload writes the file and sets result_photo_path on the form, and it is persisted via saveRecipeGraph, but the field is write-only in this unit — no preview thumbnail and no dedicated cache invalidation for it. If a previously-uploaded photo is replaced, the old file is left on disk (orphaned). Not data-corrupting, but accumulates dead files.  
  _Fix:_ Consider deleting the prior file when replacing, and/or show a thumbnail preview so users can confirm the upload.
- **IN-023** [Quality] `src/features/recipes/RecipeFormSheet.tsx:247-250` — **Diagnostic console.error dumps full recipe graph on save failure**  
  The catch block logs three large JSON.stringify dumps of sections/existingSections/existingSteps to the console on every save error. This looks like leftover debugging instrumentation; it bloats logs and serializes potentially large structures on the error path.  
  _Fix:_ Reduce to a single concise log (error + recipe id) or gate the verbose dump behind a debug flag.
- **IN-024** [Quality] `src/features/recipes/RecipeDetailSheet.tsx:113` — **Add-to-wishlist hidden for recipes with no faction even when paints are missing**  
  canAddToWishlist requires `recipe?.faction_id != null` because createWishlistItem needs a faction_id. A faction-less recipe with missing paints silently offers no way to add them to the wishlist, which is a dead-end for that flow.  
  _Fix:_ Either allow a null/default faction on wishlist items for this path, or show a disabled button with a tooltip explaining a faction is required.
- **IN-025** [Quality] `src/features/recipes/ApplyToUnitsDialog.tsx:124-145` — **Checkbox inside CommandItem relies on parent onSelect; keyboard activation order is subtle**  
  The Checkbox is `tabIndex={-1}` and toggling is delegated to CommandItem.onSelect. Assigned units are disabled and dimmed correctly. This works, but the checkbox is non-interactive on its own and assistive tech only sees the command item — the checkbox's `checked` state is presentational. Acceptable, but worth an aria note if accessibility is a goal.  
  _Fix:_ Add `aria-hidden` to the decorative checkbox or set `role`/`aria-selected` on the CommandItem so screen readers convey selection state from the row rather than the inert checkbox.

### recipes-timeline

- **IN-026** [ErrorHandling] `src/features/recipes/RecipeStepRow.tsx:58-60` — **Photo upload error swallowed with no diagnostic logging**  
  handlePhotoUpload's catch shows a generic `toast.error('Failed to upload photo.')` but discards the actual error (no binding, no console.error). The user is notified (good), but for a flow touching the native fs plugin (dialog/readFile/writeFile), losing the underlying error makes field debugging of permission/path issues impossible.  
  _Fix:_ Capture the error (`catch (err)`) and `console.error('Step photo upload failed', err)` before the toast so failures are diagnosable from logs while still surfacing a friendly message.
- **IN-027** [Quality] `src/features/recipes/SectionedTimeline.tsx:42-56` — **Alt paint availability never counted in section owned/missing tally**  
  sectionAvailability counts only `paint_id`, never `alt_paint_id`, even though the timeline renders alt paints (RecipeStepTimeline lines 62-73) and a missing primary paint with an owned alternative could still be paintable. This is likely intentional, but worth confirming: a section could show 'N missing' while every missing step has an owned alt, overstating un-paintability.  
  _Fix:_ Confirm the product intent. If alt paints should rescue availability, factor alt_paint_id ownership into the owned/missing computation; otherwise add a brief comment documenting that alt paints are deliberately excluded.
- **IN-028** [DataIntegrity] `src/features/recipes/RecipeStepRow.tsx:147-153` — **Numeric time input can store NaN if a non-numeric value reaches onChange**  
  `time_estimate_minutes: e.target.value ? Math.round(Number(e.target.value)) : null` relies on the `type=number` input to prevent non-numeric strings. `Number('abc')` is NaN and `Math.round(NaN)` is NaN, which would be persisted as NaN (becoming NULL/garbage in SQLite). Browser number inputs usually coerce, but pasted/locale-formatted values can slip through. There is also no upper bound despite `min={1}`.  
  _Fix:_ Guard with `Number.isFinite`: e.g. `const n = Math.round(Number(e.target.value)); time_estimate_minutes: e.target.value && Number.isFinite(n) && n >= 1 ? n : null`.

### dashboard

- **IN-029** [Quality] `src/features/dashboard/DashboardPage.tsx:128,527-532` — **DatasheetImportDialog conflict UI is unreachable dead code**  
  `conflictPayload` state is declared and the DatasheetImportDialog renders with `open={conflictPayload !== null}`, but setConflictPayload is only ever called with `null` (onConfirm/onClose). There is no code path that sets a payload, so the dialog can never open. This is leftover/unwired UI plus an unused DatasheetImportPayload import.  
  _Fix:_ Remove the conflictPayload state, the DatasheetImportDialog block, and the DatasheetImportPayload import — or wire the import flow that was intended to populate it.
- **IN-030** [Correctness] `src/features/dashboard/LogSessionSheet.tsx:121-126,156-160,163-165` — **LogSessionSheet effects omit `form` from dependency arrays**  
  The open-reset effect and both reset-chain effects call form.reset / form.setValue but list only [open, defaultUnitId], [watchedRecipeId], and [watchedSectionId] in their deps, omitting `form`. This is benign because the object returned by useForm is stable across renders, but it relies on that implementation detail and would be flagged by react-hooks/exhaustive-deps if a linter were added.  
  _Fix:_ Add `form` to the dependency arrays (it is referentially stable, so no extra renders) to make the dependency contract explicit.
- **IN-031** [Correctness] `src/features/dashboard/computeRecentActivity.ts:76` — **Session activity timestamps normalized to end-of-day local-style but parsed as UTC, causing minor relative-time skew**  
  Sessions are stamped `${session_date} 23:59:59` (a user-picked local calendar date) and RecentActivityFeed renders them via formatRelativeTime, which appends 'Z' and treats the string as UTC (relativeTime.ts:11). For a session logged today by a user behind UTC, 23:59:59Z is in the future, so diffMs <= 0 yields 'just now'; sort ordering against battle_logs.created_at (true UTC) can also be slightly off near midnight. Cosmetic only — no data corruption.  
  _Fix:_ If precise ordering matters, store/compare session timestamps in the same UTC basis as created_at, or treat session_date as a local date explicitly when formatting relative time. Otherwise document the end-of-day approximation.

### rules-hub

- **IN-032** [Correctness] `src/features/rules-hub/EnhancementsList.tsx:44, 47` — **React keys derived from non-unique data fields can collide**  
  Several lists use string data values as keys that are not guaranteed unique. EnhancementsList keys items by item.name (line 44); LoadoutOptionsSection keys by item.option_name (DatasheetPointsTab.tsx:391); leader-target Badges key by t.target_name (DatasheetPointsTab.tsx:221); ability badges key by a.name (DatasheetPointsTab.tsx:238,248); point-tier Badges key by t.modelCount (DatasheetPointsTab.tsx:535). If the Wahapedia-sourced data contains a duplicate name/model-count within a group (which community CSV data can), React will warn and may mis-reconcile rows, dropping or duplicating UI entries.  
  _Fix:_ Use a composite/index-suffixed key (e.g. `${item.name}-${i}` or a stable row id) for these lists to guarantee uniqueness, consistent with the index-suffixed keys already used for models/weapons in DatasheetContent.
- **IN-033** [Quality] `src/features/rules-hub/DetachmentCard.tsx:88` — **Per-detachment ability query fires for every card even when collapsed (N+1)**  
  DetachmentCard calls useDetachmentAbilitiesByDetachment(detachment.id) unconditionally at the top level, so opening the Detachments tab fires one query per detachment immediately (used both for the ability-count badge and the annotation highlight). For a faction with many detachments this is an N+1 fan-out on tab open rather than on expand. Queries are cached with staleTime/gcTime Infinity so it is bounded, but it is avoidable upfront work.  
  _Fix:_ Either fetch all detachment abilities for the faction in one query (join) at the page level, or gate the per-card query on the Collapsible open state if the count badge can be sourced from the faction-level data.
- **IN-034** [Quality] `src/features/rules-hub/RuleNoteEditor.tsx:40-54` — **Unmount flush re-saves note text already persisted by the debounce**  
  After the 500ms debounce successfully saves, initialTextRef is never updated to the saved value. On unmount (or when ruleId/ruleType/ruleName change), the cleanup compares pendingTextRef against the stale initialTextRef and fires a redundant upsert of the same text. The upsert is idempotent (INSERT OR REPLACE) so this is harmless, but it is a wasted write on every editor teardown after editing.  
  _Fix:_ Update initialTextRef.current = value inside the debounce onSuccess so the unmount flush only fires when there is genuinely unsaved text.
- **IN-035** [Quality] `src/features/rules-hub/RulesHubPage.tsx:21-24` — **Dead stub for shared abilities makes the Shared Abilities tab permanently empty**  
  useSharedAbilitiesByFaction is a local stub that always returns { data: [], isLoading: false }. The entire Shared Abilities tab (and SharedAbilityCard) therefore renders only the empty state regardless of faction. This is intentional per the comment (out of Phase 120 scope), but it ships a visible, non-functional tab and an unreachable card component.  
  _Fix:_ Either hide the Shared Abilities tab until the real query is implemented, or wire the stub to the actual data source. At minimum keep the comment so the dead branch is not mistaken for a bug later.

### unit-database

- **IN-036** [Correctness] `src/features/unit-database/UdbUnitRow.tsx:44-66` — **Empty all_statuses string falls through to 'In progress' in dot/label resolvers**  
  resolveWorstStatus guards the empty-string case (returns 'Not Started'), but resolveReadinessDotClass and resolveReadinessLabel do not. For all_statuses === '' , split('|') yields [''], so allDone and allNotStarted are both false and the readiness dot becomes amber 'In progress' with no underlying status. In practice the dot only renders when owned_count > 0 so statuses should be present, but the inconsistency between the three resolvers is a latent bug if an empty aggregate string ever reaches the row.  
  _Fix:_ Add the same `if (!allStatuses) ...` guard in resolveReadinessDotClass/resolveReadinessLabel, or normalize all_statuses upstream so the three resolvers share one parsing path.
- **IN-037** [Quality] `src/features/unit-database/UdbUnitRow.tsx:28` — **Redundant no-op ternary in resolveWorstStatus**  
  `const effectiveIdx = idx === -1 ? -1 : idx;` always evaluates to `idx`, so the ternary is dead code. The intended 'unknown = worst' behavior already works because indexOf returns -1, which is less than any valid index.  
  _Fix:_ Replace with `const effectiveIdx = idx;` or use idx directly to remove the misleading branch.
- **IN-038** [Quality] `src/features/unit-database/applyUdbFilters.ts:44-48` — **Keyword filter returns no results while the keywords map is still loading**  
  When a keyword filter is active but keywordsMap is undefined (still loading from useUdbKeywords), the filter returns false for every unit, showing 'No units match your filters' transiently. This is a brief flash rather than a correctness bug since the map is keyed off the same faction, but it can produce a confusing empty state during the load window.  
  _Fix:_ Consider treating an undefined keywordsMap as 'filter not yet applicable' (pass through) until the map resolves, or gate the keyword Input on keywordsMap availability.

### game-day

- **IN-039** [Quality] `src/features/game-day/GameDayHeader.tsx:111` — **parseInt called without radix on Start CP input**  
  `parseInt(e.target.value)` omits the radix argument. For a type=number input this is practically harmless, but it is a strict-TS-adjacent footgun and inconsistent with explicit-radix usage elsewhere.  
  _Fix:_ Use `parseInt(e.target.value, 10)` (or `Number(e.target.value)`).
- **IN-040** [Quality] `src/features/game-day/ChecklistTab.tsx:47` — **Forgotten-rules lists use array index as React key**  
  Both ChecklistTab (key={i}, line 47) and StrategemsTab (key={`forgotten-${i}`}, line 121) key forgotten-rule rows by array index. getRecentForgottenRules returns a deduplicated string[], so collisions are not currently possible and the lists are static, making this benign today — but index keys are fragile if the source ever changes to allow duplicates or reordering.  
  _Fix:_ Key by the rule string itself (e.g. key={rule}) since the array is already deduplicated, making intent explicit and reorder-safe.
- **IN-041** [Quality] `src/features/game-day/gameDayStore.ts:91` — **migrateGameDayState uses loose double-cast on persisted state**  
  The v0->v1 migration returns `{ ...(persistedState as Record<string, unknown>), listStates: newStates } as GameDayStore`, double-casting untyped persisted JSON straight to the full store type (which includes action functions that are not present in persisted state). This is the standard Zustand persist pattern so it works in practice, but the cast hides any structural drift in persisted shape.  
  _Fix:_ Type the persisted slice explicitly (e.g. a `PersistedGameDayState = Pick<GameDayStore, "listStates">`) and return that, letting Zustand merge actions, rather than asserting the full GameDayStore.

### paints

- **IN-042** [Quality] `src/features/paints/PaintsPage.tsx:123-139` — **Empty-DB-with-active-flag-filter shows a blank page (no table, no empty state)**  
  The unfiltered empty state (line 123) requires `!hasAny`, and the filtered empty state (line 128) requires `(paints?.length ?? 0) > 0`. The brand/type/color-family filters can only be set when paints exist (their options are derived from the list), BUT the `runningLow` and `wishlist` preset toggles in PaintInventoryFilters render unconditionally and need no options. If the DB has zero paints and a user toggles 'Running Low' or 'Wishlist', `hasAny` becomes true while `paints.length === 0`, so neither empty-state branch renders and the user sees only the filter bar over blank space with no guidance.  
  _Fix:_ Relax the filtered-empty-state guard to fire whenever `hasAny && filtered.length === 0 && !isLoading && !isError` (drop the `(paints?.length ?? 0) > 0` precondition), or render the unfiltered empty state whenever the DB is genuinely empty regardless of `hasAny`.
- **IN-043** [Quality] `src/features/paints/PaintSheet.tsx:88-90` — **form.reset effect omits `form` from deps and overlaps with remount key**  
  The `useEffect(() => form.reset(buildDefaultValues(paint)), [paint])` deliberately omits `form` from its dependency array (react-hook-form's `form` object is stable, so this is safe in practice). However PaintsPage already mounts PaintSheet with `key={editing?.id ?? 'new'}`, forcing a fresh mount whenever the edited paint changes, which re-runs `defaultValues` via `buildDefaultValues(paint)` at line 84 anyway. The reset effect is therefore redundant for the id-change case and only matters if the same component instance is reused for a different `paint` object — which the key prevents. This is dead-ish defensive code, not a bug.  
  _Fix:_ Either rely solely on the remount `key` and drop the effect, or keep the effect and remove the remount key, to avoid two overlapping reset mechanisms. If kept, leave a comment noting `form` is intentionally excluded from deps because the RHF instance is stable.
- **IN-044** [Quality] `src/features/paints/PaintRow.tsx:75-90` — **Recipe badge uses role="link" but does not behave as a link (no href / navigation semantics)**  
  The 'used in N recipes' badge sets `role="link"` with `tabIndex={0}` and Enter/Space key handlers. A real link is activated by Enter (not Space), while role="button" is activated by both — so handling Space here is more button-like than link-like, a minor ARIA-semantics mismatch. The owned-status badge correctly uses role="button". Functionally it navigates fine; this is purely a semantics nit for screen-reader users.  
  _Fix:_ Use role="button" for consistency with the owned badge (it triggers a client-side navigation/filter action, not a document hyperlink), or keep role="link" and drop Space-key activation to match true link behavior.

### settings

- **IN-045** [Correctness] `src/features/settings/ChecklistDefaultsEditor.tsx:108-116, 125-133` — **ChecklistDefaultsEditor savingRef guard can drop a refresh under rapid successive saves**  
  savingRef is a single boolean consumed by the next effect run after settings change. Each saveItems sets it true; the subsequent settings refetch clears it once and skips the resync. If two saves land before the first invalidation round-trips (e.g. drag-reorder immediately followed by add), the second settings refresh may not be guarded and can overwrite local optimistic state, or conversely a stale refresh can clobber a newer local edit. The window is narrow but real with fast interactions.  
  _Fix:_ Track the last value written (e.g. compare serialized toStore against incoming initialItems) rather than a one-shot boolean flag, or debounce/serialize saves so local state and persisted state cannot diverge.
- **IN-046** [DataIntegrity] `src/features/settings/DataManagementTab.tsx:47-50` — **default_faction_id 'None' value cannot round-trip through export/import**  
  DefaultFactionSetting persists the 'None' choice as an empty string for key default_faction_id. The import validator isValidImportValue rejects default_faction_id unless Number(value) > 0, so an exported empty-string value is silently dropped on import. A user who exports with 'None' selected and re-imports will not have that preference restored (it stays at whatever the current DB value is). Minor since '' is also the default, but it is an inconsistency between what is written and what is accepted back.  
  _Fix:_ Accept empty string for default_faction_id in isValidImportValue (treat '' as a valid 'None' value), or document that None is intentionally not exported.
- **IN-047** [ErrorHandling] `src/features/settings/AboutTab.tsx:16-27, 73` — **formatBuiltAt try/catch never catches; malformed built_at renders 'Invalid Date'**  
  new Date(iso) does not throw on an invalid/empty string; it yields an Invalid Date and toLocaleDateString returns the literal 'Invalid Date' instead of throwing, so the catch fallback to `iso` is dead code. If udb_meta.built_at is empty or malformed, the UI shows 'Data date: Invalid Date'.  
  _Fix:_ Guard explicitly: const d = new Date(iso); if (Number.isNaN(d.getTime())) return iso || '—'; then format. This makes the fallback actually reachable.
- **IN-048** [DataIntegrity] `src/features/settings/DataManagementTab.tsx:39-52` — **Imported setting values are not schema-validated for pipeline_labels/default_checklist structure**  
  isValidImportValue only length-checks pipeline_labels, default_checklist, and default_mission_format. A crafted/corrupt JSON string (e.g. default_checklist = '"not-an-array"' or pipeline_labels with non-string values) passes import and is stored. Downstream parsers (parsePipelineLabels, getDefaultChecklist, ChecklistDefaultsEditor) defensively fall back on parse failure, so this does not crash, but it can silently persist garbage settings.  
  _Fix:_ Validate structure for these keys before upsert: JSON.parse and confirm pipeline_labels is an object of string->string over BUCKET_ORDER keys, and default_checklist is an array of {text:string}. Reject (skip) entries that fail.

### data-health

- **IN-049** [Quality] `src/features/data-health/RestorePreviewDialog.tsx:36-42` — **formatRelativeDate produces "-N days ago" for future-dated backups**  
  days is computed as Math.floor((Date.now() - created_at) / dayMs). If the backup's created_at is in the future relative to the local clock (clock skew, timezone-naive timestamp, or a backup made on a machine ahead in time), days is negative and the UI renders e.g. "-2 days ago".  
  _Fix:_ Clamp/handle negatives: if days < 0 return "just now" or "in the future", or use Math.abs with an "in N days" wording. Low impact since it is display-only in a confirmation dialog.
- **IN-050** [Quality] `src/features/data-health/PointsCoverageCard.tsx:40-49, 91` — **Inconsistent percentage precision: overall coverage is integer, per-faction is 1 decimal**  
  The overall pct is computed client-side with Math.round(...) yielding an integer (e.g. 85%), while per-faction rows render f.coverage_pct, which the SQL produces via ROUND(..., 1) (e.g. 84.5%). The badge threshold logic (>=85, >=50) and the displayed value mix integer and one-decimal representations, so the overall and per-faction numbers can look inconsistent and a 84.5% faction shows a non-integer in the badge.  
  _Fix:_ Pick one precision. Either ROUND(...,0) in getPointsCoverage (src/db/queries/diagnostics.ts line 183) for integer percentages everywhere, or round overall to 1 decimal in the component to match. Aligning also makes the colour thresholds behave predictably at boundaries.
- **IN-051** [ErrorHandling] `src/features/data-health/SafetyBackupsList.tsx:61` — **SafetyBackupsList renders "Invalid Date" if backend timestamp is not Date-parseable**  
  entry.timestamp is passed straight to new Date(entry.timestamp).toLocaleString(). The timestamp comes from the Rust list_safety_backups command (likely derived from a filename). If it is not a value JS Date can parse (e.g. a compact filename stamp like 20260612T1430), the row silently shows "Invalid Date" rather than a useful label.  
  _Fix:_ Guard with a parse check: const d = new Date(entry.timestamp); render d valid ? d.toLocaleString() : entry.timestamp (or the raw filename) as a fallback so the user still sees something meaningful.

### painting-mode

- **IN-052** [Quality] `src/features/painting-mode/StepFocalView.tsx:52, 181` — **Duplicated 'exit' hint text in all-complete and active states**  
  Both the all-complete branch ('Press Escape to exit') and the active step branch ('Esc to exit') render an escape-to-exit hint, but the active-step hint at line 181 is always shown regardless of whether an onExit handler / Escape binding actually exists (onExit is optional and only wired in the all-complete branch's button). If Escape-to-exit is only handled by the parent keyboard layer, this is fine; otherwise the hint is misleading when no exit affordance is present.  
  _Fix:_ Confirm the Escape key is globally bound by the painting-mode container; if exit is conditional on onExit, gate the line-181 hint on `onExit` as well to avoid advertising a shortcut that does nothing.
- **IN-053** [Quality] `src/features/painting-mode/StepFocalView.tsx:76` — **Paint swatch with null hex_color renders an invisible/transparent circle**  
  `style={{ backgroundColor: paint.hex_color ?? undefined }}` falls back to undefined when hex_color is null, leaving the swatch with no fill (only border/ring). For paints lacking a hex value the swatch is effectively empty, which looks like a rendering glitch rather than intentional 'unknown color' state.  
  _Fix:_ Provide a neutral placeholder fill or a hatched/'?' indicator when hex_color is null so the swatch reads as intentional.

### painting-projects

- **IN-054** [Quality] `src/features/painting-projects/KanbanBoard.tsx:74-92, 159-175` — **memo() on KanbanCard is largely defeated by non-memoized callback props**  
  KanbanCard is wrapped in React.memo, but KanbanBoard passes handleRemoveFromBoard and handlePaint (re-created on every render, not wrapped in useCallback) down through KanbanColumn to every card. Because these prop references change each render, memo never short-circuits, so all cards re-render on any board state change (e.g. activeUnit set/cleared during drag). For larger boards this is wasted work and undercuts the explicit memo optimization.  
  _Fix:_ Wrap handleRemoveFromBoard, handlePaint (and ideally onEditUnit/onLogSession at the call site) in useCallback so the memo on KanbanCard can actually skip unchanged cards.
- **IN-055** [Quality] `src/features/painting-projects/KanbanBoard.tsx:121` — **Dragging a card within the same column does nothing, with no user feedback**  
  handleDragEnd early-returns when targetStatus === unit.status_painting, so intra-column reordering is silently ignored (ordering is instead derived from priority/target date via sortKanbanCards). This is a defensible design choice, but the cards present a grab handle and sortable affordance, so a user dragging to reorder within a column gets no visible result and no explanation, which reads as a broken interaction.  
  _Fix:_ Either disable intra-column sortable affordances or surface the sort rule (e.g. a tooltip/help text noting cards auto-sort by priority then target date) so the no-op drag is not perceived as a bug.
- **IN-056** [ErrorHandling] `src/features/painting-projects/KanbanBoard.tsx:123-137` — **Optimistic mutations rely solely on React Query default retry:1 with no onSettled reconciliation**  
  The drag-end, remove-from-board (KanbanBoard) and activate (AddProjectPicker) flows do an optimistic setQueryData and roll back on onError, which is correct. However they do not invalidate/refetch in onSettled here; they depend on useUpdateUnit.onSuccess to invalidate UNITS_KEY. That coupling is fine today, but if onSuccess invalidation were ever removed the optimistic cache could silently diverge from the DB. Low risk given current hook behavior; noting for maintainability.  
  _Fix:_ Optional: add an onSettled that invalidates UNITS_KEY at the call site, or add a comment documenting that consistency depends on useUpdateUnit.onSuccess invalidation so the coupling is not accidentally broken.

### factions

- **IN-057** [Quality] `src/db/queries/factions.ts:17-22` — **createFaction INSERT omits wahapedia_faction_id despite it being in CreateFactionInput**  
  CreateFactionInput includes wahapedia_faction_id (types/faction.ts:19) and FactionSheet.tsx onSubmit passes wahapedia_faction_id: null on create (line 99), but the createFaction INSERT only lists 6 columns and never binds wahapedia_faction_id. This is currently harmless because the column is nullable and create always passes null, but it is silent type/runtime drift: if a non-null value were ever passed on create it would be dropped without error.  
  _Fix:_ Either add wahapedia_faction_id to the INSERT column/value list, or drop it from CreateFactionInput and the FactionSheet create payload so the type contract matches what the query actually persists.
- **IN-058** [Quality] `src/features/factions/FactionSheet.tsx:198-212` — **Color picker accepts no manual hex correction path; schema regex mismatch is only surfaced via swatch**  
  color_theme uses an <input type="color">, which always emits a valid 6-digit lowercase hex, so the schema regex (factionSchema.ts:18) can never fail from this control. The redundant runtime regex check in FactionRow.tsx (line 29) guards against bad DB data, which is reasonable defensive code, but the two regexes duplicate the same pattern. Minor maintainability note only.  
  _Fix:_ Optionally extract the hex pattern to a shared constant in factionSchema.ts and reuse it in FactionRow to avoid two copies of /^#[0-9A-Fa-f]{6}$/.

### wishlist

- **IN-059** [Quality] `src/features/wishlist/WishlistItemSheet.tsx:175` — **Cost field label hardcoded to £ while rest of feature respects currency preference**  
  The form label is hardcoded as "Estimated Cost (£)" and the input always treats the value as pounds (divide/multiply by 100 with step=0.01). However, WishlistPage and WishlistItemRow render amounts via formatCurrency + useCurrencyPreference, so a user who has selected EUR/USD/JPY will see € or $ in the list and total but be prompted to enter £ in the form. For zero-decimal currencies like JPY the /100 conversion and 0.01 step are also semantically wrong. This is purely a display/UX inconsistency — the stored integer value is consistent.  
  _Fix:_ Derive the currency symbol/label from useCurrencyPreference (pass it into the Sheet or read it there) so the input label and step match how amounts are displayed elsewhere. Optionally adjust step/scaling for zero-decimal currencies.
- **IN-060** [Quality] `src/features/wishlist/WishlistItemSheet.tsx:182-191` — **Controlled number input reformats with toFixed(2) on every keystroke**  
  The estimated-cost input derives its displayed value from the stored pence via (field.value / 100).toFixed(2) on every render. Because onChange immediately writes Math.round(valueAsNumber * 100) back to form state, the displayed string is re-derived and forced to two decimals after each keystroke, which can cause caret jumps / awkward editing (e.g. while typing a value with trailing zeros or a partial decimal). Functionally correct, only an editing-ergonomics concern.  
  _Fix:_ Hold the raw text in local component state while focused and only convert to pence on blur/submit, or use an uncontrolled defaultValue, so mid-typing keystrokes are not reformatted.

### goals

- **IN-061** [Quality] `src/features/goals/GoalSheet.tsx:129-137` — **target_count form value can become a string, breaking the number type contract**  
  When the Target Unit Count input is cleared, the onChange handler calls field.onChange("") setting the RHF value to an empty string, even though GoalFormValues.target_count is typed as number. Zod's resolver catches this on submit (rejecting non-numbers, so no bad data reaches the DB), but the in-flight form state violates the declared type and relies on the resolver as a backstop. This is a type-safety hole rather than a data bug.  
  _Fix:_ Coerce to a number-or-undefined on change (e.g. field.onChange(raw === "" ? undefined : v)) and/or use z.coerce.number() in goalSchema so the form value type and DB contract stay consistent. Optionally keep a separate display string if an empty intermediate state is desired.
- **IN-062** [Quality] `src/features/goals/GoalSheet.tsx:59-61` — **useEffect reset omits stable form dependency**  
  The effect that resets the form on editingGoal/open change does not list `form` in its dependency array. This is the conventional react-hook-form pattern (form.reset is referentially stable), so it is not a runtime bug, but it is an exhaustive-deps inconsistency worth noting for maintainers.  
  _Fix:_ Either add `form` to the deps (safe, since reset is stable) or add an inline eslint-disable-style comment documenting the intentional omission for future readers. No behavioral change required.
- **IN-063** [Quality] `src/features/goals/GoalsPage.tsx:112-167` — **Section headers lack vertical spacing from cards / between sections**  
  The Active/Completed/Missed sections are wrapped in `flex flex-col gap-0`, and each section renders the uppercase header immediately above the card grid with no margin. Stacked sections (e.g. Active then Completed) will visually collide with no separation, and headers sit flush against their grids. This is cosmetic, not functional.  
  _Fix:_ Add spacing (e.g. gap-6 on the outer flex container and a small mb on the section label, or wrap each section's content) so headers and sections are visually separated.

### spending

- **IN-064** [Correctness] `src/features/spending/SpendingPage.tsx:65` — **Empty-state branch is effectively unreachable when factions exist**  
  isEmpty requires `data.factionBreakdown.length === 0`, but computeSpendingStats always maps EVERY faction into factionBreakdown (see computeSpendingStats.ts:39-44 and its own header comment: 'all 4 factions always rendered, even at £0.00'). Whenever any faction row exists in the DB, factionBreakdown.length is non-zero, so the AND condition is never satisfied. Result: a brand-new user with zero spend never sees the documented 'No spend logged yet' empty state — instead they see the hero card at £0.00, a Cost/Painted-vs-Unpainted card, and a breakdown table full of £0.00 rows. The intended empty state is dead code in practice.  
  _Fix:_ Drop the `factionBreakdown.length === 0` clause and base emptiness purely on monetary totals, e.g. `const isEmpty = data.totalPence === 0;` (totalPence already includes unit spend + paintsPence). If you want to also guard against a no-factions DB, keep that as a separate concern rather than ANDing it into the spend check.
- **IN-065** [DataIntegrity] `src/db/queries/analytics.ts:41-43` — **Hero total and monthly trend disagree on which paints count (owned filter mismatch)**  
  getSpendingStats (spending.ts:27) sums paints with `WHERE owned = 1 AND purchase_price_pence IS NOT NULL`, so the Total Hobby Spend hero and the Paints breakdown row exclude un-owned paints. The analytics monthlySpend query feeding the same page's SpendTrendChart sums paints with no owned filter (only purchase_date/price NOT NULL). The same SpendingPage therefore shows a hero total that excludes un-owned paint spend while the monthly trend below it includes it, so the bars can sum to more than the headline figure for the same period. This is a confusing data-integrity inconsistency within one screen.  
  _Fix:_ Pick one definition of 'spend' and apply it in both queries. If un-owned (e.g. used-up / wishlist) paints should not count as hobby spend, add `AND owned = 1` to the paints UNION branch in analytics.ts so the trend matches the hero total; otherwise relax the spending.ts filter. Document the chosen rule near both queries.
- **IN-066** [Quality] `src/features/spending/SpendingPage.tsx:65` — **isEmpty does not account for negative/over-counted edge but relies on exact-zero equality**  
  isEmpty uses `data.totalPence === 0`. unpaintedValuePence is computed as unitTotalPence - paintedValuePence (computeSpendingStats.ts:60) and could theoretically go negative if data were inconsistent, but totalPence itself is a straight sum so exact-zero is fine here. No action required for correctness; flagged only because the multi-clause condition is fragile and should be simplified per the prior finding.  
  _Fix:_ Simplify the empty check to a single monetary predicate as described above, which also removes this fragility.

### db-client

- **IN-067** [ErrorHandling] `src/db/client.ts:30-33` — **Initialization failure path resets singleton but provides no diagnostic context**  
  The .catch resets _dbPromise (good — allows retry) and rethrows the raw error. There is no logging or wrapping, so a failure to load the DB or apply a PRAGMA surfaces only as whatever low-level error the plugin throws, at each individual call site. For a singleton that every data hook depends on, a startup failure is high-impact and benefits from a single clear diagnostic.  
  _Fix:_ Consider wrapping the rethrown error with context (e.g. 'Failed to initialize hobbyforge.db') before rethrowing, so call-site toasts and logs are actionable. This is a minor quality improvement, not a correctness issue.

### db-queries-1

- **IN-068** [Quality] `src/db/queries/diagnostics.ts:73-92` — **getSchemaVersions named for 'both databases' but only reads hobbyforge.db**  
  The doc comment (L73-75) and the original intent (D-13) describe reading PRAGMA user_version from 'both databases', and SchemaVersions historically implied a rules.db field, but the function now only queries hobbyforge.db and returns a single `hobbyforge` field. This is a benign doc/code drift, not a bug, but the comment is misleading for future maintainers.  
  _Fix:_ Update the comment to reflect that only hobbyforge.db is read, or add the rules.db read if the Data Health page is meant to display it.
- **IN-069** [Quality] `src/db/queries/diagnostics.ts:121-157` — **Duplicate diagnostic logic: getAmbiguousPointMatches and getUnlinkedUnitsCount run the identical query**  
  getAmbiguousPointMatches (L121-136) and getUnlinkedUnitsCount (L143-157) execute the exact same SQL (`SELECT COUNT(*) FROM units WHERE udb_unit_id IS NULL`) and produce near-identical flags with different `type` strings. getDiagnosticFlags only uses getUnlinkedUnitsCount, leaving getAmbiguousPointMatches as effectively dead/duplicated code that could drift.  
  _Fix:_ Remove getAmbiguousPointMatches (or have it delegate to getUnlinkedUnitsCount) to avoid two flags meaning the same thing diverging over time.

### db-queries-2

- **IN-070** [ErrorHandling] `src/db/queries/unitDatabase.ts:339-346` — **FTS5 sanitization leaves bracket/tilde/dot characters that can throw a MATCH syntax error**  
  searchUdbUnits strips quotes, *, ^, parens, braces, colon, +, - and boolean keywords, then appends '*'. It does NOT strip '[', ']', '~', or '.'. An input like '[foo' becomes '[foo*' which FTS5 can reject with a malformed-MATCH error. The query is parameterized so this is not injection, but the thrown error surfaces as a failed search query rather than empty results. (React Query catches it, so impact is limited to a broken search box, not a crash.)  
  _Fix:_ Extend the character-class strip to include '[', ']', '~', '.', or wrap the db.select in a try/catch that returns [] on FTS syntax errors so malformed input yields no results instead of an error state.
- **IN-071** [Quality] `src/db/queries/recipes.ts:173-174` — **duplicateRecipe copies section.optional and section_type raw without ?? null normalization**  
  In duplicateRecipe the section insert passes section.optional and section.order_index directly from the DB row (fine, they are NOT NULL), while createRecipeSection/saveRecipeGraph paths consistently use '?? null' guards on nullable fields. The values read from the DB are already correctly typed so there is no live bug, but the asymmetry with the other write paths makes the code harder to audit for the 0|1 boolean pitfall.  
  _Fix:_ No functional change required. For consistency, mirror the '?? null' convention used in createRecipeSection so all section-insert call sites look identical and the boolean handling is obviously correct.
- **IN-072** [DataIntegrity] `src/db/queries/recipePaints.ts:159-169` — **getRecipePaintAvailability undercounts paints whose owned column is NULL**  
  missing is computed as COUNT(CASE WHEN p.owned != 1 ...). In SQLite, NULL != 1 evaluates to NULL (not true), so any joined paint with a NULL owned value is counted in neither owned, missing, nor running_low. The owned column is almost certainly NOT NULL DEFAULT 0 so this is currently inert, but the condition is fragile if the column constraint ever changes.  
  _Fix:_ Use COALESCE(p.owned,0)!=1 for the missing branch (or owned IS NOT 1) so NULL-owned paints are deterministically classified as missing.

### hooks

- **IN-073** [DataIntegrity] `src/hooks/useRecipes.ts:58-68` — **useDeleteRecipe omits cascade invalidation of step/swatch/section caches**  
  deleteRecipe() in src/db/queries/recipes.ts DELETEs painting_recipes and CASCADE-deletes its recipe_steps (and recipe_sections). Those step deletions make RECIPE_SWATCH_KEY (recipe-swatch-colors), STEP_COUNTS_KEY (recipe-step-counts), RECIPE_AVAILABILITY_KEY (recipe-paint-availability), and SECTION_COUNTS_KEY / ['recipe-sections'] caches stale. useDeleteRecipe only invalidates RECIPES_KEY, ['kanban-enrichment'], and ['recipes','by-unit']. The sibling hooks useDuplicateRecipe and useDeleteRecipeSection both explicitly document and honor this exact cascade-invalidation contract, so the omission here is an inconsistency that leaves the Recipes page showing stale swatch strips, step counts, availability badges, and section counts for the deleted recipe until a manual refetch.  
  _Fix:_ Add qc.invalidateQueries for RECIPE_SWATCH_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, SECTION_COUNTS_KEY, and the ['recipe-sections'] prefix in useDeleteRecipe.onSuccess, mirroring useDuplicateRecipe (lines 78-83).
- **IN-074** [ErrorHandling] `src/hooks/useRulesNotes.ts:20-28` — **useUpsertRulesNote surfaces no error on failure**  
  useUpsertRulesNote defines only onSettled (invalidate) and has no onError. Unlike the sibling useUpsertRulesFavorite in the same phase (which rolls back optimistically and shows toast.error), a failed note save leaves the user with no feedback and the in-memory form text potentially diverging from persisted state after the invalidate-driven refetch overwrites it.  
  _Fix:_ Add an onError handler with toast.error('Failed to save note — changes were not saved.'), matching useRulesFavorites and useGoals.
- **IN-075** [Correctness] `src/hooks/useAppUpdate.ts:12-64` — **useAppUpdate sets state after unmount and ignores the cancelled flag inside checkForUpdate**  
  The mount effect calls checkForUpdate().finally(...) and uses a `cancelled` flag, but checkForUpdate itself calls setStatus/setUpdate/setError/setProgress unconditionally — none of these are guarded by `cancelled`. If the component unmounts during the async check() or downloadAndInstall (a long network operation), these setState calls run on an unmounted component, producing React warnings and wasted work. The cleanup's finally callback only resets state when cancelled, which is itself a setState-after-unmount. The `cancelled` flag therefore guards nothing useful and the reset branch makes the problem worse.  
  _Fix:_ Track mount status with a ref (or AbortController) and guard every setState in checkForUpdate/installUpdate with an isMounted check; remove the setState calls from the cancelled branch of finally.
- **IN-076** [Correctness] `src/hooks/useRulesFavorites.ts:32-52` — **useUpsertRulesFavorite optimistic insert is dropped when cache is empty**  
  onMutate's updater returns `old` unchanged when `!old` (cache empty/undefined), so a favorite added before the list query has populated produces no optimistic UI change. It self-corrects via the onSettled invalidate/refetch, so impact is limited to a brief missing optimistic state, but it is an inconsistency with the documented optimistic-update intent.  
  _Fix:_ When old is undefined, seed the cache with a single-element array containing the placeholder entry rather than returning undefined.
- **IN-077** [DataIntegrity] `src/hooks/useGoals.ts:20-28` — **useGoalProgress query key embeds only goal IDs, not goal target/type**  
  useGoalProgress keys on [...GOAL_PROGRESS_KEY, goalIds] (IDs only). Editing a goal's target/metric without changing its ID does not change the key, so React Query would serve cached progress — however useUpdateGoal invalidates GOAL_PROGRESS_KEY (a prefix of this key), so the cache is correctly busted in practice. The risk is latent: if a future mutation updates goal definitions without invalidating GOAL_PROGRESS_KEY, progress would silently go stale because the key cannot detect the change.  
  _Fix:_ Either include a hash of goal definitions (target, metric) in the query key, or keep an explicit comment that GOAL_PROGRESS_KEY invalidation is the only thing keeping this fresh.
- **IN-078** [Quality] `src/hooks/useNextPaintingAction.ts:32-63` — **useNextPaintingAction recomputes derived data on every render without memoization**  
  The IIFE that builds `data` (paintMap construction, find, map/filter) runs on every render of any component using the hook rather than being wrapped in useMemo keyed on the three query data inputs. For the dashboard's next-action card this is cheap, but it allocates a new object identity each render which can defeat downstream memoization/React.memo on consumers.  
  _Fix:_ Wrap the derivation in useMemo([step, recipePaintsQuery.data, allPaintsQuery.data]) so consumers get stable references.

### components-common-forms

- **IN-079** [ErrorHandling] `src/components/common/LocaleToggle.tsx:17-28` — **Locale switch mutation failure is never surfaced to the user**  
  handleLocaleSwitch calls updateSetting.mutate with an onSuccess handler but no onError. useUpdateSetting (src/hooks/useAppSettings.ts) also defines no onError. If upsertAppSetting fails (e.g. DB locked/IO error), the only feedback is the global MutationCache console.error in QueryProvider — the user sees nothing and the toggle silently appears to do nothing. Because the displayed locale is driven by useLocale() reading from the app-settings query (not optimistic state), a failed write leaves the UI on the old locale with no explanation.  
  _Fix:_ Add an onError callback that shows a destructive toast (sonner) so a failed language switch is visible, e.g. onError: () => toast.error('Could not change language'). Consider centralizing this in useUpdateSetting's onError.
- **IN-080** [ErrorHandling] `src/components/common/UpdateBanner.tsx:19` — **relaunch() promise rejection is unhandled**  
  onClick={() => relaunch()} fires an async Tauri call with no .catch. If relaunch fails, the rejection is unhandled and the user gets no feedback that the restart did not occur. Similarly installUpdate is invoked as an onClick handler without awaiting; it handles its own errors internally so it is lower risk.  
  _Fix:_ Wrap relaunch() in a handler that catches and surfaces failure via toast, e.g. relaunch().catch(() => toast.error('Restart failed — please close and reopen the app')).
- **IN-081** [Correctness] `src/components/common/PaintingRing.tsx:26-35` — **PaintingRing NaN guard does not actually prevent NaN rendering**  
  The JSDoc states 'percentage ?? 0 guard prevents NaN% rendering', but `??` only coalesces null/undefined, not NaN. If a caller passes a computed NaN (e.g. painted/total with total=0), pct stays NaN: strokeDashoffset becomes NaN (arc renders blank) and the label/aria-label read 'NaN%'. Floats also render with long decimals (e.g. '66.6667% painted').  
  _Fix:_ Normalize defensively: `const pct = Number.isFinite(percentage) ? Math.round(Math.min(100, Math.max(0, percentage))) : 0;` and use that for offset, label, and aria-label.
- **IN-082** [Quality] `src/components/common/QueryProvider.tsx:56-60` — **QueryProvider udb-import listener cleanup ignores async unlisten rejection**  
  The effect returns () => { unlisten.then((fn) => fn()); } with no catch. If listen() rejected (so the promise never resolves to a function) the .then never fires, which is fine, but a rejected unlisten promise would surface as an unhandled rejection. Very low risk given Tauri's event API, but inconsistent with the explicit error handling elsewhere in this unit.  
  _Fix:_ Add a .catch on the cleanup chain: unlisten.then((fn) => fn()).catch(() => {}); to make the unsubscribe path rejection-safe.

### components-ui

- **IN-083** [Quality] `src/components/ui/command.tsx:43-58` — **CommandDialog renders sr-only DialogTitle outside the Dialog content portal (and is dead code)**  
  In CommandDialog, the accessibility-only DialogHeader/DialogTitle/DialogDescription block (lines 45-48) is rendered as a sibling of, not inside, DialogContent. Radix Dialog requires the title to live inside the content portal for aria-labelledby to resolve; rendered outside, it does not label the dialog and Radix's missing-Title accessibility warning still fires. This matches a known bug in some shadcn command.tsx versions. Impact is contained because CommandDialog is dead code: it is defined here but never imported anywhere in src/ (the other matches are .claude/worktrees git copies). Not a runtime risk today, but it would ship a broken a11y wiring the moment anyone uses it.  
  _Fix:_ Move the sr-only DialogHeader/DialogTitle/DialogDescription inside <DialogContent>, above <Command>, so the title is part of the dialog portal and properly labels it. Alternatively, if a command palette is not planned, delete the unused CommandDialog export to avoid shipping a latent a11y bug.

### lib-utils

- **IN-084** [Quality] `src/lib/snapshotDiff.ts:91-100` — **Dead code: first consumedB loop in computeSnapshotDiff computes nothing used**  
  Lines 91-100 build a `consumedB` map by iterating snapshotB.units, but the map is never read afterward — the empty else branch only has a comment. The actual 'added' computation is redone independently in lines 102-112 using a separate `addedConsumed` map. The first loop is pure dead code (and would have been flagged by noUnusedLocals if it weren't assigned to via .set()). The diff result itself is correct; this is purely leftover scaffolding.  
  _Fix:_ Delete the consumedB loop (lines 91-100). The unitsAdded computation in lines 102-112 already correctly handles duplicate names via addedConsumed.
- **IN-085** [Correctness] `src/lib/stripHtml.ts:30` — **stripHtml numeric-entity decode breaks for codepoints above U+FFFF**  
  Numeric entities are decoded with `String.fromCharCode(Number(n))`, which only handles UTF-16 code units (<= 0xFFFF). A decimal entity for an astral-plane codepoint (e.g. &#128512; emoji) would produce a wrong/garbled character. Wahapedia ability text in practice uses BMP characters (en/em dash &#8211;/&#8212;), so this is currently latent, but the function is generic and could be reused. Also note hex entities (&#xNNNN;) are not handled at all (silently left as literal text).  
  _Fix:_ Use `String.fromCodePoint(Number(n))` instead of `fromCharCode`. Optionally add a `&#x([0-9a-fA-F]+);` branch if hex entities are expected from any source.
- **IN-086** [Correctness] `src/lib/stripHtml.ts:24-30` — **stripHtml decodes &amp; first, enabling double-decoding of nested entities**  
  Entity replacements run sequentially with `&amp;` decoded first (line 24). Input like `&amp;lt;` (a literally-escaped &lt;) becomes `&lt;` after line 24 and then `<` after line 25 — i.e. it is double-decoded rather than yielding the intended literal `&lt;`. For the Wahapedia sync use case the inputs don't contain doubly-escaped entities, so output is correct today, but the ordering is a latent correctness pitfall if reused on user-controlled or differently-escaped text.  
  _Fix:_ Decode &amp; LAST (after &lt;, &gt;, &nbsp;, &quot;, &apos;, and numeric entities) so a literal `&amp;lt;` resolves to `&lt;` rather than `<`.
- **IN-087** [Quality] `src/lib/formatBytes.ts:19` — **formatBytes can display the boundary value as '10.0' with one decimal**  
  The branch `value < 10 ? value.toFixed(1) : Math.round(value)` means a value like 9.96 (which is < 10) renders as '10.0 MB' via toFixed(1) rounding up, mixing the one-decimal style into a value that visually reads as >= 10. Cosmetic only; the unit and magnitude are correct.  
  _Fix:_ Optional: round first, then branch on the rounded value, or accept the minor display inconsistency. No functional impact.
- **IN-088** [Quality] `src/lib/parseBsdataExtended.ts:226-262` — **extractModelCounts adds dedup key only on success, allowing redundant reprocessing**  
  `seen.has(key)` is checked at line 227, but `seen.add(key)` only runs inside the success branch (line 255) after the globalMin/globalMax validity check passes. A unit whose constraints fail the validity check is never added to `seen`, so a later duplicate selectionEntry with the same name+faction would be re-parsed. Harmless (results array still won't get a duplicate because the second pass would also fail or produce the same row), but it wastes work and the intent of the dedup set is unclear.  
  _Fix:_ Move `seen.add(key)` to immediately after the `seen.has(key)` early-continue (as done in parseCatXml line 80-81), so the dedup guard covers all entries with that key regardless of validity outcome.
- **IN-089** [Quality] `src/lib/exportArmyList.ts:206-208` — **buildJsonFormat reconstructs leader name by regex-stripping a display label**  
  leader_attached_to is derived by string-munging the already-formatted leaderLabel: `.replace("Led by: ", "").replace(/ -- \d+pts$/, "")`. This couples the JSON export to the human display format and would break (or silently mis-extract) if a leader unit name itself contained ' -- ' or a trailing 'NNpts' substring. The raw leader unit_name is available upstream in formatArmyListForExport.  
  _Fix:_ Carry the raw leader unit name (e.g. add a `leaderUnitName: string | null` field to ExportUnit) and emit that directly in JSON instead of re-parsing the display label.

### app-pages

- **IN-090** [Quality] `src/app/army-lists/detail/page.tsx:5-8` — **Non-numeric route id renders a blank dead-end page**  
  ArmyListDetailPageShell does Number(listId) and returns null when NaN. The same pattern exists in game-day/page.tsx (5-8) and painting-mode/page.tsx (24-29). For a manually-typed or stale bad URL (e.g. /army-lists/abc) the user sees a completely blank content area with no message and no way to recover, rather than a not-found / back-link state. These paths are normally reached via internal links so the risk is low, but the empty render is a poor dead-end.  
  _Fix:_ Instead of returning null on NaN, render a small not-found block with a link back to the list (mirroring the gameDayIndexRoute fallback in router.tsx lines 185-192), or redirect to the parent route.
- **IN-091** [Quality] `src/lib/resolveReturnTo.ts:27-43` — **KNOWN_ROUTE_SEGMENTS must be hand-synced with the route tree**  
  resolveReturnTo (used by painting-mode exit) validates returnTo against a hardcoded Set of top-level route segments duplicated from src/app/router.tsx. The dashboard '/' route is intentionally not in the set but is special-cased; any new top-level route added to router.tsx but forgotten here will be silently degraded to '/' on exit. The duplication is a known drift risk (the comment acknowledges 'Keep in sync').  
  _Fix:_ Derive the segment set from the router route tree (e.g. iterate router.routeTree children paths) or add a unit test that asserts every layoutRoute child's first path segment is present in KNOWN_ROUTE_SEGMENTS, so drift fails CI rather than degrading navigation silently.

### types-context-stores

- **IN-092** [Quality] `src/context/ActiveFactionContext.tsx:93-103` — **Context value object recreated every render in ActiveFactionProvider**  
  setActiveFaction is defined inline (not wrapped in useCallback) and the Provider value is a fresh object literal on every render. Because `factions` comes from a React Query subscription, this provider re-renders and hands a new value reference to all consumers (160+ call sites via useActiveFaction) even when activeFactionId/hex are unchanged. The CSS-custom-property approach was explicitly chosen for 'zero React re-render cost', but the context value itself still forces consumer re-renders, partially defeating that intent.  
  _Fix:_ Wrap setActiveFaction in useCallback([]) and memoize the provider value with useMemo([activeFactionId, activeFactionHex]). This keeps the value reference stable across faction-list refetches.
- **IN-093** [Quality] `src/context/QuickAddContext.tsx:48-52` — **Context value object recreated every render in QuickAddProvider**  
  openQuickAdd/closeQuickAdd are memoized with useCallback, but the Provider value is a new object literal `{ activeSheet, openQuickAdd, closeQuickAdd }` on each render, so consumers re-render whenever any ancestor re-renders even if activeSheet is unchanged. Minor here (small consumer set), but inconsistent with the callback memoization already in place.  
  _Fix:_ Wrap the value in useMemo([activeSheet, openQuickAdd, closeQuickAdd]) to make the partial memoization effective.
- **IN-094** [Quality] `src/types/recipe.ts:78-91` — **RecipeFormValues duplicated between types/recipe.ts and recipeSchema.ts**  
  RecipeFormValues is hand-defined in src/types/recipe.ts and independently re-derived via z.infer in src/features/recipes/recipeSchema.ts. The two currently match, but they are not linked at the type level, so a future change to the Zod schema (e.g., adding a field) would silently drift from the standalone interface the query layer consumes. The file comment explains the motivation (avoid a transitive feature import) but the duplication has no compile-time guard.  
  _Fix:_ Move the Zod schema (or at least the inferred type) to a location the query layer can import without pulling in feature UI, or add a type-equality assertion test (e.g., a compile-time `assert<Equals<RecipeFormValues, z.infer<typeof recipeSchema>>>()`) so drift is caught.
- **IN-095** [DataIntegrity] `src/types/gameData.ts:18-41` — **Several rules/game-data interfaces type description/name as non-nullable string**  
  UdbStratagem.description, UdbEnhancement.description, and UdbDetachmentAbility.name are typed as non-nullable `string` (and RwDatasheetAbility.name / RwStratagem.name in datasheet.ts similarly). If the underlying CSV/sync ever leaves these columns NULL (Wahapedia source data is frequently sparse), readers would receive null while TypeScript guarantees a string, hiding a potential runtime null when the value is rendered or string-methods are called. This is a latent type-vs-DB nullability assumption rather than a confirmed bug.  
  _Fix:_ Confirm the corresponding migration columns are declared NOT NULL (or DEFAULT ''). If they are nullable, widen these fields to `string | null` to match the DB and force null-handling at render sites.

### rust-backend

- **IN-096** [Quality] `src-tauri/src/lib.rs` — **CLAUDE.md documents a rules.db / bulk_sync_rules architecture that no longer exists**  
  CLAUDE.md (Project overview, Architecture, Key files) states the backend exposes a `bulk_sync_rules` Tauri command, loads a second `rules.db` SQLite database, and that `src/db/rules-client.ts` handles a WAL-mode rules connection. None of these exist in the current tree: there is no bulk_sync_rules command (lib.rs exposes import_unit_database, export_backup, validate_backup, create_safety_backup, get_schema_version, restore_from_backup, list_safety_backups, write_bytes_to_path, ack_successful_launch, factory_reset), no rules.db migrations are registered (only sqlite:hobbyforge.db), and Glob finds no src/db/rules-client.ts. The architecture migrated to a bundled unit_database.json imported into udb_* tables. This is stale documentation that will mislead future work.  
  _Fix:_ Update CLAUDE.md to describe the single-DB (hobbyforge.db) model and the import_unit_database / udb_* pipeline, and remove references to rules.db, rules-client.ts, and bulk_sync_rules.
- **IN-097** [DataIntegrity] `src-tauri/src/lib.rs:584-593` — **udb_meta version-skip relies on a single string equality, no downgrade/repair path**  
  import_unit_database_inner short-circuits (returns all-zero counts) when udb_meta.version equals payload.version. If the udb_* tables were partially wiped or corrupted but udb_meta.version still matches the bundled payload (e.g. a previous import committed udb_meta but a later step failed in a way that left tables empty, or a user manually edited data), the import will refuse to repair because only the version string is compared. There is no row-count sanity check.  
  _Fix:_ Before the early return, additionally verify a minimal invariant (e.g. SELECT COUNT(*) FROM udb_units > 0). If the version matches but core tables are empty, proceed with the re-import instead of skipping.
- **IN-098** [ErrorHandling] `src-tauri/src/lib.rs:466-473` — **preflight_migration_repair runs the whole migration set's checksum repair but errors are only logged**  
  repair_migration_checksums and sync_user_version failures are only printed to stderr; the app then proceeds to plugin init. If checksum repair fails, tauri-plugin-sql/sqlx will subsequently panic on a checksum mismatch with `.expect("error while running tauri application")`, crashing with a raw panic dialog and no actionable guidance — the exact failure mode this preflight was written to avoid. This is acceptable as best-effort, but the swallowed error means a partial repair leaves the user with an opaque crash.  
  _Fix:_ Acceptable as-is for best-effort, but consider surfacing a clearer message (or writing to the launch sentinel/log) when repair fails so the subsequent panic is diagnosable; at minimum keep the eprintln but document that a hard panic can still follow.

---

## Per-unit summary

| Unit | Files | Crit | Warn | Info | Impression |
|---|---|---|---|---|---|
| units-collection | 17 | 0 | 0 | 7 | Generally solid, well-guarded code (sibling-portal pattern, optimistic updates with rollback, explicit photo cleanup); the notable issues are a stale-state combobox in the edit form, a dead-code popover that writes to the wrong query key, and several swallowed-error paths. |
| units-forms-playbook | 14 | 0 | 3 | 3 | Forms and playbook UI are generally solid and use parameterized SQL and HTML sanitization correctly, but there is a priority-field data-loss bug on unit edit, a points-override that can't be saved, and an override-write path that falsely flags imported stats as manual overrides. |
| army-lists-mgmt | 19 | 0 | 4 | 5 | Generally solid feature with consistent reducer/portal patterns, parameterized SQL, correct boolean 0|1 handling, and good error surfacing; a few real bugs around stale uncontrolled inputs, a dead delete-navigation branch, and missing/overbroad invalidations. |
| army-lists-builder | 7 | 0 | 0 | 4 | Well-structured sibling-portal builder components with consistent toast-based error surfacing and correct parameterized DB access; a few client-only validation gaps and minor null-safety/double-submit risks, no critical defects. |
| recipes-core | 13 | 0 | 0 | 6 | Recipes UI is generally solid — queries are parameterized, boolean 0|1 handled correctly, mutations surface errors via toast. Found a few real-but-non-catastrophic issues: a stale-data race in ApplyRecipeDialog/RecipeFormSheet's "detect new paint" heuristic, partial-failure in the wishlist bulk loop, and some minor invalidation/UX gaps. |
| recipes-timeline | 7 | 0 | 1 | 3 | Mostly solid, well-structured timeline/section components; one Rules-of-Hooks violation in SectionedTimeline is the main real bug, plus a few data-integrity and quality notes. |
| dashboard | 19 | 0 | 1 | 3 | Dashboard feature is solid: all SQL is static/parameterized, boolean 0|1 handling is correct, query-key invalidation is wired, and mutation errors surface via toast. Main real issue is a points-calculation inconsistency between dashboard sections; remainder are minor quality/dead-code notes. |
| rules-hub | 10 | 0 | 1 | 4 | Generally solid; HTML is sanitized via DOMPurify and SQL is parameterized, but note-save failures are silently swallowed and several React-key choices risk collisions on duplicate data. |
| unit-database | 13 | 0 | 1 | 3 | Solid, well-typed feature with correct DB-layer separation; main issues are stale filter state across faction switches and unsanitized numeric filter inputs, plus minor dead code. |
| game-day | 9 | 0 | 1 | 3 | Solid, well-structured feature; HTML is sanitized and SQL is delegated to query modules. One real session-data-loss footgun (Start CP edit wipes live CP/undo history) and a few minor quality items. |
| battle-log | 11 | 0 | 2 | 0 | Battle-log feature is well-structured with properly parameterized SQL and correct query-key invalidation; the main risks are a form-reset effect that can wipe in-progress input when async settings resolve, and swallowed errors from fire-and-forget strategy-note appends. |
| paints | 9 | 0 | 0 | 3 | Well-structured, convention-adherent feature: correct 0|1 boolean handling, pence-integer money, parameterized queries via hooks, proper query-key invalidation, optimistic update with rollback, and FK-error toast surfacing. Only minor quality/UX findings. |
| settings | 11 | 0 | 2 | 4 | Generally solid, well-guarded settings unit; main issues are a checklist key-collision bug, missing locale-cache invalidation on preference import, and a few minor validation/round-trip gaps. |
| data-health | 8 | 0 | 1 | 3 | Generally solid, read-mostly diagnostics UI with parameterless SQL (no injection risk); a few minor data-integrity/UX edge cases around the restore flow and date/percentage formatting. |
| painting-mode | 7 | 0 | 2 | 2 | Presentational painting-mode components are generally clean and correctly handle SQLite boolean (=== 1) conventions; two real UI/state bugs around the virtual "General" section progress and collapsible auto-expand. |
| painting-projects | 8 | 0 | 1 | 3 | A clean, well-structured Kanban feature with correct optimistic updates and error toasts; only minor quality and resilience issues found, no Critical or data-corruption bugs. |
| factions | 8 | 1 | 1 | 2 | The factions feature components are well-built (correct param queries, error surfacing, FK-aware delete messaging), but the shared updateFaction query has a destructive partial-update bug and the delete hook under-invalidates related caches. |
| wishlist | 9 | 0 | 0 | 2 | Well-built feature: parameterized SQL, correct pence-integer money handling, proper query-key invalidation, surfaced mutation errors, and matching schema/migration. Only minor UI-consistency findings. |
| goals | 6 | 0 | 0 | 3 | The goals feature is well-built: parameterized SQL, correct query-key invalidation, surfaced mutation errors, and sound period/date logic; only minor type-safety and UX-polish items found. |
| spending | 3 | 0 | 0 | 3 | Solid, well-documented unit with correct integer-pence discipline, no SQL injection, and proper query-key invalidation; two notable issues are an effectively-dead empty-state condition and an owned-paint inconsistency between the hero total and the trend chart. |
| db-client | 1 | 1 | 1 | 1 | client.ts is a clean, well-structured singleton, but its core FK-enforcement guarantee is unsound because tauri-plugin-sql uses a connection pool and the per-connection PRAGMAs only apply to one pooled connection. |
| db-queries-1 | 13 | 2 | 2 | 2 | All SQL is correctly parameterized (no injection); main risks are pool-vs-PRAGMA FK enforcement undermining cascade/throw-on-delete assumptions, unreliable multi-statement transactions over a connection pool, and a lost selected_model_count on snapshot restore. |
| db-queries-2 | 15 | 0 | 1 | 3 | Solid data-access layer: positional params throughout (no SQL injection), correct 0|1 boolean casting and pence-integer currency; a few non-atomic multi-statement writes and minor FTS edge cases worth noting. |
| hooks | 43 | 0 | 0 | 6 | React Query hooks are well-structured with consistent key factories and largely thorough invalidation; the main gaps are one incomplete cascade invalidation on recipe delete and several mutations whose failures never surface to the user. |
| components-common-forms | 14 | 0 | 1 | 4 | App shell and shared common components are well-structured with correct query-key invalidation and schema-version gating; main gaps are unsurfaced mutation/update errors and a couple of minor robustness issues. No security or SQL issues (no DB code in this unit). Note: src/components/forms does not exist. |
| components-ui | 28 | 0 | 0 | 1 | Effectively clean: almost all files are vendored shadcn/ui primitives with only cosmetic local variants; no SQL, data-mutation, boolean-0|1, money, or query-invalidation concerns exist in this presentation-only unit. One minor accessibility nit in unused dead code. |
| lib-utils | 28 | 0 | 0 | 6 | Pure utilities are generally solid: money is integer-pence-only (formatCurrency is the single /100 site), HTML sinks use DOMPurify, slugify/resolveReturnTo guard path-traversal/open-redirect correctly, and points/readiness use strict null checks. Findings are minor quality/edge-case issues with no critical or data-loss bugs. |
| app-pages | 19 | 0 | 1 | 2 | Page layer is mostly thin re-export shells; router and param-parsing shells are sound, but the painting-mode page swallows mutation failures and NaN route params render a blank dead-end. |
| types-context-stores | 26 | 0 | 0 | 4 | Type definitions are clean, well-documented, and faithful to the SQLite schema (boolean 0|1, money-in-pence, nullable FKs all correctly modeled); the two context providers and the locale store shim are correct, with only minor maintainability/perf items. |
| rust-backend | 10 | 0 | 2 | 3 | The Rust backend (lib.rs) and SQL migrations are generally solid — all dynamic SQL is hand-built only over fixed table-name constants (no user input), FK-disable import pass restores FK enforcement even on commit failure, and backups use VACUUM INTO snapshots. Main issues: a user_version drift that can fail the startup DbHealthGate on a fresh install, restore-from-backup deletes WAL sidecars before validating the zip contents, and CLAUDE.md documents a rules.db/bulk_sync_rules architecture that no longer exists. |

