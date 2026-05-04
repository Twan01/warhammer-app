# Phase 17: Schema Foundation + Enrichment - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Migration 007 adds four new columns to the database: `lore_notes TEXT` and `undercoat TEXT` on `units`, `lore_notes TEXT` on `factions`, and `purchase_date TEXT` on `paints`. A new `src/lib/dates.ts` utility provides UTC-safe date functions and fixes an existing timezone bug in `JournalTab.tsx`. Lore notes and undercoat fields are immediately surfaced in the existing UnitSheet (edit) and UnitDetailSheet Details tab (read-only display), and faction lore notes in FactionSheet. No new pages, tabs, or routes.

</domain>

<decisions>
## Implementation Decisions

### Edit surface for unit lore + undercoat
- **UnitSheet only** — `lore_notes` textarea and `undercoat` text input are added to the UnitSheet form (Add/Edit mode), appended after the existing `notes` field (last field in the form)
- UnitDetailSheet Details tab shows both fields as **read-only display rows** — same pattern as `purchase_price_pence` and `storage_location`
- No inline edit surface in the Details tab — user opens UnitSheet to edit these values

### Read-only display in Details tab
- **Full text, no truncation** — `lore_notes` content is shown in full in the Details tab (the tab is already scrollable, so length is not a problem)
- `undercoat` is shown as a plain text row (single line)
- Null/empty lore notes: field row hidden entirely (mirrors existing `unit.notes` display pattern)
- Null/empty undercoat: displayed as `—` with muted color

### Undercoat field style
- **Pure free-text `<Input>`** — no combobox, no presets, no suggestions
- User types whatever primer they used (e.g. "Chaos Black", "Wraithbone", their own notes)
- Keeps the field simple; primer names vary enough across editions that presets would need maintenance

### Faction lore notes
- Added as a new form field in `FactionSheet`, positioned **after `description`** and before `color_theme`
- Textarea with TEXTAREA_CLASS (min-h-[80px]), same as unit lore notes
- Faction lore is edited and read in FactionSheet only — no read-only display surface added on FactionPage rows

### dates.ts utility + JournalTab UTC fix
- `src/lib/dates.ts` created in Phase 17 with two exports:
  - `parseLocalDate(dateStr: string): Date` — parses `YYYY-MM-DD` as local midnight (not UTC midnight)
  - `todayISO(): string` — returns today's date as `YYYY-MM-DD` in local timezone
- **Unit tests included in Phase 17** — test `todayISO()` and `parseLocalDate()` with fixed timezone scenarios (UTC vs UTC+2 boundary); tests live in `tests/lib/dates.test.ts`
- `JournalTab.tsx` bug fixed immediately in Phase 17: replace all 3 occurrences of `new Date().toISOString().split("T")[0]` with `todayISO()` from `src/lib/dates.ts`

### Schema migration pattern
- Migration file: `src-tauri/migrations/007_enrichment.sql`
- lib.rs version bumped to 7
- Uses `ALTER TABLE ... ADD COLUMN` — additive only, no destructive changes
- All new columns are `TEXT NULL` — no NOT NULL constraints, no defaults
- `purchase_date TEXT NULL` added to `paints` table (user-confirmed in milestone planning: needed for Spend Over Time chart in Phase 19)

### updateUnit / updatePaint query changes
- New columns use **raw assignment** (NOT COALESCE): `lore_notes = $N`, `undercoat = $N`, `purchase_date = $N`
- This is consistent with `purchase_price_pence = $18` in the existing updateUnit — allows user to explicitly clear values to NULL
- Position in the SQL parameter list: lore_notes and undercoat appended after existing columns (parameter numbers shift accordingly)

