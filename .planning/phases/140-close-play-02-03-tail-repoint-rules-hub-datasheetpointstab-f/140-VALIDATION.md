---
phase: 140
slug: close-play-02-03-tail-repoint-rules-hub-datasheetpointstab-f
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-18
validated: 2026-06-18
---

# Phase 140 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + better-sqlite3 (node environment) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `pnpm test -- tests/data-layer/leaderTargetsByFaction.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds (quick) / full suite ~minutes |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/data-layer/leaderTargetsByFaction.test.ts`
- **After every plan wave:** Run `pnpm test` (full suite) + `pnpm build` (TS clean — strict `noUnusedLocals` catches dead-import regressions from the symbol removal)
- **Before `/gsd:verify-work`:** Full suite must be green AND `pnpm build` exit 0
- **Max feedback latency:** ~5 seconds (quick)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 140-01-01 | 01 | 1 | PLAY-02/03 | — | Parameterized `$1` read-only query — no string interpolation (ASVS V5) | data-layer | `pnpm test -- tests/data-layer/leaderTargetsByFaction.test.ts` | ✅ | ✅ green |
| 140-01-02 | 01 | 1 | PLAY-02/03 | — | N/A (hook + component repoint) | build/type | `pnpm build` | ✅ | ✅ green |
| 140-01-03 | 01 | 1 | PLAY-02/03 | — | N/A (dead-symbol removal) | build/type | `pnpm build` (strict noUnusedLocals) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/data-layer/leaderTargetsByFaction.test.ts` — new file covering the faction-scoped `udb_leader_targets` query. Mirror `tests/data-layer/leader-targets.test.ts` harness (`createFullDb()`, full migration chain, PRAGMA FK ON/OFF for seed). **Created (168 lines, commit 64f18fe7), all 3 cases green.**

**Seed:** 2 `udb_factions` (FA, FB) + 5 `udb_units` (LA, TA1, TA2 in FA; LB, TB1 in FB) + 3 `udb_leader_targets` rows (LA→TA1, LA→TA2, LB→TB1).

**Cases:**
1. Query `$1='FA'` → exactly `[{Leader A, FA, Target A1}, {Leader A, FA, Target A2}]` (ordered by leader_name, target_name).
2. Query `$1='FA'` → zero rows with `leader_name='Leader B'` or `target_name='Target B1'` (cross-faction exclusion).
3. Query `$1='UNKNOWN'` → `[]` (graceful empty, not error).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rules Hub datasheet "Leader — Can attach to" section renders real target badges for a leader (and only the empty state when a faction genuinely has none) | PLAY-02/03 (secondary surface) | Desktop-app visual/interactive confirmation — requires `pnpm tauri dev`, navigate Rules Hub → pick a faction with leaders → expand a Character datasheet | Open the app, go to Rules Hub for a faction known to have leader pairs (e.g. Space Marines), expand a leader's datasheet row, confirm the "Leader — Can attach to" badges list real target units. Expand a non-leader unit and confirm no section appears. |

*The data-layer test covers the query correctness; this manual check confirms the wired UI surface end-to-end (the visual proof the audit gap is closed).*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (`leaderTargetsByFaction.test.ts`)
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-18 — all 3 tasks automated-green; 1 manual-only (Tauri visual render) tracked.

---

## Validation Audit 2026-06-18

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All three task requirements were already covered by automated verification at validation time:
- 140-01-01 → `tests/data-layer/leaderTargetsByFaction.test.ts` (3 cases) — re-ran green (full suite: 2896 passed, 0 failed).
- 140-01-02 / 140-01-03 → `pnpm build` strict type-check (per SUMMARY exit 0).

No new test files generated. The single manual-only item (Rules Hub leader-badge visual render via `pnpm tauri dev`) remains correctly classified as manual — it requires a live desktop window and imported `udb_leader_targets` data, which cannot be asserted by grep or static analysis.
