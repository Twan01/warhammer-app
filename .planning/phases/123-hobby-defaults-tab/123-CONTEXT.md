# Phase 123: Hobby Defaults Tab - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a "Hobby Defaults" section to the Settings Preferences tab where users can customize three workflow defaults: (1) rename the 5 painting pipeline stage labels that appear across Dashboard, Collection filters, and Kanban, (2) add/remove/reorder default pre-game checklist items for new Game Day sessions, and (3) set a default mission format that pre-fills new battle logs. All values persist via the `app_settings` key-value store from Phase 121.

</domain>

<decisions>
## Implementation Decisions

### Pipeline Stage Labels (HOB-01)
- **D-01:** Store custom labels as a JSON map in `app_settings` (key: `pipeline_labels`, value: `{"Built": "Assembled", ...}`). Only overridden labels are stored — missing keys fall back to the default name from `PAINTING_STATUS_ORDER`.
- **D-02:** The `PAINTING_STATUS_ORDER` array in `src/types/unit.ts` stays unchanged — it remains the source of truth for internal logic, DB values, and ordering. Custom labels are a display-only overlay.
- **D-03:** A utility function `getStageLabel(status: PaintingStatus, settings: AppSettingsMap): string` resolves display labels. Falls back to the raw status name when no custom label exists.
- **D-04:** The Dashboard `HobbyPipeline` groups 11 statuses into 5 buckets (Not Started / Assembly / Painting / Finishing / Done). SC-1 says "the 5 painting pipeline stage labels" — these are the 5 *bucket* labels, not the 11 individual statuses. The Settings UI shows the 5 bucket names as editable fields.
- **D-05:** Consuming components (`HobbyPipeline`, `UnitFilters`, `KanbanBoard`, `StatusPopover`) read `useAppSettings()` and pass through the label resolver. No new context provider needed — React Query cache already makes settings globally available.

### Pre-Game Checklist Defaults (HOB-02)
- **D-06:** Store custom checklist as a JSON array in `app_settings` (key: `default_checklist`, value: `[{"text": "Verify army list points"}, ...]`). IDs are generated at session-init time, not stored in settings.
- **D-07:** When no custom value exists, fall back to the current `DEFAULT_CHECKLIST` in `gameDayStore.ts`. Once a user saves custom defaults, the settings value takes precedence.
- **D-08:** Editor UI: inline editable list with text input + add button (matching the existing `ChecklistTab` add-item pattern), delete buttons per item, and drag-to-reorder via the existing `@dnd-kit` dependency.
- **D-09:** `gameDayStore.ts` reads from `app_settings` at session-init time (`createDefaultState`) instead of using the hardcoded `DEFAULT_CHECKLIST`. Import path: call `getAppSetting("default_checklist")` from the query layer, parse JSON, fall back to hardcoded defaults.

### Mission Format Default (HOB-03)
- **D-10:** Store a string in `app_settings` (key: `default_mission_format`). The battle log `mission` field is free-text today — no enum or dropdown needed.
- **D-11:** `BattleLogSheet` reads the default value from settings and uses it as the initial value for the `mission` field when creating a new log (not when editing). If no default is set, the field starts empty as today.
- **D-12:** Settings UI: a simple text input labeled "Default Mission Format" with a placeholder like "e.g., Take and Hold, Leviathan, etc."

### Settings UI Layout
- **D-13:** All three sections (Pipeline Labels, Checklist Defaults, Mission Format) live within the Preferences tab as a "Hobby Defaults" section group, visually separated from the general preferences (language, currency, etc.) that Phase 122 adds.
- **D-14:** Each section has a heading, brief description, and its controls. Save is per-section or per-field (instant save on change, matching the settings UX pattern).

### Claude's Discretion
- Component file organization within `src/features/settings/` or `src/app/settings/`
- Whether pipeline label fields use inline editing or a form with explicit Save button
- Exact layout and spacing of the hobby defaults section
- How to handle the Zustand store async read from settings (sync init vs. lazy load)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — HOB-01, HOB-02, HOB-03 are the 3 requirements for this phase
- `.planning/ROADMAP.md` §Phase 123 — Success criteria and dependencies

### Phase 121 Context (foundation)
- `.planning/phases/121-settings-foundation/121-CONTEXT.md` — Settings infrastructure decisions (key-value table, hook API, tab structure)

### Existing Patterns (code)
- `src/hooks/useAppSettings.ts` — Settings hook pair (useAppSettings + useUpdateSetting)
- `src/db/queries/appSettings.ts` — Settings query module (getAppSettings, upsertAppSetting)
- `src/types/unit.ts` §PAINTING_STATUS_ORDER — The 11 painting statuses (internal values, must not change)
- `src/features/dashboard/HobbyPipeline.tsx` — 5-bucket pipeline display (bucket labels are the customizable targets)
- `src/features/game-day/gameDayStore.ts` §DEFAULT_CHECKLIST — Current hardcoded checklist items and createDefaultState()
- `src/features/battle-log/BattleLogSheet.tsx` — Battle log form with free-text mission field

### Integration Points
- `src/features/units/UnitFilters.tsx` — Status filter dropdown (needs label resolver)
- `src/features/painting-projects/KanbanBoard.tsx` — Kanban column headers (needs label resolver)
- `src/features/units/StatusPopover.tsx` — Status change popover (needs label resolver)
- `src/features/dashboard/HobbyPipeline.tsx` — Pipeline bucket labels (needs label resolver)
- `src/features/game-day/gameDayStore.ts` — Checklist init (needs to read from settings)
- `src/features/battle-log/BattleLogSheet.tsx` — Mission pre-fill (needs to read from settings)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useAppSettings()` / `useUpdateSetting()`: Phase 121 settings hooks — use for all reads/writes
- `src/components/ui/tabs.tsx`: Already used in Settings page shell
- `@dnd-kit`: Already in project dependencies — use for checklist reorder
- `ChecklistTab` add-item pattern: Text input + button for adding items — reuse pattern in settings editor

### Established Patterns
- Settings stored as TEXT in `app_settings` table; JSON serialization/deserialization in hook layer
- React Query `staleTime` 5min with cache invalidation on mutation
- `PAINTING_STATUS_ORDER` as `const` array drives Kanban columns, filters, and status logic
- `gameDayStore` is Zustand with per-list state; `DEFAULT_CHECKLIST` is cloned per session

### Integration Points
- `HobbyPipeline` maps 11 statuses to 5 buckets with hardcoded bucket names — needs bucket-level label resolver
- `KanbanBoard` uses `PAINTING_STATUS_ORDER` directly for column headers — needs column-level label resolver
- `BattleLogSheet` has `DEFAULT_VALUES.mission = ""` — change to read from settings
- `gameDayStore.createDefaultState()` clones `DEFAULT_CHECKLIST` — change to read from settings

</code_context>

<specifics>
## Specific Ideas

No specific requirements — auto-mode selected recommended defaults for all gray areas.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 123-Hobby Defaults Tab*
*Context gathered: 2026-06-10*
