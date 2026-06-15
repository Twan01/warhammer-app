# Phase 130: Migration Parity & Release Gate - Pattern Map

**Mapped:** 2026-06-15
**Files analyzed:** 5 (all modified, 0 net-new)
**Analogs found:** 5 / 5 (every target has an in-repo analog — usually the file itself plus a sibling)

> This phase edits EXISTING files. For each, the "analog" is the file's current
> idiom plus a sibling that already demonstrates the exact technique being added
> (disk derivation, PRAGMA column introspection, Buffer CR scan, lifecycle hook).
> RESEARCH.md already carries the exact code shapes — this map pins each idiom to
> a concrete `file:line` anchor so the executor matches house style, not generic
> conventions.

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `tests/data-layer/db-helpers.ts` | test-fixture / config | file-I/O (readdirSync derive) | self (lines 4–9, 76–77) + `scripts/check-migrations.mjs:7–14` | exact (same dir, same `readdirSync` idiom) |
| `tests/data-layer/migration-parity.test.ts` | test | transform (regex count) | self (lines 23–31) | exact |
| `tests/data-layer/schema-shape.test.ts` | test | request-response (PRAGMA introspection) | self (lines 7–14, 58–80) | exact (`ColumnInfo` + `table_info` already present) |
| `scripts/check-version.mjs` | config / build-gate script | file-I/O + transform | self (lines 1–17) + `scripts/check-migrations.mjs` (readdirSync, Buffer reads, version map) + `migration-parity.test.ts:29` (regex) | exact (compose three existing idioms) |
| `package.json` | config | n/a (manifest) | self `scripts` block (lines 6–16) | exact |

## Pattern Assignments

### `tests/data-layer/db-helpers.ts` (test-fixture, file-I/O)

**Analog:** the file itself + `scripts/check-migrations.mjs`. Replace the hardcoded
`HOBBYFORGE_MIGRATIONS` tuple (lines 12–59) and its count (line 64) with a
disk-derived list. Everything else in the file is untouched.

**Existing import + path setup to extend** (`db-helpers.ts:1–9`):
```typescript
// @vitest-environment node

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";           // ← add readdirSync here
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = resolve(repoRoot, "src-tauri/migrations");  // ← already present, reuse
```
House style: `node:fs` / `node:path` / `node:url` prefixed specifiers, ESM
`import.meta.url` → `repoRoot`. `migrationsDir` already exists at line 9 — do NOT
recompute it.

**Disk-derivation idiom to copy** — the `.filter(.endsWith(".sql"))` + numeric-prefix
parse is already demonstrated in `scripts/check-migrations.mjs:9–14`:
```javascript
// scripts/check-migrations.mjs:9-14 (existing prior art for filter + prefix parse)
const files = readdirSync(migDir).filter(f => f.endsWith('.sql'));
const byVersion = new Map();
for (const f of files) {
  const m = f.match(/^(\d+)_/);
  if (m) byVersion.set(parseInt(m[1], 10), f);
}
```
For `db-helpers.ts`, D-01 mandates a numeric-prefix **sort** (RESEARCH.md Finding 1
has the exact replacement for lines 12–64). Style notes: `export const ... : readonly string[]`,
`Number.parseInt(a.slice(0, 3), 10)`, keep the `RULES_MIGRATIONS = [] as const`
Phase-107 comment (line 61–62) and the `HOBBYFORGE_MIGRATION_COUNT = ....length`
shape (line 64).

**FK-ON guard to PRESERVE verbatim (D-02)** (`db-helpers.ts:81–85`) — do not touch:
```typescript
// Migration 022 toggles FK off/on — verify it's back ON
const fkState = db.pragma("foreign_keys") as { foreign_keys: number }[];
if (fkState[0]?.foreign_keys !== 1) {
  throw new Error("PRAGMA foreign_keys not ON after migration chain");
}
```
The `createHobbyforgeDb()` loop (lines 76–79) iterates `HOBBYFORGE_MIGRATIONS` as
strings — unaffected by the tuple→`readonly string[]` type change.

---

### `tests/data-layer/schema-shape.test.ts` (test, request-response / PRAGMA introspection)

**Analog:** the file itself. This is the recommended home for the 047 wargear
assertion (RESEARCH.md Open Q3 + D-03) — it already has the `ColumnInfo` interface,
a shared `beforeEach`/`afterEach` db, and is the semantic home for "table/columns exist".

**`ColumnInfo` interface to reuse** (`schema-shape.test.ts:7–14`):
```typescript
interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}
```

**Shared db lifecycle to reuse** (`schema-shape.test.ts:17–25`) — no per-test
`createHobbyforgeDb()`/`close()` needed inside this suite:
```typescript
let db: Database.Database;
beforeEach(() => { db = createHobbyforgeDb(); });
afterEach(() => { db.close(); });
```

