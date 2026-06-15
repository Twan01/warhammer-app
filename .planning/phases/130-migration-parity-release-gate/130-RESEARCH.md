# Phase 130: Migration Parity & Release Gate - Research

**Researched:** 2026-06-15
**Domain:** Build-time release gating, Node ESM tooling, SQLite migration-chain testing (Vitest + better-sqlite3), Tauri 2 / tauri-plugin-sql migration parity
**Confidence:** HIGH (all claims verified against the live codebase in this session)

## Summary

This phase is almost entirely **codebase-grounded plumbing**, not new-technology research. Every fact the planner needs was verified directly against the working tree: file counts, regex behavior, the FK toggle, the 047 schema shape, the `.gitattributes` state, and the `package.json` script wiring. No external packages are installed, so there is **no Package Legitimacy Audit** and **no Environment Availability** concern beyond tools already in use (`node`, `pnpm`, `vitest`, `better-sqlite3`).

The work splits cleanly into three mechanical changes plus one wiring step, all confirmed safe:
1. **REL-03** — Replace the 46-element hardcoded `HOBBYFORGE_MIGRATIONS` array in `tests/data-layer/db-helpers.ts` with a disk-derived list (`readdirSync` → filter `.sql` → numeric-prefix sort). This makes the array length 47, turning the currently-RED D-06 parity test green, and self-maintains forever. Add a wargear (047) schema-shape assertion.
2. **REL-04** — Extend `scripts/check-version.mjs` to additionally assert `migration file count === lib.rs Migration{} count`. The "data-layer list length" leg is enforced **transitively** (see D-05 analysis below) — do NOT import the `.ts` helper from the `.mjs` script.
3. **REL-05** — Fold a CR-byte (`0x0D`) Buffer scan over `src-tauri/migrations/*.sql` into the same script.
4. **Wiring** — Add `"prebuild": "node scripts/check-version.mjs"` so `pnpm build` (and thus `tauri build`) refuses to proceed on any parity failure.

**Primary recommendation:** Make the disk-derivation in `db-helpers.ts` the single source of truth for the migration order; have `check-version.mjs` independently re-derive the file count via its own `readdirSync` (never import the TS helper); and verify the regex `/Migration\s*\{/g` against lib.rs — already confirmed in this session to match exactly the 47 real struct literals and nothing else.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Migration-list source of truth | Test/build tooling (`db-helpers.ts`) | — | Tests apply the chain in-memory; deriving from disk removes the hand-maintained drift vector |
| Version parity (package ↔ tauri) | Release gate script (`check-version.mjs`) | — | Pure file-read comparison, no runtime DB |
| Migration-count parity (disk ↔ lib.rs ↔ data-layer) | Release gate script + Vitest test | — | Script asserts disk===lib.rs; Vitest asserts lib.rs===helper; helper===disk by construction |
| CR-byte enforcement | Release gate script (runtime backstop) | `.gitattributes` (git-layer, already present) | Two independent layers prevent CRLF checksum drift recurrence |
| Local build gating | npm `prebuild` lifecycle hook | — | `pnpm build` auto-runs `prebuild`; `tauri build` runs `pnpm build` per CLAUDE.md |

## Confirmed Current State (all verified this session)

