import { fetch } from "@tauri-apps/plugin-http";

export const BSDATA_REPO = "BSData/wh40k-10e";
export const BSDATA_RAW_BASE = `https://raw.githubusercontent.com/${BSDATA_REPO}/main`;
export const PTS_FIELD_ID = "51b2-306e-1021-d207";

export const FACTION_MAP: Record<string, string> = {
  "Imperium - Space Marines": "SM",
  "Imperium - Black Templars": "SM",
  "Imperium - Blood Angels": "SM",
  "Imperium - Dark Angels": "SM",
  "Imperium - Deathwatch": "SM",
  "Imperium - Imperial Fists": "SM",
  "Imperium - Iron Hands": "SM",
  "Imperium - Raven Guard": "SM",
  "Imperium - Salamanders": "SM",
  "Imperium - Space Wolves": "SM",
  "Imperium - Ultramarines": "SM",
  "Imperium - White Scars": "SM",
  "Imperium - Adeptus Custodes": "AC",
  "Imperium - Adepta Sororitas": "AS",
  "Imperium - Adeptus Mechanicus": "AdM",
  "Imperium - Astra Militarum": "AM",
  "Imperium - Grey Knights": "GK",
  "Imperium - Agents of the Imperium": "AoI",
  "Imperium - Imperial Knights": "QI",
  "Imperium - Adeptus Titanicus": "TL",
  "Chaos - Chaos Space Marines": "CSM",
  "Chaos - Death Guard": "DG",
  "Chaos - Thousand Sons": "TS",
  "Chaos - World Eaters": "WE",
  "Chaos - Emperor's Children": "EC",
  "Chaos - Chaos Knights": "QT",
  "Chaos - Chaos Daemons": "CD",
  "Chaos - Titanicus Traitoris": "TL",
  "Aeldari - Craftworlds": "AE",
  "Aeldari - Drukhari": "DRU",
  "Aeldari - Ynnari": "AE",
  "Necrons": "NEC",
  "Orks": "ORK",
  "T'au Empire": "TAU",
  "Tyranids": "TYR",
  "Genestealer Cults": "GC",
  "Leagues of Votann": "LoV",
  "Unaligned Forces": "UN",
};

export interface CatFileEntry {
  xml: string;
  factionId: string | null;
  catalogueName: string;
}

export async function fetchCatFile(filename: string): Promise<string> {
  const url = `${BSDATA_RAW_BASE}/${encodeURIComponent(filename)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/xml, application/xml" },
  });
  if (!response.ok)
    throw new Error(`Failed to fetch ${filename}: HTTP ${response.status}`);
  return response.text();
}

export async function fetchAllCatFiles(): Promise<CatFileEntry[]> {
  const apiResponse = await fetch(
    `https://api.github.com/repos/${BSDATA_REPO}/contents/`,
    {
      method: "GET",
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "HobbyForge/1.0",
      },
    },
  );
  if (!apiResponse.ok)
    throw new Error(`GitHub API error: HTTP ${apiResponse.status}`);

  const files = (await apiResponse.json()) as Array<{
    name: string;
    type: string;
  }>;
  const catFiles = files
    .filter(
      (f) =>
        f.type === "file" &&
        f.name.endsWith(".cat") &&
        !f.name.includes("Library"),
    )
    .map((f) => f.name);

  const BATCH_SIZE = 8;
  const entries: CatFileEntry[] = [];

  for (let i = 0; i < catFiles.length; i += BATCH_SIZE) {
    const batch = catFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (filename) => {
        const xml = await fetchCatFile(filename);
        const catalogueName = filename.replace(/\.cat$/, "");
        const factionId = FACTION_MAP[catalogueName] ?? null;
        return { xml, factionId, catalogueName } satisfies CatFileEntry;
      }),
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        entries.push(result.value);
      }
    }
  }

  return entries;
}
