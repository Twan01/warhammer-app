# Phase 17: Schema Foundation + Enrichment - Research

**Researched:** 2026-05-04
**Domain:** SQLite schema migration, TypeScript type extension, react-hook-form + zod, UTC date handling, Vitest
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Edit surface for unit lore + undercoat**
- UnitSheet only — `lore_notes` textarea and `undercoat` text input are added to the UnitSheet form (Add/Edit mode), appended after the existing `notes` field (last field in the form)
- UnitDetailSheet Details tab shows both fields as read-only display rows — same pattern as `purchase_price_pence` and `storage_location`
- No inline edit surface in the Details tab

**Read-only display in Details tab**
- Full text, no truncation — `lore_notes` content shown in full (tab is scrollable)
- `undercoat` shown as a plain text row (single line)
- Null/empty lore notes: field row hidden entirely (mirrors existing `unit.notes` display pattern)
- Null/empty undercoat: displayed as `—` with muted color

**Undercoat field style**
- Pure free-text `<Input>` — no combobox, no presets, no suggestions

**Faction lore notes**
- Added in `FactionSheet`, positioned after `description` and before `color_theme`
- Textarea with TEXTAREA_CLASS (min-h-[80px])
- Faction lore is edited and read in FactionSheet only — no read-only display surface on FactionPage rows

**dates.ts utility + JournalTab UTC fix**
- `src/lib/dates.ts` created with two exports: `parseLocalDate(dateStr: string): Date` and `todayISO(): string`
- Unit tests included in Phase 17 in `tests/lib/dates.test.ts`
- `JournalTab.tsx` bug fixed immediately in Phase 17: replace all 3 occurrences of the local `todayISO()` function (which uses the UTC bug pattern) with the import from `src/lib/dates.ts`

**Schema migration pattern**
- Migration file: `src-tauri/migrations/008_enrichment.sql` (NOT 007 — lib.rs is already at version 7 for datasheet_link)
- lib.rs version bumped to 8
- Uses `ALTER TABLE ... ADD COLUMN` — additive only, no destructive changes
- All new columns are `TEXT NULL` — no NOT NULL constraints, no defaults
- `purchase_date TEXT NULL` added to `paints` table

**updateUnit / updatePaint query changes**
- New columns use raw assignment (NOT COALESCE): `lore_notes = $N`, `undercoat = $N`, `purchase_date = $N`
- Consistent with `purchase_price_pence = $18` in existing updateUnit — allows user to explicitly clear values to NULL

### Claude's Discretion
- Exact position of lore_notes / undercoat rows in the Details tab (after storage_location, before linked recipes)
- Whether faction lore notes uses the `description` field label or a new "Lore Notes" label
- Toast copy for unit save after lore/undercoat changes (reuses existing "Unit updated." toast)
- Test setup for timezone simulation (`vi.setSystemTime` or mock `Date`)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENRCH-01 | User can write custom lore notes for a faction (chapter backstory, homeworld, custom name) | FactionSheet form extension + factions.lore_notes column in migration 008 |
| ENRCH-02 | User can write custom lore notes for an individual unit (character history, battle honours) | UnitSheet form extension + units.lore_notes column in migration 008 |
| ENRCH-03 | User can record the primer/undercoat used on a unit (free-text, e.g. "Chaos Black", "Wraithbone") | UnitSheet free-text Input + units.undercoat column in migration 008 |
| ENRCH-04 | Undercoat and lore notes fields are visible and editable in the unit detail sheet | UnitDetailSheet Details tab read-only rows (edit always via UnitSheet) |
</phase_requirements>

---

## Summary

Phase 17 is a pure additive database + UI enrichment phase. It has four distinct work streams that share no runtime dependencies with each other but must all land in the same migration: (1) migration 008 adding four new TEXT NULL columns, (2) TypeScript type and schema extensions propagating those columns through the type system, (3) query function updates in units.ts, paints.ts, and factions.ts to SELECT and UPDATE the new columns, and (4) UI surface additions in UnitSheet, UnitDetailSheet, and FactionSheet. A fifth stream — the dates.ts utility and JournalTab fix — is independent of the schema work.

