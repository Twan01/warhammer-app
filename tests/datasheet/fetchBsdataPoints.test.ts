import { describe, it, expect } from "vitest";

const SAMPLE_CAT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<catalogue xmlns="http://www.battlescribe.net/schema/catalogueSchema"
  id="test" name="Test Faction" revision="1" battleScribeVersion="2.03"
  type="catalogue" gameSystemId="test-gs" gameSystemRevision="1">
  <selectionEntries>
    <selectionEntry id="u1" name="Intercessor Squad" hidden="false" type="unit">
      <costs>
        <cost name="pts" typeId="51b2-306e-1021-d207" value="80"/>
      </costs>
    </selectionEntry>
    <selectionEntry id="u2" name="Captain" hidden="false" type="model">
      <costs>
        <cost name="pts" typeId="51b2-306e-1021-d207" value="80"/>
      </costs>
    </selectionEntry>
    <selectionEntry id="u3" name="Old Unit [Legends]" hidden="false" type="unit">
      <costs>
        <cost name="pts" typeId="51b2-306e-1021-d207" value="50"/>
      </costs>
    </selectionEntry>
    <selectionEntry id="u4" name="Bolt Rifle" hidden="false" type="upgrade">
      <costs>
        <cost name="pts" typeId="51b2-306e-1021-d207" value="0"/>
      </costs>
    </selectionEntry>
    <selectionEntry id="u5" name="Nested Unit" hidden="false" type="unit">
      <costs>
        <cost name="pts" typeId="51b2-306e-1021-d207" value="120"/>
      </costs>
      <selectionEntries>
        <selectionEntry id="u5m" name="Nested Model" hidden="false" type="model">
          <costs>
            <cost name="pts" typeId="51b2-306e-1021-d207" value="0"/>
          </costs>
        </selectionEntry>
      </selectionEntries>
    </selectionEntry>
  </selectionEntries>
</catalogue>`;

function parseCatXml(xml: string, factionId: string | null): Record<string, string>[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const rows: Record<string, string>[] = [];
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

    rows.push({
      datasheet_name: name,
      faction_id: factionId ?? "",
      points: String(pts),
    });
  }

  return rows;
}

describe("parseCatXml", () => {
  it("extracts units and models with points > 0", () => {
    const rows = parseCatXml(SAMPLE_CAT_XML, "SM");
    const names = rows.map((r) => r.datasheet_name);
    expect(names).toContain("Intercessor Squad");
    expect(names).toContain("Captain");
    expect(names).toContain("Nested Unit");
  });

  it("skips [Legends] entries", () => {
    const rows = parseCatXml(SAMPLE_CAT_XML, "SM");
    const names = rows.map((r) => r.datasheet_name);
    expect(names).not.toContain("Old Unit [Legends]");
  });

  it("skips upgrades and zero-point entries", () => {
    const rows = parseCatXml(SAMPLE_CAT_XML, "SM");
    const names = rows.map((r) => r.datasheet_name);
    expect(names).not.toContain("Bolt Rifle");
    expect(names).not.toContain("Nested Model");
  });

  it("sets faction_id from parameter", () => {
    const rows = parseCatXml(SAMPLE_CAT_XML, "SM");
    expect(rows.every((r) => r.faction_id === "SM")).toBe(true);
  });

  it("uses empty string for null faction_id", () => {
    const rows = parseCatXml(SAMPLE_CAT_XML, null);
    expect(rows.every((r) => r.faction_id === "")).toBe(true);
  });

  it("returns points as string", () => {
    const rows = parseCatXml(SAMPLE_CAT_XML, "SM");
    const intercessors = rows.find((r) => r.datasheet_name === "Intercessor Squad");
    expect(intercessors?.points).toBe("80");
  });

  it("deduplicates by name+faction", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <catalogue xmlns="http://www.battlescribe.net/schema/catalogueSchema">
      <selectionEntries>
        <selectionEntry id="a" name="Dup Unit" type="unit">
          <costs><cost name="pts" typeId="x" value="100"/></costs>
        </selectionEntry>
        <selectionEntry id="b" name="Dup Unit" type="unit">
          <costs><cost name="pts" typeId="x" value="200"/></costs>
        </selectionEntry>
      </selectionEntries>
    </catalogue>`;
    const rows = parseCatXml(xml, "SM");
    expect(rows.filter((r) => r.datasheet_name === "Dup Unit")).toHaveLength(1);
    expect(rows[0].points).toBe("100");
  });
});
