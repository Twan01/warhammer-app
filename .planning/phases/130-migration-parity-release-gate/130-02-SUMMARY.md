---
phase: 130-migration-parity-release-gate
plan: "02"
subsystem: build-tooling
tags: [release-gate, migration-parity, cr-byte, prebuild-hook]
dependency_graph:
  requires: [130-01-migration-parity-release-gate]
  provides: [pnpm-check-version-three-leg-gate, prebuild-hook]
  affects: [scripts/check-version.mjs, package.json]
tech_stack:
  added: []
  patterns: [ESM .mjs file-reads only, readdirSync + Buffer CR scan, prebuild lifecycle hook]
key_files:
  created: []
  modified:
    - scripts/check-version.mjs
    - package.json
decisions:
  - "D-04: pnpm check:version is the single release gate (version + migration-count + CR-byte legs)"
  - "D-05: Transitive chain enforced without importing .ts helper — fileCount===libRsCount (gate), libRsCount===HOBBYFORGE_MIGRATION_COUNT (Vitest D-06 test), helper count===fileCount by construction (Plan 01)"
  - "D-06: CR-byte scan reads each .sql as a Buffer (no encoding arg) and tests .includes(0x0d)"
  - "D-07: .gitattributes eol=lf stays; CR gate is the runtime backstop"
  - "D-08: prebuild hook makes pnpm build and transitively tauri build refuse on gate failure; CI YAML deferred to Phase 131"
metrics:
  duration: "12 minutes"
  completed: "2026-06-15"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 130 Plan 02: Release Gate (check-version.mjs three-leg extension) Summary

**One-liner:** Extended `scripts/check-version.mjs` into a three-leg release gate (version parity + migration-count parity + CR-byte scan) and wired it to `pnpm build` via a `prebuild` hook, enforcing the D-05 transitive chain without importing any TS helper.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend check-version.mjs with migration-count and CR-byte legs | 23fda4ad | scripts/check-version.mjs |
| 2 | Add prebuild hook so pnpm build runs the gate first | e579bf00 | package.json |

## What Was Built

### Task 1: Three-leg release gate in check-version.mjs

`scripts/check-version.mjs` was extended from a single version-compare to a three-leg gate:

- **Leg 1 (preserved):** `package.json` version === `tauri.conf.json` version
- **Leg 2 (new - REL-04):** disk `.sql` file count (`readdirSync` + `.filter(f.endsWith('.sql'))`) === lib.rs `Migration{}` struct count (regex `/Migration\s*\{/g`, copied verbatim from `migration-parity.test.ts:29`)
- **Leg 3 (new - REL-05):** no CR byte (`0x0D`) in any `src-tauri/migrations/*.sql` (Buffer read, no encoding arg, `.includes(0x0d)`)

All three legs run independently; script exits 1 if ANY fails with a clear per-leg message identifying the leg name and offending values/filenames. Exits 0 only when all pass.

The D-05 transitive chain is documented in a comment block: `check-version.mjs` asserts `fileCount === libRsCount`; Vitest D-06 test asserts `libRsCount === HOBBYFORGE_MIGRATION_COUNT`; helper count === fileCount by construction (Plan 01 disk-derivation). This avoids importing `db-helpers.ts` into the `.mjs` gate (no `--experimental-strip-types`, no `better-sqlite3` in the gate — CI-ready for Phase 131).

### Task 2: prebuild lifecycle hook

Added `"prebuild": "node scripts/check-version.mjs"` to `package.json` scripts. pnpm automatically runs `prebuild` before `build`, so:
- `pnpm build` runs the gate, then `tsc && vite build`
- `pnpm tauri build` inherits this via `tauri.conf.json` `build.beforeBuildCommand: "pnpm build"`

Gate failure (`exit 1`) aborts the build before any artifacts are produced. No `.github/workflows/*.yml` added (Phase 131 scope).

## Verification

### Positive (clean tree)

`pnpm check:version` exits 0:
```
[version] OK: 0.5.7
[migration-count] OK: 47 .sql files === 47 Migration{} entries in lib.rs
[cr-byte] OK: no CR bytes in any migration file
```

### Negative (performed and reverted)

**Count mismatch:** Added `dummy.sql` to `src-tauri/migrations/` — gate exited 1 with:
`[migration-count] MISMATCH: 48 .sql files on disk, 47 Migration{} entries in lib.rs`
Then reverted; gate returned to exit 0.

**CR byte injection:** Replaced first `\n` in `001_core_schema.sql` with `\r\n` — gate exited 1 with:
`[cr-byte] FAIL: CR byte (0x0D) found in migration file(s): 001_core_schema.sql`
Then reverted via `git checkout`; gate returned to exit 0.

**prebuild hook:** Node assertion confirms `scripts.prebuild === "node scripts/check-version.mjs"`.

## Deviations from Plan

None — plan executed exactly as written. The two negative verification tests (count mismatch and CR byte injection) were performed and fully reverted as required by the acceptance criteria.

## Threat Surface Scan

No new network endpoints, auth paths, or trust-boundary file access introduced. The gate reads only fixed `resolve(root, ...)` repo-internal paths — no user/network input, no path traversal surface. This is the same trust boundary documented in the plan's threat model (T-130-PT: accepted, not exploitable).

## Known Stubs

None.

## Self-Check: PASSED

- `scripts/check-version.mjs` exists and contains `/Migration\s*\{/g`, `readdirSync(`, `0x0d`, and the D-05 transitive-chain comment
- `package.json` `scripts.prebuild === "node scripts/check-version.mjs"` (verified via node assertion)
- `tauri.conf.json` `build.beforeBuildCommand === "pnpm build"` (confirmed: prebuild fires transitively)
- `pnpm check:version` exits 0 on clean tree (all three legs pass)
- No `.github/workflows/*.yml` added
- Negative verifications performed and reverted
- Commits 23fda4ad and e579bf00 exist on master
