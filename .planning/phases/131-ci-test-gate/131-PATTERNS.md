# Phase 131: CI Test Gate - Pattern Map

**Mapped:** 2026-06-15
**Files analyzed:** 3 (2 new, 1 modified)
**Analogs found:** 2 / 3 (1 file has no codebase analog — see "No Analog Found" section)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.github/workflows/ci.yml` | CI workflow (reusable) | event-driven (push/call) | `.github/workflows/release.yml` | role-match (same runner stack, different trigger) |
| `.github/workflows/release.yml` | CI workflow (release gate) | event-driven (tag push) | `.github/workflows/release.yml` (self) | self — restructure only |
| `rust-toolchain.toml` | config / toolchain pin | n/a | none in codebase | no analog — use RESEARCH.md canonical format |

---

## Pattern Assignments

### `.github/workflows/ci.yml` (CI workflow, event-driven — new file)

**Analog:** `.github/workflows/release.yml`
**Relationship:** The test job in `ci.yml` copies the runner setup sequence from `release.yml` verbatim (lines 21–41), then adds three sequential check steps instead of the `tauri-action` publish step.

**Trigger / on-block pattern** — no existing analog; from RESEARCH.md Pattern 1:
```yaml
on:
  pull_request:
  workflow_call:
```
- `pull_request:` with no `branches:` filter covers all PRs into any branch (D-02).
- `workflow_call:` with no `inputs:` or `secrets:` — the test job needs neither (D-01).

**Runner setup sequence** (from `release.yml` lines 21–41 — copy verbatim, swap toolchain step):
```yaml
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable   # <-- REPLACE THIS (see toolchain pattern below)

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri -> target

      - name: Install frontend dependencies
        run: pnpm install
```

**Toolchain step replacement** (swap the `@stable` step above for this — D-05):
```yaml
      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@master
        with:
          toolchain: 1.87.0
```
Rationale: `dtolnay/rust-toolchain@stable` does NOT read `rust-toolchain.toml` — `toolchain:` must be explicit. `@master` + `toolchain: 1.87.0` is the correct pinning wiring per RESEARCH.md Pitfall 2.

**Check steps** (added after `pnpm install`, replacing the tauri-action step):
```yaml
      - name: Frontend tests
        run: pnpm test

      - name: Rust tests
        run: cargo test
        working-directory: src-tauri

      - name: Build (includes prebuild parity gate)
        run: pnpm build
```
- `pnpm test` invokes `vitest run` (package.json line 11).
- `cargo test` must run with `working-directory: src-tauri` — no `Cargo.toml` exists at repo root (RESEARCH.md Pitfall 3).
- `pnpm build` invokes `tsc && vite build` (package.json line 9) AND triggers the `prebuild` hook `node scripts/check-version.mjs` (package.json line 8) — the Phase-130 parity gate runs automatically inside CI with no extra step.

**Full assembled `ci.yml`** (for planner reference — executor writes the actual file):
```yaml
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

---

### `.github/workflows/release.yml` (CI workflow, tag-push gate — modified file)

**Analog:** `.github/workflows/release.yml` (self — restructure only)

**Current file** (`release.yml` lines 1–54 — full file, read in context):
```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  release:
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
      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
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

**Required changes (three surgical edits):**

**Change 1 — Add caller `test` job before the existing `release` job** (D-01):
```yaml
jobs:
  test:
    uses: ./.github/workflows/ci.yml
    # No secrets: inherit — test job uses no signing secrets (RESEARCH.md anti-patterns)

  release:
    needs: test        # <-- Change 2: add this line to existing release job
    permissions:
      contents: write
    # ... rest of release job unchanged except toolchain step ...
```
- `needs: test` references the caller-level `test` job in THIS file, not the inner job in `ci.yml` (RESEARCH.md anti-patterns — critical distinction).
- No `secrets: inherit` on the `test` caller job — the test job in `ci.yml` uses no secrets.

**Change 3 — Swap the floating toolchain step in the release job** (D-05):
```yaml
      # BEFORE (line 33 in current file):
      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable

      # AFTER:
      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@master
        with:
          toolchain: 1.87.0
