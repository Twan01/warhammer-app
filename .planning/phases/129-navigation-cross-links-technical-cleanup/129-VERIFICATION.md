---
phase: 129-navigation-cross-links-technical-cleanup
verified: 2026-06-12T00:00:00Z
status: passed
human_verified: 2026-06-12T10:30:00Z
human_verified_result: "7/7 passed in live app (pnpm tauri dev). NAV-05 collapsed dividers fixed during verification (border-border/40 → h-px bg-border)."
score: 11/11 must-haves verified + 7/7 human-verified
overrides_applied: 0
human_verification:
  - test: "Painting Mode exit returns to origin — navigate from /collection, open unit, click paint, then exit Painting Mode"
    expected: "Browser navigates back to /collection not to /"
    why_human: "Runtime navigation behavior; grep confirms wiring but can't simulate URL param traversal in jsdom"
  - test: "Escape key in Painting Mode returns to origin page"
    expected: "Pressing Escape navigates back to the page that launched Painting Mode"
    why_human: "Hotkey + runtime navigation; hotkey handler calls handleExit which uses returnTo param"
  - test: "Game Day sidebar item highlights for both /game-day and /game-day/:id"
    expected: "Sidebar Game Day item is visually active on both the index page and a detail page"
    why_human: "NavItem active-state logic is a runtime CSS class; requires visual confirmation"
  - test: "Collapsed sidebar renders dividers between groups without rendering them in expanded mode"
    expected: "Three thin lines visible between Command/Workshop, Workshop/Play, Play/Management when sidebar is collapsed; no dividers in expanded mode"
    why_human: "CSS-conditional rendering based on collapsed state; visual confirmation required"
  - test: "Sidebar collapse/expand animation has no text snap"
    expected: "Width transition animates smoothly; text labels do not briefly wrap during animation"
    why_human: "CSS animation quality; subjective visual check"
  - test: "UnitDetailSheet shows 'View Datasheet' for units with udb_unit_id and hides it for unlinked units"
    expected: "Linked unit: ghost button with BookMarked icon appears. Unlinked unit: button absent."
    why_human: "Conditional rendering based on DB data; requires app + collection with mixed linked/unlinked units"
  - test: "Battle Log army list name is a clickable link that navigates to army list detail"
    expected: "Clicking army list name in a battle log row opens /army-lists/:id; clicking does not collapse/expand the row"
    why_human: "stopPropagation and navigation are wired correctly in code but require runtime interaction to confirm"
---

# Phase 129: Navigation Cross-Links Technical Cleanup — Verification Report

