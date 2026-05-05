/**
 * PROJ-02 — getNextActionHint: pure function mapping each PaintingStatus to
 * a short imperative next-action string shown on kanban cards.
 *
 * Requirement: every status in PAINTING_STATUS_ORDER has a non-empty hint.
 * KanbanCard hides the hint when status_painting === "Completed", so the
 * "Completed" hint must still exist (it is never rendered, not absent).
 */
import { describe, it, expect } from "vitest";
import { PAINTING_STATUS_ORDER } from "@/types/unit";
import { getNextActionHint, NEXT_ACTION_HINTS } from "@/features/dashboard/getNextActionHint";

describe("getNextActionHint", () => {
  it("returns a non-empty string for every status in PAINTING_STATUS_ORDER", () => {
    for (const status of PAINTING_STATUS_ORDER) {
      const hint = getNextActionHint(status);
      expect(hint, `expected non-empty hint for status "${status}"`).toBeTruthy();
      expect(typeof hint).toBe("string");
      expect(hint.length).toBeGreaterThan(0);
    }
  });

  it("covers all 11 statuses — NEXT_ACTION_HINTS has an entry for each", () => {
    const definedStatuses = Object.keys(NEXT_ACTION_HINTS);
    expect(definedStatuses).toHaveLength(PAINTING_STATUS_ORDER.length);
    for (const status of PAINTING_STATUS_ORDER) {
      expect(definedStatuses).toContain(status);
    }
  });

  it("returns 'Battle ready — log a game' for Completed status", () => {
    expect(getNextActionHint("Completed")).toBe("Battle ready — log a game");
  });

  it("returns the correct hint for each non-Completed status", () => {
    expect(getNextActionHint("Not Started")).toBe("Start building");
    expect(getNextActionHint("Built")).toBe("Apply primer");
    expect(getNextActionHint("Primed")).toBe("Apply base coat");
    expect(getNextActionHint("Basecoated")).toBe("Apply shade");
    expect(getNextActionHint("Shaded")).toBe("Apply layer highlights");
    expect(getNextActionHint("Layered")).toBe("Add edge highlights");
    expect(getNextActionHint("Highlighted")).toBe("Paint details");
    expect(getNextActionHint("Details Done")).toBe("Apply basing");
    expect(getNextActionHint("Based")).toBe("Apply varnish");
    expect(getNextActionHint("Varnished")).toBe("Mark complete");
  });

  it("KanbanCard renders hint for non-Completed statuses — Completed has a hint but is excluded by the card guard", () => {
    // The card uses: {unit.status_painting !== "Completed" && <p>{getNextActionHint(...)}</p>}
    // This test confirms the Completed hint exists (non-empty) even though the card suppresses it.
    const nonCompleted = PAINTING_STATUS_ORDER.filter((s) => s !== "Completed");
    for (const status of nonCompleted) {
      expect(getNextActionHint(status)).toBeTruthy();
    }
    // Completed hint exists but card will not render it
    expect(getNextActionHint("Completed")).toBeTruthy();
  });
});
