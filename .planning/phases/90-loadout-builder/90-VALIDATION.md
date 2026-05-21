---
phase: 90
slug: loadout-builder
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
---

# Phase 90 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx tests/army-lists/ArmyListUnitRow.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~3s (phase tests), ~15s (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 4 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 90-01-T1 | 01 | 1 | DL-01, DL-02 | build | `pnpm build` | N/A | ✅ green |
| 90-01-T2 | 01 | 1 | DL-01, DL-02 | build + unit | `pnpm build` / `pnpm test -- tests/army-lists/ArmyListUnitRow.test.tsx` | ✅ | ✅ green |
| 90-01-T3 | 01 | 1 | DL-01, DL-02 | unit | `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` | ✅ | ✅ green |
| 90-02-T1 | 02 | 2 | DL-01, DL-02 | unit | `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` | ✅ | ✅ green |
| 90-02-T2 | 02 | 2 | DL-01, DL-02 | build | `pnpm build` | N/A | ✅ green |
| 90-02-T3 | 02 | 2 | DL-01, DL-02 | unit | `pnpm test -- tests/army-lists/LoadoutBuilderSheet.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement Coverage

| Requirement | Description | Tests | Status |
|-------------|-------------|-------|--------|
| DL-01 | Tier selection with points auto-resolve | 4 tests (tier render, select mutation, Default clear, empty tier state) | COVERED |
| DL-02 | Wargear display from BSData | 4 tests (grouping, Default badge, Exclusive badge, empty state) | COVERED |
| DL-10/DL-11 | Ghost unit loadout support | 1 test (Planned badge) | COVERED |
| Pitfall 6 | Points override warning | 1 test (warning text) | COVERED |
| — | Configure button rendering | 3 tests (default text, tier label, callback) | COVERED |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sibling portal coordination — closing detail sheet also closes loadout sheet | DL-01 | Runtime portal behavior in Tauri window | Open detail sheet > Configure > close detail sheet > verify both close |
| Tier persistence across sessions | DL-01 | Requires real SQLite database | Select tier > restart app > verify tier preserved |
| Wargear display with real BSData sync | DL-02 | Requires populated synced_loadout_options table | Run BSData sync > open LoadoutBuilderSheet > verify grouped wargear |

---

## Validation Audit 2026-05-21

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 4s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-21
