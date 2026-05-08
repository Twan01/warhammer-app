---
phase: 43
slug: extended-rules-read-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
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
| **Estimated runtime** | ~15 seconds |

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
| 43-01-01 | 01 | 1 | SCHEMA-05 | unit | `pnpm test -- tests/datasheet/rulesExtendedQueries.test.ts` | ❌ W0 | ⬜ pending |
| 43-01-02 | 01 | 1 | SCHEMA-05 | unit | `pnpm test -- tests/datasheet/useRulesExtended.test.tsx` | ❌ W0 | ⬜ pending |
| 43-02-01 | 02 | 1 | SCHEMA-05 | unit | `pnpm test -- tests/datasheet/rulesExtendedQueries.test.ts` | ❌ W0 | ⬜ pending |
| 43-02-02 | 02 | 1 | SCHEMA-05 | unit | `pnpm test -- tests/datasheet/useRulesExtended.test.tsx` | ❌ W0 | ⬜ pending |
| 43-03-01 | 03 | 2 | SCHEMA-01 | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ (extend) | ⬜ pending |
| 43-03-02 | 03 | 2 | SCHEMA-02 | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ (extend) | ⬜ pending |
| 43-03-03 | 03 | 2 | SCHEMA-03 | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ (extend) | ⬜ pending |
| 43-03-04 | 03 | 2 | SCHEMA-04 | unit | `pnpm test -- tests/collection/PlaybookTab.test.tsx` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/datasheet/rulesExtendedQueries.test.ts` — stubs for SCHEMA-05 (query functions): mock `@/db/rules-client`, assert SQL strings and params for all four functions
- [ ] `tests/datasheet/useRulesExtended.test.tsx` — stubs for SCHEMA-05 (hooks): mock `@/db/queries/rulesExtended`, assert `enabled`/`idle` behavior, `staleTime: Infinity`

*Existing `tests/collection/PlaybookTab.test.tsx` needs extension but already exists — not a Wave 0 gap.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stratagem phase grouping display | SCHEMA-01 | Visual grouping appearance cannot be verified by unit test | 1. Open PlaybookTab for a unit with linked faction 2. Verify stratagems grouped by phase name 3. Verify CP cost, type, description shown |
| Detachment abilities nested under parent | SCHEMA-03 | Visual nesting layout | 1. Open PlaybookTab 2. Verify detachment abilities appear under their parent detachment heading |
| Sections hidden when no data | SCHEMA-01-04 | Conditional rendering in context of full component | 1. Open PlaybookTab for unit with no linked faction 2. Verify no extended rules sections appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
