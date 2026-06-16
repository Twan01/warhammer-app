---
phase: 131
slug: ci-test-gate
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-15
validated: 2026-06-16
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
| 131-01-* | 01 | 1 | REL-02 | — | Pinned toolchain — no floating compiler | file/structural | `test -f rust-toolchain.toml && grep -q 'channel' rust-toolchain.toml` | ✅ | ✅ green |
| 131-01-* | 01 | 1 | REL-01 | — | CI test job runs full suite on PR | structural (YAML) | `test -f .github/workflows/ci.yml` + parse `on:` includes `pull_request` & `workflow_call` | ✅ | ✅ green |
| 131-02-* | 02 | 2 | REL-02 | T-secrets | Release cannot publish on red; signing secret survives | structural (YAML) | grep release.yml for `needs: test` and `uses: ./.github/workflows/ci.yml` | ✅ | ✅ green |
| 131-02-* | 02 | 2 | REL-01 | — | Merge blocked on red (branch protection) | manual admin | GitHub UI: deliberate-red PR → merge button disabled | n/a | ✅ verified (PR #12) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] No new automated test files needed — this phase adds no application code.
- [x] Local YAML/TOML must parse: `ci.yml`, `release.yml` lint clean (GitHub Actions syntax — confirmed via `yaml.safe_load`); `rust-toolchain.toml` parses (`channel = "1.87.0"`, `profile = "minimal"`).
- [x] Deliberate-failure harness: PR #12 (`ci-gate-verify`) added a failing test; CI run `27593782748` went red (`Frontend tests` → failure, Rust tests + Build skipped fail-fast); branch reverted/closed, the failing test never reached `master`.

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

- [x] All tasks have an `<automated>` structural check (grep/parse/file-exists) OR a documented manual GitHub-behavior verification
- [x] Sampling continuity: full suite (`pnpm test && cargo test && pnpm build`) runs at each wave — identical to what CI runs
- [x] Wave 0 covers YAML/TOML parse + deliberate-red harness
- [x] No watch-mode flags (`vitest run`, not `vitest`)
- [x] Feedback latency < 120s locally
- [x] `nyquist_compliant: true` set in frontmatter once the above hold

**Approval:** ✅ validated 2026-06-16 — all 4 structural checks green, manual merge-block verified live (PR #12, branch protection `required_status_checks.contexts = ["test"]`).

---

## Validation Audit 2026-06-16

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Audit notes:** State-A audit of a CI-infrastructure phase. All four per-task structural assertions re-run live and PASS (rust-toolchain.toml pin, ci.yml dual-trigger/pinned-toolchain/scoped-cargo-test/no-secrets, release.yml `needs: test` gate + retained signing secret, BRANCH_PROTECTION.md content). Both workflow YAMLs parse clean. The one manual-only behavior (REL-01 merge block via branch protection) is confirmed enforced on the remote — `gh api .../branches/master/protection` returns `contexts: ["test"]`, and deliberate-red PR #12 proved the merge button blocked on red. No automated tests were generated: this phase adds CI/build config only, and the deliberate-red protocol + live branch-protection check fully cover its requirements. Frontmatter and per-task statuses were stale (carried over from the pre-execution draft) and have been corrected to reflect the completed, verified state.
