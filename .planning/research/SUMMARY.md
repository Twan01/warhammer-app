# Research Summary: HobbyForge v0.6.0 "Bulletproof & Honest"

**Domain:** Tauri 2 desktop app — reliability hardening + honesty cleanup + player-journey depth + data quality, on a mature single-user local-first 40K hobby manager.
**Researched:** 2026-06-15 (4 parallel researchers: Stack, Features, Architecture, Pitfalls)
**Confidence:** HIGH (every claim grounded in direct repo reads + one live Wahapedia CSV fetch)

## Executive Summary

v0.6.0 needs **~zero new dependencies.** The headline deliverable — a CI test gate — is a YAML/process change, not tooling. Auto-update relaunch, frontend logging, unit comparison, the discovery loop, and FK/orphan validation all reuse already-installed packages and the existing query→hook→UI stack.

The milestone's value is **trust**: the app breaks on every in-place update today, and `release.yml` runs zero tests on a tag push — a tag on a red commit builds, signs, and publishes a broken installer + `latest.json` straight to users. Theme A makes releases safe; Themes B/C/D are only safe to ship *on top of* a guarded pipeline.

**The single most important sequencing rule:** Theme A must land and merge to `master` (CI gate green + ONE verified real in-place NSIS update) **before** any Theme-B refactor begins. The 793-line `ArmyListDetailPage` decomposition and the migration files must not coexist as in-flight changes with the pending reliability fix on the dirty `fix/update-breaks-app-launch` branch.

## Stack: almost nothing new

