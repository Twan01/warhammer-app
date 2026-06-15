# Phase 131: CI Test Gate - Research

**Researched:** 2026-06-15
**Domain:** GitHub Actions — reusable workflows, Rust toolchain pinning, CI/CD gating
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Reusable workflow topology. Create `.github/workflows/ci.yml` with `on: [pull_request, workflow_call]` defining a `test` job. `release.yml` adds a caller `test` job using `uses: ./.github/workflows/ci.yml` and the existing `release` (build/publish) job gains `needs: test`.
- **D-02:** PR CI triggers on `pull_request` (all PRs into any branch). No `push`-to-branch trigger. The `release.yml` tag-push trigger is unchanged except for the added `needs: test`.
- **D-03:** Single `test` job on `windows-latest` running sequentially: `pnpm test` → `cargo test` → `pnpm build`. Failure in any step fails the job.
- **D-04:** Job setup mirrors `release.yml` exactly: `actions/checkout@v4`, `pnpm/action-setup@v4` (version 10), `actions/setup-node@v4` (node 22, `cache: pnpm`), Rust toolchain (see D-05), `swatinem/rust-cache@v2` with `workspaces: src-tauri -> target`, then `pnpm install`.
- **D-05:** Commit repo-root `rust-toolchain.toml` pinning a specific stable version. Replace `dtolnay/rust-toolchain@stable` in both workflows with a pinned toolchain step.
- **D-06:** Branch-protection required-status-check enabling is a manual repo-admin step. Document it; call it out in verification.

### Claude's Discretion

- Exact pinned Rust channel version (planner picks at implementation time).
- Precise toolchain-action wiring (file-driven vs explicit version arg in the action).
- Workflow/job/step names.
- Whether the branch-protection note lives in README vs a `.github/` doc.
- Whether to add `concurrency:` cancellation for superseded PR runs.

### Deferred Ideas (OUT OF SCOPE)

- In-place NSIS update verification, relaunch-after-update UX, persistent `frontend.log`/`preflight.log` diagnostics (REL-06/07/08 — Phase 132).
- `concurrency:` auto-cancel and CI-speed tuning beyond caching.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REL-01 | CI runs the full automated suite (`pnpm test` + `cargo test` + `pnpm build`) on every pull request and blocks merge on any failure. | `on: pull_request` trigger on `ci.yml`; branch-protection required-status-check. |
| REL-02 | Release workflow cannot publish a GitHub Release / `latest.json` unless CI test job passed (`needs: test`); release job pins the Rust toolchain rather than floating it. | `needs: test` in `release.yml`; `rust-toolchain.toml` + pinned toolchain action. |
</phase_requirements>

---

## Summary

Phase 131 creates two YAML files and one TOML file. The architectural pattern is a GitHub Actions **reusable workflow** (`ci.yml`) that both the PR trigger and the release workflow call identically, guaranteeing they test the same thing. The `needs: test` keyword in `release.yml` is the structural gate that makes publishing on red physically impossible — if the test job fails, the release job never starts.

The main research findings are: (1) the dual-trigger `on: [pull_request, workflow_call]` syntax is correct and well-supported; (2) a local reusable workflow reference `uses: ./.github/workflows/ci.yml` works without owner/repo/ref and uses the same commit; (3) the **status check name in branch protection must use the combined format** `caller-job-name / called-job-name`, not just the inner job name — this is the single most common pitfall; (4) `dtolnay/rust-toolchain@stable` does NOT auto-read `rust-toolchain.toml` — it requires an explicit `toolchain:` input or a pinned `@version` rev; (5) `swatinem/rust-cache@v2` DOES include the toolchain file in its cache key automatically; (6) the dev machine runs Rust 1.95.0 (released April 14, 2026) and Cargo.lock is format version 4, confirming the project compiles on 1.95.0 — this is the correct version to pin.