| Fact | Verified Value | Source |
|------|---------------|--------|
| Migration `.sql` files on disk | **47** | `ls src-tauri/migrations/*.sql \| wc -l` [VERIFIED] |
| Latest migration filename | `047_army_list_unit_wargear.sql` | directory listing [VERIFIED] |
| All filenames match `^[0-9]{3}_` | **Yes** — zero exceptions | `grep -vE '^[0-9]{3}_'` returned nothing [VERIFIED] |
| `lib.rs` `Migration {` struct literals | **47** | `grep -oE 'Migration[[:space:]]*\{' \| wc -l` [VERIFIED] |
| `lib.rs` last entry | `version: 47, description: "army_list_unit_wargear"` (lines 284–289) | `lib.rs` read [VERIFIED] |
| Hardcoded `HOBBYFORGE_MIGRATIONS` length | **46** (stops at `046_*`, line 58) | `db-helpers.ts` read [VERIFIED] |
| `HOBBYFORGE_MIGRATION_COUNT` | `= .length` → 46 (line 64) | `db-helpers.ts` read [VERIFIED] |
| D-06 test assertion | `expect(matches?.length).toBe(HOBBYFORGE_MIGRATION_COUNT)` → 47 vs 46 → **RED** | `migration-parity.test.ts` line 30 [VERIFIED] |
| `check-version.mjs` scope today | version-only compare, `process.exit(1)` on mismatch | script read [VERIFIED] |
| `package.json` version / `tauri.conf.json` version | both `0.5.7` (version leg passes today) | `node -e` + context [VERIFIED] |
| `prebuild` hook exists? | **No** — scripts are `dev/build/preview/test/test:watch/tauri/check:version/build:udb/download:wahapedia` | `package.json` read [VERIFIED] |
| `build` script | `"tsc && vite build"` | `package.json` read [VERIFIED] |
| CR bytes in any migration today | **None** (clean) | per-file `grep -qU $'\r'` scan, no hits [VERIFIED] |
| `.gitattributes` LF rules | `*.sql text eol=lf` (line 16) + `src-tauri/migrations/** text eol=lf` (line 20) present | `.gitattributes` read [VERIFIED] |
| `schema-shape.test.ts` exists | **Yes**, node-env, uses `createHobbyforgeDb()` + `table_info` pragma pattern | file read [VERIFIED] |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REL-03 | Data-layer migration list derived from disk so parity test passes and never drifts; exercises wargear schema | D-01/D-02/D-03 below: exact `readdirSync` + numeric-sort code shape; FK-ON guard preserved; 047 schema-shape assertion drop-in provided |
| REL-04 | Single parity check: `package.json` ver == `tauri.conf.json` ver AND migration file count == lib.rs `Migration{}` count == data-layer list length (locally before build) | D-04/D-05/D-08 below: regex verified, transitive-enforcement chain proven, `prebuild` hook semantics confirmed |
| REL-05 | Fail if any `src-tauri/migrations/*.sql` contains a CR byte | D-06 below: Buffer `.includes(0x0D)` approach + cross-platform gotchas |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Replace hardcoded `HOBBYFORGE_MIGRATIONS` with disk-derived list: `readdirSync(migrationsDir)`, filter `.sql`, **sort by numeric prefix** (not lexical). `HOBBYFORGE_MIGRATION_COUNT = list.length`.
- **D-02:** Preserve the post-chain `PRAGMA foreign_keys` ON assertion (migration 022 toggles it).
- **D-03:** Add a data-layer assertion that `army_list_unit_wargear` table/columns exist (047 genuinely covered).
- **D-04:** Extend `scripts/check-version.mjs` (keep `pnpm check:version` name): version compare (kept) + migration file count === lib.rs `Migration{}` count (regex `/Migration\s*\{/g`).
- **D-05:** The "=== data-layer list length" leg is enforced **transitively**, NOT by importing the `.ts` helper from `.mjs`. Document the chain in a comment.
- **D-06:** Fold CR scan into the same script: read each `*.sql` as a Buffer, fail if any byte `0x0D`, list offending filenames. Migrations only.
- **D-07:** Existing `.gitattributes` stays; CR gate is the runtime backstop.
- **D-08:** Add `"prebuild": "node scripts/check-version.mjs"` so `pnpm build`/`tauri build` refuse on failure. CI half deferred to Phase 131 — no GitHub Actions YAML here.

### Claude's Discretion

- Exact failure-message wording, check ordering within `check-version.mjs`, and the precise wargear schema-shape assertion.
- Whether the wargear assertion lives in `migration-parity.test.ts` or `schema-shape.test.ts` (both exist; both node-env).

### Deferred Ideas (OUT OF SCOPE)

- GitHub Actions CI invoking `pnpm check:version` + full suite (REL-01/02 → Phase 131).
- NSIS update verification, relaunch UX, `preflight.log`/`frontend.log` diagnostics (REL-06/07/08 → Phase 132).
- CR/encoding linting across non-migration files — not needed.

## Project Constraints (from CLAUDE.md)

