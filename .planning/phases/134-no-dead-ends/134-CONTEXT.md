# Phase 134: No Dead Ends - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

> ⚙️ Captured in `--auto` mode: gray areas auto-selected, recommended option chosen for each.
> All decisions below are the recommended defaults — review before planning if you disagree.

<domain>
## Phase Boundary

Second **Theme B (Honesty & De-cruft)** phase. It removes two **dead ends** in the datasheet/rules surfaces — places where the UI leads the user nowhere:

1. **HON-03 — the empty "Shared Abilities" tab.** `RulesHubPage` renders a "Shared Abilities" tab whose data comes from a stub hook (`useSharedAbilitiesByFaction`) that **always returns `[]`** (comment: "shared abilities are out of Phase 120 scope — stub retained"). The tab is permanently empty. Replace the stub with **real faction shared/army-rule ability data already present in the canonical database**, rendered via the existing `SharedAbilityCard`.
2. **HON-04 — the permanently-disabled "Link unit" button.** In `PlaybookStats`, the "Link unit" / "Re-link" button is `disabled={!wahapediaFactionId}`. When a unit's collection faction has **no `wahapedia_faction_id` mapping**, the button is permanently disabled — the user can never link that unit to the canonical Unit Database. Make the action **always lead somewhere**: establish the faction mapping (or browse all datasheets) so a unit can always be matched.

**In scope:**
- Replace `useSharedAbilitiesByFaction` stub with a real hook backed by an existing canonical query (faction-scoped `udb_detachment_abilities` via `getDetachmentAbilitiesByFaction`), keep the existing `SharedAbilityCard` rendering, add an honest empty state.
- Rework the `PlaybookStats` "Link unit" affordance so it is never a permanent dead end: when the collection faction is unmapped, first let the user map it to a canonical faction (persisting `wahapedia_faction_id`), then open the scoped `DatasheetPicker`; provide an unscoped browse-all fallback.
- Reuse existing components (`SharedAbilityCard`, `FactionLinkDialog` pattern, `DatasheetPicker`, `updateFaction`).

**Out of scope (own phases / preserve):**
- **No new DB migration or build-pipeline import** — the canonical data needed already exists; the next intentional migration is reserved for Phase 137 (`udb_leader_targets`), which deliberately re-triggers the parity gate.
- The bidirectional **Collection ⇆ Unit Database discovery loop** (owned-count badges, add-from-datasheet) — Phase 138 (PLAY-04). This phase only removes the dead end, it does not build the full discovery loop.
- **Faction page / Unit Database consolidation** and Data Health demotion — Phase 135 (HON-05/06/07).
- The honest data-provenance/freshness removal — Phase 133 (HON-01/02).

</domain>

<decisions>
## Implementation Decisions

### Shared Abilities tab — data source (HON-03)
- **D-01:** Replace the always-empty `useSharedAbilitiesByFaction` stub in `RulesHubPage.tsx` with a **real hook** backed by the **already-imported, faction-scoped `udb_detachment_abilities`** data via the existing `getDetachmentAbilitiesByFaction(factionId)` query (`src/db/queries/udbGameData.ts`). These are the faction's real army-rule-tier abilities (284 abilities across 26 factions, imported in Phase 120). Render with the **existing `SharedAbilityCard`** the tab already maps over — keep favorites/notes wiring consistent with the other tabs.
- **D-02:** **No new DB migration and no new pipeline import** in this phase. The acceptance bar for HON-03 is *real canonical data, no empty stub* — not a specific new "army rules" table. **Research question (planner/researcher):** confirm whether the already-bundled data exposes a *more correct* "faction shared ability / army rule" source than detachment abilities (e.g. a faction-level flag on `udb_unit_abilities` / `udb_unit_keywords.is_faction`); if a genuinely-shared faction ability source exists in the bundled data, prefer it. Otherwise `udb_detachment_abilities` (faction-scoped) is the source.
- **D-03:** **Honest empty state.** If a faction legitimately has zero shared/army-rule abilities in the canonical data, show an explicit "No shared abilities for this faction" message — never a silent blank panel. The tab must show real data wherever the canonical DB has it.

