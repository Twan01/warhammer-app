// @vitest-environment node
/**
 * Gap 4 (DQ-07) -- extractTiers and parseCatXml behavioral tests.
 *
 * DQ-07: extractTiers, parseCatXml work on sample XML.
 * parseXml.ts requires globalThis.DOMParser — polyfilled here via @xmldom/xmldom.
 */
import { describe, it, expect, beforeAll } from "vitest";

// Polyfill DOMParser for Node.js (same pattern as build-unit-db.ts entry point)
import { DOMParser as XmlDomParser } from "@xmldom/xmldom";

beforeAll(() => {
  // @ts-ignore
  globalThis.DOMParser = XmlDomParser;
});

import { parseCatXml, extractTiers } from "../../scripts/lib/parseXml.ts";

// ── Minimal BSData XML fixtures ───────────────────────────────────────────────

const MINIMAL_CAT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<catalogue name="Imperium - Space Marines" id="cat-001">
  <selectionEntries>
    <selectionEntry id="unit-001" name="Intercessors" type="unit">
      <costs>
        <cost name="pts" value="100" />
      </costs>
    </selectionEntry>
    <selectionEntry id="unit-002" name="Scouts [Legends]" type="unit">
      <costs>
        <cost name="pts" value="80" />
      </costs>
    </selectionEntry>
    <selectionEntry id="unit-003" name="Hellblasters" type="unit">
      <costs>
        <cost name="pts" value="0" />
      </costs>
    </selectionEntry>
  </selectionEntries>
</catalogue>`;

const TIERED_UNIT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<catalogue name="Imperium - Space Marines" id="cat-002">
  <selectionEntries>
    <selectionEntry id="unit-010" name="Intercessors" type="unit">
      <costs>
        <cost name="pts" value="0" />
      </costs>
      <modifiers>
        <modifier type="set" field="51b2-306e-1021-d207" value="100">
          <conditions>
            <condition childId="model" type="atLeast" value="5" />
          </conditions>
        </modifier>
        <modifier type="set" field="51b2-306e-1021-d207" value="190">
          <conditions>
            <condition childId="model" type="atLeast" value="10" />
          </conditions>
        </modifier>
      </modifiers>
    </selectionEntry>
  </selectionEntries>
</catalogue>`;

// ── parseCatXml tests ─────────────────────────────────────────────────────────

