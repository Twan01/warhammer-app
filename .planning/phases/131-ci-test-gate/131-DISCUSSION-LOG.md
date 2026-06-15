# Phase 131: CI Test Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 131-ci-test-gate
**Mode:** `--auto` (gray areas auto-selected; recommended option chosen for each)
**Areas discussed:** Workflow topology, Job/runner structure, Rust toolchain pinning, Caching, Merge-block enforcement

---

## Workflow topology

| Option | Description | Selected |
|--------|-------------|----------|
| Reusable workflow | `ci.yml` exposes a `test` job via `workflow_call`; `release.yml` adds a `test` job using it; build job `needs: test` | ✓ |
| Duplicate test job in release.yml | Copy the test steps directly into release.yml before the build job | |
| Separate workflows, no coupling | PR CI standalone; rely only on branch protection to gate release | |

**Auto-selected:** Reusable workflow.
**Notes:** `needs:` only works within a workflow file; a reusable `ci.yml` lets PR CI and the release gate run the identical job, making "release cannot publish on red" structurally true.

---

## Job & runner structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single job, windows-latest | `pnpm test` → `cargo test` → `pnpm build` sequentially on one Windows runner | ✓ |
| Split parallel jobs | Separate test/build jobs, possibly different runners | |
| Cross-platform matrix | Run on multiple OSes | |

**Auto-selected:** Single job on windows-latest.
**Notes:** Windows-only desktop app; release builds on windows-latest; cargo test must match the shipped toolchain. No payoff in splitting.

---

## Rust toolchain pinning

| Option | Description | Selected |
|--------|-------------|----------|
| `rust-toolchain.toml` (repo root) | Pin a specific stable channel; single source of truth for CI, release, and local | ✓ |
| Inline pin in each workflow | `dtolnay/rust-toolchain@<version>` hardcoded per workflow only | |
| Keep `@stable` | Float the toolchain (status quo — rejected by REL-02) | |

**Auto-selected:** Commit `rust-toolchain.toml`.
**Notes:** Satisfies REL-02 "pins rather than floats" and keeps CI/release/local in lockstep.

---

## Caching

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse release caching | pnpm cache (setup-node) + swatinem/rust-cache, mirroring release.yml | ✓ |
| No caching | Simpler YAML, slower runs | |

**Auto-selected:** Reuse pnpm + rust caching.
**Notes:** Mirrors release.yml setup verbatim to keep CI fast and identical to release.

---

## Merge-block enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| CI check + documented branch protection | YAML produces the required check; document the GitHub required-status-check repo setting as a manual step | ✓ |
| Assume merge block from YAML alone | (Incorrect — "blocks merge" needs a repo setting, not committed YAML) | |

**Auto-selected:** CI check + documented branch-protection manual step.
**Notes:** Branch protection is a repo-admin setting not expressible in committed files; flagged for verification so success criterion #1 is actually met.

---

## Claude's Discretion

- Exact pinned Rust channel version and toolchain-action wiring (file-driven vs explicit version arg).
- Workflow/job/step names; location of the branch-protection note (README vs `.github/`).
- Optional `concurrency:` auto-cancel of superseded PR runs.

## Deferred Ideas

- REL-06/07/08 (in-place NSIS update verification, relaunch UX, persistent diagnostics logs) → Phase 132 (Theme A merges to master there).
- CI-speed tuning beyond caching → optional polish, not required.
