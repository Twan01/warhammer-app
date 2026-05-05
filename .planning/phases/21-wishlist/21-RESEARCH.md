# Phase 21: Wishlist - Research

**Researched:** 2026-05-05
**Domain:** CRUD feature page — SQLite migration + React Query + shadcn/ui Sheet form
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Table row layout matching BattleLogPage pattern (not cards, not gallery)
- Each row shows: name, faction name, estimated cost (formatted), notes snippet, date added
- Rows are clickable for edit (open Sheet) or have inline Edit/Delete actions matching BattleLogRow pattern
- EmptyState follows the icon-pill pattern (Heart or Gift icon — domain-appropriate)
- Wishlist added to MANAGEMENT_NAV group (alongside Factions and Spending)
- Route: `/wishlist`
- Integer pence discipline — `estimated_cost_pence INTEGER` in schema
- formatCurrency for display (the single /100 conversion site)
- Page-level summary stat showing total estimated cost across all items
- Cost is optional (nullable) per WISH-01
- Default sort: created_at DESC (newest first)
- No priority/ranking field for MVP
- Name: required, text input (min 1, max 120 — matches unit name constraints)
- Faction: required, select from existing factions (FK relationship)
- Estimated cost: optional, currency input (stored as integer pence)
- Notes: optional, textarea

### Claude's Discretion
- Exact icon choice for empty state and sidebar nav item
- Whether to show faction color indicator on rows (dot/badge)
- Table column widths and responsive behavior
- Loading skeleton layout
- Whether notes truncate with ellipsis or show in full

### Deferred Ideas (OUT OF SCOPE)
- "Convert to collection" workflow — separate phase
- Priority/ranking system — not in WISH-01..04
- Wishlist total cost on Dashboard — future dashboard card
- Shared/public wishlist — out of scope (local-first app)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WISH-01 | User can add a wishlist item with a name, faction, and optional estimated cost in pence | Migration 009 `wishlist_items` table; `WishlistItemSheet` form with faction Select and optional cost input |
| WISH-02 | User can view all wishlist items on a dedicated page | `WishlistPage` with row list, summary stat, loading/error/empty states |
| WISH-03 | User can delete a wishlist item | `WishlistDeleteDialog` with `useDeleteWishlistItem` mutation; DELETE FROM wishlist_items WHERE id = $1 |
| WISH-04 | User can add optional notes to a wishlist item | `notes TEXT NULL` column in schema; textarea field in Sheet form; notes visible on row (truncated or full) |
</phase_requirements>

## Summary

Phase 21 is a straightforward CRUD page addition that follows an established blueprint precisely. The BattleLogPage architecture (migration → type → query module → hook module → Zod schema → Page + Row + Sheet + DeleteDialog + EmptyState + SummaryBar) is the canonical pattern to replicate. All infrastructure — SQLite client, React Query provider, shadcn/ui Sheet/Dialog, integer-pence currency handling, faction picker via `useFactions` — is already in place and proven across multiple prior phases.

The only new database artifact is migration 009 (`wishlist_items` table). The next migration number (009) is confirmed free: the existing migrations end at `008_enrichment.sql` and no 009 file exists. The STATE.md note says "wishlist_items table = migration 008" but that was written before Phase 17 used 008 for enrichment — the actual next number is 009.

The phase has no external dependencies, no new library installs, and no architectural unknowns. Research confidence is HIGH across all areas because every pattern has been exercised in this codebase multiple times.

