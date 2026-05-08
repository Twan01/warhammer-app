---
phase: 44
slug: sync-pipeline-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
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
| 44-01-01 | 01 | 1 | SYNC-01 | manual | `pnpm tauri dev` then trigger sync | N/A — Rust | ⬜ pending |
| 44-01-02 | 01 | 1 | SYNC-02 | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ❌ W0 | ⬜ pending |
| 44-02-01 | 02 | 1 | SYNC-03 | unit | `pnpm test -- tests/datasheet/validateCsvHeaders.test.ts` | ❌ W0 | ⬜ pending |
| 44-03-01 | 03 | 1 | SYNC-04 | unit | `pnpm test -- tests/datasheet/syncErrorQueries.test.ts` | ❌ W0 | ⬜ pending |
| 44-01-03 | 01 | 1 | SYNC-05 | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/datasheet/validateCsvHeaders.test.ts` — stubs for SYNC-03 (pure function, no mocks needed)
- [ ] `tests/datasheet/syncErrorQueries.test.ts` — stubs for SYNC-04 (mock `getDb()`, follow `datasheetQueries.test.ts` pattern)
- [ ] `tests/datasheet/useRulesSync.test.ts` — stubs for SYNC-02 and SYNC-05 (mock `invoke`, mock `queryClient.invalidateQueries`, assert toast call and invalidation calls)

*Existing infrastructure covers SYNC-01 (Rust-only, manual verification).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `bulk_sync_rules` returns per-table row counts | SYNC-01 | Rust-only code, cannot unit test in jsdom/Vitest environment | Run `pnpm tauri dev`, trigger sync from PlaybookTab, verify Rust logs show `SyncResult` with per-table counts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
