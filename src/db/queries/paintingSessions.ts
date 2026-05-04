import { getDb } from "@/db/client";
import type { PaintingSession, CreateSessionInput } from "@/types/paintingSession";

/**
 * paintingSessions queries (JOUR-01..03).
 *
 * Mirrors the strategyNotes.ts pattern exactly — getDb() + raw SQL, no ORM.
 * Sessions are scoped per unit; ordering is newest first per JOUR-02.
 */

export async function getSessionsByUnit(unitId: number): Promise<PaintingSession[]> {
  const db = await getDb();
  return db.select<PaintingSession[]>(
    "SELECT * FROM painting_sessions WHERE unit_id = $1 ORDER BY session_date DESC, id DESC",
    [unitId]
  );
}

export async function createSession(input: CreateSessionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO painting_sessions (unit_id, session_date, duration_minutes, notes) VALUES ($1, $2, $3, $4)",
    [input.unit_id, input.session_date, input.duration_minutes, input.notes ?? null]
  );
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM painting_sessions WHERE id = $1", [id]);
}
