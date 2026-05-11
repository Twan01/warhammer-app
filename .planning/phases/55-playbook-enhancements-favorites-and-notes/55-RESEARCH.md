# Phase 55: Playbook Enhancements — Favorites and Notes - Research

**Researched:** 2026-05-11
**Domain:** React UI extension — toggle controls, debounced textarea, optimistic mutations, shared component extraction
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Toggle placement**
- Star icon (Lucide `Star`) and reminder flag icon (Lucide `Flag`) placed inline on the trigger row of each rule card/entry, alongside existing badges
- Star + flag icons grouped on the left side of the trigger row (before the rule name), note indicator on the right side (after badges) — clear "user actions" zone
- Both toggles always visible (no hover reveal) — desktop app where discoverability matters
- Star: filled yellow (`text-yellow-500 fill-yellow-500`) for favorited, outline for unfavorited
- Flag: filled blue (`text-blue-500 fill-blue-500`) for active reminder, outline for inactive
- Star and flag are independent toggles (is_reminder is separate from favorite status per Phase 52 decision)

**Note interaction pattern**
- Note textarea appears inside the card's expanded content area, below the rule description
- Separated from rule content by a thin separator — reinforces boundary between synced and user data
- "Your Notes" label above textarea, styled with `SECTION_LABEL_CLASS` pattern
- Debounced auto-save (500ms) on textarea change using `useUpsertRulesNote` — no explicit save button for a single text field
- Auto-growing textarea, minimum 2 rows — consistent with existing `TEXTAREA_CLASS` pattern in PlaybookTab
- Collapsed cards with existing notes show a small note indicator icon (Lucide `StickyNote`) in the trigger row — helps users find annotated rules

**Visual distinction (PLAY-04)**
- Cards with any user annotation (favorite, reminder, or note) get a subtle primary-color left border and very light background tint (`bg-primary/5`)
- Consistent with the `isStatOverridden` visual in PlaybookTab stats (border-primary bg-primary/5 pattern)
- Note section clearly separated from imported rule content with separator and distinct label

**Integration surfaces**
- **RulesHubPage cards:** StratagemCard, DetachmentCard, SharedAbilityCard — add star, flag, and note controls
- **PlaybookTab entries:** StratagemEntry, DetachmentSection, ExtendedAbilityEntry — add star, flag, and note controls
- Extract a reusable `RuleAnnotationControls` component (star + flag + note indicator) used in both locations
- Card layout stays different between PlaybookTab (compact entries) and RulesHub (Collapsible cards)

**Data loading strategy**
- Call `useRulesFavorites()` and `useRulesNotes()` once at the page/tab level
- Build `Map<compositeKey, RulesFavorite>` and `Map<compositeKey, RulesNote>` for O(1) lookup per card
- Composite key: `${rule_id}:${rule_type}` string concatenation
- Pass relevant data down as props — avoids N+1 hooks per card

### Claude's Discretion
- Whether to add a "My Favorites" filter toggle on RulesHubPage (useful but not required by PLAY-01–04)
- Exact spacing and sizing of star/flag icons relative to card text
- Whether note indicator in collapsed view shows note preview text or just an icon
- Debounce timing adjustment (500ms is starting point)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAY-01 | User can mark any rule (stratagem, ability, detachment ability) as a favorite | `useRulesFavorites` + `useUpsertRulesFavorite` + `useDeleteRulesFavorite` are fully built in Phase 52. Star toggle wires directly to upsert/delete. |
| PLAY-02 | User can mark any rule as a "Game Day reminder" | `is_reminder` field exists on `RulesFavorite`. Toggling `is_reminder=1` on an existing or new favorite is a single upsertRulesFavorite call. RemindersSection in Phase 54 already consumes `is_reminder=1` rows — no downstream changes needed. |
| PLAY-03 | User can add personal notes to any imported rule without modifying source data | `useRulesNotes` + `useUpsertRulesNote` are fully built in Phase 52. Note lives in hobbyforge.db keyed by (rule_id, rule_type). Debounced textarea triggers upsert on change. |
| PLAY-04 | Favorites and notes visually distinct from imported data in PlaybookTab | `bg-primary/5` + `border-l border-primary` applied when any annotation exists. Same pattern as `isStatOverridden` in PlaybookTab. |
</phase_requirements>

---

## Summary

Phase 55 is a pure UI wiring phase. All data-layer infrastructure — the `rules_favorites` and `rules_notes` tables, their CRUD queries, and the React Query hooks with optimistic updates — was completed in Phase 52. This phase only needs to build UI controls that call those existing hooks and surface the resulting data visually.

