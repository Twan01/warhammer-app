# Phase 110: PlaybookTab & Game Day Revival - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 110-PlaybookTab & Game Day Revival
**Areas discussed:** PlaybookTab canonical data, Game Day weapon profiles, OPG key stability, Enhanced composition validation
**Mode:** --auto (all decisions auto-selected)

---

## PlaybookTab Canonical Data Display (INT-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Verify + fill gaps | Ensure all sections render canonical data when udb_unit_id link exists | ✓ |
| Full rewrite | Rebuild PlaybookTab to always show canonical data (ignore user edits) | |

**Auto-selected:** Verify + fill gaps (recommended default)
**Notes:** PlaybookTab already has full pipeline working from Phase 107. Work is verification and gap-filling, not a rewrite. User's manual edits take precedence over canonical (existing `applyIncomingStats` only fills nulls).

---

## Game Day Weapon Profiles (INT-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Between OPG and abilities | New collapsible Weapons section after OPG toggles, before regular abilities | ✓ |
| After all abilities | Weapons section at the bottom of the card | |
| Inline with abilities | Mix weapons into the abilities list | |

**Auto-selected:** Between OPG and abilities (recommended default)
**Notes:** Most tactically relevant data during gameplay. Reuse WeaponTable from PlaybookDatasheet.tsx. Default collapsed in Game Day (compact cards).

---

## OPG Key Stability (INT-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate with fallback | Change format + Zustand migrate function, clear unmappable keys | ✓ |
| Clean break | Change format, no migration (reset all toggle state) | |

**Auto-selected:** Migrate with fallback (recommended default)
**Notes:** Current keys use AUTOINCREMENT `ability.id` which is unstable across re-imports. New format: `unit_id:ability_name`. Zustand persist `migrate` handles conversion; unmappable keys are cleared (acceptable loss).

---

## Enhanced Composition Validation (INT-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Three soft checks | DEDICATED TRANSPORT ratio, EPIC HERO uniqueness, role distribution | ✓ |
| Full rules engine | Comprehensive composition validation including detachment rules | |

**Auto-selected:** Three soft checks (recommended default)
**Notes:** All new checks as soft warnings (house rules vary). Uses existing `udb_role` and `udb_unit_keywords` data. Avoids over-engineering a full rules engine.

---

## Claude's Discretion

- File structure for WeaponTable extraction
- Zustand migration version numbering
- Whether to add dedicated useUnitKeywords hook or inline query
- Collapsible animation/styling details

## Deferred Ideas

None — discussion stayed within phase scope
