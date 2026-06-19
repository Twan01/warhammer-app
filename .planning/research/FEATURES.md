# Feature Research

**Domain:** Reusable parameterized painting technique library for a single-user hobby management desktop app (HobbyForge v0.7.0)
**Researched:** 2026-06-19
**Confidence:** HIGH — grounded in existing codebase (recipe schema, section/step data model, five-phase diff save, recipe_step_id-keyed progress), real 40K technique knowledge, and analogous patterns from Figma's component/override model and Adobe's template systems.

---

## Context: What Already Exists

The recipe model already has:
- `painting_recipes` -> `recipe_sections` -> `recipe_steps` (sections have `section_type`, `technique`, `execution_mode`, `applies_to`; steps have `painting_phase`, `tool`, `technique`, `dilution`, `time_estimate_minutes`, `paint_id`, `alt_paint_id`, `step_photo_path`)
- `RECIPE_EFFECTS` const: `OSL | NMM | TMM | Zenithal | Wet Blend | Contrast | Dry Brush | Other` — today a cosmetic label on the recipe, not structural
- Progress keyed by `recipe_step_id` (not order_index) — the load-bearing identity invariant from v0.2.13
- Five-phase diff save that preserves section/step IDs across edits
- Painting Mode: full-page step-by-step execution with keyboard shortcuts, keyed to `recipe_step_id`
- Paint availability calculation (owned/missing per step via `paint_id` join)
- Apply-to-units flow with per-unit step progress keyed by `recipe_step_id`

The v0.7.0 feature promotes the today-cosmetic `effect` label and the section `technique` text field into real, reusable, colour-parameterised structures.

---

## Feature Landscape

### Category A — Technique Authoring

Features for creating and editing a technique in the technique library.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create a named technique with full section+step structure | If you can't build OSL once and reuse it, the library is useless | HIGH | Same DraftSection/DraftStep model as RecipeFormSheet; reuse existing form components |
| Define named colour slots on a technique | The entire parameterisation premise: "Glow Core / Glow Mid / Glow Edge" for OSL rather than hard-coded paints | MEDIUM | New entity: `technique_colour_slots` table; a slot has `id`, `technique_id`, `name`, `role_hint` (e.g. "darkest shadow"), `order_index` |
| Reference a colour slot from a step instead of a fixed `paint_id` | Steps need to say "apply Glow Core here" not "apply Abaddon Black" | MEDIUM | Steps get a nullable `technique_slot_id` FK; existing `paint_id` stays for non-slot steps |
| Edit technique structure (add/remove/reorder sections and steps) | Authors need to iterate; OSL might need a new "Ambient Bleed" step after "Glow Edge" | HIGH | Reuse five-phase diff save pattern; must produce stable `technique_step_id` for all existing instances |
| Delete a technique with safety check | Prevent orphaned slot mappings; warn if technique is used by N recipes | LOW | Count-based confirm dialog (same pattern as recipe delete) |
| Technique metadata: name, description, effect category, difficulty, estimated time | Library browsability requires at minimum a name and difficulty label | LOW | Mirror recipe metadata shape; `effect` maps to existing `RECIPE_EFFECTS` const |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Role hint per colour slot | "Shadow / Midtone / Highlight / Accent" hints help the user pick the right paint when filling slots — especially for OSL where Glow Edge should always be brighter than Glow Mid | LOW | Free-text or enum on the slot; displayed in the slot-fill dialog |
| Step-level notes on technique steps | "Hold brush perpendicular to edge; 2:1 Lahmian Medium dilution" — technique-specific advice every instance inherits | LOW | `notes` column already on `recipe_steps`; technique steps carry same column |
| Reference photo / result photo on a technique | Show what finished NMM gold looks like before the user commits to applying it | LOW | `result_photo_path` already on `painting_recipes`; same column on `techniques` |
| Duplicate a technique | Start "NMM Gold v2" from an existing "NMM Gold" | LOW | Same duplicateRecipe pattern; also duplicates slots and steps |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Import / export technique files | Share OSL recipe with a friend via file | For a single-user local tool this adds significant surface area (serialisation, versioning, import validation) for zero in-app value | Defer; the backup/restore feature already handles full data portability |
| Community technique library / cloud sync | Download popular NMM recipes | Explicitly out of scope: local-first, no network, no accounts per PROJECT.md | Defer to a hypothetical v2 |
| Version history on techniques | See what NMM Gold looked like before the last edit | Overkill for a personal tool; snapshot complexity rivals recipe save complexity | Duplication ("NMM Gold v2") is sufficient; users can keep old copies |
| AI-generated technique steps | "Generate OSL technique for me" | Out of scope per PROJECT.md | Defer |