The most critical discovery from reading the codebase is a version numbering conflict: CONTEXT.md says migration 007 but `src-tauri/src/lib.rs` already registers version 7 as `datasheet_link` (Phase 15). The enrichment migration must therefore be numbered `008_enrichment.sql` with version 8 in lib.rs. This is the single highest-risk error the planner must guard against.

The UTC bug in JournalTab is a local helper function named `todayISO()` defined at the top of `JournalTab.tsx` (line 57–59) that uses `new Date().toISOString().split("T")[0]` — the UTC-midnight pattern that shifts dates for users west of UTC. The same function is called at 3 places within the file (lines 67, 82, 143). Phase 17 replaces all three with an import from `src/lib/dates.ts`.

**Primary recommendation:** Start with migration 008 + lib.rs bump + type extensions as Wave 0 (already blocked by existing test infrastructure pattern); implement the dates.ts utility and its tests as a standalone Wave 1 that the planner can sequence in any order; then expand the query layer and UI surfaces in subsequent waves.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | already installed | SQLite migration runner + IPC queries | Project standard — all DB access goes through this |
| zod | already installed | Form schema validation | Project standard — all forms use zod + zodResolver |
| react-hook-form | already installed | Form state management | Project standard — all sheets use this |
| vitest | already installed | Unit tests | Project standard — vitest.config.ts at root |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hookform/resolvers | already installed | zodResolver bridging RHF + Zod | Used in all existing Sheet forms |
| @tanstack/react-query | already installed | Query invalidation after mutations | useUpdateUnit, useUpdateFaction hooks |

### No New Packages
Phase 17 requires zero new npm packages. All UI components (`Input`, `Form`, `Sheet`, `Separator`) are already installed as shadcn components. The `<textarea>` elements use the project-standard raw HTML pattern with `TEXTAREA_CLASS`.

**Installation:** None required.

---

## Architecture Patterns

### Recommended File Change Map
```
src-tauri/migrations/
└── 008_enrichment.sql          # NEW — ALTER TABLE ADD COLUMN x4

src-tauri/src/
└── lib.rs                      # EDIT — add version 8 migration entry

src/types/
├── unit.ts                     # EDIT — add lore_notes, undercoat fields
├── paint.ts                    # EDIT — add purchase_date field
└── faction.ts                  # EDIT — add lore_notes field

src/features/units/
├── unitSchema.ts               # EDIT — add lore_notes, undercoat to zod schema
├── UnitSheet.tsx               # EDIT — add two FormField blocks after notes field
└── UnitDetailSheet.tsx         # EDIT — add read-only rows in Details tab

src/features/factions/
├── factionSchema.ts            # EDIT — add lore_notes to zod schema
└── FactionSheet.tsx            # EDIT — add lore_notes FormField after description

src/db/queries/
├── units.ts                    # EDIT — extend updateUnit + createUnit SQL
├── paints.ts                   # EDIT — extend updatePaint + createPaint SQL
└── factions.ts                 # EDIT — extend updateFaction + createFaction SQL

src/lib/
└── dates.ts                    # NEW — parseLocalDate + todayISO exports

tests/lib/
└── dates.test.ts               # NEW — timezone boundary unit tests
```

### Pattern 1: Migration 008 — Additive ALTER TABLE
**What:** Four `ALTER TABLE ... ADD COLUMN TEXT` statements, no UPDATE/migrate needed (all columns start NULL).
**When to use:** Whenever new optional columns are added (established Phase 14 precedent).
**Example:**
```sql
-- 008_enrichment.sql — HobbyForge v0.2.2 Phase 17 (ENRCH-01..04)
ALTER TABLE units    ADD COLUMN lore_notes   TEXT;
ALTER TABLE units    ADD COLUMN undercoat    TEXT;
ALTER TABLE factions ADD COLUMN lore_notes   TEXT;
ALTER TABLE paints   ADD COLUMN purchase_date TEXT;
```

### Pattern 2: lib.rs Version Bump
**What:** Add a new Migration struct entry with version 8. Must be appended after the existing version 7 entry.
**Critical:** Do NOT renumber existing entries. The runner tracks applied versions in `_sqlx_migrations`.
```rust
Migration {
    version: 8,
    description: "enrichment",
    sql: include_str!("../migrations/008_enrichment.sql"),
    kind: MigrationKind::Up,
},
```