**Primary recommendation:** Clone the BattleLogPage file set into `src/features/wishlist/`, adapt to the five wishlist columns, add migration 009 with the `wishlist_items` table, wire the sidebar and router, and add the page-level total cost summary stat.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | project-installed | SQLite CRUD via `$1,$2` positional params | Sole DB access layer in this project |
| @tanstack/react-query | project-installed | Server state + cache invalidation | React Query is the project-standard server-state tool |
| react-hook-form + zod | project-installed | Form validation + type inference | Project-wide pattern; `zodResolver` on every form |
| shadcn/ui Sheet | project-installed | Create/edit form container | Sibling-portal pattern used on every CRUD page |
| shadcn/ui Dialog | project-installed | Delete confirmation modal | BattleLogDeleteDialog uses Dialog (not AlertDialog) |
| shadcn/ui Select | project-installed | Faction picker dropdown | Used in BattleLogSheet for FK selects |
| lucide-react | project-installed | Icons (sidebar nav, empty state, header button) | Project-wide icon library |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| formatCurrency | `src/lib/formatCurrency.ts` | Pence → GBP string | The only place pence is divided by 100 |
| useFactions | `src/hooks/useFactions.ts` | Faction list for Select | Wishlist form needs faction picker |
| PageHeader | `src/components/common/PageHeader.tsx` | Consistent page header | All CRUD pages use this component |
| Skeleton | shadcn/ui | Loading state placeholders | Same pattern as BattleLogPage |
| Sonner (toast) | project-installed | Success/error notifications | All mutation handlers use `toast.success`/`toast.error` |

### Alternatives Considered
None — all decisions are locked by CONTEXT.md. There are no alternative choices to document.

**Installation:**
No new packages required. All dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/features/wishlist/
├── wishlistItemSchema.ts     # Zod schema + WishlistItemFormValues type
├── WishlistItemSheet.tsx     # Create/edit Sheet form
├── WishlistItemRow.tsx       # Table row with hover Edit/Delete
├── WishlistItemDeleteDialog.tsx  # Delete confirmation Dialog
├── WishlistEmptyState.tsx    # Icon-pill empty state
├── WishlistTotalBar.tsx      # Page-level total estimated cost summary
└── WishlistPage.tsx          # Page root (sibling-portal architecture)

src/db/queries/
└── wishlistItems.ts          # CRUD query functions

src/hooks/
└── useWishlistItems.ts       # React Query keys + hooks + mutations

src/types/
└── wishlistItem.ts           # WishlistItem + CreateWishlistItemInput + UpdateWishlistItemInput

src-tauri/migrations/
└── 009_wishlist.sql          # wishlist_items table

src/app/
└── router.tsx                # Add wishlistRoute (edit existing file)

src/components/common/
└── AppSidebar.tsx            # Add Wishlist to MANAGEMENT_NAV (edit existing file)
```

### Pattern 1: Sibling-Portal Page Architecture
**What:** Page component owns all portal state (sheetOpen, editingItem, deleteDialogOpen, deletingItem). Sheet and Dialog are mounted as siblings at the page root, never nested inside row components.
**When to use:** Every CRUD page in this project uses this pattern.
**Example:**
```typescript
// Source: src/features/battle-log/BattleLogPage.tsx
export function WishlistPage() {
  const { data: items, isLoading, isError } = useWishlistItems();
  const { data: factions } = useFactions();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<WishlistItem | null>(null);

  const factionNameById = useMemo(() => {
    const m = new Map<number, string>();
    (factions ?? []).forEach((f) => m.set(f.id, f.name));
    return m;
  }, [factions]);

  // ... handlers, render ...

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Wishlist" subtitle="Models you want to buy." actions={...} />
      {/* list rendering */}
      {/* Sibling portals at page root — NEVER nested */}
      <WishlistItemSheet key={editingItem?.id ?? "new"} open={sheetOpen} item={editingItem} onClose={closeSheet} />
      <WishlistItemDeleteDialog key={deletingItem?.id ?? "none"} open={deleteDialogOpen} item={deletingItem} onClose={closeDelete} />
    </div>
  );
}
```

### Pattern 2: Sheet Form with buildDefaultValues
**What:** `buildDefaultValues(item: WishlistItem | null)` function populates form defaults for both create (null) and edit (existing item) paths. Avoids zod `.default()` which breaks react-hook-form zodResolver type inference with zod v4.
**When to use:** All forms in this project follow this pattern.
**Example:**
```typescript
// Source: src/features/battle-log/BattleLogSheet.tsx (adapted)
const DEFAULT_VALUES: WishlistItemFormValues = {
  name: "",
  faction_id: 0,       // will be overridden by Select (user must pick)
  estimated_cost_pence: null,
  notes: null,
};

