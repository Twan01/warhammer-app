/**
 * Pipe-delimited CSV parser for Wahapedia's data export format.
 *
 * Wahapedia's CSVs at https://wahapedia.ru/wh40k10ed/*.csv use:
 *   - "|" as field separator
 *   - "\n" as row separator
 *   - UTF-8 encoding
 *   - A trailing "|" on every row (last field is always empty)
 *   - HTML markup in some text fields (handled separately by stripHtml)
 *
 * The format is simple enough that a 10-line parser is correct (see
 * 15-RESEARCH.md §Don't Hand-Roll — a full CSV library would be overkill).
 *
 * @param raw The raw text body of a Wahapedia CSV file.
 * @returns Array of objects keyed by column header. Empty array for empty or
 *          header-only input.
 */
export function parseWahapediaCsv(raw: string): Record<string, string>[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split("|").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split("|");
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").trim()])
    );
  });
}
