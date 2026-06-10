# Phase 123: Hobby Defaults Tab - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 123-Hobby Defaults Tab
**Areas discussed:** Pipeline Stage Labels Storage, Pipeline Stage Labels Propagation, Checklist Items Storage & Editor, Mission Format Default
**Mode:** --auto (all decisions auto-selected)

---

## Pipeline Stage Labels Storage

| Option | Description | Selected |
|--------|-------------|----------|
| JSON map in app_settings | Store overridden labels as JSON object mapping default names to custom labels | ✓ |
| Separate settings rows | One app_settings row per stage label | |
| New DB table | Dedicated pipeline_labels table with foreign keys | |

**Auto-selected:** JSON map in app_settings (recommended default)
**Notes:** Preserves PAINTING_STATUS_ORDER as internal source of truth. Only stores overrides, not all 11 labels.

---

## Pipeline Stage Labels Propagation

| Option | Description | Selected |
|--------|-------------|----------|
| Utility function + useAppSettings | Label resolver function called at each consuming component | ✓ |
| React Context provider | Dedicated PipelineLabelsContext wrapping the app | |
| Computed in Zustand store | Merge labels into a Zustand store consumed by components | |

**Auto-selected:** Utility function + useAppSettings (recommended default)
**Notes:** React Query already caches settings globally. No new provider needed. SC-1 references "5 pipeline stage labels" — these map to the 5 bucket labels in HobbyPipeline, not all 11 statuses.

---

## Checklist Items Storage & Editor

| Option | Description | Selected |
|--------|-------------|----------|
| JSON array in app_settings + inline editor | Store as JSON array, edit with add/remove/reorder list UI | ✓ |
| Dedicated DB table | checklist_defaults table with ordering column | |
| Simple textarea | Store as newline-delimited text, one item per line | |

**Auto-selected:** JSON array in app_settings + inline editor (recommended default)
**Notes:** Matches existing ChecklistTab pattern. IDs generated at session-init, not stored. Falls back to DEFAULT_CHECKLIST when no custom value exists.

---

## Mission Format Default

| Option | Description | Selected |
|--------|-------------|----------|
| Simple text input pre-fill | Store string in app_settings, pre-fill new battle log mission field | ✓ |
| Dropdown with presets | Predefined list of mission formats with "Other" option | |

**Auto-selected:** Simple text input pre-fill (recommended default)
**Notes:** Mission field is already free-text. Adding a dropdown would be scope creep (new enum/data type). Simple pre-fill matches the existing UX.

---

## Claude's Discretion

- Component file organization within settings feature module
- Whether pipeline label fields use inline editing or form with Save button
- Exact layout and spacing of hobby defaults section
- Zustand store async read strategy from settings

## Deferred Ideas

None — discussion stayed within phase scope
