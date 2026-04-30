# Phase 1: App Shell - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the desktop foundation: Tauri + React shell launches on Windows with a collapsible sidebar, TanStack Router routes to placeholder pages, SQLite plumbing confirmed, dark mode without FOUC, and all shadcn/ui components installed. No data, no real UI — just a solid, confirmed foundation before any data work begins.

</domain>

<decisions>
## Implementation Decisions

### Sidebar layout
- Collapsible sidebar — toggles between expanded (icons + labels, ~240px) and icon-only mode (~48px)
- Settings is pinned to the bottom of the sidebar, visually separated from the main nav items by a spacer
- Active (current page) item uses a filled rounded background highlight (shadcn muted/accent style)
- Collapse state is persisted in `localStorage` so it survives app restarts

### Claude's Discretion
- Exact sidebar toggle button placement and icon (chevron or hamburger)
- Tooltip behavior in icon-only mode (show label on hover — standard pattern)
- Dark theme color palette specifics (zinc/slate/neutral base — match "dark slate, serious command center" feel from PROJECT.md)
- App window default dimensions and min constraints (reasonable desktop defaults)
- shadcn theme radius and CSS custom property values

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### App Shell requirements
- `.planning/REQUIREMENTS.md` §Setup — SETUP-01 through SETUP-10 and POLISH-06: full spec for scaffold, sidebar entries, routing, dark mode FOUC fix, TanStack Query defaults, Tauri SQL capabilities, AppData dir, folder structure, preload config, and shadcn batch install
- `.planning/ROADMAP.md` §Phase 1 — Success criteria (5 items) that define done for this phase

### Architecture constraints
- `.planning/REQUIREMENTS.md` §Out of Scope — Prisma and Drizzle at runtime are explicitly excluded; `tauri-plugin-sql` directly is the chosen path
- `.planning/STATE.md` §Decisions — Pre-roadmap decisions: tauri-plugin-sql (no ORM), all 10 tables in one migration, @dnd-kit for Kanban

### Project context
- `.planning/PROJECT.md` — Visual style ("dark slate background, faction-colored accents, rounded cards, serious dashboard"), constraints, and key decisions table

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing components, hooks, or utilities.

### Established Patterns
- None yet — Phase 1 establishes all patterns (folder structure, query client config, Tauri capability wiring).

### Integration Points
- Phase 1 creates the integration points that all subsequent phases connect to:
  - TanStack Router route tree (Phase 2+ adds real page implementations)
  - TanStack Query `QueryClient` provider (Phase 2+ adds hooks)
  - SQLite `getDb()` singleton (Phase 2 adds the schema migration)
  - Sidebar nav entries (already wired to routes — nothing to add)

</code_context>

<specifics>
## Specific Ideas

- No specific "I want it like X" references — PROJECT.md describes "serious dashboard, not toy-like" with "dark slate background, faction-colored accents, rounded cards, compact tables"
- shadcn/ui collapsible sidebar pattern (built-in `Sidebar` component in shadcn) is a natural fit for the collapsible requirement

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-app-shell*
*Context gathered: 2026-04-30*
