---
slug: stratagem-favorite-star
status: resolved
trigger: user-report
created: 2026-05-22
resolved: 2026-05-22
---

# Debug: Stratagem Favorite Star Not Working

## Symptoms
- Clicking the star icon on stratagem cards in the army list detachment view does nothing visible
- The star never toggles to filled/active state after clicking

## Root Cause
In `src/features/army-lists/DetachmentRulesSection.tsx`, the `StratagemCard` was rendered with hardcoded `favorite={null}` and `note={null}` props (line 69). This meant:

1. The mutation **did fire** on click (writing to the database), but the UI never reflected it because the parent component never fetched the favorites data
2. Since `favorite` was always `null`, the toggle always called `upsertFavorite` (never `deleteFavorite`), so clicking repeatedly just re-inserted the same row
3. The reminder toggle was also broken for the same reason

The Rules Hub page (`RulesHubPage.tsx`) correctly uses `useRulesFavorites()` and `useRulesNotes()` hooks with lookup maps, but the army list detachment section was never wired up.

## Fix
Added `useRulesFavorites()` and `useRulesNotes()` hooks to `DetachmentRulesSection`, built `favoritesMap` and `notesMap` via `useMemo`, and passed the looked-up values to each `StratagemCard` -- matching the pattern already used in `RulesHubPage.tsx`.

## Resolution
- **root_cause**: DetachmentRulesSection hardcoded `favorite={null}` instead of looking up user favorites from the database
- **fix**: Wired up useRulesFavorites and useRulesNotes hooks with Map lookups, passing real data to StratagemCard
- **file_changed**: `src/features/army-lists/DetachmentRulesSection.tsx`

## Evidence
- timestamp: 2026-05-22 — DetachmentRulesSection.tsx line 69 passes `favorite={null} note={null}` to every StratagemCard
- timestamp: 2026-05-22 — RulesHubPage.tsx line 241 shows correct pattern: `favorite={favoritesMap.get(s.id + ':stratagem') ?? null}`
- timestamp: 2026-05-22 — StratagemCard.tsx handleToggleFavorite logic is correct but depends on parent-supplied `favorite` prop
- timestamp: 2026-05-22 — TypeScript check passes after fix
