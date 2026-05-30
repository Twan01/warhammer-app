/**
 * Phase 107 -- Unit keyword status hook redirected to udb_* tables.
 *
 * Replaces the previous rules.db query (rw_datasheet_keywords) with a
 * direct query against udb_unit_keywords in hobbyforge.db via getDb().
 *
 * Used by ArmyListUnitRow and EnhancementPickerSheet to check whether
 * a unit is a Character or Epic Hero for enhancement eligibility.
 */
import { useQuery } from "@tanstack/react-query";
import { getDb } from "@/db/client";

export interface UnitKeywordStatus {
  isCharacter: boolean;
  isEpicHero: boolean;
}

export const UNIT_KEYWORDS_KEY = (unitName: string) =>
  ["unit-keywords", unitName] as const;

const SAFE_DEFAULT: UnitKeywordStatus = { isCharacter: false, isEpicHero: false };

export function useUnitKeywords(unitName: string | undefined) {
  return useQuery({
    queryKey:
      unitName !== undefined
        ? UNIT_KEYWORDS_KEY(unitName)
        : (["unit-keywords"] as const),
    queryFn: async () => {
      if (unitName === undefined) return SAFE_DEFAULT;
      const db = await getDb();
      const rows = await db.select<{ keyword: string }[]>(
        `SELECT k.keyword FROM udb_units u
         JOIN udb_unit_keywords k ON k.unit_id = u.id
         WHERE LOWER(u.name) = LOWER($1)
           AND LOWER(k.keyword) IN ('character', 'epic hero')`,
        [unitName],
      );
      const keywords = rows.map((r) => r.keyword.toLowerCase());
      return {
        isCharacter: keywords.includes("character"),
        isEpicHero: keywords.includes("epic hero"),
      };
    },
    enabled: unitName !== undefined,
    staleTime: Infinity,
  });
}
