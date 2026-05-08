# Phase 14 — UI Review

**Audited:** 2026-05-04
**Baseline:** 14-UI-SPEC.md (approved design contract)
**Screenshots:** Not captured (Playwright browsers not installed; dev server confirmed on port 5173)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All 18 declared copy strings match verbatim; no generic labels found in spending code |
| 2. Visuals | 3/4 | Layout, hierarchy, and loading/error branches all correct; hero Card has a double-gap issue from base component defaults colliding with override |
| 3. Color | 4/4 | faction-accent used only on hero card ring as specified; no hardcoded colors in spending files |
| 4. Typography | 4/4 | Exactly 3 distinct sizes (text-sm, text-xl, text-3xl) and 1 weight (font-semibold) — matches UI-SPEC Display/Heading/Label/Body roles precisely |
| 5. Spacing | 4/4 | All spacing via Tailwind scale tokens; no arbitrary values; gap-12/gap-4/p-8/px-6/py-6 all on declared scale |
| 6. Experience Design | 4/4 | Loading skeleton (3 blocks, aria-label), inline error branch, zero-data state, all 6 mutation hooks invalidate cache key, null pence handled in both display and aggregation |

**Overall: 23/24**

---

## Top 3 Priority Fixes

1. **Hero Card double-gap from base component defaults** — The Card component base applies `gap-6` (24px); SpendingPage overrides with `gap-2` (8px) via className, which cn() merges correctly for gap but the base `py-6` also fires — the effective vertical rhythm in the hero card is `gap-2` between label and amount, which is tight but intentional. The actual structural risk is if a shadcn Card update changes the base `gap-6` and the SpendingPage's `gap-2` override gets dropped: the label and figure drift apart. — Mitigate by extracting the hero card to a `<div>` rather than `<Card>` since it only uses Card as a styled box, OR add a comment documenting the override intent on `SpendingPage.tsx:56`.

2. **Helper text rendered between FormControl and FormMessage in UnitSheet and PaintSheet** — The helper `<p className="text-xs text-muted-foreground">Enter amount in pence (100 = £1.00)</p>` appears at lines UnitSheet:541-543 and PaintSheet:359-361, between `</FormControl>` and `<FormMessage />`. This is structurally correct and matches the UI-SPEC, but shadcn's FormDescription component exists for exactly this purpose and would provide the correct `data-slot` attribute for potential future theming. This is a minor polish opportunity, not a functional issue.

3. **No page heading ("Spending") on the SpendingPage itself** — The UI-SPEC Copywriting Contract lists "Spending" as the sidebar nav label and notes "page heading, if shown" with parenthetical optionality. The spending page has no `<h1>` — only the hero card label "Total Hobby Spend" and a `<h2>Breakdown</h2>`. For a desktop app with a persistent sidebar showing the active page, this is acceptable. However, if the app ever gains a breadcrumb or tab bar, the absence of a semantic `<h1>` will cause an accessibility hierarchy issue (the page has an `<h2>` with no `<h1>` parent).

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

All 18 copy strings declared in the UI-SPEC Copywriting Contract verified against source:

| Contract String | Location Verified | Match |
|---|---|---|
| "Total Hobby Spend" | SpendingPage.tsx:57 | Exact |
| "Breakdown" | SpendingPage.tsx:64 | Exact |
| "Faction" | SpendingPage.tsx:68 | Exact |
| "Spend" | SpendingPage.tsx:69 | Exact |
| "Paints" | SpendingPage.tsx:80 | Exact |
| "Could not load spending data. Restart the app or try again." | SpendingPage.tsx:48 | Exact |
| aria-label "Loading spending data" | SpendingPage.tsx:33 | Exact |
| "Purchase Price" (UnitSheet) | UnitSheet.tsx:525 | Exact |
| "e.g. 1250 for £12.50" (placeholder) | UnitSheet.tsx:531 | Exact |
| "Enter amount in pence (100 = £1.00)" (helper) | UnitSheet.tsx:542 | Exact |
| "Purchase Price" (PaintSheet) | PaintSheet.tsx:343 | Exact |
| "e.g. 350 for £3.50" (placeholder) | PaintSheet.tsx:349 | Exact |
| "Enter amount in pence (100 = £1.00)" (helper) | PaintSheet.tsx:360 | Exact |
| "Save Unit" | UnitSheet.tsx:620 | Exact |
| "Save Paint" | PaintSheet.tsx:373 | Exact |
| "Failed to save unit. Try again." | UnitSheet.tsx:149 | Exact |
| "Something went wrong. Please try again." | PaintSheet.tsx:116 | Exact |
| "Purchase Price" (UnitDetailSheet read-only label) | UnitDetailSheet.tsx:167 | Exact |

