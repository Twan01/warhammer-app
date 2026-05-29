# Research Summary: v0.4.0 Unit Database — Canonical 40k Data Hub

**Synthesized:** 2026-05-29
**Confidence:** HIGH
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

## Executive Summary

v0.4.0 is an architectural pivot replacing a fragile runtime sync pipeline (Wahapedia CSV + BSData XML) with a pre-built canonical SQLite database bundled with the app. This eliminates WAL checkpoint race conditions, 20% name-matching failures, and cross-database query limitations. The product is a fully offline unit database browser where every unit links to the user's collection and army lists by stable ID.

Strict five-phase build: schema and data first (blocking everything), then browser UI, then collection FK integration, then army list points simplification, then rules.db elimination. Only two new dependencies needed. The key risk is data acquisition — parsing BSData XML and Wahapedia CSVs into a well-structured JSON artifact is the hardest part and blocks all UI work.

## Stack Additions

| Library | Version | Type | Purpose |
|---------|---------|------|---------|
| @tanstack/react-virtual | ^3.13.26 | Runtime | Virtual scrolling for 2500+ unit lists |
| fast-xml-parser | ^4.5.3 | devDependency | BSData XML parsing in build script |
| better-sqlite3 | ^12.10.0 | Already installed | Build script DB writes |
| SQLite FTS5 | Built-in | N/A | Full-text search via migration DDL |

No new Rust crates. Tauri resource bundling + `std::fs::copy` in setup hook.

**What NOT to add:** New ORM, separate SQLite file for unit data (defeats single-DB goal), runtime scraping libraries, react-window (maintenance mode).

## Feature Table Stakes

- Faction picker grouped by alignment (Imperium / Space Marines / Chaos / Xenos)
- Unit list per faction in 9 official GW role categories (confirmed from 40k.app)
- Points on unit list row ("from X pts" for tiered units) — present in every reference tool
- Full datasheet detail: stat block with Inv Sv, ranged + melee weapon tables, abilities, keywords, damaged profile
- Offline-first — zero network dependency after install
- Composition text (min/max model counts)

## Key Differentiators (unique to HobbyForge)

- "Add to Collection" from datasheet — faction/role/keywords pre-populated, FK set on creation
- Ownership + readiness badges on unit list rows (LEFT JOIN against collection)
- Global FTS5 cross-faction search
- Points tier table with all model-count brackets

## Explicitly Defer

- Leader attachment bidirectional links (BSData parsing risk)
- Unit comparison / competitive tier ratings
- Multi-game-system support
- GW-visual-style datasheet layout (use HobbyForge design system)

## Architecture Direction

- Single `hobbyforge.db` with `udb_*` tables; `rules.db` eliminated in Phase 5
- Data pipeline: Node.js build script → `unit_database.json` → Rust `import_unit_database` command → `udb_*` tables
- Army list points: 6-level COALESCE → 2-level FK join
- React Query `staleTime: Infinity` for all `udb_*` queries
- Lazy loading: faction list (~30 rows) → unit names on select → full detail on unit select
- Entity IDs: reuse Wahapedia string IDs so existing `rules_favorites_notes` annotations survive

## Critical Pitfalls

1. **Migration not registered in lib.rs** — real incident (migration 032); run parity test before every build
2. **Data seeded via migrations causes boot loop** — keep migrations schema-only; use Rust command for data
3. **WAL stale reads after bulk write** — emit `PRAGMA wal_checkpoint(TRUNCATE)` before React Query invalidation
4. **20% name mismatch in collection backfill** — nullable FK, fuzzy match, Data Health diagnostic for unlinked units
5. **Removing rules.db before all consumers migrated** — 7+ call sites use `getRulesDb()`; keep alive through Phases 1–4

## Suggested Phase Order

| # | Phase | Risk | Key Deliverable |
|---|-------|------|-----------------|
| 1 | Data Acquisition & Schema | HIGH | Canonical data exists; `import_unit_database` Rust command works |
| 2 | Database Browser UI | LOW | Browsable product; validates data completeness |
| 3 | Collection Integration | MEDIUM | FK migration; "Add from Database"; ownership badges |
| 4 | Army List Simplification | LOW | COALESCE chain simplified; points from FK join |
| 5 | Cleanup: rules.db Elimination | MEDIUM | Single database; dead code removed |

Phase ordering is non-negotiable — each has hard dependencies on the previous.

---
*Synthesized: 2026-05-29 from STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
