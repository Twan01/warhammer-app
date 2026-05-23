# Phase 99: Architecture Cleanup - Discussion Log

**Date:** 2026-05-22
**Mode:** --auto (fully autonomous)
**Duration:** Single pass

## Areas Discussed

### 1. Query-Layer Dependency Cleanup (ARCH-01)
**Question:** How to relocate feature imports from src/db/queries/?
**Options:** Move pure logic to src/lib/ + types to src/types/ | Inline logic into query files | Create a shared/ intermediate layer
**Selected:** Move pure logic to src/lib/, types to src/types/ (recommended default)
**Rationale:** Follows existing project conventions — src/lib/ already has pure utilities, src/types/ already has shared type definitions. Clean separation with no new abstraction layers.

### 2. PlaybookTab Decomposition (ARCH-02)
**Question:** How to split the 1431-line PlaybookTab?
**Options:** Split by visual section (5 sub-components) | Split by data domain (stats vs rules vs strategy) | Extract only largest sections
**Selected:** Split by visual section into 5 sub-components (recommended default)
**Rationale:** Visual sections map naturally to the rendered UI and each section has distinct state and data needs. Existing extractions (LoadoutSection, DatasheetPicker, TierManager) already follow this pattern.

### 3. UnitSheet Decomposition (ARCH-03)
**Question:** How to split the 688-line form?
**Options:** Extract required + optional form sections | Extract by field group | Extract form logic to custom hook
**Selected:** Extract required fields section + optional collapsible section (recommended default)
**Rationale:** UnitSheet already has a clear visual split between required fields and a collapsible optional section. Two extraction targets bring each file well under 200 lines.

### 4. ArmyListsPage State Machine (ARCH-04)
**Question:** State consolidation approach?
**Options:** useReducer with discriminated union | XState state machine | Zustand store | Combined useState with helper functions
**Selected:** useReducer with discriminated union actions (recommended default)
**Rationale:** The 14 useState calls are simple open/close toggles and entity selections — useReducer handles this cleanly without adding a library dependency. State transitions are straightforward enough that a full state machine (XState) would be over-engineering.

## Deferred Ideas

None.

## Claude's Discretion Items

- Exact file names for extracted PlaybookTab sub-components
- useFormContext vs direct form prop for UnitSheet sub-components
- handleSave extraction strategy in PlaybookTab
- Reducer action ordering and grouping

---

*Log generated: 2026-05-22 (--auto mode)*