**Column-introspection assertion idiom to copy** (`schema-shape.test.ts:58–73`) —
this is the exact `table_info` + `.find(c => c.name === ...)` + `.notnull` pattern
the wargear assertion should mirror:
```typescript
it("recipe_sections has workflow metadata columns (D-13 - migration 020)", () => {
  const columns = db.pragma("table_info(recipe_sections)") as ColumnInfo[];
  const metadataColumns = ["section_type", "technique", "execution_mode", "applies_to"];
  for (const colName of metadataColumns) {
    const col = columns.find((c) => c.name === colName);
    expect(col, `column ${colName} should exist`).toBeDefined();
    expect(col!.notnull, `column ${colName} should be nullable`).toBe(0);
  }
});
```
For the wargear assertion, follow this loop-over-expected-columns shape against
`table_info(army_list_unit_wargear)`. Expected columns (047, RESEARCH.md Finding 5):
`id, army_list_unit_id, weapon_name, quantity, created_at`. RESEARCH.md line 217–231
offers an `arrayContaining` variant; either matches house style — prefer the
`.find` + labeled `expect` loop above for consistency with the sibling tests in
this file. Test-naming convention: `it("<table> ... (NNN)")` with the migration
number in the title (see lines 58, 75, 82).

---

### `tests/data-layer/migration-parity.test.ts` (test, transform / regex count)

**Analog:** the file itself. After D-01 makes `HOBBYFORGE_MIGRATION_COUNT === 47`,
the existing D-06 test (lines 23–31) goes GREEN with **no edit**. Listed here so the
planner does NOT re-author it — it is the assertion that validates leg (2) of the
transitive chain.

**The count regex — single source of truth (reuse verbatim in `check-version.mjs`)**
(`migration-parity.test.ts:23–31`):
```typescript
it("lib.rs migration count matches helper count (D-06)", () => {
  const libRs = readFileSync(resolve(repoRoot, "src-tauri/src/lib.rs"), "utf-8");
  const matches = libRs.match(/Migration\s*\{/g);
  expect(matches?.length).toBe(HOBBYFORGE_MIGRATION_COUNT);
});
```
The regex `/Migration\s*\{/g` is verified (RESEARCH.md Finding 2) to match exactly
the 47 struct literals in `lib.rs` and nothing else. **Copy this exact regex** into
`check-version.mjs` — do not invent a variant.

> Note: if the executor places the wargear assertion HERE instead of
> `schema-shape.test.ts` (allowed by D-03), it needs its own `createHobbyforgeDb()`
> + `db.close()` and a local `ColumnInfo` cast — there is no shared `beforeEach`
> db in this suite. Prefer `schema-shape.test.ts` (less boilerplate).

---

### `scripts/check-version.mjs` (build-gate script, file-I/O + transform)

**Analog:** the file itself (version leg) + `scripts/check-migrations.mjs`
(readdirSync, Buffer reads, version-map) + `migration-parity.test.ts:29` (regex).
EXTEND, do not rewrite — keep the existing version compare and the `process.exit`
contract.

**Existing header + version leg to KEEP** (`check-version.mjs:1–17`):
```javascript
import { readFileSync } from 'node:fs';        // ← add readdirSync
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const tauri = JSON.parse(readFileSync(resolve(root, 'src-tauri', 'tauri.conf.json'), 'utf-8'));
// ... existing pkg.version === tauri.version compare, process.exit(1) on mismatch
```
Style notes: this script uses **single quotes** and bare `__dirname` (NOT the
`.ts`/test convention of double quotes) — match the file's own existing style, not
`db-helpers.ts`. `root` is one level up (`'..'`), unlike the tests' two-level
`repoRoot`. Keep `console.log` on pass / `console.error` on fail / `process.exit`
codes (RESEARCH.md Finding 8: exit 0 all-pass, exit 1 any-fail).

**Migration-count leg — readdirSync + the reused regex** (RESEARCH.md Finding 2,
lines 160–164):
```javascript
const libRs = readFileSync(resolve(root, 'src-tauri', 'src', 'lib.rs'), 'utf-8');
const libRsCount = (libRs.match(/Migration\s*\{/g) ?? []).length;
const fileCount = readdirSync(resolve(root, 'src-tauri', 'migrations'))
  .filter((f) => f.endsWith('.sql')).length;
// fail if fileCount !== libRsCount, printing both values
```

**CR-byte leg — Buffer scan** (D-06; idiom seeded by `check-migrations.mjs:30`
`raw.includes(0x0d)`):
```javascript
// check-migrations.mjs:30 — existing prior art for the byte test
const hasCRLF = raw.includes(0x0d);
```
For the gate, read each `*.sql` as a **Buffer (no encoding arg)** and collect
offenders (RESEARCH.md Finding 4, lines 188–192):
```javascript
const migrationsDir = resolve(root, 'src-tauri', 'migrations');
const offenders = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => readFileSync(resolve(migrationsDir, f)).includes(0x0d));
// fail if offenders.length > 0, listing each filename
```

