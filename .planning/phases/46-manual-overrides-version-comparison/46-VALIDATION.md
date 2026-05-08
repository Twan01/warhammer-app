---
phase: 46
slug: manual-overrides-version-comparison
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
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
| 46-01-01 | 01 | 0 | OVRD-01..04 | unit | `pnpm test -- tests/collection/unitOverrideQueries.test.ts` | ❌ W0 | ⬜ pending |
| 46-01-02 | 01 | 0 | OVRD-06,07 | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ❌ W0 | ⬜ pending |
| 46-01-03 | 01 | 1 | OVRD-01..04 | unit | `pnpm test -- tests/collection/unitOverrideQueries.test.ts` | ❌ W0 | ⬜ pending |
| 46-02-01 | 02 | 1 | OVRD-05 | manual | N/A — visual indicator | N/A | ⬜ pending |
| 46-02-02 | 02 | 1 | OVRD-06,07 | unit | `pnpm test -- tests/datasheet/computeSyncDiff.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/collection/unitOverrideQueries.test.ts` — stubs for OVRD-01 to OVRD-04 (getUnitOverride, upsertUnitOverride, deleteUnitOverride)
- [ ] `tests/datasheet/computeSyncDiff.test.ts` — stubs for OVRD-06 and OVRD-07 (added, removed, renamed datasheets; null snapshotData edge case)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Override markers visible in stats cells | OVRD-05 | Visual indicator — icon/badge rendering | Open PlaybookTab for a unit with overrides, verify Pencil icon appears next to overridden stat cells |
| Override tooltip shows imported value | OVRD-05 | Tooltip hover interaction | Hover over override marker, verify tooltip reads "Manual override — imported value: X" |
| Diff collapsible shows changes after sync | OVRD-06 | End-to-end sync + UI flow | Run sync, open PlaybookTab, expand diff section, verify changed/removed entries visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
