---
phase: 131-ci-test-gate
plan: "02"
subsystem: ci
tags: [ci, github-actions, release-gate, branch-protection, rust-toolchain, reusable-workflow]

requires:
  - phase: 131-01
    provides: [ci.yml reusable workflow with workflow_call trigger]
provides:
  - release.yml restructured with test caller job (uses ci.yml) and needs: test gate on publish job
  - Rust toolchain pinned to 1.87.0 in release.yml (replacing floating @stable)
  - .github/BRANCH_PROTECTION.md documenting the manual required-status-check repo-admin step (D-06)
affects: [Phase 132 — release verification; any future workflow changes to release.yml or ci.yml]

tech-stack:
  added: []
  patterns:
    - "Caller job pattern: a minimal `test: uses: ./.github/workflows/ci.yml` job in release.yml routes to the reusable workflow without secrets: inherit"
    - "Structural gate: `needs: test` on the release job prevents publish from starting if the test job fails — no if: override, no convention dependency"

key-files:
  created:
    - .github/BRANCH_PROTECTION.md
  modified:
    - .github/workflows/release.yml

key-decisions:
  - "D-01: release.yml gains a caller test job (uses: ./.github/workflows/ci.yml) and the publish job gains needs: test — making publish-on-red structurally impossible for tag pushes"
  - "D-05: release.yml toolchain step pinned to dtolnay/rust-toolchain@master + toolchain: 1.87.0, replacing floating @stable"
  - "D-06: .github/BRANCH_PROTECTION.md documents the manual repo-admin required-status-check step, including the critical pitfall of reading the actual check name from the GitHub UI autocomplete after the first PR run"

patterns-established:
  - "Reusable workflow callers: no secrets: inherit unless the callee explicitly declares secrets — test job uses none"
  - "needs: test references the caller job in the same file, NOT the inner job inside the called workflow"

requirements-completed: [REL-01, REL-02]

duration: 8min
completed: 2026-06-15
---

# Phase 131 Plan 02: Release Gate & Branch Protection Summary

**release.yml restructured with a `needs: test` publish gate calling the reusable ci.yml, toolchain pinned to 1.87.0, and BRANCH_PROTECTION.md documenting the manual required-status-check step with the autocomplete-name pitfall — awaiting human checkpoint for the actual repo-admin setting.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-15
- **Completed:** 2026-06-15 (Tasks 1-2 auto; Task 3 at blocking checkpoint)
- **Tasks:** 2 of 3 auto-completed (Task 3 is a blocking human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- `release.yml` gains a `test` caller job (`uses: ./.github/workflows/ci.yml`) — no secrets: inherit, no inputs — making the test path structurally isolated from the signing key
- `release` publish job gains `needs: test` — the publish job never starts if the test job fails; no `if:` override or convention-based workaround (D-01, REL-02, T-131-05 mitigated)
- `dtolnay/rust-toolchain@stable` replaced with `@master` + `toolchain: 1.87.0` in the release job, matching the pinned version in rust-toolchain.toml (D-05, T-131-06 mitigated)
- `TAURI_SIGNING_PRIVATE_KEY` confirmed scoped to the release job only — test caller has no secrets (T-131-04 mitigated)
- `.github/BRANCH_PROTECTION.md` created documenting the manual admin step, the autocomplete pitfall, and the deliberate-red verification recipe (D-06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure release.yml — add test caller job, needs: test, pin toolchain** — `8cf3b7e8` (feat)
2. **Task 2: Document the branch-protection required-status-check** — `fc3c69e1` (docs)
3. **Task 3: Owner enables branch protection + deliberate-red verification** — PENDING (blocking checkpoint)

## Files Created/Modified

- `.github/workflows/release.yml` — Added `test` caller job, `needs: test` on release job, swapped @stable for @master + toolchain: 1.87.0
- `.github/BRANCH_PROTECTION.md` — Manual repo-admin instructions: Settings → Branches → Require status checks, autocomplete pitfall, deliberate-red verification recipe

## Decisions Made

- D-01: Caller job pattern chosen — `test: uses: ./.github/workflows/ci.yml` with no `secrets: inherit` (test job needs no signing key). `needs: test` on the release job is the structural gate.
- D-05: `dtolnay/rust-toolchain@master` + `toolchain: 1.87.0` chosen (Option A from RESEARCH.md), matching the rust-toolchain.toml channel. No `@stable` floating ref anywhere in either workflow now.
- D-06: Branch protection doc placed at `.github/BRANCH_PROTECTION.md` (owner-visible location). Autocomplete pitfall documented prominently — the check name after a `pull_request` run is likely `test`, but must be confirmed from the UI, not typed manually.

## Deviations from Plan

None — plan executed exactly as written for the two auto tasks.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. Threat mitigations verified:

- T-131-04 (Information Disclosure): release.yml does NOT contain `secrets: inherit` — signing key never reaches the test caller path. Confirmed by acceptance criteria check.
- T-131-05 (Elevation of Privilege): `needs: test` is present in the release job — publish cannot start if test fails. Confirmed by grep.
- T-131-06 (Spoofing/Repudiation): `TAURI_SIGNING_PRIVATE_KEY` retained on release job; `toolchain: 1.87.0` present, `@stable` absent. Both confirmed.
- T-131-07 (Tampering — merge block): documented in BRANCH_PROTECTION.md; requires human action at Task 3 checkpoint.

No new threat flags beyond the plan's registered threats.

## Known Stubs

None. This plan modifies CI YAML and creates a documentation file — no UI data flow.

## Pending Checkpoint (Task 3 — Blocking)

**Status:** Awaiting human action.

Task 3 is a `gate="blocking"` human-verify checkpoint. The repo-admin branch protection setting cannot be expressed in committed YAML — it requires a GitHub UI action that only a repository owner can perform.

**What must happen:**
1. Open a pull request so `ci.yml` runs once via `on: pull_request`.
2. In the PR Checks tab, read the EXACT reported status-check name from the GitHub UI autocomplete.
3. Go to GitHub → Settings → Branches → add/edit the rule for `master`: enable "Require status checks to pass before merging" and select the check via the autocomplete.
4. Run the deliberate-red test: add `expect(1).toBe(2)` to any test, push to the PR, confirm CI goes red and the merge button is disabled.
5. Revert, confirm green and merge re-enables.

See `.github/BRANCH_PROTECTION.md` for full step-by-step instructions.

**Resume signal:** Type "approved" once branch protection is enabled and the deliberate-red test confirmed the merge block.

## Self-Check: PASSED

- `.github/workflows/release.yml` contains `uses: ./.github/workflows/ci.yml`: confirmed
- `.github/workflows/release.yml` contains `needs: test`: confirmed
- `.github/workflows/release.yml` contains `toolchain: 1.87.0`: confirmed
- `.github/workflows/release.yml` does NOT contain `dtolnay/rust-toolchain@stable`: confirmed
- `.github/workflows/release.yml` does NOT contain `secrets: inherit`: confirmed
- `.github/workflows/release.yml` contains `TAURI_SIGNING_PRIVATE_KEY`: confirmed
- `.github/workflows/release.yml` contains `tauri-apps/tauri-action@v0`: confirmed
- YAML validation: PASSED (python yaml.safe_load)
- `.github/BRANCH_PROTECTION.md` exists: confirmed
- All acceptance criteria checks: 7/7 PASS for release.yml, 6/6 PASS for BRANCH_PROTECTION.md
- Commits 8cf3b7e8 and fc3c69e1 verified in git log
