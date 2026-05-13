# Phase 71: Stable Session Section FK - Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src-tauri/migrations/023_session_section_fk.sql` | migration | batch | `src-tauri/migrations/014_session_recipe_link.sql` | exact |
| `src-tauri/src/lib.rs` | config | batch | itself (existing version 22 entry) | exact |
| `src/types/paintingSession.ts` | model | CRUD | itself (existing `recipe_step_id` additions) | exact |
| `src/db/queries/paintingSessions.ts` | utility | CRUD | itself (existing `createSession` with 7 columns) | exact |
| `src/features/dashboard/logSessionSchema.ts` | utility | request-response | itself (existing `recipe_step_id` Zod field) | exact |
| `src/features/dashboard/LogSessionSheet.tsx` | component | request-response | itself (existing `onSubmit` payload assembly) | exact |
| `tests/hobby-journal/paintingSessionQueries.test.ts` | test | CRUD | itself (existing JOUR-01 / INTEG-01 tests) | exact |
| `tests/dashboard/logSessionSchema.test.ts` | test | request-response | itself (existing SESS-05 describe block) | exact |

---

## Pattern Assignments

### `src-tauri/migrations/023_session_section_fk.sql` (migration, batch)

**Analog:** `src-tauri/migrations/014_session_recipe_link.sql`

**Core migration pattern** (lines 1-6 of analog):
```sql
-- 014_session_recipe_link.sql — Phase 41: Link painting sessions to recipes/steps
-- Additive only — two nullable FK columns added via ALTER TABLE.
-- ON DELETE SET NULL: session survives deletion of recipe or step; link is cleared.
ALTER TABLE painting_sessions ADD COLUMN recipe_id INTEGER REFERENCES painting_recipes(id) ON DELETE SET NULL;
ALTER TABLE painting_sessions ADD COLUMN recipe_step_id INTEGER REFERENCES recipe_steps(id) ON DELETE SET NULL;
```

**New file follows this pattern exactly — one column, same FK action:**
```sql
-- 023_session_section_fk.sql — Phase 71: Stable section FK on painting_sessions
-- Additive only — one nullable FK column via ALTER TABLE.
-- ON DELETE SET NULL: session survives deletion of section; FK is cleared.
ALTER TABLE painting_sessions
  ADD COLUMN recipe_section_id INTEGER
  REFERENCES recipe_sections(id) ON DELETE SET NULL;
```

---

### `src-tauri/src/lib.rs` (config, batch)

**Analog:** `src-tauri/src/lib.rs` lines 133-138 (the version 22 / paintless_steps entry, the current last entry)

**Migration registration pattern** (lines 133-138):
```rust
Migration {
    version: 22,
    description: "paintless_steps",
    sql: include_str!("../migrations/022_paintless_steps.sql"),
    kind: MigrationKind::Up,
},
```

**New entry to append immediately after line 138, before the closing `]`:**
```rust
Migration {
    version: 23,
    description: "session_section_fk",
    sql: include_str!("../migrations/023_session_section_fk.sql"),
    kind: MigrationKind::Up,
},
```

---

### `src/types/paintingSession.ts` (model, CRUD)

**Analog:** itself — the Phase 41 additions at lines 18-22 and the Phase 57 addition at line 22-23

**Existing additions pattern** (lines 18-23):
```typescript
  // Phase 41 — session-recipe linking (INTEG-01/02)
  recipe_id: number | null;
  recipe_step_id: number | null;
  // Phase 57 — workflow section association (WF-04)
  section_name: string | null;
```

**Existing CreateSessionInput pattern** (lines 33-38):
```typescript
  // Phase 41 — session-recipe linking (INTEG-01/02)
  recipe_id?: number | null;
  recipe_step_id?: number | null;
  // Phase 57 — workflow section association
  section_name?: string | null;
```

**New additions follow the same comment + field pattern:**
```typescript
// Add to PaintingSession interface (after section_name line 23):
  // Phase 71 — stable section FK (REC-04)
  recipe_section_id: number | null;

// Add to CreateSessionInput interface (after section_name line 38):
  // Phase 71 — stable section FK (REC-04)
  recipe_section_id?: number | null;
```

---

### `src/db/queries/paintingSessions.ts` (utility, CRUD)

**Analog:** itself — the existing `createSession` function at lines 19-33

**Current 7-column INSERT pattern** (lines 21-33):
```typescript
export async function createSession(input: CreateSessionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO painting_sessions (unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id, section_name) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      input.unit_id,
      input.session_date,
      input.duration_minutes,
      input.notes ?? null,
      input.recipe_id ?? null,
      input.recipe_step_id ?? null,
      input.section_name ?? null,
    ]
  );
}
```

**Update to 8-column INSERT — append `recipe_section_id` as column 8 / `$8`:**
```typescript
export async function createSession(input: CreateSessionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO painting_sessions (unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id, section_name, recipe_section_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      input.unit_id,
      input.session_date,
      input.duration_minutes,
      input.notes ?? null,
      input.recipe_id ?? null,
      input.recipe_step_id ?? null,
      input.section_name ?? null,
      input.recipe_section_id ?? null,
    ]
  );
}
```

No changes to `getSessionsByUnit`, `getSessionsByRecipe`, or `deleteSession` — `SELECT *` automatically includes the new column.

---

### `src/features/dashboard/logSessionSchema.ts` (utility, request-response)

**Analog:** itself — the existing `recipe_step_id` and `section_name` fields at lines 34-37

**Existing nullable optional integer pattern** (lines 34-37):
```typescript
  // Phase 41 — INTEG-01 (recipe+step selector in LogSessionSheet)
  recipe_id: z.number().int().positive().nullable().optional(),
  recipe_step_id: z.number().int().positive().nullable().optional(),
  // Phase 59 — SESS-01/05 (section cascade)
  section_name: z.string().nullable().optional(),
```

**New field appends after `section_name` using the same nullable/optional integer convention:**
```typescript
  // Phase 71 — REC-04 (stable section FK)
  recipe_section_id: z.number().int().positive().nullable().optional(),
```

`LogSessionFormValues` is inferred from the schema via `z.infer<typeof logSessionSchema>` so the type is automatically updated — no separate type edit needed.

---

### `src/features/dashboard/LogSessionSheet.tsx` (component, request-response)

**Analog:** itself — `watchedSectionId` state at line 144, section Select `onValueChange` at lines 381-388, `onSubmit` at lines 172-182

**`watchedSectionId` state** (line 144):
```typescript
const [watchedSectionId, setWatchedSectionId] = useState<number | null>(null);
```

**Section Select onValueChange — already captures the ID** (lines 381-388):
```typescript
onValueChange={(v) => {
  const numId = v === "__none__" ? null : Number(v);
  setWatchedSectionId(numId);
  ctrl.onChange(
    v === "__none__"
      ? null
      : sections.find((s) => s.id === numId)?.name ?? null
  );
}}
```

**Current `onSubmit` createSession.mutateAsync call** (lines 174-182) — missing `recipe_section_id`:
```typescript
await createSession.mutateAsync({
  unit_id: values.unit_id,
  session_date: values.session_date,
  duration_minutes: values.duration_minutes,
  notes: values.notes && values.notes.trim() !== "" ? values.notes.trim() : null,
  recipe_id: values.recipe_id ?? null,
  recipe_step_id: values.recipe_step_id ?? null,
  section_name: values.section_name ?? null,
});
```

**Add `recipe_section_id` as the 8th property — `watchedSectionId` is already in scope:**
```typescript
await createSession.mutateAsync({
  unit_id: values.unit_id,
  session_date: values.session_date,
  duration_minutes: values.duration_minutes,
  notes: values.notes && values.notes.trim() !== "" ? values.notes.trim() : null,
  recipe_id: values.recipe_id ?? null,
  recipe_step_id: values.recipe_step_id ?? null,
  section_name: values.section_name ?? null,
  recipe_section_id: watchedSectionId ?? null,   // Phase 71 — REC-04
});
```

No other changes to the component. `buildDefaultValues` does not need `recipe_section_id` because the field is read from `watchedSectionId` state, not the form. The reset at line 124 (`setWatchedSectionId(null)`) already clears it on sheet open.

---

### `tests/hobby-journal/paintingSessionQueries.test.ts` (test, CRUD)

**Analog:** itself — tests JOUR-01 and INTEG-01 at lines 28-79

**Three tests assert the 7-column INSERT signature and must be updated to 8 columns:**

Test at line 28 — update column list in regex, VALUES to $8, params array:
```typescript
// Before:
expect(sql).toMatch(/INSERT INTO painting_sessions \(unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id, section_name\)/);
expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7\)/);
expect(params).toEqual([7, "2026-05-03", 45, "Layered shoulder pads", null, null, null]);

// After:
expect(sql).toMatch(/INSERT INTO painting_sessions \(unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id, section_name, recipe_section_id\)/);
expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8\)/);
expect(params).toEqual([7, "2026-05-03", 45, "Layered shoulder pads", null, null, null, null]);
```

Test at line 45 — update length assertion and add param[7] check:
```typescript
// Before:
expect(params).toHaveLength(7);
expect(params[6]).toBeNull();  // section_name

// After:
expect(params).toHaveLength(8);
expect(params[6]).toBeNull();  // section_name
expect(params[7]).toBeNull();  // recipe_section_id
```

Test at line 62 — update VALUES regex, params array, and add section comment:
```typescript
// Before:
expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7\)/);
expect(params).toEqual([7, "2026-05-07", 60, null, 3, 15, "Armor"]);

// After:
expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8\)/);
expect(params).toEqual([7, "2026-05-07", 60, null, 3, 15, "Armor", null]);
```

