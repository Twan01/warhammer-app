# Feature Research

**Domain:** Structured painting recipe / painting studio — Warhammer hobby management desktop app (v2.5 Recipes 2.0)
**Researched:** 2026-05-06
**Confidence:** MEDIUM-HIGH (competitor landscape surveyed from Citadel Colour app, PaintPad, paintRack, BrushForge, Liber Pigmenta, ArmyCrafter, Brushrage, impcat; domain well-understood from shipped v2.4 baseline; exact implementation complexity for step-session linkage is lower-confidence because no surveyed competitor does this exactly)

---

## Scope

This file covers the new capabilities needed to transform HobbyForge recipes from flat
paint notes into a structured painting knowledge system. The v2.4 baseline already ships:

- `painting_recipes` table with flat `primer/basecoat/shade/layer/highlight/glaze_filter/
  weathering/technical/basing` TEXT columns plus `notes`, `area`, `tutorial_link`
- `recipe_paints` join table: `step_name`, `order_index`, `notes`, `paint_id`
- `DraftStep` model in `recipeSteps.ts`: `step_name`, `paint_id`, `notes` (no phase, no tool, no technique, no time estimate, no photo)
- Recipe detail as a flat list of steps with owned/missing indicator (green/red dot)
- Recipe filtering by faction, unit, area, paint
- Recipe swatch strip on cards
- `image_assets` polymorphic photo table already in schema
- `painting_sessions` for session logging

Research focuses on what "structured recipe with step-by-step workflow, paint inventory
integration, and studio UX" means across the competitor ecosystem.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any credible recipe/tutorial system must have. Missing these makes Recipes 2.0
feel like a reskin of the existing flat-note system.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Step title + painting phase per step | Every surveyed app (Citadel Colour, PaintPad, Liber Pigmenta, BrushForge, ArmyCrafter) organizes steps by named phase. "Step 1: Basecoat" vs a raw text note is the foundation of any recipe system. | LOW | Add `title TEXT` and `phase TEXT` columns to `recipe_paints`. Phases map to existing schema vocabulary: prime / basecoat / shade / layer / highlight / glaze / weathering / basing / varnish / other. Migrate existing `step_name` → `title`. |
| Single paint linked per step | Already ships in `recipe_paints.paint_id`. Table stakes because this is the baseline every app builds on. | DONE | No new work — exists in current schema. |
| Ordered steps (drag to reorder) | Every structured recipe system shows steps in sequence with a clear order. Users expect to drag steps to rearrange. | MEDIUM | `order_index` column exists. UI: add drag handles to RecipeStepList using existing `@dnd-kit` (already in the project for Kanban). |
| Owned / missing paint status per step | Already ships (green/red dot on RecipeDetailSheet). Keeping it as paint ownership changes is core "at-a-glance recipe readiness". | DONE | No new work — `isPaintMissing()` already exists. |
| Per-step notes / freeform text | Citadel Colour app, PaintPad, and all surveyed apps provide a notes or description field per step. Without it, steps are too sparse for complex techniques. | DONE | `recipe_paints.notes` already exists. |
| Recipe result photo (finished model) | PaintPad, ArmyCrafter, and BrushForge all feature a finished-model hero photo on the recipe. Users need visual confirmation of what they're building toward. | LOW | Use existing `image_assets` table with `entity_type = 'recipe'`. Already supports polymorphic photos for units. No migration needed — just new query and display. |
| Per-step photo | PaintPad specifically highlights per-step photos as a differentiator that enables "full tutorials". ArmyCrafter also supports images per step. Users following a recipe at the bench need a visual reference for each stage. | MEDIUM | Add `photo_path TEXT` (or join to `image_assets` with `entity_type = 'recipe_step'`) to `recipe_paints`. The filesystem photo infrastructure already exists for unit photos. |
| Recipe metadata: difficulty + estimated minutes | Liber Pigmenta prominently features curated recipes with difficulty levels and time estimates per step. Citadel Colour app does not have these, which is cited as a UX gap in reviews. Users deciding "what to paint tonight" need to know if a recipe fits in 45 minutes or 4 hours. | LOW | Add `difficulty TEXT` (easy / medium / advanced) and `estimated_minutes INTEGER` to `painting_recipes`. Add `step_minutes INTEGER` to `recipe_paints`. Rollup total from steps automatically. |
| Recipe style and surface metadata | Liber Pigmenta, BrushForge, and ArmyCrafter all categorize recipes by what they achieve (NMM, OSL, speedpaint, display, tabletop) and what surface they target (armor, skin, cloth, basing). This enables filtering "show me fast tabletop armor recipes for Space Marines". | LOW | Add `style TEXT`, `surface TEXT`, `effect TEXT` columns to `painting_recipes`. Values are enums: style = clean / grimdark / speedpaint / display / tabletop / tabletop+ / eavy-metal / custom; surface = armor / skin / cloth / weapon / leather / metal / lens / glow / base / weathering / other; effect = plasma-glow / rust / dust / battle-damage / NMM / OSL / edge-highlight / recess-shade / other. |
| Recipe card view (not just table rows) | PaintPad and BrushForge both use card-based recipe browsing with color swatch strip and photo thumbnail. The existing RecipeTable is a plain table. A card view with swatches (v2.3 already ships on RecipesPage) is expected in any visual hobby app. | DONE/EXTEND | Swatch strip already on recipe cards (v2.3). Extend to include difficulty badge, style tag, and estimated time on the card face. No new infrastructure. |
| Duplicate recipe action | PaintPad and BrushForge both offer recipe duplication. Users who paint the same model type across multiple factions (e.g., "same red armor, different chapter colors") expect to duplicate a recipe and tweak it rather than start from scratch. | LOW | Pure application logic: read recipe + all steps, INSERT copies with new `recipe_id`. No new schema. |
| Filter by surface, style, difficulty, missing paints | BrushForge and PaintPad filter recipes by style and surface. Liber Pigmenta filters by game system and model type. Users with 50+ recipes need filters beyond faction/unit/area. | LOW-MEDIUM | Extend existing Zustand recipe filter store. New filter fields: `surface`, `style`, `difficulty`, `has_missing_paints` (boolean derived). All data exists after schema extension. |

