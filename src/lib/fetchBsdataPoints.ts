import {
  PTS_FIELD_ID,
  fetchAllCatFiles,
  type CatFileEntry,
} from "@/lib/bsdataCommon";

export interface PointsTier {
  modelCount: number;
  points: number;
}

export interface BsdataUnitPoints {
  datasheet_name: string;
  faction_id: string;
  points: string;
  tiers: PointsTier[];
}

function extractTiers(el: Element): PointsTier[] {
  const tiers: PointsTier[] = [];
  const modifiers = el.getElementsByTagName("modifier");
  for (let i = 0; i < modifiers.length; i++) {
    const mod = modifiers[i];
    if (mod.getAttribute("type") !== "set") continue;
    if (mod.getAttribute("field") !== PTS_FIELD_ID) continue;

    const value = parseInt(mod.getAttribute("value") ?? "0", 10);
    if (value <= 0) continue;

    const conditions = mod.getElementsByTagName("condition");
    for (let j = 0; j < conditions.length; j++) {
      const cond = conditions[j];
      if (cond.getAttribute("childId") !== "model") continue;
      if (cond.getAttribute("type") !== "atLeast") continue;
      const modelCount = parseInt(cond.getAttribute("value") ?? "0", 10);
      if (modelCount > 0) {
        tiers.push({ modelCount, points: value });
      }
    }
  }
  tiers.sort((a, b) => a.modelCount - b.modelCount);
  return tiers;
}

export function parseCatXml(
  xml: string,
  factionId: string | null,
): BsdataUnitPoints[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const rows: BsdataUnitPoints[] = [];
  const seen = new Set<string>();

  const entries = doc.getElementsByTagName("selectionEntry");
  for (let i = 0; i < entries.length; i++) {
    const el = entries[i];
    const type = el.getAttribute("type");
    if (type !== "unit" && type !== "model") continue;

    const name = el.getAttribute("name");
    if (!name || name.includes("[Legends]")) continue;

    let pts = 0;
    const children = el.childNodes;
    for (let j = 0; j < children.length; j++) {
      if (children[j].nodeName !== "costs") continue;
      const costEls = (children[j] as Element).getElementsByTagName("cost");
      for (let k = 0; k < costEls.length; k++) {
        if (costEls[k].getAttribute("name") === "pts") {
          pts = parseInt(costEls[k].getAttribute("value") ?? "0", 10);
          break;
        }
      }
      break;
    }

    if (pts <= 0) continue;

    const key = `${name}:${factionId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const tiers = extractTiers(el);

    rows.push({
      datasheet_name: name,
      faction_id: factionId ?? "",
      points: String(pts),
      tiers,
    });
  }

  return rows;
}

export interface BsdataPointsResult {
  rows: Record<string, string>[];
  tiers: Map<string, PointsTier[]>;
}

export function parsePointsFromCatFiles(
  catFiles: CatFileEntry[],
): BsdataPointsResult {
  const allUnits: BsdataUnitPoints[] = [];
  for (const entry of catFiles) {
    allUnits.push(...parseCatXml(entry.xml, entry.factionId));
  }

  const seen = new Set<string>();
  const deduped: BsdataUnitPoints[] = [];
  for (const unit of allUnits) {
    const key = `${unit.datasheet_name}:${unit.faction_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(unit);
  }

  const rows = deduped.map((u) => ({
    datasheet_name: u.datasheet_name,
    faction_id: u.faction_id,
    points: u.points,
  }));

  const tiers = new Map<string, PointsTier[]>();
  for (const u of deduped) {
    if (u.tiers.length > 0) {
      tiers.set(`${u.datasheet_name}:${u.faction_id}`, u.tiers);
    }
  }

  return { rows, tiers };
}

export async function fetchBsdataPoints(): Promise<BsdataPointsResult> {
  const catFiles = await fetchAllCatFiles();
  return parsePointsFromCatFiles(catFiles);
}
