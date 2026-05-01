# Feature Research

**Domain:** Personal Warhammer hobby tracker — Paint Inventory, Army List Builder, Unit Playbook
**Researched:** 2026-05-01
**Confidence:** HIGH (paint inventory + army lists verified against 6+ competitor apps; unit playbook is novel/personal-tool territory with MEDIUM confidence)

---

## Feature 1: Paint Inventory Page

The existing app has full Paint CRUD (brand, name, type, color family, hex, owned, quantity, running_low, wishlist, notes) and the data is already in SQLite. The `paints` table and `recipe_paints` join table are in place. What is missing is the dedicated inventory UI with filters, quick-toggle views, and back-links to recipes.

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Filter by brand | Every paint app does this; Citadel/Army Painter/Vallejo are distinct workflows | LOW | Distinct values from `paints.brand`; simple `SELECT DISTINCT` + client-side filter |
| Filter by paint type | Users think in type: "show me all my Shades" | LOW | Enum values already defined in schema |
| Filter by color family | "Show me all my reds" is a pre-game ritual | LOW | String filter on `color_family` |
| Running-low toggle | Core reason to have an inventory tracker — restock list | LOW | `WHERE running_low = 1`; already a schema field |
| Wishlist toggle | Second core reason — buy list before a project starts | LOW | `WHERE wishlist = 1`; already a schema field |
| Inline owned/quantity edit | Toggling "do I own this" in a table row, not opening a full form | MEDIUM | Needs optimistic update; can reuse PaintSheet or build inline toggle |
| Add/edit paint (full form) | Minimum CRUD — already built via PaintSheet | LOW | Already shipped as PaintsPage; needs to be integrated into the new inventory layout |
| Delete paint (with block if used in recipe) | FK protection already enforced in DB | LOW | Already shipped; FK from `recipe_paints` blocks delete |
| Search by name | "Find my Nuln Oil" | LOW | Client-side filter on loaded data is fine for personal-scale collections |
| Empty state with CTA | Table stakes for all pages in this app | LOW | Pattern already established |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Used in recipes" back-link per paint | Closes the recipe-to-inventory loop; no competitor does this cleanly in a local-first tool | MEDIUM | JOIN `recipe_paints` on `paint_id`, group recipe names per paint; renders as badge/list in row detail |
| Color swatch from hex_color | Visual scan of the inventory — see the actual color | LOW | `hex_color` field already exists; `<div style={{backgroundColor: hex}}>` in the row |
| Missing-paint indicator in recipe context | When viewing a recipe, know which paints you don't own — and jump to inventory to add them | MEDIUM | RECIPE-06 already does owned/missing visual in recipe detail; the inverse (from inventory, see recipes) is the v1.1 addition |
| Separate "what I own" vs "what I need" views | Running-low + wishlist as distinct presets makes the restock workflow obvious | LOW | Two named filter presets on top of existing filter logic |
| Grouped view by brand | Matches how physical paint racks are organized | LOW | Client-side group-by after loading; no extra query needed |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Barcode scanning | "Add paint by scanning the bottle" is appealing | Tauri desktop app has no camera access; `@tauri-apps/plugin-camera` is mobile-only; on desktop requires dedicated hardware with significant driver complexity | Manual add via the existing PaintSheet — fast enough for a personal collection |
| Cross-brand paint equivalents (curated DB) | "Tell me the Vallejo equivalent of Nuln Oil" | Requires ongoing data maintenance (3500+ paints x N brands); becomes stale rapidly as brands change ranges; scope explosion | User manually records equivalents in the `notes` field |
| Automatic stock depletion tracking | "Decrement quantity every time a paint appears in a recipe step" | Paints are used in variable amounts; a recipe link does not equal a "used up" quantity; would produce noise, not signal | Running-low boolean flag (already built) is the correct granularity for a hobby tool |
| Price tracking per paint | "Track what I spent on paints" | Adds significant data-entry friction with low payoff for a personal painter; paint prices are public and rarely change | Budget tracking is explicitly deferred to v2 per ROADMAP.txt |
| Hex color picker / color wheel in form | Looks fun | Adds a complex color-picker component (react-colorful or similar) for minimal functional gain; `hex_color` is optional | Accept a plain text hex input; render the swatch from it |

---

## Feature 2: Army List Builder

