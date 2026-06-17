---
phase: 136
slug: code-honesty-decomposition
status: draft
shadcn_initialized: true
preset: "new-york / zinc / CSS variables"
created: 2026-06-17
---

# Phase 136 — UI Design Contract

> Visual and interaction contract for Phase 136: Code Honesty & Decomposition.
>
> **CRITICAL FRAMING — this is a behavior-preserving refactor, NOT a new-design phase.**
> The acceptance bar is "renders identically (EN and FR) everywhere" (HON-08) and
> "no behavior regression" (HON-09). The purpose of this spec is to LOCK THE EXISTING
> VISUAL CONTRACT so the refactor is provably non-regressive. Do NOT introduce new
> spacing, color, typography, or layout decisions. The current rendered output is the
> locked baseline.

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | shadcn/ui | `components.json` |
| Preset | new-york / zinc / CSS variables | `components.json` |
| Component library | Radix UI (via shadcn primitives) | `components.json` |
| Icon library | Lucide React | `CLAUDE.md` |
| Font | Geist Variable (`@fontsource-variable/geist`) | `src/styles/globals.css` line 3 |

**No new components are introduced in this phase.** All surfaces refactored in Phase 136 already use the existing shadcn/ui token set. The executor must not add new shadcn components or install new registries.

---

## Spacing Scale

No new spacing decisions are made in this phase. The existing 8-point scale is inherited unchanged from the app globals.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing |
| md | 16px | Default element spacing |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

Exceptions: none for this phase.

**Refactor rule:** Every extracted child component (`ArmyListDetailHeader`, `ArmyListQuickAdd`, `ArmyListUnitTable`, `ArmyListPortals`) must preserve the exact Tailwind spacing classes from the source block in `ArmyListDetailPage.tsx`. Block-move; do not adjust spacing.

---

## Typography

No new typography decisions are made in this phase. The existing scale is inherited unchanged from the app globals.

| Role | Size | Weight | Line Height | Source |
|------|------|--------|-------------|--------|
| Body | 14px (`text-sm`) | 400 | 1.5 | Existing app convention |
| Label / table cell | 12px (`text-xs`) | 400 | 1.25 | Existing WeaponTable cells |
| Table header | 10px (`text-[10px]`) | 600 (`font-semibold`) | 1 | Existing WeaponTable header |
| Heading / unit name | 16px (`text-base`) / varies | 500 (`font-medium`) | 1.2 | Existing page header pattern |

**Refactor rule:** Every block-moved component must copy its typography classes verbatim from the source. Do not harmonize or reclassify sizes during extraction.

---

## Color

No new color decisions are made in this phase. All tokens are inherited from `src/styles/globals.css` (shadcn/ui zinc CSS variables, dark-mode primary).

| Role | CSS Token | Value (dark mode) | Usage |
|------|-----------|-------------------|-------|
| Dominant (60%) | `--background` | `hsl(240 10% 3.9%)` | Page background |
| Secondary (30%) | `--card` / `--secondary` | `hsl(240 10% 5.9%)` / `hsl(240 3.7% 15.9%)` | Cards, sidebar, elevated panels |
| Accent (10%) | `--faction-accent` (runtime) | `#71717a` default (zinc-500) | Faction badge, active nav indicator only |
| Destructive | `--destructive` | `hsl(0 72.2% 50.6%)` | Destructive button (Delete army list) |

Accent reserved for: faction badge chip, active sidebar nav indicator. No new accent usages added in this phase.

**Refactor rule:** `WeaponTable` canonical uses `border-border`, `text-muted-foreground`. The `DatasheetPointsTab` local function used `bg-muted/50` on the header row — this is a cosmetic divergence that is NOT preserved; the canonical no-background header wins (see HON-08 normalization below).

---

## WeaponTable Visual Contract (HON-08)

This section is the primary deliverable for HON-08 regression prevention.

### Canonical Column Set (locked — do not change)

The merged `WeaponTable` in `src/features/units/WeaponTable.tsx` exposes exactly these 7 columns in this order:

| # | Header label | Data field | Alignment | Format rule |
|---|-------------|------------|-----------|-------------|
| 1 | Name | `w.name` | Left | `text-sm font-medium truncate` |
| 2 | **Rng** | `w.range` | Center | If `w.range` is a plain integer string → append `"` (e.g. `24"`)   otherwise render raw   fallback `—` |
| 3 | A | `w.attacks` | Center | Raw value; fallback `—` |
| 4 | BS or WS | `w.skill` | Center | Append `+` if not already suffixed (`endsWith("+")` guard); fallback `—` |
| 5 | S | `w.strength` | Center | Raw value; fallback `—` |
| 6 | AP | `w.ap` | Center | Raw value; fallback `0` |
| 7 | D | `w.damage` | Center | Raw value; fallback `—` |

Column header label **must be** `"Rng"` — not `"Range"`. The `UdbWeaponsTable` used `"Range"` — this is the one label difference being normalized to canonical.

### Row Key

Composite: `` `${w.unit_id}-${w.weapon_group}-${w.line_order}-${i}` ``

Not `w.id` (scalar). The scalar key used by `UdbWeaponsTable` is NOT preserved.

### Keywords Row

Rendered below the stats row when `w.keywords` is truthy:

```
className="px-2 pb-1.5 text-xs text-muted-foreground leading-relaxed"
```

**Not italic.** `UdbWeaponsTable` used `italic` on keywords — this is NOT preserved; `leading-relaxed` (no italic) is canonical and wins.

### Header Background

No background class on the header row. The `DatasheetPointsTab` local function used `bg-muted/50` — this is NOT preserved; canonical wins.

### Grid Layout

```
grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1
```

This exact class string must be identical in the merged component. Do not adjust column widths.

### EN/FR Contract

Bilingual rendering is handled entirely at the query layer via `COALESCE(col_fr, col)` in SQL. The `WeaponTable` component itself receives pre-resolved strings and has no locale awareness. After re-pointing consumers:

- `UdbDatasheetSheet` (FR): weapon names/keywords arrive pre-resolved from `getUdbUnitDetail` query → no component change needed
- `DatasheetPointsTab` (FR): same pattern
- Parity check: render a known weapon row in both EN and FR and assert identical DOM output from the component

### Surfaces to Compare (visual regression checklist)

Before marking HON-08 complete, manually verify all 5 consumer surfaces render identically to pre-refactor:

| Surface | Component file | Locale to check | What to verify |
|---------|---------------|-----------------|----------------|
| Collection unit datasheet | `PlaybookDatasheet.tsx` | EN (no change — already canonical) | Smoke-check only; no import change |
| Army list unit row expanded | `ArmyListUnitRow.tsx` | EN (no change — already canonical) | Smoke-check only; no import change |
| Game Day unit card | `UnitAbilityCard.tsx` | EN (no change — already canonical) | Smoke-check only; no import change |
| Unit Database datasheet sheet | `UdbDatasheetSheet.tsx` | **EN + FR** | Confirm weapon name column, Rng label, range format, keywords (no italic), header (no bg) |
| Rules Hub datasheet points tab | `DatasheetPointsTab.tsx` | **EN + FR** | Same checklist as above; confirm `bg-muted/50` header gone, `"Rng"` label present |

---

## ArmyListDetailPage Decomposition Visual Contract (HON-09)

This section locks the "no visual diff" contract for HON-09.

### Extraction is purely mechanical

Every extracted child receives props that are identical in value to the local variables in the source block. No prop renaming that changes rendered values. No layout changes.

### Child component visual contracts (locked)

