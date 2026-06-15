---
phase: 131
slug: ci-test-gate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-15
---

# Phase 131 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **Nature of this phase:** it produces CI/build infrastructure (YAML + TOML), not application code. Validation follows a "deliberate red" protocol — the gate is proven by making the suite fail and observing the gate block — rather than by adding unit tests.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (`vitest run`) + Rust `#[cfg(test)]` via `cargo test` |
| **Config file** | `vitest.config.ts` (existing); `src-tauri/Cargo.toml` for Rust |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml && pnpm build` |
| **Estimated runtime** | ~60–120s locally (CI longer with cold caches) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test` (the local half of the gate) and, for Rust-touching tasks, `cargo test --manifest-path src-tauri/Cargo.toml`.
- **After every plan wave:** Run the full suite command above (this mirrors exactly what CI runs).
- **Before `/gsd:verify-work`:** Full suite must be green locally; YAML must lint clean.
- **Max feedback latency:** ~120 seconds locally.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 131-01-* | 01 | 1 | REL-02 | — | Pinned toolchain — no floating compiler | file/structural | `test -f rust-toolchain.toml && grep -q 'channel' rust-toolchain.toml` | ❌ W0 | ⬜ pending |
| 131-01-* | 01 | 1 | REL-01 | — | CI test job runs full suite on PR | structural (YAML) | `test -f .github/workflows/ci.yml` + parse `on:` includes `pull_request` & `workflow_call` | ❌ W0 | ⬜ pending |
| 131-02-* | 02 | 2 | REL-02 | T-secrets | Release cannot publish on red; signing secret survives | structural (YAML) | grep release.yml for `needs: test` and `uses: ./.github/workflows/ci.yml` | ❌ W0 | ⬜ pending |
| 131-02-* | 02 | 2 | REL-01 | — | Merge blocked on red (branch protection) | manual admin | GitHub UI: deliberate-red PR → merge button disabled | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No new automated test files needed — this phase adds no application code.
- [ ] Local YAML/TOML must parse: `ci.yml`, `release.yml` lint clean (GitHub Actions syntax); `rust-toolchain.toml` parses (`rustup show` reflects the pinned channel on the dev machine).
- [ ] Deliberate-failure harness: temporarily add `expect(1).toBe(2)` to an existing file under `tests/` to prove the gate goes red, then revert.

*Existing infrastructure (Vitest + cargo test + pnpm build) covers the suite the gate runs — no framework install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI goes red on a failing test and the status check is visible on the PR | REL-01 | Requires a live PR against GitHub Actions; cannot be run in-repo | Open a PR introducing `expect(1).toBe(2)`; confirm the `test` check goes red in the PR UI; note the exact reported status-check name; revert. |
| Merge button is disabled while CI is red | REL-01 | Requires branch-protection repo-admin setting (out-of-repo) | After admin enables "Require status checks to pass" with the resolved check name, confirm merge is blocked on the red PR and re-enabled once green. |
| Release job is gated behind `test` (waits/cancels) | REL-02 | Requires a tag run observed in the Actions graph | On a tag run, confirm the release job shows "waiting for test"; optionally push a tag on a failing branch to observe the release job cancel. |

*Structural assertions (`needs: test`, `uses: ./.github/workflows/ci.yml`, `rust-toolchain.toml` content) ARE checkable in-repo via grep/parse and should be plan acceptance criteria; only the live GitHub behaviors above are manual.*

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` structural check (grep/parse/file-exists) OR a documented manual GitHub-behavior verification
- [ ] Sampling continuity: full suite (`pnpm test && cargo test && pnpm build`) runs at each wave — identical to what CI runs
- [ ] Wave 0 covers YAML/TOML parse + deliberate-red harness
- [ ] No watch-mode flags (`vitest run`, not `vitest`)
- [ ] Feedback latency < 120s locally
- [ ] `nyquist_compliant: true` set in frontmatter once the above hold

**Approval:** pending