The work decomposes into two parallel tracks: (1) extract a shared `RuleAnnotationControls` component (star + flag toggles + note indicator) and a `RuleNoteEditor` component (textarea with debounced save); (2) wire both into the existing card components (`StratagemCard`, `DetachmentCard`, `SharedAbilityCard`) and PlaybookTab entry components (`StratagemEntry`, `DetachmentSection`, `ExtendedAbilityEntry`). The data loading pattern — one hook call per page, Maps for O(1) lookup, props drilled to cards — prevents N+1 query problems and avoids conditional hook violations.

The only non-trivial design decision is the composite key structure (`${rule_id}:${rule_type}`) for Map lookups. This pattern is already established in Phase 52 queries and must be applied consistently across both integration surfaces.

**Primary recommendation:** Implement in two plans — Plan 55-01 builds the shared `RuleAnnotationControls` + `RuleNoteEditor` components and wires RulesHubPage; Plan 55-02 wires PlaybookTab entries.

---

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | existing | Star, Flag, StickyNote icons | Already used throughout app |
| @tanstack/react-query | existing | useRulesFavorites, useRulesNotes hooks | App-wide server state tool |
| React (useState, useEffect, useCallback, useRef) | 19 | Debounce timer for auto-save | Core React |

**No new npm packages required.** All libraries are already installed.

### Debounce Pattern
No external debounce library needed. Implement inline with `useRef` + `useEffect` cleanup:
```typescript
// Pattern used within RuleNoteEditor
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleChange(value: string) {
  setLocalText(value);
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => {
    upsertNote.mutate({ rule_id, rule_type, rule_name, note_text: value });
  }, 500);
}

// Cleanup on unmount
useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
```

---

## Architecture Patterns

### Recommended New File Structure
```
src/features/rules-hub/
  RuleAnnotationControls.tsx   # Star + Flag toggles + StickyNote indicator (trigger row)
  RuleNoteEditor.tsx           # Textarea with debounced auto-save (expanded area)
  StratagemCard.tsx            # Extended: receives favorite/note props
  DetachmentCard.tsx           # Extended: receives favorite/note props
  SharedAbilityCard.tsx        # Extended: receives favorite/note props
  RulesHubPage.tsx             # Extended: loads favorites/notes, builds Maps, passes props

tests/rules-hub/
  RuleAnnotationControls.test.tsx   # Star/flag toggle behavior
  RuleNoteEditor.test.tsx           # Debounced save behavior
  StratagemCard.test.tsx            # New file — annotation props render
```

PlaybookTab is modified in place (no new file — it is already large, entries are module-local sub-components).

### Pattern 1: Page-level data loading with Map lookup

Load once at the page/tab level, not per card:

```typescript
// In RulesHubPage and PlaybookTab
const { data: favorites = [] } = useRulesFavorites();
const { data: notes = [] } = useRulesNotes();

const favoritesMap = useMemo(() => {
  const m = new Map<string, RulesFavorite>();
  for (const f of favorites) m.set(`${f.rule_id}:${f.rule_type}`, f);
  return m;
}, [favorites]);

const notesMap = useMemo(() => {
  const m = new Map<string, RulesNote>();
  for (const n of notes) m.set(`${n.rule_id}:${n.rule_type}`, n);
  return m;
}, [notes]);
```

Pass `favorite={favoritesMap.get(`${stratagem.id}:stratagem`) ?? null}` and `note={notesMap.get(...) ?? null}` as props to each card.

### Pattern 2: RuleAnnotationControls — trigger row icons

```typescript
// src/features/rules-hub/RuleAnnotationControls.tsx
interface RuleAnnotationControlsProps {
  ruleId: string;
  ruleType: RuleType;
  ruleName: string;
  favorite: RulesFavorite | null;
  hasNote: boolean;
  onToggleFavorite: () => void;
  onToggleReminder: () => void;
}
```

`onToggleFavorite` and `onToggleReminder` are passed as callbacks from the card — the card holds the mutation instances (one upsert, one delete per card component). This keeps `RuleAnnotationControls` a pure presentational component, making it trivially testable.

**CRITICAL — stopPropagation on toggle clicks:** Star and flag buttons sit inside the `CollapsibleTrigger`. Without `e.stopPropagation()`, clicking either icon will also expand/collapse the card. Every icon button must call `e.stopPropagation()`.

### Pattern 3: Card annotation prop signature

```typescript
// Extended StratagemCard props
interface StratagemCardProps {
  stratagem: RwStratagem;
  favorite: RulesFavorite | null;
  note: RulesNote | null;
}
```

