---
phase: 139
slug: data-quality-at-scale
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-18
validated: 2026-06-18
---

# Phase 139 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom); data-layer tests use `better-sqlite3` against in-memory DBs |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/data-layer/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30–60 seconds (full suite); data-layer subset is fast |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/data-layer/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green AND `pnpm build:udb` exits 0 AND 25 audit reports present
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 139-01 (FK gate) | 01 | 1 | DAT-01 | — | N/A | data-layer | `pnpm test -- tests/data-layer/fk-integrity.test.ts` | ✅ created | ✅ green |
| 139-01 (orphan sub_faction) | 01 | 1 | DAT-01 | — | N/A | data-layer | `pnpm test -- tests/data-layer/fk-integrity.test.ts` | ✅ created | ✅ green |
| 139-01 (orphan leader pairs) | 01 | 1 | DAT-01 | — | N/A | data-layer | `pnpm test -- tests/data-layer/fk-integrity.test.ts` | ✅ created | ✅ green |
| 139-01 (build-script gate) | 01 | 1 | DAT-01 | — | N/A | CLI | `pnpm build:udb` exits 0 on clean data, non-zero on injected orphan | ✅ existing | ✅ green |
| 139-02 (re-import preservation) | 02 | — | DAT-03 | — | N/A | data-layer | `pnpm test -- tests/data-layer/reimport-preservation.test.ts` | ✅ created | ✅ green |
| 139-03/04 (FR overlay merge) | 03,04 | — | DAT-03 | — | N/A | CLI/data | `pnpm build:udb` reports FR overlay counts; COALESCE returns FR strings | ✅ existing | ✅ green |
| 139-02/04 (25-faction audit) | 02,03,04 | — | DAT-02 | — | N/A | CLI + manual | `ls .planning/phases/139-data-quality-at-scale/reports/*-audit.md | wc -l` = 25; 0 systematic issues per JSON | ✅ existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/data-layer/fk-integrity.test.ts` — DAT-01: build an in-memory hobbyforge.db via `createHobbyforgeDb()` (all migrations, `PRAGMA foreign_keys = ON`), import the `unit_database.json` artifact replicating the lib.rs INSERT order, run `PRAGMA foreign_key_check` (assert 0 rows) + orphan `sub_faction` query + orphan `udb_leader_targets` pair queries (assert 0 rows). **Built in plan 139-01 (commit `65e20b81`), 352 lines incl. CR-02 detachment-table coverage; green.**
- [x] `tests/data-layer/reimport-preservation.test.ts` — DAT-03 D-07: seed `unit_overrides` / `rules_favorites` / `rules_notes`, simulate DELETE-all + re-INSERT on `udb_*` tables, assert user rows survive. **Built in plan 139-02 (commit `23d2be38`), 5 tests incl. idempotency; green.**

*Existing test infrastructure (`db-helpers.ts` `createHobbyforgeDb()`, `unit-database-artifact.test.ts`, `schema-shape.test.ts`) covers all other requirements — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All 25 factions audited & corrected | DAT-02 | Audit findings require human triage (systematic pipeline bug vs. genuine source gap); correctness is a judgment, not a single assertion | Run batched audit across 25 factions; confirm one `{faction}-audit.md` report per faction under the phase `reports/` dir; confirm all systematic (non-source-limited) discrepancies driven to zero, then `pnpm build:udb` exits 0 |
| French text reads correctly in FR locale | DAT-03 | Translation quality is a content judgment | Spot-check audited factions' ability/weapon FR strings via `COALESCE(name_fr, name)` query path |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (fk-integrity + reimport-preservation tests) — both built during execution and green
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-18 — all requirements have automated verification; two manual-only entries are quality-judgment spot-checks layered on top of automated assertions (not blocking gaps).

---

## Validation Audit 2026-06-18

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

Both Wave-0 test files flagged MISSING at plan-time (`fk-integrity.test.ts`, `reimport-preservation.test.ts`) were generated and committed *during* execution (plans 139-01, 139-02) rather than in a separate Wave 0 pass. Audit confirmed both files exist on disk and pass; full suite green (2893 passed / 6 skipped / 38 todo / 0 failures). No new test files were generated by this audit — the coverage was already complete. Phase is Nyquist-compliant.