The null price display "—" is produced by `formatCurrency(null)` returning `"—"` (formatCurrency.ts:19), which matches the UI-SPEC contract. Zero-pence values display as `"£0.00"` via `Intl.NumberFormat`, matching the spec's explicit "not '—', not 'None'" requirement.

No generic labels ("Submit", "Click Here", "OK") found in any spending-related file.

### Pillar 2: Visuals (3/4)

**What works:**
- Three-branch render (loading / error / data) is clean and correctly structured
- Loading state uses three Skeleton blocks matching the spec's dimensional contract: `h-20 w-full` (hero), `h-6 w-32` (heading), `h-40 w-full` (table)
- Visual hierarchy: Display (£247.50, text-3xl) > Heading (Breakdown, text-xl) > Body (table cells, inherited text-sm from Table)
- Hero card ring (ring-2 ring-faction-accent) provides a clear faction-themed focal point
- Paints row is visually separated from faction rows via `border-t-2` class on the TableRow

**Minor issues:**

1. **Card double-default gap conflict** — `Card` base applies `gap-6 py-6` then SpendingPage overrides with `px-6 py-6 gap-2` (SpendingPage.tsx:56). The `py-6` is declared twice (base + className), which is harmless since cn() applies the className last. But the `gap-6` in the base is overridden by the explicit `gap-2`. The resulting layout is: 24px vertical padding, 8px gap between label and hero figure. This is intentional but fragile if the Card base is updated. The UI-SPEC calls for `gap-2` between label and figure, so the value is correct, but the pattern (relying on override) is not robust.

2. **No visual separation between hero card and breakdown section** — The UI-SPEC specifies `gap-12` (48px, matching the "2xl" token for "Major section breaks (hero to breakdown table)"). The page wrapper uses `gap-12` (SpendingPage.tsx:55) which is correct. The section itself does not have extra `mb-4` on the heading per spec (`<h2 class="text-xl font-semibold mb-4">`) — instead the section uses `gap-4` on the flex-col container (SpendingPage.tsx:63), which provides the same 16px spacing below the heading. This is functionally equivalent and acceptable.

3. **Error state lacks visual differentiation** — The error message renders with `text-sm text-muted-foreground` (SpendingPage.tsx:47), making it visually identical to the hero label. Per UI-SPEC, this is an inline message "no full-page takeover" — but the muted-foreground color makes it look like a label, not a problem state. Consider `text-destructive` or `text-foreground` to give the message appropriate severity. This is a discretionary improvement not required by the spec.

### Pillar 3: Color (4/4)

**faction-accent usage:**
- `ring-faction-accent` appears on the hero card only (SpendingPage.tsx:56) — exactly 1 element, matching spec
- Dashboard `FactionSummaryCard.tsx` uses `ring-faction-accent` on the active card and `fill-faction-accent` on the icon — these are pre-existing, not introduced in Phase 14
- `NavItem.tsx` uses `bg-faction-accent` for the active nav item — pre-existing pattern
- `button.tsx` uses `bg-faction-accent` for the default button variant — pre-existing design system token

No spending-specific component introduces any additional faction-accent usage beyond the one declared in the spec.

**Hardcoded colors:** Zero `#hex` or `rgb()` values in any spending file. All color references go through CSS custom properties via Tailwind tokens. The `faction.color_theme` value is applied via inline style only in `UnitDetailSheet.tsx:88` (the faction badge) — this is a pre-existing pattern not introduced in Phase 14.

**60/30/10 rule:**
- 60% background (--background): page wrapper, table cells via shadcn defaults
- 30% card (--card): hero Card, Table background via shadcn defaults
- 10% accent (--faction-accent): hero card ring only

### Pillar 4: Typography (4/4)

