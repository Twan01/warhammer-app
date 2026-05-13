---
phase: 61
slug: recipe-workflow-hardening
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-12
---

# Phase 61 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | vite.config.ts (vitest block) |
| **Quick run command** | `pnpm test -- tests/painting/recipeSections.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/painting/recipeSections.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green (minus 5 pre-existing rules-hub/datasheet failures)
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 61-01-01 | 01 | 1 | RH-01 | build | `cargo check --manifest-path src-tauri/Cargo.toml` | N/A | ✅ green |
| 61-01-02 | 01 | 1 | RH-01 | build | `pnpm build` | N/A | ✅ green |
| 61-01-03 | 01 | 1 | RH-01 | manual | `pnpm tauri dev` + verify recipe_sections table | Manual only | ✅ green |
| 61-01-04 | 01 | 1 | RH-02 | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | ✅ | ✅ green |
| 61-01-05 | 01 | 1 | RH-02 | unit | `pnpm test -- tests/lib/computeWorkflowPosition.test.ts` | ✅ | ✅ green |
| 61-01-06 | 01 | 1 | RH-03 | unit | `pnpm test -- tests/painting/recipeSectionCard.test.tsx` | ✅ | ✅ green |
| 61-01-07 | 01 | 1 | RH-03 | unit | SECTION_TYPES const array assertion | ✅ (inline) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/lib/computeWorkflowPosition.test.ts` — covers RH-02 degradation when section name does not match (stale/orphaned section reference)
- [x] `tests/painting/recipeSectionCard.test.tsx` — covers RH-03 progressive disclosure threshold (single-section, no metadata -> workflow collapsible hidden)
- [x] `tests/painting/logSessionSheet.test.tsx` — SESS-05 section_name snapshot behavior (section_name defaults to null)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fresh install creates recipe_sections with 4 metadata columns | RH-01 | Tauri plugin-sql migration runner requires native bridge (unavailable in jsdom) | 1. `pnpm tauri dev` 2. Open app 3. Create a recipe with sections 4. Verify section saves successfully |
| Renaming section doesn't break existing sessions | RH-02 | Requires full app with SQLite to verify cross-table behavior | 1. Create recipe with sections 2. Log a session referencing a section 3. Rename the section in recipe form 4. Verify old session still displays |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-13

---

## Validation Audit 2026-05-13

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Coverage summary:**
- RH-01: 2 build verifications (cargo check + pnpm build) + 1 manual smoke test — all green
- RH-02: 15 unit tests in computeWorkflowPosition.test.ts including stale section name degradation — all passing
- RH-03: 26 unit tests in recipeSectionCard.test.tsx including progressive disclosure threshold for all 4 metadata fields — all passing
- SECTION_TYPES: 2 assertions verifying 7 expected values — passing
- Full suite: 1361 passing, 5 pre-existing failures (rules-hub/datasheet, unrelated to Phase 61)
