# Architecture Research — v0.6.0 "Bulletproof & Honest"

**Domain:** Tauri 2 + React 19 + SQLite desktop app (HobbyForge); integration architecture for a subsequent milestone
**Researched:** 2026-06-15
**Confidence:** HIGH (all findings grounded in the actual codebase: migrations on disk, lib.rs, query layer, and existing tests)

This document answers "How do v0.6.0's changes integrate with the existing architecture, and what is the right build order?" It is grounded in direct reads of the repo, not training data.

---

## Existing architecture (verified baseline)

```
┌──────────────────────────────────────────────────────────────────────┐
│  UI: src/features/**, src/app/** (18 lazy routes via TanStack Router)  │
│   PageHeader everywhere · sibling Sheet/Dialog portals · useReducer    │
│   for complex page state (ArmyListsPage, ArmyListDetailPage reducer)   │
├──────────────────────────────────────────────────────────────────────┤
│  Hooks: src/hooks/use*.ts (React Query; ENTITY_KEY + useEntity + muts) │
│   staleTime 5m default; Infinity for read-heavy game data              │
├──────────────────────────────────────────────────────────────────────┤
│  Queries: src/db/queries/*.ts (parameterized $1,$2; no feature imports)│
├──────────────────────────────────────────────────────────────────────┤
│  DB client singleton: src/db/client.ts (PRAGMA foreign_keys = ON)      │
├──────────────────────────────────────────────────────────────────────┤
│  tauri-plugin-sql → SQLite hobbyforge.db (single DB, WAL, 47 migs)     │
│  + Rust import: import_unit_database_inner reads bundled                │
│    src-tauri/data/unit_database.json → DELETE-all + INSERT udb_* tables │
└──────────────────────────────────────────────────────────────────────┘
```

**Key facts confirmed by reading the repo:**

| Fact | Evidence |
|------|----------|
| 47 migration files on disk; `lib.rs` has 47 `Migration{}` blocks | `ls migrations/` + `grep -c "Migration {"` lib.rs = 47 |
| `tests/data-layer/db-helpers.ts` lists only **46** (missing `047_army_list_unit_wargear.sql`) | This IS the failing parity test (Theme A "046→047") |
| No `EXPECTED_SCHEMA_VERSION` constant exists anywhere | grep returned nothing; schema version is computed at runtime as `get_migrations().len()` (lib.rs `get_schema_version`) |
| `check-version.mjs` only compares package.json ↔ tauri.conf.json | 18 lines, no migration awareness |
| CI (`release.yml`) runs on tag push only; no `pnpm test`/`cargo test`/`pnpm build` gate | Reads `pnpm install` → `tauri-action` directly |
| udb import is version-guarded by content hash in `udb_meta`; DELETE-all+INSERT-per-table in one tx with FK OFF | lib.rs lines 659–713 |
| `getArmyListWithUnits` already exposes `u.udb_unit_id` per row | armyLists.ts line 72 |
| Leader validation matches by **name** via `synced_leader_targets` (empty table; `replaceSyncedLeaderTargets` never called post-BSData removal) | bsdataExtended.ts + LeaderAttachmentSheet.tsx lines 58–70 |
| `Datasheets_leader.csv` is NOT in `scripts/data/` and NOT in `download-wahapedia.ts` CSV_FILES | confirmed by ls + grep |
| `factions` table holds user data: `color_theme`, `lore_notes`, `description`, `wahapedia_faction_id`; `units.faction_id` FK → `factions.id` | migrations 001, 008, 039 |

---

## Q1 — Version / migration-parity gate

### Where the source-of-truth check should live

**Extend `scripts/check-version.mjs` (broaden it into a "release gate") rather than create a new script.** It already runs as the `check:version` npm script and is the natural home. Keeping one script means CI and local both invoke one command.

**Do NOT introduce a hand-maintained `EXPECTED_SCHEMA_VERSION` constant as the primary source of truth.** The repo's established truth is *migration file count* (PROJECT.md Key Decision: "Schema version = migration count (integer)"). A hardcoded constant is a *second* thing to forget to bump — it adds a failure mode rather than removing one. Instead, **derive** the expected count from the filesystem and assert that three independent representations agree.

