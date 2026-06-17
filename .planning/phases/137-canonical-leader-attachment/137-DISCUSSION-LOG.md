# Phase 137: Canonical Leader Attachment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 137-canonical-leader-attachment
**Mode:** `--auto` (every area auto-resolved with the recommended default, grounded
in `ARCHITECTURE.md` §Q2/§Q3 and a scout of the live codebase)
**Areas discussed:** Table strategy, Migration number, Pipeline wiring,
Version-skip avoidance, Validation query shape, NULL udb_unit_id fallback, Legacy plumbing

---

## Table strategy

| Option | Description | Selected |
|--------|-------------|----------|
| New `udb_leader_targets` table | Canonical id-keyed table from `Datasheets_leader.csv` | ✓ |
| Repurpose `synced_leader_targets` | Reuse the existing name-keyed table | |

**Auto-choice:** New canonical table.
**Notes:** `synced_leader_targets` is name-keyed and empty (BSData sync removed
v0.4.7, `replaceSyncedLeaderTargets` never called). CSV gives id pairs → join by id.
(D-01, D-02)

---

## Migration number

| Option | Description | Selected |
|--------|-------------|----------|
| 048 | As written in ROADMAP criterion #1 and ARCHITECTURE.md §Q2 | |
| 050 (next free) | 048/049 already on disk; use next number | ✓ |

**Auto-choice:** 050 — factual correction.
**Notes:** `ls src-tauri/migrations/` confirms `048_consolidate_factions.sql` and
`049_drop_promoted_to_reminder.sql` exist. The "048" in the docs is stale; intent
(new migration re-triggers Phase-130 gate) is unchanged. (D-03, D-04)

---

## Pipeline wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Three-edit canonical path | download-wahapedia.ts + build-unit-db.ts + lib.rs, per research | ✓ |
| Ad-hoc / separate JSON resource | Bundle a second JSON file | |

**Auto-choice:** Three coordinated edits into the single `unit_database.json`.
**Notes:** Mirrors keywords/detachments precedent; no new tauri.conf resource entry. (D-05)

---

## Version-skip avoidance

| Option | Description | Selected |
|--------|-------------|----------|
| Add leader_targets to content hash | JSON version bumps → import re-runs | ✓ |
| Rely on existing version | (would skip import on installs at current version) | |

**Auto-choice:** Feed the new array into the content-hash input.
**Notes:** Importer is a no-op when `udb_meta.version == payload.version`. Highest-risk
step: "table exists but empty after update." (D-06)

---

## Validation query shape

| Option | Description | Selected |
|--------|-------------|----------|
| Batch `getLeaderTargetsForList(listId)` | List-level join, page-level Map | ✓ |
| Per-leader `getLeaderTargetIdsForLeader` | One lookup per leader (risk: hooks-in-loop) | |

**Auto-choice:** Batch list-level query + page-level `useMemo` Map.
**Notes:** Honors Phase-136 HON-10 hook discipline; avoids N+1 (PITFALLS #8).
Rewrite `useLeaderTargets.ts` (staleTime Infinity) and repoint `LeaderAttachmentSheet`. (D-07, D-08)

---

## NULL udb_unit_id fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Permissive + advisory | Allow attachment, skip validation, quiet notice | ✓ |
| Block | Disallow attaching unlinked units | |

**Auto-choice:** Permissive with advisory.
**Notes:** Ghost/manual units (and `ON DELETE SET NULL` survivors) must not lose the
ability to attach — blocking would be a regression. Success criterion #2 mandates a
graceful NULL fallback. (D-09)

---

## Legacy synced plumbing

| Option | Description | Selected |
|--------|-------------|----------|
| Repoint + remove dead funcs, leave table | Retire `getLeaderTargetsByFaction`; keep empty table | ✓ |
| Drop the table too | Add a migration to remove `synced_leader_targets` | |

**Auto-choice:** Remove dead code, leave the inert table (no drop migration this phase).
**Notes:** Avoids a second parity-gate bump in one phase; table is harmless. Drop deferred. (D-10)

---

## Claude's Discretion

- TS type names for the new JSON/query rows (`UdbLeaderTargetRow`).
- Advisory wording/placement in `LeaderAttachmentSheet`.
- Whether to keep a thin per-leader helper alongside the batch query.
- Rust importer batch INSERT chunk size.

## Deferred Ideas

- Drop the dead `synced_leader_targets` table — future data-cleanup phase (Theme D / DAT).
- Surface "can lead / can be led by" in the Unit Database browser — Phase 138+ (user-facing capability).
