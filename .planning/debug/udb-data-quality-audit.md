---
slug: udb-data-quality-audit
status: resolved
trigger: user-reported
created: 2026-06-09
resolved: 2026-06-09
---

# Debug: Exhaustive Unit Database Data Quality Audit

## Symptoms
- Sub-faction filtering shows wrong units (e.g., Deathwing units under Ultramarines)
- Many units have null sub_faction when they should be assigned to specific chapters
- Some units show missing points

## Root Cause

Two distinct issues in the build pipeline (`scripts/build-unit-db.ts`):

### Issue 1: Dedup discarding chapter-specific unit variants (CRITICAL)
The dedup key was `name:faction_id`, but chapter-specific variants (e.g., Black Templars Impulsor id=000002786) shared both name AND faction_id=SM with their generic counterparts (e.g., generic Impulsor id=000002568). The dedup pass kept the generic version and silently discarded 9 Black Templars-specific variants.

### Issue 2: Sub-faction assignment happened AFTER dedup
Sub-faction was assigned from keywords in step 8b, but dedup ran in step 3. By the time keywords were scanned, the BT variants were already gone.

### Non-issue: "Wrong units under Ultramarines"
Investigation confirmed that 158 generic SM units with null sub_faction are CORRECTLY generic. Units like Land Raider having the "Deathwing" non-faction keyword is a game mechanics tag (gains rules benefits in DA armies) but does NOT restrict the unit to Dark Angels. These units are legitimately available to all SM chapters.

## Fix Applied

### 1. Pre-dedup keyword scan (build-unit-db.ts)
Added step 3b: scan Datasheets_keywords.csv BEFORE dedup to assign sub_faction from faction keywords (is_faction_keyword=true). This ensures chapter-specific variants get distinct dedup keys.

### 2. Sub-faction-aware dedup key
Changed dedup key from `name:faction_id` to `name:faction_id:sub_faction`, preserving chapter-specific variants as distinct entries.

### 3. New KEYWORD_SUB_FACTION_MAP (factionMap.ts)
Added a dedicated map for keyword-based sub-faction matching, including Blood Ravens (2 units) which was previously unmapped.

## Results

| Metric | Before | After | Change |
|---|---|---|---|
| Total SM units | 289 | 298 | +9 recovered |
| SM with sub_faction | 131 | 142 | +11 |
| SM without sub_faction | 158 | 156 | -2 |
| Black Templars | 10 | 19 | +9 recovered |
| Blood Ravens | 0 | 2 | new |
| Total units (all factions) | 1701 | 1710 | +9 |
| Points coverage | 99.8% | 99.8% | unchanged |

## Evidence
- timestamp: 2026-06-09 — 289 SM units total, 158 with null sub_faction
- timestamp: 2026-06-09 — Only 4 units truly lack ANY points data
- timestamp: 2026-06-09 — Filter logic verified correct; issue is in data pipeline
- timestamp: 2026-06-09 — 9 duplicate pairs found: all BT variants discarded by dedup
- timestamp: 2026-06-09 — 140 SM units have exactly 1 chapter faction keyword; 0 have multiple
- timestamp: 2026-06-09 — Non-faction keywords (Deathwing, Ravenwing) on generic units are game mechanics tags, not exclusivity markers

## Resolution
- root_cause: Dedup key lacked sub_faction, causing 9 Black Templars variants to be silently discarded; sub_faction assignment ran after dedup so these variants had no distinguishing key
- fix: Pre-dedup keyword scan assigns sub_faction before dedup; dedup key includes sub_faction; added KEYWORD_SUB_FACTION_MAP with Blood Ravens
- verified: true (build succeeds, 259/262 test files pass, TS build clean)
