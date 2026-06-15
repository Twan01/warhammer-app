# Technology Stack: v0.6.0 Bulletproof & Honest

**Project:** HobbyForge v0.6.0
**Researched:** 2026-06-15
**Confidence:** HIGH
**Scope:** Stack additions/changes only — CI hardening, auto-update verification, frontend logging, new-feature dependencies. Existing validated stack (Tauri 2, React 19, TanStack, Zustand, RHF+Zod, Vitest 4, better-sqlite3, jsPDF, react-hotkeys-hook) is NOT re-researched.

> **TL;DR** — v0.6.0 is overwhelmingly a *process/config* milestone, not a *dependency* milestone. The single most important change is **restructuring `.github/workflows/release.yml` into a test-gated pipeline** — that needs **zero new npm/cargo dependencies**. Everything required for the auto-update fix, the relaunch UX, and the frontend diagnostics log is **already installed** (`@tauri-apps/plugin-updater@2.10.1`, `@tauri-apps/plugin-process@2.3.1`, `@tauri-apps/plugin-fs@2.5.1`). The new feature work (unit comparison, FK/orphan validation) needs **no new libraries** either. The only *optional* new dependency considered is `tauri-plugin-log`, and the recommendation is **do NOT add it** for a single-user tool.

---

## Recommended Stack

### Core Technologies (already in place — confirmed current, DO NOT change)

| Technology | Installed | Latest | Purpose | Why it stays |
|------------|-----------|--------|---------|--------------|
| `@tauri-apps/plugin-updater` (JS) / `tauri-plugin-updater` (Rust) | 2.10.1 / 2.10.1 | 2.10.1 | In-app update check + `downloadAndInstall` | Current. Already wired in `useAppUpdate.ts` + `UpdateBanner.tsx`. No bump needed. |
| `@tauri-apps/plugin-process` (JS) / `tauri-plugin-process` (Rust) | 2.3.1 / 2.3.1 | 2.3.1 | `relaunch()` after install | Current. **Already wired** — `UpdateBanner.tsx:3,44` calls `relaunch()` in the "installing" state. The "relaunch-after-update UX" milestone item is therefore *mostly done*; only verification + log remain. |
| `@tauri-apps/plugin-fs` | 2.5.1 | 2.5.1 | Frontend disk I/O (the diagnostics log) | Current. Already used in 6+ files (`writeTextFile`, `writeFile`, `BaseDirectory.AppData`). The frontend log hand-rolls on this — no new dependency. |
| GitHub Actions (`tauri-apps/tauri-action`) | `@v0` | `@v0`/`@v1` both live | Build + publish release artifacts | Stays. v0.6.0 wraps it in a test gate; see Development Tools. |
| `vitest` + `@testing-library/react` | 4.1.5 / 16.3.2 | current | `pnpm test` — frontend half of the CI gate | 2,400+ tests already exist. CI just needs to *run* them. |
| `better-sqlite3` (devDep) | 12.10.0 | current | Data-layer migration-parity + FK/orphan tests (cargo-free SQLite in Vitest node env) | Already the harness for `tests/data-layer/*`. Where the FK/orphan validation tests and the 047 fix live. |
| `cargo test` (Rust) | toolchain `stable` | — | Backend half of the CI gate (the `repair_heals_crlf_era_checksums` test + 6 others, 7/7 passing) | Already exists in `src-tauri`. CI must run it. |

### Supporting Libraries (new — recommendation is "add almost nothing")

| Library | Version | Purpose | Verdict |
|---------|---------|---------|---------|
| *(none required)* | — | Frontend diagnostics log | **Hand-roll on existing `@tauri-apps/plugin-fs`** — see Topic 3. ~40 lines, mirrors the Rust `preflight.log`. |
| `tauri-plugin-log` / `@tauri-apps/plugin-log` | 2.8.0 / 2.8.0 | Structured multi-target logging (stdout + webview + rotating file) | **OPTIONAL, recommend NO.** See "What NOT to Use." Adds a Rust crate + JS package + capability permission for what one `writeTextFile` call covers in a single-user tool. |

