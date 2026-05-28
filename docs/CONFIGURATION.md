<!-- generated-by: gsd-doc-writer -->
# Configuration

HobbyForge is a Tauri 2 desktop application that stores all configuration in code and local files rather than environment variables. There are no `.env` files or runtime environment variables required to run the application. Configuration is split across Tauri config, Vite build config, TypeScript compiler settings, SQLite database pragmas, and browser localStorage for lightweight UI preferences.

## Environment Variables

HobbyForge does not use any application-level environment variables. The frontend has no `process.env.*` references and defines no `VITE_*` variables.

One build-time variable is read by Vite:

| Variable | Required | Default | Description |
|---|---|---|---|
| `TAURI_DEV_HOST` | Optional | `undefined` | Set by Tauri during mobile dev to bind the Vite dev server to a specific host. When set, HMR uses WebSocket on port 1421. Not used in desktop development or production builds. |
| `TAURI_SIGNING_PRIVATE_KEY` | Optional | N/A | Required only when building production bundles with update signing. Provided at build time, not at runtime. |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Optional | N/A | Password for the signing key, required alongside `TAURI_SIGNING_PRIVATE_KEY` during production builds. |

## Tauri Application Config

**File:** `src-tauri/tauri.conf.json`

This is the primary application configuration file. Key settings:

```json
{
  "productName": "HobbyForge",
  "version": "0.3.6",
  "identifier": "com.hobbyforge.app",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  }
}
```

### Window Configuration

| Setting | Value | Description |
|---|---|---|
| `width` | 1280 | Default window width in pixels |
| `height` | 800 | Default window height in pixels |
| `minWidth` | 900 | Minimum resizable width |
| `minHeight` | 600 | Minimum resizable height |
| `resizable` | `true` | Window can be resized by the user |

### Security

- **CSP:** `null` (disabled) -- the app loads no remote scripts or stylesheets at runtime.
- **Asset Protocol:** Enabled with scope `$APPDATA/**`, allowing the app to read files from its own data directory (used for photo attachments).

### Plugins

Two SQLite databases are preloaded at startup:

| Database | Connection String | Purpose |
|---|---|---|
| `hobbyforge.db` | `sqlite:hobbyforge.db` | All user data (collection, recipes, army lists, spending, etc.) |
| `rules.db` | `sqlite:rules.db` | Wahapedia game rules (synced via CSV import) |

Both databases resolve to the platform-specific app data directory:
- **Windows:** `%APPDATA%\com.hobbyforge.app\`
- **macOS:** `~/Library/Application Support/com.hobbyforge.app/`
- **Linux:** `$XDG_DATA_HOME/com.hobbyforge.app/` (falls back to `~/.local/share/com.hobbyforge.app/`)

### Auto-Updater

The updater is configured with a public key and checks for updates at:

```
https://github.com/Twan01/warhammer-app/releases/latest/download/latest.json
```

### Tauri Capabilities

**File:** `src-tauri/capabilities/default.json`

Defines the permissions granted to the main window. Notable allowed domains for HTTP requests:

| Domain | Purpose |
|---|---|
| `https://wahapedia.ru/**` | Wahapedia rules data CSV downloads |
| `https://api.github.com/**` | GitHub API (update checks, BSData imports) |
| `https://raw.githubusercontent.com/**` | Raw GitHub content (BSData point files) |

File system access is scoped to `$HOME`, `$DESKTOP`, `$DOWNLOAD`, and `$DOCUMENT` directories for backup export/import operations.

## Vite Configuration

**File:** `vite.config.ts`

| Setting | Value | Description |
|---|---|---|
| Dev server port | `1420` | Fixed port (`strictPort: true`) |
| HMR port | `1421` | Used only when `TAURI_DEV_HOST` is set (mobile dev) |
| Path alias | `@/` maps to `src/` | Used throughout the codebase for imports |
| Plugins | `@vitejs/plugin-react`, `@tailwindcss/vite` | React Fast Refresh and TailwindCSS 4 |
| Watch ignored | `src-tauri/`, `.planning/`, `tests/`, `scripts/`, `.claude/` | Prevents unnecessary HMR reloads |

## TypeScript Configuration

**File:** `tsconfig.json`

| Setting | Value |
|---|---|
| `target` | ES2020 |
| `module` | ESNext |
| `moduleResolution` | bundler |
| `jsx` | react-jsx |
| `strict` | `true` |
| `noUnusedLocals` | `true` |
| `noUnusedParameters` | `true` |
| `noFallthroughCasesInSwitch` | `true` |

