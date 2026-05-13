/**
 * Phase 65 — Points delta types for import pipeline (PI-04).
 *
 * Used by computePointsDelta to describe per-unit point changes
 * after a Wahapedia sync. Delta counts are persisted to
 * points_import_history in hobbyforge.db for audit trail.
 */

export interface PointsDeltaDetail {
  unitName: string;
  factionId: string | null;
  oldPoints: number | null;
  newPoints: number | null;
  changeType: "added" | "removed" | "changed";
}

export interface PointsDelta {
  added: number;
  removed: number;
  changed: number;
  details: PointsDeltaDetail[];
}