### Development Tools (the actual deliverable of Theme A)

| Tool | Purpose | Notes |
|------|---------|-------|
| GitHub Actions — **new `ci.yml`** | Run `pnpm test` + `cargo test` + `pnpm build` (tsc) as a required check on PRs and pushes to `master` | The headline change. No new marketplace actions beyond ones already used. |
| GitHub Actions — **gated `release.yml`** | Add a `test` job that the `release` job `needs:` so a red test blocks the tagged release | Same actions already used; just add a job + `needs:`. |
| `pnpm/action-setup@v4` + `actions/setup-node@v4` (cache: pnpm) | pnpm install + Node cache | **Already in `release.yml`** — reuse verbatim in `ci.yml`. |
| `dtolnay/rust-toolchain@stable` | Rust for `cargo test` + Tauri build | **Already in `release.yml`.** |
| `Swatinem/rust-cache@v2` (`workspaces: src-tauri -> target`) | Cache Rust `target/` between CI runs | **Already in `release.yml`.** Critical — without it `cargo test` cold-compiles sqlx/tauri each run (~5–10 min). |
| `scripts/check-version.mjs` + `scripts/check-migrations.mjs` | The "single version/migration-parity gate" the milestone requires | Already exist (`check-version.mjs` wired as `pnpm check:version`; `check-migrations.mjs` in the tree). Wire both into the CI `test` job as steps. |

---

## Installation

```bash
# Core stack additions: NONE.
# Auto-update + relaunch + frontend FS logging all use already-installed packages.

# IF (and only if) you decide to adopt structured logging instead of hand-rolling
# (NOT recommended for this single-user tool — see What NOT to Use):
pnpm add @tauri-apps/plugin-log          # JS side
# + add `tauri-plugin-log = "2"` to src-tauri/Cargo.toml
# + register in lib.rs and add a capability permission
```

The CI work is **YAML + existing scripts only** — no package-manager changes.

---

## Topic 1 — CI for Tauri

### Recommendation: a two-file Actions setup, no new tooling. GitHub Actions is sufficient.

**`ci.yml` (new) — runs on PRs + pushes to `master`.** Single `windows-latest` job. A matrix is unwarranted — the app is Windows-only by constraint, so a Linux/macOS matrix would test code paths you never ship and burn minutes:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [master]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with: { workspaces: src-tauri -> target }
      - run: pnpm install --frozen-lockfile
      - run: pnpm check:version                    # version/migration-parity gate
      - run: node scripts/check-migrations.mjs      # LF-checksum / migration-list parity
      - run: pnpm test                              # vitest (frontend + data-layer)
      - run: cargo test --manifest-path src-tauri/Cargo.toml   # Rust (incl. repair test)
      - run: pnpm build                             # tsc + vite — catches type regressions
```

**`release.yml` (modify) — make the existing publish job depend on a test job** so a tagged release cannot ship if tests are red:

```yaml
jobs:
  test:
    runs-on: windows-latest
    steps: [ ...same as ci.yml test job, minus the build... ]
  release:
    needs: test          # <-- the gate
    permissions: { contents: write }
    runs-on: windows-latest
    steps: [ ...existing checkout/pnpm/node/rust/cache/tauri-action... ]
