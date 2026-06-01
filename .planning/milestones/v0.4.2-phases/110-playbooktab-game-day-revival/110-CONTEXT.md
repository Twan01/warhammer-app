# Phase 110: PlaybookTab & Game Day Revival - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase surfaces canonical unit data (stats, weapons, abilities) from `udb_*` tables into PlaybookTab and Game Day views, stabilizes once-per-game toggle keys to survive re-imports, and enhances army list validation with canonical role/keyword checks. No new pages or tables — this is integration work connecting existing UI to the canonical database built in Phase 108.

**Requirements in scope:** INT-01, INT-02, INT-03, INT-04 (4 requirements)

</domain>

<decisions>
## Implementation Decisions

### PlaybookTab Canonical Data (INT-01)
- **D-01:** PlaybookTab already has a working data pipeline (`useDatasheet` → `getUdbUnitDetail` → `PlaybookDatasheet` + `PlaybookStats`). The work here is verification and gap-filling: ensure all sections render canonical data when a `udb_unit_id` link exists, and that the stat block (M/T/Sv/W/Ld/OC), weapon profiles, and ability text are never empty/null for linked units.
- **D-02:** `applyIncomingStats` already auto-populates empty fields on datasheet link. If a user has manually entered stats that differ from canonical, keep the user's values (existing behavior is correct — only fills nulls).

### Game Day Weapon Profiles (INT-02)
- **D-03:** Add a new collapsible "Weapons" section to `UnitAbilityCard`, positioned between the OPG abilities section and the regular abilities section. This puts the most tactically relevant data (range, attacks, strength, AP, damage) in the most visible spot during gameplay.
- **D-04:** Reuse the `WeaponTable` component from `PlaybookDatasheet.tsx` — extract it to a shared location (e.g., `src/features/units/WeaponTable.tsx`) so both PlaybookDatasheet and UnitAbilityCard can import it. Same visual treatment: ranged/melee split, stat columns, weapon keywords.
- **D-05:** The weapon section should default to collapsed in Game Day (unlike PlaybookTab where it defaults open), since Game Day cards are compact and the user opens them on-demand during play.

### OPG Key Stability (INT-03)
- **D-06:** Change OPG key format from `${unit.unit_id}::${ability.id ?? ability.name}` to `${unit.unit_id}:${ability.name}`. The `ability.id` is an AUTOINCREMENT integer from `udb_unit_abilities` that can change across re-imports; `ability.name` is stable across re-imports.
- **D-07:** Add a `version` + `migrate` function in the Zustand `persist` config for `gameDayStore`. Migration converts existing `usedAbilities` keys where ability name is recoverable, or resets them (losing a few in-progress toggles is acceptable — this is a one-time migration for data stability).
- **D-08:** Use single colon `:` as the separator (not `::`) for the composite key: `unit_id:ability_name`. This is the format specified in the success criteria.

### Enhanced Composition Validation (INT-04)
- **D-09:** Extend `computeListWarnings` with three additional soft-warning checks using `udb_unit_keywords` and `udb_units.role`:
  1. DEDICATED TRANSPORT count cannot exceed non-TRANSPORT, non-CHARACTER unit count
  2. EPIC HERO keyword units must be unique (max 1 copy per list)
  3. Role distribution summary (count per role) — informational, not a warning
- **D-10:** All new checks are soft warnings (not hard errors) since house rules vary. The existing BATTLELINE check stays as-is.
- **D-11:** Query keywords via the existing `getUdbKeywordsByFaction` function or a similar batch query. Avoid N+1 queries — fetch all keywords for the faction once, then check per-unit in pure JS.