---

### Category B — Colour Slot System

The parameterisation layer: how slots are defined, named, and filled per recipe instance.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Named colour slots on a technique | Foundation of the entire feature | MEDIUM | See Category A |
| Per-recipe slot mapping: slot -> actual paint | OSL in "Ultramarine" recipe uses blue Glow Core; OSL in "Death Guard" recipe uses green | MEDIUM | New table: `recipe_technique_slot_maps` with `(recipe_technique_instance_id, slot_id, paint_id)`; each instance carries its own mapping |
| Multiple instances of the same technique in one recipe | A recipe might have two OSL sections: torch glow on weapon AND eye lens glow, with different colours | MEDIUM | Each application of a technique to a recipe is a distinct `recipe_technique_instances` row; slot maps are per instance |
| "No paint assigned" state on a slot is valid (not an error) | Users work incrementally; Painting Mode already handles paint-free steps | LOW | Null `paint_id` in slot map = unassigned; treat same as paintless step for availability calc |
| Slot map resolves to `paint_id` for all downstream consumers | Paint availability calculation, Painting Mode paint swatch, wishlist bulk-add must all read the resolved paint, not the slot | HIGH | Resolution layer: `effectivePaintId(step) = step.paint_id ?? slotMap[step.technique_slot_id]`; centralise as a pure function in `src/lib/` |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Slot fill UI shows role hints and existing paint swatch | When filling "Glow Mid" for OSL, the user sees "(midtone between Core and Edge)" and a swatch of the currently assigned paint | LOW | Enhances the apply dialog; role_hint column drives tooltip |
| Slot fill suggests recently used paints for this slot | Speeds up filling the same slot across multiple recipe applications | LOW | Query `recipe_technique_slot_maps` for paint_ids used for this slot_id across other instances |
| Bulk slot reassignment within a recipe instance | "Reassign all slots using Contrast Medium to Lahmian Medium" | MEDIUM | Bulk UPDATE on a single recipe_technique_instance_id |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Global "default colours" baked into the technique | So the user doesn't have to fill every slot | Breaks the parameterisation promise: the whole point is each recipe fills its own colours. A suggestion tooltip is sufficient | Use role hints + recent-usage suggestions instead |
| Hierarchical / nested slot inheritance | Slot inherits from parent technique's slot unless overridden | Too complex; YAGNI for a personal tool | Flat slots per instance is sufficient |

---

### Category C — Technique Library Browse

