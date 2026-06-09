---
phase: 120-ui-wiring
reviewed: 2026-06-09T12:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/types/gameData.ts
  - src/db/queries/udbGameData.ts
  - src/hooks/useGameData.ts
  - src/features/rules-hub/applyRulesHubFilters.ts
  - src/features/rules-hub/StratagemCard.tsx
  - src/features/game-day/GameDayStratagemCard.tsx
  - src/features/rules-hub/DetachmentCard.tsx
  - src/features/units/PlaybookDetachmentAbilities.tsx
  - src/features/game-day/StrategemsTab.tsx
  - src/features/rules-hub/RulesHubPage.tsx
  - src/features/army-lists/DetachmentPicker.tsx
  - src/features/army-lists/EnhancementPickerSheet.tsx
  - src/features/army-lists/DetachmentRulesSection.tsx
  - src/features/units/PlaybookTab.tsx
  - tests/rules-hub/applyRulesHubFilters.test.ts
  - tests/rules-hub/DetachmentCard.test.tsx
  - tests/rules-hub/StratagemCard.test.tsx
  - tests/army-list/DetachmentRulesSection.test.tsx
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 120: Code Review Report

**Reviewed:** 2026-06-09T12:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 120 wires game data (stratagems, enhancements, detachments, detachment abilities) from
canonical UDB tables through a query layer, React Query hooks, and into UI components across
Rules Hub, Game Day, Army Lists, and Playbook. The architecture is consistent and well-layered.

Three critical issues were found: unsanitized Wahapedia HTML rendered via `dangerouslySetInnerHTML`
across six components with CSP disabled (XSS in Tauri webview = IPC access), a non-null assertion
in `useDetachmentAbilitiesByDetachment` that can fire with `undefined`, and an Epic Hero race
condition in `EnhancementPickerSheet` where the guard is bypassed during keyword loading.
Five warnings cover a missing "clear all" option in the detachment filter, universal stratagems
being hidden when a detachment is selected, phase-matching inconsistency, loading state gaps,
and an inline stub function.

---

## Critical Issues

### CR-01: Unsanitized HTML rendered via dangerouslySetInnerHTML with CSP disabled

**Files:**
- `src/features/rules-hub/StratagemCard.tsx:117`
- `src/features/game-day/GameDayStratagemCard.tsx:90`
- `src/features/rules-hub/DetachmentCard.tsx:66`
- `src/features/units/PlaybookDetachmentAbilities.tsx:57`
- `src/features/army-lists/DetachmentRulesSection.tsx:77`
- `src/features/army-lists/EnhancementPickerSheet.tsx:161`

**Issue:**
Six components render `description` fields from the database directly into the DOM via
`dangerouslySetInnerHTML={{ __html: description }}`. The content originates from Wahapedia CSV
rows bulk-imported into SQLite with no HTML sanitization step in the pipeline. The Tauri config
has `"csp": null` (CSP fully disabled at `src-tauri/tauri.conf.json:24`). If source data
contains `<script>`, `<img onerror=...>`, `<iframe>`, or `javascript:` href payloads, they
execute in the Tauri WebView context with full IPC bridge access -- enabling Tauri command
invocation, database writes, and filesystem access. The only existing sanitization in the
codebase (`src/db/queries/unitDatabase.ts:339`) is for FTS query strings, not HTML content.

**Fix:** Install DOMPurify and create a shared sanitizer:
```ts
// src/lib/sanitizeHtml.ts
import DOMPurify from "dompurify";

export function sanitizeRulesHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "span", "br", "p", "ul", "ol", "li",
                   "table", "tr", "td", "th", "thead", "tbody"],
    ALLOWED_ATTR: ["class"],
  });
}
```
Replace every `dangerouslySetInnerHTML={{ __html: value }}` with
`dangerouslySetInnerHTML={{ __html: sanitizeRulesHtml(value) }}`.

---

### CR-02: Non-null assertion on potentially undefined value in useDetachmentAbilitiesByDetachment

**File:** `src/hooks/useGameData.ts:133`

