# Phase 53: Rules Data Hub UI - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Standalone RulesHubPage with sync status header, faction browser, rules browser (stratagems/detachments/shared abilities) with filtering and search, sync error history, diff summary, and Wahapedia disclaimer. Users can browse all synced rules data from a dedicated page with faction filtering and text search.

</domain>

<decisions>
## Implementation Decisions

### Page layout & navigation
- Tab-based organization: Stratagems, Detachments, Shared Abilities as separate tabs (shadcn Tabs)
- Single faction selector at the top of the page, above tabs — one faction context applies to all tabs
- Page accessible via sidebar nav and route `/rules-hub`

### Sync status presentation
- Header card at top of page showing: last sync date, row counts per table, source version, freshness badge (reuse syncFreshness utility), and a trigger-sync button
- Error history displayed in a collapsible section below the sync header — visible toggle but collapsed by default
- Diff summary (added/removed/modified/renamed counts) shown inline in sync header after a sync completes — uses existing computeSyncDiff utility

### Rules card display
- Cards with key metadata visible at a glance, expandable for full description text
- Stratagems: show name + game phase badge + CP cost badge inline on each card
- Detachments: show name + abilities count; expanding reveals detachment abilities list
- Shared abilities: show name + type; expanding reveals full description
- Consistent card styling across all three tabs

### Search & filter UX
- Global search bar at top of the tab content area — filters across the active tab only
- Stratagem-specific filters: game phase filter chips (Command/Movement/Shooting/Charge/Fight) + CP cost filter
- Text search matches on name and keyword fields

### Disclaimer
- Page footer with subtle but always-visible disclaimer: community-sourced Wahapedia data, not official Games Workshop material

### Claude's Discretion
- Exact card layout and spacing
- Empty state design when no faction is selected or no rules data is synced
- Loading skeleton approach
- Whether to use a Combobox or Select for faction picker
- Exact badge colors for game phases

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing rules infrastructure
- `src/hooks/useRulesExtended.ts` — Hooks for stratagems/detachments/shared abilities by faction (staleTime: Infinity pattern)
- `src/hooks/useRulesSync.ts` — Sync mutation hook, cache invalidation contract, RustSyncResult interface
- `src/hooks/useSyncErrors.ts` — useRulesSyncErrors hook for error history display
- `src/hooks/useDatasheet.ts` — useRulesSyncMeta (last sync date, row counts), useWahapediaFactionId translation
- `src/lib/computeSyncDiff.ts` — Pure diff computation (added/removed/renamed counts)
- `src/lib/syncFreshness.ts` — getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS utilities
- `src/db/queries/rulesExtended.ts` — Query functions: getStratagemsByFaction, getDetachmentsByFaction, getSharedAbilitiesByFaction, getDetachmentAbilitiesByDetachment

### Type definitions
- `src/types/datasheet.ts` — RwStratagem, RwDetachment, RwDetachmentAbility, RwAbility type interfaces

### UI patterns to follow
- `src/features/units/PlaybookTab.tsx` — Existing rules display (sync section, stratagem listing, detachment abilities) — reference for component patterns
- `src/app/router.tsx` — Route registration pattern (createRoute + routeTree)
- `src/components/common/AppSidebar.tsx` — Sidebar nav entry pattern

### Phase 52 context
- `.planning/phases/52-schema-data-layer-foundation/52-CONTEXT.md` — Data layer decisions (rule identification, cache invalidation, dual-DB architecture)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useStratagemsByFaction(factionId)`: Ready-made hook returning all stratagems for a faction
- `useDetachmentsByFaction(factionId)`: Ready-made hook for detachments
- `useSharedAbilitiesByFaction(factionId)`: Ready-made hook for shared abilities
- `useDetachmentAbilitiesByDetachment(detachmentId)`: Sub-query for detachment abilities
- `useRulesSyncMeta()`: Returns last sync date, row counts, source version
- `useRulesSyncErrors()`: Returns full error history
- `useRulesSync()`: Mutation to trigger sync from UI
- `useWahapediaFactionId(factionName)`: Translates app faction name to Wahapedia faction_id
- `getSyncFreshness(lastSyncDate)` + `FRESHNESS_DOT_CLASS`: Badge utilities
- `computeSyncDiff(snapshot, current)`: Post-sync diff computation
- `useFactions()`: Faction list for the picker
- shadcn Tabs, Badge, Card, Collapsible, Input, Button — all installed

### Established Patterns
- PlaybookTab shows sync section (freshness badge, row counts, trigger button, error history) — can extract/share pattern
- TanStack Router flat route registration with `createRoute` + page component import
- Sidebar nav items as array of `{ to, label, icon }` objects
- Feature pages live in `src/app/{route-name}/page.tsx`
- Zustand stores for filter state (e.g., `src/features/*/entityFilters.ts`)

### Integration Points
- `src/app/router.tsx`: Add `/rules-hub` route with RulesHubPage component
- `src/components/common/AppSidebar.tsx`: Add "Rules Hub" nav entry (Play section)
- Page component: `src/app/rules-hub/page.tsx` (new file following existing page structure)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Auto-mode selected recommended defaults aligned with existing app patterns (PlaybookTab sync section, shadcn Tabs, card-based display).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 53-rules-data-hub-ui*
*Context gathered: 2026-05-10*
