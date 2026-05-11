# Phase 55: Playbook Enhancements — Favorites and Notes - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can mark any rule (stratagem, detachment ability, shared ability) as a favorite or Game Day reminder and attach personal notes to any imported rule — with all user annotations visually distinct from synced Wahapedia data and surviving re-syncs. Covers UI controls on PlaybookTab and RulesHubPage rule entries. Does NOT include Game Day mode (Phase 56) or new filtering/search capabilities beyond what exists.

</domain>

<decisions>
## Implementation Decisions

### Toggle placement
- Star icon (Lucide `Star`) and reminder flag icon (Lucide `Flag`) placed inline on the trigger row of each rule card/entry, alongside existing badges
- Star + flag icons grouped on the left side of the trigger row (before the rule name), note indicator on the right side (after badges) — clear "user actions" zone
- Both toggles always visible (no hover reveal) — desktop app where discoverability matters
- Star: filled yellow (`text-yellow-500 fill-yellow-500`) for favorited, outline for unfavorited
- Flag: filled blue (`text-blue-500 fill-blue-500`) for active reminder, outline for inactive
- Star and flag are independent toggles (is_reminder is separate from favorite status per Phase 52 decision)

### Note interaction pattern
- Note textarea appears inside the card's expanded content area, below the rule description
- Separated from rule content by a thin separator — reinforces boundary between synced and user data
- "Your Notes" label above textarea, styled with `SECTION_LABEL_CLASS` pattern
- Debounced auto-save (500ms) on textarea change using `useUpsertRulesNote` — no explicit save button for a single text field
- Auto-growing textarea, minimum 2 rows — consistent with existing `TEXTAREA_CLASS` pattern in PlaybookTab
- Collapsed cards with existing notes show a small note indicator icon (Lucide `StickyNote`) in the trigger row — helps users find annotated rules

### Visual distinction (PLAY-04)
- Cards with any user annotation (favorite, reminder, or note) get a subtle primary-color left border and very light background tint (`bg-primary/5`)
- Consistent with the `isStatOverridden` visual in PlaybookTab stats (border-primary bg-primary/5 pattern)
- Note section clearly separated from imported rule content with separator and distinct label

### Integration surfaces
- **RulesHubPage cards:** StratagemCard, DetachmentCard, SharedAbilityCard — add star, flag, and note controls
- **PlaybookTab entries:** StratagemEntry, DetachmentSection, ExtendedAbilityEntry — add star, flag, and note controls
- Extract a reusable `RuleAnnotationControls` component (star + flag + note indicator) used in both locations
- Card layout stays different between PlaybookTab (compact entries) and RulesHub (Collapsible cards)

### Data loading strategy
- Call `useRulesFavorites()` and `useRulesNotes()` once at the page/tab level
- Build `Map<compositeKey, RulesFavorite>` and `Map<compositeKey, RulesNote>` for O(1) lookup per card
- Composite key: `${rule_id}:${rule_type}` string concatenation
- Pass relevant data down as props — avoids N+1 hooks per card

### Claude's Discretion
- Whether to add a "My Favorites" filter toggle on RulesHubPage (useful but not required by PLAY-01–04)
- Exact spacing and sizing of star/flag icons relative to card text
- Whether note indicator in collapsed view shows note preview text or just an icon
- Debounce timing adjustment (500ms is starting point)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data layer (Phase 52)
- `src/db/queries/rulesFavorites.ts` — getRulesFavorites, upsertRulesFavorite, deleteRulesFavorite CRUD
- `src/db/queries/rulesNotes.ts` — getRulesNotes, getRulesNoteByKey, upsertRulesNote CRUD
- `src/hooks/useRulesFavorites.ts` — useRulesFavorites (read), useUpsertRulesFavorite (optimistic), useDeleteRulesFavorite hooks
- `src/hooks/useRulesNotes.ts` — useRulesNotes (read), useUpsertRulesNote hook
- `src/types/rulesFavorite.ts` — RulesFavorite, UpsertRulesFavoriteInput, RULE_TYPES, RuleType
- `src/types/rulesNote.ts` — RulesNote, UpsertRulesNoteInput

### Rule card components (Phase 53 — to be extended)
- `src/features/rules-hub/StratagemCard.tsx` — Collapsible card with phase badge + CP cost
- `src/features/rules-hub/DetachmentCard.tsx` — Collapsible card with nested abilities
- `src/features/rules-hub/SharedAbilityCard.tsx` — Collapsible card with legend badge
- `src/features/rules-hub/RulesHubPage.tsx` — Page rendering all three card types with filters

### PlaybookTab entries (to be extended)
- `src/features/units/PlaybookTab.tsx` — Contains StratagemEntry, DetachmentSection, ExtendedAbilityEntry sub-components (lines 1242–1299)

### Army list reminders (Phase 54 — downstream consumer)
- `src/features/army-lists/RemindersSection.tsx` — Already reads is_reminder=1 favorites; Phase 55 enables users to SET that flag

### Phase 52 context
- `.planning/phases/52-schema-data-layer-foundation/52-CONTEXT.md` — Rule identification pattern, mutation behavior, cache invalidation strategy

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useRulesFavorites` + `useUpsertRulesFavorite` + `useDeleteRulesFavorite`: Full optimistic CRUD with rollback — ready to wire to UI toggles
- `useRulesNotes` + `useUpsertRulesNote`: Read + upsert mutation — ready for debounced auto-save
- `StratagemCard`, `DetachmentCard`, `SharedAbilityCard`: Existing Collapsible card components to extend with annotation controls
- `TEXTAREA_CLASS` in PlaybookTab: Existing textarea styling pattern to reuse for note input
- `SECTION_LABEL_CLASS` in PlaybookTab: Existing label styling for "Your Notes" label
- Lucide icons: `Star`, `Flag`, `StickyNote` available in lucide-react

### Established Patterns
- Optimistic mutation with rollback: `useUpsertRulesFavorite` already implements `onMutate` → `onError` → `onSettled` pattern
- Composite key for lookups: `rule_id + rule_type` used throughout favorites/notes queries
- `bg-primary/5` + `border-primary` for user-override visual distinction (PlaybookTab stat overrides)
- Cards NOT invalidated by rules sync — favorites/notes live in hobbyforge.db (Phase 52 decision)

### Integration Points
- `RulesHubPage.tsx`: Must pass favorites/notes data to card components as props
- `PlaybookTab.tsx`: Must add favorites/notes queries and pass to entry sub-components
- `RemindersSection.tsx`: Already consumes favorites with is_reminder=1 — no changes needed there
- New `RuleAnnotationControls` component: Shared between RulesHub cards and PlaybookTab entries

</code_context>

<specifics>
## Specific Ideas

No specific requirements — auto-mode selected recommended defaults aligned with existing app patterns (optimistic toggles, bg-primary/5 visual distinction, debounced auto-save for notes).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 55-playbook-enhancements-favorites-and-notes*
*Context gathered: 2026-05-11*
