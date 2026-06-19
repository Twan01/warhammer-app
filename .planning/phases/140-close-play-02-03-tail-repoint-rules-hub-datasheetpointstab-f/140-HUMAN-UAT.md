---
status: resolved
phase: 140-close-play-02-03-tail-repoint-rules-hub-datasheetpointstab-f
source: [140-VERIFICATION.md]
started: 2026-06-18T14:30:00Z
updated: 2026-06-19
---

## Current Test

[complete — all scenarios approved by user 2026-06-19]

## Tests

### 1. Rules Hub leader-targets section renders real canonical targets
expected: In the running Tauri app, navigate to the Rules Hub for a faction that has canonical leader pairs (e.g. Space Marines), expand a Character/leader datasheet row, and confirm the "Leader — Can attach to" section now lists real target-unit badges (sourced from `udb_leader_targets`). Previously this section rendered silently empty off the dead `synced_leader_targets` table. Confirm a non-leader unit shows no such section, and a faction with genuinely no leader pairs shows the section empty (not erroring).

result: [pass]

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
