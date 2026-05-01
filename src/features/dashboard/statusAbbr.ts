/**
 * Status abbreviations used in dashboard list rows (DashboardListRow).
 * Mapping defined by 05-UI-SPEC.md Layout Specification → ListRow anatomy.
 */
import type { PaintingStatus } from "@/types/unit";

export const STATUS_ABBR: Record<PaintingStatus, string> = {
  "Not Started": "None",
  "Built": "Built",
  "Primed": "Prime",
  "Basecoated": "Base",
  "Shaded": "Shade",
  "Layered": "Layer",
  "Highlighted": "High",
  "Details Done": "Detail",
  "Based": "Based",
  "Varnished": "Varn",
  "Completed": "Done",
};
