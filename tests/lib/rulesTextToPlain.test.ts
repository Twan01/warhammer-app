import { describe, expect, it } from "vitest";
import { rulesTextToPlain } from "@/lib/rulesTextToPlain";

describe("rulesTextToPlain", () => {
  it("returns empty string for null input", () => {
    expect(rulesTextToPlain(null)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(rulesTextToPlain("")).toBe("");
  });

  it("converts closing </p> tags to newlines (no blank lines at start/end)", () => {
    const result = rulesTextToPlain("<p>A</p><p>B</p>");
    expect(result).toBe("A\nB");
  });

  it("converts <br> to newline", () => {
    const result = rulesTextToPlain("Line1<br>Line2");
    expect(result).toBe("Line1\nLine2");
  });

  it("converts <br/> to newline", () => {
    const result = rulesTextToPlain("Line1<br/>Line2");
    expect(result).toBe("Line1\nLine2");
  });

  it("converts <br /> to newline", () => {
    const result = rulesTextToPlain("Line1<br />Line2");
    expect(result).toBe("Line1\nLine2");
  });

  it("converts </li> to newline", () => {
    const result = rulesTextToPlain("<li>Item A</li><li>Item B</li>");
    expect(result).toBe("Item A\nItem B");
  });

  it("strips inline tags like <b>, <i>, <span>", () => {
    const result = rulesTextToPlain("<b>Bold</b> and <i>italic</i>");
    expect(result).toBe("Bold and italic");
  });

  it("decodes HTML entities via stripHtml: &nbsp; -> space", () => {
    const result = rulesTextToPlain("A&nbsp;B");
    expect(result).toBe("A B");
  });

  it("decodes &amp; -> &", () => {
    const result = rulesTextToPlain("A&amp;B");
    expect(result).toBe("A&B");
  });

  it("collapses runs of 2+ newlines from HTML tags + literal newlines to a single newline", () => {
    // <p>A</p> -> "A\n", then the literal \n\n gives 3 consecutive -> collapse to 1
    const result = rulesTextToPlain("<p>A</p>\n\n<p>B</p>");
    expect(result).toBe("A\nB");
  });

  it("collapses multiple consecutive newlines to one", () => {
    const result = rulesTextToPlain("A\n\n\nB");
    expect(result).toBe("A\nB");
  });

  it("output is trimmed (no leading/trailing whitespace)", () => {
    const result = rulesTextToPlain("  <p>Hello</p>  ");
    expect(result).toBe("Hello");
  });

  it("handles nested block tags in typical rules text", () => {
    const result = rulesTextToPlain(
      "<p>When this unit is selected to shoot:</p><p>Roll 3D6</p>"
    );
    expect(result).toBe("When this unit is selected to shoot:\nRoll 3D6");
  });

  it("handles plain text with no HTML", () => {
    const result = rulesTextToPlain("Just plain text.");
    expect(result).toBe("Just plain text.");
  });

  it("case-insensitive: </P> and <BR> also converted", () => {
    const result = rulesTextToPlain("<P>A</P><BR>B");
    expect(result).toBe("A\nB");
  });
});