**D-05 transitive-chain comment (REQUIRED).** Add a comment block documenting that
`check-version.mjs` asserts `fileCount === libRsCount`; the Vitest D-06 test asserts
`libRsCount === HOBBYFORGE_MIGRATION_COUNT`; and the helper count === fileCount by
construction (D-01) — so all three agree without importing the `.ts` helper into
this `.mjs`. Do NOT import `db-helpers.ts` here (RESEARCH.md Pitfall 2 / Finding 3:
avoids `--experimental-strip-types` + better-sqlite3 in the gate).

**CI-friendliness contract to honor** (RESEARCH.md Finding 8): repo-file reads only —
NO `process.env.APPDATA` / installed-DB dependency (that is `check-migrations.mjs`'s
domain, line 6, which this gate must NOT copy), NO better-sqlite3 instantiation,
clear per-leg failure messages. Phase 131 CI will invoke `pnpm check:version`
unchanged on a clean checkout.

---

### `package.json` (config)

**Analog:** the `scripts` block itself (`package.json:6–16`). Add one line.

**Existing scripts block** (note: `check:version` already wired at line 13):
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  ...
  "check:version": "node scripts/check-version.mjs",
  ...
}
```
Add (D-08): `"prebuild": "node scripts/check-version.mjs"`. Style: `node scripts/...`
(no `pnpm`, no `--experimental-strip-types` — this is plain ESM, matching the
existing `check:version` entry). pnpm runs `prebuild` automatically before `build`.

## Shared Patterns

### Migration-count regex (single source of truth)
**Source:** `tests/data-layer/migration-parity.test.ts:29`
**Apply to:** `scripts/check-version.mjs`
```javascript
/Migration\s*\{/g
```
Verified to match exactly 47 `Migration {` struct literals in `lib.rs` and nothing
else (RESEARCH.md Finding 2). Use this identical literal in both places — do not
re-derive.

### `readdirSync` + `.sql` filter + numeric-prefix idiom
**Source:** `scripts/check-migrations.mjs:9–14`
**Apply to:** `tests/data-layer/db-helpers.ts` (with sort) and `scripts/check-version.mjs` (count + CR scan)
```javascript
readdirSync(dir).filter((f) => f.endsWith('.sql'))
// prefix parse: f.slice(0, 3) → Number.parseInt(..., 10)   (or  f.match(/^(\d+)_/))
```

### Buffer CR-byte test
**Source:** `scripts/check-migrations.mjs:30` (`raw.includes(0x0d)`)
**Apply to:** `scripts/check-version.mjs`
Read with NO encoding → `Buffer`; `.includes(0x0d)`. Never read as a string for the
gate (D-06; RESEARCH.md Pitfall 4).

### `PRAGMA table_info` column introspection
**Source:** `tests/data-layer/schema-shape.test.ts:58–73` (with `ColumnInfo` at 7–14)
**Apply to:** the 047 wargear assertion
```typescript
const columns = db.pragma("table_info(<table>)") as ColumnInfo[];
const col = columns.find((c) => c.name === colName);
expect(col, `column ${colName} should exist`).toBeDefined();
```

### ESM script scaffold (`fileURLToPath` → root)
**Source:** `scripts/check-version.mjs:1–6` and `db-helpers.ts:1–9`
**Apply to:** any new file logic in these scripts
Scripts use `__dirname` + `'..'` (one level); tests use `repoRoot` + `'..','..'`
(two levels). Match the file's own existing variable, do not cross-import the
convention.

## Verified Wiring (de-risks RESEARCH.md A1)

`src-tauri/tauri.conf.json` `build.beforeBuildCommand` = **`pnpm build`** (line 9),
`beforeDevCommand` = `pnpm dev` (line 7). Therefore the `prebuild` hook fires
transitively on `tauri build` — no `beforeBuildCommand` repointing needed (RESEARCH.md
Open Q1 / A1 resolved). The planner can drop that verification task or keep it as a
one-line confirmation.

## No Analog Found

None. Every modified file has an in-repo analog (itself plus a sibling demonstrating
the exact added idiom). No file in this phase needs to fall back to RESEARCH.md
patterns over a real codebase analog.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | (no gaps) |

## Project Conventions (apply across all edits)

- **Strict TypeScript, no ESLint/Prettier** (CLAUDE.md) — `noUnusedLocals` /
  `noUnusedParameters` is the bar; do not add a linter. The `db-helpers.ts` tuple →
  `readonly string[]` change is type-safe (RESEARCH.md Finding 1 caveat: only
  importers are a `number` count and a string iterator).
- **`pnpm`** is the package manager; gate must run on a clean checkout with no
  installed DB (Phase-131-ready).
- **Never edit existing `src-tauri/migrations/*.sql`** — this phase only READS them
  (count + CR scan). No migration bytes change, so `_sqlx_migrations` SHA-384 is
  untouched.
- **`node:`-prefixed specifiers** in `.ts`/test files; the existing `check-version.mjs`
  also already uses `node:` prefixes — keep them.

## Metadata

**Analog search scope:** `tests/data-layer/`, `scripts/`, `package.json`,
`src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs` (count reference).
**Files scanned:** 7 (5 targets + `check-migrations.mjs` analog + `tauri.conf.json`/`package.json` config).
**Pattern extraction date:** 2026-06-15
