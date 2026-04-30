# Pitfalls Research

**Domain:** Tauri + React + SQLite local-first desktop app (Warhammer hobby tracker)
**Researched:** 2026-04-30
**Confidence:** HIGH (Tauri/SQLite pitfalls verified via official docs + GitHub issues), MEDIUM (GW legal, shadcn theming), LOW flagged where relevant

---

## Critical Pitfalls

### Pitfall 1: Prisma Cannot Run in Tauri Production Builds

**Severity:** PROJECT KILLER

**What goes wrong:**
Prisma's query engine ships as a WASM binary (`query_engine_bg.wasm`) that Vite cannot load in a Tauri production build. The app works during `tauri dev` because Vite's dev server handles asset loading differently, but the built binary fails silently or with a WASM module load error. Prisma Client Rust was archived in March 2025, closing the alternative Rust-side path.

**Why it happens:**
Tauri production builds embed all frontend assets into the binary. WASM imports using dynamic `URL()` or `new Worker()` patterns — which Prisma relies on — are not resolved correctly by Tauri's embedded asset server. This is a known, unresolved structural incompatibility, not a configuration problem.

**How to avoid:**
Do not attempt Prisma. Go directly to the fallback path: use `tauri-plugin-sql` (the official Tauri SQL plugin backed by SQLx/rusqlite on the Rust side), or `better-sqlite3` via a custom Tauri command. The recommended path for HobbyForge is `tauri-plugin-sql` with raw SQL queries in `src/db/queries/`. The ROADMAP.txt already documents this fallback — treat it as the default, not a fallback.

**Warning signs:**
- App database calls work during `tauri dev` but fail or hang after `tauri build`
- Console shows WASM-related import errors in production
- Any tutorial that suggests Prisma + Tauri as straightforward should be treated as likely outdated

**Phase to address:** Phase 0 — Decide on `tauri-plugin-sql` before writing a single query. Never install Prisma.

---

### Pitfall 2: SQLite Foreign Keys Are Off by Default on Every Connection

**Severity:** PROJECT KILLER (data integrity failure, silent)

**What goes wrong:**
SQLite does not enforce `FOREIGN KEY` constraints unless you explicitly run `PRAGMA foreign_keys = ON` on every database connection. This is a per-connection setting — it does not persist in the database file. `tauri-plugin-sql` does not enable this automatically. The result: you can insert orphaned `unit` rows with invalid `faction_id`, delete factions while their units still exist, and the database silently allows it. The corruption accumulates invisibly until the UI breaks unexpectedly.

**Why it happens:**
SQLite's default is off for backwards compatibility (per official SQLite docs). The plugin's migration runner executes DDL with `REFERENCES` clauses happily accepted but never enforced. Developers assume FK constraints are a schema-level declaration; in SQLite they are a runtime switch.

**How to avoid:**
In your Tauri Rust setup code (where you initialize the database plugin), run `PRAGMA foreign_keys = ON` immediately after every connection is established. If using `tauri-plugin-sql`, add a migration step 0 that sets this, or configure it via the plugin's initialization. Verify FK enforcement is active with a deliberate test: try inserting a row with an invalid FK — it should fail.

**Warning signs:**
- Delete a faction and units still appear in queries
- Orphaned recipe-paint join table rows after paint deletion
- Dashboard counts are higher than collection counts

**Phase to address:** Phase 1 (database schema) — add FK pragma to the connection initialization before any CRUD is built.

---

### Pitfall 3: App Data Path Differs Between Dev and Production, Breaking the Database Location

**Severity:** PROJECT KILLER

**What goes wrong:**
During `tauri dev`, the SQLite database may be created in the project's working directory or a temp location. In a production build, `tauri-plugin-sql` resolves the database path relative to the OS app data directory (`%APPDATA%\HobbyForge\` on Windows). If your code hardcodes a relative path or assumes the dev path, the production app either creates a second empty database or crashes. The user's data disappears on their first upgrade install.

**Why it happens:**
Tauri's `app_data_dir()` (which resolves to `C:\Users\<user>\AppData\Roaming\com.hobbyforge.app\` or similar) is not automatically created. The directory must be explicitly created before the plugin tries to write the database file. The dev server path and the production path are different, and the discrepancy is not obvious until you build.