The schema for `army_lists` and `army_list_units` is already in place. `army_lists` has `name`, `faction_id`, `points_limit`, `list_type`, `notes`. `army_list_units` has `list_id`, `unit_id`, `points_override`, `notes`. The unit collection with `points`, `status_painting`, `status_assembly`, `status_basing`, `status_varnished`, and `painting_percentage` is fully built. This is a pure UI + query layer build on top of existing data.

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create / rename / delete a list | Basic CRUD — without this there is no feature | LOW | `army_lists` table ready; standard form + delete dialog |
| Select a faction for the list | Lists are faction-specific in 40K | LOW | FK to `factions` already in schema; faction dropdown |
| Add units from collection to a list | Core behavior — "pick from what I own" | MEDIUM | Unit picker: combobox or searchable list filtered to `faction_id`; inserts into `army_list_units` |
| Remove units from a list | Symmetry with add | LOW | DELETE from `army_list_units` |
| Manual points entry per unit in list | Non-negotiable per copyright constraint — no official points | LOW | `points_override` field in `army_list_units`; falls back to `unit.points` if null |
| Auto-calculated total points | "Is my list 2000 pts?" | LOW | SUM of effective points across `army_list_units`; computed client-side or in query |
| Painted points calculation | "How many points are fully painted?" | MEDIUM | Join to `units.painting_percentage` or `status_painting = 'Completed'`; define "painted" threshold clearly — recommend Completed = 100% only |
| Battle-ready percentage | The headline readiness metric | LOW | painted_points / total_points x 100; derived from the painted points calculation |
| List of all lists (overview page) | Entry point to the feature | LOW | Simple table/card list with name, faction, total pts, readiness % |
| Notes per list | "This is my learning list for friendly games" | LOW | `army_lists.notes` already in schema |
| List type tag | Casual / Learning / Narrative / Competitive / Test | LOW | `army_lists.list_type` already in schema; tag badge in the list view |
| Empty state | No lists yet — CTA to create | LOW | Established pattern in this app |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-unit painting status display in list | See at a glance which units block "battle ready" | LOW | Join `units.status_painting`; color-coded row or icon next to unit name in list |
| Notes per unit-in-list | "Remember: put Crisis Suits on the left flank" | LOW | `army_list_units.notes` already in schema; inline editable field in the list unit row |
| Points override with fallback | If unit has no stored points, show a warning; if override is set, use it; clear visual distinction | MEDIUM | Logic: `COALESCE(alu.points_override, u.points)` + flag when both are null — prevents silent 0-point entries corrupting the total |
| "Unpainted blocker" summary | Which unit(s) are dragging readiness % down most | LOW | Client-side: sort units by painting_percentage ascending, surface the bottom ones |
| Multiple lists per faction | Compare "competitive" vs "casual" builds from the same collection | LOW | Natural from the data model; no extra schema needed |
| target_points field on list | Set a goal (e.g. 2000 pts) and see progress toward it | LOW | `army_lists.points_limit` already in schema; show as progress bar |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Rules validation / legal list checking | "Is my list tournament legal?" | Requires copyrighted GW data (detachment rules, unit limits, points from official sources); this is the exact legal/IP constraint the app avoids by design | Explicit disclaimer on the page; "HobbyForge does not validate official rules — use New Recruit or the GW App for legal list checks" |
| Import from BattleScribe / New Recruit | "Copy my list from another tool" | .ros format embeds official GW points and unit data — importing it means storing copyrighted content; format is brittle and changes with every edition update | Manual entry; 2 minutes for a 10-unit list; keeps the user in control |
| Detachment / enhancement / stratagem tracking | Advanced list-building metadata | Requires official rules data to be meaningful; rapidly stale as GW balance dataslates drop every 3-6 months | Out of scope; direct user to GW app for this layer |
| Duplicate unit support (same unit twice in different configs) | Advanced list-building (e.g., two squads of Fire Warriors) | The schema allows it at the DB level, but the UI needs to handle "which copy is which" clearly — medium UX complexity for marginal v1.1 benefit | Allow one instance of each unit per list in v1.1; note "duplicate unit" as a v2 enhancement |
| Printable / export list | Share with opponent or TO | Requires PDF generation or print formatting; Tauri has no built-in print API | Deferred to v2 (REQUIREMENTS.md already defers export/backup to Phase 9) |
| Points history / version tracking | "See how my list changed over time" | Requires audit log or versioning; disproportionate complexity vs benefit in a personal tool | Out of scope for v1.1 |

---

## Feature 3: Unit Playbook (Personal Datasheet)

