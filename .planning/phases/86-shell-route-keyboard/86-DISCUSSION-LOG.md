# Phase 86: Shell, Route & Keyboard Shortcuts - Discussion Log

**Date:** 2026-05-19
**Mode:** --auto (fully autonomous)
**Duration:** Single pass

## Discussion Summary

All gray areas auto-resolved using recommended defaults. No user interaction required.

## Areas Discussed

### 1. Route Architecture
- **Options presented:** (A) Dual layout roots — bareRootRoute without sidebar, (B) Conditional sidebar — flag to hide
- **Selected:** (A) Dual layout roots [auto — recommended]
- **Rationale:** TanStack Router supports multiple layout routes cleanly. Keeps sidebar out of render tree entirely, no conditional logic. Matches STATE.md architectural intent.

### 2. Section Completion Acknowledgment (SP-05)
- **Options presented:** (A) Inline checkmark + muted style, (B) Toast notification, (C) Animated badge transition
- **Selected:** (A) Inline checkmark + muted style [auto — recommended]
- **Rationale:** At the painting desk, the painter is already looking at the section navigator. Non-intrusive visual feedback. Toasts would be distracting during focused painting.

### 3. Exit Navigation Target (PX-04)
- **Options presented:** (A) Browser history back, (B) Fixed destination
- **Selected:** (A) Browser history back [auto — recommended]
- **Rationale:** Phase 87 adds six entry points. History.back() naturally returns to the origin surface. Fixed destination would break flow from most entry points.

### 4. Keyboard Shortcut Discoverability
- **Options presented:** (A) Silent shortcuts, no legend, (B) Subtle kbd hints on buttons
- **Selected:** (B) Subtle kbd hints on buttons [auto — recommended]
- **Rationale:** Desktop app users expect discoverability. Zero-cost teaching mechanism. Small badges don't clutter the distraction-free layout.

## Deferred Ideas

None.

## Claude's Discretion Items

- ActiveFactionProvider inclusion in bareRootRoute
- react-hotkeys-hook API pattern (useHotkeys vs individual calls)
- preventDefault for Space/Arrow browser defaults
- Loading/error states for route-level assignment lookup

---

*Generated: 2026-05-19 (auto mode)*
