---
phase: 142
slug: technique-authoring-library-browse
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-21
audited: 2026-06-22
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
| Technique graph save (non-destructive) | TECH-01, TECH-02 | UPDATE-not-replace; surviving `technique_step_id` PKs untouched across add/remove/reorder | data-layer | `pnpm test -- tests/data-layer/technique-graph-save.test.ts` | ✅ | ✅ green |
| Slot diff + slotIdMap | SLOT-01, SLOT-02 | step `colour_slot_id` resolves localId→PK; removed slot nulls referencing steps | data-layer | `pnpm test -- tests/data-layer/technique-graph-save.test.ts` | ✅ | ✅ green |
| Duplicate technique | TECH-04 | deep copy yields fresh IDs across sections/steps/slots; no shared PKs | data-layer | `pnpm test -- tests/data-layer/technique-duplicate.test.ts` | ✅ | ✅ green |
| Usage-count query | TECH-03, TECH-05, LIB-01 | `getTechniquesWithCounts` JOINs through technique_sections for step count; usage = recipe_technique_instances per technique (0 this phase) | data-layer | `pnpm test -- tests/data-layer/technique-usage-counts.test.ts` | ✅ | ✅ green |
| Technique form schema | TECH-01, SLOT-01 | Zod requires name + ≥1 step; slots optional | unit | `pnpm test -- tests/techniques/techniqueSchema.test.ts` | ✅ | ✅ green |
| Library browse/filter | LIB-02, LIB-03, LIB-04 | name search + effect filter pure function | unit | `pnpm test -- tests/techniques/applyTechniqueFilters.test.ts` | ✅ | ✅ green |
| Library card (counts/usage/actions) | LIB-02 | counts, usage line, effect/difficulty badges, action row render | feature (RTL) | `pnpm test -- tests/techniques/TechniqueCard.test.tsx` | ✅ | ✅ green |
| Detail sheet (step tree, used-by) | TECH-05, LIB-04 | sectioned step tree renders; "Not used by any recipes yet." when empty | feature (RTL) | `pnpm test -- tests/techniques/TechniqueDetailSheet.test.tsx` | ✅ | ✅ green |
| Delete dialog (usage-count warning) | TECH-03 | usage-count-aware description; cascade note when N>0 | feature (RTL) | `pnpm test -- tests/techniques/TechniqueDeleteDialog.test.tsx` | ✅ | ✅ green |
| Library tab (renders, name filter) | LIB-01, LIB-03 | tab renders; case-insensitive name filter, clear, filtered-empty | feature (RTL) | `pnpm test -- tests/techniques/TechniqueLibraryTab.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> Audit 2026-06-22: all rows confirmed GREEN against the live tree (full suite: 330 files / 2982 passed, 0 failures). Plan 04 added four RTL feature tests (Card/DetailSheet/DeleteDialog/LibraryTab) beyond the original six Wave-0 stubs — appended above.

---

## Wave 0 Requirements

- [x] `tests/data-layer/technique-graph-save.test.ts` — non-destructive save invariant (the FND-03 invariant applied to authoring): add/remove/reorder a technique step never changes a surviving `technique_step_id`; teeth via a DELETE+INSERT counter-case
- [x] `tests/data-layer/technique-duplicate.test.ts` — duplicate yields fully-fresh IDs
- [x] `tests/data-layer/technique-usage-counts.test.ts` — step-count JOIN correctness + usage count
- [x] `tests/techniques/techniqueSchema.test.ts` — Zod validity (name + ≥1 step)
- [x] `tests/techniques/applyTechniqueFilters.test.ts` — pure filter function

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

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-22 — all requirements have automated verification, full suite green.

---

## Validation Audit 2026-06-22

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Phase 142 was executed before this audit ran. All six original Wave-0 stub tests were
created during plan 01 and turned GREEN across plans 02/04; plan 04 added four RTL
feature tests. The VALIDATION.md draft (status `draft`, `nyquist_compliant: false`) was
never reconciled post-execution — this audit verified every requirement against the live
tree (all test files present, full suite 330 files / 2982 passed / 0 failures) and
promoted the contract to `validated` / `nyquist_compliant: true`. No new tests required.
