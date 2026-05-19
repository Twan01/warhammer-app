# Requirements: HobbyForge v0.2.15 — Painting Mode

**Defined:** 2026-05-19
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play"

## v0.2.15 Requirements

Requirements for Painting Mode. Each maps to roadmap phases.

### Data Layer

- [ ] **DL-01**: Atomic `completeStepWithSession` function wraps step progress upsert + session insert in a single BEGIN/COMMIT transaction
- [ ] **DL-02**: Section-aware step ordering derives first incomplete step using section order_index then step order_index
- [ ] **DL-03**: `useCompleteStep` mutation invalidates step progress, kanban enrichment, unit assignments, dashboard action, and workflow position cache keys
- [ ] **DL-04**: `usePaintingModeState` hook manages ordered step array, current step ID, and prev/next/jump navigation

### Step Execution

- [ ] **SE-01**: User sees current step with paint swatch, technique, tool, dilution, and time estimate without opening an editor
- [ ] **SE-02**: User can mark the current step as done with a single action
- [ ] **SE-03**: User can navigate to previous and next steps
- [ ] **SE-04**: User sees step position indicator (e.g. "Step 3 of 7") and current section name
- [ ] **SE-05**: User sees step reference photo prominently when one exists

### Section Progress

- [x] **SP-01**: User sees section list with completed/total step counts
- [x] **SP-02**: Current section is visually highlighted
- [x] **SP-03**: User can jump to any section or step from the section navigator
- [x] **SP-04**: Optional sections are visually distinct
- [ ] **SP-05**: Section shows completion acknowledgment when all steps are done

### Paint Readiness

- [x] **PR-01**: User sees paint availability status (all available / missing paints listed) at mode entry
- [x] **PR-02**: Missing paint does not block progress but shows a non-blocking warning
- [x] **PR-03**: Paintless steps are handled cleanly without false availability warnings

### Session Logging

- [ ] **SL-01**: User can open Log Session prefilled with current unit, recipe, section, and step
- [ ] **SL-02**: User can mark step done + log session in one atomic action (combined button)
- [ ] **SL-03**: Mark step done is also available as a standalone action without session logging

### Entry Points

- [ ] **EP-01**: User can open Painting Mode from Dashboard NextPaintingActionCard
- [ ] **EP-02**: User can open Painting Mode from CurrentFocusCard
- [ ] **EP-03**: User can open Painting Mode from Unit Detail / Applied Recipe panel
- [ ] **EP-04**: User can open Painting Mode from Painting Projects Kanban
- [ ] **EP-05**: User can open Painting Mode from Recipe Detail (when applied to a unit)
- [ ] **EP-06**: Empty/missing recipe states explain what to do next

### Presentation

- [ ] **PX-01**: Painting Mode uses a distraction-free layout with sidebar hidden and larger typography
- [ ] **PX-02**: Keyboard shortcut: Space marks step done
- [ ] **PX-03**: Keyboard shortcut: Arrow left/right navigates previous/next
- [ ] **PX-04**: Keyboard shortcut: Escape exits Painting Mode
- [ ] **PX-05**: Keyboard shortcuts are disabled when form inputs are focused
- [ ] **PX-06**: Time estimate displayed per step

### Tests

- [ ] **TS-01**: Test coverage for first incomplete step selection logic
- [ ] **TS-02**: Test coverage for mark step complete
- [ ] **TS-03**: Test coverage for previous/next navigation
- [ ] **TS-04**: Test coverage for optional sections handling
- [ ] **TS-05**: Test coverage for paintless steps
- [ ] **TS-06**: Test coverage for missing paint warning
- [ ] **TS-07**: Test coverage for session prefill values

## Future Requirements

### Deferred to v0.2.16+

- **PM-F01**: Batch painting mode — same step across multiple units simultaneously
- **PM-F02**: Per-model progress within a squad unit
- **PM-F03**: Voice control for hands-free operation

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI recipe generation | Deferred — not related to execution UX |
| Complex dependency graphs between steps | Over-engineering for linear recipes |
| Voice control | Keyboard shortcuts are the correct desktop solution |
| Mobile/tablet-specific redesign | Desktop-only app |
| Recipe editing within Painting Mode | Risk of saveRecipeGraph destroying progress; separate concern |
| Detached window / multi-window | Tauri IPC overhead for single-user app |
| Auto-advance on step completion | Users need to re-read completed steps |
| Built-in countdown timer | Painting times are imprecise estimates |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DL-01 | Phase 84 | Pending |
| DL-02 | Phase 84 | Pending |
| DL-03 | Phase 84 | Pending |
| DL-04 | Phase 84 | Pending |
| SE-01 | Phase 85 | Pending |
| SE-02 | Phase 85 | Pending |
| SE-03 | Phase 85 | Pending |
| SE-04 | Phase 85 | Pending |
| SE-05 | Phase 85 | Pending |
| SP-01 | Phase 85 | Complete |
| SP-02 | Phase 85 | Complete |
| SP-03 | Phase 85 | Complete |
| SP-04 | Phase 85 | Complete |
| SP-05 | Phase 86 | Pending |
| PR-01 | Phase 85 | Complete |
| PR-02 | Phase 85 | Complete |
| PR-03 | Phase 85 | Complete |
| SL-01 | Phase 87 | Pending |
| SL-02 | Phase 87 | Pending |
| SL-03 | Phase 87 | Pending |
| EP-01 | Phase 87 | Pending |
| EP-02 | Phase 87 | Pending |
| EP-03 | Phase 87 | Pending |
| EP-04 | Phase 87 | Pending |
| EP-05 | Phase 87 | Pending |
| EP-06 | Phase 87 | Pending |
| PX-01 | Phase 85 | Pending |
| PX-02 | Phase 86 | Pending |
| PX-03 | Phase 86 | Pending |
| PX-04 | Phase 86 | Pending |
| PX-05 | Phase 86 | Pending |
| PX-06 | Phase 86 | Pending |
| TS-01 | Phase 84 | Pending |
| TS-02 | Phase 84 | Pending |
| TS-03 | Phase 84 | Pending |
| TS-04 | Phase 88 | Pending |
| TS-05 | Phase 88 | Pending |
| TS-06 | Phase 88 | Pending |
| TS-07 | Phase 88 | Pending |

**Coverage:**
- v0.2.15 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-19*
*Last updated: 2026-05-19 after roadmap creation*
