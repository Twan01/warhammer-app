import type { CatFileEntry } from "@/lib/bsdataCommon";

export interface BsdataEnhancement {
  name: string;
  faction_id: string | null;
  detachment_name: string;
  points: number;
}

export interface BsdataLoadoutOption {
  unit_name: string;
  faction_id: string | null;
  group_name: string;
  option_name: string;
  is_default: boolean;
  is_exclusive: boolean;
}

export interface BsdataModelCount {
  unit_name: string;
  faction_id: string | null;
  min_models: number;
  max_models: number;
}

export interface BsdataLeaderTarget {
  leader_name: string;
  faction_id: string | null;
  target_name: string;
}

export interface BsdataExtendedResult {
  enhancements: BsdataEnhancement[];
  loadoutOptions: BsdataLoadoutOption[];
  modelCounts: BsdataModelCount[];
  leaderTargets: BsdataLeaderTarget[];
}

function getDirectChildren(el: Element, tagName: string): Element[] {
  const result: Element[] = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.nodeType === 1 && (child as Element).tagName === tagName) {
      result.push(child as Element);
    }
  }
  return result;
}

function getPointsCost(el: Element): number {
  const costsContainers = getDirectChildren(el, "costs");
  for (const container of costsContainers) {
    const costEls = container.getElementsByTagName("cost");
    for (let i = 0; i < costEls.length; i++) {
      if (costEls[i].getAttribute("name") === "pts") {
        return parseInt(costEls[i].getAttribute("value") ?? "0", 10);
      }
    }
  }
  return 0;
}

function findDetachmentName(el: Element): string {
  let current: Element | null = el.parentElement;
  while (current) {
    if (
      current.tagName === "selectionEntry" &&
      current.getAttribute("type") === "upgrade"
    ) {
      const name = current.getAttribute("name") ?? "";
      if (name && !name.toLowerCase().includes("enhancement")) {
        return name;
      }
    }
    if (
      current.tagName === "selectionEntryGroup" &&
      !current.getAttribute("name")?.toLowerCase().includes("enhancement")
    ) {
      const name = current.getAttribute("name");
      if (name) return name;
    }
    current = current.parentElement;
  }
  return "Unknown";
}

function extractEnhancements(
  doc: Document,
  factionId: string | null,
): BsdataEnhancement[] {
  const results: BsdataEnhancement[] = [];
  const seen = new Set<string>();

  const groups = doc.getElementsByTagName("selectionEntryGroup");
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const groupName = group.getAttribute("name") ?? "";
    if (!groupName.toLowerCase().includes("enhancement")) continue;

    const detachment = findDetachmentName(group);

    const childEntries = group.getElementsByTagName("selectionEntry");
    for (let j = 0; j < childEntries.length; j++) {
      const entry = childEntries[j];
      if (entry.getAttribute("type") !== "upgrade") continue;

      const name = entry.getAttribute("name");
      if (!name) continue;

      const pts = getPointsCost(entry);
      if (pts <= 0) continue;

      const key = `${name}:${factionId}:${detachment}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        name,
        faction_id: factionId,
        detachment_name: detachment,
        points: pts,
      });
    }
  }

  return results;
}

function extractLoadoutOptions(
  doc: Document,
  factionId: string | null,
): BsdataLoadoutOption[] {
  const results: BsdataLoadoutOption[] = [];
  const seen = new Set<string>();

  const unitEntries = doc.getElementsByTagName("selectionEntry");
  for (let i = 0; i < unitEntries.length; i++) {
    const unitEl = unitEntries[i];
    const unitType = unitEl.getAttribute("type");
    if (unitType !== "unit" && unitType !== "model") continue;

    const unitName = unitEl.getAttribute("name");
    if (!unitName || unitName.includes("[Legends]")) continue;

    const groups = unitEl.getElementsByTagName("selectionEntryGroup");
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      const groupName = group.getAttribute("name") ?? "";
      if (!groupName) continue;
      if (groupName.toLowerCase().includes("enhancement")) continue;

      const constraints = group.getElementsByTagName("constraint");
      let minSel = 0;
      let maxSel = -1;
      for (let c = 0; c < constraints.length; c++) {
        const ct = constraints[c];
        const field = ct.getAttribute("field");
        if (field !== "selections") continue;
        const type = ct.getAttribute("type");
        const val = parseInt(ct.getAttribute("value") ?? "-1", 10);
        if (type === "min") minSel = val;
        if (type === "max") maxSel = val;
      }
      const isExclusive = minSel >= 1 && maxSel === 1;

      const options = group.getElementsByTagName("selectionEntry");
      let hasOptions = false;
      for (let o = 0; o < options.length; o++) {
        const opt = options[o];
        const optName = opt.getAttribute("name");
        if (!optName) continue;

        const key = `${unitName}:${factionId}:${groupName}:${optName}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const defaultConstraints = opt.getElementsByTagName("constraint");
        let isDefault = false;
        for (let dc = 0; dc < defaultConstraints.length; dc++) {
          if (
            defaultConstraints[dc].getAttribute("type") === "min" &&
            defaultConstraints[dc].getAttribute("field") === "selections" &&
            parseInt(
              defaultConstraints[dc].getAttribute("value") ?? "0",
              10,
            ) >= 1
          ) {
            isDefault = true;
            break;
          }
        }

        results.push({
          unit_name: unitName,
          faction_id: factionId,
          group_name: groupName,
          option_name: optName,
          is_default: isDefault,
          is_exclusive: isExclusive,
        });
        hasOptions = true;
      }

      if (!hasOptions) continue;
    }
  }

  return results;
}

