---
phase: 46
slug: manual-overrides-version-comparison
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
validated: 2026-05-08
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 |
| **Config file** | vite.config.ts (vitest config inline) |
| **Quick run command** | `pnpm test -- tests/collection/unitOverrideQueries.test.ts tests/datasheet/computeSyncDiff.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/collection/unitOverrideQueries.test.ts tests/datasheet/computeSyncDiff.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 46-01-01 | 01 | 0 | OVRD-01..04 | unit | `pnpm test -- tests/collection/unitOverrideQueries.test.ts` | ✅ | ✅ green |
| 46-01-02 | 01 | 0 | OVRD-06,07 | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ✅ | ✅ green |
| 46-01-03 | 01 | 1 | OVRD-01..04 | unit | `pnpm test -- tests/collection/unitOverrideQueries.test.ts` | ✅ | ✅ green |
| 46-02-01 | 02 | 1 | OVRD-05 | manual | N/A — visual indicator | N/A | ✅ manual |
| 46-02-02 | 02 | 1 | OVRD-06,07 | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/collection/unitOverrideQueries.test.ts` — 9 tests for OVRD-01 to OVRD-04 (getUnitOverride, upsertUnitOverride INSERT/UPDATE, deleteUnitOverride, stat fields, keywords/abilities, null fields)
- [x] `tests/datasheet/computeSyncDiff.test.ts` — 8 tests for OVRD-06 and OVRD-07 (null snapshotData, identical sets, added, removed, renamed, mixed scenario, total_changed sum, empty snapshot)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Override markers visible in stats cells | OVRD-05 | Visual indicator — icon/badge rendering | Open PlaybookTab for a unit with overrides, verify Pencil icon appears next to overridden stat cells |
| Override tooltip shows imported value | OVRD-05 | Tooltip hover interaction | Hover over override marker, verify tooltip reads "Manual override — imported value: X" |
| Diff collapsible shows changes after sync | OVRD-06 | End-to-end sync + UI flow | Run sync, open PlaybookTab, expand diff section, verify changed/removed entries visible |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** PASSED

## Validation Audit 2026-05-08

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Test suite:** 129 files passed, 1016 tests passed, 0 failed.
**Phase 46 tests:** 9 (unitOverrideQueries) + 8 (computeSyncDiff) = 17 automated tests, all green.