**Phase Goal:** Navigation improvements, cross-page links, sidebar fixes, and dead code cleanup (final phase of v0.5.2 UX Polish & Consistency milestone)
**Verified:** 2026-06-12
**Status:** HUMAN NEEDED (all automated checks passed; runtime UI behaviors need human confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Painting Mode exit reads `returnTo` and navigates there; falls back to `/` if absent | VERIFIED | `page.tsx` line 114: `const target = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/"` |
| 2 | Every entry point passes current pathname as `returnTo` search param | VERIFIED | AppliedRecipesTab line 82, KanbanBoard line 95, RecipeDetailSheet line 319, DashboardPage line 364, NextPaintingActionCard line 67 — all confirmed |
| 3 | `paintingModeRoute` has `validateSearch` with `returnTo: z.string().optional()` | VERIFIED | `router.tsx` line 220: `validateSearch: z.object({ returnTo: z.string().optional() })` |
| 4 | UnitDetailSheet has "View Datasheet" ghost button conditional on `udb_unit_id` | VERIFIED | `UnitDetailSheet.tsx` line 106: `{unit.udb_unit_id && (` wrapping BookMarked button with navigate to `/unit-database` |
| 5 | Rules Hub has "Browse Units" link to `/unit-database` | VERIFIED | `RulesHubPage.tsx` line 115: `<Link to="/unit-database">` with "Browse Units" text |
| 6 | Unit Database has "View Rules" link to `/rules-hub` | VERIFIED | `DatabaseBrowserPage.tsx` line 199: `<Link to="/rules-hub">` with "View Rules" text |
| 7 | Battle Log entries link to the army list used | VERIFIED | `BattleLogRow.tsx` lines 88–95: `<Link to="/army-lists/$listId">` conditional on `armyListName && log.army_list_id != null` with `onClick stopPropagation` |
| 8 | `ArmyListDetailSheet.tsx` is deleted | VERIFIED | `Glob` returns no results; no `import.*ArmyListDetailSheet` found in `src/` |
| 9 | `armyListDetailReducer.ts` exports reducer, state type, action union, initial state | VERIFIED | File exists; exports `DetailPortalState`, `initialDetailPortalState`, `detailPortalReducer`; `ArmyListDetailPage.tsx` line 82 imports from `./armyListDetailReducer` |
| 10 | RecipeCard is wrapped in `React.memo` | VERIFIED | `RecipeCard.tsx` line 1: `import { memo }` line 91: `export const RecipeCard = memo(function RecipeCard(` |
| 11 | Game Day in PLAY_NAV with `/game-day` index route; collapsed dividers; `overflow-hidden` on aside | VERIFIED | `AppSidebar.tsx` PLAY_NAV line 52: `{ to: "/game-day", label: "Game Day", icon: Sword }`; three `{collapsed && <div className="my-1 border-b border-border/40" />}` at lines 171, 189, 207; `aside` className line 71 contains `overflow-hidden transition-[width] duration-200 ease-in-out`; `router.tsx` line 182: `gameDayIndexRoute` at `/game-day` in routeTree |

**Score: 11/11 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/router.tsx` | `paintingModeRoute` with `validateSearch` for `returnTo`; `gameDayIndexRoute` at `/game-day` | VERIFIED | Both present at lines 217–222 and 182–193 |
| `src/app/painting-mode/page.tsx` | `handleExit` reading `returnTo` from search | VERIFIED | `paintingModeRoute.useSearch()` at line 36; `handleExit` at lines 113–116 |
| `src/features/units/AppliedRecipesTab.tsx` | `returnTo: location.pathname` in navigate call | VERIFIED | Line 82 |
| `src/features/dashboard/DashboardPage.tsx` | `returnTo` in navigate call | VERIFIED | Line 364 |
| `src/features/dashboard/NextPaintingActionCard.tsx` | `search={{ returnTo: "/" }}` on Link | VERIFIED | Line 67 |
| `src/features/painting-projects/KanbanBoard.tsx` | `returnTo: location.pathname` in navigate call | VERIFIED | Line 95 |
| `src/features/recipes/RecipeDetailSheet.tsx` | `returnTo: location.pathname` in navigate call | VERIFIED | Line 319 |
| `src/features/units/UnitDetailSheet.tsx` | "View Datasheet" button conditional on `udb_unit_id` | VERIFIED | Lines 106–118 |
| `src/features/battle-log/BattleLogRow.tsx` | Army list name as Link with stopPropagation | VERIFIED | Lines 86–95 |
| `src/features/rules-hub/RulesHubPage.tsx` | "Browse Units" link to `/unit-database` | VERIFIED | Line 115–117 |
| `src/features/unit-database/DatabaseBrowserPage.tsx` | "View Rules" link to `/rules-hub` | VERIFIED | Lines 199–201 |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | DELETED — confirmed orphaned | VERIFIED | File does not exist; no live imports found |
| `src/features/army-lists/armyListDetailReducer.ts` | Exports reducer, state, action types, initial state | VERIFIED | Exports `DetailPortalState`, `initialDetailPortalState`, `detailPortalReducer` |
| `src/features/recipes/RecipeCard.tsx` | `memo(function RecipeCard(...))` | VERIFIED | Lines 1 and 91 |
| `src/components/common/AppSidebar.tsx` | Game Day in PLAY_NAV, collapsed dividers, `overflow-hidden` | VERIFIED | Lines 52, 71, 171, 189, 207 |
| `src/features/painting-mode/StepFocalView.tsx` | "Esc to exit" text in active step view | VERIFIED | Line 181: `<p className="text-xs text-muted-foreground text-center mt-2">Esc to exit</p>` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AppliedRecipesTab.tsx` | `paintingModeRoute` | `search: { returnTo: location.pathname }` | WIRED | Line 82 confirmed |
| `NextPaintingActionCard.tsx` | `paintingModeRoute` | `search={{ returnTo: "/" }}` on Link | WIRED | Line 67 confirmed |
| `KanbanBoard.tsx` | `paintingModeRoute` | `search: { returnTo: location.pathname }` | WIRED | Line 95 confirmed |
| `RecipeDetailSheet.tsx` | `paintingModeRoute` | `search: { returnTo: location.pathname }` | WIRED | Line 319 confirmed |
| `DashboardPage.tsx` | `paintingModeRoute` | `search: { returnTo: "/" }` | WIRED | Line 364 confirmed |
| `UnitDetailSheet.tsx` | `/unit-database` | `navigate` inside `unit.udb_unit_id` guard | WIRED | Lines 106–113 |
| `BattleLogRow.tsx` | `/army-lists/$listId` | `<Link>` with `stopPropagation` | WIRED | Lines 88–92 |
| `RulesHubPage.tsx` | `/unit-database` | inline `<Link>` in header | WIRED | Lines 115–117 |
| `DatabaseBrowserPage.tsx` | `/rules-hub` | inline `<Link>` in header | WIRED | Lines 199–201 |
| `ArmyListDetailPage.tsx` | `armyListDetailReducer.ts` | `import { detailPortalReducer, initialDetailPortalState }` | WIRED | Line 82 |
| `AppSidebar.tsx` | `gameDayIndexRoute` | `{ to: "/game-day" }` in PLAY_NAV | WIRED | Line 52 |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase delivers navigation wiring and UI cross-links, not data-rendering components with server-state dependencies.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `paintingModeRoute.validateSearch` parses `returnTo` | grep on router.tsx | `validateSearch: z.object({ returnTo: z.string().optional() })` found | PASS |
| `handleExit` uses `returnTo` with fallback | grep on page.tsx | `const target = returnTo && returnTo.startsWith("/") ...` found | PASS |
| `ArmyListDetailSheet.tsx` absent | Glob search | No file found | PASS |
| `armyListDetailReducer.ts` exports found | grep on file | `DetailPortalState`, `initialDetailPortalState`, `detailPortalReducer` exported | PASS |
| `RecipeCard` memo wrapper | grep on RecipeCard.tsx | `export const RecipeCard = memo(function RecipeCard(` found | PASS |
| `gameDayIndexRoute` registered in routeTree | read router.tsx | Present at line 244 in `layoutRoute.addChildren([...])` | PASS |
| Collapsed dividers gated on `collapsed` | read AppSidebar.tsx | Three `{collapsed && <div className="my-1 border-b border-border/40" />}` at lines 171, 189, 207 | PASS |
| `overflow-hidden` on aside | grep AppSidebar.tsx | Line 71 contains `overflow-hidden` | PASS |
| "Esc to exit" in active step view | grep StepFocalView.tsx | Line 181 confirmed | PASS |

---

### Probe Execution

No probe scripts declared or found for this phase. Step 7c: SKIPPED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| NAV-01 | 129-01 | Painting Mode exit returns to originating page | SATISFIED | `returnTo` search param wired on all 5 entry points; `handleExit` reads param with `/` fallback |
| NAV-02 | 129-02 | Collection UnitDetailSheet has "View Datasheet" link to Unit Database | SATISFIED | Conditional `BookMarked` button in `UnitDetailSheet.tsx` gated on `unit.udb_unit_id` |
| NAV-03 | 129-02 | Rules Hub and Unit Database have cross-links to each other | SATISFIED | "Browse Units" in RulesHubPage; "View Rules" in DatabaseBrowserPage |
| NAV-04 | 129-04 | Game Day page highlights correct sidebar item | SATISFIED (human verify) | PLAY_NAV entry `{ to: "/game-day" }` present; NavItem `startsWith` logic covers both routes |
| NAV-05 | 129-04 | Collapsed sidebar shows group dividers | SATISFIED | Three collapsed-only `border-b border-border/40` dividers in AppSidebar |
| NAV-06 | 129-02 | Battle Log entries link to the army list used | SATISFIED | `<Link to="/army-lists/$listId">` with conditional render + stopPropagation in BattleLogRow |
| NAV-07 | 129-03 | ArmyListDetailSheet dead code deleted | SATISFIED | File does not exist; zero live imports in `src/` |
| NAV-08 | 129-03 | RecipeCard wrapped in React.memo | SATISFIED | `export const RecipeCard = memo(function RecipeCard(...)` confirmed |
| NAV-09 | 129-03 | ArmyListDetailPage reducer extracted to separate file | SATISFIED | `armyListDetailReducer.ts` created; ArmyListDetailPage imports from it |
| NAV-10 | 129-04 | Sidebar collapse has CSS transition | SATISFIED | `transition-[width] duration-200 ease-in-out overflow-hidden` on aside |
| NAV-11 | 129-03 | Painting Mode Escape key hint visible in StepFocalView | SATISFIED | Line 181 of StepFocalView.tsx confirmed |

All 11 requirements satisfied. No orphaned requirements.

---

### Anti-Patterns Found

No TBD, FIXME, or XXX markers found in any files modified by this phase.

No stub patterns detected. All new code renders real data or performs real navigation.

---

### Human Verification Required

#### 1. Painting Mode exit returns to origin page

**Test:** Open app, go to /collection, open a unit detail sheet that has an applied recipe, click the paint button to launch Painting Mode, then exit via the Exit button.
**Expected:** Browser navigates back to /collection (or wherever you launched from), not to /.
**Why human:** Runtime URL param traversal — grep confirms wiring but can't simulate navigation in jsdom.

#### 2. Escape key in Painting Mode returns to origin

**Test:** Same as above but exit via the Escape key instead of the Exit button.
**Expected:** Same origin-return behavior.
**Why human:** Hotkey handler delegates to the same `handleExit`; needs runtime confirmation.

#### 3. Game Day sidebar item highlights correctly

**Test:** Click "Game Day" in the sidebar to go to /game-day (index). Then navigate to an army list and start a Game Day session (/game-day/:id).
**Expected:** "Game Day" sidebar item is visually highlighted (active state) in both cases.
**Why human:** NavItem active-state CSS class is a runtime DOM condition.

#### 4. Collapsed sidebar dividers visible / hidden

**Test:** Expand the sidebar (default state) — verify no dividers between groups. Collapse it — verify three thin horizontal lines appear between Command/Workshop, Workshop/Play, and Play/Management.
**Expected:** Dividers present only in collapsed mode.
**Why human:** Conditional rendering requires visual inspection.

#### 5. Sidebar collapse animation smoothness

**Test:** Click the collapse toggle several times quickly.
**Expected:** Sidebar width animates smoothly at 200ms; text labels fade or disappear without wrapping mid-animation.
**Why human:** CSS animation quality is subjective and cannot be verified by grep.

#### 6. UnitDetailSheet conditional "View Datasheet" button

**Test:** Open a unit that has a linked `udb_unit_id` (linked to Unit Database). Then open a unit without a link.
**Expected:** Linked unit shows "View Datasheet" button with BookMarked icon. Unlinked unit shows no such button.
**Why human:** Conditional rendering based on actual database data; needs live app with both unit types.

#### 7. Battle Log army list link behavior

**Test:** Open Battle Log, find a battle with an associated army list. Click the army list name text.
**Expected:** Navigates to /army-lists/:id. The row does NOT toggle expand/collapse on the click.
**Why human:** `stopPropagation` correctness requires interactive verification.

---

### Human Verification Results — 2026-06-12 (live app, `pnpm tauri dev`)

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Painting Mode exit returns to origin | ✅ PASS | Exit from Collection & Recipe both return to origin |
| 2 | Escape + not-found "Go Back" return to origin | ✅ PASS | Includes FIX-02 fix: "Go Back" now routes through handleExit → resolveReturnTo |
| 3 | Game Day sidebar highlight on index & detail | ✅ PASS | Both `/game-day` and `/game-day/:id` highlight Game Day; intermediate `/army-lists` correctly highlights Army Lists |
| 4 | Collapsed sidebar dividers visible | ✅ PASS (after fix) | `border-b border-border/40` was invisible at 40% opacity; replaced with `h-px bg-border` solid line |
| 5 | Sidebar collapse animation smooth | ✅ PASS | Smooth 200ms width transition, no text snap |
| 6 | UnitDetailSheet "View Datasheet" conditional | ✅ PASS | Button present for linked units (subtle ghost button below faction badge) |
| 7 | Battle Log → army list link (stopPropagation) | ✅ PASS | Navigates to detail without toggling row expand |

### Gaps Summary

No gaps. All 11 must-haves VERIFIED in code; all 7 runtime items HUMAN-VERIFIED PASS in the
live app on 2026-06-12. One issue surfaced and fixed during verification: NAV-05 collapsed
dividers were rendering but invisible (40%-opacity dark border on dark card) — fixed to a
solid `h-px bg-border` line, committed, and re-confirmed visible.

---

_Verified: 2026-06-12_
_Verifier: Claude (gsd-verifier)_
