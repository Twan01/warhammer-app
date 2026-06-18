---
phase: 139-data-quality-at-scale
reviewed: 2026-06-18T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - scripts/lib/validateRefs.ts
  - scripts/build-unit-db.ts
  - scripts/audit-faction.ts
  - tests/data-layer/fk-integrity.test.ts
  - tests/data-layer/reimport-preservation.test.ts
  - package.json
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 139: Code Review Report

**Reviewed:** 2026-06-18
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 139 adds a JSON-level referential-integrity gate (`validateRefs.ts`) wired
into the build pipeline, a 25-faction batch audit mode (`audit-faction.ts`), and
two new `tests/data-layer/` tests. The mechanical plumbing is sound — the build
gate calls `process.exit(1)` on violations, the FK test correctly inserts with
`foreign_keys = OFF` then flips it `ON` before assertions, and the re-import
test's core claim (ON DELETE SET NULL does not fire under FK-OFF deletes) is
correct.

However, the review surfaces a **systemic coverage gap**: the prompt asks "any
FK relationship missed?" — and the answer is yes. Five real FK constraints
defined in migrations 042/043 (the detachment / stratagem / enhancement graph)
are checked by **neither** `validateRefs.ts` **nor** the `fk-integrity` test.
The build could emit an orphan `stratagem.detachment_id` or a dangling
`detachment_abilities.faction_id` and every gate added this phase would stay
green. Combined with a sub_faction check that is a provable no-op (the code's
own comments admit it), the new "two-layer validation" is materially weaker than
its docstrings claim.

## Critical Issues

### CR-01: Referential-integrity gate ignores the entire detachment/stratagem/enhancement FK graph

**File:** `scripts/lib/validateRefs.ts:39-49`, `scripts/build-unit-db.ts:618-636`
**Issue:**
`ValidateRefsInput` accepts only `factions`, `units`, the six unit-child arrays,
and `leaderTargets`. It never receives `detachments`, `detachmentAbilities`,
`stratagems`, or `enhancements`. Yet migrations 042/043 define five FK
constraints that the build can violate:

- `udb_detachments.faction_id` → `udb_factions(id)` (NOT NULL)
- `udb_detachment_abilities.detachment_id` → `udb_detachments(id)` (NOT NULL)
- `udb_detachment_abilities.faction_id` → `udb_factions(id)` (NOT NULL)
- `udb_stratagems.detachment_id` → `udb_detachments(id)` (nullable)
- `udb_enhancements.faction_id` → `udb_factions(id)` (NOT NULL)

The build-side mitigations are partial and asymmetric: `build-unit-db.ts:787`
and `:825` null out `detachment_id` when it is not in `seenDetachmentIds`, but
**nothing validates `detachment_abilities.faction_id` / `detachment_id`** after
the fact, and the faction-id guards rely on the raw CSV being internally
consistent. A detachment ability whose `detachment_id` points at a detachment
that was dropped (e.g. because its own faction_id was unknown and it was
`continue`d at `:738`) would survive into the JSON and then fail
`PRAGMA foreign_key_check` at app-launch import — exactly the failure the gate
was built to prevent. The docstring at `validateRefs.ts:11-21` enumerates "all
child-table row arrays" but silently omits four of them.

**Fix:** Extend `ValidateRefsInput` and `validateReferentialIntegrity` to cover
the detachment graph, and pass the arrays from the build:
```ts
export interface ValidateRefsInput {
  // ...existing...
  detachments: UdbDetachmentRow[];
  detachmentAbilities: UdbDetachmentAbilityRow[];
  stratagems: UdbStratagemRow[];
  enhancements: UdbEnhancementRow[];
}

// inside validateReferentialIntegrity, after building factionIds:
const detachmentIds = new Set(detachments.map((d) => d.id));

for (const d of detachments) {
  if (!factionIds.has(d.faction_id))
    violations.push(`udb_detachments ${d.id}: faction_id "${d.faction_id}" not in factions`);
}
for (const da of detachmentAbilities) {
  if (!detachmentIds.has(da.detachment_id))
    violations.push(`udb_detachment_abilities ${da.id}: detachment_id "${da.detachment_id}" not in detachments`);
  if (!factionIds.has(da.faction_id))
    violations.push(`udb_detachment_abilities ${da.id}: faction_id "${da.faction_id}" not in factions`);
}
for (const s of stratagems) {
  if (s.detachment_id !== null && !detachmentIds.has(s.detachment_id))
    violations.push(`udb_stratagems ${s.id}: detachment_id "${s.detachment_id}" not in detachments`);
  if (s.faction_id !== null && !factionIds.has(s.faction_id))
    violations.push(`udb_stratagems ${s.id}: faction_id "${s.faction_id}" not in factions`);
}
for (const e of enhancements) {
  if (!factionIds.has(e.faction_id))
    violations.push(`udb_enhancements ${e.id}: faction_id "${e.faction_id}" not in factions`);
  if (e.detachment_id !== null && !detachmentIds.has(e.detachment_id))
    violations.push(`udb_enhancements ${e.id}: detachment_id "${e.detachment_id}" not in detachments`);
}
```
Then pass `detachments, detachmentAbilities, stratagems, enhancements` in the
`build-unit-db.ts:619` call. **Note:** these arrays are built at steps 11-13
(`build-unit-db.ts:722-831`), *after* the current validation call at line 619.
The validation block must move to after step 13, or the arrays will be
`undefined` at call time. This ordering bug is itself a blocker if the fix is
applied naively.

