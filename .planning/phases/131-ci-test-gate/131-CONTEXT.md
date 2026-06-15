# Phase 131: CI Test Gate - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

> ⚙️ Captured in `--auto` mode: gray areas auto-selected, recommended option chosen for each.
> All decisions below are the recommended defaults — review before planning if you disagree.

<domain>
## Phase Boundary

This phase builds the **GitHub Actions wall** that every change must pass before it can reach a user's updater. Phase 130 made the parity/CR gate runnable locally (`pnpm check:version` via the `prebuild` hook); Phase 131 makes the **full automated suite run in CI on pull requests and makes a release physically unable to publish on red** (REL-01, REL-02).

Three concrete deliverables (from ROADMAP success criteria):
1. A PR-triggered CI workflow that runs `pnpm test` + `cargo test` + `pnpm build` and blocks merge on any failure.
2. `release.yml` cannot publish a GitHub Release / `latest.json` unless the CI test job passed (the build/publish job `needs:` the test job).
3. The Rust toolchain is **pinned**, not floating (`@stable`), so a compiler delta can't silently undo a green CI.

**In scope:** the PR CI workflow YAML, restructuring `release.yml` so publish depends on a passing test job, pinning the Rust toolchain, and CI caching. Documenting the branch-protection required-status-check that turns a red check into an actual merge block.

**Out of scope (own phases):** in-place NSIS update install/relaunch verification + diagnostics logs (REL-06/07/08 → Phase 132); any app/feature code changes. Theme A does **not** merge to `master` until Phase 132.

</domain>

<decisions>
## Implementation Decisions

### Workflow topology (REL-01 + REL-02)
- **D-01:** Use a **reusable workflow** so the same test job runs in both PR CI and the release gate (avoids duplicated YAML and guarantees they test identically). Create `.github/workflows/ci.yml` defining a `test` job with `on: [pull_request, workflow_call]`. `release.yml` adds a `test` job that does `uses: ./.github/workflows/ci.yml`, and the existing `release` (build/publish) job gains `needs: test`. This is what makes "release cannot publish unless CI passed" literally true — `needs:` short-circuits the publish job if `test` fails.
- **D-02:** PR CI triggers on `pull_request` (all PRs into any branch, including the Theme A working branch and `master`). No `push`-to-branch trigger is needed for the gate itself; the `release.yml` tag-push trigger is unchanged except for the added `needs: test`.

### Job & runner structure
- **D-03:** **Single `test` job on `windows-latest`** running the three checks sequentially: `pnpm test` → `cargo test` → `pnpm build`. Rationale: the app is Windows-only, the release builds on `windows-latest`, and `cargo test` must use the same target/toolchain as the shipped binary — splitting across runners adds matrix complexity with no payoff for a single-platform desktop app. A failure in any step fails the job (and therefore the gate).
- **D-04:** Job setup mirrors `release.yml` exactly so CI and release stay in lockstep: `actions/checkout@v4`, `pnpm/action-setup@v4` (version 10), `actions/setup-node@v4` (node 22, `cache: pnpm`), Rust toolchain (see D-05), `swatinem/rust-cache@v2` with `workspaces: src-tauri -> target`, then `pnpm install` before the checks. `pnpm build` already runs the `prebuild` hook (`check:version`), so the Phase-130 parity/CR gate runs inside CI for free.

### Rust toolchain pinning (REL-02)
- **D-05:** Commit a repo-root **`rust-toolchain.toml`** pinning a specific stable version (e.g. `[toolchain] channel = "1.XX.0"`) — a single source of truth honored by CI, the release workflow, **and** local developers. Replace `dtolnay/rust-toolchain@stable` in both `ci.yml` and `release.yml` with a pin that respects the toolchain file (either `dtolnay/rust-toolchain@<version>` matching the file, or rely on the file with a toolchain action that reads it). The planner picks the exact channel version (current stable at implementation time); the requirement is only that it is pinned, not floating.

### Merge-block enforcement
- **D-06:** The committed YAML makes the check *exist and report status*; turning a red check into an actual **blocked merge** requires a GitHub **branch-protection rule** ("Require status checks to pass before merging" → select the `test` check) on the protected branch(es). This is a repo-admin setting not expressible in committed files. Document it as a required manual step in the phase output / a short note (e.g. README or `.github/`), and call it out in the verification so the human enables it. Without it, success criterion #1 ("blocks merge") is not satisfied even though CI runs.

