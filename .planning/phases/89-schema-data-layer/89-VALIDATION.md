---
phase: 89
slug: schema-data-layer
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
validated: 2026-05-20
---

# Phase 89 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 89-01-01 | 01 | 1 | DL-03 (Migration 031) | T-89-01, T-89-03 | CHECK constraint + atomic recreation | grep verify | `grep -c "version: 31" src-tauri/src/lib.rs` | ✅ | ✅ green |
| 89-01-02 | 01 | 1 | DL-04 (Types + resolveUnitPoints) | — | N/A | unit | `pnpm test -- tests/lib/resolveUnitPoints.test.ts` | ✅ | ✅ green |
| 89-02-01 | 02 | 2 | DL-03 (Query functions) | T-89-04 | list_id scoping in setWarlord | unit | `pnpm test -- tests/army-list/armyListQueries.test.ts` | ✅ | ✅ green |
| 89-02-01 | 02 | 2 | DL-04 (Enhancement CRUD) | T-89-05 | Parameterized queries | unit | `pnpm test -- tests/army-list/armyListEnhancements.test.ts` | ✅ | ✅ green |
| 89-02-02 | 02 | 2 | DL-03/04 (Mutation hooks) | — | N/A | unit (hook) | `pnpm test -- tests/army-list/armyListHookInvalidations.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Files

| File | Tests | Covers |
|------|-------|--------|
| `tests/lib/resolveUnitPoints.test.ts` | 13 | tier_points priority, 0-as-valid, null fallthrough, type contract |
| `tests/army-list/armyListQueries.test.ts` | 9 | setWarlord SQL + scoping, addGhostUnitToList, clearLeaderAttachment, clearSelectedModelCount |
| `tests/army-list/armyListEnhancements.test.ts` | 8 | addEnhancement, removeEnhancement, getEnhancementsByList |
| `tests/army-list/armyListHookInvalidations.test.ts` | 45 | Cache invalidation for all 10 new hooks (positive + negative assertions) |

**Total phase-specific tests:** 75

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ghost unit name-based points resolution | SC-3 | Requires synced_unit_points data from real sync | Sync rules, add ghost unit with matching name, verify points |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated

---

## Validation Audit 2026-05-20

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

Gap resolved: 10 mutation hooks in `useArmyLists.ts` now have 45 dedicated cache-invalidation tests verifying correct query key invalidation (including negative assertions for hooks with reduced invalidation sets).