describe("parseCatXml: DQ-07 — BSData XML parsing", () => {
  it("parses a unit with base points and returns BsdataUnitPoints record", () => {
    const result = parseCatXml(MINIMAL_CAT_XML, "SM", "Imperium - Space Marines");
    const intercessors = result.find((r) => r.datasheet_name === "Intercessors");
    expect(intercessors).toBeDefined();
    expect(intercessors!.faction_id).toBe("SM");
    expect(intercessors!.points).toBe("100");
    expect(intercessors!.tiers).toEqual([]);
  });

  it("excludes [Legends] units from results", () => {
    const result = parseCatXml(MINIMAL_CAT_XML, "SM", "Imperium - Space Marines");
    const legendsUnit = result.find((r) => r.datasheet_name.includes("[Legends]"));
    expect(legendsUnit).toBeUndefined();
  });

  it("excludes units with zero base points and no tiers", () => {
    const result = parseCatXml(MINIMAL_CAT_XML, "SM", "Imperium - Space Marines");
    const hellblasters = result.find((r) => r.datasheet_name === "Hellblasters");
    expect(hellblasters).toBeUndefined();
  });

  it("assigns null faction_id when factionId param is null", () => {
    const result = parseCatXml(MINIMAL_CAT_XML, null);
    const intercessors = result.find((r) => r.datasheet_name === "Intercessors");
    expect(intercessors).toBeDefined();
    // faction_id should be empty string (faction_id ?? "")
    expect(intercessors!.faction_id).toBe("");
  });

  it("handles invalid XML gracefully (returns empty array or throws -- does not silently produce data)", () => {
    // @xmldom/xmldom throws a ParseError for completely invalid XML (no root element).
    // Either throwing or returning empty array both satisfy the "graceful error handling" contract
    // -- the important thing is no unit data is produced from garbage input.
    let result: ReturnType<typeof parseCatXml> | undefined;
    let threw = false;
    try {
      result = parseCatXml("not xml at all", "SM", "test");
    } catch {
      threw = true;
    }
    if (!threw) {
      expect(result).toEqual([]);
    } else {
      // Throwing is also acceptable graceful error handling for unparseable XML
      expect(threw).toBe(true);
    }
  });

  it("parses tiered-only unit (zero base points but tiers present)", () => {
    const result = parseCatXml(TIERED_UNIT_XML, "SM", "Imperium - Space Marines");
    const intercessors = result.find((r) => r.datasheet_name === "Intercessors");
    expect(intercessors).toBeDefined();
    expect(intercessors!.tiers).toHaveLength(2);
    expect(intercessors!.tiers[0]).toEqual({ modelCount: 5, points: 100 });
    expect(intercessors!.tiers[1]).toEqual({ modelCount: 10, points: 190 });
  });

  it("de-duplicates units with the same name and faction_id", () => {
    const duplicateCat = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<catalogue name="Test" id="cat-dup">
  <selectionEntries>
    <selectionEntry id="u1" name="Intercessors" type="unit">
      <costs><cost name="pts" value="100" /></costs>
    </selectionEntry>
    <selectionEntry id="u2" name="Intercessors" type="unit">
      <costs><cost name="pts" value="110" /></costs>
    </selectionEntry>
  </selectionEntries>
</catalogue>`;
    const result = parseCatXml(duplicateCat, "SM", "Test");
    const all = result.filter((r) => r.datasheet_name === "Intercessors");
    expect(all).toHaveLength(1);
  });
});

// ── extractTiers tests ────────────────────────────────────────────────────────

describe("extractTiers: DQ-07 — BSData tier extraction from XML element", () => {
  function makeElementWithTiers(tiers: Array<{ modelCount: number; points: number }>): Element {
    const parser = new DOMParser();
    const modifiers = tiers.map(({ modelCount, points }) => `
      <modifier type="set" field="51b2-306e-1021-d207" value="${points}">
        <conditions>
          <condition childId="model" type="atLeast" value="${modelCount}" />
        </conditions>
      </modifier>`).join("");
    const xml = `<?xml version="1.0"?><selectionEntry><modifiers>${modifiers}</modifiers></selectionEntry>`;
    const doc = parser.parseFromString(xml, "text/xml") as unknown as Document;
    return doc.getElementsByTagName("selectionEntry")[0] as Element;
  }

  it("extracts tiers sorted ascending by model count", () => {
    // Provide tiers out of order to verify sorting
    const el = makeElementWithTiers([
      { modelCount: 10, points: 190 },
      { modelCount: 5, points: 100 },
    ]);
    const tiers = extractTiers(el);
    expect(tiers).toHaveLength(2);
    expect(tiers[0]).toEqual({ modelCount: 5, points: 100 });
    expect(tiers[1]).toEqual({ modelCount: 10, points: 190 });
  });

  it("returns empty array when element has no modifier children", () => {
    const parser = new DOMParser();
    const xml = `<?xml version="1.0"?><selectionEntry><costs /></selectionEntry>`;
    const doc = parser.parseFromString(xml, "text/xml") as unknown as Document;
    const el = doc.getElementsByTagName("selectionEntry")[0] as Element;
    expect(extractTiers(el)).toEqual([]);
  });

  it("ignores modifiers with zero or negative points values", () => {
    const parser = new DOMParser();
    const xml = `<?xml version="1.0"?><selectionEntry>
      <modifiers>
        <modifier type="set" field="51b2-306e-1021-d207" value="0">
          <conditions><condition childId="model" type="atLeast" value="5" /></conditions>
        </modifier>
      </modifiers>
    </selectionEntry>`;
    const doc = parser.parseFromString(xml, "text/xml") as unknown as Document;
    const el = doc.getElementsByTagName("selectionEntry")[0] as Element;
    expect(extractTiers(el)).toEqual([]);
  });
});
