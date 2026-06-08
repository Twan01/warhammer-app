/**
 * Phase 120 — Game data type definitions.
 *
 * TypeScript interfaces for udb_stratagems, udb_enhancements,
 * udb_detachments, and udb_detachment_abilities (migrations 042 + 043).
 * Field names match SQLite column names exactly.
 */

export interface UdbStratagem {
  id: string;
  faction_id: string | null;
  detachment_id: string | null;
  name: string;
  type: string | null;
  cp_cost: number;
  turn: string | null;
  phase: string | null;
  description: string;
}

export interface UdbEnhancement {
  id: string;
  faction_id: string;
  detachment_id: string | null;
  name: string;
  cost: number;
  description: string;
}

export interface UdbDetachment {
  id: string;
  faction_id: string;
  name: string;
}

export interface UdbDetachmentAbility {
  id: string;
  detachment_id: string;
  faction_id: string;
  name: string;
  description: string | null;
}

export interface UdbDetachmentAbilityWithDetachment extends UdbDetachmentAbility {
  detachment_name: string;
}
