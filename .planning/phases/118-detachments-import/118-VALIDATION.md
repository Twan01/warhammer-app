---
phase: 118
slug: detachments-import
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-04
---

# Phase 118 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` |
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
| 118-01-01 | 01 | 1 | DET-01 | — | N/A | integration | `pnpm test -- tests/data-layer/unit-database-artifact.test.ts` | ✅ | ✅ green |
| 118-01-02 | 01 | 1 | DET-02 | — | N/A | integration | `pnpm test -- tests/data-layer/unit-database-artifact.test.ts` | ✅ | ✅ green |
| 118-01-03 | 01 | 1 | DET-01, DET-02 | — | N/A | build | `pnpm build` | ✅ | ✅ green |
| 118-02-01 | 02 | 2 | DET-01, DET-02 | T-118-03 | Parameterized SQL | build | `cargo check` | ✅ | ✅ green |
| 118-02-02 | 02 | 2 | DET-01, DET-02 | T-118-03 | Parameterized SQL | build | `cargo check && pnpm build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All requirements now have automated test coverage in `tests/data-layer/unit-database-artifact.test.ts`:

- **DET-01**: detachments array >= 200 entries, valid field structure, FK integrity (every faction_id exists in factions)
- **DET-02**: detachment_abilities array >= 200 entries, valid field structure (id, detachment_id, faction_id, name, description)
- **DAS-01 extension**: `detachments` and `detachment_abilities` added to required top-level keys

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rust importer runtime INSERT correctness | DET-01 | Requires running app with real DB; cargo check validates compile-time only | Build, launch app via `pnpm tauri dev`, verify detachment counts in SQLite CLI |
| Stable across re-imports (no AUTOINCREMENT drift) | DET-01 | Requires two consecutive imports | Run `pnpm build:udb` twice, compare detachment IDs in output JSON |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-06-04

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated | 0 |

### Tests Added

| File | Tests | Status |
|------|-------|--------|
| `tests/data-layer/unit-database-artifact.test.ts` | DET-01 detachments structure (2 tests), DET-02 abilities structure (3 tests), DET-01 FK integrity (1 test), DAS-01 required keys updated | All green |
