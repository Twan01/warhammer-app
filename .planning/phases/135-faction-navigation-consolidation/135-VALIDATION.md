---
phase: 135
slug: faction-navigation-consolidation
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-17
validated: 2026-06-17
---

# Phase 135 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Testing Library 16 (jsdom) + better-sqlite3 (node env, `tests/data-layer/`) |
| **Config file** | `vite.config.ts` (already configured) |
| **Quick run command** | `pnpm test -- tests/data-layer/migration048.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~3 s (single data-layer file) / ~full suite for wave merges |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/data-layer/migration048.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite green + `pnpm build` green + `node scripts/check-version.mjs` green
- **Max feedback latency:** ~5 s (quick) / full-suite at wave boundaries

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 135-01-* | 01 | 0 | HON-05 | — / V5 (target only `key='default_faction_id'`) | Migration touches only intended keys/rows | data-layer | `pnpm test -- tests/data-layer/migration048.test.ts` | ✅ | ✅ green |
| 135-01-* | 01 | 1 | HON-05 | — | Duplicate factions merged; all 4 FK surfaces + default_faction_id re-pointed; row counts unchanged | data-layer | `pnpm test -- tests/data-layer/migration048.test.ts` | ✅ | ✅ green |
| 135-01-* | 01 | 1 | HON-05 | — | Parity gate green at 48 migrations | data-layer | `pnpm test -- tests/data-layer/migration-parity.test.ts` | ✅ (auto-derives) | ✅ green |
| 135-01-* | 01 | 1 | HON-05 | — | Three-leg version/migration/CR gate green | build check | `node scripts/check-version.mjs` | ✅ | ✅ green |
| 135-02-* | 02 | 2 | HON-06 | — | `/factions` route + lazy import removed; clean build | build | `pnpm build` | ✅ | ✅ green |
| 135-02-* | 02 | 2 | HON-06 | — | Faction tab present in Settings (2nd position) rendering FactionsPage; sidebar Factions link gone; Quick Add "Add Faction" intact | component | `pnpm test -- tests/settings/SettingsPage.test.tsx tests/navigation/AppSidebar.nav01.test.tsx tests/navigation/QuickAdd.nav02.test.tsx` | ✅ | ✅ green |
| 135-03-* | 03 | 2 | HON-07 | — | `Data Health` absent from `MANAGEMENT_NAV`; `/data-health` route still resolves; Settings → Data card navigates | component/build | `pnpm test -- tests/navigation/AppSidebar.nav01.test.tsx tests/settings/DataManagementTab.test.tsx` + `pnpm build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/data-layer/migration048.test.ts` — seeds duplicate factions (same `wahapedia_faction_id`) each owning a unit + painting_recipe + army_list + wishlist_item, with `app_settings.default_faction_id` (stored as TEXT) pointing at a soon-merged row; runs migration 048; asserts:
  - row-count invariants: `units`, `painting_recipes`, `army_lists`, `wishlist_items` unchanged before/after
  - FK resolution: zero `units`/`wishlist_items` with `faction_id NOT IN (SELECT id FROM factions)`; no new NULLs on previously-valued `painting_recipes`/`army_lists` faction_id
  - cold-boot theming: `default_faction_id` value resolves to a live `factions.id`
  - duplicate elimination: no `wahapedia_faction_id` appears in >1 surviving faction row
  - **Status:** ✅ 3 tests green (2-row case + CR-01 3-row regression + unmapped-faction preservation)
- [x] component assertion that `MANAGEMENT_NAV` in `AppSidebar.tsx` contains neither `/factions` (HON-06) nor `/data-health` (HON-07): `tests/navigation/AppSidebar.nav01.test.tsx` — both assertions green.
- [x] component assertion that the Factions management surface renders from its new Settings home (HON-06): `tests/settings/SettingsPage.test.tsx` — asserts a `Factions` tab exists at 2nd position and exactly 4 tab triggers render. Green.

*The existing `tests/data-layer/migration-parity.test.ts` auto-picks up migration 048 from the disk-derived list — no edit required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Reactive `--faction-accent` theming on color save; FactionSheet/FactionDeleteDialog mount in a live window | HON-06 | Reactive CSS-variable update + interactive sheet open/close require a running Tauri window (structural presence of the Factions tab + Quick Add item is now automated) | Open Settings → Factions, edit a color, confirm `--faction-accent` updates live; create + delete an empty faction; confirm Quick Add → "Add Faction" opens the sheet |
| Data Health navigation transition in a live window | HON-07 | Runtime route transition / visual sidebar state (structural absence from sidebar + presence of the Settings → Data card is now automated) | Confirm `Data Health` gone from sidebar; Settings → Data → "Open Data Health" navigates to `/data-health` |
| Zero data loss on a real upgrade | HON-05 | Live `%APPDATA%` DB with real user factions (in-memory better-sqlite3 proof is automated) | Back up DB, install build, confirm every unit resolves its faction, theming loads cold, wishlist counts unchanged |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (`migration048.test.ts` + nav/settings component assertions)
- [x] No watch-mode flags
- [x] Feedback latency < 5s (quick) / full-suite at wave boundaries
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-17 — all 3 requirements (HON-05/06/07) carry automated verification.

---

## Validation Audit 2026-06-17

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

**Gaps filled (both static/component assertions, jsdom — no Tauri window):**
1. **HON-06** — `tests/settings/SettingsPage.test.tsx`: added a "Factions" tab assertion (2nd position) + extended the stale "three tab triggers" expectation to assert exactly 4 tabs (Preferences, Factions, Data, About). The standalone-`/factions`-link-removed assertion already lived in `AppSidebar.nav01.test.tsx`.
2. **HON-07** — `tests/navigation/AppSidebar.nav01.test.tsx`: added an assertion that the Management group contains Spending + Wishlist only and `Data Health` is absent.

Full suite after fill: **2785 passed, 6 skipped, 0 failed**. The migration requirement (HON-05) was already fully covered by `migration048.test.ts` (3 tests) + the parity gate.
