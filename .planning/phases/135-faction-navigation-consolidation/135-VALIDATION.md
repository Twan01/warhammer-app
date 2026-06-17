---
phase: 135
slug: faction-navigation-consolidation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-17
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
| 135-01-* | 01 | 0 | HON-05 | — / V5 (target only `key='default_faction_id'`) | Migration touches only intended keys/rows | data-layer | `pnpm test -- tests/data-layer/migration048.test.ts` | ❌ W0 | ⬜ pending |
| 135-01-* | 01 | 1 | HON-05 | — | Duplicate factions merged; all 4 FK surfaces + default_faction_id re-pointed; row counts unchanged | data-layer | `pnpm test -- tests/data-layer/migration048.test.ts` | ❌ W0 | ⬜ pending |
| 135-01-* | 01 | 1 | HON-05 | — | Parity gate green at 48 migrations | data-layer | `pnpm test -- tests/data-layer/migration-parity.test.ts` | ✅ (auto-derives) | ⬜ pending |
| 135-01-* | 01 | 1 | HON-05 | — | Three-leg version/migration/CR gate green | build check | `node scripts/check-version.mjs` | ✅ | ⬜ pending |
| 135-02-* | 02 | 2 | HON-06 | — | `/factions` route + lazy import removed; clean build | build | `pnpm build` | ✅ | ⬜ pending |
| 135-02-* | 02 | 2 | HON-06 | — | Faction CRUD reachable from new Settings home; Quick Add "Add Faction" intact | component/manual | `pnpm test` (component render) + UAT | ❌ W0 | ⬜ pending |
| 135-03-* | 03 | 2 | HON-07 | — | `Data Health` absent from `MANAGEMENT_NAV`; `/data-health` route still resolves | component/build | `pnpm test` (static nav assertion) + `pnpm build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/data-layer/migration048.test.ts` — seeds duplicate factions (same `wahapedia_faction_id`) each owning a unit + painting_recipe + army_list + wishlist_item, with `app_settings.default_faction_id` (stored as TEXT) pointing at a soon-merged row; runs migration 048; asserts:
  - row-count invariants: `units`, `painting_recipes`, `army_lists`, `wishlist_items` unchanged before/after
  - FK resolution: zero `units`/`wishlist_items` with `faction_id NOT IN (SELECT id FROM factions)`; no new NULLs on previously-valued `painting_recipes`/`army_lists` faction_id
  - cold-boot theming: `default_faction_id` value resolves to a live `factions.id`
  - duplicate elimination: no `wahapedia_faction_id` appears in >1 surviving faction row
- [ ] (optional) component assertion that `MANAGEMENT_NAV` in `AppSidebar.tsx` contains neither `/factions` nor `/data-health`, and that the Factions management surface renders from its new Settings home.

*The existing `tests/data-layer/migration-parity.test.ts` auto-picks up migration 048 from the disk-derived list — no edit required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Faction create/edit/delete/theme usable from new Settings home | HON-06 | Full interactive flow + visual theming | Open Settings → Factions, edit a color, confirm `--faction-accent` updates; create + delete an empty faction; confirm Quick Add → "Add Faction" still opens the sheet |
| Data Health reachable in ≤2 clicks | HON-07 | Navigation/UX assertion | Confirm `Data Health` gone from sidebar; Settings → Data → "Open Data Health" navigates to `/data-health` |
| Zero data loss on a real upgrade | HON-05 | Live `%APPDATA%` DB with real user factions | Back up DB, install build, confirm every unit resolves its faction, theming loads cold, wishlist counts unchanged |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`migration048.test.ts`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s (quick) / full-suite at wave boundaries
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
