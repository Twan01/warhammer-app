# Milestones
## v0.5.0 Settings & Preferences (Shipped: 2026-06-11)

**Phases completed:** 5 phases (121-125), 9 plans
**Timeline:** 2026-06-10 → 2026-06-11 (2 days)
**Stats:** ~69 commits, 17/17 requirements satisfied, Nyquist 5/5 compliant

**Key accomplishments:**
- Settings infrastructure: `app_settings` key-value SQLite table (migration 044) with React Query hooks (`useAppSettings`, `useUpdateSetting`) and tabbed Settings page shell (Preferences / Data / About)
- Preferences tab: language (EN/FR), currency (6 options), default faction, army readiness target — all wired to downstream consumers (locale toggle, formatCurrency, ActiveFactionContext, ArmyReadinessCard)
- Hobby defaults: customizable pipeline stage labels (Dashboard HobbyPipeline), pre-game checklist with DnD reorder (Game Day), default mission format (BattleLogSheet create-mode pre-fill)
- Data management: factory reset with safety backup via Rust command, preference export/import via JSON with 7-key allowlist validation, Data Health navigation link
- About tab: app version via `getVersion()`, unit/faction data stats from `useUdbMeta()`, Wahapedia attribution and tech stack credits

**Tech debt accepted:** getBucketLabel() exported but unused in production (dead code in stageLabel.ts)

**Archived:**
- Roadmap: `.planning/milestones/v0.5.0-ROADMAP.md`
- Requirements: `.planning/milestones/v0.5.0-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.5.0-MILESTONE-AUDIT.md`

---

## v0.4.7 Wahapedia Pipeline & Full Data Import (Shipped: 2026-06-09)

**Phases completed:** 5 phases (116-120), 10 plans
**Timeline:** 2026-06-04 → 2026-06-09 (6 days)
**Stats:** 27 commits, 19/19 requirements satisfied, Nyquist 4/5 compliant

**Key accomplishments:**
- Wahapedia-only pipeline: replaced BSData XML with direct CSV parsing, auto-download command (`pnpm download:wahapedia`), BOM-safe parsing, Legends dedup — points coverage from 60% to 99.8%
- Detachments import: 261 detachments and 284 abilities across 26 factions in udb_detachments/udb_detachment_abilities tables with FK integrity
- Stratagems & enhancements import: 1,482 stratagems (28 universal/core with nullable FK) and 927 enhancements in udb_stratagems/udb_enhancements tables
- Full UI wiring: Game Day real stratagems by battle phase, Rules Hub live stratagem/detachment data with search/filter, enhancement picker with auto-resolved points and HTML descriptions, PlaybookTab detachment abilities
- BSData dependency eliminated: @xmldom/xmldom removed, no more XML parsing in build pipeline

**Tech debt accepted:** Datasheets_models_cost.csv not in REQUIRED_CSVs validation; Phase 119 Nyquist incomplete; useSharedAbilitiesByFaction empty stub; unnecessary empty-string query in DetachmentRulesSection

**Archived:**
- Roadmap: `.planning/milestones/v0.4.7-ROADMAP.md`
- Requirements: `.planning/milestones/v0.4.7-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.4.7-MILESTONE-AUDIT.md`

---

## v0.4.5 Data Quality Audit & Pipeline Improvement (Shipped: 2026-06-03)

**Phases completed:** 4 phases (112-115), 7 plans
**Timeline:** 2026-06-02 → 2026-06-03 (2 days)
**Stats:** ~61 commits, 24/24 requirements satisfied, Nyquist 3/4 compliant

**Key accomplishments:**
- Build pipeline hardening: shared BSData library extraction (`scripts/lib/bsdata.ts`), deterministic builds, per-faction coverage reporting with match-method breakdown, alias validation, coverage threshold gate (MIN_COVERAGE_PCT=58%)
- Priority faction data audit: audit script (`audit-faction.ts`) for systematic field-by-field comparison, SM/NEC/DG audited against Wahapedia CSVs, French translations added for all 3 factions
- Pipeline fixes: 3 systematic CSV weapon parsing bugs fixed (range, keywords, weapon grouping), `mapWeaponRow` helper extracted with 6 tests, Emperor's Champion alias apostrophe fix, database rebuilt with correct data
- Sub-faction filter: dual-site fix (SQL + client-side) — selecting a sub-faction now shows both sub-faction-specific units and parent faction generic units across database browser, army list picker, and collection browser

**Tech debt accepted:** French translation unit names lack accents (cosmetic); Phase 112 Nyquist validation missing; 3 UI flows pending human verification

**Archived:**
- Roadmap: `.planning/milestones/v0.4.5-ROADMAP.md`
- Requirements: `.planning/milestones/v0.4.5-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.4.5-MILESTONE-AUDIT.md`

---

## v0.4.2 Unit Database 2.0 — Data Quality, Sub-factions & Integration (Shipped: 2026-06-01)