No competitor offers a "personal datasheet" that is entirely user-written with no scraped data. The closest are the strategy notes in the existing schema (`unit_strategy_notes` with `battlefield_role`, `strengths`, `weaknesses`, `best_targets`, `synergies`, `mistakes_to_avoid`, `rules_references`, `notes`). The Playbook extends this with a structured stats block (M/T/Sv/W/Ld/OC) and explicit abilities/keywords fields.

The `unit_strategy_notes` table is already in the schema. The v1.1 addition is primarily UI — a tab in the existing unit detail drawer that surfaces and populates this table, plus adding stats block fields via a new migration.

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stats block input (M / T / Sv / W / Ld / OC) | The six 40K 10th edition stats are the minimal personal datasheet | LOW-MEDIUM | Six nullable INTEGER columns; requires a new migration adding columns to `unit_strategy_notes`; LOW query complexity, MEDIUM because migration must ship first |
| Free-text abilities / special rules | User types their paraphrased version of unit abilities | LOW | Large textarea; requires a new `abilities` TEXT column in migration — explicit column is clearer than stuffing into `notes` |
| Keywords field | Keywords affect targeting, abilities, stratagems — users need to note them | LOW | Text input; comma-separated string is fine; requires new `keywords` TEXT column in migration |
| Strategy notes (role, strengths, weaknesses) | The existing `unit_strategy_notes` fields already cover these | LOW | Schema ready; UI is the only work |
| Synergies field | "This unit works well with…" — crucial for learning to play | LOW | `unit_strategy_notes.synergies` already in schema |
| Mistakes to avoid | Lessons from games; pre-game reminder | LOW | `unit_strategy_notes.mistakes_to_avoid` already in schema |
| Rules page references | "See Codex p.47" — safe legal approach (reference, not reproduction) | LOW | `unit_strategy_notes.rules_references` already in schema |
| Integrated into unit detail drawer as a tab | Context: user is looking at a unit, wants to see/edit its playbook | LOW | Add a "Playbook" tab to the existing `UnitDetailSheet.tsx`; tabs pattern already used |
| Save / edit in place | Notes should be editable without opening a separate form | MEDIUM | Inline edit with save button, or auto-save on blur; requires mutation + optimistic update |
| Empty state CTA | "No playbook yet — start adding your notes" with prompt | LOW | Standard empty state pattern |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Stats block rendered as a visual datasheet row | Looks like the real GW datasheet card (but all user-typed); satisfying for the user | LOW | CSS grid or table layout: `M | T | Sv | W | Ld | OC` in a styled header row |
| "Best targets" field | Which enemy units does this excel at killing? Critical for new players | LOW | `unit_strategy_notes.best_targets` already in schema |
| Per-list strategy notes (on `army_lists.notes`) | The list-level pre-game plan — complements unit-level notes | LOW | Already in `army_lists.notes`; expose prominently in list detail view |
| Blank-slate design makes copyright safe by construction | Other apps cannot do personal rule notes without IP risk; the design constraint is a differentiator for personal use | LOW | Explicit "user-typed only" label on the Playbook tab; no liability |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Pre-loaded / scraped official stats | "Why do I have to type in the stats?" | Hard legal constraint — GW owns the datasheets; shipping pre-loaded stats is copyright infringement regardless of how it is framed | Add a reference link to Wahapedia or the official GW App on the Playbook tab so the user can look up and type in their own stats |
| Import datasheet from Wahapedia / GW App | "Auto-fill my stats from the web" | Scraping GW data is an IP risk regardless of source; Wahapedia content is GW's IP distributed without license | Out of scope permanently per REQUIREMENTS.md; the value is in personal annotations, not raw stats reproduction |
| Rich text / markdown in notes | "I want headers and bullet lists in my strategy notes" | Adds a markdown editor or rich text component (TipTap, Quill) with significant bundle and maintenance overhead; the unit detail drawer has limited width | Standard `<textarea>` with `whitespace-pre-wrap`; users can use newlines and dashes for visual structure |
| Automatic synergy detection (cross-unit AI analysis) | "Tell me which units synergize" | Requires semantic understanding of free-text user notes; AI feature that belongs to v3 per ROADMAP.txt | Users write synergy notes manually in the `synergies` field |
| Photos / progress images in Playbook tab | "Show my painted unit alongside its tactics" | Image storage is explicitly deferred to Phase 8 in REQUIREMENTS.md; adds file system complexity | Defer; `units.main_image_path` already exists for when images land in Phase 8 |

