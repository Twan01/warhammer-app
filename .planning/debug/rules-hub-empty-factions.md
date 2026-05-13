---
status: resolved
trigger: "Rules Hub shows empty results for some factions (Ultramarines, Tau Empire) after sync, while others work fine (Tyranids, Necrons)"
created: 2026-05-12
updated: 2026-05-12
---

## Symptoms

- **expected**: After syncing rules via Rules Hub, looking up army rules should return results for all factions
- **actual**: Empty results for Ultramarines, Tau Empire; works for Tyranids, Necrons
- **error_messages**: None — just empty results
- **timeline**: Unknown if it ever worked
- **reproduction**: Sync rules in Rules Hub, then browse army rules for Ultramarines or Tau Empire

## Current Focus

- hypothesis: resolveWahapediaFactionIdByName fails for subfactions and apostrophe-variant names
- test: trace the lookup chain from RulesHubPage through useWahapediaFactionId to the SQL query
- expecting: LIKE-based matching fails when neither name contains the other
- next_action: none — resolved
- result: confirmed — fix applied

## Evidence

- timestamp: 2026-05-12 — RulesHubPage.tsx line 51 calls useWahapediaFactionId(selectedFaction?.name) with the HobbyForge faction name
- timestamp: 2026-05-12 — useWahapediaFactionId delegates to resolveWahapediaFactionIdByName in datasheets.ts
- timestamp: 2026-05-12 — The SQL query uses LIKE substring matching: neither "Ultramarines" contains "Space Marines" nor vice versa; "Tau Empire" does not match "T'au Empire" due to apostrophe
- timestamp: 2026-05-12 — Tyranids/Necrons work because their HobbyForge names exactly match Wahapedia rw_factions.name

## Eliminated

## Resolution

- **root_cause**: `resolveWahapediaFactionIdByName` in `src/db/queries/datasheets.ts` uses only LIKE-based substring matching to resolve HobbyForge faction names to Wahapedia faction IDs. This fails for two categories: (1) subfaction names like "Ultramarines" that map to parent faction "Space Marines" in Wahapedia, and (2) spelling variants like "Tau Empire" vs "T'au Empire" (apostrophe difference).
- **fix**: Added a 3-step resolution strategy to `resolveWahapediaFactionIdByName`: (1) existing direct SQL match, (2) static FACTION_ALIAS_MAP for known subfaction-to-parent and variant mappings, (3) normalized match that strips apostrophes/dashes via SQL REPLACE. Build passes, no test regressions.
- **file_changed**: `src/db/queries/datasheets.ts`