Path alias `@/*` maps to `./src/*`, matching the Vite alias.

## Vitest Configuration

**File:** `vitest.config.ts`

| Setting | Value |
|---|---|
| `environment` | jsdom |
| `globals` | `true` |
| `setupFiles` | `./tests/setup.ts` |
| `include` | `tests/**/*.test.ts`, `tests/**/*.test.tsx` |
| `reporters` | verbose |

## SQLite Database Pragmas

Both database clients (`src/db/client.ts` and `src/db/rules-client.ts`) apply identical pragmas immediately after loading:

| Pragma | Value | Purpose |
|---|---|---|
| `foreign_keys` | `ON` | Enforces foreign key constraints (SQLite default is OFF per connection) |
| `journal_mode` | `WAL` | Write-Ahead Logging for better concurrent read/write performance |
| `busy_timeout` | `10000` (10 seconds) | Prevents `SQLITE_BUSY` errors during concurrent access |

The `bulk_sync_rules` Rust command uses a separate direct connection with a 30-second busy timeout and temporarily disables foreign key checks during the delete-and-reinsert cycle.

## Database Migrations

Migrations run automatically at app startup via `tauri-plugin-sql`. They are defined in Rust (`src-tauri/src/lib.rs`) and reference SQL files in `src-tauri/migrations/`.

- **hobbyforge.db:** 36 migrations (001 through 036)
- **rules.db:** 4 migrations (rules_001 through rules_004)

Migration checksums are tracked in the `_sqlx_migrations` table. A pre-flight repair step runs before Tauri initializes to fix any checksum mismatches (caused by whitespace changes in migration files), creating a safety backup before modifying the tracking table.

**Important:** Never edit existing migration files. Always create a new numbered migration.

## React Query Defaults

**File:** `src/components/common/QueryProvider.tsx`

| Setting | Value | Rationale |
|---|---|---|
| `staleTime` | 5 minutes | Avoids re-querying SQLite on every navigation |
| `gcTime` | 10 minutes | Keeps recent queries cached after unmount |
| `refetchOnWindowFocus` | `false` | No remote server to sync with |
| `retry` | 1 | SQLite errors are usually deterministic |

React Query Devtools are enabled only in development (`import.meta.env.DEV`).

## localStorage Keys

The following browser `localStorage` keys persist lightweight UI state across sessions:

| Key | Type | Default | Purpose |
|---|---|---|---|
| `active-faction-id` | `number \| null` | `null` | Selected faction for accent color theming |
| `sidebar-collapsed` | `"true" \| "false"` | `"false"` | Sidebar collapse state |
| `collection-view-mode` | `string` | Varies | Collection page view mode (table/card) |
| `army-readiness-target` | `number` | Varies | Army readiness percentage threshold on dashboard |
| `hobbyforge-backup-status` | JSON object | `null` | Last backup metadata for health diagnostics |

## CSS Custom Properties

**File:** `src/styles/globals.css`

The app uses shadcn/ui's CSS custom property system with a zinc base color. All color tokens are defined as HSL values in `:root` (light mode) and `.dark` (dark mode).

One runtime-mutable property is set via JavaScript:

| Property | Default | Purpose |
|---|---|---|
| `--faction-accent` | `#71717a` (zinc-500) | Updated by `ActiveFactionContext` when the user selects a faction. Drives all `bg-faction-accent`, `text-faction-accent`, `ring-faction-accent`, and `border-faction-accent` utility classes. |

## Required vs Optional Settings

HobbyForge has **no required external configuration** for normal use. The application is fully self-contained:

- Databases are created automatically on first launch in the platform app data directory
- Migrations run automatically at startup
- No API keys or service credentials are needed for core functionality
- The Wahapedia sync and BSData import features use public, unauthenticated HTTP endpoints

The only settings that require manual configuration are the Tauri signing keys (`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`), which are needed exclusively for building production release bundles with auto-update support.

## Per-Environment Overrides

HobbyForge does not use environment-specific config files (no `.env.development`, `.env.production`, etc.). The only environment distinction is:

- **Development:** `pnpm dev` or `pnpm tauri dev` starts the Vite dev server on port 1420 with HMR. React Query Devtools are shown.
- **Production:** `pnpm tauri build` compiles the Rust backend and bundles the Vite output. React Query Devtools are excluded. The auto-updater checks <!-- VERIFY: https://github.com/Twan01/warhammer-app/releases/latest/download/latest.json --> for new versions.
