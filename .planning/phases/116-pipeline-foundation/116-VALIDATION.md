---
phase: 116
slug: pipeline-foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-04
---

# Phase 116 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test` + `pnpm build:udb`
- **Before `/gsd:verify-work`:** Full suite must be green + build pipeline produces valid JSON
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 116-01-01 | 01 | 1 | PF-01 | — | N/A | unit | `pnpm test -- tests/build-pipeline/parseCsv.test.ts` | ❌ W0 | ⬜ pending |
| 116-01-02 | 01 | 1 | PF-02 | — | N/A | manual | `pnpm download:wahapedia` | ❌ W0 | ⬜ pending |
| 116-02-01 | 02 | 1 | PF-03 | — | N/A | integration | `node --experimental-strip-types scripts/build-unit-db.ts` | ✅ | ⬜ pending |
| 116-02-02 | 02 | 1 | PF-04 | — | N/A | integration | `node --experimental-strip-types scripts/build-unit-db.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Note: PF-03/PF-04 verification against real Legends data requires running `pnpm download:wahapedia` first to get fresh CSVs with proper legend column format.

---

## Wave 0 Requirements

- [ ] `tests/build-pipeline/parseCsv.test.ts` — BOM stripping unit tests for PF-01
- [ ] Download script created for PF-02

*Existing infrastructure covers most phase requirements — build pipeline output validation is the primary verification method.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Download from wahapedia.ru | PF-02 | Requires network access to external server | Run `pnpm download:wahapedia` and verify all CSVs appear in scripts/data/ |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-04
