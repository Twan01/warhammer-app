---
phase: 128
slug: feedback-hardening-form-ux
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-11
updated: 2026-06-11
---

# Phase 128 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| FBK-01 | 01 | 1 | Delete pending text | unit | `pnpm test -- tests/feedback/FBK-01-DeletePendingText.test.tsx` | green |
| FBK-02 | 02 | 1 | GameDay error state | unit | `pnpm test -- tests/feedback/FBK-02-GameDayErrorState.test.tsx` | green |
| FBK-03 | 01 | 1 | Spending error styling | unit | `pnpm test -- tests/feedback/FBK-03-SpendingErrorStyling.test.tsx` | green |
| FBK-04 | 01 | 1 | Sheet autoFocus | unit (source analysis) | `pnpm test -- tests/feedback/FBK-04-SheetAutoFocus.test.tsx` | green |
| FBK-05 | 02 | 1 | RuleNoteEditor saved | unit | `pnpm test -- tests/feedback/FBK-05-RuleNoteEditorSaved.test.tsx` | green |
| FBK-06 | 02 | 1 | PlaybookTab tooltip | unit (source analysis) | `pnpm test -- tests/feedback/FBK-06-PlaybookTabTooltip.test.tsx` | green |
| FBK-07 | 02 | 1 | PlaybookTab retry | unit (source analysis) | `pnpm test -- tests/feedback/FBK-07-PlaybookTabRetry.test.tsx` | green |
| FBK-08 | 01 | 1 | JournalTab toast | unit (source analysis) | `pnpm test -- tests/feedback/FBK-08-JournalTabToast.test.tsx` | green |
| FBK-09 | 01 | 1 | Snapshot delete toast | unit (source analysis) | `pnpm test -- tests/feedback/FBK-09-SnapshotDeleteToast.test.tsx` | green |
| FBK-10 | 01 | 1 | gcTime alignment | unit (source analysis) | `pnpm test -- tests/feedback/FBK-10-gcTimeAlignment.test.ts` | green |

---

## Validation Architecture

All 10 requirements are UI feedback changes. Tests use a mix of:
- **Component render tests** (FBK-01, FBK-02, FBK-03, FBK-05): render components with mocked hooks, assert DOM output
- **Source analysis tests** (FBK-04, FBK-06, FBK-07, FBK-08, FBK-09, FBK-10): read source files and assert required patterns exist

Total: 10 test files, 35 test cases, all passing.