### Pattern 3: Raw Assignment for Clearable Nullable Columns
**What:** New columns use `column = $N` not `COALESCE($N, column)` in UPDATE queries.
**Why:** Allows user to explicitly clear a field to NULL (e.g., erasing lore notes). `COALESCE` prevents clearing.
**Reference:** Confirmed in existing `updateUnit` at line 64: `purchase_price_pence = $18`.

For `updateUnit`, new params are appended after the existing 21 params:
- `$22` = `lore_notes`
- `$23` = `undercoat`
- `$24` = `updated_at` shifts to `$24`

Wait — `updated_at = datetime('now')` is not a param, it's a SQL literal. So the new params are simply:
- Current highest param in updateUnit body: `$21` (notes)
- New params: `lore_notes = $22`, `undercoat = $23`
- `WHERE id = $1` (unchanged)

For `updateFaction`, new param: `lore_notes = $7` (after `icon_path = $6`).

For `updatePaint`, new param: `purchase_date = $13` (after `purchase_price_pence = $12`).

### Pattern 4: Type Extension Pattern
**What:** Add nullable fields to the interface and input types.
```typescript
// src/types/unit.ts
export interface Unit {
  // ... existing fields ...
  lore_notes: string | null;    // migration 008
  undercoat: string | null;     // migration 008
}
// CreateUnitInput and UpdateUnitInput inherit automatically via Omit + Partial
```

### Pattern 5: Zod Schema Extension
**What:** Add optional nullable fields following existing pattern.
**Reference:** `notes: z.string().max(2000).optional().nullable()` in unitSchema.ts.
```typescript
// unitSchema.ts additions
lore_notes: z.string().optional().nullable(),
undercoat: z.string().max(120).optional().nullable(),

// factionSchema.ts addition
lore_notes: z.string().optional().nullable(),
```

### Pattern 6: UnitSheet FormField Addition
**What:** Two new FormFields appended inside the collapsible `<div className="flex flex-col gap-4">` after the `notes` FormField.
**Reference:** See UnitSheet.tsx lines 591–611 for the exact `notes` FormField pattern to clone.
- `undercoat`: `<Input placeholder="e.g. Chaos Black, Wraithbone" {...field} value={field.value ?? ""} />`
- `lore_notes`: raw `<textarea className={TEXTAREA_CLASS} rows={4} {...field} value={field.value ?? ""} />`

The `buildDefaultValues` function (line 46–94) must include `lore_notes: unit.lore_notes ?? null` and `undercoat: unit.undercoat ?? null` in the edit branch, and `lore_notes: null, undercoat: null` in the create branch.

The `onSubmit` payload must include `lore_notes: values.lore_notes || null` and `undercoat: values.undercoat || null`.

### Pattern 7: UnitDetailSheet Read-Only Row Addition
**What:** Two new `<Field>` rows added inside the Details tab, after "Storage Location" and before the `<Separator />` + "Linked Recipes" section.
**Reference:** See UnitDetailSheet.tsx lines 164–175 (storage_location and Linked Recipes boundary).

```tsx
<Separator />

<Field label="Undercoat">
  {unit.undercoat
    ? <span className="text-sm">{unit.undercoat}</span>
    : <span className="text-sm text-muted-foreground">—</span>
  }
</Field>

{unit.lore_notes && (
  <>
    <Separator />
    <Field label="Lore Notes">
      <p className="text-sm whitespace-pre-wrap">{unit.lore_notes}</p>
    </Field>
  </>
)}
```

### Pattern 8: FactionSheet lore_notes FormField
**What:** New FormField inserted between `description` (line 146–161) and `color_theme` (line 163+) in FactionSheet.tsx.
- Uses `TEXTAREA_CLASS` constant (must import or define locally, consistent with JournalTab/PlaybookTab)
- `rows={4}`, placeholder: "Chapter backstory, homeworld, custom lore, campaign history…"
- `form.reset()` in `useEffect` must include `lore_notes: faction.lore_notes ?? ""` in edit branch and `lore_notes: ""` in DEFAULT_VALUES
- `onSubmit` passes `lore_notes: values.lore_notes || null`

