---
phase: 141
slug: schema-foundation-progress-identity-lock
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-20
---

# Phase 141 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (node environment for data-layer; better-sqlite3 in-memory) |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `pnpm test -- tests/data-layer/technique-progress-identity.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30–60 seconds full suite (~2896 tests); quick run <5s |

Additional release gate (non-Vitest): `pnpm check:version` (migration-count parity +
version parity + CR-byte scan). Must exit 0.

---

## Sampling Rate

- **After every task commit:** Run the relevant quick command (`pnpm test -- <file>`) and,
  for any migration-touching task, `pnpm check:version`.
- **After every plan wave:** Run `pnpm test` (full suite) + `pnpm check:version`.
- **Before `/gsd:verify-work`:** Full suite green AND `pnpm check:version` exit 0.
- **Max feedback latency:** ~60 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 141-01-* | 01 | 1 | FND-01, FND-02 | — | Schema-only; no external input surface (local SQLite migration) | data-layer + gate | `pnpm check:version` & `pnpm test -- tests/data-layer/migration-parity.test.ts` | ✅ existing harness | ⬜ pending |
| 141-02-* | 02 | 2 | FND-04 | — | Pure function, no I/O | unit | `pnpm test -- tests/lib/effectivePaintId.test.ts` | ❌ W0 (new test file) | ⬜ pending |
| 141-03-* | 03 | 2 | FND-03, FND-05 | — | CASCADE integrity; PK-stable progress | data-layer | `pnpm test -- tests/data-layer/technique-progress-identity.test.ts` | ❌ W0 (new test file) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Note: FND-01/02 are verified primarily by schema-shape assertions + the existing
`migration-parity.test.ts` (auto-counts the new 051 file) and `pnpm check:version`. A
`schema-shape` assertion (cf. existing `tests/data-layer/schema-shape.test.ts`) for the six
new tables + the two ALTER columns is recommended in Plan 01.

---

## Wave 0 Requirements

- [ ] `tests/data-layer/technique-progress-identity.test.ts` — FND-03 invariant test
      (reorder / add / remove step / remove slot + a teeth-proving DELETE+INSERT counter-case)
- [ ] `tests/lib/effectivePaintId.test.ts` — FND-04 pure-function unit test
      (filled slot / unfilled slot → null / plain step → paint_id / null paint → null)
- [ ] (optional) extend `tests/data-layer/schema-shape.test.ts` with the six new tables +
      `recipe_sections.technique_instance_id` + `recipe_steps.technique_step_id`

*Framework already installed (Vitest + better-sqlite3 harness in `tests/data-layer/db-helpers.ts`).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 051 applies cleanly on a real existing `hobbyforge.db` (in-place upgrade) | FND-01 | better-sqlite3 tests use a fresh in-memory DB; real upgrade path runs through sqlx/tauri-plugin-sql | After build, launch app on a copy of a populated db; confirm no startup panic and `_sqlx_migrations` has version 51 |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — each plan task carries an `<automated>` command; the two new test files are created within their own tasks (Plan 02 Task 1 TDD; Plan 03 Tasks 1–2 build the invariant test), so no external Wave 0 task is required.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — both new test files (`technique-progress-identity.test.ts`, `effectivePaintId.test.ts`) are authored by the plans that consume them.
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-20