- **No ESLint/Prettier** — do not add a linter/formatter. Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`) is the quality bar.
- **pnpm** is the package manager (`pnpm test`, `pnpm build`, `pnpm tauri build`).
- **Tauri 2 + tauri-plugin-sql**; migrations run automatically at app start in filename order; **never edit existing migration files** (changing applied migration bytes breaks `_sqlx_migrations` SHA-384). This phase does not edit any `.sql` — confirmed safe.
- Scripts are ESM `.mjs` or `node --experimental-strip-types *.ts`.
- Tests: Vitest 4 + better-sqlite3, data-layer tests use `// @vitest-environment node`.
- Parameterized queries use `$1,$2` (not relevant here — tests use better-sqlite3 `?` placeholders, which is the existing convention in `db-helpers.ts` factory helpers).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration ordering | A second hand-maintained list / a parallel manifest file | `readdirSync` + numeric-prefix sort on the existing files | The whole point of REL-03 is to remove the hand-maintained drift vector; a manifest just relocates it |
| Line-ending detection | A text-mode read + `\r\n` regex | Buffer read + `.includes(0x0D)` | Reading as a string with an encoding can mask a lone CR; raw bytes are unambiguous |
| Counting lib.rs entries | A Rust-aware parser | The already-proven regex `/Migration\s*\{/g` | Verified this session to match exactly 47; a parser is overkill for a struct-literal count |
| Cross-file count agreement | Importing TS into the `.mjs` gate | Transitive enforcement (D-05) | Avoids `--experimental-strip-types`/loader complexity in the build-critical gate |

## Detailed Findings

### Finding 1 — Disk derivation: numeric vs lexical sort (REL-03 / D-01)

**Verified:** Every migration filename matches `^[0-9]{3}_` with **zero exceptions** (`grep -vE '^[0-9]{3}_'` returned nothing). Because all prefixes are **zero-padded to 3 digits**, a lexical (default `Array.prototype.sort()`) sort and a numeric-prefix sort produce the **identical order** for the current 47 files. `"009_..." < "010_..."` holds lexically precisely because of the zero-padding.

**However** — the decision (D-01) explicitly mandates numeric-prefix sort, and it is the safer choice: it survives a future un-padded or 4-digit filename (e.g. a hypothetical `100_*` vs `99_*`). Recommend numeric sort to honor D-01 and future-proof.

**Exact code shape** to replace lines 12–64 of `db-helpers.ts` (the hardcoded array + count). `migrationsDir` already exists at line 9; `readdirSync` must be added to the existing `node:fs` import (currently only `readFileSync`):

```typescript
// Source: pattern verified against tests/data-layer/db-helpers.ts current state
import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = resolve(repoRoot, "src-tauri/migrations");

// Authoritative migration order, derived from disk so it can never drift
// from lib.rs / the migration files. Sorted by 3-digit numeric prefix to
// match lib.rs get_migrations() ordering (001..NNN).
export const HOBBYFORGE_MIGRATIONS: readonly string[] = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort(
    (a, b) =>
      Number.parseInt(a.slice(0, 3), 10) - Number.parseInt(b.slice(0, 3), 10),
  );

// Phase 107: rules.db eliminated — rules migrations removed
export const RULES_MIGRATIONS = [] as const;

export const HOBBYFORGE_MIGRATION_COUNT = HOBBYFORGE_MIGRATIONS.length; // 47 (disk-derived)
export const RULES_MIGRATION_COUNT = RULES_MIGRATIONS.length; // 0
```

The `createHobbyforgeDb()` body (lines 72–88) requires **no change** — it already iterates `HOBBYFORGE_MIGRATIONS` and re-checks the FK pragma. The FK-ON guard at lines 82–85 is preserved automatically (D-02 satisfied with zero edits to that block).

**Caveat — type change:** `HOBBYFORGE_MIGRATIONS` changes from a literal tuple (`as const`) to `readonly string[]`. Any consumer that relied on the literal tuple type would break, but the only importers are `migration-parity.test.ts` (imports `HOBBYFORGE_MIGRATION_COUNT`, a `number` — unaffected) and `createHobbyforgeDb()` (iterates as strings — unaffected). Confidence HIGH that no type regression occurs.

