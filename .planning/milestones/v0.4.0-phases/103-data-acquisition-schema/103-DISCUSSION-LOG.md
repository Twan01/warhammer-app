# Phase 103: Data Acquisition & Schema - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 103-data-acquisition-schema
**Areas discussed:** Data Source Strategy, Unit ID Scheme, JSON Artifact Format, First-Launch Import Trigger, FTS5 Index Population
**Mode:** `--auto` (all decisions auto-selected)

---

## Data Source Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Wahapedia CSV + BSData XML merge | Primary CSV for datasheets/models/abilities/keywords, BSData XML for points tiers and composition data | ✓ |
| Wahapedia CSV only | Simpler pipeline but missing model-count point brackets and composition data | |
| BSData XML only | More structured but less complete for ability text and keywords | |

**Auto-selected:** Wahapedia CSV + BSData XML merge (recommended — matches existing sync pipeline knowledge and research findings)
**Notes:** ARCHITECTURE.md already analyzed both sources. Wahapedia has richer text data, BSData has structured points/composition.

---

## Unit ID Scheme

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse Wahapedia string IDs | Preserves rules_favorites_notes annotation compatibility | ✓ |
| Generate new UUIDs | Clean slate but breaks all existing user annotations on rules data | |
| Slug-based IDs (e.g., "SM-intercessors") | Human-readable but requires a generation scheme and uniqueness enforcement | |

**Auto-selected:** Reuse Wahapedia string IDs (pre-decided in STATE.md Key Decisions)
**Notes:** This was already locked by the v0.4.0 planning session. No re-discussion needed.

---

## JSON Artifact Format

| Option | Description | Selected |
|--------|-------------|----------|
| Single nested JSON file | One file with all tables as arrays, versioned metadata at top | ✓ |
| Separate JSON per table | Multiple smaller files (factions.json, units.json, etc.) | |
| SQLite file bundled directly | Pre-built .db file merged at runtime | |

**Auto-selected:** Single nested JSON file (recommended — simplest for Rust import command, diff-reviewable, follows ARCHITECTURE.md Option A)
**Notes:** ARCHITECTURE.md evaluated 3 options and recommended JSON bundled in Tauri resources.

---

## First-Launch Import Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Rust setup hook (.setup()) | Auto-runs before React mounts, no user action required | ✓ |
| Frontend-triggered via useEffect | React component calls import on mount if data missing | |
| Migration seed SQL | Data embedded in migration file | |

**Auto-selected:** Rust setup hook (recommended — runs earliest, no UI dependency, satisfies DAS-08 "no manual import step")
**Notes:** Migration seed was explicitly flagged as an anti-pattern in ARCHITECTURE.md.

---

## FTS5 Index Population

| Option | Description | Selected |
|--------|-------------|----------|
| Import command populates FTS5 | Migration creates empty virtual table, import fills it alongside data | ✓ |
| Migration creates and populates | Data in migration file (blocked by anti-pattern) | |
| Separate FTS rebuild command | Additional Tauri command for FTS only | |

**Auto-selected:** Import command populates FTS5 (recommended — FTS5 content depends on imported data, so they must run together)
**Notes:** FTS5 virtual table CREATE goes in migration 038; content INSERT goes in the import command.

---

## Claude's Discretion

- Build script implementation details (parser structure, error handling, intermediate data model)
- Exact Rust error handling patterns in the import command
- Whether to use `include_bytes!` or runtime file read for the bundled JSON

## Deferred Ideas

- UI for triggering manual re-import (Phase 104+)
- Collection FK link (Phase 105)
- Army list simplification (Phase 106)
- rules.db removal (Phase 107)
- Stratagems/detachments/enhancements in canonical DB (v2 scope)
