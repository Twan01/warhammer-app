# Phase 62: Applied Recipe Data Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 62-Applied Recipe Data Layer
**Areas discussed:** FK cascade behavior, Section-level progress tracking, Completion percentage logic, Assignment table extras
**Mode:** --auto (all decisions auto-selected)

---

## FK Cascade Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| ON DELETE CASCADE for both FKs | Deleting unit or recipe removes assignments + progress | ✓ |
| ON DELETE SET NULL | Keep assignment record with NULL reference | |
| ON DELETE RESTRICT | Prevent deletion while assignments exist | |

**User's choice:** [auto] ON DELETE CASCADE — consistent with recipe→section→step CASCADE pattern
**Notes:** No orphaned data. Matches existing cascade conventions.

---

## Section-Level Progress Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from steps | Count completed steps per section's order_index range | ✓ |
| Store separately | Additional section_progress table | |

**User's choice:** [auto] Derive from steps — sections use DELETE-all + re-INSERT, so stored progress would break
**Notes:** computeAssignmentProgress returns bySectionId breakdown derived at query time.

---

## Completion Percentage Logic

| Option | Description | Selected |
|--------|-------------|----------|
| Simple ratio | completed / total * 100, all steps count equally | ✓ |
| Weighted by section | Different sections contribute different weights | |

**User's choice:** [auto] Simple ratio — straightforward, testable, optional sections still count
**Notes:** Users skip steps by not marking them. No need for section weighting in v1.

---

## Assignment Table Extras

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal (id, unit_id, recipe_id, created_at) | Just the mapping, no extras | ✓ |
| Extended (+ notes, active, priority) | Additional metadata fields | |

**User's choice:** [auto] Minimal schema — extras are scope creep for data layer phase
**Notes:** Extensions can be added in future migrations if needed.

---

## Claude's Discretion

- Migration file numbering
- Test file organization and specific test cases
- Batch step progress query optimization
- Defensive checks in query functions

## Deferred Ideas

None — discussion stayed within phase scope