Same pattern for DetachmentCard and SharedAbilityCard. The cards become responsible for:
1. Instantiating `useUpsertRulesFavorite()` and `useDeleteRulesFavorite()` — or calling passed callbacks
2. Computing `isAnnotated = favorite !== null || note !== null` for border/background styling
3. Rendering `<RuleAnnotationControls>` in the trigger row
4. Rendering `<RuleNoteEditor>` in the collapsed content area

**Preferred approach per CONTEXT.md:** Cards receive favorite/note data as props and also call the mutation hooks themselves (not passed callbacks). This matches DetachmentCard's existing pattern of calling `useDetachmentAbilitiesByDetachment` internally.

### Pattern 4: PlaybookTab entry annotation

`StratagemEntry`, `DetachmentSection`, and `ExtendedAbilityEntry` are module-local sub-components in PlaybookTab.tsx. They need to be extended to accept `favorite`, `note`, and the mutation callbacks (or instantiate mutations themselves — choose one approach and be consistent).

Because PlaybookTab already calls many hooks, the clean approach is:
1. Call `useRulesFavorites()` and `useRulesNotes()` once in the `PlaybookTab` function body
2. Build the Maps in PlaybookTab (same useMemo pattern as above)
3. Pass `favorite` and `note` as props down to `StratagemEntry`, `DetachmentSection`, `ExtendedAbilityEntry`
4. Each entry sub-component instantiates its own `useUpsertRulesFavorite` / `useDeleteRulesFavorite` — consistent with how `DetachmentSection` calls `useDetachmentAbilitiesByDetachment` internally

### Pattern 5: DetachmentCard annotation complexity

DetachmentCard is the most complex case because it has multiple abilities per card. Each detachment ability has its own `rule_id` and `rule_type = 'detachment_ability'`. The card renders a list of abilities inside collapsed content — each ability needs its own star/flag/note row.

The `DetachmentCard` receives `detachment.id` as the primary key. For ability-level annotations:
- Abilities are fetched inside the card via `useDetachmentAbilitiesByDetachment`
- The card needs `favoritesMap` and `notesMap` as props (not just a single favorite/note)
- Alternatively: pass `favoritesMap` and `notesMap` as props and do the lookup per ability inside the card

**Recommended:** Pass `favoritesMap: Map<string, RulesFavorite>` and `notesMap: Map<string, RulesNote>` props to `DetachmentCard` (instead of a single pre-looked-up `favorite`/`note`). The card does per-ability lookups internally. This is the only card requiring this pattern.

For the detachment itself (if users want to favorite the detachment as a whole): use `${detachment.id}:detachment_ability` — but CONTEXT.md scope covers abilities specifically. Clarify during planning whether detachment-level favorites are needed or just ability-level.

### Anti-Patterns to Avoid

- **Conditional hook inside card map:** Never call `useRulesFavorites()` inside a `.map()` callback — it violates Rules of Hooks. Load once at page level, pass via props.
- **Missing stopPropagation on toggle buttons:** Toggle icons inside `CollapsibleTrigger` will bubble up and toggle the collapsible unless stopped.
- **Empty string note deletion:** If the user clears a note textarea to empty, the app should either delete the note row or upsert an empty string. Clarify behavior — empty string upsert is simpler; delete is cleaner. Either works, but be consistent.
- **Immediate upsert on every keystroke:** Without debounce, typing triggers a DB write per character. Always use debounce ref pattern (500ms).
- **Forgetting to cleanup debounce timer:** `useEffect` cleanup in `RuleNoteEditor` must call `clearTimeout` on unmount to prevent state updates after unmount.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Favorites persistence | Custom state or localStorage | `useUpsertRulesFavorite` + `useDeleteRulesFavorite` (Phase 52) | Already built with optimistic updates + rollback |
| Notes persistence | Custom state management | `useUpsertRulesNote` (Phase 52) | Already built, invalidates RULES_NOTES_KEY |
| Debounce | `lodash.debounce` or external library | `useRef` + `setTimeout` inline | No new dependency needed; pattern is 4 lines |
| Icon buttons | Custom SVG or button styling | Lucide `Star`, `Flag`, `StickyNote` + shadcn Button variant="ghost" size="sm" | Consistent with app icon language |

---

## Common Pitfalls

### Pitfall 1: CollapsibleTrigger swallows toggle clicks
**What goes wrong:** User clicks the Star icon; the card expands/collapses instead of (or in addition to) toggling the favorite.
**Why it happens:** The `CollapsibleTrigger` wraps the entire trigger row, so any click inside it triggers the collapsible toggle.
**How to avoid:** Every icon button inside the trigger must call `e.stopPropagation()` on its `onClick` handler.
**Warning signs:** Star click expands/collapses card during manual testing.

