/**
 * PaintingSession entity (JOUR-01..03).
 * Mirrors the painting_sessions table created in migration 005_hobby_journal.sql.
 *
 * session_date is stored as ISO date string 'YYYY-MM-DD' — consistent with
 * units.purchase_date and units.target_completion_date.
 *
 * duration_minutes is an integer; the UI appends "min" suffix at render time
 * (never stored in the DB).
 */
export interface PaintingSession {
  id: number;
  unit_id: number;
  session_date: string;          // ISO 'YYYY-MM-DD'
  duration_minutes: number;
  notes: string | null;
  created_at: string;            // ISO datetime via SQLite datetime('now')
  // Phase 41 — session-recipe linking (INTEG-01/02)
  recipe_id: number | null;
  recipe_step_id: number | null;
  // Phase 57 — workflow section association (WF-04)
  section_name: string | null;
  // Phase 71 — stable section FK (REC-04)
  recipe_section_id: number | null;
}

/**
 * Insert payload for createSession() — omits id and created_at (DB-generated).
 * notes is optional in the input; the query module coerces undefined to null.
 */
export interface CreateSessionInput {
  unit_id: number;
  session_date: string;
  duration_minutes: number;
  notes?: string | null;
  // Phase 41 — session-recipe linking (INTEG-01/02)
  recipe_id?: number | null;
  recipe_step_id?: number | null;
  // Phase 57 — workflow section association
  section_name?: string | null;
  // Phase 71 — stable section FK (REC-04)
  recipe_section_id?: number | null;
}
