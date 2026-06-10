# Phase 125: About Tab - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the About tab placeholder in the Settings page with real content: app version display, data statistics (unit count, faction count, Wahapedia data date), and credits/attribution (Wahapedia data source + tech stack). This is a read-only informational tab — no user input, no mutations, no settings storage.

</domain>

<decisions>
## Implementation Decisions

### Content Layout
- **D-01:** Three stacked sections in vertical flow: (1) App Identity at top — app name + version, (2) Data Stats in middle — counts and data freshness, (3) Credits/Attribution at bottom. Clean vertical layout matching the simplicity of a settings tab.
- **D-02:** No card wrappers needed — use simple heading + content pairs. The tab content area provides sufficient visual structure.

### Data Stats Scope
- **D-03:** Display exactly what ABT-02 requires: total unit count, faction count, and Wahapedia data date (built_at from udb_meta). No schema version or diagnostic flags — those belong on the Data Health page.
- **D-04:** Handle the "no data imported" state gracefully — show a "Not imported yet" message when udb_meta has no row.

### Credits & Attribution
- **D-05:** Wahapedia attribution as the primary credit — clear statement that unit/rules data comes from Wahapedia. This is a desktop app, so no clickable links needed.
- **D-06:** Tech stack section listing core technologies: Tauri 2, React, TypeScript, SQLite. Keep it compact — a simple list, not a detailed breakdown.
- **D-07:** Include "HobbyForge" app name and a brief one-line description at the top of the About section.

### Component Strategy
- **D-08:** Build a purpose-built AboutTab component rather than reusing VersionInfoCard from data-health. VersionInfoCard is tightly coupled to its card layout. However, reuse the same data hooks: `getVersion()` from `@tauri-apps/api/app` and `useUdbMeta()` for data stats.
- **D-09:** Single file: `src/features/settings/AboutTab.tsx`. Inline in the Settings page TabsContent for the "about" tab.

### Claude's Discretion
- Exact wording of attribution text and tech stack list
- Typography choices (text sizes, muted vs regular colors)
- Whether to show game system label alongside data stats
- Loading skeleton layout for async data (version + udb_meta)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — ABT-01, ABT-02, ABT-03 are the 3 requirements for this phase
- `.planning/ROADMAP.md` §Phase 125 — Success criteria and dependencies

### Foundation (Phase 121)
- `.planning/phases/121-settings-foundation/121-CONTEXT.md` — Settings infrastructure decisions (tab structure, hooks, query module)
- `src/app/settings/page.tsx` — Current Settings page with About tab placeholder (line 39-44)

### Existing Patterns (data access)
- `src/hooks/useUdbMeta.ts` — Hook for unit_count, faction_count, built_at, game_system, version
- `src/features/data-health/VersionInfoCard.tsx` — Reference for how version + data stats are displayed elsewhere (DO NOT reuse component, DO reuse pattern)
- `src/features/dashboard/DataHealthSummaryCard.tsx` — Another reference for getVersion() usage pattern

### Tauri API
- `@tauri-apps/api/app` — `getVersion()` returns app version string from tauri.conf.json

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getVersion()` from `@tauri-apps/api/app`: Already used in 3 components — proven pattern for reading app version
- `useUdbMeta()` hook: Returns `{ version, built_at, game_system, unit_count, faction_count }` — all the data stats needed
- `useAppSettings()` hook: Already imported in SettingsPage for loading state

### Established Patterns
- Version display: `useEffect` + `useState` pattern for `getVersion()` (see VersionInfoCard.tsx:55-57)
- Data freshness: `formatBuiltAt()` helper in VersionInfoCard for human-readable dates
- Loading states: `Skeleton` component used consistently for async data

### Integration Points
- `src/app/settings/page.tsx:39-44`: Replace About tab placeholder content
- Settings page already imports `useAppSettings` — loading/error states handled at page level
- No new routes, no new database queries, no new hooks needed

</code_context>

<specifics>
## Specific Ideas

No specific requirements — straightforward informational display following established patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 125-About Tab*
*Context gathered: 2026-06-10*
