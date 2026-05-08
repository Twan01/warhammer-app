---
phase: 44
slug: sync-pipeline-hardening
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
updated: 2026-05-08
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/datasheet/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/datasheet/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 44-01-01 | 01 | 1 | SYNC-01 | manual | `pnpm tauri dev` then trigger sync | N/A — Rust | ⬜ manual-only |
| 44-01-02 | 01 | 1 | SYNC-02 | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ✅ | ✅ green |
| 44-02-01 | 02 | 1 | SYNC-03 | unit | `pnpm test -- tests/datasheet/validateCsvHeaders.test.ts` | ✅ | ✅ green |
| 44-03-01 | 03 | 1 | SYNC-04 | unit | `pnpm test -- tests/datasheet/syncErrorQueries.test.ts` | ✅ | ✅ green |
| 44-01-03 | 01 | 1 | SYNC-05 | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/datasheet/validateCsvHeaders.test.ts` — 7 tests for SYNC-03 (pure function, no mocks needed)
- [x] `tests/datasheet/syncErrorQueries.test.ts` — 3 tests for SYNC-04 (mock `getDb()`, follow `datasheetQueries.test.ts` pattern)
- [x] `tests/datasheet/useRulesSync.test.ts` — 6 tests covering SYNC-02 (mutationFn rowCounts from Rust) and SYNC-05 (7-key invalidation) and SYNC-04 (error classification/logging)

*Existing infrastructure covers SYNC-01 (Rust-only, manual verification).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `bulk_sync_rules` returns per-table row counts | SYNC-01 | Rust-only code, cannot unit test in jsdom/Vitest environment | Run `pnpm tauri dev`, trigger sync from PlaybookTab, verify Rust logs show `SyncResult` with per-table counts |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-05-08 — Nyquist auditor gap fill (SYNC-02 mutationFn return shape test added)

---

## Validation Audit 2026-05-08

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |
