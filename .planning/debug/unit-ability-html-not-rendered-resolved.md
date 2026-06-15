# Debug: Unit ability descriptions show literal HTML tags

**Status:** RESOLVED
**Reported:** 2026-06-14 — Necron Skorpekh Destroyers ability showing literal
`<br><br><b>Designer's Note:</b> <i>...</i>` instead of formatted text.

## Symptom
Unit datasheet ability descriptions render raw HTML markup as visible text
(e.g. `<br>`, `<b>`, `<i>`) rather than as line breaks / bold / italic.

## Root cause
The canonical unit data (`src-tauri/data/unit_database.json`) stores ability
`description` fields with raw Wahapedia HTML — **3,037** descriptions contain
tags (`<br>` ×7091, `<b>`, `<i>`, `<span>`, `<ul>/<li>`, `<table>`, `<p>` …).

The detachment / stratagem / enhancement surfaces already render this HTML
safely via `sanitizeRulesHtml()` + `dangerouslySetInnerHTML`. But the **unit
datasheet ability** surfaces rendered `{ability.description}` as plain JSX text,
so React HTML-escaped the markup and the tags appeared literally.

## Fix
Routed all unit-ability description renders through the existing
`sanitizeRulesHtml()` (DOMPurify, allow-list incl. b/i/br/span/p/ul/li/table)
with `dangerouslySetInnerHTML`, matching the detachment/stratagem pattern
(`className="… [&_b]:font-semibold [&_.kwb]:text-foreground"`).

Render surfaces fixed (6 spots, 5 files):
- `src/features/units/PlaybookDatasheet.tsx` (AbilityEntry)
- `src/features/game-day/UnitAbilityCard.tsx` (Once-Per-Game + Abilities)
- `src/features/unit-database/UdbDatasheetSheet.tsx`
- `src/features/rules-hub/SharedAbilityCard.tsx`
- `src/features/rules-hub/DatasheetPointsTab.tsx`

Non-HTML surface (plain-text `<textarea>` pre-fill) fixed differently — the
Playbook strategy-notes pre-fill in `src/features/units/PlaybookTab.tsx` now
runs descriptions through `stripHtml()` (a textarea can't render markup), applied
to BOTH the display pre-fill and the override-equality baseline so the dirty
check stays consistent.

## Verification
- `npx tsc --noEmit` — clean
- `npx vitest run` (units / game-day / unit-database / rules-hub / datasheet) —
  316 passed, 0 failures
- Confirmed weapon `abilities`/`keywords` fields carry no HTML (only `description` does).