### Pitfall 2: Rule ID type mismatch
**What goes wrong:** `RwStratagem.id` is a `string` (e.g., "strat-aoc") but tests or lookups accidentally cast to number.
**Why it happens:** SQLite `INTEGER` primary keys are numbers but Wahapedia IDs are text strings.
**How to avoid:** Composite key must use `String(rule.id)` — review how existing cards access `stratagem.id`, `ability.id` etc. to confirm they are already string-typed in `RwStratagem`, `RwAbility`, `RwDetachment`.
**Warning signs:** Map lookup always returns undefined despite data being present.

### Pitfall 3: DetachmentCard rule_type confusion
**What goes wrong:** The detachment itself vs. its abilities are both referred to as "detachment" things. Favoriting a detachment card could use either `detachment` (not a valid RULE_TYPES value) or `detachment_ability`.
**Why it happens:** `RULE_TYPES = ['stratagem', 'detachment_ability', 'shared_ability']` — there is no `detachment` type. Detachment cards contain abilities, not the detachment entity itself.
**How to avoid:** Annotations on DetachmentCard are per-ability, using `rule_type = 'detachment_ability'`. If the whole-detachment favorite is needed, a RULE_TYPES extension would be required (schema migration) — that is out of scope for this phase.
**Warning signs:** TypeScript error: `'detachment'` is not assignable to `RuleType`.

### Pitfall 4: RulesNotes has no optimistic update
**What goes wrong:** After saving a note, the UI doesn't immediately reflect it because `useUpsertRulesNote` only has `onSettled` invalidation (no `onMutate` optimistic set).
**Why it happens:** Phase 52 intentionally kept notes simpler — no optimistic update was implemented.
**How to avoid:** The debounced auto-save pattern means the note value is controlled locally in `RuleNoteEditor` state — the local state is the "optimistic" layer. The DB write confirms asynchronously. Do NOT try to add optimistic note updates; the local controlled textarea is sufficient.
**Warning signs:** Note textarea jumps back to old value after save (would only happen if local state is overwritten by query data refresh).

### Pitfall 5: Annotation state flicker on favorites Map rebuild
**What goes wrong:** After a favorite toggle, `useRulesFavorites` invalidates and refetches. The Map is rebuilt from the fresh array, causing a brief flicker if the card reads from the Map directly.
**Why it happens:** `useUpsertRulesFavorite` uses optimistic updates — the Map is built from `favorites` array which is optimistically updated. So the flicker should not occur in practice.
**How to avoid:** Confirm the Map is built from the React Query data (which is already optimistically updated). No additional workaround needed.

---

## Code Examples

### Composite key pattern (from Phase 52 design)
```typescript
// Build at page level in useMemo
const favoritesMap = useMemo(() => {
  const m = new Map<string, RulesFavorite>();
  for (const f of favorites) m.set(`${f.rule_id}:${f.rule_type}`, f);
  return m;
}, [favorites]);

// Per-card lookup
const favorite = favoritesMap.get(`${stratagem.id}:stratagem`) ?? null;
```

### Favorite toggle handler in a card component
```typescript
// Inside StratagemCard
const upsertFavorite = useUpsertRulesFavorite();
const deleteFavorite = useDeleteRulesFavorite();

function handleToggleFavorite(e: React.MouseEvent) {
  e.stopPropagation(); // prevent CollapsibleTrigger from firing
  if (favorite) {
    deleteFavorite.mutate({ ruleId: stratagem.id, ruleType: 'stratagem' });
  } else {
    upsertFavorite.mutate({
      rule_id: stratagem.id,
      rule_type: 'stratagem',
      rule_name: stratagem.name,
      is_reminder: 0,
    });
  }
}
```

### Reminder toggle (is_reminder flip on existing favorite)
```typescript
function handleToggleReminder(e: React.MouseEvent) {
  e.stopPropagation();
  // Always upsert — creates favorite if not exist, flips is_reminder if it does
  upsertFavorite.mutate({
    rule_id: stratagem.id,
    rule_type: 'stratagem',
    rule_name: stratagem.name,
    is_reminder: favorite?.is_reminder === 1 ? 0 : 1,
  });
}
```

Note: Toggling reminder ON when no favorite exists creates the favorite with `is_reminder=1`. This is consistent behavior — a rule that is a reminder is implicitly also favorited.

### Annotation visual distinction
```typescript
const isAnnotated = favorite !== null || note !== null;

<Collapsible
  className={cn(
    "rounded-lg border bg-card text-card-foreground shadow-sm",
    isAnnotated && "border-l-2 border-l-primary bg-primary/5"
  )}
>
```