**How to avoid:**
- Always reference the database by name only (e.g., `sqlite:hobbyforge.db`), not by absolute path — `tauri-plugin-sql` will resolve it against `app_data_dir()` automatically in production.
- In Rust `setup()`, call `app.path().app_data_dir()` and `std::fs::create_dir_all()` on it before initializing the SQL plugin.
- Add a startup check that logs where the database file was created, so you can verify in both dev and prod.

**Warning signs:**
- "Database not found" errors only in production builds
- Data entered during `tauri dev` vanishes after building
- Two `.db` files in different locations on disk

**Phase to address:** Phase 0 — path resolution must be correct before Phase 1 creates the schema.

---

### Pitfall 4: Games Workshop IP in Seed Data or UI Labels

**Severity:** PROJECT KILLER (legal)

**What goes wrong:**
The seed data as specified in ROADMAP.txt section 13 includes unit names ("Tau Fire Warriors", "Crisis Battlesuits", "Necron Warriors", "Ultramarines Intercessors") and faction names ("Tau Empire", "Ultramarines", "Necrons", "Tyranids"). These are registered trademarks and copyrighted proper nouns owned by Games Workshop. Shipping these names in app code or a pre-populated database means the application binary distributes GW IP, even as a "personal tool."

GW's IP enforcement policy explicitly states individuals must not create computer games or apps based on GW characters and settings. GW has issued cease-and-desist letters for substantially less. The key legal exposure is: if the app ever leaves your machine (shared with a friend, put on GitHub, distributed), the embedded seed data becomes a distribution of copyrighted content.

**Why it happens:**
The distinction between "for personal use" and "distribution" is blurry once the app is packaged and shared. The seed data feels like test data, but in a packaged binary it is shipped content. Developers underestimate GW's enforcement aggressiveness.

**How to avoid:**
- Ship the app with **no seed data** at all. First launch shows empty state with "Add your first faction" prompts.
- Provide an in-app onboarding flow that lets the user type in their own faction names, unit names, and paint names.
- Optionally, provide a seed data script as a developer-only tool (`npm run seed`) that never ships in the packaged build, gated by a `cfg!(debug_assertions)` check on the Rust side.
- Never include GW unit stats, points values, rules text, or artwork in any form — even as placeholders.
- Paint names (e.g., "Nuln Oil", "Macragge Blue") are also GW trademarks. Seed the paints table with user-entered data only, or use generic color descriptions.

**Warning signs:**
- Seed data file contains any recognizable GW proper nouns
- App screenshots posted online show GW unit/faction names
- App is shared with anyone outside the developer's own machines

**Phase to address:** Phase 1 — never write GW IP into seed data. The `db/seed.ts` must only create schema fixtures with clearly fictional placeholder names (e.g., "My First Faction", "Test Unit Alpha").

---

### Pitfall 5: Schema Migrations With No Version Tracking Cause Data Loss on Schema Changes

**Severity:** HIGH

**What goes wrong:**
`tauri-plugin-sql` has a migration runner, but if migrations are added incorrectly (wrong version numbers, re-running migrations on existing databases, or dropping and recreating tables without data preservation), real user data is destroyed. The migration system uses sequential version numbers; a gap or repeat causes undefined behavior. Running `DROP TABLE` and `CREATE TABLE` in a migration deletes all existing rows.

**Why it happens:**
Developers treat migrations like schema initialization scripts and rewrite them as the schema evolves during early development. In a local desktop app there's only one "production" database — the user's own. There is no separate staging environment. A botched migration on the user's machine destroys their hobby data with no recovery path.

