---
phase: 116-pipeline-foundation
plan: "02"
subsystem: build-scripts
tags: [legends-filter, dedup, wahapedia, pipeline, data-quality]
dependency_graph:
  requires: [116-01]
  provides: [legends-filter, name-faction-dedup]
  affects: [unit-database-build, unit-database-update]
tech_stack:
  added: []
  patterns: [legends-filter, dedup-map]
key_files:
  created: []
  modified:
    - scripts/build-unit-db.ts
    - scripts/update-unit-database.ts
decisions:
  - "Dedup rebuilds validUnitIds from deduped set to ensure all downstream steps exclude duplicate unit IDs"
  - "isLegend check placed before factionIds validation — Legends units skipped regardless of faction validity"
  - "units array mutated in-place (length=0 + push) rather than reassignment to preserve existing references downstream"
metrics:
  duration: 10 min
  completed: "2026-06-04"
---

# Phase 116 Plan 02: Legends Filter & Dedup Summary

Legends unit filtering and name+faction deduplication added to both build scripts, ensuring deprecated Wahapedia units are excluded before any downstream parsing.

## What Was Built

Added PF-03 (Legends filter) and PF-04 (dedup with warning) to Step 3 of both build scripts. Legends units (legend="1" or "true") are now skipped before being added to validUnitIds, so all downstream steps (models, weapons, abilities, keywords) automatically exclude them. After Legends filtering, remaining name+faction duplicates are warned about via console.warn and removed from the unit set.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Legends filter and dedup to build-unit-db.ts | 08fa12d | scripts/build-unit-db.ts |
| 2 | Mirror Legends filter and dedup to update-unit-database.ts | 5f8e473 | scripts/update-unit-database.ts |

## Verification Results

- `node --experimental-strip-types scripts/build-unit-db.ts` completes: "Parsed 1701 units (0 Legends excluded, 10 duplicates discarded)"
- `node --experimental-strip-types scripts/update-unit-database.ts` completes: same output
- `pnpm build` passes without TypeScript errors
- BSData sub_faction assignment block unchanged in both scripts
- REQUIRED_CSVs array unchanged (6 entries) in both scripts

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- scripts/build-unit-db.ts: FOUND (modified)
- scripts/update-unit-database.ts: FOUND (modified)
- Commit 08fa12d: FOUND
- Commit 5f8e473: FOUND
