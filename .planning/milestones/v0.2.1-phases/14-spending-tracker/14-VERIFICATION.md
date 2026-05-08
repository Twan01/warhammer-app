---
phase: 14-spending-tracker
verified: 2026-05-04T00:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
gaps: []
human_verification: []
---

# Phase 14: Spending Tracker Verification Report

**Phase Goal:** Users can record what they spent on units and paints and see a consolidated Spending page showing total hobby spend broken down by faction
**Verified:** 2026-05-04
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Unit price entered in UnitSheet saves and reloads as formatted £ in UnitDetailSheet Details tab (SPEND-01) | VERIFIED | `UnitSheet.tsx` has Purchase Price field (label, placeholder, helper text, step=1); `UnitDetailSheet.tsx` line 172 renders `formatCurrency(unit.purchase_price_pence)`; `units.ts` updateUnit wires `purchase_price_pence` in INSERT and SET; UAT step 2+3 PASS |
| 2 | Paint price entered in PaintSheet saves and reloads on next open (SPEND-02) | VERIFIED | `PaintSheet.tsx` has Purchase Price field at bottom before SheetFooter; `paints.ts` createPaint/updatePaint wire `purchase_price_pence`; UAT step 4 PASS |
| 3 | Spending page hero total = sum of all unit + owned-paint prices (SPEND-03) | VERIFIED | `spending.ts` SELECT + COALESCE SUM; `computeSpendingStats.ts` aggregates unitTotalPence + paintsPence; `SpendingPage.tsx` renders `formatCurrency(data.totalPence)`; UAT step 5+6 PASS |
| 4 | Spending page per-faction rows match unit prices grouped by faction; Paints row matches owned paint sum (SPEND-04) | VERIFIED | `computeSpendingStats.ts` maps factions array to FactionSpend[]; SQL WHERE owned=1 filter; SpendingPage breakdown table renders all rows; UAT step 6 PASS |
| 5 | Clearing a unit's price field results in '—' display — Pitfall 1 unconditional UPDATE confirmed | VERIFIED | `units.ts` line 65: `purchase_price_pence = $18` (no COALESCE); binding line 81: `input.purchase_price_pence ?? null` — empty field → null → unconditional write; `formatCurrency(null)` returns '—'; UAT step 3 PASS |
| 6 | Cache invalidation: editing a unit price refreshes the Spending page without app restart — Pitfall 2 confirmed | VERIFIED | `useUnits.ts` all 3 mutations invalidate `["spending-stats"]`; `usePaints.ts` all 3 mutations invalidate `["spending-stats"]`; `useSpendingStats.ts` queryKey = `SPENDING_STATS_KEY = ["spending-stats"] as const`; UAT step 7 PASS |
| 7 | Spending nav entry visible in sidebar with Wallet icon, navigates to /spending | VERIFIED | `AppSidebar.tsx` TRACKING_NAV includes `{ to: "/spending", label: "Spending", icon: Wallet }`; Wallet imported from lucide-react; `router.tsx` spendingRoute registered at path "/spending" wired to SpendingPage component |
| 8 | Skeleton loading state with aria-label="Loading spending data"; smooth transition; no crashes (SPEND-05 visual) | VERIFIED | `SpendingPage.tsx` lines 31-43: loading branch returns div with `aria-label="Loading spending data"` and 3 Skeleton elements (hero + header + table); UAT step 7 PASS |
| 9 | pnpm test (full suite) and pnpm tsc --noEmit both exit 0 | VERIFIED | 14-04-SUMMARY.md confirms both commands passed; 0 it.skip stubs remain in tests/spending/ |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/migrations/006_spend_pence.sql` | ALTER TABLE units/paints ADD COLUMN purchase_price_pence INTEGER + UPDATE migration | VERIFIED | File exists; ALTER TABLE statements present; ROUND*100 UPDATE for existing REAL values |
| `src-tauri/src/lib.rs` | Migration version 6 registered | VERIFIED | `version: 6, description: "spend_pence"` registered at line 39 |
| `src/lib/formatCurrency.ts` | Integer pence → £ string, null → "—" | VERIFIED | Single div/100 site; `if (pence == null) return "—"`; Intl.NumberFormat en-GB/GBP |
| `src/types/unit.ts` | purchase_price_pence: number | null | VERIFIED | Field present at line 43 |
| `src/types/paint.ts` | purchase_price_pence: number | null | VERIFIED | Field present at line 24 |
| `src/db/queries/units.ts` | INSERT + unconditional UPDATE for purchase_price_pence | VERIFIED | createUnit: `$17` slot; updateUnit: `purchase_price_pence = $18` (no COALESCE) |
| `src/db/queries/paints.ts` | INSERT + unconditional UPDATE for purchase_price_pence | VERIFIED | createPaint: `$11` slot; updatePaint: `purchase_price_pence = $12` (no COALESCE) |
| `src/features/units/UnitSheet.tsx` | Purchase Price field with correct label/placeholder/helper/step | VERIFIED | label="Purchase Price", placeholder="e.g. 1250 for £12.50", helper="Enter amount in pence (100 = £1.00)", type=number step=1 |
| `src/features/units/UnitDetailSheet.tsx` | formatCurrency display in Details tab | VERIFIED | line 172: `formatCurrency(unit.purchase_price_pence)` |
| `src/features/paints/PaintSheet.tsx` | Purchase Price field before SheetFooter | VERIFIED | Field at line 339 before SheetFooter at line 368 |
| `src/hooks/useUnits.ts` | 3 mutation hooks each invalidate ["spending-stats"] | VERIFIED | useCreateUnit, useUpdateUnit, useDeleteUnit all invalidate spending-stats |
| `src/hooks/usePaints.ts` | 3 mutation hooks each invalidate ["spending-stats"] | VERIFIED | useCreatePaint, useUpdatePaint, useDeletePaint all invalidate spending-stats |
| `src/db/queries/spending.ts` | getSpendingStats() with parallel SELECT + COALESCE SUM | VERIFIED | Promise.all; COALESCE(SUM(purchase_price_pence), 0) WHERE owned = 1 |
| `src/features/spending/computeSpendingStats.ts` | Pure aggregation returning FactionSpend[] + totalPence + paintsPence | VERIFIED | Substantive; maps all factions; null-guards via ?? 0 |
| `src/hooks/useSpendingStats.ts` | TanStack Query hook with SPENDING_STATS_KEY = ["spending-stats"] | VERIFIED | SPENDING_STATS_KEY constant exported; useQuery wired to getSpendingStats + computeSpendingStats |
| `src/features/spending/SpendingPage.tsx` | Hero card + breakdown table + skeleton loading + empty state | VERIFIED | 114 lines; all 3 render branches present; aria-label on loading div; formatCurrency on all monetary values |
| `src/app/spending/page.tsx` | Thin re-export wrapper | VERIFIED | 5-line wrapper imports and re-exports SpendingPageContent |
| `src/app/router.tsx` | /spending route registered | VERIFIED | spendingRoute at path "/spending" using SpendingPage component; added to routeTree |
| `src/components/common/AppSidebar.tsx` | Spending nav entry with Wallet icon | VERIFIED | TRACKING_NAV entry; Wallet from lucide-react imported at line 15 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| UnitSheet.tsx form submit | updateUnit/createUnit in units.ts | purchase_price_pence field in onSubmit payload | WIRED | Line 138: `purchase_price_pence: values.purchase_price_pence ?? null` passed to mutateAsync |
| UnitDetailSheet.tsx | formatCurrency | `formatCurrency(unit.purchase_price_pence)` | WIRED | Line 172 — direct call; formatCurrency imported |
| PaintSheet.tsx form submit | updatePaint/createPaint in paints.ts | purchase_price_pence in form values | WIRED | Line 104 in PaintSheet: `purchase_price_pence: values.purchase_price_pence ?? null` |
| useSpendingStats.ts | getSpendingStats + computeSpendingStats | queryFn composition | WIRED | Both imported and called in queryFn |
| SpendingPage.tsx | useSpendingStats | hook call with data destructure | WIRED | `const { data, isLoading, isError } = useSpendingStats()` |
| SpendingPage.tsx | formatCurrency | all monetary renders | WIRED | Imported; called on totalPence, row.pence, paintsPence |
| useCreateUnit/updateUnit/deleteUnit | ["spending-stats"] cache key | qc.invalidateQueries | WIRED | All 3 hooks in useUnits.ts confirmed |
| useCreatePaint/updatePaint/deletePaint | ["spending-stats"] cache key | qc.invalidateQueries | WIRED | All 3 hooks in usePaints.ts confirmed |
| router.tsx | SpendingPage at /spending | spendingRoute registered in routeTree | WIRED | spendingRoute in routeTree.addChildren array |

### Requirements Coverage

SPEND- requirements are defined in Phase 14 planning documents (14-CONTEXT.md, 14-VALIDATION.md) rather than the current REQUIREMENTS.md (which covers v0.2.2 requirements only). The requirements were part of an earlier milestone. Coverage assessed from plan frontmatter and CONTEXT.md definitions.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SPEND-01 | 14-01, 14-02, 14-04 | Unit purchase price entry and formatted display | SATISFIED | UnitSheet field + UnitDetailSheet formatCurrency display verified in code and UAT |
| SPEND-02 | 14-01, 14-02, 14-04 | Paint purchase price entry | SATISFIED | PaintSheet field verified in code and UAT |
| SPEND-03 | 14-03, 14-04 | Spending page total = sum of unit + owned-paint prices | SATISFIED | computeSpendingStats totalPence + SpendingPage hero card verified |
| SPEND-04 | 14-03, 14-04 | Per-faction breakdown + Paints row; owned-only filter | SATISFIED | factionBreakdown map + SQL WHERE owned=1 verified |
| SPEND-05 | 14-01, 14-04 | Integer pence storage + formatted currency display; Pitfall 1 + Pitfall 2 | SATISFIED | migration 006 + unconditional UPDATE + formatCurrency + cache invalidation verified |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

No anti-patterns detected. All test stubs in tests/spending/ have been flipped (0 `it.skip` remaining). No TODO/FIXME/placeholder comments in Phase 14 source files. No empty implementations or console.log-only handlers.

### One Design Note (Not a Gap)

`SpendingPage.tsx` shows an empty-state ("No spend logged yet") when `totalPence === 0 AND factionBreakdown.length === 0 AND paintsPence === 0`. The hero card with "Total Hobby Spend" only renders when there is actual spend data. This is intentional UX (confirmed by UAT step 5 pass) and does not conflict with SPEND-03: the hero card is present and correct when any price data exists.

### Human Verification Required

None — all automated verification checks passed and the UAT document (14-UAT.md) records 7/7 manual smoke-test steps PASS with 0 issues.

### Gaps Summary

No gaps. All 9 must-haves verified. All 5 SPEND requirements (SPEND-01 through SPEND-05) are satisfied by substantive, wired code confirmed against the actual source files. The UAT records user sign-off on all 7 smoke-test steps including the two cross-cutting pitfall verifications (Pitfall 1: unconditional NULL clear; Pitfall 2: cross-page cache invalidation).

---

_Verified: 2026-05-04_
_Verifier: Claude (gsd-verifier)_
