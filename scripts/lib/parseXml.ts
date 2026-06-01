/**
 * BSData XML parsing functions -- extract points tiers, unit points,
 * and model counts from BSData .cat catalogue files.
 *
 * Extracted from build-unit-db.ts for shared use by both build scripts.
 *
 * IMPORTANT: These functions rely on `globalThis.DOMParser` being polyfilled
 * (via @xmldom/xmldom) in the entry-point script. This module does NOT
 * set up the polyfill itself -- the caller must do so before importing.
 */

import type { PointsTier, BsdataUnitPoints, BsdataModelCount } from "./types.ts";

/**
 * Extract points tiers from a BSData selectionEntry element.
 * Looks for modifier elements that set the points field based on model count conditions.
 */
export function extractTiers(el: Element): PointsTier[] {
  const PTS_FIELD_ID = "51b2-306e-1021-d207";
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

/**
 * Parse a BSData .cat XML string and extract unit points data.
 * Returns an array of BsdataUnitPoints with datasheet name, faction, base points, and tiers.
 */
export function parseCatXml(xml: string, factionId: string | null, catalogueName = ""): BsdataUnitPoints[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml") as unknown as Document;
  const errors = doc.getElementsByTagName("parsererror");
  if (errors.length > 0) {
    console.error(`  XML parse error in ${catalogueName || "unknown catalogue"}, skipping`);
    return [];
  }
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

    const tiers = extractTiers(el as Element);
    if (pts <= 0 && tiers.length === 0) continue;

    const key = `${name}:${factionId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      datasheet_name: name,
      faction_id: factionId ?? "",
      points: String(pts),
      tiers,
    });
  }

  return rows;
}

/**
 * Extract min/max model counts from a parsed BSData XML document.
 * Inspects selectionEntry elements of type "unit" for nested model constraints.
 */
export function extractModelCounts(doc: Document, factionId: string | null): BsdataModelCount[] {
  const results: BsdataModelCount[] = [];
  const seen = new Set<string>();

  const unitEntries = doc.getElementsByTagName("selectionEntry");
  for (let i = 0; i < unitEntries.length; i++) {
    const el = unitEntries[i];
    if (el.getAttribute("type") !== "unit") continue;
    const unitName = el.getAttribute("name");
    if (!unitName || unitName.includes("[Legends]")) continue;

    const key = `${unitName}:${factionId}`;
    if (seen.has(key)) continue;

    const modelEntries = el.getElementsByTagName("selectionEntry");
    let globalMin = Infinity;
    let globalMax = 0;

    for (let j = 0; j < modelEntries.length; j++) {
      const modelEl = modelEntries[j];
      if (modelEl.getAttribute("type") !== "model") continue;
      const constraints = modelEl.getElementsByTagName("constraint");
      for (let c = 0; c < constraints.length; c++) {
        const ct = constraints[c];
        if (ct.getAttribute("field") !== "selections") continue;
        const val = parseInt(ct.getAttribute("value") ?? "0", 10);
        if (ct.getAttribute("type") === "min" && val > 0 && val < globalMin) {
          globalMin = val;
        }
        if (ct.getAttribute("type") === "max" && val > globalMax) {
          globalMax = val;
        }
      }
    }

    if (globalMin === Infinity) globalMin = 1;
    if (globalMax === 0) globalMax = globalMin;

    if (globalMin > 0 && globalMax >= globalMin) {
      seen.add(key);
      results.push({
        unit_name: unitName,
        faction_id: factionId,
        min_models: globalMin,
        max_models: globalMax,
      });
    }
  }

  return results;
}
