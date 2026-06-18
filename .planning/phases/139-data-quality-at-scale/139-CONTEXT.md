# Phase 139: Data Quality at Scale - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

The heaviest, last phase of v0.6.0 "Bulletproof & Honest." Make the canonical
Unit Database data **verifiably correct, broadly accurate across all 25
factions, and impossible to ship with referential garbage.** Three requirements,
all in the dev-side data pipeline + the canonical `udb_*` tables — **no app
runtime feature work, no user-facing UI:**

1. **DAT-01 (validation gate)** — The build/data pipeline validates referential
   integrity (FK/orphan checks — `PRAGMA foreign_key_check`, orphan
   `sub_faction`, orphan leader-target pairs) and **fails the build on
   violations**, covered by data-layer tests.

2. **DAT-02 (22-faction audit)** — All 25 factions' unit data (points, stats,
   weapons, abilities, keywords) is audited against Wahapedia and corrected —
   the 22 factions beyond the already-audited SM/NEC/DG (v0.4.5 Phase 113).

3. **DAT-03 (French extension)** — French ability/weapon descriptions are added
   for the audited factions, extending the existing `_fr` overlay
   (`COALESCE(col_fr, col)` query layer), with user overrides and
   favorites/notes preserved across the re-import.

**Out of scope (own phases / deferred):** any new UI; rules.db work (eliminated
earlier in the milestone); machine-translation infrastructure; the
WeaponTable a11y conversion and leader-enrichment carried from Phases 136/137
(see [[138-CONTEXT]] deferred list).

> `--auto` run: all four gray areas below were auto-resolved with the
> recommended default, grounded in the existing pipeline
> (`scripts/build-unit-db.ts`, `scripts/audit-faction.ts`), the `_fr` overlay
> mechanism (`translations_fr.json` → build step 10.5 → Rust import → COALESCE
> queries), PITFALLS #15 (re-import / override preservation), ARCHITECTURE
> Theme-D build order (D1/D2/D3), and a live codebase scout. Auto-decision log
> is in `139-DISCUSSION-LOG.md`.

</domain>

<decisions>
## Implementation Decisions

### DAT-01 — Referential-integrity validation gate

- **D-01 (two-layer validation, both gates fail loud):** Validate referential
  integrity in **two complementary places**, matching exactly what the
  requirement names ("fails the build" AND "`PRAGMA foreign_key_check`" AND
  "covered by data-layer tests"):
  - **(a) Build-script gate** — extend `scripts/build-unit-db.ts`'s existing
    validation step (which already does the `MIN_COVERAGE_PCT` / `process.exit(1)`
    gate at lines ~604–611) with **JSON-level referential checks** over the
    in-memory rows before writing `unit_database.json`: every child row's
    `unit_id` (`udb_unit_weapons`/`_abilities`/`_keywords`/`_points`/
    `_models`/`_composition`) resolves to a `udb_units` row; every
    `udb_units.faction_id` resolves to a `udb_factions` row; no orphan
    `sub_faction` values; both ends of every `udb_leader_targets` pair resolve
    to a `udb_units` row. Any violation → `console.error` + `process.exit(1)`,
    failing `pnpm build:udb`.
  - **(b) Data-layer test gate** — a new `tests/data-layer/*.test.ts` that
    imports the built `unit_database.json` into an **in-memory `better-sqlite3`
    DB built from the real migration DDL with `PRAGMA foreign_keys = ON`**, then
    asserts `PRAGMA foreign_key_check` returns **zero rows** plus targeted
    orphan queries (orphan `sub_faction`, orphan leader pairs) return zero. This
    rides the Phase-131 CI test gate, so a regression turns CI red.
  *(auto: recommended — the requirement literally names all three artifacts;
  `better-sqlite3` is already a dev dep and `tests/data-layer/` already imports
  both the artifact (`unit-database-artifact.test.ts`) and the schema
  (`schema-shape.test.ts`, `migration*.test.ts`) — this reuses both established
  patterns rather than inventing a mechanism.)*
