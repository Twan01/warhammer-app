---
phase: 126
slug: critical-fixes-dead-ends
status: draft
nyquist_compliant: false
nyquist_override: "UI fix phase — 11 small visual/behavioral fixes across 12 files. Manual visual verification is the appropriate strategy. pnpm build confirms type safety; visual testing confirms behavioral correctness (toast presence/absence, button visibility, CSS rendering). Automated behavioral tests for these changes would test React rendering internals rather than user-visible behavior."
wave_0_complete: false
created: 2026-06-11
---

# Phase 126 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 126-01-01 | 01 | 1 | FIX-01 | — | N/A | manual | Visual: completion screen has exit button + Escape hint | N/A | ⬜ pending |
| 126-01-02 | 01 | 1 | FIX-02 | — | N/A | manual | Visual: error screen has back button + Escape hint | N/A | ⬜ pending |
| 126-01-03 | 01 | 1 | FIX-03 | — | N/A | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 126-01-04 | 01 | 1 | FIX-04 | — | N/A | manual | Visual: RecipesPage shows error state on query failure | N/A | ⬜ pending |
| 126-01-05 | 01 | 1 | FIX-05 | — | N/A | manual | Visual: Settings/DataHealth use PageHeader | N/A | ⬜ pending |
| 126-01-06 | 01 | 1 | FIX-06 | — | N/A | manual | Visual: tokens defined in :root | N/A | ⬜ pending |
| 126-01-07 | 01 | 1 | FIX-07 | — | N/A | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 126-01-08 | 01 | 1 | FIX-08 | — | N/A | manual | Visual: success toasts appear on enhancement/leader mutations | N/A | ⬜ pending |
| 126-01-09 | 01 | 1 | FIX-09 | — | N/A | manual | Visual: error toast on favorite rollback | N/A | ⬜ pending |
| 126-01-10 | 01 | 1 | FIX-10 | — | N/A | manual | Visual: loading skeleton vs not-found message | N/A | ⬜ pending |
| 126-01-11 | 01 | 1 | FIX-11 | — | N/A | manual | Visual: dark scrollbars with zinc colors | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Most fixes are visual/behavioral and verified manually.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exit button on completion screen | FIX-01 | Visual UI element | Complete all painting steps, verify exit button and Escape hint visible |
| Back button on error screen | FIX-02 | Visual UI element | Navigate to invalid painting assignment, verify back button and Escape work |
| No toast on unchanged notes | FIX-03 | Toast absence verification | Open army list, don't change notes, click save — no toast should appear |
| Error state on RecipesPage | FIX-04 | Network error simulation | Simulate query failure, verify error UI with retry button |
| PageHeader consistency | FIX-05 | Visual consistency | Open Settings and Data Health, verify text-3xl + border-b headers |
| Light-mode token fallbacks | FIX-06 | CSS token verification | Inspect :root in dev tools, verify tokens defined |
| Single error toast on goal delete | FIX-07 | Toast count verification | Simulate goal delete failure, verify only one error toast |
| Success toasts on mutations | FIX-08 | Toast presence verification | Assign/remove enhancement, attach/detach leader — verify success toasts |
| Error toast on favorite rollback | FIX-09 | Network error simulation | Toggle favorite, simulate failure, verify error toast |
| Loading vs not-found | FIX-10 | State distinction | Delete army list, navigate to its URL, verify "not found" instead of skeleton |
| Dark scrollbar styling | FIX-11 | Visual CSS | Scroll any long list, verify zinc-colored thin scrollbars |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
