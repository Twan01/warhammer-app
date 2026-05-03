# Phase 13: Hobby Journal - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a "Journal" tab to the existing UnitDetailSheet with two features: (1) a painting session log (CRUD — date, duration in minutes, optional notes) listed newest-first, and (2) a photo timeline (file attach via native picker, stage label, optional caption) stored on disk and displayed as a chronological thumbnail grid. No new pages or routes. All access is through the existing unit detail sheet.

</domain>

<decisions>
## Implementation Decisions

### Tab structure
- One "Journal" tab added as a third tab alongside Details + Playbook in UnitDetailSheet
- Sessions list at the top of the tab, photo timeline below — single combined tab

### Session log form UX
- Inline form always visible at the top of the sessions list (Date / Duration / Notes fields + "Log Session" button)
- Date field defaults to today on mount and after each submit
- Form resets after submit and stays open — ready for another entry immediately
- Sessions list below the form, sorted newest first (JOUR-02)

### Photo storage & file organization
- Photos saved to Tauri's `appDataDir()` — same parent directory as `hobbyforge.db`; no user setup required
- Filenames use UUID-based naming (e.g. `a3f8c1d2-unit-42.jpg`) — collision-proof, no dependency on unit name or timestamp clock skew
- JOUR-06 (unit delete removes photos): cleanup is silent — the existing UnitDeleteDialog confirmation is sufficient, no second prompt about photos

### Stage labels
- Fixed presets + free-text fallback: "Primed", "Base coat", "Washed", "Layer", "Highlighted", "Finished", "Other" — selecting "Other" reveals a text input for a custom label
- `image_assets` table lacks a `stage_label` column — a new migration adds `stage_label TEXT` to `image_assets`; caption column stays for its own purpose
- Photo file selection uses native file picker dialog (tauri-plugin-fs open dialog) — no drag-and-drop

### Photo timeline display
- 3-column thumbnail grid with stage label text below each thumbnail
- Clicking a thumbnail opens the photo full-size in a sibling Dialog (mounted as a sibling to the Sheet — never nested inside the Sheet portal, per established pattern)
- Full-size viewer shows stage label + caption
- Hover over a thumbnail reveals an × button for deletion

### Claude's Discretion
- Exact thumbnail dimensions
- Caption display in the grid (hover tooltip vs. truncated text below the stage label)
- Whether photo deletion shows a brief confirmation or is immediate with undo toast
- Exact `tauri-plugin-fs` capability grant configuration in `tauri.conf.json`
- Which Rust crate version of `tauri-plugin-fs` to pin

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §JOUR-01..06 — Full session log and photo timeline requirements with acceptance criteria

### Schema
- `src-tauri/migrations/001_core_schema.sql` — `image_assets` table definition (polymorphic: entity_type + entity_id, has caption/file_path/taken_at but lacks stage_label — new migration must add it)

### Prior phase context
- `.planning/phases/09-unit-playbook/09-CONTEXT.md` — PlaybookTab pattern (unitId prop, own data fetching) to follow for JournalTab
- `.planning/STATE.md` §Accumulated Context — "Phase 13 photo storage requires tauri-plugin-fs — the one new Tauri plugin introduced in v2.1; verify capability grants before building photo attach UI"

No external plugin specs — tauri-plugin-fs API to be researched by gsd-phase-researcher.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/units/UnitDetailSheet.tsx` — TabsList/TabsContent structure to extend; currently has "details" and "playbook" tabs; Journal tab follows the same pattern
- `src/features/units/PlaybookTab.tsx` — tab component pattern: accepts `unitId: number`, handles own data fetching via hook; JournalTab follows this exactly
- `src/db/queries/strategyNotes.ts` — query module pattern to follow for `paintingSessions.ts` and `unitPhotos.ts`
- `src/components/ui/dialog.tsx` — Dialog component for full-size photo viewer (sibling to Sheet, not nested)

### Established Patterns
- All queries via `tauri-plugin-sql` directly — no ORM
- 0|1 integer booleans in SQLite
- Query modules in `src/db/queries/`, hook modules in `src/hooks/`
- Sibling Sheet/Dialog portal pattern — the photo lightbox Dialog must be mounted at the same level as UnitDetailSheet in CollectionPage, not inside SheetContent
- localStorage persistence pattern (useSidebarCollapsed) if any UI state needs persisting — unlikely here

### Integration Points
- `src/features/units/UnitDetailSheet.tsx` — add third TabsTrigger ("journal") + TabsContent rendering `<JournalTab unitId={unit.id} />`
- `src/features/units/UnitDeleteDialog.tsx` — must trigger photo file cleanup (delete files from disk via tauri-plugin-fs) before or after the SQL DELETE on the unit; file cleanup is silent
- `src-tauri/Cargo.toml` — `tauri-plugin-fs` must be added to [dependencies]; it is NOT currently present
- `src-tauri/tauri.conf.json` — `fs` plugin capability grants must be added under `plugins`
- New SQL migration (005_hobby_journal.sql) needed for: `painting_sessions` table + `stage_label TEXT` column on `image_assets`

</code_context>

<specifics>
## Specific Ideas

No specific visual references given — standard patterns are appropriate.

</specifics>

<deferred>
## Deferred Ideas

- JOUR-07: Export unit journal as PDF/image — already in REQUIREMENTS.md v2.2+ backlog
- JOUR-08: Photo before/after comparison slider — already in REQUIREMENTS.md v2.2+ backlog
- Drag-and-drop photo attach — rejected in favor of native file picker (simpler, reliable on Windows)

</deferred>

---

*Phase: 13-hobby-journal*
*Context gathered: 2026-05-03*
