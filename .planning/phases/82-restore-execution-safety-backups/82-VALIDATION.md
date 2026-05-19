---
phase: 82
slug: restore-execution-safety-backups
status: validated
nyquist_compliant: true
wave_0_complete: true
validated: 2026-05-19
created: 2026-05-19
---

# Phase 82 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` (jsdom environment) |
| **Quick run command** | `pnpm test -- tests/data-health/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** `pnpm test -- tests/data-health/`
- **After every plan wave:** `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|----------|-----------|-------------------|-------------|--------|
| 82-01-T1 | 82-01 | 1 | RST-06, RST-07, SAF-04 | Rust restore_from_backup + list_safety_backups commands | Unit (Rust) | `cd src-tauri && cargo test` | Yes | COVERED |
| 82-02-T1 | 82-02 | 2 | RST-06, RST-07, RST-08 | BackupCard restore execution flow + relaunch | Unit (RTL mock) | `pnpm test -- tests/data-health/backupCard.test.tsx` | Yes | COVERED |
| 82-02-T2 | 82-02 | 2 | RST-08 | RestorePreviewDialog isRestoring state + test update | Unit (RTL) | `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx` | Yes | COVERED |
| 82-03-T1 | 82-03 | 2 | SAF-02 | Pre-sync safety backup in useRulesSync | Unit (mock invoke) | `pnpm test -- tests/rules-sync/useRulesSync.test.ts` | Yes | COVERED |
| 82-03-T2 | 82-03 | 2 | SAF-04 | SafetyBackupsList renders entries, empty state, loading | Unit (RTL) | `pnpm test -- tests/data-health/SafetyBackupsList.test.tsx` | Yes | COVERED |

---

## Wave 0 Gaps (resolved during execution)

- [x] `tests/rules-sync/useRulesSync.test.ts` — covers SAF-02 (2 tests: safety backup before fetch, abort on failure)
- [x] `tests/data-health/SafetyBackupsList.test.tsx` — covers SAF-04 (3 tests: populated, empty, error states)
- [x] `tests/data-health/RestorePreviewDialog.test.tsx` — replaced placeholder with 3 real restore behavior tests

---

## Coverage Summary

| Requirement | Plans | Test Coverage |
|-------------|-------|---------------|
| RST-06 | 82-01, 82-02 | backupCard.test.tsx (mock invoke + safety backup) |
| RST-07 | 82-01, 82-02 | backupCard.test.tsx (mock invoke + file swap) |
| RST-08 | 82-02 | backupCard.test.tsx (relaunch called), RestorePreviewDialog.test.tsx (isRestoring state) |
| SAF-02 | 82-03 | useRulesSync.test.ts (create_safety_backup first invoke) |
| SAF-04 | 82-01, 82-03 | SafetyBackupsList.test.tsx (list rendering, empty state) |

---

## Validation Audit 2026-05-19

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 3 Wave 0 gaps were filled during plan execution (82-02, 82-03). Full test suite: 1819 passed, 0 failures.
