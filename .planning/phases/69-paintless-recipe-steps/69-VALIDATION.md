---
phase: 69
slug: paintless-recipe-steps
status: complete
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-13
---

# Phase 69 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/painting/sectionedTimeline.test.tsx tests/painting/recipeStepRow.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~3 seconds (targeted), ~54 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run targeted test command
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 69-01-01 | 01 | 1 | REC-01 | T-69-01 | Migration uses explicit 14-column INSERT-SELECT; PRAGMA FK toggling | build | `pnpm build` | N/A | ✅ green |
| 69-01-02 | 01 | 1 | REC-01 | — | SectionedTimeline excludes null paint_id from availability | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | ✅ | ✅ green |
| 69-01-02 | 01 | 1 | REC-01 | — | RecipeStepRow renders correctly with null paint_id | unit | `pnpm test -- tests/painting/recipeStepRow.test.tsx` | ✅ | ✅ green |
| 69-01-02 | 01 | 1 | REC-01 | — | Availability query excludes null paint_id (WHERE IS NOT NULL) | unit | `pnpm test -- tests/painting/recipePaintAvailability.test.ts` | ✅ | ✅ green |
| 69-01-02 | 01 | 1 | REC-01 | — | makeDraftStep initializes paint_id to null | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RecipeFormSheet saves all steps unconditionally (guard removed) | REC-01 | Heavily-wired form component with React Query mutations, Tauri IPC, DnD-kit, and section state — impractical to unit test in isolation | 1. Open a recipe in edit mode. 2. Add a step without selecting a paint. 3. Save the recipe. 4. Close and reopen — verify the paintless step persists. |

---

## Validation Audit 2026-05-13

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved | 2 |
| Escalated | 1 |

### Tests Added

| File | Tests Added | Gap |
|------|-------------|-----|
| `tests/painting/sectionedTimeline.test.tsx` | 2 (null paint_id availability exclusion) | G1 |
| `tests/painting/recipeStepRow.test.tsx` | 4 (paintless step rendering — PAINTLESS-01) | G3 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter (1 manual-only behavior)

**Approval:** partial 2026-05-13