### Finding 2 — lib.rs `Migration {` regex robustness (REL-04 / D-04)

**Verified exhaustively this session.** Every occurrence of the token `Migration` in `lib.rs`:

| Line | Text | Matches `/Migration\s*\{/`? |
|------|------|------------------------------|
| 2 | `use tauri_plugin_sql::{Migration, MigrationKind};` | No — followed by `,` / `K` |
| 6 | `fn get_migrations() -> Vec<Migration> {` | No — `Migration>` then space then `{`; the `{` follows `>`, not `Migration` |
| 8–284 (×47) | `        Migration {` | **Yes** — the 47 real struct literals |
| (×47) | `kind: MigrationKind::Up,` | No — `MigrationKind`, the `{` requirement fails |
| 387 | `migrations: &[Migration],` | No — `Migration]` |
| 1721 | `let sample: Vec<&Migration> = ...` | No — `Migration>` |

`grep -oE 'Migration[[:space:]]*\{'` (the POSIX-ERE equivalent of `/Migration\s*\{/g`) returns **exactly 47**. The regex is robust: `Migration>` (in `Vec<Migration>`) does not match because `>` is not whitespace and the `{` two tokens later is preceded by `>` then ` `, not directly by `Migration\s*`. Line 6 is the subtle one — confirmed it does NOT match.

**Recommendation:** Reuse the identical regex `/Migration\s*\{/g` that `migration-parity.test.ts` line 29 already uses, for consistency. No special handling for comments needed — there are no commented-out `Migration {` blocks in lib.rs.

**Code shape for the count in `check-version.mjs`:**

```javascript
const libRs = readFileSync(resolve(root, "src-tauri", "src", "lib.rs"), "utf-8");
const libRsCount = (libRs.match(/Migration\s*\{/g) ?? []).length;
const fileCount = readdirSync(resolve(root, "src-tauri", "migrations"))
  .filter((f) => f.endsWith(".sql")).length;
```

### Finding 3 — The "data-layer list length" leg: transitive enforcement (REL-04 / D-05)

**Recommendation (matches locked D-05): do NOT import `db-helpers.ts` into `check-version.mjs`.** Re-derive `fileCount` independently in the `.mjs` via its own `readdirSync`.

The three-way parity is guaranteed by this chain:
1. `check-version.mjs` asserts **`fileCount === libRsCount`** (disk === lib.rs).
2. The Vitest D-06 test (`migration-parity.test.ts`) asserts **`libRsCount === HOBBYFORGE_MIGRATION_COUNT`** (lib.rs === helper).
3. After D-01, `HOBBYFORGE_MIGRATION_COUNT === fileCount` **by construction** (the helper *is* `readdirSync(...).filter(...).length`).

