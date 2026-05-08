# Phase 15: Warhammer 40K Datasheet Integration - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Auto-populate the Playbook tab (stats M/T/Sv/W/Ld/OC, abilities, keywords) from community-maintained 40K datasheet data, bundled as a user-synced local SQLite rules database. Also surface rulebook source references alongside the imported content. No new pages or routes — all access is through the existing PlaybookTab in UnitDetailSheet.

</domain>

<decisions>
## Implementation Decisions

### Data source & legal stance
- Primary source: Wahapedia (+ any official GW public dataset if one ever becomes available)
- The PROJECT.md constraint against copyrighted GW data is consciously relaxed for Phase 15 — this is a strictly personal, local-only tool that is never distributed. No copyright enforcement risk applies
- Points values are still excluded — the legal constraint relaxation is specific to stats, abilities, and keywords (not points, which remain user-entered)
- Researcher should identify the best technical access method: Wahapedia API, a community-maintained GitHub dataset (e.g. BSData), or a downloadable SQLite dump — whichever is most reliable for 40K 10th edition

### Rules database storage & sync
- Data is stored in a separate local `rules.db` file alongside `hobbyforge.db` in Tauri's `appDataDir()`
- Sync is **user-triggered** — a sync button/action fetches the data from the source, populates `rules.db`, and the app works fully offline after that
- Users re-sync on demand when new codexes or balance dataslates drop
- Empty rules DB state: a subtle banner/prompt appears inside the PlaybookTab ("Sync datasheets to auto-fill stats") — not intrusive, not modal
- When rules DB is populated, a small "Re-sync" control + "Last synced: [date]" indicator appears near the top of the imported datasheet content in the Playbook tab

### Unit-to-datasheet matching
- Matching is explicit: clicking "Import stats" (or the auto-triggered picker on first open) shows a searchable dropdown pre-filtered to the unit's faction, listing all datasheets from `rules.db`
- User picks once — the link (`unit.id → datasheet_id`) is stored permanently in the app DB
- Future re-imports (re-sync or manual re-trigger) use the stored link automatically without re-prompting
- The picker auto-appears on first Playbook tab open when: (a) the unit has no stats yet AND (b) `rules.db` is populated. No button click needed
- The "Import stats" button is always visible in the Playbook tab for manual re-import at any time

### Import scope — fields populated
- **All fields**: M, T, Sv, W, Ld, OC stats + keywords + full abilities text
- Points are NOT imported — user-entered only, per PROJECT.md
- Abilities are imported into a new dedicated **"Datasheet Abilities"** collapsible section, separate from the existing abilities textarea (which is renamed to "Personal Ability Notes")
- Within the Datasheet Abilities section, abilities are sub-grouped by category: **Core Abilities / Faction Abilities / Unit Abilities** — matching Wahapedia's structure
- Below the Datasheet Abilities collapsible, a **"Sources"** structured list shows the publication names from the datasheet (e.g. "Codex: Space Marines 10th Ed.", "Balance Dataslate Feb 2025")

### Override behavior — conflict resolution
- When import runs on a unit that already has data in any field, a **single review dialog** appears showing all conflicting fields
- Every field (numeric stats AND text fields including abilities and keywords) shows a "Keep yours / Use datasheet" toggle — uniform treatment, no exceptions
- User reviews all conflicts in one dialog, confirms once
- Import loads the selected values into the Playbook form — the existing **Playbook Save button** is still required to commit changes to the DB. Consistent with how Phase 9 manual edits work

### Playbook tab layout after Phase 15
Updated order of sections in PlaybookTab:
1. Stats block (M/T/Sv/W/Ld/OC) — with import/re-import controls
2. **Datasheet Abilities** (new collapsible) — Core / Faction / Unit sub-groups
3. **Sources** (new structured list, below Datasheet Abilities)
4. Personal Ability Notes (renamed from "Abilities" textarea)
5. Keywords
6. 8 strategy note fields (unchanged)
7. Save button

