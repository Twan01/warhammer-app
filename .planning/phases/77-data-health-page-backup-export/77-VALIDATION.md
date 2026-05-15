---
phase: 77
slug: data-health-page-backup-export
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-15
---

# Phase 77 — Validation Strategy

> Per-phase validation contract for the Data Health page + Backup/Export.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/data-health/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~54 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/data-health/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 54 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File | Status |
|---------|------|------|-------------|-----------|-------------------|------|--------|
| 77-01-01 | 01 | 1 | DX-01 | unit (component) | `pnpm test -- tests/data-health/versionInfoCard.test.tsx` | ✅ | ✅ green |
| 77-01-02 | 01 | 1 | DX-02 | unit (query + component) | `pnpm test -- tests/data-health/tableCountsGrid.test.tsx` | ✅ | ✅ green |
| 77-01-03 | 01 | 1 | DX-03 | unit (query) | `pnpm test -- tests/data-health/diagnosticFlags.test.ts` | ✅ | ✅ green |
| 77-02-01 | 02 | 2 | DX-04 | unit (contract) | `pnpm test -- tests/data-health/asyncDiagnostics.test.ts` | ✅ | ✅ green |
| 77-02-02 | 02 | 2 | BK-01 | integration (component + Tauri) | `pnpm test -- tests/data-health/backupCard.test.tsx` | ✅ | ✅ green |
| 77-02-03 | 02 | 2 | BK-03 | unit (hook) | `pnpm test -- tests/data-health/backupStatus.test.ts` | ✅ | ✅ green |
| 77-02-04 | 02 | 2 | BK-02 | manual | — | — | ✅ manual |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new framework install needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backup uses VACUUM INTO for safe SQLite copy | BK-02 | Rust command — cannot test in jsdom/vitest; requires Tauri runtime | 1. Run `pnpm tauri dev` 2. Navigate to Data Health 3. Click "Create Backup" 4. Verify .db file exists at chosen location 5. Open with SQLite browser to confirm valid database |

---

## Validation Audit 2026-05-15

| Metric | Count |
|--------|-------|
| Gaps found | 7 |
| Resolved (automated) | 6 |
| Manual-only | 1 |

---

## Validation Sign-Off

- [x] All tasks have automated verify or justified manual-only
- [x] Sampling continuity: no consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 54s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-15
