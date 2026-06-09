# Phase 116: Pipeline Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 116-Pipeline Foundation
**Areas discussed:** BOM Stripping Location, Download Scope, Legends Filtering Strategy, Duplicate Dedup Strategy
**Mode:** --auto (all decisions auto-selected)

---

## BOM Stripping Location

| Option | Description | Selected |
|--------|-------------|----------|
| In parseCsv.ts (centralized) | Strip BOM in the shared CSV parser — single fix covers all files | ✓ |
| In readCsvFile (read boundary) | Strip at file-read time in bsdata.ts | |
| In each build script | Strip before calling parseCsv | |

**Auto-selected:** In parseCsv.ts (centralized) — recommended default
**Rationale:** `parseWahapediaCsv` is the single entry point for all CSV parsing

---

## Download Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All files needed for v0.4.7 | Fetch all 10 CSVs including Datasheets_models_cost, Stratagems, Enhancements, Detachment_abilities | ✓ |
| Only current 6 CSVs | Fetch only what build-unit-db.ts currently requires | |

**Auto-selected:** All files needed for v0.4.7 — recommended default
**Rationale:** Declare the full set once; avoids re-touching the script in phases 117-119

---

## Legends Filtering Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Early filter (Step 3) | Filter by `legend` column during unit parsing, before populating validUnitIds | ✓ |
| Late filter (post-process) | Parse everything, then remove Legends units at the end | |

**Auto-selected:** Early filter (Step 3) — recommended default
**Rationale:** Downstream steps automatically skip Legends units since validUnitIds won't contain them

---

## Duplicate Dedup Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep non-Legends, warn on remaining | Filter Legends first, then warn on any remaining name+faction duplicates | ✓ |
| Keep first seen | Silently keep whichever entry appears first | |
| Error on duplicates | Fail the build if duplicates remain after Legends filter | |

**Auto-selected:** Keep non-Legends, warn on remaining — recommended default
**Rationale:** Legends filter handles the expected case; warnings surface genuine data issues

---

## Claude's Discretion

- Download script implementation details (error handling, progress output, retry behavior)
- Console log format for Legends filtering statistics
- Whether to add a `--force` flag for re-downloading existing CSVs

## Deferred Ideas

None — discussion stayed within phase scope
