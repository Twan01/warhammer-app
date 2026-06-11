# Phase 125: About Tab - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 125-About Tab
**Areas discussed:** Content layout, Data stats scope, Credits & attribution, Component strategy
**Mode:** --auto (all decisions auto-selected)

---

## Content Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked sections | Three vertical sections: identity, stats, credits | ✓ |
| Card grid | Each section in its own Card component | |
| Single-card compact | All info in one dense card | |

**Auto-selected:** Stacked sections (recommended default)
**Notes:** Vertical flow matches settings tab simplicity. No card wrappers needed — tab content area provides structure.

---

## Data Stats Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Match requirements exactly | Unit count, faction count, Wahapedia data date | ✓ |
| Extended stats | Add schema version, diagnostic flags | |

**Auto-selected:** Match requirements exactly (recommended default)
**Notes:** Schema version and diagnostics belong on Data Health page, not About tab.

---

## Credits & Attribution

| Option | Description | Selected |
|--------|-------------|----------|
| Wahapedia + tech stack | Attribution line + compact tech list | ✓ |
| Wahapedia only | Just the data source credit | |
| Full credits page | Detailed attribution with links | |

**Auto-selected:** Wahapedia + tech stack (recommended default)
**Notes:** Desktop app — no clickable links needed. Keep compact.

---

## Component Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Build fresh, reuse hooks | New AboutTab component, same data hooks | ✓ |
| Reuse VersionInfoCard | Import and adapt existing component | |

**Auto-selected:** Build fresh, reuse hooks (recommended default)
**Notes:** VersionInfoCard is coupled to data-health card layout. Better to build purpose-built component reusing getVersion() and useUdbMeta().

---

## Claude's Discretion

- Attribution text wording
- Typography choices
- Whether to show game system label
- Loading skeleton layout

## Deferred Ideas

None — discussion stayed within phase scope
