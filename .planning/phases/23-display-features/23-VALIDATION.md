---
phase: 23
slug: display-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/collection/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/collection/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-00-01 | 00 | 0 | DISP-02, DISP-03 | stub | `pnpm test -- tests/collection/showcaseMode.test.tsx` | ❌ W0 | ⬜ pending |
| 23-01-01 | 01 | 1 | DISP-01 | unit | `pnpm test -- tests/collection/collectionFilters.test.ts` | ✅ (extend) | ⬜ pending |
| 23-01-02 | 01 | 1 | DISP-01 | unit | `pnpm test -- tests/collection/unitFilters.test.ts` | ✅ (extend) | ⬜ pending |
| 23-01-03 | 01 | 1 | DISP-01 | component | `pnpm test -- tests/collection/` | ✅ (extend) | ⬜ pending |
| 23-02-01 | 02 | 2 | DISP-02 | component smoke | `pnpm test -- tests/collection/showcaseMode.test.tsx` | ❌ W0 | ⬜ pending |
| 23-02-02 | 02 | 2 | DISP-03 | component smoke | `pnpm test -- tests/collection/showcaseMode.test.tsx` | ❌ W0 | ⬜ pending |
| 23-02-03 | 02 | 2 | DISP-02/03 | component smoke | `pnpm test -- tests/collection/showcaseMode.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/collection/showcaseMode.test.tsx` — stubs for DISP-02 and DISP-03 (Showcase entry, display, exit, navigation)
- [ ] Extend `tests/collection/collectionFilters.test.ts` — add `battleReady` toggle and `clearAll` reset cases
- [ ] Extend `tests/collection/unitFilters.test.ts` — add `battleReady` filter logic cases
- [ ] Mock `@tauri-apps/api/window` and `@tauri-apps/api/core` (same pattern as existing Tauri API mocks)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full-screen window via Tauri API | DISP-02 | Requires native Tauri runtime (no IPC bridge in jsdom) | Run `pnpm tauri dev`, click "Enter Showcase", verify window goes full-screen |
| Escape key exits full-screen | DISP-03 | Tauri fullscreen state not available in jsdom | Press Escape in Showcase Mode, verify app returns to windowed view |
| Photo rendering in Showcase | DISP-02 | `convertFileSrc` requires Tauri runtime for asset:// protocol | Verify photos display correctly in full-screen gallery |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
