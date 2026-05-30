---
phase: 106
slug: army-list-simplification
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-30
---

# Phase 106 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/lib/resolveUnitPoints.test.ts tests/lib/computeUnitWarnings.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~3 seconds (targeted), ~15 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/lib/resolveUnitPoints.test.ts tests/lib/computeUnitWarnings.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 106-01-01 | 01 | 1 | ALI-01 | T-106-01 | Parameterized SQL ($1, $2) | unit | `pnpm test -- tests/lib/resolveUnitPoints.test.ts` | ✅ | ✅ green |
| 106-01-02 | 01 | 1 | ALI-03 | T-106-02 | N/A | unit + build | `pnpm build` | ✅ | ✅ green |
| 106-02-01 | 02 | 2 | ALI-02 | T-106-04 | Hardcoded thresholds, no user input | unit | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | ✅ | ✅ green |
| 106-02-02 | 02 | 2 | ALI-03 | T-106-03 | DROP TABLE IF EXISTS (idempotent) | build | `pnpm build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Detailed Coverage

### ALI-01: FK-Based Points Resolution

| Test File | Tests | Covers |
|-----------|-------|--------|
| tests/lib/resolveUnitPoints.test.ts | 9 | 5-level COALESCE chain, "database" source, udb_base_points param, tier priority, zero handling |
| tests/army-lists/LoadoutBuilderSheet.test.tsx | 7 | useTiersByUdbUnitId hook, tier selection, model count flow |
| tests/army-lists/ArmyListUnitRow.test.tsx | 12 | Configure button, ghost unit treatment, udb_unit_id field |
| tests/army-lists/PointsSourceChip.test.tsx | varies | "database" source label rendering |

### ALI-02: Role-Based Validation

| Test File | Tests | Covers |
|-----------|-------|--------|
| tests/lib/computeUnitWarnings.test.ts | 50 | BATTLELINE thresholds (3@2000pt, 2@1000pt), null pointsLimit skip, case-insensitive role, unlinked/ghost unit skip, list health stats |

### ALI-03: Synced Cache Removal

| Verification | Method | Result |
|-------------|--------|--------|
| No synced_unit_points imports | `grep -r "syncedUnitPoints" src/` | 0 matches |
| No synced_unit_points SQL refs | `grep -r "synced_unit_points" src/` | 0 matches |
| No synced_points field refs | `grep -r "synced_points" src/` | 0 matches |
| Migration 040 exists | File check | ✅ DROP TABLE IF EXISTS x2 |
| TypeScript compiles | `pnpm build` | ✅ clean |

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

**Approval:** approved 2026-05-30

---

## Validation Audit 2026-05-30

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 93 tests across 5 test files pass. Phase is fully covered.
