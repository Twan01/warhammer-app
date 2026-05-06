---
phase: 34-visual-polish
verified: 2026-05-06T10:00:00Z
status: gaps_found
score: 5/6 must-haves verified
gaps:
  - truth: "All dashboard card surfaces have smooth shadow transition on hover (shadow-sm to shadow-md)"
    status: partial
    reason: "VIS-03 hover:shadow-md is missing on the populated-state Card in RecentActivityFeed.tsx (line 59) and the populated-state div in ArmyReadinessCard.tsx (line 85). Both empty/loading branches were updated but the data-bearing branch in each component was skipped."
    artifacts:
      - path: "src/features/dashboard/RecentActivityFeed.tsx"
        issue: "Populated-state Card at line 59 has 'shadow-sm px-6 py-6' but is missing 'transition-shadow duration-150 hover:shadow-md'"
      - path: "src/features/dashboard/ArmyReadinessCard.tsx"
        issue: "Populated-state div at line 85 has 'rounded-lg border border-border/60 bg-card p-4 shadow-sm' but is missing 'transition-shadow duration-150 hover:shadow-md'"
    missing:
      - "Add 'transition-shadow duration-150 hover:shadow-md' to the Card className in RecentActivityFeed.tsx populated branch (line 59)"
      - "Add 'transition-shadow duration-150 hover:shadow-md' to the div className in ArmyReadinessCard.tsx populated branch (line 85)"
human_verification:
  - test: "VIS-01 — FactionSummaryCard visual appearance"
    expected: "Each faction card has an 8px top color band matching its faction color, cards are noticeably wider (~220px min), the activate button shows a small Circle dot (not a star), active card has a tinted background + ring + elevated shadow, inactive card has no ring or tint"
    why_human: "CSS class presence is verified but rendered visual appearance and the subtlety/quality of the glow effect require a human looking at the running app"
  - test: "VIS-02 — Hero gradient depth"
    expected: "Dashboard top area (title + stat cards) has a very subtle radial glow in the active faction's color that does not obscure any text. Switching faction updates the glow color."
    why_human: "Inline style gradient is verified present but the perceptual subtlety (7% opacity, non-distracting) and dynamic faction color update require visual inspection in the running app"
  - test: "VIS-03 — Shadow transition feel"
    expected: "Hovering each card type produces a smooth 150ms shadow deepening from shadow-sm to shadow-md"
    why_human: "CSS transition timing and perceived smoothness cannot be verified from static code inspection"
---

# Phase 34: Visual Polish Verification Report

**Phase Goal:** FactionSummaryCards upgraded to larger, more expressive format with dominant accent color band and unambiguous active/focus indicators; dashboard hero gains premium visual depth through radial gradient; all card surfaces adopt elevated/hover depth hierarchy

**Verified:** 2026-05-06T10:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | FactionSummaryCards are visually larger with an 8px top color band | VERIFIED | `FactionSummaryCard.tsx` line 48: `min-w-[220px]` + `py-6`; lines 54-59: absolute inner div with `h-2` and `backgroundColor: stat.faction.color_theme` |
| 2 | Active faction card has full-card glow unmistakably distinct from inactive | VERIFIED | `FactionSummaryCard.tsx` line 48-52: active branch adds `bg-faction-accent/10 ring-2 ring-faction-accent shadow-md`; inactive adds `shadow-sm hover:shadow-md` |
| 3 | Star icon replaced with Circle glow dot | VERIFIED | `FactionSummaryCard.tsx` line 2: `import { Circle } from "lucide-react"`; no Star import present; line 71: `<Circle size={8}` |
| 4 | Dashboard hero area has radial gradient background tied to faction accent color | VERIFIED | `DashboardPage.tsx` line 61: `activeFactionHex` destructured from `useActiveFaction()`; lines 259-263: `radial-gradient(ellipse at 50% 0%, ${activeFactionHex}12 0%, transparent 70%)` inside `col-span-full` wrapper |
| 5 | All dashboard card surfaces have smooth shadow transition on hover | PARTIAL | `StatCard`, `CurrentFocusCard`, `HobbyPipeline`: VERIFIED. `RecentActivityFeed` populated branch (line 59) and `ArmyReadinessCard` populated branch (line 85): MISSING hover shadow |
| 6 | Loading skeleton FactionCards match new larger card dimensions | VERIFIED | `DashboardPage.tsx` line 172: `className="h-32 w-[220px]"` (updated from `h-28 w-[180px]`) |