---

## Feature Dependencies

```
Paint Inventory Page
    reads──> paints table (already exists — no migration needed)
    reads──> recipe_paints JOIN painting_recipes (already exists — "used in" back-link)
    reuses──> PaintSheet (already built)
    reuses──> PaintDeleteDialog (already built)
    NEW──> src/db/queries/paints.ts needs getPaintsWithRecipeUsage() function
    NEW──> src/hooks/usePaints.ts needs usePaintsWithUsage() hook

Army List Builder
    requires──> Unit Collection (fully built — unit picker pulls from units table)
    requires──> Factions CRUD (fully built — faction dropdown for list)
    reads──> units.points (already exists — fallback when points_override is null)
    reads──> units.status_painting, painting_percentage (already exists — readiness calc)
    writes──> army_lists table (schema ready — no migration needed)
    writes──> army_list_units table (schema ready — no migration needed)
    NEW──> src/db/queries/armyLists.ts (does not exist)
    NEW──> src/hooks/useArmyLists.ts (does not exist)
    NEW──> src/features/army-lists/ directory (does not exist)

Unit Playbook
    requires──> Unit Collection (fully built — Playbook is a tab in UnitDetailSheet)
    reads/writes──> unit_strategy_notes table (schema ready — partially)
    MIGRATION REQUIRED──> add columns: movement, toughness, save, wounds, leadership, oc,
                           abilities, keywords to unit_strategy_notes
    NEW──> src/db/queries/strategyNotes.ts (does not exist)
    NEW──> src/hooks/useStrategyNotes.ts (does not exist)
    modifies──> src/features/units/UnitDetailSheet.tsx (add Playbook tab)

Army List Builder ──enhances──> Unit Playbook
    (A list's readiness % is more meaningful when unit notes explain painting priority;
    the two features share the "ready to play" narrative without a hard code dependency)

Paint Inventory ──enhances──> Recipes (already built)
    (The "used in recipes" back-link is the primary cross-feature value of the inventory page)
```

### Dependency Notes

- **Army List Builder requires Unit Collection:** The unit picker queries existing `units`. No units = no list building possible. The unit collection is fully built; this is a safe dependency.
- **Unit Playbook requires Unit Collection:** The Playbook is a tab inside `UnitDetailSheet`. It cannot be a standalone page without significant rework of the existing unit detail structure.
- **Unit Playbook requires a migration:** The `unit_strategy_notes` table does not have columns for M/T/Sv/W/Ld/OC, abilities, or keywords. A new migration must add these as nullable columns. This is low-risk (additive, existing rows get NULLs) but must be written and applied before the Playbook UI can function.
- **Paint Inventory has no new schema dependencies:** All data is in `paints` and `recipe_paints`. This is a pure UI and query function build — the lowest-risk of the three features.
- **Army List Builder has no schema dependencies:** `army_lists` and `army_list_units` are in `001_core_schema.sql` already. Only query functions and UI are missing.
- **Build order implication:** Paint Inventory first (schema-free), then Army List Builder (schema-free), then Unit Playbook (requires migration). Alternatively, run the migration first and build all three in parallel.

---

## MVP Definition

### Launch With (v1.1 — this milestone)

**Paint Inventory:**
- [ ] Filterable paint table (brand, type, color family, text search)
- [ ] Running-low toggle preset view
- [ ] Wishlist toggle preset view
- [ ] Color swatch from hex_color (LOW complexity — ship with the table)
- [ ] "Used in recipes" back-link per paint row (the headline differentiator)
- [ ] Inline owned toggle (quick update without opening the full form sheet)

**Army List Builder:**
- [ ] Create / rename / delete lists with faction selector
- [ ] Unit picker (from own collection, filtered by faction)
- [ ] Points per unit (override or fallback to unit.points, warn when both null)
- [ ] Auto-calculated total, painted, and readiness %
- [ ] Per-unit painting status display in list (color-coded)
- [ ] Notes per list and per unit-in-list
- [ ] List type tag (Casual / Learning / Narrative / Competitive / Test)
- [ ] Overview page with all lists

**Unit Playbook:**
- [ ] Migration adding M/T/Sv/W/Ld/OC, abilities, keywords columns to `unit_strategy_notes`
- [ ] Playbook tab in UnitDetailSheet
- [ ] Stats block input (six fields, rendered as a styled datasheet row)
- [ ] Abilities and keywords free-text fields
- [ ] All existing strategy note fields exposed (role, strengths, weaknesses, best targets, synergies, mistakes, rules refs, personal notes)
- [ ] Inline save within the tab