A dedicated page/section to browse, search, and manage saved techniques.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Technique list page with name, effect category, difficulty, usage count | Users need to browse before applying; "how many recipes use my OSL technique" is immediately useful | LOW | Standard EntityPage pattern; mirror RecipesPage layout |
| Filter by effect category | With OSL / NMM / Zenithal / Wet Blend all in the library, filtering by type is primary navigation | LOW | Zustand filter store; same pattern as recipe filters |
| Search by name | Immediately locate "NMM Gold v2" in a library of 20 techniques | LOW | Standard text filter |
| Usage count badge on each technique card | Shows "used in 4 recipes" — helps user decide whether editing this technique affects many recipes | LOW | JOIN count on recipe_technique_instances |
| Technique detail view: full section/step tree + all defined slots | User needs to see the full structure before applying | MEDIUM | Read-only timeline view mirroring SectionedTimeline; slots listed in a sidebar or header panel |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Recipes using this" list in technique detail | Clicking NMM Gold shows the 4 recipes currently live-linked to it — makes propagation visible | LOW | JOIN through recipe_technique_instances to painting_recipes |
| Effect badge uses existing RECIPE_EFFECTS colours/styling | Visual consistency: OSL badge in technique library matches OSL badge in Recipes page | LOW | Reuse existing Badge styling from RecipeCard |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Separate "Techniques" top-level sidebar nav entry | Give the library its own nav item | Adds sidebar noise for a feature most naturally accessed from the recipe editor. The library browse page belongs under Workshop | Access via sub-route of Recipes (/recipes/techniques) or a tab; do not inflate the sidebar |

---

### Category D — Apply / Slot-Fill UX

The flow for dropping a technique into a recipe and filling its colour slots.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| "Add Technique" action in the recipe section editor | Primary entry point: while editing a recipe, user clicks "Add technique section" and picks from the library | MEDIUM | Button in RecipeSectionCard or RecipeFormSheet toolbar; opens a technique picker dialog |
| Technique picker dialog: browse/search the library, preview slots | User needs to see OSL has 4 slots before committing | MEDIUM | Compact list + expandable slot preview; shadcn Dialog |
| Slot-fill dialog: one slot per row, paint combobox per row | After picking a technique, fill "Glow Core -> Abaddon Black", "Glow Mid -> Kantor Blue", etc. | MEDIUM | Reuse PaintCombobox; one combobox per slot; can leave slots empty and fill later |
| Applied technique appears as a named section with "from technique X" badge | Users must always know which sections are live-linked vs handcrafted | LOW | Badge/label on RecipeSectionCard; same section card component, new visual state |
| Slot-fill accessible from the recipe detail view (not just editor) | User may want to see/change colours without opening the full edit form | MEDIUM | "Edit colours" action on the technique section badge; opens slot-fill dialog in view mode |
| Applying a technique inserts its sections+steps at the chosen position | The structural result of "apply" must be visible immediately in section order | HIGH | On apply: create recipe_technique_instances row + slot_maps rows; technique steps materialise as virtual/joined rows in the recipe view, not copied rows |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Inline slot fill in Painting Mode | During execution, user sees "Slot: Glow Core -> [paint]" and can tap the swatch to reassign on the fly | MEDIUM | Painting Mode already shows paint_id swatch; extend to show slot name + resolved paint; tap opens slot-fill mini-dialog |
| Position picker when applying technique | "Insert OSL section after Base Colours section" | LOW | Position dropdown in the technique picker dialog; defaults to end |
| Preview of resolved steps before applying | See the full step list with slot names before committing | LOW | Expandable preview in the technique picker dialog |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Applying a technique copies steps as plain recipe steps (snapshot mode) | Simpler implementation; avoids live-link complexity | Completely defeats the purpose of the feature: the user would have to update 4 recipes separately when fixing a step. The user explicitly chose live link over snapshot (PROJECT.md) | Live link is the confirmed design decision |
| Apply technique to all recipes at once | One-click application across the whole library | Dangerous bulk operation; slot colours would be undefined across all of them | Not needed; apply is intentional per-recipe |

---

### Category E — Live Link and Structural Propagation