A new test should be added after line 79 to exercise `recipe_section_id` when provided:
```typescript
it("REC-04: createSession includes recipe_section_id as 8th column when provided", async () => {
  executeMock.mockResolvedValueOnce(undefined);

  await createSession({
    unit_id: 7,
    session_date: "2026-05-07",
    duration_minutes: 60,
    notes: null,
    recipe_id: 3,
    recipe_step_id: 15,
    section_name: "Armor",
    recipe_section_id: 9,
  });

  const [sql, params] = executeMock.mock.calls[0];
  expect(sql).toMatch(/recipe_section_id/);
  expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8\)/);
  expect(params).toEqual([7, "2026-05-07", 60, null, 3, 15, "Armor", 9]);
});
```

---

### `tests/dashboard/logSessionSchema.test.ts` (test, request-response)

**Analog:** itself — the `SESS-05` describe block at lines 132-167 (the `section_name` field test block)

**Existing pattern for nullable optional integer field (INTEG-01 block, lines 64-130):**
```typescript
describe("logSessionSchema — INTEG-01 (recipe_id + recipe_step_id fields)", () => {
  it("parses successfully when recipe_id is omitted (field is optional)", ...);
  it("parses successfully when recipe_id is null (field is nullable)", ...);
  it("parses successfully when recipe_id is a positive integer", ...);
  it("fails when recipe_id is 0 (not positive)", ...);
  it("fails when recipe_id is a negative number", ...);
  ...
});
```

**New describe block follows SESS-05 at line 167, mirroring the INTEG-01 integer-field test structure:**
```typescript
describe("logSessionSchema — REC-04 (recipe_section_id field)", () => {
  it("parses successfully when recipe_section_id is omitted (field is optional)", () => {
    const result = logSessionSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
  });

  it("parses successfully when recipe_section_id is null (field is nullable)", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, recipe_section_id: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipe_section_id).toBeNull();
    }
  });

  it("parses successfully when recipe_section_id is a positive integer", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, recipe_section_id: 9 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipe_section_id).toBe(9);
    }
  });

  it("fails when recipe_section_id is 0 (not positive)", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, recipe_section_id: 0 });
    expect(result.success).toBe(false);
  });

  it("fails when recipe_section_id is a negative number", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, recipe_section_id: -1 });
    expect(result.success).toBe(false);
  });

  it("buildDefaultValues shape with recipe_section_id: null parses successfully", () => {
    const result = logSessionSchema.safeParse({
      unit_id: 1,
      session_date: "2026-01-01",
      duration_minutes: 30,
      notes: null,
      new_status: null,
      recipe_id: null,
      recipe_step_id: null,
      section_name: null,
      recipe_section_id: null,
    });
    expect(result.success).toBe(true);
  });
});
```

---

## Shared Patterns

### Nullable FK column on painting_sessions
**Source:** `src-tauri/migrations/014_session_recipe_link.sql` lines 1-5
**Apply to:** `023_session_section_fk.sql`
```sql
ALTER TABLE painting_sessions ADD COLUMN <col> INTEGER REFERENCES <table>(id) ON DELETE SET NULL;
```

### Nullable optional field on CreateSessionInput
**Source:** `src/types/paintingSession.ts` lines 35-38
**Apply to:** `src/types/paintingSession.ts` (new `recipe_section_id` field)
```typescript
recipe_section_id?: number | null;
```

### Nullable optional integer Zod field
**Source:** `src/features/dashboard/logSessionSchema.ts` lines 34-35
**Apply to:** `src/features/dashboard/logSessionSchema.ts` (new `recipe_section_id` field)
```typescript
recipe_section_id: z.number().int().positive().nullable().optional(),
```

### `?? null` coercion in INSERT params array
**Source:** `src/db/queries/paintingSessions.ts` lines 25-31
**Apply to:** `src/db/queries/paintingSessions.ts` (new 8th parameter)
```typescript
input.recipe_section_id ?? null,
```

### Migration registration in lib.rs
**Source:** `src-tauri/src/lib.rs` lines 133-138
**Apply to:** `src-tauri/src/lib.rs` (new version 23 entry)
```rust
Migration {
    version: 23,
    description: "session_section_fk",
    sql: include_str!("../migrations/023_session_section_fk.sql"),
    kind: MigrationKind::Up,
},
```

---

## No Analog Found

None — all files have exact or near-exact analogs within the codebase. This phase is purely additive and follows established patterns at every layer.

---

## Discretionary Decisions (for planner)

**`useWorkflowPositions.ts` — No changes in this phase.**
The hook uses `s.section_name` (text) for `computeWorkflowPosition`. That function takes a section name string, not a section ID. The new `recipe_section_id` FK is for future analytics JOIN queries (`COALESCE(rs.name, ps.section_name)`). Leave `useWorkflowPositions.ts` and `computeWorkflowPosition.ts` unchanged in this phase.

**`getSessionsBySection` — Defer.**
No current consumer queries sessions by `recipe_section_id`. Adding an unused query function would create maintenance surface without benefit. Defer to a future analytics phase.

---

## Metadata

**Analog search scope:** `src-tauri/migrations/`, `src-tauri/src/`, `src/types/`, `src/db/queries/`, `src/features/dashboard/`, `tests/hobby-journal/`, `tests/dashboard/`
**Files scanned:** 8 direct reads + 2 context files
**Pattern extraction date:** 2026-05-13
