---
phase: 43
slug: extended-rules-read-layer
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
audited: 2026-05-08
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/datasheet/ tests/collection/PlaybookTab.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~53 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/datasheet/ tests/collection/PlaybookTab.test.tsx`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 43-01-T1 | 01 | 1 | SCHEMA-05 | unit | `pnpm test -- tests/datasheet/rulesExtendedQueries.test.ts` | ✅ | ✅ green |
| 43-01-T2 | 01 | 1 | SCHEMA-05 | unit | `pnpm test -- tests/datasheet/useRulesExtended.test.tsx` | ✅ | ✅ green |
| 43-02-T1a | 02 | 2 | SCHEMA-01 | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ | ✅ green |
| 43-02-T1b | 02 | 2 | SCHEMA-02 | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ | ✅ green |
| 43-02-T1c | 02 | 2 | SCHEMA-03 | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ | ✅ green |
| 43-02-T1d | 02 | 2 | SCHEMA-04 | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/datasheet/rulesExtendedQueries.test.ts` — 4 tests for SCHEMA-05 (query functions): mock `@/db/rules-client`, assert SQL strings and params for all four functions
- [x] `tests/datasheet/useRulesExtended.test.tsx` — 8 tests for SCHEMA-05 (hooks): mock `@/db/queries/rulesExtended`, assert `enabled`/`idle` behavior, `staleTime: Infinity`

*Both Wave 0 test files created during Plan 01 execution (commits 91eafc6, 097b7cd).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stratagem phase grouping display | SCHEMA-01 | Visual grouping appearance cannot be verified by unit test | 1. Open PlaybookTab for a unit with linked faction 2. Verify stratagems grouped by phase name 3. Verify CP cost, type, description shown |
| Detachment abilities nested under parent | SCHEMA-03 | Visual nesting layout | 1. Open PlaybookTab 2. Verify detachment abilities appear under their parent detachment heading |
| Sections hidden when no data | SCHEMA-01-04 | Conditional rendering in context of full component | 1. Open PlaybookTab for unit with no linked faction 2. Verify no extended rules sections appear |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** PASSED

---

## Validation Audit 2026-05-08

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Test Results at Audit Time:**
- `tests/datasheet/rulesExtendedQueries.test.ts`: 4 tests ✅
- `tests/datasheet/useRulesExtended.test.tsx`: 8 tests ✅
- `tests/collection/PlaybookTab.test.tsx`: 21 tests ✅ (9 SCHEMA-01-04 + 12 existing)
- Full suite: 972 passed, 6 skipped, 12 todo — 0 failures