### Claude's Discretion
- Exact file structure for extracting `WeaponTable` (could stay in PlaybookDatasheet and be re-exported, or move to a new file)
- Zustand migration version numbering scheme
- Whether to add a dedicated `useUnitKeywords` hook or inline the query in the validation path
- Collapsible animation timing and styling details in Game Day

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PlaybookTab Pipeline
- `src/features/units/PlaybookTab.tsx` — Main PlaybookTab component; already imports `getUdbUnitDetail`, has `applyIncomingStats` for auto-population
- `src/features/units/PlaybookDatasheet.tsx` — Renders weapons (WeaponTable) and abilities (AbilityEntry) from canonical data; `WeaponTable` needs extraction for reuse
- `src/features/units/PlaybookStats.tsx` — Stat block rendering (M/T/Sv/W/Ld/OC)
- `src/hooks/useDatasheet.ts` — Hook resolving `units.udb_unit_id` → `getUdbUnitDetail()`; staleTime: Infinity

### Game Day Components
- `src/features/game-day/UnitAbilityCard.tsx` — Target for INT-02 (weapon profiles) and INT-03 (OPG key fix); currently shows abilities + OPG toggles
- `src/features/game-day/gameDayStore.ts` — Zustand store with `usedAbilities: string[]` using current `unit_id::ability.id` key format; needs migration
- `src/features/game-day/GameDayPage.tsx` — Game Day page root
- `src/features/game-day/UnitsTab.tsx` — Renders UnitAbilityCard list

### Validation & Warnings
- `src/lib/computeUnitWarnings.ts` — `computeListWarnings` already has BATTLELINE check; target for INT-04 enhanced checks
- `src/db/queries/unitDatabase.ts` — `getUdbKeywordsByFaction`, `getUdbUnitDetail`, `UdbKeyword` type with `is_faction` flag

### Data Layer
- `src/db/queries/unitDatabase.ts` — Full query layer for udb_* tables; `UdbWeapon`, `UdbAbility`, `UdbKeyword`, `UdbUnitDetail` types
- `src/types/armyList.ts` — `ArmyListUnitRow` type used by computeUnitWarnings

### Planning Context
- `.planning/REQUIREMENTS.md` — INT-01..INT-04 requirement definitions
- `.planning/ROADMAP.md` — Phase 110 success criteria and dependency on Phase 108

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WeaponTable` in `PlaybookDatasheet.tsx` — renders ranged/melee weapon stat tables; extract for shared use
- `AbilityEntry` in `PlaybookDatasheet.tsx` — renders ability name + description with border-left styling
- `isOncePerGame()` in `UnitAbilityCard.tsx` — detects "once per battle/game" abilities from text
- `getUdbKeywordsByFaction()` — batch keyword query already exists for faction-level keyword loading
- `useGameDayStore` — Zustand persist with localStorage; `usedAbilities: string[]` tracks OPG toggles

### Established Patterns
- `useDatasheet(unitId)` resolves collection unit → canonical detail via `units.udb_unit_id` FK
- Collapsible sections use shadcn `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` with ChevronDown icon
- Zustand stores use `persist` middleware with `name` key for localStorage
- Warning checks are pure functions in `computeUnitWarnings.ts` — no side effects, no hooks
- `ArmyListUnitRow` already has `udb_role` field populated from canonical data

### Integration Points
- `UnitAbilityCard` receives `unit: ArmyListUnitRow` which has `unit_id` (collection) and `udb_role` — the datasheet hook resolves from `unit_id`
- `computeListWarnings` receives `units: Array<Pick<ArmyListUnitRow, "udb_role" | "unit_id">>` — needs keywords added to the Pick type for INT-04
- Game Day store persists to `localStorage` key `"game-day-state"` — Zustand migration affects this key

</code_context>

<specifics>
## Specific Ideas

- WeaponTable extraction should be minimal: move the component + its types to a shared file, update both import sites
- OPG key migration: since ability names are already in the datasheet data, the migration can map old `id`-based keys to `name`-based keys by loading the current datasheet. Fallback: if mapping fails, just clear the stale entries (fresh game state)
- EPIC HERO check: look for `is_faction = 0` keywords containing "Epic Hero" in `udb_unit_keywords`
- DEDICATED TRANSPORT check: look for `role = 'Dedicated Transport'` in `udb_units`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 110-PlaybookTab & Game Day Revival*
*Context gathered: 2026-06-01*
