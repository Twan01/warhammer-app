# Phase 121: Settings Foundation - Pattern Map

**Mapped:** 2026-06-10
**Files analyzed:** 7 (4 new source files + 3 new test files)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src-tauri/migrations/044_app_settings.sql` | migration | batch | `src-tauri/migrations/043_udb_stratagems_enhancements.sql` | exact |
| `src-tauri/src/lib.rs` (modify — add version 44) | config | batch | `src-tauri/src/lib.rs` lines 260–265 | exact |
| `src/db/queries/appSettings.ts` | service | CRUD | `src/db/queries/factions.ts` | exact |
| `src/hooks/useAppSettings.ts` | hook | request-response | `src/hooks/useFactions.ts` | exact |
| `src/app/settings/page.tsx` (replace) | component | request-response | `src/features/rules-hub/RulesHubPage.tsx` | role-match |
| `tests/settings/migration044.test.ts` | test | batch | `tests/data-layer/migration038.test.ts` | exact |
| `tests/settings/useAppSettings.test.ts` | test | request-response | `tests/foundation/useRecipes.test.ts` | exact |

---

## Pattern Assignments

### `src-tauri/migrations/044_app_settings.sql` (migration, batch)

**Analog:** `src-tauri/migrations/043_udb_stratagems_enhancements.sql`

**Full migration pattern** (lines 1–15 of analog):
```sql
-- Migration 043: Stratagems and Enhancements
-- DDL only — no INSERTs (boot-loop prevention per migration 038 precedent).

CREATE TABLE IF NOT EXISTS udb_stratagems (
  id            TEXT PRIMARY KEY,
  ...
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Key rules extracted:**
- First line is a comment with migration number and human name
- Second line always states `-- DDL only — no INSERTs (boot-loop prevention per migration 038 precedent).`
- Always use `CREATE TABLE IF NOT EXISTS` (idempotency requirement)
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))` is the timestamp column pattern
- No `ALTER TABLE`, no `DROP`, no `INSERT` — additive DDL only

---

### `src-tauri/src/lib.rs` (config — add one Migration block)

**Analog:** `src-tauri/src/lib.rs` lines 260–265

**Registration pattern** (lines 260–265 of analog):
```rust
Migration {
    version: 43,
    description: "udb_stratagems_enhancements",
    sql: include_str!("../migrations/043_udb_stratagems_enhancements.sql"),
    kind: MigrationKind::Up,
},
```

**Insertion point:** After the version 43 block (line 265), before the closing `]` (line 266). The new block is:
```rust
Migration {
    version: 44,
    description: "app_settings",
    sql: include_str!("../migrations/044_app_settings.sql"),
    kind: MigrationKind::Up,
},
```

---

### `src/db/queries/appSettings.ts` (service, CRUD)

**Analog:** `src/db/queries/factions.ts`

**Imports pattern** (lines 1–2 of analog):
```typescript
import { getDb } from "@/db/client";
import type { Faction, CreateFactionInput, UpdateFactionInput } from "@/types/faction";
```
For appSettings.ts: omit the type import line (no separate types file needed — `AppSettingsMap` is defined inline).

**Select-all pattern** (lines 4–7 of analog):
```typescript
export async function getFactions(): Promise<Faction[]> {
  const db = await getDb();
  return db.select<Faction[]>("SELECT * FROM factions ORDER BY name ASC");
}
```

**Select-by-key pattern** (lines 9–13 of analog):
```typescript
export async function getFactionById(id: number): Promise<Faction | null> {
  const db = await getDb();
  const rows = await db.select<Faction[]>("SELECT * FROM factions WHERE id = $1", [id]);
  return rows[0] ?? null;
}
```

**Write/execute pattern** (lines 15–23 of analog — uses `db.execute` not `db.select`):
```typescript
export async function createFaction(input: CreateFactionInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO factions (name, game_system, description, color_theme, icon_path, lore_notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.name, ...]
  );
  return result.lastInsertId ?? 0;
}
```

**Key conventions from analog:**
- `$1, $2` positional parameter syntax (not `?` or `:name`)
- `getDb()` awaited at the top of every function
- `rows[0] ?? null` pattern for nullable single-row selects
- Booleans stored as `0 | 1`; strings via `?? null`

---

### `src/hooks/useAppSettings.ts` (hook, request-response)

**Analog:** `src/hooks/useFactions.ts`

**Imports pattern** (lines 1–9 of analog):
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFactions,
  getFactionById,
  createFaction,
  updateFaction,
  deleteFaction,
} from "@/db/queries/factions";
import type { CreateFactionInput, UpdateFactionInput } from "@/types/faction";
```

