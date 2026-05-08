---
phase: 48
slug: section-data-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
---

# Phase 48 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/recipes/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/recipes/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 48-01-01 | 01 | 1 | SECT-01 | unit | `pnpm test -- tests/recipes/recipeSections.test.ts` | ❌ W0 | ⬜ pending |
| 48-01-02 | 01 | 1 | SECT-02 | unit | `pnpm test -- tests/recipes/recipeSections.test.ts` | ❌ W0 | ⬜ pending |
| 48-01-03 | 01 | 1 | SECT-03 | unit | `pnpm test -- tests/recipes/recipeSections.test.ts` | ❌ W0 | ⬜ pending |
| 48-01-04 | 01 | 1 | SECT-04 | unit | `pnpm test -- tests/recipes/useRecipeSections.test.ts` | ❌ W0 | ⬜ pending |
| 48-01-05 | 01 | 1 | SECT-05 | unit | `pnpm test -- tests/recipes/useRecipeSections.test.ts` | ❌ W0 | ⬜ pending |
| 48-01-06 | 01 | 1 | SECT-06 | unit | `pnpm test -- tests/recipes/recipeSections.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/recipes/recipeSections.test.ts` — stubs for SECT-01, SECT-02, SECT-03, SECT-06
- [ ] `tests/recipes/useRecipeSections.test.ts` — stubs for SECT-04, SECT-05

*Existing test infrastructure (Vitest, jest-dom, mock patterns) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 018 runs at app startup | SECT-03 | Requires Tauri runtime + SQLite | Run `pnpm tauri dev`, verify no migration errors in console |
| Section order survives app restart | SECT-05 | Requires full app lifecycle | Create sections, reorder, restart app, verify order persisted |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
