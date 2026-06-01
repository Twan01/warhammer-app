---
phase: 111
slug: bilingual-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 111-02-01 | 02 | 2 | FR-03 | unit | `pnpm test -- tests/unit-database/locale-queries.test.ts` | ⬜ pending |
| 111-02-02 | 02 | 2 | FR-04 | unit | `pnpm test -- tests/unit-database/locale-store.test.ts` | ⬜ pending |
| 111-03-01 | 03 | 2 | FR-05 | manual | Build script output verification | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — vitest + React Testing Library already installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FTS5 French search | FR-05 | FTS5 only works in SQLite (Tauri native); jsdom can't test | Run `pnpm tauri dev`, navigate to Database Browser, search for a French unit name |
| Locale toggle persists | FR-04 | localStorage persistence requires app restart verification | Toggle EN→FR, close app, reopen — should remain FR |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
