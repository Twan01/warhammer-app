---
phase: 95
slug: version-snapshots
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 95 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | `vitest.config.ts` |
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 95-01-01 | 01 | 1 | SNP-01 | — | N/A | unit | `pnpm test -- tests/army-list/armyListSnapshots.test.ts` | ❌ W0 | ⬜ pending |
| 95-01-02 | 01 | 1 | SNP-02 | — | N/A | unit | `pnpm test -- tests/army-list/armyListSnapshots.test.ts` | ❌ W0 | ⬜ pending |
| 95-01-03 | 01 | 1 | SNP-03 | — | N/A | unit | `pnpm test -- tests/army-list/snapshotCompare.test.ts` | ❌ W0 | ⬜ pending |
| 95-01-04 | 01 | 1 | SNP-04 | — | N/A | unit | `pnpm test -- tests/army-list/snapshotRestore.test.ts` | ❌ W0 | ⬜ pending |
| 95-02-01 | 02 | 2 | SNP-01 | — | N/A | component | `pnpm test -- tests/army-list/SnapshotHistorySheet.test.tsx` | ❌ W0 | ⬜ pending |
| 95-02-02 | 02 | 2 | SNP-03 | — | N/A | component | `pnpm test -- tests/army-list/SnapshotCompareDialog.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/army-list/armyListSnapshots.test.ts` — stubs for SNP-01, SNP-02 (CRUD operations)
- [ ] `tests/army-list/snapshotCompare.test.ts` — stubs for SNP-03 (comparison logic)
- [ ] `tests/army-list/snapshotRestore.test.ts` — stubs for SNP-04 (restore logic)

*Existing infrastructure covers test framework — only test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SnapshotHistorySheet opens from button | SNP-02 | Sibling portal rendering | Open army list detail → click Snapshots button → verify Sheet opens |
| Compare dialog side-by-side layout | SNP-03 | Visual layout verification | Save 2 snapshots → compare → verify two-column diff with color coding |
| Restore replaces list state | SNP-04 | Full DB transaction verification | Save snapshot → modify list → restore → verify list matches snapshot |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