Therefore all three legs agree. `check-version.mjs` enforces leg (1) at build time; the Vitest suite (run by `pnpm test`, and in Phase 131's CI) enforces leg (2); leg (3) is structural. Document this exact chain in a comment block in `check-version.mjs` per D-05.

**Why not import:** `check-version.mjs` is plain ESM run via `node scripts/check-version.mjs` (no `--experimental-strip-types`). Importing a `.ts` would require either changing the invocation to `node --experimental-strip-types` or a loader, adding fragility to the build-critical gate. The transitive approach keeps the gate a zero-dependency, plain-Node script — which is also exactly what Phase 131's CI needs (clean checkout, no APPDATA, no better-sqlite3 in the gate itself).

**Caveat:** The transitive chain only holds if `pnpm test` actually runs the D-06 test. In the local `prebuild` hook, only `check-version.mjs` runs (legs 1 + structural 3), NOT the Vitest suite — so a desync where `lib.rs` count ≠ `HOBBYFORGE_MIGRATION_COUNT` but `lib.rs` count === `fileCount` is theoretically possible to slip a local build. But after D-01, `HOBBYFORGE_MIGRATION_COUNT === fileCount` is structural, so `fileCount === libRsCount` (gate) implies `HOBBYFORGE_MIGRATION_COUNT === libRsCount`. The gate alone is sufficient post-D-01. The Vitest test remains the explicit, readable assertion of leg (2). This is sound.

### Finding 4 — CR-byte detection in Node (REL-05 / D-06)

**Approach (verified correct):** Read each migration as a raw Buffer and test for byte `0x0D`:

```javascript
import { readFileSync, readdirSync } from "node:fs";

const migrationsDir = resolve(root, "src-tauri", "migrations");
const offenders = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => readFileSync(resolve(migrationsDir, f)).includes(0x0d));
// fail if offenders.length > 0, listing each filename
```

**Cross-platform gotchas (all addressed):**
- **Read as Buffer, not string.** `readFileSync(path)` with NO encoding argument returns a `Buffer`; `Buffer.prototype.includes(0x0d)` scans raw bytes. Passing `"utf-8"` would still preserve `\r` in the JS string (Node does NOT normalize line endings on read), so `string.includes("\r")` *also* works — but Buffer is unambiguous and the decision (D-06) specifies Buffer. Use Buffer.
- **No git auto-conversion concern at read time.** `.gitattributes eol=lf` affects what git writes to the working tree on checkout; once on disk, Node reads the actual bytes. The gate is testing the on-disk bytes, which is exactly the runtime-backstop intent (D-07).
- **The gate runs on Windows here.** The dev machine is Windows 11 (PowerShell primary). A misconfigured `core.autocrlf=true` checkout *without* the `.gitattributes` override could introduce CRLF — which is precisely the regression this gate catches. Confirmed today's tree is clean (no CR in any file), so the gate passes on the current tree and only fires on regression.

### Finding 5 — Wargear (047) schema-shape assertion (REL-03 / D-03)

**047 creates:** table `army_list_unit_wargear` with columns:

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER | PK AUTOINCREMENT |
| `army_list_unit_id` | INTEGER | NOT NULL, FK → `army_list_units(id)` ON DELETE CASCADE |
| `weapon_name` | TEXT | NOT NULL |
| `quantity` | INTEGER | NOT NULL DEFAULT 1 |
| `created_at` | TEXT | NOT NULL DEFAULT `datetime('now')` |

Plus `UNIQUE (army_list_unit_id, weapon_name)` and index `idx_alu_wargear_unit`.

**Drop-in assertion** (matches the existing `schema-shape.test.ts` `table_info` pattern; the planner may place it in `schema-shape.test.ts` or `migration-parity.test.ts` per discretion):

```typescript
it("army_list_unit_wargear table exists with expected columns (047)", () => {
  const db = createHobbyforgeDb();
  const columns = db.pragma("table_info(army_list_unit_wargear)") as ColumnInfo[];
  const names = columns.map((c) => c.name);
  expect(names).toEqual(
    expect.arrayContaining([
      "id",
      "army_list_unit_id",
      "weapon_name",
      "quantity",
      "created_at",
    ]),
  );
  db.close();
});
```

If placed in `schema-shape.test.ts`, it can reuse the suite's `beforeEach` `db` and the `ColumnInfo` interface (lines 7–14) — no `createHobbyforgeDb()`/`close()` boilerplate needed there. In `migration-parity.test.ts` it would need its own `createHobbyforgeDb()` + `close()` (and a local `ColumnInfo` or an inline cast).

### Finding 6 — Migration-execution ordering hazard for 047 (research-focus #8)

**No hazard.** 047's only dependency is `army_list_units`, created in **031_army_list_v3.sql** (also referenced in 001 but the v3 table is the live one) — verified via `grep -lE 'CREATE TABLE.*army_list_units'` → `001` and `031`, both far earlier in the chain. Adding 047 to the in-memory chain via D-01 will apply cleanly because the FK target already exists.

047 does **not** reference `rules.db` (eliminated in Phase 107) — it only touches `army_list_units` and `udb_unit_weapons` (the latter only as a *denormalized* TEXT comment, NOT a real FK — confirmed in the migration header: "weapon names reference udb_unit_weapons.name (denormalized TEXT, not an FK)"). So no rules.db / cross-DB dependency. Confidence HIGH that adding 047 to the test chain executes without error.

### Finding 7 — `prebuild` hook + `tauri build` wiring (REL-04 / D-08, research-focus #7)

**npm/pnpm lifecycle (CITED: npm docs lifecycle scripts):** A script named `prebuild` is automatically run by pnpm/npm *immediately before* the `build` script when you run `pnpm build` (or `npm run build`). This is the standard `pre<name>`/`post<name>` lifecycle behavior — confirmed applicable to pnpm. So adding:

```json
"prebuild": "node scripts/check-version.mjs",
```

makes `pnpm build` run the gate first; a non-zero exit (`process.exit(1)`) aborts the build before `tsc && vite build` runs.

**`tauri build` → `pnpm build`:** Per CLAUDE.md ("pnpm build runs before tauri build") and standard Tauri config, `tauri build` invokes the frontend `beforeBuildCommand`. Confirm the exact command in `tauri.conf.json` `build.beforeBuildCommand` during planning — if it is `pnpm build` (or `npm run build`), the `prebuild` hook fires transitively and the gate guards production bundles. **Verification step for the planner:** read `src-tauri/tauri.conf.json` `build.beforeBuildCommand` to confirm it routes through `pnpm build` (not directly `vite build`, which would bypass `prebuild`).

**Caveat:** If `beforeBuildCommand` is `vite build` directly (bypassing the `build` script), the `prebuild` hook would NOT fire on `tauri build`. This must be checked. If so, either point `beforeBuildCommand` at `pnpm build`, or add the gate call into `beforeBuildCommand`. (Most likely it already calls `pnpm build` per CLAUDE.md, but verify.)

### Finding 8 — Phase 131 (CI) friendliness (research-focus #9, do NOT implement)

Keep `check-version.mjs` CI-ready so Phase 131 can invoke `pnpm check:version` unchanged:
- **No APPDATA / installed-DB dependency** — unlike `scripts/check-migrations.mjs` (which reads the runtime DB from APPDATA), this gate reads only repo files. Keep it that way.
- **Clean exit codes** — `process.exit(0)` on all-pass, `process.exit(1)` on any failure (the existing script already does this; preserve the contract).
- **No better-sqlite3 / no DB instantiation in the gate** — pure file reads + regex + Buffer scan. Keeps CI fast and avoids native-module build steps in the gate job.
- **Clear per-check messages** — print which leg failed (version / count / CR) and the offending values/filenames, so a CI log is self-diagnosing.
- Do **not** add `.github/workflows/*.yml` in this phase (deferred to 131).

## Common Pitfalls

### Pitfall 1: Lexical sort masking the requirement
**What goes wrong:** Using the default `.sort()` "because it works today" — it does, only because every prefix is zero-padded to 3 digits. A future `100_*` migration would sort *before* `099_*`? No — `"099" < "100"` lexically too. Lexical breaks only with **un-padded** names (`"9_" > "10_"`). Since the convention is strict 3-digit padding, lexical is currently safe but the decision mandates numeric.
**How to avoid:** Use numeric-prefix sort (`parseInt(f.slice(0,3))`) per D-01. Costs nothing, future-proofs, honors the locked decision.
**Warning sign:** A reviewer asking "why numeric if lexical works" — answer: padding discipline isn't guaranteed forever, and D-01 is locked.

### Pitfall 2: Importing the TS helper into the .mjs gate
**What goes wrong:** Trying to `import { HOBBYFORGE_MIGRATION_COUNT } from "../tests/data-layer/db-helpers.ts"` in `check-version.mjs` forces `--experimental-strip-types` or a loader, and drags `better-sqlite3` (a native module) into the gate's dependency graph — slow and CI-fragile.
**How to avoid:** Re-derive `fileCount` independently in the `.mjs` (D-05). Transitive enforcement covers leg 3.
**Warning sign:** The gate suddenly needing a build step or native module.

### Pitfall 3: `tauri build` bypassing the prebuild hook
**What goes wrong:** If `beforeBuildCommand` calls `vite build` directly, `prebuild` never fires and production bundles skip the gate.
**How to avoid:** Verify `beforeBuildCommand` routes through `pnpm build`. (Step 7 verification above.)
**Warning sign:** A release built with a parity mismatch despite the hook being present.

### Pitfall 4: String-encoding read hiding a lone CR
**What goes wrong:** Reading with a text transform that normalizes line endings would mask a CR. Node's `readFileSync(path, "utf-8")` does NOT normalize (so it's actually safe), but Buffer is unambiguous and is what D-06 specifies.
**How to avoid:** Buffer read + `.includes(0x0d)`.
**Warning sign:** CR gate passing on a file you know has CRLF.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-maintained migration array in `db-helpers.ts` | Disk-derived list (`readdirSync` + numeric sort) | This phase (REL-03) | Eliminates the drift class that caused the current RED test |
| Version-only `check:version` | Multi-leg release gate (version + migration count + CR) | This phase (REL-04/05) | Single command guards all schema-version representations |
| Git-layer-only line-ending control (`.gitattributes`) | Git-layer + runtime CR backstop | This phase (REL-05) | Defense-in-depth against the CRLF SHA-384 drift that broke launch |

