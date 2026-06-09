---
phase: 119
slug: stratagems-enhancements-import
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-04
---

# Phase 119 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
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
| 119-01-01 | 01 | 1 | STR-01 | — | N/A | unit | `pnpm test -- tests/unit-database/stratagemEnhancementParsing.test.ts` | ✅ | ✅ green |
| 119-01-02 | 01 | 1 | STR-02 | — | N/A | unit | `pnpm test -- tests/unit-database/stratagemEnhancementParsing.test.ts` | ✅ | ✅ green |
| 119-01-03 | 01 | 1 | ENH-01 | — | N/A | unit | `pnpm test -- tests/unit-database/stratagemEnhancementParsing.test.ts` | ✅ | ✅ green |
| 119-02-01 | 02 | 1 | STR-01 | — | N/A | build | `pnpm tauri dev` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Build pipeline validates CSV parsing and JSON output. Rust compilation validates struct types and INSERT statements. Migration applies automatically at app start.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Universal stratagems queryable | STR-02 | Requires running app with live DB | Run app, check udb_stratagems for rows with NULL faction_id |
| Both tables populated after import | STR-01, ENH-01 | Requires full pipeline run | Run `pnpm build:udb && pnpm tauri dev`, verify import counts in console |

---

## Validation Audit 2026-06-09

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved | 3 |
| Escalated | 0 |

**Tests created:** `tests/unit-database/stratagemEnhancementParsing.test.ts` (14 tests)

| Gap | Requirement | Resolution |
|-----|-------------|------------|
| STR-01 | Stratagem CSV parsing | 4 unit tests — legends filter, row shape, cp_cost parsing, free stratagems |
| STR-02 | Universal stratagems null FK | 4 unit tests — empty→null conversion, negative case, real JSON verification |
| ENH-01 | Enhancement CSV parsing | 6 unit tests — legends filter, missing faction_id skip, row shape, cost parsing, null detachment_id |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete
