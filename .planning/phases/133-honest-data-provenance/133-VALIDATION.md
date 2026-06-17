---
phase: 133
slug: honest-data-provenance
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-17
validated: 2026-06-17
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
| 133-01-* | 01 | 1 | HON-02 | — | N/A | build + unit | `pnpm build` · `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ✅ (update) | ✅ green |
| 133-01-* | 01 | 1 | HON-02 | — | N/A | unit | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | ✅ (update) | ✅ green |
| 133-01-* | 01 | 1 | HON-02 | — | N/A | unit | `pnpm test -- tests/army-lists/ArmyListSummaryBar.test.tsx` | ✅ (update) | ✅ green |
| 133-01-* | 01 | 1 | HON-02 | — | N/A | unit | `pnpm test -- tests/army-list/computeListHealthStats.test.ts` · `tests/army-list/enhancementSummaryBar.test.tsx` (auto-fixed callers) | ✅ (update) | ✅ green |
| 133-02-* | 02 | 2 | HON-01 | — | N/A | delete test | N/A — deleted `tests/army-list/StaleDataBanner.test.tsx` | ✅ (deleted) | ✅ green |
| 133-02-* | 02 | 2 | HON-01 | — | N/A | unit | `pnpm test -- tests/dashboard/ReadyToPlayCard.test.tsx` (automated negative assertion: no sync/stale/freshness/bundled text — upgraded from manual-only) | ✅ (update) | ✅ green |
| 133-02-* | 02 | 2 | HON-01 | — | N/A | unit | `pnpm test -- tests/dashboard/DataHealthSummaryCard.test.tsx` (honest "Data {version}" row, no green sync dot, backup dot preserved) | ✅ (update) | ✅ green |
| 133-V01 | 02 | 2 | HON-01 | — | Honest provenance badge (no fake sync status) | unit | `pnpm test -- tests/army-lists/PointsFreshnessBadge.test.tsx` (Nyquist audit: 11 tests — `v{version}`, "No data" fallback, loading Skeleton, zero traffic-light dots) | ✅ (new) | ✅ green |
| 133-02-* | 02 | 2 | HON-01 | — | N/A | build | `pnpm build` (no dead "Sync stale" branch; no unused `Clock` import) | — | ✅ green |
| 133-D09 | — | — | success-criterion-3 | — | Backup staleness preserved (do-not-touch) | unit | `pnpm test -- tests/data-health/backupFreshness.test.ts` (15 tests, unchanged, green) | ✅ (unchanged) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are indicative — the planner assigns final IDs. Waves: removing the threaded `freshness` param/signatures (warnings layer) before deleting `syncFreshness.ts` keeps the build green at each step.*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new framework, fixtures, or stubs needed. This phase deleted the `StaleDataBanner` suite (−5), updated 7 existing test files (mock removals + signature updates), and the Nyquist audit added 1 new test file (`PointsFreshnessBadge.test.tsx`, +11) closing the last automated-coverage gap on the keystone HON-01 artifact.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end *visual* runtime confirmation of honest provenance across all surfaces (real SQLite `udb_meta` flow rendering `1.0.0+{sha256[:8]}`) | HON-01 (SC #2) | Live rendering + actual DB data flow cannot be confirmed by jsdom; component-level negative assertions ARE automated (see note) but the cross-surface visual sweep needs eyes | RESOLVED by blocking human-verify checkpoint (Plan 02 Task 3, approved 2026-06-17T10:00:00Z): confirmed no sync/refresh/stale copy and truthful version text on dashboard, Game Day, army-list summary, points badge |
| Real backup-staleness warning still renders (version-mismatch "(outdated)", backup age tiers) | SC #3 | Cross-component visual confirmation that the de-cruft sweep did not over-reach | RESOLVED by same checkpoint + automated: `backupFreshness.test.ts` (15 tests) + `DataHealthSummaryCard.test.tsx` backup-status block assert backup dot/age/mismatch intact |

> **Note (Nyquist audit 2026-06-17):** The component-level negative assertions originally listed here as manual-only are now **automated**: `ReadyToPlayCard.test.tsx` asserts no sync/stale/freshness/bundled text; `DataHealthSummaryCard.test.tsx` asserts the honest "Data {version}" row with no green sync dot; and the new `PointsFreshnessBadge.test.tsx` asserts honest `v{version}`/"No data"/no traffic-light dot. Only the cross-surface *visual* runtime sweep remained manual — and it was satisfied by the blocking human-verify checkpoint.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (`pnpm build` / `pnpm test`) or are covered above
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — existing infra sufficient)
- [x] No watch-mode flags (use `pnpm test`, not `pnpm test:watch`)
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-17 (Nyquist audit — all requirements have automated verification)

---

## Validation Audit 2026-06-17

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

**Gap resolved:** HON-01 keystone artifact `PointsFreshnessBadge.tsx` had zero direct automated coverage (mocked in all 4 consumer tests). The `gsd-nyquist-auditor` created `tests/army-lists/PointsFreshnessBadge.test.tsx` (11 tests, all green) asserting honest `v{version}` label, "No data" fallback, loading Skeleton, and absence of any traffic-light freshness dot. Radix Tooltip content assertions were intentionally omitted (jsdom has no pointer events → would be flaky); trigger label + dot-absence + skeleton fully cover the HON-01 behavior.

**Audit findings (no action needed):** All HON-02 warnings-layer tests COVERED. HON-01 dashboard negative assertions (`ReadyToPlayCard`, `DataHealthSummaryCard`) were upgraded from manual-only to automated during execution (Plan 02 Rule-1 auto-fixes). SC #3 backup-staleness preservation COVERED by `backupFreshness.test.ts` (15 tests) + `DataHealthSummaryCard` backup block. Full suite green: 2780 passed, 6 skipped, 38 todo.
