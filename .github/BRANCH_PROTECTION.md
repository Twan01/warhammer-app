# Branch Protection Setup — Required Status Check

This document describes the **manual repo-admin step** that converts the CI status check
into an enforced merge block for the `master` branch. Without this step, CI runs and reports
green or red — but the merge button stays enabled regardless. The "blocks merge on any
failure" requirement (REL-01) is NOT satisfied until this setting is turned on.

---

## Where to Configure

GitHub → Repository → **Settings** → **Branches** → Add/Edit branch protection rule

---

## Branch

`master`

---

## Settings to Enable

### 1. Require status checks to pass before merging — ON

This is the critical setting. It prevents merging a PR unless the selected CI check has
passed in the latest commit on the branch.

**CRITICAL: Read the check name from the GitHub UI after the first PR run — do NOT type it manually.**

The name that GitHub reports to branch protection can differ from what you expect. After
`ci.yml` runs once via `on: pull_request` (triggered by opening or pushing to a PR), the
actual check name appears in the branch-protection autocomplete. Follow these steps exactly:

1. Open **any pull request** (even a trivial one — one-line change, new branch off `master`).
2. Let `ci.yml` complete at least one run (the "CI" workflow, not the release workflow).
3. Go to **Settings → Branches → Edit** the protection rule for `master`.
4. Under "Require status checks to pass before merging", click the **search box**.
5. The autocomplete will suggest the status check name that GitHub actually reported from
   the first run. It is likely `test` (the inner job name in `ci.yml` when triggered via
   `pull_request`) — but confirm from the autocomplete, do not guess.
6. Select the name from the autocomplete. Do NOT type it freehand — a typo or wrong format
   means the rule silently matches nothing and the merge button stays enabled.

> Note: when `ci.yml` runs as `workflow_call` from `release.yml` (a tag push), it does NOT
> create a separate PR status check — that path is a different execution context. The PR
> check comes exclusively from the `on: pull_request` trigger in `ci.yml`.

### 2. Require branches to be up to date before merging — optional but recommended

When enabled, a PR must be rebased or merged from `master` before it can be merged. This
prevents a situation where a passing-but-stale branch introduces a failure that only appears
after merge. Recommended for solo and small-team workflows.

### 3. Other settings

Leave other settings at their defaults unless you have a specific reason to change them.

---

## Consequence of Skipping

If branch protection is not configured:

- CI runs on every PR and reports a red or green status check.
- However, the merge button is NOT blocked — anyone (including yourself) can merge a PR
  even when the CI check is red.
- The release workflow (`release.yml`) still has `needs: test` which structurally prevents
  publishing on red for tag pushes. But code with a broken test suite can reach `master`
  via a PR merge.
- REL-01 ("blocks merge on any failure") is NOT met without this setting.

---

## Verification Recipe (Deliberate-Red Test)

Run this verification after enabling the branch-protection rule to confirm the merge block
actually works end-to-end:

1. Create a new branch off `master`: `git checkout -b ci-gate-verify`.
2. Open `tests/` and add a deliberately failing assertion to any existing test file:
   ```ts
   expect(1).toBe(2); // deliberate failure — remove before merging
   ```
3. Commit and push: `git push -u origin ci-gate-verify`.
4. Open a pull request targeting `master`.
5. Wait for the CI workflow to complete. The `test` job should fail (the deliberate assertion
   causes `pnpm test` to exit non-zero).
6. Confirm: the "Merge pull request" button is **disabled** (greyed out, with a message
   stating the required status check has not passed).
7. Revert the deliberate failure: remove the `expect(1).toBe(2)` line, commit, and push.
8. Wait for CI to go **green**. Confirm: the merge button re-enables.
9. Close or merge the PR, then delete the `ci-gate-verify` branch.

If the merge button stays enabled despite a red CI check in step 6, the most likely cause is
that the status check name selected in branch protection does not match the one actually
reported by GitHub. Revisit the autocomplete search in Settings → Branches and confirm the
exact name shown after the CI run.

---

## Check Name Format Reference

When `ci.yml` runs via `on: pull_request`, GitHub typically reports the status check as
the inner job name: `test`.

When `ci.yml` is invoked as a `workflow_call` from `release.yml` (a tag push), the check
is not a PR status check and is irrelevant to branch protection.

Always use the GitHub autocomplete after the first PR run to confirm the exact name.
Historically, some GitHub configurations report it as `CI / test` (workflow name / job name).
The autocomplete is the authoritative source.

---

## Summary

| Step | Location | Setting |
|------|----------|---------|
| 1 | Open a PR so CI runs once | Any branch with any change |
| 2 | Settings → Branches → master rule | Require status checks → ON |
| 3 | Select check from autocomplete | Read from UI after first PR run |
| 4 | (Recommended) | Require branches to be up to date → ON |
| 5 | Run deliberate-red verification | Add `expect(1).toBe(2)`, confirm merge blocked |