- **D-02 (idempotent, no new migration unless forced):** Prefer to add **no new
  migration** — the `_fr` columns and all FK relationships already exist. If
  any orphan-cleanup or backfill DDL is genuinely needed, it MUST be idempotent
  (`CREATE TABLE IF NOT EXISTS`, guarded `WHERE ... IS NULL` UPDATEs — precedent
  045/046 backfills) so re-runs never error or clobber. **Any new migration
  re-triggers the Phase-130 parity/release gate** — budget for the
  `db-helpers.ts` `HOBBYFORGE_MIGRATIONS` + `lib.rs` + version-bump trio
  (PITFALLS #2). *(auto: recommended — milestone's own anti-pattern table.)*

### DAT-02 — 22-faction audit + correction

- **D-03 (batch the existing audit script across all 25):** Reuse
  `scripts/audit-faction.ts` (built for SM/NEC/DG in v0.4.5 Phase 113) — add a
  **batch/loop mode** that runs every faction id and writes one
  `{faction}-audit.{json,md}` report per faction under this phase's `reports/`
  dir (mirroring `.planning/milestones/v0.4.5-phases/113-.../reports/`). Don't
  re-author the comparison logic — it already diffs `unit_database.json` against
  the Wahapedia CSVs field-by-field (stats, weapons, abilities, keywords) with
  `error`/`missing`/`extra` severities. *(auto: recommended — the audit harness
  exists and is proven; scaling it is a loop, not a rewrite.)*
- **D-04 (corrections fix the PIPELINE, never hand-edit the artifact):**
  `unit_database.json` is a **generated build artifact** — it is NEVER
  hand-edited (matches the milestone anti-pattern "ship data in JSON, import via
  Rust; no seeding in migrations"). Triage audit findings into:
  - **Systematic parsing/mapping bugs** (the v0.4.5 audits' dominant finding,
    e.g. `row["Range"]` vs `row["range"]`) → fix in `scripts/lib/`
    (`weaponMapping.ts`, `parseCsv.ts`) or `build-unit-db.ts` so **one fix
    corrects every affected unit across all factions**, then rebuild.
  - **Genuine source gaps / Wahapedia-side quirks** → document in the report;
    accept where the source itself is the limit (the audit's job is honesty
    about what's correct, not inventing data).
  - **Definition of "audited and corrected"** = a report exists for all 25
    factions AND all systematic (non-source-limited) discrepancies are driven to
    zero. *(auto: recommended — exactly how SM/NEC/DG were resolved; honest
    milestone wants real correctness and pipeline fixes are leverage.)*

### DAT-03 — French ability/weapon extension

- **D-05 (extend `translations_fr.json` overlay — no schema change):** Add
  French content to the **existing `scripts/data/translations_fr.json` overlay**,
  which `build-unit-db.ts` step 10.5 already merges into the rows
  (`frOverlay.units`, `.abilities[id].name_fr/description_fr`, `.weapons[key]`,
  `.keywords`). Target the fields the requirement names: **ability `name_fr` +
  `description_fr`, and weapon `name_fr`**, for the audited factions, keyed on
  the **stable Wahapedia IDs / weapon keys** the overlay already uses. The
  `_fr` columns and the `COALESCE(col_fr, col)` read layer
  (`src/db/queries/unitDatabase.ts`) already exist (migration 041 precedent) —
  **no schema change.** *(auto: recommended — the overlay + COALESCE plumbing is
  the established, proven mechanism; reusing it is zero-risk.)*
- **D-06 (FR content authoring is data, not code — planner batches it):** The
  phase delivers the **overlay plumbing, the keying discipline, and the
  preservation guarantee**; the actual French strings are curated/batched
  content (per-faction batches, as the roadmap notes anticipate). **Do NOT
  introduce a machine-translation runtime dependency.** Whether French source
  text can be pulled from a Wahapedia FR locale during `download:wahapedia` vs.
  curated manually is a **researcher question** (flagged below), not a locked
  decision — but it changes nothing structurally: it all lands in
  `translations_fr.json` keyed on Wahapedia IDs. *(auto: recommended — separates
  the stable mechanism from the content-sourcing unknown.)*
- **D-07 (lock override/favorite/notes survival with a test — PITFALLS #15):**
  The re-import is DELETE-all+INSERT keyed on Wahapedia IDs, and user
  overrides/favorites/notes live in **separate `hobbyforge.db` tables, not the
  canonical `udb_*` tables**, so they already survive re-import. DAT-03's success
  criterion explicitly calls this out, so the phase MUST add a **data-layer test
  that simulates a re-import and asserts overrides + favorites + notes persist**
  (and that any idempotent backfill from D-02 is safe on a second run). *(auto:
  recommended — PITFALLS #15 names this exact regression risk; a test turns the
  "they survive" claim into an enforced guarantee.)*

### Sequencing

- **D-08 (validation gate FIRST, then per-faction audit+translate batches):**
  Land **DAT-01 (the FK/orphan gate) before** any DAT-02/DAT-03 data work, so
  every subsequent correction and translation batch is validated fail-fast by
  both gates. Then process factions in **batches that audit + translate together
  per faction group** (rather than all-audits-then-all-translations) so each
  faction reaches "done" end-to-end and re-import churn is minimized. Matches the
  roadmap note: "likely one [plan] for FK/orphan validation, then incremental
  faction-audit + translation batches." *(auto: recommended — ARCHITECTURE
  Theme-D order + roadmap decomposition hint.)*

### Claude's Discretion
- Exact batch grouping of the 22 factions (alphabetical, by size, or by audit-
  finding volume) and how many plans the audit+translate work splits into.
- Exact filenames/locations for the new data-layer FK test and the re-import
  preservation test (follow `tests/data-layer/` naming).
- Whether the JSON-level referential check (D-01a) is a standalone helper in
  `scripts/lib/` or inline in `build-unit-db.ts`.
- The precise in-memory-schema construction in the data-layer FK test (load all
  migration `.sql` files vs. a focused `udb_*` subset) — whichever the existing
  data-layer test helpers (`db-helpers.ts`) already support.
- Report directory name/path for the 25 audit reports under this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap (primary)
- `.planning/ROADMAP.md` §"Phase 139: Data Quality at Scale" (lines ~182–192) —
  goal, DAT-01/02/03, success criteria, and the decomposition/idempotency notes.
- `.planning/REQUIREMENTS.md` DAT-01/DAT-02/DAT-03 (lines ~45–47) — verbatim
  requirement text.

### Architecture & pitfalls
- `.planning/research/ARCHITECTURE.md` §"THEME D — Data Quality at Scale"
  (D1 audit · D2 French · D3 FK/orphan validation, "extends build-unit-db.ts
  validation step") and the Anti-patterns table ("Seeding data in a migration"
  → ship via JSON+import; "Hardcoding EXPECTED_SCHEMA_VERSION").
- `.planning/research/PITFALLS.md` §Pitfall 15 — faction-audit / FR work
  re-import clobbering overrides; the idempotency + stable-Wahapedia-ID-keying
  rule and detection signals (THE key ref for DAT-03).
- `.planning/research/PITFALLS.md` §Pitfall 2 — CRLF/migration-parity gate
  (relevant only if D-02 adds a migration).
- `.planning/research/PITFALLS.md` §Pitfall 7 — orphan leader-target pairs
  (1,918 pairs vs 1,711 units): the leader-pair orphan check D-01 must cover.

### Pipeline & audit precedent (the code this phase extends)
- `scripts/build-unit-db.ts` — the build pipeline: validation/coverage gate
  (~604–611, `MIN_COVERAGE_PCT`/`process.exit(1)`), French overlay merge
  (step 10.5, ~641–689), row construction. DAT-01 extends the gate; DAT-03 feeds
  the overlay.
- `scripts/audit-faction.ts` — the per-faction audit harness (CSV-vs-JSON field
  diff, `AuditError`/`SystematicIssue`); DAT-02 batches it.
- `scripts/lib/weaponMapping.ts`, `scripts/lib/parseCsv.ts`, `scripts/lib/types.ts`
  (`TranslationsFrOverlay`, `CoverageReport`) — where systematic parsing fixes land.
- `scripts/data/translations_fr.json` — the FR overlay to extend (DAT-03).
- `scripts/data/coverage-report.json` — generated coverage artifact.
- `.planning/milestones/v0.4.5-phases/113-priority-faction-data-audit/reports/`
  (`sm-audit.md`, `nec-audit.md`, `dg-audit.md`) — the audited-faction precedent
  and report format to mirror.

### Query/import layer & schema
- `src/db/queries/unitDatabase.ts` — the `COALESCE(name_fr, name)` /
  `COALESCE(description_fr, description)` read layer (lines ~135–321) the FR
  overlay feeds.
- `src-tauri/src/lib.rs` — Rust importer: `udb_*` INSERTs binding `name_fr` /
  `description_fr` (~797–885); DELETE-all+INSERT with FK OFF during re-import.
- `src-tauri/migrations/041_udb_sub_faction_fr.sql` — `_fr` column precedent.
- `tests/data-layer/` — existing `unit-database-artifact.test.ts`,
  `schema-shape.test.ts`, `migration-parity.test.ts`, `db-helpers.ts`
  (`HOBBYFORGE_MIGRATIONS`) — patterns/helpers the new FK + preservation tests reuse.
- `package.json` — `build:udb` / `download:wahapedia` scripts; `better-sqlite3`
  dev dep.

### Conventions
- `CLAUDE.md` §Database patterns — `$1,$2` params, `PRAGMA foreign_keys = ON`,
  idempotent migrations, "never edit existing migration files."

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`scripts/build-unit-db.ts` validation/coverage gate** — already exits non-zero
  below `MIN_COVERAGE_PCT`; DAT-01's JSON referential check slots into the same
  step with the same `process.exit(1)` idiom.
- **`scripts/build-unit-db.ts` step 10.5 French overlay merge** — already reads
  `translations_fr.json` and assigns `name_fr`/`description_fr` per row; DAT-03 is
  pure content extension, no new code path.
- **`scripts/audit-faction.ts`** — full per-faction CSV-vs-JSON diff harness; DAT-02
  wraps it in a 25-faction loop.
- **`tests/data-layer/` + `better-sqlite3` + `db-helpers.ts`** — established
  in-memory-DB-from-migrations test harness; the FK-check and re-import-preservation
  tests are new files in this proven pattern.
- **`COALESCE(col_fr, col)` query layer** (`unitDatabase.ts`) — the FR read path
  already wired; no query changes needed for DAT-03.

### Established Patterns
- **Generated artifact, never hand-edited** — `unit_database.json` is built from
  CSV; corrections fix the pipeline, not the file.
- **Stable Wahapedia-ID keying** — overrides, `_fr` overlay, and leader pairs all
  key on Wahapedia IDs so re-import never clobbers user data (PITFALLS #15).
- **Idempotent guarded migrations / backfills** — `WHERE ... IS NULL`, `IF NOT
  EXISTS` (045/046 precedent).
- **Build-script gate + CI test gate as twin enforcement** — `pnpm build:udb`
  fails locally; Phase-131 CI `test` check fails on PRs.

### Integration Points
- DAT-01 ↔ `build-unit-db.ts` validation step + a new `tests/data-layer/` FK test
  (Phase-131 CI gate).
- DAT-02 ↔ `audit-faction.ts` + `scripts/lib/*` parsing fixes → rebuild artifact.
- DAT-03 ↔ `translations_fr.json` → build step 10.5 → `lib.rs` import → COALESCE
  read layer; plus a re-import preservation test.
- **No new migration expected** → the Phase-130 parity/release gate is NOT
  re-triggered, *unless* D-02 adds idempotent cleanup DDL (then budget the trio).

</code_context>

<specifics>
## Specific Ideas

- The FK/orphan gate must literally run **`PRAGMA foreign_key_check`** (not just a
  JS equivalent) in a data-layer test — the requirement names it, and it's the
  honest SQLite-native check.
- Orphan checks to cover explicitly: child-row `unit_id` → `udb_units`;
  `udb_units.faction_id` → `udb_factions`; orphan `sub_faction`; **both ends of
  every `udb_leader_targets` pair** (PITFALLS #7: 1,918 pairs vs 1,711 units —
  Legends dedup can orphan pairs).
- "Corrected" means **pipeline/source fixes that move systematic discrepancies to
  zero**, with a per-faction report as the evidence — mirroring the SM/NEC/DG
  audit reports.
- Re-import preservation must be **proven by test**, not asserted: overrides,
  favorites, and notes survive a simulated rebuild + re-import.

</specifics>

<deferred>
## Deferred Ideas

- **Machine-translation / automated FR sourcing pipeline** — explicitly NOT a
  runtime dependency this phase; FR text is curated content into the existing
  overlay. A future automation could pre-fill it, but that's its own effort.
- **Surfacing audit reports in-app** (a "data health" view) — out of scope; this
  phase keeps audit output as dev-side `reports/` files.
- Pre-existing deferrals carried from earlier phases (WeaponTable a11y
  conversion, leader "can lead X" datasheet enrichment) remain in
  [[138-CONTEXT]] — not part of DAT work.

None surfaced as scope creep — discussion stayed within the DAT-01/02/03 boundary.

</deferred>

---

*Phase: 139-data-quality-at-scale*
*Context gathered: 2026-06-18*