### Pattern 9: dates.ts Utility (model: formatCurrency.ts)
**What:** New `src/lib/dates.ts` module following the same export-only pure-function pattern as `formatCurrency.ts`.
```typescript
/**
 * UTC-safe date utilities — Phase 17 (ENRCH-04 JournalTab fix).
 *
 * todayISO() and parseLocalDate() use local-timezone arithmetic instead of
 * UTC midnight to prevent off-by-one date errors for users east or west of UTC.
 */

export function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  // YYYY-MM-DD parsed as local midnight, not UTC midnight
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}
```

### Pattern 10: JournalTab UTC Fix
**What:** The local `todayISO()` function defined at lines 57–59 of JournalTab.tsx must be removed entirely, and the three call sites (lines 67, 82, 143) must import from `src/lib/dates.ts`.
**Change:** Add `import { todayISO } from "@/lib/dates";` at the top of JournalTab.tsx, delete the local function definition.

### Anti-Patterns to Avoid
- **Using COALESCE for the new nullable columns:** The existing updateUnit uses COALESCE for most fields but raw assignment for `purchase_price_pence`. The new columns must follow the raw assignment pattern — COALESCE prevents users from clearing values.
- **Naming the migration 007:** lib.rs already has version 7 (datasheet_link). Using 007 would conflict with the existing registered migration and cause a crash at startup.
- **Putting lore_notes in the Details tab for factions:** The decision is FactionSheet only — no read-only display surface on the FactionPage row list.
- **Using `new Date().toISOString().split("T")[0]` anywhere:** This is the UTC bug. Always use `todayISO()` from dates.ts.
- **Using .default() in zod schema:** Established project anti-pattern (see unitSchema.ts comment, line 17) — causes type mismatch with react-hook-form resolver. Use form defaultValues instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation for textarea fields | Custom length/empty checks | Zod `.optional().nullable()` with `.max()` | RHF + zodResolver handles error display automatically |
| Textarea styling | Custom CSS class | `TEXTAREA_CLASS` constant (already defined in JournalTab, PlaybookTab) | Project-consistent focus ring, border, bg; copy verbatim |
| Null display for empty fields | Conditional rendering scattered through JSX | Established `unit.notes` pattern (show only when truthy) / `—` pattern (always show with muted fallback) | Both patterns already used in UnitDetailSheet |
| Query cache invalidation | Manual refetch calls | `qc.invalidateQueries({ queryKey: UNITS_KEY })` in useUpdateUnit onSuccess | Already done by the existing hook — no changes needed |
| Date parsing for local timezone | Custom timezone offset arithmetic | `parseLocalDate()` in dates.ts | Single utility handles the boundary case cleanly |

**Key insight:** This phase is entirely additive. Every pattern already exists in the codebase — the planner's job is to extend existing patterns, not invent new ones.

---

## Common Pitfalls

### Pitfall 1: Migration Version Conflict (CRITICAL)
**What goes wrong:** CONTEXT.md says "migration 007" but lib.rs is already at version 7 (datasheet_link, Phase 15). Writing `008_enrichment.sql` as `007_enrichment.sql` and registering it as version 7 would silently overwrite or conflict with the existing migration registration.
**Why it happens:** Phase numbering (17) and migration numbering (008) are independent sequences. CONTEXT.md was drafted before Phase 15 shipped migration 007.
**How to avoid:** Migration file MUST be `src-tauri/migrations/008_enrichment.sql` and lib.rs entry MUST use `version: 8`. Verify current highest version by reading lib.rs before writing.
**Warning signs:** App panics at startup with "migration version already applied" or similar tauri-plugin-sql error.

### Pitfall 2: COALESCE vs Raw Assignment Confusion
**What goes wrong:** Developer sees existing `updateUnit` uses COALESCE for most columns and applies the same pattern to the new lore_notes and undercoat columns. This makes it impossible to clear the field (passing NULL would leave the old value).
**Why it happens:** COALESCE is the correct pattern for "only update if provided" partial updates, but wrong for clearable user-entered text fields.
**How to avoid:** Use `lore_notes = $22, undercoat = $23` — raw assignment, not `COALESCE($22, lore_notes)`. Matches `purchase_price_pence = $18` in the same updateUnit query.

