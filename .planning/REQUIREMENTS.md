# Requirements: HobbyForge

**Defined:** 2026-06-11
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play"

## v0.5.2 Requirements

Requirements for UX Polish & Consistency milestone. Each maps to roadmap phases.

### Critical Fixes & Dead Ends

- [x] **FIX-01**: Painting Mode completion screen has an exit button and visible Escape hint — no dead end
- [x] **FIX-02**: Painting Mode "assignment not found" error shows a back button and working Escape key
- [x] **FIX-03**: Notes save on Army List only fires toast when mutation actually runs (no no-op success toast)
- [x] **FIX-04**: RecipesPage shows error state when query fails (not empty state)
- [x] **FIX-05**: Settings and Data Health page headers use PageHeader with text-3xl (consistent with all other pages)
- [x] **FIX-06**: `--battle-gold` and other dark-only tokens have light-mode fallbacks in `:root`
- [x] **FIX-07**: Goal delete fires only one error toast (deduplicate hook and component catch)
- [x] **FIX-08**: Enhancement assign/remove and leader attach/detach show success toasts
- [x] **FIX-09**: Rules favorites optimistic rollback shows error toast on failure
- [x] **FIX-10**: ArmyListDetailPage distinguishes loading from not-found (no infinite skeleton for deleted lists)
- [x] **FIX-11**: Custom scrollbar styling matches dark zinc theme (thin, subtle, all scrollable areas)

### Visual Consistency

- [ ] **VIS-01**: Rules Hub and Unit Database use PageHeader with border-b separator and subtitle
- [ ] **VIS-02**: Factions page PageHeader includes subtitle prop
- [ ] **VIS-03**: Section heading hierarchy standardized (one pattern for h2 across Dashboard, Goals, Spending, Data Health)
- [ ] **VIS-04**: Spending page uses standard p-6 gap-6 (not p-8 gap-12)
- [ ] **VIS-05**: Paints filtered empty state uses icon-pill pattern (consistent with other empty states)
- [ ] **VIS-06**: RecipeCard and SectionedTimeline status dots use theme tokens (not hardcoded hex)
- [ ] **VIS-07**: Dashboard button icons use consistent h-4 w-4 + mr-2 pattern
- [ ] **VIS-08**: FactionsEmptyState body text includes max-w-xs constraint
- [ ] **VIS-09**: Data Health and Settings use flex flex-col gap-6 (not space-y-6) for consistency

### Feedback & Form UX

- [ ] **FBK-01**: 4 delete dialogs (Faction, BattleLog, Recipe, Paint) show "Deleting..." pending text
- [ ] **FBK-02**: GameDayPage has isError handler with user-friendly message
- [ ] **FBK-03**: Spending error message uses text-destructive (not text-muted-foreground)
- [ ] **FBK-04**: All Sheet forms autoFocus on first input field when opened
- [ ] **FBK-05**: RuleNoteEditor auto-save shows subtle "Saved" indicator
- [ ] **FBK-06**: PlaybookTab disabled save button has tooltip explaining why
- [ ] **FBK-07**: PlaybookTab error state includes Retry button
- [ ] **FBK-08**: JournalTab session create shows success toast
- [ ] **FBK-09**: Snapshot delete uses toast.success (not neutral toast)
- [ ] **FBK-10**: staleTime: Infinity hooks also set gcTime: Infinity (cache not evicted after 10min)

### Navigation & Technical Polish

- [ ] **NAV-01**: Painting Mode exit returns to originating page (returnTo param) not always Dashboard
- [ ] **NAV-02**: Collection UnitDetailSheet has "View Datasheet" link to Unit Database
- [ ] **NAV-03**: Rules Hub and Unit Database have cross-links to each other
- [ ] **NAV-04**: Game Day page highlights correct sidebar item
- [ ] **NAV-05**: Collapsed sidebar shows group dividers between Command/Workshop/Play/Management
- [ ] **NAV-06**: Battle Log entries link to the army list used
- [ ] **NAV-07**: ArmyListDetailSheet dead code deleted (~340 lines)
- [ ] **NAV-08**: RecipeCard wrapped in React.memo to prevent O(N) re-renders on search
- [ ] **NAV-09**: ArmyListDetailPage reducer extracted to separate file
- [ ] **NAV-10**: Sidebar collapse has CSS transition (not instant snap)
- [ ] **NAV-11**: Painting Mode Escape key hint visible in StepFocalView

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Future Polish