How edits to a technique's structure flow through to every recipe using it.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Editing a technique's step structure propagates to all recipe instances | The "edit once, update everywhere" promise | HIGH | Recipe views JOIN through recipe_technique_instances to technique_sections + technique_steps rather than copying rows. No materialised step rows per recipe for technique-sourced steps |
| `technique_step_id` is the stable identity for progress keying | If progress is keyed to recipe_step_id and a technique adds a step, the mapping breaks: same class of bug as v0.2.13 regression. Fix: technique-sourced step progress keys to `(recipe_technique_instance_id, technique_step_id)` | HIGH | **Critical.** New composite key for progress rows from technique steps. Existing non-technique steps keep recipe_step_id. Progress resolution checks step source before looking up progress |
| Adding a step to a technique adds it to all recipes | User adds "Thin with Lahmian Medium" step to OSL; all recipes gain the step | HIGH | Falls out naturally from JOIN approach if resolution layer is correct |
| Removing a step from a technique removes it from all recipes; progress on that step is nullified | The step is gone. Progress entry becomes an orphan and is cleaned up | MEDIUM | ON DELETE CASCADE on technique_step_id in the progress composite-key table, or explicit cleanup in the technique save transaction |
| Reordering steps within a technique reorders them in all recipes | Cosmetic but required for correctness | LOW | ORDER BY technique_step.order_index in the JOIN |
| "X recipes will be affected" warning before saving a structural change | Prevents accidental propagation; mirrors recipe delete warning pattern | LOW | Count query on recipe_technique_instances before save; toast/dialog confirmation if count > 0 |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Change summary shown in technique edit confirmation | "This will add 1 step and remove 1 step across 3 recipes" — not just a count | MEDIUM | Diff the draft against the saved technique; summarise additions/deletions |
| Per-instance "last synced" timestamp | Shows when a recipe last received a structural update from its technique | LOW | `updated_at` on recipe_technique_instances; shown in the "from technique X" badge tooltip |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Opt-in per-recipe propagation ("sync this recipe now") | Give the user control over when they receive technique changes | Adds significant complexity (dirty/clean tracking per recipe) for a personal tool where the user IS the technique author. The "X recipes affected" warning before save is the right control point | Warn before save, not after; opt-out (detach) is the escape hatch |
| Propagation history / undo | "Undo the last technique change across all recipes" | Far too complex; beyond the scope of a personal tool | Duplication before major edits is the escape hatch ("NMM Gold v2") |

---

### Category F — Safety Rails: Detach and Override

Escape hatches when the live link is unwanted.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| "From technique X" badge visible on every technique-sourced section | User must always know which sections are live-linked vs handcrafted | LOW | Visual badge on RecipeSectionCard; same section card, new visual state |
| Detach action on a technique instance in a recipe | Converts live-linked sections+steps into plain recipe sections+steps that can be edited freely | MEDIUM | On detach: materialise technique_sections/steps as recipe_sections/steps (copy rows into the recipe graph), then DELETE the recipe_technique_instances row. Progress must be remapped from (instance_id, technique_step_id) to the new recipe_step_ids |
| Confirm before detach: "this will break the live link permanently" | Non-reversible destructive action | LOW | Confirm dialog; mirror the recipe delete dialog pattern |
| After detach, the section is a plain section with no special state | The detached copy is fully editable; no half-linked state | MEDIUM | Clean materialisation in detach transaction |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Duplicate technique then edit (soft override) | Instead of detaching, user duplicates the technique to "NMM Gold (modified)" and points the recipe at that | LOW | Combine existing duplicate-technique + reassign-instance actions; a workflow to document/surface in the UI |
| "Edit just this recipe's slot colours" clearly distinguished from "edit the technique" | Slot colours are already per-instance; just needs clear UI copy | LOW | Clarifying copy in the slot-fill dialog: "Changing colours here only affects this recipe" |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-step override within a live-linked section | Override a single step's dilution without detaching the whole section | Complex mixed-state: some steps live-linked, others overridden. Hard to communicate to the user and hard to maintain | Detach the whole section and edit freely, or edit the technique and accept propagation |
| "Lock technique" to freeze propagation without detaching | Prevent a technique from propagating to a specific recipe | Same mixed-state complexity | Detach is the clean answer |

---

