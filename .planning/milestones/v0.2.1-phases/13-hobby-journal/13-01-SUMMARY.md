---
phase: 13-hobby-journal
plan: "01"
subsystem: database, infra
tags: [tauri, tauri-plugin-fs, tauri-plugin-dialog, sqlite, migration, typescript]

# Dependency graph
requires:
  - phase: 13-hobby-journal/13-00
    provides: Wave 0 stub test files (migration005.test.ts, paintingSessionQueries.test.ts, unitPhotoQueries.test.ts, useJournalSessions.test.ts, JournalTab.test.tsx)

provides:
  - painting_sessions SQLite table with ON DELETE CASCADE on unit_id FK
  - image_assets.stage_label TEXT column (nullable, backward compatible)
  - tauri-plugin-fs registered in Rust and granted AppData read/write capabilities
  - tauri-plugin-dialog registered in Rust with dialog:allow-open capability
  - assetProtocol enabled with $APPDATA/** scope for convertFileSrc() URLs
  - PaintingSession and CreateSessionInput TypeScript interfaces
  - UnitPhoto and CreateUnitPhotoInput TypeScript interfaces
  - migration005.test.ts: 4 active green tests (no longer skipped)

affects:
  - 13-02 (painting session query module imports PaintingSession + CreateSessionInput)
  - 13-03 (photo query module imports UnitPhoto + CreateUnitPhotoInput; uses tauri-plugin-dialog + tauri-plugin-fs)
  - 13-04 (JournalTab UI imports both type files; reads photos via convertFileSrc)

# Tech tracking
tech-stack:
  added:
    - tauri-plugin-fs = "2" (Rust crate + @tauri-apps/plugin-fs@2.5.1 npm)
    - tauri-plugin-dialog = "2" (Rust crate + @tauri-apps/plugin-dialog@2.7.1 npm)
  patterns:
    - assetProtocol + $APPDATA/** scope enables convertFileSrc() for local images
    - Capabilities must list both fs:default and specific recursive read/write grants
    - tauri feature flag "protocol-asset" must be added when assetProtocol is enabled in tauri.conf.json

key-files:
  created:
    - src-tauri/migrations/005_hobby_journal.sql
    - src/types/paintingSession.ts
    - src/types/unitPhoto.ts
  modified:
    - src-tauri/Cargo.toml (2 new crate deps + protocol-asset feature flag)
    - src-tauri/Cargo.lock (updated)
    - src-tauri/src/lib.rs (2 plugin registrations + migration version 5 entry)
    - src-tauri/capabilities/default.json (5 new permission strings)
    - src-tauri/tauri.conf.json (assetProtocol block)
    - package.json (2 new npm deps)
    - pnpm-lock.yaml (regenerated)
    - tests/hobby-journal/migration005.test.ts (it.skip -> it, 4 real assertions)

key-decisions:
  - "tauri feature flag protocol-asset added to Cargo.toml [dependencies] tauri entry — required when assetProtocol.enable = true in tauri.conf.json (build fails otherwise with mismatch error)"
  - "Plugin registration order: opener -> fs -> dialog -> sql — new plugins inserted between opener and sql as per Tauri docs convention; sql must remain last since it runs migrations on startup"
  - "UnitPhoto.file_path stores UUID filename only (not absolute path) — UI calls convertFileSrc(join(appDataDir, file_path)) at render time; never stored as absolute path"

patterns-established:
  - "Protocol-asset pattern: enable assetProtocol in tauri.conf.json + add protocol-asset feature to Cargo.toml tauri dep + grant fs capabilities"
  - "Migration content test pattern: readFileSync raw string assertions (mirrors migration004.test.ts) — no Tauri IPC in jsdom"

requirements-completed: [JOUR-01, JOUR-02, JOUR-03, JOUR-04, JOUR-05, JOUR-06]

# Metrics
duration: 15min
completed: 2026-05-03
---

# Phase 13 Plan 01: Hobby Journal Infrastructure Summary

**tauri-plugin-fs + tauri-plugin-dialog installed, migration 005 adds painting_sessions table and image_assets.stage_label, TypeScript contracts created for all Phase 13 downstream plans**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-03T08:34:00Z
- **Completed:** 2026-05-03T08:38:30Z
- **Tasks:** 3
- **Files modified:** 10 (7 modified + 3 created)

## Accomplishments
- Two Tauri plugins (fs + dialog) fully wired: Rust crates downloaded and compiled, npm packages installed, builder chain updated, capabilities granted, asset protocol enabled
- Migration 005 creates painting_sessions table (5 columns, ON DELETE CASCADE) and adds stage_label column to image_assets — additive only, no destructive statements
- TypeScript interfaces PaintingSession, CreateSessionInput, UnitPhoto, CreateUnitPhotoInput published — all downstream plans (13-02/03/04) can now import without resolution errors
- migration005.test.ts flipped from 1 skipped stub to 4 active green tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Tauri plugins, register in lib.rs, grant capabilities, enable asset protocol** - `adb7d06` (feat)
2. **Task 2: Create migration 005 SQL + register as version 5 + flip migration005 tests** - `4210aef` (feat)
3. **Task 3: Create src/types/paintingSession.ts and src/types/unitPhoto.ts** - `feba578` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src-tauri/migrations/005_hobby_journal.sql` - painting_sessions table + image_assets.stage_label ALTER TABLE
- `src-tauri/Cargo.toml` - tauri-plugin-fs = "2", tauri-plugin-dialog = "2", protocol-asset feature flag
- `src-tauri/Cargo.lock` - updated with new crate resolutions
- `src-tauri/src/lib.rs` - plugin registrations (opener -> fs -> dialog -> sql) + migration version 5 entry
- `src-tauri/capabilities/default.json` - 5 new permissions: fs:default, fs:allow-appdata-read-recursive, fs:allow-appdata-write-recursive, dialog:default, dialog:allow-open
- `src-tauri/tauri.conf.json` - assetProtocol: { enable: true, scope: ["$APPDATA/**"] }
- `package.json` - @tauri-apps/plugin-fs@2.5.1 and @tauri-apps/plugin-dialog@2.7.1 in dependencies
- `pnpm-lock.yaml` - regenerated with new package resolutions
- `src/types/paintingSession.ts` - PaintingSession + CreateSessionInput interfaces
- `src/types/unitPhoto.ts` - UnitPhoto (entity_type narrowed to "unit") + CreateUnitPhotoInput interfaces
- `tests/hobby-journal/migration005.test.ts` - 4 real readFileSync assertions replacing it.skip stub

## Decisions Made
- Added `protocol-asset` feature flag to Cargo.toml `tauri` dependency — required when `assetProtocol.enable = true` in tauri.conf.json; without it `cargo build` fails with "features do not match allowlist" error (Rule 3 auto-fix)
- Plugin registration order retained as opener → fs → dialog → sql per Tauri docs convention; sql must stay last (runs migrations on startup)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added protocol-asset feature flag to Cargo.toml**
- **Found during:** Task 1 (Step 1.6 — cargo build verification)
- **Issue:** `cargo build` exited 101 with "The tauri dependency features on Cargo.toml do not match the allowlist defined under tauri.conf.json. Please add the protocol-asset feature." The plan specified `tauri = { version = "2", features = [] }` but enabling `assetProtocol` in tauri.conf.json requires the `protocol-asset` feature.
- **Fix:** Changed `tauri = { version = "2", features = [] }` to `tauri = { version = "2", features = ["protocol-asset"] }` in src-tauri/Cargo.toml
- **Files modified:** src-tauri/Cargo.toml
- **Verification:** `cargo build --manifest-path src-tauri/Cargo.toml` exits 0
- **Committed in:** adb7d06 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking build error)
**Impact on plan:** Necessary correctness fix. The plan called for enabling assetProtocol but omitted the required Cargo.toml feature flag. No scope creep.

## Issues Encountered
- None beyond the Cargo.toml feature flag auto-fix above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plans 13-02 through 13-04 can now proceed:
  - `import { PaintingSession, CreateSessionInput } from "@/types/paintingSession"` resolves
  - `import { UnitPhoto, CreateUnitPhotoInput } from "@/types/unitPhoto"` resolves
  - `import { open } from "@tauri-apps/plugin-dialog"` resolves
  - `import { readFile, writeFile } from "@tauri-apps/plugin-fs"` resolves
  - `convertFileSrc()` URLs with `$APPDATA/**` scope will resolve at runtime
- 232 tests passing, 11 still-skipped Wave 0 stubs (for plans 13-02/03/04)
- cargo build green

---
*Phase: 13-hobby-journal*
*Completed: 2026-05-03*