- **FUT-01**: Global Ctrl+K keyboard shortcut for Quick Add
- **FUT-02**: Ctrl+B keyboard shortcut for sidebar collapse toggle
- **FUT-03**: Page crossfade transition animations on route change
- **FUT-04**: Wishlist to Spending cross-link (needs product decision on strategy)
- **FUT-05**: Goals action CTAs pointing to tracked entities
- **FUT-06**: PageHeader `back` prop for consistent back-button pattern
- **FUT-07**: useDebounce shared hook extraction
- **FUT-08**: Delete dialog cancel label standardization ("Keep X" vs "Cancel")
- **FUT-09**: Dirty-state dismiss warning on Sheet forms (needs product decision)
- **FUT-10**: Unit Gallery virtualization for large collections

## Out of Scope

| Feature | Reason |
|---------|--------|
| New features / capabilities | This milestone is polish-only — no new functionality |
| Light mode full support | Dark-mode-first app; only fixing token fallbacks for safety |
| Mobile responsiveness | Desktop-only app, window min-size enforced |
| Accessibility audit (WCAG) | Separate milestone scope — would need screen reader testing |
| Database schema changes | No migrations in a polish milestone |
| Component library upgrades | shadcn/ui version is stable, no upgrade needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 126 | Complete |
| FIX-02 | Phase 126 | Complete |
| FIX-03 | Phase 126 | Complete |
| FIX-04 | Phase 126 | Complete |
| FIX-05 | Phase 126 | Complete |
| FIX-06 | Phase 126 | Complete |
| FIX-07 | Phase 126 | Pending |
| FIX-08 | Phase 126 | Pending |
| FIX-09 | Phase 126 | Pending |
| FIX-10 | Phase 126 | Complete |
| FIX-11 | Phase 126 | Complete |
| VIS-01 | Phase 127 | Pending |
| VIS-02 | Phase 127 | Pending |
| VIS-03 | Phase 127 | Pending |
| VIS-04 | Phase 127 | Pending |
| VIS-05 | Phase 127 | Pending |
| VIS-06 | Phase 127 | Pending |
| VIS-07 | Phase 127 | Pending |
| VIS-08 | Phase 127 | Pending |
| VIS-09 | Phase 127 | Pending |
| FBK-01 | Phase 128 | Pending |
| FBK-02 | Phase 128 | Pending |
| FBK-03 | Phase 128 | Pending |
| FBK-04 | Phase 128 | Pending |
| FBK-05 | Phase 128 | Pending |
| FBK-06 | Phase 128 | Pending |
| FBK-07 | Phase 128 | Pending |
| FBK-08 | Phase 128 | Pending |
| FBK-09 | Phase 128 | Pending |
| FBK-10 | Phase 128 | Pending |
| NAV-01 | Phase 129 | Pending |
| NAV-02 | Phase 129 | Pending |
| NAV-03 | Phase 129 | Pending |
| NAV-04 | Phase 129 | Pending |
| NAV-05 | Phase 129 | Pending |
| NAV-06 | Phase 129 | Pending |
| NAV-07 | Phase 129 | Pending |
| NAV-08 | Phase 129 | Pending |
| NAV-09 | Phase 129 | Pending |
| NAV-10 | Phase 129 | Pending |
| NAV-11 | Phase 129 | Pending |

**Coverage:**
- v0.5.2 requirements: 41 total
- Mapped to phases: 41/41
- Unmapped: 0

---
*Requirements defined: 2026-06-11*
*Last updated: 2026-06-11 after roadmap creation*
