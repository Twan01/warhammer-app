# Feature Landscape

**Domain:** Warhammer miniature painting workflow semantics and section-aware integrations
**Researched:** 2026-05-11
**Milestone:** v0.2.9 Recipes 3.1 / Workflow Semantics & Integrations

## Existing Foundation (Already Built)

Before feature classification, critical context on what exists:

| Component | Current State | Key Files |
|-----------|--------------|-----------|
| Recipe sections | `recipe_sections` table with name, surface, optional, notes, order_index | `types/recipeSection.ts`, migration 018 |
| Recipe steps | `recipe_steps` with painting_phase, tool, technique, dilution, time_estimate_minutes, step_photo_path, alt_paint_id, section_id FK | `types/recipePaint.ts` |
| SectionedTimeline | Renders section headers (name, surface badge, optional badge, step count, time, paint availability) with per-section step timelines | `features/recipes/SectionedTimeline.tsx` |
| LogSessionSheet | Recipe + Step selectors (flat, no section grouping). Step cleared on recipe change. Saves recipe_id + recipe_step_id on session | `features/dashboard/LogSessionSheet.tsx` |
| KanbanCard | Shows recipe name, photo count, next-action hint via `getNextActionHint(status_painting)` -- status-based only, no recipe/section awareness | `features/painting-projects/KanbanCard.tsx` |
| CurrentFocusCard | Shows recipe name + extra recipe count. Next action via painting status only, no section/step awareness | `features/dashboard/CurrentFocusCard.tsx` |
| getNextActionHint | Pure status-to-string lookup (`PaintingStatus -> string`). Hardcoded hints like "Apply base coat", "Apply shade" | `features/dashboard/getNextActionHint.ts` |
| DraftSection | Form-level representation with localId, name, surface, optional, notes, steps[] | `features/recipes/recipeSection.ts` |
| Painting phases | `["prime", "basecoat", "shade", "layer", "highlight", "glaze", "weathering", "basing", "varnish", "other"]` | `features/recipes/recipeSchema.ts` |
| Recipe surfaces | `["Armor", "Skin", "Cloth", "Metal", "Bone", "Leather", "Wood", "Stone", "Energy/Glow", "Fur/Hair", "Eyes/Lenses", "Base", "Weapon", "Other"]` | `features/recipes/recipeSchema.ts` |

## Table Stakes

Features users expect given the existing recipe section model. Missing = sections feel like dumb grouping with no workflow value.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Section-type metadata** (`section_type` column) | Sections already have `surface` but no semantic meaning. Users need to know "is this a prep section, a painting section, or a finishing section?" to understand workflow intent | Low | Migration on `recipe_sections` | Use enum: `prep`, `basecoat`, `shade`, `layer`, `detail`, `effect`, `finishing`. Aligns with existing PAINTING_PHASES granularity but at the section level |
| **Execution mode** (`execution_mode` column) | Hobbyists batch-paint (do all basecoats at once across all surfaces) vs sequential (finish one surface completely). Section must declare this so workflow guidance makes sense | Low | Migration on `recipe_sections` | Use enum: `sequential` (default), `batch`, `parallel`. Sequential = do steps in order; batch = do this section's step across all models; parallel = can interleave with other sections |
| **Section `technique` column** | The dominant technique for a section (distinct from step-level technique). "This section is primarily drybrushing" vs "this section is primarily layering" | Low | Migration on `recipe_sections` | Reuse step-level technique values or similar set. Optional field, nullable |
| **Section `applies_to` column** | "Which part of the model does this section target?" -- already partially covered by `surface` but `applies_to` is more specific ("left pauldron", "cloak interior", "weapon blade") | Low | Migration on `recipe_sections` | Free text, nullable. Complements `surface` (broad category) with specific area targeting |
| **Compact metadata badges in SectionedTimeline** | Once sections have workflow metadata, the timeline must surface it compactly. Users scanning a recipe need to see section_type + execution_mode at a glance | Low | Section metadata columns exist | Small Badge additions to existing section header row. Pattern already established with surface + optional badges |
| **LogSession section-aware cascading selector** | Currently: Recipe -> Step (flat list). With sections, users expect Recipe -> Section -> Step so they can locate where they are in a multi-section recipe | Medium | Sections query hook exists (`useRecipeSections` or equivalent) | Three-level cascading select: recipe clears section, section clears step. Each level filters the next. Existing pattern: recipe clears step already |
| **Workflow metadata editing UI** | Users need to set section_type, technique, execution_mode, applies_to when creating/editing sections. Must not clutter the default experience | Low | Migration + DraftSection update | Progressive disclosure: show advanced fields under a "Workflow" collapsible in RecipeSectionCard. Same pattern as existing optional/notes fields |

