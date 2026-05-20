import { getDb } from "@/db/client";
import type { Faction, CreateFactionInput, UpdateFactionInput } from "@/types/faction";

export async function getFactions(): Promise<Faction[]> {
  const db = await getDb();
  return db.select<Faction[]>("SELECT * FROM factions ORDER BY name ASC");
}

export async function getFactionById(id: number): Promise<Faction | null> {
  const db = await getDb();
  const rows = await db.select<Faction[]>("SELECT * FROM factions WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createFaction(input: CreateFactionInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO factions (name, game_system, description, color_theme, icon_path, lore_notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.name, input.game_system, input.description, input.color_theme, input.icon_path, input.lore_notes ?? null]
  );
  return result.lastInsertId ?? 0;
}

export async function updateFaction(input: UpdateFactionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE factions
        SET name = $2,
            game_system = $3,
            description = $4,
            color_theme = $5,
            icon_path = $6,
            lore_notes = $7,
            updated_at = datetime('now')
      WHERE id = $1`,
    [input.id, input.name, input.game_system, input.description ?? null, input.color_theme, input.icon_path ?? null, input.lore_notes ?? null]
  );
}

export async function deleteFaction(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM factions WHERE id = $1", [id]);
  // FK violation throws — caller (hook/component) catches and detects via error message
}