Font sizes in spending files:
- `text-sm` — error message, hero label "Total Hobby Spend", table cell text (inherited), helper text on forms (`text-xs` on helpers)
- `text-xl` — "Breakdown" heading (h2)
- `text-3xl` — hero spend figure

This is exactly the Display/Heading/Label/Body set declared in the UI-SPEC. No undeclared sizes introduced.

Font weights:
- `font-semibold` — hero figure (text-3xl), "Breakdown" h2 (text-xl)

The `text-xs` on helper text (`text-xs text-muted-foreground` in UnitSheet:541 and PaintSheet:359) is consistent with the existing form pattern across the app and within the scale (xs = 12px). The UI-SPEC declares `text-sm` as Body, but `text-xs` for helper/descriptor text is established by the shadcn FormDescription convention already in the project. No conflict with the spec.

### Pillar 5: Spacing (4/4)

All spacing values audited from SpendingPage.tsx:

| Class | Token Value | Declared in UI-SPEC | Usage |
|---|---|---|---|
| `p-8` | 32px | xl | Page-level padding |
| `gap-12` | 48px | 2xl | Hero-to-breakdown gap |
| `px-6 py-6` | 24px | lg | Card internal padding |
| `gap-4` | 16px | md | Section flex-col gap |
| `gap-2` | 8px | sm | Hero card label-to-figure gap |
| `h-20` | 80px | n/a | Skeleton hero block height |
| `h-6` | 24px | n/a | Skeleton heading height |
| `h-40` | 160px | n/a | Skeleton table height |
| `w-32` | 128px | n/a | Skeleton heading width |

Skeleton dimensions are not declared in the UI-SPEC spacing scale but are standard Tailwind scale values (multiples of 4px). No arbitrary values (`[Npx]`) found anywhere in the spending feature files.

UnitSheet and PaintSheet use `gap-4` inside the form (UnitSheet.tsx:167, PaintSheet.tsx:134), matching the existing sheet pattern and the spec's explicit note "no new spacing token needed" for the spend fields.

### Pillar 6: Experience Design (4/4)

**Loading state:** Three-Skeleton loading branch present with `aria-label="Loading spending data"` on the container (SpendingPage.tsx:29-41). Matches spec exactly — three blocks at hero/heading/table dimensions.

**Error state:** `isError || !data` branch renders inline error message (SpendingPage.tsx:44-51). No full-page takeover. Matches spec.

**Empty/zero state:** No special handling required — spec explicitly states "show '£0.00' in hero and all faction rows at '£0.00'. The table is always visible." `formatCurrency(0)` returns `"£0.00"` (verified in formatCurrency.ts using `Intl.NumberFormat`). Zero-pence faction rows always render because `computeSpendingStats` maps all factions regardless of unit count.

**Cache invalidation:** All 6 mutation hooks confirmed invalidating `["spending-stats"]`:
- `useUnits.ts:35, 50, 64` — createUnit, updateUnit, deleteUnit
- `usePaints.ts:49, 63, 76` — createPaint, updatePaint, deletePaint

**Null safety:** `formatCurrency` guards null/undefined with early return `"—"`. `computeSpendingStats` guards null `purchase_price_pence` with `?? 0` coercion. SQL query uses `COALESCE(SUM(...), 0)` for paint row.

**Disabled states:** "Save Unit" and "Save Paint" buttons use `disabled={form.formState.isSubmitting}` — prevents double-submit during async mutation. Correct pattern.

**Registry audit:** components.json exists; UI-SPEC declares all shadcn official, no third-party registries. Registry audit: 0 third-party blocks checked, no flags.

---

## Files Audited

- `src/features/spending/SpendingPage.tsx`
- `src/features/spending/computeSpendingStats.ts`
- `src/hooks/useSpendingStats.ts`
- `src/db/queries/spending.ts`
- `src/app/spending/page.tsx`
- `src/app/router.tsx`
- `src/components/common/AppSidebar.tsx`
- `src/features/units/UnitSheet.tsx`
- `src/features/units/UnitDetailSheet.tsx`
- `src/features/paints/PaintSheet.tsx`
- `src/lib/formatCurrency.ts`
- `src/components/ui/card.tsx`
- `src/hooks/useUnits.ts` (invalidation lines)
- `src/hooks/usePaints.ts` (invalidation lines)
- `src/styles/globals.css` (faction-accent token definition)