function extractModelCounts(
  doc: Document,
  factionId: string | null,
): BsdataModelCount[] {
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

function extractLeaderTargets(
  doc: Document,
  factionId: string | null,
): BsdataLeaderTarget[] {
  const results: BsdataLeaderTarget[] = [];
  const seen = new Set<string>();

  const profiles = doc.getElementsByTagName("profile");
  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    if (profile.getAttribute("name") !== "Leader") continue;

    let leaderName: string | null = null;
    let current: Element | null = profile.parentElement;
    while (current) {
      if (
        current.tagName === "selectionEntry" &&
        (current.getAttribute("type") === "unit" ||
          current.getAttribute("type") === "model")
      ) {
        leaderName = current.getAttribute("name");
        break;
      }
      current = current.parentElement;
    }
    if (!leaderName) continue;

    const chars = profile.getElementsByTagName("characteristic");
    for (let j = 0; j < chars.length; j++) {
      const text = chars[j].textContent ?? "";
      if (!text) continue;

      const targets = text
        .split(/[■•\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 80);

      for (const target of targets) {
        if (
          target.toLowerCase().includes("this model") ||
          target.toLowerCase().includes("can be attached")
        ) {
          continue;
        }

        const key = `${leaderName}:${factionId}:${target}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          leader_name: leaderName,
          faction_id: factionId,
          target_name: target,
        });
      }
    }
  }

  return results;
}

export function parseExtendedFromCatFiles(
  catFiles: CatFileEntry[],
): BsdataExtendedResult {
  const enhancements: BsdataEnhancement[] = [];
  const loadoutOptions: BsdataLoadoutOption[] = [];
  const modelCounts: BsdataModelCount[] = [];
  const leaderTargets: BsdataLeaderTarget[] = [];

  for (const entry of catFiles) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(entry.xml, "text/xml");

    enhancements.push(...extractEnhancements(doc, entry.factionId));
    loadoutOptions.push(...extractLoadoutOptions(doc, entry.factionId));
    modelCounts.push(...extractModelCounts(doc, entry.factionId));
    leaderTargets.push(...extractLeaderTargets(doc, entry.factionId));
  }

  return { enhancements, loadoutOptions, modelCounts, leaderTargets };
}
