# Domain Pitfalls

**Domain:** Tauri 2 + React 19 + SQLite local-first desktop app — shipping v0.6.0 "Bulletproof & Honest"
**Researched:** 2026-06-15
**Confidence:** HIGH (codebase-grounded — root cause already diagnosed in `update-breaks-app-launch.md`, FK/config/CI state verified directly against the tree)

> Scope note: these are pitfalls specific to ADDING the v0.6.0 work to THIS system, not generic Tauri advice. Each is mapped to a theme (A Release Trust / B Honesty & De-cruft / C Player Depth / D Data Quality) and the phase that must own it. Theme A gates everything: do not ship B/C/D over an unverified update path.

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or the exact "update breaks launch" recurrence v0.6.0 exists to kill.

### Pitfall 1: The CRLF/LF checksum drift recurs on the NEXT new migration
**Theme/Phase:** A — version/migration-parity gate + CI line-ending guard
**What goes wrong:** `udb_leader_targets` ships as `048_*.sql` (047 is already wargear). If it is authored/committed on a machine where `core.autocrlf=true` still bites, or via an editor that writes CRLF, that one file embeds CRLF bytes via `include_str!` while the others are LF. The installed base (DBs holding LF-era checksums from the fixed v0.6.0 release) then hits `MigrateError::VersionMismatch` on the new file → silent no-window panic — the *exact* bug just fixed, reintroduced by a single file.
**Why it happens:** `.gitattributes` (`*.sql eol=lf`) is now in place, but it only governs files that pass through git's smudge filter cleanly. A file added on a dirty checkout, or pasted with CRLF, can still land with `\r`. Nothing fails the build today.
**Consequences:** Every user's app fails to launch after the v0.6.0 update; manual reinstall required; the milestone's headline promise is broken on arrival.
**Prevention:**
- CI step (PR-trigger, blocking): assert zero `\r` in `src-tauri/migrations/*.sql`. `scripts/check-migrations.mjs` already exists — extend it to a hard `grep -rl $'\r' src-tauri/migrations && exit 1`.
- Keep the hardened `preflight_migration_repair` as the safety net for the existing corrupted base — but treat it as belt-and-suspenders, not the primary defense.
- Add the new migration on a clean checkout; run `git ls-files --eol src-tauri/migrations/` and confirm `w/lf` for the new file before commit.
**Detection:** `check-migrations.mjs` reports the new migration's stored checksum matches CRLF content but not LF (or vice versa) against a real `%APPDATA%` DB; `preflight.log` records "repairing N version(s)" where N jumps after a release.