**Phases completed:** 4 phases (108-111), 11 plans
**Timeline:** 2026-06-01 (single day)
**Stats:** ~84 commits, 93 files changed, +8,092 / -245 lines, 23/23 requirements satisfied, Nyquist 3/4 compliant

**Key accomplishments:**
- Build pipeline overhaul: shared lib extraction, deterministic builds, 3-pass name matching with 44 manual aliases, cross-faction BSData support — points match rate from 37% to 96.9% (BSData coverage); per-faction coverage badges on Data Health page
- Sub-faction filtering: sub_faction column populated from BSData catalogs (17 entries across SM/CSM/Aeldari), dropdown filters wired in database browser, army list unit picker, and collection browser; FTS5 sub-faction search
- PlaybookTab & Game Day revival: canonical stats/weapons/abilities from udb_* tables replacing null stubs, shared WeaponTable component, Game Day weapon profiles section, stable unit_id:ability_name OPG composite keys, DEDICATED TRANSPORT + EPIC HERO army list validation
- Bilingual infrastructure: EN/FR locale toggle (localStorage-persisted), French data overlay via translations_fr.json, COALESCE(col_fr, col) query layer, locale-keyed React Query hooks with 3-prefix cache invalidation, FTS5 bilingual search indexing French unit and faction names

**Tech debt accepted:** Duplicate WeaponTable in DatasheetPointsTab.tsx (pre-existing); DQ-05 Wahapedia coverage 60.1% (BSData limitation); 15 human verification items pending

**Archived:**
- Roadmap: `.planning/milestones/v0.4.2-ROADMAP.md`
- Requirements: `.planning/milestones/v0.4.2-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.4.2-MILESTONE-AUDIT.md`

---

## v0.4.0 Unit Database — Canonical 40k Data Hub (Shipped: 2026-05-31)

**Phases completed:** 5 phases (103-107), 12 plans
**Timeline:** 2026-05-29 → 2026-05-31 (3 days)
**Stats:** ~100 commits, 346 files changed, +294,423 / -27,701 lines (includes bundled unit_database.json), 28/28 requirements satisfied, Nyquist fully compliant

**Key accomplishments:**
- Canonical unit database: Node.js build script parses Wahapedia CSVs + BSData XML into 1,711 units across 25 factions with stats, weapons, abilities, keywords, points tiers, composition data; Rust import command with WAL checkpoint; FTS5 search; pre-built data bundled with app
- Database browser UI: faction picker with alignment grouping, role-grouped unit lists with virtual scrolling, full datasheet detail sheets (stat block, weapon tables, ability text, keywords, damaged profile), global FTS5 search, role/keyword/point range filters
- Collection integration: "Add from Database" flow with pre-fill, FK link (units.udb_unit_id → udb_units.id, ON DELETE SET NULL), migration backfill by name matching, ownership/readiness badges on browser rows, Data Health diagnostic for unlinked units
- Army list simplification: points resolved via direct FK join eliminating synced_unit_points cache, BATTLELINE count validation using database roles/keywords, simplified COALESCE chain
- Single-database architecture: rules.db eliminated, dead sync code removed (rules-client.ts, rw_* query modules, CSV fetch pipeline, bulk_sync_rules command), dev-side update script with diff reporting, data version display in VersionInfoCard

**Tech debt accepted:** syncFreshness stub returns 'fresh' always (intentional); 7 components stub empty for deferred EXT-03 features; update script duplicates build logic (intentional for standalone execution)

**Archived:**
- Roadmap: `.planning/milestones/v0.4.0-ROADMAP.md`
- Requirements: `.planning/milestones/v0.4.0-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.4.0-MILESTONE-AUDIT.md`

---

## v0.3.7 Smart Automation (Shipped: 2026-05-28)

**Phases completed:** 3 phases (100-102), 6 plans
**Timeline:** 2026-05-28 (single day)
**Stats:** 46 files changed, +1,731 / -296 lines, 13/13 requirements satisfied, Nyquist fully compliant

**Key accomplishments:**
- Query-layer automation: syncDerivedStatuses rewritten with assembly auto-derivation from section_type, section_type-first matching with name-LIKE backward-compat fallback, CASE WHEN override guards for all three status fields, is_active_project lifecycle (auto-set on recipe assign, auto-clear at 100%)
- Battle-readiness pure function: computeUnitReadiness() canonical readiness definition in src/lib/ with 16 TDD tests, UnitPickerDialog upgrade with Battle Ready badge, 4-dot readiness indicators, per-row points display, budget-aware "Fits budget" filter
- Smart context pre-filling: RecipeFormSheet auto-fills faction from ActiveFactionContext, ApplyRecipeDialog groups recipes into Suggested/Other by unit faction, all pre-filled values editable

**Tech debt accepted:** Phases 100/101 missing formal VERIFICATION.md (code verified by integration checker); status_basing_override and status_varnished_override have no UI setter (guard logic inert)

**Archived:**
- Roadmap: `.planning/milestones/v0.3.7-ROADMAP.md`
- Requirements: `.planning/milestones/v0.3.7-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.3.7-MILESTONE-AUDIT.md`

