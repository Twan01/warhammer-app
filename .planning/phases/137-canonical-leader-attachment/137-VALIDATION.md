---
phase: 137
slug: canonical-leader-attachment
status: draft
nyquist_compliant: false
wave_0_complete: false
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

- **After every task commit:** Run the relevant quick command (`pnpm test -- <file>` or `node scripts/check-version.mjs`)
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green; `node scripts/check-version.mjs` must pass (migration 050 parity)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | PLAY-02 | — | N/A | data-layer | `pnpm test -- tests/data-layer/migration-parity.test.ts` | ❌ W0 | ⬜ pending |

*Planner fills the remaining rows. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Data-layer test exercising the new `udb_leader_targets` migration (050) — schema + composite PK + FK CASCADE.
- [ ] Migration-parity coverage: `pnpm test -- tests/data-layer/migration-parity.test.ts` green after 050 lands (disk-derived count auto-updates; `lib.rs` Migration{} block must be added).

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
