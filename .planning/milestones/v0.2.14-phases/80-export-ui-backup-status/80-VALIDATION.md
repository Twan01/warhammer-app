---
phase: 80
slug: export-ui-backup-status
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-18
---

# Phase 80 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest config inline) |
| **Quick run command** | `pnpm test -- tests/data-health/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/data-health/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 80-01-01 | 01 | 1 | STS-01, STS-02 | — | N/A | unit | `pnpm test -- tests/data-health/backupFreshness.test.ts` | ✅ | ✅ green |
| 80-01-02 | 01 | 1 | STS-01, STS-02 | — | N/A | unit | `pnpm test -- tests/data-health/backupCard.test.tsx` | ✅ | ✅ green |
| 80-01-03 | 01 | 1 | STS-03 | — | N/A | unit | `pnpm test -- tests/data-health/backupCard.test.tsx` | ✅ | ✅ green |
| 80-02-01 | 02 | 1 | STS-04 | — | N/A | unit | `pnpm test -- tests/dashboard/DataHealthSummaryCard.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/data-health/backupFreshness.test.ts` — 15 unit tests for tier boundaries, age labels, dot classes
- [x] `tests/dashboard/DataHealthSummaryCard.test.tsx` — 3 STS-04 tests for backup dot rendering + no HardDrive icon
- [x] `tests/data-health/backupCard.test.tsx` — updated with export_backup, zip filter, dot assertions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Save dialog opens with .zip filter | STS-03 | Native OS dialog — jsdom cannot render | Click "Create Backup", verify dialog shows .zip filter |
| Backup file is valid .zip on disk | STS-03 | End-to-end Tauri command | Save backup, verify .zip contains metadata.json + hobbyforge.db |

---

## Validation Audit 2026-05-18

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-18
