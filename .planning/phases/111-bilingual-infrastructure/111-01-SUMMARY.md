---
phase: 111-bilingual-infrastructure
plan: "01"
subsystem: build-pipeline
tags: [fr-overlay, build-script, translations, types]
dependency_graph:
  requires: []
  provides: [FR-02]
  affects: [scripts/build-unit-db.ts, scripts/lib/types.ts, scripts/data/translations_fr.json]
tech_stack:
  added: []
  patterns: [graceful-degrade, file-overlay, composite-key]
key_files:
  created:
    - scripts/data/translations_fr.json
    - tests/build-pipeline/translations-overlay.test.ts
  modified:
    - scripts/lib/types.ts
    - scripts/build-unit-db.ts
    - .gitignore
    - tests/collection/PlaybookTab.test.tsx
decisions:
  - "loadTranslationsFr() is inlined in build-unit-db.ts (not exported from lib/) — consistent with other helpers in that file"
  - "Step 10.5 is applied after sub-faction stats and before Build Summary/JSON assembly — per RESEARCH Pitfall 5"
  - "Composite key format for abilities and weapons: '${unit_id}:${name}' — name-based, not line_order"
  - "translations_fr.json uses .gitignore exception (force-added with git add -f) matching aliases.json pattern"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-01"
  tasks_completed: 2
  files_created: 2
  files_modified: 4
---

# Phase 111 Plan 01: Build Script French Overlay Loading Summary

**One-liner:** Build pipeline now loads `translations_fr.json` overlay in Step 10.5 and populates `_fr` columns (name_fr, description_fr, keyword_fr) in unit_database.json output.

## What Was Built

FR-02 satisfied: the build-unit-db.ts script loads a manually curated `scripts/data/translations_fr.json` file and applies French translations to all entity arrays before writing the output JSON. Graceful degrade is implemented — missing or malformed file produces a warning but does not abort the build.

### Key Artifacts

- **`scripts/data/translations_fr.json`** — Stub overlay with 22 faction names, 3 unit names, 1 ability, 1 weapon, 12 keyword translations (French). Ready for manual curation.
- **`scripts/lib/types.ts`** — `TranslationsFrOverlay` interface exported (all sections optional, abilities section typed as `{ name_fr?, description_fr? }` objects).
- **`scripts/build-unit-db.ts`** — `loadTranslationsFr()` function + `TRANSLATIONS_FR_PATH` constant + Step 10.5 overlay application loop with per-entity-type count logging.
- **`tests/build-pipeline/translations-overlay.test.ts`** — 13 tests covering overlay loading (valid file, missing file, malformed JSON), per-entity application logic (faction, unit, ability, weapon, keyword), and type shape validation.

## Task Execution

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create translations_fr.json stub and TranslationsFrOverlay type | 5730d3b | scripts/data/translations_fr.json, scripts/lib/types.ts, .gitignore, tests/collection/PlaybookTab.test.tsx |
| 2 | Create test stubs and add overlay application to build script | 7a79d89 | scripts/build-unit-db.ts, tests/build-pipeline/translations-overlay.test.ts |

## Verification

- `pnpm build` passes TypeScript compilation
- `pnpm test -- tests/build-pipeline/translations-overlay.test.ts` → 13/13 tests pass
- `scripts/data/translations_fr.json` parses as valid JSON with 5 required top-level keys
- Build script step 10.5 applies overlay before JSON output assembly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed smart-quote string delimiters breaking TypeScript compilation in PlaybookTab.test.tsx**
- **Found during:** Task 1 (pnpm build verification)
- **Issue:** `tests/collection/PlaybookTab.test.tsx` line 452 used Unicode "left/right single quotation marks" (U+2018/U+2019) as string delimiters around `24"`, causing TypeScript error TS1127 (Invalid character). Pre-existing issue.
- **Fix:** Replaced mojibake characters with proper ASCII single quotes using node script
- **Files modified:** tests/collection/PlaybookTab.test.tsx
- **Commit:** 5730d3b

**2. [Rule 1 - Bug] Fixed TypeScript strict inference on null-typed test fixture fields**
- **Found during:** Task 2 (pnpm build verification)
- **Issue:** Test fixtures declared `name_fr: null` (TypeScript infers literal `null` type), making assignments of `string | null` type-invalid
- **Fix:** Added explicit array element type annotations to all mutated test fixtures (factions, units, abilities, weapons, keywords arrays)
- **Files modified:** tests/build-pipeline/translations-overlay.test.ts
- **Commit:** 7a79d89 (same task commit)

## Known Stubs

The `scripts/data/translations_fr.json` is intentionally a minimal stub with sample entries. It covers:
- All 22 factions with French names
- 3 sample unit translations (Custodian Guard, Trajann Valoris, Capitaine-Bouclier)
- 1 ability translation (sample)
- 1 weapon translation (sample)
- 12 keyword translations (most common game keywords)

The stub is intentionally sparse — future manual curation will expand unit/ability/weapon coverage. The infrastructure (build script integration) is complete; data population is an ongoing process.

## Threat Flags

None. The translations_fr.json file is a developer-curated configuration file with no user-facing attack surface. The try/catch + null degrade pattern covers T-111-01 (malformed JSON tampering).

## Self-Check: PASSED

- [x] `scripts/data/translations_fr.json` exists and valid JSON
- [x] `scripts/lib/types.ts` exports `TranslationsFrOverlay`
- [x] `scripts/build-unit-db.ts` contains `loadTranslationsFr` and Step 10.5 block
- [x] `tests/build-pipeline/translations-overlay.test.ts` exists with 13 tests
- [x] Commits 5730d3b and 7a79d89 exist in git log
- [x] `pnpm build` passes
- [x] 13/13 overlay tests pass
