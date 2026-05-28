# Phase 101: Battle-Readiness Pure Function & Unit Picker - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 101-Battle-Readiness Pure Function & Unit Picker
**Areas discussed:** Readiness definition, Badge presentation, Points-remaining display, Affordability filter UX
**Mode:** --auto (all decisions auto-selected)

---

## Readiness Definition

| Option | Description | Selected |
|--------|-------------|----------|
| Composite check (painting + assembly + basing + varnish) | battleReady = all 4 fields pass; pure function in src/lib/ | :white_check_mark: |
| Simplified (painting only) | Match existing dashboard pattern: status_painting = 'Completed' only | |
| Tiered readiness levels | Multiple tiers (table-ready, tournament-ready, display-ready) | |

**Auto-selected:** Composite check — aligns with Phase 100's expanded status fields and provides the most accurate readiness signal.
**Notes:** The existing `getArmyReadinessByFaction()` only checks painting status; Phase 100 added assembly/basing/varnish auto-derivation, so the canonical readiness function should use all 4.

---

## Badge Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Compact multi-indicator | Painting status text badge + colored dots for assembly/basing/varnish | :white_check_mark: |
| Single composite badge | One badge showing overall readiness tier (e.g., "Battle Ready", "WIP") | |
| Expanded detail row | Multi-line row showing all status fields explicitly | |

**Auto-selected:** Compact multi-indicator — keeps picker rows scannable while showing granular status. Collapses to single "Battle Ready" badge when all 4 pass.
**Notes:** Reuses existing Badge component (variant="secondary" for status text, custom dots for booleans).

---

## Points-Remaining Display

| Option | Description | Selected |
|--------|-------------|----------|
| Header budget display + per-row points | Picker header shows remaining pts; each row shows unit effective_points | :white_check_mark: |
| Per-row only | Show points per unit but no header summary | |
| Footer summary | Points remaining shown at bottom of picker | |

**Auto-selected:** Header budget display + per-row points — most informative, matches ArmyListSummaryBar pattern.
**Notes:** Requires passing budget context from the list detail view to UnitPickerDialog.

---

## Affordability Filter

| Option | Description | Selected |
|--------|-------------|----------|
| Header toggle switch | "Fits budget" toggle next to budget display, default OFF | :white_check_mark: |
| Always-on filter | Auto-hide units exceeding budget with no toggle | |
| Sort-only | Sort affordable units to top but don't hide others | |

**Auto-selected:** Header toggle switch — gives user control, default OFF preserves existing browse-all behavior.
**Notes:** Toggle and budget display hidden when no budget context is available (graceful degradation).

---

## Claude's Discretion

- Visual implementation of readiness dots (Lucide icons vs CSS)
- Whether to reuse useUnitsWithPoints() or compute effective_points differently
- Test coverage strategy for the pure function

## Deferred Ideas

None.
