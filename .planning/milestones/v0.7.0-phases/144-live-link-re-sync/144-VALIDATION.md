---
phase: 144
slug: live-link-re-sync
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-22
---

# Phase 144 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. The
> resync loop is the milestone's highest-risk code — data-layer tests gate all
> UI work (Phase 144 Critical Gate; SC#3).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + better-sqlite3 (data layer) / jsdom + RTL (UI) |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `pnpm test -- tests/data-layer/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10s (data-layer subset); ~60–110s (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/data-layer/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 144-W0 | — | 0 | LINK-01, SC#1/#3/#4 | — | resync preserves recipe_step.id + progress for surviving steps; removed-step progress cascades; single db handle | integration | `pnpm test -- tests/data-layer/resyncTechniqueInstances.test.ts` | ❌ W0 | ⬜ pending |
| 052-MIG | — | 0 | LINK-01 | — | migration 052 adds recipe_sections.technique_section_id + index; `pnpm check:version` 3-leg gate green | migration | `pnpm test -- tests/data-layer/` + `pnpm check:version` | ❌ W0 | ⬜ pending |
| LINK-02/03 | TBD | 1+ | LINK-02, LINK-03 | — | pre-save preview diff returns affected-recipe count + aggregated change summary (adds/removes/reorders) | unit + component | `pnpm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/data-layer/resyncTechniqueInstances.test.ts` — covers all four edit cases against the real in-memory schema (SC#3):
  - **reorder** → surviving recipe_step.id unchanged, `unit_recipe_step_progress` untouched (UPDATE order_index only);
  - **add step** → new recipe_step row, no progress row (uncompleted);
  - **remove step** → recipe_step DELETEd, its progress rows cascade-gone;
  - **slot add/remove** → orphan prevention via CASCADE on `recipe_technique_slot_maps`.
  - Plus the "teeth" counter-assertion: a DELETE+INSERT of a surviving step WOULD break progress (proving the identity-preserving path is the correct one).
- [ ] Migration `052_*.sql` — `recipe_sections.technique_section_id` (nullable FK, ON DELETE SET NULL) + index on `recipe_steps(technique_step_id)`. Schema version bumps to 052; `pnpm check:version` 3-leg gate must pass.
- [ ] Pure preview-diff unit test — `adds N / removes M / reorders K` counts across instances, no DB writes.
- [ ] Reuse `tests/data-layer/db-helpers.ts` (`createDbBridge`, `createHobbyforgeDb`) and the existing SQL proven in `tests/data-layer/technique-progress-identity.test.ts` (lines 192–419).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Affected-recipes confirmation dialog UX | LINK-02, LINK-03 | Visual/interaction quality not assertable in jsdom | Edit a technique structurally (add/remove a step) → confirm dialog shows "X recipes will be affected" + change summary; Cancel aborts with no writes; Confirm propagates |
| Post-resync recipe rendering | LINK-01 | Cross-surface visual confirmation | After confirming a technique edit, open an affected recipe → new structure present, completed surviving steps still marked done |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (resync test + migration 052 + preview-diff test)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