function buildDefaultValues(item: WishlistItem | null): WishlistItemFormValues {
  if (item) {
    return {
      name: item.name,
      faction_id: item.faction_id,
      estimated_cost_pence: item.estimated_cost_pence,
      notes: item.notes,
    };
  }
  return { ...DEFAULT_VALUES };
}
```

### Pattern 3: Integer Pence Currency Input
**What:** The currency form field stores pence as an integer. Input `type="number"` maps empty string → null, numeric string → value × 100 (multiply on entry) or divide on display.
**When to use:** Any field that stores money.

The pattern from the spending module: the raw integer is stored and read as-is from SQLite. The form input shows pounds (pence / 100) and on change multiplies by 100 to store pence. `formatCurrency(pence)` handles display.

```typescript
// Currency input: display as pounds, store as pence
<Input
  type="number"
  min={0}
  step={0.01}
  placeholder="e.g. 35.00"
  value={field.value !== null ? field.value / 100 : ""}
  onChange={(e) =>
    field.onChange(
      e.target.value === "" ? null : Math.round(e.target.valueAsNumber * 100)
    )
  }
/>
```

### Pattern 4: React Query Hook Module
**What:** One hook file per entity. Exports: cache key constants, `useEntity` query, `useCreateEntity`, `useUpdateEntity`, `useDeleteEntity` mutations. Mutations invalidate the entity key AND `['dashboard-stats']` for forward-compat.
**When to use:** Every new entity in this project.
**Example:**
```typescript
// Source: src/hooks/useBattleLogs.ts (adapted)
export const WISHLIST_ITEMS_KEY = ["wishlist-items"] as const;

export function useWishlistItems() {
  return useQuery({ queryKey: WISHLIST_ITEMS_KEY, queryFn: getWishlistItems });
}