---

## v0.3.0 Robustness & Architecture Hardening (Shipped: 2026-05-22)

**Phases completed:** 4 phases (96–99), 9 plans
**Timeline:** 2026-05-22 (single day)
**Stats:** 57 commits, 111 files changed, +13,222 / -2,262 lines, 17/17 requirements satisfied, Nyquist fully compliant

**Key accomplishments:**
- Database hardening: WAL journal mode + busy_timeout on main DB, 31 FK indexes across 18 tables, 2 temporal DESC indexes, CHECK constraints on units (5 columns) and paints (2 columns) preventing invalid data at the schema level
- Error resilience: RouteErrorFallback with dev-only error details, errorComponent on both layout routes (per-route isolation), DbHealthGate startup validation with DbDiagnosticScreen, global error handlers (window error + unhandledrejection), QueryCache/MutationCache onError logging
- Performance optimization: React.lazy() route-level code splitting (13 lazy pages), React.memo on KanbanCard/ArmyListUnitRow/CurrentFocusCard, batched multi-row INSERT for 6 sync replace* functions (200-row chunks), getKanbanProgressByUnitIds CTE+ROW_NUMBER batched query (O(1) vs O(4N)), 25-file invalidation precision audit
- Architecture cleanup: query-layer isolation (zero src/features/ imports in src/db/queries/), ArmyListsPage armyListsReducer replacing 14 useState calls, PlaybookTab decomposed into 5 sub-components (PlaybookStats/Strategy/Datasheet/Rules/SyncDetails), UnitSheet decomposed into UnitFormRequired/UnitFormOptional/UnitFormFields

**Tech debt accepted:** 14 files still exceed 400 lines (aspirational, not in success criteria); PlaybookRules.tsx retains mutation hooks (accepted, within 300-line limit)

**Archived:**
- Roadmap: `.planning/milestones/v0.3.0-ROADMAP.md`
- Requirements: `.planning/milestones/v0.3.0-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.3.0-MILESTONE-AUDIT.md`

---

## v0.2.18 Army Lists 3.0 — Smart List Builder (Shipped: 2026-05-22)

**Phases completed:** 7 phases (89–95), 14 plans
**Timeline:** 2026-05-20 → 2026-05-22 (3 days)
**Stats:** 20 requirements satisfied, Nyquist fully compliant

**Key accomplishments:**
- Schema + data layer: loadout_configurations, unit_enhancements, leader_attachments tables with FK indexes
- Loadout builder: wargear/model count editor with per-model weapon options
- Enhancement assignment: point-costed enhancements from rules.db with uniqueness validation
- Leader attachment: preventive validation (leader-to-bodyguard only), mutual exclusion
- Datasheet browser + ghost units: in-list datasheet browsing, planned/ghost unit support
- List export: 4 formats (text, markdown, JSON, clipboard)
- Version snapshots: save/compare/restore with auto-save safety net

**Archived:**
- Roadmap: `.planning/milestones/v0.2.18-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.18-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.18-MILESTONE-AUDIT.md`

---

## v0.2.15 Painting Mode (Shipped: 2026-05-20)

**Phases completed:** 5 phases (84–88), 11 plans
**Timeline:** 2026-05-19 → 2026-05-20 (2 days)
**Stats:** 38 source files changed, +4,021 / -45 lines, 39/39 requirements satisfied, Nyquist fully compliant

**Key accomplishments:**
- Atomic step completion with session logging: single-transaction step progress + session save with 6-key React Query cache invalidation, section-aware ordering via COALESCE, navigation hook with first-incomplete selection and prev/next/jumpTo
- Step-by-step execution UI: StepFocalView hero card with paint swatch, technique/tool/dilution metadata, reference photo, position indicator; SectionNavigator with collapsible sections, progress badges, and step sub-items
- Distraction-free painting mode: full-page route with sidebar hidden, larger typography, react-hotkeys-hook keyboard shortcuts (Space marks done, Arrow left/right navigates, Escape exits), input guards for form fields
- Session integration: Zod-validated PaintingSessionSheet prefilled from current context, atomic done+log action via sibling Fragment button pair, standalone mark-done alternative
- Six entry points wired: Dashboard NextPaintingActionCard, CurrentFocusCard, Unit Detail applied recipe panel, Kanban card, RecipeDetailSheet — all guarded when no applied recipe
- Full test coverage: 28+ tests covering step selection, navigation, optional sections, paintless steps, paint warnings, session prefill

**Tech debt accepted:** None — 7th consecutive milestone with clean first-pass audit

**Archived:**
- Roadmap: `.planning/milestones/v0.2.15-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.15-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.15-MILESTONE-AUDIT.md`

---

## v0.2.14 Backup 2.0 — Structured Export, Restore & Safety Backups (Shipped: 2026-05-19)

**Phases completed:** 5 phases (79–83), 11 plans
**Timeline:** 2026-05-18 → 2026-05-19 (2 days)
**Stats:** 17 source commits, 12 files changed, +1,283 / -72 lines, 26/26 requirements satisfied, 1,831 tests passing

