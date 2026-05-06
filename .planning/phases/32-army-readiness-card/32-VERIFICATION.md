---
phase: 32-army-readiness-card
verified: 2026-05-06T10:15:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 32: Army Readiness Card Verification Report

**Phase Goal:** A dedicated ArmyReadinessCard replaces the existing readiness surface on the dashboard, giving the user a per-faction breakdown of battle-ready points against a target the user selects from a preset list.
**Verified:** 2026-05-06T10:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dashboard shows an ArmyReadinessCard with 4 target buttons (500/1000/1500/2000) defaulting to 2000 | VERIFIED | `ArmyReadinessCard.tsx` renders `ARMY_READINESS_TARGETS.map` with `variant={target === t ? "default" : "ghost"}`; `useArmyReadinessTarget` defaults to 2000; Test 2 passes |
| 2 | Clicking a target button immediately updates all faction progress bars without a page reload | VERIFIED | `onClick={() => setTarget(t)}` calls `useState` setter synchronously; `FactionRow` receives `target` prop and recomputes `pct`; Test 3 confirms `mockSetTarget(500)` is called |
| 3 | Each faction with units shows a progress bar colored with that faction's color_theme | VERIFIED | `style={{ backgroundColor: row.color_theme }}` in `FactionRow`; `getArmyReadinessByFaction` returns `color_theme` field from JOIN; Test 4 confirms faction rows render |
| 4 | Progress bar text shows `{pointsPainted} / {target} pts ready, {pointsOwned} pts owned` | VERIFIED | Exact string `{row.points_painted} / {target} pts ready, {row.points_owned} pts owned` in `FactionRow`; Test 5 matches `/800 \/ 2000 pts ready, 1500 pts owned/` |
| 5 | When battle-ready points meet or exceed the target, text turns gold (text-battle-gold) | VERIFIED | `isTargetMet ? "text-battle-gold" : "text-muted-foreground"` conditional; `--color-battle-gold: var(--battle-gold)` in `globals.css`; Test 6 passes with `toHaveClass("text-battle-gold")` |
| 6 | Target selection persists in localStorage across app restarts | VERIFIED | `useArmyReadinessTarget` reads from `window.localStorage.getItem("army-readiness:target")` on init and writes via `useEffect` on change; Tests 7–10 confirm default, read, fallback, and persist behaviors |
| 7 | Creating, updating, or deleting a unit refreshes the ArmyReadinessCard data | VERIFIED | All 3 `useUnits` mutations call `qc.invalidateQueries({ queryKey: ["army-readiness"] })`; 3 Phase 32 invalidation tests pass |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/queries/dashboard.ts` | `getArmyReadinessByFaction` SQL aggregation + `FactionReadiness` interface | VERIFIED | INNER JOIN, `COALESCE(u.points, 0)`, `status_painting = 'Completed'`, `ORDER BY f.name ASC`; 103 lines, fully substantive |
| `src/hooks/useArmyReadiness.ts` | `useArmyReadiness` + `useArmyReadinessTarget` + constants | VERIFIED | Exports `ARMY_READINESS_KEY`, `ARMY_READINESS_TARGETS`, both hooks; 57 lines with real implementations |
| `src/features/dashboard/ArmyReadinessCard.tsx` | `ArmyReadinessCard` component | VERIFIED | 119 lines; loading/empty/populated states; `FactionRow` sub-component; fully substantive |
| `tests/dashboard/armyReadinessQuery.test.ts` | SQL contract + localStorage hook tests | VERIFIED | 147 lines; Tests 1–10 all pass |
| `tests/dashboard/ArmyReadinessCard.test.tsx` | Component rendering tests | VERIFIED | 130 lines; Tests 1–8 all pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ArmyReadinessCard.tsx` | `useArmyReadiness.ts` | `useArmyReadiness()` and `useArmyReadinessTarget()` | WIRED | Both hook calls at lines 28–29; data flows to `FactionRow` via `factions` and `target` props |
| `useArmyReadiness.ts` | `dashboard.ts` | `getArmyReadinessByFaction` as `queryFn` | WIRED | Line 28: `queryFn: getArmyReadinessByFaction` |
| `DashboardPage.tsx` | `ArmyReadinessCard.tsx` | Import + render in right column | WIRED | Line 52: `import { ArmyReadinessCard } from "./ArmyReadinessCard"`; line 353: `<ArmyReadinessCard />` inside `flex flex-col gap-6` wrapper with `RecentActivityFeed` |
| `useUnits.ts` | army-readiness cache key | `invalidateQueries` in all 3 mutations | WIRED | `queryKey: ["army-readiness"]` present in `useCreateUnit` (line 38), `useUpdateUnit` (line 60), `useDeleteUnit` (line 77) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PANEL-04 | 32-01-PLAN.md | ArmyReadinessCard displays per-faction battle-ready points with a target selector (500/1000/1500/2000 pts) | SATISFIED | `ArmyReadinessCard.tsx` renders per-faction rows from `getArmyReadinessByFaction`; 4 target buttons present; `REQUIREMENTS.md` traceability row shows Phase 32, marked Complete |
| PANEL-05 | 32-01-PLAN.md | ArmyReadinessCard shows progress bar per faction toward selected target with owned-vs-ready breakdown | SATISFIED | `FactionRow` renders progress bar with `backgroundColor: row.color_theme` and progress text `{points_painted} / {target} pts ready, {points_owned} pts owned`; `REQUIREMENTS.md` traceability row shows Phase 32, marked Complete |

No orphaned requirements: REQUIREMENTS.md maps only PANEL-04 and PANEL-05 to Phase 32, both claimed by plan 32-01.

### Anti-Patterns Found

None. Scanned `ArmyReadinessCard.tsx`, `useArmyReadiness.ts`, and `dashboard.ts` for TODO/FIXME/placeholder comments and stub return patterns — all clear.

### Human Verification Required

#### 1. Visual progress bar rendering

**Test:** Open the app with at least one faction that has both completed and in-progress units. Navigate to the dashboard.
**Expected:** ArmyReadinessCard appears below RecentActivityFeed in the right column, showing faction name, a color-filled progress bar using the faction's hex color, and progress text.
**Why human:** Inline `style={{ backgroundColor: row.color_theme }}` rendering and visual layout cannot be verified without a real Tauri window.

#### 2. Target button selection visual state

**Test:** Click each of the four target buttons (500, 1000, 1500, 2000).
**Expected:** The clicked button shows the "default" variant (filled/prominent), other buttons show "ghost" variant (subtle). Progress bars update immediately.
**Why human:** Shadcn/ui Button variant visual appearance requires a real browser render.

#### 3. localStorage persistence across restarts

**Test:** Select target 500, close the app, reopen it, navigate to the dashboard.
**Expected:** The 500 button is still selected; all progress bars reflect the 500pt target.
**Why human:** Tauri app restart behavior cannot be simulated in jsdom tests.

### Gaps Summary

No gaps. All 7 observable truths verified, all 5 required artifacts confirmed substantive and wired, both key data flows (component → hook → query, and mutations → cache invalidation) confirmed active. Requirements PANEL-04 and PANEL-05 are both satisfied and marked Complete in REQUIREMENTS.md.

---

_Verified: 2026-05-06T10:15:00Z_
_Verifier: Claude (gsd-verifier)_
