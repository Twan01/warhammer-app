# Phase 120: UI Wiring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 120-UI Wiring
**Areas discussed:** Game Day Stratagems Display, Rules Hub Stratagems Tab, Enhancement Picker Migration, Detachment Picker Wiring, PlaybookTab Detachment Abilities, Query Layer & Hooks Architecture, HTML Rendering
**Mode:** --auto (all decisions auto-selected)

---

## Game Day Stratagems Display

| Option | Description | Selected |
|--------|-------------|----------|
| Group by battle phase | Use `phase` column matching existing collapsible tabs | [auto] |
| Flat list | Show all stratagems in a single scrollable list | |

**Auto-selected:** Group by battle phase (recommended default — matches existing StrategemsTab.tsx structure)

| Option | Description | Selected |
|--------|-------------|----------|
| Filter by detachment + universals | Show detachment-specific + universal/core stratagems | [auto] |
| Show all faction stratagems | Show every stratagem for the faction regardless of detachment | |

**Auto-selected:** Filter by detachment + universals (recommended default — contextual to army list)

---

## Rules Hub Stratagems Tab

| Option | Description | Selected |
|--------|-------------|----------|
| Faction + search + detachment filter | Full filtering consistent with other Rules Hub tabs | [auto] |
| Faction + search only | Simpler filtering without detachment dropdown | |

**Auto-selected:** Faction + search + detachment filter (recommended default — consistent with existing tabs)

---

## Enhancement Picker Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Replace synced_enhancements | Rewire to udb_enhancements as sole source | [auto] |
| Keep dual sources | Query both tables with fallback | |

**Auto-selected:** Replace synced_enhancements (recommended default — BSData being eliminated)

| Option | Description | Selected |
|--------|-------------|----------|
| Filter by detachment | Show only enhancements for the selected detachment | [auto] |
| Show all faction enhancements | Show every enhancement for the faction | |

**Auto-selected:** Filter by detachment (recommended default — enhancements are detachment-specific)

---

## Detachment Picker Wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Query udb_detachments by faction | Use canonical database as source | [auto] |

**Auto-selected:** Query udb_detachments by faction (recommended default — only viable option)

---

## PlaybookTab Detachment Abilities

| Option | Description | Selected |
|--------|-------------|----------|
| New collapsible section after Rules | Add dedicated section for detachment abilities | [auto] |
| Inline with existing Rules section | Merge into the existing rules display | |

**Auto-selected:** New collapsible section after Rules (recommended default — cleaner separation)

---

## Query Layer & Hooks Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Single udbGameData.ts file | All game data queries in one file | [auto] |
| Separate files per entity | One file each for stratagems, enhancements, detachments | |

**Auto-selected:** Single udbGameData.ts file (recommended default — tightly related entities)

---

## HTML Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| dangerouslySetInnerHTML wrapper | Consistent with existing datasheet rendering | [auto] |
| Parse and render as React elements | Convert HTML to React components | |

**Auto-selected:** dangerouslySetInnerHTML wrapper (recommended default — consistent with existing patterns)

---

## Claude's Discretion

- React Query key naming conventions for new hooks
- Whether to create shared vs separate card components
- Sorting within phase groups
- Empty state messaging
- Whether to add Detachments tab to Rules Hub

## Deferred Ideas

None — discussion stayed within phase scope
