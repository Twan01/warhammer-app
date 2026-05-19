---
phase: 82
slug: restore-execution-safety-backups
status: approved
nyquist_compliant: true
wave_0_complete: false
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
| 82-01-T1 | 82-01 | 1 | RST-06, RST-07, SAF-04 | Rust restore_from_backup + list_safety_backups commands | Unit (Rust) | `cd src-tauri && cargo test` | Yes (extend) | Pending |
| 82-02-T1 | 82-02 | 2 | RST-06, RST-07, RST-08 | BackupCard restore execution flow + relaunch | Unit (RTL mock) | `pnpm test -- tests/data-health/backupCard.test.tsx` | Yes (extend) | Pending |
| 82-02-T2 | 82-02 | 2 | RST-08 | RestorePreviewDialog isRestoring state + test update | Unit (RTL) | `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx` | Yes (update) | Pending |
| 82-03-T1 | 82-03 | 2 | SAF-02 | Pre-sync safety backup in useRulesSync | Unit (mock invoke) | `pnpm test -- tests/rules-sync/useRulesSync.test.ts` | No — Wave 0 gap | Pending |
| 82-03-T2 | 82-03 | 2 | SAF-04 | SafetyBackupsList renders entries, empty state, loading | Unit (RTL) | `pnpm test -- tests/data-health/SafetyBackupsList.test.tsx` | No — Wave 0 gap | Pending |

---

## Wave 0 Gaps (must be created during execution)

- [ ] `tests/rules-sync/useRulesSync.test.ts` — covers SAF-02 (create_safety_backup called before fetch)
- [ ] `tests/data-health/SafetyBackupsList.test.tsx` — covers SAF-04 (list renders, empty state)
- [ ] Update `tests/data-health/RestorePreviewDialog.test.tsx` — replace placeholder toast test with real restore behavior tests

---

## Coverage Summary

| Requirement | Plans | Test Coverage |
|-------------|-------|---------------|
| RST-06 | 82-01, 82-02 | backupCard.test.tsx (mock invoke + safety backup) |
| RST-07 | 82-01, 82-02 | backupCard.test.tsx (mock invoke + file swap) |
| RST-08 | 82-02 | backupCard.test.tsx (relaunch called), RestorePreviewDialog.test.tsx (isRestoring state) |
| SAF-02 | 82-03 | useRulesSync.test.ts (create_safety_backup first invoke) |
| SAF-04 | 82-01, 82-03 | SafetyBackupsList.test.tsx (list rendering, empty state) |