| Child component | Extracted from (line range) | Visual contract |
|----------------|----------------------------|-----------------|
| `ArmyListDetailHeader.tsx` | ~472–516 | Back-link `<` + `<PageHeader>` with faction badge chip + Edit / Game Day / Delete action buttons. Classes verbatim from source. |
| `ArmyListQuickAdd.tsx` | ~520–558 | Search input + dropdown results list. Classes verbatim. |
| `ArmyListUnitTable.tsx` | ~575–653 | `DndContext` wrapper + categorized unit rows + `SortableUnitRow`. Classes verbatim. |
| `ArmyListPortals.tsx` | ~712–784 | All 9 sibling Sheet/Dialog portals. Classes verbatim. Portal open/close state driven by reducer flags — unchanged. |
| `useArmyListExport` hook | ~355–424 | No UI. Pure logic extraction. Returns `{ handleCopyToClipboard, handleSaveJson, handleSavePdf }`. |

### Never-nested portal rule (preserved)

All 9 portals in `ArmyListPortals.tsx` are rendered as **siblings** at the orchestrator's JSX root level, not nested inside any conditional. This rule is preserved exactly. The `ArmyListPortals` component renders them in the same sibling order as the source.

### Render-identical checklist (HON-09)

After each extraction commit, verify the full army list detail page:

| Check | What to look for |
|-------|-----------------|
| Header renders | Back link, list name, faction badge, all 3 action buttons visible |
| Quick add renders | Search input, results populate on type |
| Unit table renders | Units grouped by category, drag handles present, order preserved |
| Export buttons render | Copy / JSON / PDF buttons in toolbar |
| All portals open | Edit sheet, Game Day dialog, Delete dialog, LoadoutSheet, EnhancementSheet, LeaderSheet, PrintPreview, SnapshotSheet, SnapshotCompareDialog |
| EN / FR parity | Weapon names in expanded unit rows correct in both locales |

---

## Copywriting Contract

This is a refactor phase. There are no new user-facing strings.

| Element | Copy | Note |
|---------|------|------|
| Primary CTA | n/a — no new CTAs | No new user-facing actions |
| Empty state | unchanged — inherits existing strings | No new empty states |
| Error state | unchanged — inherits existing strings | No new error surfaces |
| Destructive confirmation | unchanged — Delete army list confirmation dialog preserved verbatim | HON-09 extracts portal block; copy is block-moved, not rewritten |

**Refactor rule for strings:** Any user-visible string in an extracted block must be byte-identical to the source. No paraphrasing, no capitalisation changes, no punctuation changes.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Existing components only (no new installs) | Not required — no new blocks |
| Third-party | None | Not applicable |

No new shadcn components are installed in this phase. No third-party registry blocks are used.

---

## Non-Goals (explicit, for planner and executor)

The following are **explicitly out of scope** for Phase 136 and must not appear in plan tasks:

| Non-goal | Rationale |
|----------|-----------|
| Convert `WeaponTable` div-grid to semantic `<table>` / `<th scope="col">` (IN-010) | Behavior change; deferred. See CONTEXT.md Deferred Ideas. |
| Fix IN-011 ghost-unit filter | Behavior change; near decomposition surface but not mechanical |
| Fix IN-013 duplicated readiness logic | Behavior change |
| Remove IN-014 dead `StaleDataBanner` | Out of scope for this phase |
| Fix IN-015 O(n²) snapshot pairing | Performance change, not mechanical extraction |
| Any new visual design | This phase renders identically to today; no new design decisions |
| Any new user-facing feature | Behavior-preserving only |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — no new strings; existing strings block-moved verbatim
- [ ] Dimension 2 Visuals: PASS — locked to existing baseline; visual regression checklist provided
- [ ] Dimension 3 Color: PASS — no new color decisions; existing tokens inherited
- [ ] Dimension 4 Typography: PASS — no new type decisions; existing classes copied verbatim
- [ ] Dimension 5 Spacing: PASS — no new spacing decisions; existing classes copied verbatim
- [ ] Dimension 6 Registry Safety: PASS — no new registry blocks; no third-party blocks

**Approval:** pending

---

*Phase: 136-code-honesty-decomposition*
*UI-SPEC generated: 2026-06-17*
*Sources: 136-CONTEXT.md (D-01..D-12), 136-RESEARCH.md (HON-08 prop diff table, HON-09 line ranges, consumer list), components.json, src/styles/globals.css*