export function useCreateWishlistItem() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateWishlistItemInput>({
    mutationFn: createWishlistItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WISHLIST_ITEMS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
```

### Pattern 5: SQLite Query Module
**What:** All SQL lives in `src/db/queries/`. Parameterized with `$1,$2` positional syntax. No ORM. Nullable FKs use full-replacement UPDATE (not COALESCE) so they can be cleared to NULL.
**When to use:** Every entity.
**Example:**
```typescript
// Source: src/db/queries/battleLogs.ts (adapted)
export async function getWishlistItems(): Promise<WishlistItem[]> {
  const db = await getDb();
  return db.select<WishlistItem[]>(
    "SELECT * FROM wishlist_items ORDER BY created_at DESC"
  );
}

export async function createWishlistItem(input: CreateWishlistItemInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO wishlist_items (name, faction_id, estimated_cost_pence, notes)
     VALUES ($1, $2, $3, $4)`,
    [input.name, input.faction_id, input.estimated_cost_pence ?? null, input.notes ?? null]
  );
  return result.lastInsertId ?? 0;
}
```

### Pattern 6: Migration File Naming
**What:** Migration files use zero-padded 3-digit prefix. Existing files end at `008_enrichment.sql`. Next file is `009_wishlist.sql`.
**When to use:** Every new table.
**Example:**
```sql
-- 009_wishlist.sql — HobbyForge v2.2 Phase 21 (WISH-01..04)
CREATE TABLE IF NOT EXISTS wishlist_items (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL,
  faction_id            INTEGER NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  estimated_cost_pence  INTEGER,
  notes                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Pattern 7: Row with Hover Actions
**What:** Row div has `group` class. Action buttons use `invisible group-hover:visible` to appear only on hover. Each action button calls `e.stopPropagation()` before its handler so it does not trigger any row-level onClick (e.g., expand toggle).
**When to use:** Any list row with Edit/Delete actions.
**Example:**
```typescript
// Source: src/features/battle-log/BattleLogRow.tsx
<div className="group relative flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors duration-150 cursor-pointer border-b border-border/40">
  {/* Row content */}
  <div className="invisible group-hover:visible flex items-center gap-1">
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEditClick}>
      <Pencil className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDeleteClick}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</div>
```

### Pattern 8: EmptyState Icon-Pill
**What:** Centered flex column with a muted rounded-xl pill containing icon, heading, body, and CTA button.
**When to use:** Every page with a zero-items state.
**Example:**
```typescript
// Source: src/features/battle-log/BattleLogEmptyState.tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <div className="rounded-xl bg-muted/40 p-4">
    <Heart className="h-8 w-8 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <p className="text-base font-semibold">Your wishlist is empty</p>
    <p className="text-sm text-muted-foreground max-w-xs">
      Add models you want to buy — track names, factions, and estimated cost.
    </p>
  </div>
  <Button className="mt-2" onClick={onAdd}>Add Item</Button>
</div>
```

### Anti-Patterns to Avoid
- **Nested Sheet/Dialog inside Row:** Never mount Sheet or Dialog inside a list row component. Always mount as sibling portals at the page root (Pitfall 1 from Phase 18 research).
- **zod `.default()` on form schema:** Breaks react-hook-form zodResolver type inference with zod v4. Use `buildDefaultValues()` function instead.
- **Pence division outside formatCurrency:** Only `src/lib/formatCurrency.ts` divides pence by 100. Every display call must use `formatCurrency(pence)`.
- **COALESCE in UPDATE for nullable FK columns:** If the user clears a nullable FK (e.g., resets faction), COALESCE would silently keep the old value. For `faction_id` (required, not nullable), this does not apply — but `estimated_cost_pence` and `notes` must also use full-replacement UPDATE without COALESCE.
- **Importing DB client in UI components:** DB access must only happen in `src/db/queries/*.ts`. UI calls hooks only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | Zod schema + zodResolver | Edge cases, type safety, consistent error messages |
| Modal/Sheet portal management | React createPortal manually | shadcn/ui Sheet + Dialog | Already installed, handles Radix focus trap + scroll lock |
| Currency formatting | Custom pence→string function | `formatCurrency` from `@/lib/formatCurrency` | Already exists; is the single /100 site |
| Faction list for picker | New query | `useFactions()` hook | Already exists and cached |
| SQL parameterization | String concatenation | `$1,$2` positional params in tauri-plugin-sql | Required by tauri-plugin-sql; also prevents SQL injection |
| Server state cache | useState + useEffect fetch | React Query (useQuery + useMutation) | Handles stale time, invalidation, error retries |

**Key insight:** Phase 21 is purely additive with no new infrastructure. Every building block already exists — the work is assembly, not invention.

## Common Pitfalls

### Pitfall 1: Nested Portal (Sheet/Dialog Inside Row Component)
**What goes wrong:** Sheet or Dialog rendered inside WishlistItemRow causes Radix portal z-index and focus trap issues — the overlay renders inside the row's DOM subtree, not at the document body.
**Why it happens:** Developer tries to co-locate the edit/delete UI with the row data.
**How to avoid:** Always mount `WishlistItemSheet` and `WishlistItemDeleteDialog` as the LAST children of `WishlistPage`, never inside `WishlistItemRow`.
**Warning signs:** Sheet opens but overlay doesn't dim the full page, or focus doesn't trap correctly.

### Pitfall 2: Wrong Migration Number
**What goes wrong:** Creating `008_wishlist.sql` when `008_enrichment.sql` already exists — tauri-plugin-sql runs migrations in filename order and the new file conflicts with or duplicates 008.
**Why it happens:** STATE.md note ("wishlist_items table = migration 008") was written before Phase 17 consumed 008 for enrichment.
**How to avoid:** Confirmed: next available number is 009. Create `009_wishlist.sql`.
**Warning signs:** App crashes on startup with a migration error about table already existing or wrong version.

### Pitfall 3: Form Reset on Sheet Re-open
**What goes wrong:** Opening the Sheet to edit item A, closing, then opening for item B — form still shows item A's data.
**Why it happens:** react-hook-form keeps defaultValues from first mount. The `key` prop on the Sheet (`key={editingItem?.id ?? "new"}`) forces remount, and the `useEffect(() => { form.reset(buildDefaultValues(item)) }, [item, form])` belt-and-braces reset handles cases where key doesn't change.
**How to avoid:** Use BOTH the `key` prop pattern AND the `useEffect` reset — mirrors BattleLogSheet exactly.
**Warning signs:** Editing the second wishlist item shows data from the first.

### Pitfall 4: Currency Input Value Drift
**What goes wrong:** Showing the raw pence integer in the currency input (e.g. 3500 instead of 35.00) or storing the pounds float as pence without Math.round, causing floating-point drift.
**Why it happens:** Forgetting the /100 → ×100 conversion in the form input vs. storage.
**How to avoid:** Input displays `field.value / 100` (pounds), onChange stores `Math.round(valueAsNumber * 100)` (pence). formatCurrency handles read-only display.
**Warning signs:** Entering "35" saves 3500 pence (£35.00 becomes £3500), or entering "35.99" saves 3598 due to float rounding.

### Pitfall 5: Faction Select with `value=""` on New Item
**What goes wrong:** shadcn Select requires a non-empty string value. On the create form, `faction_id` defaults to 0 or undefined, causing the Select to render without a visible selected value or throw a React warning.
**Why it happens:** Select value must be a string matching one of the SelectItem values. 0 or undefined don't match any `String(faction.id)`.
**How to avoid:** Use a sentinel like `"__none__"` as the placeholder (as BattleLogSheet does with `NO_LIST`), or require faction as a mandatory first step and use `placeholder="Select a faction"` with an unset initial value. Since faction is required (not nullable), validate via Zod `z.number().int().positive()` which fails at 0 — the user must pick.
**Warning signs:** Select renders blank with no placeholder text on the create form.

### Pitfall 6: getAllByText on shadcn Select in Tests
**What goes wrong:** `getByText("Some Faction")` in tests throws "multiple elements" error because shadcn Select renders the selected value in both a visible span AND a hidden native option.
**Why it happens:** Radix Select renders a native select for accessibility alongside the custom UI.
**How to avoid:** Use `getAllByText` or scope the query to a specific container role. Mirrors Phase 28 pitfall documented in STATE.md.
**Warning signs:** Test fails with "Found multiple elements with the text..."

### Pitfall 7: No `updated_at` Column on wishlist_items
**What goes wrong:** Adding `updated_at` handling in the UPDATE query or TypeScript interface when the table schema does not include that column.
**Why it happens:** Developer copies the units/factions pattern which does have updated_at.
**How to avoid:** `wishlist_items` schema mirrors `battle_logs` (no updated_at). The UPDATE query must not SET or reference `updated_at`. Do NOT add it to the TypeScript interface.
**Warning signs:** SQL error on UPDATE, or TypeScript interface mismatch.

## Code Examples

Verified patterns from this codebase:

### Migration SQL (009_wishlist.sql)
```sql
-- Source: mirrors 008_enrichment.sql naming convention + 001_core_schema.sql table patterns
-- 009_wishlist.sql — HobbyForge v2.2 Phase 21 (WISH-01..04)
CREATE TABLE IF NOT EXISTS wishlist_items (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL,
  faction_id            INTEGER NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  estimated_cost_pence  INTEGER,
  notes                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### TypeScript Entity Type (src/types/wishlistItem.ts)
```typescript
// Source: mirrors src/types/battleLog.ts pattern
export interface WishlistItem {
  id: number;
  name: string;
  faction_id: number;
  estimated_cost_pence: number | null;
  notes: string | null;
  created_at: string;
  // NO updated_at — schema does not have one
}

export type CreateWishlistItemInput = Omit<WishlistItem, "id" | "created_at">;
export type UpdateWishlistItemInput = CreateWishlistItemInput & { id: number };
```

### Zod Schema (wishlistItemSchema.ts)
```typescript
// Source: mirrors src/features/battle-log/battleLogSchema.ts
// NOTE: no zod .default() — breaks react-hook-form zodResolver with zod v4
export const wishlistItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  faction_id: z.number().int().positive("Faction is required"),
  estimated_cost_pence: z.number().int().min(0).nullable(),
  notes: z.string().max(2000).nullable(),
});

export type WishlistItemFormValues = z.infer<typeof wishlistItemSchema>;
```

### Sidebar Addition (AppSidebar.tsx)
```typescript
// Source: src/components/common/AppSidebar.tsx — MANAGEMENT_NAV const array
const MANAGEMENT_NAV = [
  { to: "/factions",  label: "Factions", icon: Shield },
  { to: "/spending",  label: "Spending", icon: Wallet },
  { to: "/wishlist",  label: "Wishlist", icon: Heart },  // ADD THIS LINE
] as const;
```

### Router Registration (router.tsx)
```typescript
// Source: src/app/router.tsx — add after spendingRoute
import { WishlistPage } from "./wishlist/page";

const wishlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wishlist",
  component: WishlistPage,
});

// In routeTree addChildren array, add wishlistRoute
```

### Page-Level Total Bar
```typescript
// Source: mirrors BattleLogSummaryBar pattern
// Compute total from items array in WishlistPage useMemo
const totalPence = useMemo(
  () => (items ?? []).reduce((sum, item) => sum + (item.estimated_cost_pence ?? 0), 0),
  [items]
);
// Render only when totalPence > 0 and items.length > 0
<div className="flex items-center gap-4 py-3 text-sm text-muted-foreground">
  <span className="font-semibold text-foreground tabular-nums">{items?.length}</span>
  <span>items</span>
  <span className="text-border">·</span>
  <span className="font-semibold text-foreground">{formatCurrency(totalPence)}</span>
  <span>estimated</span>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AlertDialog for delete | Dialog with destructive Button | Phase 18 | alert-dialog not installed; Dialog is the correct shadcn component |
| `xit`/`xtest` for skipped tests | `it.skip` | Phase 26 | Consistent skip marker; Wave 1 greps `it.skip` to activate |
| Wave 0 stubs import not-yet-existing modules | Wave 0 stubs omit those imports (TODO comments) | Phase 18 | Prevents TypeScript compile errors before Wave 1 creates the modules |

**No deprecated patterns applicable to this phase.**

## Open Questions

1. **Faction color indicator on rows (Claude's Discretion)**
   - What we know: BattleLogRow doesn't show faction color; ArmyListCard shows faction accent as borderTop
   - What's unclear: Whether adding a faction color dot/badge to WishlistItemRow is beneficial UX
   - Recommendation: Add a small faction color indicator (dot using `bg-faction-accent` or inline style with faction color) — it's a Wishlist for models by faction and the visual grouping aids scanning. Keep it small (h-2 w-2 rounded-full).

2. **Notes display in row: truncate vs full**
   - What we know: BattleLogRow uses Collapsible expand for notes; CONTEXT.md leaves this to Claude's discretion
   - What's unclear: Whether wishlist notes need the full Collapsible pattern or simple truncation
   - Recommendation: Simple single-line truncate with `truncate` class and `title` attribute for full text on hover. Wishlist notes are shorter and less structured than battle log notes. The edit Sheet is the full view. Avoids Collapsible complexity.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `pnpm test -- tests/wishlist/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WISH-01 | `createWishlistItem` inserts name/faction_id/estimated_cost_pence/notes; returns lastInsertId | unit (SQL contract) | `pnpm test -- tests/wishlist/wishlistQueries.test.ts` | ❌ Wave 0 |
| WISH-01 | Form saves and item appears (Sheet submit flow) | component | `pnpm test -- tests/wishlist/WishlistPage.test.tsx` | ❌ Wave 0 |
| WISH-02 | `getWishlistItems` SELECT ORDER BY created_at DESC | unit (SQL contract) | `pnpm test -- tests/wishlist/wishlistQueries.test.ts` | ❌ Wave 0 |
| WISH-02 | Page renders rows with name/faction/cost/notes/date | component | `pnpm test -- tests/wishlist/WishlistPage.test.tsx` | ❌ Wave 0 |
| WISH-03 | `deleteWishlistItem` runs DELETE WHERE id=$1 | unit (SQL contract) | `pnpm test -- tests/wishlist/wishlistQueries.test.ts` | ❌ Wave 0 |
| WISH-03 | Delete dialog appears; confirm removes item from list | component | `pnpm test -- tests/wishlist/WishlistPage.test.tsx` | ❌ Wave 0 |
| WISH-04 | notes column nullable; passes null for undefined | unit (SQL contract) | `pnpm test -- tests/wishlist/wishlistQueries.test.ts` | ❌ Wave 0 |
| WISH-04 | Notes visible on row after save | component | `pnpm test -- tests/wishlist/WishlistPage.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/wishlist/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/wishlist/wishlistQueries.test.ts` — SQL contract tests covering WISH-01..04 (mirrors `tests/battle-log/battleLogQueries.test.ts`)
- [ ] `tests/wishlist/WishlistPage.test.tsx` — component integration tests covering WISH-01..04
- [ ] No new framework install needed — Vitest + RTL already configured

## Sources

### Primary (HIGH confidence)
- `src/features/battle-log/BattleLogPage.tsx` — Sibling-portal page architecture, state machine, useMemo lookup map, PageHeader usage
- `src/features/battle-log/BattleLogSheet.tsx` — buildDefaultValues pattern, zod no-.default() rule, useEffect reset, Select sentinel value, TEXTAREA_CLASS
- `src/features/battle-log/BattleLogRow.tsx` — group-hover action buttons, stopPropagation, border-b row styling
- `src/features/battle-log/BattleLogDeleteDialog.tsx` — Dialog (not AlertDialog) delete confirmation pattern
- `src/features/battle-log/BattleLogEmptyState.tsx` — Icon-pill empty state structure
- `src/features/battle-log/BattleLogSummaryBar.tsx` — Page-level stat bar pattern
- `src/features/battle-log/battleLogSchema.ts` — Zod schema without .default(), RESULTS const array
- `src/hooks/useBattleLogs.ts` — React Query key constants, mutation invalidation pattern (dashboard-stats + entity key)
- `src/db/queries/battleLogs.ts` — SQL parameterization, full-replacement UPDATE, positional params
- `src/types/battleLog.ts` — Entity/CreateInput/UpdateInput type pattern, no-updated_at note
- `src/lib/formatCurrency.ts` — The ONLY pence/100 division site; null → "—" return
- `src/components/common/AppSidebar.tsx` — MANAGEMENT_NAV const array, exact icon imports, NavItem pattern
- `src/app/router.tsx` — createRoute pattern, routeTree.addChildren ordering
- `src-tauri/migrations/008_enrichment.sql` — Confirmed last migration file; next = 009
- `.planning/phases/21-wishlist/21-CONTEXT.md` — All locked decisions and discretion areas
- `.planning/milestones/v2.2-REQUIREMENTS.md` — WISH-01..04 requirement text (lines 18–21)
- `.planning/STATE.md` — wishlist_items = migration "008" note (now superseded by 008 being used for enrichment → actual next is 009)

### Secondary (MEDIUM confidence)
- `tests/battle-log/battleLogQueries.test.ts` — Verified test structure for SQL contract tests (selectMock/executeMock pattern, beforeEach mockReset)

### Tertiary (LOW confidence)
- None — all findings are grounded in project source files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — BattleLogPage is a verified blueprint in this codebase
- Pitfalls: HIGH — all documented from actual prior-phase decisions in STATE.md
- Migration number: HIGH — filesystem-verified (009 is the next available slot)

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (stable stack, no fast-moving dependencies)
