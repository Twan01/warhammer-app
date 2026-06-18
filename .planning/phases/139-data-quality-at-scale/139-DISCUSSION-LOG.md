# Phase 139: Data Quality at Scale - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 139-data-quality-at-scale
**Areas discussed:** FK/orphan validation mechanism, 22-faction audit workflow, French translation scope & idempotency, sequencing
**Mode:** `--auto` (every area auto-resolved with the recommended default; no interactive prompts)

---

## FK/orphan validation mechanism (DAT-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Two-layer: build-script gate + data-layer `PRAGMA foreign_key_check` test | JSON referential checks in `build-unit-db.ts` (`process.exit(1)`) AND a `better-sqlite3` data-layer test running `PRAGMA foreign_key_check` on the imported artifact | ✓ |
| Build-script JSON checks only | Validate referential integrity in `build-unit-db.ts` alone; no SQLite-level test | |
| Data-layer test only | Rely solely on a Vitest `PRAGMA foreign_key_check` against the imported DB | |

**User's choice:** Two-layer (recommended default).
**Notes:** Requirement literally names "fails the build" AND "`PRAGMA foreign_key_check`" AND "covered by data-layer tests" — all three artifacts are needed. `better-sqlite3` is already a dev dep and `tests/data-layer/` already imports both the artifact and the schema, so both gates reuse established patterns. Prefer no new migration; any cleanup DDL must be idempotent (re-triggers the Phase-130 parity gate if added).

---

## 22-faction audit workflow & where corrections land (DAT-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Batch the existing `audit-faction.ts` across all 25; fix systematic issues in the pipeline | Loop the proven per-faction audit harness, write a report per faction, fix parsing/mapping bugs in `scripts/lib/*` so one fix corrects all affected units; never hand-edit the JSON artifact | ✓ |
| Hand-correct discrepancies directly in `unit_database.json` | Edit the generated artifact per finding | |
| Add per-unit override rows for every discrepancy | Push corrections into hobbyforge.db override tables | |

**User's choice:** Batch the existing audit + pipeline fixes (recommended default).
**Notes:** Mirrors the SM/NEC/DG resolution (v0.4.5 Phase 113), whose dominant findings were systematic parsing bugs. `unit_database.json` is a generated artifact and is never hand-edited. "Audited and corrected" = report exists for all 25 factions and all systematic (non-source-limited) discrepancies driven to zero.

---

## French translation scope, sourcing & idempotency (DAT-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Extend `translations_fr.json` overlay, keyed on Wahapedia IDs, + override-preservation test | Add ability `name_fr`/`description_fr` + weapon `name_fr` to the existing overlay; no schema change; add a re-import preservation test | ✓ |
| New `_fr` schema/migration work | Add columns/tables for translations | |
| Machine-translation runtime dependency | Translate at build/runtime via an MT service | |

**User's choice:** Extend the existing overlay (recommended default).
**Notes:** The `_fr` columns and `COALESCE(col_fr, col)` read layer already exist (migration 041 precedent); build step 10.5 already merges the overlay. FR string authoring is curated content batched by the planner — NOT a machine-translation dependency. Whether FR source text can be pulled from a Wahapedia FR locale during `download:wahapedia` is a researcher question; it changes nothing structurally. PITFALLS #15: overrides/favorites/notes live in separate hobbyforge.db tables and survive re-import — lock that with a test.

---

## Sequencing

| Option | Description | Selected |
|--------|-------------|----------|
| Validation gate (DAT-01) first, then per-faction audit+translate batches | Land the FK/orphan gate before any data work so corrections are validated fail-fast; process factions in batches that audit + translate together | ✓ |
| All audits, then all translations, then validation | Sequential by requirement | |

**User's choice:** Gate first, then per-faction batches (recommended default).
**Notes:** Matches ARCHITECTURE Theme-D order and the roadmap decomposition hint ("one plan for FK/orphan validation, then incremental faction-audit + translation batches"). Per-faction end-to-end batches minimize re-import churn.

---

## Claude's Discretion

- Exact batch grouping of the 22 factions and plan count for audit+translate work.
- Filenames/locations for the new data-layer FK test and re-import preservation test.
- Whether the JSON referential check is a `scripts/lib/` helper or inline in `build-unit-db.ts`.
- In-memory-schema construction in the FK test (all migrations vs. focused `udb_*` subset).
- Report directory name for the 25 audit reports.

## Deferred Ideas

- Machine-translation / automated FR sourcing pipeline (not a runtime dependency this phase).
- Surfacing audit reports in-app as a "data health" view.
- Pre-existing carries from earlier phases (WeaponTable a11y, leader "can lead X" enrichment) — remain in 138-CONTEXT.