**Key accomplishments:**
- Rust backup foundation: zip crate + 3 Tauri commands (export_backup, validate_backup, create_safety_backup) with VACUUM INTO for safe database copy and BackupManifest struct
- Export UI + backup status: BackupCard health tier (healthy/recommended/overdue/never) with color-coded dots, file picker export flow, DataHealthSummaryCard backup freshness indicator
- Restore preview + validation: AlertDialog-based preview with schema compatibility checks (reject newer, warn older), destructive confirmation gate, formatBytes utility
- Restore execution + safety backups: atomic database swap with WAL/SHM/journal sidecar cleanup, app restart via relaunch(), pre-sync safety backup in useRulesSync, SafetyBackupsList component
- Backup diagnostics: collapsible diagnostic detail section (age/version/status rows), version mismatch detection with amber dashboard indicator, progressive disclosure keeping healthy state clean

**Tech debt accepted:** Nyquist validation partial for Phase 79, missing for Phase 83

**Archived:**
- Roadmap: `.planning/milestones/v0.2.14-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.14-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.14-MILESTONE-AUDIT.md`

---

## v0.2.13 Data Integrity, Diagnostics & Product Coherence (Shipped: 2026-05-15)

**Phases completed:** 6 phases (73–78), 13 plans
**Timeline:** 2026-05-14 → 2026-05-15 (2 days)
**Stats:** 86 commits, 26/26 requirements satisfied, Nyquist 6/6 compliant

**Key accomplishments:**
- Data identity hardening: applied recipe progress keyed by recipe_step_id (not order_index) with section-disambiguated back-fill migration; transactional recipe graph save with BEGIN/COMMIT/ROLLBACK — partial saves structurally impossible
- Centralized points resolver: single resolveUnitPoints() function consumed by all surfaces; PointsSourceChip labels (synced/override/unknown); MatchStatusIndicator for confirmed/ambiguous/unmatched; RulesMappingSheet for user confirmation/override
- Warning split: computeListWarnings() for summary panel (points exceeded, stale data), computeUnitWarnings() per row (no points, not battle-ready); dashboard COALESCE site-3 divergence resolved
- Data Health page: VersionInfoCard, TableCountsGrid (5 key tables), DiagnosticsCard (orphans/ambiguous/stale), BackupCard with VACUUM INTO via Rust command; all diagnostics lazy-loaded
- Dashboard Command Center: NextPaintingActionCard (step + time + paint availability), ReadyToPlayCard (points + unpainted + sync freshness), DataHealthSummaryCard (sync age + warnings + backup status)
- Game Day after-action loop: End Game pre-fills BattleLogSheet with army list + date; forgotten rules + MVP/underperformer capture; forgotten rules surface as Game Day reminders

**Tech debt accepted:** Dead column (promoted_to_reminder never written), ReadyToPlayCard uses SQL COALESCE instead of resolveUnitPoints()

**Archived:**
- Roadmap: `.planning/milestones/v0.2.13-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.13-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.13-MILESTONE-AUDIT.md`

---

## v0.2.11 Foundation Hardening (Shipped: 2026-05-13)

**Phases completed:** 5 phases (68–72), 9 plans
**Timeline:** 2026-05-13 (single day)
**Stats:** 13 feat/test commits, 156 files changed, +16,688 / -229 lines, 9/9 requirements satisfied

**Key accomplishments:**
- Infrastructure quick wins: COALESCE null-clearing fix for 4 workflow metadata fields, migration registration for 018-021, section-aware step ordering via LEFT JOIN + COALESCE ORDER BY, version alignment to 0.2.11
- Paintless recipe steps: migration 022 makes paint_id nullable via table rebuild, guard removal in RecipeFormSheet, SectionedTimeline null-safe availability rendering
- Non-destructive recipe save: dbId tracking on DraftStep/DraftSection, updateRecipeStep query with 13 mutable columns, five-phase diff algorithm replacing DELETE-all + re-INSERT in RecipeFormSheet.onSubmit
- Stable session section FK: migration 023 adds recipe_section_id (ON DELETE SET NULL) to painting_sessions, 8-column createSession INSERT, LogSessionSheet dual-write wiring
- Data-layer test suite: better-sqlite3 devDep with in-memory SQLite, 14 tests covering migration parity, schema shape, recipe persistence (paintless steps, ID preservation), session FK (ON DELETE SET NULL, dual-write independence)

**Archived:**
- Roadmap: `.planning/milestones/v0.2.11-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.11-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.11-MILESTONE-AUDIT.md`

---

## v0.2.10 Applied Recipes, Points Import & List Validation (Shipped: 2026-05-13)

**Phases completed:** 7 phases (61–67), 17 plans
**Timeline:** 2026-05-13 (single day)
**Stats:** 166 commits, 57 files changed, +2,506 / -114 lines, 20/20 requirements satisfied

