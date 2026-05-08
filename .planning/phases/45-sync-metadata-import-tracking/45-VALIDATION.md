---
phase: 45
slug: sync-metadata-import-tracking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
---

# Phase 45 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | `vite.config.ts` (vitest inline config) |
| **Quick run command** | `pnpm test -- tests/datasheet/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/datasheet/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 45-01-01 | 01 | 1 | META-01 | unit | `pnpm test -- tests/datasheet/syncMetaQueries.test.ts` | ❌ W0 | ⬜ pending |
| 45-01-02 | 01 | 1 | META-02 | unit | `pnpm test -- tests/datasheet/syncMetaQueries.test.ts` | ❌ W0 | ⬜ pending |
| 45-01-03 | 01 | 1 | META-03 | unit | `pnpm test -- tests/datasheet/syncMetaQueries.test.ts` | ❌ W0 | ⬜ pending |
| 45-02-01 | 02 | 1 | META-04 | unit | `pnpm test -- tests/datasheet/syncErrorQueries.test.ts` | ✅ | ⬜ pending |
| 45-02-02 | 02 | 1 | META-05 | unit | `pnpm test -- tests/datasheet/syncFreshness.test.ts` | ❌ W0 | ⬜ pending |
| 45-03-01 | 03 | 2 | META-06 | unit | `pnpm test -- tests/datasheet/rulesSnapshot.test.ts` | ❌ W0 | ⬜ pending |
| 45-03-02 | 03 | 2 | META-06 | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/datasheet/syncMetaQueries.test.ts` — stubs for META-01, META-02, META-03 (extended RulesSyncMeta with count fields)
- [ ] `tests/datasheet/syncFreshness.test.ts` — stubs for META-05 (freshness tier computation function)
- [ ] `tests/datasheet/rulesSnapshot.test.ts` — stubs for META-06 (capturePreSyncSnapshot, cleanOldSnapshots, getLatestSnapshot)

*Existing `tests/datasheet/syncErrorQueries.test.ts` covers getSyncErrors read path. Extend with `useSyncErrors` hook test.*
*Existing `tests/datasheet/useRulesSync.test.ts` needs new test case asserting snapshot capture before invoke.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Freshness dot color rendering | META-05 | Visual color check in browser | Open PlaybookTab with linked datasheet, verify green/amber/red dot matches sync age |
| Sync details collapsible interaction | META-01/02/03 | UX interaction | Click sync details area, verify row counts and version expand/collapse |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
