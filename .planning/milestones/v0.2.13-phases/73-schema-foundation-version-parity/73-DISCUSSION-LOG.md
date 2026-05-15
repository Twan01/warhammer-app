# Phase 73: Schema Foundation + Version Parity - Discussion Log

**Date:** 2026-05-14
**Mode:** --auto (fully autonomous)
**Duration:** Single pass

## Areas Discussed

### 1. unit_rules_mapping Table Design
- **Options presented:** Column set with FK/UNIQUE constraints
- **Selected:** [auto] unit_id FK + rules_datasheet_id TEXT + match_status + source + timestamps, UNIQUE on unit_id, ON DELETE CASCADE (recommended default)
- **Rationale:** Follows cross-DB TEXT reference pattern (weapon_name, detachment_name). Single mapping per unit matches Phase 76 requirements.

### 2. battle_logs After-Action Columns
- **Options presented:** New ALTER TABLE columns for after-action data
- **Selected:** [auto] forgotten_rules (JSON TEXT), mvp_notes, underperformer_notes, promoted_to_reminder (boolean 0|1) (recommended default)
- **Rationale:** JSON array for forgotten_rules avoids junction table overhead for personal tool. Reuses existing mvp/underperformer FKs with added free-text notes.

### 3. Version Parity Script
- **Options presented:** Node script vs shell script
- **Selected:** [auto] Node script at scripts/check-version.mjs (recommended default)
- **Rationale:** Node already in toolchain, cross-platform, native JSON parsing. Registered as pnpm check:version.

## Deferred Ideas

None.

## Claude's Discretion Items

- Migration file naming convention
- Column ordering within migrations
- Script error message formatting

---

*Phase: 73-Schema Foundation + Version Parity*
*Log created: 2026-05-14*
