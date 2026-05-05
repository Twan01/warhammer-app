---
phase: 23
slug: display-features
status: approved
nyquist_compliant: true
wave_0_complete: true
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
| 23-01-01 | 01 | 1 | DISP-01 | unit | `pnpm test -- tests/collection/collectionFilters.test.ts tests/collection/unitFilters.test.ts` | ✅ | ✅ green |
| 23-01-02 | 01 | 1 | DISP-01 | build | `pnpm build` | ✅ | ✅ green |
| 23-02-01 | 02 | 2 | DISP-02, DISP-03 | component smoke | `pnpm test -- tests/collection/showcaseMode.test.tsx` | ✅ | ✅ green |
| 23-02-02 | 02 | 2 | DISP-02, DISP-03 | build | `pnpm build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement Coverage Detail

| Req ID | Behavior | Test File | Test Count | Status |
|--------|----------|-----------|------------|--------|
| DISP-01 | battleReady toggle in Zustand store | `tests/collection/collectionFilters.test.ts` | 3 | COVERED |
| DISP-01 | applyUnitFilters with battleReady condition | `tests/collection/unitFilters.test.ts` | 5 | COVERED |
| DISP-02 | Showcase overlay renders (overlay, name, photo, counter) | `tests/collection/showcaseMode.test.tsx` | 4 | COVERED |
| DISP-02 | Showcase fullscreen entry (setFullscreen on mount) | `tests/collection/showcaseMode.test.tsx` | 1 | COVERED |
| DISP-03 | Escape key calls onClose | `tests/collection/showcaseMode.test.tsx` | 1 | COVERED |
| DISP-03 | X button calls onClose | `tests/collection/showcaseMode.test.tsx` | 1 | COVERED |
| DISP-02/03 | Arrow key navigation (right + left wrap) | `tests/collection/showcaseMode.test.tsx` | 2 | COVERED |
| DISP-03 | setFullscreen(false) on close | `tests/collection/showcaseMode.test.tsx` | 1 | COVERED |

**Total automated tests for phase:** 18 (8 filter + 10 showcase)

---

## Wave 0 Requirements

All test files created during execution. No outstanding Wave 0 gaps.

- [x] `tests/collection/showcaseMode.test.tsx` — 10 tests covering DISP-02 and DISP-03
- [x] `tests/collection/collectionFilters.test.ts` — 3 new battleReady tests extending existing file
- [x] `tests/collection/unitFilters.test.ts` — 5 new battleReady tests extending existing file
- [x] Mocks for `@tauri-apps/api/window` and `@tauri-apps/api/core` in showcaseMode.test.tsx

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full-screen window via Tauri API | DISP-02 | Requires native Tauri runtime (no IPC bridge in jsdom) | Run `pnpm tauri dev`, click "Enter Showcase", verify window goes full-screen |
| Escape key exits full-screen | DISP-03 | Tauri fullscreen state not available in jsdom | Press Escape in Showcase Mode, verify app returns to windowed view |
| Photo rendering in Showcase | DISP-02 | `convertFileSrc` requires Tauri runtime for asset:// protocol | Verify photos display correctly in full-screen gallery |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-05

---

## Validation Audit 2026-05-05

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 9 requirement behaviors have automated test coverage. 18 tests across 3 test files. Full suite: 644 passed, 2 skipped, 0 failures.
