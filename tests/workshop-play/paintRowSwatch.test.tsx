/** Wave 0 stubs for WKSP-01 — PaintRow swatch consistency. Plan 29-02 fills these. */
import { describe, it } from "vitest";

describe.skip("PaintRow swatch rendering (WKSP-01)", () => {
  it.skip("renders a colored swatch span with backgroundColor when paint has hex_color");
  // TODO Plan 29-02: render PaintRow with paint.hex_color = "#FF0000",
  // assert span has style backgroundColor "#FF0000" and classes "h-4 w-4 rounded-full"

  it.skip("renders a muted fallback swatch when paint has no hex_color");
  // TODO Plan 29-02: render PaintRow with paint.hex_color = null,
  // assert span has class "bg-muted" and no inline backgroundColor

  it.skip("swatch span is 16x16px (h-4 w-4) with rounded-full and border");
  // TODO Plan 29-02: assert swatch span has classes including "h-4", "w-4",
  // "rounded-full", "border", "border-border"
});
