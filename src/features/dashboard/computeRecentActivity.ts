/**
 * DASH-06 — Pure function merging unit/session/battle activity into a single
 * chronological feed for the Dashboard's Recent Activity section.
 *
 * Pitfall 4 (26-RESEARCH.md): painting_sessions.session_date is YYYY-MM-DD only
 * while battle_logs.created_at is YYYY-MM-DD HH:MM:SS. We normalize sessions to
 * `${session_date} 23:59:59` for sort comparison so a session "today" appears
 * after any same-day battle (treating sessions as end-of-day events). The same
 * normalized string also feeds relativeTime() for display consistency.
 *
 * Pitfall 5 (26-RESEARCH.md): battle_logs has NO updated_at — only created_at.
 */
import type { Unit } from "@/types/unit";

export type ActivityEventType =
  | "unit_added"
  | "unit_updated"
  | "session_logged"
  | "battle_logged";

export interface ActivityEvent {
  id: string;          // stable unique key for React (type prefix + source id)
  type: ActivityEventType;
  label: string;       // user-facing one-line summary
  timestamp: string;   // ISO-ish "YYYY-MM-DD HH:MM:SS" string for relativeTime()
  unitId?: number;     // present for unit_added, unit_updated, session_logged
}

export interface SessionRow {
  session_date: string; // YYYY-MM-DD
  id: number;
  unit_name: string;
  unit_id: number;
}

export interface BattleRow {
  created_at: string;   // YYYY-MM-DD HH:MM:SS
  id: number;
  opponent_faction: string;
  result: string;
}

export function computeRecentActivity(
  units: Unit[],
  sessions: SessionRow[],
  battles: BattleRow[],
  limit = 10,
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const u of units) {
    events.push({
      id: `unit-added-${u.id}`,
      type: "unit_added",
      label: `Added ${u.name}`,
      timestamp: u.created_at,
      unitId: u.id,
    });
    if (u.updated_at !== u.created_at) {
      events.push({
        id: `unit-updated-${u.id}`,
        type: "unit_updated",
        label: `Updated ${u.name}`,
        timestamp: u.updated_at,
        unitId: u.id,
      });
    }
  }

  for (const s of sessions) {
    // Pitfall 4: normalize date-only to end-of-day so sort against datetimes works.
    events.push({
      id: `session-logged-${s.id}`,
      type: "session_logged",
      label: `Session: ${s.unit_name}`,
      timestamp: `${s.session_date} 23:59:59`,
      unitId: s.unit_id,
    });
  }

  for (const b of battles) {
    events.push({
      id: `battle-logged-${b.id}`,
      type: "battle_logged",
      label: `Battle vs ${b.opponent_faction}: ${b.result}`,
      timestamp: b.created_at,
    });
  }

  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return events.slice(0, limit);
}
