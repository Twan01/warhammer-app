---
status: resolved
trigger: "in army list, when i select an army and put unit there, then i have to select a detachment but i get this \"Could not match faction to rules data. Try syncing rules.\" why ?"
created: 2026-06-14
updated: 2026-06-14
---

# Debug Session: detachment-faction-no-match

## Symptoms

- **Expected behavior:** When building an army list, after selecting an army/faction and adding a unit, selecting a detachment should present the valid detachments for that faction (no error).
- **Actual behavior:** A detachment selector shows the error "Could not match faction to rules data. Try syncing rules." instead of detachment options.
- **Error messages:** `Could not match faction to rules data. Try syncing rules.`
- **Timeline:** Unknown (newly reported 2026-06-14).
- **Reproduction:** Army Lists → select an army → add a unit → open detachment selection → error appears.

## Current Focus

- hypothesis: ArmyListDetailPage resolves the udb faction id by name-matching the local faction name against udb_factions (via useWahapediaFactionId), which fails for sub-factions (e.g. "Ultramarines" has no udb_factions row — it's a chapter of "Space Marines"/SM) and for punctuation variants ("Tau Empire" vs udb "T'au Empire"). The fix is to use the already-stored faction.wahapedia_faction_id column directly, as other features (UnitPickerDialog, CollectionPage) already do.
- test: Compared factions.name + factions.wahapedia_faction_id (hobbyforge) against udb_factions.name. Ran scripts/check-faction-match.mjs.
- expecting: Name-match fails for Ultramarines and Tau Empire; but the stored wahapedia_faction_id column already holds correct udb ids (SM, NEC, TYR, DG) for all but the never-linked Tau Empire row.
- next_action: Fix applied + type-checked + DB-simulated. Awaiting human verification: open the Ultramarines army list in the running app and confirm the detachment selector now lists Space Marines detachments instead of the error.
- reasoning_checkpoint:
    hypothesis: "DetachmentPicker shows 'Could not match faction' because ArmyListDetailPage derives the udb faction id from the local faction NAME (useWahapediaFactionId), and exact name matching fails for sub-factions (Ultramarines->Space Marines) and apostrophe variants (Tau Empire->T'au Empire), producing factionWahapediaId=undefined."
    confirming_evidence:
      - "DetachmentPicker.tsx:58-59 shows the error only when factionWahapediaId === undefined (rules synced)."
      - "useDatasheet.ts:121-138 resolves the id by case-insensitive exact name match against udb_factions, returning null on no match; ArmyListDetailPage.tsx:641 converts null to undefined."
      - "DB query: hobbyforge faction 'Ultramarines' (id=2) has NO udb_factions row by name (udb only has 'Space Marines'/SM); 'Tau Empire' (id=1) does not match udb 'T'au Empire'. The reported list (id=4, Ultramarines) is exactly a no-match case."
      - "factions.wahapedia_faction_id column already holds correct udb ids: Ultramarines='SM', Necrons='NEC', Tyranids='TYR', Death Guard='DG'. getDetachmentsByFaction queries udb_detachments.faction_id by these exact ids."
      - "Sibling features UnitPickerDialog.tsx:71 and CollectionPage.tsx:54 already use faction.wahapedia_faction_id directly to get the udb id — the army-list detachment path is the inconsistent outlier."
    falsification_test: "If, after passing faction.wahapedia_faction_id, the DetachmentPicker still errors for the Ultramarines list, the hypothesis is wrong. (Tau Empire would still fail because its column is null — that is a separate data-linkage gap, not the matching-logic bug.)"
    fix_rationale: "Using the stored wahapedia_faction_id removes the lossy name-based re-derivation entirely, matching the canonical pattern used elsewhere. udb_detachments.faction_id is keyed by exactly these ids, so detachments resolve correctly for any properly-linked faction including sub-factions."
    blind_spots: "Tau Empire (id=1) has wahapedia_faction_id=null, so it will still show the error after the fix — but that is a faction-linkage data issue (faction never linked to TAU), not the picker logic. PlaybookTab.tsx and DatasheetBrowserDialog.tsx also use useWahapediaFactionId(name) and have the same latent bug, but are out of scope for this reported symptom."

## Evidence

- checked: src/features/army-lists/DetachmentPicker.tsx
  found: Error string "Could not match faction to rules data. Try syncing rules." is shown only when rulesSynced is true AND factionWahapediaId === undefined (line 56-60). So the prop factionWahapediaId is undefined at render.
  implication: The bug is upstream — whatever computes factionWahapediaId returns undefined.
- checked: src/features/army-lists/ArmyListDetailPage.tsx:168, :641
  found: factionWahapediaId is `wahapediaFactionId ?? undefined`, where wahapediaFactionId = useWahapediaFactionId(faction?.name) — derived from the local faction NAME, not the stored id.
  implication: Resolution is name-based, fragile.
- checked: src/hooks/useDatasheet.ts:121-138 (useWahapediaFactionId)
  found: queryFn fetches getUdbFactions() (English names) and does case-insensitive EXACT name match; returns match?.id ?? null. No fuzzy/sub-faction handling.
  implication: Any local faction name that is not byte-identical (case-insensitive) to a udb_factions.name returns null.
- checked: hobbyforge.db factions vs udb_factions (scripts/check-faction-match.mjs)
  found: "Death Guard" MATCH, "Necrons" MATCH, "Tyranids" MATCH, but "Tau Empire" NO MATCH (udb has "T'au Empire" with typographic apostrophe) and "Ultramarines" NO MATCH (udb has no Ultramarines — only parent "Space Marines"/SM). Reported army list id=4 is "Ultramarines".
  implication: Confirms name-match is the failure mechanism for the reported case.
- checked: hobbyforge.db factions full rows (scripts/check-faction-schema.mjs)
  found: factions table HAS a wahapedia_faction_id column already populated correctly: Ultramarines->'SM', Necrons->'NEC', Tyranids->'TYR', Death Guard->'DG'. Only Tau Empire is null.
  implication: The correct udb id is already stored on the faction; the name-based re-derivation is unnecessary and lossy.
- checked: src/features/army-lists/UnitPickerDialog.tsx:71, src/features/units/CollectionPage.tsx:54
  found: Both already resolve udb id via faction.wahapedia_faction_id directly — the canonical pattern.
  implication: Fix = make ArmyListDetailPage use the same stored column.
- checked: src/db/queries/udbGameData.ts:78-89 (getDetachmentsByFaction)
  found: Queries udb_detachments WHERE faction_id = $1, where faction_id is the udb id string (SM, TAU, NEC...). Verified udb_detachments has 56 SM rows and 8 TAU rows.
  implication: Passing faction.wahapedia_faction_id ('SM') will correctly return Space Marines detachments for the Ultramarines list.

## Eliminated

- hypothesis: rules.db / udb data is missing or unsynced ("Try syncing rules").
  evidence: udb_factions has 25 rows and udb_detachments has detachments for SM (56) and TAU (8). Data is present; the message is misleading. The match logic, not the data, is at fault.
  timestamp: 2026-06-14

## Resolution

- root_cause: ArmyListDetailPage resolves the Wahapedia/udb faction id by case-insensitive EXACT name matching the local faction name against udb_factions (useWahapediaFactionId). This fails for sub-factions whose name has no udb_factions row (e.g. "Ultramarines" is a chapter of "Space Marines"/SM) and for punctuation/spelling variants ("Tau Empire" vs udb "T'au Empire"). On no match it returns null -> the picker receives factionWahapediaId=undefined -> shows "Could not match faction to rules data." Meanwhile the correct udb id is already stored in factions.wahapedia_faction_id ('SM' for Ultramarines), which the page ignores.
- fix: In src/features/army-lists/ArmyListDetailPage.tsx, replaced the name-based udb id resolution `const { data: wahapediaFactionId } = useWahapediaFactionId(faction?.name)` with the stored column: `const wahapediaFactionId = faction?.wahapedia_faction_id ?? null`. Removed the now-unused useWahapediaFactionId import. This matches the canonical pattern already used by UnitPickerDialog and CollectionPage.
- verification: (1) `npx tsc --noEmit` passes with no errors. (2) DB simulation of the new path: Ultramarines->"SM"->44 detachments, Necrons->"NEC"->13, Tyranids->"TYR"->12, Death Guard->"DG"->10. (3) HUMAN VERIFIED in running app: Ultramarines army list detachment selector now lists Space Marines detachments instead of the error.
- files_changed: [src/features/army-lists/ArmyListDetailPage.tsx, src-tauri/migrations/046_backfill_faction_udb_normalized.sql, src-tauri/src/lib.rs]

## Follow-up: Tau Empire data-linkage gap (RESOLVED)

- gap: "Tau Empire" (faction id=1) had wahapedia_faction_id=null because migration 039's backfill used an EXACT case-insensitive name match, and udb stores "T’au Empire" (curly apostrophe U+2019 + space) — no match.
- fix: Added migration 046 (`046_backfill_faction_udb_normalized.sql`, registered in src-tauri/src/lib.rs) that re-backfills still-NULL factions using a NORMALIZED match (strips spaces + straight/curly apostrophes), then backfills units.udb_unit_id for the newly-linked factions. Generic — fixes any punctuation variant, not just Tau.
- verification: Migration applied to a throwaway copy of the live hobbyforge.db: Tau Empire -> "TAU", 8 TAU detachments now resolvable; existing links (SM/NEC/TYR/DG) untouched; SQL parses and runs cleanly. Migration runs automatically on next app start.
- note: Two out-of-scope latent instances of the same name-based bug remain — PlaybookTab.tsx and DatasheetBrowserDialog.tsx still call useWahapediaFactionId(name). Worth a follow-up cleanup; not part of this symptom.