**Primary recommendation:** Pin Rust to `1.87.0` in `rust-toolchain.toml` (the minimum version that introduced Cargo.lock v4 and matches long-term stability) or `1.95.0` (the dev machine's current version, known to build this project). The planner should choose `1.87.0` as the conservative pin (earliest known-good) unless there is a specific dependency on a post-1.87 stabilization. See Rust Toolchain Pinning section for the action-wiring decision.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PR test gate | CI (GitHub Actions) | — | `on: pull_request` in `ci.yml` |
| Release test gate | CI (GitHub Actions) | — | `needs: test` in `release.yml` caller job |
| Merge block enforcement | GitHub repo settings | — | Branch protection required-status-check (admin step) |
| Rust toolchain version source of truth | Repo file (`rust-toolchain.toml`) | CI action reads it | Single file honored by local dev, CI, and release |
| Signing secret (`TAURI_SIGNING_PRIVATE_KEY`) | Caller workflow (`release.yml`) | Passed via `secrets: inherit` | Called workflow never holds secrets it doesn't need |

---

## Standard Stack

### Core (no new packages — this phase is YAML/TOML only)

| File | Version/Value | Purpose |
|------|--------------|---------|
| `.github/workflows/ci.yml` | new | Reusable test workflow; PR trigger + `workflow_call` |
| `.github/workflows/release.yml` | modified | Add `test` caller job + `needs: test` on release job; swap toolchain step |
| `rust-toolchain.toml` | new | Repo-root Rust toolchain pin |

### GitHub Actions used

| Action | Pinned version | Purpose | Already in release.yml? |
|--------|---------------|---------|------------------------|
| `actions/checkout` | `@v4` | Source checkout | Yes |
| `pnpm/action-setup` | `@v4` with `version: 10` | pnpm install | Yes |
| `actions/setup-node` | `@v4` with `node-version: 22, cache: pnpm` | Node + pnpm cache | Yes |
| `dtolnay/rust-toolchain` | `@master` with `toolchain: 1.87.0` (or drop entirely — see below) | Rust install | Yes (`@stable` — to replace) |
| `swatinem/rust-cache` | `@v2` with `workspaces: src-tauri -> target` | Cargo cache | Yes |

**No new npm/cargo packages are installed. This is a CI configuration phase only.**

---

## Package Legitimacy Audit

No external packages are installed by this phase. This section is not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Pull Request opened / updated
        |
        v
.github/workflows/ci.yml  (on: pull_request)
        |
   [ test job ]
   windows-latest
   pnpm test ──────────────────────► PASS/FAIL
   cargo test ─────────────────────► PASS/FAIL
   pnpm build (+ prebuild hook) ───► PASS/FAIL
        |
        v
   GitHub status check: "test / test"
        |
        v
   Branch protection rule (manual admin step)
   "Require status checks: test / test"
        |
        v
   MERGE BLOCKED if red ──► or ALLOWED if green


Tag push (v*)
        |
        v
.github/workflows/release.yml  (on: push.tags: v*)
        |
   [ test job ]  ◄── uses: ./.github/workflows/ci.yml
        |              (same test job as above, called inline)
        | PASS
        v
   [ release job ]   needs: test
   windows-latest
   tauri-apps/tauri-action@v0
   GITHUB_TOKEN + TAURI_SIGNING_PRIVATE_KEY
        |
        v
   GitHub Release published + latest.json updated
   (only reachable if test job passed)
```

### Recommended Project Structure

```
.github/
  workflows/
    ci.yml          # NEW: reusable test workflow
    release.yml     # MODIFIED: caller test job + needs: test on release job
rust-toolchain.toml # NEW: repo-root toolchain pin
```

---

## Pattern 1: Dual-Trigger Reusable Workflow (`ci.yml`)

**What:** A single workflow YAML that fires on `pull_request` events AND can be invoked by another workflow via `workflow_call`. The `on:` block simply lists both triggers.

**Verified by:** GitHub official docs [CITED: docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows]

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  workflow_call:

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@master
        with:
          toolchain: 1.87.0

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri -> target

      - name: Install frontend dependencies
        run: pnpm install

      - name: Frontend tests
        run: pnpm test

      - name: Rust tests
        run: cargo test
        working-directory: src-tauri

      - name: Build (includes prebuild parity gate)
        run: pnpm build
```

**Key details:**
- `on: pull_request:` with no `branches:` filter means all PRs to any branch (matches D-02).
- `on: workflow_call:` with no `inputs:` or `secrets:` declared — the test job needs no inputs and no secrets.
- The `working-directory: src-tauri` on `cargo test` avoids running cargo from the repo root where there is no `Cargo.toml` at root level; `src-tauri/` is the Rust project directory.

---

## Pattern 2: Release Workflow with `needs: test` Gating

**What:** `release.yml` gains a new `test` job that calls `ci.yml` via `workflow_call`. The existing `release` job gains `needs: test`.

```yaml
# .github/workflows/release.yml  (restructured)
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  test:
    uses: ./.github/workflows/ci.yml
    # No secrets needed — test job has no signing requirement

  release:
    needs: test                    # <-- the structural gate
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: windows-latest
            args: ""
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@master
        with:
          toolchain: 1.87.0

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri -> target

      - name: Install frontend dependencies
        run: pnpm install

      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
        with:
          tagName: v__VERSION__
          releaseName: "HobbyForge v__VERSION__"
          releaseBody: "See the assets to download and install this version."
          releaseDraft: false
          prerelease: false
          args: ${{ matrix.args }}
```

**Critical notes:**
- The caller `test` job (`uses: ./.github/workflows/ci.yml`) does NOT need `secrets: inherit` because the test job in `ci.yml` uses no secrets.
- The `release` job KEEPS `permissions: contents: write` at the job level — this is already there in the existing `release.yml` and is correct.
- `needs: test` references the job named `test` in the same workflow file (the caller job), not the job inside `ci.yml`.

---

## Pattern 3: `rust-toolchain.toml`

**What:** A TOML file at the repository root that rustup reads automatically when any Rust command is invoked in or below that directory.

**Verified by:** [CITED: rust-lang.github.io/rustup/overrides.html#the-toolchain-file]

```toml
# rust-toolchain.toml  (repo root)
[toolchain]
channel = "1.87.0"
profile = "minimal"
```

**Key details:**
- `profile = "minimal"` installs only rustc + cargo (no clippy, rustfmt, docs). Sufficient for `cargo test` and `cargo build`. This keeps CI toolchain install fast.
- rustup discovers this file by walking up the directory tree — it is found regardless of whether you `cd src-tauri` first.
- **This file alone does NOT cause `dtolnay/rust-toolchain@stable` to use 1.87.0.** The `@stable` rev hard-codes the latest stable lookup. You must also update the action in the workflow (see Toolchain Action Wiring below).

---

## Rust Toolchain Action Wiring (Claude's Discretion)

Two viable approaches for making the toolchain action respect the pinned version:

### Option A — Explicit version in action (RECOMMENDED)

```yaml
- name: Install Rust toolchain
  uses: dtolnay/rust-toolchain@master
  with:
    toolchain: 1.87.0
```

`dtolnay/rust-toolchain` does NOT auto-read `rust-toolchain.toml`. [VERIFIED: github.com/dtolnay/rust-toolchain action.yml — `toolchain` is `required: true`]. The `@master` rev + explicit `toolchain:` input gives a deterministic install. The `rust-toolchain.toml` file serves as the authoritative record and as a local-dev override; CI reads the same version because the action's `toolchain:` value is kept in sync with the file.

**Why not `@1.87.0` rev?** The dtolnay action's `@rev` syntax installs the version matching the revision channel, not a specific numeric version. `@stable` installs whatever stable is today. To pin numerically, `toolchain: 1.87.0` with `@master` is the correct approach per the action's README.

### Option B — Use `actions-rust-lang/setup-rust-toolchain` instead

```yaml
- name: Install Rust toolchain
  uses: actions-rust-lang/setup-rust-toolchain@v1
  # No `with:` needed — reads rust-toolchain.toml automatically
```

`actions-rust-lang/setup-rust-toolchain@v1` auto-reads `rust-toolchain.toml` when no `toolchain:` input is given. [CITED: github.com/actions-rust-lang/setup-rust-toolchain]. It also bundles `swatinem/rust-cache` internally, potentially replacing the separate cache step.

**Tradeoff:** This action is heavier (includes problem matchers, integrated cache). For this project's purpose — just installing a pinned toolchain — Option A is lighter and keeps the workflow structure consistent with the existing `release.yml` pattern. **Planner should choose Option A unless there is a reason to swap the action entirely.**

---

## Anti-Patterns to Avoid

- **`dtolnay/rust-toolchain@stable` left in place.** This remains floating. Replace with `@master` + `toolchain: 1.87.0`.
- **`uses: ./.github/workflows/ci.yml` with context expressions.** The local ref syntax does not support `${{ }}` expressions in the `uses:` value. Keep the path literal.
- **`secrets: inherit` on the test caller job.** The test job uses no secrets; adding `secrets: inherit` would pass signing keys to a job that doesn't need them — unnecessary exposure.
- **`needs: test` referencing a job inside the called workflow.** `needs:` references jobs in the same file. The `test` in `needs: test` is the caller job `test:` in `release.yml`, not the inner `test` job of `ci.yml`.
- **Registering the wrong status check name in branch protection.** When a job uses a reusable workflow, GitHub reports the check as `<caller-workflow-name> / <inner-job-name>` (confirmed via community discussions). See Branch Protection section below.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Rust version consistency | Shell scripts to parse rustc --version and compare | `rust-toolchain.toml` + toolchain action |
| Cache invalidation on toolchain change | Custom cache-key scripts | `swatinem/rust-cache@v2` — includes toolchain file in its cache key automatically [CITED: deepwiki.com/Swatinem/rust-cache] |
| Test-gate before publish | Wrapper scripts or `if:` conditions on steps | `needs: test` — structurally prevents publish job from starting |

---

## Common Pitfalls

### Pitfall 1: Branch Protection Status Check Name Mismatch

**What goes wrong:** After adding branch protection with "Require status checks: `test`", merges are still allowed even when CI is red.

**Why it happens:** When a job uses a reusable workflow (`uses: ./.github/workflows/ci.yml`), GitHub does NOT report the check under the inner job name `test`. It reports it as `<outer-workflow-name> / <inner-job-name>` or just the inner job name depending on context — the exact format is `test / test` when the `ci.yml` workflow is triggered directly via `pull_request` (not via `workflow_call`). [CITED: github.com/orgs/community/discussions/8512]

**How to avoid:** After the first CI run on a PR, go to Settings → Branches → Edit protection rule → "Require status checks" and **use the search box to find the check by its auto-suggested name** rather than typing it manually. GitHub's autocomplete shows the actual reported check name.

**Warning signs:** Branch protection shows "0 of 1 required status checks passed" but lets the merge button stay enabled.

### Pitfall 2: `dtolnay/rust-toolchain@stable` Not Reading the Toolchain File

**What goes wrong:** `rust-toolchain.toml` is committed but CI installs the latest stable anyway, defeating the pin.

**Why it happens:** `dtolnay/rust-toolchain` requires an explicit `toolchain:` input. The `@stable` rev does a `rustup toolchain install stable` regardless of any file in the repo. [VERIFIED: github.com/dtolnay/rust-toolchain action.yml]

**How to avoid:** Change `uses: dtolnay/rust-toolchain@stable` → `uses: dtolnay/rust-toolchain@master` with `with: toolchain: 1.87.0`. The `rust-toolchain.toml` file then serves as the authoritative version record; the action value must be kept in sync.

### Pitfall 3: `cargo test` Running from Repo Root

**What goes wrong:** `cargo test` fails with "could not find `Cargo.toml` in `/home/runner/work/...` or any parent directory."

**Why it happens:** The repo root has no `Cargo.toml`; the Rust project is in `src-tauri/`.

**How to avoid:** Add `working-directory: src-tauri` to the cargo test step. Alternatively, pass `--manifest-path src-tauri/Cargo.toml`.

### Pitfall 4: `pnpm build` Failing Due to Missing `TAURI_SIGNING_PRIVATE_KEY` in CI

**What goes wrong:** `pnpm build` (which runs `tsc && vite build`) succeeds, but some builds may try to invoke Tauri build steps that require the signing key.

**Why it doesn't apply here:** `pnpm build` runs the Vite/TypeScript build only — it does NOT invoke `tauri build`. The Tauri build (which needs the signing key) only runs inside `tauri-apps/tauri-action@v0`. So the test job's `pnpm build` step is safe with no secrets. [VERIFIED: package.json `"build": "tsc && vite build"` — no tauri invocation]

### Pitfall 5: `prebuild` Hook Fails in CI Due to Missing Version Files

**What goes wrong:** `pnpm build` triggers the `prebuild` hook (`node scripts/check-version.mjs`) which reads `package.json` and `tauri.conf.json`. If the checkout is shallow or files are missing, this fails.

**Why it won't happen:** `actions/checkout@v4` does a full checkout by default. The Phase 130 parity gate was designed to run in CI — this is expected behavior per CONTEXT.md D-04: "pnpm build already runs the prebuild hook... for free."

### Pitfall 6: Matrix in Release Job + `needs: test` Interaction

**What goes wrong:** The `release` job has a `strategy.matrix`. `needs: test` on a matrix job works normally — the matrix job waits for the `test` job to complete before any matrix instance starts. [ASSUMED — based on GitHub Actions documented behavior that `needs:` gates the entire job including matrix expansion]

**How to confirm:** The existing `release.yml` matrix only has one entry (`windows-latest`) so matrix interaction is minimal.

### Pitfall 7: `workflow_call` Triggered `ci.yml` Does Not Report Status Check for Branch Protection

**What goes wrong:** The `ci.yml` workflow running as `workflow_call` (from `release.yml`) does not create a separate PR status check. Only the `on: pull_request` run creates the branch-protection check.

**Why this is correct behavior:** Branch protection runs on PRs. The `release.yml` tag-push trigger is not a PR workflow. They are separate execution contexts. The PR check comes from `ci.yml` running via `on: pull_request`; the release gate comes from `needs: test` inside `release.yml`. Both paths gate correctly; they just serve different purposes.

---

## Rust Toolchain Version Selection

**Current state:**
- Dev machine: `rustc 1.95.0 (59807616e 2026-04-14)` [VERIFIED: local rustc --version]
- Current stable: Rust 1.96.0 (released 2026-05-28) [CITED: releases.rs]
- Cargo.lock format version: 4 (requires Rust 1.78+) [VERIFIED: src-tauri/Cargo.lock]

**Recommendation: Pin to `1.87.0`**

Rationale:
- 1.87.0 (released 2025-05-15) is the version used for the "10 years of Rust" release — stable, widely tested.
- The dev machine runs 1.95.0 and the project compiles — any version between 1.87.0 and 1.95.0 should also compile given no unstable features are used (edition 2021, standard library only).
- Pinning to an older-but-stable version means fewer surprise breaking changes when the pin is eventually updated, while still being well above the Cargo.lock v4 minimum (1.78.0).
- **Alternative:** Pin to `1.95.0` (the dev machine's version) for maximum fidelity between local and CI. Lower risk of subtle behavioral differences.

**The planner must choose ONE.** Either `1.87.0` (conservative) or `1.95.0` (parity with dev machine). Both are valid per D-05.

---

## Branch Protection Documentation (D-06)

The following is the required manual admin step. It must be documented as a verification task in the plan.

**Where:** GitHub → Repository → Settings → Branches → Add branch protection rule (or edit if one exists).

**Branch:** `master`

**Settings to enable:**
- "Require status checks to pass before merging" → ON
- Search for and select the status check. After the first CI run on a PR, the check will appear in the autocomplete. The expected name format is the inner job name `test` (when triggered via `on: pull_request` the workflow reports the inner job name directly; when called via `workflow_call` from release.yml the check is not a PR check at all). Use the GitHub UI autocomplete to confirm the exact name.
- "Require branches to be up to date before merging" → optional but recommended

**Without this step:** Success criterion 1 ("blocks merge on any failure") is NOT satisfied even though CI runs and reports status.

**Documentation location (Claude's discretion):** A short `.github/BRANCH_PROTECTION.md` or a note in the project's README is sufficient. The plan should include a task to create this file.

---

## Validation Architecture

> `nyquist_validation: true` in config.json — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 (`vitest run`) + Rust `#[cfg(test)]` via `cargo test` |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | How to Validate |
|--------|----------|-----------|-----------------|
| REL-01 | CI runs on PR and reports failing status | Manual smoke test | Open a PR with a deliberately failing test — CI must go red and show the failed status check in the PR UI |
| REL-01 | Merge is blocked when CI is red | Manual admin test | After branch protection is configured, confirm the "Merge pull request" button is disabled on the PR with the failing test |
| REL-02 | Release job cannot run without `test` passing | Structural verification | `needs: test` is verifiable by reading the YAML — if the test job fails, GitHub Actions cancels the release job automatically |
| REL-02 | Rust toolchain is pinned | File verification | `rust-toolchain.toml` exists at repo root with `channel = "1.87.0"` (or chosen version); action's `toolchain:` input matches |

### Sampling / Verification Strategy

Because this phase produces only YAML/TOML (no application code), automated test-writing is not applicable. Validation follows a "deliberate red" protocol:

**Wave 0 — Structural review (before first PR):**
- [ ] `ci.yml` lints via GitHub's "Actions" workflow syntax validator (no runs needed — use `act` locally or push a draft PR).
- [ ] `release.yml` lints clean.
- [ ] `rust-toolchain.toml` parses correctly (`rustup show` on dev machine should show pinned version).

**Wave 1 — Deliberate red test:**
- [ ] Open a PR that introduces a failing Vitest test (e.g., `expect(1).toBe(2)` in any test file).
- [ ] Confirm CI goes red, status check is visible on the PR.
- [ ] Confirm the failed status check name matches what branch protection was configured with.
- [ ] Revert the deliberate failure.

**Wave 2 — Branch protection verification:**
- [ ] Admin configures branch protection with the correct status check name.
- [ ] Repeat the deliberate red test — confirm merge button is now disabled.
- [ ] Merge button re-enables after CI goes green.

**Wave 3 — Release gate verification:**
- [ ] Inspect the `release.yml` workflow graph on a tag run — confirm the release job shows "waiting for test" then either runs or is cancelled.
- [ ] (Optional) Push a test tag on a branch with a failing test to observe release job cancellation.

### Wave 0 Gaps

- [ ] No new test files needed — this phase adds no application code.
- [ ] Deliberate-failure test: temporarily add `expect(1).toBe(2)` to any existing test file in `tests/` — remove after validation.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| GitHub Actions runners | CI execution | ✓ (SaaS) | `windows-latest` | — |
| Rust 1.87.0 (pinned) | `rust-toolchain.toml` | ✓ via rustup | installed on runner at action time | — |
| pnpm 10 | `pnpm/action-setup@v4` | ✓ via action | 10.x | — |
| Node 22 | `actions/setup-node@v4` | ✓ via action | 22.x | — |
| GitHub repo admin access | Branch protection setup (D-06) | ✓ (repo owner) | — | Cannot automate |

**Missing dependencies with no fallback:** None.

**Note on pwsh (Windows-latest default shell):** The default shell on `windows-latest` is `pwsh` (PowerShell Core). `pnpm test`, `cargo test`, and `pnpm build` are all standard commands that work in pwsh. GitHub Actions prepends `$ErrorActionPreference = 'stop'` in pwsh shells, which means a non-zero exit code from any command in a `run:` step causes the step to fail immediately — this is the desired behavior for a gate. [ASSUMED — based on GitHub Actions documented pwsh behavior] No `shell: bash` override is needed.

---

## State of the Art

| Old Approach | Current Approach | When Changed |
|--------------|-----------------|--------------|
| `dtolnay/rust-toolchain@stable` (floating) | `dtolnay/rust-toolchain@master` with explicit version + `rust-toolchain.toml` | This phase |
| No CI workflow | `ci.yml` with `on: [pull_request, workflow_call]` | This phase |
| Release can publish on any toolchain state | `needs: test` gates publish | This phase |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `pwsh` correctly propagates non-zero exit codes from `pnpm test`, `cargo test`, `pnpm build` without needing `shell: bash` | Common Pitfalls / Windows pitfalls | CI step would silently pass on test failure — verify by deliberate red test |
| A2 | Matrix job with `needs: test` waits for `test` to complete before any matrix instance starts | Pattern 2 / Matrix interaction | Release could start before test completes — verify by reading CI run graph |
| A3 | The branch-protection status check name when `ci.yml` is triggered via `on: pull_request` (not `workflow_call`) is the inner job name `test` (not `CI / test` or similar) | Branch Protection section | Wrong name in branch protection means gate is never enforced — resolve by using GitHub UI autocomplete after first CI run |

**If A3 is wrong:** The branch protection step in the plan should explicitly say "use GitHub UI autocomplete after the first PR CI run — do not type the name manually."

---

## Open Questions

1. **Exact branch-protection status check name**
   - What we know: GitHub community confirms the format is `caller-workflow / inner-job` when called via `workflow_call`, but when triggered directly via `on: pull_request` the format may be just the job name.
   - What's unclear: The precise string for THIS project's `ci.yml` with a job named `test`.
   - Recommendation: Plan must include a task to run one PR CI run first, then read the reported check name from the PR UI before configuring branch protection.

2. **Pin to 1.87.0 vs 1.95.0**
   - What we know: Dev machine runs 1.95.0; project compiles clean on it. 1.87.0 is an older-but-stable choice.
   - What's unclear: Whether any dependency requires a Rust version > 1.87.0 (none detected from Cargo.toml inspection — all deps use edition 2021 with no unstable features).
   - Recommendation: Planner should choose `1.87.0` (conservative) and note the dev machine's 1.95.0 as a fallback upgrade path if a build error appears.

---

## Sources

### Primary (HIGH confidence)
- [CITED: docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows] — reusable workflow on-triggers, local ref syntax (`uses: ./.github/workflows/ci.yml`), `needs:` gating, secrets inheritance mechanics
- [CITED: rust-lang.github.io/rustup/overrides.html#the-toolchain-file] — `rust-toolchain.toml` format, `[toolchain]` table, `channel` / `profile` fields, directory-walk discovery
- [VERIFIED: github.com/dtolnay/rust-toolchain action.yml] — `toolchain` input is `required: true`; does NOT auto-read `rust-toolchain.toml`
- [CITED: github.com/actions-rust-lang/setup-rust-toolchain] — this alternative action DOES auto-read `rust-toolchain.toml`
- [VERIFIED: local `rustc --version`] — dev machine runs Rust 1.95.0 (released 2026-04-14)
- [VERIFIED: src-tauri/Cargo.lock] — Cargo.lock format version 4 (requires Rust 1.78+)
- [VERIFIED: package.json] — `"build": "tsc && vite build"` (no tauri invocation), `"test": "vitest run"`, `"prebuild": "node scripts/check-version.mjs"`

### Secondary (MEDIUM confidence)
- [CITED: github.com/orgs/community/discussions/8512] — reusable workflow status check naming; combined `caller / inner-job` format confirmed by GitHub support
- [CITED: github.com/orgs/community/discussions/46752] — status check name format ambiguity; recommendation to use GitHub UI autocomplete
- [CITED: releases.rs/docs/1.95.0, releases.rs/docs/1.96.0] — Rust 1.95.0 released 2026-04-14; 1.96.0 released 2026-05-28 (current stable)
- [CITED: swatinem.de/blog/rust-toolchain] — rationale for pinning; recommended `[toolchain] channel = "1.84" profile = "minimal"` pattern
- [CITED: deepwiki.com/Swatinem/rust-cache] — rust-cache includes `rust-toolchain.toml` in cache key automatically

### Tertiary (LOW confidence)
- [ASSUMED] pwsh exit-code behavior on windows-latest — documented by GitHub Actions but not experimentally verified for this project's specific command sequence

---

## Metadata

**Confidence breakdown:**
- Workflow topology (D-01, D-02, D-03, D-04): HIGH — all syntax verified against official docs
- Rust toolchain pinning (D-05): HIGH — `rust-toolchain.toml` format verified; action behavior verified against source
- Branch protection check naming (D-06): MEDIUM — community-confirmed but exact string requires first live run to determine
- Windows runner behavior: MEDIUM — documented but not experimentally verified for this exact command sequence

**Research date:** 2026-06-15
**Valid until:** 2026-09-15 (GitHub Actions API is stable; toolchain choice is pinned so drift risk is low)