### Claude's Discretion
- Exact pinned Rust channel version, the precise toolchain-action wiring (file-driven vs explicit version arg), workflow/job/step names, and whether the branch-protection note lives in README vs a `.github/` doc are the planner/executor's call, provided the three success criteria hold.
- Whether to add `concurrency:` cancellation for superseded PR runs (a nicety) is left to the executor — not required by the criteria.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 131: CI Test Gate" — goal + 3 success criteria (the authoritative acceptance bar) and the Phase-130 dependency note.
- `.planning/REQUIREMENTS.md` — REL-01, REL-02 (full requirement text); note the **Sequencing law**: Theme A must merge to `master` only at the end of Phase 132, not here.

### Files this phase creates/modifies/reads
- `.github/workflows/release.yml` — existing release workflow to restructure: add a `test` job (`uses: ./.github/workflows/ci.yml`) and `needs: test` on the build/publish job; swap `dtolnay/rust-toolchain@stable` for a pin.
- `.github/workflows/ci.yml` — **new** reusable PR-CI workflow (`on: [pull_request, workflow_call]`) defining the `test` job.
- `rust-toolchain.toml` — **new** repo-root toolchain pin (single source of truth for CI/release/local).
- `package.json` — `scripts.test` (`vitest run`), `scripts.build` (`tsc && vite build`), and `prebuild` (`node scripts/check-version.mjs`) that CI invokes; pnpm version is 10.
- `src-tauri/src/lib.rs` — contains the existing `#[cfg(test)]` Rust tests that `cargo test` will run (confirms `cargo test` is non-empty).
- `src-tauri/Cargo.toml` — `edition = "2021"`; reference for the toolchain pin.
- `.planning/phases/130-migration-parity-release-gate/130-CONTEXT.md` — Phase 130 decisions; the `check:version` gate (D-08 prebuild hook) that now runs transitively inside `pnpm build` in CI.

No external ADRs/specs — requirements fully captured in the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/release.yml` — already a working Windows Tauri build pipeline (checkout → pnpm 10 → node 22 + pnpm cache → Rust + rust-cache → `pnpm install` → `tauri-action@v0`). The CI `test` job should mirror its setup steps verbatim; the release job is restructured around a new `test` dependency rather than rewritten.
- `scripts/check-version.mjs` (`pnpm check:version`) — the Phase-130 three-leg gate (version parity + migration count + CR-byte scan), wired as `prebuild`. Because CI runs `pnpm build`, this gate executes in CI automatically — no separate CI step needed.
- `src-tauri/src/lib.rs` `#[cfg(test)]` module — real Rust unit tests, so `cargo test` is a meaningful gate, not a no-op.

### Established Patterns
- Single-platform Windows desktop app: all CI/release runs on `windows-latest`; no cross-platform matrix.
- Tooling versions are pinned by major (pnpm 10, node 22); this phase extends that discipline to the Rust toolchain (the one currently-floating dependency).

### Integration Points
- `release.yml` tag-push trigger (`on: push: tags: v*`) stays; the new coupling is the `needs: test` edge and the reusable `ci.yml` call.
- GitHub branch-protection settings (out-of-repo) are the final integration point that converts the CI status into an enforced merge block (D-06).

</code_context>

<specifics>
## Specific Ideas

- "CI is the wall every change passes through" (ROADMAP goal) — the gate must be unbypassable for releases: enforced structurally via `needs:` (release) and via branch protection (merge), not by convention.
- Pin, don't float: the explicit motivation for the toolchain pin is that a compiler delta must never be able to undo a previously-green CI.

</specifics>

<deferred>
## Deferred Ideas

- In-place NSIS update verification, relaunch-after-update UX, and persistent `frontend.log`/`preflight.log` diagnostics — REL-06/07/08 → **Phase 132** (where Theme A merges to `master`).
- `concurrency:` auto-cancel of superseded PR runs and any CI-speed tuning beyond caching — optional polish, not required by the criteria; executor may include if cheap.

None blocking — discussion stayed within phase scope.

</deferred>

---

*Phase: 131-ci-test-gate*
*Context gathered: 2026-06-15*
