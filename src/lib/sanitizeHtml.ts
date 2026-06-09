import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "b", "i", "em", "strong", "span", "br", "p", "ul", "ol", "li",
  "table", "tr", "td", "th", "thead", "tbody", "sup", "sub",
];

export function sanitizeRulesHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["class"],
  });
}