### Differentiators (Competitive Advantage)

Features that no surveyed competitor combines in a local-first desktop personal tool.
HobbyForge's unique position is the integration between recipe, unit, project, session, and paint inventory in one local system.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Paint availability summary per recipe (owned / missing / running low count) | PaintPad and paintRack show a shopping list for missing paints. HobbyForge already has the owned/running-low/wishlist flags on every paint. A "you have 7/9 paints, 1 missing, 1 running low" summary on the recipe card before you start is immediately actionable — no competitor surfaces this as a card-level indicator in a personal desktop tool. | MEDIUM | Derive from JOIN of `recipe_paints` → `paints`. Count: total steps with paint linked, count owned (paints.owned=1), count running_low, count missing. Display as badge or mini-status bar on card and detail view. |
| Paint substitution per step (alternative paint) | ArmyCrafter and paintRack have cross-brand conversion databases. PaintPad allows substitution notes. HobbyForge's local inventory approach enables something unique: "this step calls for Agrax Earthshade — you own Nuln Oil (similar dark wash) — substitute?" This removes the need for an external conversion chart for users who already have their paint catalog in the app. | MEDIUM | Add `alt_paint_id INTEGER REFERENCES paints(id)` to `recipe_paints`. Display alt paint in step with a "substitute if you have it" indicator. Does not require cross-brand matching database — user manually assigns substitutes. |
| Recipe-to-session linkage: log which recipe/step you worked on | BrushForge has project tracking linked to recipes. Brushrage tracks painting sessions by time. No competitor allows "log a painting session and mark which recipe step you completed." This closes the loop: recipe informs session, session tracks progress on recipe. | HIGH | Extend `painting_sessions` table (or create a new join table `session_recipe_steps`) to record `recipe_id`, `step_id`, `step_completed INTEGER (0/1)`. LogSessionSheet (already ships) gains a recipe selector and step checklist. Session completion can roll up into a recipe "completion %" display. |
| Step completion tracking (which steps done on which unit) | Liber Pigmenta offers full-screen painting session mode where you navigate phase by phase and mark steps complete on individual models. No local-first desktop tool surveyed does this at step level. For a user painting 20 Tactical Marines to the same recipe, knowing "I've done primer + basecoat on 15, shade on 8, highlight on 3" is a genuine workflow aid. | HIGH | Requires a `recipe_step_progress` table: `unit_id`, `recipe_paint_id` (step), `completed INTEGER`, `completed_at TEXT`. High complexity: new table + query + hook + UI. Likely Phase 2 within the milestone, not Phase 1. |
| Studio view: step-by-step timeline detail (not just a sheet) | Citadel Colour app has a side-scrolling "Paint by Model" guide per model. Liber Pigmenta has full-screen recipe navigation. PaintPad renders each recipe as a readable tutorial page. The current RecipeDetailSheet is a compact sidebar list. A full-page studio view where each step is a card with phase badge, paint swatch, tool, technique, step photo, and notes is a qualitative UX leap that competitors only achieve through separate native apps. | MEDIUM | New RecipeStudioPage or panel-style detail. Each step rendered as a card: phase badge, paint swatch (hex_color), tool icon, technique, step photo, step notes, owned/missing indicator, alt paint. Route: `/recipes/:id` or a full-panel mode toggled from RecipesPage. |
| "Start from template" action | BrushForge has a recipe generator. ArmyCrafter has community recipes you can fork. HobbyForge can offer a simpler local-first version: built-in recipe templates for common techniques (e.g., "Tabletop Space Marine", "Speedpaint Skin", "NMM Gold") that pre-populate steps. User owns and modifies the copy — no network, no AI. | MEDIUM | Store templates as seed data or as a special `is_template INTEGER DEFAULT 0` flag on `painting_recipes`. Template recipes are read-only in the UI; user can "Start from template" to create an editable copy. 3–5 canonical templates cover 80% of use cases. |
| Used-in projects section on recipe detail | No surveyed competitor links recipes back to which units/projects are using them bidirectionally. HobbyForge already has `units.recipe_id` (added in v2.4). Showing "This recipe is used by: Fire Warriors (3/10 painted), Ethereal (done)" on the recipe detail makes the recipe feel alive and contextual, not just a reference card. | LOW | Simple JOIN: `SELECT units.name, units.painting_percentage FROM units WHERE units.recipe_id = ?`. Already achievable with v2.4 schema if `recipe_id` FK is confirmed on units. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| AI recipe generation ("write a recipe for Tau armor") | BrushForge offers this as a premium AI feature. Users ask for it. | Violates local-first / no-network constraint in PROJECT.md. Explicitly listed as out of scope. AI-generated paint names can hallucinate non-existent paints. | Manual recipe entry with template starting points (see "Start from template" differentiator above). 3–5 built-in templates reduce blank-canvas friction. |
| Cross-brand paint substitution database (auto-suggest Vallejo equivalent for every Citadel paint) | Users want to substitute OOP or unavailable paints. External tools like ModelShade and ArmyCrafter do this. | Requires maintaining a curated database of thousands of paint equivalences across 10+ brands. A living data set — constantly changing as brands update ranges. Not buildable offline without bundling a large static database that will go stale. | Manual `alt_paint_id` substitution per step: user assigns their own substitutes from their personal paint inventory. Works offline, never stale, zero maintenance. |
| Recipe sharing / export to community | PaintPad and ArmyCrafter are built around community recipe discovery. Users who want to share ask for this. | HobbyForge is explicitly personal and local-first. Sharing requires accounts, cloud backend, moderation, UGC storage. Fundamentally incompatible with architecture. | Recipe detail page is printable / screenshottable. A future "export to JSON/PDF" milestone could enable sharing via file. |
| Video step embeds (YouTube tutorial per step) | ArmyCrafter supports video per step. Users follow YouTube tutorials while painting. | Embedding video requires a media player, network call for YouTube embeds, or local video file management. Local video is large; YouTube embed violates no-network constraint. | `tutorial_link TEXT` field already exists on `painting_recipes`. Link-out to external video on click. Surface the existing link more prominently in Studio view. |
| Recipe "rating" or "favourite" system | PaintPad has recipe starring. Community platforms have ratings. | For a single-user personal tool, a rating system serves no purpose — there's no community to rate against and no competing recipes you didn't create. Adds UI surface for zero information gain. | Order recipes by `updated_at` recency or by linked unit / faction for quick access. Filter + sort covers the "find my best recipe" use case. |
| Automatic paint quantity tracking per session (deduct from inventory) | Users want paint quantity to decrease as they use it. | Paint consumption is highly variable (dilution ratio, model size, technique). Automatic deduction will be wrong. Forced deduction adds friction to session logging. | Manual `running_low INTEGER` flag on paints (already exists). User sets it manually when they notice a paint getting low. |

