---
phase: 120-ui-wiring
reviewed: 2026-06-08T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/db/queries/udbGameData.ts
  - src/features/army-lists/DetachmentPicker.tsx
  - src/features/army-lists/DetachmentRulesSection.tsx
  - src/features/army-lists/EnhancementPickerSheet.tsx
  - src/features/game-day/GameDayStratagemCard.tsx
  - src/features/game-day/StrategemsTab.tsx
  - src/features/rules-hub/DetachmentCard.tsx
  - src/features/rules-hub/RulesHubPage.tsx
  - src/features/rules-hub/StratagemCard.tsx
  - src/features/rules-hub/applyRulesHubFilters.ts
  - src/features/units/PlaybookDetachmentAbilities.tsx
  - src/features/units/PlaybookTab.tsx
  - src/hooks/useGameData.ts
  - src/types/gameData.ts
  - tests/rules-hub/DetachmentCard.test.tsx
  - tests/rules-hub/StratagemCard.test.tsx
  - tests/rules-hub/applyRulesHubFilters.test.ts
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 120: Code Review Report

**Reviewed:** 2026-06-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 120 introduces a query layer for `udb_stratagems`, `udb_enhancements`, `udb_detachments`,
and `udb_detachment_abilities`, wires those queries through React Query hooks, and surfaces the
data across Rules Hub, Game Day, Army Lists, and the Playbook tab.

The architecture is sound and the code is generally well-structured. Three critical issues were
found: an empty-string fallback in `DetachmentRulesSection` that fires a live query against
`udb_detachment_abilities` with an empty key (bypassing the disabled guard), unescaped
Wahapedia HTML injected with `dangerouslySetInnerHTML` across six render sites with no
sanitization layer, and the `Epic Hero` check in `EnhancementPickerSheet` being silently ignored
when `useUnitKeywords` is still loading (the enhancement `Assign` button is enabled too early).

---

## Critical Issues

### CR-01: Empty-string fallback bypasses `enabled: false` guard in `DetachmentRulesSection`

**File:** `src/features/army-lists/DetachmentRulesSection.tsx:17`

**Issue:**
`useDetachmentAbilitiesByDetachment` is called with `detachmentId ?? ""`. The hook in
`useGameData.ts` (line 134) has **no `enabled` guard** — it is explicitly documented as "always
enabled (no null guard)". When `detachmentId` is `null` or `undefined` (the normal pre-selection
state), the fallback `""` causes the hook to fire `getDetachmentAbilitiesByDetachment("")`,
which executes:

```sql
SELECT ... FROM udb_detachment_abilities WHERE detachment_id = ''
```

This is a real database round-trip for every render before the user has chosen a detachment.
If any row has an empty-string `detachment_id` (e.g. bad import data) it would silently surface
the wrong content. More critically, the `isLoading` state goes `true → false` with an empty
result, causing the component to briefly show the loading skeleton and then render the
"Select a detachment" message only after the spurious query resolves — the null guard on line 35
runs **after** both queries have already fired.

**Fix:** Pass `undefined` instead of `""` so the disabled-query path in the hook activates, or
add a matching `enabled` guard to `useDetachmentAbilitiesByDetachment`:

```ts
// Option A — caller side (DetachmentRulesSection.tsx line 17)
useDetachmentAbilitiesByDetachment(detachmentId ?? undefined);

// Option B — hook side (useGameData.ts line 134-140): add enabled guard
export function useDetachmentAbilitiesByDetachment(detachmentId: string | undefined) {
  return useQuery({
    queryKey: detachmentId
      ? DETACHMENT_ABILITIES_BY_DETACHMENT_KEY(detachmentId)
      : (["udb-detachment-abilities-detachment", "disabled"] as const),
    queryFn: () =>
      detachmentId ? getDetachmentAbilitiesByDetachment(detachmentId) : Promise.resolve([]),
    enabled: !!detachmentId,
    staleTime: Infinity,
  });
}
```