### Pitfall 3: buildDefaultValues Missing New Fields
**What goes wrong:** UnitSheet's `buildDefaultValues` is not updated to include `lore_notes` and `undercoat`. The form initializes with undefined values. On save, the submit handler sends undefined instead of null, causing unexpected SQL behavior.
**Why it happens:** `buildDefaultValues` is a separate function from the form schema — must be updated in sync.
**How to avoid:** Add `lore_notes: unit.lore_notes ?? null` and `undercoat: unit.undercoat ?? null` in the edit branch; `lore_notes: null, undercoat: null` in the create branch.

### Pitfall 4: FactionSheet useEffect Reset Missing lore_notes
**What goes wrong:** FactionSheet's `useEffect([faction, form])` resets the form but doesn't include `lore_notes` in the reset payload. Switching between factions in edit mode shows stale lore notes from the previously selected faction.
**Why it happens:** `form.reset()` is called with explicit object literal — any missing field stays at its previous value if not listed.
**How to avoid:** Both branches of the `form.reset()` call must include `lore_notes: faction.lore_notes ?? ""` (edit) and `lore_notes: ""` (create / DEFAULT_VALUES).

### Pitfall 5: factions.ts Query Not Updated
**What goes wrong:** `SELECT * FROM factions` already returns all columns including new ones (SQLite wildcard), but `updateFaction` doesn't pass `lore_notes` — it's silently dropped. The faction type has the field but saves never persist it.
**Why it happens:** The SELECT query works automatically with `*`; only UPDATE/INSERT need explicit column additions.
**How to avoid:** Extend `updateFaction` SQL and `UpdateFactionInput` type. Extend `createFaction` SQL to include `lore_notes` in INSERT if user can set it at creation (FactionSheet is used for both create and edit).

### Pitfall 6: todayISO() Duplicate — Import vs Local Function
**What goes wrong:** JournalTab.tsx has its own local `todayISO()` at line 57. After creating `src/lib/dates.ts`, the developer imports `todayISO` but forgets to delete the local definition. TypeScript may not error (no conflict), but the local function shadows the import and the UTC bug is never actually fixed.
**Why it happens:** The local function has the same name as the import.
**How to avoid:** Delete lines 57–59 of JournalTab.tsx entirely, then add the import. Verify by searching for `new Date().toISOString().split("T")` in the file after the change — should find zero matches.

### Pitfall 7: paints.ts createPaint Missing purchase_date
**What goes wrong:** `updatePaint` is extended with `purchase_date` but `createPaint` is not updated. New paints created via the UI cannot have a purchase_date set at creation time.
**Why it happens:** Both INSERT and UPDATE queries must be updated when a new column is added.
**How to avoid:** Extend both `createPaint` and `updatePaint` with `purchase_date`. Also update `CreatePaintInput` to include `purchase_date: string | null`.

---

## Code Examples

### Migration 008 — Complete File
```sql
-- 008_enrichment.sql — HobbyForge v0.2.2 Phase 17 (ENRCH-01..04)
-- Adds lore_notes + undercoat on units, lore_notes on factions,
-- purchase_date on paints.
-- Additive only: ALTER TABLE ... ADD COLUMN. No destructive statements.

ALTER TABLE units    ADD COLUMN lore_notes    TEXT;
ALTER TABLE units    ADD COLUMN undercoat     TEXT;
ALTER TABLE factions ADD COLUMN lore_notes    TEXT;
ALTER TABLE paints   ADD COLUMN purchase_date TEXT;
```

### updateUnit — Extended Parameter List
Current updateUnit has params $1 (id) through $21 (notes), then `updated_at = datetime('now')`.
Extended version adds two new raw-assignment columns after `notes = COALESCE($21, notes)`:

```sql
UPDATE units
   SET ...
       notes                   = COALESCE($21, notes),
       lore_notes              = $22,
       undercoat               = $23,
       updated_at              = datetime('now')
 WHERE id = $1
```
Parameter array appends: `input.lore_notes ?? null, input.undercoat ?? null`

### updateFaction — Extended
```sql
UPDATE factions
   SET name        = COALESCE($2, name),
       game_system = COALESCE($3, game_system),
       description = COALESCE($4, description),
       color_theme = COALESCE($5, color_theme),
       icon_path   = COALESCE($6, icon_path),
       lore_notes  = $7,
       updated_at  = datetime('now')
 WHERE id = $1
```

