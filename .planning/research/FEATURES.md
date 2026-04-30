# Feature Research

**Domain:** Warhammer 40K hobby management — collection tracking, painting progress, paint recipes, paint inventory
**Researched:** 2026-04-30
**Confidence:** MEDIUM-HIGH (ecosystem well-surveyed; personal-tool nuances inferred from community patterns)

---

## Existing Tools Surveyed

| Tool | Type | Core Strength | Notable Gap |
|------|------|---------------|-------------|
| **Pile of Potential** | Web app, free | Simple unit-level painting stage tracking, points, project sharing | No paint inventory, no recipes, online-only |
| **Figure Case** | iOS/Android | Collection org by faction, configurable stage workflow, iCloud sync | Mobile-only, no paint/recipe integration |
| **Liber Pigmenta** | iOS/Android | Full-featured: Kanban, 3500+ paint DB, recipe wizard, army readiness, community hub | Requires account, cloud-dependent, gamification bloat |
| **paintRack** | iOS/Android | 27,000+ paint DB, barcode scan, wishlist, sets (recipes) | Paint-focused only, no collection/project tracking |
| **Brushrage** | iOS/Android | Timers, 15,000+ paints, barcode scan, paint mixing, photo-to-paint color ID | Complex, mobile-only, no collection/army integration |
| **ArmyCrafter** | Web | Community-shared paint recipes with step-by-step, paint equivalents | Social/community tool, not personal collection tracker |
| **PaintMyMinis** | iOS/Android | Color wheel planning, technique tracking, ratios, sharing | No collection tracking, no painting stage workflow |
| **BattleScribe** | iOS/Android/Web | Comprehensive army list builder with official rules validation | Rules/list only — no hobby/painting tracking at all |
| **New Recruit** | Web/Android | Modern BattleScribe alternative, official data, points, tournament org | Rules/list only — no hobby/painting tracking |
| **GW Citadel Colour App** | iOS/Android | Official GW paint guides, step-by-step per model with official schemes | Not updated for recent models, no collection tracking, no recipe customization |
| **Warhammer 40K Official App** | iOS/Android | Datasheets, rules, army builder | Paid subscription, no hobby tracking, copyright-constrained for us |
| **Notion/Trello templates** | Generic | Flexible, Kanban for painting stages, free-form notes | No paint DB, no data model, no aggregated stats, requires manual setup |
| **Spreadsheet (Excel/Sheets)** | Generic | Total flexibility, offline | No UX, no visual progress, manual everything |

**Key insight from the survey:** No single existing tool covers the full personal hobby lifecycle — collection + painting stages + paint recipes linked to owned paints + army readiness — in a local, offline, no-account desktop app. The closest all-in-one is Liber Pigmenta, but it is mobile, account-required, cloud-dependent, and community-oriented. HobbyForge's differentiation is the integration of these pillars in a local-first, private, desktop tool.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken.