**Key accomplishments:**
- Applied recipe workflow: users apply recipes to units with step-by-step checklist, section/step toggle, bulk multi-unit apply — each unit gets independent progress tracking via unit_recipe_assignments + unit_recipe_step_progress tables
- Painting session bridge: logging a session auto-marks the corresponding applied recipe step as completed; progress flows into Kanban cards and Dashboard CurrentFocusCard, superseding session-derived workflow position
- Points import pipeline: Wahapedia sync extended with official points CSV, synced_unit_points cache solving cross-DB JOIN, 5-level COALESCE chain (list override > loadout override > synced > unit default > unknown), PointsFreshnessBadge and per-unit delta detection with army list impact
- Army list validation: pure warning engine with 5-level COALESCE-aware categorization, TACTICAL_ROLES 7-role tags with coverage visualization, health summary panel (points total, ownership %, readiness %, freshness, warning count)
- Game Day readiness: GameDayReadinessPanel surfacing points freshness, readiness gaps, tactical coverage warnings, and stale data alerts in pre-game view

**Known gap:** Phases 61-64 lack VERIFICATION.md files (procedural gap; integration checker confirmed all requirements wired and working)

**Archived:**
- Roadmap: `.planning/milestones/v0.2.10-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.10-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.10-MILESTONE-AUDIT.md`

---

## v0.2.9 Recipes 3.1 / Workflow Semantics & Integrations (Shipped: 2026-05-12)

**Phases completed:** 4 phases (57–60), 8 plans
**Timeline:** 2026-05-12 (single day)
**Stats:** 16 feat/test commits, 68 files changed, +8,458 / -83 lines, 18/19 requirements satisfied (1 partial)

**Key accomplishments:**
- Schema & data layer: migration 020 adds 4 workflow metadata columns (section_type, technique, execution_mode, applies_to) to recipe_sections + section_name on painting_sessions; const arrays as single sources of truth for dropdowns
- Recipe form & timeline display: Workflow collapsible with progressive disclosure on RecipeSectionCard (4 Select controls); compact badges and dot-separated metadata in SectionedTimeline
- Session section cascade: 3-level cascading selector (recipe → section → step) in LogSessionSheet with dual reset chains and filtered step dropdown
- Kanban & CurrentFocus integration: pure `computeWorkflowPosition` function (12 unit tests) + `useWorkflowPositions` batch hook; section-aware workflow display on KanbanCard and CurrentFocusCard with 5 graceful degradation paths
- Cache fix: workflow-positions invalidation added to useCreatePaintingSession for real-time position updates after session logging

**Known gap:** RUI-03 partial — execution_mode as dot-separated text instead of Badge (intentional design deviation D-08)

**Archived:**
- Roadmap: `.planning/milestones/v0.2.9-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.9-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.9-MILESTONE-AUDIT.md`

---

## v0.2.8 Rules Data Hub UI / Army Lists 2.0 / Game Day (Shipped: 2026-05-11)

**Phases completed:** 5 phases (52–56), 12 plans
**Timeline:** 2026-05-10 → 2026-05-11 (2 days)
**Stats:** 82 commits, 70 files changed, +6,137 / -28 lines, 27 requirements satisfied, ~87,660 total LOC

**Key accomplishments:**
- Schema + data layer foundation: Migration 019 adds detachment_id to army_lists, rules_favorites and rules_notes tables in hobbyforge.db; typed query modules with optimistic updates; points import design document with 5-level COALESCE precedence chain
- Rules Data Hub UI: standalone RulesHubPage with sync status header, faction browser, 3-tab rules browser (stratagems/detachments/shared abilities) with phase/CP filtering and text search, sync error history, diff summary, and Wahapedia disclaimer
- Army Lists 2.0 — Detachment Selection: DetachmentPicker Combobox scoped to faction, detachment ability and filtered stratagems display inline, StaleDataBanner for >30-day stale rules, favorites reminder section in army list detail
- Playbook enhancements: star/favorite toggle and Game Day reminder flag on every rule entry across RulesHubPage and PlaybookTab, inline personal notes with debounced auto-save, page-level Map<compositeKey, T> pattern preventing N+1 hooks
- Game Day Mode: GameDayPage launched from army list with CP tracker (spend/gain/undo), phase-grouped stratagems with pinned reminders, collapsible unit ability cards with once-per-game toggles, persistent pre-game checklist, painting status badges

**Archived:**
- Roadmap: `.planning/milestones/v0.2.8-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.8-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.8-MILESTONE-AUDIT.md`

---

## v0.2.7 Recipes 3.0 / Hierarchical Painting Workflows (Shipped: 2026-05-08)

**Phases completed:** 4 phases (48–51), 8 plans
**Timeline:** 2026-05-08 (single day)
**Stats:** 14 commits, 59 files changed, +8,259 / -174 lines, 19 requirements satisfied, 1,112 automated tests passing

