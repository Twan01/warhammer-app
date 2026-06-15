/**
 * rulesTextToPlain — convert HTML rules text to plain text suitable for PDF rendering.
 *
 * Block/break tags (</p>, <br>, </li>, </div>, </tr>) become newlines BEFORE
 * the remainder is passed to stripHtml for tag removal and entity decoding.
 * Output has no more than one consecutive newline and is trimmed.
 *
 * Security: delegates to stripHtml which removes all tags — no HTML is passed
 * through to jsPDF string rendering (T-h48-01 mitigation).
 */

import { stripHtml } from "@/lib/stripHtml";

/**
 * Convert HTML rules text (Wahapedia ability/stratagem descriptions) to
 * plain text for PDF embedding. Preserves paragraph/line-break structure
 * via newlines; collapses multiple blank lines; trims.
 *
 * @param html  Raw HTML string from the DB (may be null).
 * @returns     Plain text with block structure represented by single newlines.
 */
export function rulesTextToPlain(html: string | null): string {
  if (!html) return "";

  // Step 1: replace break tags (self-closing or empty) with newline
  let text = html.replace(/<br\s*\/?>/gi, "\n");

  // Step 2: replace closing block tags with newline
  text = text.replace(/<\/(p|li|div|tr)>/gi, "\n");

  // Step 3: strip remaining tags and decode entities via stripHtml
  text = stripHtml(text);

  // Step 4: collapse runs of 2+ consecutive newlines to a single newline
  text = text.replace(/\n{2,}/g, "\n");

  // Step 5: trim leading/trailing whitespace
  return text.trim();
}