## Differentiators

Features that set HobbyForge apart from PaintMyMinis, paintRack, Paint Pad, and other miniature painting apps. Not expected, but high value.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Kanban card section-aware next step** | Instead of generic "Apply base coat" from painting status, show the actual next recipe step: "Armour: Shade with Nuln Oil". No other miniature app does project-level recipe-aware guidance on a kanban board | Medium | Needs: a way to determine "current step" for a unit's recipe. Derive from last logged session's step + section | Key design decision: derive progress from session history (implicit) vs explicit "mark step done" (explicit). Implicit is lower friction but less accurate. Recommend implicit -- good enough for personal tool |
| **CurrentFocus section-aware guidance** | CurrentFocusCard shows "Next: Armour section -- Layer Highlight (step 4/12)" instead of generic status hint. Transforms the dashboard from status display to workflow navigator | Medium | Same "current step" derivation as Kanban | Must handle: no recipe linked, recipe has no sections, section complete, all sections complete |
| **Workflow-aware session duration estimates** | When logging a session, show "estimated remaining: ~45 min (3 sections left)" based on section time estimates | Low | Section time_estimate_minutes aggregation (already available in steps) | Can show total recipe remaining time even without progress tracking -- just sum all step time estimates |
| **Section skip tracking** | Optional sections (optional=1) can be explicitly skipped in the workflow display, showing them as "skipped" rather than "pending" | Low | Minimal -- just a UI convention on optional sections | Small UX: greyed-out badge on optional sections in Kanban/Focus hints |

## Anti-Features

Features to explicitly NOT build in v0.2.9.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Explicit step-by-step completion checkboxes** | Turns a creative hobby tool into a checkbox app. Painters don't paint linearly -- they revisit, skip, improvise. Granular step tracking creates guilt and friction | Derive progress from session logs (implicit). Show "last worked on" not "steps remaining" |
| **Automated painting status advancement** | Automatically moving a unit from "Basecoated" to "Shaded" based on recipe sections completing feels robotic and will be wrong for multi-recipe units | Keep status updates manual via LogSessionSheet's existing "Update Painting Status" dropdown |
| **Section templates / shared section library** | Over-engineering for a personal tool. "Save this section as a template" adds significant schema complexity for a feature a single user won't use often | Recipe duplication (already built) handles reuse. Copy a recipe, modify sections |
| **Real-time timer integration** | A painting timer embedded in the session log sounds useful but breaks flow -- painters don't start and stop cleanly. They paint while watching TV, take breaks, switch models | Keep duration_minutes as manual entry. Time estimates on sections serve planning, not tracking |
| **Multi-recipe parallel progress** | Tracking progress across multiple recipes applied to one unit simultaneously (e.g., "Armour recipe" + "Weapons recipe") | Support one active recipe per unit for progress derivation. Additional recipes are reference-only |
| **Section dependency graphs** | "You can't start the Highlight section until Shade section is complete" -- over-constraining for a hobby | execution_mode (sequential/batch/parallel) provides soft guidance without hard enforcement |
| **Section progress tracking table** | A dedicated `unit_recipe_progress` table tracking per-step completion per unit -- high schema complexity for v0.2.9 | Derive "current position" from last logged session's step_id. Explicit progress tracking deferred to v0.3.0+ if needed |

## Feature Dependencies

```
Migration (section_type, technique, execution_mode, applies_to)
    |
    +---> DraftSection update (add new fields to form state)
    |         |
    |         +---> Workflow metadata editing UI (progressive disclosure in RecipeSectionCard)
    |         |
    |         +---> Compact metadata display in SectionedTimeline (badges)
    |
    +---> LogSession section-aware cascade
    |         |
    |         +---> Section selector between Recipe and Step selectors
    |         |     (needs sections query filtered by recipe_id)
    |         |
    |         +---> Step selector filtered by section_id (not just recipe_id)
    |
    +---> Kanban card workflow display
    |         |
    |         +---> "Current section + step" derivation logic (pure function)
    |         |     (needs: unit's recipe, recipe's sections+steps, unit's last session)
    |         |
    |         +---> KanbanCard UI update (replace generic hint with recipe-aware hint)
    |
    +---> CurrentFocus workflow display
              |
              +---> Same derivation logic as Kanban (shared utility)
              |
              +---> CurrentFocusCard UI update (section-aware next action line)
```

**Critical path:** Migration -> DraftSection -> Form UI + Timeline display can proceed independently from LogSession cascade and Kanban/Focus integration. The latter two share a derivation function and can be built together.

## MVP Recommendation