```

**Caching guidance (verified against tauri-action advanced-usage docs):**
- pnpm: `actions/setup-node@v4` with `cache: pnpm` (already present).
- Rust: `Swatinem/rust-cache@v2` with `workspaces: src-tauri -> target` (already present). The high-value cache — uncached `cargo test`/build cold-compiles `sqlx`, `tauri`, `zip`, `time`, etc.
- Use `pnpm install --frozen-lockfile` in CI (not bare `pnpm install`) so a drifted lockfile fails loudly.

**Is anything beyond GitHub Actions warranted? No.** For a single-maintainer, Windows-only, GitHub-Releases-distributed app, a self-hosted runner, Buildkite, or a cross-platform matrix are pure overhead. The hosted `windows-latest` runner already builds + signs + publishes today; the only gap is *it runs zero tests*. Closing that gap is a pipeline-shape change, not a tooling change.

**Pre-existing bug the CI gate will immediately expose (must fix in this milestone):** `tests/data-layer/db-helpers.ts` `HOBBYFORGE_MIGRATIONS` stops at `046_backfill_faction_udb_normalized.sql` and is **missing `047_army_list_unit_wargear.sql`** (confirmed: `src-tauri/migrations/` has 47 files; the test list ends one short). This is exactly the failing migration-parity test the milestone calls out ("db-helpers 046→047"). Add `047` to that array so the wargear schema is exercised — otherwise the new CI gate goes red on its first run.

**Confidence: HIGH** (tauri-action caching/testing verified via Context7 `/tauri-apps/tauri-action`; `release.yml` read directly; migration count verified on disk).

---

## Topic 2 — Tauri auto-update correctness

### The pattern is already correct; the work is *verification* + one config-hygiene note

**Current state is good, not broken:**
- `tauri.conf.json` has `createUpdaterArtifacts: true`, a `pubkey`, and a single GitHub `latest.json` endpoint — correct per Tauri v2 updater docs.
- `release.yml` sets `TAURI_SIGNING_PRIVATE_KEY` (signing half); the matching `pubkey` is embedded in config. Complete signing chain.
- `useAppUpdate.ts` calls `downloadAndInstall` with progress events, and **`UpdateBanner.tsx` already calls `relaunch()`** (from `@tauri-apps/plugin-process`) in the "installing" state. The canonical Tauri sequence is `check() → downloadAndInstall() → relaunch()`; HobbyForge implements all three (relaunch is user-triggered via a "Restart now" button rather than automatic — a deliberate, good UX choice).

**latest.json / signing essentials (verified via `/tauri-apps/tauri-docs` updater.mdx):**
- `tauri-action` auto-generates `latest.json` from `createUpdaterArtifacts: true` and uploads it — no manual authoring.
- The NSIS `.exe` plus its `.sig` (signed with `TAURI_SIGNING_PRIVATE_KEY`) must both be in the release; the embedded `pubkey` verifies the `.sig`. Already configured.
- `latest.json` shape: `{ version, pub_date, platforms.{target}.{url,signature} }` — produced automatically.

**The "Twan01/warhammer-app vs com.hobbyforge.app" question — investigated, NOT a functional bug:**
- `git remote -v` confirms `origin` IS `https://github.com/Twan01/warhammer-app.git`. The updater endpoint `github.com/Twan01/warhammer-app/releases/latest/download/latest.json` therefore points at the **same repo** `release.yml` publishes to. The updater *will* find releases. ✓
- The mismatch is purely **cosmetic naming drift**: bundle `identifier: com.hobbyforge.app` + `productName: HobbyForge` vs the GitHub repo slug `warhammer-app`. It does **not** affect updates (the endpoint is the repo URL, independent of app identifier). Flag as a documentation/hygiene note, not a fix.
- **The genuinely load-bearing invariant for in-place NSIS updates:** the bundle `identifier` AND `productName` must stay **byte-identical across every release**. NSIS keys the in-place upgrade off the product name/install location; if either changes, the "update" installs *alongside* the old app instead of over it, and `%APPDATA%\com.hobbyforge.app` (the DB) would be re-resolved differently. Both have been stable — a "keep stable" guardrail, not a change.