---

## Feature Dependencies

```
Recipe metadata (style, surface, effect, difficulty, estimated_minutes)
    requires──> Schema migration: ADD COLUMN to painting_recipes
    enables──> Extended filters (style, surface, difficulty)
    enables──> Difficulty badge + time display on recipe card

Step title + phase
    requires──> Schema migration: ADD COLUMN title, phase to recipe_paints
    enables──> Step phase badge in Studio view
    enables──> Phase-grouped step timeline

Per-step minutes
    requires──> Schema migration: ADD COLUMN step_minutes to recipe_paints
    enables──> Auto-computed estimated_minutes rollup on recipe

Alt paint substitution
    requires──> Schema migration: ADD COLUMN alt_paint_id to recipe_paints
    reads from──> paints (owned, name, hex_color)
    requires──> Step title + phase (step must be structured first)

Per-step photo
    requires──> Schema migration: ADD COLUMN photo_path to recipe_paints
    OR uses existing image_assets (entity_type='recipe_step', entity_id=recipe_paints.id)
    enables──> Studio view with visual step-by-step guide

Recipe result photo
    uses existing──> image_assets (entity_type='recipe', entity_id=recipe.id)
    no migration needed
    enables──> Recipe card hero photo

Studio view (RecipeStudioPage)
    requires──> Step title + phase (to render structured cards)
    requires──> Per-step photo (for full tutorial value)
    enhances──> Alt paint substitution display
    enhances──> Per-step minutes display

Paint availability summary
    reads from──> recipe_paints JOIN paints (owned, running_low)
    no migration needed after step columns added
    enables──> Recipe card readiness badge

Recipe-to-session linkage
    requires──> Schema migration: new columns on painting_sessions
                OR new table session_recipe_steps
    requires──> Recipe steps be structured (title + phase first)
    extends──> LogSessionSheet (add recipe selector + step checklist)
    enables──> Step completion tracking rollup on studio view

Step completion tracking (per unit)
    requires──> New table: recipe_step_progress (unit_id, recipe_paint_id, completed, completed_at)
    requires──> Recipe-to-session linkage (sessions trigger completion marks)
    enables──> "X/Y steps done" progress on unit detail and studio view
    HIGH complexity — Phase 2 within milestone

Start from template
    requires──> is_template flag OR seed data in painting_recipes
    requires──> Duplicate recipe action (templates are duplicated, not edited)
    LOW complexity — implement after duplicate action

Duplicate recipe action
    no schema change needed
    requires──> Step structure in place to copy correctly (copy steps with all new columns)
    LOW complexity — implement early

Used-in projects section
    reads from──> units (recipe_id FK — confirmed added in v2.4)
    no migration needed if recipe_id on units is confirmed
    LOW complexity — simple JOIN query

Extended filters (surface, style, difficulty, missing paints)
    requires──> Recipe metadata columns exist (surface, style, difficulty)
    requires──> Paint availability summary computed
    extends──> Zustand recipe filter store

Recipe ↔ session ↔ unit integration on dashboard
    requires──> Recipe-to-session linkage
    extends──> CurrentFocusCard (show recipe + current step)
    extends──> Kanban cards (show recipe name + steps-done count)
```