### Pitfall 2: CI publishes a broken release because the tag-trigger has no test gate
**Theme/Phase:** A — CI test gate, must precede everything
**What goes wrong:** `.github/workflows/release.yml` triggers ONLY on `push: tags: v*` and runs `tauri-action` directly — no `pnpm test`, no `cargo test`, no version-parity check. A tag on a red commit builds, signs, and publishes a broken installer + `latest.json`. The updater then serves it to every install.
**Why it happens:** The release workflow predates the milestone; it was written to ship, not to gate. There is currently NO PR-trigger CI at all (`.github/workflows/` contains only `release.yml`).
**Consequences:** A broken build reaches the updater endpoint. Because the updater applies in-place over `%APPDATA%`, a bad migration/checksum bricks launch with no easy rollback (the signed artifact is already public).
**Prevention:**
- Add a separate `ci.yml` on `pull_request` + `push: branches` running `pnpm test`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm build`, `pnpm check:version`, and the migration-parity + CRLF checks. This is the gate.
- In `release.yml`, run the same test/build/parity steps as a job that the `tauri-action` job `needs:` — so a tag on red code fails BEFORE any artifact is built or the GitHub Release is created. Order matters: gate job → build/publish job.
- Pin the Rust toolchain (`dtolnay/rust-toolchain@stable` floats; pin to the version in your local `rustc --version` via a `toolchain:` input or `rust-toolchain.toml`) so CI green ≠ local red from a compiler delta.
**Detection:** A release exists for a commit where `pnpm test` was never run; `git log` of the tagged SHA shows failing tests reproduced locally.

### Pitfall 3: The migration-parity test is already broken and will re-break on every migration
**Theme/Phase:** A — fix db-helpers 046→047/048, then make parity self-updating
**What goes wrong:** `tests/data-layer/db-helpers.ts` `HOBBYFORGE_MIGRATIONS` array stops at `046` (comment still says "// 46"), but `src-tauri/migrations/` and `lib.rs` both have 47. The `migration-parity.test.ts` `D-06` test (`Migration {` count === `HOBBYFORGE_MIGRATION_COUNT`) is RED right now. Adding `udb_leader_targets` makes it 48 vs a hand-maintained 46 — the gap widens with every schema change.
**Why it happens:** The migration list is duplicated in three places (filesystem, `lib.rs`, `db-helpers.ts`) and the test asserts they match but the helper is updated by hand. The wargear feature added `047` and nobody updated the helper.
**Consequences:** The test suite is red, so a CI test gate (Pitfall 2) would block ALL releases until fixed — or worse, someone disables the test. The wargear schema (`047`) is never exercised by the data-layer suite, so a regression there ships silently.
**Prevention:**
- First A-phase task: add `047` (and the new `048 udb_leader_targets`) to `HOBBYFORGE_MIGRATIONS`, fix the `// 46` comment.
- Then eliminate the hand-maintenance: have `db-helpers.ts` derive the list by `readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()` instead of a literal array, so it can never drift. Keep the explicit count assertion against `lib.rs` `Migration {` matches as the parity check.
- Add an assertion that the directory count === `lib.rs` count === `EXPECTED_SCHEMA_VERSION` in ONE test, so all three move together.
**Detection:** `pnpm test tests/data-layer/migration-parity.test.ts` fails with `expected 47 to be 46`; `migration-parity` failure already noted as "PRE-EXISTING" in `update-breaks-app-launch.md`.

### Pitfall 4: Refactoring the 793-line ArmyListDetailPage on the dirty reliability branch
**Theme/Phase:** B — decompose ArmyListDetailPage; sequencing relative to A
**What goes wrong:** `fix/update-breaks-app-launch` already has `ArmyListDetailPage.tsx` modified (per git status), alongside the migration files and `lib.rs` reliability fix. Starting a large decomposition on top of these uncommitted/unmerged changes risks: (a) the reliability fix never landing cleanly because it is entangled with a 793→N-file refactor; (b) a merge conflict storm; (c) the comparison view (Theme C) and Factions merge (Theme B) all touching the same army-list surfaces simultaneously.
**Why it happens:** The branch mixes a must-ship hotfix with speculative cleanup. `ArmyListDetailPage` is also a `freshness` consumer AND a `Factions`-referencing file AND a `WeaponTable` consumer — it sits at the intersection of three Theme-B cleanups.
**Consequences:** The reliability fix (the milestone's reason to exist) is held hostage by refactor churn; a bad rebase silently drops the `lib.rs` hardening or the `.gitattributes` renormalize.
**Prevention:**
- LAND THEME A FIRST as its own merge: `.gitattributes` + `lib.rs` preflight + EXPECTED_SCHEMA_VERSION bump + CI gate, verified by a real NSIS update, merged to master BEFORE any decomposition begins.
- Do the `ArmyListDetailPage` decomposition as a behavior-preserving refactor with the orchestrator + sub-component pattern already proven (PlaybookTab, UnitSheet decompositions in Key Decisions) — extract, don't rewrite.
- Remove `freshness`, dedupe `WeaponTable`, and decompose in separate commits/PRs so each is independently revertable.
**Detection:** `git status` shows migrations + `lib.rs` + `ArmyListDetailPage` + 7 weapon-table files all dirty at once; rebase conflicts in `lib.rs`.

### Pitfall 5: Merging the Factions page loses user-owned faction data
**Theme/Phase:** B — merge Factions into Unit Database
**What goes wrong:** The user `factions` table is NOT just a label. It is referenced by: `units.faction_id` (`ON DELETE RESTRICT` — units BLOCK faction deletion), `army_lists.faction_id` and `painting_sessions.faction_id` (`ON DELETE SET NULL`), `wishlist.faction_id` (`ON DELETE CASCADE` — deleting a faction DELETES wishlist rows), plus theming via `app_settings.default_faction_id` and `ActiveFactionContext` (`--faction-accent` CSS var) and faction `lore_notes`. "Merge into the canonical Unit Database" must NOT delete the user-faction rows, because `udb_units` (canonical, 1,711 units) is a *separate* concept from user `factions` that own collection units and theming.
**Why it happens:** The audit framed it as "redundant Factions page," but the *page* being redundant ≠ the *table* being redundant. Removing the route is safe; touching the table is data loss.
**Consequences:** Cascade-deleting a faction wipes wishlist rows; RESTRICT means you can't delete a faction with units anyway (FK violation toast); clearing `default_faction_id` breaks theming cold-start.
**Prevention:**
- Scope the merge to the UI/route layer only: redirect `/factions` to the Unit Database faction picker, fold faction CRUD (rename, lore, accent color) into a section there. Do NOT drop the `factions` table or its FKs.
- If consolidating canonical (`udb_units` faction) with user `factions`, write a migration that MAPS not DELETES, preserving `default_faction_id`, `lore_notes`, accent, and all three FK relationships. Treat as a zero-data-loss migration (precedent: `recipe_paints` RENAME, udb pivot reusing Wahapedia IDs).
- Verify post-merge: every existing unit still resolves its faction; theming still loads; wishlist counts unchanged.
**Detection:** Post-merge, collection units show "Unknown faction"; `default_faction_id` in `app_settings` points to a deleted row; wishlist count dropped.

---

## Moderate Pitfalls

### Pitfall 6: Removing the freshness type leaves dangling imports across ~12 consumers
**Theme/Phase:** B — remove fake sync/freshness UI
**What goes wrong:** `getSyncFreshness` always returns `"fresh"` and `SyncFreshness`/`StaleDataBanner`/`FRESHNESS_DOT_CLASS` are imported by 12 files (verified: `ArmyListDetailPage`, `ArmyListSummaryBar`, `PointsFreshnessBadge`, `StaleDataBanner`, `DataHealthSummaryCard`, `ReadyToPlayCard`, `GameDayPage`, `GameDayReadinessPanel`, `computeUnitWarnings`, `diagnostics.ts`, `backupFreshness.ts`, `syncFreshness.ts`). Deleting `syncFreshness.ts` outright breaks 11 builds; deleting only the banner leaves dead "stale"/"aging" code paths that can never trigger.
**Why it happens:** It was intentionally stubbed as backward-compat tech debt (logged in Key Decisions: "getSyncFreshness always returns 'fresh'; 12 consumers preserved").
**Prevention:**
- Remove top-down, leaf-first: delete the JSX that renders freshness dots/banners in each consumer, THEN delete the now-unused imports, THEN delete `syncFreshness.ts` last. Strict TS (`noUnusedLocals`) will flag every dangling import — lean on `pnpm build` after each file.
- `computeUnitWarnings.ts` and `backupFreshness.ts` may compute warnings off freshness — verify removing the "stale" branch doesn't silently drop a *legitimate* warning. Backup staleness is REAL; sync staleness is FAKE. Do NOT conflate the two.
**Detection:** `pnpm build` errors `'SyncFreshness' is declared but never used`; or a "stale" code branch with no reachable trigger.

### Pitfall 7: The new udb_leader_targets table repoints a name-match UI that may not match by ID
**Theme/Phase:** C — leader-attachment validation
**What goes wrong:** Phase-92 leader attachment validation matches by unit *name* (string). The new `udb_leader_targets` (1,918 pairs from `Datasheets_leader.csv`) keys on Wahapedia datasheet IDs. Repointing the existing UI from name-match to ID-match requires that collection units have a populated `udb_unit_id` FK — but that FK is `ON DELETE SET NULL` and may be NULL for manually-added units. Leader validation will silently return "no valid targets" for any unit not linked to the canonical DB.
**Why it happens:** Two identity systems (user unit name vs canonical Wahapedia ID) coexist; the join only works through `udb_unit_id`.
**Prevention:**
- Fall back to name-match when `udb_unit_id` is NULL, so manual units still validate.
- Import `Datasheets_leader.csv` keyed on the SAME Wahapedia IDs already reused for `udb_units` (precedent: "Reuse Wahapedia string IDs for udb_units"). Confirm both `leader_id` and `attached_id` resolve to existing `udb_units` rows; log orphan pairs.
- Verify the 1,918 pairs against the actual 1,711-unit set — Legends dedup may have removed units that still appear in the leader CSV (orphan FKs).
**Detection:** Leader picker shows "no valid attachments" for a unit that historically validated; orphan-pair count > 0 in import log.

### Pitfall 8: Comparison view + dashboard goals trigger N+1 queries or hooks-in-loops
**Theme/Phase:** C — unit comparison view, goals on dashboard
**What goes wrong:** A side-by-side datasheet comparison naturally invites calling a per-unit hook inside a `.map()` (e.g. `units.map(u => useDatasheet(u.id))`) — a Rules-of-Hooks violation and an N+1 query pattern. Dashboard goals risk the same if each goal card fetches its own progress.
**Why it happens:** The comparison UI iterates units; the intuitive code calls hooks per item.
**Prevention:**
- Use the established batch-enrichment pattern: one hook fetches all compared units' datasheets via a single `WHERE id IN (...)` query, returns a `Map<id, T>`, parent prop-drills to columns (precedent: `useKanbanEnrichment` CTE batch, `useLatestUnitPhotos` called once, "Page-level Map for annotations").
- If a per-item hook is unavoidable, wrap each item in a sub-component (precedent: "Sub-component pattern for hooks-in-loop — DetachmentAbilityRow"). Never call hooks in a loop in the parent.
- Dashboard goals: fetch all goal progress in one query at page level (precedent: dashboard photos fetched once, prop-drilled).
**Detection:** React "rendered more/fewer hooks than expected" error when comparison column count changes; DB query log shows N selects for N compared units.

### Pitfall 9: React Query stale cache shows wrong data in comparison/goals after a mutation
**Theme/Phase:** C — comparison view, goals on dashboard
**What goes wrong:** Game/canonical data hooks use `staleTime: Infinity` + `gcTime: Infinity` (Key Decisions). A comparison view or dashboard goal card reading from these caches won't refetch after a relevant mutation unless the mutation invalidates the exact key. New keys for comparison/goals can drift from the invalidation set.
**Why it happens:** The cache-invalidation-symmetry rule ("if useCreate invalidates a key, useDelete must too") is enforced by convention, not tooling. A new comparison/goals key is easy to forget.
**Prevention:**
- Apply the symmetry rule: every new query key for comparison/goals must be invalidated by every mutation that can change its data. Goals are mutated by painting sessions (precedent: "delete→goal-progress, update→army-lists" symmetry from Phase 35).
- For canonical-DB comparison (read-only, write-rare), `staleTime: Infinity` is correct — it won't change without a rebuild. The risk is only for goals (user-mutable). Keep canonical and goals on different cache policies.
**Detection:** Completing a painting session doesn't move the dashboard goal bar until refresh; comparison shows pre-mutation points after an override edit.

### Pitfall 10: Relaunch-after-update never wired, so even a successful update needs a manual restart
**Theme/Phase:** A — relaunch-after-update UX
**What goes wrong:** `useAppUpdate.ts` calls `update.downloadAndInstall(...)` and sets status to `"installing"` but NEVER calls `relaunch()`. The NSIS installer replaces the binary, but the running (old) process stays up. The user sees "installing" forever, kills the app, and on next manual launch the new binary runs — which is exactly the "I have to redownload manually" friction the user reported. (Explicitly flagged NOT DONE in `update-breaks-app-launch.md`.)
**Why it happens:** Left out to avoid scope creep during the hotfix. The `plugin-process` `relaunch()` is already permitted (used by restore-after-restart).
**Prevention:**
- After `downloadAndInstall` resolves, call `relaunch()` from `@tauri-apps/plugin-process` (precedent: restore flow already does this). Gate behind a user-confirmed "Restart now" button so an in-progress action isn't lost.
- This is also the moment to ensure WAL/SHM sidecars are checkpointed before relaunch so the new process doesn't open a half-written DB (precedent: "WAL/SHM sidecar cleanup before swap").
**Detection:** Update completes, status stuck on "installing"; new version only active after a manual kill + relaunch.

### Pitfall 11: Updater config drift silently disables in-place updates
**Theme/Phase:** A — verify a real in-place NSIS update
**What goes wrong:** In-place updates break (silently, no error) if any of: `productName`/`identifier` change (would change `%APPDATA%` path → "fresh install" loses data + can't match the installed version), the updater `pubkey` no longer matches `TAURI_SIGNING_PRIVATE_KEY` in CI secrets, the `endpoints` `latest.json` URL 404s, or `createUpdaterArtifacts` is dropped. Current config is correct (`com.hobbyforge.app`, pubkey present, endpoint set) — the pitfall is CHANGING it.
**Why it happens:** A rename, a key rotation, or an endpoint typo during the CI work. The updater fails *open* (no update offered) — invisible.
**Prevention:**
- Treat `identifier`, `productName`, `pubkey`, and `endpoints` as frozen for v0.6.0. If the signing key must rotate, ship a transitional release that trusts both keys.
- Verify the real path locally: build v0.6.0, build a v0.6.0+1 with one trivial change, host `latest.json` locally (or point at a draft release), install N, let it update to N+1 in-place, confirm launch + `%APPDATA%` data preserved + `preflight.log` shows "repaired successfully" or "already consistent". This is the milestone's must-do verification (still listed as REMAINING / user's step).
**Detection:** Updater silently never offers an update; or update installs but app launches as a fresh install with empty data (identifier drift).

---

## Minor Pitfalls

### Pitfall 12: WeaponTable dedup changes rendering across 7 surfaces at once
**Theme/Phase:** B — dedupe WeaponTable
**What goes wrong:** Weapon-table rendering is duplicated across 7 files (`ArmyListUnitRow`, `UnitAbilityCard`, `DatasheetPointsTab`, `UdbDatasheetSheet`, `UdbWeaponsTable`, `PlaybookDatasheet`, `WeaponTable`) — most currently dirty on the branch. A single shared component must handle every caller's column set and the bilingual EN/FR `_fr` COALESCE.
**Prevention:** Extract the shared component with the union of needed props (optional columns); migrate callers one at a time with `pnpm build` between each; snapshot-test one weapon row in EN and FR.
**Detection:** A weapon profile renders differently in Game Day vs Unit Database after the dedup.

### Pitfall 13: Persistent frontend diagnostics log grows unbounded / writes on every render
**Theme/Phase:** A — persistent frontend diagnostics log
**What goes wrong:** A frontend log file written naively (append on every error/render, no rotation) bloats `%APPDATA%` and can itself become a startup cost. Mirrors the existing `preflight.log` pattern but from JS.
**Prevention:** Append-only with a size cap / single-file rotation; write through a Rust command (precedent: VACUUM/factory-reset via Rust) or `plugin-fs` with an explicit max size; flush on error, not on render.
**Detection:** `%APPDATA%\com.hobbyforge.app` log file in the tens of MB; UI jank correlated with logging.

### Pitfall 14: Hook-layer bypass fixes re-introduce N+1 or break cache invalidation
**Theme/Phase:** B — route 7 hook-layer bypasses through hooks
**What goes wrong:** The 7 components currently call query functions directly (violating "components only call hooks"). Wrapping them in hooks is correct, but a careless wrap can call the hook in a loop (Pitfall 8) or forget the invalidation key (Pitfall 9).
**Prevention:** Each bypass → a named React Query hook with its `*_KEY`; ensure mutations elsewhere invalidate it; verify no hook lands inside a `.map()`.
**Detection:** A bypassed component still shows stale data after a mutation it should react to.

### Pitfall 15: Faction-audit / French-translation data work re-imports and clobbers user overrides
**Theme/Phase:** D — audit factions, French translations, FK/orphan validation
**What goes wrong:** Re-running the build pipeline / re-importing `udb_*` data can wipe manual per-unit overrides if they live in the canonical tables. They don't (Key Decisions: "Overrides in hobbyforge.db, not rules.db" / user data survives re-import via reused Wahapedia IDs) — the pitfall is regressing that during a schema change for translations.
**Prevention:** Keep `_fr` columns and user overrides on rows keyed by stable Wahapedia IDs; the FK/orphan validation step should be idempotent (`CREATE TABLE IF NOT EXISTS`, guarded `WHERE ... IS NULL` UPDATEs — precedent: 045/046 backfills) so re-running it is safe.
**Detection:** Manual point/keyword overrides or favorites/notes vanish after a data refresh; orphan-validation migration is non-idempotent (errors on second run).

---

## Phase-Specific Warnings

| Theme / Phase | Likely Pitfall | Mitigation |
|---|---|---|
| **A** CI test gate | #2 broken release published (tag-only trigger, no gate) | PR-trigger `ci.yml` + `needs:`-gated release job; pin Rust toolchain |
| **A** migration-parity fix | #3 db-helpers stuck at 046; re-breaks every migration | Derive list from `readdirSync`; assert dir==lib.rs==EXPECTED_SCHEMA_VERSION |
| **A** verify NSIS update | #11 config drift; #1 CRLF recurrence; #10 no relaunch | Freeze identifier/pubkey/endpoint; CRLF CI guard; wire `relaunch()` |
| **A** diagnostics log | #13 unbounded log / per-render writes | Size-capped append via Rust command |
| **B** remove freshness | #6 dangling imports across 12 consumers | Leaf-first removal; lean on `noUnusedLocals`; keep real backup-staleness |
| **B** merge Factions | #5 data loss (RESTRICT/SET NULL/CASCADE FKs + theming) | Route-only merge; map-not-delete migration; preserve default_faction_id |
| **B** decompose ArmyListDetailPage | #4 refactor on dirty reliability branch | Land Theme A first; extract not rewrite; separate revertable commits |
| **B** dedupe WeaponTable | #12 7-surface render drift, bilingual COALESCE | Union-prop component; migrate one caller at a time; EN/FR snapshot |
| **B** hook-layer bypasses | #14 re-introduce N+1 / lost invalidation | Named hook + key per bypass; symmetry rule |
| **C** leader-attachment validation | #7 ID-vs-name match; orphan pairs | Name-match fallback for NULL udb_unit_id; validate 1,918 pairs vs 1,711 units |
| **C** comparison view | #8 hooks-in-loop / N+1; #9 stale cache | Batch `IN (...)` query → Map; sub-component if per-item hook needed |
| **C** goals on dashboard | #8 N+1; #9 session→goal invalidation | One goal-progress query at page level; symmetry with painting-session mutations |
| **D** faction audit / FR / FK validation | #15 re-import clobbers overrides; non-idempotent validation | Stable Wahapedia-ID keying; idempotent guarded migrations |

---

## Sources

- `.planning/debug/update-breaks-app-launch.md` — root cause (CRLF/LF checksum drift → sqlx VersionMismatch panic), applied fix (3 commits), and REMAINING verification step. HIGH.
- `.planning/debug/app-wont-start.md` — prior unremediated no-window diagnosis (block_on, WebView2 cache); confirms recurring failure mode. HIGH.
- `tests/data-layer/db-helpers.ts` + `migration-parity.test.ts` — verified `HOBBYFORGE_MIGRATIONS` stops at 046 while tree/lib.rs have 47 (48 with leader table). HIGH.
- `.github/workflows/release.yml` — verified tag-only trigger, no test/parity gate, floating Rust toolchain. HIGH.
- `src-tauri/migrations/001_core_schema.sql` + `009_wishlist.sql` — verified faction FK semantics: units RESTRICT, army_lists/sessions SET NULL, wishlist CASCADE. HIGH.
- `src/lib/syncFreshness.ts` + grep of 12 consumers — verified always-"fresh" stub and consumer list. HIGH.
- `src/hooks/useAppUpdate.ts` — verified no `relaunch()` after `downloadAndInstall`. HIGH.
- `src-tauri/tauri.conf.json` — verified `com.hobbyforge.app`, pubkey, endpoint, createUpdaterArtifacts. HIGH.
- `src/context/ActiveFactionContext.tsx` — verified faction theming via `default_faction_id` + `--faction-accent`. HIGH.
- `.planning/PROJECT.md` Key Decisions — established patterns (batch enrichment, sub-component hooks-in-loop, cache-invalidation symmetry, zero-data-loss migrations, WAL sidecar cleanup, overrides in hobbyforge.db). HIGH.
</content>
