# Phase 130: Migration Parity & Release Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 130-Migration Parity & Release Gate
**Mode:** `--auto` (gray areas auto-selected, recommended option chosen for each)
**Areas discussed:** Migration-list derivation, Single parity gate, CR-byte gate, Gate wiring

---

## Migration-list derivation (REL-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from disk | Replace hardcoded array with `readdirSync` sorted by numeric prefix; count = `.length` | ✓ |
| Keep array + drift test | Keep hardcoded list, add a test asserting array == disk listing | |

**Auto choice:** Derive from disk (recommended default).
**Notes:** Closes the RED `046→047` gap permanently; adding a migration auto-updates the list. Must preserve the post-chain `PRAGMA foreign_keys` ON assertion (migration 022 toggles it) and add a wargear-schema (047) assertion so it's exercised.

---

## Single parity gate (REL-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Extend check-version.mjs | One script asserts version parity + migration-count parity (file count == lib.rs count); transitive 3rd leg via the vitest test | ✓ |
| Separate scripts per concern | Distinct scripts for version, migration count, CR | |

**Auto choice:** Extend `check-version.mjs`, keep `pnpm check:version` name (recommended default).
**Notes:** Avoids importing the `.ts` helper from `.mjs`; the data-layer-length leg is enforced transitively (file==lib.rs in script; lib.rs==helper in vitest; helper==disk by construction).

---

## CR-byte gate (REL-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into check-version.mjs | Scan `migrations/*.sql` Buffers for `0x0D`, fail listing offenders | ✓ |
| Separate dedicated script | Standalone CR-lint script | |

**Auto choice:** Fold into `check-version.mjs`, migrations-only scope (recommended default).
**Notes:** Complements the existing `.gitattributes` LF normalization (git-layer prevention) as a runtime backstop. No CR bytes currently present — gate passes on the clean tree.

---

## Gate wiring — local enforcement (REL-04)

| Option | Description | Selected |
|--------|-------------|----------|
| prebuild hook | `"prebuild": "node scripts/check-version.mjs"` so `pnpm build` fails before artifacts | ✓ |
| Manual command only | Leave as `pnpm check:version`, no automatic invocation | |

**Auto choice:** Add `prebuild` hook (recommended default).
**Notes:** Satisfies the "locally before build" half of REL-04. The "in CI" half is deferred to Phase 131 — no GitHub Actions YAML in this phase.

## Claude's Discretion

- Exact failure-message wording and check ordering in `check-version.mjs`.
- Whether the wargear (047) schema assertion lives in `migration-parity.test.ts` or `schema-shape.test.ts`.

## Deferred Ideas

- CI workflow invoking the gate on PRs / before release — REL-01/REL-02, Phase 131.
- NSIS update verification, relaunch UX, diagnostics logs — REL-06/07/08, Phase 132.
- Broader CR/encoding linting beyond migrations — not needed.