| Feature | Why Expected | Complexity | v1 MVP? | Notes |
|---------|--------------|------------|---------|-------|
| Unit CRUD (add/edit/delete unit with faction, category, model count) | Every tracker does this; it's the atom of the domain | LOW | YES (Phase 1-2) | Must include faction association |
| Painting status stages per unit (Not Started → Built → Primed → Basecoated → Shaded → Highlighted → Based → Varnished → Done) | Pile of Potential, Figure Case, Liber Pigmenta all have this; hobbyists think in stages | LOW | YES (Phase 1-3) | Multi-stage, not a single checkbox |
| Manual painting percentage field | Users want numeric progress visible; progress bars are expected | LOW | YES (Phase 1-3) | Companion to status, not replacement |
| Filter/search collection by faction, status, category | With 50+ units, unfiltered list is unusable | MEDIUM | YES (Phase 2) | Faction + painting status are the two critical filters |
| Active project flag per unit | Core workflow: "what am I working on right now" | LOW | YES (Phase 2-3) | Boolean flag; drives Painting Projects view |
| Painting Projects view (Kanban grouped by status, showing active projects only) | Kanban is the standard mental model; Liber Pigmenta, Pile of Potential, Trello templates all use it | MEDIUM | YES (Phase 3) | Kanban by painting stage, not arbitrary columns |
| Faction CRUD | All trackers organize by faction/army | LOW | YES (Phase 1) | Name + color theme minimum |
| Paint CRUD (brand, name, type, owned flag) | Paint inventory is expected by hobbyists; paintRack proves the demand | LOW | YES (Phase 1) — UI deferred to Phase 4 | Schema in v1; dedicated UI page deferred |
| Running-low and wishlist flags on paints | Core workflow: standing in a shop, what do I need? | LOW | YES (Phase 1) — UI deferred Phase 4 | Two boolean fields; critical for paint management usefulness |
| Painting recipe CRUD (step-by-step per area, linked to faction/unit) | Hobbyists repeatedly cite recipe storage as a core need — GW Citadel app, ArmyCrafter, PaintMyMinis all exist just for this | MEDIUM | YES (Phase 3) | Steps by stage (primer, basecoat, shade, layer, highlight, basing) |
| Recipe-to-paint linkage | "Which paints do I need for this recipe?" is a primary question; Liber Pigmenta's selling point | MEDIUM | YES (Phase 3) | Join table with step name and order |
| Points value per unit (manually entered) | Every tracker includes it; army readiness is points-based | LOW | YES (Phase 1-2) | Manual entry — never GW data |
| Data persists after app restart | Baseline expectation for any app | LOW | YES (Phase 0-1) | SQLite local file; non-negotiable |
| Dark mode UI | Hobby apps universally dark-themed; bright white feels wrong in this aesthetic | LOW | YES (Phase 0) | Dark-mode-first, not a toggle afterthought |
| Empty states with guidance | Without seed data or prompts, empty screens feel abandoned | LOW | YES (Phase 2-3) | "Add your first unit" style messaging |
| Delete confirmation modals | Accidental deletion of a unit with recipes attached is catastrophic in a personal DB | LOW | YES (Phase 2-3) | Standard UX safety net |

### Differentiators (What Makes HobbyForge Actually Pleasant)

Features that set HobbyForge apart within its personal-tool positioning. Not universally present in competing tools.

