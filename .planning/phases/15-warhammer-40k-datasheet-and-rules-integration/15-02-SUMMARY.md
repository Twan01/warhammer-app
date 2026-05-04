---
phase: 15-warhammer-40k-datasheet-and-rules-integration
plan: "02"
subsystem: datasheet-utilities
tags: [pure-functions, csv-parser, html-stripping, tdd, wave-0-stubs]
dependency_graph:
  requires: ["15-01"]
  provides: ["parseWahapediaCsv", "stripHtml"]
  affects: ["15-04"]
tech_stack:
  added: []
  patterns: ["pure function no-import", "chained string replacements", "Object.fromEntries CSV row mapping"]
key_files:
  created:
    - src/lib/parseWahapediaCsv.ts
    - src/lib/stripHtml.ts
  modified:
    - tests/datasheet/csvParse.test.ts
    - tests/datasheet/stripHtml.test.ts
decisions:
  - "parseWahapediaCsv uses raw.trim().split('\\n') + Object.fromEntries per RESEARCH §Pattern 3 — handles trailing-pipe rows by tolerating empty-string header key"
  - "stripHtml uses 6 chained .replace() calls in strict order (tags → named entities → numeric entities → trim) per RESEARCH §Pitfall 4 to avoid jsdom dependency"
metrics:
  duration: "2m10s"
  completed: "2026-05-04"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  tests_added: 6
  tests_passing: 288
---

# Phase 15 Plan 02: Pure Utility Functions (CSV Parser + stripHtml) Summary

Pure pipeline utilities implemented: pipe-delimited CSV parser tolerating Wahapedia trailing-pipe rows and HTML entity decoder for ability description cleaning.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create parseWahapediaCsv + flip csvParse tests | a38b8fd | src/lib/parseWahapediaCsv.ts, tests/datasheet/csvParse.test.ts |
| 2 | Create stripHtml + flip stripHtml tests | 0f3ed97 | src/lib/stripHtml.ts, tests/datasheet/stripHtml.test.ts |

## What Was Built

### parseWahapediaCsv (src/lib/parseWahapediaCsv.ts)

8-line pure function. Splits raw string on `\n`, maps header row with `split("|")`, and uses `Object.fromEntries` to build one record per data row. Returns `[]` for empty or header-only input. Tolerates Wahapedia's trailing pipe (produces empty-string key with empty-string value, which is safe).

No imports — testable in Node without jsdom, importable from any layer.

### stripHtml (src/lib/stripHtml.ts)

9-line pure function. Six chained `.replace()` calls in the correct order:
1. `/<[^>]*>/g` — remove all HTML tags
2. `&amp;` → `&`
3. `&lt;` → `<`
4. `&gt;` → `>`
5. `&nbsp;` → space
6. `/&#(\d+);/g` → `String.fromCharCode(Number(n))` (numeric entities: en-dash, em-dash, etc.)
7. `.trim()` — removes leading/trailing whitespace

No imports — no jsdom, no React, no Tauri.

### Wave 0 stubs flipped

- `tests/datasheet/csvParse.test.ts`: 3 `it.skip` → 3 `it` (assertions inlined)
- `tests/datasheet/stripHtml.test.ts`: 3 `it.skip` → 3 `it` (assertions inlined)

6 stubs flipped this plan. 13 stubs remain for Plans 15-03 through 15-05.

## Test Results

- `pnpm test --run tests/datasheet/csvParse.test.ts`: 3/3 passing
- `pnpm test --run tests/datasheet/stripHtml.test.ts`: 3/3 passing
- `pnpm test` (full suite): **288 passing, 10 skipped, 0 failed** (target was 285+)
- `pnpm tsc --noEmit`: exits 0

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/lib/parseWahapediaCsv.ts: FOUND
- src/lib/stripHtml.ts: FOUND
- tests/datasheet/csvParse.test.ts: no it.skip — VERIFIED
- tests/datasheet/stripHtml.test.ts: no it.skip — VERIFIED
- Commit a38b8fd: FOUND
- Commit 0f3ed97: FOUND