---

### CR-02: fk-integrity test does not import the detachment/stratagem/enhancement tables, so PRAGMA foreign_key_check cannot catch their violations

**File:** `tests/data-layer/fk-integrity.test.ts:45-138`
**Issue:**
The test inserts factions, units, and the six unit-child tables plus
`udb_leader_targets`. It never inserts `artifact.detachments`,
`artifact.detachment_abilities`, `artifact.stratagems`, or
`artifact.enhancements`. `PRAGMA foreign_key_check` only reports violations for
rows that actually exist in the database — empty tables produce zero rows by
definition. So the test's headline assertion ("unit_database.json passes
PRAGMA foreign_key_check") is false advertising: it proves the *unit* subgraph
is clean while leaving the detachment subgraph — the one with the most FK edges
and the nullable `detachment_id` columns most likely to dangle — entirely
unexercised. Together with CR-01 this is a double miss: neither the build gate
nor the regression test would turn red on an orphan stratagem/enhancement/
detachment-ability row.

**Fix:** Insert the four missing tables in dependency order (detachments before
detachment_abilities/stratagems/enhancements, all after factions):
```ts
const insertDetachment = db.prepare(
  `INSERT OR IGNORE INTO udb_detachments (id, faction_id, name) VALUES (?, ?, ?)`,
);
for (const d of artifact.detachments) insertDetachment.run(d.id, d.faction_id, d.name);

const insertDetAbility = db.prepare(
  `INSERT OR IGNORE INTO udb_detachment_abilities (id, detachment_id, faction_id, name)
   VALUES (?, ?, ?, ?)`,
);
for (const da of artifact.detachment_abilities)
  insertDetAbility.run(da.id, da.detachment_id, da.faction_id, da.name);

const insertStratagem = db.prepare(
  `INSERT OR IGNORE INTO udb_stratagems (id, faction_id, detachment_id, name, description)
   VALUES (?, ?, ?, ?, ?)`,
);
for (const s of artifact.stratagems)
  insertStratagem.run(s.id, s.faction_id, s.detachment_id, s.name, s.description);

const insertEnhancement = db.prepare(
  `INSERT OR IGNORE INTO udb_enhancements (id, faction_id, detachment_id, name, description)
   VALUES (?, ?, ?, ?, ?)`,
);
for (const e of artifact.enhancements)
  insertEnhancement.run(e.id, e.faction_id, e.detachment_id, e.name, e.description);
```
Insert these *before* the `foreign_keys = ON` flip at line 137.

## Warnings

### WR-01: Orphan sub_faction check is a structural no-op in both the validator and the test

**File:** `scripts/lib/validateRefs.ts:144-162`, `tests/data-layer/fk-integrity.test.ts:189-209`
**Issue:**
The check builds `subFactionsByFaction` by iterating every unit and adding that
unit's `sub_faction` to the set keyed by *its own* `faction_id`
(`validateRefs.ts:145-151`). It then iterates the same units and flags any whose
`sub_faction` is not in the set for its own faction (`:153-162`). Because each
unit contributed its value to that exact set in the first pass, the membership
check can never fail for any unit whose `faction_id` is stable between the two
loops — which is always, since neither loop mutates `faction_id`. The code's own
comment (`:136-140`) concedes this: "this check is therefore a no-op for
well-formed data." The stated goal — "catches cross-faction sub_faction
pollution" — is not achieved: a Space Marine sub_faction string wrongly assigned
to a Necron unit makes that unit *define* the value for NEC, so it passes. The
test (`fk-integrity.test.ts:189-209`) re-implements the identical tautology, so
it asserts nothing. This is a correctness defect masquerading as a guard rail; a
reviewer relying on "Check 4 protects against pollution" is misled.

