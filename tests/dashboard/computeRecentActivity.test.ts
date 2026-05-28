/**
 * DASH-06 — Pure-function tests for computeRecentActivity().
 * Wave 0 stubs (it.skip). Wave 1 flips these to `it` after creating
 * src/features/dashboard/computeRecentActivity.ts.
 *
 * Pitfall 4 (26-RESEARCH.md): session_date is YYYY-MM-DD only; battle_logs.created_at
 * is YYYY-MM-DD HH:MM:SS. The pure function must normalize sessions to a
 * comparable timestamp (e.g. session_date + " 23:59:59") before sort.
 *
 * Pitfall 5 (26-RESEARCH.md): battle_logs has NO updated_at — only created_at.
 */
import { describe, it, expect } from "vitest";
import type { Unit, PaintingStatus } from "@/types/unit";

import { computeRecentActivity } from "@/features/dashboard/computeRecentActivity";

function u(over: Partial<Unit>): Unit {
  return {
    id: 1, faction_id: 1, name: "X",
    category: null, unit_type: null,
    model_count: null, owned_count: null, points: null,
    status_assembly: 0, status_painting: "Not Started" as PaintingStatus,
    painting_percentage: 0,
    status_basing: 0, status_varnished: 0, is_active_project: 0,
    priority: null, target_completion_date: null,
    purchase_date: null, purchase_price_pence: null,
    storage_location: null, main_image_path: null, notes: null,
    lore_notes: null, undercoat: null, status_assembly_override: 0 as 0 | 1, status_basing_override: 0 as 0 | 1, status_varnished_override: 0 as 0 | 1,
    created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

describe("computeRecentActivity — empty inputs", () => {
  it("returns empty array when units, sessions, and battles are all empty", () => {
    expect(computeRecentActivity([], [], [])).toEqual([]);
  });
});

describe("computeRecentActivity — unit_added events", () => {
  it("emits one unit_added event per unit using created_at timestamp", () => {
    const units = [u({ id: 1, name: "Crisis Suit", created_at: "2026-05-01 10:00:00", updated_at: "2026-05-01 10:00:00" })];
    const events = computeRecentActivity(units, [], []);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "unit_added", label: "Added Crisis Suit", unitId: 1, timestamp: "2026-05-01 10:00:00" });
  });

  it("event id is stable and unique across event types (e.g. unit-added-1 vs session-logged-1)", () => {
    const units = [u({ id: 1 })];
    const events = computeRecentActivity(units, [{ session_date: "2026-05-01", id: 1, unit_name: "X", unit_id: 1 }], []);
    const ids = events.map(e => e.id);
    expect(new Set(ids).size).toBe(events.length);
  });
});

describe("computeRecentActivity — unit_updated events", () => {
  it("emits unit_updated only when updated_at !== created_at", () => {
    const fresh = u({ id: 1, name: "Fresh", created_at: "2026-05-01 10:00:00", updated_at: "2026-05-01 10:00:00" });
    const updated = u({ id: 2, name: "Updated", created_at: "2026-05-01 10:00:00", updated_at: "2026-05-02 10:00:00" });
    const events = computeRecentActivity([fresh, updated], [], []);
    const updateEvents = events.filter(e => e.type === "unit_updated");
    expect(updateEvents).toHaveLength(1);
    expect(updateEvents[0]).toMatchObject({ label: "Updated Updated", unitId: 2 });
  });
});

describe("computeRecentActivity — session_logged events", () => {
  it("emits one session_logged event per session row with label 'Session: {unit_name}'", () => {
    const sessions = [{ session_date: "2026-05-03", id: 5, unit_name: "Crisis Suit", unit_id: 1 }];
    const events = computeRecentActivity([], sessions, []);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "session_logged", label: "Session: Crisis Suit", unitId: 1 });
  });

  it("normalizes session_date to YYYY-MM-DD 23:59:59 for chronological sort (Pitfall 4)", () => {
    const sessions = [{ session_date: "2026-05-03", id: 1, unit_name: "X", unit_id: 1 }];
    const battles = [{ created_at: "2026-05-03 12:00:00", id: 1, opponent_faction: "Orks", result: "Win" }];
    const events = computeRecentActivity([], sessions, battles);
    // Session normalized to 23:59:59 should come BEFORE battle at 12:00:00 same day in DESC sort
    expect(events[0].type).toBe("session_logged");
    expect(events[1].type).toBe("battle_logged");
  });
});

describe("computeRecentActivity — battle_logged events", () => {
  it("emits one battle_logged event per battle row with label 'Battle vs {opponent_faction}: {result}'", () => {
    const battles = [{ created_at: "2026-05-03 12:00:00", id: 1, opponent_faction: "Orks", result: "Win" }];
    const events = computeRecentActivity([], [], battles);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "battle_logged", label: "Battle vs Orks: Win" });
  });

  it("uses battle.created_at directly as timestamp (Pitfall 5: no updated_at)", () => {
    const battles = [{ created_at: "2026-05-03 12:00:00", id: 1, opponent_faction: "Orks", result: "Win" }];
    const events = computeRecentActivity([], [], battles);
    expect(events[0].timestamp).toBe("2026-05-03 12:00:00");
  });
});

describe("computeRecentActivity — sort and slice", () => {
  it("sorts all events by timestamp DESC (most recent first) across event types", () => {
    const units = [u({ id: 1, name: "U1", created_at: "2026-05-01 10:00:00", updated_at: "2026-05-01 10:00:00" })];
    const sessions = [{ session_date: "2026-05-03", id: 1, unit_name: "U2", unit_id: 2 }];
    const battles = [{ created_at: "2026-05-02 10:00:00", id: 1, opponent_faction: "Orks", result: "Win" }];
    const events = computeRecentActivity(units, sessions, battles);
    expect(events.map(e => e.type)).toEqual(["session_logged", "battle_logged", "unit_added"]);
  });

  it("slices to default limit of 10 events", () => {
    const sessions = Array.from({ length: 15 }, (_, i) => ({ session_date: `2026-05-${String(i + 1).padStart(2, "0")}`, id: i + 1, unit_name: "X", unit_id: 1 }));
    const events = computeRecentActivity([], sessions, []);
    expect(events).toHaveLength(10);
  });

  it("respects custom limit parameter", () => {
    const sessions = Array.from({ length: 15 }, (_, i) => ({ session_date: `2026-05-${String(i + 1).padStart(2, "0")}`, id: i + 1, unit_name: "X", unit_id: 1 }));
    const events = computeRecentActivity([], sessions, [], 5);
    expect(events).toHaveLength(5);
  });
});

describe("computeRecentActivity — combined feed", () => {
  it("combines all 4 event types in a single sorted feed", () => {
    const units = [u({ id: 1, name: "U1", created_at: "2026-05-01 10:00:00", updated_at: "2026-05-04 10:00:00" })];
    const sessions = [{ session_date: "2026-05-03", id: 1, unit_name: "U2", unit_id: 2 }];
    const battles = [{ created_at: "2026-05-02 10:00:00", id: 1, opponent_faction: "Orks", result: "Win" }];
    const events = computeRecentActivity(units, sessions, battles);
    const types = new Set(events.map(e => e.type));
    expect(types).toContain("unit_added");
    expect(types).toContain("unit_updated");
    expect(types).toContain("session_logged");
    expect(types).toContain("battle_logged");
  });
});
