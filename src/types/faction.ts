/**
 * Faction entity (DATA-06, FACT-01..05).
 * Mirrors the factions table in 001_core_schema.sql.
 */
export interface Faction {
  id: number;
  name: string;
  game_system: string;
  description: string | null;
  color_theme: string;
  icon_path: string | null;
  lore_notes: string | null;    // migration 008 — Phase 17 ENRCH-01
  created_at: string;
  updated_at: string;
}

export type CreateFactionInput = Omit<Faction, "id" | "created_at" | "updated_at">;
export type UpdateFactionInput = Partial<CreateFactionInput> & { id: number };
