---
phase: 12
slug: collection-gallery-view
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-03
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + React Testing Library 16.3.2 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test -- --run tests/collection/` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds (quick) / ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run tests/collection/`
- **After every plan wave:** Run `npm test` (full suite — must stay at 219+ passing, 0 failing)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-00-01 | 00 | 0 | UI-05 | unit | `npm test -- --run tests/collection/PaintingRing.test.tsx` | ❌ W0 | ⬜ pending |
| 12-00-02 | 00 | 0 | UI-04, UI-05, UI-06 | unit | `npm test -- --run tests/collection/UnitGallery.test.tsx` | ❌ W0 | ⬜ pending |
| 12-01-01 | 01 | 1 | UI-05 | unit | `npm test -- --run tests/collection/PaintingRing.test.tsx` | ✅ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | UI-04 | unit | `npm test -- --run tests/collection/UnitGallery.test.tsx` | ✅ W0 | ⬜ pending |
| 12-02-01 | 02 | 2 | UI-04, UI-05, UI-06 | unit | `npm test -- --run tests/collection/UnitGallery.test.tsx` | ✅ W0 | ⬜ pending |
| 12-03-01 | 03 | 3 | UI-04..06 | manual | Visual smoke test in live Tauri app | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/collection/PaintingRing.test.tsx` — stubs for UI-05 ring rendering (percentage text, aria-label, role=img)
- [ ] `tests/collection/UnitGallery.test.tsx` — stubs for UI-04 (toggle renders, switching, active state), UI-05 (card content), UI-06 (filter independence)

*No new test infrastructure needed — vitest, RTL, jsdom, and setup.ts are all installed and configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PaintingRing SVG renders correctly at 96px with visible arc | UI-05 | Visual pixel-accuracy not testable in jsdom | Open live Tauri app, navigate to Collection, switch to Gallery, inspect a unit card — ring should show zinc track + primary arc at correct painted % |
| View toggle icon buttons are visually distinct (active has bg-muted) | UI-04 | CSS class application verified in unit test; visual rendering requires live app | Switch between Table/Gallery views — active button should appear visually highlighted |
| Gallery grid is responsive (2→3→4 cols) | UI-05 | Window resize not testable in jsdom | Resize app window; verify column count changes |
| localStorage persistence across navigation | UI-04 | Requires real browser/Tauri environment | Switch to Gallery, navigate to Dashboard, return to Collection — should still be in Gallery mode |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
