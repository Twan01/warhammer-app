---
phase: 142
slug: technique-authoring-library-browse
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-21
---

# Phase 142 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 142-RESEARCH.md § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (jsdom) + better-sqlite3 for data-layer tests |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `pnpm test -- tests/data-layer/technique-graph-save.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~60–90 seconds (full suite ~2916+ tests) |

---

## Sampling Rate

- **After every task commit:** Run the relevant data-layer or feature test file
- **After every plan wave:** Run `pnpm test`
- **Before phase verification:** Full suite must be green
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

| Task | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| Technique graph save (non-destructive) | TECH-01, TECH-02 | UPDATE-not-replace; surviving `technique_step_id` PKs untouched across add/remove/reorder | data-layer | `pnpm test -- tests/data-layer/technique-graph-save.test.ts` | ❌ W0 | ⬜ pending |
| Slot diff + slotIdMap | SLOT-01, SLOT-02 | step `colour_slot_id` resolves localId→PK; removed slot nulls referencing steps | data-layer | `pnpm test -- tests/data-layer/technique-graph-save.test.ts` | ❌ W0 | ⬜ pending |
| Duplicate technique | TECH-04 | deep copy yields fresh IDs across sections/steps/slots; no shared PKs | data-layer | `pnpm test -- tests/data-layer/technique-duplicate.test.ts` | ❌ W0 | ⬜ pending |
| Usage-count query | TECH-03, TECH-05, LIB-01 | `getTechniquesWithCounts` JOINs through technique_sections for step count; usage = recipe_technique_instances per technique (0 this phase) | data-layer | `pnpm test -- tests/data-layer/technique-usage-counts.test.ts` | ❌ W0 | ⬜ pending |
| Technique form schema | TECH-01, SLOT-01 | Zod requires name + ≥1 step; slots optional | unit | `pnpm test -- tests/features/techniques/techniqueSchema.test.ts` | ❌ W0 | ⬜ pending |
| Library browse/filter | LIB-02, LIB-03, LIB-04 | name search + effect filter pure function | unit | `pnpm test -- tests/features/techniques/applyTechniqueFilters.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/data-layer/technique-graph-save.test.ts` — non-destructive save invariant (the FND-03 invariant applied to authoring): add/remove/reorder a technique step never changes a surviving `technique_step_id`; teeth via a DELETE+INSERT counter-case
- [ ] `tests/data-layer/technique-duplicate.test.ts` — duplicate yields fully-fresh IDs
- [ ] `tests/data-layer/technique-usage-counts.test.ts` — step-count JOIN correctness + usage count
- [ ] `tests/features/techniques/techniqueSchema.test.ts` — Zod validity (name + ≥1 step)
- [ ] `tests/features/techniques/applyTechniqueFilters.test.ts` — pure filter function

*Existing better-sqlite3 data-layer harness (tests/data-layer/) and Vitest+RTL feature-test infra cover the framework needs — no new framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Technique tab renders on /recipes; create/edit/duplicate/delete flows visually correct | TECH-05, LIB-01..04 | Live-app Tauri UI interaction not exercised by jsdom | Open app → /recipes → Techniques tab → create a technique with 2 sections, steps, 2 slots; edit/reorder; duplicate; delete |
| dnd-kit reorder drag behaves like recipe reorder | TECH-02 | Pointer drag not reliably simulated in jsdom | Drag a step/section in the technique form; confirm order persists on save |

*Non-blocking human UAT — automated data-layer tests prove the load-bearing invariants.*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
