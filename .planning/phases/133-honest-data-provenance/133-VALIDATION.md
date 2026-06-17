---
phase: 133
slug: honest-data-provenance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-17
---

# Phase 133 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm build` (TS strict mode catches dangling imports / dead branches immediately) |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~60–90 seconds (full suite, ~2744 tests after this phase) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm build` (strict `noUnusedLocals`/`noUnusedParameters` is the HON-02 enforcement mechanism — surfaces every dangling import/param)
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green AND `pnpm build` green with zero `SyncFreshness` references
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 133-01-* | 01 | 1 | HON-02 | — | N/A | build + unit | `pnpm build` · `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ✅ (update) | ⬜ pending |
| 133-01-* | 01 | 1 | HON-02 | — | N/A | unit | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | ✅ (update) | ⬜ pending |
| 133-01-* | 01 | 1 | HON-02 | — | N/A | unit | `pnpm test -- tests/army-lists/ArmyListSummaryBar.test.tsx` | ✅ (update) | ⬜ pending |
| 133-02-* | 02 | 2 | HON-01 | — | N/A | delete test | N/A — delete `tests/army-list/StaleDataBanner.test.tsx` | ✅ (delete) | ⬜ pending |
| 133-02-* | 02 | 2 | HON-01 | — | N/A | build | `pnpm build` (no dead "Sync stale" branch; no unused `Clock` import) | — | ⬜ pending |
| 133-02-* | 02 | 2 | HON-01 | — | N/A | build + manual | `pnpm build` · manual: no "sync"/"refresh"/"stale" UI text on touched surfaces | — | ⬜ pending |
| 133-D09 | — | — | success-criterion-3 | — | Backup staleness preserved (do-not-touch) | unit | `pnpm test -- tests/data-health/backupFreshness.test.ts` (unchanged, must stay green) | ✅ (unchanged) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are indicative — the planner assigns final IDs. Waves: removing the threaded `freshness` param/signatures (warnings layer) before deleting `syncFreshness.ts` keeps the build green at each step.*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new framework, fixtures, or stubs needed. This phase **reduces** test count by ~5 (the `StaleDataBanner` suite is deleted) and updates 6 existing test files (mock removals + signature updates).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No UI offers a "sync"/"refresh data" action and no "stale"/"out of date" text about bundled unit data | HON-01 (SC #2) | Negative/absence assertion across rendered surfaces is cheapest to confirm by inspection | Open dashboard (ReadyToPlayCard, DataHealthSummaryCard), Game Day, army-list summary, points badge; confirm no freshness dot, no "Sync stale", no "sync"/"refresh"/"30 days old" copy; confirm version text is truthful (`v{udbMeta.version}`) |
| Real backup-staleness warning still renders (version-mismatch "(outdated)", backup age tiers) | SC #3 | Confirms the de-cruft sweep did not over-reach into `backupFreshness.ts` consumers | Confirm DataHealthSummaryCard backup row + BackupCard still show backup age + version-mismatch badge unchanged |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (`pnpm build` / `pnpm test`) or are covered above
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (none — existing infra sufficient)
- [ ] No watch-mode flags (use `pnpm test`, not `pnpm test:watch`)
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