**Phase 1 -- Schema + Form + Display (Low risk, foundational)**
1. Migration adding 4 columns to recipe_sections
2. DraftSection + RecipeSectionCard form updates (progressive disclosure)
3. SectionedTimeline compact metadata badges

**Phase 2 -- LogSession Cascade (Medium risk, isolated)**
4. Section-aware cascading selectors in LogSessionSheet
5. Step list grouped/filtered by selected section

**Phase 3 -- Kanban + CurrentFocus Integration (Medium risk, shared logic)**
6. "Current workflow position" derivation utility (pure function: given recipe sections, steps, and last session -> next section + step)
7. KanbanCard section-aware next step display
8. CurrentFocusCard section-aware guidance

**Defer to v0.3.0+:**
- Section progress tracking table (High complexity, needs its own milestone)
- Section skip tracking (depends on progress tracking)

**Rationale:** The MVP adds semantic richness (metadata) and improves an existing interaction (LogSession) without requiring a new progress-tracking data model. The Kanban/Focus integration uses implicit derivation (last session) rather than explicit progress, keeping complexity contained.

## Detailed Feature Notes

### Section Type Enum Values

Based on the Warhammer painting workflow (prime -> basecoat -> shade -> layer -> highlight -> glaze -> weathering -> basing -> varnish) and how painters organize sections:

| Value | Meaning | Example Section |
|-------|---------|----------------|
| `prep` | Surface preparation before painting | "Assembly Cleanup", "Priming" |
| `basecoat` | Initial color application | "Armour Basecoats", "Skin Base" |
| `shade` | Wash/shade application | "Recess Shading", "Panel Lining" |
| `layer` | Building up color, layering/highlighting | "Armour Highlights", "Edge Highlights" |
| `detail` | Fine detail work (eyes, gems, insignia) | "Face Details", "Chapter Markings" |
| `effect` | Special effects (OSL, NMM, weathering, blood) | "Weathering", "Battle Damage" |
| `finishing` | Final steps (basing, varnish, decals) | "Basing", "Varnish Coat" |

This is intentionally coarser than step-level `painting_phase`. A section groups multiple steps; its type describes the workflow stage, not individual paint application.

### Execution Mode Values

| Value | Meaning | When Used |
|-------|---------|-----------|
| `sequential` | Complete this section's steps in order before moving on | Default. Most sections work this way |
| `batch` | Apply this section's technique across all models before next section | Batch painting: "basecoat all armour on all 10 models" |
| `parallel` | This section can be done alongside other sections | Independent areas: "you can do weapons while armour dries" |

### "Current Step" Derivation Logic

The key design challenge for Kanban/Focus integration. Proposed algorithm:

```
Input: unit_id, recipe_id
1. Get all sections (ordered) + steps (ordered within section)
2. Get last painting_session where recipe_id matches and recipe_step_id is not null
3. Find that step's position in the section/step tree
4. Return next step (or next section's first step if section complete)
5. Fallback: if no session logged with step, return first step of first non-optional section
```

This is implicit progress -- derived from session history, not explicit checkboxes. It will be wrong sometimes (user painted step 5 but didn't log the session for steps 3-4), but it is zero-friction and good enough for a personal tool.

### LogSession Cascade UX

Current flow: Unit -> (Recipe) -> (Step) -> Date -> Duration -> Notes

New flow: Unit -> (Recipe) -> **(Section)** -> (Step) -> Date -> Duration -> Notes

- Section selector appears only when recipe is selected (same pattern as step selector)
- Section selector shows: section name + section_type badge + step count
- Step selector appears only when section is selected
- Step selector filtered to selected section's steps only
- Changing recipe clears section and step (existing pattern extended)
- Changing section clears step
- All three (recipe, section, step) remain optional -- user can log a session with just a recipe, or recipe+section, or full recipe+section+step

## Sources

- [PaintMyMinis](https://www.paintmyminis.de/) -- miniature painting recipe app with color planning and technique tracking
- [Miniature Paint Recipe Manager](https://apps.apple.com/us/app/miniature-paint-recipe-manager/id6747835376) -- iOS recipe app with mixing percentages and paint scanning
- [paintRack](https://play.google.com/store/apps/details?id=com.courageousoctopus.paintrack) -- paint inventory with custom recipe sets
- [Paint Pad](https://paintpad.app/) -- recipe sharing platform with 6700+ paint database
- [Gamer's Grove: Warhammer Painting Guide](https://gamersgrove.com/blogs/front-page/warhammer-painting-how-to-use-base-shade-and-layer-paints) -- canonical basecoat/shade/layer workflow
- [Goonhammer Hobby 101: Batch Painting](https://www.goonhammer.com/hobby-101-batch-painting/) -- batch vs sequential workflow patterns
- Existing codebase analysis (HIGH confidence -- direct code reading)
