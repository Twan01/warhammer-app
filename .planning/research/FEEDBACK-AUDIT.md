# User Feedback & Interactions Audit

**App:** HobbyForge  
**Audited:** 2026-06-11  
**Scope:** Toast/notification coverage, loading states, error handling, form UX, confirmation dialogs, save patterns, optimistic updates  
**Verdict:** Solid foundation with a few consistent gaps worth addressing in a polish phase.

---

## 1. Toast / Notification Coverage

### Overall Assessment
Coverage is **broad and consistent** across the main CRUD surfaces. Sonner is used uniformly throughout — no competing toast libraries detected. The pattern is `toast.success(...)` on happy path, `toast.error(...)` in `catch` blocks.

### Well-covered surfaces
Every entity's create/update/delete cycle has toast feedback:
- Factions, Units, Paints, Recipes, Army Lists, Battle Logs, Goals, Wishlist Items, Snapshots
- Export actions (clipboard copy, JSON save, PDF) all have success/error feedback
- Inline toggles (active-project, paint owned/unowned) show errors on rollback
- Settings mutations (currency, language, pipeline labels, readiness target, checklist defaults) show error toasts on failure

### Gaps Found

**GAP-T1 — Goals: duplicate error path**
- WHERE: `src/hooks/useGoals.ts:39,53,67` AND `src/features/goals/GoalsPage.tsx:78`
- WHAT: `useDeleteGoal` fires `toast.error("Failed to delete goal — changes were not saved.")` via its `onError` callback. `GoalsPage.handleDeleteConfirm` also catches and fires `toast.error("Failed to delete goal.")` in its own `catch`. Because `mutateAsync` re-throws when `onError` fires, BOTH toasts appear on a delete failure.
- USER IMPACT: Two near-identical error toasts stack visibly on delete failure — confusing.
- SUGGESTION: Remove the `onError` toast from `useGoals.ts` for delete (keep only in the component), OR remove the `catch` toast in `GoalsPage`. The component-level `catch` is the better owner since it also has context to close the dialog.