**Score:** 5/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/dashboard/FactionSummaryCard.tsx` | VIS-01 top band, active glow, enlarged card, Circle icon | VERIFIED | All required patterns present: `overflow-hidden`, `min-w-[220px]`, `aria-hidden="true"` band div, `backgroundColor: stat.faction.color_theme`, `bg-faction-accent/10`, `ring-2 ring-faction-accent`, `hover:shadow-md`, `<Circle`, `mt-2`, `py-6`; no Star, no `border-l-4`, no `borderLeftColor` |
| `src/features/dashboard/DashboardPage.tsx` | VIS-02 hero gradient wrapper + VIS-01 skeleton update | VERIFIED | Contains `activeFactionHex` in destructure and in gradient string; `radial-gradient(ellipse at 50% 0%`; skeleton updated to `h-32 w-[220px]` |
| `src/features/dashboard/StatCard.tsx` | VIS-03 hover shadow transition | VERIFIED | Line 71: `transition-shadow duration-150 hover:shadow-md` in `baseClassName`; no `hover:bg-muted/50` |
| `src/features/dashboard/CurrentFocusCard.tsx` | VIS-03 hover shadow on both branches | VERIFIED | Empty branch (line 34) and active branch (line 50): both have `transition-shadow duration-150 hover:shadow-md` |
| `src/features/dashboard/HobbyPipeline.tsx` | VIS-03 hover shadow transition | VERIFIED | Line 41: Card has `transition-shadow duration-150 hover:shadow-md` |
| `src/features/dashboard/RecentActivityFeed.tsx` | VIS-03 hover shadow on both branches | STUB | Empty branch (line 47): VERIFIED. Populated branch (line 59): Card has `shadow-sm px-6 py-6` with no `transition-shadow` or `hover:shadow-md` |
| `src/features/dashboard/ArmyReadinessCard.tsx` | VIS-03 hover shadow on all 3 branches | PARTIAL | Loading (line 37) and empty (line 55): VERIFIED. Populated (line 85): div has `shadow-sm` only, missing `transition-shadow duration-150 hover:shadow-md` |
| `tests/dashboard/FactionSummaryCard.test.tsx` | VIS-01 test stubs | VERIFIED | 6 test cases covering top band, min-w-[220px], Star absence, active glow, hover shadow, Circle aria-label |
| `tests/dashboard/DashboardPage.test.tsx` | VIS-02 hero gradient assertion | VERIFIED | Lines 307-325: test asserts `[style*='radial-gradient']` element exists with `col-span-full` class |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `FactionSummaryCard.tsx` | `lucide-react` Circle | `import { Circle }` | WIRED | Line 2: `import { Circle } from "lucide-react"` — Star fully removed |
| `DashboardPage.tsx` | `useActiveFaction` context | `activeFactionHex` destructuring | WIRED | Line 61: `const { activeFactionId, setActiveFaction, activeFactionHex } = useActiveFaction()` — used in gradient at line 262 |
| `FactionSummaryCard.tsx` | `tests/dashboard/FactionSummaryCard.test.tsx` | VIS-01 test assertions | WIRED | Test imports and renders component; 6 assertions targeting the actual class strings present in implementation |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| VIS-01 | 34-00-PLAN, 34-01-PLAN | FactionSummaryCard upgraded: larger cards, dominant accent color band, clear active/focus indicator | SATISFIED | Top band div, `min-w-[220px]`, Circle icon, `bg-faction-accent/10` + `ring-2` + `shadow-md` active glow all present in `FactionSummaryCard.tsx` |
| VIS-02 | 34-00-PLAN, 34-01-PLAN | Dashboard hero area has premium visual depth with subtle radial gradient background | SATISFIED | `DashboardPage.tsx` wraps PageHeader + StatCards in gradient div using `activeFactionHex` |
| VIS-03 | 34-01-PLAN | Card surfaces use elevated/hover hierarchy (shadow transitions) | PARTIALLY BLOCKED | 4 of 6 card types complete; `RecentActivityFeed` (populated branch) and `ArmyReadinessCard` (populated branch) missing `hover:shadow-md` |

**REQUIREMENTS.md traceability check:** VIS-01, VIS-02, VIS-03 are all mapped to Phase 34 in REQUIREMENTS.md (lines 94-96). No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/features/dashboard/RecentActivityFeed.tsx` | 59 | Populated-state Card missing `hover:shadow-md` while empty-state Card has it | Warning | Inconsistent shadow behavior — the component behaves differently once it has data, breaking VIS-03 for the common case |
| `src/features/dashboard/ArmyReadinessCard.tsx` | 85 | Populated-state div missing `hover:shadow-md` while loading and empty divs have it | Warning | Same inconsistency pattern — shadow treatment disappears precisely when the card shows meaningful data |

### Human Verification Required

#### 1. FactionSummaryCard Visual Quality (VIS-01)

**Test:** Run `pnpm tauri dev`, navigate to Dashboard, look at the By Faction section
**Expected:** Each card has a clear 8px color band at the top (not a left border), cards are wider than before, clicking the small dot in the top-right toggles active state with a visible tinted + ringed + elevated card, inactive cards are visually plain
**Why human:** CSS class presence verified but rendered appearance, color band prominence, and glow quality require visual inspection

#### 2. Hero Gradient Depth (VIS-02)

**Test:** With the app running, observe the dashboard header area (title + stat cards region)
**Expected:** A very subtle faction-colored radial glow behind the PageHeader and StatCards; switching active faction updates the glow color; gradient does not obscure text or numbers
**Why human:** Inline style gradient renders correctly per code but perceived subtlety and readability in context require visual confirmation

#### 3. Card Hover Transition Feel (VIS-03)

**Test:** Hover slowly over each dashboard card type in the running app
**Expected:** All cards show a smooth 150ms shadow deepening. If VIS-03 gap is fixed, this should include RecentActivityFeed and ArmyReadinessCard populated states too
**Why human:** CSS `transition-shadow duration-150` is present in code; perceived smoothness requires human testing

### Gaps Summary

Two branches in VIS-03 card updates were missed during implementation. The pattern is consistent across both: empty/loading state received the hover shadow treatment but the populated (data-bearing) state was skipped. Specifically:

- `RecentActivityFeed.tsx` line 59: The `Card` rendered when `events.length > 0` has `shadow-sm px-6 py-6` but no `transition-shadow duration-150 hover:shadow-md`. This is the state users see whenever there is any activity — the most common case.

- `ArmyReadinessCard.tsx` line 85: The `div` rendered in the populated return (when `factions && factions.length > 0`) has `rounded-lg border border-border/60 bg-card p-4 shadow-sm` but no `transition-shadow duration-150 hover:shadow-md`. Again, this is the normal operating state.

Both fixes are trivially small (add two CSS utility classes). They do not affect layout, wiring, or tests — just the hover shadow behavior on the two most-used render branches of these components.

---

_Verified: 2026-05-06T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
