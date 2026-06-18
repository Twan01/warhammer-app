---
phase: 137
slug: canonical-leader-attachment
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-17
---

# Phase 137 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (jsdom) + cargo test (Rust) + data-layer suite (better-sqlite3) |
| **Config file** | `vitest.config.ts` / `vite.config.ts` |
| **Quick run command** | `pnpm test -- tests/data-layer/migration-parity.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds (TS suite); cargo test separate |

---

## Sampling Rate

- **After every task commit:** Run the relevant quick command (`pnpm test -- <file>`, `npx tsc --noEmit`, `cargo check`, or `pnpm check:version`)
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green; `pnpm check:version` must pass (migration 050 parity)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 137-01-T1 | 01 | 1 | PLAY-02 | T-137-01 | LF discipline + CR-byte scan (checksum-drift guard) | build-gate | `git ls-files --eol src-tauri/migrations/050_udb_leader_targets.sql \| grep -q "w/lf" && pnpm check:version` | ✅ existing (check-version.mjs) | ✅ green |
| 137-01-T2 | 01 | 1 | PLAY-02 | T-137-02 | Composite PK + FK CASCADE schema asserted | data-layer | `pnpm test -- tests/data-layer/leader-targets.test.ts && pnpm test -- tests/data-layer/migration-parity.test.ts` | ✅ created (tests/data-layer/leader-targets.test.ts) | ✅ green |
| 137-02-T1 | 02 | 2 | PLAY-02 | T-137-05 | console.warn on missing columns / zero pairs (V5 input validation) | type-check | `npx tsc --noEmit 2>&1 \| tail -10` | ✅ existing (tsc) | ✅ green |
| 137-02-T2 | 02 | 2 | PLAY-02 | T-137-03 | sqlx positional binds (no SQL interpolation) | rust-compile | `cargo check 2>&1 \| tail -15` | ✅ existing (cargo) | ✅ green |
| 137-02-T3 | 02 | 2 | PLAY-02 | T-137-04 | validUnitIds guard bounds dataset; live header confirmed | artifact-check | `node -e "const j=require('./src-tauri/data/unit_database.json'); if(!Array.isArray(j.leader_targets)\|\|j.leader_targets.length===0){process.exit(1)}"` | ✅ existing (node) | ✅ green |
| 137-03-T1 | 03 | 3 | PLAY-03 | T-137-06 | `$1` positional bind for listId (no interpolation) | build-gate | `pnpm build 2>&1 \| tail -5` | ✅ existing (build) | ✅ green |
| 137-03-T2 | 03 | 3 | PLAY-03 | T-137-07, T-137-08 | permissive NULL fallback (no regression); single page-level hook (no N+1) | build-gate | `pnpm build 2>&1 \| tail -8` | ✅ existing (build) | ✅ green |
| 137-03-T3 | 03 | 3 | PLAY-03 | T-137-07 | permissive NULL fallback regression guard (Pitfall 5) | component | `pnpm test -- tests/army-lists/LeaderAttachmentSheet.test.tsx` | ✅ created (tests/army-lists/LeaderAttachmentSheet.test.tsx) | ✅ green |
| 137-04-T1 | 04 | 4 | PLAY-03 | T-137-09, T-137-10 | explicit KEEP of rules-hub read path; grep gate asserts zero remaining writers | build-gate + grep | `if grep -rn "replaceSyncedLeaderTargets\|INSERT INTO synced_leader_targets\|DELETE FROM synced_leader_targets" src/; then exit 1; fi; pnpm build 2>&1 \| tail -5` | ✅ existing (build + grep) | ✅ green |
| 137-04-T2 | 04 | 4 | PLAY-03 | T-137-09 | full-suite + parity regression gate after cleanup | full-suite | `pnpm check:version && pnpm test` | ✅ existing (full suite) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Data-layer test exercising the new `udb_leader_targets` migration (050) — schema + composite PK + FK CASCADE. **Satisfied by 137-01-T2** (creates `tests/data-layer/leader-targets.test.ts`).
- [x] Migration-parity coverage: `pnpm test -- tests/data-layer/migration-parity.test.ts` green after 050 lands (disk-derived count auto-updates; `lib.rs` Migration{} block must be added). **Satisfied by 137-01-T1** (registers `Migration { version: 50 }`) + asserted green in **137-01-T2**.
- [x] Component test for the leader-attachment UI — canonical path + permissive NULL fallback. **Satisfied by 137-03-T3** (creates `tests/army-lists/LeaderAttachmentSheet.test.tsx`).

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Leader-attachment sheet permits only valid FK pairs; ghost/NULL-udb units fall back permissively with advisory | PLAY-03 | Requires running Tauri app + a populated udb_leader_targets after a real import | `pnpm tauri dev`; open an army list; add a leader unit + candidate targets; confirm only canonical targets are offered; add a ghost unit and confirm permissive fallback + advisory text |
| Bundled JSON version bump triggers re-import (table populated, not empty) | PLAY-02 | Import is version-gated; needs a real version delta against an existing `udb_meta` row | After `pnpm build:udb`, confirm JSON `version` changed; launch app; confirm `udb_leader_targets` row count > 0 |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready

---

## Validation Audit 2026-06-18

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Findings:**
- All 9 per-task verifications classified **COVERED** — every referenced test exists and the full suite runs green (`2831 passed, 0 failed`).
- Wave 0 deliverables confirmed on disk: `tests/data-layer/leader-targets.test.ts`, `tests/army-lists/LeaderAttachmentSheet.test.tsx`; migration-parity asserts migration 050 in chain.
- **Corrected** row 137-03-T3 command path: `tests/features/army-lists/...` → `tests/army-lists/...` (test was created at the latter path per Plan 03 summary; original contract path did not exist).
- No tests generated — no MISSING/PARTIAL gaps. `nyquist_compliant: true` confirmed.
- Manual-only items (runtime import + Tauri UI behavior) remain manual by design.
</content>
