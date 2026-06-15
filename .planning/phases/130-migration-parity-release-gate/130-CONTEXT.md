# Phase 130: Migration Parity & Release Gate - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

> ⚙️ Captured in `--auto` mode: gray areas auto-selected, recommended option chosen for each.
> All decisions below are the recommended defaults — review before planning if you disagree.

<domain>
## Phase Boundary

This phase makes the schema-version representations **provably agree** and makes the migration list **self-maintaining**, so the "update breaks launch" checksum-drift class of bug can never silently return.

Three concrete deliverables (REL-03, REL-04, REL-05):
1. Close the currently-RED `tests/data-layer/migration-parity.test.ts` (the `046→047` gap) by deriving the data-layer migration list from disk so it never drifts when a migration is added — and exercise the wargear schema (047) in the suite.
2. A single parity gate (`pnpm check:version`) that fails when `package.json` version ≠ `tauri.conf.json` version, **or** when migration file count ≠ lib.rs `Migration{}` count ≠ data-layer migration-list length.
3. The release gate fails if any `src-tauri/migrations/*.sql` file contains a CR (`0x0D`) byte.

**In scope:** the data-layer migration-list derivation, the `check:version` script expansion, the CR-byte gate, and wiring the gate to run locally before build.
**Out of scope (own phases):** the GitHub Actions CI workflow that *invokes* this gate on PRs / before release (REL-01/REL-02 → Phase 131); update install/relaunch verification & diagnostics logs (REL-06/07/08 → Phase 132).

</domain>

<decisions>
## Implementation Decisions

### Migration-list derivation (REL-03)
- **D-01:** Replace the hardcoded `HOBBYFORGE_MIGRATIONS` array in `tests/data-layer/db-helpers.ts` with a disk-derived list: `readdirSync(migrationsDir)`, filter to `.sql`, and **sort by the numeric prefix** (`001..047`), not lexically. `HOBBYFORGE_MIGRATION_COUNT` becomes `list.length`. Adding a migration auto-updates both, so the D-06 parity test (`lib.rs Migration{} count === HOBBYFORGE_MIGRATION_COUNT`) self-corrects and stays green. This directly closes the current RED state (disk/lib.rs = 47, hardcoded list = 46).
- **D-02:** Preserve the existing post-chain safety assertion that `PRAGMA foreign_keys` is back ON after the full chain (migration 022 toggles it off/on) — derivation must not drop this guard.
- **D-03:** "Exercise the wargear schema (047)": once 047 is in the derived list it is applied by `createHobbyforgeDb()`. Add at least one assertion in the data-layer suite that the `army_list_unit_wargear` table/columns exist (a schema-shape check), so 047 is genuinely covered, not just executed.

