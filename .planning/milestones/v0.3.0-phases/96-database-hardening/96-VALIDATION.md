---
phase: 96
slug: database-hardening
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-22
---

# Phase 96 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + better-sqlite3 (in-memory) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/data-layer/migration033.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~3 seconds (migration033 only) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/data-layer/migration033.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 96-01-01 | 01 | 1 | ERR-05 | content-shape | `pnpm test -- tests/data-layer/migration033.test.ts` | ✅ | ✅ green |
| 96-01-01 | 01 | 1 | DBH-01 | integration | `pnpm test -- tests/data-layer/migration033.test.ts` | ✅ | ✅ green |
| 96-01-01 | 01 | 1 | DBH-02 | integration | `pnpm test -- tests/data-layer/migration033.test.ts` | ✅ | ✅ green |
| 96-01-02 | 01 | 1 | DBH-03 | integration | `pnpm test -- tests/data-layer/migration033.test.ts` | ✅ | ✅ green |
| infra | — | — | db-helpers.ts | infrastructure | `pnpm test -- tests/data-layer/migration-parity.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. `tests/data-layer/db-helpers.ts` updated to include migration 033.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Audit 2026-05-22

| Metric | Count |
|--------|-------|
| Gaps found | 5 |
| Resolved | 5 |
| Escalated | 0 |

### Test Coverage Detail

| Requirement | Tests | Assertions |
|-------------|-------|------------|
| ERR-05: WAL + busy_timeout | 3 content-shape | PRAGMA presence + ordering after FK pragma |
| DBH-01: FK indexes | 32 integration | 1 count (>=31) + 31 individual index existence |
| DBH-02: Temporal indexes | 4 integration | 2 existence + 2 DESC keyword in SQL definition |
| DBH-03: CHECK constraints | 10 integration | 6 rejection (negative/out-of-range) + 4 acceptance (valid/NULL/boundary) |

**Total: 46 tests in migration033.test.ts + 4 in migration-parity.test.ts = 50 tests**

---

## Validation Sign-Off

- [x] All tasks have automated verify
- [x] Sampling continuity: no gaps without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-22
