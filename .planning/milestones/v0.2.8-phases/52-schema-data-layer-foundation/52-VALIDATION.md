---
phase: 52
slug: schema-data-layer-foundation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~53 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 53 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 52-01-01 | 01 | 1 | SC-1 | integration | `pnpm tauri dev` (manual migration check) | N/A | ✅ manual |
| 52-01-02 | 01 | 1 | SC-2 | unit | `pnpm build` (TS type check) | ✅ | ✅ green |
| 52-01-T2 | 01 | 1 | - | unit | `pnpm test -- tests/army-list/armyListQueries.test.ts` | ✅ | ✅ green |
| 52-01-T2b | 01 | 1 | - | unit | `pnpm test -- tests/army-list/clearArmyListDetachment.test.ts` | ✅ | ✅ green |
| 52-02-01 | 02 | 1 | ARMY-06 | manual | Review `.planning/points-import-design.md` | N/A | ✅ manual |
| 52-03-T1a | 03 | 2 | - | unit | `pnpm test -- tests/datasheet/rulesExtendedDetachment.test.ts` | ✅ | ✅ green |
| 52-03-T1b | 03 | 2 | - | unit | `pnpm test -- tests/datasheet/rulesFavorites.test.ts` | ✅ | ✅ green |
| 52-03-T1c | 03 | 2 | - | unit | `pnpm test -- tests/datasheet/rulesNotes.test.ts` | ✅ | ✅ green |
| 52-03-T2a | 03 | 2 | - | unit | `pnpm test -- tests/datasheet/useRulesFavorites.test.tsx` | ✅ | ✅ green |
| 52-03-T2b | 03 | 2 | - | unit | `pnpm test -- tests/datasheet/useRulesNotes.test.tsx` | ✅ | ✅ green |
| 52-03-T2c | 03 | 2 | - | unit | `pnpm test -- tests/datasheet/useRulesSync.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/army-list/clearArmyListDetachment.test.ts` — clearArmyListDetachment SQL verification
- [x] `tests/datasheet/rulesExtendedDetachment.test.ts` — getDetachmentById + getStratagemsByDetachment queries
- [x] `tests/datasheet/rulesFavorites.test.ts` — favorites CRUD (getRulesFavorites, getRulesFavoritesByType, upsertRulesFavorite, deleteRulesFavorite)
- [x] `tests/datasheet/rulesNotes.test.ts` — notes CRUD (getRulesNotes, getRulesNoteByKey, upsertRulesNote)
- [x] `tests/datasheet/useRulesFavorites.test.tsx` — hooks with optimistic mutations
- [x] `tests/datasheet/useRulesNotes.test.tsx` — hooks with upsert mutation

*All Wave 0 gaps resolved.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 019 runs on app start | SC-1 | SQLite migration requires Tauri runtime | Launch `pnpm tauri dev`, check console for migration errors |
| Points import design doc quality | ARMY-06 | Document review, not code | Read `.planning/points-import-design.md`, verify all 5 sections present |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 53s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-10

---

## Validation Audit 2026-05-10

| Metric | Count |
|--------|-------|
| Gaps found | 7 |
| Resolved | 7 |
| Escalated | 0 |
