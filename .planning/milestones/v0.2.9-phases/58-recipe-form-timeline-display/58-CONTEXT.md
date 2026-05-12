# Phase 58: Recipe Form & Timeline Display - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Add workflow metadata editing controls (section_type, technique, execution_mode, applies_to) to RecipeSectionCard under a progressive-disclosure collapsible, and display that metadata as compact badges and inline text in SectionedTimeline. Pure UI phase — schema, types, const arrays, and query layer were delivered in Phase 57.

</domain>

<decisions>
## Implementation Decisions

### Workflow Collapsible Layout
- **D-01:** Four workflow fields arranged in a 2×2 grid of compact selects inside a Collapsible: section_type + technique on row 1, execution_mode + applies_to on row 2
- **D-02:** Use existing Radix Collapsible component (already used in RecipeSectionCard for section expand/collapse)
- **D-03:** applies_to is a simple text input (free-text per WF-04), not a combobox — model areas vary too widely for a predefined list

### Progressive Disclosure Trigger
- **D-04:** Hide the Workflow collapsible when `sections.length === 1 && !hasAnyWorkflowMetadata(section)` — once any metadata field is set or a second section exists, the collapsible appears
- **D-05:** "Has metadata" check: `section.section_type || section.technique || section.execution_mode || section.applies_to` — any non-null field counts
- **D-06:** This implements success criterion 2: "Simple recipes (single section, no metadata set) show no workflow collapsible"

### Timeline Badge Design
- **D-07:** SectionedTimeline renders workflow metadata as a dot-separated inline string after the section name: `"Section Name . Surface . Technique . ExecutionMode"`
- **D-08:** section_type renders as a single compact Badge (variant="outline") before the dot-separated metadata — it's the categorical label, visually distinct from the flow descriptors
- **D-09:** Only non-null fields appear in the dot-separated string — no empty placeholders
- **D-10:** Format matches success criterion 4 example: `"Armor Blue . Armor . Drybrush . Sequential"`

### Claude's Discretion
- Exact Collapsible trigger/content markup and Tailwind classes for the 2×2 grid
- Badge color variants for section_type values (or all using outline variant)
- Whether to capitalize technique/execution_mode display values or show as-is
- Exact dot separator styling (literal " . " text or styled spans)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — RUI-01 through RUI-04 define the four UI requirements for this phase

### Phase 57 Deliverables (direct dependency)
- `.planning/phases/57-schema-data-layer/57-CONTEXT.md` — Schema decisions (D-01 through D-14) that this phase builds on
- `src/types/recipeSection.ts` — SECTION_TYPES, TECHNIQUES, EXECUTION_MODES const arrays + RecipeSection/DraftSection types

### Existing Components to Modify
- `src/features/recipes/RecipeSectionCard.tsx` — Add Workflow collapsible with metadata form controls
- `src/features/recipes/SectionedTimeline.tsx` — Add section_type badge + technique/execution_mode inline text

### UI Primitives
- `src/components/ui/collapsible.tsx` — Radix Collapsible (already used in RecipeSectionCard)
- `src/components/ui/badge.tsx` — Badge variants (outline already used in SectionedTimeline for surface/optional)
- `src/components/ui/select.tsx` — Select component for dropdown fields (if using shadcn select)

### Form Persistence Pattern
- `src/features/recipes/RecipeFormSheet.tsx` — Save path already includes all four workflow metadata fields in createRecipeSection calls

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Collapsible component (Radix UI) — already imported and used in RecipeSectionCard for section expand/collapse
- Badge component — already used in SectionedTimeline for surface and optional tags
- SECTION_TYPES, TECHNIQUES, EXECUTION_MODES const arrays — ready for select option generation
- RecipeFormSheet save path — already persists all four fields, no save changes needed

### Established Patterns
- RecipeSectionCard uses `onChange(updated: DraftSection)` callback — new select/input controls follow same pattern: `onChange({ ...section, section_type: value })`
- SectionedTimeline renders section headers with Badge + text spans — extend with new metadata badges
- Collapsible pattern: CollapsibleTrigger wraps a clickable header, CollapsibleContent wraps the hidden body

### Integration Points
- RecipeSectionCard.tsx — add Workflow collapsible inside the existing card body (below name/surface fields, above step list)
- SectionedTimeline.tsx — extend the section header row that currently shows name + surface badge + optional badge
- No new files expected — modifications to two existing components

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following established codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 58-Recipe Form & Timeline Display*
*Context gathered: 2026-05-12*
