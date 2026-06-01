# Phase 111: Bilingual Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 111-Bilingual Infrastructure
**Areas discussed:** Translation overlay format, Query layer locale strategy, Locale toggle placement & persistence, FTS5 bilingual search
**Mode:** --auto (all decisions auto-selected)

---

## Translation Overlay Format (FR-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Structured by entity type | JSON mirroring DB table structure: factions, units, abilities, weapons, keywords | ✓ |
| Flat single-level | All translations under one key by composite ID | |

**User's choice:** Auto-selected: Structured by entity type (recommended default)
**Notes:** Mirrors DB tables, easy for build script to consume per-table.

---

## Query Layer Locale Strategy (FR-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit locale parameter | `locale?: 'en' \| 'fr'` on query functions; COALESCE in SQL when fr | ✓ |
| Global locale store in query layer | Query functions read from Zustand directly | |

**User's choice:** Auto-selected: Explicit locale parameter (recommended default)
**Notes:** Clean, testable, no global state coupling in query layer. Hooks pass locale from store.

---

## Locale Toggle Placement & Persistence (FR-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar footer toggle | Small EN/FR toggle near collapse button; Zustand persist + localStorage | ✓ |
| Settings page or header bar | Would require building a Settings page that doesn't exist yet | |

**User's choice:** Auto-selected: Sidebar footer toggle (recommended default)
**Notes:** Follows useSidebarCollapsed and gameDayStore patterns. Invalidates udb_* query keys on change.

---

## FTS5 Bilingual Search (FR-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Single FTS5 with concatenated French | French names added to existing udb_search content column | ✓ |
| Separate FTS5 tables per locale | One index per language; doubles maintenance | |

**User's choice:** Auto-selected: Single FTS5 with concatenated French (recommended default)
**Notes:** One index covers both languages. Rebuilt inside existing Rust import transaction.

---

## Claude's Discretion

- Build script internal structure for overlay loading
- Zustand store implementation details
- Which query functions need locale vs. which can skip
- React Query key structure
- Toggle component styling
- Error handling for missing/malformed translations file

## Deferred Ideas

None — discussion stayed within phase scope