**How to avoid:**
- Write migrations as append-only, sequential, numbered SQL files from Day 1 of Phase 1. Never edit an existing migration.
- To add a column: write a new `ALTER TABLE ... ADD COLUMN` migration. Never drop and recreate.
- To rename a column in SQLite (which doesn't support `RENAME COLUMN` before SQLite 3.25): create new column, copy data, drop old column — in a migration, never manually.
- Keep a `user_version` pragma (`PRAGMA user_version`) as a sanity check separate from the plugin's internal versioning.
- During development (before any real data), it is acceptable to delete the database file and start fresh. Document this in the dev setup guide.

**Warning signs:**
- Migration version numbers are being edited rather than new ones added
- `DROP TABLE` appears in any migration after the first schema setup
- App hangs or crashes silently on startup after a schema change

**Phase to address:** Phase 1 — establish migration discipline before any real data exists.

---

## High-Severity Pitfalls

### Pitfall 6: Dark Mode Flash on Cold Load (FOUC)

**Severity:** HIGH (first impression quality)

**What goes wrong:**
Tauri renders the WebView2 HTML page before React hydrates. If the dark mode class (`dark` on `<html>`) is applied by React or a theme provider on mount, there is a visible white flash at every cold start. This is particularly bad for a "dark-mode-first personal command center."

**Why it happens:**
Tailwind's dark mode works by adding a `dark` class to the root element. React applies this after hydration. The gap between HTML render and JS execution causes the browser to briefly show the default (light) styles.

**How to avoid:**
- Add an inline `<script>` tag in the Tauri `index.html` `<head>` — before any stylesheet link — that immediately sets `document.documentElement.classList.add('dark')`. Since HobbyForge is dark-mode-first with no light toggle in v1, this can be a static script, not a localStorage check.
- Example: `<script>document.documentElement.classList.add('dark')</script>` in `index.html` before `<link rel="stylesheet">`.
- shadcn/ui uses CSS custom properties (`--background`, `--foreground`, etc.) that are scoped to `:root` and `.dark`. The inline script ensures the correct CSS variables are active before paint.

**Warning signs:**
- White flash visible for ~100ms at every app launch
- Tailwind classes using `dark:` variants not applying on first render

**Phase to address:** Phase 0 — fix this in the initial app shell before any real UI is built.

---

### Pitfall 7: IPC Round-trip State Becoming Stale After Mutations

**Severity:** HIGH

**What goes wrong:**
Every database read in a Tauri React app is an async IPC call (`invoke('get_units', ...)`). If a mutation (create/update/delete) completes but the calling component does not re-fetch the list, the displayed data is stale. With a CRUD-heavy app like HobbyForge (units, paints, recipes, army lists all interconnected), a unit status update in one component silently leaves the Kanban board, collection table, and dashboard card showing old data simultaneously.

**Why it happens:**
Developers treat IPC calls like synchronous functions. React state updated via `invoke` is local to the component that called it. Sibling and parent components have no awareness of the change. Without a cache-invalidation layer, stale data accumulates across the session.

**How to avoid:**
- Use TanStack Query (React Query) as the IPC cache layer from Phase 1 onward. Each `invoke` call becomes a query with a key. Mutations call `queryClient.invalidateQueries()` for affected keys on success. This provides automatic refetch and cross-component consistency with minimal ceremony.
- Define stable query key namespaces early: `['units']`, `['units', factionId]`, `['paints']`, `['recipes']`, `['dashboard-stats']`.
- Invalidate broadly after mutations that touch shared state (e.g., changing a unit's `faction_id` should invalidate both `['units']` and `['factions', factionId, 'units']`).

**Warning signs:**
- After adding a unit, the collection table doesn't show it without a page refresh
- Dashboard stats don't update after painting status changes
- Kanban board shows a card in a column after it's been moved

**Phase to address:** Phase 1 — set up TanStack Query before building any UI that reads from the database.

---

### Pitfall 8: Windows SmartScreen Warning Blocks App Launch After Distribution

**Severity:** HIGH (for distribution scenarios)

**What goes wrong:**
An unsigned Tauri `.exe` installer downloaded from the internet triggers a Windows SmartScreen "Windows protected your PC" warning that requires clicking "More info" → "Run anyway." For a personal tool that stays on one machine, this is a non-issue. But if the app is shared with even one other person (a fellow hobbyist, a friend), the SmartScreen warning makes the app look malicious and creates a support burden.

**Why it happens:**
Windows SmartScreen bases reputation on code-signing certificates and download frequency. An unsigned executable from a new publisher has no reputation. EV certificates no longer grant immediate reputation bypass as of 2024 Microsoft policy changes. NSIS plugin DLLs inside the installer may be flagged by antivirus separately from the main signing.

**How to avoid:**
For a personal-use app: accept this limitation and document it. The self-install path (running the built `.exe` from the local filesystem without downloading it) does not trigger SmartScreen. For Phase 0 and development: use `tauri dev` exclusively. For distribution: document the "More info → Run anyway" steps in a `INSTALL.md`. Do not spend time or money on code signing for a single-user personal app.

**Warning signs:**
- Attempting to share the installer with others
- Building a distribution pipeline before the app's core features are stable

**Phase to address:** Phase 9 — only relevant if distributing. Accept as known limitation for personal use.

---

## Moderate Pitfalls

### Pitfall 9: Unit Category Enum Locked to 10th Edition, Breaks on Edition Changes

**Severity:** MEDIUM

**What goes wrong:**
The ROADMAP lists unit categories (HQ, Battleline, Infantry, Elite, etc.) as a fixed enum stored in the database schema. When GW changes category names between editions (as they did going from 9th to 10th — "HQ" became "Characters"/"Leaders", "Troops" became "Battleline"), all existing unit records have stale category values that no longer match the current game system.

**Why it happens:**
Hobby app developers model the game's taxonomy as a fixed enumeration, treating it as stable. GW has changed unit categories with each edition change.

**How to avoid:**
- Store `category` as a free-text `VARCHAR` column, not a SQL `ENUM` or a TypeScript string union that's validated against a hardcoded list.
- Provide a pre-populated list of common categories as the default options in the UI (using a `<datalist>` or combobox component), but allow the user to type any value.
- This is mentioned in ROADMAP.txt section 3.2: "allow user-defined categories" — implement this from Phase 1.

**Warning signs:**
- `category` column is defined with `CHECK (category IN (...))` constraint
- TypeScript type is `type UnitCategory = 'HQ' | 'Battleline' | ...` used for DB validation

**Phase to address:** Phase 1 — schema design decision before any units are created.

---

### Pitfall 10: Painting Status as Ordered Enum Creates UI Complexity

**Severity:** MEDIUM

**What goes wrong:**
The ROADMAP defines 11 painting status values in a linear sequence (Not started → Built → Primed → ... → Completed). Storing this as a plain string enum with no inherent order means filtering "painted or better" requires an `IN (...)` clause with 5+ values. The Kanban board needs to know the display order. Adding a new status (e.g., "Varnished" between "Based" and "Completed") requires a migration and UI changes.

**Why it happens:**
Developers store enum labels and assume alphabetical or insertion order. The sequence has semantic meaning (it's a workflow progression) that plain strings don't capture.

**How to avoid:**
- Add an `order_index` integer to a `painting_statuses` lookup table, or store status as an integer code (0-10) with a TypeScript mapping to display labels. The integer approach makes range queries (`status >= 7` for "Based or better") trivial.
- Alternatively, maintain a `PAINTING_STATUS_ORDER` constant in TypeScript that defines the canonical sequence, and use it for all sorting and filtering logic.

**Warning signs:**
- Filtering "painted units" requires listing multiple status values in a WHERE clause
- Kanban columns appear in wrong order

**Phase to address:** Phase 1 (schema) and Phase 3 (Kanban UI).

---

### Pitfall 11: Units-vs-Models Granularity Decision Pressure

**Severity:** MEDIUM

**What goes wrong:**
The ROADMAP defers model-level tracking (individual models within a unit) to a later phase, but the schema includes a `ModelInstance` table concept. If Phase 1 creates the schema without `model_instances`, then Phase N tries to add per-model tracking, the data migration from unit-level `painting_percentage` to per-model status is complex. Worse, if the UI in Phases 2-3 is built around unit-level display, adding model-level views later requires significant UI rework.

**Why it happens:**
The granularity question (do I track 10 Space Marines as one unit or 10 individuals?) is genuinely hard to answer before real usage. Developers defer the decision and then find it has leaked into every data access layer.

**How to avoid:**
- In Phase 1, make the unit-vs-model decision explicit: HobbyForge v1 tracks units, not individual models. Do NOT create the `model_instances` table in Phase 1, even as a skeleton. Empty tables create migration complexity later.
- The `model_count` and `painting_percentage` fields on the `units` table are sufficient for v1.
- Document the decision in a comment in `schema.ts`: "Model-level tracking is deferred to a future phase."

**Warning signs:**
- `model_instances` table created in Phase 1 but unused
- UI components have conditionally rendered per-model sections that are always empty

**Phase to address:** Phase 1 — explicitly exclude `model_instances` from the schema.

---

### Pitfall 12: shadcn/ui Component Version Drift from Radix Primitives

**Severity:** MEDIUM

**What goes wrong:**
shadcn/ui components are copied into your repo (not imported from a package). They are built on top of Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-select`, etc.). When you run `npx shadcn@latest add dialog` at a different time than you added other components, the generated code may target a different Radix version than what's in your `node_modules`. Accessibility behavior, keyboard navigation, and focus management can regress silently.

**Why it happens:**
The copy-and-own model means each component is a snapshot in time. Running `shadcn add` months later after an update to the CLI generates new code targeting new Radix APIs. The old components continue to work until they don't (e.g., an upstream Radix breaking change).

**How to avoid:**
- Add all the shadcn/ui components you expect to need in Phase 0, not spread across phases.
- Pin Radix packages in `package.json` (exact versions, not `^`).
- After adding any new shadcn component, immediately run the app and test keyboard navigation and dark mode rendering.
- Keep a `COMPONENTS.md` that tracks which version of the shadcn CLI was used to generate each component.

**Warning signs:**
- Dialog open/close animation works in some components but not others
- `@radix-ui/react-dialog` and `@radix-ui/react-select` are different minor versions
- Console warnings about deprecated Radix props

**Phase to address:** Phase 0 — install all expected components upfront.

---

### Pitfall 13: React Form State Not Reset Between Edit Sessions

**Severity:** MEDIUM

**What goes wrong:**
In a CRUD-heavy app, the same form component is used for both "create" and "edit" modes. If the form's `defaultValues` are set from the initial render (not re-initialized when the selected unit changes), opening the edit drawer for Unit A, closing it, and opening it for Unit B shows Unit A's data in the form.

**Why it happens:**
React Hook Form (or any controlled form) sets `defaultValues` once on mount. If the component does not unmount between edit sessions (e.g., a drawer that slides in/out), the form retains stale state.

**How to avoid:**
- Use React Hook Form's `reset(newValues)` in a `useEffect` keyed on the entity ID being edited.
- Or force a component remount by using `key={unit.id}` on the form component — when the key changes, React fully unmounts and remounts, guaranteeing fresh form state.
- The `key` approach is simpler and more reliable than manual `reset()` calls.

**Warning signs:**
- Opening edit drawer for a different unit shows previous unit's values
- Form validation errors from a previous edit persist when opening a new entity

**Phase to address:** Phase 2 (collection CRUD) and Phase 3 (recipe/paint forms).

---

## Minor Pitfalls

### Pitfall 14: Kanban Drag-and-Drop is Not Free in React

**Severity:** LOW-MEDIUM

**What goes wrong:**
The Painting Projects Kanban board visually implies drag-and-drop to move cards between columns. Implementing this correctly (with touch support, keyboard accessibility, and smooth animation) is a significant effort. Popular libraries (`@dnd-kit/core`, `react-beautiful-dnd`) have non-trivial setup and can conflict with shadcn/ui's Radix components during drag (focus trapping, pointer events).

**How to avoid:**
For Phase 3, implement status change via a simple dropdown or button on each card ("Move to: [status]") rather than drag-and-drop. Label the Kanban columns as view/filter groups, not interactive drop targets. Drag-and-drop can be added in a later polish phase after the core workflow is proven.

**Phase to address:** Phase 3 — explicitly defer drag-and-drop.

---

### Pitfall 15: Large Paint Collections Without List Virtualization

**Severity:** LOW (annoyance at scale)

**What goes wrong:**
A serious hobbyist may own 300+ paints across multiple brands. Rendering all rows in a table without virtualization causes visible jank in a WebView2 context, which is a less efficient renderer than a browser tab.

**How to avoid:**
For Phase 4, implement pagination (50 paints per page) rather than infinite scroll or full-list virtualization. This is simpler and sufficient. If the user later requests "show all," TanStack Virtual (`@tanstack/react-virtual`) can be added to the paint inventory table.

**Phase to address:** Phase 4 — use pagination as the default.

---

### Pitfall 16: `better-sqlite3` vs `tauri-plugin-sql` API Surface Mismatch

**Severity:** LOW-MEDIUM

**What goes wrong:**
Some Tauri + SQLite tutorials use `better-sqlite3` (a Node.js native addon accessed via a custom Tauri sidecar). Others use `tauri-plugin-sql` (the official plugin backed by Rust SQLx). The APIs are completely different. Mixing tutorials from both approaches produces code that cannot be reconciled without a rewrite.

**How to avoid:**
Pick `tauri-plugin-sql` as the canonical approach for HobbyForge and ignore all tutorials that reference `better-sqlite3` or sidecar approaches. The official plugin is the supported, maintained path for Tauri 2.x.

**Phase to address:** Phase 0 — decision made before any code is written.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Raw SQL strings scattered in components | Fast to write | Impossible to audit or refactor safely | Never — use `src/db/queries/` exclusively |
| GW faction/unit names in seed data | Realistic test data | Legal exposure if distributed | Never — use placeholder names |
| Hardcoded painting status strings in UI | Simple to start | Filter/sort logic breaks; edition changes break display | Only if a `PAINTING_STATUS_ORDER` constant is also defined |
| Skip FK pragma setup | One less thing in setup | Silent data corruption from orphaned rows | Never |
| Prisma "just to try it" | Familiar ORM DX | Build failure, wasted time, likely rewrite | Never — skip directly to tauri-plugin-sql |
| Model-instances table as skeleton | "Future-ready" schema | Empty tables with zero usage, migration debt | Never in Phase 1 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `tauri-plugin-sql` init | Referencing database before app_data_dir exists | Call `create_dir_all(app.path().app_data_dir())` in Rust `setup()` before plugin init |
| `tauri-plugin-sql` FK | Assuming REFERENCES constraints are enforced | Explicitly run `PRAGMA foreign_keys = ON` on every connection |
| TanStack Query + IPC | Calling `invoke` directly in components | Wrap every `invoke` in a `useQuery` or `useMutation` hook; never call `invoke` in a render function |
| shadcn/ui dark mode | Applying `dark` class in a React `useEffect` | Apply `dark` class in a blocking inline `<script>` in `index.html` `<head>` |
| Migration runner | Adding migrations by editing existing files | Always append new numbered migrations; existing migrations are immutable |
| Seed data | Including GW IP in `seed.ts` | Use fictional placeholder names; gate seed behind `cfg!(debug_assertions)` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No query key invalidation after mutations | Stale collection/dashboard data after edits | TanStack Query with `invalidateQueries` on every mutation | Immediately, during Phase 2 testing |
| Full table re-render without memoization | Unit table jank when filtering 200+ units | `React.memo` on table rows; avoid re-creating filter functions inline | ~100+ units in collection |
| Unvirtualized paint inventory | Scroll lag with 300+ paints | Pagination or `@tanstack/react-virtual` | ~150+ paints rendered at once |
| Dashboard stats recomputed on every render | Dashboard flickers on navigation | Cache stats query with TanStack Query, low `staleTime` | Immediately visible as IPC latency |

---

## "Looks Done But Isn't" Checklist

- [ ] **FK enforcement:** Unit rows with invalid `faction_id` are rejected — verify FK pragma is ON
- [ ] **Dark mode cold start:** No white flash visible on app launch — verify inline script in `<head>`
- [ ] **Migration idempotency:** App can be closed mid-migration and restarted without schema corruption
- [ ] **Seed data clean:** No GW proper nouns in `seed.ts` or any file that ships in the packaged build
- [ ] **Form reset:** Opening edit for Unit A, then Unit B shows Unit B's data — verify `key={entity.id}`
- [ ] **Production path:** Database file is created in `%APPDATA%\HobbyForge\` not in project directory — verify with a production build
- [ ] **Status order:** Kanban columns appear in workflow order (Not Started → Completed), not alphabetical order
- [ ] **Category flexibility:** Unit category accepts free-text input, not just fixed dropdown options

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Prisma attempted before fallback | HIGH | Uninstall Prisma, remove all Prisma config files, rewrite all queries using `tauri-plugin-sql` invoke pattern |
| GW IP found in seed data | MEDIUM | Delete seed data, rebuild with placeholder names, verify no GW nouns in any `.ts` file in `src/db/` |
| No FK pragma — data corruption found | HIGH | Write a migration that finds and deletes orphaned rows; add FK pragma; audit all join tables |
| Dark mode FOUC shipped | LOW | Add inline script to `index.html` and rebuild — 5-minute fix |
| Stale query data | LOW | Add TanStack Query + `invalidateQueries` calls — retrofittable but requires touching every mutation |
| Schema migration edited (not appended) | HIGH | Delete database, re-run all migrations from scratch; user loses all data — no recovery if in production |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Prisma incompatibility | Phase 0 | `tauri-plugin-sql` listed in `Cargo.toml`; no Prisma in `package.json` |
| FK pragma missing | Phase 1 | Test: delete a faction that has units — confirm cascade/rejection behavior |
| Dev/prod path mismatch | Phase 0 | Build production binary and check database file location on disk |
| GW IP in seed data | Phase 1 | `grep -r "Tau\|Ultramarines\|Necron\|Tyranid" src/db/seed.ts` returns nothing |
| Migration mutation | Phase 1 | Migration files are append-only; establish convention before data exists |
| Dark mode FOUC | Phase 0 | Launch the built binary in dark mode and observe cold start |
| Stale IPC state | Phase 1 | TanStack Query installed before first query is written |
| SmartScreen warning | Phase 9 | Document; accepted for personal use |
| Unit category enum lock | Phase 1 | Schema uses `VARCHAR`, not `CHECK (category IN ...)` |
| Form state stale | Phase 2 | Unit edit form uses `key={unit.id}` |
| shadcn version drift | Phase 0 | All expected components added in one session; Radix versions pinned |
| Kanban drag-and-drop scope | Phase 3 | Status change via button/dropdown, not drag — documented decision |

---

## Sources

- Tauri SQL plugin official docs: https://v2.tauri.app/plugin/sql/
- Tauri app data directory issues: https://github.com/orgs/tauri-apps/discussions/11279
- Prisma + Vite WASM incompatibility: https://github.com/prisma/prisma/issues/28105
- Prisma + Tauri build failures: https://github.com/prisma/prisma/discussions/20103
- Prisma Client Rust archived March 2025: https://github.com/Brendonovich/prisma-client-rust/discussions/274
- SQLite foreign keys disabled by default: https://sqlite.org/foreignkeys.html
- SQLite FK per-connection requirement confirmed: https://nicolaiarocci.com/sqlite-foreign-key-constraints-are-disabled-by-default/
- Tauri Windows SmartScreen + code signing: https://v2.tauri.app/distribute/sign/windows/
- NSIS unsigned plugins AV flagging: https://github.com/tauri-apps/tauri/issues/11673
- Games Workshop IP enforcement policy: https://www.warhammer.com/en-GB/legal
- GW cease-and-desist for fan apps: https://polycount.com/discussion/227437/games-workshop-new-ip-guidelines-no-fan-films-games-animations-and-more-is-not-allowed-anymore
- TanStack Query optimistic update pitfalls: https://tanstack.com/query/v4/docs/react/guides/optimistic-updates
- SQLite WAL mode pitfalls: https://sqlite.org/wal.html
- shadcn/ui dark mode: https://ui.shadcn.com/docs/dark-mode
- Preventing dark mode FOUC: https://victordibia.com/blog/gatsby-fouc/
- Tauri IPC state management discussion: https://github.com/orgs/tauri-apps/discussions/4940

---
*Pitfalls research for: HobbyForge (Tauri + React + SQLite Warhammer hobby tracker)*
*Researched: 2026-04-30*