### Exact invariants to assert

```
Let N = count of *.sql files in src-tauri/migrations/ matching /^\d{3}_.*\.sql$/

Invariant 1 (version parity):     package.json.version === tauri.conf.json.version
Invariant 2 (lib.rs registration): count of "Migration {" blocks in src-tauri/src/lib.rs === N
Invariant 3 (test helper parity):  HOBBYFORGE_MIGRATIONS.length in tests/data-layer/db-helpers.ts === N
Invariant 4 (contiguous numbering): the 3-digit prefixes are 001..N with no gaps/dupes
Invariant 5 (include_str! coverage): every migrations/NNN_*.sql appears in an include_str!("../migrations/NNN_*.sql") in lib.rs
```

Invariant 3 is exactly what the current failing test embodies (`db-helpers` stuck at 46). Promoting it to the build gate means the **build fails fast** the moment someone adds a migration without updating the helper list — the exact bug class ("update breaks launch" via checksum/registration drift) the milestone exists to kill.

### How it wires into CI + local without false positives

- **Local:** `pnpm check:version` (already wired) now runs all five invariants. `pnpm build` is `tsc && vite build`; add a `prebuild` hook or a `pnpm verify` that build depends on.
- **CI:** add a new `.github/workflows/ci.yml` triggered on `push`/`pull_request` (NOT just tags) running `pnpm install` → `pnpm check:version` → `pnpm test` → `cargo test --manifest-path src-tauri/Cargo.toml` → `pnpm build`. The existing tag-triggered `release.yml` stays as-is (optionally calling the same gate first).
- **False-positive avoidance:** parse with a regex anchored to the `001_` numeric-prefix convention so stray files (a README in migrations/, or the `~/` artifact currently in git status) are ignored. Count `Migration {` with the same brace pattern the passing test in `migration-parity.test.ts` already uses (`/Migration\s*\{/g`) to stay consistent.

**Confidence: HIGH** — every input file and its current shape was read directly.

---

## Q2 — New migration: `udb_leader_targets`

### Why a new table (not repurposing `synced_leader_targets`)

`synced_leader_targets` keys by `leader_name`/`target_name` (TEXT) and `faction_id` (TEXT). It is fed by `replaceSyncedLeaderTargets`, a BSData-sync function that is **never called anymore** (BSData removed in v0.4.7) — so the table is empty and the UI is starved. Name matching is fragile (punctuation/sub-faction variants — exactly the bug migration 046 fixed for factions). The canonical Wahapedia `Datasheets_leader.csv` gives `leader_id|attached_id` pairs that are **both udb unit ids** — so join by id, mirroring how points already resolve through `udb_unit_id`.

### Schema shape — new migration `048_udb_leader_targets.sql`

```sql
-- Migration 048: canonical leader-attachment targets (udb id-keyed).
-- DDL only — no seed (data arrives via the Rust udb import, like all udb_* tables).
CREATE TABLE IF NOT EXISTS udb_leader_targets (
  leader_unit_id  TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  target_unit_id  TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  PRIMARY KEY (leader_unit_id, target_unit_id)
);

CREATE INDEX IF NOT EXISTS idx_udb_leader_targets_leader
  ON udb_leader_targets(leader_unit_id);
CREATE INDEX IF NOT EXISTS idx_udb_leader_targets_target
  ON udb_leader_targets(target_unit_id);
```

**ON DELETE CASCADE on both sides** is correct and consistent with every other udb child table (`udb_unit_models`, `udb_unit_keywords`, etc., all `REFERENCES udb_units(id) ON DELETE CASCADE`). The Rust import does DELETE-all with `PRAGMA foreign_keys = OFF` anyway, so cascade never fires during re-import; it only matters as a correctness guarantee. PK is the composite pair (a leader leads many targets and vice versa) — no surrogate id, matching `udb_unit_keywords`.

### Where it's populated — Rust import via bundled JSON (the established pattern)