## Runtime State Inventory

> Not a rename/refactor/migration-of-data phase. This phase adds test/tooling logic and a build hook; it does NOT alter stored data, services, OS state, secrets, or installed artifacts.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no `.sql` migration is added or edited; no data written | None — verified: phase only edits `db-helpers.ts`, `check-version.mjs`, a test file, `package.json` |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — no compiled output changes; `prebuild` hook is config only | None — verified: no `include_str!` source changes, so `_sqlx_migrations` SHA-384 set is untouched |

## Validation Architecture

> `workflow.nyquist_validation` not found in `.planning/config.json` scan — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 (`vitest run`) + better-sqlite3 (node-env data-layer tests) |
| Config file | `vitest.config.ts` / `vite.config.ts` (verify exact path during planning) |
| Quick run command | `pnpm test -- tests/data-layer/migration-parity.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REL-03 | D-06 parity test green (47===47); chain applies 047 | unit | `pnpm test -- tests/data-layer/migration-parity.test.ts` | Yes (currently RED) |
| REL-03 | wargear `army_list_unit_wargear` schema exists | unit | `pnpm test -- tests/data-layer/schema-shape.test.ts` | Yes (assertion to ADD) |
| REL-04 | version + migration-count parity gate | smoke | `pnpm check:version` (expect exit 0 on clean tree) | `scripts/check-version.mjs` (to EXTEND) |
| REL-04 | gate fails on count mismatch | smoke (negative) | manual: temporarily desync, expect exit 1 | covered by manual verify |
| REL-05 | CR-byte gate passes clean, fails on injected CR | smoke | `pnpm check:version` (clean → 0; inject CR → 1) | same script |
| REL-04 | `prebuild` runs gate before `pnpm build` | smoke | `pnpm build` runs gate first (observe gate output) | `package.json` (hook to ADD) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/data-layer/migration-parity.test.ts` (or the touched test file)
- **Per wave merge:** `pnpm test` + `pnpm check:version`
- **Phase gate:** Full `pnpm test` green AND `pnpm check:version` exit 0 before `/gsd:verify-work`

