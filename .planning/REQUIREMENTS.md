# Requirements: HobbyForge v0.6.0 "Bulletproof & Honest"

**Defined:** 2026-06-15
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with accurate canonical data and reliable backup/restore. v0.6.0 makes the *delivery* of that value trustworthy (releases that always launch) and *honest* (no UI that lies), then deepens the player journey and broadens data quality.

> **Sequencing law (from research):** Theme A (Release & Reliability) must land **and merge to `master`** — CI gate green + ONE verified real in-place NSIS update — **before** any Theme-B refactor begins. The reliability fix on `fix/update-breaks-app-launch` and the large refactors must not coexist in-flight.

## v0.6.0 Requirements

### Theme A — Release & Reliability (REL)

- [x] **REL-01**: CI runs the full automated suite (`pnpm test` + `cargo test` + `pnpm build`) on every pull request and blocks merge on any failure.
- [x] **REL-02**: The release workflow cannot publish a GitHub Release / `latest.json` unless the CI test job has passed (`release.yml` `needs: test`); the release job pins the Rust toolchain rather than floating it.
- [x] **REL-03**: The data-layer migration list is derived from disk (`readdirSync` of `src-tauri/migrations/`) so the migration-parity test passes and never drifts when a migration is added (fixes the currently-failing 046→047 gap and exercises the wargear schema).
- [x] **REL-04**: A single parity check asserts, in CI and locally before build, that `package.json` version == `tauri.conf.json` version AND migration file count == lib.rs `Migration{}` count == data-layer migration-list length.
- [x] **REL-05**: CI fails if any `src-tauri/migrations/*.sql` file contains a CR byte, preventing the line-ending checksum drift from ever recurring.
- [x] **REL-06**: Installing an update over an existing install launches successfully — verified end-to-end with a real in-place NSIS update (two builds + local `latest.json`), with `preflight.log` recording the repair/consistency outcome.
- [x] **REL-07**: After an update downloads and installs, the app relaunches into the new version without a manual restart.
- [x] **REL-08**: Frontend errors and failed-launch conditions are written to a persistent on-disk diagnostics log (`frontend.log`) alongside the Rust `preflight.log`, so a broken launch is diagnosable without devtools.

### Theme B — Honesty, De-cruft & Consolidation (HON)

