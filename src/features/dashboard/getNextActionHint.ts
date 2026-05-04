/**
 * DASH-03 — pure lookup mapping each PaintingStatus to a short imperative hint.
 * Used by CurrentFocusCard to surface the next action a user should take on
 * the most recently active project.
 *
 * Exhaustive over PAINTING_STATUS_ORDER — TypeScript ensures every status has a hint.
 */
import type { PaintingStatus } from "@/types/unit";

export const NEXT_ACTION_HINTS: Record<PaintingStatus, string> = {
  "Not Started": "Start building",
  Built: "Apply primer",
  Primed: "Apply base coat",
  Basecoated: "Apply shade",
  Shaded: "Apply layer highlights",
  Layered: "Add edge highlights",
  Highlighted: "Paint details",
  "Details Done": "Apply basing",
  Based: "Apply varnish",
  Varnished: "Mark complete",
  Completed: "Battle ready — log a game",
};

export function getNextActionHint(status: PaintingStatus): string {
  return NEXT_ACTION_HINTS[status];
}