Option B is safer as it hardens the hook itself against any future misuse. Also update
`DetachmentCard.tsx` (line 87) which calls this hook with a non-null `detachment.id` — that
usage is fine, but the signature change would require updating the call site accordingly.

---

### CR-02: Unescaped Wahapedia HTML rendered with `dangerouslySetInnerHTML` — no sanitization

**Files:**
- `src/features/rules-hub/StratagemCard.tsx:117`
- `src/features/rules-hub/DetachmentCard.tsx:66`
- `src/features/game-day/GameDayStratagemCard.tsx:90`
- `src/features/units/PlaybookDetachmentAbilities.tsx:57`
- `src/features/army-lists/DetachmentRulesSection.tsx:77`
- `src/features/army-lists/EnhancementPickerSheet.tsx:162`

**Issue:**
All six sites render `description` / `ability.description` / `enhancement.description` via
`dangerouslySetInnerHTML={{ __html: <value> }}` with no sanitization. The content originates
from Wahapedia CSV rows imported through `bulk_sync_rules` directly into SQLite. There is no
HTML-escaping step in the import pipeline. If the source CSV ever contains injected `<script>`,
`<img onerror=...>`, or `javascript:` href payloads, they execute in the Tauri WebView context.

In Tauri 2 the WebView **does** have access to Tauri IPC — a successful XSS payload could call
Tauri commands including database writes, file system access, and any other registered command.
The CSP in `tauri.conf.json` is explicitly **off** (`"csp": null`), removing the last browser
defense.

**Fix:** Sanitize before rendering. Add DOMPurify (or the `isomorphic-dompurify` variant for
SSR-compatibility) and create a shared utility:

```ts
// src/lib/sanitizeHtml.ts
import DOMPurify from "dompurify";

// Allow bold, italic, spans with class (for .kwb highlights) — nothing else
const ALLOWED_TAGS = ["b", "i", "em", "strong", "span", "br"];
const ALLOWED_ATTR = ["class"];

export function sanitizeRulesHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS, ALLOWED_ATTR });
}
```

Replace every `dangerouslySetInnerHTML={{ __html: value }}` with
`dangerouslySetInnerHTML={{ __html: sanitizeRulesHtml(value) }}`.

---

### CR-03: Epic Hero check races with `useUnitKeywords` loading — `Assign` button enabled prematurely

**File:** `src/features/army-lists/EnhancementPickerSheet.tsx:128-135`

**Issue:**
The `disableReason` logic on lines 132-135 only fires when `!existingOnThisUnit`. The `isEpicHero`
value is `keywords?.isEpicHero ?? false` (line 128). When `useUnitKeywords` is still loading
(e.g. network/DB latency), `keywords` is `undefined`, so `isEpicHero` defaults to `false`.
During that loading window the Epic Hero check is silently skipped — the `Assign` button
appears enabled for Epic Heroes. If the user clicks before the query resolves, an enhancement
gets assigned to an ineligible unit.

Additionally, the `disableReason` priority order (line 132-135) evaluates `isMaxed` and
`isDuplicate` **before** `isEpicHero`. This means an Epic Hero that also happens to hit the
3-enhancement cap will get "Max 3 enhancements" as the tooltip instead of the correct
"Epic Heroes cannot receive enhancements". While functional (the button is still disabled in
that specific case), the message is misleading.

**Fix:**

```ts
// EnhancementPickerSheet.tsx — replace lines 128-135
const { data: keywords, isLoading: keywordsLoading } = useUnitKeywords(
  unit?.unit_name, unit?.udb_unit_id
);
const isEpicHero = keywords?.isEpicHero ?? false;

// Disable the whole list while keywords are loading to avoid race condition
if (keywordsLoading) {
  // render a loading state or disable all Assign buttons
}

// Fix disableReason priority — Epic Hero first, then other guards
let disableReason: string | null = null;
if (!existingOnThisUnit) {
  if (isEpicHero) disableReason = "Epic Heroes cannot receive enhancements";
  else if (isMaxed) disableReason = "Max 3 enhancements per army";
  else if (isDuplicate) disableReason = "Enhancement already assigned";
}
```

