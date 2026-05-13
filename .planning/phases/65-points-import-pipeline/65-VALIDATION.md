---
phase: 65
slug: points-import-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 65-01-01 | 01 | 1 | PI-01 | — | N/A | unit | `pnpm test -- tests/datasheet/pointsSchema.test.ts` | ❌ W0 | ⬜ pending |
| 65-01-02 | 01 | 1 | PI-05 | — | N/A | unit | `pnpm test -- tests/foundation/armyListQueries.test.ts` | ✅ extend | ⬜ pending |
| 65-02-01 | 02 | 1 | PI-02 | — | CSV header validation for points CSV | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ✅ extend | ⬜ pending |
| 65-02-02 | 02 | 1 | PI-04 | — | N/A | unit | `pnpm test -- tests/datasheet/computePointsDelta.test.ts` | ❌ W0 | ⬜ pending |
| 65-03-01 | 03 | 2 | PI-03 | — | N/A | unit | `pnpm test -- tests/datasheet/syncFreshness.test.ts` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/datasheet/pointsSchema.test.ts` — stubs for PI-01 (schema shape validation for points tables)
- [ ] `tests/datasheet/computePointsDelta.test.ts` — stubs for PI-04 (pure function delta computation)

*Existing tests for sync, freshness, and army list queries will be extended in-plan.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Freshness badge renders on army list cards | PI-03 | Visual UI verification | Open army list detail, check for freshness dot + tooltip |
| Points delta summary displays after sync | PI-04 | Requires live Wahapedia sync | Run sync, verify delta card on RulesHubPage |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
