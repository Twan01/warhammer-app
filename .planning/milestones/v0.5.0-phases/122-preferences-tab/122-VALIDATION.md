---
phase: 122
slug: preferences-tab
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-11
---

# Phase 122 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + React Testing Library 16 (jsdom) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test -- tests/settings/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~3s (settings tests), ~30s (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/settings/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 122-01-01 | 01 | 1 | PREF-01, PREF-02 | — | N/A | unit | `pnpm test -- tests/settings/useCurrencyPreference.test.ts` | ✅ | ✅ green |
| 122-01-02 | 01 | 1 | PREF-01, PREF-02, PREF-03, PREF-04 | T-122-01, T-122-02 | ReadinessTarget validates min=1 max=99999; DefaultFaction uses closed select | unit | `pnpm test -- tests/settings/GeneralPreferencesSection.test.tsx` | ✅ | ✅ green |
| 122-02-01 | 02 | 2 | PREF-01, PREF-02 | T-122-06 | Locale change invalidates 7 query keys (local SQLite, no DoS risk) | unit | `pnpm test -- tests/settings/consumerIntegration.test.tsx` | ✅ | ✅ green |
| 122-02-02 | 02 | 2 | PREF-03 | T-122-04 | Invalid faction ID results in no faction selected (harmless) | unit | `pnpm test -- tests/theming/useActiveFaction.test.tsx` | ✅ | ✅ green |
| 122-02-02 | 02 | 2 | PREF-04 | T-122-05 | NaN/non-positive values fall back to 2000 | unit | `pnpm test -- tests/settings/consumerIntegration.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Coverage Summary

| Test File | Tests | Covers |
|-----------|-------|--------|
| `tests/settings/useCurrencyPreference.test.ts` | 6 | PREF-02: currency hook defaults, mapping, fallback |
| `tests/settings/GeneralPreferencesSection.test.tsx` | 10 | PREF-01–04: UI controls render, mutate on interaction |
| `tests/settings/consumerIntegration.test.tsx` | 10 | PREF-01: LocaleToggle sync (4), PREF-04: readiness target read/default/NaN/override/no-persist (6) |
| `tests/theming/useActiveFaction.test.tsx` | 9 | PREF-03: boot from app_settings (3), THEME-01/02: existing DOM/localStorage (6) |

**Total: 35 tests across 4 files**

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Audit 2026-06-11

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

Gap filled: PREF-03 boot integration — added 3 tests in `tests/theming/useActiveFaction.test.tsx` verifying ActiveFactionContext reads `default_faction_id` from app_settings on cold start, respects existing localStorage, and handles empty string.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-11