### Category G — Integration with Existing Recipe Surfaces

How technique-sourced steps integrate with existing Painting Mode, availability calc, apply-to-units, and timeline.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Painting Mode works for technique-sourced steps | The primary execution surface must understand slot-resolved paints | HIGH | PaintingMode uses recipe_step_id as progress key; technique steps use (instance_id, technique_step_id). The step data loading query must JOIN through instance -> technique_steps and resolve paint from slot map. Keyboard shortcuts (Space/Arrow/Escape) unaffected |
| Paint availability calculation includes slot-resolved paints | The "owned/missing" badge on a recipe card must count technique-step paints correctly | HIGH | `effectivePaintId()` resolution function must be called in the availability query, not just in the UI layer |
| Apply-to-units progress tracking works for technique-sourced steps | Per-unit step completion must handle technique steps | HIGH | Technique steps need (instance_id, technique_step_id) composite key in the progress table. Alternative: a view presenting technique steps as virtual recipe_step rows with synthetic stable IDs |
| Session-recipe linking cascade selectors include technique sections | LogSessionSheet section selector must show technique-sourced section names | LOW | JOIN approach means sections appear in the recipe's section list automatically; names come from technique_sections.name |
| Recipe duplication preserves live links (not copies steps) | Duplicating a recipe that uses OSL should also live-link OSL (with a fresh slot-fill) | MEDIUM | duplicateRecipe: for each recipe_technique_instances row, create a new instance row for the new recipe_id, then copy slot_maps |
| SectionedTimeline correctly displays technique-sourced sections with badge | Existing timeline must distinguish technique sections from recipe sections | MEDIUM | Extend the section data type with `source: "technique" | "recipe"` and `technique_name`; badge renders conditionally |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Missing slots" warning in paint availability | "2 colour slots unfilled in OSL section" surfaced alongside the existing owned/missing paint warning | LOW | Check slot maps for NULL paint_ids; add to the paint readiness summary |
| Technique name shown in Painting Mode section navigator | Section navigator header shows "OSL (from technique)" so the user knows they're executing a reusable technique | LOW | Pass technique_name through to the section navigator component |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Technique analytics (most-used technique, average slot fill rate) | Useful metrics | Dashboard is already well-developed; per-technique analytics premature for a personal tool | Defer; usage count in the library browse is sufficient |
| Bulk "apply this technique to all recipes in faction X" | One-click application | Slot colours would be undefined; dangerous bulk operation | Not needed; apply is intentional per-recipe |

---

## Feature Dependencies

```
[Technique data model]
  (techniques, technique_sections, technique_steps, technique_colour_slots)
    |
    +--required by--> [Technique authoring UI]
    +--required by--> [Colour slot definition]
    +--required by--> [Technique library browse]
    |
    +--required by--> [recipe_technique_instances + recipe_technique_slot_maps]
                            |
                            +--required by--> [Slot-fill apply flow]
                            +--required by--> [Live link / propagation on technique edit]
                            +--required by--> [Detach action]
                            +--required by--> [Painting Mode technique-step support]
                            +--required by--> [Apply-to-units technique-step support]
                            +--required by--> [Paint availability resolution]

[effectivePaintId() pure function in src/lib/]
  (technique_slot_id -> paint_id via slot map, falls back to step.paint_id)
    |
    +--required by--> [Painting Mode paint swatch]
    +--required by--> [Paint availability calculation]
    +--required by--> [Wishlist bulk-add from technique steps]
    +--required by--> [Apply-to-units progress tracking]

[Technique-step progress key: (recipe_technique_instance_id, technique_step_id)]
    |
    +--required by--> [Painting Mode progress marking]
    +--required by--> [Apply-to-units step completion]
    +--blocks if wrong--> [Stable progress across technique edits: v0.2.13 class of bug]

[Detach action]
    +--requires--> [Progress key remapping: composite key -> new recipe_step_ids]
    +--requires--> [Full live-link being working first]
```

