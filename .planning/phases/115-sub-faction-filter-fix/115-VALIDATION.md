---
phase: 115
slug: sub-faction-filter-fix
status: audited
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-03
---

# Phase 115 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/unit-database/applyUdbFilters.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/unit-database/applyUdbFilters.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 115-01-01 | 01 | 1 | SUB-01 | — | N/A | unit | `pnpm test -- tests/unit-database/applyUdbFilters.test.ts` | ✅ | ✅ green |
| 115-01-02 | 01 | 1 | SUB-02, SUB-03 | — | N/A | unit | `pnpm test -- tests/unit-database/applyUdbFilters.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DB browser sub-faction filter shows generic units | SUB-01 | Visual confirmation in running app | Select faction with sub-factions (e.g. SM), select a sub-faction, verify generic units appear |
| Army list picker sub-faction filter shows generic units | SUB-02 | Visual confirmation in running app | Open army list, open unit picker, select sub-faction, verify generic units appear |
| Collection browser sub-faction filter shows generic units | SUB-03 | Visual confirmation in running app | Go to collection, select single faction with sub-factions, select sub-faction, verify generic units appear |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

---

## Validation Audit 2026-06-03

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Audit notes:**
- All 13 tests in `applyUdbFilters.test.ts` pass (5 sub-faction, 8 other filters)
- SUB-01 fully covered by client-side unit tests (COVERED)
- SUB-02/SUB-03 SQL path (`getUdbUnitIdsBySubFaction`) correctly classified as manual-only — requires Tauri bridge unavailable in jsdom
- 4 pre-existing test failures (DQ-02 ×2, DAS-06 ×2) confirmed unrelated to phase 115
- Implementation verified: `sub_faction = $2 OR sub_faction IS NULL` in SQL, `unit.sub_faction !== null` in TS