### Dependency Notes

- **Schema migration is the first task.** All structured recipe features depend on new columns in `recipe_paints` (title, phase, step_minutes, alt_paint_id, photo_path) and `painting_recipes` (style, surface, effect, difficulty, estimated_minutes). These should go in a single migration file: `012_recipes_v2.sql`. Existing data must not be dropped — old `step_name` maps to new `title`, flat phase TEXT columns become read-only legacy fields that the new step model supersedes.

- **Duplicate recipe action must be implemented before templates.** Templates are just seed recipes that get duplicated on "Start from template." Building duplicate first gives templates for free.

- **Session-recipe linkage is the highest-complexity new feature.** It requires extending `painting_sessions` (or a new join table) AND extending LogSessionSheet. It also requires step structure to already exist. Schedule this as Phase 2 or Phase 3 within the milestone, not Phase 1.

- **Step completion tracking depends on session linkage.** It is Phase 3 territory at the earliest. The studio view itself (phase 1 or 2) should be useful without step completion — the two are independent UX flows.

- **Per-step photo vs image_assets:** Using `image_assets` with `entity_type='recipe_step'` and `entity_id=recipe_paints.id` is consistent with existing image infrastructure and adds zero new schema. Using a direct `photo_path TEXT` column on `recipe_paints` is simpler to query. Recommend `photo_path TEXT` on `recipe_paints` as the simpler local-first approach — `image_assets` polymorphism is designed for timeline galleries, not embedded step thumbnails.

