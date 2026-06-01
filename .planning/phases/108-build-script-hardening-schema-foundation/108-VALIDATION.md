---
phase: 108
slug: build-script-hardening-schema-foundation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-01
---

# Phase 108 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/build-pipeline/ tests/data-health/pointsCoverageCard.test.tsx tests/data-health/pointsCoverageQuery.test.ts tests/data-layer/migration041.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~2.4 seconds (phase tests only) |

---

## Sampling Rate

- **After every task commit:** Run phase test subset
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 108-01-01 | 01 | 1 | DQ-03 | unit | `pnpm test -- tests/build-pipeline/normalize.test.ts` | ✅ | ✅ green |
| 108-01-02 | 01 | 1 | DQ-04 | unit | `pnpm test -- tests/build-pipeline/normalize.test.ts` | ✅ | ✅ green |
| 108-01-03 | 01 | 1 | DQ-07 | unit | `pnpm test -- tests/build-pipeline/parseCsv.test.ts` | ✅ | ✅ green |
| 108-01-04 | 01 | 1 | DQ-07 | unit | `pnpm test -- tests/build-pipeline/parseXml.test.ts` | ✅ | ✅ green |
| 108-01-05 | 01 | 1 | SF-02 | unit | `pnpm test -- tests/build-pipeline/factionMap.test.ts` | ✅ | ✅ green |
| 108-01-06 | 01 | 1 | DQ-02 | unit | `pnpm test -- tests/build-pipeline/determinism.test.ts` | ✅ | ✅ green |
| 108-02-01 | 02 | 2 | DQ-05 | unit | `pnpm test -- tests/build-pipeline/matchUnit.test.ts` | ✅ | ✅ green |
| 108-02-02 | 02 | 2 | DQ-01 | unit | `pnpm test -- tests/build-pipeline/coverageReport.test.ts` | ✅ | ✅ green |
| 108-03-01 | 03 | 3 | FR-01 | integration | `pnpm test -- tests/data-layer/migration041.test.ts` | ✅ | ✅ green |
| 108-03-02 | 03 | 3 | DQ-06 | integration | `pnpm test -- tests/data-health/pointsCoverageQuery.test.ts` | ✅ | ✅ green |
| 108-03-03 | 03 | 3 | DQ-06 | integration | `pnpm test -- tests/data-health/pointsCoverageCard.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Points Coverage Card renders correctly in Tauri app | DQ-06 | UI visual rendering requires Tauri runtime | Open app → Data Health → verify Points Coverage card with badges |
| Rust import handles sub_faction and _fr fields | FR-06, SF-01 | Requires Tauri runtime for Rust command execution | Import unit_database.json → inspect udb_units for sub_faction and NULL _fr columns |

---

## Validation Audit 2026-06-01

| Metric | Count |
|--------|-------|
| Gaps found | 11 |
| Resolved | 11 |
| Escalated | 0 |

### Test Files Created

| File | Tests | Covers |
|------|-------|--------|
| tests/build-pipeline/normalize.test.ts | 15 | DQ-03, DQ-04 |
| tests/build-pipeline/parseCsv.test.ts | 7 | DQ-07 |
| tests/build-pipeline/parseXml.test.ts | 12 | DQ-07 |
| tests/build-pipeline/factionMap.test.ts | 11 | SF-02 |
| tests/build-pipeline/matchUnit.test.ts | 7 | DQ-05 |
| tests/build-pipeline/coverageReport.test.ts | 7 | DQ-01 |
| tests/build-pipeline/determinism.test.ts | 5 | DQ-02 |
| tests/data-health/pointsCoverageCard.test.tsx | 13 | DQ-06 |
| tests/data-health/pointsCoverageQuery.test.ts | 7 | DQ-06 |
| tests/data-layer/migration041.test.ts | 11 | FR-01 |
| **Total** | **103** | **11 requirements** |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no consecutive tasks without automated verify
- [x] All MISSING gaps resolved with test files
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-01
