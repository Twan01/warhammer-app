---
phase: 116-pipeline-foundation
verified: 2026-06-04T08:50:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
---

# Phase 116: Pipeline Foundation Verification Report

**Phase Goal:** The build pipeline reliably parses all Wahapedia CSVs and produces a clean, deduplicated unit dataset
**Verified:** 2026-06-04T08:50:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | D-01: parseWahapediaCsv strips UTF-8 BOM from CSV input before parsing headers | VERIFIED | `scripts/lib/parseCsv.ts` line 12: `const cleaned = raw.replace(/^﻿/, "");` — explicit BOM strip before trim/split |
| 2 | D-02: pnpm download:wahapedia fetches all 10 required CSVs from wahapedia.ru to scripts/data/ | VERIFIED | `scripts/download-wahapedia.ts` CSV_FILES array has 10 entries; `package.json` line 15: `"download:wahapedia": "node --experimental-strip-types scripts/download-wahapedia.ts"` |
| 3 | D-03: Download script is separate from build:udb — deterministic builds require pre-fetched CSVs | VERIFIED | Script is a standalone file; no import of download-wahapedia.ts from build-unit-db.ts |
| 4 | D-04: Download script uses Node.js built-in fetch, no new HTTP dependency | VERIFIED | `scripts/download-wahapedia.ts` uses `fetch(url, {...})` natively — no HTTP library imports |
| 5 | D-05: Units with legend=1 or legend=true in Datasheets.csv are excluded from validUnitIds before any downstream parsing | VERIFIED | Both `scripts/build-unit-db.ts` and `scripts/update-unit-database.ts`: `const isLegend = row["legend"] === "1" \|\| row["legend"] === "true"` with skip before validUnitIds.add |
| 6 | D-06: After Legends filtering, remaining name+faction duplicates produce a console.warn (not silent discard) | VERIFIED | Both build scripts: `console.warn(\`  WARNING: Duplicate unit "${unit.name}" (faction_id=${unit.faction_id}) — discarding id=${unit.id}\`)` |
| 7 | D-07: SUB_FACTION_MAP preserved unchanged | VERIFIED | BSData sub_faction assignment block present and intact in both scripts; `SUB_FACTION_MAP` imported from `./lib/factionMap.ts` unchanged |
| 8 | Both build-unit-db.ts and update-unit-database.ts apply identical Legends filter and dedup logic | VERIFIED | Identical `legendsSkipped`, `isLegend`, `dedupMap`, `dupsFound` patterns confirmed in both files |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/lib/parseCsv.ts` | BOM-safe CSV parser | VERIFIED | Contains `raw.replace(/^﻿/, "")` at line 12; 22 lines total |
| `scripts/download-wahapedia.ts` | Wahapedia CSV auto-download | VERIFIED | 96 lines; contains BASE_URL, 10-entry CSV_FILES, res.ok guard, User-Agent header, --force flag |
| `tests/build-pipeline/parseCsv.test.ts` | BOM strip test coverage | VERIFIED | Contains `describe("parseWahapediaCsv: BOM handling (PF-01) — UTF-8 BOM strip", ...)` with 3 test cases |
| `scripts/build-unit-db.ts` | Legends filter + dedup in Step 3 | VERIFIED | Contains `legendsSkipped`, `isLegend`, `dedupMap`, `dupsFound`; REQUIRED_CSVs has 6 entries (unchanged) |
| `scripts/update-unit-database.ts` | Mirror Legends filter + dedup | VERIFIED | Identical Step 3 logic confirmed; REQUIRED_CSVs has 6 entries (unchanged) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `package.json` | `scripts/download-wahapedia.ts` | `download:wahapedia` script entry | VERIFIED | `package.json` line 15 contains `"download:wahapedia": "node --experimental-strip-types scripts/download-wahapedia.ts"` |
| `scripts/build-unit-db.ts` | `scripts/update-unit-database.ts` | identical Step 3 legend filter + dedup logic | VERIFIED | Both files contain `isLegend`, `legendsSkipped`, `dedupMap`, `dupsFound`, identical warning format |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| BOM-prefixed CSV produces clean header keys | `pnpm test -- tests/build-pipeline/parseCsv.test.ts` | 11/11 tests pass | PASS |
| Download script loads and executes without syntax errors | `node --experimental-strip-types scripts/download-wahapedia.ts` | Prints banner, skips existing files | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PF-01 | 116-01-PLAN.md | Build script strips UTF-8 BOM from CSV headers | SATISFIED | `parseCsv.ts` explicit BOM replace; 3 BOM tests passing |
| PF-02 | 116-01-PLAN.md | `pnpm download:wahapedia` command fetches all 10 CSVs | SATISFIED | `download-wahapedia.ts` with 10-entry CSV_FILES; package.json entry verified |
| PF-03 | 116-02-PLAN.md | Build script filters out Legends units before matching | SATISFIED | `isLegend` check in Step 3 of both build scripts; skip before validUnitIds |
| PF-04 | 116-02-PLAN.md | Duplicate Wahapedia units deduplicated with warning | SATISFIED | `dedupMap` + `console.warn` with WARNING prefix in both build scripts |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| No blockers found | — | — | — | — |

No `TBD`, `FIXME`, `XXX` markers found in any phase-modified files.

### Human Verification Required

None. All must-haves are verifiable programmatically and confirmed.

### Gaps Summary

No gaps. All 4 requirements (PF-01 through PF-04) are fully implemented, substantive, wired, and tested.

**Key verification facts:**
- `parseCsv.ts` BOM strip is the explicit `replace(/^﻿/, "")` approach (not relying solely on `trim()`), satisfying D-01's intent for forward-compatibility
- `download-wahapedia.ts` includes all defensive patterns: `res.ok` guard, User-Agent header, skip-if-exists, `--force` flag, `process.exit(1)` on failure
- Both build scripts apply identical Legends filter and dedup logic; `REQUIRED_CSVs` arrays remain at 6 entries (unchanged per plan constraint)
- BSData sub_faction assignment is preserved unchanged in both scripts (D-07/D-08 compliance)
- Commits e69b060, 66af1cf, 08fa12d, 5f8e473 all present in git history

---

_Verified: 2026-06-04T08:50:00Z_
_Verifier: Claude (gsd-verifier)_
