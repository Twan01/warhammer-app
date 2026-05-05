---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Full Circle
status: Defining requirements
stopped_at: Completed 22-hobby-goals-03-PLAN.md
last_updated: "2026-05-05T17:25:40.825Z"
last_activity: 2026-05-05 — Milestone v2.4 started
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 16
  completed_plans: 16
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05 after v2.4 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.4 Premium Dashboard UX & Visual Polish — grid layout, premium visuals, richer interactions, photos central, spending intelligence

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-05 — Milestone v2.4 started

## Accumulated Context

### Decisions Carried from v2.3

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet
- Migrations are append-only and immutable — new columns always via ALTER TABLE in a new numbered file
- Integer pence discipline (formatCurrency is the only /100 site)
- pnpm is the package manager — npm fails with workspace: protocol errors
- Tailwind v4 CSS-first theming — @theme inline {} block, no tailwind.config.js
- Design tokens: Forge Black, Gunmetal, Panel Elevated, Battle Gold defined in globals.css
- PageHeader shared component on all 9 pages
- StatusBadge 4-tier color system for 11 painting statuses
- Quick Add via QuickAddContext provider with 8-action dropdown

### Decisions from 21-wishlist-01

- Wishlist uses no updated_at column — matches battle_logs pattern, only creation time tracked
- Full-replacement UPDATE (no COALESCE) for wishlist nullable fields — allows clearing cost/notes to null
- Wishlist mutations invalidate dashboard-stats for forward compatibility with Dashboard wishlist widget

### Decisions from 21-wishlist-02

- Dialog (not AlertDialog) used for WishlistItemDeleteDialog — AlertDialog not installed (Phase 18 decision)
- Wishlist sidebar entry placed in MANAGEMENT_NAV with Heart icon (domain-appropriate for desired items)
- Hook-level mocking strategy for Wishlist tests (useWishlistItems/useFactions) — simpler than DB-level

### Decisions from 22-01

- Migration v10 for hobby_goals (v9 was already claimed by 009_wishlist.sql from Phase 21)
- goalSchema uses no .default() — form defaultValues handle defaults (Zod pitfall rule)
- deriveGoalStatus checks completed BEFORE expired (Pitfall 4) — ensures finished goals never show as "missed"
- getGoalProgress computes period boundaries at query time via computeGoalPeriod (not stored in DB)

### Decisions from 22-02

- useGoalProgress enabled when goals !== undefined (empty array triggers fetch) — not !!goals or goals?.length
- GoalSheet uses buildDefaultValues function with no zod .default() — period derived at submit time via currentPeriod(data.timeframe)
- Goals sidebar entry placed in COMMAND_NAV with Target icon after Painting Projects
- GoalsPage test uses getAllByText for Completed/Missed — status badge and section header both render these strings

### Decisions from 22-03

- Migration count is 10 (v1-v10) not 9 — plan was written before hobby_goals migration was added; correct count is 10
- Auto-approved human-verify checkpoint under auto_chain_active mode — automated pre-flight gate (610 tests + clean build) sufficient confidence for goals feature

### Tech Debt

- PROJ-02: REQUIREMENTS.md text still says "empty columns hidden" — KanbanBoard ships all 11 columns (approved UX)

### Pending Todos

None blocking.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-05T17:18:58.531Z
Stopped at: Completed 22-hobby-goals-03-PLAN.md
Resume: Run requirements definition → roadmap creation