**GAP-T2 — Recipe duplication: success toast inconsistency**
- WHERE: `src/features/recipes/RecipesPage.tsx:245` vs `src/features/recipes/RecipeDetailSheet.tsx:149`
- WHAT: Duplicating from `RecipesPage` shows `"Recipe duplicated successfully."` (adverb, full sentence); duplicating from `RecipeDetailSheet` shows `"Recipe duplicated."` (concise). Both are valid but diverge in style.
- USER IMPACT: Minor; no functional impact.
- SUGGESTION: Standardise to `"Recipe duplicated."` (matches the rest of the app's terse style).

**GAP-T3 — Snapshot delete uses plain `toast(...)` instead of `toast.success(...)`**
- WHERE: `src/features/army-lists/SnapshotHistorySheet.tsx:182`
- WHAT: `toast("Snapshot deleted.", { ... })` — neutral variant, no green checkmark icon.
- USER IMPACT: Snapshot delete looks different from every other delete in the app; user may not perceive it as confirmation.
- SUGGESTION: Change to `toast.success("Snapshot deleted.")` for visual consistency.

**GAP-T4 — Enhancement mutations: no success toast**
- WHERE: `src/features/army-lists/EnhancementPickerSheet.tsx:178,217`
- WHAT: Adding/removing an enhancement only fires `toast.error` on failure; there is no success toast.
- USER IMPACT: User gets no confirmation that the enhancement was applied or removed. The list updates optimistically (via React Query invalidation), but the absence of a toast means the action feels silent.
- SUGGESTION: Add `onSuccess: () => toast.success("Enhancement assigned.")` / `"Enhancement removed."`.

**GAP-T5 — Leader attachment: no success toast**
- WHERE: `src/features/army-lists/LeaderAttachmentSheet.tsx:120,162,196`
- WHAT: All three leader attach/detach mutations only fire `toast.error` on failure.
- USER IMPACT: Same as GAP-T4 — silent success for a non-trivial action.
- SUGGESTION: Add `onSuccess` success toasts matching the army list style ("Leader attached.", "Leader detached.").

**GAP-T6 — No toast on painting session creation (JournalTab)**
- WHERE: `src/features/units/JournalTab.tsx` — `useCreatePaintingSession` called with no `onSuccess` toast in the hook (`src/hooks/useJournalSessions.ts:54`) and no `toast.success` at the call site.
- WHAT: Creating a session from JournalTab is silent on success. The dashboard `LogSessionSheet` does fire a success toast; the unit-level JournalTab does not.
- USER IMPACT: After logging a session from the unit detail view, the user gets no confirmation — the form closes and the list updates.
- SUGGESTION: Add a `toast.success("Session logged.")` in `JournalTab`'s submit handler at `src/features/units/JournalTab.tsx`.

---

## 2. Loading State Patterns

### Overall Assessment
Loading skeletons are used **consistently and extensively** across all major pages. The pattern is sound. Very few pages use a raw spinner — Skeleton is the dominant primitive.

### Pages with skeleton loading (consistent pattern)
Dashboard, Collection (UnitTable/UnitGallery), Army Lists, Factions, Paints, Battle Log, Goals, Wishlist, Spending, Game Day, Rules Hub, Unit Database, Settings, Painting Mode — all use Skeleton components on first load.

### Gaps Found

**GAP-L1 — CollectionPage: no skeleton for the loading state**
- WHERE: `src/features/units/CollectionPage.tsx:224-251`
- WHAT: The page passes `isLoading={unitsLoading}` down to `UnitTable` and `UnitGallery`, but the CollectionPage itself has no skeleton wrapper around the toolbar area while loading. Checking `UnitTable.tsx:106`: there is a skeleton row placeholder inside the table, which is good. However the filter bar (`UnitFilters`) renders immediately with an empty units array, so filters render before data arrives — visually jarring if the unit count-driven filter options flash in.
- USER IMPACT: Minor visual jump — filter options appear populated then clear as data loads.
- SUGGESTION: Gate the `UnitFilters` render behind `!unitsLoading`, or pass loading state to `UnitFilters` to suppress the count labels.

**GAP-L2 — Delete buttons have no spinner**
- WHERE: Multiple delete dialogs — `FactionDeleteDialog.tsx:64`, `BattleLogDeleteDialog.tsx:51`, `RecipeDeleteDialog.tsx:53`, `PaintDeleteDialog.tsx:56`
- WHAT: The destructive button is disabled via `isPending` but shows no spinner or loading text. Compare with `WishlistItemDeleteDialog.tsx:59` and `GoalDeleteDialog.tsx:43` which already show `"Deleting..."` text when pending.
- USER IMPACT: For dialogs without pending text, the button goes greyed out with no indication why — user may attempt clicking again or wonder if the action registered.
- SUGGESTION: Add `{deleteMutation.isPending ? "Deleting..." : "Delete"}` pattern to `FactionDeleteDialog`, `BattleLogDeleteDialog`, `RecipeDeleteDialog`, `PaintDeleteDialog`. (4 components)

**GAP-L3 — Painting Mode: single full-screen skeleton, no structural hint**
- WHERE: `src/app/painting-mode/page.tsx:123`
- WHAT: Loading state is `<Skeleton className="h-screen w-full" />` — a single giant rectangle.
- USER IMPACT: Not harmful, but the painting mode has a distinctive layout (step focal view + sidebar navigator + session sheet). A full-screen skeleton gives no structural preview.
- SUGGESTION: Replace with a multi-part skeleton matching the two-column layout. Low priority.

**GAP-L4 — ArmyListDetailPage: `!list` shows skeleton but no isLoading check**
- WHERE: `src/features/army-lists/ArmyListDetailPage.tsx:526-542`
- WHAT: The guard is `if (!list)` which covers both "still loading" and "list not found" — both show the same skeleton UI with no differentiation. There is no explicit `isLoading` state on the detail page load.
- USER IMPACT: If a list genuinely doesn't exist (deleted, bad URL), the user sees an endless skeleton with no error message.
- SUGGESTION: Thread `isLoading` and `isError` states from the list query to distinguish "loading" vs "not found" and show an appropriate error message in the not-found case.

---

## 3. Error Handling Gaps

### Overall Assessment
A `RouteErrorFallback` is registered globally and catches unhandled React render errors. Most pages handle `isError` inline. Error messages are user-friendly (no raw stack traces in production).

### Error handling quality per page

| Page | isError handled? | Message quality |
|------|-----------------|-----------------|
| Dashboard | Yes — inline paragraph | Good |
| Collection | Yes — inline paragraph | Good |
| Army Lists | Yes — inline paragraph | Good |
| Battle Log | Yes — inline paragraph | Good |
| Factions | Yes — inline paragraph | Good |
| Paints | Yes — inline paragraph | Good |
| Goals | Yes — inline paragraph | Good |
| Wishlist | Yes — inline paragraph | Good |
| Spending | Yes — full-page fallback | Good |
| Recipes | NOT HANDLED | Gap (see below) |
| Painting Mode | Partial (state.isLoading only) | Partial |
| Game Day | NOT HANDLED | Gap (see below) |

### Gaps Found

**GAP-E1 — RecipesPage: no isError handler**
- WHERE: `src/features/recipes/RecipesPage.tsx:37` — `const { data: recipes = [], isLoading } = useRecipes()` — `isError` is not destructured and no error branch exists.
- USER IMPACT: If the recipes query fails, the user sees an empty page that looks like "you have no recipes" — indistinguishable from a real empty state, including the EmptyState component that prompts them to create a recipe.
- SUGGESTION: Destructure `isError` and render `<p className="text-sm text-destructive">Failed to load recipes. Try refreshing the app.</p>` above the card grid, or gate the EmptyState on `!isError`.

**GAP-E2 — GameDayPage: no isError handler**
- WHERE: `src/features/game-day/GameDayPage.tsx` — uses `isLoading` for loading skeleton but does not destructure `isError`.
- USER IMPACT: Same as GAP-E1 — a query failure results in an empty-looking page rather than an explicit error state.
- SUGGESTION: Add isError handling to show an inline error message.

**GAP-E3 — PlaybookTab: error shown in destructive box but no recovery CTA**
- WHERE: `src/features/units/PlaybookTab.tsx:220-224`
- WHAT: `datasheetError` renders a red box "Failed to load datasheet: [message]" but provides no retry button or next step.
- USER IMPACT: User sees an error but has no obvious action to take short of closing and reopening the sheet.
- SUGGESTION: Add a "Retry" button that calls `qc.invalidateQueries({ queryKey: DATASHEET_KEY(unitId) })`.

**GAP-E4 — Spending: error message uses muted colour instead of destructive**
- WHERE: `src/features/spending/SpendingPage.tsx:57-61`
- WHAT: Error state is `<p className="text-sm text-muted-foreground">Could not load spending data...</p>` — muted grey, not destructive red.
- USER IMPACT: Soft error presentation — user may not perceive this as a problem vs no data.
- SUGGESTION: Change to `text-destructive` to match the error style used on all other pages.

**GAP-E5 — No error handling for SnapshotCompareDialog when snapshotIds is valid but parsing fails**
- WHERE: `src/features/army-lists/SnapshotCompareDialog.tsx:96`
- WHAT: `hasError` is computed but the rendered error state (`!isLoading && hasError`) is not visible in the snippet — needs verification that it renders a user-visible message (not audited fully; flag for review).
- USER IMPACT: Possible silent failure if snapshot JSON is malformed.
- SUGGESTION: Verify the `hasError` branch renders a meaningful message.

---

## 4. Form UX Patterns

### Overall Assessment
Forms are **consistently structured** using React Hook Form + Zod across all Sheet components. The `useEffect(() => form.reset(...), [entity, open])` pattern is applied uniformly to prevent stale data. Submit buttons are disabled via `form.formState.isSubmitting`. Validation errors render via `<FormMessage />` (shadcn) — triggered on submit (Zod's default `onSubmit` mode).

### Auto-focus
- WHERE: `src/features/units/DatasheetPicker.tsx:62` — only one component uses `autoFocus`.
- WHAT: No Sheet form uses `autoFocus` on the first field. When a Sheet opens, focus lands on the sheet's close button (shadcn default) rather than the first input.
- USER IMPACT: Users must Tab or click into the first field after opening any create/edit form — adds friction for keyboard users and power users.
- SUGGESTION: Add `autoFocus` to the first `<Input>` in each Sheet form (`FactionSheet`, `UnitSheet`, `PaintSheet`, `ArmyListSheet`, `BattleLogSheet`, `GoalSheet`, `WishlistItemSheet`, `RecipeFormSheet`). The shadcn Sheet component passes focus to `SheetContent` on open; `autoFocus` on the first field inside re-routes it correctly.

### Validation Timing
- WHAT: No form uses `mode: "onBlur"` or `reValidateMode` — all forms validate on submit only (RHF default).
- USER IMPACT: Users fill out a long form (e.g. UnitSheet has 15+ fields), submit, then see validation errors below fields they already passed. They must scroll back up to fix errors.
- SUGGESTION: Consider `mode: "onBlur"` for the two longest forms: `UnitSheet` and `BattleLogSheet`. This is a medium-priority quality-of-life improvement, not a critical bug.

### Dirty State Indication
- WHAT: Only `PlaybookTab` (`src/features/units/PlaybookTab.tsx:112`) tracks and exposes dirty state — the Save button is greyed out when clean. No Sheet form shows a dirty indicator (asterisk in title, "Unsaved changes" warning) or confirms before closing with unsaved changes.
- USER IMPACT: Users can accidentally dismiss a half-filled form by clicking outside the sheet or pressing Escape — all changes are silently lost with no warning.
- SUGGESTION: Add `onInteractOutside={(e) => { if (form.formState.isDirty) e.preventDefault(); }}` on `SheetContent` for the primary entity forms (`UnitSheet`, `RecipeFormSheet`, `BattleLogSheet`), or show a discard-confirmation dialog. Low severity for short forms, meaningful for complex ones.

### Discard Button Labelling
- WHAT: `FactionSheet.tsx:238` uses "Discard changes" as the cancel button label. All other Sheets (`UnitSheet`, `ArmyListSheet`, `GoalSheet`, `WishlistItemSheet`, `PaintSheet`) use "Cancel" or close via the X button. `RecipeFormSheet` may differ.
- USER IMPACT: Inconsistency — minor but erodes polish.
- SUGGESTION: Standardise cancel button label across sheets. "Cancel" is the convention in the rest of the app.

---

## 5. Confirmation Dialog Consistency

### Overall Assessment
Delete confirmations are implemented exclusively using shadcn `Dialog` across all entity deletions — no mixing of `AlertDialog` vs `Dialog` for same-category actions. The one exception is `RestorePreviewDialog` and `DataManagementTab` which use `AlertDialog` for destructive restore/import operations (appropriate for higher-stakes destructive actions).

### Button Label Inconsistency

| Dialog | Cancel Label | Confirm Label | Pending Text |
|--------|-------------|---------------|--------------|
| UnitDeleteDialog | "Keep Unit" | "Delete" / "Delete Anyway" | No |
| FactionDeleteDialog | "Keep Faction" | "Delete" | No |
| BattleLogDeleteDialog | "Cancel" | "Delete" | No |
| RecipeDeleteDialog | "Cancel" | "Delete recipe" | No |
| PaintDeleteDialog | "Cancel" | "Delete" | No |
| WishlistItemDeleteDialog | "Cancel" | "Delete" / "Deleting..." | Yes |
| GoalDeleteDialog | "Cancel" | "Delete" / "Deleting..." | Yes |
| ArmyListDeleteDialog | (not audited) | | |

**GAP-D1 — "Keep X" vs "Cancel" inconsistency for cancel label**
- WHERE: `UnitDeleteDialog.tsx:119`, `FactionDeleteDialog.tsx:59` vs all other delete dialogs
- WHAT: Unit and Faction use entity-specific "Keep X" labels. All others use "Cancel".
- USER IMPACT: Minor inconsistency — "Keep Unit" is arguably more descriptive/safer UX. If adopting "Keep X" everywhere, the standard should be documented.
- SUGGESTION: Either adopt "Keep X" universally (better UX pattern, confirms intent) or revert to "Cancel" everywhere. Recommend "Keep X" as the standard.

**GAP-D2 — "Delete recipe" vs "Delete" on confirm button**
- WHERE: `RecipeDeleteDialog.tsx:54`
- WHAT: The destructive button says "Delete recipe" — the only dialog with a noun in the button. All others say "Delete" or "Delete Anyway".
- SUGGESTION: Change to "Delete" for consistency (the dialog title "Delete recipe?" already provides context).

**GAP-D3 — Missing isPending feedback on 4 delete dialogs**
- Covered under GAP-L2. FactionDeleteDialog, BattleLogDeleteDialog, RecipeDeleteDialog, PaintDeleteDialog all lack "Deleting..." pending text — confirmed here as a delete dialog consistency gap.

---

## 6. Save / Discard Patterns

### Pattern Inventory

| Feature | Pattern | Notes |
|---------|---------|-------|
| All Sheet forms | Manual save via Submit button | Consistent |
| PlaybookTab | Manual save via "Save Playbook" button, disabled when clean | Only surface with dirty-state awareness |
| ArmyList notes (both ArmyListDetailPage and ArmyListDetailSheet) | Manual save via "Save Notes" button | No dirty indicator — button is always enabled |
| Rules notes (RuleNoteEditor) | Auto-save with 500ms debounce | Silent — no indicator |
| Game Day checklist | Ephemeral (Zustand, in-memory) | Not persisted to DB |
| Status popover / Kanban drag | Optimistic inline save | No confirmation |

### Gaps Found

**GAP-S1 — ArmyList notes "save" fires success toast even on no-op**
- WHERE: `src/features/army-lists/ArmyListDetailPage.tsx:433-438` and `src/features/army-lists/ArmyListDetailSheet.tsx:191`
- WHAT: `if (notesDraft === (list.notes ?? "")) { toast.success("Notes saved."); return; }` — when the user clicks "Save Notes" without making changes, a success toast still fires.
- USER IMPACT: Success feedback is a lie — no mutation occurred. This erodes trust in success toasts generally.
- SUGGESTION: When notes are unchanged, either disable the save button, show nothing, or show a neutral "No changes to save" message. Do not show a success toast for a no-op.

**GAP-S2 — RuleNoteEditor: auto-save is silent (no indicator)**
- WHERE: `src/features/rules-hub/RuleNoteEditor.tsx:56-66`
- WHAT: Notes auto-save after 500ms of inactivity with no visual indicator (no "Saving..." state, no "Saved" confirmation).
- USER IMPACT: Users cannot tell whether their note was saved, especially if the app is closed/navigated away from while the timer is running. The `useEffect` cleanup attempts a flush-on-unmount save, but this is also silent.
- SUGGESTION: Show a subtle "Saved" badge near the textarea that appears briefly after a successful mutation, similar to the pattern used in many note editors. Or at minimum, show `upsertNote.isPending` as a subtle indicator.

**GAP-S3 — PlaybookTab: save button disabled state uses opacity but no explicit tooltip**
- WHERE: `src/features/units/PlaybookTab.tsx:244`
- WHAT: `disabled={!isDirty || isLoading || upsert.isPending}` — when the tab first opens and no changes have been made, the save button is greyed out with no explanation.
- USER IMPACT: New users may not understand why the button is disabled.
- SUGGESTION: Wrap in a `<Tooltip>` with content "No changes to save" when `!isDirty`.

---

## 7. Optimistic Update Status

### Surfaces with optimistic updates (rollback on error)

| Surface | Hook / Location | Rollback? | Error Toast? |
|---------|----------------|-----------|--------------|
| Unit active-project toggle | `CollectionPage.tsx:146-158` | Yes | Yes |
| Unit status popover | `StatusPopover.tsx:34-45` | Yes | Yes |
| Kanban card drag (status) | `KanbanBoard.tsx:76-136` | Yes | Yes |
| AddProjectPicker | `AddProjectPicker.tsx:36-44` | Yes | Yes |
| Paint owned toggle | `PaintsPage.tsx:77-88` | Yes | Yes |
| Photo delete (unit photos) | `useUnitPhotos.ts:91-103` | Yes | Yes |
| Session delete | `useJournalSessions.ts:89-108` | Yes | Yes |
| Rules favorites toggle | `useRulesFavorites.ts:28-84` | Yes | No success toast |
| UnitDetailSheet active toggle | `UnitDetailSheet.tsx:69-76` | Yes | Yes |

### Surfaces WITHOUT optimistic updates (wait for server)

These are non-toggle mutations where waiting is acceptable (form submissions, complex operations):
- All Sheet form submissions (create/update)
- Delete operations (appropriate — destructive)
- Export/PDF/clipboard operations (appropriate — async I/O)
- Enhancement assign/remove (fast enough, UI updates via invalidation)
- Leader attach/detach (fast enough)

### Gaps Found

**GAP-O1 — Rules favorites: optimistic update rolls back but no error toast**
- WHERE: `src/hooks/useRulesFavorites.ts:54-59` (add) and `79-84` (remove)
- WHAT: Both mutations have `onError` rollback of cache, but neither fires a `toast.error`. The UI silently reverts to the previous state.
- USER IMPACT: User clicks a favorite star, it flips, then silently flips back — no explanation why.
- SUGGESTION: Add `toast.error("Failed to update favourite. Please try again.")` in both `onError` callbacks.

**GAP-O2 — KanbanBoard: two different rollback paths with different UX**
- WHERE: `src/features/painting-projects/KanbanBoard.tsx:84` (status update fail) vs `:136` (drag-drop fail)
- WHAT: Status update failure shows `toast.error("Failed to update project status. Changes were not saved.")` with rollback. Drag-drop failure shows `toast.error("Status update failed. The card has been moved back.")` with rollback. Both are correct but the messages differ slightly.
- USER IMPACT: Minor inconsistency in wording.
- SUGGESTION: Standardise to one message (the drag-drop one is more helpful — it tells the user the visual change was undone).

---

## Summary Table

| Gap ID | Area | Severity | Effort |
|--------|------|----------|--------|
| GAP-T1 | Duplicate goal delete error toasts | Medium | Low — remove one toast |
| GAP-T2 | Recipe duplicate toast wording | Low | Low |
| GAP-T3 | Snapshot delete uses plain toast | Low | Low |
| GAP-T4 | Enhancement assign/remove: no success toast | Medium | Low |
| GAP-T5 | Leader attach/detach: no success toast | Medium | Low |
| GAP-T6 | JournalTab session create: no success toast | Low | Low |
| GAP-L1 | CollectionPage: filter bar flashes during load | Low | Low |
| GAP-L2 | 4 delete dialogs: no pending spinner/text | Medium | Low |
| GAP-L3 | Painting Mode: full-screen skeleton | Low | Medium |
| GAP-L4 | ArmyListDetailPage: loading vs not-found indistinguishable | Medium | Medium |
| GAP-E1 | RecipesPage: no isError handler | High | Low |
| GAP-E2 | GameDayPage: no isError handler | Medium | Low |
| GAP-E3 | PlaybookTab: error box has no retry CTA | Medium | Low |
| GAP-E4 | SpendingPage: error in muted colour not destructive | Low | Low |
| GAP-E5 | SnapshotCompareDialog: hasError branch needs verification | Low | Low |
| GAP-D1 | "Keep X" vs "Cancel" label inconsistency | Low | Low |
| GAP-D2 | "Delete recipe" button label inconsistency | Low | Low |
| GAP-D3 | 4 delete dialogs missing "Deleting..." pending text | Medium | Low |
| GAP-S1 | No-op notes save fires success toast | High | Low |
| GAP-S2 | RuleNoteEditor: silent auto-save | Medium | Medium |
| GAP-S3 | PlaybookTab save disabled with no tooltip | Low | Low |
| GAP-F1 | No autoFocus on first Sheet form field | Medium | Low |
| GAP-F2 | All forms validate on submit only | Low | Medium |
| GAP-F3 | No dirty-state warning on sheet dismiss | Low | Medium |
| GAP-F4 | Cancel label inconsistency across sheets | Low | Low |
| GAP-O1 | Rules favorites: silent rollback | Medium | Low |
| GAP-O2 | KanbanBoard: two different rollback messages | Low | Low |

### Priority Quick Wins (High severity, Low effort — do these first)
1. **GAP-E1** — Add `isError` handling to `RecipesPage`
2. **GAP-S1** — Stop firing success toast on no-op notes save
3. **GAP-T1** — Fix duplicate goal delete error toast
4. **GAP-T4/T5** — Add success toasts to enhancement/leader mutations
5. **GAP-L2/D3** — Add "Deleting..." text to 4 delete dialogs
