---
phase: 114
slug: pipeline-fixes-database-rebuild
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-03
---

# Phase 114 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 (jsdom + node environments) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/build-pipeline/ -x` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~8 seconds (full suite), ~1 second (build-pipeline only) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/build-pipeline/ -x`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 114-01-01 | 01 | 1 | PFX-01 | T-114-01 | N/A (dev-only build script) | unit | `pnpm test -- tests/build-pipeline/weaponParsing.test.ts` | ✅ | ✅ green |
| 114-01-02 | 01 | 1 | PFX-01 | T-114-01 | N/A | unit | `pnpm test -- tests/build-pipeline/weaponParsing.test.ts` | ✅ | ✅ green |
| 114-02-01 | 02 | 2 | PFX-02, PFX-03 | T-114-02 | N/A | unit | `pnpm test -- tests/build-pipeline/normalize.test.ts tests/build-pipeline/matchUnit.test.ts` | ✅ | ✅ green |
| 114-02-02 | 02 | 2 | PFX-04 | T-114-03 | N/A | unit + integration | `pnpm test -- tests/build-pipeline/coverageReport.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement-to-Test Cross-Reference

| Requirement | Description | Test Files | Test Count | Coverage |
|-------------|-------------|------------|------------|----------|
| PFX-01 | Weapon CSV column parsing bugs fixed (range, keywords, weapon_group) | `tests/build-pipeline/weaponParsing.test.ts` | 6 | COVERED |
| PFX-02 | Name normalization handles apostrophes, spacing, formatting | `tests/build-pipeline/normalize.test.ts` | 17 (11 normalizeName + 6 loadAliases) | COVERED |
| PFX-03 | Aliases for genuine edge cases only | `tests/build-pipeline/normalize.test.ts`, `tests/build-pipeline/matchUnit.test.ts` | 6 + 13 | COVERED |
| PFX-04 | Database rebuilt with pipeline fixes, coverage verified | `tests/build-pipeline/coverageReport.test.ts`, `tests/build-pipeline/weaponParsing.test.ts` | 8 + 6 | COVERED |

**Total tests covering phase requirements:** 44 across 4 test files

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 8s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-03

---

## Validation Audit 2026-06-03

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 4 requirements (PFX-01 through PFX-04) have automated test coverage via 44 tests across 4 test files. No gaps detected.
