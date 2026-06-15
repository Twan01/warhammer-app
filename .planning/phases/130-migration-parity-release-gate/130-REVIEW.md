---
phase: 130-migration-parity-release-gate
reviewed: 2026-06-15T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - scripts/check-version.mjs
  - tests/data-layer/db-helpers.ts
  - tests/data-layer/schema-shape.test.ts
  - package.json
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 130: Code Review Report

**Reviewed:** 2026-06-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 130 extends `check-version.mjs` into a 3-leg release gate (version parity,
migration-count parity, CR-byte scan), replaces a hardcoded migration list in
`db-helpers.ts` with a disk-derived sort, and adds a column-existence assertion
for migration 047's `army_list_unit_wargear` table. The `prebuild` npm hook wires
the gate into `pnpm build` / `pnpm tauri build`.

The core mechanics are sound and the current counts are correct (47 .sql files,
47 `Migration {` entries in lib.rs, 47 entries produced by the disk-sort). Three
warnings surface reliability gaps in the gate's regex and sort that would silently
produce wrong counts under foreseeable maintenance scenarios. Three info items flag
minor actionability and annotation defects.

## Warnings

### WR-01: `Migration\s*\{` regex will over-count if lib.rs gains any non-vector `Migration {` usage

**File:** `scripts/check-version.mjs:31`

**Issue:** The regex `/Migration\s*\{/g` matches every occurrence of `Migration {`
in the entire `lib.rs` source, not only entries inside `get_migrations()`. A future
developer who adds `struct Migration { ... }`, `impl Migration { ... }`, a unit
test with a local `Migration { version: 1, ... }`, or comments referencing the
struct by name followed by a brace would inflate `libRsCount` beyond the actual
vector length. The same bug exists in the downstream `migration-parity.test.ts`
(line 29) which uses the identical regex. Currently harmless because all 47 matches
are vector entries, but the gate provides a false sense of correctness — it checks
"how many times does this token appear in the file?" not "how many migrations are
registered?".

**Fix:** Scope the match to the `get_migrations` function body only, or count
`include_str!` macro invocations (which uniquely identify registered migrations):

```js
// Option A: count include_str! macros — each one is exactly one migration entry
const libRsCount = (libRs.match(/include_str!\s*\(/g) ?? []).length;

// Option B: extract the get_migrations() body first, then match
const fnBody = libRs.match(/fn\s+get_migrations\s*\(\s*\)[^{]*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const libRsCount = (fnBody.match(/Migration\s*\{/g) ?? []).length;
```

Option A is simpler and equally specific; `include_str!` only appears inside
migration struct literals in this file. If the project adds non-migration
`include_str!` calls to `lib.rs`, re-evaluate.

---

### WR-02: Numeric sort comparator in `db-helpers.ts` is `NaN`-unsafe for malformed filenames

**File:** `tests/data-layer/db-helpers.ts:17-20`

**Issue:** The sort comparator extracts the first 3 characters of each filename
and parses them as an integer:

```ts
(a, b) =>
  Number.parseInt(a.slice(0, 3), 10) - Number.parseInt(b.slice(0, 3), 10)
```

If any `.sql` file in `src-tauri/migrations/` does not start with exactly 3 ASCII
decimal digits (e.g. a file named `README.sql`, `_draft.sql`, or a migration added
with a 4-digit prefix like `0100_...`), `Number.parseInt` returns `NaN`. The
comparator then returns `NaN`, and V8's `Array.prototype.sort` treats `NaN` as `0`,
leaving the affected filenames in an arbitrary position. Migrations would then be
applied out-of-order, silently corrupting the in-memory schema used by all
data-layer tests. The `.filter(f => f.endsWith('.sql'))` guard eliminates non-SQL
files but does not protect against mis-prefixed `.sql` files. There is no runtime
assertion that the sort actually produced a contiguous 1..N sequence.

**Fix:** Add a guard that validates the prefix before sorting, or assert the result:

```ts
export const HOBBYFORGE_MIGRATIONS: readonly string[] = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => {
    const na = Number.parseInt(a.slice(0, 3), 10);
    const nb = Number.parseInt(b.slice(0, 3), 10);
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      throw new Error(
        `Migration filename does not start with 3-digit prefix: ${Number.isNaN(na) ? a : b}`,
      );
    }
    return na - nb;
  });
```

This converts a silent data-corruption failure into a loud startup error that
surfaces immediately when a new file is incorrectly named.

---

### WR-03: Release gate is not triggered by `pnpm tauri dev` — the primary dev workflow

