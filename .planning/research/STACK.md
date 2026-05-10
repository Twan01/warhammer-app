# Stack Research

**Domain:** Rules Data Hub UI / Army Lists 2.0 / Game Day Mode — Tauri 2 desktop app addition
**Researched:** 2026-05-10
**Confidence:** HIGH (all additions verified against existing installed packages)

---

## What This Covers

This is a subsequent-milestone stack audit. The v0.2.8 features (Rules Data Hub UI, Army Lists 2.0 with detachment/stratagem integration, Game Day Mode, Playbook enhancements) build entirely on the validated v0.2.7 stack. The question is: what gaps exist, and what is needed for the new capabilities?

**Conclusion: No new npm packages are required.** Every capability needed for v0.2.8 is already present in the installed dependency tree. The additions are architectural patterns, not new dependencies.

---

## Existing Stack (Do Not Re-Research)

All validated and installed at v0.2.7:

| Technology | Version | Role |
|------------|---------|------|
| Tauri 2 + tauri-plugin-sql | ^2.0.0 | Desktop shell + SQLite bridge |
| React 19 + TypeScript 5 | ^19.0.0 / ^5.6.3 | UI layer |
| TailwindCSS 4 + shadcn/ui | 4.2.4 | Styling + primitive components |
| TanStack Router | ^1.168.26 | File routing |
| TanStack Query | ^5.100.6 | Server/DB state |
| TanStack Table | ^8.21.3 | Filterable table primitives |
| Zustand 5 | ^5.0.12 | Filter + ephemeral UI state |
| @dnd-kit/core + sortable | 6.3.1 / 10.0.0 | Drag-and-drop |
| Recharts | 3.8.0 | Charts |
| Zod 4 | ^4.4.1 | Schema validation |
| React Hook Form | ^7.74.0 | Forms |
| Lucide React | ^0.460.0 | Icons |
| Sonner | ^2.0.7 | Toast notifications |
| cmdk | ^1.1.1 | Command palette primitives (used by shadcn Combobox) |

---

## Stack Additions for v0.2.8

### None Required

All three feature areas map cleanly onto existing primitives:

| Feature Area | Capability Needed | Existing Tool |
|---|---|---|
| Rules browser search/filter | Text filter + multi-select dropdowns | Zustand store + shadcn Combobox (cmdk-based) |
| Rules browser table | Sortable, filterable columns | TanStack Table (already used in CollectionPage) |
| Sync status dashboard | Stat cards + freshness badge | shadcn Card + Badge (pattern from PlaybookTab) |
| Detachment selector | Single-select dropdown with search | shadcn Combobox |
| Stratagem phase grouping | Group-by logic in JS + shadcn Tabs | TanStack Query + shadcn Tabs |
| Stale data warnings | Query freshness check | getRulesSyncMeta hook (already built) |
| Game Day checklist | Checkbox state + persistence | Zustand persist middleware (built-in, unused so far) |
| Game Day phase tabs | Tab navigation | shadcn Tabs |
| Playbook favorites | hobbyforge.db column + React Query | tauri-plugin-sql + existing query pattern |
| Playbook user notes on rules | hobbyforge.db column | Same as above |
| Reminder flagging | DB column + filter | Same pattern as override markers |

---

## Recommended Patterns (No New Packages)

### Rules Browser Filter State

Use the existing Zustand pattern from PaintsPage and CollectionPage verbatim. Create `src/features/rules-hub/rulesHubFilters.ts` with a Zustand store for:
- `search: string` — text filter across name + description
- `factionId: string | null` — faction selector
- `type: string | null` — stratagem/ability/detachment type filter

Do NOT use TanStack Router search params for these filters. The project decision (see PROJECT.md) is ephemeral Zustand filters — filters reset on navigation, matching every other page in the app.

### Game Day Mode Checklist Persistence

Use Zustand `persist` middleware with `localStorage`. This is the only v0.2.8 feature that needs state surviving navigation, because a player leaving Game Day mid-game and returning should see their checklist intact.

```typescript
// src/features/game-day/gameDayStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameDayStore {
  checkedReminders: Record<string, boolean>;   // reminderId -> checked
  selectedArmyListId: number | null;
  selectedDetachmentId: string | null;
  toggle: (reminderId: string) => void;
  reset: () => void;
}

export const useGameDayStore = create<GameDayStore>()(
  persist(
    (set) => ({
      checkedReminders: {},
      selectedArmyListId: null,
      selectedDetachmentId: null,
      toggle: (id) => set((s) => ({
        checkedReminders: { ...s.checkedReminders, [id]: !s.checkedReminders[id] }
      })),
      reset: () => set({ checkedReminders: {} }),
    }),
    { name: 'hobbyforge-game-day' }  // localStorage key
  )
);
```

The `persist` middleware ships with Zustand 5 — no additional installation needed.

### Army Lists 2.0 Detachment Integration

The existing `army_lists` table in hobbyforge.db needs a `selected_detachment_id TEXT` column (new migration). The detachment data already exists in rules.db via `rw_detachments` and `useDetachmentsByFaction` hook (built in Phase 43). The pattern is:

1. Query `useDetachmentsByFaction(wahapediaFactionId)` — already works
2. Add a Combobox selector in `ArmyListDetailSheet` — uses existing shadcn Combobox
3. Save `selected_detachment_id` to hobbyforge.db via migration + query update
4. Display related stratagems via existing `useStratagemsByFaction` filtered by `detachment_id`

