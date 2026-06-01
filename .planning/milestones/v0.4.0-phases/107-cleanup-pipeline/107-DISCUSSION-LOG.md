# Phase 107: Cleanup & Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 107-cleanup-pipeline
**Areas discussed:** Rules data migration strategy, Datasheet query transition, Sync UI replacement, Dev-side update script
**Mode:** --auto (all decisions auto-selected)

---

## Rules Data Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Dead code removal | Delete all rw_* query modules and sync code — udb_* tables are the canonical replacement | ✓ |
| Gradual deprecation | Keep rules.db alive but mark as deprecated, redirect incrementally | |

**Auto-selected:** Dead code removal (recommended default)
**Notes:** Phase 103-106 established udb_* as the complete replacement. The rules.db infrastructure has 10 direct getRulesDb() call sites and 34 files referencing sync concepts — all can be cleaned up now.

---

## Datasheet Query Transition

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to udb_* queries | Playbook/datasheet features switch from datasheets.ts (rules.db) to unitDatabase.ts (hobbyforge.db) | ✓ |
| Keep datasheets.ts with new backend | Rewrite datasheets.ts to query hobbyforge.db udb_* tables instead of rules.db | |

**Auto-selected:** Redirect to udb_* queries (recommended default)
**Notes:** unitDatabase.ts already has equivalent query functions. Redirecting hooks to use the existing layer avoids duplication.

---

## Sync UI Replacement

| Option | Description | Selected |
|--------|-------------|----------|
| Simplified data version display | Replace sync controls with a data version indicator from udb_meta; "check for updates" shows if newer data is available | ✓ |
| Remove sync UI entirely | Delete Rules Hub sync section with no replacement — database browser IS the rules hub | |

**Auto-selected:** Simplified data version display (recommended default)
**Notes:** CLN-04 requires a "check for points updates" trigger. A lightweight version display satisfies this without the complexity of the full CSV sync pipeline.

---

## Dev-Side Update Script

| Option | Description | Selected |
|--------|-------------|----------|
| Diff report with manual review | Script re-runs build pipeline, produces diff of changes, developer reviews before committing | ✓ |
| Automated CI pipeline | GitHub Action that auto-scrapes and creates PRs with data updates | |

**Auto-selected:** Diff report with manual review (recommended default)
**Notes:** Offline-first philosophy — data updates ship with intentional app releases. Manual review ensures data quality.

---

## Claude's Discretion

- Rules Hub page strategy (merge into Database Browser or keep as redirect)
- DetachmentPicker approach when detachment data isn't in udb_*
- PlaybookSyncDetails component fate
- Cleanup migration numbering
- Test file cleanup strategy
- Build/update script consolidation

## Deferred Ideas

- EXT-03: Stratagems and detachment rules in canonical DB (existing v2 scope)
- Runtime data sync from CDN (contradicts offline-first)
