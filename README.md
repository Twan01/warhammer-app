# HobbyForge

A personal Windows desktop app for managing a Warhammer 40K hobby collection. Built with Tauri 2 + React 19 + SQLite.

## Personal Use Disclaimer

HobbyForge is a personal hobby-tracking tool intended for personal use only. The seed data shipped with the application uses real Games Workshop faction, unit, and paint names (e.g., "Tau Empire", "Ultramarines", "Citadel Abaddon Black") for the convenience of the local user only.

- **No affiliation or endorsement.** This project is not affiliated with, endorsed by, or sponsored by Games Workshop Limited. "Warhammer 40,000", "Citadel", and all GW faction and product names are trademarks of Games Workshop Limited.
- **No redistribution of GW content.** No Games Workshop rules, datasheets, points values, codex content, or copyrighted artwork are bundled, scraped, reproduced, or transmitted by this application. The seed data contains only proper nouns used as labels.
- **Manual data entry.** All rules, points, and gameplay values must be entered manually by the user from sources they legally own.
- **Local-first, single-user.** The application stores data locally in `%APPDATA%\com.hobbyforge.app\hobbyforge.db` and makes no network requests.

If you intend to fork, share, or distribute a build of HobbyForge, you should replace the GW-named seed data in `src-tauri/migrations/002_seed_factions.sql` and `003_seed_data.sql` with neutral placeholders before doing so.
