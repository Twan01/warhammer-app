# Phase 65: Points Import Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 65-points-import-pipeline
**Mode:** --auto (fully autonomous decisions)
**Areas discussed:** Points data source & storage, COALESCE chain order, Freshness badge approach, Delta detection strategy, COALESCE update scope

---

## Points Data Source & Storage

| Option | Description | Selected |
|--------|-------------|----------|
| rules.db for synced points | Points from Wahapedia go in rules.db (refreshed on every sync), import history in hobbyforge.db | ✓ |
| hobbyforge.db for everything | Per original design doc — all points data survives re-syncs | |
| Separate user CSV import | Standalone import flow independent of Wahapedia sync | |

**Auto-selected:** rules.db for synced points (recommended default — aligns with roadmap SC#1)
**Notes:** Design doc (`points-import-design.md`) put points in hobbyforge.db for a separate CSV import flow. Roadmap evolved approach to "extend Wahapedia sync" — points are rules data that refresh on every sync. Import history stays in hobbyforge.db as audit data.

---

## COALESCE Chain Order

| Option | Description | Selected |
|--------|-------------|----------|
| alu > synced > uo > u > 0 | Official synced points override manual unit edits | ✓ |
| alu > uo > synced > u > 0 | Manual unit overrides override synced data | |

**Auto-selected:** alu > synced > uo > u > 0 (recommended default — per design doc)
**Notes:** Imported official points are more authoritative than manual unit-level overrides. Per-list overrides always win (explicit per-game intent).

---

## Freshness Badge Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse syncFreshness.ts | Points freshness = sync freshness (same pipeline) | ✓ |
| Separate points freshness | Dedicated freshness tracking for points vs rules sync | |

**Auto-selected:** Reuse syncFreshness.ts (recommended default — no new freshness system needed)
**Notes:** Since points flow through the same Wahapedia sync, sync freshness already covers points freshness.

---

## Delta Detection Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing snapshot/diff | Use rulesSnapshot + computeSyncDiff patterns | ✓ |
| Standalone delta computation | Separate pre/post comparison system for points | |

**Auto-selected:** Extend existing snapshot/diff (recommended default — consistent with established patterns)
**Notes:** Adds "Points Changes" section to existing sync diff display on RulesHubPage.

---

## COALESCE Update Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Army list queries only (3 sites) | getArmyListWithUnits + getArmyListReadiness (2 SUMs) | ✓ |
| All COALESCE queries including dashboard | Also update dashboard.ts collection-value queries | |

**Auto-selected:** Army list queries only (recommended default)
**Notes:** Dashboard stats use COALESCE(u.points, 0) for collection value — different concern from effective army list points.

---

## Claude's Discretion

- Schema choice: columns on existing datasheets table vs. separate datasheet_points table in rules.db
- Freshness badge visual treatment on army list cards
- Delta display format (summary counts vs. full unit-by-unit diff)
- Loading states for freshness badges
- Whether to show pre-sync confirmation dialog with estimated changes
