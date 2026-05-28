import type Database from "@tauri-apps/plugin-sql";

interface PointsRow {
  id: number;
  datasheet_name: string;
  faction_id: string | null;
}

interface DatasheetRow {
  name: string;
  faction_id: string | null;
}

export interface NormalizationResult {
  updated: number;
  unmatched: Array<{ datasheet_name: string; faction_id: string | null }>;
}

const KNOWN_OVERRIDES: ReadonlyMap<string, string> = new Map([
  // Keys: lowercase BSData names. Values: exact Wahapedia names.
  // Add entries here as mismatches are discovered that can't be auto-resolved.
]);

const APOSTROPHE_RE = /['''′`]/g;

const SINGULAR_EXCEPTIONS = new Set([
  "chaos", "crisis", "nexus", "colossus", "terminus", "atlas",
  "aegis", "ibis", "mantis", "primus", "infernus", "carnifex",
]);

function singularize(word: string): string {
  const lower = word.toLowerCase();
  if (SINGULAR_EXCEPTIONS.has(lower)) return word;
  if (lower.length < 3) return word;

  if (lower.endsWith("ies") && lower.length > 4) {
    return word.slice(0, -3) + (word[word.length - 3] === "I" ? "Y" : "y");
  }
  if (lower.endsWith("ves") && lower.length > 4) {
    return word.slice(0, -3) + (lower[lower.length - 4] === "l" ? "f" : "fe");
  }
  if (
    lower.endsWith("ches") || lower.endsWith("shes") ||
    lower.endsWith("xes") || lower.endsWith("zes") || lower.endsWith("ses")
  ) {
    return word.slice(0, -2);
  }
  if (lower.endsWith("s") && !lower.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

function normalizeName(name: string): string {
  const collapsed = name
    .toLowerCase()
    .replace(APOSTROPHE_RE, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = collapsed.split(" ");
  if (parts.length > 0) {
    parts[parts.length - 1] = singularize(parts[parts.length - 1]);
  }
  return parts.join(" ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function findBestMatch(
  pointsName: string,
  factionId: string | null,
  datasheetsByFaction: Map<string | null, DatasheetRow[]>,
): string | null {
  // Strategy 0: known overrides
  const override = KNOWN_OVERRIDES.get(pointsName.toLowerCase());
  if (override) return override;

  const candidates = datasheetsByFaction.get(factionId) ?? [];
  if (candidates.length === 0) return null;

  const ptLower = pointsName.toLowerCase();
  const ptNorm = normalizeName(pointsName);

  // Strategy 1: case-insensitive exact
  for (const ds of candidates) {
    if (ds.name.toLowerCase() === ptLower) return ds.name;
  }

  // Strategy 2: normalized match (plurals, apostrophes, hyphens)
  for (const ds of candidates) {
    if (normalizeName(ds.name) === ptNorm) return ds.name;
  }

  // Strategy 3: prefix match (shorter name is prefix of longer, 60%+ ratio, 8+ chars)
  if (pointsName.length >= 8) {
    for (const ds of candidates) {
      const dsLower = ds.name.toLowerCase();
      const shorter = ptLower.length <= dsLower.length ? ptLower : dsLower;
      const longer = ptLower.length <= dsLower.length ? dsLower : ptLower;
      if (longer.startsWith(shorter) && shorter.length / longer.length >= 0.6) {
        return ds.name;
      }
    }
  }

  // Strategy 4: Levenshtein distance (max 2 edits AND max 10% of length, unique match only)
  let bestMatch: string | null = null;
  let bestDist = Infinity;
  let tied = false;

  for (const ds of candidates) {
    const dsNorm = normalizeName(ds.name);
    const dist = levenshtein(ptNorm, dsNorm);
    const maxLen = Math.max(ptNorm.length, dsNorm.length);
    if (dist <= 2 && maxLen > 0 && dist / maxLen <= 0.1) {
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = ds.name;
        tied = false;
      } else if (dist === bestDist) {
        tied = true;
      }
    }
  }

  return tied ? null : bestMatch;
}

export async function normalizePointsNames(rulesDb: Database): Promise<NormalizationResult> {
  const unmatched = await rulesDb.select<PointsRow[]>(
    `SELECT dp.id, dp.datasheet_name, dp.faction_id
     FROM rw_datasheet_points dp
     WHERE NOT EXISTS (
       SELECT 1 FROM rw_datasheets d
       WHERE d.name = dp.datasheet_name
         AND (dp.faction_id IS NULL OR d.faction_id = dp.faction_id)
     )`,
    [],
  );

  if (unmatched.length === 0) return { updated: 0, unmatched: [] };

  const allDatasheets = await rulesDb.select<DatasheetRow[]>(
    "SELECT name, faction_id FROM rw_datasheets ORDER BY name",
    [],
  );

  const byFaction = new Map<string | null, DatasheetRow[]>();
  for (const ds of allDatasheets) {
    const key = ds.faction_id;
    if (!byFaction.has(key)) byFaction.set(key, []);
    byFaction.get(key)!.push(ds);
  }

  let updated = 0;
  const stillUnmatched: Array<{ datasheet_name: string; faction_id: string | null }> = [];

  for (const row of unmatched) {
    const match = findBestMatch(row.datasheet_name, row.faction_id, byFaction);
    if (match && match !== row.datasheet_name) {
      try {
        await rulesDb.execute(
          "UPDATE rw_datasheet_points SET datasheet_name = $1 WHERE id = $2",
          [match, row.id],
        );
        updated++;
      } catch {
        stillUnmatched.push({ datasheet_name: row.datasheet_name, faction_id: row.faction_id });
      }
    } else if (!match) {
      stillUnmatched.push({ datasheet_name: row.datasheet_name, faction_id: row.faction_id });
    }
  }

  if (updated > 0) {
    console.info(`[normalizePointsNames] fixed ${updated} / ${unmatched.length} mismatched point names`);
  }
  if (stillUnmatched.length > 0) {
    console.warn(
      `[normalizePointsNames] ${stillUnmatched.length} points still unmatched:`,
      stillUnmatched.slice(0, 10).map((r) => `${r.datasheet_name} (${r.faction_id})`).join(", "),
    );
  }

  return { updated, unmatched: stillUnmatched };
}
