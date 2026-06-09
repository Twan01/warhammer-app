---
phase: 120-ui-wiring
plan: 02
subsystem: ui
tags: [react-query, sqlite, typescript, game-data, stratagems, enhancements, detachments, playbook]

# Dependency graph
requires:
  - phase: 120-ui-wiring
    plan: 01
    provides: useGameData.ts hooks and UdbStratagem/UdbEnhancement/UdbDetachment types
provides:
  - StrategemsTab wired to real stratagem data via useStratagemsByDetachment
  - RulesHubPage wired to real stratagems + detachments + detachment filter dropdown (D-05)
  - DetachmentPicker wired to real udb_detachments via useDetachmentsByFaction
  - EnhancementPickerSheet migrated from BSData to udb_enhancements (cost, descriptions)
  - PlaybookDetachmentAbilities new component grouped by detachment
  - DetachmentRulesSection wired to real hooks (stubs eliminated)
  - All six requirements met: STR-03, STR-04, ENH-02, ENH-03, DET-03, DET-04
affects: [game-day, rules-hub, army-lists, units]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase normalization: strip trailing ' phase' suffix before PHASE_ORDER matching"
    - "Detachment filter dropdown in RulesHubPage uses local useState (not Zustand) — not persisted"
    - "EnhancementPickerSheet guards switched from detachment_name to detachment_id"
    - "PlaybookDetachmentAbilities uses Map-grouped useMemo over UdbDetachmentAbilityWithDetachment[]"

key-files:
  created:
    - src/features/units/PlaybookDetachmentAbilities.tsx
  modified:
    - src/features/game-day/StrategemsTab.tsx
    - src/features/rules-hub/RulesHubPage.tsx
    - src/features/army-lists/DetachmentPicker.tsx
    - src/features/army-lists/EnhancementPickerSheet.tsx
    - src/features/army-lists/DetachmentRulesSection.tsx
    - src/features/units/PlaybookTab.tsx

key-decisions:
  - "Phase normalization: Wahapedia phase values include ' phase' suffix ('Shooting phase') — strip before comparing with PHASE_ORDER bare names"
  - "Detachment filter in RulesHubPage is local state (not Zustand) — resets when faction changes, no persistence needed"
  - "useSharedAbilitiesByFaction kept as local stub in RulesHubPage — shared abilities remain out of Phase 120 scope"
  - "EnhancementPickerSheet: hasFaction guard uses list?.faction_id (not factionIdStr coercion) since detachment_id-based fetch does not need faction"
  - "DetachmentRulesSection: auto-fixed as part of Rule 3 — blocking TypeScript error from StratagemCard type migration in Plan 01"

# Metrics
duration: 25min
completed: 2026-06-08
---

# Phase 120 Plan 02: Page Component Wiring Summary

**All six stub hooks replaced with real canonical data imports; EnhancementPickerSheet migrated from BSData to udb_enhancements with cost and HTML descriptions; PlaybookDetachmentAbilities new collapsible component added to PlaybookTab**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-08T18:45:00Z
- **Completed:** 2026-06-08T19:10:00Z
- **Tasks:** 2
- **Files modified:** 6 updated + 1 new

## Accomplishments

- Wired StrategemsTab, RulesHubPage, DetachmentPicker, and DetachmentRulesSection to real canonical hooks from useGameData.ts — all local stubs eliminated
- Added detachment filter Select dropdown to RulesHubPage stratagems tab (D-05), populated from useDetachmentsByFaction, filters client-side by detachment_id
- Migrated EnhancementPickerSheet from BSData (synced_enhancements) to canonical udb_enhancements — uses useEnhancementsByDetachment, references enhancement.cost, shows HTML descriptions via dangerouslySetInnerHTML, "Free" label for cost === 0
- Created PlaybookDetachmentAbilities.tsx: useDetachmentAbilities hook, grouped by detachment_name, collapsible (collapsed by default), HTML descriptions
- Inserted PlaybookDetachmentAbilities into PlaybookTab after PlaybookRules when wahapediaFactionId is truthy

## Task Commits

1. **Task 1: Wire StrategemsTab, RulesHubPage, DetachmentPicker, DetachmentRulesSection** — `8d910d4` (feat)
2. **Task 2: Migrate EnhancementPickerSheet + create PlaybookDetachmentAbilities** — `6a1ff5a` (feat)

## Files Created/Modified

