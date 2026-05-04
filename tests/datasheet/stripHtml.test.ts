/**
 * Phase 15 — stripHtml pure function tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 15-02 will:
 *   1. Create src/lib/stripHtml.ts exporting stripHtml(html: string).
 *   2. Replace each `it.skip` below with `it`.
 *   3. Add real assertions matching 15-VALIDATION.md row 15-01-02.
 *
 * The stub exists in Wave 0 so Plan 15-02 has a concrete failing-or-skipped vitest target.
 *
 * Behavior contract from 15-RESEARCH.md §Stripping HTML from Ability Descriptions:
 *   - replace HTML tags with empty string: /<[^>]*>/g → ""
 *   - decode &amp; &lt; &gt; &nbsp; entities literally
 *   - decode &#NNN; numeric entities by char code
 *   - .trim() at end
 */
import { describe, it } from "vitest";

describe("stripHtml — Wave 0 stubs", () => {
  it.skip("DS-09: strips <b>, <i>, <br> HTML tags from ability description text", () => {
    // Plan 15-02 will:
    //   - import { stripHtml } from "@/lib/stripHtml"
    //   - assert stripHtml("<b>Sustained Hits 1</b>") === "Sustained Hits 1"
    //   - assert stripHtml("Line one<br>Line two") === "Line oneLine two"
    //   - assert stripHtml("<i>Lethal Hits</i>") === "Lethal Hits"
  });

  it.skip("DS-09: decodes named HTML entities &amp; &lt; &gt; &nbsp;", () => {
    // Plan 15-02 will:
    //   - assert stripHtml("&amp;") === "&"
    //   - assert stripHtml("&lt;Twin&gt;") === "<Twin>"
    //   - assert stripHtml("Hits&nbsp;1") === "Hits 1"
  });

  it.skip("DS-09: decodes numeric HTML entities &#NNN; (e.g. &#8211; for en-dash)", () => {
    // Plan 15-02 will:
    //   - assert stripHtml("&#8211;") === "–"   // en-dash U+2013
    //   - assert stripHtml("range &#8212; 12&quot;") contains the em-dash and trims trailing whitespace
    //   - assert stripHtml("  spaces  ") === "spaces" (.trim() applied)
  });
});
