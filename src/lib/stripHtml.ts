/**
 * Strip HTML tags and decode common HTML entities from a string.
 *
 * Used by the Wahapedia sync pipeline (Plan 15-04 useRulesSync) to clean
 * ability `description` fields before storing them in rw_datasheet_abilities.
 * Wahapedia uses <b>, <i>, <br>, &amp;, &nbsp;, &#NNN; etc. in ability text
 * and we want plain readable strings (not HTML markup) in the UI.
 *
 * Order of operations:
 *   1. Remove all HTML tags via /<[^>]*>/g
 *   2. Decode named entities (&amp; &lt; &gt; &nbsp;)
 *   3. Decode numeric entities (&#NNN;) via String.fromCharCode
 *   4. .trim() leading/trailing whitespace
 *
 * NOT a full HTML parser — Wahapedia uses only a small subset of HTML and
 * we explicitly avoid jsdom for sync-time work (15-RESEARCH.md Pitfall 4).
 *
 * @param html The raw input string (may contain HTML markup and entities).
 * @returns Plain text with markup removed and entities decoded.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}