### Star icon button in trigger row
```typescript
<button
  type="button"
  onClick={handleToggleFavorite}
  className="shrink-0 p-0.5 rounded hover:bg-muted"
  aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
>
  <Star
    className={cn(
      "h-4 w-4",
      favorite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
    )}
  />
</button>
```

### Note textarea (RuleNoteEditor pattern)
```typescript
// Local controlled state — provides immediate feedback
const [localText, setLocalText] = useState(note?.note_text ?? "");
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const upsertNote = useUpsertRulesNote();

// Sync external note prop changes (e.g., after invalidation)
useEffect(() => {
  setLocalText(note?.note_text ?? "");
}, [note?.note_text]);

function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
  const value = e.target.value;
  setLocalText(value);
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => {
    upsertNote.mutate({ rule_id, rule_type, rule_name, note_text: value });
  }, 500);
}

useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A — new feature | Map-based O(1) lookup with one hook call per page | Phase 55 | Avoids N+1 hook calls across hundreds of rule cards |
| Lodash debounce | Inline useRef setTimeout pattern | Established project pattern | No new dependency |

---

## Validation Architecture

> nyquist_validation is enabled in .planning/config.json.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vite.config.ts (vitest section) |
| Quick run command | `pnpm test -- tests/rules-hub/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-01 | Star toggle renders, clicking it calls upsert/delete | unit | `pnpm test -- tests/rules-hub/RuleAnnotationControls.test.tsx` | ❌ Wave 0 |
| PLAY-01 | StratagemCard renders star in correct filled/outline state | unit | `pnpm test -- tests/rules-hub/StratagemCard.test.tsx` | ❌ Wave 0 |
| PLAY-02 | Flag toggle calls upsertFavorite with is_reminder=1 | unit | `pnpm test -- tests/rules-hub/RuleAnnotationControls.test.tsx` | ❌ Wave 0 |
| PLAY-03 | RuleNoteEditor renders textarea with existing note text | unit | `pnpm test -- tests/rules-hub/RuleNoteEditor.test.tsx` | ❌ Wave 0 |
| PLAY-03 | RuleNoteEditor calls upsertNote after debounce delay | unit | `pnpm test -- tests/rules-hub/RuleNoteEditor.test.tsx` | ❌ Wave 0 |
| PLAY-04 | Card with favorite gets border-l and bg-primary/5 class | unit | `pnpm test -- tests/rules-hub/StratagemCard.test.tsx` | ❌ Wave 0 |
| PLAY-04 | Card without annotation has no annotation classes | unit | `pnpm test -- tests/rules-hub/StratagemCard.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/rules-hub/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/rules-hub/RuleAnnotationControls.test.tsx` — covers PLAY-01, PLAY-02
- [ ] `tests/rules-hub/RuleNoteEditor.test.tsx` — covers PLAY-03
- [ ] `tests/rules-hub/StratagemCard.test.tsx` — covers PLAY-01, PLAY-04

*(SharedAbilityCard.test.tsx and DetachmentCard.test.tsx already exist but need annotation prop coverage added, not new files)*

---

## Sources

### Primary (HIGH confidence)
- Direct source code inspection: `src/db/queries/rulesFavorites.ts`, `src/db/queries/rulesNotes.ts`, `src/hooks/useRulesFavorites.ts`, `src/hooks/useRulesNotes.ts`, `src/types/rulesFavorite.ts`, `src/types/rulesNote.ts` — all Phase 52 deliverables, fully implemented
- Direct source code inspection: `src/features/rules-hub/StratagemCard.tsx`, `DetachmentCard.tsx`, `SharedAbilityCard.tsx`, `RulesHubPage.tsx` — Phase 53 deliverables, verified component signatures and patterns
- Direct source code inspection: `src/features/units/PlaybookTab.tsx` lines 78–82 — `TEXTAREA_CLASS` and `SECTION_LABEL_CLASS` constants verified
- `src/types/rulesFavorite.ts` — `RULE_TYPES` const array confirmed as `['stratagem', 'detachment_ability', 'shared_ability']`

### Secondary (MEDIUM confidence)
- CONTEXT.md — all locked decisions carry HIGH confidence as user-confirmed choices
- STATE.md accumulated decisions — confirms hobbyforge.db separation, staleTime:Infinity pattern, stopPropagation requirement for nested Collapsible buttons

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies required
- Architecture: HIGH — patterns directly derived from existing Phase 52/53 code; no speculation
- Pitfalls: HIGH — stopPropagation and composite key issues are observable from the existing code structure; RulesNotes optimistic update gap confirmed by reading the hook source

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (stable domain — internal project code, no external API drift risk)
