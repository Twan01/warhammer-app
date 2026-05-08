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
| **Quick run command** | `pnpm test -- tests/painting/recipeSections.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/recipeSections.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 48-01-T1 | 01 | 1 | SECT-01, SECT-02, SECT-03 | build | `pnpm build` | N/A | ⬜ pending |
| 48-01-T2 | 01 | 1 | SECT-01, SECT-02 | build | `pnpm build` | N/A | ⬜ pending |
| 48-02-T1 | 02 | 2 | SECT-04, SECT-05, SECT-06 | build | `pnpm build` | N/A | ⬜ pending |
| 48-02-T2 | 02 | 2 | SECT-04, SECT-05 | build | `pnpm build` | N/A | ⬜ pending |
| 48-02-T3 | 02 | 2 | SECT-01–SECT-06 | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | ❌ W2 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 plan is needed:

- Wave 1 tasks (Plan 48-01) use `pnpm build` as their verification gate — TypeScript compilation confirms migration SQL file exists, types are well-formed, and imports resolve
- Wave 2 Task 3 (Plan 48-02) creates the test file `tests/painting/recipeSections.test.ts` with full query and hook coverage
- Automated test coverage for SECT-01 through SECT-06 arrives in Wave 2 via the TDD task — this is acceptable because Wave 1 is schema + types only (no runtime behavior to test without Tauri)

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