### Dependency Notes

- **Technique data model is the foundation.** Nothing else can be built before the schema (techniques, technique_sections, technique_steps, technique_colour_slots, recipe_technique_instances, recipe_technique_slot_maps) is correct. This must be Phase 1.

- **effectivePaintId() must be a pure function in `src/lib/`.** Same pattern as `resolveUnitPoints()`. Multiple consumers (Painting Mode, availability calc, wishlist) must all use the same resolution function. If any consumer resolves paint differently, the "owned/missing" count will diverge from what Painting Mode shows.

- **The progress key decision is the highest-risk design decision.** Keying technique-step progress to `(recipe_technique_instance_id, technique_step_id)` instead of a plain `recipe_step_id` is a structural break from the existing `recipe_unit_progress` table. Two options: (a) new separate `technique_step_progress` table with the composite key — cleaner but requires all progress consumers to be updated; (b) a view that presents technique steps as virtual recipe steps with deterministic synthetic IDs — preserves existing consumers but adds view complexity. Whichever is chosen must be consistent across Painting Mode, apply-to-units, and session logging.

- **Detach is the last feature to implement.** It depends on the full live-link being working and requires understanding the final progress key schema to do the remapping correctly.

---

## Concrete Colour Slot Examples (Real 40K Techniques)

### OSL (Object Source Lighting) — plasma coil, power weapon, eye lens
Technique structure: 3-4 steps, section_type="highlight", targeting Energy/Glow surface

Slots:
- **Glow Core** (role_hint: "hottest point — pure white or near-white") -> e.g. White Scar
- **Glow Mid** (role_hint: "midtone glow — thinned, wet-blended outward from core") -> e.g. Kantor Blue
- **Glow Edge** (role_hint: "cooldown fringe — very thinned glaze at edge of illuminated area") -> e.g. Macragge Blue
- **Surface Tint** (role_hint: "ambient light on surrounding surfaces — extremely thin glaze") -> e.g. Caledor Sky + Contrast Medium

Instance 1 (Ultramarine plasma gun): Glow Core=White Scar, Glow Mid=Kantor Blue, Glow Edge=Macragge Blue, Surface Tint=Caledor Sky
Instance 2 (Death Guard eye lens): Glow Core=White Scar, Glow Mid=Warboss Green, Glow Edge=Deathworld Forest, Surface Tint=Militarum Green

Step structure example:
1. [shade] Basecoat light source with Glow Core; pure concentration at hottest point
2. [glaze] Glaze outward with Glow Mid; 2:1 Lahmian Medium, wide soft brush
3. [glaze] Feather edge with Glow Edge; very diluted, extend 2-3x further than Glow Mid
4. [glaze] Final pass with Surface Tint on all surfaces in the "cone of light"

### NMM Silver (Non-Metallic Metal, silver)
Technique structure: 6-7 steps, section_type="highlight", targeting Metal surface

Slots:
- **Deep Shadow** (role_hint: "darkest recesses — black or very dark grey") -> e.g. Abaddon Black
- **Shadow** (role_hint: "shaded areas — dark grey") -> e.g. Mechanicus Standard Grey
- **Midtone** (role_hint: "base tone — mid grey") -> e.g. Administratum Grey
- **Light** (role_hint: "lit surfaces — light grey") -> e.g. Ulthuan Grey
- **Highlight** (role_hint: "hottest highlight — pure white") -> e.g. White Scar
- **Blackline** (role_hint: "panel line accent for crisp metal separation") -> e.g. Abaddon Black

Instance 1 (Space Marine pauldron rim): Shadow=Mechanicus Standard Grey, Midtone=Administratum Grey, Highlight=White Scar
Instance 2 (Chaos warrior sword): Shadow=Eshin Grey, Midtone=Dawnstone, adds an optional blue glaze tint