### Wave 0 Gaps
- None — `migration-parity.test.ts`, `schema-shape.test.ts`, `db-helpers.ts`, and `check-version.mjs` all exist. No new test infrastructure, framework install, or fixtures required. The work is editing existing files and adding assertions.

## Security Domain

> `security_enforcement` not found in config (treated as enabled). This phase has a minimal security surface.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user desktop app, no auth |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | minimal | Files read are repo-internal (`src-tauri/migrations/*.sql`, `lib.rs`, JSON manifests) — trusted local paths, no user input |
| V6 Cryptography | no (read-only awareness) | The phase *protects* the existing SHA-384 migration-checksum integrity (`_sqlx_migrations`) by preventing CR drift; it does not implement crypto |

### Known Threat Patterns for {Node ESM build tooling}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Migration checksum drift breaking launch (the root cause this phase guards) | Tampering / DoS | CR-byte gate + `.gitattributes` LF normalization; do not edit applied `.sql` files |
| Path traversal in file globs | Tampering | Paths are fixed `resolve(root, "src-tauri/migrations")` — no user-supplied path; safe |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tauri.conf.json` `build.beforeBuildCommand` routes through `pnpm build` (so `prebuild` fires on `tauri build`) — per CLAUDE.md but not byte-verified this session | Finding 7 | If it calls `vite build` directly, the gate won't guard production `tauri build`. Planner must read `tauri.conf.json` and confirm; cheap to verify. |
| A2 | `pnpm` honors the `prebuild` lifecycle hook identically to npm | Finding 7 | LOW — pnpm documents `pre`/`post` lifecycle support; if a `.npmrc` disabled lifecycle scripts the hook wouldn't run. Verify no `enable-pre-post-scripts=false` in `.npmrc`. |
| A3 | The wargear assertion's exact column list matches 047 as read | Finding 5 | None practically — column list verified directly from `047_army_list_unit_wargear.sql`. |

## Open Questions

1. **Does `tauri.conf.json` `beforeBuildCommand` route through `pnpm build`?** (A1)
   - What we know: CLAUDE.md states "pnpm build runs before tauri build."
   - What's unclear: The literal command string in `tauri.conf.json`.
   - Recommendation: Planner adds a one-line verification task — read `src-tauri/tauri.conf.json` `build.beforeBuildCommand`; if not `pnpm build`/`npm run build`, repoint it or call the gate directly.

2. **Is there an `.npmrc` disabling pre/post scripts?** (A2)
   - Recommendation: Quick `grep enable-pre-post-scripts .npmrc` during planning; if absent, default is enabled — no action.

3. **Wargear assertion home: `schema-shape.test.ts` vs `migration-parity.test.ts`?**
   - This is explicit executor discretion (D-03 + Claude's Discretion). Recommendation: `schema-shape.test.ts` — it already has the `ColumnInfo` interface, `beforeEach` db, and is the semantic home for "does this table/column exist" checks. Less boilerplate, better cohesion.

## Environment Availability

> All tooling is already in active use in the repo — no new external dependencies.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | `check-version.mjs`, scripts | ✓ | (project-pinned) | — |
| pnpm | all build/test commands | ✓ | — | — |
| vitest | data-layer tests | ✓ | 4 (per CLAUDE.md) | — |
| better-sqlite3 | in-memory migration-chain tests | ✓ | (existing) | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Sources

### Primary (HIGH confidence)
- Live codebase reads (this session): `tests/data-layer/db-helpers.ts`, `tests/data-layer/migration-parity.test.ts`, `tests/data-layer/schema-shape.test.ts`, `scripts/check-version.mjs`, `src-tauri/src/lib.rs` (lines 1–30, 278–300), `src-tauri/migrations/047_army_list_unit_wargear.sql`, `src-tauri/migrations/022_paintless_steps.sql`, `.gitattributes`, `package.json` scripts, `.planning/{REQUIREMENTS,STATE}.md`, `130-CONTEXT.md`.
- Shell verifications: migration file count (47), filename-pattern check (all `^[0-9]{3}_`), `Migration {` regex count (exactly 47), CR-byte scan (clean), FK toggle in 022 (OFF line 4 / ON line 37), `army_list_units` origin (031).

### Secondary (MEDIUM confidence)
- npm/pnpm `pre<script>` lifecycle semantics (standard, widely documented) [CITED: docs.npmjs.com/cli/using-npm/scripts — pre/post lifecycle].

### Tertiary (LOW confidence)
- None. No unverified claims drive recommendations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all tooling pre-existing and verified.
- Architecture / code shapes: HIGH — every code shape grounded in a file read; regex behavior empirically confirmed against the full set of `Migration` token occurrences.
- Pitfalls: HIGH — each derived from a verified codebase fact (sort padding, native-module import cost, beforeBuildCommand routing).
- One MEDIUM assumption (A1: `beforeBuildCommand` routing) flagged for a cheap planner verification.

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (stable — internal tooling, no fast-moving external deps; invalidated only if migrations are added/renamed before planning, which would still be handled by the disk-derivation design)
