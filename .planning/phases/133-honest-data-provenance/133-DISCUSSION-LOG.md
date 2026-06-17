# Phase 133: Honest Data Provenance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 133-honest-data-provenance
**Mode:** `--auto` (gray areas auto-selected; recommended option auto-chosen per question)
**Areas discussed:** Content-hash provenance source, syncFreshness removal depth, Honest provenance surface placement, Real backup-staleness preservation

---

## Content-hash provenance source (HON-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Surface existing `udb_meta` version + built_at as the honest identity; add a short content hash only if the build can emit one without a DB migration | Reuses real data; avoids re-firing the parity gate | ✓ |
| Add a content-hash column to `udb_meta` via a new migration | Literal "content hash in DB" but re-triggers Phase-130 parity gate (reserved for Phase 137) | |
| Compute a hash at runtime over the bundled data | Extra runtime cost for cosmetic identity | |

**Auto-selected:** Recommended (first option).
**Notes:** HON-01's bar is an *honest provenance/version surface*, not specifically a SHA in the DB. The "new migration re-triggers the gate" event is deliberately reserved for Phase 137 (migration 048). Whether to surface a build-content hash at all is a research question (D-02).

---

## syncFreshness removal depth (HON-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Full removal — delete the module + StaleDataBanner, excise the `freshness` param from the warnings layer and all consumers | Zero `SyncFreshness` references remain | ✓ |
| Keep a thin compatibility shim | Less churn, but leaves unused exports — violates HON-02 | |

**Auto-selected:** Recommended (first option).
**Notes:** HON-02 explicitly forbids "dead branches, dangling imports, or unused exports," so a shim would itself be a violation. `SyncFreshness` is a typed parameter threaded through `computeUnitWarnings`/`computeListHealthStats` — removal is a signature-level refactor (D-04), not UI-only.

---

## Honest provenance surface placement (HON-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Remove always-green sync dots; present provenance as plain honest version text where useful | Honest; no dishonest permanently-green traffic light | ✓ |
| Keep the freshness dots but force them green | Still implies a tier that can change — dishonest | |

**Auto-selected:** Recommended (first option).
**Notes:** Drop `FRESHNESS_DOT_CLASS` dots from ReadyToPlayCard / DataHealthSummaryCard / GameDayPage; remove the dead "Sync stale" branch; reuse the `PointsFreshnessBadge` `v{version}` pattern (D-06/07/08).

---

## Real backup-staleness preservation (success criterion 3)

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve `backupFreshness.ts` and all backup-staleness UI untouched; only remove sync/data freshness | Backup staleness is genuine; must not be conflated with fake sync staleness | ✓ |
| Sweep all "freshness"/"stale" code together | Risks deleting the real backup warning | |

**Auto-selected:** Recommended (first option).
**Notes:** Explicit guardrail (D-09) so the de-cruft sweep doesn't over-reach into `backupFreshness.ts` / version-mismatch UI.

---

## Claude's Discretion

- Exact provenance label wording, whether the points-badge dot is removed or kept neutral, and whether a short build-content hash is surfaced at all (per D-02 research) — left to planner/executor within the honesty constraints.

## Deferred Ideas

- Shared Abilities tab + dead-end "Link unit" — Phase 134.
- Factions/Unit-Database consolidation + Data Health demotion — Phase 135.
- True build-content-hash DB column via migration — only if a future phase needs it; avoided here to not pre-fire the parity gate (intended in Phase 137).
