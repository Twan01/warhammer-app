---
phase: 128
slug: feedback-hardening-form-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
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
| FBK-01 | 01 | 1 | Delete pending text | build + manual | `pnpm build` | pending |
| FBK-02 | 01 | 1 | GameDay error state | build + manual | `pnpm build` | pending |
| FBK-03 | 01 | 1 | Spending error styling | build | `pnpm build` | pending |
| FBK-04 | 02 | 1 | Sheet autoFocus | build + manual | `pnpm build` | pending |
| FBK-05 | 02 | 1 | RuleNoteEditor saved | build + manual | `pnpm build` | pending |
| FBK-06 | 02 | 1 | PlaybookTab tooltip | build + manual | `pnpm build` | pending |
| FBK-07 | 02 | 1 | PlaybookTab retry | build + manual | `pnpm build` | pending |
| FBK-08 | 01 | 1 | JournalTab toast | build | `pnpm build` | pending |
| FBK-09 | 01 | 1 | Snapshot delete toast | build | `pnpm build` | pending |
| FBK-10 | 02 | 1 | gcTime alignment | build + test | `pnpm test` | pending |

---

## Validation Architecture

All 10 requirements are UI feedback changes — no new data flow, no schema changes. Primary validation is TypeScript build verification (`pnpm build`) plus manual spot-checks for visual feedback behaviors. FBK-10 (gcTime alignment) can be validated by grep assertion confirming all `staleTime: Infinity` hooks also have `gcTime: Infinity`.