**KEY constant pattern** (lines 11–12 of analog):
```typescript
export const FACTIONS_KEY = ["factions"] as const;
export const FACTION_KEY = (id: number) => ["factions", id] as const;
```

**useQuery pattern** (lines 14–16 of analog):
```typescript
export function useFactions() {
  return useQuery({ queryKey: FACTIONS_KEY, queryFn: getFactions });
}
```

**useMutation + invalidation pattern** (lines 26–33 of analog):
```typescript
export function useCreateFaction() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateFactionInput>({
    mutationFn: createFaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FACTIONS_KEY });
    },
  });
}
```

**Key conventions from analog:**
- `export const ENTITY_KEY = ["entity-name"] as const` — array literal, `as const`
- No `staleTime` set on individual hooks — QueryProvider default (5 min) covers it; add explicit comment if needed
- `useMutation<ReturnType, Error, InputType>` generic typing
- `onSuccess: () => { qc.invalidateQueries(...) }` — always invalidate the list key on mutation

---

### `src/app/settings/page.tsx` (component, request-response) — replace existing file

**Current file** (all 5 lines — replace entirely):
```typescript
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export function SettingsPage() {
  return <PlaceholderPage title="Settings" phase={5} />;
}
```

**Analog for Tabs usage:** `src/features/rules-hub/RulesHubPage.tsx`

**Imports pattern for Tabs** (lines 1–4 of analog):
```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
```

**Tabs structure pattern** (lines 148–155 of analog):
```typescript
<Tabs defaultValue="datasheets">
  <TabsList>
    <TabsTrigger value="datasheets">Datasheets</TabsTrigger>
    <TabsTrigger value="stratagems">Stratagems</TabsTrigger>
    ...
  </TabsList>

  <TabsContent value="datasheets" className="mt-4 space-y-4">
    ...
  </TabsContent>
</Tabs>
```

**Loading state pattern with Skeleton** (lines 211–217 of analog):
```typescript
{stratagemLoading ? (
  <div className="flex flex-col gap-2">
    {[0, 1, 2].map((i) => (
      <Skeleton key={i} className="h-[80px] w-full rounded-lg" />
    ))}
  </div>
) : ( ... )}
```

