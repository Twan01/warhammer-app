import { PAINTING_STATUS_ORDER, type PaintingStatus, type Unit } from "@/types/unit";

export function applyActiveFilter(units: Unit[]): Unit[] {
  return units.filter((u) => u.is_active_project === 1);
}

export function groupByStatus(units: Unit[]): Record<PaintingStatus, Unit[]> {
  const acc = {} as Record<PaintingStatus, Unit[]>;
  for (const status of PAINTING_STATUS_ORDER) acc[status] = [];
  for (const u of units) acc[u.status_painting].push(u);
  return acc;
}

export function sortKanbanCards(units: Unit[]): Unit[] {
  // PROJ-07: priority ASC (nulls last), then target_completion_date ASC (nulls last)
  return [...units].sort((a, b) => {
    // priority: nulls last
    const ap = a.priority;
    const bp = b.priority;
    if (ap !== bp) {
      if (ap === null) return 1;
      if (bp === null) return -1;
      return ap - bp;
    }
    // target_completion_date: nulls last (ISO date string lex sort works)
    const ad = a.target_completion_date;
    const bd = b.target_completion_date;
    if (ad === bd) return 0;
    if (ad === null) return 1;
    if (bd === null) return -1;
    return ad < bd ? -1 : 1;
  });
}

export function getVisibleColumns(
  grouped: Record<PaintingStatus, Unit[]>,
): PaintingStatus[] {
  return PAINTING_STATUS_ORDER.filter((s) => grouped[s].length > 0);
}