| Feature | Value Proposition | Complexity | v1 MVP? | Notes |
|---------|-------------------|------------|---------|-------|
| Recipe steps linked to owned/unowned paints with visual indicators | Liber Pigmenta does this but requires cloud account; HobbyForge is local | MEDIUM | YES (Phase 3) | "You don't own Nuln Oil" warning in recipe view is high value |
| Painting Projects Kanban filtered to active-only | Most trackers show all units; showing only active projects removes noise | LOW | YES (Phase 3) | Filter is the key — same Kanban, different lens |
| Faction-colored accents in UI | Visual identity tied to your actual armies; no other local tool does this | LOW | YES (Phase 0-1) | color_theme field on Faction; apply as sidebar/card accent |
| All-in-one scope: collection + painting + recipes + paints in one local DB | Competing tools are siloed: paintRack (paints only), Pile of Potential (status only), Notion (manual, no model) | HIGH | YES — core thesis | This integration IS the product |
| Quick status update from collection table (no full-page nav) | Hobbyists update status frequently; requiring 3 clicks kills the habit | LOW | YES (Phase 2) | Inline dropdown or drawer quick-update |
| Progress bars per unit and per faction aggregate | Visible progress is motivational; most tools show it at project level, not faction level | LOW | YES (Phase 2-3) | Percentage painted by points per faction is high-signal |
| Unit notes with "lessons learned" field | Painting mistakes specific to a unit/scheme; no current tool integrates this with the recipe | LOW | YES (Phase 3) | Free text; lives on unit or recipe, not separate page in v1 |
| Tutorial link field per recipe | Hobbyists link YouTube videos to their recipe for reference; no local tool stores this alongside the recipe | LOW | YES (Phase 3) | URL field, just a hyperlink |
| Seed data that demonstrates real factions (T'au, Ultramarines, Necrons, Tyranids) | Cold start problem is severe for personal tools; pre-populated data makes value immediately visible | LOW | YES (Phase 1) | Seed script, not production data |
| Assembly + primed + based + varnished as separate boolean status fields | Other tools collapse to 4-5 stages; granular fields let you answer "what's assembled but not primed" | LOW | YES (Phase 1-2) | Separate columns, aggregated in progress bar |

### Anti-Features (Deliberately NOT Building)

Features to explicitly exclude, with rationale.

| Anti-Feature | Why Requested | Why Excluded | What to Do Instead |
|--------------|---------------|--------------|-------------------|
| Official GW rules, datasheets, points values | Army builders show official data | Hard legal constraint (GW copyright) — distributing copyrighted rules risks DMCA/legal action; GW has pursued this | User manually enters points; allow free-text rules reference field ("see Codex p.42") |
| Rules validation (legal list building, detachment rules, enhancement limits) | BattleScribe does this, users want assurance their list is legal | Requires official data (copyright); brittle against every balance update; wrong scope — HobbyForge is hobby tracking, not competitive tool | Link field per list to external tool (New Recruit, official app) |
| Cloud sync / accounts / multi-device | Convenience for mobile users | Contradicts local-first, no-account design; adds auth surface, server costs, data liability for a personal tool | SQLite file is portable; manual backup/export in Phase 9 |
| Social features (public profiles, sharing, community leaderboards) | Liber Pigmenta has these; some users enjoy accountability | Personal-tool scope; adds server, moderation, auth, user management — all out of scope | Share = export to JSON or PDF (Phase 9+) |
| AI recipe generator / "what should I paint next" engine | Genuinely appealing; Brushrage has color-from-photo | V3 territory — requires model integration (API cost, privacy trade-off, complexity); ship functional basics first | Manual notes and recipe building; revisit in V3 |
| Barcode scanning for paints | paintRack has this; fast inventory setup | Requires camera hardware API (Tauri plugin), barcode DB, ongoing paint DB maintenance — disproportionate complexity for v1 | Manual paint entry with brand/name/type fields |
| Cross-brand paint equivalents | Useful when substituting paints | Requires a curated DB of 27,000+ paints and equivalence mapping — significant ongoing data work | User can note substitutes in recipe step notes field |
| Photo timelines / progress photo gallery | Visual "before/after" is motivational | No image storage in v1 — filesystem integration, thumbnail generation, storage management add scope | Deferred to Phase 8; schema supports it (ImageAsset table) |
| Battle logs with analytics | Useful feedback loop after games | Phase 7 — deferred from v1 cut; army list builder (Phase 5) is prerequisite | Schema exists; UI deferred |
| Mobile companion app | Convenient at the painting desk | Desktop-only for v1; Tauri cross-platform is possible later but adds packaging, testing, platform-specific UX work | Windows desktop only in v1 |
| Hobby calendar / painting streaks / gamification | Liber Pigmenta and Hobby Streak do this; motivational | Complexity without core-value payoff for a personal tool; streak mechanics require date-tracking infra | Active project flag + progress bars provide motivation without gamification overhead |
| Import from BattleScribe / New Recruit | Re-use existing lists | BattleScribe .ros format contains GW data (rules, datasheets) — importing risks importing copyrighted data; format also brittle | User manually builds army lists in HobbyForge from their collection |
| Competitive tournament organization | Game Fortress has this | Wrong audience; HobbyForge is for the collector/painter, not the competitive player | Explicitly out of scope; refer to New Recruit/Tabletop.to |

---

## Feature Dependencies

```
Factions CRUD
    └──required by──> Units CRUD
                          └──required by──> Collection Page (search/filter)
                          └──required by──> Painting Projects Page (Kanban)
                          └──required by──> Army List Builder (Phase 5+)
                          └──required by──> Battle Logs (Phase 7+)

Paints CRUD
    └──required by──> Recipe-Paint Linkage
                          └──required by──> Recipe Detail (show owned/missing paints)
                          └──required by──> Paint Inventory Page (Phase 4)

Painting Recipes CRUD
    └──required by──> Recipe-Paint Linkage
    └──enhanced by──> Unit association (recipe linked to specific unit)
    └──enhanced by──> Faction association (recipe linked to faction scheme)

Units CRUD (with status fields)
    └──required by──> Painting Projects Kanban (active flag + status = Kanban cards)
    └──required by──> Progress bars (painting_percentage aggregation)
    └──required by──> Army List Builder (units selected into lists)

Army List Builder (Phase 5)
    └──required by──> Battle Log army list linkage (Phase 7)

Strategy Notes (Phase 6)
    └──required by──> Battle Log MVP/underperforming unit notes (Phase 7)

Image Assets schema (Phase 1)
    └──required by──> Photo upload UI (Phase 8)
    -- schema in v1, UI deferred --

Backup/Export (Phase 9)
    └──no upstream dependency, standalone
```

### Key Dependency Notes

- **Paints CRUD must precede recipe-paint linkage:** You cannot link a recipe step to a paint that does not exist in the DB. Paints schema and basic CRUD are v1 Phase 1 even though the dedicated Paint Inventory UI page is deferred to Phase 4.
- **Recipes are meaningless without factions/units:** A recipe is always anchored to a scheme for a faction or unit. Faction + Unit CRUD must be stable before recipe creation UX is built.
- **Active project flag on units drives the Painting Projects page:** The Kanban is a filtered view, not a separate data model. Status field + is_active_project boolean = the entire data requirement for Phase 3 Kanban.
- **Army List Builder (Phase 5) has no v1 dependency:** Schema can be included in the full migration in Phase 1, but the UI is independent of collection and painting workflow. This is why it safely defers.

---

## MVP Definition

### v1 Launch (Phases 0-3)

Minimum viable cut — collection and painting workflow only.

- [x] **App shell with sidebar navigation** — entry point; nothing works without it
- [x] **SQLite schema (all tables including deferred features)** — schema is cheap to create upfront; avoids migrations later
- [x] **Faction CRUD** — organizational root node; all units belong to a faction
- [x] **Unit CRUD with all status fields** — assembly, painting, basing, varnished, percentage, active flag, points, notes
- [x] **Collection page: searchable, filterable table/grid** — faction + status filters are mandatory; category filter is value-add
- [x] **Unit detail view with quick status update** — drawer or page; status changes must be fast (1-2 clicks)
- [x] **Paint CRUD (brand, name, type, color family, owned, running-low, wishlist)** — schema + basic UI; dedicated inventory page deferred
- [x] **Painting recipe CRUD with step fields and faction/unit linkage** — step fields per stage (primer, base, shade, layer, highlight, basing, notes)
- [x] **Recipe-paint join table (paints linked to recipe steps)** — the linking is v1; the "missing paint" indicator is v1
- [x] **Painting Projects page (Kanban, active projects only)** — filter to is_active_project=true, group cards by painting_status
- [x] **Status progression interactions (move unit between stages from Kanban)** — drag-and-drop or quick-update button
- [x] **Progress bars per unit (painting percentage) and per faction (aggregate)** — motivation layer; computed from existing fields
- [x] **Seed data (4 factions, sample units, paints, recipes)** — eliminates cold-start problem
- [x] **Dark-mode-first UI consistent with hobby aesthetic** — non-negotiable visual baseline
- [x] **Data persistence across restarts** — SQLite local file; foundational

### v1.x / Phase 4 (Next Milestone After v1)

Add once core workflow is stable.

- [ ] **Dedicated Paint Inventory page** — table with brand/type/color-family filters, running-low view, wishlist view, "used in recipes" back-link
- [ ] **"Used in recipes" back-link from paint to recipes** — shows which recipes depend on a given paint; high value once paint list grows

### v2 / Phases 5-7

- [ ] **Army List Builder** — create lists from collection, manual points, painted readiness %, list type tags (Casual/Learning/Narrative)
- [ ] **Strategy / unit tactical notes** — per-unit role, strengths, weaknesses, synergies, rules reference; integrates into unit detail
- [ ] **Battle Log** — game history, result, MVP unit, lessons learned, linked to army list
- [ ] **Basic battle analytics** — win/loss/draw, most-used list, frequent MVPs

### v3 / Phases 8-9+

- [ ] **Photo upload and progress timelines** — local filesystem storage, thumbnail generation, image gallery per unit
- [ ] **Backup / JSON export / JSON import** — data durability; export for portability
- [ ] **Settings page** — theme, data folder path, app preferences
- [ ] **AI features** — recipe generator, "what should I paint next", battle summarizer — V3 territory, requires significant design work

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Phase | Priority |
|---------|------------|---------------------|-------|----------|
| Unit CRUD | HIGH | LOW | 1-2 | P1 |
| Faction CRUD | HIGH | LOW | 1 | P1 |
| Painting status stages | HIGH | LOW | 1-3 | P1 |
| Collection search/filter | HIGH | MEDIUM | 2 | P1 |
| Active project Kanban | HIGH | MEDIUM | 3 | P1 |
| Painting recipe CRUD | HIGH | MEDIUM | 3 | P1 |
| Recipe-paint linkage | HIGH | MEDIUM | 3 | P1 |
| Paint CRUD (schema + basic) | HIGH | LOW | 1 | P1 |
| Progress bars | MEDIUM | LOW | 2-3 | P1 |
| Seed data | MEDIUM | LOW | 1 | P1 |
| Dark mode UI | MEDIUM | LOW | 0 | P1 |
| Quick status update (inline) | HIGH | LOW | 2 | P1 |
| Unit detail view | MEDIUM | MEDIUM | 2 | P1 |
| Tutorial links on recipes | MEDIUM | LOW | 3 | P1 |
| Lessons learned notes | MEDIUM | LOW | 3 | P1 |
| Paint Inventory page | HIGH | MEDIUM | 4 | P2 |
| Running-low / wishlist UI | HIGH | LOW | 4 | P2 |
| Army List Builder | MEDIUM | HIGH | 5 | P2 |
| Strategy notes | MEDIUM | MEDIUM | 6 | P2 |
| Battle log | MEDIUM | MEDIUM | 7 | P2 |
| Photo timelines | LOW | HIGH | 8 | P3 |
| Backup / export | HIGH | MEDIUM | 9 | P2 (safety) |
| AI features | MEDIUM | HIGH | V3 | P3 |
| Barcode scanning | LOW | HIGH | never | excluded |
| Social / sharing | LOW | HIGH | never | excluded |

---

## Competitor Feature Analysis

| Feature | Pile of Potential | Liber Pigmenta | Figure Case | paintRack | HobbyForge v1 |
|---------|------------------|----------------|-------------|-----------|---------------|
| Unit collection tracking | Yes | Yes | Yes | No | Yes |
| Painting stage Kanban | Partial (list view) | Yes (6-col) | Partial (linear) | No | Yes (8-stage) |
| Paint inventory | No | Yes (3500+ DB) | No | Yes (27k DB) | Yes (manual) |
| Paint wishlist | No | Yes | No | Yes | Yes |
| Painting recipes | No | Yes (guided wizard) | Notes only | Sets (basic) | Yes (full step fields) |
| Recipe-paint linkage | No | Yes | No | No | Yes |
| Army list builder | Points only | Yes (official DB) | No | No | Deferred (Phase 5) |
| Local / offline | No (web) | No (account req) | iCloud sync | iCloud sync | Yes — fully local |
| No account required | Yes (public) | No | No | No | Yes — no account |
| Desktop app | No | No | No | No | Yes (Windows) |
| Faction-colored UI | No | Partial | No | No | Yes |
| Progress bars / stats | Project-level % | Yes | Partial | No | Yes (unit + faction) |
| Seed/demo data | No | No | No | No | Yes |
| Battle log | No | No | No | No | Deferred (Phase 7) |

---

## Sources

- Pile of Potential: https://www.wargamer.com/warhammer-40k/pile-of-potential-app — April 2025 review (MEDIUM confidence, single review source)
- Liber Pigmenta feature audit: https://www.liberpigmenta.com/ — fetched April 2026 (HIGH confidence, official site)
- Figure Case: https://apps.apple.com/us/app/figure-case-hobby-progress/id1487460834 — App Store listing (MEDIUM confidence)
- paintRack review: http://www.warbard.ca/2024/12/11/the-paintrack-app-a-short-review/ and https://www.nerdlegion.net/post/paintrack-the-ultimate-phone-app-for-organizing-paints-and-doing-comparisons (MEDIUM confidence)
- ArmyCrafter: https://armycrafter.com/ — recipe sharing platform (MEDIUM confidence, official site)
- GW Citadel Colour App: https://citadelcolour.com/citadel-colour-the-app/ and https://ageofminiatures.com/citadel-colour-app-review/ (MEDIUM confidence)
- BattleScribe / New Recruit: https://spikeybits.com/battlescribe-alternative-warhammer-40k-10th-edition-army-list-builder-apps/ (MEDIUM confidence)
- Goonhammer project management: https://www.goonhammer.com/project-management-in-warhammer-taking-your-work-home-with-you/ (MEDIUM confidence)
- Notion templates: https://www.notion.com/templates/simple-miniature-painting-progress-tracker (LOW confidence — observed demand, not authoritative)

---
*Feature research for: HobbyForge — Warhammer 40K hobby management desktop app*
*Researched: 2026-04-30*