### Claude's Discretion
- Exact visual design of the "Datasheet Abilities" collapsible (expand/collapse controls, sub-group headers)
- Whether the Sources list is inside or just below the Datasheet Abilities collapsible
- Sync button exact location (settings area, sidebar, or PlaybookTab header)
- Error handling when sync fails (network error, source unavailable)
- How to handle units with multiple stat profiles (e.g. a unit with a Sergeant profile) — researcher should investigate whether this is common in 10th edition 40K data and recommend an approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` §Phase 15 — phase goal and success criteria
- `.planning/PROJECT.md` §Legal — original constraint (relaxed for Phase 15, personal use only) and §Constraints (local-first, no network calls in normal operation — sync is the explicit exception)

### Existing Playbook infrastructure (Phase 9)
- `.planning/phases/09-unit-playbook/09-CONTEXT.md` — PlaybookTab decisions: stats block display/edit mode, strategy notes layout, save button placement, tabs integration, data loading pattern
- `src/features/units/PlaybookTab.tsx` — file being extended; stats block, abilities textarea, keywords, 8 strategy note fields all exist here
- `src/hooks/useStrategyNote.ts` — existing hook pattern for Playbook data; new datasheet hooks follow the same shape
- `src/db/queries/strategyNotes.ts` — query module pattern to follow for new `datasheets.ts` query module

### Database schema
- `src-tauri/migrations/001_core_schema.sql` — `units` table (unit names + faction_id used for matching)
- `src-tauri/migrations/004_unit_playbook_stats.sql` — pattern for additive migrations; Phase 15 needs a migration to add `datasheet_id` FK column to `units`

### Prior phase context
- `.planning/phases/13-hobby-journal/13-CONTEXT.md` — how a second SQLite DB (`rules.db`) relates to the existing `hobbyforge.db`; `tauri-plugin-fs` pattern for working with the app data directory

No external plugin specs — researcher should identify and document the best Wahapedia / community data access method.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/units/PlaybookTab.tsx` — file being extended; existing stats block, abilities textarea, keywords, and strategy note fields remain; new Datasheet Abilities section and Sources list are added
- `src/features/units/UnitDetailSheet.tsx` — no structural changes needed; PlaybookTab grows internally
- `src/components/ui/dialog.tsx` — Dialog component for the conflict-resolution review dialog (sibling to Sheet, not nested — per established sibling portal pattern)
- `src/components/ui/collapsible.tsx` — if installed; researcher should check; needed for Datasheet Abilities collapsible section

### Established Patterns
- All queries via `tauri-plugin-sql` directly — no ORM
- Query modules in `src/db/queries/`, hook modules in `src/hooks/` — new `datasheets.ts` query module + `useDatasheet.ts` hook follow this exactly
- Sibling Sheet/Dialog portal pattern — the conflict-resolution dialog must be mounted as a sibling to UnitDetailSheet in CollectionPage, not nested inside SheetContent
- `staleTime: Infinity` pattern (from `useStrategyNote`) — datasheet data is static until re-sync; same pattern applies to `useDatasheet`
- `key={unit?.id}` on SheetContent resets PlaybookTab state on unit switch — datasheet import state resets for free

### Integration Points
- `src/features/units/PlaybookTab.tsx` — primary file being modified
- `src/features/units/CollectionPage.tsx` — must mount the conflict-resolution Dialog as a sibling to UnitDetailSheet
- `src-tauri/Cargo.toml` — may need additions depending on how sync fetches data (if HTTP: `tauri-plugin-http`; if file-based: already have `tauri-plugin-fs` from Phase 13)
- `src-tauri/tauri.conf.json` — capability grants for any new Tauri plugins
- New SQL migration needed to add `datasheet_id INTEGER NULL REFERENCES datasheets(id)` to `units` table
- `rules.db` — a second SQLite database in `appDataDir()` storing the imported datasheet data; connection managed separately from `hobbyforge.db`

</code_context>

<specifics>
## Specific Ideas

- Maximum data import: stats + keywords + full abilities text — user explicitly wants all available rules data, not just stats
- Abilities organized into Core / Faction / Unit sub-groups within a collapsible section — matches Wahapedia's existing categorization, best readability
- Single review dialog for all conflicts — both numeric and text fields show "Keep yours / Use datasheet" toggle; uniform treatment
- Import loads form → Playbook Save commits — consistent with Phase 9 manual edit behavior
- "Sources" section (publication names) lives below Datasheet Abilities — all imported content grouped together

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-warhammer-40k-datasheet-and-rules-integration*
*Context gathered: 2026-05-04*
