import type { PaintWithRecipeCount, PaintType } from "@/types/paint";

export interface PaintFilters {
  brands: string[];
  types: PaintType[];
  colorFamilies: string[];
  runningLow: boolean;
  wishlist: boolean;
}

/**
 * Pure filter helper for the Paint Inventory page (PINV-02, PINV-03, PINV-04).
 * AND-combines five filter dimensions. Empty arrays / false flags are no-ops.
 *
 * SQLite boolean discipline: `running_low` and `wishlist` are `0 | 1` integers
 * — comparison MUST be `=== 1`, never truthy (`if (p.running_low)` is forbidden
 * by codebase convention even though it would coincidentally work).
 */
export function applyPaintFilters(
  paints: PaintWithRecipeCount[],
  filters: PaintFilters,
): PaintWithRecipeCount[] {
  return paints.filter((p) => {
    if (filters.brands.length > 0 && !filters.brands.includes(p.brand)) return false;
    if (filters.types.length > 0 && !filters.types.includes(p.paint_type)) return false;
    if (filters.colorFamilies.length > 0) {
      if (!p.color_family || !filters.colorFamilies.includes(p.color_family)) return false;
    }
    if (filters.runningLow && p.running_low !== 1) return false;
    if (filters.wishlist && p.wishlist !== 1) return false;
    return true;
  });
}
