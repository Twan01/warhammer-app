# Phase 121: Settings Foundation - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the infrastructure layer for all app settings: a persistent key-value `app_settings` table, a React Query hook layer (`useAppSettings` / `useUpdateSetting`), and a tabbed Settings page shell at `/settings` with 3 tabs (Preferences / Data / About). This phase delivers the foundation — actual settings controls are added in Phases 122–125.

</domain>

<decisions>
## Implementation Decisions

### Key-Value Storage Schema
- **D-01:** Flat key-value table: `app_settings(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`. All values stored as TEXT; type coercion (number, boolean, JSON) happens in the TypeScript hook layer.
- **D-02:** Migration file: `044_app_settings.sql` (next in sequence after 043). Table creation only — no seed data. Sensible defaults live in the hook layer so the app works with an empty table.

### Settings Hook API
- **D-03:** Generic hook pair: `useAppSettings()` returns all settings as a typed map, `useUpdateSetting()` is a mutation accepting `{key: string, value: string}`. Query key: `["app-settings"]`.
- **D-04:** Individual phases may add typed convenience wrappers (e.g., `useCurrency()` reading from the settings map) — but that's Phase 122+ scope. Phase 121 only delivers the generic layer.
- **D-05:** React Query integration follows existing patterns: `staleTime` 5min, cache invalidation on mutation via `queryClient.invalidateQueries({ queryKey: APP_SETTINGS_KEY })`.

### Tab Structure & Navigation
- **D-06:** Exactly 3 tabs as specified: **Preferences** / **Data** / **About**. Tab content in Phase 121 is placeholder text — each downstream phase replaces one placeholder.
- **D-07:** Use shadcn `Tabs` component (already available at `src/components/ui/tabs.tsx`). Default active tab: Preferences.
- **D-08:** Settings page replaces the current placeholder at `src/app/settings/page.tsx`. Route already wired at `/settings` in router.

### Query Module
- **D-09:** New file `src/db/queries/appSettings.ts` with functions: `getAppSettings()`, `getAppSetting(key)`, `upsertAppSetting(key, value)`. Uses `INSERT OR REPLACE` for upsert.
- **D-10:** Hook file: `src/hooks/useAppSettings.ts` following the established `ENTITY_KEY` + `useEntity` + mutation pattern.

### Claude's Discretion
- File organization and component structure within the settings feature module
- Whether to use a Sheet or inline form elements for individual settings (future phases decide per-control)
- Error handling approach for malformed settings values

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — INF-01, INF-02, INF-03 are the 3 requirements for this phase
- `.planning/ROADMAP.md` §Phase 121 — Success criteria and dependencies

### Existing Patterns (code)
- `src/db/client.ts` — DB singleton; all queries go through `getDb()`
- `src/db/queries/factions.ts` — Reference CRUD query module pattern
- `src/hooks/useFactions.ts` — Reference React Query hook pattern (KEY export, useQuery, useMutation)
- `src/components/ui/tabs.tsx` — shadcn Tabs component to use for tab layout

### Integration Points (for downstream phases)
- `src/context/ActiveFactionContext.tsx` — Phase 122 will read default faction from settings (currently uses localStorage)
- `src/lib/formatCurrency.ts` — Phase 122 will pass user's currency preference (already accepts locale/currency params)
- `src/types/unit.ts` §PAINTING_STATUS_ORDER — Phase 123 will need to make pipeline stages dynamic

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/tabs.tsx`: shadcn Tabs primitive — use directly for tab navigation
- `src/app/settings/page.tsx`: Existing placeholder page — replace with real implementation
- `src/app/router.tsx:169-171`: Route already configured at `/settings` with lazy import

### Established Patterns
- Query modules: one `.ts` per entity in `src/db/queries/` with parameterized `$1, $2` syntax
- Hook files: `src/hooks/use*.ts` exporting `ENTITY_KEY`, `useEntity()`, mutation hooks
- Migrations: auto-run at app start in filename order; next number is `044`
- DB client: all queries via `getDb()` from `src/db/client.ts`

### Integration Points
- Sidebar already has Settings link wired to `/settings`
- 43 existing migrations — new migration slots in cleanly at 044
- No existing `app_settings` table or settings infrastructure — building from scratch

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The phase is pure infrastructure following well-established codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 121-Settings Foundation*
*Context gathered: 2026-06-10*
