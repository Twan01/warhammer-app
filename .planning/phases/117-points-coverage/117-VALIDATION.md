---
phase: 117
slug: points-coverage
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-04
---

# Phase 117 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/build-pipeline/parseCsv.test.ts tests/build-pipeline/subFactionKeyword.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/build-pipeline/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 117-01-01 | 01 | 1 | PTS-01 | unit | `pnpm test -- tests/build-pipeline/parseCsv.test.ts` | ✅ | ✅ green |
| 117-01-02 | 01 | 1 | PTS-01 | build | `npx tsx scripts/build-unit-db.ts` (exits 0, 99.8% coverage) | ✅ | ✅ green |
| 117-01-03 | 01 | 1 | PTS-04 | unit | `pnpm test -- tests/build-pipeline/subFactionKeyword.test.ts` | ✅ | ✅ green |
| 117-02-01 | 02 | 2 | PTS-03 | structural | `grep -r "xmldom" scripts/ package.json` (zero matches) | N/A | ✅ green |
| 117-02-02 | 02 | 2 | PTS-02 | build | `npx tsx scripts/build-unit-db.ts` (MIN_COVERAGE_PCT=90, exits 0) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PTS-02 threshold enforcement | PTS-02 | Build script MIN_COVERAGE_PCT is runtime-verified, not unit-tested | Run `npx tsx scripts/build-unit-db.ts` and confirm exit 0 with 90%+ coverage |
| PTS-03 BSData removal | PTS-03 | Structural removal verified by grep, not testable as unit test | Run `grep -r "xmldom\|bsdata" scripts/ package.json` and confirm zero matches |

---

## Validation Audit 2026-06-04

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

### Resolved Gaps

| Gap | Requirement | Resolution |
|-----|-------------|------------|
| extractModelCount untested | PTS-01 | Added 6 tests to `tests/build-pipeline/parseCsv.test.ts` |
| Keyword sub-faction logic untested | PTS-04 | Created `tests/build-pipeline/subFactionKeyword.test.ts` (8 tests) |

---

## Validation Sign-Off

- [x] All tasks have automated verify or structural verification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-04
