/**
 * Phase 15 — stripHtml pure function tests.
 *
 * Mirrors the test contract documented in the Wave 0 stub (Plan 15-00 Task 1 §Part B).
 */
import { describe, it, expect } from "vitest";
import { stripHtml } from "@/lib/stripHtml";

describe("stripHtml", () => {
  it("DS-09: strips <b>, <i>, <br> HTML tags from ability description text", () => {
    expect(stripHtml("<b>Sustained Hits 1</b>")).toBe("Sustained Hits 1");
    expect(stripHtml("Line one<br>Line two")).toBe("Line oneLine two");
    expect(stripHtml("<i>Lethal Hits</i>")).toBe("Lethal Hits");
    expect(stripHtml("<p>Wrapped <b>bold</b> text</p>")).toBe("Wrapped bold text");
  });

  it("DS-09: decodes named HTML entities &amp; &lt; &gt; &nbsp;", () => {
    expect(stripHtml("&amp;")).toBe("&");
    expect(stripHtml("&lt;Twin&gt;")).toBe("<Twin>");
    expect(stripHtml("Hits&nbsp;1")).toBe("Hits 1");
  });

  it("DS-09: decodes numeric HTML entities &#NNN; (e.g. &#8211; for en-dash) and trims whitespace", () => {
    expect(stripHtml("&#8211;")).toBe("–"); // en-dash U+2013
    expect(stripHtml("&#8212;")).toBe("—"); // em-dash U+2014
    expect(stripHtml("  spaces  ")).toBe("spaces");
    // Combined: tag + entity + whitespace
    expect(stripHtml("  <b>range</b> &#8211; 12  ")).toBe("range – 12");
  });
});
