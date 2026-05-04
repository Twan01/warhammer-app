---
status: testing
phase: 15-warhammer-40k-datasheet-and-rules-integration
source: 15-00-SUMMARY.md, 15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md, 15-04-SUMMARY.md, 15-05-SUMMARY.md
started: 2026-05-04T14:20:00Z
updated: 2026-05-04T14:20:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Close the app (Ctrl+C the dev server), delete %APPDATA%\com.hobbyforge.app\rules.db,
  then restart with `pnpm tauri dev`. The app boots without errors. Your hobbyforge.db data
  (units, factions, paint inventory) is intact. The Playbook tab for any unit shows the
  empty-db banner ("Sync datasheets to auto-fill stats. Sync now") with no stats imported.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Close the app (Ctrl+C the dev server), delete %APPDATA%\com.hobbyforge.app\rules.db, then restart with `pnpm tauri dev`. The app boots without errors. Your hobbyforge.db data (units, factions, paint inventory) is intact. The Playbook tab for any unit shows the empty-db banner ("Sync datasheets to auto-fill stats. Sync now") with no stats imported.
result: [pending]

### 2. Empty-DB Banner
expected: With rules.db deleted (from Test 1), open any unit's Playbook tab. Below the Stats header: a subtle inline banner reads "Sync datasheets to auto-fill stats." followed by an underlined "Sync now" link. No "Last synced:" label. No "Import stats" button visible.
result: [pending]

### 3. Sync Downloads Data
expected: Click "Sync now" in the banner. The link becomes "Syncing…" and is disabled while running. After 10–60s a green toast appears: "Datasheets synced". The banner disappears. No red error in the console.
result: [pending]

### 4. Last Synced Date
expected: After sync completes, the Stats section header shows a "Last synced: 04 May 2026" label (DD Mon YYYY format). The "Import stats" button is now visible alongside it.
result: [pending]

### 5. DatasheetPicker Auto-Opens
expected: Navigate to a unit that has a faction linked AND has all 6 stats blank (M/T/Sv/W/Ld/OC all show "—"). Open its Playbook tab. The DatasheetPicker dialog opens automatically — no button click needed. The dialog title is "Select Datasheet".
result: [pending]

### 6. Faction Filter and Search
expected: Inside the DatasheetPicker, the list is pre-filtered to your unit's faction (~20–200 items). Type a name fragment (e.g. "inter") into the search box — list filters to matching datasheets. Type "zzz" — empty state shows "No datasheets found. Try a different search term." Click Skip to dismiss.
result: [pending]

### 7. Stats Auto-Fill
expected: Click "Import stats" in the Stats header. Pick a known datasheet (e.g. "Intercessor Squad"). The dialog closes. The 6 stat cells populate with Wahapedia values (Intercessors: M 6, T 4, Sv 3, W 2, Ld 6, OC 2). Save Playbook button becomes enabled. Keywords field populates (e.g. "Infantry, Battleline"). Personal Ability Notes textarea stays empty.
result: [pending]

### 8. Weapons Section
expected: After importing a unit's datasheet, a "Weapons" collapsible section appears between Stats and Datasheet Abilities. It has a "Ranged" sub-section and/or "Melee" sub-section showing weapon stat rows: Name | Rng | A | BS/WS | S | AP | D. Values are plain text (no HTML tags).
result: [pending]

### 9. Datasheet Abilities Collapsible
expected: Below the Weapons section (or Separator if no weapons), a "Datasheet Abilities" collapsible is open by default. Inside: abilities are grouped under "Core Abilities", "Faction Abilities", and/or "Unit Abilities" sub-headings (empty groups hidden). Each ability shows its name in bold and description below in muted text — no HTML markup or &amp; entities visible.
result: [pending]

### 10. Sources List
expected: Below the Datasheet Abilities collapsible, a "Sources" section shows the publication name for the datasheet (e.g. "Codex: Space Marines" or similar). Plain text, no ID numbers.
result: [pending]

### 11. Personal Ability Notes Label
expected: The textarea in the "Personal Ability Notes" section is labeled "Personal Ability Notes" (NOT "Abilities"). The textarea is still editable — typing works as before.
result: [pending]

### 12. Re-Import and Re-Sync Buttons
expected: After saving with a datasheet link, the Stats header shows: "Re-import" button (outline variant) + a small RefreshCw icon button (ghost, aria-label "Re-sync datasheets"). Clicking the RefreshCw icon triggers a new sync (spinner shows while pending, success toast on done).
result: [pending]

### 13. Conflict Review Dialog
expected: Manually enter a different value for one stat (e.g. change M to 5 via edit mode, save). Click "Re-import". Pick the same datasheet again. A dialog titled "Review Import" opens listing the conflicting field (M: yours 5 vs. datasheet 6). Each row has "Keep" and "Use datasheet" buttons — "Use datasheet" is highlighted by default. Click "Keep" on that row — it flips to highlighted. Click "Apply import". The stat reflects your per-field choices. Click "Discard changes" on a second try — no fields change.
result: [pending]

## Summary

total: 13
passed: 0
issues: 0
pending: 13
skipped: 0

## Gaps

[none yet]