```

**Full restructured `release.yml`** (for planner reference):
```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  test:
    uses: ./.github/workflows/ci.yml

  release:
    needs: test
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

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `rust-toolchain.toml` | config / toolchain pin | n/a | No toolchain file exists in this repo; no Rust config precedent to copy from |

**Pattern source for `rust-toolchain.toml`:** RESEARCH.md Pattern 3 (verified against `rust-lang.github.io/rustup/overrides.html#the-toolchain-file`).

**Canonical format to use:**
```toml
# rust-toolchain.toml  (repo root — place alongside package.json and Cargo.toml's parent)
[toolchain]
channel = "1.87.0"
profile = "minimal"
```

Key details:
- `profile = "minimal"` installs only `rustc` + `cargo` (no clippy, rustfmt, docs). Sufficient for `cargo test` and `pnpm build` (which triggers the Tauri Vite/TS build, not `cargo build` directly).
- rustup discovers this file by walking up from the working directory — it is found whether you are in the repo root or in `src-tauri/`.
- This file is the **single source of truth** for the pinned version; the `toolchain: 1.87.0` value in both workflow files must stay in sync with it manually (there is no auto-read from `dtolnay/rust-toolchain`).
- The dev machine runs Rust 1.95.0 and the project compiles cleanly. 1.87.0 is the conservative minimum above the Cargo.lock v4 requirement (1.78.0). Planner may choose 1.95.0 for maximum local/CI parity — both are valid per D-05.

---

## Shared Patterns

### Toolchain Step (applies to both workflow files)

**Replace in:** `ci.yml` (new) and `release.yml` (existing — line 33).
**From:** `uses: dtolnay/rust-toolchain@stable` (no `with:` block)
**To:**
```yaml
      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@master
        with:
          toolchain: 1.87.0
```
The version string `1.87.0` must match `rust-toolchain.toml`'s `channel` value. If planner chooses `1.95.0` instead, update both places consistently.

### Runner Environment (applies to both workflow files)

Both jobs must run on `windows-latest`. This is the only supported platform for this Windows-only desktop app — no matrix variation exists for the test job.

### Exit-code propagation on Windows

`pnpm test`, `cargo test`, and `pnpm build` are standard commands that propagate non-zero exit codes correctly under `pwsh` (the default shell on `windows-latest`). No `shell: bash` override is needed. A non-zero exit fails the step and the job immediately.

---

## Critical Anti-Patterns to Avoid

These are lifted from RESEARCH.md and are load-bearing for correctness:

1. **`dtolnay/rust-toolchain@stable` left in place** — the `@stable` rev does `rustup toolchain install stable` ignoring `rust-toolchain.toml`. Must be replaced in BOTH workflow files.

2. **`secrets: inherit` on the caller `test` job** — the test job in `ci.yml` uses no secrets. Adding `secrets: inherit` passes signing keys unnecessarily.

3. **`needs: test` referencing the wrong job** — `needs: test` in `release.yml` refers to the `test:` job declared in `release.yml` itself (the caller job), NOT the `test` job inside `ci.yml`. If the caller job were named `ci-gate`, the `needs:` value would be `ci-gate`.

4. **`cargo test` from repo root** — must use `working-directory: src-tauri`. There is no `Cargo.toml` at the repo root.

5. **Typing the branch protection status check name manually** — use GitHub UI autocomplete after the first PR CI run. The exact reported check name (likely `test` for a directly-triggered `pull_request` run) must be confirmed from the live UI. See RESEARCH.md Assumption A3 and Open Question 1.

---

## Metadata

**Analog search scope:** `.github/workflows/` (sole directory containing workflow YAML)
**Files scanned:** 1 existing workflow file (`release.yml`), `package.json`, `src-tauri/Cargo.toml`
**Analog match rate:** 2/3 files have a codebase analog; 1 file (`rust-toolchain.toml`) has no precedent and uses RESEARCH.md canonical format
**Pattern extraction date:** 2026-06-15