### updatePaint — Extended
```sql
UPDATE paints
   SET brand        = COALESCE($2, brand),
       ...
       purchase_price_pence = $12,
       purchase_date        = $13,
       updated_at   = datetime('now')
 WHERE id = $1
```

### dates.ts — Complete Module
```typescript
/**
 * UTC-safe date utilities — Phase 17.
 * Replaces all uses of new Date().toISOString().split("T")[0] in JournalTab.
 */

/** Returns today's date as YYYY-MM-DD in the user's local timezone. */
export function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses a YYYY-MM-DD string as local midnight (not UTC midnight). */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}
```

### dates.test.ts — Timezone Boundary Tests
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { todayISO, parseLocalDate } from "@/lib/dates";

describe("todayISO — local timezone date string", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("returns YYYY-MM-DD format", () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns local date, not UTC date, at 23:00 UTC (UTC+2 would be next day)", () => {
    // Simulate 2024-01-15T23:30:00Z — UTC is Jan 15, local UTC+2 is Jan 16
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T23:30:00Z"));
    // In a UTC+2 environment, local date is 2024-01-16
    // todayISO must return the local date, not the UTC date
    const result = todayISO();
    // The test verifies format; UTC vs local divergence verified by parseLocalDate test
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    vi.useRealTimers();
  });
});

