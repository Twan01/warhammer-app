<!-- generated-by: gsd-doc-writer -->
# HobbyForge

A Tauri 2 desktop application for managing your Warhammer hobby -- miniature collection tracking, painting projects, paint inventory, army list building, battle logs, and spending analysis.

## Personal Use Disclaimer

HobbyForge is a personal hobby-tracking tool intended for personal use only. The seed data shipped with the application uses real Games Workshop faction, unit, and paint names (e.g., "Tau Empire", "Ultramarines", "Citadel Abaddon Black") for the convenience of the local user only.

- **No affiliation or endorsement.** This project is not affiliated with, endorsed by, or sponsored by Games Workshop Limited. "Warhammer 40,000", "Citadel", and all GW faction and product names are trademarks of Games Workshop Limited.
- **No redistribution of GW content.** No Games Workshop rules, datasheets, points values, codex content, or copyrighted artwork are bundled, scraped, reproduced, or transmitted by this application. The seed data contains only proper nouns used as labels.
- **Manual data entry.** All rules, points, and gameplay values must be entered manually by the user from sources they legally own.
- **Local-first, single-user.** The application stores data locally in `%APPDATA%\com.hobbyforge.app\hobbyforge.db` and makes no network requests.

If you intend to fork, share, or distribute a build of HobbyForge, you should replace the GW-named seed data in `src-tauri/migrations/002_seed_factions.sql` and `003_seed_data.sql` with neutral placeholders before doing so.

## Installation

HobbyForge is a desktop application built with Tauri. To set up the development environment:

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/) package manager
- [Rust](https://www.rust-lang.org/tools/install) toolchain (required by Tauri 2)

### Setup

```bash
git clone https://github.com/Twan01/warhammer-app.git
cd warhammer-app
pnpm install
```

## Quick Start

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Run the full desktop app (Vite dev server + Tauri window):
   ```bash
   pnpm tauri dev
   ```
3. Or run the frontend only in a browser (no native features):
   ```bash
   pnpm dev
   ```
   The Vite dev server starts at `http://localhost:1420`.

## Usage

HobbyForge provides a unified workspace for Warhammer hobbyists with these core features:

### Miniature Collection

Track every unit in your collection with painting status, faction assignment, and points values. Units flow through a painting pipeline from "Not Started" through assembly, priming, and painting stages.

### Painting Projects and Recipes

Organize painting work into projects. Create reusable paint recipes with structured steps and sections. A dedicated Painting Mode provides a focused execution view with keyboard shortcuts.

### Army Lists

Build army lists by selecting units from your collection. Includes loadout configuration, leader attachments, enhancement assignment, and points validation. Export lists to PDF.

### Rules Hub

Sync Warhammer game rules from Wahapedia CSV data. Browse datasheets, stratagems, detachments, and faction rules directly in the app. A Rust backend command (`bulk_sync_rules`) handles bulk CSV imports into a dedicated `rules.db` database.

### Battle Log and Spending

Record game results and track hobby spending over time with dashboard charts and analytics.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop runtime | Tauri 2 (Rust backend) |
| Frontend | React 19, TypeScript 5, Vite 6 |
| Styling | TailwindCSS 4, shadcn/ui |
| Routing | TanStack Router |
| Data fetching | TanStack React Query |
| Forms | React Hook Form + Zod validation |
| State | Zustand (filters/UI), React Context (faction/theme) |
| Database | SQLite via Tauri plugin-sql (`hobbyforge.db` + `rules.db`) |
| Charts | Recharts |

## Development Commands

| Command | Description |
|---|---|
| `pnpm dev` | Vite dev server only (localhost:1420) |
| `pnpm tauri dev` | Full desktop app with Tauri window |
| `pnpm build` | TypeScript check + Vite production build |
| `pnpm tauri build` | Full production bundle with installer |
| `pnpm test` | Run tests once (Vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm preview` | Preview Vite production build |

## Project Structure

```
src/
  app/              Route-level page components + router
  features/         Feature modules (one directory per domain)
  components/
    ui/             shadcn/ui primitives
    common/         App shell, sidebar, providers
  hooks/            React Query data hooks
  db/
    client.ts       Main SQLite connection singleton
    rules-client.ts Rules database connection
    queries/        CRUD query modules (one per entity)
  types/            Shared TypeScript interfaces
  context/          React Context providers
  lib/              Pure utility functions

src-tauri/
  src/lib.rs        Rust entry point + Tauri commands
  migrations/       SQL migration files
  tauri.conf.json   App configuration
```

## Testing

Tests use Vitest with React Testing Library in a jsdom environment. Run the full suite with:

```bash
pnpm test
```

Run a single test file:

```bash
pnpm test -- tests/collection/SomeFile.test.ts
```

Test files live in `tests/` and mirror the `src/features/` directory structure.
