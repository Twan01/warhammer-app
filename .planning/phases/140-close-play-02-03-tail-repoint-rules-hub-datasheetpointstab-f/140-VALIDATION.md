---
phase: 140
slug: close-play-02-03-tail-repoint-rules-hub-datasheetpointstab-f
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-18
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
| 140-01-01 | 01 | 1 | PLAY-02/03 | — | Parameterized `$1` read-only query — no string interpolation (ASVS V5) | data-layer | `pnpm test -- tests/data-layer/leaderTargetsByFaction.test.ts` | ❌ W0 | ⬜ pending |
| 140-01-02 | 01 | 1 | PLAY-02/03 | — | N/A (hook + component repoint) | build/type | `pnpm build` | ✅ | ⬜ pending |
| 140-01-03 | 01 | 1 | PLAY-02/03 | — | N/A (dead-symbol removal) | build/type | `pnpm build` (strict noUnusedLocals) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/data-layer/leaderTargetsByFaction.test.ts` — new file covering the faction-scoped `udb_leader_targets` query. Mirror `tests/data-layer/leader-targets.test.ts` harness (`createFullDb()`, full migration chain, PRAGMA FK ON/OFF for seed).

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`leaderTargetsByFaction.test.ts`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
