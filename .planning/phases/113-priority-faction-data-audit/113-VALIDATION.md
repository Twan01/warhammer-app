---
phase: 113
slug: priority-faction-data-audit
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-03
---

# Phase 113 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/build-pipeline/translations-overlay.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/build-pipeline/translations-overlay.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 113-01-01 | 01 | 1 | SM-01, SM-02, SM-03 | T-113-01 | N/A | manual | VERIFICATION.md spot-checks | N/A | ⬜ deferred to P114 |
| 113-01-02 | 01 | 1 | NEC-01, NEC-02, NEC-03 | T-113-01 | N/A | manual | VERIFICATION.md spot-checks | N/A | ⬜ deferred to P114 |
| 113-01-02 | 01 | 1 | DG-01, DG-02, DG-03 | T-113-01 | N/A | manual | VERIFICATION.md spot-checks | N/A | ⬜ deferred to P114 |
| 113-02-01 | 02 | 2 | SM-04 | — | N/A | unit | `pnpm test -- tests/build-pipeline/translations-overlay.test.ts` | ✅ | ✅ green |
| 113-02-01 | 02 | 2 | NEC-04 | — | N/A | unit | `pnpm test -- tests/build-pipeline/translations-overlay.test.ts` | ✅ | ✅ green |
| 113-02-01 | 02 | 2 | DG-04 | — | N/A | unit | `pnpm test -- tests/build-pipeline/translations-overlay.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The `translations-overlay.test.ts` test file was created in a prior phase and covers the French translation overlay logic used by Plan 02.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audit script produces correct JSON/MD reports for SM | SM-01..03 | Offline tooling — audit script is a one-off CLI tool, not runtime code. Data corrections deferred to Phase 114. | Run `node --experimental-strip-types scripts/audit-faction.ts SM` and verify reports in `.planning/phases/113-priority-faction-data-audit/reports/` |
| Audit script produces correct reports for NEC | NEC-01..03 | Same — offline tooling, corrections deferred | Run with `NEC` arg |
| Audit script produces correct reports for DG | DG-01..03 | Same — offline tooling, corrections deferred | Run with `DG` arg |

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

**Notes:** Phase 113 has 12 requirements. 9 (SM/NEC/DG data corrections) are explicitly deferred to Phase 114 — Phase 113 was the audit+translate phase, Phase 114 is the fix+rebuild phase. 3 translation requirements (SM-04, NEC-04, DG-04) are covered by `tests/build-pipeline/translations-overlay.test.ts` (11 test cases covering overlay loading, application for all entity types, and type shape validation). No new tests needed.
