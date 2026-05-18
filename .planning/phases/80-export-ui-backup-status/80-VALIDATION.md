---
phase: 80
slug: export-ui-backup-status
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 80-01-01 | 01 | 1 | STS-01, STS-02 | — | N/A | unit | `pnpm test -- tests/data-health/backupFreshness.test.ts` | ❌ W0 | ⬜ pending |
| 80-01-02 | 01 | 1 | STS-01, STS-02 | — | N/A | unit | `pnpm test -- tests/data-health/backupCard.test.tsx` | ✅ (update) | ⬜ pending |
| 80-01-03 | 01 | 1 | STS-03 | — | N/A | unit | `pnpm test -- tests/data-health/backupCard.test.tsx` | ✅ (update) | ⬜ pending |
| 80-02-01 | 02 | 1 | STS-04 | — | N/A | unit | `pnpm test -- tests/dashboard/DataHealthSummaryCard.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/data-health/backupFreshness.test.ts` — unit tests for `getBackupFreshness()` and `getBackupAgeLabel()`
- [ ] `tests/dashboard/DataHealthSummaryCard.test.tsx` — render test for backup status dot + label

*Existing `tests/data-health/backupCard.test.tsx` needs updates but already exists.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Save dialog opens with .zip filter | STS-03 | Native OS dialog — jsdom cannot render | Click "Create Backup", verify dialog shows .zip filter |
| Backup file is valid .zip on disk | STS-03 | End-to-end Tauri command | Save backup, verify .zip contains metadata.json + hobbyforge.db |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