**How to VERIFY an in-place NSIS update locally (the milestone's open item) — no new tooling:**
1. Build the *current* shipped version's installer (`pnpm tauri build`), run the NSIS `.exe`, launch once so `%APPDATA%\com.hobbyforge.app\hobbyforge.db` is created + migrated (records checksums).
2. Bump `version` in `package.json` + `tauri.conf.json` (keep identifier/productName identical), `pnpm tauri build` again to produce a higher-version installer + `latest.json` + `.sig`.
3. Either (a) serve the new `latest.json`/artifacts and let the in-app updater pull them, or (b) simpler, run the new NSIS `.exe` over the existing install to simulate the in-place upgrade.
4. Launch the upgraded app and confirm: **a window appears** (the bug was a silent no-window sqlx panic), and `%APPDATA%\com.hobbyforge.app\preflight.log` records `repaired successfully` / `already consistent`. This is the end-to-end proof the `.gitattributes` LF fix + hardened `preflight_migration_repair` save a real upgrade.
5. **In CI this is hard to fully automate** (NSIS in-place upgrade + GUI launch needs a Windows desktop session). Recommendation: keep this as a documented *manual* pre-release smoke step, not a CI job. CI guarantees migration files are LF-clean and parity tests pass; the human does the one in-place launch.

**Confidence: HIGH** (updater config + relaunch pattern verified via Context7 tauri-docs; remote confirmed via `git remote -v`; in-place/identifier behavior is documented Tauri/NSIS behavior).

---

## Topic 3 — Frontend persistent logging

### Recommendation: hand-roll on `@tauri-apps/plugin-fs`. Do NOT add `tauri-plugin-log`.

The milestone wants a frontend diagnostics log on disk **mirroring the Rust `preflight.log`** (already at `app_data_dir/preflight.log`). The cleanest, lowest-risk path is a tiny utility on the **already-installed** FS plugin:

```ts
// src/lib/frontendLog.ts  (sketch — ~40 lines)
import { writeTextFile, BaseDirectory, exists, readTextFile } from "@tauri-apps/plugin-fs";

const LOG = "frontend.log";   // sits next to preflight.log in %APPDATA%\com.hobbyforge.app

export async function logDiag(level: "info" | "warn" | "error", msg: string) {
  try {
    const line = `${new Date().toISOString()} [${level}] ${msg}\n`;
    const prev = (await exists(LOG, { baseDir: BaseDirectory.AppData }))
      ? await readTextFile(LOG, { baseDir: BaseDirectory.AppData }) : "";
    await writeTextFile(LOG, prev + line, { baseDir: BaseDirectory.AppData });
  } catch { /* never throw from the logger */ }
}
```

**Why hand-roll over `tauri-plugin-log`:**
- The codebase **already uses this exact FS API** — `writeTextFile` + `BaseDirectory.AppData` in `DataManagementTab.tsx`, `ArmyListDetailPage.tsx`; `writeFile`/`readFile` in `JournalTab.tsx`, `RecipeFormSheet.tsx`, `RecipeStepRow.tsx`; `remove` in `UnitDeleteDialog.tsx`. Zero new permissions, zero new packages, consistent with the established pattern.
- It lands **next to `preflight.log`** in `%APPDATA%\com.hobbyforge.app`, so Data Health / Settings can surface both diagnostics files from one directory — exactly the "mirroring" the milestone asks for.
- `tauri-plugin-log` (2.8.0) is excellent for multi-target, multi-platform, high-volume logging with rotation — none of which a single-user Windows tool with occasional diagnostic writes needs. Adding it means a new Rust crate, a new JS dependency, a capability permission entry, and `lib.rs` registration, for behavior one `writeTextFile` already delivers.

**Refinements to fold into requirements (not new dependencies):**
- Wrap writes in try/catch and **never throw from the logger** (a logging failure must not break the UI) — mirrors the Rust preflight's "never panic" discipline.
- Cap the file (e.g., truncate when > ~256 KB) so read-then-append doesn't grow unbounded. Trivial in the same utility.
- Wire it into the global error boundary + `useAppUpdate` error path so update failures (the milestone's pain point) are persisted, not just toasted.

**Confidence: HIGH** (FS API usage confirmed across 6 existing source files; `preflight.log` location confirmed in the debug doc).

---

## Topic 4 — New feature work (unit comparison, FK/orphan validation)

### Recommendation: reuse everything. Zero new dependencies.

**Unit comparison view (side-by-side datasheets):**
- A pure **read + layout** feature over the canonical `udb_*` tables. The data layer already exists — datasheet stats/weapons/abilities/keywords are queried for `PlaybookTab`, `UdbDatasheetSheet`, and the Unit Database browser. A comparison view is a new component that calls existing query/hook functions for 2–3 units and renders columns.
- UI primitives already present: shadcn/ui tables, `@tanstack/react-table` (8.21.3), `@tanstack/react-virtual` (3.13.26). No new charting/grid library.
- **Add nothing.** Build `UnitComparisonView.tsx` under `src/features/unit-database/`, reuse existing datasheet query hooks (fetch N units, optionally an `IN (...)` query variant).

**FK/orphan data validation in the pipeline:**
- The app **already has** a Data Health page with orphan/ambiguous-match diagnostics (DX-03), and `PRAGMA foreign_keys = ON` is set per connection. The new work is build-time/pipeline validation, which runs in the **Node/`better-sqlite3`** context the data-layer tests already use — not a new runtime dependency.
- Implement as: (a) `better-sqlite3` assertions in `tests/data-layer/` (every `udb_units.faction_id` resolves, no orphaned `udb_points_tiers`, no dangling `units.udb_unit_id`), and/or (b) a `scripts/validate-udb.mjs` step run during `build:udb` and in CI. SQLite's own `PRAGMA foreign_key_check` and `PRAGMA integrity_check` are the right tools — no library needed.
- **Add nothing.** Rides on `better-sqlite3` (already a devDependency) and the existing migration-parity harness.

**Confidence: HIGH** (existing query/hook/test stack read directly; capabilities confirmed against PROJECT.md shipped requirements).

---

## Alternatives Considered

| Recommended | Alternative | When the alternative would win |
|-------------|-------------|--------------------------------|
| Hand-rolled FS logger | `tauri-plugin-log` 2.8.0 | If multi-platform, needing log rotation/levels surfaced to a remote sink, or shipping to many users needing field diagnostics. Not this app. |
| GitHub Actions only | Self-hosted runner / Buildkite | If builds exceeded hosted-runner minutes or needed special Windows hardware. A single maintainer's cadence won't. |
| Single `windows-latest` job | OS matrix (win/mac/linux) | If macOS/Linux were ever in scope. Explicitly out of scope per PROJECT.md. |
| `release.yml` `needs: test` gate | Branch protection + required check from `ci.yml` only | Both are good; doing **both** is ideal — `ci.yml` guards PRs, `needs:` guards the tag-triggered release even if someone tags without a PR. Recommend both. |
| Reuse `@tanstack/react-table` for comparison | A dedicated diff/compare lib | Never — a 2–3 column datasheet table is trivial; a new lib is bloat. |
| Manual in-place update smoke test | Automated NSIS-upgrade CI job | Only if updates broke frequently across many SKUs. For one app + one maintainer, a documented manual step is correct. |

---

## What NOT to Use (scope-creep guard for a single-user local-first tool)

| Avoid adding | Why | Use instead |
|--------------|-----|-------------|
| `tauri-plugin-log` / `@tauri-apps/plugin-log` | New Rust crate + JS pkg + capability permission + `lib.rs` registration, to replace one `writeTextFile` call. Multi-target/rotation features unused in a single-user Windows tool. | Hand-rolled `src/lib/frontendLog.ts` on existing `@tauri-apps/plugin-fs`. |
| ESLint / Prettier | Project decision: strict `tsc` is the quality gate (CLAUDE.md: don't add a linter without discussing). CI's `pnpm build` = `tsc` already enforces `noUnusedLocals`/`noUnusedParameters`. | `pnpm build` (tsc) as the CI type/quality gate. |
| Drizzle / Prisma / any ORM | Prisma is a confirmed dead-end in Tauri production; Drizzle is explicitly a v3-only escape hatch. FK/orphan validation needs no ORM. | Raw `tauri-plugin-sql` + `PRAGMA foreign_key_check` + `better-sqlite3` test assertions. |
| An OS build matrix in CI | macOS/Linux are out of scope; testing unshipped platforms wastes minutes and can flag false failures. | Single `windows-latest` runner. |
| A new diff/compare/grid component library | `@tanstack/react-table` + shadcn tables already render datasheets. | Existing table primitives. |
| `node:sqlite` for new data-layer tests | Vitest 4 import-stripping bug (#7177) breaks it — a logged Key Decision. | `better-sqlite3` (already the harness). |
| Telemetry / crash-reporting SaaS (Sentry, etc.) | Local-first, no-network, no-telemetry constraint. The disk log IS the diagnostics channel. | `preflight.log` + `frontend.log` in `%APPDATA%`. |
| Bumping updater/process/fs plugins | All three already at current latest (2.10.1 / 2.3.1 / 2.5.1). | Leave as-is. |

---

## Version Compatibility

| Package | Installed | Latest (2026-06-15) | Notes |
|---------|-----------|---------------------|-------|
| `@tauri-apps/plugin-updater` (JS) + `tauri-plugin-updater` (Rust) | 2.10.1 / 2.10.1 | 2.10.1 | Current. JS + Rust match — keep in lockstep on any future bump. |
| `@tauri-apps/plugin-process` (JS) + `tauri-plugin-process` (Rust) | 2.3.1 / 2.3.1 | 2.3.1 | Current. `relaunch()` already used. |
| `@tauri-apps/plugin-fs` (JS) | 2.5.1 | 2.5.1 | Current. `tauri-plugin-fs = "2"` in Cargo.toml resolves compatibly. |
| `@tauri-apps/cli` | 2.0.0 (`^`) | 2.11.2 | Wide caret; resolves to current 2.11.x. tauri-action pins its own internally — no conflict. |
| `tauri-action` | `@v0` | `@v0` and `@v1` both maintained | `@v0` works today; the test-gate restructure doesn't require moving to `@v1`. Optional future bump. |
| `Swatinem/rust-cache` | `@v2` | `@v2` | Workspace path `src-tauri -> target` correct for this layout. |
| `better-sqlite3` | 12.10.0 | current | Pinned in `pnpm.onlyBuiltDependencies` — native build handled in CI via `pnpm install`. |
| `vitest` | 4.1.5 | current | Node env required for data-layer tests (`// @vitest-environment node`). Already configured. |

**One stability invariant (not a version):** bundle `identifier` (`com.hobbyforge.app`) and `productName` (`HobbyForge`) must remain byte-identical across releases for NSIS in-place updates and `%APPDATA%` path stability. Treat any change to either as a breaking event requiring a migration plan.

---

## Sources

- `/tauri-apps/tauri-action` (Context7) — draft-release testing, `uploadWorkflowArtifacts`, artifact caching (`Swatinem/rust-cache`, `setup-node` cache), `act` local testing — HIGH
- `/tauri-apps/tauri-docs` (Context7, updater.mdx) — `check()→downloadAndInstall()→relaunch()` pattern, `tauri.conf.json` `pubkey`/`endpoints`, `latest.json` JSON shape, dynamic endpoints — HIGH
- `npm view` (live registry, 2026-06-15) — confirmed latest: plugin-updater 2.10.1, plugin-process 2.3.1, plugin-fs 2.5.1, plugin-log 2.8.0, @tauri-apps/cli 2.11.2 — HIGH
- Repo files read directly: `.github/workflows/release.yml`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `package.json`, `src/hooks/useAppUpdate.ts`, `src/components/common/UpdateBanner.tsx`, `tests/data-layer/db-helpers.ts`, `src-tauri/migrations/` (47 files) — HIGH
- `git remote -v` — confirmed `origin = Twan01/warhammer-app` (updater endpoint points at the actual release repo) — HIGH
- `.planning/debug/update-breaks-app-launch.md` — root cause (CRLF/LF checksum drift), applied fix (`.gitattributes` + hardened `preflight_migration_repair` + `preflight.log`), and the flagged pre-existing 046→047 db-helpers gap — HIGH

---
*Stack research for: HobbyForge v0.6.0 "Bulletproof & Honest" — reliability/CI hardening on a mature Tauri 2 desktop app*
*Researched: 2026-06-15*
