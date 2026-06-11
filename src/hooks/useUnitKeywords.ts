/**
 * Phase 107 -- Unit keyword status hook redirected to udb_* tables.
 *
 * Replaces the previous rules.db query (rw_datasheet_keywords) with a
 * direct query against udb_unit_keywords in hobbyforge.db via getDb().
 *
 * Used by ArmyListUnitRow and EnhancementPickerSheet to check whether
 * a unit is a Character or Epic Hero for enhancement eligibility.
 *
 * Prefers udb_unit_id (exact match) over name (may match across factions).
 */
import { useQuery } from "@tanstack/react-query";
import { getDb } from "@/db/client";

export interface UnitKeywordStatus {
  isCharacter: boolean;
  isEpicHero: boolean;
}

export const UNIT_KEYWORDS_KEY = (key: string) =>
  ["unit-keywords", key] as const;

const SAFE_DEFAULT: UnitKeywordStatus = { isCharacter: false, isEpicHero: false };

/**
 * Check if a unit has Character or Epic Hero keywords.
 * When udbUnitId is provided, uses exact ID match (no cross-faction ambiguity).
 * Falls back to name-based matching when udbUnitId is not available.
 */
export function useUnitKeywords(
  unitName: string | undefined,
  udbUnitId?: string | null,
) {
  // Use udb_unit_id as cache key when available for precision
  const cacheKey = udbUnitId ?? unitName;
  return useQuery({
    queryKey:
      cacheKey !== undefined && cacheKey !== null
        ? UNIT_KEYWORDS_KEY(cacheKey)
        : (["unit-keywords"] as const),
    queryFn: async () => {
      const db = await getDb();
      let rows: { keyword: string }[];
      if (udbUnitId) {
        // Exact ID match — no cross-faction ambiguity
        rows = await db.select<{ keyword: string }[]>(
          `SELECT k.keyword FROM udb_unit_keywords k
           WHERE k.unit_id = $1
             AND LOWER(k.keyword) IN ('character', 'epic hero')`,
          [udbUnitId],
        );
      } else if (unitName !== undefined) {
        // Fallback: name-based matching (may return results from multiple factions)
        rows = await db.select<{ keyword: string }[]>(
          `SELECT k.keyword FROM udb_units u
           JOIN udb_unit_keywords k ON k.unit_id = u.id
           WHERE LOWER(u.name) = LOWER($1)
             AND LOWER(k.keyword) IN ('character', 'epic hero')`,
          [unitName],
        );
      } else {
        return { ...SAFE_DEFAULT };
      }
      const keywords = rows.map((r) => r.keyword.toLowerCase());
      return {
        isCharacter: keywords.includes("character"),
        isEpicHero: keywords.includes("epic hero"),
      };
    },
    enabled: cacheKey !== undefined && cacheKey !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