- [x] **HON-01**: No UI tells the user that bundled data is stale or that they should "sync" — `StaleDataBanner` and the dead "stale points" dashboard branches are removed; an honest data-provenance/version surface (using the build's content hash) replaces them.
- [x] **HON-02**: All former consumers of the `syncFreshness` type compile cleanly with no dead branches, dangling imports, or unused exports.
- [x] **HON-03**: The Rules Hub "Shared Abilities" tab displays real faction shared/army-rule abilities sourced from the canonical database (no empty stub).
- [x] **HON-04**: A unit's datasheet "Link unit" action is never a permanent dead end — a unit can always be linked to or matched against the canonical Unit Database from the UI.
- [x] **HON-05**: User factions are consolidated into the canonical Unit Database faction model via a map-not-delete migration that preserves every existing FK reference (units, army_lists, painting_sessions, wishlist, `default_faction_id` theming) with zero data loss.
- [ ] **HON-06**: The standalone `/factions` sidebar page is removed; faction management remains reachable from its new home with no loss of capability.
- [ ] **HON-07**: Data Health is moved out of the main sidebar into Settings → Data.
- [ ] **HON-08**: `WeaponTable` is a single shared component (the duplicate `UdbWeaponsTable` is eliminated) consumed by all datasheet/weapon surfaces.
- [ ] **HON-09**: `ArmyListDetailPage` is decomposed into focused sub-components/hooks, each within the project's file-size conventions, with no behavior regression.
- [ ] **HON-10**: The 7 components that call query functions directly are routed through React Query hooks, restoring cache and invalidation guarantees.
- [ ] **HON-11**: The vestigial `promoted_to_reminder` column is removed (or its retention is explicitly justified in the schema).

### Theme C — Player-Journey Depth (PLAY)

- [ ] **PLAY-01**: The user can compare 2–3 unit datasheets side-by-side (stats, weapons, abilities, keywords, points) with differences highlighted; comparison reuses the shared `WeaponTable`.
- [ ] **PLAY-02**: A `udb_leader_targets` table (composite PK, both columns FK → `udb_units` ON DELETE CASCADE) is populated from Wahapedia `Datasheets_leader.csv` via the canonical build → bundled JSON → Rust import pipeline.
- [ ] **PLAY-03**: Leader attachment in the army-list builder validates against canonical attachment targets (only valid leader→target pairs permitted), replacing the fragile name-match guidance; the existing Phase-92 UI is repointed to the FK join.
- [ ] **PLAY-04**: The Collection ⇆ Unit Database loop is bidirectional — from the Collection the user can open a unit's canonical datasheet and add units from the database; from the Unit Database the user sees how many of each unit they own ("owned N").
- [ ] **PLAY-05**: Hobby goal progress is surfaced on the dashboard with a progress visualization (goal-progress derivation verified to still work post-rules.db-elimination before building).

### Theme D — Data Quality at Scale (DAT)

- [ ] **DAT-01**: The build/data pipeline validates referential integrity (FK/orphan checks — e.g. `PRAGMA foreign_key_check`, orphan `sub_faction`, orphan leader-target pairs) and fails the build on violations; covered by data-layer tests.
- [ ] **DAT-02**: All 25 factions' unit data (points, stats, weapons, abilities, keywords) is audited against Wahapedia and corrected (the 22 factions beyond the already-audited SM/NEC/DG).
- [ ] **DAT-03**: French ability and weapon descriptions are added for the audited factions, extending the existing `_fr` overlay (`COALESCE(col_fr, col)` query layer).

## Future Requirements (deferred)

### Player depth / advanced
- **PLAY-FUT-01**: Faction overview page (army-rule + detachment summary in one place).
- **PLAY-FUT-02**: Auto-backup on a schedule (highest-value, hardest-to-recover data insurance).

### Polish
- **HON-FUT-01**: Theme customization / custom painting-status labels (carried-over deferrals).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mathhammer / damage-per-100pts / competitive list legality | Contradicts the explicit painter/collector-not-competitive journey (anti-feature per research) |
| A "Sync"/"Refresh data" button in the UI | Data is bundled offline by design; re-introducing a network surface reverses the deliberate single-DB/offline architecture |
| `tauri-plugin-log` for frontend logging | Hand-rolled FS write is sufficient; avoids a dependency for a single-user tool |
| Renaming the GitHub repo to match `hobbyforge` | Cosmetic only; `origin` is functionally correct; not worth the updater-endpoint churn |
| Multi-game-system, macOS/Linux, mobile, cloud sync/accounts, AI features | Out of scope project-wide (unchanged from PROJECT.md) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REL-03 | Phase 130 | Complete |
| REL-04 | Phase 130 | Complete |
| REL-05 | Phase 130 | Complete |
| REL-01 | Phase 131 | Complete |
| REL-02 | Phase 131 | Complete |
| REL-06 | Phase 132 | Complete |
| REL-07 | Phase 132 | Complete |
| REL-08 | Phase 132 | Complete |
| HON-01 | Phase 133 | Complete |
| HON-02 | Phase 133 | Complete |
| HON-03 | Phase 134 | Complete |
| HON-04 | Phase 134 | Complete |
| HON-05 | Phase 135 | Complete |
| HON-06 | Phase 135 | Pending |
| HON-07 | Phase 135 | Pending |
| HON-08 | Phase 136 | Pending |
| HON-09 | Phase 136 | Pending |
| HON-10 | Phase 136 | Pending |
| HON-11 | Phase 136 | Pending |
| PLAY-02 | Phase 137 | Pending |
| PLAY-03 | Phase 137 | Pending |
| PLAY-01 | Phase 138 | Pending |
| PLAY-04 | Phase 138 | Pending |
| PLAY-05 | Phase 138 | Pending |
| DAT-01 | Phase 139 | Pending |
| DAT-02 | Phase 139 | Pending |
| DAT-03 | Phase 139 | Pending |

**Coverage:**
- v0.6.0 requirements: 27 total
- Mapped to phases: 27 ✓
- Unmapped: 0

---
*Requirements defined: 2026-06-15*
*Last updated: 2026-06-15 — roadmap created, all 27 requirements mapped to phases 130–139*