### Claude's Discretion
- Exact position of lore_notes / undercoat rows in the Details tab (after storage_location, before linked recipes — mirrors UI-SPEC recommendation)
- Whether faction lore notes uses the `description` field label or a new "Lore Notes" label
- Toast copy for unit save after lore/undercoat changes (reuses existing "Unit updated." toast — no new copy needed)
- Test setup for timezone simulation (use `vi.setSystemTime` or mock `Date` — researcher/planner's call)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §ENRCH-01..04 — Lore notes per faction, lore notes per unit, undercoat field, fields visible and editable in unit detail sheet

### UI Design Contract
- `.planning/phases/17-schema-foundation-and-enrichment/17-UI-SPEC.md` — Visual contracts for all Phase 17 UI: spacing, typography, color, copywriting, field placement, TEXTAREA_CLASS pattern

### Schema
- `src-tauri/migrations/001_core_schema.sql` — `units`, `paints`, `factions` table definitions (columns to ALTER)
- `src-tauri/migrations/006_spend_pence.sql` — Migration pattern to follow (lib.rs version bump + ALTER TABLE ADD COLUMN)

### Existing query patterns
- `src/db/queries/units.ts` — `updateUnit` function: raw assignment for nullable clearable columns; parameter list to extend
- `src/db/queries/paints.ts` — `updatePaint` function: same pattern; `purchase_date` column to add here

### Existing UI patterns
- `.planning/phases/14-spending-tracker/14-CONTEXT.md` — Precedent for adding nullable fields to UnitSheet + read-only display in Details tab (purchase_price_pence pattern)
- `src/features/units/UnitSheet.tsx` — Form field pattern, collapsible section, react-hook-form + zod integration
- `src/features/units/UnitDetailSheet.tsx` — Details tab read-only row pattern, existing null-display convention
- `src/features/factions/FactionSheet.tsx` — Form structure for faction fields (where to insert lore_notes)
- `src/lib/utils.ts` and `src/lib/formatCurrency.ts` — Existing lib/ file patterns; dates.ts follows the same module style
- `src/features/units/JournalTab.tsx` — 3 call sites of `new Date().toISOString().split("T")[0]` to replace with `todayISO()`

No external plugin specs required — all changes are additive SQL + TypeScript.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/units/UnitSheet.tsx` — Add `lore_notes` textarea + `undercoat` input after existing `notes` field; follows react-hook-form + zod pattern with `unitSchema.ts`
- `src/features/units/unitSchema.ts` — Add `lore_notes: z.string().nullable().optional()` and `undercoat: z.string().nullable().optional()`
- `src/features/units/UnitDetailSheet.tsx` — Details tab read-only rows; existing `null → '—'` display convention; add lore_notes + undercoat rows after `storage_location`
- `src/features/factions/FactionSheet.tsx` — Add `lore_notes` textarea field after `description` field
- `src/lib/formatCurrency.ts` — Module shape to follow for `src/lib/dates.ts`
- `src/features/units/JournalTab.tsx` — Contains the UTC bug at 3 locations; fix by importing `todayISO` from `src/lib/dates.ts`

### Established Patterns
- Raw assignment for clearable nullable columns in `updateUnit`/`updatePaint` (confirmed: `purchase_price_pence = $18` in units.ts line 64)
- `ALTER TABLE ... ADD COLUMN TEXT NULL` migration pattern (migration 006 is the reference)
- TEXTAREA_CLASS constant from `PlaybookTab.tsx` / `JournalTab.tsx` — reuse verbatim in lore notes textareas
- Null display in Details tab: value rows hidden when null for long-form text; `—` for short metadata fields

### Integration Points
- `src/db/queries/units.ts` — extend `updateUnit` with `lore_notes` + `undercoat` params (after existing 21 params)
- `src/db/queries/paints.ts` — extend `updatePaint` with `purchase_date` param
- `src/types/unit.ts` — add `lore_notes: string | null` and `undercoat: string | null`
- `src/types/paint.ts` — add `purchase_date: string | null`
- `src-tauri/src/lib.rs` — bump migration version from 6 → 7
- `tests/lib/dates.test.ts` — new test file for dates.ts utility

</code_context>

<specifics>
## Specific Ideas

No specific visual references — standard patterns consistent with existing Details tab fields.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-schema-foundation-and-enrichment*
*Context gathered: 2026-05-04*