**Key accomplishments:**
- Section data layer: migration 018 creates recipe_sections table with zero-data-loss default section backfill, typed CRUD queries, 5-key cascade invalidation contract on section delete
- Sectioned timeline view: SectionedTimeline component with section headers showing name, surface badge, step count, estimated time, and per-section owned/missing paint availability dots — backward-compatible flat fallback for unsectioned recipes
- Section form UI: collapsible DnD-reorderable section cards with progressive disclosure (single-section recipes stay flat as before), DraftSection/buildDraftSections pure functions with TDD
- Section-aware recipe duplication: Map<oldId, newId> remapping during section copy, section count badges on recipe cards (hidden for single-section recipes)
- Full backward compatibility: all pre-existing recipe workflows (availability, swatches, LogSession, CRUD) unchanged — 1,112 tests passing with zero regressions

**Archived:**
- Roadmap: `.planning/milestones/v0.2.7-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.7-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.7-MILESTONE-AUDIT.md`

---


## v0.2.6 Rules Sync 2.0 / Rules Data Hub (Shipped: 2026-05-08)

**Phases completed:** 6 phases (42–47), 11 plans
**Timeline:** 2026-05-08 (single day)
**Stats:** 79 commits, 32 files changed, +3,816 / -159 lines, 27 requirements satisfied, 1,031 automated tests passing

**Key accomplishments:**
- Architecture audit: full sync pipeline mapping (TypeScript CSV fetch → Rust transaction → SQLite) with gap inventory for types, queries, hooks, and migration plan
- Extended rules read layer: TypeScript types, query functions, and React Query hooks for stratagems, detachments, detachment abilities, and shared faction abilities — all four surfaced in PlaybookTab collapsible sections
- Sync pipeline hardening: Rust `bulk_sync_rules` returns per-table row counts via `SyncResult`, CSV column header validation rejects malformed files, sync errors logged to persistent `sync_errors` table, all rules query keys invalidated on success
- Sync metadata & import tracking: last sync date/time, per-table row counts, Wahapedia source version, sync error history, freshness badge (stale/fresh) on rules pages, pre-sync snapshot mechanism capturing all 11 tables
- Manual overrides: per-unit points/stats/keywords/abilities overrides in hobbyforge.db that survive re-syncs, 3-level COALESCE chain for effective points, override markers in PlaybookTab UI
- Per-field diff: enriched snapshot stores full field values for models/keywords/abilities, `computeSyncDiff` compares per-field changes, PlaybookTab Modified section shows stat/keyword/ability value changes after re-sync

**Archived:**
- Roadmap: `.planning/milestones/v0.2.6-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.6-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.6-MILESTONE-AUDIT.md`

---

## v0.2.5 Recipes 2.0 / Painting Studio (Shipped: 2026-05-07)

**Phases completed:** 5 phases (37–41), 12 plans
**Timeline:** 2026-05-07 (single day)
**Stats:** 87 files changed, +13,262 / -623 lines, 18 requirements satisfied

**Key accomplishments:**
- Schema foundation: migration 012 renames recipe_paints → recipe_steps (zero data loss), adds 11 columns across 3 migrations (012/013/014), fixes pre-existing kanban cache invalidation bug, replaces N+1 step count with batch GROUP BY query
- Structured step input: full painting step UI with phase label (10-value dropdown), tool, technique, dilution, time estimate per step with recipe total sum, @dnd-kit drag-and-drop reordering with persist-on-save cycle
- Studio UX transformation: RecipeTable replaced with responsive card grid (RecipeCard + RecipeCardGrid), paint availability badges (owned/missing/running-low per recipe via batch SQL), step-by-step vertical timeline detail view, 4-dimension filtering (surface/style/difficulty/missing paints)
- Recipe actions: one-click recipe duplication (copies header + all 12 step columns + substitutions), per-step photo upload via Tauri FS API with timeline thumbnails, alternate substitute paint linking per step, bulk "Add all missing to wishlist" with name-based deduplication
- Session-recipe integration: LogSessionSheet recipe/step dropdowns with faction-sorted picker and cascading clear, RecipeDetailSheet sessions history section — closes the planning-to-execution loop

**Archived:**
- Roadmap: `.planning/milestones/v0.2.5-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.5-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.5-MILESTONE-AUDIT.md`

---

## v0.2.4 Premium Dashboard UX & Visual Polish (Shipped: 2026-05-06)

**Phases completed:** 6 phases (30–34, 36), 13 plans
**Timeline:** 2026-05-05 → 2026-05-06 (2 days)
**Stats:** 80 commits, 224 TypeScript source files, 778 automated tests passing