**File:** `package.json:7-8`

**Issue:** The gate script is wired only as `prebuild`, which runs before
`pnpm build` (and therefore before `pnpm tauri build` via `beforeBuildCommand`).
However, `pnpm tauri dev` (the day-to-day development command per CLAUDE.md)
invokes `beforeDevCommand: "pnpm dev"`, which runs `vite` directly with no
`predev` npm hook. A developer can add a migration `.sql` file, forget to register
it in `lib.rs`, and work through an entire dev session without the gate firing.
The mismatch is only caught at CI/build time. Given the gate's stated purpose as
a "release gate", this is an acceptable architectural boundary — but it should be
explicit, not accidental.

**Fix (two options):**

Option A — Wire a `predev` hook as well (immediate catch during dev):
```json
"predev": "node scripts/check-version.mjs",
```

Option B — Document explicitly in the gate script and `package.json` that the
gate is intentionally build-only, so a future maintainer does not add `predev`
accidentally thinking it is missing:
```js
// NOTE: This gate runs as `prebuild` only — it is not wired to `predev` by
// design, because `pnpm tauri dev` bypasses npm lifecycle hooks via
// beforeDevCommand. Run `pnpm check:version` manually during development.
```

Option A provides the better safety guarantee. Option B is acceptable if dev
startup time is a concern.

---

## Info

### IN-01: Leg 3 CR-byte scan reports bare filenames, not full paths

**File:** `scripts/check-version.mjs:50`

**Issue:** `offenders.join(', ')` prints bare filenames (`001_core_schema.sql`)
rather than full paths. In a CI log where the working directory may not be obvious,
a developer cannot directly navigate to the file or use the output in a `grep`
command without knowing `src-tauri/migrations/`.

**Fix:**
```js
const offenders = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => readFileSync(resolve(migrationsDir, f)).includes(0x0d))
  .map((f) => resolve(migrationsDir, f)); // store full paths

// ...
console.error(`[cr-byte] FAIL: CR byte (0x0D) found in: ${offenders.join(', ')}`);
```

---

### IN-02: `schema-shape.test.ts` D-03 test does not validate `NOT NULL` or `UNIQUE` constraints on `army_list_unit_wargear`

**File:** `tests/data-layer/schema-shape.test.ts:99-116`

**Issue:** The test only asserts that the 5 expected columns exist (`toBeDefined()`).
It does not verify that `weapon_name` and `quantity` are `NOT NULL` (as defined in
migration 047), nor the `UNIQUE (army_list_unit_id, weapon_name)` constraint. A
future migration that accidentally dropped the `NOT NULL` constraint on
`weapon_name` (e.g. via a `CREATE TABLE ... AS SELECT` rewrite) would pass this
test silently. The pattern used in earlier tests (e.g. lines 71, 79, 94) of
asserting `col!.notnull` is not applied here.

**Fix:** Add `notnull` assertions for the two non-null columns, matching the
existing test style:

```ts
it("army_list_unit_wargear has expected columns (D-03 - migration 047)", () => {
  const columns = db.pragma(
    "table_info(army_list_unit_wargear)",
  ) as ColumnInfo[];

  const col = (name: string) => columns.find((c) => c.name === name);

  // existence
  for (const colName of ["id", "army_list_unit_id", "weapon_name", "quantity", "created_at"]) {
    expect(col(colName), `column ${colName} should exist`).toBeDefined();
  }

  // NOT NULL constraints per migration 047
  expect(col("weapon_name")!.notnull, "weapon_name should be NOT NULL").toBe(1);
  expect(col("quantity")!.notnull, "quantity should be NOT NULL").toBe(1);
  expect(col("army_list_unit_id")!.notnull, "army_list_unit_id should be NOT NULL").toBe(1);
});
```

---

### IN-03: Stale hardcoded count annotation in `db-helpers.ts`

**File:** `tests/data-layer/db-helpers.ts:25`

**Issue:** The comment `// 47 (disk-derived)` on the `HOBBYFORGE_MIGRATION_COUNT`
export will become stale the moment migration 048 is added. The value is already
dynamic (derived from `HOBBYFORGE_MIGRATIONS.length`), so the comment provides no
information the code does not already express — and it will mislead a developer who
reads it after the next migration is added.

**Fix:** Remove the count from the comment, or rephrase it as a process note:

```ts
export const HOBBYFORGE_MIGRATION_COUNT = HOBBYFORGE_MIGRATIONS.length; // disk-derived; updates automatically
```

---

_Reviewed: 2026-06-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
