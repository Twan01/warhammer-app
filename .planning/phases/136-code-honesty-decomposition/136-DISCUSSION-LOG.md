# Phase 136: Code Honesty & Decomposition - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 136-code-honesty-decomposition
**Mode:** `--auto` (autonomous — recommended defaults selected, no interactive prompts)
**Areas discussed:** WeaponTable dedup, WeaponTable a11y scope, ArmyListDetailPage decomposition, Hook-layer bypass routing, promoted_to_reminder disposition

---

## HON-08 — Shared WeaponTable: canonical component

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `units/WeaponTable.tsx` as canonical, merge `UdbWeaponsTable` in, delete dup | Least churn; the name PLAY-01/requirements reference | ✓ |
| Promote a new shared component to `components/common/` | More "neutral" home but extra move + import churn | |
| Keep `UdbWeaponsTable` as canonical | Contradicts requirement wording (HON-08 names WeaponTable) | |

**Auto-choice:** Canonical = `src/features/units/WeaponTable.tsx`, union-prop merge, delete `UdbWeaponsTable.tsx`.
**Notes:** `[auto] HON-08 — Q: "Which weapon table becomes canonical and where does it live?" → Selected: "Keep units/WeaponTable.tsx, union-prop merge" (recommended default)`. Migrate one caller at a time with EN/FR snapshot parity (PITFALLS #12, ~7 surfaces).

---

## HON-08 — WeaponTable accessibility scope (CODEBASE-REVIEW IN-010)

| Option | Description | Selected |
|--------|-------------|----------|
| Pure mechanical dedup; defer a11y fix | Protects the "renders identically everywhere" acceptance bar | ✓ |
| Fold the semantic-`<table>` a11y fix into the dedup | Touch-it-once, but it's a behavior change that risks the identical-render guarantee | |

**Auto-choice:** Pure dedup; defer the div-grid→semantic-table fix.
**Notes:** `[auto] HON-08 a11y — Q: "Fix IN-010 div-grid a11y during the dedup, or defer?" → Selected: "Defer (pure mechanical dedup)" (recommended default)`. Captured in CONTEXT Deferred Ideas.

---

## HON-09 — ArmyListDetailPage decomposition boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| Follow ARCHITECTURE.md Q5 boundaries exactly | 5 research-specified seams; orchestrator <250, children <200; mechanical only | ✓ |
| Re-architect with a fresh component tree | Higher regression risk; violates "extract not rewrite" | |
| Minimal split (one or two extractions) | Leaves orchestrator over file-size convention | |

**Auto-choice:** Exact Q5 boundaries — ArmyListUnitTable, useArmyListExport, ArmyListQuickAdd, ArmyListPortals, ArmyListDetailHeader.
**Notes:** `[auto] HON-09 — Q: "What decomposition boundaries and size targets?" → Selected: "ARCHITECTURE.md Q5 boundaries, orchestrator <250 / children <200, mechanical block-moves, separate revertable commits" (recommended default)`. Dirty-branch caveat resolved (Theme A merged; freshness removed in Phase 133).

---

## HON-10 — Hook-layer bypass routing approach

| Option | Description | Selected |
|--------|-------------|----------|
| Named hook + `*_KEY` per genuine render-path bypass; reuse existing hooks; page-level Map for per-row data | Restores cache/invalidation without N+1; PITFALLS #8/#9/#14 | ✓ |
| Mechanically wrap every direct query call in a hook | Would wrap imperative one-shot handlers where a hook adds no cache value | |

**Auto-choice:** Hook-per-bypass with symmetry rule; scope to render-path reads; justify any imperative exclusions; no hook-in-loop.
**Notes:** `[auto] HON-10 — Q: "Reuse vs create hooks, and how to scope the 7 / avoid N+1?" → Selected: "Named hook + key per render-path bypass, reuse where possible, page-level Map for per-row data" (recommended default)`. Researcher pins the exact 7.

---

## HON-11 — promoted_to_reminder disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Remove via new migration (DROP COLUMN) + remove type field | Genuinely dead (zero source usage); honest per milestone theme | ✓ |
| Justify retention in schema comment | Cheaper (no migration) but keeps dead cruft against a "Honest" milestone | |

**Auto-choice:** Remove. New migration `ALTER TABLE battle_logs DROP COLUMN promoted_to_reminder` (never edit 027); update type + CreateBattleLogInput Omit; coordinate the migration-count parity gate (db-helpers / lib.rs / check-version) with LF line endings.
**Notes:** `[auto] HON-11 — Q: "Remove the vestigial column or justify retention?" → Selected: "Remove via new migration" (recommended default)`. Confirmed zero read/write usage in src/ and src-tauri/.

---

## Claude's Discretion

- Exact filenames/prop names for extracted ArmyListDetailPage children.
- Union-prop shape of the merged WeaponTable.
- Naming of new HON-10 hooks.

## Deferred Ideas

- WeaponTable semantic-table accessibility fix (IN-010) — behavior change, future a11y phase.
- Army-list quality findings IN-011 / IN-013 / IN-014 / IN-015 — do not fix during mechanical extraction; later cleanup phase.