| Need | Resolution | Notes |
|---|---|---|
| CI test gate | GitHub Actions `ci.yml` (PR-trigger) + `release.yml` `needs: test` | `pnpm test` + `cargo test` + `pnpm build`; cache pnpm + cargo; **pin Rust toolchain** (don't float) |
| Relaunch after update | Already wired — `UpdateBanner.tsx` calls `relaunch()` from `@tauri-apps/plugin-process` | But `useAppUpdate.installUpdate` itself never relaunches; confirm the live path |
| Frontend diagnostics log | Hand-roll on `@tauri-apps/plugin-fs` (`writeTextFile` + `BaseDirectory.AppData`) → `frontend.log` beside `preflight.log` | **Do NOT add `tauri-plugin-log`** |
| Comparison / validation | Existing `@tanstack/react-table` + react-virtual + `better-sqlite3` + `PRAGMA foreign_key_check` | No new libs |

**Endpoint note:** updater points at `Twan01/warhammer-app` while identity is `com.hobbyforge.app`. `git remote -v` confirms `origin` IS that repo, so it's functionally correct — cosmetic naming drift only. The load-bearing invariant is keeping bundle `identifier` + `productName` byte-stable across releases.

## Key Technical Decisions (for requirements/roadmap)

- **No `EXPECTED_SCHEMA_VERSION` source of truth exists** — schema version is computed at runtime as `get_migrations().len()`. The parity gate should **derive** the count from disk (`readdirSync` on `src-tauri/migrations/`) and assert all representations agree: migration file count ↔ lib.rs `Migration{}` block count ↔ db-helpers list length ↔ (and package.json == tauri.conf.json). Extend `check-version.mjs`; do not introduce a new hand-maintained constant. **Make the db-helpers list self-deriving so it never re-breaks on a new migration.**
- **The migration-parity test is RED right now**: `tests/data-layer/db-helpers.ts` `HOBBYFORGE_MIGRATIONS` stops at `046`; tree + lib.rs have 47 (`047_army_list_unit_wargear.sql`). A CI gate blocks all releases until this is fixed — **fix it first, in the same phase as the gate.**
- **`udb_leader_targets`** (migration 048): follow the canonical udb import pattern, NOT seed-in-migration. Schema: composite PK `(leader_unit_id, target_unit_id)`, both FK → `udb_units(id)` ON DELETE CASCADE. Populate by adding `Datasheets_leader.csv` (live-verified: header `leader_id|attached_id`, **1,918 pairs**, both columns are Wahapedia datasheet IDs = `udb_units` PKs) to the download list → emit into `unit_database.json` via `build-unit-db.ts` → INSERT in the Rust import. Repoint the **existing** Phase-92 UI (`LeaderAttachmentSheet`, `useLeaderTargets`, `synced_leader_targets`) from fragile name-matching to udb-id join. `getArmyListWithUnits` already exposes `u.udb_unit_id` per row — the join key is in hand.
- **Factions "merge" is a product decision (FLAG):** the `/factions` *page* is redundant vs the canonical Unit Database, but the user `factions` *table* is FK-load-bearing — `units` (RESTRICT), `army_lists`/`painting_sessions` (SET NULL), `wishlist` (CASCADE = deletion wipes rows), plus theming via `app_settings.default_faction_id`. **Route-only relocation = zero data-loss. True table consolidation = data-loss trap requiring a map-not-delete migration.** Recommend route-only + relocate `FactionSheet` (Settings).
- **The fake "sync" is a known stub, not a bug:** `syncFreshness.ts` hardcodes `'fresh'`/"Data bundled with app"; `StaleDataBanner` still renders; ~10–12 consumers depend on the freshness type. Theme B is a teardown → replace with an honest provenance/version surface (build already computes a content hash), drop "stale points" warnings, add **no** "refresh" button (would re-introduce the deliberately-removed network surface).
- **Comparison + Collection⇆UDB loop need no schema change** — reuse the page-level `useMemo` Map batch-lookup pattern and the existing `units.udb_unit_id` FK; comparison should consume the **deduped** `WeaponTable`, so B3 (dedupe) gates C1 (comparison).
- **Goals-on-dashboard prerequisite:** verify the v0.2.2 goal-progress derivation (from `painting_sessions`) still computes post-rules.db-elimination before building the visualization (likely fine — no rules.db dependency expected).

## Watch Out For (top pitfalls, each mapped to a phase)

1. **A broken commit can publish.** `release.yml` triggers only on `v*` tag and runs no tests. → Theme A: PR-trigger `ci.yml`; release job `needs: test`.
2. **The CRLF fix is incomplete against the NEXT migration.** A `048` authored on a dirty checkout can reintroduce the `VersionMismatch` no-window panic. → Theme A: a CI guard that fails on any `\r` in `src-tauri/migrations/*.sql`.
3. **Parity test re-breaks on every migration** unless the list is `readdirSync`-derived. → Theme A.
4. **Refactor + reliability fix coexisting on a dirty branch.** → Sequence: merge Theme A to master first; start B only after.
5. **Factions merge data-loss.** → Route-only unless user explicitly wants consolidation (clarify in requirements).
6. **Removing the freshness type leaves ~12 dangling imports/types.** → Enumerate all consumers before deletion; compile-gate.
7. **Prior identical no-window bug shipped unremediated** (`app-wont-start.md`, `files_changed: []`). → This milestone closes the loop with a *verified* real update + a recorded `preflight.log`.
8. **`relaunch()` never called after `downloadAndInstall`** in `useAppUpdate.ts` → user stuck on "installing". → Theme A.

## Dependency-Ordered Build Sequence

1. **A1 — Fix the red parity test + self-deriving migration list** (db-helpers 046→047; derive from disk). *Gates the CI gate.*
2. **A2 — CI test gate**: PR-trigger `ci.yml` (`pnpm test` + `cargo test` + `pnpm build`, pinned toolchain, cached); `release.yml` `needs: test`; CRLF-in-migrations guard; wire `check-version.mjs` parity gate.
3. **A3 — Update trustworthiness**: confirm/finish `relaunch()` path; frontend diagnostics `frontend.log`; **verify ONE real in-place NSIS update** (two builds + local `latest.json`), confirm window appears + `preflight.log` records repair. **→ merge Theme A to master.**
4. **B — Honesty & de-cruft** (independent, lowest-cost/highest-trust): remove fake sync/freshness UI + StaleDataBanner; honest data-provenance surface; populate-or-remove Shared Abilities tab; fix dead-end "Link unit"; demote Data Health → Settings; route-only Factions merge; **dedupe WeaponTable (B3)**; decompose `ArmyListDetailPage`; route 7 hook-bypassing components through hooks.
5. **C — Player depth**: C0 migration 048 `udb_leader_targets` + pipeline (re-triggers parity gate — proves its value); C1 leader-validation UI rewire; **unit comparison** (needs B3); Collection⇆UDB loop; goals on dashboard (verify derivation first).
6. **D — Data quality**: FK/orphan validation in pipeline + data-layer tests; extended faction audits; French ability/weapon translations (incremental).

## Open Questions for Requirements

1. **Factions merge:** route-only relocation (recommended, zero risk) vs true table consolidation (needs map-not-delete migration)?
2. **Shared Abilities tab:** populate from canonical data, or remove the tab entirely?
3. **Data Quality (Theme D) depth:** full 22-faction audit is L-sized — scope to FK/orphan validation + a couple of factions this milestone, or commit to the full sweep?

## Sources

- Wahapedia Data Export — `Datasheets_leader.csv` fetched live (header `leader_id|attached_id`, 1,918 rows)
- tauri-apps/tauri-action + Tauri updater docs (via Context7)
- Direct repo reads: `release.yml`, `tauri.conf.json`, `useAppUpdate.ts`, `syncFreshness.ts`, `check-version.mjs`, `build-unit-db.ts`, `db-helpers.ts`, `migration-parity.test.ts`, faction FK semantics, `.planning/debug/update-breaks-app-launch.md` + `app-wont-start.md`