**Fix:** Validate against an authoritative allow-list instead of the data under
test. The pipeline assigns sub_factions from `KEYWORD_SUB_FACTION_MAP` /
`SUB_FACTION_MAP`; cross-reference each unit's `sub_faction` against the set of
values that map is permitted to produce *for that faction*, or at minimum
against the global set of legal sub_faction labels:
```ts
import { KEYWORD_SUB_FACTION_MAP, SUB_FACTION_MAP } from "./factionMap.ts";
const legalSubFactions = new Set<string>([
  ...Object.values(KEYWORD_SUB_FACTION_MAP),
  ...Object.values(SUB_FACTION_MAP),
]);
for (const u of units) {
  if (u.sub_faction !== null && !legalSubFactions.has(u.sub_faction)) {
    violations.push(`unit ${u.id} has unrecognized sub_faction "${u.sub_faction}"`);
  }
}
```
If the intent really is per-faction scoping, the allow-list must be keyed by
faction independently of the units being validated.

### WR-02: fk-integrity test inserts only PK + FK columns, so it cannot catch NOT NULL / shape regressions and does not mirror the real import

**File:** `tests/data-layer/fk-integrity.test.ts:46-134`
**Issue:**
The docstring (`:13-18`) says the test does "a full in-memory import of the
complete unit_database.json artifact" and "mirrors lib.rs import." It does not:
each INSERT lists only the columns relevant to FK checking (e.g. units inserts
`id, faction_id, name, sub_faction` but omits `role, base_points, damaged_w,
damaged_desc, name_fr`; weapons inserts only 4 of 13 columns). The real lib.rs
INSERT (`src-tauri/src/lib.rs:813-859`) binds every column. As a result the test
would not catch (a) a NOT NULL column the build started emitting as null, (b) a
type-affinity mismatch (e.g. model `T`/`W`/`OC` are INTEGER columns in migration
038 but the artifact stores them as strings — the real import binds via
`i64_val`, the test sidesteps this entirely by not inserting them). The test is
narrower than its own description and gives false confidence about import
fidelity.

**Fix:** Either bind the full column set to genuinely mirror lib.rs, or soften
the docstring to state explicitly that this test validates only FK referential
integrity, not column-shape/type fidelity (which is covered elsewhere).

### WR-03: "Mirrors lib.rs DELETE order" comments are factually wrong in both test and helper

**File:** `tests/data-layer/reimport-preservation.test.ts:15-19,60-75`, `tests/data-layer/fk-integrity.test.ts:42`
**Issue:**
The re-import test comment claims it mirrors "the DELETE order in
src-tauri/src/lib.rs lines 769-790." The actual lib.rs order
(`lib.rs:770-784`) is: `udb_unit_keywords, udb_unit_points,
udb_unit_composition, udb_unit_abilities, udb_unit_weapons, udb_unit_models,
udb_leader_targets, udb_units, udb_stratagems, udb_enhancements,
udb_detachment_abilities, udb_detachments, udb_factions, udb_meta`. The test's
`simulateReimport` (`:61-75`) deletes `udb_leader_targets` *first* and orders
the detachment/stratagem block differently. Because all deletes run under
`foreign_keys = OFF`, order is functionally irrelevant — so this is not a
correctness bug — but a maintainer reading "mirrors lib.rs lines 769-790" and
trusting it will be misled, and the line numbers will silently rot. Same issue
in `fk-integrity.test.ts:42` ("mirrors lib.rs import").

