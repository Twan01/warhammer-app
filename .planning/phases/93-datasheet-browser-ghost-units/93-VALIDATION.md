---
phase: 93
slug: datasheet-browser-ghost-units
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
---

# Phase 93 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + React Testing Library 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/army-lists/DatasheetBrowserDialog.test.tsx tests/army-lists/ArmyListUnitRow.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~3 seconds (phase tests), ~30 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 93-01-01 | 01 | 1 | BRW-01 | T-93-01 | ghost_unit_name from app-controlled data, parameterized query | unit | `pnpm test -- tests/army-lists/DatasheetBrowserDialog.test.tsx` | ✅ | ✅ green |
| 93-01-02 | 01 | 1 | BRW-01, BRW-02 | — | N/A | integration | `pnpm build` | ✅ | ✅ green |
| 93-02-01 | 02 | 2 | BRW-02 | T-93-02 | Ghost rendering only, no mutation logic modified | unit | `pnpm test -- tests/army-lists/ArmyListUnitRow.test.tsx` | ✅ | ✅ green |
| 93-02-02 | 02 | 2 | BRW-03 | — | Schema-level isolation, no code filter needed | unit | `pnpm test -- tests/army-lists/ArmyListUnitRow.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement Coverage Detail

| Requirement | Behavior | Test File | Test Name | Status |
|-------------|----------|-----------|-----------|--------|
| BRW-01 | Dialog renders datasheets grouped by role | DatasheetBrowserDialog.test.tsx | renders datasheets grouped by role | ✅ |
| BRW-01 | Ghost unit add passes canonical ds.name | DatasheetBrowserDialog.test.tsx | calls addGhostUnit.mutate with ds.name on selection | ✅ |
| BRW-01 | Empty state when no faction mapping | DatasheetBrowserDialog.test.tsx | shows empty state when wahapediaFactionId is null | ✅ |
| BRW-01 | Multi-add UX (dialog stays open) | DatasheetBrowserDialog.test.tsx | dialog stays open after selection | ✅ |
| BRW-02 | Planned badge on ghost units | ArmyListUnitRow.test.tsx | renders 'Planned' badge when unit_id is null | ✅ |
| BRW-02 | Muted text styling on ghost names | ArmyListUnitRow.test.tsx | applies muted text styling to ghost unit name | ✅ |
| BRW-02 | Hidden painting status for ghosts | ArmyListUnitRow.test.tsx | hides painting status badges for ghost units | ✅ |
| BRW-02 | Owned units still show painting status | ArmyListUnitRow.test.tsx | shows painting status badges for owned units | ✅ |
| BRW-02 | Hidden tactical role for ghosts | ArmyListUnitRow.test.tsx | does not render tactical role selector for ghost units | ✅ |
| BRW-02 | Owned units still show tactical role | ArmyListUnitRow.test.tsx | renders tactical role selector for owned units | ✅ |
| BRW-02 | Configure button preserved for ghosts | ArmyListUnitRow.test.tsx | still renders Configure button for ghost units | ✅ |
| BRW-02 | Remove button preserved for ghosts | ArmyListUnitRow.test.tsx | still renders Remove button for ghost units | ✅ |
| BRW-03 | Ghost isolation from Collection/Dashboard/Kanban | ArmyListUnitRow.test.tsx | ghost isolation is schema-level | ✅ |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-21

---

## Validation Audit 2026-05-21

| Metric | Count |
|--------|-------|
| Requirements audited | 3 (BRW-01, BRW-02, BRW-03) |
| Behaviors verified | 13 |
| Tests passing | 16/16 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
