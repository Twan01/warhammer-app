# Phase 78: Dashboard Command Center + Game Day After-Action - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 78-Dashboard Command Center + Game Day After-Action
**Areas discussed:** Next Action Selection, Primary Army List, End Game Flow, Forgotten Rules Persistence, After-Action UX
**Mode:** --auto (all decisions auto-selected)

---

## Next Action Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Most-recently-updated assignment | Sort by updated_at DESC, first incomplete step | ✓ |
| User-pinned assignment | Let user pin a "current project" | |
| Oldest incomplete first | FIFO ordering | |

**User's choice:** [auto] Most-recently-updated assignment (recommended default)
**Notes:** Strongest signal for personal single-user app. useRecipeAssignments already returns updated_at.

---

## Primary Army List

| Option | Description | Selected |
|--------|-------------|----------|
| Most recently edited | Sort by updated_at DESC | ✓ |
| User-selected "active" list | Explicit selection stored in settings | |
| Last Game Day list | Carry over from most recent game session | |

**User's choice:** [auto] Most recently edited (recommended default)
**Notes:** Simple, no additional state needed. User naturally edits the list they care about.

---

## End Game Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Button in GameDayHeader → BattleLogSheet pre-fill | Reuse existing sheet with defaultValues | ✓ |
| Dedicated End Game page/wizard | Multi-step flow | |
| Auto-detect (close Game Day = end game) | Implicit trigger | |

**User's choice:** [auto] Button in GameDayHeader → BattleLogSheet pre-fill (recommended default)
**Notes:** Reuses existing BattleLogSheet pattern. Pre-fills army_list_id, battle_date, opponent_faction.

---

## Forgotten Rules Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| JSON array column on battle_log | forgotten_rules TEXT, parsed on read | ✓ |
| Separate reminders table | New table with FK to battle_log | |
| localStorage | Client-side only, no backup | |

**User's choice:** [auto] JSON array column on battle_log (recommended default)
**Notes:** Simple schema, data naturally scoped to battle context. Recent 3 logs queried for faction-specific reminders in future Game Day sessions.

---

## After-Action UX

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible section in BattleLogSheet | Extended form below core fields | ✓ |
| Separate after-action sheet | Dedicated sheet post-save | |
| Step-by-step wizard | Multi-step guided flow | |

**User's choice:** [auto] Collapsible section in BattleLogSheet (recommended default)
**Notes:** One form, one save. Existing columns (mvp_unit_id, underperforming_unit_id, lessons_learned, changes_next_time) already in schema.

---

## Claude's Discretion

- Dashboard card ordering and layout within CSS grid
- Card styling and visual hierarchy
- Empty state copy and design
- Collapsible section styling for after-action fields
- Forgotten rules display format in Game Day checklist
- Whether Next Painting Action card navigates to recipe/unit

## Deferred Ideas

None — discussion stayed within phase scope
