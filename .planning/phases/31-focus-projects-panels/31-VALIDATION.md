---
phase: 31
slug: focus-projects-panels
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-06
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest config inline) |
| **Quick run command** | `pnpm test -- tests/dashboard/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/dashboard/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-00-01 | 00 | 0 | PHOTO-01, PHOTO-02, PANEL-01, PANEL-02, PANEL-03 | stubs | `pnpm test -- tests/dashboard/UnitThumbnail.test.ts tests/dashboard/CurrentFocusCard.test.ts tests/dashboard/ActiveProjectsPanel.test.ts` | Created in W0 | ⬜ pending |
| 31-01-01 | 01 | 1 | PHOTO-01, PHOTO-02 | unit | `pnpm test -- tests/dashboard/UnitThumbnail.test.ts` | ✅ W0 | ⬜ pending |
| 31-01-02 | 01 | 1 | PANEL-01, PANEL-02 | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.ts` | ✅ W0 | ⬜ pending |
| 31-02-01 | 02 | 2 | PANEL-03, PHOTO-01 | unit | `pnpm test -- tests/dashboard/ActiveProjectsPanel.test.ts` | ✅ W0 | ⬜ pending |
| 31-02-02 | 02 | 2 | PANEL-03 | integration | `pnpm test -- tests/dashboard/` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/dashboard/UnitThumbnail.test.ts` — stubs for PHOTO-01, PHOTO-02 (photo render, fallback render, faction color, onError)
- [x] `tests/dashboard/CurrentFocusCard.test.ts` — stubs for PANEL-01, PANEL-02 (photo thumbnail, metadata, action callbacks)
- [x] `tests/dashboard/ActiveProjectsPanel.test.ts` — stubs for PANEL-03 (up to 5 rows, empty state, progress %)

Wave 0 is addressed by Plan 31-00-PLAN.md which creates all three stub files with `it.todo()` placeholders.

Note: Tauri APIs (`convertFileSrc`, `appDataDir`) must be mocked. Use `vi.mock("@tauri-apps/api/core")` and `vi.mock("@tauri-apps/api/path")`. Props-based architecture makes component tests straightforward (no QueryClient setup needed).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Photo thumbnail visual quality | PHOTO-01 | Visual appearance (aspect ratio, crop) | Run `pnpm tauri dev`, navigate to Dashboard, verify photo renders with correct crop in CurrentFocusCard |
| Faction-colored fallback visual | PHOTO-02 | Color rendering against dark background | With no journal photos, verify faction color background + Swords icon renders correctly |
| Grid placement in bento layout | PANEL-01 | CSS layout interaction with Phase 30 grid | Resize window from 1280px to 900px, verify panels stack correctly |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (Wave 0 plan created as 31-00-PLAN.md)