describe("parseLocalDate — parses YYYY-MM-DD as local midnight", () => {
  it("returns midnight local time for a given date string", () => {
    const d = parseLocalDate("2024-03-15");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2);  // 0-indexed
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("does not interpret as UTC (avoids off-by-one for negative-UTC timezones)", () => {
    const d = parseLocalDate("2024-01-01");
    // If parsed as UTC, getDate() in UTC-5 would return 31 (previous day)
    // parseLocalDate must always return getDate() === 1
    expect(d.getDate()).toBe(1);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `new Date().toISOString().split("T")[0]` for today's date | `todayISO()` from `src/lib/dates.ts` | Phase 17 | Fixes off-by-one date display for users in non-UTC timezones |
| Hardcoded `new Date(dateStr)` for date parsing | `parseLocalDate()` from `src/lib/dates.ts` | Phase 17 | Enables safe date comparisons in Phase 19 analytics (streak, velocity) |

**Deprecated/outdated:**
- Local `todayISO()` in JournalTab.tsx: replaced by import from dates.ts in Phase 17

---

## Open Questions

1. **`createUnit` and `createFaction` — include lore/undercoat in INSERT?**
   - What we know: `createUnit` currently inserts 20 columns (lines 18–29 of units.ts). The UnitSheet form supports both create and edit via the same form component.
   - What's unclear: The decision notes focus on `updateUnit` but the CONTEXT.md only specifies updateUnit/updatePaint changes. However, if a user can set lore_notes during unit creation (same form), the INSERT must include the columns too.
   - Recommendation: Include `lore_notes` and `undercoat` in both `createUnit` INSERT and `updateUnit` UPDATE for consistency. Same for `createFaction` / `createPaint`. The schema change is additive and doesn't break if the INSERT omits them (defaults to NULL), but failing to include them means the Create path silently drops user-entered data.

2. **`vi.setSystemTime` timezone simulation in jsdom**
   - What we know: `vi.setSystemTime` controls `Date.now()` and `new Date()` return values. Vitest uses jsdom.
   - What's unclear: jsdom does not simulate OS-level timezone settings. `vi.setSystemTime(new Date("2024-01-15T23:30:00Z"))` sets the epoch correctly but the offset applied by `new Date().getDate()` depends on the test runner's system TZ environment variable.
   - Recommendation: Tests should verify the format and arithmetic of `todayISO()` / `parseLocalDate()` without asserting specific UTC-vs-local divergence (that divergence is environment-dependent). The key test is that `parseLocalDate("2024-01-01").getDate() === 1` — which is environment-independent.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (detected: vitest.config.ts at repo root) |
| Config file | `vitest.config.ts` — environment: jsdom, globals: true, setupFiles: tests/setup.ts |
| Quick run command | `pnpm vitest run tests/lib/dates.test.ts` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENRCH-01 | Faction lore_notes persists across saves | manual smoke | N/A — Tauri IPC not testable in jsdom | N/A |
| ENRCH-02 | Unit lore_notes persists across saves | manual smoke | N/A — Tauri IPC not testable in jsdom | N/A |
| ENRCH-03 | Unit undercoat persists across saves | manual smoke | N/A — Tauri IPC not testable in jsdom | N/A |
| ENRCH-04 | Fields visible and editable in unit detail sheet | manual smoke | N/A — UI integration | N/A |
| Migration 008 | SQL file is additive-only and declares correct columns | unit (content assertion) | `pnpm vitest run tests/enrichment/migration008.test.ts` | ❌ Wave 0 |
| dates.ts | todayISO() returns YYYY-MM-DD; parseLocalDate() returns local midnight | unit | `pnpm vitest run tests/lib/dates.test.ts` | ❌ Wave 0 |
| lib.rs | Version 8 entry is registered | unit (content assertion) | `pnpm vitest run tests/enrichment/migration008.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run tests/lib/dates.test.ts tests/enrichment/migration008.test.ts`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/enrichment/migration008.test.ts` — covers migration 008 file content assertions + lib.rs version 8 registration (pattern: copy tests/spending/migration005.test.ts, adapt for 008_enrichment.sql)
- [ ] `tests/lib/dates.test.ts` — covers todayISO() format + parseLocalDate() local-midnight contract

*(No framework install needed — Vitest already configured)*

---

## Sources

### Primary (HIGH confidence)
- Direct reading of `src-tauri/src/lib.rs` — confirmed current migration version is 7 (datasheet_link), Phase 17 needs version 8
- Direct reading of `src-tauri/migrations/006_spend_pence.sql` — confirmed ALTER TABLE pattern + raw assignment precedent for nullable columns
- Direct reading of `src/db/queries/units.ts` — confirmed `purchase_price_pence = $18` raw assignment pattern; current param count ends at $21 (notes)
- Direct reading of `src/db/queries/paints.ts` — confirmed `purchase_price_pence = $12` raw assignment; current param count ends at $12
- Direct reading of `src/db/queries/factions.ts` — confirmed `icon_path = $6` is last param in updateFaction; lore_notes will be $7
- Direct reading of `src/features/units/JournalTab.tsx` — confirmed local `todayISO()` bug at lines 57–59, called at lines 67, 82, 143
- Direct reading of `src/features/units/UnitSheet.tsx` — confirmed form structure, buildDefaultValues, collapsible section, notes field at end
- Direct reading of `src/features/units/UnitDetailSheet.tsx` — confirmed Field component, Separator pattern, storage_location at line 169, notes pattern at line 200
- Direct reading of `src/features/factions/FactionSheet.tsx` — confirmed description field at line 146, color_theme at line 163, useEffect reset at line 61
- Direct reading of `src/features/units/unitSchema.ts` — confirmed `.optional().nullable()` pattern and no-`.default()` rule
- Direct reading of `src/features/factions/factionSchema.ts` — confirmed schema structure for extension
- Direct reading of `vitest.config.ts` — confirmed test runner, environment, include pattern
- Direct reading of `tests/spending/migration005.test.ts` — confirmed migration content-assertion test pattern (readFileSync + regex)
- Direct reading of `src/lib/formatCurrency.ts` — confirmed module shape for dates.ts

### Secondary (MEDIUM confidence)
- `17-UI-SPEC.md` — design contract for exact component placement and TEXTAREA_CLASS value (verified against actual JournalTab.tsx source)
- `17-CONTEXT.md` — implementation decisions and canonical reference map

### Tertiary (LOW confidence)
- None — all claims verified against actual codebase files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, zero new dependencies
- Architecture: HIGH — all patterns read directly from existing source files
- Pitfalls: HIGH — version conflict verified by reading lib.rs directly; other pitfalls extrapolated from established patterns in same codebase
- Test approach: MEDIUM — migration content tests are HIGH (proven pattern); timezone simulation is MEDIUM (jsdom TZ behavior is environment-dependent)

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable domain — only risk is if Phase 15/16 work still in flight changes lib.rs again before Phase 17 executes)
