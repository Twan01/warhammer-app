# Phase 22: Hobby Goals - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can set monthly or quarterly painting targets — a unit count to complete by end of the period — and see live progress toward each goal calculated automatically from their journal session history. The Goals page provides CRUD for goals and displays progress. This phase does NOT include goal-based notifications, dashboard integration of goals, or goal templates.

</domain>

<decisions>
## Implementation Decisions

### Goal display layout
- Card-based grid layout, not table or list
- Each goal card shows: goal name, target count, current progress count, timeframe label, progress bar
- Progress bar uses faction-accent fill (consistent with StatCard progress pattern)
- Cards follow existing Card component styling: bg-card border border-border/60 shadow-sm

### Goal creation flow
- Side Sheet form (consistent with BattleLogSheet, ArmyListSheet, UnitSheet patterns)
- Fields: name (required), target unit count (required), timeframe (required dropdown: "This Month" / "This Quarter")
- Edit and create use the same Sheet component (null editingGoal = create mode)
- Sibling Sheet/Dialog portal pattern at page root — never nested

### Timeframe mechanics
- Fixed periods only: "This Month" and "This Quarter"
- Start/end dates derived automatically from current date at query time (not stored as explicit dates)
- Store the timeframe type ("month" | "quarter") and the period identifier (e.g. "2026-05" or "2026-Q2")
- Progress: COUNT(DISTINCT unit_id) from painting_sessions WHERE session_date falls within the goal's period
- A goal created mid-month still counts sessions from the start of that month

### Completed goals treatment
- Active and completed goals displayed on the same page
- Section grouping: "Active Goals" header above in-progress goals, "Completed" header above finished ones
- Completed goals (progress >= target): muted/success visual — battle-gold accent or check icon, slightly reduced opacity
- No auto-deletion of past goals — they remain as history until manually deleted
- Goals for expired periods (past month/quarter) that weren't completed show as "Missed" with a distinct muted style

### Navigation placement
- Goals page added to Command nav group (alongside Dashboard, Collection, Projects)
- Route: /goals
- Sidebar icon: Target (from lucide-react)
- Positioned after Painting Projects in COMMAND_NAV

### Claude's Discretion
- Exact card grid responsive breakpoints (grid-cols-1 / grid-cols-2 / grid-cols-3)
- Loading skeleton layout
- Error state handling
- Empty state illustration and copy
- Whether to show percentage text alongside the progress bar
- Delete confirmation dialog styling

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above and in ROADMAP.md success criteria (ANLY-01, ANLY-02, ANLY-03).

### Roadmap
- `.planning/ROADMAP.md` — Phase 22 success criteria (ANLY-01..03), depends on Phase 17

### Prior decisions (STATE.md)
- `.planning/STATE.md` — "hobby_goals table = migration 009", "ANLY-02 goal progress: COUNT(DISTINCT unit_id) from painting_sessions WHERE session_date falls within goal timeframe"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/card.tsx` (Card/CardContent): base card styling for goal cards
- `src/features/dashboard/StatCard.tsx`: progress bar pattern (h-0.5, bg-faction-accent, width percentage) — reuse for goal progress
- `src/components/common/PageHeader.tsx`: standard page header with title + subtitle + actions slot
- `src/db/queries/analytics.ts`: existing painting session query pattern (SELECT DISTINCT unit_id, session_date)
- `src/lib/dates.ts`: UTC-safe date utility for timeframe boundary calculations
- `src/types/paintingSession.ts`: PaintingSession interface (session_date is 'YYYY-MM-DD')

### Established Patterns
- Sheet-based CRUD: BattleLogSheet/ArmyListSheet pattern (create/edit in same Sheet, null entity = create)
- Sibling portal: Sheet + DeleteDialog mounted as siblings at page root
- React Query hooks: ENTITY_KEY + useEntity + useMutations pattern
- Query modules: one .ts file per entity in src/db/queries/
- Zod schema: entitySchema.ts in feature folder
- Empty state: icon-pill pattern (rounded-xl bg-muted/40 p-4 + heading + body + CTA)
- migration 009: append-only, ALTER TABLE discipline (but this is a new table, so CREATE TABLE)
- selectedEntityId pattern not needed (goals don't have a detail sheet — cards show everything)

### Integration Points
- `src-tauri/src/lib.rs`: migration version must be bumped to 9
- `src/app/router.tsx`: new /goals route
- `src/components/common/AppSidebar.tsx`: COMMAND_NAV array — add Goals entry after Painting Projects
- `src/hooks/useJournalSessions.ts`: mutations should invalidate goal progress queries (new sessions affect progress)
- `src/context/QuickAddContext.tsx`: potential "Add Goal" action (Claude's discretion)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Auto-mode selected all recommended defaults.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (auto mode).

</deferred>

---

*Phase: 22-hobby-goals*
*Context gathered: 2026-05-05*