**Page container pattern** (line 106 of analog):
```typescript
<div className="flex flex-col gap-6 p-6">
  <h1 className="text-3xl font-semibold tracking-tight">Rules Hub</h1>
```
Note: UI-SPEC for Settings uses `p-6 space-y-6` and `text-xl font-semibold` (smaller heading than RulesHub's `text-3xl`).

**Critical constraint:** The replacement file MUST keep `export function SettingsPage()` — same name as existing export, or the router import at `src/app/router.tsx` lines 169–171 breaks.

---

### `tests/settings/migration044.test.ts` (test, batch)

**Analog:** `tests/data-layer/migration038.test.ts`

**File header pattern** (lines 1–5 of analog):
```typescript
// @vitest-environment node

import { describe, it, expect } from "vitest";
import { createHobbyforgeDb } from "./db-helpers";
```

**Note:** The test file must import `createHobbyforgeDb` from the shared `tests/data-layer/db-helpers.ts` helper. This helper applies all migrations up to 041. For migration044 tests, the `db-helpers.ts` file must first be updated to include `042_udb_detachments.sql`, `043_udb_stratagems_enhancements.sql`, and `044_app_settings.sql` in `HOBBYFORGE_MIGRATIONS`. Alternatively, the test file can run migrations manually via `db.exec(readFileSync(...))`.

**Schema verification pattern** (lines 22–33 of analog):
```typescript
it("creates all udb_* regular tables", () => {
  const db = createHobbyforgeDb();
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'udb_%' ...")
    .all() as { name: string }[];
  db.close();

  const names = rows.map((r) => r.name);
  expect(names).toContain("udb_factions");
  ...
});
```

**Upsert behavior pattern** (lines 51–63 of analog — constraint test):
```typescript
it("udb_meta enforces CHECK(id=1)", () => {
  const db = createHobbyforgeDb();
  db.prepare("INSERT INTO udb_meta (id, ...) VALUES (1, ...)").run();
  expect(() => {
    db.prepare("INSERT INTO udb_meta (id, ...) VALUES (2, ...)").run();
  }).toThrow();
  db.close();
});
```

---

### `tests/settings/useAppSettings.test.ts` (test, request-response)

**Analog:** `tests/foundation/useRecipes.test.ts`

**vi.mock pattern** (lines 14–22 of analog):
```typescript
vi.mock("@/db/queries/recipes", () => ({
  getRecipes: vi.fn().mockResolvedValue([]),
  getRecipeById: vi.fn().mockResolvedValue(null),
  createRecipe: vi.fn().mockResolvedValue(1),
  ...
}));
```

**makeWrapper helper** (lines 57–63 of analog):
```typescript
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}
```

**KEY constant test pattern** (lines 69–77 of analog):
```typescript
describe("useRecipes — RECIPES_KEY constants", () => {
  it("RECIPES_KEY equals ['recipes'] literal", () => {
    expect(RECIPES_KEY).toEqual(["recipes"]);
  });
});
```

**Mutation invalidation test pattern** (lines 79–91 of analog):
```typescript
it("invalidates RECIPES_KEY (['recipes'])", async () => {
  const { spy, wrapper } = makeWrapper();
  const { result } = renderHook(() => useCreateRecipe(), { wrapper });

  await act(async () => {
    await result.current.mutateAsync(MIN_CREATE_INPUT);
  });
  await waitFor(() => expect(spy).toHaveBeenCalled());

  const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
  expect(keys).toContainEqual(RECIPES_KEY);
});
```

---

## Shared Patterns

### DB Client Import
**Source:** `src/db/client.ts`
**Apply to:** `src/db/queries/appSettings.ts`
```typescript
import { getDb } from "@/db/client";
// getDb() returns the singleton DB connection promise
// Never import Database directly — always go through getDb()
```

### Parameterized Query Syntax
**Source:** `src/db/queries/factions.ts` lines 9–13
**Apply to:** All queries in `src/db/queries/appSettings.ts`
```typescript
// CORRECT — Tauri plugin-sql positional syntax
const rows = await db.select<Faction[]>(
  "SELECT * FROM factions WHERE id = $1", [id]
);
// WRONG — never use ? or :name syntax
```

### React Query Wrapper
**Source:** `tests/foundation/useRecipes.test.ts` lines 57–63
**Apply to:** `tests/settings/useAppSettings.test.ts`, `tests/settings/SettingsPage.test.tsx`
```typescript
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}
```

### Tauri IPC Mock
**Source:** `tests/foundation/useRecipes.test.ts` lines 14–22
**Apply to:** `tests/settings/useAppSettings.test.ts`
```typescript
// Mock the query module to avoid tauri-plugin-sql IPC bridge (not available in jsdom)
vi.mock("@/db/queries/appSettings", () => ({
  getAppSettings: vi.fn().mockResolvedValue({}),
  upsertAppSetting: vi.fn().mockResolvedValue(undefined),
}));
```

### Migration File Content Test
**Source:** `tests/data-layer/migration038.test.ts` lines 1–5
**Apply to:** `tests/settings/migration044.test.ts`
```typescript
// @vitest-environment node
// Uses better-sqlite3 directly — no Tauri IPC needed
import { describe, it, expect } from "vitest";
```

---

## No Analog Found

All files have close analogs. No file requires novel patterns.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | — |

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/hooks/`, `src/app/`, `src/features/rules-hub/`, `src-tauri/migrations/`, `src-tauri/src/`, `tests/data-layer/`, `tests/foundation/`
**Files scanned:** 11 source files + 2 test files read in full
**Pattern extraction date:** 2026-06-10
