---
phase: 66
slug: army-list-validation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-13
validated: 2026-05-13
---

# Phase 66 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/lib/computeUnitWarnings.test.ts tests/types/armyList.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/lib/computeUnitWarnings.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 66-01-01 | 01 | 1 | LV-01 | unit | `pnpm test -- tests/types/armyList.test.ts` | ✅ | ✅ green |
| 66-01-02 | 01 | 1 | LV-01 | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ✅ | ✅ green |
| 66-01-03 | 01 | 1 | LV-03 | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ✅ | ✅ green |
| 66-01-04 | 01 | 1 | LV-04 | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ✅ | ✅ green |
| 66-02-01 | 02 | 1 | LV-02 | manual | N/A — Tauri SQLite bridge | N/A | ✅ manual |
| 66-03-01 | 03 | 2 | LV-01, LV-04 | manual | N/A — UI integration | N/A | ✅ manual |
| 66-03-02 | 03 | 2 | LV-02, LV-03 | manual | N/A — UI integration | N/A | ✅ manual |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Coverage Summary

| Test File | Tests | Covers |
|-----------|-------|--------|
| tests/types/armyList.test.ts | 8 | TACTICAL_ROLES array (7 entries), display map, type shape |
| tests/lib/computeUnitWarnings.test.ts | 29 | Hard/soft warning classification, edge cases, health stats aggregation |
| **Total** | **37** | All automated requirements (LV-01, LV-03, LV-04) |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tactical role persists and loads via SQLite | LV-02 | Tauri SQLite bridge not available in jsdom | Assign role in UI, refresh, verify role persists |
| Warning icons render with correct severity | LV-01 | Visual UI verification | Add unit with hard/soft warnings, verify AlertTriangle/Info icons appear |
| Health summary panel displays all 5 stats | LV-04 | Visual UI verification | Open army list detail, verify points/owned/ready/freshness/warnings display |
| Role coverage pills render with gap styling | LV-03 | Visual UI verification | Assign roles to some units, verify covered/gap pill styling |
| Points exceeded turns red | LV-01 | Visual UI verification | Set points_limit below total, verify destructive color |

---

## Validation Sign-Off

- [x] All tasks have automated verify or manual-only classification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 test files exist and pass
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated

---

## Validation Audit 2026-05-13

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated | 0 |

All 4 gaps (66-01-01 through 66-01-04) were already resolved during execution — test files were created by Plan 01 but VALIDATION.md was never updated from its draft state. This audit reconciled the draft with the actual state.