### Single parity gate (REL-04)
- **D-04:** Extend the existing `scripts/check-version.mjs` (keep the `pnpm check:version` script name — it's already referenced) into the one release-gate entry point. It asserts, failing fast with a clear per-check message:
  - `package.json` version === `tauri.conf.json` version (existing check, kept), and
  - migration file count (`readdirSync` of `src-tauri/migrations`, `.sql` only) === lib.rs `Migration{}` count (regex `/Migration\s*\{/g`, same pattern the test uses).
- **D-05:** The third leg — "=== data-layer migration-list length" — is enforced **transitively**, not by importing the `.ts` helper from `.mjs` (avoids a TS-from-mjs import in the script). `check-version.mjs` asserts `fileCount === libRsCount`; the vitest D-06 test asserts `libRsCount === HOBBYFORGE_MIGRATION_COUNT`; and the helper count equals the disk file count by construction (D-01). All three therefore agree. Document this chain in a comment in `check-version.mjs`.

### CR-byte gate (REL-05)
- **D-06:** Fold the CR scan into the same `check-version.mjs` (single gate, single command). Read each `src-tauri/migrations/*.sql` as a Buffer and fail if it contains byte `0x0D`, listing every offending filename. Scope is migrations only — these are the build-critical files embedded via `include_str!` whose SHA-384 is stored in `_sqlx_migrations`.
- **D-07:** The existing `.gitattributes` (`*.sql text eol=lf` + `src-tauri/migrations/** text eol=lf`) already prevents CR introduction at the git layer and stays. This CR gate is the **runtime backstop** that catches a CR slipping through a misconfigured checkout — it complements, not replaces, `.gitattributes`.

### Gate wiring — local enforcement (REL-04 "locally before build")
- **D-08:** Add a `prebuild` npm hook (`"prebuild": "node scripts/check-version.mjs"`) so `pnpm build` (and therefore `tauri build`) refuses to produce artifacts when any parity check fails. This satisfies the "locally before build" half of REL-04. The "in CI" half is **deferred to Phase 131** — do not add GitHub Actions YAML in this phase.

### Claude's Discretion
- Exact wording of failure messages, ordering of checks within `check-version.mjs`, and the precise wargear schema-shape assertion are left to the planner/executor, provided the success criteria hold.
- Whether the wargear assertion lives in `migration-parity.test.ts` or `schema-shape.test.ts` is the executor's call (both are existing data-layer suites).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 130: Migration Parity & Release Gate" — goal + 4 success criteria (the authoritative acceptance bar).
- `.planning/REQUIREMENTS.md` — REL-03, REL-04, REL-05 (full requirement text); note the **Sequencing law**: Theme A must merge to `master` before any Theme-B refactor.

### Files this phase modifies/reads
- `tests/data-layer/db-helpers.ts` — the hardcoded `HOBBYFORGE_MIGRATIONS` list to replace with disk derivation; `createHobbyforgeDb()` factory.
- `tests/data-layer/migration-parity.test.ts` — the RED suite (D-06 parity test); FK-ON assertion.
- `tests/data-layer/schema-shape.test.ts` — candidate home for the 047 wargear assertion.
- `scripts/check-version.mjs` — the gate to extend (version + migration-count + CR checks).
- `src-tauri/src/lib.rs` — source of truth for the `Migration{}` count.
- `src-tauri/migrations/*.sql` — 47 files; `047_army_list_unit_wargear.sql` is the one missing from the data-layer list.
- `package.json` — `check:version` script (0.5.7), where `prebuild` hook is added.
- `src-tauri/tauri.conf.json` — version (0.5.7) compared against package.json.
- `.gitattributes` — existing LF-normalization (keep; CR gate complements it).
- `scripts/check-migrations.mjs` — existing runtime checksum-diff helper (reference for how CRLF/LF SHA-384 drift manifests; not modified here).

No external ADRs/specs — requirements fully captured in the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tests/data-layer/db-helpers.ts::createHobbyforgeDb()` — already applies the full migration chain in-memory via better-sqlite3 and re-checks FK pragma; derivation change localizes here.
- `scripts/check-version.mjs` — already does the package↔tauri version compare with `process.exit(1)` on mismatch; extend rather than rewrite.
- Regex `/Migration\s*\{/g` is already used in `migration-parity.test.ts` to count lib.rs migrations — reuse the same pattern in `check-version.mjs` for consistency.

### Established Patterns
- Data-layer tests run in node env (`// @vitest-environment node`) with `better-sqlite3`; the suite has a "migration parity" describe block and migration-NNN.test.ts files for targeted schema checks.
- Scripts are ESM `.mjs`/`--experimental-strip-types .ts` invoked via `pnpm` scripts; node `readdirSync` + `readFileSync` is the established file-access idiom (see `check-migrations.mjs`).
- Line-ending discipline is already encoded in `.gitattributes` with an explanatory comment block — the CR gate is the enforcement layer on top.

### Integration Points
- `check-version.mjs` is invoked by `pnpm check:version` today; new `prebuild` hook makes `pnpm build` depend on it. Phase 131's CI will invoke the same command (`pnpm check:version`) — keep the script self-contained and CI-friendly (clear exit codes, no APPDATA/runtime-DB dependency; unlike `check-migrations.mjs`, this gate must run on a clean checkout with no installed DB).

</code_context>

<specifics>
## Specific Ideas

- Current confirmed RED state: disk = 47 migrations, lib.rs `Migration{}` = 47, data-layer hardcoded list = 46 → `migration-parity.test.ts` D-06 fails (47 ≠ 46). Fixing D-01 turns it green.
- Current versions already match (package.json = tauri.conf.json = 0.5.7), so the version leg of `check:version` passes today; the migration-count and CR legs are the new teeth.
- No CR bytes currently exist in any migration (verified) — the CR gate should pass on the current tree and only fire on regression.

</specifics>

<deferred>
## Deferred Ideas

- **GitHub Actions CI that runs `pnpm check:version` + full suite on PRs and gates release** — REL-01/REL-02, **Phase 131** (the gate built here is the thing CI will invoke).
- **In-place NSIS update verification, relaunch UX, `preflight.log`/`frontend.log` diagnostics** — REL-06/07/08, **Phase 132**.
- Broader CR/encoding linting across non-migration files — not needed; migrations are the build-critical embedded set.

None of the above were pulled into this phase — discussion stayed within the REL-03/04/05 boundary.

</deferred>

---

*Phase: 130-Migration Parity & Release Gate*
*Context gathered: 2026-06-15*
