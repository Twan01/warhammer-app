---
phase: 146
slug: detach-safety-rails
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-23
---

# Phase 146 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `pnpm test -- tests/data-layer/detach-technique.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/data-layer/detach-technique.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 146-01-01 | 01 | 1 | SAFE-02 | — | Detach bakes effectivePaintId into recipe_steps.paint_id before slot-map cascade | unit | `pnpm test -- tests/data-layer/detach-technique.test.ts` | ❌ W0 | ⬜ pending |
| 146-01-02 | 01 | 1 | SAFE-02 | — | After detach: recipe_step.id stable, unit_recipe_step_progress survives (FND-03) | unit | `pnpm test -- tests/data-layer/detach-technique.test.ts` | ❌ W0 | ⬜ pending |
| 146-01-03 | 01 | 1 | SAFE-02 | — | After detach: technique_step_id NULL, technique_instance_id/section_id NULL, instance + slot maps gone | unit | `pnpm test -- tests/data-layer/detach-technique.test.ts` | ❌ W0 | ⬜ pending |
| 146-02-01 | 02 | 2 | SAFE-03 | — | auto-detach-then-delete: deleting technique with live instances preserves recipe content | unit | `pnpm test -- tests/data-layer/detach-technique.test.ts` | ❌ W0 | ⬜ pending |
| 146-03-01 | 03 | 3 | SAFE-01, SAFE-02 | — | Editor badge + Unlink trigger renders for technique-sourced sections | unit/component | `pnpm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/data-layer/detach-technique.test.ts` — stubs for SAFE-02, SAFE-03 (detach correctness + auto-detach-on-delete); mirrors `tests/data-layer/technique-resync.test.ts` and `apply-technique.test.ts` scaffolding (`createDbBridge`, `createHobbyforgeDb`)

*Existing data-layer infrastructure (`tests/data-layer/db-helpers.ts`) covers fixture/bridge needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AlertDialog confirmation copy + toast appearance in real app | SAFE-01 | Visual/interaction — jsdom cannot assert rendered toast styling | In `pnpm tauri dev`: apply a technique to a recipe, click the Unlink affordance on the section badge, confirm the warning dialog copy, verify toast and that the section becomes plain editable content |
| TechniqueDeleteDialog "Detach N recipes & delete" flow end-to-end | SAFE-03 | Cross-surface UX (technique library → recipe) | Delete a technique used by ≥1 recipe; confirm the count is shown and the recipe content survives after delete |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