### NMM Gold
Slots:
- **Deep Shadow** -> e.g. Rhinox Hide
- **Shadow** -> e.g. Mournfang Brown
- **Midtone** -> e.g. Zamesi Desert / Skrag Brown
- **Bright Highlight** -> e.g. Yriel Yellow / Flash Gitz Yellow
- **Specular** -> e.g. White Scar (tiny dot at absolute hottest point)

### Zenithal Undercoat
Technique structure: 3 steps, section_type="primer", targeting "all surfaces"

Slots:
- **Base Shadow** (role_hint: "sprayed from below — darkest tone") -> e.g. Chaos Black Spray
- **Mid Coat** (role_hint: "sprayed from 45 degrees — midtone") -> e.g. Grey Seer Spray
- **Zenith Highlight** (role_hint: "sprayed from directly above — lightest tone") -> e.g. Corax White Spray

Note: Zenithal is the one technique where slot variation is low — most users always use black/grey/white. Slots still allow "warm zenithal" (ochre mid-coat) vs "cool zenithal" (blue-grey mid-coat) variation.

### Edge Highlight
Technique structure: 2-3 steps, section_type="highlight", targeting Armor/Weapon/Other

Slots:
- **Base Colour** (role_hint: "the flat surface colour receiving the highlight") -> e.g. Macragge Blue
- **First Edge** (role_hint: "first highlight pass — base colour lightened by ~20%") -> e.g. Calgar Blue
- **Sharp Edge** (role_hint: "finest edge — near-white or bright highlight for extreme edges") -> e.g. Fenrisian Grey

Instance 1 (Ultramarine pauldron): Base=Macragge Blue, First=Calgar Blue, Sharp=Fenrisian Grey
Instance 2 (Death Guard trim): Base=Zandri Dust, First=Ushabti Bone, Sharp=Screaming Skull
Instance 3 (Necron black armour): Base=Abaddon Black, First=Dark Reaper, Sharp=Thunderhawk Blue

---

## MVP Definition

### Launch With (v0.7.0 — this milestone)

- [x] Schema foundation: `techniques`, `technique_sections`, `technique_steps`, `technique_colour_slots`, `recipe_technique_instances`, `recipe_technique_slot_maps` tables with stable IDs
- [x] Technique authoring form: create/edit named technique with sections + steps + slots (reuse DraftSection/DraftStep pattern and RecipeFormSheet components)
- [x] Technique library browse page: list, filter by effect, usage count badge, technique detail view
- [x] Apply technique to recipe: picker dialog, position selection, slot-fill dialog, "from technique X" badge on the section
- [x] Slot resolution layer: `effectivePaintId()` pure function wired into paint availability calc and Painting Mode
- [x] Progress key for technique steps: stable `(instance_id, technique_step_id)` composite key; Painting Mode and apply-to-units must respect it
- [x] Propagation on technique edit: "X recipes affected" warning + structural changes automatically visible in all recipe consumers
- [x] Detach action: materialise and unlink; progress key remapping
- [x] "From technique X" badge: visible in SectionedTimeline and recipe editor
- [x] Recipe duplication preserves live links: duplicate recipe creates a new instance, not copied steps

### Add After Validation (Post v0.7.0)

- [ ] Inline slot fill in Painting Mode: edit colours during execution; useful but not blocking
- [ ] "Missing slots" paint warning: surface unfilled slot count alongside owned/missing warning
- [ ] Change summary on technique save: "adds 1 step, removes 1 step across 3 recipes"
- [ ] Technique duplication: "NMM Gold v2" from existing technique

### Future Consideration (v0.8+)