Follow the udb import flow exactly. Three coordinated changes:

1. **`scripts/download-wahapedia.ts`** — add `"Datasheets_leader.csv"` to `CSV_FILES` (currently 10 files).
2. **`scripts/build-unit-db.ts`** — add a parse step (mirroring Step 7/keywords): read `Datasheets_leader.csv`; for each row take `leader_id` + `attached_id`; keep only pairs where **both** ids are in `validUnitIds` (drops Legends-filtered/unknown units — the same guard used everywhere); dedup; sort deterministically (`leader_unit_id` then `target_unit_id`); emit a new `leader_targets: UdbLeaderTargetRow[]` array into `UnitDatabaseJson`. **Add the array to the content-hash input** so the version bumps and the import is not skipped.
3. **`src-tauri/src/lib.rs`** (`import_unit_database_inner`) — add `"udb_leader_targets"` to the DELETE list and an INSERT loop over `payload.leader_targets` (bind `leader_unit_id`, `target_unit_id`), plus the field on the `UnitDatabasePayload` serde struct and the count on `UdbImportResult`.

This keeps the migration DDL-only (seeding in migrations caused a documented boot-loop — see Key Decisions), and data ships with the app like all other canonical data. **Do not** seed via migration and **do not** keep the old JS `replace*` write path.

### How the query layer repoints to it

- **New query** `src/db/queries/leaderTargets.ts` (replaces `getLeaderTargetsByFaction`): prefer a batch `getLeaderTargetsForList(listId)` that joins `army_list_units → units → udb_leader_targets` and returns valid `(leader army_list_unit id, target army_list_unit id)` pairs directly — matches the page-level Map pattern and avoids per-row hooks. (Alternatively a simple `getLeaderTargetIdsForLeader(leaderUdbUnitId)`.)
- **New hook** `src/hooks/useLeaderTargets.ts` (rewrite): keyed by `udb_unit_id` (or listId for the batch query), `staleTime: Infinity` (canonical data).
- **`LeaderAttachmentSheet.tsx`** — replace the name-matching `validTargetNames`/`validTargetUnits` memos (lines 58–70) with udb-id matching: the leader's `unit.udb_unit_id` (already on the row, armyLists.ts line 72) → valid `target_unit_id`s; filter `units` where `u.udb_unit_id ∈ validTargetIds`. Ghost units (no `udb_unit_id`) simply won't match — acceptable.
- **`ArmyListDetailPage.tsx`** — drops `useLeaderTargets(factionIdStr)` (the TEXT-faction-id call, lines 184–185) and the `SyncedLeaderTargetRow` prop drilling into `SortableUnitRow`; replaced by the udb-id-based hook/data.
- **Deletable after migration (genuine de-cruft, pairs with Theme B):** `synced_leader_targets` table (a drop migration mirroring `040_drop_synced_points.sql`), `replaceSyncedLeaderTargets` + `getLeaderTargetsByFaction` + `SyncedLeaderTargetRow` in bsdataExtended.ts, and `BsdataLeaderTarget` in parseBsdataExtended.ts.

**Confidence: HIGH** for schema/import pattern (directly mirrors the verified udb_detachments path). **MEDIUM** for the exact CSV column names (`leader_id`/`attached_id`) — verify against the downloaded `Datasheets_leader.csv` header at build time (milestone context states 1,918 pairs, both ids being udb ids).

---

## Q3 — Factions-page merge: data-migration risk

### The critical distinction: there are TWO faction concepts

| Table | Purpose | Has user data? |
|-------|---------|----------------|
| `factions` (migration 001) | **User's army factions** — `color_theme` (theming), `lore_notes`, `description`, plus `wahapedia_faction_id` bridge to canonical | **YES** |
| `udb_factions` (migration 038) | Canonical Wahapedia factions (id="SM" etc.) | No (rebuilt on import) |

`units.faction_id` is a FK to `factions.id` (the user table). `factions` drives faction theming (ActiveFactionContext accent), the dashboard FactionSummaryCard, army-list faction selection, and collection grouping. **It is load-bearing and cannot be dropped.**