- `src/features/game-day/StrategemsTab.tsx` — removed stub, imports useStratagemsByDetachment + UdbStratagem; normalizePhase() helper strips " phase" suffix
- `src/features/rules-hub/RulesHubPage.tsx` — replaced stubs with useStratagemsByFaction + useDetachmentsByFaction; added detachment filter Select; retained useSharedAbilitiesByFaction stub
- `src/features/army-lists/DetachmentPicker.tsx` — removed stub, imports useDetachmentsByFaction; updated empty message
- `src/features/army-lists/DetachmentRulesSection.tsx` — auto-fixed: removed stubs, imports useDetachmentAbilitiesByDetachment + useStratagemsByDetachment; dangerouslySetInnerHTML for descriptions
- `src/features/army-lists/EnhancementPickerSheet.tsx` — full BSData-to-udb migration; useEnhancementsByDetachment; cost field; HTML descriptions; "Free" for cost 0
- `src/features/units/PlaybookDetachmentAbilities.tsx` — new component: useDetachmentAbilities, Map grouping, Collapsible, dangerouslySetInnerHTML
- `src/features/units/PlaybookTab.tsx` — added PlaybookDetachmentAbilities import + conditional render after PlaybookRules

## Decisions Made

- Phase normalization strips " phase" suffix from Wahapedia phase values before comparing against bare PHASE_ORDER names
- Detachment filter in RulesHubPage is local component state — resets on faction change, no Zustand store modification needed
- `hasFaction` guard in EnhancementPickerSheet uses `list?.faction_id` directly (no string coercion needed since fetch is by detachment_id)
- DetachmentRulesSection was auto-fixed in the same task (blocking TypeScript error from StratagemCard type upgrade)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] DetachmentRulesSection.tsx stubs caused TypeScript build failure**
- **Found during:** Task 1 TypeScript verification
- **Issue:** DetachmentRulesSection still had local stubs `useStratagemsByDetachment` returning `RwStratagem[]` and `useDetachmentAbilitiesByDetachment` returning `RwDetachmentAbility[]`. After StratagemCard was migrated to UdbStratagem in Plan 01, the existing stub type became incompatible, blocking compilation.
- **Fix:** Replaced both stubs with real imports from `useGameData.ts`; updated ability description rendering to use `dangerouslySetInnerHTML`; updated empty-state message to reference unit database import
- **Files modified:** src/features/army-lists/DetachmentRulesSection.tsx
- **Commit:** 8d910d4 (included in Task 1 commit)

**2. [Rule 1 - Bug] RulesHubPage.tsx SharedAbilityCard type mismatch**
- **Found during:** Task 1 TypeScript verification
- **Issue:** Local stub type `{ id: string; name: string; description: string | null; legend?: string | null }` did not match `RwAbility` required by SharedAbilityCard (missing `faction_id`, `legend` optional vs required)
- **Fix:** Updated stub return type to include `faction_id: string | null` and `legend: string | null` (non-optional)
- **Files modified:** src/features/rules-hub/RulesHubPage.tsx
- **Commit:** 8d910d4 (included in Task 1 commit)

**3. [Rule 1 - Bug] EnhancementPickerSheet.tsx unused useMemo import**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `useMemo` import left in file after migration removed the useMemo usage; strict `noUnusedLocals` catches this
- **Fix:** Removed the unused `useMemo` import
- **Files modified:** src/features/army-lists/EnhancementPickerSheet.tsx
- **Commit:** 6a1ff5a (included in Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking stub removal, 2 bugs)
**Impact on plan:** All necessary correctness fixes. No scope creep.

## Known Stubs

- `useSharedAbilitiesByFaction` in RulesHubPage.tsx — intentionally retained (shared abilities are out of Phase 120 scope, deferred to future milestone)

## Threat Surface Scan

No new security-relevant surfaces introduced. dangerouslySetInnerHTML usage follows established pattern (T-120-01/T-120-02 accepted in Plan 01 threat model) — data from controlled Wahapedia CSV import, not user input.

## Requirements Completed

- STR-03: StrategemsTab shows real stratagem data from udb_stratagems
- STR-04: RulesHubPage stratagems tab shows real stratagems with detachment/phase/CP filters
- ENH-02: Enhancement picker uses canonical udb_enhancements cost (not BSData points)
- ENH-03: Enhancement picker shows HTML descriptions from Wahapedia
- DET-03: DetachmentPicker shows real detachment names from udb_detachments
- DET-04: PlaybookTab shows detachment abilities grouped by detachment

## Self-Check: PASSED

- src/features/units/PlaybookDetachmentAbilities.tsx — FOUND
- src/features/game-day/StrategemsTab.tsx (useStratagemsByDetachment import) — FOUND
- src/features/rules-hub/RulesHubPage.tsx (useStratagemsByFaction import) — FOUND
- src/features/army-lists/DetachmentPicker.tsx (useDetachmentsByFaction import) — FOUND
- src/features/army-lists/EnhancementPickerSheet.tsx (useEnhancementsByDetachment import) — FOUND
- Commits 8d910d4, 6a1ff5a — FOUND
- pnpm build: succeeded

---
*Phase: 120-ui-wiring*
*Completed: 2026-06-08*
