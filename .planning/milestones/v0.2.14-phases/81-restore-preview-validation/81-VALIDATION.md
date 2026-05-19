---
phase: 81
slug: restore-preview-validation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-18
---

# Phase 81 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + React Testing Library 16 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx tests/data-health/formatBytes.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~110 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx tests/data-health/formatBytes.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds (targeted tests)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 81-01-01 | 01 | 1 | RST-04, RST-05 | T-81-01 | get_schema_version returns public migration count only | build | `cargo check` (src-tauri) | ✅ | ✅ green |
| 81-01-02 | 01 | 1 | — | — | N/A | unit | `pnpm test -- tests/data-health/formatBytes.test.ts` | ✅ | ✅ green |
| 81-02-01 | 02 | 2 | RST-01, RST-02, RST-03, RST-04, RST-05, RST-09 | T-81-02, T-81-03 | Zip validation in Rust backend, no frontend parsing | build | `pnpm build` | ✅ | ✅ green |
| 81-02-02 | 02 | 2 | RST-01, RST-02, RST-03, RST-04, RST-05, RST-09 | T-81-02 | File picker filtered to .zip only | unit | `pnpm test -- tests/data-health/RestorePreviewDialog.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement Coverage Detail

| Requirement | Description | Test File | Test Cases | Status |
|-------------|-------------|-----------|------------|--------|
| RST-01 | File picker filtered to .zip | RestorePreviewDialog.test.tsx | #1 renders button, #2 opens picker with .zip filter, #3 cancelled picker no-op | COVERED |
| RST-02 | Validate manifest from backup | RestorePreviewDialog.test.tsx | #4 calls validate_backup with path, #5 error toast on failure | COVERED |
| RST-03 | Preview card showing manifest details | RestorePreviewDialog.test.tsx | #6 shows dialog after validation, #7 displays all 5 fields | COVERED |
| RST-04 | Reject newer schema version | RestorePreviewDialog.test.tsx | #8 disables action button, #9 shows error banner | COVERED |
| RST-05 | Warn older schema version | RestorePreviewDialog.test.tsx | #10 warning banner + button enabled | COVERED |
| RST-09 | Explicit confirmation gate | RestorePreviewDialog.test.tsx | #11 no banner on match, #12 placeholder toast on confirm | COVERED |
| — | formatBytes utility (supporting) | formatBytes.test.ts | 9 test cases (0B, negative, small, KB, fractional MB, large MB, GB, TB clamp) | COVERED |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native file picker opens filtered to .zip | RST-01 | OS-native dialog in Tauri, not testable in jsdom | Click "Restore from Backup" on Data Health page, verify OS file dialog with .zip filter |
| Visual styling of schema compatibility badges/banners | RST-04, RST-05 | CSS colors and layout require human eyes | Test with newer, older, and matching schema backups; verify red/amber/green states |
| Destructive button UX feel | RST-09 | Interaction feel is subjective | Click "Replace current database" — should feel deliberate and safe |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-18

---

## Validation Audit 2026-05-18

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 6 requirements (RST-01 through RST-05, RST-09) have automated test coverage via 21 tests across 2 test files. Full suite: 1812 tests passing, 0 failures.