### Therefore the "merge" is UI-only, NOT a data migration

The redundant *page* is `src/features/factions/FactionsPage.tsx` (route `/factions`) — a CRUD-on-`factions`-plus-grouped-units view that duplicates what the Unit Database browser does for canonical units. "Merging into the canonical Unit Database" means:

- **Remove the `/factions` route** (router.tsx lines 101–104, lazy import line 26) and its sidebar entry.
- **Preserve faction CRUD reachability** — faction create/edit/theming (`FactionSheet`) and per-faction unit management must move to a surface that still exists. Recommendation: **fold faction management into Settings** (alongside the "demote Data Health into Settings → Data" move), since faction theming is a preference-like concern and Settings is the home for cross-cutting config.
- **Zero schema change. Zero data migration. No data-loss risk** *provided* FactionSheet/FactionDeleteDialog stay wired from the new home. The only real risk is *orphaning the editing UI* (removing the page without relocating FactionSheet, leaving no way to set faction theme/lore) — a functional-loss risk, not a data-loss risk.

**Build-order implication:** Theme B (de-cruft), safe and independent. Do it alongside the Data Health → Settings demotion since both touch routing + Settings.

**Confidence: HIGH** — faction table contents and FK relationships read directly.

---

## Q4 — Unit comparison view + Collection ⇆ UDB discovery loop

### Unit comparison view (Theme C)

Slots into the Unit Database browser using established patterns:

