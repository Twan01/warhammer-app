---
phase: 145
slug: integration-pass
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-22
---

# Phase 145 — Validation Strategy

> Per-phase validation contract. The phase's honesty invariant — **no silent
> undercounting** — is proven by data-layer + component tests before the UI
> affordances are accepted.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + better-sqlite3 (data layer) / jsdom + RTL (components) |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `pnpm test -- tests/data-layer/ tests/painting/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15s (subset); ~60–110s (full) |

---

## Sampling Rate

- **After every task commit:** Run the relevant subset (`pnpm test -- tests/data-layer/` or `tests/painting/`)
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 145-W0 | — | 0 | INTG-02/05/06 | — | unfilled-slot count correct; availability resolves via effectivePaintId; duplication preserves live link | integration | `pnpm test -- tests/data-layer/` | ❌ W0 | ⬜ pending |
| INTG-01/03 | TBD | 1+ | INTG-01, INTG-03 | — | Painting Mode + apply-to-units resolve technique steps (not empty, correct swatch); completion on recipe_step.id | component | `pnpm test -- tests/painting/` | ❌ W0 | ⬜ pending |
| INTG-04/07 | TBD | 1+ | INTG-04, INTG-07 | — | timeline badge present; swatch-tap single-slot reassign saves + refreshes | component | `pnpm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/data-layer/recipe-duplication-live-link.test.ts` — INTG-05: duplicating a recipe creates new `recipe_technique_instances` + copied `recipe_technique_slot_maps`, materialised steps keep `technique_step_id` (live link preserved, not flattened).
- [ ] `tests/data-layer/unfilled-slot-count.test.ts` — INTG-06: `getUnfilledSlotCount(recipeId)` counts unfilled slots (no map row OR `paint_id IS NULL`) across non-detached instances (`detached = 0`); returns 0 when all filled.
- [ ] `tests/data-layer/availability-effective-paint.test.ts` (or extend existing) — INTG-02: a technique step with a filled slot counts toward owned/missing exactly as a plain step; an unfilled slot is NOT counted as missing (no silent undercounting).
- [ ] Reuse `tests/data-layer/db-helpers.ts`; component tests under `tests/painting/` and `tests/recipes/` mirroring existing conventions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Painting Mode technique-step swatch + distinct unfilled indicator | INTG-01 | Visual swatch rendering | Enter Painting Mode on a recipe with a technique → technique steps show resolved swatch or a distinct dashed "slot unfilled" indicator; keyboard shortcuts unchanged |
| "N colour slots unfilled" readiness warning | INTG-06 | Visual banner | Open a recipe with unfilled technique slots → readiness banner shows "N colour slots unfilled" alongside owned/missing |
| Swatch-tap inline single-slot mini-dialog | INTG-07 | Interactive reassign | In Painting Mode, tap a technique step's swatch → single-slot mini-dialog → reassign paint → swatch updates without leaving the mode |
| SectionedTimeline "from technique X" badge | INTG-04 | Visual badge | Open recipe detail → technique-sourced sections show the badge |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (duplication, unfilled-count, availability tests)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