---

## MVP Definition

### Phase 1 — Structured Recipe Core (must ship first)

Minimum needed to make Recipes 2.0 meaningfully different from the flat system.

- [ ] Schema migration: `title`, `phase`, `step_minutes`, `photo_path`, `alt_paint_id` on `recipe_paints`; `style`, `surface`, `effect`, `difficulty`, `estimated_minutes` on `painting_recipes`
- [ ] RecipeFormSheet extended to capture new metadata fields (style, surface, difficulty, estimated time)
- [ ] RecipeStepRow extended: title input, phase selector (dropdown), step minutes, optional alt paint combobox
- [ ] Studio view (step-by-step timeline) replacing the flat step list in RecipeDetailSheet
- [ ] Recipe result photo (via image_assets) on recipe card and studio view header
- [ ] Per-step photo capture and display in studio view
- [ ] Paint availability summary badge on recipe cards (owned/missing count)
- [ ] Duplicate recipe action
- [ ] Extended filters (surface, style, difficulty, has_missing_paints)

### Phase 2 — Inventory Integration + Session Linkage

Add after Phase 1 is stable and in use.

- [ ] Alt paint substitution display in studio view with owned indicator
- [ ] Session-recipe linkage: extend LogSessionSheet to select recipe + mark steps worked on
- [ ] Start from template (3–5 built-in templates)
- [ ] Used-in projects section on recipe detail (JOIN via units.recipe_id)
- [ ] Recipe name + step-done count on Kanban cards and CurrentFocusCard

### Phase 3 — Advanced Tracking (defer until Phase 2 validated)

- [ ] Step completion tracking per unit (new `recipe_step_progress` table)
- [ ] Recipe completion % rollup on unit detail sheet
- [ ] "Paint with me" mode: full-screen step navigation for bench use

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Schema Change | Priority |
|---------|------------|---------------------|---------------|----------|
| Schema migration (new columns) | Enabler | LOW | YES — single migration | P1 |
| Step title + phase selector | HIGH | LOW | YES (migration) | P1 |
| Style / surface / difficulty metadata | HIGH | LOW | YES (migration) | P1 |
| Duplicate recipe action | HIGH | LOW | None | P1 |
| Studio view (step-by-step timeline) | HIGH | MEDIUM | Requires new columns | P1 |
| Recipe result photo | HIGH | LOW | None (uses image_assets) | P1 |
| Per-step photo | HIGH | MEDIUM | photo_path column | P1 |
| Paint availability summary | HIGH | MEDIUM | None after migration | P1 |
| Extended filters | HIGH | LOW-MEDIUM | Requires metadata columns | P1 |
| Alt paint substitution | MEDIUM | MEDIUM | alt_paint_id column | P2 |
| Session-recipe linkage | HIGH | HIGH | YES — new table or columns | P2 |
| Start from template | MEDIUM | LOW (after duplicate) | is_template flag | P2 |
| Used-in projects section | MEDIUM | LOW | None (uses units.recipe_id) | P2 |
| Step completion per unit | MEDIUM | HIGH | YES — new table | P3 |
| Full-screen painting mode | LOW | HIGH | None | P3 |

**Priority key:**
- P1: Required for Recipes 2.0 to feel structurally different from flat notes
- P2: Workflow integration — makes recipes actionable in context
- P3: Advanced tracking — defer until P1+P2 validated

---

## Competitor Feature Comparison

