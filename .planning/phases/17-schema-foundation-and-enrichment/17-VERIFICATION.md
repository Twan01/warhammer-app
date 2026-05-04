---
phase: 17-schema-foundation-and-enrichment
verified: 2026-05-04T14:30:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 17: Schema Foundation and Enrichment — Verification Report

**Phase Goal:** Migration 008 + dates.ts utility + lore/undercoat UI (note: migration 008 was used, not 007 — CONTEXT.md had wrong number, corrected during execution)
**Verified:** 2026-05-04T14:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | UnitSheet shows Undercoat (Input) + Lore Notes (textarea) below Notes in the collapsible section; values persist across save | VERIFIED | `UnitSheet.tsx` lines 619-661: FormField blocks for `name="undercoat"` (Input) and `name="lore_notes"` (textarea rows=4); `buildDefaultValues` populates both fields from `unit.lore_notes ?? null` / `unit.undercoat ?? null`; `onSubmit` coerces via `|| null` |
| 2 | UnitDetailSheet Details tab always shows Undercoat row (with `—` fallback) and conditional Lore Notes row (whitespace-pre-wrap) | VERIFIED | `UnitDetailSheet.tsx` lines 180-194: `<Field label="Undercoat">` always rendered with muted `—` fallback; `{unit.lore_notes && (...)}` conditional `<Field label="Lore Notes">` with `whitespace-pre-wrap` |
| 3 | FactionSheet shows Lore Notes textarea between Description and Color Theme; persists on save; no stale-value bleed switching factions | VERIFIED | `FactionSheet.tsx`: field order is name → game_system → description → lore_notes → color_theme → icon_path; `useEffect` reset includes `lore_notes: faction.lore_notes ?? ""` in edit branch and `DEFAULT_VALUES` (which has `lore_notes: ""`) in create branch; both `onSubmit` paths carry `lore_notes: values.lore_notes \|\| null` |
| 4 | Migration 008 registered in lib.rs as version 8 with description "enrichment" after version 7 datasheet_link, without renumbering | VERIFIED | `src-tauri/src/lib.rs` lines 49-54: `version: 8, description: "enrichment", sql: include_str!("../migrations/008_enrichment.sql")` appended after `version: 7` |
| 5 | Migration 008 contains exactly 4 ALTER TABLE ADD COLUMN statements, no DROP/CREATE TABLE/UPDATE | VERIFIED | `008_enrichment.sql`: 4 `ALTER TABLE ... ADD COLUMN` statements for `units.lore_notes TEXT`, `units.undercoat TEXT`, `factions.lore_notes TEXT`, `paints.purchase_date TEXT`; no DROP, CREATE TABLE, or UPDATE |
| 6 | `src/lib/dates.ts` exports `todayISO()` (local-tz YYYY-MM-DD) and `parseLocalDate(dateStr)` (local midnight) | VERIFIED | `src/lib/dates.ts` exports both functions using `getFullYear/getMonth/getDate` arithmetic (not `toISOString`) and `new Date(year, month-1, day)` for local midnight |
| 7 | JournalTab.tsx has zero occurrences of `new Date().toISOString().split("T")` and imports `todayISO` from `@/lib/dates`; all 3 call sites use the import | VERIFIED | Grep on JournalTab.tsx: 0 matches for `new Date().toISOString().split`; 0 matches for `function todayISO`; line 35: `import { todayISO } from "@/lib/dates"`; call sites at lines 64, 79, 139 |
| 8 | updateUnit SQL uses raw assignment `lore_notes = $22` and `undercoat = $23` (not COALESCE) | VERIFIED | `units.ts` lines 69-70: `lore_notes = $22,` and `undercoat = $23,` (raw assignment) |
| 9 | updateFaction SQL uses raw assignment `lore_notes = $7` | VERIFIED | `factions.ts` line 34: `lore_notes  = $7,` (raw assignment) |
| 10 | updatePaint SQL uses raw assignment `purchase_date = $13` | VERIFIED | `paints.ts` line 48: `purchase_date        = $13,` (raw assignment) |
| 11 | createUnit, createFaction, createPaint INSERT statements include the new columns so create-mode submissions persist user-entered values | VERIFIED | `createUnit`: columns include `lore_notes, undercoat` at `$21, $22`; `createFaction`: includes `lore_notes` at `$6`; `createPaint`: includes `purchase_date` at `$12` |
| 12 | Unit, Paint, Faction TypeScript interfaces include the new nullable fields | VERIFIED | `unit.ts`: `lore_notes: string \| null` and `undercoat: string \| null`; `paint.ts`: `purchase_date: string \| null`; `faction.ts`: `lore_notes: string \| null` |
| 13 | All Zod schemas include the new fields without `.default()` | VERIFIED | `unitSchema.ts` lines 48-49: `lore_notes: z.string().optional().nullable()` and `undercoat: z.string().max(120, ...).optional().nullable()`; `factionSchema.ts` line 20: `lore_notes: z.string().optional().nullable()` — no `.default()` on any |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/enrichment/migration008.test.ts` | 6 it() blocks asserting migration file content + lib.rs registration | VERIFIED | File exists with 2 describe blocks, 6 it() tests using `readFileSync`; correct repo-root resolution |
| `tests/lib/dates.test.ts` | 4 it() blocks for todayISO format + parseLocalDate local-midnight | VERIFIED | File exists with 4 it() tests covering format, fake-timer format stability, component arithmetic, and local-midnight guarantee |
| `src-tauri/migrations/008_enrichment.sql` | 4 ALTER TABLE ADD COLUMN statements, additive only | VERIFIED | Contains `ALTER TABLE units ADD COLUMN lore_notes TEXT`, `ALTER TABLE units ADD COLUMN undercoat TEXT`, `ALTER TABLE factions ADD COLUMN lore_notes TEXT`, `ALTER TABLE paints ADD COLUMN purchase_date TEXT` |
| `src-tauri/src/lib.rs` | version: 8 entry after version: 7, referencing `008_enrichment.sql` | VERIFIED | Lines 49-54 contain the version 8 Migration struct; existing versions 1-7 unchanged |
| `src/types/unit.ts` | `lore_notes: string \| null` and `undercoat: string \| null` in Unit interface | VERIFIED | Lines 47-48 |
| `src/types/paint.ts` | `purchase_date: string \| null` in Paint interface | VERIFIED | Line 25 |
| `src/types/faction.ts` | `lore_notes: string \| null` in Faction interface | VERIFIED | Line 12 |
| `src/db/queries/units.ts` | `lore_notes = $22` and `undercoat = $23` raw assignment in updateUnit; both columns in createUnit at $21/$22 | VERIFIED | Lines 69-70 (updateUnit); lines 23/29/39 (createUnit) |
| `src/db/queries/factions.ts` | `lore_notes = $7` raw assignment in updateFaction; column in createFaction at $6 | VERIFIED | Line 34 (updateFaction); lines 18-20 (createFaction) |
| `src/db/queries/paints.ts` | `purchase_date = $13` raw assignment in updatePaint; column in createPaint at $12 | VERIFIED | Line 48 (updatePaint); lines 18-28 (createPaint) |
| `src/features/units/unitSchema.ts` | `lore_notes` and `undercoat` optional nullable zod fields, no `.default()` | VERIFIED | Lines 48-49 |
| `src/features/units/UnitSheet.tsx` | FormField for `undercoat` (Input) and `lore_notes` (textarea); buildDefaultValues and onSubmit cover both | VERIFIED | Lines 619-661 (form fields); lines 70-71 (edit branch), 95-96 (create branch), 142-143 (onSubmit) |
| `src/features/factions/factionSchema.ts` | `lore_notes` optional nullable zod field | VERIFIED | Line 20 |
| `src/features/factions/FactionSheet.tsx` | `lore_notes` textarea between description and color_theme; DEFAULT_VALUES + useEffect reset + both onSubmit paths | VERIFIED | Lines 169-186 (FormField); line 39 (DEFAULT_VALUES); lines 56/71 (useForm + useEffect edit branches); lines 87/97 (both onSubmit paths) |
| `src/features/units/UnitDetailSheet.tsx` | Undercoat always-shown row + conditional Lore Notes row with whitespace-pre-wrap | VERIFIED | Lines 180-194 |
| `src/lib/dates.ts` | `todayISO()` + `parseLocalDate()` exports; local-tz arithmetic; min 10 lines | VERIFIED | 25 lines; both functions exported; local-tz arithmetic confirmed |
| `src/features/units/JournalTab.tsx` | `import { todayISO } from "@/lib/dates"`; local function deleted; zero `new Date().toISOString()` occurrences | VERIFIED | Line 35 (import); grep returns 0 matches for `function todayISO` and 0 for `toISOString().split` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src-tauri/src/lib.rs get_migrations()` | `008_enrichment.sql` | `include_str!("../migrations/008_enrichment.sql")` | WIRED | lib.rs line 52 contains the include_str! macro; no `007_enrichment.sql` exists anywhere on disk |
| `units.ts updateUnit` | `units.lore_notes + units.undercoat columns` | raw `$22` / `$23` in UPDATE SET clause | WIRED | Lines 69-70 confirmed; grep finds zero COALESCE usages on these columns |
| `factions.ts updateFaction` | `factions.lore_notes column` | raw `$7` in UPDATE SET clause | WIRED | Line 34 confirmed; grep finds zero COALESCE usage |
| `paints.ts updatePaint` | `paints.purchase_date column` | raw `$13` in UPDATE SET clause | WIRED | Line 48 confirmed; grep finds zero COALESCE usage |
| `UnitSheet.tsx onSubmit` | `useUpdateUnit / useCreateUnit mutation payload` | `lore_notes: values.lore_notes \|\| null` and `undercoat: values.undercoat \|\| null` | WIRED | Lines 142-143; payload spread into both `updateUnit.mutateAsync` and `createUnit.mutateAsync` calls |
| `UnitDetailSheet.tsx Details tab` | `unit.undercoat + unit.lore_notes display` | `<Field label="Undercoat">` + conditional `<Field label="Lore Notes">` | WIRED | Lines 180-194; `unit.lore_notes` referenced in conditional render |
| `FactionSheet.tsx onSubmit` | `useUpdateFaction / useCreateFaction mutation payload` | `lore_notes: values.lore_notes \|\| null` | WIRED | Lines 87 and 97; both branches carry the field |
| `JournalTab.tsx call sites` | `src/lib/dates.ts todayISO` | `import { todayISO } from "@/lib/dates"` | WIRED | Line 35 import; 3 call sites at lines 64, 79, 139 all use the imported function |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ENRCH-01 | 17-00-PLAN.md | User can write custom lore notes for a faction | SATISFIED | FactionSheet form has lore_notes textarea; factions.ts INSERT + UPDATE wired; Faction type extended; smoke test PASSED |
| ENRCH-02 | 17-00-PLAN.md | User can write custom lore notes for an individual unit | SATISFIED | UnitSheet form has lore_notes textarea; units.ts INSERT + UPDATE wired; Unit type extended; smoke test PASSED |
| ENRCH-03 | 17-00-PLAN.md | User can record the primer/undercoat used on a unit | SATISFIED | UnitSheet form has undercoat Input; units.ts INSERT + UPDATE wired; Unit type extended; smoke test PASSED |
| ENRCH-04 | 17-00-PLAN.md | Undercoat and lore notes fields are visible and editable in the unit detail sheet | SATISFIED | UnitDetailSheet Details tab: Undercoat always shown (with `—` fallback) + Lore Notes conditional row; UnitSheet provides the edit path; smoke test PASSED |

