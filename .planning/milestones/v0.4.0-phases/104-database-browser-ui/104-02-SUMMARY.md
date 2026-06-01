---
phase: 104
plan: 2
status: complete
started: 2026-05-30
completed: 2026-05-30
commits:
  - 33ed0a8 feat(104): add database browser page, faction picker, and filter bar
  - b03927b feat(104): add virtualized unit list, unit rows, and search results
---

# Plan 104-02 Summary: Database Browser UI Components

Built the full browsing UI for the Unit Database browser across 6 new/updated files:

- **DatabaseBrowserPage.tsx** — Full page with debounced search bar, conditional two-panel vs search results layout, wired to Zustand filters and applyUdbFilters
- **FactionPicker.tsx** — Sidebar (w-60) grouping factions by alignment (Space Marines / Imperium / Chaos / Xenos) with active state highlighting and loading skeletons
- **UdbFilterBar.tsx** — Filter row with role Select, keyword Input, min/max points Inputs, and conditional Clear button (renamed from DatabaseBrowserFilters to avoid casing clash with databaseBrowserFilters.ts Zustand store)
- **UdbUnitList.tsx** — Virtualized list using @tanstack/react-virtual with discriminated union flat items (role headers + unit rows), loading skeletons, and empty state
- **UdbUnitRow.tsx** — Compact row showing unit name, role Badge, and base points
- **UdbSearchResults.tsx** — Cross-faction FTS5 search results with faction name, unit name, and keywords per result

All files pass `pnpm build` (tsc + vite).