- [ ] Technique export/import: sharing techniques via file; requires serialisation/versioning
- [ ] Technique analytics: most-used technique, completion rates
- [ ] Community/cloud technique library: explicitly out of scope per PROJECT.md

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Schema: techniques + slots + instances + slot_maps | HIGH | MEDIUM | P1 |
| Progress key: (instance_id, technique_step_id) | HIGH — correctness | HIGH | P1 |
| effectivePaintId() resolution function | HIGH | LOW | P1 |
| Technique authoring form | HIGH | HIGH | P1 |
| Apply technique + slot-fill dialog | HIGH | MEDIUM | P1 |
| Live link propagation on technique edit | HIGH | HIGH (falls from JOIN model) | P1 |
| "From technique X" badge + detach | HIGH | MEDIUM | P1 |
| Technique library browse page | MEDIUM | LOW | P1 |
| Painting Mode technique-step support | HIGH | MEDIUM | P1 |
| Paint availability resolution | HIGH | LOW | P1 |
| Recipe duplication with live-link preservation | MEDIUM | LOW | P1 |
| SectionedTimeline technique section badge | MEDIUM | LOW | P1 |
| Inline slot fill in Painting Mode | MEDIUM | MEDIUM | P2 |
| Missing slots warning | MEDIUM | LOW | P2 |
| Change summary on technique save | LOW | MEDIUM | P2 |
| Technique duplication | LOW | LOW | P2 |
| Position picker in apply dialog | LOW | LOW | P2 |

---

## Competitor Feature Analysis

No direct competitors offer this exact feature (single-user local desktop app with live-linked parameterised painting technique templates). The closest analogies:

| Feature | Figma (components + overrides) | Paint Pad (recipe sharing) | HobbyForge v0.7.0 approach |
|---------|-------------------------------|---------------------------|----------------------------|
| Parameterised structure | Component properties (text, bool, instance swap, fill colour) | None — recipes are narrative, not parameterised | Named colour slots (Glow Core / Glow Mid) referencing real paint inventory |
| Live link | Main component -> instances; edits propagate to all instances | None | technique -> recipe_technique_instances; JOIN-based, not copy-based |
| Per-instance override | Instance-level property overrides preserve on main-component edit | N/A | Per-recipe slot mapping (colours) + detach for structural freedom |
| Detach | "Detach instance" -> editable copy, breaks link permanently | N/A | Detach -> materialise technique steps as recipe steps, remap progress |
| Scale | Design system scale (100s of instances, teams) | Community scale (public sharing) | Personal tool scale (10-30 techniques, <100 recipes) — simpler is correct |

Key lesson from Figma: "detach is permanent" is the right UX principle. Half-linked states (some steps live, some overridden) create confusion at any scale. The correct model: override what you can within the component model (slot colours), or detach entirely. This maps cleanly to HobbyForge: slot colours are per-instance, structure is shared, detach gives full freedom.

---

## Sources

- HobbyForge codebase: `src/features/recipes/recipeSchema.ts`, `src/types/recipe.ts`, `src/types/recipePaint.ts`, `src/features/recipes/recipeSection.ts` — HIGH confidence (direct inspection)
- PROJECT.md Current Milestone v0.7.0 section and Key Decisions — HIGH confidence (authoritative project spec)
- OSL technique steps: The Army Painter blog, Tangible Day, Creative Twilight — MEDIUM confidence (multiple sources agree on 3-4 colour progression)
- NMM Silver/Gold: Warhammer Guild, Goonhammer, The Army Painter — MEDIUM confidence (7-step silver and warm-tone gold palettes are industry consensus)
- Zenithal 3-stage priming: Army Painter, Tangible Day, Warhammer Guild — HIGH confidence (universally documented as black/grey/white 3-spray pattern)
- Edge highlight: universally documented in 40K community; base + 1-2 progressively lighter passes — HIGH confidence
- Figma component/override/detach pattern: Figma Help Center articles — MEDIUM confidence (used as UX analogy for the live-link model, not a direct port)
- Paint Pad recipes platform (paintpad.app): MEDIUM confidence (narrative-style only, no parameterisation features found)

---

*Feature research for: HobbyForge v0.7.0 Technique Library*
*Researched: 2026-06-19*
