---
phase: 131-ci-test-gate
plan: "01"
subsystem: ci
tags: [ci, github-actions, rust-toolchain, pr-gate, reusable-workflow]
dependency_graph:
  requires: [130-01]
  provides: [ci.yml reusable workflow, rust-toolchain.toml]
  affects: [release.yml (Plan 02 will wire needs: test)]
tech_stack:
  added: [rust-toolchain.toml (repo-root toolchain pin)]
  patterns: [GitHub Actions reusable workflow (workflow_call), dtolnay/rust-toolchain@master with explicit toolchain version]
key_files:
  created:
    - rust-toolchain.toml
    - .github/workflows/ci.yml
  modified: []
decisions:
  - "D-05: Pin Rust to 1.87.0 (conservative minimum above Cargo.lock v4 requirement of 1.78.0; dev machine runs 1.95.0 — both compile cleanly)"
  - "D-01: ci.yml uses workflow_call with no inputs/secrets — Plan 02 calls it from release.yml without secrets: inherit"
  - "D-04: Setup stack mirrors release.yml verbatim (checkout@v4, pnpm@v4 v10, setup-node@v4 node22, swatinem/rust-cache@v2) — dtolnay step replaced @stable with @master+toolchain:1.87.0"
metrics:
  duration: "3 minutes"
  completed: "2026-06-15"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 131 Plan 01: CI Test Gate Summary

**One-liner:** Pinned Rust 1.87.0 via repo-root rust-toolchain.toml and reusable ci.yml PR gate running pnpm test + cargo test + pnpm build on windows-latest with workflow_call support for Plan 02 release gate.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create repo-root rust-toolchain.toml | bc5ca271 | rust-toolchain.toml |
| 2 | Create .github/workflows/ci.yml reusable test workflow | 6528b4b8 | .github/workflows/ci.yml |

## What Was Built

### rust-toolchain.toml (repo root)

Single-source-of-truth Rust toolchain pin. Contains `[toolchain]` with `channel = "1.87.0"` and `profile = "minimal"`. Discovered by rustup when running from repo root or src-tauri/. Serves as the authoritative version record; the `toolchain: 1.87.0` value in ci.yml must stay in sync manually (dtolnay action does not auto-read this file).

### .github/workflows/ci.yml

Reusable CI test workflow with dual triggers:
- `pull_request:` with no `branches:` filter — fires on all PRs to any branch (D-02)
- `workflow_call:` with no `inputs:` or `secrets:` — callable by release.yml (D-01)

Single `test` job on `windows-latest` (D-03). Setup stack mirrors release.yml verbatim with one change: `dtolnay/rust-toolchain@stable` replaced by `dtolnay/rust-toolchain@master` with `toolchain: 1.87.0` (D-04, D-05).

Three sequential check steps after pnpm install:
1. `pnpm test` — runs `vitest run`
2. `cargo test` with `working-directory: src-tauri` — avoids missing root Cargo.toml error
3. `pnpm build` — runs `tsc && vite build` AND triggers the `prebuild` hook (`node scripts/check-version.mjs`) automatically, exercising the Phase-130 parity gate in CI at no extra cost (D-04)

No `secrets: inherit`, no `TAURI_SIGNING_PRIVATE_KEY` in the test job (T-131-01 mitigated).

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. The threat mitigations defined in the plan's threat model were verified:

- T-131-01 (Information Disclosure): ci.yml contains no `secrets: inherit` and no `TAURI_SIGNING_PRIVATE_KEY` — confirmed by acceptance criteria checks.
- T-131-03 (Elevation of Privilege): ci.yml declares no `permissions:` block — runs with repo default (read). No `contents: write` present.

No new threat flags beyond the plan's registered threats.

## Known Stubs

None. This plan creates CI configuration files only — no UI data flow, no stub patterns applicable.

## Pending Manual Step (D-06)

Branch protection enabling is NOT automated. After Plan 02 wires release.yml and the first PR CI run completes:

1. Go to GitHub → Repository → Settings → Branches → Add/Edit protection rule for `master`
2. Enable "Require status checks to pass before merging"
3. Use the GitHub UI **autocomplete** to find the exact status check name (likely `test` for direct pull_request trigger — do NOT type manually; see RESEARCH.md Pitfall 1 and Assumption A3)
4. Enable "Require branches to be up to date before merging" (recommended)

This step is documented in 131-VALIDATION.md Wave 2.

## Self-Check: PASSED

- `rust-toolchain.toml` exists at repo root: confirmed (bc5ca271)
- `.github/workflows/ci.yml` exists: confirmed (6528b4b8)
- Both commits verified in git log
- All acceptance criteria checks: 11/11 PASS for ci.yml, 5/5 PASS for rust-toolchain.toml