### Add After Validation (v1.x)

- [ ] Grouped-by-brand view in Paint Inventory — useful but not blocking the page
- [ ] "Unpainted blocker" unit callout in Army List detail — low complexity, add after core builder is stable
- [ ] Per-list strategy notes exposed prominently in list detail (currently just `army_lists.notes`)

### Future Consideration (v2+)

- [ ] Keyword-aware synergy cross-reference across units
- [ ] Printable / exported army list (PDF or print)
- [ ] Battle log integration with army lists (Phase 7 per ROADMAP.txt)
- [ ] Image attachments to Unit Playbook (Phase 8 per ROADMAP.txt)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Paint Inventory — filter + toggle views | HIGH | LOW | P1 |
| Paint Inventory — "used in recipes" back-link | HIGH | MEDIUM | P1 |
| Army List — create list + add units + points calc | HIGH | MEDIUM | P1 |
| Army List — readiness % + painting status per unit | HIGH | LOW | P1 |
| Unit Playbook — migration + stats block tab | HIGH | LOW-MEDIUM | P1 |
| Unit Playbook — all strategy note fields | HIGH | LOW | P1 |
| Paint Inventory — color swatch | MEDIUM | LOW | P2 (bundle with P1 — trivial) |
| Army List — per-unit notes (inline editable) | MEDIUM | LOW | P2 |
| Army List — list type tag | LOW | LOW | P2 (bundle with P1 — trivial) |
| Army List — "unpainted blocker" callout | MEDIUM | LOW | P2 |
| Grouped-by-brand paint view | LOW | LOW | P3 |

---

## Competitor Feature Analysis

| Feature | Liber Pigmenta | paintRack / PaintVault | BattleBase / New Recruit | HobbyForge v1.1 Approach |
|---------|---------------|------------------------|--------------------------|--------------------------|
| Paint inventory | 3500+ pre-loaded paint library; track owned | Local inventory + barcode scan | N/A | Manual add; no pre-loaded library — user owns their data |
| Filter by brand/type | Yes | Yes | N/A | Yes (client-side filter on loaded data) |
| Running-low / wishlist | Yes (wishlist) | Yes (wish list) | N/A | Yes (both — already in schema) |
| "Used in recipes" back-link | Not present in paint view | Not present | N/A | YES — the differentiator for this page |
| Cross-brand equivalents | Yes (community DB) | Yes (color tools) | N/A | Explicitly out of scope; notes field instead |
| Barcode scanning | No (web app) | Yes (mobile camera) | N/A | Not applicable (desktop Tauri app) |
| Army list builder | Roster with official data | N/A | Yes (with rule validation) | Manual-points-only; no rule validation — intentional |
| Battle readiness % | Painted percentage metric | N/A | No equivalent | YES — core differentiator |
| Personal unit notes | No | No | No | YES — entire Playbook tab |
| Official stats / datasheets | Yes (Liber uses official data) | No | Yes (New Recruit pulls official data) | NO — by design; copyright safe |

---

## Sources

- Liber Pigmenta (https://www.liberpigmenta.com/) — paint inventory + army tracking app; feature set reviewed
- paintRack (https://apps.apple.com/us/app/paintrack/id1490523130) — paint tracker with inventory and wishlist
- BattleBase (https://www.battlebase.app/) — Warhammer 40K army list + battle tracker
- New Recruit (https://www.newrecruit.eu/) — free army builder; rules-validated lists
- Administratum by Goonhammer (https://administratum.goonhammer.com/) — campaign/crusade tracker; roster features
- Warhammer Guild best apps guide (https://warhammerguild.com/guides/best-warhammer-apps/) — ecosystem overview
- Wargamer Pile of Potential review (https://www.wargamer.com/warhammer-40k/pile-of-potential-app) — hobby tracker UX patterns
- HobbyForge existing codebase — `001_core_schema.sql`, `src/features/paints/PaintsPage.tsx`, `src/db/queries/paints.ts`, `src/db/queries/units.ts`
- HobbyForge project docs — `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.txt`

---
*Feature research for: HobbyForge v1.1 — Paint Inventory, Army List Builder, Unit Playbook*
*Researched: 2026-05-01*