No new hooks or query patterns needed — Phase 43 built exactly this read layer.

### Stale Rules Warning

`getRulesSyncMeta` and `getSyncFreshness` (from `src/lib/syncFreshness.ts`) are already built. Display freshness badges in Army Lists using the same `FRESHNESS_DOT_CLASS` pattern from PlaybookTab. No new code required — reuse the existing utilities.

### Rules Hub Page Route

Add a new `/rules` route to `src/app/router.tsx`. TanStack Router's flat route pattern means this is a 5-line addition matching the existing SettingsPage or GoalsPage pattern.

### Playbook Favorites and User Notes on Rules

These require new hobbyforge.db columns only (SQLite migration). The query/hook/UI pattern is identical to `useUpsertStrategyNote`. Suggested table:

```sql
-- Migration: add user_rule_notes table
CREATE TABLE IF NOT EXISTS user_rule_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,  -- 'stratagem' | 'ability' | 'detachment_ability'
  entity_id   TEXT NOT NULL,  -- Wahapedia string ID
  notes       TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(entity_type, entity_id)
);
```

---

## What NOT to Add

| Library | Why Not | Use Instead |
|---------|---------|-------------|
| Fuse.js / flexsearch | Fuzzy search adds a dependency for a problem SQLite already solves | SQLite `LIKE '%term%'` on name + description. Fast enough for <10K rules rows — same pattern used everywhere in the app |
| React Window / Virtuoso | List virtualization | Rules tables have <500 rows per faction. TanStack Table without virtualization is sufficient. Defer if perf problems appear. |
| Immer | Immutable state | Zustand 5 handles immutable updates cleanly without Immer. The checklist toggle above shows the pattern. |
| Redux / Jotai | Additional state manager | Zustand is established across 9 pages. Mixing state libraries creates inconsistency. |
| Drizzle ORM | Type-safe query builder | Confirmed dead-end (PROJECT.md). tauri-plugin-sql direct parameterized queries continue. |
| TanStack Virtual | Row virtualization | Unnecessary at this data scale; adds complexity. |
| date-fns / dayjs | Date utilities | `src/lib/dates.ts` already covers all needs (todayISO, relativeDate, getSyncAgeLabel). |
| React DnD | Alternative DnD library | @dnd-kit is already installed and proven for two use cases. |

---

## Integration Points With Existing Architecture

### Dual-DB Pattern Continuation

Game Day and Rules Hub both read from rules.db via `getRulesDb()`. Favorites/notes write to hobbyforge.db via `getDb()`. This is the established dual-query merge pattern — no change to the architecture.

### Cache Key Conventions

Follow existing naming for new hooks:
```typescript
export const RULES_HUB_STRATAGEMS_KEY = (factionId: string) =>
  ["rules-hub-stratagems", factionId] as const;
export const USER_RULE_NOTES_KEY = (entityType: string, entityId: string) =>
  ["user-rule-notes", entityType, entityId] as const;
```

Use `staleTime: Infinity` for rules.db reads (same as `useDatasheet`, `useRulesExtended`) — content only changes on explicit user-triggered sync.

### Migration Numbering

hobbyforge.db is at migration 017 after v0.2.7. v0.2.8 additions:
- Migration 018: `selected_detachment_id TEXT` column on `army_lists`
- Migration 019: `user_rule_notes` table (favorites + user notes on rules entities)

Both follow the "never edit existing migrations" rule from PROJECT.md.

### Cache Invalidation Symmetry

When `useRulesSync` runs, it must also invalidate `["user-rule-notes"]` prefix if notes reference entities that may have changed. The symmetry rule from PROJECT.md: if `useCreate` invalidates a key, `useDelete` must too.

---

## Version Compatibility Verification

All packages verified against package.json at v0.2.7:

| Package | Installed | Capability for v0.2.8 | Status |
|---------|-----------|----------------------|--------|
| zustand ^5.0.12 | YES | `persist` middleware for Game Day checklist | Ships with Zustand 5, no extra install |
| @tanstack/react-table ^8.21.3 | YES | Rules browser filterable/sortable table | Already used in CollectionPage |
| cmdk ^1.1.1 | YES | Combobox search for detachment selector | shadcn Combobox depends on this |
| radix-ui ^1.4.3 | YES | Tabs + Checkbox for Game Day mode | Already in component library |
| lucide-react ^0.460.0 | YES | Star/bookmark icons for favorites | Already installed |

---

## Sources

- `C:\Documents\Claude Apps\Warhammer App\.planning\PROJECT.md` — HIGH confidence (ground truth for decisions and installed stack)
- `package.json` at v0.2.7 — HIGH confidence (definitive installed deps list)
- `src/hooks/useRulesExtended.ts` — HIGH confidence (Phase 43 read layer already built for detachments/stratagems)
- `src/hooks/useRulesSync.ts` — HIGH confidence (full sync pipeline with diff/snapshot built)
- [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) — HIGH confidence
- [TanStack Router search params guide](https://tanstack.com/router/latest/docs/guide/search-params) — HIGH confidence (confirms Zustand is correct choice for ephemeral filters vs URL params)

---
*Stack research for: HobbyForge v0.2.8 — Rules Data Hub UI / Army Lists 2.0 / Game Day Mode*
*Researched: 2026-05-10*