### "Link unit" dead-end fix (HON-04)
- **D-04:** The "Link unit" / "Re-link" button in `PlaybookStats` must **never be permanently disabled** because `wahapediaFactionId` is null. Remove the `disabled={!wahapediaFactionId}` dead end — the action always leads somewhere.
- **D-05:** **Root-cause fix — map the faction first.** When the unit's collection faction has no `wahapedia_faction_id` (`localFaction?.wahapedia_faction_id == null` in `PlaybookTab`), the Link-unit flow first lets the user **map that collection faction to a canonical faction**, persisting `wahapedia_faction_id` via the existing `updateFaction({ id, wahapedia_faction_id })` partial-update query (reuse the existing **`FactionLinkDialog`** select-a-faction pattern). This fixes the root cause so future links *and* detachment/shared abilities auto-resolve for every unit of that faction. After mapping, continue to the `DatasheetPicker` scoped to the now-resolved faction.
- **D-06:** **Always-available fallback.** If the user does not want to map the faction, the Link-unit action can still open the `DatasheetPicker` in an **unscoped / browse-all** mode so a unit can always be matched. `DatasheetPicker` already accepts `factionId: string | undefined`; **research question:** `useDatasheetsByFaction(undefined)` currently disables the query (empty list) — the planner must add an all-factions browse path (a new "all datasheets" query or `enabled`-when-undefined branch) so undefined yields a real browse experience, not "No datasheets found."

### Component reuse & guardrail (cross-cutting)
- **D-07:** **Reuse, don't rebuild.** `SharedAbilityCard` (already imported in `RulesHubPage`), `FactionLinkDialog` (already exists for the Collection→UDB direction), `DatasheetPicker`, and `updateFaction` are the building blocks. Keep the offline, single-database architecture — all queries hit `hobbyforge.db` via `getDb()` with `$1/$2` parameterization.

### Claude's Discretion
- Exact UX of the unmapped-faction Link flow (one combined dialog vs. faction-link step → picker step; whether to reuse `FactionLinkDialog` verbatim or a small variant), the precise empty-state copy, whether the Shared Abilities tab groups abilities by detachment or shows a flat list, and the exact shape of the all-factions browse query are the planner/executor's call — provided: the tab shows real canonical data with an honest empty state, the Link-unit action is never a permanent dead end, no new migration is added, and `pnpm build` is green.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 134: No Dead Ends" — goal + 2 success criteria (the authoritative acceptance bar); `**UI hint**: yes`.
- `.planning/REQUIREMENTS.md` — HON-03, HON-04 (full requirement text); Theme B context.
- `.planning/phases/133-honest-data-provenance/133-CONTEXT.md` — prior Theme B phase (same milestone, same no-new-migration discipline). Depends-on: Phase 133.

### HON-03 — Shared Abilities tab
- `src/features/rules-hub/RulesHubPage.tsx` — the `useSharedAbilitiesByFaction` **stub** (lines ~21–24, always `[]`) to replace; the `shared-abilities` `TabsTrigger`/`TabsContent` that maps `SharedAbilityCard`; favorites/notes wiring pattern used by the other tabs.
- `src/features/rules-hub/SharedAbilityCard.tsx` — existing card component to render real abilities.
- `src/db/queries/udbGameData.ts` — `getDetachmentAbilitiesByFaction(factionId)` (existing faction-scoped query returning real `udb_detachment_abilities`) — the data source (D-01).
- `src-tauri/migrations/042_udb_detachments.sql` — `udb_detachment_abilities` schema (`id`, `detachment_id` FK, `faction_id`, `name`, `description`).
- `src-tauri/migrations/038_udb_schema.sql` — `udb_unit_abilities` (`ability_type`) and `udb_unit_keywords` (`is_faction`) — the alternative "faction-shared" source to evaluate per D-02.

