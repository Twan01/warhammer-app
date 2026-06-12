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
 *   2. Decode named entities (&lt; &gt; &nbsp; &quot; &apos;) and numeric entities
 *   3. Decode &amp; LAST so a literal `&amp;lt;` resolves to `&lt;`, not `<`
 *      (decoding &amp; first would double-decode nested entities)
 *   4. .trim() leading/trailing whitespace
 *
 * NOT a full HTML parser — Wahapedia uses only a small subset of HTML and
 * we explicitly avoid jsdom for sync-time work (15-RESEARCH.md Pitfall 4).
 *
 * @param html The raw input string (may contain HTML markup and entities).
 * @returns Plain text with markup removed and entities decoded.
 */
/** Decode a numeric code point, falling back to the raw entity if out of range. */
function codePoint(n: number, raw: string): string {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return raw;
  try {
    return String.fromCodePoint(n);
  } catch {
    return raw;
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (m, n) => codePoint(parseInt(n, 16), m))
    .replace(/&#(\d+);/g, (m, n) => codePoint(Number(n), m))
    // Decode &amp; LAST to avoid double-decoding nested entities.
    .replace(/&amp;/g, "&")
    .trim();
}
