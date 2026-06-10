# Requirements: HobbyForge v0.5.0 Settings & Preferences

**Defined:** 2026-06-10
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with official points via bundled canonical database for personal use, and reliable backup/restore so local data is always recoverable.

## v1 Requirements

### Infrastructure

- [x] **INF-01**: `app_settings` table (migration) with key-value storage for all settings
- [x] **INF-02**: Settings query/hook layer (`useAppSettings`, `useUpdateSetting`) with React Query integration
- [x] **INF-03**: Settings page with 3-tab layout (Preferences / Data / About) using shadcn Tabs

### Preferences

- [ ] **PREF-01**: User can set default language (EN/FR) from Settings, persisted in `app_settings` table
- [ ] **PREF-02**: User can pick currency (EUR/GBP/USD/CAD/AUD/JPY) from Settings; spending tracker uses selected currency
- [ ] **PREF-03**: User can set a default faction that loads as active on app start
- [ ] **PREF-04**: User can set a default army readiness points target (500/1000/1500/2000 or custom)

### Hobby Defaults

- [ ] **HOB-01**: User can rename the 5 painting pipeline stage labels from Settings
- [ ] **HOB-02**: User can customize default pre-game checklist items from Settings
- [ ] **HOB-03**: User can set a default mission format for new battle logs

### Data Management

- [ ] **DAT-01**: Settings Data tab shows a link to navigate to Data Health page
- [x] **DAT-02**: User can trigger a factory reset (wipe all user data) with multi-step confirmation
- [ ] **DAT-03**: User can export current preferences to a JSON file
- [ ] **DAT-04**: User can import preferences from a previously exported JSON file

### About

- [ ] **ABT-01**: About tab displays app version (from package.json/tauri.conf.json)
- [ ] **ABT-02**: About tab displays data stats (unit count, faction count, Wahapedia data date)
- [ ] **ABT-03**: About tab displays credits with Wahapedia attribution and tech stack info

## Future Requirements

- **PREF-05**: Theme customization (light mode, accent colors beyond faction)
- **HOB-04**: Custom painting status labels (beyond pipeline stages)
- **DAT-05**: Auto-backup on schedule
- **DAT-06**: Settings sync across devices

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-backup scheduling | Manual backup + safety backups sufficient for now |
| Cloud settings sync | Local-first by design |
| Light mode / theme switcher | Dark-mode-first; future consideration |
| Notification preferences | No notification system exists |
| Keyboard shortcut customization | Only Painting Mode uses shortcuts; premature |
| User accounts / profiles | Single-user personal tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INF-01 | Phase 121 | Complete |
| INF-02 | Phase 121 | Complete |
| INF-03 | Phase 121 | Complete |
| PREF-01 | Phase 122 | Pending |
| PREF-02 | Phase 122 | Pending |
| PREF-03 | Phase 122 | Pending |
| PREF-04 | Phase 122 | Pending |
| HOB-01 | Phase 123 | Pending |
| HOB-02 | Phase 123 | Pending |
| HOB-03 | Phase 123 | Pending |
| DAT-01 | Phase 124 | Pending |
| DAT-02 | Phase 124 | Complete |
| DAT-03 | Phase 124 | Pending |
| DAT-04 | Phase 124 | Pending |
| ABT-01 | Phase 125 | Pending |
| ABT-02 | Phase 125 | Pending |
| ABT-03 | Phase 125 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-06-10*
*Last updated: 2026-06-10 after roadmap creation*
