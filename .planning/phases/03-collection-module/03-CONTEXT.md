# Phase 3: Collection Module - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

The Collection page is the primary daily-use interface — users see, search, filter, and manage their full unit list. This phase also lands all cross-cutting polish patterns (loading states, toasts, form reset, faction accents) at scale for the first time. No Kanban, no recipe builder — those are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Layout
- Data table, not card grid — dense rows, sortable columns, TanStack Table
- Column headers are sortable (ascending/descending toggle); sort state is ephemeral (session only, like filters)
- Paginated — 25 units per page with page controls at the bottom

### Visible columns
Default columns in order: Name, Faction badge, Category, Painting status, Progress bar, Points, Model count, Active project flag, Actions
- All columns visible by default; no hidden/toggleable columns in v1
- Progress bar driven by `painting_percentage` (shadcn Progress component)
- Active project flag: small icon/badge when `is_active_project = true`

### Faction color accent (POLISH-05)
- Faction name rendered as a colored Badge in each row — hex from `faction.color_theme` applied as badge background or border
- NOT the 4px left border pattern from Phase 2 faction cards (that pattern is scoped to the Factions page)
- Phase 2 established the pattern; Phase 3 extends it to the unit table as a colored badge

### Inline status update UX (COLL-10)
- Status badge in the table row is clickable → opens a Popover with the full PAINTING_STATUS_ORDER list (Command + Popover pattern, same as CategoryCombobox from Phase 2)
- Current status is highlighted/checked in the list; user picks a new status — 2 clicks
- Update is **optimistic**: badge changes immediately on selection; DB write happens in background; rollback + Sonner error toast on failure
- Same clickable-badge behavior is available inside the unit detail Sheet (not read-only there)

### Unit detail Sheet (COLL-09)
- Clicking a unit row opens a Sheet (right side panel) — same component used for UnitSheet edit form
- Content is **read-only** styled text displaying all unit fields: name, faction, category, all status fields, painting_percentage progress bar, points, model count, purchase info, notes
- "Edit unit" button at the bottom opens UnitSheet (existing Phase 2 component) for full editing
- Status badge inside the drawer is also clickable (same popover pattern as the table) — quick status update without going into full edit
- `key={unit.id}` on the Sheet content prevents stale state when switching between units (POLISH-04)

### Filter state (COLL-07)
- Zustand store — ephemeral, not persisted to URL or localStorage
- Filters: search (name, live), faction (multi-select), painting status (multi-select), category (multi-select), active project only (toggle)

### Cross-cutting polish (POLISH-01 through POLISH-05)
- POLISH-01: Delete confirm dialog before destructive actions (reuse UnitDeleteDialog from Phase 2)
- POLISH-02: Skeleton loading state while units fetch (shadcn Skeleton installed)
- POLISH-03: Sonner toast on mutation error (Toaster already mounted in AppLayout)
- POLISH-04: `key={unit.id}` on all unit form instances
- POLISH-05: Faction-color badge in table rows (see Faction color accent above)

### Claude's Discretion
- Exact filter UI presentation (dropdown popovers vs. horizontal bar vs. collapsible panel)
- Empty state illustration/icon vs. text-only
- Exact page size options (25 default; whether to offer 10/50 alternatives)
- Column header sort icons
- Popover positioning and animation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 requirements and success criteria
- `.planning/REQUIREMENTS.md` §Collection Page (Phase 2 UI) — COLL-01 through COLL-13: full spec for table, search, filters, detail drawer, inline status update, progress bar, empty state, delete confirm
- `.planning/REQUIREMENTS.md` §Cross-cutting Polish — POLISH-01 through POLISH-05: delete confirms, loading states, error toasts, form reset, faction accents
- `.planning/ROADMAP.md` §Phase 3 — 6 success criteria and the 4-plan breakdown (03-01 table, 03-02 filters, 03-03 detail drawer, 03-04 form/delete/polish)

### Existing code to read before planning
- `src/features/units/UnitSheet.tsx` — existing add/edit Sheet form (reuse for Edit flow from detail drawer)
- `src/features/units/UnitDeleteDialog.tsx` — existing delete confirm dialog (reuse or extend)
- `src/features/units/CategoryCombobox.tsx` — Popover + Command pattern to follow for the status update popover
- `src/features/units/unitSchema.ts` — zod schema for unit form
- `src/hooks/useUnits.ts` — mutation hooks with invalidation patterns (useUpdateUnit for status changes)
- `src/db/queries/units.ts` — getUnits() returns all units; no server-side filtering; TanStack Table handles client-side filtering/sorting/pagination

### Architecture constraints
- `.planning/REQUIREMENTS.md` §Out of Scope — Prisma and Drizzle at runtime excluded; tauri-plugin-sql directly
- `.planning/PROJECT.md` — visual style constraints ("dark slate, compact tables, serious command center"), folder structure (`src/features/*`, `src/db/queries/*`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/units/UnitSheet.tsx`: Full add/edit Sheet form — reuse as-is for the Edit button in the detail drawer. No duplication needed.
- `src/features/units/UnitDeleteDialog.tsx`: Delete confirm dialog — reuse for COLL-13/POLISH-01.
- `src/features/units/CategoryCombobox.tsx`: Popover + Command + shouldFilter pattern — template for the status update popover (COLL-10).
- `src/features/units/unitSchema.ts`: zod schema — available for form instances.
- `src/hooks/useUnits.ts`: `useUnits()`, `useUnit(id)`, `useCreateUnit()`, `useUpdateUnit()`, `useDeleteUnit()` — all ready. `useUpdateUnit` handles the optimistic status mutation.
- `src/components/ui/table.tsx`: shadcn Table — base for TanStack Table integration.
- `src/components/ui/badge.tsx`: For faction badge and active project indicator.
- `src/components/ui/progress.tsx`: For painting_percentage progress bar in each row.
- `src/components/ui/skeleton.tsx`: For loading state (POLISH-02).
- `src/components/ui/sheet.tsx`: For detail drawer and edit form.
- `src/components/ui/popover.tsx` + `command.tsx`: For the status update popover (COLL-10).
- `src/components/ui/sonner.tsx` + Toaster in AppLayout: Error toasts already wired.

### Established Patterns
- Feature folder: `src/features/units/` — all Collection components go here
- DB access: only via `src/db/queries/units.ts` → `src/hooks/useUnits.ts` → component (never direct DB in components)
- Popover + Command pattern: CategoryCombobox shows the approach — shouldFilter, keyboard-friendly, click-to-select
- TanStack Router: manual route tree in `src/app/router.tsx` — `/collection` route needs a real page component replacing the placeholder

### Integration Points
- `src/app/router.tsx`: replace CollectionPage placeholder with real `CollectionPage` component
- Zustand filter store: new file `src/features/units/collectionFilters.ts` (or `src/store/collectionFilters.ts`) — needs Zustand installed if not already present
- TanStack Table: new dependency `@tanstack/react-table` — not yet in the project
- `useUpdateUnit` in `useUnits.ts`: already handles status mutations with dashboard-stats invalidation (DATA-09 forward-compat)

</code_context>

<specifics>
## Specific Ideas

- Status popover should mirror the CategoryCombobox pattern exactly — same Popover + Command approach, with PAINTING_STATUS_ORDER as the list source
- Faction badge in the table row: `<Badge style={{ backgroundColor: faction.color_theme }}>Tau Empire</Badge>` — same hex-driven approach as Phase 2's 4px border, different visual expression
- Detail Sheet opens from a row click; the same Sheet is reused when "Edit unit" is clicked inside it (stacked open state or close-and-reopen)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-collection-module*
*Context gathered: 2026-05-01*