### HON-04 — Link unit dead end
- `src/features/units/PlaybookStats.tsx` — the `disabled={!wahapediaFactionId}` "Link unit"/"Re-link" button (lines ~80–89) — the dead end to remove (D-04).
- `src/features/units/PlaybookTab.tsx` — derives `wahapediaFactionId = localFaction?.wahapedia_faction_id ?? null` (line ~64); owns `pickerOpen`, `onPickerOpen`, `handlePickerSelect`, and renders `DatasheetPicker` with `factionId={wahapediaFactionId ?? undefined}` (lines ~303–305). The integration point for the new flow.
- `src/features/units/DatasheetPicker.tsx` — searchable, faction-pre-filtered picker (`factionId: string | undefined`, `useDatasheetsByFaction`); needs an all-factions browse path for the undefined case (D-06).
- `src/hooks/useDatasheet.ts` — `useDatasheetsByFaction(factionId)` (disabled/empty when `factionId` undefined today) and `useWahapediaFactions()` (the canonical faction list for mapping).
- `src/features/unit-database/FactionLinkDialog.tsx` — existing collection-faction → canonical-faction mapping dialog; the reuse pattern for the unmapped-faction step (D-05).
- `src/db/queries/factions.ts` — `updateFaction` with `wahapedia_faction_id = COALESCE($8, wahapedia_faction_id)` partial update (persists the mapping; D-05).
- `src/features/unit-database/factionAlignmentMap.ts` — existing collection↔canonical faction alignment helper to consult.

No external ADRs/specs — requirements fully captured in the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getDetachmentAbilitiesByFaction()` already returns real, faction-scoped army-rule abilities from `udb_detachment_abilities` — HON-03 is a stub→real-hook swap, not new data plumbing.
- `SharedAbilityCard` already exists and is already imported by `RulesHubPage`; the tab already maps over the (currently empty) array — only the data source changes.
- `FactionLinkDialog` already implements "pick which canonical faction this maps to" (for the Collection→UDB direction) and `updateFaction({ id, wahapedia_faction_id })` already persists the mapping — HON-04's root-cause fix reuses both.
- `DatasheetPicker` already accepts `factionId: string | undefined` and is faction-pre-filtered + searchable — the scoped happy-path already works once a faction is resolved.

### Established Patterns
- Stub-with-comment pattern (`// out of Phase N scope — stub retained`) marks deliberately-deferred work; HON-03 is the planned un-stubbing.
- Faction→canonical resolution is by **stored `wahapedia_faction_id`**, not name matching (per migration 046 / PlaybookTab comment) — the dead end exists precisely because some collection factions have a NULL mapping.
- All canonical reads go through `getDb()` (single `hobbyforge.db`) with `$1/$2` params; offline, no rules.db.

### Integration Points
- Rules Hub: `RulesHubPage` `shared-abilities` tab ← new real hook ← `getDetachmentAbilitiesByFaction`.
- Datasheet: `PlaybookTab` (`wahapediaFactionId`, picker state) → `PlaybookStats` (button) → faction-link step (`updateFaction`) → `DatasheetPicker` (scoped or browse-all).

</code_context>

<specifics>
## Specific Ideas

- The honest test for HON-03: open the Shared Abilities tab for several factions and confirm it shows **real ability names/descriptions** from the canonical DB (and an explicit empty state only where the data genuinely has none) — never a blank panel.
- The honest test for HON-04: open a unit whose collection faction is **not** mapped to a canonical faction and confirm the "Link unit" button is **clickable** and leads to a working flow (map faction, or browse all datasheets) that ends in a successful link — never a greyed-out button.
- Root-cause over band-aid: mapping the collection faction's `wahapedia_faction_id` (D-05) doesn't just unblock one unit — it lights up detachment abilities, shared abilities, and future auto-links for the whole faction.

</specifics>

<deferred>
## Deferred Ideas

- Full bidirectional Collection ⇆ Unit Database discovery loop (owned-count badges per datasheet, add-from-datasheet) — Phase 138 (PLAY-04).
- Faction page → Unit Database consolidation + Data Health demotion to Settings — Phase 135 (HON-05/06/07).
- Importing a dedicated faction army-rule data source via a new migration/pipeline — only if research shows the bundled data genuinely lacks shared-ability content; deliberately avoided here to not pre-fire the Phase-130 parity gate (intended new-migration test is Phase 137).

None blocking — discussion stayed within the HON-03/HON-04 boundary.

</deferred>

---

*Phase: 134-no-dead-ends*
*Context gathered: 2026-06-17*
