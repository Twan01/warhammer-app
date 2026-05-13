Scaffold a complete new HobbyForge feature module for: $ARGUMENTS

Follow the exact conventions from the existing 9 feature domains in `src/features/`. Use `src/features/paints/` as the primary reference for structure.

## Steps

1. **Determine naming**: from the argument, derive:
   - `kebab-name` — directory and file names (e.g. `battle-log`)
   - `PascalName` — component and type names (e.g. `BattleLog`)
   - `camelName` — variable and function names (e.g. `battleLog`)
   - `SNAKE_NAME` — query key constants (e.g. `BATTLE_LOGS`)

2. **Read existing patterns** before writing anything:
   - Read `src/features/paints/` to understand Sheet/Row/Page structure
   - Read `src/db/queries/paints.ts` for query pattern ($1/$2 syntax, lastInsertId)
   - Read `src/hooks/usePaints.ts` for hook pattern (ENTITY_KEY, mutations, invalidation)
   - Read `src/types/paint.ts` for the Entity/CreateInput/UpdateInput type pattern

3. **Create these files** (in this order):

   a. `src/types/<kebab-name>.ts`
      - `interface PascalName { id: number; name: string; created_at: string; updated_at?: string; }`
      - `type CreatePascalNameInput = Omit<PascalName, "id" | "created_at" | "updated_at">`
      - `type UpdatePascalNameInput = Partial<CreatePascalNameInput> & { id: number }`
      - Add any const arrays for union fields: `export const FIELD_OPTIONS = [...] as const`

   b. `src/features/<kebab-name>/entitySchema.ts`
      - Zod schema matching CreatePascalNameInput
      - `export type PascalNameFormValues = z.infer<typeof entitySchema>`

   c. `src/db/queries/<kebab-name>.ts`
      - `import { getDb } from "@/db/client"`
      - `getAll()`, `getById(id)`, `create(input)`, `update(input)`, `delete(id)`
      - Parameterized with `$1, $2` — **never** use `?` or named params
      - Booleans: cast reads with `Boolean()`, writes with `value ? 1 : 0`
      - `create` returns `result.lastInsertId ?? 0`
      - `delete` comment: "FK violation throws — caller catches"

   d. `src/hooks/use<PascalName>s.ts`
      - `export const PASCAL_NAMES_KEY = ["kebab-names"] as const`
      - `export const PASCAL_NAME_KEY = (id: number) => ["kebab-names", id] as const`
      - `usePascalNames()`, `usePascalName(id)`, `useCreatePascalName()`, `useUpdatePascalName()`, `useDeletePascalName()`
      - Mutations call `qc.invalidateQueries({ queryKey: PASCAL_NAMES_KEY })` on success

   e. `src/features/<kebab-name>/<PascalName>Sheet.tsx`
      - shadcn Sheet with React Hook Form + Zod resolver
      - Props: `{ open, onOpenChange, editId? }` pattern
      - Load entity with `usePascalName(editId)` when editId is set
      - Submit calls `useCreatePascalName` or `useUpdatePascalName` based on editId
      - Show toast on success/error

   f. `src/features/<kebab-name>/<PascalName>Row.tsx`
      - Table row with Edit + Delete buttons
      - Props inline: `{ entity: PascalName; onEdit: () => void }`
      - Delete uses `useDeletePascalName`, catches FK errors with toast

   g. `src/features/<kebab-name>/apply<PascalName>Filters.ts`
      - Pure function: `(items: PascalName[], filters: PascalNameFilters) => PascalName[]`
      - No side effects, no imports from hooks

   h. `src/features/<kebab-name>/<PascalName>Page.tsx`
      - Uses `usePascalNames()` for data
      - Toolbar with search input + "New PascalName" button
      - Table with `<PascalNameRow>` per item
      - Sheet state: `editId` + `sheetOpen`
      - Loading/empty states

   i. `tests/<kebab-name>/<kebab-name>.test.ts`
      - Stub file with 3 placeholder tests: renders empty state, renders items, opens sheet on new click
      - Mock `@tauri-apps/plugin-sql` with `vi.mock`
      - Mock the hook with `vi.mock("@/hooks/use<PascalName>s")`

4. **Register the route** in `src/app/router.tsx` — read the file first to find the correct pattern, then add the new route.

5. **Add the sidebar link** in `src/components/common/AppSidebar.tsx` — read the file first to find where nav items are defined.

Report each file created with its path. Do not create a migration — the user should run `/project:new-migration` separately if a new table is needed.
