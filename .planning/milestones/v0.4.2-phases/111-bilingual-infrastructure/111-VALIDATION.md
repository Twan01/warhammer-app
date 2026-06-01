---
phase: 111
slug: bilingual-infrastructure
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-01
---

# Phase 111 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 111-01-01 | 01 | 1 | FR-02 | unit | `pnpm test -- tests/build-pipeline/translations-overlay.test.ts` | ⬜ pending |
| 111-01-02 | 01 | 1 | FR-02 | unit + integration | `pnpm test -- tests/build-pipeline/translations-overlay.test.ts && pnpm build` | ⬜ pending |
| 111-02-01 | 02 | 1 | FR-03 | unit | `pnpm test -- tests/unit-database/locale-queries.test.ts tests/unit-database/locale-store.test.ts && pnpm build` | ⬜ pending |
| 111-02-02 | 02 | 1 | FR-03 | build | `pnpm build` | ⬜ pending |
| 111-03-01 | 03 | 2 | FR-04 | unit | `pnpm test -- tests/unit-database/locale-toggle.test.ts && pnpm build` | ⬜ pending |
| 111-03-02 | 03 | 2 | FR-05 | build + grep | `cargo check --manifest-path src-tauri/Cargo.toml && grep -c "name_fr" src-tauri/src/lib.rs` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Test stubs are created as the first action within each plan's tasks — no separate Wave 0 plan needed. Each plan creates its test files before implementing production code.*

- Plan 01 Task 2: creates `tests/build-pipeline/translations-overlay.test.ts`
- Plan 02 Task 1: creates `tests/unit-database/locale-queries.test.ts` and `tests/unit-database/locale-store.test.ts`
- Plan 03 Task 1: creates `tests/unit-database/locale-toggle.test.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Locale toggle persists | FR-04 | localStorage persistence requires app restart verification | Toggle EN->FR, close app, reopen — should remain FR |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