Also destructure `isLoading` from `useUnitKeywords` at the top of the component (line 53) and
propagate it to disable all `Assign` buttons while the keywords fetch is in flight.

---

## Warnings

### WR-01: Phase filter in `applyStratagemFilters` does exact string match — mismatches Wahapedia "Shooting phase" format

**File:** `src/features/rules-hub/applyRulesHubFilters.ts:18-20`

**Issue:**
The phase filter does `s.phase === options.phaseFilter` (exact match). `StrategemsTab.tsx`
(line 39-41) has a `normalizePhase()` helper that strips " phase" suffixes before grouping, but
`applyStratagemFilters` has no equivalent normalization. If any `udb_stratagems` row has
`phase = "Shooting phase"` (Wahapedia's original format) and the UI sends `phaseFilter =
"Shooting"`, the filter silently drops that stratagem from results. Since `StrategemsTab` and
`RulesHubPage` use the same underlying data source but only `StrategemsTab` normalizes phases
before bucketing, the two views can diverge. The test suite (line 35-38 of
`applyRulesHubFilters.test.ts`) only tests with clean `"Command"` / `"Fight"` values — it would
not catch this.

**Fix:** Apply the same normalization inside `applyStratagemFilters`:

```ts
if (options.phaseFilter) {
  const normalizedFilter = options.phaseFilter.replace(/ phase$/i, "").trim();
  result = result.filter((s) => {
    const normalized = s.phase?.replace(/ phase$/i, "").trim();
    return normalized === normalizedFilter;
  });
}
```

---

### WR-02: `detachmentFilteredStratagems` in `RulesHubPage` filters by `detachment_id` equality — excludes universal stratagems when a detachment is selected

**File:** `src/features/rules-hub/RulesHubPage.tsx:71-74`

**Issue:**
When the user picks a detachment in the Stratagems tab, the filter is:

```ts
return stratagems.filter((s) => s.detachment_id === selectedDetachmentId);
```

`getStratagemsByFaction` (query layer, `udbGameData.ts:43-55`) already fetches universal
stratagems (those with `faction_id IS NULL AND detachment_id IS NULL`). However, `detachment_id`
for these universal stratagems is `null`, so `null === selectedDetachmentId` is `false`. Selecting
any detachment will therefore hide all universal stratagems from the Rules Hub view, even though
the spec (D-02/D-04) says universal stratagems should always be visible.

**Fix:**

```ts
const detachmentFilteredStratagems = useMemo(() => {
  if (!selectedDetachmentId) return stratagems;
  return stratagems.filter(
    (s) => s.detachment_id === selectedDetachmentId ||
           (s.faction_id === null && s.detachment_id === null)  // universal
  );
}, [stratagems, selectedDetachmentId]);
```

---

### WR-03: `PlaybookDetachmentAbilities` silently hides loading state — no feedback during fetch

**File:** `src/features/units/PlaybookDetachmentAbilities.tsx:35-37`

**Issue:**
```ts
if (isLoading || abilities.length === 0) {
  return null;
}
```
When `isLoading` is `true` the component returns `null` — there is no skeleton or spinner. If
the abilities fetch takes more than a moment (cold cache, slow disk), the "Detachment Abilities"
section simply doesn't appear and then snaps in. More dangerously, if the fetch completes with
an empty result (no abilities data imported yet), the component also returns `null` with no
explanation — the user has no way to know whether the section is missing because data hasn't
been imported or because the detachment genuinely has no abilities. The other similar components
(`DetachmentCard`, `DetachmentRulesSection`) all show an explicit empty-state message.

**Fix:** Separate the two states:

```ts
if (isLoading) {
  return <Skeleton className="h-12 w-full" />;
}
if (abilities.length === 0) {
  return null; // silently absent is acceptable if data is genuinely empty
}
```

---

### WR-04: `useSharedAbilitiesByFaction` stub in `RulesHubPage` is declared inline, breaking the Rules of Hooks pattern

**File:** `src/features/rules-hub/RulesHubPage.tsx:20-22`

**Issue:**
```ts
// useSharedAbilitiesByFaction: shared abilities are out of Phase 120 scope — stub retained
function useSharedAbilitiesByFaction(_factionId: string | undefined) {
  return { data: [] as { ... }[], isLoading: false };
}
```
This hook-shaped function is defined at module scope inside the same file as the component. It
is syntactically valid, but it is a non-hook pretending to be a hook — it has a `use` prefix but
contains no actual hook calls, meaning React's linter rule `react-hooks/rules-of-hooks` would
flag any future call to real hooks added inside it. More concretely, the return type is a
hardcoded non-reactive object; if `data` or `isLoading` change meaning in a later phase,
refactoring will be hidden. The "Shared Abilities" tab also shows a tab trigger but renders
permanently empty — users will click the tab and see a count of "0 abilities" with no explanation.

**Fix:** Move the stub to its own file (`src/hooks/useSharedAbilities.ts`) with a clear TODO
comment, and add a "coming soon" placeholder in the tab content body:

```tsx
{/* Shared Abilities tab content */}
<p className="text-sm text-muted-foreground italic">
  Shared abilities are not yet available in this version.
</p>
```

---

### WR-05: `forgotten-${i}` key uses array index — unstable across re-renders

**File:** `src/features/game-day/StrategemsTab.tsx:131`

**Issue:**
```tsx
{(forgottenRules ?? []).map((rule, i) => (
  <div key={`forgotten-${i}`} ...>
```
`forgottenRules` is an array of strings. Using the array index as key is fragile: if the list is
reordered or if an entry is removed from the middle, React will rematch DOM nodes incorrectly.
The `rule` string itself is stable content for a key.

**Fix:**
```tsx
{(forgottenRules ?? []).map((rule) => (
  <div key={`forgotten-${rule}`} ...>
```
If duplicates are possible, combine with index as a tiebreaker:
```tsx
key={`forgotten-${i}-${rule}`}
```

---

## Info

### IN-01: `PHASE_STYLES` map is duplicated across three files

**Files:**
- `src/features/game-day/GameDayStratagemCard.tsx:12-18`
- `src/features/game-day/StrategemsTab.tsx:19-25`
- `src/features/rules-hub/StratagemCard.tsx:16-22`

All three define an identical `PHASE_STYLES: Record<string, string>` constant with the same
five phase entries and identical Tailwind class strings. Additionally, `getPhaseBadgeClass` is
duplicated between `GameDayStratagemCard` and `StratagemCard`. Extract to a shared module:

```ts
// src/lib/stratagemPhaseStyles.ts
export const PHASE_STYLES: Record<string, string> = { ... };
export function getPhaseBadgeClass(phase: string | null): string { ... }
```

---

### IN-02: `applyStratagemFilters` does not search the `description` field

**File:** `src/features/rules-hub/applyRulesHubFilters.ts:25-30`

The search only covers `name` and `type`. Users searching for keywords that appear in the rules
text (e.g. "Fight phase" in a description) get no results. This is a UX limitation rather than
a bug, but it makes the search feel incomplete given the description is the most text-rich field
on each stratagem.

**Fix:** Add description to the search predicate:

```ts
s.name.toLowerCase().includes(lower) ||
(s.type ?? "").toLowerCase().includes(lower) ||
s.description.toLowerCase().includes(lower)
```

---

### IN-03: `getStratagemsByFaction` query includes universal stratagems regardless of selected faction

**File:** `src/db/queries/udbGameData.ts:47-55`

The SQL for `getStratagemsByFaction` uses:
```sql
WHERE faction_id = $1
   OR (faction_id IS NULL AND detachment_id IS NULL)
```

Universal stratagems (those with both `faction_id` and `detachment_id` NULL) are included for
**every** faction query. This is consistent with what `getStratagemsByDetachment` also does, so
both views behave identically on this front. However, if the data set grows to include many
universal stratagems, every faction's list will inflate. This is a design decision to document
rather than change now, but it deserves a comment in the query function body noting that
universal stratagems are intentionally included per spec D-02/D-07.

---

_Reviewed: 2026-06-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
