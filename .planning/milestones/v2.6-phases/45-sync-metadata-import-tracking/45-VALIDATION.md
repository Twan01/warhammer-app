---
phase: 45
slug: sync-metadata-import-tracking
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
validated: 2026-05-08
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
| **Estimated runtime** | ~70 seconds |

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
| 45-01-01 | 01 | 1 | META-01 | unit | `pnpm test -- tests/datasheet/syncMetaQueries.test.ts` | ✅ | ✅ green |
| 45-01-02 | 01 | 1 | META-02 | unit | `pnpm test -- tests/datasheet/syncMetaQueries.test.ts` | ✅ | ✅ green |
| 45-01-03 | 01 | 1 | META-03 | unit | `pnpm test -- tests/datasheet/syncMetaQueries.test.ts` | ✅ | ✅ green |
| 45-02-01 | 02 | 1 | META-04 | unit | `pnpm test -- tests/datasheet/syncErrorQueries.test.ts` | ✅ | ✅ green |
| 45-02-02 | 02 | 1 | META-05 | unit | `pnpm test -- tests/datasheet/syncFreshness.test.ts` | ✅ | ✅ green |
| 45-03-01 | 03 | 2 | META-06 | unit | `pnpm test -- tests/datasheet/rulesSnapshot.test.ts` | ✅ | ✅ green |
| 45-03-02 | 03 | 2 | META-06 | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/datasheet/syncMetaQueries.test.ts` — 5 tests for META-01, META-02, META-03 (extended RulesSyncMeta with count fields)
- [x] `tests/datasheet/syncFreshness.test.ts` — 10 tests for META-05 (freshness tier computation function)
- [x] `tests/datasheet/rulesSnapshot.test.ts` — 8 tests for META-06 (capturePreSyncSnapshot, cleanOldSnapshots, getLatestSnapshot)

*`tests/datasheet/syncErrorQueries.test.ts` covers getSyncErrors read path (META-04).*
*`tests/datasheet/useRulesSync.test.ts` covers snapshot call ordering + non-blocking failure + SYNC_ERRORS_KEY invalidation (META-04, META-06).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Freshness dot color rendering | META-05 | Visual color check in browser | Open PlaybookTab with linked datasheet, verify green/amber/red dot matches sync age |
| Sync details collapsible interaction | META-01/02/03 | UX interaction | Click sync details area, verify row counts and version expand/collapse |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-05-08

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

**Gap 1** (MISSING → RESOLVED): `syncMetaQueries.test.ts` created — 5 tests covering META-01/02/03 (getRulesSyncMeta query returns extended interface with 11 count fields, null handling, wahapedia_version)

**Gap 2** (PARTIAL → RESOLVED): `useRulesSync.test.ts` extended with 2 tests — META-06 snapshot call ordering (capturePreSyncSnapshot runs before invoke) and non-blocking failure (sync proceeds when snapshot throws)