**Issue:**
The `queryFn` uses `detachmentId!` (non-null assertion) but the parameter type is
`string | undefined`. While `enabled: !!detachmentId` should prevent React Query from calling
`queryFn`, in edge cases (rapid prop changes, race conditions with `enabled` flipping between
renders) React Query can invoke `queryFn` before `enabled` re-evaluates to `false`. This would
pass `undefined` to `getDetachmentAbilitiesByDetachment()`, generating a SQL query with
`WHERE detachment_id = undefined` that may return unexpected results or throw. Every other hook
in the same file uses the defensive ternary pattern (e.g., line 54-55:
`detachmentId ? getStratagemsByDetachment(detachmentId) : Promise.resolve([])`).

Additionally, the query key uses `detachmentId ?? ""` (empty string fallback) while all other
hooks use a `"disabled"` sentinel string. This inconsistency means an empty-string `detachmentId`
(from bad data) would collide with the disabled key.

**Fix:**
```ts
export function useDetachmentAbilitiesByDetachment(detachmentId: string | undefined) {
  return useQuery({
    queryKey: detachmentId
      ? DETACHMENT_ABILITIES_BY_DETACHMENT_KEY(detachmentId)
      : (["udb-detachment-abilities-detachment", "disabled"] as const),
    queryFn: () =>
      detachmentId
        ? getDetachmentAbilitiesByDetachment(detachmentId)
        : Promise.resolve([]),
    enabled: !!detachmentId,
    staleTime: Infinity,
  });
}
```

---

### CR-03: Epic Hero check races with useUnitKeywords loading -- Assign button enabled prematurely

**File:** `src/features/army-lists/EnhancementPickerSheet.tsx:53,128-135`

**Issue:**
`isEpicHero` is computed as `keywords?.isEpicHero ?? false` (line 128). When `useUnitKeywords`
is still loading (cold cache, slow DB), `keywords` is `undefined`, so `isEpicHero` defaults to
`false`. During that loading window the Epic Hero guard is silently skipped -- the `Assign`
button appears enabled. If the user clicks before the query resolves, an enhancement gets
assigned to an ineligible unit, violating ENH-02 validation.

Additionally, the `disableReason` priority order (lines 132-135) checks `isMaxed` and
`isDuplicate` before `isEpicHero`. An Epic Hero that also hits the 3-enhancement cap gets
"Max 3 enhancements per army" instead of the correct "Epic Heroes cannot receive enhancements".

**Fix:**
```ts
const { data: keywords, isLoading: keywordsLoading } = useUnitKeywords(
  unit?.unit_name, unit?.udb_unit_id
);
const isEpicHero = keywords?.isEpicHero ?? false;

// Inside the enhancement map, fix priority and add loading guard:
let disableReason: string | null = null;
if (!existingOnThisUnit) {
  if (keywordsLoading) disableReason = "Loading unit data...";
  else if (isEpicHero) disableReason = "Epic Heroes cannot receive enhancements";
  else if (isMaxed) disableReason = "Max 3 enhancements per army";
  else if (isDuplicate) disableReason = "Enhancement already assigned";
}
```

---

## Warnings

### WR-01: Detachment filter in RulesHubPage has no "clear" option

**File:** `src/features/rules-hub/RulesHubPage.tsx:157-171`

**Issue:**
The detachment filter `<Select>` renders only `detachments.map(...)` as children. Radix UI
Select does not allow deselecting a value once selected -- it never fires `onValueChange` with
an empty string. The `onValueChange={(val) => setSelectedDetachmentId(val || null)}` handler
can never receive a falsy value after initial selection. Once the user picks a detachment, they
cannot return to "All detachments" view without changing the faction.

**Fix:** Add an explicit "All detachments" option:
```tsx
<SelectContent>
  <SelectItem value="__all__">All detachments</SelectItem>
  {detachments.map((d) => (
    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
  ))}
</SelectContent>
```
Update handler: `onValueChange={(val) => setSelectedDetachmentId(val === "__all__" ? null : val)}`.

---

### WR-02: Detachment filter hides universal stratagems when a detachment is selected

**File:** `src/features/rules-hub/RulesHubPage.tsx:71-74`

**Issue:**
```ts
return stratagems.filter((s) => s.detachment_id === selectedDetachmentId);
```
Universal stratagems have `detachment_id: null` (per D-02/D-04 and the SQL in
`getStratagemsByFaction`). When a specific detachment is selected, `null !== selectedDetachmentId`
evaluates to `true`, so universal stratagems are filtered out. The Game Day `StrategemsTab` does
not have this problem because it queries by detachment ID and the SQL includes universals via
`OR (faction_id IS NULL AND detachment_id IS NULL)`.

