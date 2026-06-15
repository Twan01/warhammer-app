---
phase: 130
slug: migration-parity-release-gate
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-15
---

# Phase 130 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (`vitest run`) + better-sqlite3 (node-env data-layer tests) |
| **Config file** | `vite.config.ts` (Vitest config inlined; verify exact path during planning) |
| **Quick run command** | `pnpm test -- tests/data-layer/migration-parity.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds (full suite); <2s for the targeted data-layer file |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/data-layer/migration-parity.test.ts` (or the touched test file)
- **After every plan wave:** Run `pnpm test` + `pnpm check:version`
- **Before `/gsd:verify-work`:** Full `pnpm test` green AND `pnpm check:version` exit 0
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 130-01-T1 | 01 | 1 | REL-03 | — | D-06 parity green (47===47); chain applies 047 | unit | `pnpm test -- tests/data-layer/migration-parity.test.ts` | ✅ | ✅ green |
| 130-01-T2 | 01 | 1 | REL-03 | — | `army_list_unit_wargear` schema exercised | unit | `pnpm test -- tests/data-layer/schema-shape.test.ts` | ✅ | ✅ green |
| 130-02-T1 | 02 | 2 | REL-04 | T-130-01 | gate exits 0 on clean tree (version + migration-count parity) | smoke | `pnpm check:version` (exit 0 clean) | ✅ | ✅ green |
| 130-02-T1 | 02 | 2 | REL-05 | T-130-01 | gate exits 0 on clean tree (no CR byte in `migrations/*.sql`) | smoke | `pnpm check:version` (exit 0 clean) | ✅ | ✅ green |
| 130-02-T2 | 02 | 2 | REL-04 | — | `prebuild` runs gate before `pnpm build` | smoke | `package.json` `scripts.prebuild === "node scripts/check-version.mjs"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. `migration-parity.test.ts`, `schema-shape.test.ts`, `db-helpers.ts`, and `check-version.mjs` all exist. No framework install, no new fixtures — the work is editing existing files and adding assertions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gate fails on migration-count desync | REL-04 | Negative test requires temporarily desyncing the tree (add/remove a migration or a `Migration {}` entry) | Temporarily add a dummy `.sql` to `src-tauri/migrations/` (or remove a lib.rs entry), run `pnpm check:version`, confirm exit 1 + clear message, then revert |
| Gate fails on CR byte | REL-05 | Negative test requires injecting a CR byte | Temporarily rewrite one `migrations/*.sql` with CRLF endings, run `pnpm check:version`, confirm exit 1 naming the file, then revert |
| `prebuild` fires on `tauri build` | REL-04 | Full Tauri build is heavy; A1 confirmed `beforeBuildCommand: "pnpm build"` | Observe gate output at the start of `pnpm build`; transitively `tauri build` routes through it |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none required)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-15

---

## Validation Audit 2026-06-15

Retroactive Nyquist audit (`/gsd:validate-phase 130`) against the live tree.

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Findings:**
- All 5 Per-Task Map rows confirmed green against the live tree (statuses were stale `⬜ pending` from the pre-execution contract — updated to `✅ green`).
- `npx vitest run tests/data-layer/migration-parity.test.ts tests/data-layer/schema-shape.test.ts` → 8 passed, 2 todo (rules.db legs removed in Phase 107). Includes D-06 parity (47===47) and the 047 `army_list_unit_wargear` column-shape assertion.
- `node scripts/check-version.mjs` → exit 0 (all three legs: version 0.5.7, migration-count 47===47, no CR bytes).
- The two negative-path gate behaviors (exit 1 on count desync / on injected CR byte) remain **Manual-Only** by necessity: automating them requires either mutating the real migration tree at runtime or refactoring `check-version.mjs` to accept an injectable path (an impl change out of scope for a validation audit). Both are documented with revert instructions above and were performed-and-reverted during execution (130-02-SUMMARY.md).

**Verdict:** Nyquist-compliant. No test files generated — every requirement has an automated command (Vitest or `pnpm check:version`); negative paths are legitimately manual.
