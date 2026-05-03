/**
 * Phase 12 — PaintingRing tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 12-01 will:
 *   1. Create src/components/common/PaintingRing.tsx exporting `PaintingRing({ percentage })`
 *      per 12-UI-SPEC.md §PaintingRing Specification (96×96 SVG, viewBox 0 0 96 96, radius=38,
 *      stroke-width=8, track stroke=#52525b, progress arc stroke=currentColor + className=text-primary,
 *      stroke-linecap=round, transform=rotate(-90 48 48), stroke-dasharray=2*PI*38 ≈ 238.76,
 *      stroke-dashoffset=CIRCUMFERENCE * (1 - percentage/100), text content "{percentage}%",
 *      role=img, aria-label="{percentage}% painted").
 *   2. Replace `describe.skip` below with `describe`.
 *   3. Add real assertions matching 12-VALIDATION.md §Per-Task Verification Map row 12-01-01
 *      (UI-05 ring rendering — percentage text, aria-label, role=img).
 *
 * The stub exists in Wave 0 so Plan 12-01 has a concrete failing target to flip green
 * (Nyquist sampling rate per 12-VALIDATION.md).
 *
 * File extension is .tsx (not .ts) because the real test bodies in Plan 12-01 will use
 * `render(<PaintingRing percentage={72} />)` JSX — keeping the extension consistent across
 * stub and real-body avoids the rename Phase 10-00 had to perform in 10-01 (lesson logged
 * in STATE.md §Phase 10 Plan 01).
 *
 * Pitfall 2 (12-RESEARCH.md): jsdom has no CSS engine. Tests assert text content and
 * attributes (aria-label, role, x/y coordinates) — NOT computed font-size or fill color
 * via getComputedStyle.
 */
import { describe, it } from "vitest";

describe.skip("PaintingRing — UI-05 (painting status ring)", () => {
  it("renders the percentage as text content inside the SVG", () => {
    // Plan 12-01 will:
    //   - render(<PaintingRing percentage={72} />)
    //   - const svg = screen.getByRole("img")
    //   - expect(svg.querySelector("text")?.textContent).toBe("72%")
  });

  it("exposes role=img and aria-label='{percentage}% painted' for screen readers", () => {
    // Plan 12-01 will:
    //   - render(<PaintingRing percentage={42} />)
    //   - const svg = screen.getByRole("img")
    //   - expect(svg.getAttribute("aria-label")).toBe("42% painted")
  });

  it("clamps the dashoffset to 0 when percentage=100 (full ring)", () => {
    // Plan 12-01 will:
    //   - render(<PaintingRing percentage={100} />)
    //   - const progress = screen.getByRole("img").querySelectorAll("circle")[1]
    //   - expect(progress.getAttribute("stroke-dashoffset")).toBe("0")  // CIRCUMFERENCE * (1 - 100/100) = 0
    //   - This proves the dashoffset math: offset = CIRCUMFERENCE * (1 - percentage/100)
  });
});