**Key accomplishments:**
- Dashboard CSS grid bento layout: asymmetric 2-column responsive grid, StatCards navigate to relevant pages, 11-stage pipeline compressed to 5 readable buckets (Not Started / Assembly / Painting / Finishing / Done)
- Photo-rich panels: UnitThumbnail shared component, CurrentFocusCard v2 (photo thumbnail + metadata + action buttons), ActiveProjectsPanel (top 5 active projects with photos, progress, quick actions)
- ArmyReadinessCard: per-faction battle-ready points with target point selector (500/1000/1500/2000 pts), progress bars with owned-vs-ready breakdown, dedicated query hook
- Data intelligence: LogSession painting status updates with 3-cache invalidation, spending metrics (cost per completed model, painted vs unpainted value split), bidirectional recipe-unit navigation, CurrentFocusCard recipe name display
- Visual polish: FactionSummaryCard v2 (dominant accent band + active glow ring), hero radial gradient, hover shadow hierarchy on all dashboard card surfaces
- Gap closure: recipe cache invalidation fix (DATA-06 by-unit prefix match), stale verification/summary doc cleanup

**Archived:**
- Roadmap: `.planning/milestones/v0.2.4-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.4-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.4-MILESTONE-AUDIT.md`

---

## v0.2.2 Full Circle (Shipped: 2026-05-05)

**Phases completed:** 8 phases (17–19, 21–24, 35), 23 plans
**Timeline:** 2026-05-04 → 2026-05-05 (2 days)
**Stats:** 87 commits, ~220 TypeScript source files, ~21,752 LOC, 644 automated tests

**Key accomplishments:**
- Schema enrichment (lore_notes, undercoat, purchase_date) + Battle Log CRUD (opponent faction, mission, result, army list linkage) + Analytics Core (hobby velocity, painting streak, spend trend chart)
- Hobby Goals: create goals with target dates, track progress via painting sessions, dashboard goal card with progress ring, completion celebrations, streak integration
- Display Features: Battle Ready collection filter preset, unit showcase mode with photo display
- Unit Point Calculator: per-model-count point tiers (unit_point_tiers table), wargear loadout selection with checkbox toggles (unit_loadout_wargear table), delta preview badge (+N green / -N red) in army list builder, COALESCE chain integration for effective_points
- Gap closure: timezone-safe todayISO() import, cache invalidation symmetry (delete→goal-progress, update→army-lists), purchase_date form field fully wired through Zod to mutation

**Archived:**
- Roadmap: `.planning/milestones/v0.2.2-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.2-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.2-MILESTONE-AUDIT.md`

---

## v0.2.3 Hobby Command Center (Shipped: 2026-05-05)

**Phases completed:** 5 phases (25-29), 21 plans
**Timeline:** 2026-05-04 → 2026-05-05 (2 days)
**Stats:** 117 commits, 189 TypeScript source files, 19,139 LOC, 86 test files, 114 v0.2.3-specific automated tests

