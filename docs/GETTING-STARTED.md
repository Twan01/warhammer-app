<!-- generated-by: gsd-doc-writer -->
# Getting Started

HobbyForge is a Tauri 2 desktop application for managing your Warhammer hobby. This guide walks you through setting up the project from scratch so you can run the app locally.

## Prerequisites

HobbyForge is a Tauri 2 app with a React + TypeScript frontend and a Rust backend. You need the following tools installed before proceeding:

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | >= 18.x | JavaScript runtime for the frontend |
| **pnpm** | >= 8.x | Package manager (the project uses pnpm workspaces and overrides) |
| **Rust** | stable (latest) | Compiles the Tauri backend (`src-tauri/`) |
| **Tauri 2 system dependencies** | See below | Platform-specific native libraries required by Tauri |

### Tauri 2 system dependencies

Tauri requires platform-specific prerequisites. Follow the official guide for your OS:

- **Windows**: WebView2 (included in Windows 10/11), Visual Studio Build Tools with C++ workload
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: `libwebkit2gtk-4.1`, `libappindicator3`, `librsvg2`, and other system packages

See the full list at <!-- VERIFY: https://v2.tauri.app/start/prerequisites/ -->.

## Installation steps

1. Clone the repository:

   ```bash
   git clone https://github.com/Twan01/warhammer-app.git
   ```

2. Navigate into the project directory:

   ```bash
   cd warhammer-app
   ```

3. Install frontend dependencies:

   ```bash
   pnpm install
   ```

   This also compiles the `better-sqlite3` native module used by the test suite (listed in `pnpm.onlyBuiltDependencies`).

4. Verify the Rust toolchain is available:

   ```bash
   rustc --version
   cargo --version
   ```

   If these commands fail, install Rust via [rustup](https://rustup.rs/).

## First run

Run the full desktop app in development mode:

```bash
pnpm tauri dev
```

This command does two things in sequence:

1. Starts the Vite dev server on `http://localhost:1420` (hot-reload enabled)
2. Compiles the Rust backend and opens the Tauri window pointing at the dev server

The first run takes several minutes while Cargo downloads and compiles Rust dependencies. Subsequent launches are much faster thanks to incremental compilation.

If you only need to work on the frontend without the native Tauri shell:

```bash
pnpm dev
```

This starts the Vite dev server alone at `http://localhost:1420`. Note that database operations and Tauri plugin calls will not work in this mode since there is no Rust backend.

## Common setup issues

### Rust compilation fails on first run

The Tauri backend depends on several system libraries. If `pnpm tauri dev` fails during the Rust compile step, ensure you have installed all Tauri 2 system dependencies for your platform (see Prerequisites above).

### Port 1420 already in use

The Vite dev server is configured with `strictPort: true` on port 1420. If another process is using that port, the dev server will fail to start. Kill the conflicting process or stop any previous dev server instance before retrying.

### `better-sqlite3` build errors during `pnpm install`

The `better-sqlite3` package (used only by the test suite) requires a C/C++ compiler to build its native addon. On Windows, ensure Visual Studio Build Tools are installed. On macOS, Xcode Command Line Tools are required. On Linux, install `build-essential` and `python3`.

### Database migrations fail at startup

SQLite migrations run automatically when the app starts. If you see migration errors, it usually means a previous run was interrupted during a schema change. Delete the local database files in your Tauri app data directory and restart. The app will recreate them from scratch.

## Running tests

To verify your setup is working correctly, run the test suite:

```bash
pnpm test
```

This executes Vitest in single-pass mode using a jsdom environment. Tests mock the Tauri native bridge, so no running Tauri backend is required. See [TESTING.md](TESTING.md) for details on writing and running tests.

## Next steps

- **[ARCHITECTURE.md](ARCHITECTURE.md)** -- Understand the four-layer data flow and project structure
- **[CONFIGURATION.md](CONFIGURATION.md)** -- Tauri configuration, SQLite setup, and Vite settings
- **[DEVELOPMENT.md](DEVELOPMENT.md)** -- Build commands, code style, and contribution workflow