All 4 requirements confirmed SATISFIED per REQUIREMENTS.md traceability table (all marked `[x]`).

---

### Anti-Patterns Found

None detected.

Checks run:
- `grep "new Date().toISOString().split" JournalTab.tsx` — 0 matches (UTC bug fully removed)
- `grep "function todayISO" JournalTab.tsx` — 0 matches (local function deleted)
- `grep "007_enrichment" src-tauri/` — 0 matches (wrong filename never created)
- `grep "lore_notes.*COALESCE" src/db/queries/` — 0 matches (raw assignment used correctly)
- `grep "undercoat.*COALESCE" src/db/queries/units.ts` — 0 matches
- `grep "purchase_date.*COALESCE" src/db/queries/paints.ts` — 0 matches
- No TODO/FIXME/placeholder comments found in Phase 17 files
- No `return null` stubs or empty implementations

---

### Human Verification Required

The following items were verified by manual smoke test (Task 16) and approved by the user on 2026-05-04. No additional human verification is required:

1. **Migration 008 applies cleanly** — App launched without SQLite panic; `_sqlx_migrations` version 8 confirmed in DB Browser
2. **ENRCH-02/03 Unit round-trip** — Undercoat and Lore Notes saved, re-displayed in edit form and Details tab; multi-line text preserved with line breaks
3. **Pitfall 2 (clear-to-NULL)** — Deleting field values and saving shows `—` in Undercoat row and hides Lore Notes row
4. **ENRCH-01 Faction round-trip + Pitfall 4** — Faction lore_notes persists; switching factions shows no stale-value bleed
5. **JournalTab date fix** — Session date defaults to local calendar date (not UTC)
6. **DB schema confirmed** — 4 new columns present in SQLite; `_sqlx_migrations` version 8 present
7. **Full test suite** — 329/329 tests passing across 58 test files; `pnpm tsc --noEmit` exits 0

---

### Gaps Summary

No gaps. All 13 must-have truths are verified, all 17 artifacts pass all three levels (exists, substantive, wired), all 8 key links are confirmed wired, and all 4 requirements (ENRCH-01..04) are satisfied. The phase goal is fully achieved.

---

_Verified: 2026-05-04T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