**Fix:**
```ts
return stratagems.filter(
  (s) => s.detachment_id === selectedDetachmentId ||
         (s.faction_id === null && s.detachment_id === null)
);
```

---

### WR-03: Phase filter in applyStratagemFilters does exact string match -- mismatches Wahapedia format

**File:** `src/features/rules-hub/applyRulesHubFilters.ts:18-20`

**Issue:**
The filter does `s.phase === options.phaseFilter` (exact match). `StrategemsTab.tsx` (line 39-41)
has a `normalizePhase()` helper that strips " phase" suffixes before grouping, but
`applyStratagemFilters` has no equivalent normalization. If any `udb_stratagems` row has
`phase = "Shooting phase"` (Wahapedia's original format), the Rules Hub phase filter chips will
fail to match it. The test suite only tests with clean values like `"Command"` and `"Fight"`.

**Fix:**
```ts
if (options.phaseFilter) {
  result = result.filter((s) => {
    const normalized = s.phase?.replace(/ phase$/i, "").trim();
    return normalized === options.phaseFilter;
  });
}
```

---

### WR-04: PlaybookDetachmentAbilities silently hides loading state

**File:** `src/features/units/PlaybookDetachmentAbilities.tsx:35-37`

**Issue:**
```ts
if (isLoading || abilities.length === 0) {
  return null;
}
```
When `isLoading` is `true`, the component returns `null` -- no skeleton, no spinner. If the
fetch takes any noticeable time, the "Detachment Abilities" section simply does not appear and
then snaps in. Other components (`DetachmentCard`, `DetachmentRulesSection`) show explicit
loading skeletons and empty-state messages.

**Fix:** Separate the two conditions:
```ts
if (isLoading) {
  return <Skeleton className="h-12 w-full" />;
}
if (abilities.length === 0) {
  return null;
}
```

---

### WR-05: Inline stub function useSharedAbilitiesByFaction breaks import/hook conventions

**File:** `src/features/rules-hub/RulesHubPage.tsx:20-21`

**Issue:**
A hook-shaped stub function is defined between import statements:
```ts
function useSharedAbilitiesByFaction(_factionId: string | undefined) {
  return { data: [] as { ... }[], isLoading: false };
}
```
This has the `use` prefix but contains no actual React hooks -- it is a plain function returning
a hardcoded object. The "Shared Abilities" tab renders permanently empty with "0 abilities" and
no explanation to the user. There is no TODO tracking future replacement.

**Fix:** Move to its own file (`src/hooks/useSharedAbilities.ts`) with a tracked TODO, and show
an explanatory message in the tab content.

---

## Info

### IN-01: PHASE_STYLES and helper functions duplicated across three files

**Files:**
- `src/features/rules-hub/StratagemCard.tsx:16-22`
- `src/features/game-day/GameDayStratagemCard.tsx:12-18`
- `src/features/game-day/StrategemsTab.tsx:19-25`

The identical `PHASE_STYLES` record and `getPhaseBadgeClass` / `cpLabel` helpers are
copy-pasted across three files. Extract to a shared module (e.g.,
`src/lib/stratagemPhaseStyles.ts`).

---

### IN-02: applyStratagemFilters does not search the description field

**File:** `src/features/rules-hub/applyRulesHubFilters.ts:25-30`

The search only covers `name` and `type`. Users searching for keywords that appear in the rules
text (e.g., "Fight phase") get no results. Add `s.description.toLowerCase().includes(lower)` to
the search predicate.

---

### IN-03: forgotten-${i} key uses array index in StrategemsTab

**File:** `src/features/game-day/StrategemsTab.tsx:131`

```tsx
{(forgottenRules ?? []).map((rule, i) => (
  <div key={`forgotten-${i}`} ...>
```
Using array index as key is fragile when the list can be reordered or items removed. Use the
rule string as key: `key={\`forgotten-${rule}\`}`. If duplicates are possible, combine with
index: `key={\`forgotten-${i}-${rule}\`}`.

---

_Reviewed: 2026-06-09T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
