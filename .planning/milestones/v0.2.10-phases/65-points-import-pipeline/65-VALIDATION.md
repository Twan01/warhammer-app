---
phase: 65
slug: points-import-pipeline
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-13
---

# Phase 65 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest config embedded) |
| **Quick run command** | `pnpm test -- tests/datasheet/ tests/army-list/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/datasheet/ tests/army-list/ tests/foundation/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 65-01-01 | 01 | 1 | PI-01 | — | N/A | unit | `pnpm test -- tests/datasheet/pointsSchema.test.ts` | ✅ | ✅ green |
| 65-01-02 | 01 | 1 | PI-05 | — | N/A | unit | `pnpm test -- tests/foundation/armyListQueries.test.ts` | ✅ | ✅ green |
| 65-02-01 | 02 | 1 | PI-02 | — | CSV header validation for points CSV | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ✅ | ✅ green |
| 65-02-02 | 02 | 1 | PI-04 | — | N/A | unit | `pnpm test -- tests/datasheet/computePointsDelta.test.ts` | ✅ | ✅ green |
| 65-03-01 | 03 | 2 | PI-03 | — | N/A | unit | `pnpm test -- tests/datasheet/syncFreshness.test.ts` | ✅ | ✅ green |
| 65-03-dev | 03 | 2 | PI-03 (deviation) | — | N/A | unit | `pnpm test -- tests/foundation/armyListQueries.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/datasheet/pointsSchema.test.ts` — 4 tests for PI-01 (schema shape validation for points tables)
- [x] `tests/datasheet/computePointsDelta.test.ts` — 7 tests for PI-04 (pure function delta computation)

*Existing tests for sync, freshness, and army list queries extended in-plan.*

---

## Gap Coverage (Nyquist Audit)

| Gap | Resolution | Details |
|-----|-----------|---------|
| `getArmyListUnitNames` untested | FILLED | 3 tests added to `tests/foundation/armyListQueries.test.ts` — SQL shape, no-params contract, empty result |
| `syncFreshness.test.ts` not extended for PI-03 | N/A | `syncFreshness.ts` was NOT modified in phase 65; PointsFreshnessBadge reuses existing utilities unchanged; existing 10 tests in syncFreshness.test.ts cover the underlying logic |
| PointsFreshnessBadge component test | SKIP (justified) | Visual-only component wrapping `getSyncFreshness()` + `getSyncAgeLabel()` — logic fully tested in syncFreshness.test.ts; component renders a colored dot + tooltip text, no conditional logic worth unit testing beyond the manual verification in the table below |
| PointsDeltaSection component test | SKIP (justified) | Presentational wrapper over `computePointsDelta` results — delta logic fully tested in computePointsDelta.test.ts (7 tests); component renders a list of delta entries, no business logic |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Freshness badge renders on army list cards | PI-03 | Visual UI verification | Open army list detail, check for freshness dot + tooltip |
| Points delta summary displays after sync | PI-04 | Requires live Wahapedia sync | Run sync, verify delta card on RulesHubPage |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete — Nyquist audit 2026-05-13
