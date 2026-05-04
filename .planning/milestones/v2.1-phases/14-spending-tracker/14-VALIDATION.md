---
phase: 14
slug: spending-tracker
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-03
audited: 2026-05-04
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npm test -- --reporter=verbose tests/spending/` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --reporter=verbose tests/spending/`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-00-01 | 00 | 0 | SPEND-05 | unit | `npm test -- tests/spending/formatCurrency.test.ts` | ✅ exists | ✅ green |
| 14-00-02 | 00 | 0 | SPEND-04 | unit | `npm test -- tests/spending/computeSpendingStats.test.ts` | ✅ exists | ✅ green |
| 14-00-03 | 00 | 0 | SPEND-05 | content | `npm test -- tests/spending/migration005.test.ts` | ✅ exists | ✅ green |
| 14-00-04 | 00 | 0 | SPEND-03/04 | unit | `npm test -- tests/spending/useSpendingStats.test.ts` | ✅ exists | ✅ green |
| 14-00-05 | 00 | 0 | SPEND-03/04 | component | `npm test -- tests/spending/SpendingPage.test.tsx` | ✅ exists | ✅ green |
| 14-00-06 | 00 | 0 | SPEND-01 | unit | `npm test -- tests/spending/unitSchema.test.ts` | ✅ exists | ✅ green |
| 14-00-07 | 00 | 0 | SPEND-02 | unit | `npm test -- tests/spending/paintSchema.test.ts` | ✅ exists | ✅ green |
| 14-01-xx | 01 | 1 | SPEND-05 | unit | `npm test -- tests/spending/` | ✅ exists | ✅ green |
| 14-02-xx | 02 | 1 | SPEND-01/02 | unit | `npm test -- tests/spending/` | ✅ exists | ✅ green |
| 14-03-xx | 03 | 2 | SPEND-03/04 | component | `npm test -- tests/spending/` | ✅ exists | ✅ green |
| (sidebar) | 03 | 2 | SPEND-03 | component | `npm test -- tests/theming/AppSidebar.test.tsx` | ✅ exists | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/spending/formatCurrency.test.ts` — SPEND-05 utility (null, zero, positive pence → £ string)
- [x] `tests/spending/computeSpendingStats.test.ts` — SPEND-04 pure aggregation (faction breakdown + Paints row)
- [x] `tests/spending/migration005.test.ts` — SPEND-05 migration content (006_spend_pence.sql assertions)
- [x] `tests/spending/useSpendingStats.test.ts` — SPEND-03/04 (SPENDING_STATS_KEY contract)
- [x] `tests/spending/SpendingPage.test.tsx` — SPEND-03/04 (hero total renders, faction rows render)
- [x] `tests/spending/unitSchema.test.ts` — SPEND-01 (purchase_price_pence: integer, non-negative, nullable)
- [x] `tests/spending/paintSchema.test.ts` — SPEND-02 (purchase_price_pence: integer, non-negative, nullable)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Unit price saves and reloads as £ in UnitDetailSheet Details tab | SPEND-01 | Requires live Tauri IPC + DB round-trip | Open UnitSheet, enter 1250 (£12.50), save; reopen unit detail — confirm "£12.50" shown |
| Paint price saves and reloads as £ in PaintSheet | SPEND-02 | Requires live Tauri IPC + DB round-trip | Open PaintSheet, enter 450 (£4.50), save; reopen — confirm "£4.50" shown |
| Spending page grand total matches sum of unit + paint spend | SPEND-03 | Requires live data across multiple tables | Log prices on 2+ units across different factions + 1 paint; confirm totals add up on /spending |
| Faction row totals match manual sum | SPEND-04 | Cross-table SQL aggregation | Verify each faction row total equals sum of that faction's units' purchase_price_pence / 100 |
| Old purchase_price REAL column no longer written by app | SPEND-05 | DB inspection after mutation | After editing a unit price, open SQLite DB — confirm `purchase_price` column is unchanged, `purchase_price_pence` column has correct integer |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ 2026-05-04

---

## Validation Audit 2026-05-04

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated to manual | 5 (live Tauri IPC — untestable in jsdom) |

All 11 tasks have green automated tests. 279 tests passing, 0 failures.
