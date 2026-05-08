---
phase: 2
slug: data-layer-entity-crud
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-30
audited: 2026-05-03
---

# Phase 2 — Validation Strategy

> Retroactive Nyquist audit (State A — prior VALIDATION.md existed but predated test framework).
> Phase shipped 2026-04-30. Test framework established in later phases. Gap closure added 2026-05-03.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Gap closure command** | `npx vitest run tests/foundation/useUnits.test.ts --reporter=verbose` |
| **Estimated runtime** | ~23 seconds (full suite: 210 tests) |

---

## Sampling Rate

Phase 2 is complete and shipped. Retroactive validation — sampling is one-time.

- **Gap closure test added:** `tests/foundation/useUnits.test.ts` (DATA-09)
- **Full suite must remain green after gap closure:** ✅ 210/210 green

---

## Per-Requirement Coverage Map

| Req | Description | Classification | Test / Evidence |
|-----|-------------|---------------|-----------------|
| DATA-03 | 10-table schema (no model_instances) | MANUAL-ONLY | Schema grep + manual smoke — `001_core_schema.sql` presence verified in 02-01 acceptance criteria |
| DATA-04 | `model_instances` table absent | MANUAL-ONLY | `grep model_instances src-tauri/migrations/001_core_schema.sql` exits 1 — acceptance criteria |
| DATA-05 | Migrations run once, idempotent | MANUAL-ONLY | Requires Tauri IPC; `lib.rs` `get_migrations()` source-verified in 02-01; live verified in 02-04 checkpoint |
| DATA-06 | TypeScript types compile (Unit, Faction, Paint, Recipe, RecipePaint) | MANUAL-ONLY | `pnpm exec tsc --noEmit` exits 0 — verified at end of every plan |
| DATA-07 | Query functions (getFactions, getUnits, etc.) return typed results | MANUAL-ONLY | Require Tauri SQLite IPC — not testable in jsdom; mocked by 9 downstream test files |
| DATA-08 | TanStack Query hooks (useFactions, useUnits, usePaints, etc.) | MANUAL-ONLY | Hook structure verified by build + downstream tests; direct DB calls require IPC |
| DATA-09 | `useCreateUnit`, `useUpdateUnit`, `useDeleteUnit` each invalidate `["dashboard-stats"]` | **COVERED** | `tests/foundation/useUnits.test.ts` (6 targeted tests + 3 key-constant tests, 9 total green) |
| UNIT-06 | `PAINTING_STATUS_ORDER` exported from `src/types/unit.ts` (11-step enum) | **COVERED** | `tests/painting/kanbanUtils.test.ts` uses `PAINTING_STATUS_ORDER` for column ordering; `tests/painting/KanbanBoard.test.tsx` drives Kanban with it |
| SEED-01 | 4 factions seeded with stable IDs | MANUAL-ONLY | Requires Tauri app launch; verified in 02-04 checkpoint Step 13 |
| SEED-02 | 5 units seeded with stable IDs | MANUAL-ONLY | Same — verified in 02-04 checkpoint |
| SEED-03 | 6 paints seeded with stable IDs | MANUAL-ONLY | Same |
| SEED-04 | 3 recipes + 11 recipe_paints seeded | MANUAL-ONLY | Same |
| SEED-05 | All seed inserts use `INSERT OR IGNORE` (idempotent) | MANUAL-ONLY | SQL source-verified; live idempotency confirmed in 02-04 checkpoint |
| SEED-06 | Personal-use disclaimer in README.md | MANUAL-ONLY | File presence — verified in 02-01 |
| FACT-01..05 | Faction CRUD (create, edit, delete, nav, color border) | MANUAL-ONLY | UI interaction; Tauri IPC; all 8 sign-off criteria passed in 02-03 checkpoint |
| UNIT-01..05 | Unit CRUD (category combobox, create, edit, status, delete) | MANUAL-ONLY | UI interaction; Tauri IPC; all 14 sign-off criteria passed in 02-04 checkpoint |
| PAINT-01..02 | Paint CRUD (create/edit, FK-blocked delete) | MANUAL-ONLY | UI interaction + FK enforcement; all 14 sign-off criteria passed in 02-04 checkpoint |

*Status: ✅ covered · MANUAL-ONLY (justified — Tauri IPC, FK enforcement, seed data, CRUD UI)*

---

## Gap Closure (Retroactive)

One requirement had no automated test prior to this audit:

| Gap | New Test File | Tests Added |
|-----|---------------|-------------|
| DATA-09 (`useUnits` → `["dashboard-stats"]` invalidation) | `tests/foundation/useUnits.test.ts` | 9 — UNITS_KEY constant, UNIT_KEY(id), useCreateUnit (×2), useUpdateUnit (×3), useDeleteUnit (×2) |

Test passes green with `npx vitest run tests/foundation/useUnits.test.ts` (9/9, ~2s).

---

## Manual-Only Justifications

All MANUAL-ONLY classifications are permanent for this phase:

- **DATA-03/04/05, SEED-01..06**: Require a running Tauri app + SQLite IPC bridge — jsdom cannot execute SQLite migration files
- **DATA-06**: TypeScript compilation — verified by `tsc --noEmit` at CLI level, not a unit test
- **DATA-07/08**: Query and hook functions call `getDb()` which calls `Database.load("sqlite:hobbyforge.db")` — tauri-plugin-sql returns a rejected promise outside the Tauri WebView; all downstream tests correctly mock these layers
- **FACT-01..05, UNIT-01..05, PAINT-01..02**: CRUD UI flows require live user interaction with the running app; FK enforcement requires live SQLite with FK pragma active

---

## Validation Audit 2026-05-03

| Metric | Count |
|--------|-------|
| Requirements audited | 18 |
| Gaps found | 1 (DATA-09) |
| Resolved by gap closure | 1 |
| Escalated to manual-only | 0 |
| Already manual-only (justified) | 16 |
| Already covered (UNIT-06) | 1 |

---

## Validation Sign-Off

- [x] All testable requirements have automated coverage
- [x] Manual-only classifications are justified (Tauri IPC, SQLite, FK enforcement, CRUD UI)
- [x] Gap closure test passes: 9/9 green
- [x] Full suite green after gap closure: 210 passed, 3 skipped (Phase 10 stubs)
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** compliant 2026-05-03
