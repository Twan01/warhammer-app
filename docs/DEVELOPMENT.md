<!-- generated-by: gsd-doc-writer -->
# Development Guide

This guide covers how to set up HobbyForge for local development, the available build commands, code style conventions, and the contribution workflow.

## Local Setup

### Prerequisites

- **Node.js >= 22** (used in CI; no `.nvmrc` pinned)
- **pnpm 10** (package manager)
- **Rust stable** (for the Tauri backend)
- **Tauri CLI v2** (installed as a dev dependency via `@tauri-apps/cli`)

### Clone and Install

```bash
git clone https://github.com/Twan01/warhammer-app.git
cd warhammer-app
pnpm install
```

### Environment Variables

There is no `.env.example` file in the repository. The project does not require environment variables for local development. The Vite dev server reads `TAURI_DEV_HOST` from the environment if present (used for remote device testing), but it is not required for normal development.

### First Dev Run

For **frontend-only development** (faster iteration, no Tauri window):

```bash
pnpm dev
```

This starts the Vite dev server at `http://localhost:1420`. Note that Tauri-specific features (SQLite database, file system access, clipboard) will not work in this mode.

For the **full desktop app** (Vite + Rust backend + Tauri window):

```bash
pnpm tauri dev
```

This compiles the Rust backend on first run (may take a few minutes), then opens the HobbyForge desktop window with full native capabilities.

## Build Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start the Vite dev server only (port 1420), no Tauri window |
| `pnpm tauri dev` | Full desktop app: Vite + Rust backend + Tauri window |
| `pnpm build` | TypeScript type-check (`tsc`) then Vite production build |
| `pnpm tauri build` | Full production bundle (runs `pnpm build` first via `beforeBuildCommand`) |
| `pnpm test` | Run the Vitest test suite (single pass) |
| `pnpm test:watch` | Run Vitest in watch mode for iterative development |
| `pnpm preview` | Preview the Vite production build locally |
| `pnpm check:version` | Verify version consistency between `package.json` and `tauri.conf.json` |

### Running a Single Test File

```bash
pnpm test -- tests/collection/SomeFile.test.ts
```

## Code Style

This project does **not** use ESLint, Prettier, Biome, or any other linter/formatter. Code quality is enforced through strict TypeScript compiler settings instead.

### TypeScript Strict Mode

The `tsconfig.json` enables the following strict checks:

- `"strict": true` -- enables all strict type-checking options
- `"noUnusedLocals": true` -- errors on unused local variables
- `"noUnusedParameters": true` -- errors on unused function parameters
- `"noFallthroughCasesInSwitch": true` -- errors on fallthrough cases in switch statements

The `pnpm build` command runs `tsc` before the Vite build, so TypeScript errors will fail the build.

### Path Aliases

The `@/` alias resolves to `src/` in both TypeScript (`tsconfig.json` paths) and Vite (`vite.config.ts` resolve alias):

```typescript
import { getFactions } from "@/db/queries/factions";
```

### Naming Conventions

- **Feature modules** live under `src/features/{feature-name}/` with a consistent file layout:
  - `entitySchema.ts` -- Zod schema + inferred form type
  - `EntitySheet.tsx` -- create/edit form in a Sheet
  - `EntityRow.tsx` / `EntityCard.tsx` -- table row or card component
  - `EntityPage.tsx` / `Page.tsx` -- page root with list + toolbar
  - `applyEntityFilters.ts` -- pure filter function
  - `entityFilters.ts` -- Zustand filter store (where needed)

- **React Query hooks** follow the pattern `use{Entity}.ts` in `src/hooks/`, exporting `ENTITY_KEY`, `useEntity()`, and mutation hooks.

- **Query modules** are one file per entity in `src/db/queries/`, containing CRUD functions with positional `$1, $2` parameter syntax.

- **Components** use named function exports with inline prop types:
  ```typescript
  export function FactionRow({ faction, onEdit }: { faction: Faction; onEdit: () => void }) { ... }
  ```

### Type Patterns

```typescript
// Entity / CreateInput / UpdateInput pattern
export interface Faction { id: number; name: string; created_at: string; }
export type CreateFactionInput = Omit<Faction, "id" | "created_at" | "updated_at">;
export type UpdateFactionInput = Partial<CreateFactionInput> & { id: number };

// Const arrays for union types
export const PAINTING_STATUS_ORDER = ["Not Started", "Built", "Primed"] as const;
export type PaintingStatus = typeof PAINTING_STATUS_ORDER[number];
```

## Database Development

### Migrations

SQL migrations are in `src-tauri/migrations/` and run automatically at app start in filename order. The project currently has 36 hobbyforge.db migrations and 4 rules.db migrations.

**Important rules:**
- Never edit an existing migration file -- always create a new one
- Hobbyforge migrations use numeric prefixes: `001_`, `002_`, etc.
- Rules DB migrations use the `rules_` prefix: `rules_001_`, `rules_002_`, etc.
- Foreign keys are OFF by default in SQLite; `src/db/client.ts` runs `PRAGMA foreign_keys = ON` after every connection
- Booleans are stored as `0 | 1` integers -- cast on read, pass `? ? 1 : 0` on write
- Parameterized queries use `$1, $2` positional syntax (Tauri plugin-sql requirement)

### Two Databases

The app loads two SQLite databases at startup (configured in `src-tauri/tauri.conf.json`):

- **`hobbyforge.db`** -- all app data (collections, recipes, army lists, battle logs, etc.)
- **`rules.db`** -- Wahapedia game rules data (synced via CSV import), uses WAL mode with 10s busy timeout

## Branch Conventions

No branch naming convention is formally documented. The project uses a single `master` branch as the main branch.

## PR Process

The project has a GitHub Actions release workflow (`.github/workflows/release.yml`) that triggers on version tags (`v*`). There is no pull request template or documented PR review process.

The release workflow:
1. Triggers on push of a `v*` tag
2. Sets up pnpm 10, Node.js 22, and Rust stable
3. Runs `pnpm install` for frontend dependencies
4. Builds the Tauri app using `tauri-apps/tauri-action`
5. Creates a GitHub Release with the built artifacts (signed with `TAURI_SIGNING_PRIVATE_KEY`)

For day-to-day development, changes are committed directly to `master`.
