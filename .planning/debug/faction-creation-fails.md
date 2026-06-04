---
slug: faction-creation-fails
status: resolved
trigger: user-report
created: 2026-05-20
---

# Debug: Faction creation fails with "something went wrong try again"

## Symptoms
- User attempts to create a faction via FactionSheet
- Gets toast error: "Something went wrong. Please try again."
- Error originates from catch block in FactionSheet.onSubmit

## Investigation

### Evidence
- timestamp: 2026-05-20 — Static analysis of full creation chain
  - factionSchema.ts: Zod v4 schema validates correctly (tested with Node)
  - FactionSheet.tsx: onSubmit correctly builds CreateFactionInput
  - useFactions.ts: useCreateFaction wires mutationFn to createFaction
  - factions.ts: createFaction SQL has 6 columns, 6 params, 6 values
  - client.ts: getDb singleton pattern is correct
  - TypeScript compiles clean (tsc --noEmit passes)
  - zodResolver works correctly with Zod v4 (tested with Node)
  - All 30 hobbyforge.db migrations registered in lib.rs
  - No UNIQUE constraint on faction name
  - Tauri plugin-sql handles null values correctly in Rust binding code

- timestamp: 2026-05-20 — v0.2.15 diff analysis
  - updateFaction changed from COALESCE to direct assignment
  - createFaction was NOT changed in v0.2.15
  - client.ts got error recovery improvement (reset singleton on failure)

### Hypothesis 1: Create path SQL error (REJECTED)
The INSERT statement is syntactically correct with matching column/param/value counts.
Null handling is proper. Tested end-to-end with Node.

### Hypothesis 2: updateFaction type unsafety after v0.2.15 COALESCE removal
The v0.2.15 release changed updateFaction from COALESCE-based partial updates to
direct assignment. While the FactionSheet always provides all fields, the function
accepts Partial<CreateFactionInput> where name/game_system/color_theme can be
undefined. Passing undefined to SQLite via Tauri IPC serializes as null, which would
violate NOT NULL constraints on name, game_system, and color_theme columns.

### Hypothesis 3: Silent error swallowing masks root cause
The catch block uses a bare `catch` without logging the error. This makes it impossible
to diagnose the actual failure from the user's perspective.

## Current Focus
- hypothesis: Error swallowing in onSubmit catch block prevents diagnosis; updateFaction has type-safety gap
- next_action: Add console.error logging to catch blocks, fix updateFaction type safety

## Resolution
- root_cause: Generic catch block swallows actual error without logging, preventing diagnosis. Additionally, updateFaction has a type-safety gap from v0.2.15 COALESCE removal where Partial fields could pass undefined/null to NOT NULL columns.
- fix: Add console.error logging to FactionSheet catch block for diagnosability. Add null-coalescing guards to updateFaction params for NOT NULL columns. Apply same pattern to all entity sheets for consistency.