**Key accomplishments:**
- Unified design system: semantic CSS tokens (Forge Black, Gunmetal, Panel Elevated, Battle Gold), shared PageHeader component on all 9 pages, enriched StatCard (icon/trend/progress), unified StatusBadge (4-tier color system for all 11 painting statuses)
- "Hobby Command Center" dashboard: CurrentFocusCard (active project with faction accent + next-action hint), HobbyPipeline (11-stage unit funnel), RecentActivityFeed (4 event types, live invalidation), LogSessionSheet, upgraded FactionSummaryCard (progress bar + battle-ready points)
- Global Quick Add: QuickAddContext provider, 8-action dropdown in sidebar (expanded + collapsed states), Sheet overlays from any page without navigation — covers Add Unit, Add Faction, Add Paint, Add Recipe, Create Project, Log Session, Add Purchase, Log Battle
- Collection + Projects upgrade: gallery photo thumbnails (asset:// URL from journal photos), StatusBadge in table and gallery (replacing PaintingRing), enriched kanban cards (last-updated, recipe name, photo count, next-action hint, Log Session shortcut via sibling portal)
- Workshop + Play layer: PaintRow color swatches, RecipeTable palette swatch strip (overlapping h-3 circles, +N overflow), ArmyListSummaryBar readiness panel (bg-battle-gold progress bar + not-ready unit list), BattleLogRow live readiness points (tabular-nums)

**Archived:**
- Roadmap: `.planning/milestones/v0.2.3-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.3-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.3-MILESTONE-AUDIT.md`

---

## v0.2.1 Visual Command (Shipped: 2026-05-04)

**Phases completed:** 8 phases (10–16 + 20), 41 plans
**Timeline:** 2026-05-03 → 2026-05-04 (2 days)
**Stats:** 395 automated tests passing post-Phase 20

**Key accomplishments:**
- CSS `@theme` faction-accent system (`ActiveFactionContext`, `--faction-accent`) — every accent shifts per selected faction with localStorage persistence; collapsible sidebar with `useSidebarCollapsed` icon-only mode and Radix Tooltip labels
- Animated stat counters (`useCountUp` rAF cubic ease-out, 600ms, prefers-reduced-motion gate) on Dashboard hero; faction-accented `FactionSummaryCard` with `ring-faction-accent` ring on active faction
- Card gallery view (`UnitGallery` + `PaintingRing` SVG, 96px) with `useCollectionViewMode` localStorage toggle — Zustand filters preserved on view switch
- Per-unit Hobby Journal: `painting_sessions` table (migration 005), `tauri-plugin-fs/dialog`, session log (newest-first) + 3-col photo timeline with stage labels, lightbox sibling Dialog in CollectionPage + DashboardPage, JOUR-06 disk cleanup on unit delete
- Spending Tracker: integer-pence discipline, `formatCurrency` as sole /100 site, `SpendingPage` with per-faction breakdown, 6 mutations invalidate `["spending-stats"]`
- Dual-DB Wahapedia integration: `bulk_sync_rules` Rust command, `useRulesSync` 7-CSV parallel fetch + transactional insert, `DatasheetPicker`, `DatasheetImportDialog`, full PlaybookTab (stats/abilities/keywords/sources/lore notes) — DS-01..12 all satisfied
- Geist Variable font via @fontsource-variable, text-3xl page headers + border-b hairline, icon-pill empty states across all 7 pages, tabular-nums everywhere, card elevation system (shadow-sm + hover:shadow-md)
- v0.2.1 gap closure (Phase 20): DS-08 secondary path (DashboardPage conflict dialog), FactionsEmptyState Shield icon-pill, PaintingProjectsPage controlled-props CTA lift, upsertSyncMeta dead export removed

**Archived:**
- Roadmap: `.planning/milestones/v0.2.1-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.1-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.1-MILESTONE-AUDIT.md`

---

## v0.1.1 HobbyForge MVP (Shipped: 2026-05-01)

**Phases completed:** 5 phases (1–5), 20 plans
**Timeline:** 2026-04-30 → 2026-05-01 (2 days)
**Stats:** 189 files changed, ~40,700 lines added, ~9,400 TypeScript LOC

**Key accomplishments:**
- Tauri 2 + React 19 + TypeScript desktop app: dark-mode sidebar, SQLite plumbing, TanStack Router/Query, all shadcn components batch-installed
- Full 10-table SQLite schema with FK enforcement, seed data (4 factions, 5 units, 6 paints, 3 recipes), and complete CRUD for factions/units/paints via typed query → hook → UI stack
- Collection page: TanStack Table, Zustand filter store (search/faction/status/category/active), optimistic status updates with rollback, 28 passing unit tests
- Painting Projects Kanban: @dnd-kit drag-and-drop with optimistic mutations + rollback, recipe builder with sortable step list and inline paint creation
- Live-computed Dashboard: 7 stat cards, faction summary cards with click-through filter, active projects + recently updated lists, 113 passing tests total

**Archived:**
- Roadmap: `.planning/milestones/v0.1.1-ROADMAP.md`
- Requirements: `.planning/milestones/v0.1.1-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.1.1-MILESTONE-AUDIT.md`

**Tech debt carried forward:**
- PROJ-02: REQUIREMENTS.md text still said "empty columns hidden" — KanbanBoard ships all 11 columns always (user-approved UX improvement). Update when planning next milestone.
- PaintingProjectsPage empty-state CTA uses fragile DOM query; replace with `useState` pattern.

---

## v0.2.0 Utility Layer (Shipped: 2026-05-03)

**Phases completed:** 4 phases (6–9), 20 plans
**Timeline:** 2026-05-01 → 2026-05-03 (3 days)
**Stats:** 74 automated tests, ~14,000+ TypeScript LOC

**Key accomplishments:**
- Phase 6 back-end foundation: migration 004 (8 ALTER TABLE ADD COLUMN on `unit_strategy_notes`), TypeScript types for all three v0.2.0 features, query modules (`armyLists.ts`, `strategyNotes.ts`), hook modules with DATA-09 forward-compat invalidation, 38 automated tests
- Phase 7 Paint Inventory: PaintsPage at `/paints` with brand/type/color-family multi-select filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge with navigation to `/recipes?paintId=X`, inline owned toggle with optimistic update
- Phase 8 Army List Builder: ArmyListsPage, CRUD sheets, UnitPickerDialog (multi-add, stays open), ArmyListDetailSheet with pinned summary bar (COALESCE effective_points in SQL), per-unit notes, UnitDeleteDialog army-list membership pre-check, sibling portal architecture confirmed
- Phase 9 Unit Playbook: PlaybookTab inside shadcn Tabs with 6-field stats block (M/T/Sv/W/Ld/OC, suffix display, pencil edit mode), abilities/keywords, 8 strategy note fields in fixed order, dirty-state Save with toasts, SQLite persistence round-tripped in live app

**Archived:**
- Roadmap: `.planning/milestones/v0.2.0-ROADMAP.md`
- Requirements: `.planning/milestones/v0.2.0-REQUIREMENTS.md`
- Audit: `.planning/milestones/v0.2.0-MILESTONE-AUDIT.md`

**Tech debt carried forward:**
- PINV-01 requirement text says `/paint-inventory` but implementation uses `/paints` (CONTEXT.md decision not reflected in requirements doc)
- STRAT-06 requirement text references wrong migration filename (002 vs 004)
- PaintingProjectsPage empty-state CTA uses fragile DOM query (carried from v0.1.1)

---