- **Selection state:** reuse the `selectedUnitId` pattern (Key Decision: "store ID, derive unit from cache") but as a small array/Set of up to ~3 udb ids in Zustand (consistent with ephemeral filter state) or local page state.
- **New component:** `src/features/unit-database/UnitCompareDialog.tsx`, or a full-page route `/unit-database/compare` if screen real estate matters (mirrors Painting Mode's full-route choice). Renders 2–3 `UdbDatasheetSheet`-style columns side by side.
- **New query/hook:** batch `getUdbUnitsByIds(ids: string[])` + `useUdbUnitsByIds`, `staleTime: Infinity`. Reuses existing `udb_units`/`udb_unit_models`/`udb_unit_weapons`/`udb_unit_abilities` reads — a multi-id variant of the existing `useUdbDatasheet`. **No schema change.**
- **WeaponTable dedupe (Theme B) is a companion prerequisite:** comparison renders weapon tables in N columns, so dedupe `units/WeaponTable.tsx` vs `unit-database/UdbWeaponsTable.tsx` first, then build comparison on the canonical component.

### Collection ⇆ UDB discovery loop (Theme C)

The FK already exists: `units.udb_unit_id` (ON DELETE SET NULL). One direction (Collection → "View Datasheet") shipped in v0.5.2. The missing reverse is "this canonical unit is **owned ×N** in your collection":

- **New query:** `getOwnedCountsByUdbUnitId(): Promise<Map<udb_unit_id, count>>` — a single `SELECT udb_unit_id, COUNT(*) FROM units WHERE udb_unit_id IS NOT NULL GROUP BY udb_unit_id`. This is the **page-level Map pattern** (Key Decision: "Page-level Map<compositeKey,T>… O(1) per-card lookup, single query") — load once on the Unit Database page, build a `useMemo` Map, pass to rows. **No N+1, no schema change.**
- **New hook:** `useOwnedCountsByUdb` — invalidate when `units` change (cache-invalidation-symmetry rule).
- **UI:** an "Owned ×N" badge on Unit Database rows / datasheet header (consistent with existing ownership/readiness badges) + a link into the filtered Collection. Virtual scrolling is already in place; the Map lookup is O(1) per visible row, so no scroll-perf regression.

**Confidence: HIGH** — FK, Map pattern, and virtual scrolling all verified in the codebase.

---

## Q5 — ArmyListDetailPage decomposition (793 lines, currently dirty on branch)

The page already extracted its reducer (`armyListDetailReducer.ts`, v0.5.2) and delegates portals to sibling components. The remaining bulk: header/actions, summary bar, quick-add search, the categorized unit table + DnD, detachment/reminders/notes sections, and ~70 lines of export handlers (`handleCopyToClipboard`, `handleSaveJson`, `handleSavePdf`).

**Working-branch caveat:** the file is `M` (modified) on `fix/update-breaks-app-launch` — the diff already touches it (HTML-rendering fixes). **Decomposition must be additive/mechanical** (move blocks into new files, no behavior change) and should land *after* that branch's fix merges, or be coordinated to avoid a painful rebase. Sequence as Theme B so it does not conflict with the in-flight fix.

### Safe extraction boundaries (low-risk, no logic change)

| New component | Extracts | Risk |
|---------------|----------|------|
| `ArmyListUnitTable.tsx` | `DndContext` + categorized `unitsByCategory` rendering + `SortableUnitRow` + `handleDragEnd` | LOW — self-contained; props = units, handlers, leaderTargets |
| `useArmyListExport` hook (or `ArmyListExportActions.tsx`) | `handleCopyToClipboard`/`handleSaveJson`/`handleSavePdf` + `ExportDropdown` + snapshot button | LOW — pure handlers; a hook is cleaner since they need list/units/wargear |
| `ArmyListQuickAdd.tsx` | quick-add input + `quickAddResults` memo + `handleQuickAdd` | LOW |
| `ArmyListPortals.tsx` | the 8 sibling Sheet/Dialog portals + dispatch wiring | MEDIUM — must preserve the sibling (never-nested) portal rule and the reducer dispatch contract |
| `ArmyListDetailHeader.tsx` | PageHeader + faction badge + Edit/Game Day/Delete actions | LOW |

The orchestrator keeps the reducer, data hooks, and the shared derived memos (`groupedUnits`/`unitsByCategory`/`leaderNameMap`). Target: orchestrator < ~250 lines, each child < ~200 — consistent with the PlaybookTab/UnitSheet decomposition precedent. **The leader-target repointing (Q2) should land before/with extraction** so `ArmyListUnitTable` is written once against the new udb-id data shape, not the doomed `SyncedLeaderTargetRow` shape.

**Confidence: HIGH** — full file read; extraction boundaries follow existing decomposition precedents.

---

## Q6 — Build order (A gates everything → B → C → D)

```
THEME A — Release Trust (must land first; nothing ships safely without it)
  A1. Fix db-helpers parity (add 047) + promote the 3–5 invariants into
      check-version.mjs as the release gate.                         ← unblocks A2
  A2. Add CI workflow (ci.yml on push/PR): check:version, pnpm test,
      cargo test, pnpm build.                                        ← the actual gate
  A3. Verify real in-place NSIS update end-to-end + preflight.log.
  A4. Persistent frontend diagnostics log + relaunch-after-update UX.
        (A3/A4 are independent of each other; both depend on A1+A2 being green.)

THEME B — Honesty & De-cruft (depends on A green; B precedes C)
  B1. Remove fake sync/freshness UI: delete StaleDataBanner usage, simplify the
      ~10–12 syncFreshness consumers (incl. ArmyListSummaryBar `freshness` prop,
      ArmyListDetailPage `freshness` memo).                          ← independent
  B2. Merge Factions page → relocate FactionSheet (likely Settings); remove
      /factions route. Pair with Data Health → Settings → Data demotion.
  B3. Dedupe WeaponTable (units/ vs unit-database/).                 ← prereq for C1
  B4. Route the 7 hook-bypassing components through hooks.           ← independent
  B5. Decompose ArmyListDetailPage — AFTER the fix/update branch lands; pair
      with B1 (removes freshness) so the table extraction is done once.

THEME C — Player Depth (depends on B; needs new migration + dedupe)
  C0. Migration 048 udb_leader_targets + download/build-script/Rust import wiring
      + drop synced_leader_targets.   ← SCHEMA CHANGE; do early in C, bumps
                                        migration count → re-run the A1 gate.
  C1. Unit comparison view (consumes deduped WeaponTable from B3).
  C2. Leader-attachment full validation (consumes C0; repoints
      LeaderAttachmentSheet + ArmyListDetailPage to udb-id matching; pairs with B5).
  C3. Collection ⇆ UDB "owned ×N" loop (page-level Map; no schema change).
  C4. Goals on dashboard — verify v0.2.2 progress-derivation still works
      post-rules.db-elimination (audit-then-fix; likely small).

THEME D — Data Quality at Scale (last; independent of C, can overlap)
  D1. Audit remaining factions · D2. French translations · D3. FK/orphan
      validation in build pipeline (extends build-unit-db.ts validation step).
```

### Explicit cross-theme dependencies

- **C0 (new migration) re-triggers the A1 gate** — adding migration 048 means db-helpers.ts, lib.rs, and a version bump must all move together; the A gate exists precisely to catch a miss here. The milestone proving its own value.
- **B3 (WeaponTable dedupe) → C1 (comparison)** — comparison renders multiple weapon tables; build on the single canonical component.
- **B5 (decompose) ↔ C0/C2 (leader repoint)** — both touch ArmyListDetailPage's unit-table rendering and the leader-target data shape; do the repoint before/with extraction so the extracted table is written once.
- **B5 vs the in-flight `fix/update-breaks-app-launch` branch** — ArmyListDetailPage is dirty there; sequence B5 after that merge.
- **B1 (freshness removal) ↔ B5** — `freshness` is a prop on ArmyListSummaryBar and a memo in ArmyListDetailPage; removing it simplifies the extraction.

---

## Anti-patterns to avoid (codebase-specific)

| Anti-pattern | Why bad here | Instead |
|--------------|--------------|---------|
| Seeding data in a migration | Documented boot-loop incident; migrations are DDL-only | Ship data in unit_database.json, import via Rust |
| Hardcoding `EXPECTED_SCHEMA_VERSION` as primary truth | A second thing to forget to bump | Derive from migration file count; assert representations agree |
| Name-matching leaders (current) | Empty table + punctuation/sub-faction fragility (same class as the 046 fix) | Join by `udb_unit_id` (already on army-list rows) |
| Dropping the `factions` table in the "merge" | Holds theming/lore + is the FK target for `units` | UI-only: relocate FactionSheet, remove the route |
| Per-row hooks for owned-count or leader-targets | N+1 queries against virtual-scrolled lists | Page-level `useMemo` Map (established pattern) |
| Decomposing ArmyListDetailPage with behavior changes | File is dirty on a fix branch; conflict + regression risk | Mechanical block-moves only, after the fix branch lands |

---

## Open questions / verify-at-build-time

1. **`Datasheets_leader.csv` exact headers** — confirm `leader_id`/`attached_id` column names against the live download before finalizing the build-script parse (MEDIUM confidence on names).
2. **Where FactionSheet relocates** — Settings sub-area vs Unit Database inline. A product call; both low-risk. (Recommend Settings.)
3. **Dashboard goals derivation** — quick audit needed: did any goal-progress query reference rules.db before it was eliminated? Likely not (goals derive from painting_sessions), but verify before assuming C4 is trivial.
4. **`~/` artifact in git root** — a stray path is present; ensure the migration-count regex ignores non-migration files (anchored to `^\d{3}_`, it will).

## Sources

- Direct reads (HIGH): `scripts/check-version.mjs`, `scripts/build-unit-db.ts`, `scripts/download-wahapedia.ts`, `src/lib/syncFreshness.ts`, `src/hooks/useLeaderTargets.ts`, `src/db/queries/bsdataExtended.ts`, `src/db/queries/armyLists.ts`, `src/features/army-lists/ArmyListDetailPage.tsx`, `src/features/army-lists/LeaderAttachmentSheet.tsx`, `src/features/factions/FactionsPage.tsx`, `src-tauri/src/lib.rs` (import command + migration registration), `src-tauri/migrations/038_udb_schema.sql`, `046_backfill_faction_udb_normalized.sql`, `tests/data-layer/migration-parity.test.ts`, `tests/data-layer/db-helpers.ts`, `.github/workflows/release.yml`, `.planning/PROJECT.md`.
