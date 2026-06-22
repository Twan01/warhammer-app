---
phase: 143
slug: apply-flow-slot-fill-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-22
---

# Phase 143 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (jsdom) + RTL 16 |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `pnpm test -- tests/data-layer/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30–60 seconds (full); ~10s (data-layer subset) |

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
| 143-W0  | —  | 0 | SC#5, SLOT-03/04 | — | guard never mutates technique_step_id steps; double-apply yields independent slot maps | integration | `pnpm test -- tests/data-layer/saveRecipeGraph-guard.test.ts tests/data-layer/apply-technique.test.ts tests/data-layer/effectivePaintId.test.ts` | ❌ W0 | ⬜ pending |
| APPLY-01..05 | TBD | 1+ | APPLY-01..05 | — | apply flow inserts instance + materialised section/steps + slot maps | integration + component | `pnpm test` | ❌ W0 | ⬜ pending |
| SLOT-03..06 | TBD | 1+ | SLOT-03..06 | — | per-instance slot mapping; empty slot is valid; swatch + role hint render | integration + component | `pnpm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/data-layer/saveRecipeGraph-guard.test.ts` — proves both the DELETE-loop and UPDATE-loop guards skip steps with `technique_step_id IS NOT NULL` (SC#5; the highest-risk invariant per RESEARCH finding #1).
- [ ] `tests/data-layer/apply-technique.test.ts` — proves apply creates `recipe_technique_instances` + materialised `recipe_sections`/`recipe_steps` with FK links + `recipe_technique_slot_maps`; same technique applied twice → two instances with independent slot maps (SLOT-03/04, APPLY-04).
- [ ] `tests/data-layer/effectivePaintId.test.ts` — proves the `SlotResolutionMap` JOIN resolves technique-owned steps via slot map; unfilled slot → null (treated paintless) (SLOT-05, FND-04 wiring).
- [ ] Reuse existing `tests/data-layer/db-helpers.ts` (`createDbBridge`, `createHobbyforgeDb`) — no new fixtures needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Picker Dialog browse/search/preview UX feel | APPLY-02 | Visual/interaction quality not assertable in jsdom | Open recipe editor → Add technique → search, preview slots+steps, insert |
| Slot-fill swatch rendering + combobox reuse | SLOT-06 | Visual swatch correctness | Open slot-fill dialog → confirm role hint + swatch + paint combobox per row |
| "from technique X" badge + detail "Edit colours" | APPLY-04, APPLY-05 | Visual badge + cross-surface edit | Apply technique → confirm badged section; open recipe detail → Edit colours → change paint |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (the three data-layer test files)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