| Feature | Citadel Colour app | PaintPad | BrushForge | Liber Pigmenta | ArmyCrafter | HobbyForge v2.5 Approach |
|---------|-------------------|----------|------------|----------------|-------------|--------------------------|
| Step-by-step phases | YES (Contrast / Classic method) | YES (any structure) | YES (grouped steps) | YES (7-step wizard) | YES (user-defined) | Phase enum on each step in recipe_paints |
| Per-step photo | NO | YES | YES | NO | YES | photo_path on recipe_paints |
| Difficulty + time estimate | NO (gap noted in reviews) | NO | NO (only category) | YES — both difficulty + time | NO | Both columns on painting_recipes |
| Paint inventory integration | NO (only GW paints shown) | YES (ownership tracking) | YES (owned paints) | YES (paint requirements) | NO | Derives from existing paints table owned/running_low flags |
| Paint substitution | NO | Notes field only | NO | NO | Cross-brand DB | Manual alt_paint_id per step — local, no DB needed |
| Recipe duplication | NO | YES | YES | YES | YES (fork community recipe) | Duplicate action — INSERT copy of recipe + all steps |
| Session linkage | NO | NO | Partial (project tracking) | YES (session navigation per step) | NO | Extend LogSessionSheet with recipe + step selectors |
| Used-in / linked units | NO | NO | Partial | NO | NO | JOIN via units.recipe_id (confirmed v2.4) |
| Template / starter recipes | YES (official GW guides) | Community recipes | YES (AI generator) | YES (curated recipes) | YES (community) | Local seed templates + "Start from template" action |
| Result photo | YES (model showcase) | YES | YES | YES | YES | image_assets entity_type='recipe' |
| Studio / full-page view | YES (app-wide) | YES (tutorial page) | YES (recipe builder) | YES (full-screen session) | NO | RecipeStudioPage or full-panel recipe detail |

---

## Existing Infrastructure to Reuse

The following is already built and should NOT be reimplemented:

| Existing Piece | How Recipes 2.0 Reuses It |
|----------------|---------------------------|
| `image_assets` table (polymorphic photos) | Recipe result photo: `entity_type='recipe'`. Step photo can use `photo_path TEXT` column as simpler alternative. |
| `@dnd-kit` (Kanban drag-and-drop) | RecipeStepList drag-to-reorder using same DndContext + SortableContext pattern |
| `PaintCombobox` component | Extend for `alt_paint_id` picker — already searches paint inventory |
| Zustand recipe filter store | Extend with new filter fields (surface, style, difficulty, has_missing_paints) |
| `isPaintMissing()` utility | Reuse for per-step owned indicator in studio view |
| LogSessionSheet | Extend with recipe + step selection fields for session linkage |
| `recipe_paints` join table | Extend in-place with new columns; existing data preserved |
| `painting_recipes` table | Extend in-place with new columns; no data loss |
| RecipeFormSheet | Extend with new metadata section (style / surface / difficulty / estimated time) |
| RecipeDetailSheet | Replace flat step list with studio timeline component; keep Sheet wrapper and FK details |
| `units.recipe_id` FK (added v2.4) | Used-in section on recipe detail — simple JOIN already queryable |

---

## Sources

- Citadel Colour: The App (Google Play / App Store, ageofminiatures.com review) — step structure, Paint by Model, classic vs contrast guide system
- PaintPad (paintpad.app) — per-step photos, recipe-as-tutorial pattern, starred recipes, community discovery
- paintRack (Google Play / App Store) — paint set model for recipes, owned/missing integration, 27,000+ paint library
- BrushForge (brushforgeapp.com) — AI recipe generator, project-step linkage, mixes with notes, step completion tracking
- Liber Pigmenta (liberpigmenta.com) — 7-step wizard, difficulty + time estimates, full-screen painting session mode, distraction-free step navigation
- ArmyCrafter (armycrafter.com) — community recipes, cross-brand paint alternatives, image-per-step tutorials
- Brushrage (Play Store) — session-by-session time tracking on bar chart, paint + recipe integration
- Hobby Color Converter (Google Play) — cross-brand paint equivalence (informs why manual alt_paint_id is preferable to auto-matching DB)
- ModelShade, Herrick Games Paint Chart — paint substitution database scope (confirms maintaining one is infeasible offline)
- DakkaDakka / Warhammer 40K community forums — "what makes a recipe useful at the bench" pain points
- HobbyForge PROJECT.md — confirmed schema baseline, constraints, and out-of-scope items
- HobbyForge v3.0-ROADMAP.md — v2.5 / Milestone 3.1 requirements definition

---

*Feature research for: HobbyForge v2.5 — Recipes 2.0 / Painting Studio*
*Researched: 2026-05-06*