**Fix:** Replace the specific line-number citations with a behavioral note
("deletes all udb_* tables under FK-OFF; order is irrelevant because FK
enforcement is disabled") and drop the false claim that the order matches.

### WR-04: Audit weapon-matching fallback can silently mask real discrepancies

**File:** `scripts/audit-faction.ts:392-404`
**Issue:**
The 139-03 fix added a 3-tier match: (1) position+name, (2) name+category, (3)
name-only. The fix correctly tightens the *positional* match by requiring name
agreement, which is what killed the 806 false positives. However tier (3) —
name-only — is still reached whenever tiers (1) and (2) miss, and it picks
`csvUnitWargear.find(...)` = the **first** CSV row with a matching name
regardless of category. When a unit has two same-named profiles (the exact
"Corrupted stave" Melee+Ranged case the comment cites) and the category-match
tier (2) fails for any reason (e.g. DB `category` is `wargear_role` text like
"Ranged Weapons" while CSV `type` is "Ranged" — see `weaponMapping.ts:47`, which
prefers `wargear_role` over `type`), tier (3) silently binds to the wrong
profile and the field comparison then compares the DB melee profile against the
CSV ranged row. Mismatches get reported against the wrong expected values, or —
worse — a genuine error is masked because the wrong-but-coincidentally-equal row
matches. The category comparison in tier (2) compares
`r["type"]` against `dbWeapon.category`, but `dbWeapon.category` is sourced from
`wargear_role ?? type` (`weaponMapping.ts:47`), so tier (2) can systematically
fail to fire whenever `wargear_role` is populated, pushing same-named weapons to
the lossy tier (3).

**Fix:** Make tier (2) robust to the category-source asymmetry — compare against
both possible category sources, or normalize. At minimum, when tier (3) is the
only match and the unit has >1 CSV row with that name, skip the comparison and
emit a low-severity "ambiguous weapon match" note rather than comparing against
an arbitrary row:
```ts
const nameMatches = csvUnitWargear.filter(
  (r) => (r["name"]?.trim() ?? "").toLowerCase() === dbWeapon.name.toLowerCase(),
);
// ...tiers 1 & 2...
const csvWeapon = tier1 ?? tier2 ??
  (nameMatches.length === 1 ? nameMatches[0] : undefined);
if (!csvWeapon) continue; // ambiguous or absent — do not guess
```

### WR-05: `--all` batch audit re-parses five CSV files once per faction (25×)

**File:** `scripts/audit-faction.ts:235-239,822-829`
**Issue:**
`auditFaction` calls `readCsvFile(...)` for Datasheets, models, wargear,
abilities, and keywords at `:235-239`. In `--all` mode (`:825-827`) this runs
inside the per-faction loop, so all five files are read and re-parsed from disk
25 times (125 file reads / parses total). For a dev script this is tolerable but
wasteful, and more importantly it re-derives the same `groupBy` maps 25 times.
(Flagged as quality, not performance-blocker, per v1 scope — but it is also a
correctness smell: if the CSVs were ever swapped mid-run the audits would
diverge.)

**Fix:** Hoist the five `readCsvFile` calls and the four full-file `groupBy`
maps to `main()` / `--all` setup and pass them into `auditFaction`, filtering
per faction inside. This also makes the function signature honestly reflect its
inputs.

## Info

### IN-01: `is_faction_keyword` truthiness parsing is inconsistent across the codebase

**File:** `scripts/build-unit-db.ts:211,331`, `scripts/audit-faction.ts:496`
**Issue:**
Three sites parse the same CSV column three slightly different ways. Pre-scan
(`build-unit-db.ts:211`) accepts `"1"` or `"true"`. The keyword-row builder
(`:331`) accepts only `"1"`. The audit (`audit-faction.ts:496`) accepts only
`"1"`. If Wahapedia ever emits `"true"`, the pre-scan would assign a sub_faction
while the stored `is_faction` would be `0`, and the audit would then *not* flag
it. Minor today (Wahapedia uses `"1"`), but the divergence is a latent trap.
**Fix:** Extract a single `isTrueish(v)` helper in `scripts/lib/` and use it
everywhere.

### IN-02: Legends detection duplicated and string-compared three ways

**File:** `scripts/build-unit-db.ts:161,773,813`
**Issue:**
`row["legend"] === "1" || row["legend"] === "true"` is repeated verbatim for
units, stratagems, and enhancements, with no `.trim()` (unlike the
`is_faction_keyword` sites which do trim). A stray whitespace in the `legend`
column would defeat the filter and leak a Legends unit into the build.
**Fix:** Reuse the same `isTrueish` helper from IN-01, applied to a trimmed
value.

### IN-03: `--output-dir` flag value is used unsanitized as a filesystem path

**File:** `scripts/audit-faction.ts:810-815`
**Issue:**
`outputDirArg` is taken straight from `process.argv` and passed to
`mkdirSync(REPORTS_DIR, { recursive: true })` and `join(REPORTS_DIR, ...)` for
`writeFileSync`. This is a dev-only CLI run by the maintainer, so the practical
risk is near-zero, but the value is fully attacker-controlled if this script
were ever wired into an automated/CI path with external input. No traversal
guard exists. **Fix:** If this script may ever run with untrusted args, resolve
and assert the path stays within `REPO_ROOT`; otherwise add a comment
documenting the dev-only trust assumption.

---

_Reviewed: 2026-06-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
